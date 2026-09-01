import { controlDb } from "../client";
import type { Installation, HealthStatus, ReleaseChannel } from "../../types";

export const installationRepository = {
  listAll(filters?: { schoolId?: number; healthStatus?: string }): Installation[] {
    this.sweepStaleToOffline();
    let query = `
      SELECT 
        i.*,
        s.name as school_name,
        s.school_code as school_code,
        hb.cpu_usage    as last_cpu_usage,
        hb.memory_usage as last_memory_usage,
        hb.storage_usage as last_storage_usage,
        hb.connected_clients as last_connected_clients,
        hb.active_exam_sessions as last_active_exam_sessions,
        hb.db_status as last_db_status,
        hb.sync_queue_size as last_sync_queue_size
      FROM installations i
      JOIN schools s ON i.school_id = s.id
      LEFT JOIN (
        SELECT 
          installation_id,
          cpu_usage,
          memory_usage,
          storage_usage,
          connected_clients,
          active_exam_sessions,
          db_status,
          sync_queue_size
        FROM installation_heartbeats hb_inner
        WHERE hb_inner.id = (
          SELECT MAX(id) FROM installation_heartbeats 
          WHERE installation_id = hb_inner.installation_id
        )
      ) hb ON hb.installation_id = i.installation_id
      WHERE i.is_revoked = 0
    `;
    const params: any[] = [];

    if (filters?.schoolId) {
      query += " AND i.school_id = ?";
      params.push(filters.schoolId);
    }
    if (filters?.healthStatus && filters.healthStatus !== "all") {
      query += " AND i.health_status = ?";
      params.push(filters.healthStatus);
    }

    query += " ORDER BY i.id DESC";
    return controlDb.prepare(query).all(...params) as Installation[];
  },

  findById(id: number): Installation | null {
    const query = `
      SELECT 
        i.*,
        s.name as school_name,
        s.school_code as school_code,
        hb.cpu_usage    as last_cpu_usage,
        hb.memory_usage as last_memory_usage,
        hb.storage_usage as last_storage_usage,
        hb.connected_clients as last_connected_clients,
        hb.active_exam_sessions as last_active_exam_sessions,
        hb.db_status as last_db_status,
        hb.sync_queue_size as last_sync_queue_size
      FROM installations i
      JOIN schools s ON i.school_id = s.id
      LEFT JOIN (
        SELECT 
          installation_id,
          cpu_usage, memory_usage, storage_usage,
          connected_clients, active_exam_sessions,
          db_status, sync_queue_size
        FROM installation_heartbeats hb_inner
        WHERE hb_inner.id = (
          SELECT MAX(id) FROM installation_heartbeats 
          WHERE installation_id = hb_inner.installation_id
        )
      ) hb ON hb.installation_id = i.installation_id
      WHERE i.id = ?
    `;
    return (controlDb.prepare(query).get(id) as any) || null;
  },

  findByInstallationId(installationId: string): Installation | null {
    const query = `
      SELECT 
        i.*,
        s.name as school_name,
        s.school_code as school_code
      FROM installations i
      JOIN schools s ON i.school_id = s.id
      WHERE i.installation_id = ?
    `;
    return (controlDb.prepare(query).get(installationId) as any) || null;
  },

  create(data: {
    school_id: number;
    installation_id: string;
    node_id: string;
    secret_key_hash: string;
    software_version?: string;
    agent_version?: string;
    release_channel?: ReleaseChannel;
  }): Installation {
    const res = controlDb
      .prepare(
        `INSERT INTO installations (school_id, installation_id, node_id, secret_key_hash, software_version, agent_version, release_channel, health_status, health_score, is_revoked)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'unknown', 100, 0)`
      )
      .run(
        data.school_id,
        data.installation_id.trim(),
        data.node_id.trim(),
        data.secret_key_hash,
        data.software_version || "5.3.0",
        data.agent_version || "1.0.0",
        data.release_channel || "stable"
      );
    return this.findById(Number(res.lastInsertRowid))!;
  },

  updateHeartbeat(
    installationId: string,
    data: {
      health_status: HealthStatus;
      health_score: number;
      software_version?: string;
      agent_version?: string;
      public_ip?: string;
      local_ip?: string;
    }
  ): void {
    controlDb
      .prepare(
        `UPDATE installations 
         SET 
           last_heartbeat_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
           health_status = ?,
           health_score = ?,
           software_version = COALESCE(?, software_version),
           agent_version = COALESCE(?, agent_version),
           public_ip = COALESCE(?, public_ip),
           local_ip = COALESCE(?, local_ip)
         WHERE installation_id = ?`
      )
      .run(
        data.health_status,
        data.health_score,
        data.software_version || null,
        data.agent_version || null,
        data.public_ip || null,
        data.local_ip || null,
        installationId
      );
  },

  revoke(id: number): void {
    controlDb.prepare("UPDATE installations SET is_revoked = 1 WHERE id = ?").run(id);
  },

  /**
   * Fetches recent heartbeat rows for a specific installation (for time-series charts).
   */
  getHeartbeatHistory(installationId: string, limit = 60): any[] {
    return controlDb
      .prepare(
        `SELECT 
           id, timestamp, cpu_usage, memory_usage, storage_usage,
           connected_clients, active_exam_sessions, sync_queue_size, db_status
         FROM installation_heartbeats
         WHERE installation_id = ?
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(installationId, limit) as any[];
  },

  /**
   * Marks installations with stale heartbeats as offline.
   * Called before any list/overview read and by periodic sweeper.
   * Generates a `node_offline` alert for each newly-offlined node.
   */
  sweepStaleToOffline(): number {
    const stale = controlDb
      .prepare(`
        SELECT id, school_id, installation_id, node_id, last_heartbeat_at
        FROM installations
        WHERE is_revoked = 0
          AND health_status != 'offline'
          AND last_heartbeat_at IS NOT NULL
          AND last_heartbeat_at < datetime('now', '-30 minutes')
      `)
      .all() as any[];
    if (stale.length === 0) return 0;
    const update = controlDb.prepare(
      `UPDATE installations SET health_status = 'offline', health_score = 0 WHERE id = ?`
    );
    const alertCheck = controlDb.prepare(
      `SELECT id FROM alerts WHERE installation_id = ? AND alert_type = 'node_offline' AND status IN ('open','acknowledged') LIMIT 1`
    );
    const alertInsert = controlDb.prepare(
      `INSERT INTO alerts (school_id, installation_id, alert_type, severity, title, details, status) VALUES (?, ?, 'node_offline', 'critical', 'Node Offline — Heartbeat Timeout', ?, 'open')`
    );
    let count = 0;
    controlDb.transaction(() => {
      for (const inst of stale) {
        update.run(inst.id);
        if (!alertCheck.get(inst.installation_id)) {
          alertInsert.run(
            inst.school_id,
            inst.installation_id,
            `Node ${inst.node_id} (${inst.installation_id}) has not reported a heartbeat since ${inst.last_heartbeat_at}. Marked offline after 30m timeout.`
          );
        }
        count++;
      }
    })();
    if (count > 0) console.warn(`[Health] Swept ${count} stale node(s) to offline`);
    return count;
  },

  /**
   * Returns fleet-wide health timeline (one row per 5-minute window).
   * Used for the monitoring timeline chart.
   */
  getFleetTimeline(hoursBack = 24): any[] {
    const safeHours = Math.max(1, Math.min(168, Math.floor(Number(hoursBack) || 24)));
    return controlDb
      .prepare(
        `SELECT
           strftime('%Y-%m-%dT%H:%M:00Z', timestamp) as window_start,
           COUNT(DISTINCT installation_id)            as reporting_nodes,
           AVG(cpu_usage)                             as avg_cpu,
           AVG(memory_usage)                          as avg_memory,
           SUM(active_exam_sessions)                  as total_exams,
           SUM(connected_clients)                     as total_clients,
           ROUND(MAX(0, 100 - (AVG(COALESCE(cpu_usage, 0)) * 0.5 + AVG(COALESCE(memory_usage, 0)) * 0.5))) as avg_health,
           COUNT(*)                                   as heartbeat_count
         FROM installation_heartbeats
         WHERE timestamp >= datetime('now', ?)
         GROUP BY strftime('%Y-%m-%dT%H:%M:00Z', timestamp)
         ORDER BY window_start ASC
         LIMIT 500`
      )
      .all(`-${safeHours} hours`) as any[];
  },
};
