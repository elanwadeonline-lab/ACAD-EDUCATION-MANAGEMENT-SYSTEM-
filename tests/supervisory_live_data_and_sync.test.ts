import { describe, test, expect, beforeAll } from "bun:test";
import { seedControlPlane } from "../control_plane/database/seed";
import { handleControlPlaneApi } from "../control_plane/server";
import { userRepository } from "../control_plane/database/repositories/userRepository";
import { generatePlatformToken } from "../control_plane/auth";
import { sampleSystemMetrics, sampleDatabaseMetrics, sampleOperationalMetrics } from "../node_agent/metrics";
import { buildHeartbeatPayload } from "../node_agent/heartbeat";

describe("ACAD Supervisory Control Plane - Live Host Exam Pool & Zero Mockup Verification", () => {
  let platformToken: string;
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    await seedControlPlane();

    // Use a real seeded user so generatePlatformToken produces a JWT the verify middleware accepts
    const owner = userRepository.findByEmail("owner@acad.ng");
    if (!owner) throw new Error("Seeded owner@acad.ng not found — run seedControlPlane first");

    platformToken = generatePlatformToken(owner);
    authHeaders = {
      Authorization: `Bearer ${platformToken}`,
      "Content-Type": "application/json",
    };
  });

  test("1. Node Metrics Engine samples real academic data from exampool.db", () => {
    const system = sampleSystemMetrics();
    const db = sampleDatabaseMetrics();
    const operational = sampleOperationalMetrics();

    expect(system.hostname).toBeDefined();
    expect(system.serverPort).toBe(8001);
    expect(system.cpuUsagePercent).toBeGreaterThanOrEqual(0);
    expect(system.memoryUsagePercent).toBeGreaterThanOrEqual(0);
    expect(system.freeMemoryBytes).toBeGreaterThan(0);
    expect(system.totalMemoryBytes).toBeGreaterThan(0);

    expect(db.status).toBe("healthy");
    expect(db.integrity).toBe("ok");
    expect(db.dbSizeBytes).toBeGreaterThan(0);

    // Verify real live counts from exampool.db (67 students, 55 teachers, 36 questions, 11 exams)
    expect(operational.totalStudents).toBeGreaterThan(0);
    expect(operational.totalTeachers).toBeGreaterThan(0);
    expect(operational.totalQuestions).toBeGreaterThan(0);
    expect(operational.totalExams).toBeGreaterThan(0);

    console.log("[Test] Live operational metrics from exampool.db:", {
      students: operational.totalStudents,
      teachers: operational.totalTeachers,
      questions: operational.totalQuestions,
      exams: operational.totalExams,
      classes: operational.totalClasses,
      attempts: operational.totalAttempts,
    });
  });

  test("2. buildHeartbeatPayload contains comprehensive telemetry without mockup values", () => {
    const payload = buildHeartbeatPayload("5.3.0");

    expect(payload.installationId).toBeDefined();
    expect(payload.nodeId).toBeDefined();
    expect(payload.softwareVersion).toBe("5.3.0");
    expect(payload.system.hostname).toBeDefined();
    expect(payload.system.serverPort).toBe(8001);
    expect(payload.system.freeMemoryBytes).toBeGreaterThan(0);
    expect(payload.database.integrity).toBe("ok");
    expect(payload.database.dbPath).toBeDefined();
    expect(payload.operational.totalQuestions).toBeGreaterThan(0);
    expect(payload.operational.totalExams).toBeGreaterThan(0);
    expect(payload.operational.totalStudents).toBeGreaterThan(0);
    expect(payload.operational.totalTeachers).toBeGreaterThan(0);
    expect(payload.operational.totalClasses).toBeGreaterThanOrEqual(0);
    expect(payload.operational.totalGuardians).toBeGreaterThanOrEqual(0);
  });

  test("3. GET /api/platform/local-exam-pool/live returns real host vitals and exam pool statistics", async () => {
    const req = new Request("http://localhost:8001/api/platform/local-exam-pool/live", {
      method: "GET",
      headers: authHeaders,
    });
    const url = new URL(req.url);
    const res = await handleControlPlaneApi(req, url);

    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);

    const data = await res!.json();
    expect(data.identity).toBeDefined();
    expect(data.system.hostname).toBeDefined();
    expect(data.system.localIp).toBeDefined();
    expect(data.database.integrity).toBe("ok");
    expect(data.database.dbSizeBytes).toBeGreaterThan(0);
    expect(data.operational.totalQuestions).toBeGreaterThan(0);
    expect(data.operational.totalExams).toBeGreaterThan(0);
    expect(data.operational.totalStudents).toBeGreaterThan(0);
    expect(data.recentExams).toBeInstanceOf(Array);
    expect(data.recentQuestions).toBeInstanceOf(Array);

    console.log("[Test] Local exam pool snapshot:", {
      totalQuestions: data.operational.totalQuestions,
      totalExams: data.operational.totalExams,
      totalStudents: data.operational.totalStudents,
      totalTeachers: data.operational.totalTeachers,
      dbIntegrity: data.database.integrity,
      dbSizeMB: (data.database.dbSizeBytes / 1024 / 1024).toFixed(2),
    });
  });

  test("4. POST /api/platform/local-exam-pool/action — RUN_DIAGNOSTICS returns real table counts", async () => {
    const req = new Request("http://localhost:8001/api/platform/local-exam-pool/action", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ action: "RUN_DIAGNOSTICS" }),
    });
    const url = new URL(req.url);
    const res = await handleControlPlaneApi(req, url);

    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);

    const data = await res!.json();
    expect(data.success).toBe(true);
    expect(data.integrity_check).toBe("ok");
    expect(data.status).toBe("HEALTHY");
    expect(data.table_counts.questions).toBeGreaterThan(0);
    expect(data.table_counts.exams).toBeGreaterThan(0);
    expect(data.table_counts.students).toBeGreaterThan(0);
    expect(data.database_size_bytes).toBeGreaterThan(0);

    console.log("[Test] RUN_DIAGNOSTICS result:", data.table_counts);
  });

  test("5. POST /api/platform/local-exam-pool/action — WAL_CHECKPOINT and FLUSH_QUEUE execute successfully", async () => {
    // WAL Checkpoint
    const cpReq = new Request("http://localhost:8001/api/platform/local-exam-pool/action", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ action: "WAL_CHECKPOINT" }),
    });
    const cpRes = await handleControlPlaneApi(cpReq, new URL(cpReq.url));
    expect(cpRes!.status).toBe(200);
    const cpData = await cpRes!.json();
    expect(cpData.success).toBe(true);
    expect(cpData.action).toBe("WAL_CHECKPOINT");

    // Flush Queue
    const fReq = new Request("http://localhost:8001/api/platform/local-exam-pool/action", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ action: "FLUSH_QUEUE" }),
    });
    const fRes = await handleControlPlaneApi(fReq, new URL(fReq.url));
    expect(fRes!.status).toBe(200);
    const fData = await fRes!.json();
    expect(fData.success).toBe(true);
    expect(fData.action).toBe("FLUSH_QUEUE");
    expect(typeof fData.events_flushed).toBe("number");
  });

  test("6. GET /api/platform/overview embeds localExamPool with real database counts", async () => {
    const req = new Request("http://localhost:8001/api/platform/overview", {
      method: "GET",
      headers: authHeaders,
    });
    const url = new URL(req.url);
    const res = await handleControlPlaneApi(req, url);

    expect(res!.status).toBe(200);
    const data = await res!.json();

    expect(data.metrics).toBeDefined();
    expect(data.localExamPool).toBeDefined();
    expect(data.localExamPool.database.integrity).toBe("ok");
    expect(data.localExamPool.operational.totalQuestions).toBeGreaterThan(0);
    expect(data.localExamPool.operational.totalStudents).toBeGreaterThan(0);
    expect(data.localExamPool.recentExams).toBeInstanceOf(Array);
    expect(data.localExamPool.recentQuestions).toBeInstanceOf(Array);

    // No mock numbers: verify no "500+" or "35+" strings exist in the response
    const serialized = JSON.stringify(data.metrics);
    expect(serialized).not.toContain("500+");
    expect(serialized).not.toContain("35+");

    console.log("[Test] Overview metrics.totalStudentsAggregate:", data.metrics.totalStudentsAggregate);
    console.log("[Test] Overview localExamPool.operational:", {
      totalQuestions: data.localExamPool.operational.totalQuestions,
      totalExams: data.localExamPool.operational.totalExams,
      totalStudents: data.localExamPool.operational.totalStudents,
    });
  });
});
