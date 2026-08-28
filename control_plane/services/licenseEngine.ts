import { createHash, randomBytes } from "node:crypto";
import type { PlanTier, License } from "../types";

export const PLAN_CONFIGS: Record<
  PlanTier,
  {
    maxStudents: number;
    maxTeachers: number;
    maxInstallations: number;
    modules: string[];
  }
> = {
  trial: {
    maxStudents: 150,
    maxTeachers: 15,
    maxInstallations: 1,
    modules: ["cbt_exam", "question_bank", "grading_center", "report_cards"],
  },
  starter: {
    maxStudents: 300,
    maxTeachers: 25,
    maxInstallations: 1,
    modules: ["cbt_exam", "question_bank", "grading_center", "report_cards", "timetables"],
  },
  standard: {
    maxStudents: 800,
    maxTeachers: 60,
    maxInstallations: 2,
    modules: ["cbt_exam", "question_bank", "grading_center", "report_cards", "timetables", "guardian_portal", "attendance_tracker"],
  },
  enterprise: {
    maxStudents: 2500,
    maxTeachers: 200,
    maxInstallations: 5,
    modules: [
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
    ],
  },
  government: {
    maxStudents: 50000,
    maxTeachers: 3000,
    maxInstallations: 100,
    modules: [
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
    ],
  },
};

export function generateLicenseKey(schoolCode: string, planTier: PlanTier): string {
  const salt = randomBytes(6).toString("hex").toUpperCase();
  const raw = `${schoolCode}-${planTier.toUpperCase()}-${Date.now()}-${salt}`;
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16).toUpperCase();
  return `ACAD-${schoolCode}-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
}
