import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

const QUEUE_DB_PATH = path.join(import.meta.dir, "..", "telemetry_buffer.db");
const queueDb = new Database(QUEUE_DB_PATH, { create: true });

queueDb.run("PRAGMA journal_mode = WAL");
queueDb.run("PRAGMA journal_size_limit = 1048576");
queueDb.run(
  `
  CREATE TABLE IF NOT EXISTS telemetry_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    metadata_json TEXT,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'syncing', 'acknowledged')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )
`
);

/**
 * New WAL pages accumulate on every enqueue/ack-delete cycle.
 * Run a checkpoint when the -wal file grows past 512 KB so the file
 * actually shrinks back down instead of ballooning to gigabytes.
 */
function maybeCheckpointWal(): void {
  try {
    const walPath = `${QUEUE_DB_PATH}-wal`;
    if (fs.existsSync(walPath) && fs.statSync(walPath).size > 512 * 1024) {
      const result = queueDb.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get() as any;
      // { busy: 0, log: pagesWallpaperedBack, checkpointed: pagesMoved }
      if (result && result.checkpointed > 0) {
        console.log(`🧹 [Telemetry Queue] WAL checkpoint trimmed ${result.checkpointed} page(s)`);
      }
    }
  } catch {
    // Checkpoint is best-effort; never break event logging over it.
  }
}

export interface QueuedTelemetryEvent {
  id: number;
  event_type: string;
  severity: "info" | "warning" | "high" | "critical";
  metadata?: any;
  timestamp: string;
}

export const telemetryQueue = {
  enqueue(eventType: string, severity: "info" | "warning" | "high" | "critical" = "info", metadata?: any): void {
    // Keep max 10,000 events to prevent unbounded disk growth
    const count = (queueDb.prepare("SELECT COUNT(*) as c FROM telemetry_queue").get() as any)?.c || 0;
    if (count > 10000) {
      queueDb.run("DELETE FROM telemetry_queue WHERE id IN (SELECT id FROM telemetry_queue ORDER BY id ASC LIMIT 500)");
    }

    queueDb
      .prepare(
        `INSERT INTO telemetry_queue (event_type, severity, metadata_json, timestamp, status)
         VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'), 'pending')`
      )
      .run(eventType, severity, metadata ? JSON.stringify(metadata) : null);
    maybeCheckpointWal();
  },

  getPendingBatch(limit = 50): QueuedTelemetryEvent[] {
    const rows = queueDb
      .prepare("SELECT id, event_type, severity, metadata_json, timestamp FROM telemetry_queue WHERE status = 'pending' ORDER BY id ASC LIMIT ?")
      .all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      event_type: r.event_type,
      severity: r.severity,
      metadata: r.metadata_json ? JSON.parse(r.metadata_json) : undefined,
      timestamp: r.timestamp,
    }));
  },

  markAcknowledged(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    queueDb.prepare(`DELETE FROM telemetry_queue WHERE id IN (${placeholders})`).run(...ids);
    maybeCheckpointWal();
  },

  getQueueSize(): number {
    return (queueDb.prepare("SELECT COUNT(*) as c FROM telemetry_queue WHERE status = 'pending'").get() as any)?.c || 0;
  },
};
