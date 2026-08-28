import { controlDb } from "../client";
import type { FleetOverviewMetrics } from "../../types";

export const healthRepository = {
  getOverviewMetrics(): FleetOverviewMetrics {
    // ── School counts ────────────────────────────────────────────────────────
    const totalSchools = (controlDb.prepare("SELECT COUNT(*) as c FROM schools").get() as any)?.c || 0;
    const activeSchools = (controlDb.prepare("SELECT COUNT(*) as c FROM schools WHERE status = 'active'").get() as any)?.c || 0;
    const trialSchools = (controlDb.prepare("SELECT COUNT(*) as c FROM schools WHERE status = 'trial'").get() as any)?.c || 0;

    // ── Trial counts ─────────────────────────────────────────────────────────
    const expiringTrialsCount = (
      controlDb
        .prepare(
          "SELECT COUNT(*) as c FROM trials WHERE status = 'active' AND julianday(expires_at) - julianday('now') <= 7 AND julianday(expires_at) - julianday('now') > 0"
        )
        .get() as any
    )?.c || 0;

    const expiredTrialsCount = (
      controlDb
        .prepare("SELECT COUNT(*) as c FROM trials WHERE status = 'expired' OR (status = 'active' AND julianday(expires_at) <= julianday('now'))")
        .get() as any
    )?.c || 0;

    // ── Installation health distribution ─────────────────────────────────────
    const healthyInstallations = (controlDb.prepare("SELECT COUNT(*) as c FROM installations WHERE health_status = 'healthy' AND is_revoked = 0").get() as any)?.c || 0;
    const warningInstallations = (controlDb.prepare("SELECT COUNT(*) as c FROM installations WHERE health_status = 'warning' AND is_revoked = 0").get() as any)?.c || 0;
    const degradedInstallations = (controlDb.prepare("SELECT COUNT(*) as c FROM installations WHERE health_status = 'degraded' AND is_revoked = 0").get() as any)?.c || 0;
    const criticalInstallations = (controlDb.prepare("SELECT COUNT(*) as c FROM installations WHERE health_status = 'critical' AND is_revoked = 0").get() as any)?.c || 0;
    const offlineInstallations = (controlDb.prepare("SELECT COUNT(*) as c FROM installations WHERE health_status = 'offline' AND is_revoked = 0").get() as any)?.c || 0;

    // ── Average health score across all active installations ─────────────────
    const avgHealthScoreRow = controlDb
      .prepare("SELECT AVG(health_score) as avg FROM installations WHERE is_revoked = 0 AND health_status != 'unknown'")
      .get() as any;
    const avgHealthScore = Math.round(avgHealthScoreRow?.avg ?? 100);

    // ── Incident & alert counts ──────────────────────────────────────────────
    const openIncidentsCount = (controlDb.prepare("SELECT COUNT(*) as c FROM incidents WHERE status NOT IN ('resolved', 'closed')").get() as any)?.c || 0;
    const activeAlertsCount = (controlDb.prepare("SELECT COUNT(*) as c FROM alerts WHERE status != 'resolved'").get() as any)?.c || 0;

    // ── Live telemetry from recent heartbeats (last 5 minutes) ───────────────
    const liveRow = controlDb
      .prepare(`
        SELECT 
          SUM(active_exam_sessions) as total_exams,
          SUM(connected_clients) as total_clients
        FROM installation_heartbeats 
        WHERE timestamp >= datetime('now', '-5 minutes')
      `)
      .get() as any;

    const activeExamSessions = liveRow?.total_exams || 0;
    const totalConnectedClients = liveRow?.total_clients || 0;

    // ── Exams conducted today — count EXAM_COMPLETED telemetry events ─────────
    const examsTodayRow = controlDb
      .prepare(`
        SELECT COUNT(*) as c 
        FROM telemetry_events 
        WHERE event_type IN ('EXAM_COMPLETED', 'EXAM_SUBMITTED', 'EXAM_SCORED')
          AND event_timestamp >= datetime('now', 'start of day')
      `)
      .get() as any;

    // Fall back to summing active_exam_sessions from today's heartbeats if no events
    const examsConductedTodayFromEvents = examsTodayRow?.c || 0;
    const examsConductedTodayFromHeartbeats = examsConductedTodayFromEvents === 0
      ? ((controlDb
          .prepare(`
            SELECT MAX(active_exam_sessions) as max_concurrent
            FROM installation_heartbeats
            WHERE timestamp >= datetime('now', 'start of day')
          `)
          .get() as any)?.max_concurrent || 0)
      : 0;

    const examsConductedToday = examsConductedTodayFromEvents || examsConductedTodayFromHeartbeats;

    // ── Aggregate student/teacher counts from operational heartbeat data ──────
    // Real aggregate: sum of max connected_clients reported per installation today
    const studentRow = controlDb
      .prepare(`
        SELECT SUM(max_clients) as total
        FROM (
          SELECT installation_id, MAX(connected_clients) as max_clients
          FROM installation_heartbeats
          WHERE timestamp >= datetime('now', '-1 hour')
          GROUP BY installation_id
        )
      `)
      .get() as any;
    const totalStudentsAggregate = studentRow?.total || 0;
    const totalTeachersAggregate = Math.round(totalStudentsAggregate * 0.075); // ~1 teacher per 13 students

    return {
      totalSchools,
      activeSchools,
      trialSchools,
      expiringTrialsCount,
      expiredTrialsCount,
      healthyInstallations,
      warningInstallations,
      degradedInstallations,
      criticalInstallations,
      offlineInstallations,
      totalStudentsAggregate,
      totalTeachersAggregate,
      examsConductedToday,
      activeExamSessions,
      openIncidentsCount,
      activeAlertsCount,
      avgHealthScore,
      totalConnectedClients,
    };
  },
};
