import { controlDb } from "../client";
import type { BackupTelemetry } from "../../types";

export const backupRepository = {
  listAll(limit = 100): BackupTelemetry[] {
    return controlDb
      .prepare(
        `SELECT 
           b.*,
           s.name as school_name
         FROM backups_telemetry b
         JOIN schools s ON b.school_id = s.id
         ORDER BY b.id DESC LIMIT ?`
      )
      .all(limit) as BackupTelemetry[];
  },

  listBySchoolId(schoolId: number, limit = 50): BackupTelemetry[] {
    return controlDb
      .prepare(
        `SELECT * FROM backups_telemetry 
         WHERE school_id = ? 
         ORDER BY id DESC LIMIT ?`
      )
      .all(schoolId, limit) as BackupTelemetry[];
  },

  record(data: {
    installation_id: string;
    school_id: number;
    backup_type?: "local_snapshot" | "encrypted_cloud_sync";
    backup_size_bytes: number;
    destination: string;
    is_successful: boolean;
    duration_ms?: number;
    error_message?: string;
    timestamp: string;
  }): void {
    controlDb
      .prepare(
        `INSERT INTO backups_telemetry (
           installation_id, school_id, backup_type, backup_size_bytes,
           destination, is_successful, duration_ms, error_message, timestamp
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.installation_id,
        data.school_id,
        data.backup_type || "local_snapshot",
        data.backup_size_bytes,
        data.destination,
        data.is_successful ? 1 : 0,
        data.duration_ms || 0,
        data.error_message || null,
        data.timestamp
      );
  },
};
