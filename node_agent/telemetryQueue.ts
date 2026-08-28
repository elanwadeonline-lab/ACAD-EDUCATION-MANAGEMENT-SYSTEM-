import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

const QUEUE_DB_PATH = path.join(import.meta.dir, "..", "telemetry_buffer.db");
const queueDb = new Database(QUEUE_DB_PATH, { create: true });

queueDb.run("PRAGMA journal_mode = WAL");
queueDb.run(`
  CREATE TABLE IF NOT EXISTS telemetry_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    metadata_json TEXT,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'syncing', 'acknowledged')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )
`);

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
    queueDb.run(`DELETE FROM telemetry_queue WHERE id IN (${placeholders})`, ...ids);
  },

  getQueueSize(): number {
    return (queueDb.prepare("SELECT COUNT(*) as c FROM telemetry_queue WHERE status = 'pending'").get() as any)?.c || 0;
  },
};
