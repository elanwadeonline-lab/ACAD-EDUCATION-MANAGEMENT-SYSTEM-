import { controlDb } from "../client";
import type { School, SchoolStatus } from "../../types";

export const schoolRepository = {
  listAll(filters?: { status?: string; search?: string }): School[] {
    let query = `
      SELECT 
        s.*,
        o.name as organization_name,
        (SELECT COUNT(*) FROM installations i WHERE i.school_id = s.id AND i.is_revoked = 0) as installations_count,
        (SELECT health_status FROM installations i WHERE i.school_id = s.id AND i.is_revoked = 0 ORDER BY i.id DESC LIMIT 1) as health_status,
        (SELECT health_score FROM installations i WHERE i.school_id = s.id AND i.is_revoked = 0 ORDER BY i.id DESC LIMIT 1) as health_score
      FROM schools s
      JOIN organizations o ON s.org_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status && filters.status !== "all") {
      query += " AND s.status = ?";
      params.push(filters.status);
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query += " AND (s.name LIKE ? OR s.school_code LIKE ? OR s.location LIKE ?)";
      params.push(term, term, term);
    }

    query += " ORDER BY s.id DESC";
    const schools = controlDb.prepare(query).all(...params) as School[];

    // Augment with active trial and license details
    return schools.map((sc) => {
      const trial = controlDb
        .prepare("SELECT * FROM trials WHERE school_id = ? ORDER BY id DESC LIMIT 1")
        .get(sc.id) as any;
      const license = controlDb
        .prepare("SELECT * FROM licenses WHERE school_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
        .get(sc.id) as any;

      if (license && license.enabled_modules_json) {
        try {
          license.enabled_modules = JSON.parse(license.enabled_modules_json);
        } catch {
          license.enabled_modules = [];
        }
      }

      return {
        ...sc,
        health_status: sc.health_status || "unknown",
        health_score: sc.health_score ?? 100,
        active_trial: trial || null,
        active_license: license || null,
      };
    });
  },

  findById(id: number): School | null {
    const query = `
      SELECT 
        s.*,
        o.name as organization_name,
        (SELECT COUNT(*) FROM installations i WHERE i.school_id = s.id AND i.is_revoked = 0) as installations_count,
        (SELECT health_status FROM installations i WHERE i.school_id = s.id AND i.is_revoked = 0 ORDER BY i.id DESC LIMIT 1) as health_status,
        (SELECT health_score FROM installations i WHERE i.school_id = s.id AND i.is_revoked = 0 ORDER BY i.id DESC LIMIT 1) as health_score
      FROM schools s
      JOIN organizations o ON s.org_id = o.id
      WHERE s.id = ?
    `;
    const sc = controlDb.prepare(query).get(id) as School | null;
    if (!sc) return null;

    const trial = controlDb
      .prepare("SELECT * FROM trials WHERE school_id = ? ORDER BY id DESC LIMIT 1")
      .get(sc.id) as any;
    const license = controlDb
      .prepare("SELECT * FROM licenses WHERE school_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
      .get(sc.id) as any;

    if (license && license.enabled_modules_json) {
      try {
        license.enabled_modules = JSON.parse(license.enabled_modules_json);
      } catch {
        license.enabled_modules = [];
      }
    }

    return {
      ...sc,
      health_status: sc.health_status || "unknown",
      health_score: sc.health_score ?? 100,
      active_trial: trial || null,
      active_license: license || null,
    };
  },

  findByCode(code: string): School | null {
    return (controlDb.prepare("SELECT * FROM schools WHERE school_code = ?").get(code.toUpperCase().trim()) as any) || null;
  },

  create(data: {
    org_id: number;
    school_code: string;
    name: string;
    location?: string;
    status?: SchoolStatus;
    primary_admin_name?: string;
    primary_admin_email?: string;
    primary_admin_phone?: string;
  }): School {
    const res = controlDb
      .prepare(
        `INSERT INTO schools (org_id, school_code, name, location, status, primary_admin_name, primary_admin_email, primary_admin_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.org_id,
        data.school_code.toUpperCase().trim(),
        data.name.trim(),
        data.location || null,
        data.status || "trial",
        data.primary_admin_name || null,
        data.primary_admin_email || null,
        data.primary_admin_phone || null
      );
    return this.findById(Number(res.lastInsertRowid))!;
  },

  update(
    id: number,
    data: Partial<{
      name: string;
      location: string;
      status: SchoolStatus;
      primary_admin_name: string;
      primary_admin_email: string;
      primary_admin_phone: string;
    }>
  ): School | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name.trim()); }
    if (data.location !== undefined) { fields.push("location = ?"); values.push(data.location.trim()); }
    if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
    if (data.primary_admin_name !== undefined) { fields.push("primary_admin_name = ?"); values.push(data.primary_admin_name.trim()); }
    if (data.primary_admin_email !== undefined) { fields.push("primary_admin_email = ?"); values.push(data.primary_admin_email.trim()); }
    if (data.primary_admin_phone !== undefined) { fields.push("primary_admin_phone = ?"); values.push(data.primary_admin_phone.trim()); }

    if (fields.length > 0) {
      fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')");
      values.push(id);
      controlDb.prepare(`UPDATE schools SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },
};
