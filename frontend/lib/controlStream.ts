/**
 * Control Plane real-time SSE stream with polling fallback.
 * Push-based when SSE is available; falls back to interval polling if the
 * network truncates the stream, auth expires, or a proxy buffers SSE.
 */

export interface StreamData {
  metrics?: any;
  liveEvents?: any[];
  activeAlerts?: any[];
  timestamp?: string;
}

type Callback = (data: StreamData) => void;

interface Options {
  onData: Callback;
  onError?: (err: Error) => void;
  pollingIntervalMs?: number;
  pollingFn?: () => Promise<StreamData | null>;
}

/**
 * Opens a fetch-based SSE stream to /api/platform/stream.
 * Returns a cleanup function.
 */
export function subscribeControlStream(opts: Options): () => void {
  const token = typeof window !== "undefined" ? localStorage.getItem("acad_platform_token") : null;
  if (!token) {
    // No token — fall back immediately to polling if provided
    if (opts.pollingFn) {
      const id = setInterval(async () => {
        try {
          const d = await opts.pollingFn!();
          if (d) opts.onData(d as StreamData);
        } catch {}
      }, opts.pollingIntervalMs ?? 10000);
      return () => clearInterval(id);
    }
    return () => {};
  }

  const controller = new AbortController();
  let sseFailed = false;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;

  const startPolling = () => {
    if (!opts.pollingFn || pollingTimer) return;
    pollingTimer = setInterval(async () => {
      try {
        const d = await opts.pollingFn!();
        if (d) opts.onData(d as StreamData);
      } catch (e) {
        opts.onError?.(e as Error);
      }
    }, opts.pollingIntervalMs ?? 10000);
  };

  const connect = async () => {
    try {
      const res = await fetch("/api/platform/stream", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        sseFailed = true;
        startPolling();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const json = line.slice(6).trim();
          if (!json || json.startsWith(":")) continue;
          try {
            const parsed = JSON.parse(json) as StreamData;
            opts.onData(parsed);
          } catch {}
        }
      }
      if (!controller.signal.aborted) {
        sseFailed = true;
        startPolling();
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      sseFailed = true;
      startPolling();
      opts.onError?.(err);
    }
  };

  connect();

  return () => {
    controller.abort();
    if (pollingTimer) clearInterval(pollingTimer);
  };
}
