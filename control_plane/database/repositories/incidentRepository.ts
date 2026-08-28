import { controlDb } from "../client";
import type { Incident, IncidentSeverity, IncidentStatus } from "../../types";

export const incidentRepository = {
  listAll(filters?: { status?: IncidentStatus; severity?: IncidentSeverity; schoolId?: number }): Incident[] {
    let query = `
      SELECT 
        inc.*,
        s.name as school_name,
        u.name as assigned_name
      FROM incidents inc
      JOIN schools s ON inc.school_id = s.id
      LEFT JOIN platform_users u ON inc.assigned_to = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += " AND inc.status = ?";
      params.push(filters.status);
    }
    if (filters?.severity) {
      query += " AND inc.severity = ?";
      params.push(filters.severity);
    }
    if (filters?.schoolId) {
      query += " AND inc.school_id = ?";
      params.push(filters.schoolId);
    }

    query += " ORDER BY inc.id DESC";
    return controlDb.prepare(query).all(...params) as Incident[];
  },

  findById(id: number): Incident | null {
    return (
      (controlDb
        .prepare(
          `SELECT 
             inc.*,
             s.name as school_name,
             u.name as assigned_name
           FROM incidents inc
           JOIN schools s ON inc.school_id = s.id
           LEFT JOIN platform_users u ON inc.assigned_to = u.id
           WHERE inc.id = ?`
        )
        .get(id) as any) || null
    );
  },

  create(data: {
    incident_code?: string;
    school_id: number;
    installation_id?: string;
    severity: IncidentSeverity;
    title: string;
    description?: string;
    assigned_to?: number;
  }): Incident {
    const code =
      data.incident_code || `ACAD-${Math.floor(1000 + Math.random() * 9000)}`;

    const res = controlDb
      .prepare(
        `INSERT INTO incidents (
           incident_code, school_id, installation_id, severity,
           status, title, description, assigned_to
         ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`
      )
      .run(
        code,
        data.school_id,
        data.installation_id || null,
        data.severity,
        data.title,
        data.description || null,
        data.assigned_to || null
      );

    return this.findById(Number(res.lastInsertRowid))!;
  },

  updateStatus(
    id: number,
    status: IncidentStatus,
    resolution?: { root_cause?: string; mitigation?: string }
  ): void {
    if (status === "resolved" || status === "closed") {
      controlDb
        .prepare(
          `UPDATE incidents 
           SET 
             status = ?,
             root_cause = COALESCE(?, root_cause),
             mitigation = COALESCE(?, mitigation),
             resolved_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
           WHERE id = ?`
        )
        .run(status, resolution?.root_cause || null, resolution?.mitigation || null, id);
    } else {
      controlDb.prepare("UPDATE incidents SET status = ? WHERE id = ?").run(status, id);
    }
  },
};
