import { controlDb } from "../client";
import type { FeatureFlag } from "../../types";

export const DEFAULT_ACAD_MODULES = [
  "cbt_exam",
  "question_bank",
  "grading_center",
  "report_cards",
  "timetables",
  "guardian_portal",
  "attendance_tracker",
  "fee_management",
  "offline_assignments",
  "ai_learning_engine",
];

export const featureFlagRepository = {
  getFlagsForSchool(schoolId: number): Record<string, boolean> {
    const flags: Record<string, boolean> = {};

    // Defaults: core modules are enabled by default
    for (const mod of DEFAULT_ACAD_MODULES) {
      flags[mod] = ["cbt_exam", "question_bank", "grading_center", "report_cards"].includes(mod);
    }

    const rows = controlDb
      .prepare("SELECT flag_key, is_enabled FROM feature_flags WHERE school_id = ?")
      .all(schoolId) as Array<{ flag_key: string; is_enabled: number }>;

    for (const r of rows) {
      flags[r.flag_key] = Boolean(r.is_enabled);
    }

    return flags;
  },

  setFlag(schoolId: number, flagKey: string, isEnabled: boolean, updatedBy?: number): void {
    controlDb
      .prepare(
        `INSERT INTO feature_flags (school_id, flag_key, is_enabled, updated_by, updated_at)
         VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
         ON CONFLICT(school_id, flag_key) DO UPDATE SET
           is_enabled = excluded.is_enabled,
           updated_by = excluded.updated_by,
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`
      )
      .run(schoolId, flagKey, isEnabled ? 1 : 0, updatedBy || null);
  },

  listAllFlags(): FeatureFlag[] {
    return controlDb.prepare("SELECT * FROM feature_flags ORDER BY school_id ASC, flag_key ASC").all() as FeatureFlag[];
  },
};
