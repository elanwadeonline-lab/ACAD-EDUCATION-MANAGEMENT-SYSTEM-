/**
 * ExamPool High-Performance Multi-Tier Caching Service
 * 
 * Provides zero-latency In-Memory caching (default for LAN / offline-first deployments)
 * with transparent fallback / switch to Redis for cloud / distributed clusters.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private inFlight: Map<string, Promise<any>> = new Map();
  private subscribers: Map<string, Set<(payload: any) => void>> = new Map();
  private maxEntries: number;
  private cleanupIntervalMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private redisClient: any = null;
  private redisSubClient: any = null;
  private isRedisActive: boolean = false;

  constructor(options: { maxEntries?: number; cleanupIntervalMs?: number } = {}) {
    this.maxEntries = options.maxEntries || 50000;
    this.cleanupIntervalMs = options.cleanupIntervalMs || 30000; // 30s purge cycle

    // Start background cleanup timer
    this.cleanupTimer = setInterval(() => this.purgeExpired(), this.cleanupIntervalMs);
    if (this.cleanupTimer && typeof (this.cleanupTimer as any).unref === "function") {
      (this.cleanupTimer as any).unref();
    }
  }

  /** Set an optional Redis client (and optional subscriber client) for distributed cloud deployments */
  public setRedisClient(client: any, subClient?: any) {
    this.redisClient = client;
    this.isRedisActive = !!client;
    if (subClient) {
      this.redisSubClient = subClient;
      try {
        subClient.on?.("message", (channel: string, message: string) => {
          const handlers = this.subscribers.get(channel);
          if (!handlers || handlers.size === 0) return;
          try {
            const parsed = JSON.parse(message);
            for (const fn of handlers) fn(parsed);
          } catch {}
        });
      } catch {}
    }
  }

  /** Publish an event across local and distributed subscribers (e.g. SSE fanout or cache invalidation) */
  public publish(channel: string, payload: any): void {
    const handlers = this.subscribers.get(channel);
    if (handlers && handlers.size > 0) {
      for (const fn of handlers) {
        try { fn(payload); } catch {}
      }
    }
    if (this.isRedisActive && this.redisClient && typeof this.redisClient.publish === "function") {
      try {
        this.redisClient.publish(channel, JSON.stringify(payload)).catch?.(() => {});
      } catch {}
    }
  }

  /** Subscribe to a local/distributed pub-sub channel */
  public subscribe(channel: string, handler: (payload: any) => void): () => void {
    let set = this.subscribers.get(channel);
    if (!set) {
      set = new Set();
      this.subscribers.set(channel, set);
      if (this.redisSubClient && typeof this.redisSubClient.subscribe === "function") {
        try { this.redisSubClient.subscribe(channel).catch?.(() => {}); } catch {}
      }
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
      if (set && set.size === 0) {
        this.subscribers.delete(channel);
      }
    };
  }

  /**
   * Set a value in cache with a TTL (in seconds).
   */
  public set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    if (this.memoryCache.has(key)) {
      this.memoryCache.delete(key);
    } else if (this.memoryCache.size >= this.maxEntries) {
      // O(1) LRU eviction: evict least-recently-used 10% from head of Map iterator
      const evictCount = Math.max(1, Math.floor(this.maxEntries * 0.1));
      let i = 0;
      for (const k of this.memoryCache.keys()) {
        this.memoryCache.delete(k);
        if (++i >= evictCount) break;
      }
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { value, expiresAt });

    if (this.isRedisActive && this.redisClient) {
      try {
        this.redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => {});
      } catch {}
    }
  }

  /**
   * Get a cached value. Returns null if missing or expired.
   * Promotes hit entry to most-recently-used position in O(1).
   */
  public get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    // O(1) LRU promotion
    this.memoryCache.delete(key);
    this.memoryCache.set(key, entry);

    return entry.value as T;
  }

  /**
   * Check if a key exists and is unexpired.
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific cache key.
   */
  public delete(key: string): void {
    this.memoryCache.delete(key);
    if (this.isRedisActive && this.redisClient) {
      try {
        this.redisClient.del(key).catch(() => {});
      } catch {}
    }
  }

  /**
   * Invalidate all keys matching a prefix pattern (e.g. "questions:")
   */
  public deletePattern(prefix: string): void {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
    if (this.isRedisActive && this.redisClient) {
      try {
        this.redisClient.keys(`${prefix}*`).then((keys: string[]) => {
          if (keys && keys.length > 0) {
            this.redisClient.del(...keys).catch(() => {});
          }
        }).catch(() => {});
      } catch {}
    }
  }

  /**
   * Single-flight get or compute wrapper (prevents Thundering Herd / Cache Stampede).
   * If `key` is cached, returns cached value.
   * If a fetch for `key` is already in-flight, shares the pending Promise across all callers.
   */
  public async wrap<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T> | T): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = (async () => {
      try {
        const fresh = await fetcher();
        if (fresh !== null && fresh !== undefined) {
          this.set(key, fresh, ttlSeconds);
        }
        return fresh;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Synchronous get or compute wrapper for hot-path DB reads.
   */
  public wrapSync<T>(key: string, ttlSeconds: number, fetcher: () => T): T {
    const cached = this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = fetcher();
    if (fresh !== null && fresh !== undefined) {
      this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Clear entire cache.
   */
  public clear(): void {
    this.memoryCache.clear();
    this.inFlight.clear();
  }

  /**
   * Purge expired entries from memory.
   */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Global Singleton Instance
export const cacheService = new CacheService();

// Common Cache Key Builders
export const CacheKeys = {
  setting: (key: string) => `setting:${key}`,
  currentTerm: () => `setting:CURRENT_TERM`,
  registrationOpen: () => `setting:REGISTRATION_OPEN`,
  schoolConfig: () => `config:singleton`,
  subjectQuestions: (subjectId: number | string) => `subject_questions:${subjectId}`,
  subject: (subjectId: number | string) => `subject:${subjectId}`,
  user: (userId: number | string) => `user:${userId}`,
  authToken: (token: string) => `auth_token:${token}`,
  staticRoute: (urlPath: string) => `static_route:${urlPath}`,
  activeSession: () => `academic:active_session`,
  activeTerm: () => `academic:active_term`,
  timetableSubject: (subjectId: number | string) => `timetable:${subjectId}`,
};
