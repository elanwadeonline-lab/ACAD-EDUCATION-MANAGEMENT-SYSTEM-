import { controlDb } from "../client";

/**
 * Bidirectional Sync Queue Repository
 * Manages cloud → node config push delivery payloads.
 * Nodes fetch pending items on every heartbeat cycle via GET /api/node/pending-sync.
 */
export const syncRepository = {
  /**
   * Queue a config push event targeted at a specific installation node.
   */
  queuePush(params: {
    installation_id: string;
    school_id: number;
    payload_type: "feature_flags" | "license" | "config" | "force_update" | "reboot_request" | "diagnostics";
    payload: Record<string, any>;
    queued_by?: number;
  }): void {
    controlDb
      .prepare(
        `INSERT INTO sync_queue (installation_id, school_id, payload_type, payload_json, queued_by)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        params.installation_id,
        params.school_id,
        params.payload_type,
        JSON.stringify(params.payload),
        params.queued_by ?? null
      );
  },

  /**
   * Queue a config push to ALL active installations of a school.
   * Used when feature flags or license change for an entire campus.
   */
  queuePushToAllSchoolNodes(params: {
    school_id: number;
    payload_type: "feature_flags" | "license" | "config" | "force_update" | "diagnostics" | "reboot_request";
    payload: Record<string, any>;
    queued_by?: number;
  }): number {
    const installations = controlDb
      .prepare(
        `SELECT installation_id FROM installations
         WHERE school_id = ? AND is_revoked = 0`
      )
      .all(params.school_id) as { installation_id: string }[];

    const stmt = controlDb.prepare(
      `INSERT INTO sync_queue (installation_id, school_id, payload_type, payload_json, queued_by)
       VALUES (?, ?, ?, ?, ?)`
    );

    const payloadJson = JSON.stringify(params.payload);
    controlDb.transaction(() => {
      for (const inst of installations) {
        stmt.run(
          inst.installation_id,
          params.school_id,
          params.payload_type,
          payloadJson,
          params.queued_by ?? null
        );
      }
    })();

    return installations.length;
  },

  /**
   * Queue a config push to ALL active installations across the ENTIRE fleet.
   * Used for fleet-wide software release deployment (CI/CD).
   */
  queuePushToFleet(params: {
    payload_type: "feature_flags" | "license" | "config" | "force_update" | "diagnostics" | "reboot_request";
    payload: Record<string, any>;
    queued_by?: number;
  }): number {
    const installations = controlDb
      .prepare(
        `SELECT installation_id, school_id FROM installations
         WHERE is_revoked = 0`
      )
      .all() as { installation_id: string; school_id: number }[];

    const stmt = controlDb.prepare(
      `INSERT INTO sync_queue (installation_id, school_id, payload_type, payload_json, queued_by)
       VALUES (?, ?, ?, ?, ?)`
    );

    const payloadJson = JSON.stringify(params.payload);
    controlDb.transaction(() => {
      for (const inst of installations) {
        stmt.run(
          inst.installation_id,
          inst.school_id,
          params.payload_type,
          payloadJson,
          params.queued_by ?? null
        );
      }
    })();

    return installations.length;
  },

  /**
   * Fetch all pending sync items for a specific installation node.
   * Called by the node agent on each heartbeat.
   */
  getPendingForInstallation(installation_id: string): any[] {
    const rows = controlDb
      .prepare(
        `SELECT id, payload_type, payload_json, queued_at
         FROM sync_queue
         WHERE installation_id = ? AND status = 'pending'
         ORDER BY id ASC
         LIMIT 50`
      )
      .all(installation_id) as any[];

    return rows.map((r) => ({
      id: r.id,
      payload_type: r.payload_type,
      payload: JSON.parse(r.payload_json),
      queued_at: r.queued_at,
    }));
  },

  /**
   * Mark a sync queue item as delivered after the node confirms receipt.
   */
  markDelivered(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    controlDb
      .prepare(
        `UPDATE sync_queue
         SET status = 'delivered', delivered_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
         WHERE id IN (${placeholders})`
      )
      .run(...ids);
  },

  /**
   * List recent sync queue items for the control plane UI.
   */
  listRecent(limit = 100): any[] {
    return controlDb
      .prepare(
        `SELECT sq.*, i.node_id, s.name as school_name, s.school_code
         FROM sync_queue sq
         LEFT JOIN installations i ON i.installation_id = sq.installation_id
         LEFT JOIN schools s ON s.id = sq.school_id
         ORDER BY sq.id DESC
         LIMIT ?`
      )
      .all(limit) as any[];
  },

  /**
   * Count pending items in the queue (for dashboard badge).
   */
  countPending(): number {
    const row = controlDb
      .prepare(`SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'pending'`)
      .get() as { cnt: number };
    return row?.cnt ?? 0;
  },

  /**
   * Purge delivered items older than N days.
   */
  purgeDelivered(olderThanDays = 30): number {
    const result = controlDb
      .prepare(
        `DELETE FROM sync_queue
         WHERE status = 'delivered'
         AND delivered_at < datetime('now', '-' || ? || ' days')`
      )
      .run(olderThanDays) as { changes: number };
    return result.changes;
  },
};
