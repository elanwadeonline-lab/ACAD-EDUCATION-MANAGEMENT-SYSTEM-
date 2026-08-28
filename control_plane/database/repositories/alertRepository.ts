import { controlDb } from "../client";
import type { Alert, AlertSeverity, AlertStatus } from "../../types";

export const alertRepository = {
  listAll(filters?: { status?: AlertStatus; severity?: AlertSeverity; schoolId?: number }): Alert[] {
    let query = `
      SELECT 
        a.*,
        s.name as school_name,
        s.school_code as school_code
      FROM alerts a
      JOIN schools s ON a.school_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += " AND a.status = ?";
      params.push(filters.status);
    }
    if (filters?.severity) {
      query += " AND a.severity = ?";
      params.push(filters.severity);
    }
    if (filters?.schoolId) {
      query += " AND a.school_id = ?";
      params.push(filters.schoolId);
    }

    query += " ORDER BY a.id DESC";
    return controlDb.prepare(query).all(...params) as Alert[];
  },

  findById(id: number): Alert | null {
    return (
      (controlDb
        .prepare(
          `SELECT a.*, s.name as school_name, s.school_code as school_code
           FROM alerts a
           JOIN schools s ON a.school_id = s.id
           WHERE a.id = ?`
        )
        .get(id) as any) || null
    );
  },

  hasOpenAlert(installation_id: string, alert_type: string): boolean {
    const row = controlDb
      .prepare(
        `SELECT id FROM alerts 
         WHERE installation_id = ? AND alert_type = ? AND status IN ('open', 'acknowledged') 
         LIMIT 1`
      )
      .get(installation_id, alert_type);
    return !!row;
  },

  create(data: {
    school_id: number;
    installation_id: string;
    alert_type: string;
    severity: AlertSeverity;
    title: string;
    details?: string;
  }): Alert {
    const res = controlDb
      .prepare(
        `INSERT INTO alerts (school_id, installation_id, alert_type, severity, title, details, status)
         VALUES (?, ?, ?, ?, ?, ?, 'open')`
      )
      .run(
        data.school_id,
        data.installation_id,
        data.alert_type,
        data.severity,
        data.title,
        data.details || null
      );
    return this.findById(Number(res.lastInsertRowid))!;
  },

  acknowledge(id: number, userId: number): void {
    controlDb
      .prepare("UPDATE alerts SET status = 'acknowledged', acknowledged_by = ? WHERE id = ?")
      .run(userId, id);
  },

  resolve(id: number, userId: number): void {
    controlDb
      .prepare(
        `UPDATE alerts 
         SET status = 'resolved', resolved_by = ?, resolved_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
         WHERE id = ?`
      )
      .run(userId, id);
  },
};
