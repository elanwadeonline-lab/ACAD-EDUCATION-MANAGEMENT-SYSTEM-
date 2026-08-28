import { controlDb } from "../client";
import type { InstallationHeartbeat } from "../../types";

export const telemetryRepository = {
  recordHeartbeat(data: InstallationHeartbeat): void {
    controlDb
      .prepare(
        `INSERT INTO installation_heartbeats (
           installation_id, timestamp, cpu_usage, memory_usage,
           storage_usage, db_status, connected_clients, active_exam_sessions,
           sync_queue_size, raw_payload_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.installation_id,
        data.timestamp,
        data.cpu_usage || 0,
        data.memory_usage || 0,
        data.storage_usage || 0,
        data.db_status || "healthy",
        data.connected_clients || 0,
        data.active_exam_sessions || 0,
        data.sync_queue_size || 0,
        data.raw_payload_json || null
      );
  },

  getRecentHeartbeats(installationId: string, limit = 50): InstallationHeartbeat[] {
    return controlDb
      .prepare(
        `SELECT * FROM installation_heartbeats 
         WHERE installation_id = ? 
         ORDER BY id DESC LIMIT ?`
      )
      .all(installationId, limit) as InstallationHeartbeat[];
  },

  recordEvents(
    events: Array<{
      school_id: number;
      installation_id: string;
      event_type: string;
      severity: "info" | "warning" | "high" | "critical";
      metadata?: any;
      software_version?: string;
      timestamp: string;
    }>
  ): void {
    const stmt = controlDb.prepare(
      `INSERT INTO telemetry_events (
         school_id, installation_id, event_type, severity,
         metadata_json, software_version, event_timestamp
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    controlDb.transaction(() => {
      for (const ev of events) {
        stmt.run(
          ev.school_id,
          ev.installation_id,
          ev.event_type,
          ev.severity,
          ev.metadata ? JSON.stringify(ev.metadata) : null,
          ev.software_version || "5.3.0",
          ev.timestamp
        );
      }
    })();
  },

  getLiveEventStream(limit = 100): any[] {
    return controlDb
      .prepare(
        `SELECT 
           e.*,
           s.name as school_name,
           s.school_code as school_code
         FROM telemetry_events e
         JOIN schools s ON e.school_id = s.id
         ORDER BY e.id DESC LIMIT ?`
      )
      .all(limit);
  },
};
