import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { handleControlPlaneApi } from "../control_plane/server";
import { seedControlPlane } from "../control_plane/database/seed";
import { controlDb } from "../control_plane/database/client";
import { createHmac } from "node:crypto";

describe("ACAD Supervisory Control Plane - End-to-End Operational Journey", () => {
  let authToken: string;
  let createdOrgId: number;
  let createdSchoolId: number;
  let createdTrialId: number;
  let createdInstallationId: string;
  let nodeSecretKey: string;
  let createdIncidentId: number;
  let createdAlertId: number;

  beforeAll(async () => {
    await seedControlPlane();
  });

  it("Step 1: Authenticates platform owner with Argon2id and issues platform JWT", async () => {
    const req = new Request("http://localhost/api/platform/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@acad.ng",
        password: "AdminPassword123!",
      }),
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeString();
    expect(data.user.email).toBe("owner@acad.ng");
    expect(data.user.role).toBe("owner");

    authToken = data.token;
  });

  it("Step 2: Fetches Command Center overview metrics", async () => {
    const req = new Request("http://localhost/api/platform/overview", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.metrics).toBeDefined();
    expect(data.metrics.totalSchools).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.liveEvents)).toBe(true);
  });

  it("Step 3: Creates a new Educational Organization", async () => {
    const slug = `apex-academies-${Date.now()}`;
    const req = new Request("http://localhost/api/platform/organizations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Apex Group of Schools",
        slug,
        country: "Nigeria",
        state: "Oyo State",
        city: "Ibadan",
        contact_name: "Chief O. Adeyemi",
        contact_email: `adeyemi_${Date.now()}@apex.edu.ng`,
        contact_phone: "+234 802 333 9988",
      }),
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(201);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.organization.id).toBeGreaterThan(0);
    expect(data.organization.slug).toBe(slug);

    createdOrgId = data.organization.id;
  });

  it("Step 4: Provisions a new School Campus and initiates automatic trial", async () => {
    const code = `APX-${Math.floor(100 + Math.random() * 900)}`;
    const req = new Request("http://localhost/api/platform/schools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        org_id: createdOrgId,
        school_code: code,
        name: "Apex College Bodija",
        location: "Bodija, Ibadan",
        status: "trial",
        primary_admin_name: "Mrs. K. Adeleke",
        primary_admin_email: "admin@apex-bodija.edu.ng",
        primary_admin_phone: "+234 803 777 2211",
        trial_duration_days: 30,
        trial_student_limit: 350,
      }),
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(201);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.school.id).toBeGreaterThan(0);
    expect(data.school.school_code).toBe(code);

    createdSchoolId = data.school.id;
  });

  it("Step 5: Provisions on-premise installation node credentials", async () => {
    const req = new Request("http://localhost/api/platform/installations/provision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        school_id: createdSchoolId,
        node_id: "NODE-BODIJA-LAB-01",
        release_channel: "stable",
      }),
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(201);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.credentials.installation_id).toBeString();
    expect(data.credentials.secret_key).toBeString();

    createdInstallationId = data.credentials.installation_id;
    nodeSecretKey = data.credentials.secret_key;
  });

  it("Step 6: Node Agent transmits signed HMAC-SHA256 heartbeat pulse", async () => {
    const rawPayload = JSON.stringify({
      installationId: createdInstallationId,
      nodeId: "NODE-BODIJA-LAB-01",
      softwareVersion: "5.3.0",
      agentVersion: "1.0.0",
      timestamp: new Date().toISOString(),
      system: {
        cpuUsagePercent: 22,
        memoryUsagePercent: 48,
        storageUsagePercent: 35,
        localIp: "192.168.1.50",
      },
      database: {
        status: "healthy",
      },
      operational: {
        connectedClients: 45,
        activeExamSessions: 2,
        bufferedEventsCount: 0,
        lastBackupHoursAgo: 2,
      },
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", nodeSecretKey)
      .update(`${createdInstallationId}:${timestamp}:${rawPayload}`)
      .digest("hex");

    const req = new Request("http://localhost/api/node/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ACAD-Installation-Id": createdInstallationId,
        "X-ACAD-Timestamp": String(timestamp),
        "X-ACAD-Signature": signature,
      },
      body: rawPayload,
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.acknowledged).toBe(true);
    expect(data.health_status).toBe("healthy");
    expect(data.health_score).toBe(100);
  });

  it("Step 7: Node Agent pushes telemetry event stream with HMAC authentication", async () => {
    const rawPayload = JSON.stringify({
      events: [
        {
          event_type: "CBT_EXAM_STARTED",
          severity: "info",
          metadata: { subject: "Mathematics", grade: "SS 3", candidateCount: 45 },
          timestamp: new Date().toISOString(),
        },
        {
          event_type: "BACKUP_COMPLETED",
          severity: "info",
          metadata: { sizeBytes: 15482910, destination: "local_nas" },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", nodeSecretKey)
      .update(`${createdInstallationId}:${timestamp}:${rawPayload}`)
      .digest("hex");

    const req = new Request("http://localhost/api/node/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ACAD-Installation-Id": createdInstallationId,
        "X-ACAD-Timestamp": String(timestamp),
        "X-ACAD-Signature": signature,
      },
      body: rawPayload,
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.processed_count).toBe(2);
  });

  it("Step 8: Toggles per-school modular feature flags", async () => {
    const req = new Request(`http://localhost/api/platform/feature-flags/${createdSchoolId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        flag_key: "ai_learning_engine",
        is_enabled: true,
      }),
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.flag_key).toBe("ai_learning_engine");
    expect(data.is_enabled).toBe(true);
  });

  it("Step 9: Extends and converts trial to paid Enterprise Commercial License", async () => {
    // 1. Fetch 360 detail to get trial ID
    const detailReq = new Request(`http://localhost/api/platform/schools/${createdSchoolId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const detailRes = await handleControlPlaneApi(detailReq, new URL(detailReq.url));
    const detailData = await detailRes?.json();
    createdTrialId = detailData.trial.id;

    // 2. Extend trial
    const extendReq = new Request(`http://localhost/api/platform/trials/${createdTrialId}/extend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ days: 15 }),
    });
    const extendRes = await handleControlPlaneApi(extendReq, new URL(extendReq.url));
    expect(extendRes?.status).toBe(200);

    // 3. Convert trial to Enterprise Paid Plan
    const convertReq = new Request(`http://localhost/api/platform/trials/${createdTrialId}/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ plan_tier: "enterprise" }),
    });
    const convertRes = await handleControlPlaneApi(convertReq, new URL(convertReq.url));
    expect(convertRes?.status).toBe(200);

    const convertData = await convertRes?.json();
    expect(convertData.success).toBe(true);
    expect(convertData.license.plan_tier).toBe("enterprise");
    expect(convertData.license.max_students).toBe(2500);
  });

  it("Step 10: Logs and resolves support incident", async () => {
    const createReq = new Request("http://localhost/api/platform/incidents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        school_id: createdSchoolId,
        installation_id: createdInstallationId,
        severity: "medium",
        title: "UPS battery failure during terminal exam",
        description: "Local laboratory experienced momentary switch blackout.",
      }),
    });

    const createRes = await handleControlPlaneApi(createReq, new URL(createReq.url));
    expect(createRes?.status).toBe(201);

    const createData = await createRes?.json();
    createdIncidentId = createData.incident.id;

    // Resolve Incident
    const resolveReq = new Request(`http://localhost/api/platform/incidents/${createdIncidentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: "resolved",
        root_cause: "Degraded lead-acid battery cell in rack UPS",
        mitigation: "Replaced with 2KVA Online Lithium UPS unit",
      }),
    });

    const resolveRes = await handleControlPlaneApi(resolveReq, new URL(resolveReq.url));
    expect(resolveRes?.status).toBe(200);
  });

  it("Step 11: Publishes software release channel update", async () => {
    const req = new Request("http://localhost/api/platform/releases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        version: `5.4.0-${Date.now()}`,
        release_channel: "stable",
        release_notes: "High-throughput CBT streaming & instantaneous exam sync",
        is_critical_security: false,
      }),
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(201);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.release.release_channel).toBe("stable");
  });

  it("Step 12: Provisions platform staff operator account", async () => {
    const email = `operator_${Date.now()}@acad.ng`;
    const req = new Request("http://localhost/api/platform/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Field Operations Specialist",
        email,
        password: "OperatorTempPass2026!",
        role: "ops_engineer",
      }),
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(201);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(email);
    expect(data.user.role).toBe("ops_engineer");
  });

  it("Step 13: Verifies immutable audit trail records all operator actions", async () => {
    const req = new Request("http://localhost/api/platform/audit-logs", {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const res = await handleControlPlaneApi(req, new URL(req.url));
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(Array.isArray(data.logs)).toBe(true);
    expect(data.logs.length).toBeGreaterThanOrEqual(5);

    const actions = data.logs.map((l: any) => l.action);
    expect(actions).toContain("PLATFORM_LOGIN");
    expect(actions).toContain("CREATE_ORGANIZATION");
    expect(actions).toContain("CREATE_SCHOOL");
    expect(actions).toContain("PROVISION_INSTALLATION");
    expect(actions).toContain("CONVERT_TRIAL_TO_PAID");
  });

  afterAll(() => {
    try {
      controlDb.run("DELETE FROM schools WHERE school_code != 'ACAD-LOCAL'");
      controlDb.run("DELETE FROM organizations WHERE slug != 'acad-network'");
    } catch {}
  });
});
