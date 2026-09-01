import { describe, test, expect, beforeAll } from "bun:test";
import { seedControlPlane } from "../control_plane/database/seed";
import { handleControlPlaneApi } from "../control_plane/server";
import { userRepository } from "../control_plane/database/repositories/userRepository";
import { schoolRepository } from "../control_plane/database/repositories/schoolRepository";
import { generatePlatformToken } from "../control_plane/auth";

describe("ACAD Supervisory Mission Control — Full System Functionality & Live Data Verification", () => {
  let platformToken: string;
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    await seedControlPlane();
    const owner = userRepository.findByEmail("owner@acad.ng");
    if (!owner) throw new Error("Seeded platform owner not found");

    platformToken = generatePlatformToken(owner);
    authHeaders = {
      Authorization: `Bearer ${platformToken}`,
      "Content-Type": "application/json",
    };
  });

  const apiGet = async (path: string): Promise<any> => {
    const req = new Request(`http://localhost:8001${path}`, { method: "GET", headers: authHeaders });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    return (await res!.json()) as any;
  };

  const apiPost = async (path: string, body: any): Promise<Response> => {
    const req = new Request(`http://localhost:8001${path}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(body),
    });
    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res).not.toBeNull();
    return res!;
  };

  test("1. Overview & Live Host Telemetry (/api/platform/overview)", async () => {
    const data: any = await apiGet("/api/platform/overview");
    expect(data.metrics).toBeDefined();
    expect(data.metrics.totalSchools).toBeGreaterThan(0);
    expect(data.metrics.totalStudentsAggregate).toBeGreaterThan(0);
    expect(data.metrics.totalTeachersAggregate).toBeGreaterThan(0);
    expect(data.metrics.totalQuestionsAggregate).toBeGreaterThan(0);
    expect(data.metrics.totalExamsAggregate).toBeGreaterThan(0);
    expect(data.localExamPool).toBeDefined();
    expect(data.localExamPool.database.integrity).toBe("ok");
    expect(data.activeAlerts).toBeInstanceOf(Array);
    expect(data.liveEvents).toBeInstanceOf(Array);
  });

  test("2. Host Local System Diagnostics & Actions (/api/platform/local-exam-pool/action)", async () => {
    const diagRes = await apiPost("/api/platform/local-exam-pool/action", { action: "RUN_DIAGNOSTICS" });
    expect(diagRes.status).toBe(200);
    const diag: any = await diagRes.json();
    expect(diag.table_counts.students).toBeGreaterThan(0);
    expect(diag.table_counts.teachers).toBeGreaterThan(0);
    expect(diag.table_counts.questions).toBeGreaterThan(0);
    expect(diag.table_counts.exams).toBeGreaterThan(0);
    expect(diag.integrity_check).toBe("ok");

    const pulseRes = await apiPost("/api/platform/local-exam-pool/action", { action: "TRIGGER_PULSE" });
    expect(pulseRes.status).toBe(200);

    const walRes = await apiPost("/api/platform/local-exam-pool/action", { action: "WAL_CHECKPOINT" });
    expect(walRes.status).toBe(200);
  });

  test("3. Schools Directory & Detail (/api/platform/schools)", async () => {
    const listData: any = await apiGet("/api/platform/schools");
    expect(listData.schools).toBeInstanceOf(Array);
    expect(listData.schools.length).toBeGreaterThan(0);

    const firstSchool = listData.schools[0];
    const detailData: any = await apiGet(`/api/platform/schools/${firstSchool.id}`);
    expect(detailData.school).toBeDefined();
    expect(detailData.school.name).toBe(firstSchool.name);
    expect(detailData.installations).toBeInstanceOf(Array);
  });

  test("4. Installations Management (/api/platform/installations)", async () => {
    const data: any = await apiGet("/api/platform/installations");
    expect(data.installations).toBeInstanceOf(Array);
    expect(data.installations.length).toBeGreaterThan(0);
  });

  test("5. Monitoring & Fleet Timeline (/api/platform/monitoring/fleet-timeline & exam-activity)", async () => {
    const timelineData: any = await apiGet("/api/platform/monitoring/fleet-timeline?hours=24");
    expect(timelineData.timeline).toBeInstanceOf(Array);

    const examData: any = await apiGet("/api/platform/monitoring/exam-activity?limit=25");
    expect(examData.activities).toBeInstanceOf(Array);
  });

  test("6. Trials & Conversion Pipeline (/api/platform/trials)", async () => {
    const data: any = await apiGet("/api/platform/trials");
    expect(data.trials).toBeInstanceOf(Array);
  });

  test("7. Alerts & Automated Alarms (/api/platform/alerts)", async () => {
    const data: any = await apiGet("/api/platform/alerts");
    expect(data.alerts).toBeInstanceOf(Array);
  });

  test("8. Incidents & Remediation (/api/platform/incidents)", async () => {
    const data: any = await apiGet("/api/platform/incidents");
    expect(data.incidents).toBeInstanceOf(Array);

    // Test creating a new support incident
    const schools = schoolRepository.listAll();
    const targetSchool = schools[0];
    if (targetSchool) {
      const res = await apiPost("/api/platform/incidents", {
        school_id: targetSchool.id,
        title: "Test Integration Diagnostic Incident",
        description: "Automated test incident verification.",
        severity: "low",
      });
      expect([200, 201]).toContain(res.status);
      const created: any = await res.json();
      expect(created.incident).toBeDefined();
      expect(created.incident.title).toBe("Test Integration Diagnostic Incident");
    }
  });

  test("9. Backups Registry (/api/platform/backups)", async () => {
    const data: any = await apiGet("/api/platform/backups");
    expect(data.backups).toBeInstanceOf(Array);
  });

  test("10. Licenses Registry (/api/platform/licenses)", async () => {
    const data: any = await apiGet("/api/platform/licenses");
    expect(data.licenses).toBeInstanceOf(Array);
    expect(data.licenses.length).toBeGreaterThan(0);
  });

  test("11. Releases & Distribution (/api/platform/releases)", async () => {
    const data: any = await apiGet("/api/platform/releases");
    expect(data.releases).toBeInstanceOf(Array);
    expect(data.releases.length).toBeGreaterThan(0);
  });

  test("12. Feature Flags (/api/platform/feature-flags/:schoolId)", async () => {
    const schools = schoolRepository.listAll();
    expect(schools.length).toBeGreaterThan(0);
    const targetSchool = schools[0];
    if (targetSchool) {
      const data: any = await apiGet(`/api/platform/feature-flags/${targetSchool.id}`);
      expect(data.flags).toBeDefined();
    }
  });

  test("13. Tamper-Evident Audit Logs (/api/platform/audit-logs)", async () => {
    const data: any = await apiGet("/api/platform/audit-logs");
    expect(data.logs).toBeInstanceOf(Array);
    expect(data.logs.length).toBeGreaterThan(0);
  });

  test("14. Bidirectional Sync Queue (/api/platform/sync-queue)", async () => {
    const data: any = await apiGet("/api/platform/sync-queue");
    expect(data.queue).toBeInstanceOf(Array);
  });

  test("15. Settings & Operators (/api/platform/users)", async () => {
    const data: any = await apiGet("/api/platform/users");
    expect(data.users).toBeInstanceOf(Array);
    expect(data.users.length).toBeGreaterThan(0);
  });
});
