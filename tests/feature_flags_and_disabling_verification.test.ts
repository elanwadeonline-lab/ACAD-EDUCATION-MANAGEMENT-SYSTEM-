import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { setSetting, checkModuleAccess, ModuleAccessError } from "../src/services/entitlementService";
import { schoolRepository } from "../control_plane/database/repositories/schoolRepository";
import { featureFlagRepository } from "../control_plane/database/repositories/featureFlagRepository";
import { handleControlPlaneApi } from "../control_plane/server";
import { seedControlPlane } from "../control_plane/database/seed";

describe("Feature Flags, Modular Gating & Live Data Verification", () => {
  let platformToken = "";
  let liveSchool: any;

  beforeAll(async () => {
    await seedControlPlane();

    // Fetch the single live primary school
    const schools = schoolRepository.listAll();
    liveSchool = schools[0];

    // Authenticate as platform owner
    const loginReq = new Request("http://localhost/api/platform/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@acad.ng",
        password: "AdminPassword123!",
      }),
    });
    const loginRes = await handleControlPlaneApi(loginReq, new URL(loginReq.url));
    const loginData = await loginRes?.json();
    platformToken = loginData.token;
  });

  afterAll(() => {
    // Restore all 10 flags to enabled and enterprise tier
    const allFlags = [
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
    for (const f of allFlags) {
      setSetting(`feature_flag_${f}`, "true");
      if (liveSchool?.id) {
        featureFlagRepository.setFlag(liveSchool.id, f, true, 1);
      }
    }
    setSetting("license_status", "active");
    setSetting("license_plan_tier", "enterprise");
  });

  it("1. Verifies that ONLY the single real live school exists in the supervisory database", () => {
    const schools = schoolRepository.listAll();
    expect(schools.length).toBe(1);
    expect(schools[0].school_code).toBe("ACAD-LOCAL");
    expect(schools[0].status).toBe("active");
  });

  it("2. Guardian Portal & Guardian Inquiries are strictly disabled when toggled off", async () => {
    // Disable Guardian Portal via Supervisory Control API
    const req = new Request(`http://localhost/api/platform/feature-flags/${liveSchool.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${platformToken}`,
      },
      body: JSON.stringify({
        flag_key: "guardian_portal",
        is_enabled: false,
      }),
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    // Verify module access is rejected
    expect(() => checkModuleAccess("/api/guardian/wards")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/guardian/messages/threads")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/guardian/wards/1/attendance")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/guardian/wards/1/fees")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/guardian/wards/1/results")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/admin/guardian-links")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/admin/messages/threads")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/teacher/messages/threads")).toThrow(ModuleAccessError);
  });

  it("3. CBT Engine is strictly disabled when toggled off", async () => {
    const req = new Request(`http://localhost/api/platform/feature-flags/${liveSchool.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${platformToken}`,
      },
      body: JSON.stringify({
        flag_key: "cbt_exam",
        is_enabled: false,
      }),
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    expect(() => checkModuleAccess("/api/exams")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/exam-attempts")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/kiosk/status")).toThrow(ModuleAccessError);
  });

  it("4. Question Bank (including JAMB repository) is strictly disabled when toggled off", async () => {
    const req = new Request(`http://localhost/api/platform/feature-flags/${liveSchool.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${platformToken}`,
      },
      body: JSON.stringify({
        flag_key: "question_bank",
        is_enabled: false,
      }),
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    expect(() => checkModuleAccess("/api/questions")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/content-bank")).toThrow(ModuleAccessError);
    expect(() => checkModuleAccess("/api/teacher/questions")).toThrow(ModuleAccessError);
  });

  it("5. Re-enabling feature flags immediately restores access across all endpoints", async () => {
    const flagsToReEnable = ["guardian_portal", "cbt_exam", "question_bank"];
    for (const flagKey of flagsToReEnable) {
      const req = new Request(`http://localhost/api/platform/feature-flags/${liveSchool.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${platformToken}`,
        },
        body: JSON.stringify({
          flag_key: flagKey,
          is_enabled: true,
        }),
      });
      const res = await handleControlPlaneApi(req, new URL(req.url));
      expect(res?.status).toBe(200);
    }

    // Verify all routes now pass without throwing
    expect(() => checkModuleAccess("/api/guardian/wards")).not.toThrow();
    expect(() => checkModuleAccess("/api/guardian/messages/threads")).not.toThrow();
    expect(() => checkModuleAccess("/api/exams")).not.toThrow();
    expect(() => checkModuleAccess("/api/questions")).not.toThrow();
  });
});
