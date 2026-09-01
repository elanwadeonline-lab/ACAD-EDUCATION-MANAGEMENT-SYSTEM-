import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { setSetting, getCampusEntitlements, checkModuleAccess, ModuleAccessError, applySoftwareUpdate } from "../src/services/entitlementService";
import { handleControlPlaneApi } from "../control_plane/server";
import { seedControlPlane } from "../control_plane/database/seed";
import { organizationRepository } from "../control_plane/database/repositories/organizationRepository";
import { schoolRepository } from "../control_plane/database/repositories/schoolRepository";
import { featureFlagRepository } from "../control_plane/database/repositories/featureFlagRepository";
import { controlDb } from "../control_plane/database/client";

let platformToken = "";
let testSchoolId = 1;

beforeAll(async () => {
  await seedControlPlane();

  // Create isolated test org & school for foreign key validity
  const org = organizationRepository.create({
    name: "Entitlement Test Org",
    slug: `entitlement-test-org-${Date.now()}`,
    country: "Nigeria",
    contact_name: "Admin",
    contact_email: "admin@test.ng",
    contact_phone: "08000000000",
  });

  const school = schoolRepository.create({
    org_id: org.id,
    school_code: `TEST-SCH-${Date.now()}`,
    name: "Entitlement Test School",
    status: "active",
  });
  testSchoolId = school.id;

  // Login as platform owner
  const loginReq = new Request("http://localhost/api/platform/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@acad.ng",
      password: "AdminPassword123!",
    }),
  });
  const res = await handleControlPlaneApi(loginReq, new URL(loginReq.url));
  const data = (await res?.json()) as any;
  platformToken = data.token;
});

describe("Institutional Feature Gating & Entitlement Enforcement", () => {
  test("1. Allows access to permitted core modules when enabled", () => {
    setSetting("feature_flag_cbt_exam", "true");
    setSetting("feature_flag_grading_center", "true");
    setSetting("license_status", "active");

    expect(() => checkModuleAccess("/api/exams")).not.toThrow();
    expect(() => checkModuleAccess("/api/grading/policies")).not.toThrow();
    expect(() => checkModuleAccess("/api/questions")).not.toThrow();
  });

  test("2. Blocks disabled module with ModuleAccessError (Grading Center disabled)", () => {
    setSetting("feature_flag_grading_center", "false");

    expect(() => checkModuleAccess("/api/grading/classes/1")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/terms/1/results")).toThrow(ModuleAccessError);
  });

  test("3. Blocks disabled module with ModuleAccessError (Timetable disabled)", () => {
    setSetting("feature_flag_timetables", "false");

    expect(() => checkModuleAccess("/api/timetables/generate")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/academic-calendar")).toThrow(ModuleAccessError);
  });

  test("4. Blocks disabled module with ModuleAccessError (Guardian Portal disabled)", () => {
    setSetting("feature_flag_guardian_portal", "false");

    expect(() => checkModuleAccess("/api/guardian/wards")).toThrow(ModuleAccessError);
  });

  test("5. Suspended license blocks all gated institutional modules", () => {
    setSetting("license_status", "suspended");

    expect(() => checkModuleAccess("/api/grading/policies")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/timetables")).toThrow(ModuleAccessError);

    // Core auth & system routes remain accessible
    expect(() => checkModuleAccess("/api/auth/login")).not.toThrow();
    expect(() => checkModuleAccess("/api/system/entitlements")).not.toThrow();
  });

  test("6. Campus Entitlements API returns complete license and module map", () => {
    setSetting("license_plan_tier", "enterprise");
    setSetting("license_status", "active");
    setSetting("license_max_students", "2500");
    setSetting("feature_flag_grading_center", "true");
    setSetting("feature_flag_fee_management", "true");

    const entitlements = getCampusEntitlements();
    expect(entitlements.plan_tier).toBe("enterprise");
    expect(entitlements.license_status).toBe("active");
    expect(entitlements.max_students).toBe(2500);
    expect(entitlements.modules.grading_center).toBe(true);
    expect(entitlements.modules.fee_management).toBe(true);
  });

  test("7. Continuous Deployment (CI/CD) Software Update Engine applies version bump", () => {
    const updateRes = applySoftwareUpdate("5.4.0-enterprise");
    expect(updateRes.success).toBe(true);
    expect(updateRes.version).toBe("5.4.0-enterprise");

    const entitlements = getCampusEntitlements();
    expect(entitlements.current_software_version).toBe("5.4.0-enterprise");
    expect(entitlements.latest_available_version).toBe("5.4.0-enterprise");
    expect(entitlements.update_available).toBe(false);
  });

  test("8. Supervisory Platform can toggle feature flags via API and verify in repository", async () => {
    const toggleReq = new Request(`http://localhost/api/platform/feature-flags/${testSchoolId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${platformToken}`,
      },
      body: JSON.stringify({
        flag_key: "grading_center",
        is_enabled: false,
      }),
    });

    const toggleRes = await handleControlPlaneApi(toggleReq, new URL(toggleReq.url));
    expect(toggleRes?.status).toBe(200);

    const flags = featureFlagRepository.getFlagsForSchool(testSchoolId);
    expect(flags.grading_center).toBe(false);

    // Re-enable flag
    const reEnableReq = new Request(`http://localhost/api/platform/feature-flags/${testSchoolId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${platformToken}`,
      },
      body: JSON.stringify({
        flag_key: "grading_center",
        is_enabled: true,
      }),
    });
    await handleControlPlaneApi(reEnableReq, new URL(reEnableReq.url));
    expect(featureFlagRepository.getFlagsForSchool(testSchoolId).grading_center).toBe(true);
  });

  afterAll(() => {
    setSetting("feature_flag_grading_center", "true");
    setSetting("feature_flag_timetables", "true");
    setSetting("feature_flag_guardian_portal", "true");
    setSetting("feature_flag_cbt_exam", "true");
    setSetting("feature_flag_question_bank", "true");
    setSetting("feature_flag_report_cards", "true");
    setSetting("feature_flag_attendance_tracker", "true");
    setSetting("feature_flag_fee_management", "true");
    setSetting("feature_flag_offline_assignments", "true");
    setSetting("feature_flag_ai_learning_engine", "true");
    setSetting("license_status", "active");
    setSetting("plan_tier", "enterprise");
    try {
      controlDb.run("DELETE FROM schools WHERE school_code != 'ACAD-LOCAL'");
    } catch {}
  });
});
