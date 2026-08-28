import { describe, test, expect, beforeAll } from "bun:test";
import { handleControlPlaneApi } from "../control_plane/server";
import { organizationRepository } from "../control_plane/database/repositories/organizationRepository";
import { schoolRepository } from "../control_plane/database/repositories/schoolRepository";
import { installationRepository } from "../control_plane/database/repositories/installationRepository";
import { alertRepository } from "../control_plane/database/repositories/alertRepository";
import { seedControlPlane } from "../control_plane/database/seed";
import { checkAndGenerateAlerts } from "../control_plane/services/alertEngine";
import { evaluateNodeHealth } from "../control_plane/services/healthEngine";
import { createHash } from "node:crypto";

let platformToken = "";
let schoolId = 1;
let installationId = "INST-TEST-01";

beforeAll(async () => {
  await seedControlPlane();

  // Create isolated test org, school, and installation
  const org = organizationRepository.create({
    name: "Live Data Test Org",
    slug: `live-data-test-org-${Date.now()}`,
    country: "Nigeria",
    contact_name: "Admin",
    contact_email: "liveadmin@test.ng",
    contact_phone: "08000000000",
  });

  const school = schoolRepository.create({
    org_id: org.id,
    school_code: `SCH-LIVE-${Date.now()}`,
    name: "Live Data Test School",
    status: "active",
  });
  schoolId = school.id;
  installationId = `INST-LIVE-${Date.now()}`;

  installationRepository.create({
    school_id: school.id,
    installation_id: installationId,
    node_id: "NODE-LIVE-01",
    secret_key_hash: createHash("sha256").update("test_secret").digest("hex"),
    software_version: "5.3.0",
    agent_version: "1.0.0",
    release_channel: "stable",
  });

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

describe("Supervisory Live Data & Control Endpoints", () => {
  test("1. Fetches School Live Stats with active client & exam counters", async () => {
    const req = new Request(`http://localhost/api/platform/schools/${schoolId}/live-stats`, {
      headers: { Authorization: `Bearer ${platformToken}` },
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = (await res?.json()) as any;
    expect(data.school_id).toBe(schoolId);
    expect(data.school_name).toBeDefined();
    expect(data.school_code).toBeDefined();
    expect(typeof data.active_connected_clients).toBe("number");
    expect(typeof data.active_exam_sessions).toBe("number");
    expect(typeof data.exams_conducted_today).toBe("number");
    expect(Array.isArray(data.recent_events)).toBe(true);
    expect(Array.isArray(data.active_alerts)).toBe(true);
  });

  test("2. Fetches School Telemetry Time-Series History", async () => {
    const req = new Request(`http://localhost/api/platform/schools/${schoolId}/telemetry-history?limit=30`, {
      headers: { Authorization: `Bearer ${platformToken}` },
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = (await res?.json()) as any;
    expect(data.school_id).toBe(schoolId);
    expect(Array.isArray(data.history)).toBe(true);
  });

  test("3. Fetches Installation Node Heartbeat History", async () => {
    const req = new Request(
      `http://localhost/api/platform/installations/${installationId}/heartbeat-history?limit=20`,
      {
        headers: { Authorization: `Bearer ${platformToken}` },
      }
    );
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = (await res?.json()) as any;
    expect(data.installation_id).toBe(installationId);
    expect(Array.isArray(data.heartbeats)).toBe(true);
  });

  test("4. Fetches Fleet Health Timeline for cross-school monitoring", async () => {
    const req = new Request("http://localhost/api/platform/monitoring/fleet-timeline?hours=24", {
      headers: { Authorization: `Bearer ${platformToken}` },
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = (await res?.json()) as any;
    expect(Array.isArray(data.timeline)).toBe(true);
    expect(data.hours_window).toBe(24);
  });

  test("5. Fetches Live Cross-School CBT Exam Activity", async () => {
    const req = new Request("http://localhost/api/platform/monitoring/exam-activity?limit=20", {
      headers: { Authorization: `Bearer ${platformToken}` },
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = (await res?.json()) as any;
    expect(Array.isArray(data.active_exams)).toBe(true);
    expect(typeof data.total_active_sessions).toBe("number");
  });

  test("6. Real-time Telemetry SSE Stream connects and returns text/event-stream", async () => {
    const req = new Request(`http://localhost/api/platform/stream?token=${platformToken}`, {
      headers: { Accept: "text/event-stream" },
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);
    expect(res?.headers.get("Content-Type")).toBe("text/event-stream");
  });

  test("7. Alert Engine Deduplication prevents duplicate alert flood", () => {
    const healthCritical = evaluateNodeHealth({
      storageUsagePercent: 96,
      memoryUsagePercent: 80,
      cpuUsagePercent: 50,
      uptimeSeconds: 3600,
      dbStatus: "ok",
    });

    // Pulse 1: Generates alert
    checkAndGenerateAlerts(schoolId, installationId, healthCritical);
    expect(alertRepository.hasOpenAlert(installationId, "storage_critical")).toBe(true);

    // Count open alerts for this node
    const beforeCount = alertRepository.listAll({ status: "open" }).filter((a) => a.installation_id === installationId).length;

    // Pulse 2: Same critical state should NOT duplicate alert
    checkAndGenerateAlerts(schoolId, installationId, healthCritical);
    const afterCount = alertRepository.listAll({ status: "open" }).filter((a) => a.installation_id === installationId).length;

    expect(afterCount).toBe(beforeCount);
  });
});
