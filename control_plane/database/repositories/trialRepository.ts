import { controlDb } from "../client";
import type { Trial, TrialStatus } from "../../types";

export const trialRepository = {
  listAll(filters?: { status?: string }): (Trial & { school_name?: string; school_code?: string })[] {
    let query = `
      SELECT 
        t.*,
        s.name as school_name,
        s.school_code as school_code,
        CAST((julianday(t.expires_at) - julianday('now')) AS INTEGER) as days_remaining
      FROM trials t
      JOIN schools s ON t.school_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status && filters.status !== "all") {
      query += " AND t.status = ?";
      params.push(filters.status);
    }

    query += " ORDER BY t.expires_at ASC";
    return controlDb.prepare(query).all(...params) as any[];
  },

  findById(id: number): (Trial & { school_name?: string; school_code?: string }) | null {
    const query = `
      SELECT 
        t.*,
        s.name as school_name,
        s.school_code as school_code,
        CAST((julianday(t.expires_at) - julianday('now')) AS INTEGER) as days_remaining
      FROM trials t
      JOIN schools s ON t.school_id = s.id
      WHERE t.id = ?
    `;
    return (controlDb.prepare(query).get(id) as any) || null;
  },

  findBySchoolId(schoolId: number): (Trial & { school_name?: string; school_code?: string }) | null {
    const query = `
      SELECT 
        t.*,
        s.name as school_name,
        s.school_code as school_code,
        CAST((julianday(t.expires_at) - julianday('now')) AS INTEGER) as days_remaining
      FROM trials t
      JOIN schools s ON t.school_id = s.id
      WHERE t.school_id = ?
      ORDER BY t.id DESC 
      LIMIT 1
    `;
    return (controlDb.prepare(query).get(schoolId) as any) || null;
  },

  create(data: {
    school_id: number;
    installation_id?: string;
    duration_days?: number;
    student_limit?: number;
    teacher_limit?: number;
    notes?: string;
  }): Trial {
    const duration = data.duration_days || 30;
    const res = controlDb
      .prepare(
        `INSERT INTO trials (
           school_id, installation_id, status, duration_days,
           started_at, expires_at, student_limit, teacher_limit, onboarding_step, notes
         ) VALUES (
           ?, ?, 'active', ?,
           strftime('%Y-%m-%dT%H:%M:%SZ','now'),
           strftime('%Y-%m-%dT%H:%M:%SZ', datetime('now', '+' || ? || ' days')),
           ?, ?, 1, ?
         )`
      )
      .run(
        data.school_id,
        data.installation_id || null,
        duration,
        duration,
        data.student_limit || 150,
        data.teacher_limit || 15,
        data.notes || null
      );
    return this.findById(Number(res.lastInsertRowid))!;
  },

  extend(id: number, additionalDays: number): Trial | null {
    controlDb
      .prepare(
        `UPDATE trials 
         SET 
           expires_at = strftime('%Y-%m-%dT%H:%M:%SZ', datetime(expires_at, '+' || ? || ' days')),
           duration_days = duration_days + ?,
           status = 'active'
         WHERE id = ?`
      )
      .run(additionalDays, additionalDays, id);
    return this.findById(id);
  },

  convert(id: number): Trial | null {
    controlDb
      .prepare(
        `UPDATE trials 
         SET 
           status = 'converted',
           converted_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
         WHERE id = ?`
      )
      .run(id);
    return this.findById(id);
  },

  updateOnboardingStep(id: number, step: number): void {
    controlDb.prepare("UPDATE trials SET onboarding_step = ? WHERE id = ?").run(step, id);
  },
};
