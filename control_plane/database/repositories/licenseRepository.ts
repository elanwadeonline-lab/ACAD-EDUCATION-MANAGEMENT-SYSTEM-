import { controlDb } from "../client";
import type { License, PlanTier, LicenseStatus } from "../../types";

export const licenseRepository = {
  listAll(): (License & { school_name?: string; school_code?: string })[] {
    const rows = controlDb
      .prepare(
        `SELECT 
           l.*,
           s.name as school_name,
           s.school_code as school_code
         FROM licenses l
         JOIN schools s ON l.school_id = s.id
         ORDER BY l.id DESC`
      )
      .all() as any[];

    return rows.map((r) => {
      let enabled_modules: string[] = [];
      try {
        enabled_modules = JSON.parse(r.enabled_modules_json || "[]");
      } catch {
        enabled_modules = [];
      }
      return { ...r, enabled_modules };
    });
  },

  findById(id: number): License | null {
    const r = controlDb.prepare("SELECT * FROM licenses WHERE id = ?").get(id) as any;
    if (!r) return null;
    let enabled_modules: string[] = [];
    try {
      enabled_modules = JSON.parse(r.enabled_modules_json || "[]");
    } catch {
      enabled_modules = [];
    }
    return { ...r, enabled_modules };
  },

  findByLicenseKey(key: string): License | null {
    const r = controlDb.prepare("SELECT * FROM licenses WHERE license_key = ?").get(key) as any;
    if (!r) return null;
    let enabled_modules: string[] = [];
    try {
      enabled_modules = JSON.parse(r.enabled_modules_json || "[]");
    } catch {
      enabled_modules = [];
    }
    return { ...r, enabled_modules };
  },

  findBySchoolId(schoolId: number): License | null {
    const r = controlDb
      .prepare("SELECT * FROM licenses WHERE school_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
      .get(schoolId) as any;
    if (!r) return null;
    let enabled_modules: string[] = [];
    try {
      enabled_modules = JSON.parse(r.enabled_modules_json || "[]");
    } catch {
      enabled_modules = [];
    }
    return { ...r, enabled_modules };
  },

  create(data: {
    school_id: number;
    license_key: string;
    plan_tier: PlanTier;
    max_students?: number;
    max_teachers?: number;
    max_installations?: number;
    enabled_modules?: string[];
    valid_from?: string;
    valid_until: string;
  }): License {
    const modulesJson = JSON.stringify(
      data.enabled_modules || ["cbt_exam", "question_bank", "grading_center", "report_cards"]
    );
    const validFrom = data.valid_from || new Date().toISOString();

    const res = controlDb
      .prepare(
        `INSERT INTO licenses (
           school_id, license_key, plan_tier, status, max_students, max_teachers,
           max_installations, enabled_modules_json, valid_from, valid_until
         ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.school_id,
        data.license_key,
        data.plan_tier,
        data.max_students || 500,
        data.max_teachers || 50,
        data.max_installations || 1,
        modulesJson,
        validFrom,
        data.valid_until
      );
    return this.findById(Number(res.lastInsertRowid))!;
  },

  updateStatus(id: number, status: LicenseStatus): void {
    controlDb
      .prepare("UPDATE licenses SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?")
      .run(status, id);
  },
};
