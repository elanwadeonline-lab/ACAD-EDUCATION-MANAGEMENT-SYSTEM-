import { requirePlatformAuth, requirePlatformRole, generatePlatformToken } from "./auth";
import { verifyNodeAuth } from "./nodeAuth";
import { userRepository } from "./database/repositories/userRepository";
import { organizationRepository } from "./database/repositories/organizationRepository";
import { schoolRepository } from "./database/repositories/schoolRepository";
import { installationRepository } from "./database/repositories/installationRepository";
import { trialRepository } from "./database/repositories/trialRepository";
import { licenseRepository } from "./database/repositories/licenseRepository";
import { featureFlagRepository } from "./database/repositories/featureFlagRepository";
import { telemetryRepository } from "./database/repositories/telemetryRepository";
import { healthRepository } from "./database/repositories/healthRepository";
import { alertRepository } from "./database/repositories/alertRepository";
import { incidentRepository } from "./database/repositories/incidentRepository";
import { backupRepository } from "./database/repositories/backupRepository";
import { releaseRepository } from "./database/repositories/releaseRepository";
import { auditRepository } from "./database/repositories/auditRepository";
import { syncRepository } from "./database/repositories/syncRepository";
import { evaluateNodeHealth } from "./services/healthEngine";
import { checkAndGenerateAlerts } from "./services/alertEngine";
import { generateLicenseKey, PLAN_CONFIGS } from "./services/licenseEngine";
import { controlDb } from "./database/client";
import { verifyPassword, hashPassword } from "../auth";
import { randomBytes, createHash } from "node:crypto";
import { sampleSystemMetrics, sampleDatabaseMetrics, sampleOperationalMetrics } from "../node_agent/metrics";
import { sendHeartbeat, flushTelemetryEvents } from "../node_agent/heartbeat";
import { getOrCreateNodeIdentity } from "../node_agent/identity";
import { Database } from "bun:sqlite";
import { EXAMPOOL_DB_PATH } from "../db";
import fs from "fs";

function apiJson(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function apiError(status: number, message: string): Response {
  return apiJson({ error: message, status }, status);
}

async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function getLocalExamPoolSnapshot() {
  const identity = getOrCreateNodeIdentity();
  const system = sampleSystemMetrics();
  const database = sampleDatabaseMetrics();
  const operational = sampleOperationalMetrics();

  let recentQuestions: any[] = [];
  let recentExams: any[] = [];
  let recentAttempts: any[] = [];
  let termInfo: any = null;
  let activeCustomUrl = "exampool.com";

  if (fs.existsSync(EXAMPOOL_DB_PATH)) {
    const localDb = new Database(EXAMPOOL_DB_PATH, { readonly: true });
    try {
      try {
        recentQuestions = localDb
          .prepare(`
            SELECT q.id, q.text, q.type, q.created_at, s.name as subject_name 
            FROM questions q
            LEFT JOIN subjects s ON q.subject_id = s.id
            ORDER BY q.id DESC LIMIT 5
          `)
          .all();
      } catch {}

      try {
        recentExams = localDb
          .prepare(`
            SELECT e.id, e.title, e.duration_minutes, e.is_active, e.created_at,
                   (SELECT COUNT(*) FROM question_map WHERE exam_id = e.id) as question_count
            FROM exams e
            ORDER BY e.id DESC LIMIT 8
          `)
          .all();
      } catch {}

      try {
        recentAttempts = localDb
          .prepare(`
            SELECT a.id, a.exam_id, a.student_id, a.score, a.total_questions, a.status, a.submitted_at,
                   e.title as exam_title, u.name as student_name
            FROM exam_attempts a
            LEFT JOIN exams e ON a.exam_id = e.id
            LEFT JOIN users u ON a.student_id = u.id
            ORDER BY a.id DESC LIMIT 8
          `)
          .all();
      } catch {}

      try {
        const urlRow = localDb.prepare("SELECT value FROM settings WHERE key = 'CUSTOM_URL'").get() as any;
        if (urlRow?.value) activeCustomUrl = urlRow.value;
        const termRow = localDb.prepare("SELECT * FROM academic_terms WHERE is_active = 1").get() as any;
        if (termRow) termInfo = termRow;
      } catch {}
    } finally {
      localDb.close();
    }
  }

  const latestHeartbeat = controlDb
    .prepare(`
      SELECT * FROM installation_heartbeats 
      WHERE installation_id = ? 
      ORDER BY id DESC LIMIT 1
    `)
    .get(identity.installationId) as any;

  const pendingSync = syncRepository.getPendingForInstallation(identity.installationId);

  return {
    identity,
    system,
    database,
    operational,
    recentQuestions,
    recentExams,
    recentAttempts,
    termInfo,
    activeCustomUrl,
    latestHeartbeat: latestHeartbeat || null,
    pendingSyncCount: pendingSync.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Dispatches all `/api/platform/*` and `/api/node/*` requests.
 */
export async function handleControlPlaneApi(req: Request, url: URL): Promise<Response | null> {
  const pathname = url.pathname;
  const method = req.method;

  // ════════════════════════════════════════════════════════════════════════════
  // ── PLATFORM AUTHENTICATION ────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  if (pathname === "/api/platform/auth/login" && method === "POST") {
    const body = await readJson(req);
    const email = body?.email?.toLowerCase()?.trim();
    const password = body?.password;

    if (!email || !password) return apiError(400, "Email and password required");

    const user = userRepository.findByEmail(email);
    if (!user || !user.is_active) return apiError(401, "Invalid platform credentials or inactive account");

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return apiError(401, "Invalid platform credentials");

    userRepository.updateLastLogin(user.id);
    const token = generatePlatformToken(user);

    auditRepository.record({
      actor_id: user.id,
      actor_email: user.email,
      action: "PLATFORM_LOGIN",
      target_type: "platform_user",
      target_id: String(user.id),
      ip_address: req.headers.get("x-forwarded-for") || undefined,
    });

    const cookieStr = `acad_platform_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`;
    return apiJson(
      {
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
      200,
      { "Set-Cookie": cookieStr }
    );
  }

  if (pathname === "/api/platform/auth/logout" && method === "POST") {
    const cookieStr = `acad_platform_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
    return apiJson({ success: true, message: "Logged out" }, 200, { "Set-Cookie": cookieStr });
  }

  if (pathname === "/api/platform/auth/me" && method === "GET") {
    try {
      const auth = requirePlatformAuth(req);
      return apiJson({ success: true, user: auth });
    } catch (err: any) {
      return apiError(401, err.message || "Unauthorized");
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── NODE AGENT INGESTION (/api/node/*) ──────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  if (pathname === "/api/node/heartbeat" && method === "POST") {
    const rawBody = await req.text();
    const authCheck = verifyNodeAuth(req, rawBody);
    if (!authCheck.valid) return apiError(401, authCheck.error || "Node auth failure");

    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return apiError(400, "Invalid JSON heartbeat payload");
    }

    const installation = installationRepository.findByInstallationId(authCheck.installationId!);
    if (!installation) return apiError(404, "Installation not found");

    // Run Multi-Factor Health Evaluation
    const health = evaluateNodeHealth({
      lastHeartbeatEpochMs: Date.now(),
      storageUsagePercent: payload.system?.storageUsagePercent,
      memoryUsagePercent: payload.system?.memoryUsagePercent,
      dbStatus: payload.database?.status,
      hoursSinceLastBackup: payload.operational?.lastBackupHoursAgo,
      syncQueueBacklog: payload.operational?.bufferedEventsCount,
    });

    // Update installation record
    installationRepository.updateHeartbeat(installation.installation_id, {
      health_status: health.status,
      health_score: health.score,
      software_version: payload.softwareVersion,
      agent_version: payload.agentVersion,
      public_ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      local_ip: payload.system?.localIp,
    });

    // Record high-frequency heartbeat row
    telemetryRepository.recordHeartbeat({
      installation_id: installation.installation_id,
      timestamp: new Date().toISOString(),
      cpu_usage: payload.system?.cpuUsagePercent,
      memory_usage: payload.system?.memoryUsagePercent,
      storage_usage: payload.system?.storageUsagePercent,
      db_status: payload.database?.status,
      connected_clients: payload.operational?.connectedClients,
      active_exam_sessions: payload.operational?.activeExamSessions,
      sync_queue_size: payload.operational?.bufferedEventsCount,
      raw_payload_json: rawBody,
    });

    // Check automated alarms
    checkAndGenerateAlerts(installation.school_id, installation.installation_id, health);
    // Auto-resolve offline alert when node has recovered (real lifecycle)
    if (health.status !== "offline") {
      controlDb
        .prepare(
          "UPDATE alerts SET status='resolved', resolved_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE installation_id=? AND alert_type='node_offline' AND status IN ('open','acknowledged')"
        )
        .run(installation.installation_id);
    }

    const flags = featureFlagRepository.getFlagsForSchool(installation.school_id);
    const license = licenseRepository.findBySchoolId(installation.school_id);
    const trial = trialRepository.findBySchoolId(installation.school_id);
    const latestRelease = releaseRepository.getLatest(installation.release_channel);

    return apiJson({
      acknowledged: true,
      health_status: health.status,
      health_score: health.score,
      server_time: new Date().toISOString(),
      supervisory: {
        feature_flags: flags,
        license: license
          ? {
              key: license.license_key,
              plan: license.plan_tier,
              status: license.status,
              valid_until: license.valid_until,
              max_students: license.max_students,
              enabled_modules: license.enabled_modules,
            }
          : null,
        trial: trial
          ? {
              status: trial.status,
              expires_at: trial.expires_at,
              student_limit: trial.student_limit,
            }
          : null,
        latest_release: latestRelease
          ? {
              version: latestRelease.version,
              release_channel: latestRelease.release_channel,
              download_url: latestRelease.download_url,
              sha256_hash: latestRelease.sha256_hash,
              is_critical_security: Boolean(latestRelease.is_critical_security),
              release_notes: latestRelease.release_notes,
            }
          : null,
      },
    });
  }

  if (pathname === "/api/node/events" && method === "POST") {
    const rawBody = await req.text();
    const authCheck = verifyNodeAuth(req, rawBody);
    if (!authCheck.valid) return apiError(401, authCheck.error || "Node auth failure");

    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return apiError(400, "Invalid JSON payload");
    }

    const installation = installationRepository.findByInstallationId(authCheck.installationId!);
    if (!installation) return apiError(404, "Installation not found");

    const events = Array.isArray(payload.events) ? payload.events : [];
    const sanitizedEvents = events.map((ev: any) => ({
      school_id: installation.school_id,
      installation_id: installation.installation_id,
      event_type: String(ev.event_type || "UNKNOWN_EVENT"),
      severity: (["info", "warning", "high", "critical"].includes(ev.severity)
        ? ev.severity
        : "info") as any,
      metadata: ev.metadata || {},
      software_version: installation.software_version,
      timestamp: ev.timestamp || new Date().toISOString(),
    }));

    if (sanitizedEvents.length > 0) {
      telemetryRepository.recordEvents(sanitizedEvents);
    }

    return apiJson({ success: true, processed_count: sanitizedEvents.length });
  }

  if (pathname === "/api/node/config" && method === "GET") {
    const rawBody = "";
    const authCheck = verifyNodeAuth(req, rawBody);
    if (!authCheck.valid) return apiError(401, authCheck.error || "Node auth failure");

    const installation = installationRepository.findByInstallationId(authCheck.installationId!);
    if (!installation) return apiError(404, "Installation not found");

    const flags = featureFlagRepository.getFlagsForSchool(installation.school_id);
    const license = licenseRepository.findBySchoolId(installation.school_id);
    const latestRelease = releaseRepository.getLatest(installation.release_channel);

    return apiJson({
      installation_id: installation.installation_id,
      school_id: installation.school_id,
      feature_flags: flags,
      license: license
        ? {
            key: license.license_key,
            plan: license.plan_tier,
            status: license.status,
            valid_until: license.valid_until,
            max_students: license.max_students,
          }
        : null,
      latest_available_version: latestRelease?.version || installation.software_version,
    });
  }

  // ── BIDIRECTIONAL SYNC: Node fetches pending config push queue ──────────────
  if (pathname === "/api/node/pending-sync" && method === "GET") {
    const rawBody = "";
    const authCheck = verifyNodeAuth(req, rawBody);
    if (!authCheck.valid) return apiError(401, authCheck.error || "Node auth failure");

    const installation = installationRepository.findByInstallationId(authCheck.installationId!);
    if (!installation) return apiError(404, "Installation not found");

    const pending = syncRepository.getPendingForInstallation(authCheck.installationId!);
    return apiJson({ pending, count: pending.length });
  }

  // ── Node acknowledges delivery of sync items ────────────────────────────────
  if (pathname === "/api/node/sync-ack" && method === "POST") {
    const rawBody = await req.text();
    const authCheck = verifyNodeAuth(req, rawBody);
    if (!authCheck.valid) return apiError(401, authCheck.error || "Node auth failure");

    let payload: any = null;
    try { payload = JSON.parse(rawBody); } catch { return apiError(400, "Invalid JSON"); }

    const ids: number[] = Array.isArray(payload?.ids) ? payload.ids.map(Number) : [];
    if (ids.length > 0) syncRepository.markDelivered(ids);

    return apiJson({ success: true, acknowledged_count: ids.length });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── SUPERVISORY PLATFORM APIS (/api/platform/*) ────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  // All remaining routes require platform staff authentication
  let auth: any = null;
  try {
    auth = requirePlatformAuth(req);
  } catch (err: any) {
    return apiError(401, err.message || "Platform authentication required");
  }

  // ── Host System & Live Exam Pool Monitor Endpoint ───────────────────────────
  if (pathname === "/api/platform/local-exam-pool/live" && method === "GET") {
    const snapshot = getLocalExamPoolSnapshot();
    return apiJson(snapshot);
  }

  if (pathname === "/api/platform/local-exam-pool/action" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin", "ops_engineer"]);
    const body = await readJson(req);
    const action = body?.action || "RUN_DIAGNOSTICS";

    let result: any = {};
    if (action === "RUN_DIAGNOSTICS" || action === "INTEGRITY_CHECK") {
      const localDb = new Database(EXAMPOOL_DB_PATH, { readonly: true });
      try {
        const integrity = localDb.prepare("PRAGMA integrity_check").get() as any;
        const qCount = (localDb.prepare("SELECT COUNT(*) as c FROM questions").get() as any)?.c || 0;
        const exCount = (localDb.prepare("SELECT COUNT(*) as c FROM exams").get() as any)?.c || 0;
        const stCount = (localDb.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get() as any)?.c || 0;
        const tcCount = (localDb.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'teacher'").get() as any)?.c || 0;
        const attCount = (localDb.prepare("SELECT COUNT(*) as c FROM exam_attempts").get() as any)?.c || 0;
        
        result = {
          action: "RUN_DIAGNOSTICS",
          integrity_check: integrity?.integrity_check || "ok",
          table_counts: {
            questions: qCount,
            exams: exCount,
            students: stCount,
            teachers: tcCount,
            attempts: attCount,
          },
          database_size_bytes: fs.existsSync(EXAMPOOL_DB_PATH) ? fs.statSync(EXAMPOOL_DB_PATH).size : 0,
          wal_size_bytes: fs.existsSync(`${EXAMPOOL_DB_PATH}-wal`) ? fs.statSync(`${EXAMPOOL_DB_PATH}-wal`).size : 0,
          status: integrity?.integrity_check === "ok" ? "HEALTHY" : "DEGRADED",
          timestamp: new Date().toISOString(),
          message: "Full host system diagnostic check completed successfully.",
        };
      } finally {
        localDb.close();
      }
    } else if (action === "TRIGGER_PULSE") {
      await sendHeartbeat();
      await flushTelemetryEvents();
      result = {
        action: "TRIGGER_PULSE",
        message: "Node heartbeat pulse and telemetry buffer flushed immediately.",
        timestamp: new Date().toISOString(),
      };
    } else if (action === "WAL_CHECKPOINT") {
      const localDb = new Database(EXAMPOOL_DB_PATH);
      try {
        localDb.run("PRAGMA wal_checkpoint(TRUNCATE)");
        result = {
          action: "WAL_CHECKPOINT",
          message: "SQLite WAL checkpoint (TRUNCATE) executed successfully.",
          wal_size_bytes: fs.existsSync(`${EXAMPOOL_DB_PATH}-wal`) ? fs.statSync(`${EXAMPOOL_DB_PATH}-wal`).size : 0,
          timestamp: new Date().toISOString(),
        };
      } finally {
        localDb.close();
      }
    } else if (action === "FLUSH_QUEUE") {
      const count = await flushTelemetryEvents();
      result = {
        action: "FLUSH_QUEUE",
        events_flushed: count,
        message: `Flushed ${count} buffered telemetry events to supervisory control.`,
        timestamp: new Date().toISOString(),
      };
    } else {
      return apiError(400, `Unknown action: ${action}`);
    }

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: `LOCAL_EXAM_POOL_${action}`,
      target_type: "local_node",
      target_id: "NODE-LOCAL",
      details: result,
    });

    return apiJson({ success: true, ...result });
  }

  // ── 1. Overview Command Center ──────────────────────────────────────────────
  if (pathname === "/api/platform/overview" && method === "GET") {
    const metrics = healthRepository.getOverviewMetrics();
    const liveEvents = telemetryRepository.getLiveEventStream(10);
    const activeAlerts = alertRepository.listAll({ status: "open" });
    const expiringTrials = trialRepository.listAll({ status: "active" }).filter((t) => (t.days_remaining ?? 99) <= 7);
    const localExamPool = getLocalExamPoolSnapshot();

    return apiJson({
      metrics,
      liveEvents,
      activeAlerts: activeAlerts.slice(0, 5),
      expiringTrials: expiringTrials.slice(0, 5),
      localExamPool,
    });
  }

  // ── Real-Time Telemetry SSE Stream ──────────────────────────────────────────
  if (pathname === "/api/platform/stream" && method === "GET") {
    let timer: any = null;
    const stream = new ReadableStream({
      start(controller) {
        const sendUpdate = () => {
          try {
            const metrics = healthRepository.getOverviewMetrics();
            const liveEvents = telemetryRepository.getLiveEventStream(10);
            const activeAlerts = alertRepository.listAll({ status: "open" });
            const data = JSON.stringify({
              metrics,
              liveEvents,
              activeAlerts: activeAlerts.slice(0, 5),
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          } catch {
            // Stream closed or error
          }
        };
        sendUpdate();
        timer = setInterval(sendUpdate, 5000);
      },
      cancel() {
        if (timer) clearInterval(timer);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // ── 2. Schools ──────────────────────────────────────────────────────────────
  if (pathname === "/api/platform/schools" && method === "GET") {
    const status = url.searchParams.get("status") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const schools = schoolRepository.listAll({ status, search });
    return apiJson({ schools });
  }

  if (pathname === "/api/platform/schools" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const body = await readJson(req);
    if (!body?.name || !body?.school_code || !body?.org_id) {
      return apiError(400, "Organization ID, School Name, and School Code required");
    }

    const existing = schoolRepository.findByCode(body.school_code);
    if (existing) return apiError(409, `School code '${body.school_code}' already exists`);

    const school = schoolRepository.create({
      org_id: Number(body.org_id),
      school_code: body.school_code,
      name: body.name,
      location: body.location,
      status: body.status || "trial",
      primary_admin_name: body.primary_admin_name,
      primary_admin_email: body.primary_admin_email,
      primary_admin_phone: body.primary_admin_phone,
    });

    // Auto-create initial trial
    trialRepository.create({
      school_id: school.id,
      duration_days: Number(body.trial_duration_days) || 30,
      student_limit: Number(body.trial_student_limit) || 200,
      notes: body.trial_notes || "Initial onboarding trial.",
    });

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "CREATE_SCHOOL",
      target_type: "school",
      target_id: String(school.id),
      details: { school_code: school.school_code, name: school.name },
    });

    return apiJson({ success: true, school }, 201);
  }

  // ── School Live Stats (from active telemetry & latest heartbeats) ───────────
  const schoolLiveStatsMatch = pathname.match(/^\/api\/platform\/schools\/(\d+)\/live-stats$/);
  if (schoolLiveStatsMatch && method === "GET") {
    const schoolId = Number(schoolLiveStatsMatch[1]);
    const school = schoolRepository.findById(schoolId);
    if (!school) return apiError(404, "School not found");

    const installations = installationRepository.listAll({ schoolId });
    const latestHeartbeat = controlDb
      .prepare(`
        SELECT h.*, i.node_id, i.software_version, i.release_channel
        FROM installation_heartbeats h
        JOIN installations i ON h.installation_id = i.installation_id
        WHERE i.school_id = ?
        ORDER BY h.id DESC LIMIT 1
      `)
      .get(schoolId) as any;

    const recentEvents = controlDb
      .prepare(`
        SELECT * FROM telemetry_events
        WHERE school_id = ?
        ORDER BY id DESC LIMIT 25
      `)
      .all(schoolId) as any[];

    const todayExamsRow = controlDb
      .prepare(`
        SELECT COUNT(*) as c FROM telemetry_events
        WHERE school_id = ? AND event_type LIKE '%EXAM%'
          AND event_timestamp >= datetime('now', 'start of day')
      `)
      .get(schoolId) as any;

    const activeAlerts = alertRepository.listAll({ schoolId, status: "open" });

    return apiJson({
      school_id: schoolId,
      school_name: school.name,
      school_code: school.school_code,
      health_status: school.health_status,
      health_score: school.health_score,
      installations_count: installations.length,
      installations,
      latest_heartbeat: latestHeartbeat || null,
      active_connected_clients: latestHeartbeat?.connected_clients || 0,
      active_exam_sessions: latestHeartbeat?.active_exam_sessions || 0,
      exams_conducted_today: todayExamsRow?.c || 0,
      recent_events: recentEvents,
      active_alerts: activeAlerts,
    });
  }

  // ── School Telemetry History (time-series) ──────────────────────────────────
  const schoolTelemetryMatch = pathname.match(/^\/api\/platform\/schools\/(\d+)\/telemetry-history$/);
  if (schoolTelemetryMatch && method === "GET") {
    const schoolId = Number(schoolTelemetryMatch[1]);
    const limit = Math.min(200, Number(url.searchParams.get("limit")) || 60);
    const history = controlDb
      .prepare(`
        SELECT 
          h.id, h.installation_id, h.timestamp, h.cpu_usage, h.memory_usage, h.storage_usage,
          h.connected_clients, h.active_exam_sessions, h.sync_queue_size, h.db_status,
          i.node_id, i.software_version as node_software_version
        FROM installation_heartbeats h
        JOIN installations i ON h.installation_id = i.installation_id
        WHERE i.school_id = ?
        ORDER BY h.id DESC LIMIT ?
      `)
      .all(schoolId, limit);

    return apiJson({ school_id: schoolId, history: (history as any[]).reverse() });
  }

  const schoolMatch = pathname.match(/^\/api\/platform\/schools\/(\d+)$/);
  if (schoolMatch && method === "GET") {
    const schoolId = Number(schoolMatch[1]);
    const school = schoolRepository.findById(schoolId);
    if (!school) return apiError(404, "School not found");

    const installations = installationRepository.listAll({ schoolId });
    const trial = trialRepository.findBySchoolId(schoolId);
    const license = licenseRepository.findBySchoolId(schoolId);
    const flags = featureFlagRepository.getFlagsForSchool(schoolId);
    const alerts = alertRepository.listAll({ schoolId });
    const incidents = incidentRepository.listAll({ schoolId });
    const backups = backupRepository.listBySchoolId(schoolId, 10);

    return apiJson({
      school,
      installations,
      trial,
      license,
      feature_flags: flags,
      alerts,
      incidents,
      backups,
    });
  }

  if (schoolMatch && method === "PATCH") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const schoolId = Number(schoolMatch[1]);
    const body = await readJson(req);
    const updated = schoolRepository.update(schoolId, body || {});
    if (!updated) return apiError(404, "School not found");

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "UPDATE_SCHOOL",
      target_type: "school",
      target_id: String(schoolId),
      details: body,
    });

    return apiJson({ success: true, school: updated });
  }

  // ── 3. Organizations ────────────────────────────────────────────────────────
  if (pathname === "/api/platform/organizations" && method === "GET") {
    const orgs = organizationRepository.listAll();
    return apiJson({ organizations: orgs });
  }

  if (pathname === "/api/platform/organizations" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const body = await readJson(req);
    if (!body?.name || !body?.slug || !body?.contact_email) {
      return apiError(400, "Organization name, slug, and contact email required");
    }

    const org = organizationRepository.create(body);
    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "CREATE_ORGANIZATION",
      target_type: "organization",
      target_id: String(org.id),
      details: { name: org.name, slug: org.slug },
    });

    return apiJson({ success: true, organization: org }, 201);
  }

  // ── 4. Installations ────────────────────────────────────────────────────────
  if (pathname === "/api/platform/installations" && method === "GET") {
    const healthStatus = url.searchParams.get("healthStatus") || undefined;
    const installations = installationRepository.listAll({ healthStatus });
    return apiJson({ installations });
  }

  if (pathname === "/api/platform/installations/provision" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const body = await readJson(req);
    const schoolId = Number(body?.school_id);
    const nodeId = (body?.node_id || "NODE-PRIMARY").trim();

    if (!schoolId) return apiError(400, "School ID required");
    const school = schoolRepository.findById(schoolId);
    if (!school) return apiError(404, "School not found");

    const installToken = randomBytes(4).toString("hex").toUpperCase();
    const installationId = `INST-${school.school_code}-${installToken}`;
    const rawSecretKey = `sec_${randomBytes(24).toString("hex")}`;

    const installation = installationRepository.create({
      school_id: schoolId,
      installation_id: installationId,
      node_id: nodeId,
      secret_key_hash: rawSecretKey,
      software_version: body?.software_version || "5.3.0",
      release_channel: body?.release_channel || "stable",
    });

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "PROVISION_INSTALLATION",
      target_type: "installation",
      target_id: installation.installation_id,
      details: { school_id: schoolId, node_id: nodeId },
    });

    // Return the raw secret key ONCE during provisioning
    return apiJson(
      {
        success: true,
        installation,
        credentials: {
          installation_id: installation.installation_id,
          secret_key: rawSecretKey,
        },
      },
      201
    );
  }

  const revokeMatch = pathname.match(/^\/api\/platform\/installations\/(\d+)\/revoke$/);
  if (revokeMatch && method === "POST") {
    requirePlatformRole(auth.role, ["owner"]);
    const id = Number(revokeMatch[1]);
    installationRepository.revoke(id);

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "REVOKE_INSTALLATION",
      target_type: "installation",
      target_id: String(id),
    });

    return apiJson({ success: true, message: "Installation revoked" });
  }

  // ── Push Config to a specific installation node ─────────────────────────────
  const pushConfigMatch = pathname.match(/^\/api\/platform\/installations\/([^/]+)\/push-config$/);
  if (pushConfigMatch && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin", "ops_engineer"]);
    const installationId = pushConfigMatch[1];
    const body = await readJson(req);
    const payloadType = body?.payload_type || "config";
    const allowedTypes = ["feature_flags", "license", "config", "force_update", "reboot_request", "diagnostics"];
    if (!allowedTypes.includes(payloadType)) return apiError(400, `Invalid payload_type. Must be one of: ${allowedTypes.join(", ")}`);

    const installation = installationRepository.findByInstallationId(installationId);
    if (!installation) return apiError(404, "Installation not found");
    if (installation.is_revoked) return apiError(403, "Cannot push to a revoked installation");

    // Auto-build payload from live data if not provided explicitly
    let payload = body?.payload;
    if (!payload) {
      if (payloadType === "feature_flags") {
        payload = featureFlagRepository.getFlagsForSchool(installation.school_id);
      } else if (payloadType === "license") {
        const lic = licenseRepository.findBySchoolId(installation.school_id);
        payload = lic ? { plan: lic.plan_tier, max_students: lic.max_students, valid_until: lic.valid_until, enabled_modules: lic.enabled_modules } : {};
      } else {
        payload = { message: "Config refresh requested by operator", timestamp: new Date().toISOString() };
      }
    }

    syncRepository.queuePush({
      installation_id: installationId,
      school_id: installation.school_id,
      payload_type: payloadType,
      payload,
      queued_by: auth.platformUserId,
    });

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "PUSH_CONFIG",
      target_type: "installation",
      target_id: installationId,
      details: { payload_type: payloadType },
    });

    return apiJson({ success: true, message: `Config push queued for ${installationId}`, payload_type: payloadType });
  }

  // ── Push Config to ALL nodes of a school ────────────────────────────────────
  const schoolPushMatch = pathname.match(/^\/api\/platform\/schools\/(\d+)\/push-config$/);
  if (schoolPushMatch && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin", "ops_engineer"]);
    const schoolId = Number(schoolPushMatch[1]);
    const body = await readJson(req);
    const payloadType = (body?.payload_type || "feature_flags") as any;

    let payload = body?.payload;
    if (!payload) {
      if (payloadType === "feature_flags") {
        payload = featureFlagRepository.getFlagsForSchool(schoolId);
      } else if (payloadType === "license") {
        const lic = licenseRepository.findBySchoolId(schoolId);
        payload = lic ? { plan: lic.plan_tier, max_students: lic.max_students, valid_until: lic.valid_until } : {};
      } else {
        payload = { refreshed_at: new Date().toISOString() };
      }
    }

    const count = syncRepository.queuePushToAllSchoolNodes({
      school_id: schoolId,
      payload_type: payloadType,
      payload,
      queued_by: auth.platformUserId,
    });

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "PUSH_CONFIG_ALL_NODES",
      target_type: "school",
      target_id: String(schoolId),
      details: { payload_type: payloadType, node_count: count },
    });

    return apiJson({ success: true, queued_to_nodes: count, payload_type: payloadType });
  }

  // ── Installation Heartbeat History (Node Level) ─────────────────────────────
  const installHistoryMatch = pathname.match(/^\/api\/platform\/installations\/([^/]+)\/heartbeat-history$/);
  if (installHistoryMatch && method === "GET") {
    const installationId = installHistoryMatch[1];
    const limit = Math.min(200, Number(url.searchParams.get("limit")) || 60);
    const history = installationRepository.getHeartbeatHistory(installationId, limit);
    return apiJson({ installation_id: installationId, history: history.reverse(), heartbeats: history });
  }

  // ── Sync Queue status (for control plane UI) ─────────────────────────────────
  if (pathname === "/api/platform/sync-queue" && method === "GET") {
    const recent = syncRepository.listRecent(200);
    const pending = syncRepository.countPending();
    return apiJson({ queue: recent, pending_count: pending });
  }

  // ── Fleet Health Timeline (Cross-Fleet aggregated time-series) ──────────────
  if (pathname === "/api/platform/monitoring/fleet-timeline" && method === "GET") {
    const hours = Math.min(72, Number(url.searchParams.get("hours")) || 24);
    const timeline = installationRepository.getFleetTimeline(hours);
    return apiJson({ timeline, hours_window: hours });
  }

  // ── Live Exam Activity Across All Schools ───────────────────────────────────
  if (pathname === "/api/platform/monitoring/exam-activity" && method === "GET") {
    const limit = Math.min(100, Number(url.searchParams.get("limit")) || 50);
    const activities = controlDb
      .prepare(`
        SELECT 
          e.id, e.school_id, e.installation_id, e.event_type, e.severity,
          e.metadata_json, e.software_version, e.event_timestamp, e.received_at,
          s.name as school_name, s.school_code
        FROM telemetry_events e
        JOIN schools s ON e.school_id = s.id
        WHERE e.event_type LIKE '%EXAM%'
        ORDER BY e.id DESC LIMIT ?
      `)
      .all(limit);

    const totalActive = (controlDb.prepare("SELECT COALESCE(SUM(active_exam_sessions), 0) as s FROM (SELECT active_exam_sessions FROM installation_heartbeats ORDER BY id DESC LIMIT 50)").get() as any)?.s || 0;

    return apiJson({ activities, active_exams: activities, total_active_sessions: Number(totalActive) });
  }

  // ── 5. Trials & Licenses ────────────────────────────────────────────────────
  if (pathname === "/api/platform/trials" && method === "GET") {
    const status = url.searchParams.get("status") || undefined;
    const trials = trialRepository.listAll({ status });
    return apiJson({ trials });
  }

  const extendTrialMatch = pathname.match(/^\/api\/platform\/trials\/(\d+)\/extend$/);
  if (extendTrialMatch && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const trialId = Number(extendTrialMatch[1]);
    const body = await readJson(req);
    const days = Number(body?.days) || 14;
    const trial = trialRepository.extend(trialId, days);

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "EXTEND_TRIAL",
      target_type: "trial",
      target_id: String(trialId),
      details: { additional_days: days },
    });

    return apiJson({ success: true, trial });
  }

  const convertTrialMatch = pathname.match(/^\/api\/platform\/trials\/(\d+)\/convert$/);
  if (convertTrialMatch && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const trialId = Number(convertTrialMatch[1]);
    const body = await readJson(req);
    const planTier = (body?.plan_tier || "standard") as any;

    const trial = trialRepository.findById(trialId);
    if (!trial) return apiError(404, "Trial not found");
    const school = schoolRepository.findById(trial.school_id);
    if (!school) return apiError(404, "School not found");

    trialRepository.convert(trialId);
    schoolRepository.update(school.id, { status: "active" });

    const planConfig = PLAN_CONFIGS[planTier] || PLAN_CONFIGS.standard;
    const licenseKey = generateLicenseKey(school.school_code, planTier);

    const license = licenseRepository.create({
      school_id: school.id,
      license_key: licenseKey,
      plan_tier: planTier,
      max_students: planConfig.maxStudents,
      max_teachers: planConfig.maxTeachers,
      max_installations: planConfig.maxInstallations,
      enabled_modules: planConfig.modules,
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "CONVERT_TRIAL_TO_PAID",
      target_type: "trial",
      target_id: String(trialId),
      details: { plan_tier: planTier, license_key: licenseKey },
    });

    return apiJson({ success: true, trial, license });
  }

  if (pathname === "/api/platform/licenses" && method === "GET") {
    const licenses = licenseRepository.listAll();
    return apiJson({ licenses });
  }

  if (pathname === "/api/platform/licenses" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const body = await readJson(req);
    const schoolId = Number(body?.school_id);
    const planTier = (body?.plan_tier || "standard") as any;
    if (!schoolId) return apiError(400, "School ID required");

    const school = schoolRepository.findById(schoolId);
    if (!school) return apiError(404, "School not found");

    const planConfig = PLAN_CONFIGS[planTier] || PLAN_CONFIGS.standard;
    const licenseKey = generateLicenseKey(school.school_code, planTier);

    const license = licenseRepository.create({
      school_id: schoolId,
      license_key: licenseKey,
      plan_tier: planTier,
      max_students: Number(body?.max_students) || planConfig.maxStudents,
      max_teachers: Number(body?.max_teachers) || planConfig.maxTeachers,
      max_installations: Number(body?.max_installations) || planConfig.maxInstallations,
      enabled_modules: body?.enabled_modules || planConfig.modules,
      valid_until: body?.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return apiJson({ success: true, license }, 201);
  }

  // ── 6. Feature Flags ────────────────────────────────────────────────────────
  const flagMatch = pathname.match(/^\/api\/platform\/feature-flags\/(\d+)$/);
  if (flagMatch && method === "GET") {
    const schoolId = Number(flagMatch[1]);
    const flags = featureFlagRepository.getFlagsForSchool(schoolId);
    return apiJson({ school_id: schoolId, flags });
  }

  if (flagMatch && method === "PUT") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const schoolId = Number(flagMatch[1]);
    const body = await readJson(req);
    const flagKey = body?.flag_key;
    const isEnabled = Boolean(body?.is_enabled);

    if (!flagKey) return apiError(400, "flag_key required");
    featureFlagRepository.setFlag(schoolId, flagKey, isEnabled, auth.platformUserId);

    // Immediately persist to local campus settings for instantaneous zero-delay enforcement
    try {
      if (fs.existsSync(EXAMPOOL_DB_PATH)) {
        const localDb = new Database(EXAMPOOL_DB_PATH);
        try {
          localDb.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
          localDb.prepare(`
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
          `).run(`feature_flag_${flagKey}`, String(isEnabled));
        } finally {
          localDb.close();
        }
      }
    } catch (e) {
      console.warn("[ControlPlane] Could not immediately sync flag to local db:", e);
    }

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "SET_FEATURE_FLAG",
      target_type: "feature_flag",
      target_id: `${schoolId}:${flagKey}`,
      details: { is_enabled: isEnabled },
    });

    return apiJson({ success: true, flag_key: flagKey, is_enabled: isEnabled });
  }

  // ── 7. Alerts & Incidents ───────────────────────────────────────────────────
  if (pathname === "/api/platform/alerts" && method === "GET") {
    const status = (url.searchParams.get("status") as any) || undefined;
    const severity = (url.searchParams.get("severity") as any) || undefined;
    const alerts = alertRepository.listAll({ status, severity });
    return apiJson({ alerts });
  }

  const alertAckMatch = pathname.match(/^\/api\/platform\/alerts\/(\d+)\/ack$/);
  if (alertAckMatch && method === "POST") {
    const id = Number(alertAckMatch[1]);
    alertRepository.acknowledge(id, auth.platformUserId);
    return apiJson({ success: true, message: "Alert acknowledged" });
  }

  const alertResolveMatch = pathname.match(/^\/api\/platform\/alerts\/(\d+)\/resolve$/);
  if (alertResolveMatch && method === "POST") {
    const id = Number(alertResolveMatch[1]);
    alertRepository.resolve(id, auth.platformUserId);
    return apiJson({ success: true, message: "Alert resolved" });
  }

  if (pathname === "/api/platform/incidents" && method === "GET") {
    const status = (url.searchParams.get("status") as any) || undefined;
    const incidents = incidentRepository.listAll({ status });
    return apiJson({ incidents });
  }

  if (pathname === "/api/platform/incidents" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin", "ops_engineer", "support_agent"]);
    const body = await readJson(req);
    if (!body?.school_id || !body?.title || !body?.severity) {
      return apiError(400, "School ID, title, and severity required");
    }

    const incident = incidentRepository.create({
      school_id: Number(body.school_id),
      installation_id: body.installation_id,
      severity: body.severity,
      title: body.title,
      description: body.description,
      assigned_to: body.assigned_to || auth.platformUserId,
    });

    return apiJson({ success: true, incident }, 201);
  }

  const incidentPatchMatch = pathname.match(/^\/api\/platform\/incidents\/(\d+)$/);
  if (incidentPatchMatch && method === "PATCH") {
    requirePlatformRole(auth.role, ["owner", "admin", "ops_engineer", "support_agent"]);
    const id = Number(incidentPatchMatch[1]);
    const body = await readJson(req);
    incidentRepository.updateStatus(id, body.status, {
      root_cause: body.root_cause,
      mitigation: body.mitigation,
    });
    return apiJson({ success: true, message: "Incident updated" });
  }

  // ── 8. Backups, Releases & Audit Logs ───────────────────────────────────────
  if (pathname === "/api/platform/backups" && method === "GET") {
    const backups = backupRepository.listAll(100);
    return apiJson({ backups });
  }

  if (pathname === "/api/platform/releases" && method === "GET") {
    const releases = releaseRepository.listAll();
    return apiJson({ releases });
  }

  if (pathname === "/api/platform/releases" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin", "ops_engineer"]);
    const body = await readJson(req);
    if (!body?.version) return apiError(400, "Release version required");

    const release = releaseRepository.create(body);
    return apiJson({ success: true, release }, 201);
  }

  // ── Fleet-Wide CI/CD Release Broadcast (Push update to all connected nodes) ─
  if (pathname === "/api/platform/releases/broadcast" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin", "ops_engineer"]);
    const body = await readJson(req);
    const version = body?.version;
    if (!version) return apiError(400, "Release version required for fleet broadcast");

    const count = syncRepository.queuePushToFleet({
      payload_type: "force_update",
      payload: {
        version: version.trim(),
        download_url: body?.download_url || null,
        sha256_hash: body?.sha256_hash || null,
        release_notes: body?.release_notes || `Over-the-air software update to version ${version}`,
        timestamp: new Date().toISOString(),
      },
      queued_by: auth.platformUserId,
    });

    auditRepository.record({
      actor_id: auth.platformUserId,
      actor_email: auth.email,
      action: "BROADCAST_RELEASE_UPDATE",
      target_type: "fleet",
      target_id: version,
      details: { node_count: count },
    });

    return apiJson({
      success: true,
      message: `Over-the-air update broadcast queued for ${count} nodes in the fleet`,
      nodes_targeted: count,
      version,
    });
  }

  if (pathname === "/api/platform/audit-logs" && method === "GET") {
    const logs = auditRepository.listRecent(100);
    return apiJson({ logs });
  }

  // ── 9. Platform Users ───────────────────────────────────────────────────────
  if (pathname === "/api/platform/users" && method === "GET") {
    const users = userRepository.listAll();
    return apiJson({ users });
  }

  if (pathname === "/api/platform/users" && method === "POST") {
    requirePlatformRole(auth.role, ["owner", "admin"]);
    const body = await readJson(req);
    if (!body?.name || !body?.email || !body?.password || !body?.role) {
      return apiError(400, "Name, email, password, and role required");
    }

    const existing = userRepository.findByEmail(body.email);
    if (existing) return apiError(409, "User email already registered");

    const passwordHash = await hashPassword(body.password);
    const user = userRepository.create(body.name, body.email, passwordHash, body.role);

    return apiJson({ success: true, user }, 201);
  }

  return null; // Route not handled by control plane API
}
