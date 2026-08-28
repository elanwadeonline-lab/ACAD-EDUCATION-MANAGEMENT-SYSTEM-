import type { HealthStatus } from "../types";

export interface HealthEvaluation {
  score: number;
  status: HealthStatus;
  warnings: string[];
  factors: {
    heartbeat: { healthy: boolean; latencySec: number; penalty: number };
    storage: { usagePercent: number; penalty: number };
    memory: { usagePercent: number; penalty: number };
    database: { status: string; penalty: number };
    backup: { hoursSinceLast: number; penalty: number };
    syncQueue: { backlog: number; penalty: number };
  };
}

/**
 * Multi-factor Health Calculation Engine
 * Computes a continuous 0-100 score and explains penalties.
 */
export function evaluateNodeHealth(metrics: {
  lastHeartbeatEpochMs: number;
  storageUsagePercent?: number;
  memoryUsagePercent?: number;
  dbStatus?: string;
  hoursSinceLastBackup?: number;
  syncQueueBacklog?: number;
}): HealthEvaluation {
  let score = 100;
  const warnings: string[] = [];

  const now = Date.now();
  const latencySec = Math.max(0, Math.floor((now - metrics.lastHeartbeatEpochMs) / 1000));

  // Factor 1: Heartbeat Latency
  let hbPenalty = 0;
  if (latencySec > 1800) {
    hbPenalty = 100; // Offline (> 30 min)
    warnings.push("Installation has not reported heartbeat for > 30 minutes (Offline)");
  } else if (latencySec > 600) {
    hbPenalty = 60; // > 10 min
    warnings.push("Heartbeat delayed (> 10 min)");
  } else if (latencySec > 180) {
    hbPenalty = 20; // > 3 min
    warnings.push("Heartbeat latency elevated (> 3 min)");
  }
  score -= hbPenalty;

  // Factor 2: Storage Free %
  let storagePenalty = 0;
  const storagePct = metrics.storageUsagePercent ?? 0;
  if (storagePct >= 95) {
    storagePenalty = 50;
    warnings.push(`Critical: Local storage disk is ${storagePct}% full (< 5% free)`);
  } else if (storagePct >= 90) {
    storagePenalty = 25;
    warnings.push(`Warning: Storage disk is ${storagePct}% full (< 10% free)`);
  } else if (storagePct >= 80) {
    storagePenalty = 10;
    warnings.push(`Storage disk is ${storagePct}% full`);
  }
  score -= storagePenalty;

  // Factor 3: Memory Usage
  let memPenalty = 0;
  const memPct = metrics.memoryUsagePercent ?? 0;
  if (memPct >= 95) {
    memPenalty = 25;
    warnings.push(`Memory usage critical: ${memPct}%`);
  } else if (memPct >= 85) {
    memPenalty = 10;
    warnings.push(`Memory usage elevated: ${memPct}%`);
  }
  score -= memPenalty;

  // Factor 4: SQLite Database State
  let dbPenalty = 0;
  const dbStat = metrics.dbStatus || "healthy";
  if (dbStat !== "healthy" && dbStat !== "ok") {
    dbPenalty = 40;
    warnings.push(`Database integrity warning: ${dbStat}`);
  }
  score -= dbPenalty;

  // Factor 5: Backup Freshness
  let backupPenalty = 0;
  const backupHours = metrics.hoursSinceLastBackup ?? 0;
  if (backupHours > 48) {
    backupPenalty = 30;
    warnings.push(`Backup overdue: No snapshot created in last ${Math.floor(backupHours)} hours`);
  } else if (backupHours > 24) {
    backupPenalty = 15;
    warnings.push(`Daily backup delayed: ${Math.floor(backupHours)} hours since last snapshot`);
  }
  score -= backupPenalty;

  // Factor 6: Sync Queue Backlog
  let syncPenalty = 0;
  const backlog = metrics.syncQueueBacklog ?? 0;
  if (backlog > 2000) {
    syncPenalty = 25;
    warnings.push(`Sync queue severely backlogged: ${backlog} pending telemetry events`);
  } else if (backlog > 500) {
    syncPenalty = 10;
    warnings.push(`Sync queue backlog: ${backlog} items`);
  }
  score -= syncPenalty;

  // Normalize 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine Semantic Status
  let status: HealthStatus = "healthy";
  if (latencySec > 1800 || score === 0) {
    status = "offline";
  } else if (score < 40) {
    status = "critical";
  } else if (score < 70) {
    status = "degraded";
  } else if (score < 90) {
    status = "warning";
  } else {
    status = "healthy";
  }

  return {
    score,
    status,
    warnings,
    factors: {
      heartbeat: { healthy: latencySec <= 180, latencySec, penalty: hbPenalty },
      storage: { usagePercent: storagePct, penalty: storagePenalty },
      memory: { usagePercent: memPct, penalty: memPenalty },
      database: { status: dbStat, penalty: dbPenalty },
      backup: { hoursSinceLast: backupHours, penalty: backupPenalty },
      syncQueue: { backlog, penalty: syncPenalty },
    },
  };
}
