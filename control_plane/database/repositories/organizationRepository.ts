import { controlDb } from "../client";
import type { Organization } from "../../types";

export const organizationRepository = {
  listAll(): Organization[] {
    return controlDb.prepare("SELECT * FROM organizations ORDER BY name ASC").all() as Organization[];
  },

  findById(id: number): Organization | null {
    return (controlDb.prepare("SELECT * FROM organizations WHERE id = ?").get(id) as any) || null;
  },

  findBySlug(slug: string): Organization | null {
    return (controlDb.prepare("SELECT * FROM organizations WHERE slug = ?").get(slug) as any) || null;
  },

  create(data: {
    name: string;
    slug: string;
    country?: string;
    state?: string;
    city?: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
  }): Organization {
    const res = controlDb
      .prepare(
        `INSERT INTO organizations (name, slug, country, state, city, contact_name, contact_email, contact_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name.trim(),
        data.slug.toLowerCase().trim(),
        data.country || "Nigeria",
        data.state || null,
        data.city || null,
        data.contact_name.trim(),
        data.contact_email.toLowerCase().trim(),
        data.contact_phone.trim()
      );
    return this.findById(Number(res.lastInsertRowid))!;
  },
};
