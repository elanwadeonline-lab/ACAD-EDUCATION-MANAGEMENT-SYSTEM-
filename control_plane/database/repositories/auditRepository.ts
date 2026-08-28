import { controlDb } from "../client";
import type { PlatformAuditLog } from "../../types";

export const auditRepository = {
  record(data: {
    actor_id?: number | null;
    actor_email: string;
    action: string;
    target_type: string;
    target_id: string;
    details?: any;
    ip_address?: string;
  }): void {
    controlDb
      .prepare(
        `INSERT INTO platform_audit_logs (
           actor_id, actor_email, action, target_type, target_id, details_json, ip_address
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.actor_id || null,
        data.actor_email,
        data.action,
        data.target_type,
        data.target_id,
        data.details ? JSON.stringify(data.details) : null,
        data.ip_address || null
      );
  },

  listRecent(limit = 100): PlatformAuditLog[] {
    return controlDb
      .prepare("SELECT * FROM platform_audit_logs ORDER BY id DESC LIMIT ?")
      .all(limit) as PlatformAuditLog[];
  },
};
