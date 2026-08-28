import { Database } from "bun:sqlite";
import fs from "fs";
import { EXAMPOOL_DB_PATH } from "../../db";

export interface CampusEntitlements {
  school_id?: number;
  school_code?: string;
  plan_tier: "trial" | "starter" | "standard" | "enterprise" | "government" | "unlicensed";
  license_status: "trial" | "active" | "suspended" | "expired" | "cancelled" | "unlicensed";
  valid_until: string;
  is_expired: boolean;
  max_students: number;
  current_students: number;
  quota_remaining: number;
  current_software_version: string;
  latest_available_version: string;
  update_available: boolean;
  modules: Record<string, boolean>;
}

export const MODULE_ROUTE_MAP: Array<{
  pattern: RegExp;
  moduleKey: string;
  moduleName: string;
  requiredMinPlan: string;
}> = [
  {
    pattern: /^\/api\/(grading|class-grading|terms\/\d+\/results|annual-results|remarks|manual-scores)/i,
    moduleKey: "grading_center",
    moduleName: "Grading Center & Score Processing",
    requiredMinPlan: "trial",
  },
  {
    pattern: /^\/api\/report-cards/i,
    moduleKey: "report_cards",
    moduleName: "Report Card & Transcript Generator",
    requiredMinPlan: "trial",
  },
  {
    pattern: /^\/api\/(exams|exam-attempts|kiosk)/i,
    moduleKey: "cbt_exam",
    moduleName: "CBT Computer-Based Examination Engine",
    requiredMinPlan: "trial",
  },
  {
    pattern: /^\/api\/(questions|content-bank)/i,
    moduleKey: "question_bank",
    moduleName: "Institutional Question Bank & Item Repository",
    requiredMinPlan: "trial",
  },
  {
    pattern: /^\/api\/(timetables|academic-calendar|academic-sessions|academic-terms)/i,
    moduleKey: "timetables",
    moduleName: "Timetable & Academic Calendar Scheduler",
    requiredMinPlan: "starter",
  },
  {
    pattern: /^\/api\/(guardian|v2\/guardian-links)/i,
    moduleKey: "guardian_portal",
    moduleName: "Guardian & Ward Supervision Portal",
    requiredMinPlan: "standard",
  },
  {
    pattern: /^\/api\/attendance/i,
    moduleKey: "attendance_tracker",
    moduleName: "Attendance Tracking & Roll Call",
    requiredMinPlan: "standard",
  },
  {
    pattern: /^\/api\/fees/i,
    moduleKey: "fee_management",
    moduleName: "Fee & Financial Billing Management",
    requiredMinPlan: "enterprise",
  },
  {
    pattern: /^\/api\/(offline-assignments|assignments)/i,
    moduleKey: "offline_assignments",
    moduleName: "Offline Homework & Assignment Sync",
    requiredMinPlan: "enterprise",
  },
  {
    pattern: /^\/api\/ai/i,
    moduleKey: "ai_learning_engine",
    moduleName: "AI Learning Engine & Recommendation",
    requiredMinPlan: "enterprise",
  },
];

/**
 * Reads setting value from local SQLite database.
 */
function getSetting(key: string, defaultValue = ""): string {
  try {
    if (!fs.existsSync(EXAMPOOL_DB_PATH)) return defaultValue;
    const db = new Database(EXAMPOOL_DB_PATH, { readonly: true });
    try {
      db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as any;
      return row?.value !== undefined ? String(row.value) : defaultValue;
    } finally {
      db.close();
    }
  } catch {
    return defaultValue;
  }
}

/**
 * Saves setting value into local SQLite database.
 */
export function setSetting(key: string, value: string): void {
  try {
    if (!fs.existsSync(EXAMPOOL_DB_PATH)) return;
    const db = new Database(EXAMPOOL_DB_PATH);
    try {
      db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(key, value);
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("[EntitlementService] Failed to set setting:", err);
  }
}

/**
 * Fetches the campus entitlements and active modules.
 */
export function getCampusEntitlements(): CampusEntitlements {
  let currentStudents = 0;
  try {
    if (fs.existsSync(EXAMPOOL_DB_PATH)) {
      const db = new Database(EXAMPOOL_DB_PATH, { readonly: true });
      try {
        const countRow = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get() as any;
        currentStudents = countRow?.c || 0;
      } finally {
        db.close();
      }
    }
  } catch {}

  const planTier = (getSetting("license_plan_tier", "standard") as any);
  const licenseStatus = (getSetting("license_status", "active") as any);
  const validUntil = getSetting("license_valid_until", new Date(Date.now() + 30 * 86400000).toISOString());
  const maxStudents = Number(getSetting("license_max_students", "800")) || 800;
  const currentVersion = getSetting("current_software_version", "5.3.0");
  const latestVersion = getSetting("latest_available_version", currentVersion);

  const isExpired = licenseStatus === "expired" || (validUntil ? new Date(validUntil).getTime() < Date.now() : false);

  const modules: Record<string, boolean> = {
    cbt_exam: getSetting("feature_flag_cbt_exam", "true") === "true",
    question_bank: getSetting("feature_flag_question_bank", "true") === "true",
    grading_center: getSetting("feature_flag_grading_center", "true") === "true",
    report_cards: getSetting("feature_flag_report_cards", "true") === "true",
    timetables: getSetting("feature_flag_timetables", "true") === "true",
    guardian_portal: getSetting("feature_flag_guardian_portal", "true") === "true",
    attendance_tracker: getSetting("feature_flag_attendance_tracker", "true") === "true",
    fee_management: getSetting("feature_flag_fee_management", "false") === "true",
    offline_assignments: getSetting("feature_flag_offline_assignments", "false") === "true",
    ai_learning_engine: getSetting("feature_flag_ai_learning_engine", "false") === "true",
  };

  return {
    plan_tier: planTier,
    license_status: licenseStatus,
    valid_until: validUntil,
    is_expired: isExpired,
    max_students: maxStudents,
    current_students: currentStudents,
    quota_remaining: Math.max(0, maxStudents - currentStudents),
    current_software_version: currentVersion,
    latest_available_version: latestVersion,
    update_available: latestVersion !== currentVersion,
    modules,
  };
}

export class ModuleAccessError extends Error {
  status: number;
  moduleKey: string;
  moduleName: string;
  reason: "DISABLED_BY_SUPERVISOR" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED";

  constructor(moduleKey: string, moduleName: string, reason: "DISABLED_BY_SUPERVISOR" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED") {
    super(`Access to module '${moduleName}' (${moduleKey}) is blocked: ${reason}`);
    this.name = "ModuleAccessError";
    this.status = 403;
    this.moduleKey = moduleKey;
    this.moduleName = moduleName;
    this.reason = reason;
  }
}

/**
 * Checks whether an API route pathname is permitted under current supervisory feature flags & license.
 * Throws ModuleAccessError if blocked.
 */
export function checkModuleAccess(pathname: string): void {
  // 1. Bypass core operational endpoints (auth, system, node telemetry, supervisory control)
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/system") ||
    pathname.startsWith("/api/node") ||
    pathname.startsWith("/api/platform") ||
    pathname.startsWith("/api/notifications") ||
    pathname === "/api/users/me" ||
    pathname === "/api/health"
  ) {
    return;
  }

  // 2. Find matching module definition
  for (const mod of MODULE_ROUTE_MAP) {
    if (mod.pattern.test(pathname)) {
      const entitlements = getCampusEntitlements();

      // Check if license is suspended
      if (entitlements.license_status === "suspended") {
        throw new ModuleAccessError(mod.moduleKey, mod.moduleName, "LICENSE_SUSPENDED");
      }

      // Check if feature flag is explicitly disabled by the supervisory platform
      const isEnabled = entitlements.modules[mod.moduleKey];
      if (isEnabled === false) {
        throw new ModuleAccessError(mod.moduleKey, mod.moduleName, "DISABLED_BY_SUPERVISOR");
      }

      // Check if license is expired for non-core modules
      if (entitlements.is_expired && !["cbt_exam", "question_bank"].includes(mod.moduleKey)) {
        throw new ModuleAccessError(mod.moduleKey, mod.moduleName, "LICENSE_EXPIRED");
      }

      return;
    }
  }
}

/**
 * Enforces student quota limit on new student registrations.
 */
export function checkStudentQuota(): void {
  const entitlements = getCampusEntitlements();
  if (entitlements.current_students >= entitlements.max_students) {
    throw new Error(
      `STUDENT_QUOTA_EXCEEDED: Campus student enrollment capacity reached (limit: ${entitlements.max_students} students, enrolled: ${entitlements.current_students}). Upgrade campus license tier in ACAD Supervisory Control.`
    );
  }
}

/**
 * Applies a verified software update and bumps the local version.
 */
export function applySoftwareUpdate(targetVersion: string): { success: boolean; version: string; message: string } {
  setSetting("current_software_version", targetVersion.trim());
  setSetting("latest_available_version", targetVersion.trim());
  setSetting("last_update_applied_at", new Date().toISOString());

  return {
    success: true,
    version: targetVersion.trim(),
    message: `Software updated successfully to version ${targetVersion.trim()}`,
  };
}
