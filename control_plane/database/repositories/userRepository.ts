import { controlDb } from "../client";
import type { PlatformUser, PlatformRole } from "../../types";

export const userRepository = {
  findByEmail(email: string): (PlatformUser & { password_hash: string }) | null {
    return (
      (controlDb
        .prepare("SELECT * FROM platform_users WHERE email = ? LIMIT 1")
        .get(email.toLowerCase().trim()) as any) || null
    );
  },

  findById(id: number): PlatformUser | null {
    return (
      (controlDb
        .prepare("SELECT id, name, email, role, is_active, last_login_at, created_at FROM platform_users WHERE id = ?")
        .get(id) as any) || null
    );
  },

  listAll(): PlatformUser[] {
    return controlDb
      .prepare("SELECT id, name, email, role, is_active, last_login_at, created_at FROM platform_users ORDER BY id ASC")
      .all() as PlatformUser[];
  },

  create(name: string, email: string, passwordHash: string, role: PlatformRole): PlatformUser {
    const res = controlDb
      .prepare("INSERT INTO platform_users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)")
      .run(name.trim(), email.toLowerCase().trim(), passwordHash, role);
    const newId = Number(res.lastInsertRowid);
    return this.findById(newId)!;
  },

  updateLastLogin(id: number): void {
    controlDb
      .prepare("UPDATE platform_users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?")
      .run(id);
  },

  updateStatus(id: number, isActive: number): void {
    controlDb.prepare("UPDATE platform_users SET is_active = ? WHERE id = ?").run(isActive, id);
  },

  updateRole(id: number, role: PlatformRole): void {
    controlDb.prepare("UPDATE platform_users SET role = ? WHERE id = ?").run(role, id);
  },
};
