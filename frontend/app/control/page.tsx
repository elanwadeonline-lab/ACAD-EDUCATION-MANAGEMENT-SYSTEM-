"use client";

import React, { useEffect, useState, useMemo } from "react";
import { controlApi } from "../../lib/controlApi";
import { subscribeControlStream } from "../../lib/controlStream";
import {
  ShieldCheck,
  Building2,
  FlaskConical,
  CalendarClock,
  WifiOff,
  Users,
  GraduationCap,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  MoreHorizontal,
  Zap,
  Cpu,
  Database,
  Check,
  X,
  BookOpen,
  Sparkles,
  LifeBuoy,
  KeyRound,
  ExternalLink,
  Plus,
  Activity,
  HardDrive,
  Radio,
  FileCheck,
  RefreshCw,
  SlidersHorizontal,
  Server,
  Layers
} from "lucide-react";

export default function ControlCommandCenterPage() {
  const [overview, setOverview] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [localExamPool, setLocalExamPool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showNotice = (message: string, type: "success" | "info" | "error" = "success"): void => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 3800);
  };

  const fetchData = async () => {
    try {
      const [overviewRes, schoolsRes, timelineRes, localPoolRes] = await Promise.all([
        controlApi.getOverview().catch((e: any) => { throw e; }),
        controlApi.getSchools().catch(() => null),
        controlApi.getFleetTimeline(24).catch(() => null),
        controlApi.getLocalExamPoolLive().catch(() => null),
      ]);
      setError(null);
      if (overviewRes) {
        setOverview(overviewRes);
        if (overviewRes.localExamPool) setLocalExamPool(overviewRes.localExamPool);
      }
      if (schoolsRes) setSchools(schoolsRes.schools || schoolsRes.data || []);
      else if (!overviewRes) setSchools([]);
      if (timelineRes?.timeline) setTimeline(timelineRes.timeline);
      if (localPoolRes) setLocalExamPool(localPoolRes);
    } catch (err: any) {
      setError(err.message || "Unable to load supervisory data. Backend unreachable or session expired.");
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Prefer push-based SSE; fall back to 10s polling if stream drops
    const stop = subscribeControlStream({
      onData: (stream) => {
        if (stream.metrics || stream.activeAlerts || stream.liveEvents) {
          setOverview((prev: any) => ({
            metrics: stream.metrics ?? prev?.metrics,
            activeAlerts: stream.activeAlerts ?? prev?.activeAlerts,
            expiringTrials: prev?.expiringTrials ?? [],
            liveEvents: stream.liveEvents ?? prev?.liveEvents,
            localExamPool: prev?.localExamPool,
          }));
        }
      },
      pollingFn: async () => {
        const ov = await controlApi.getOverview().catch(() => null);
        if (ov) {
          setOverview(ov);
          if (ov.localExamPool) setLocalExamPool(ov.localExamPool);
        }
        // Also refresh schools/timeline periodically when polling
        controlApi.getSchools().then((r) => setSchools(r.schools || [])).catch(() => {});
        controlApi.getFleetTimeline(24).then((r) => { if (r?.timeline) setTimeline(r.timeline); }).catch(() => {});
        controlApi.getLocalExamPoolLive().then((r) => setLocalExamPool(r)).catch(() => {});
        return ov as any;
      },
      pollingIntervalMs: 10000,
    });
    return () => stop();
  }, []);

  const handleExportReport = () => {
    const reportData = {
      generated_at: new Date().toISOString(),
      supervisory_overview: overview?.metrics || {},
      local_exam_pool: localExamPool || {},
      connected_schools: schools.map((s) => ({
        id: s.id,
        name: s.name,
        school_code: s.school_code,
        status: s.status,
        health_score: s.health_score,
        health_status: s.health_status,
      })),
      active_alarms: overview?.activeAlerts || [],
      recent_events: overview?.liveEvents || [],
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acad-supervisory-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice("Supervisory operational report downloaded successfully.");
  };

  const handleHostAction = async (action: "RUN_DIAGNOSTICS" | "TRIGGER_PULSE" | "WAL_CHECKPOINT" | "FLUSH_QUEUE") => {
    setActionLoading(action);
    try {
      const res = await controlApi.runLocalExamPoolAction(action);
      showNotice(res.message || `Action ${action} executed successfully on host node.`, "success");
      await fetchData();
    } catch (err: any) {
      showNotice(err.message || `Failed to execute ${action}.`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !overview && !error) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#64748B", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
        <ShieldCheck size={36} color="#4d8dff" />
        <span>Connecting to ACAD Mission Control &amp; Sampling Host Telemetry…</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#64748B", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <ShieldCheck size={36} color="#ef4444" />
        <div style={{ color: "#ef4444", fontWeight: 600 }}>Unable to load supervisory data</div>
        <div style={{ fontSize: "0.8125rem", maxWidth: 420 }}>{error}</div>
        <button className="primary-button" onClick={() => { setLoading(true); setError(null); fetchData(); }}>Retry Connection</button>
      </div>
    );
  }

  const metrics = overview?.metrics || {};
  const activeAlerts = overview?.activeAlerts || [];
  const expiringTrials = overview?.expiringTrials || [];

  const totalSchoolsCount = metrics.totalSchools ?? schools.length ?? 0;
  const activeTrialsCount = metrics.trialSchools ?? 0;
  const offlineNodesCount = metrics.offlineInstallations ?? 0;
  const totalStudentsCount = metrics.totalStudentsAggregate ?? (localExamPool?.operational?.totalStudents ?? 0);
  const totalTeachersCount = metrics.totalTeachersAggregate ?? (localExamPool?.operational?.totalTeachers ?? 0);
  const totalQuestionsCount = metrics.totalQuestionsAggregate ?? (localExamPool?.operational?.totalQuestions ?? 0);
  const totalExamsCount = metrics.totalExamsAggregate ?? (localExamPool?.operational?.totalExams ?? 0);

  // Host PC details
  const hostSystem = localExamPool?.system || {};
  const hostDb = localExamPool?.database || {};
  const hostOp = localExamPool?.operational || {};
  const hostIdentity = localExamPool?.identity || {};

  const hostRamUsedMb = hostSystem.totalMemoryBytes && hostSystem.freeMemoryBytes
    ? Math.round((hostSystem.totalMemoryBytes - hostSystem.freeMemoryBytes) / (1024 * 1024))
    : 0;
  const hostRamTotalMb = hostSystem.totalMemoryBytes
    ? Math.round(hostSystem.totalMemoryBytes / (1024 * 1024))
    : 0;
  const hostDbSizeMb = hostDb.dbSizeBytes ? (hostDb.dbSizeBytes / (1024 * 1024)).toFixed(2) : "0.00";
  const hostWalSizeMb = hostDb.walSizeBytes ? (hostDb.walSizeBytes / (1024 * 1024)).toFixed(2) : "0.00";

  return (
    <>
      {/* ── Hero Row ── */}
      <section className="hero-row">
        <div>
          <h2>Good day, Platform Operator <span className="wave">/</span></h2>
          <p>Real-time supervisory telemetry across your active ACAD network installations.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" onClick={handleExportReport}>
            <ExternalLink size={15} /> Export report
          </button>
          <button className="primary-button" onClick={() => window.location.href = '/control/schools'}>
            <Plus size={16} /> Manage fleet
          </button>
        </div>
      </section>

      {/* ── Global Fleet Metric Cards ── */}
      <section className="metrics-grid">
        <MetricCard icon={Building2} label="Total schools" value={String(totalSchoolsCount)} trend="Active fleet" tone="blue" />
        <MetricCard icon={FlaskConical} label="Active trials" value={String(activeTrialsCount)} trend="Provisioned" tone="green" />
        <MetricCard icon={CalendarClock} label="Expiring soon" value={String(expiringTrials.length)} trend="Next 7 days" tone="amber" />
        <MetricCard icon={WifiOff} label="Offline installations" value={String(offlineNodesCount)} trend="Nodes alert" tone="red" negative={offlineNodesCount > 0} />
        <MetricCard icon={Users} label="Active students" value={String(totalStudentsCount)} trend="Enrolled" tone="blue" />
        <MetricCard icon={GraduationCap} label="Active faculty" value={String(totalTeachersCount)} trend="Verified" tone="purple" />
      </section>

      {/* ── Dashboard Grid: Fleet Health & System Activity ── */}
      <section className="dashboard-grid">
        <div className="panel fleet-panel">
          <PanelHeader title="Fleet health & installations" subtitle="Live telemetry from school node agents" action="View all" onAction={() => window.location.href = '/control/schools'} />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>School / Installation</th>
                  <th>Health</th>
                  <th>Quota</th>
                  <th>Last heartbeat</th>
                  <th>Licence tier</th>
                  <th>Version</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {schools.slice(0, 8).map((school, index) => (
                   <SchoolRow key={school.id} school={school} index={index} onOpen={() => setSelectedSchool(school)} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="legend">
            <LegendDot color="green" label="Healthy (80–100)" />
            <LegendDot color="amber" label="Warning (50–79)" />
            <LegendDot color="red" label="Critical (0–49)" />
            <LegendDot color="slate" label="Offline" />
          </div>
        </div>

        <div className="panel activity-panel">
          <PanelHeader title="System activity" subtitle="Real-time telemetry pulse & events" action="Last 24h" />
          <div className="chart-legend">
            <span><i className="chart-dot blue-dot" /> Telemetry Pulses</span>
            <span><i className="chart-dot green-dot" /> Connected Nodes</span>
            <span><i className="chart-dot purple-dot" /> Exams & Sync</span>
          </div>
          <div className="chart">
            <div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
            {timeline.length > 0 ? (
              <svg viewBox="0 0 360 195" role="img" aria-label="System activity">
                <path className="grid-line" d="M8 16H350 M8 58H350 M8 100H350 M8 142H350 M8 184H350" />
                <ChartLine values={timeline.map((t) => Math.min(100, Math.round((t.avg_cpu ?? 0) * 1.5)))} color="#4d8dff" />
                <ChartLine values={timeline.map((t) => Math.min(100, Math.round((t.avg_health ?? 0) * 0.8)))} color="#2dcc83" />
                <ChartLine values={timeline.map((t) => Math.min(100, (t.active_nodes ?? 0) * 20))} color="#a779ff" />
              </svg>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "2rem 1rem", color: "var(--text-muted)", fontSize: "0.8125rem", textAlign: "center" }}>
                <Activity size={20} color="var(--text-muted)" />
                <span>No telemetry history yet</span>
                <small style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>Awaiting node heartbeat pulses — chart will populate as data arrives</small>
              </div>
            )}
            <div className="chart-x"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span></div>
          </div>
          <div className="activity-footer">
            <span><Zap size={14} /> Telemetry Streaming</span>
            <strong>Active Pulse (60s)</strong>
          </div>
        </div>

        <div className="side-stack">
          <div className="panel alerts-panel">
            <PanelHeader title="Active alarms" subtitle="Requires attention" action="View all" onAction={() => window.location.href = '/control/alerts'} />
            {activeAlerts.slice(0, 4).map((alt: any) => (
              <AlertItem 
                key={alt.id} 
                icon={alt.severity === 'critical' ? WifiOff : Cpu} 
                tone={alt.severity === 'critical' ? 'red' : 'amber'} 
                title={alt.title} 
                text={`${alt.school_name || 'Campus'} — ${alt.details}`} 
                time={alt.created_at ? new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"} 
              />
            ))}
            {activeAlerts.length === 0 && (
               <div style={{ padding: '2rem 1rem', color: '#10B981', fontSize: '0.85rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                 <ShieldCheck size={28} color="#10B981" />
                 <span>All node installations reporting nominal health.</span>
               </div>
            )}
          </div>
          <div className="panel actions-panel">
            <div className="panel-title-row">
              <div><h3>Quick actions</h3><p>Platform management commands</p></div>
              <Sparkles size={16} className="sparkle" />
            </div>
            <div className="quick-actions">
              <QuickAction icon={Building2} label="Schools directory" onClick={() => window.location.href = '/control/schools'} />
              <QuickAction icon={FlaskConical} label="Trials & subscriptions" onClick={() => window.location.href = '/control/trials'} />
              <QuickAction icon={KeyRound} label="Manage licenses" onClick={() => window.location.href = '/control/licenses'} />
              <QuickAction icon={LifeBuoy} label="Support & incidents" onClick={() => window.location.href = '/control/incidents'} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Lower Grid ── */}
      <section className="lower-grid">
        <div className="panel matrix-panel">
          <PanelHeader title="Platform health matrix" subtitle="Fleet node status breakdown" action="Full monitor" onAction={() => window.location.href = '/control/monitoring'} />
          <div className="matrix-content">
            <div className="donut">
              <div><strong>{totalSchoolsCount}</strong><span>Total<br />Schools</span></div>
            </div>
            <div className="matrix-list">
              <MatrixRow color="green" label="Healthy" value={metrics.healthyInstallations ?? 0} percent="" />
              <MatrixRow color="amber" label="Warning" value={metrics.warningInstallations ?? 0} percent="" />
              <MatrixRow color="red" label="Critical" value={metrics.criticalInstallations ?? 0} percent="" />
              <MatrixRow color="slate" label="Offline" value={metrics.offlineInstallations ?? 0} percent="" />
            </div>
          </div>
        </div>

        <div className="panel top-schools-panel">
          <PanelHeader title="Connected schools" subtitle="Active installations & locations" action="Fleet" onAction={() => window.location.href = '/control/schools'} />
          {schools.slice(0, 5).map((school, index) => (
            <div className="ranking-row" key={school.id} onClick={() => setSelectedSchool(school)} style={{ cursor: "pointer" }}>
              <span className="rank">{index + 1}</span>
              <div className="rank-copy">
                <strong>{school.name}</strong>
                <span>{school.location || school.school_code || 'Local Host'}</span>
              </div>
              <div className="rank-bar"><i style={{ width: `${school.health_score != null ? Math.max(10, Math.min(100, school.health_score)) : 10}%` }} /></div>
              <strong className="rank-number">{school.health_score != null ? `${school.health_score}%` : "Unknown"}</strong>
            </div>
          ))}
          {schools.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.8125rem' }}>No schools connected yet.</div>
          )}
        </div>

        <div className="panel pipeline-panel">
          <PanelHeader title="Lifecycle pipeline" subtitle="Commercial conversion status" action="Trials" onAction={() => window.location.href = '/control/trials'} />
          {(() => {
            const provisionedCount = schools.filter((s: any) => (s.installations_count ?? 0) > 0).length;
            const telemetryActiveCount = (metrics.healthyInstallations ?? 0) + (metrics.warningInstallations ?? 0) + (metrics.degradedInstallations ?? 0);
            const activeLicenseCount = metrics.activeSchools ?? schools.filter((s: any) => s.status === "active").length;
            const pct = (val: number) => totalSchoolsCount > 0 ? Math.round((val / totalSchoolsCount) * 100) : 0;
            return (
              <div className="funnel">
                <FunnelRow label="Registered" value={String(totalSchoolsCount)} width="100%" />
                <FunnelRow label="Installations provisioned" value={String(provisionedCount)} width={`${Math.max(20, pct(provisionedCount))}%`} />
                <FunnelRow label="Telemetry active" value={String(telemetryActiveCount)} width={`${Math.max(20, pct(telemetryActiveCount))}%`} />
                <FunnelRow label="Active license" value={String(activeLicenseCount)} width={`${Math.max(20, pct(activeLicenseCount))}%`} />
              </div>
            );
          })()}
        </div>
      </section>

      {selectedSchool && (
        <SchoolDrawer 
          school={selectedSchool} 
          onClose={() => setSelectedSchool(null)} 
          onAction={(msg) => showNotice(msg)} 
        />
      )}
      {notice && (
        <div className={`toast ${notice.type === "error" ? "toast-error" : ""}`} style={{ zIndex: 9999 }}>
          <Check size={16} /> {notice.message}
        </div>
      )}
    </>
  );
}

function MetricCard({ icon: IconComponent, label, value, trend, tone, negative = false }: { icon: any; label: string; value: string; trend: string; tone: string; negative?: boolean }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <div className="metric-top">
        <div className="metric-icon"><IconComponent size={17} /></div>
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className={`metric-trend ${negative ? 'negative' : ''}`}>
        {negative ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />} {trend}
      </div>
      <div className="metric-spark"><i /><i /><i /><i /><i /></div>
    </div>
  );
}

function PanelHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action: string; onAction?: () => void }) {
  return (
    <div className="panel-header">
      <div><h3>{title}</h3><p>{subtitle}</p></div>
      <button className="panel-action" onClick={onAction}>{action} <ChevronRight size={13} /></button>
    </div>
  );
}

const LOGO_TONES = ["blue", "gold", "navy", "slate", "green", "orange"];

function SchoolRow({ school, index = 0, onOpen }: { school: any; index?: number; onOpen: () => void }) {
  const healthStatus = (school.health_status ? String(school.health_status).toLowerCase() : "unknown");
  const score = school.health_score ?? null;
  const plan = school.active_license?.plan_tier || school.status || "—";
  const initials = school.name ? school.name.slice(0, 2).toUpperCase() : "—";
  const quota = school.active_license?.max_students ? school.active_license.max_students.toLocaleString() : "—";
  const version = school.installation?.software_version || school.software_version || null;
  const logoTone = LOGO_TONES[index % LOGO_TONES.length];

  return (
    <tr onClick={onOpen} style={{ cursor: "pointer" }}>
      <td>
        <div className="school-cell">
          <div className={`school-logo ${logoTone}`}>{initials}</div>
          <div>
            <strong>{school.name}</strong>
            <span>{school.school_code || school.location || 'SCH-LIVE'}</span>
          </div>
        </div>
      </td>
      <td>
        <div className="health-cell">
          <span className={`health-dot ${healthStatus}`} /> 
          <strong className={healthStatus}>{healthStatus === "unknown" ? "Unknown" : healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}</strong>
          <div className={`health-ring ${healthStatus}`}><span>{score != null ? `${score}%` : "—"}</span></div>
        </div>
      </td>
      <td>
        <strong>{quota}</strong>
      </td>
      <td>
        {school.last_heartbeat_at ? (
          <>
            <strong>Live</strong>
            <span className="table-sub">Streaming</span>
          </>
        ) : (
          <>
            <strong style={{ color: "var(--text-muted)" }}>No telemetry</strong>
            <span className="table-sub">Waiting for agent</span>
          </>
        )}
      </td>
      <td>
        <span className={`trial-pill ${plan === 'enterprise' || plan === 'active' ? 'green' : plan === "—" ? 'slate' : 'amber'}`}>
          {plan}
        </span>
      </td>
      <td>
        <span className="version-text">{version ? `v${version}` : "Unknown"}</span>
      </td>
      <td>
        <button className="row-more" onClick={(event) => { event.stopPropagation(); onOpen(); }} aria-label="Open school options">
          <MoreHorizontal size={16} />
        </button>
      </td>
    </tr>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) { 
  return <span><i className={`legend-dot ${color}`} />{label}</span>; 
}

function AlertItem({ icon: IconComponent, tone, title, text, time }: { icon: any; tone: string; title: string; text: string; time: string }) { 
  return (
    <div className="alert-item">
      <div className={`alert-icon ${tone}`}><IconComponent size={15} /></div>
      <div className="alert-copy"><strong>{title}</strong><span>{text}</span></div>
      <time>{time}</time>
    </div>
  ); 
}

function QuickAction({ icon: IconComponent, label, onClick }: { icon: any; label: string; onClick: () => void }) { 
  return (
    <button className="quick-action" onClick={onClick}>
      <IconComponent size={15} /><span>{label}</span><ChevronRight size={13} />
    </button>
  ); 
}

function MatrixRow({ color, label, value, percent }: { color: string; label: string; value: number | string; percent: string }) { 
  return (
    <div className="matrix-row">
      <i className={`legend-dot ${color}`} /><span>{label}</span><strong>{value}</strong><small>{percent}</small>
    </div>
  ); 
}

function FunnelRow({ label, value, width }: { label: string; value: string; width: string }) { 
  return (
    <div className="funnel-row">
      <div className="funnel-shape" style={{ width }}><span>{label}</span></div><strong>{value}</strong>
    </div>
  ); 
}

function ChartLine({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length === 0) return null;
  const step = 340 / Math.max(1, values.length - 1);
  const points = values.map((value, index) => `${10 + index * step},${184 - (value || 0) * 1.5}`).join(' ');
  return (
    <>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((value, index) => (
        <circle key={`${color}-${index}`} cx={10 + index * step} cy={184 - (value || 0) * 1.5} r="3.2" fill="#0b111d" stroke={color} strokeWidth="2" />
      ))}
    </>
  );
}

function SchoolDrawer({ school, onClose, onAction }: { school: any; onClose: () => void; onAction: (message: string) => void }) {
  const [liveStats, setLiveStats] = useState<any>(null);
  const [runningAction, setRunningAction] = useState(false);
  
  useEffect(() => {
    controlApi.getSchoolLiveStats(school.id)
      .then(res => setLiveStats(res))
      .catch(err => console.error("Drawer live stats error:", err));
  }, [school.id]);

  const healthStatus = (school.health_status ? String(school.health_status).toLowerCase() : "unknown");
  const cpu = liveStats?.latest_heartbeat?.cpu_usage ?? school.last_cpu_usage ?? null;
  const memory = liveStats?.latest_heartbeat?.memory_usage ?? school.last_memory_usage ?? null;
  const storage = liveStats?.latest_heartbeat?.storage_usage ?? school.last_storage_usage ?? null;
  const connectedClients = liveStats?.active_connected_clients ?? school.last_connected_clients ?? null;
  const activeExams = liveStats?.active_exam_sessions ?? null;
  const version = liveStats?.installations?.[0]?.software_version || school.software_version || null;
  const nodeId = liveStats?.installations?.[0]?.node_id || (school.school_code ? `NODE-${school.school_code}` : null);

  const handleDiagnostics = async () => {
    setRunningAction(true);
    try {
      const isLocalSchool = school.school_code === "ACAD-LOCAL" || school.id === liveStats?.school_id;
      if (isLocalSchool) {
        const res = await controlApi.runLocalExamPoolAction("RUN_DIAGNOSTICS");
        onAction(res.message || `Diagnostics completed for ${school.name}: ${res.integrity_check || "ok"}.`);
      } else {
        await controlApi.pushConfigToSchool(school.id, "diagnostics");
        onAction(`Diagnostics signal queued for ${school.name} — node will respond on next heartbeat pulse.`);
      }
    } catch (err: any) {
      onAction(`Diagnostics failed for ${school.name}: ${err.message || "Unable to reach node."}`);
    } finally {
      setRunningAction(false);
    }
  };

  const handleRefreshConfig = async () => {
    setRunningAction(true);
    try {
      await controlApi.pushConfigToSchool(school.id, "config");
      onAction(`Configuration sync queued for ${school.name} — delivered on next heartbeat.`);
    } catch (err: any) {
      onAction(`Configuration push failed for ${school.name}: ${err.message || "Unable to queue push."}`);
    } finally {
      setRunningAction(false);
    }
  };

  const recentEvents = liveStats?.recent_events || [];

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="school-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="eyebrow">CAMPUS / {school.school_code || `SCH-${school.id}`}</div>
            <h2>{school.name}</h2>
            <p>{school.location || "Primary Operating Server"}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close school details"><X size={18} /></button>
        </div>

        <div className={`drawer-health ${healthStatus}`}>
          <span className={`health-dot ${healthStatus}`} />
          <div>
            <strong style={{ textTransform: "capitalize" }}>{healthStatus === "unknown" ? "Unknown health" : `${healthStatus} installation`}</strong>
            <span>{school.last_heartbeat_at || liveStats?.latest_heartbeat ? "Active Heartbeat Pulse · Node Online" : "No heartbeat — Waiting for agent"}</span>
          </div>
          <span className="drawer-uptime">{school.health_score != null ? `${school.health_score}% Health` : "Health: Unknown"}</span>
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">Telemetry & System Vitals <span>{nodeId || "No node registered"}</span></div>
          <div className="detail-grid">
            <Detail label="Software version" value={version ? `v${version}` : "Unknown"} />
            <Detail label="CPU load" value={cpu != null ? `${Math.round(cpu)}%` : "Unavailable"} />
            <Detail label="RAM memory" value={memory != null ? `${Math.round(memory)}%` : "Unavailable"} />
            <Detail label="Disk storage" value={storage != null ? `${Math.round(storage)}%` : "Unavailable"} />
            <Detail label="Connected users" value={connectedClients != null ? String(connectedClients) : "Unavailable"} />
            <Detail label="Active exams" value={activeExams != null ? String(activeExams) : "Unavailable"} />
          </div>
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">Enabled modules & entitlements</div>
          <div className="module-list">
            <span><Check size={13} /> CBT examinations</span>
            <span><Check size={13} /> Question banks</span>
            <span><Check size={13} /> Automated grading</span>
            <span><Check size={13} /> Report cards</span>
            <span><Check size={13} /> Student portal</span>
            <span><Check size={13} /> Teacher portal</span>
            <span><Check size={13} /> Guardian portal</span>
            <span><Check size={13} /> Real-time telemetry</span>
          </div>
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">Node telemetry stream <span>Live</span></div>
          <div className="timeline">
            {recentEvents.length > 0 ? (
              recentEvents.slice(0, 4).map((ev: any) => (
                <TimelineItem 
                  key={ev.id} 
                  icon={ev.event_type?.includes("EXAM") ? Activity : ev.event_type?.includes("DATABASE") ? Database : Zap} 
                  text={ev.event_type?.replace(/_/g, " ") || "Telemetry Event"} 
                  time={ev.event_timestamp ? new Date(ev.event_timestamp).toLocaleTimeString() : "Recent"} 
                />
              ))
            ) : (
              <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                No telemetry events yet — node activity will appear here when the agent reports
              </div>
            )}
          </div>
        </div>

        <div className="drawer-actions">
          <button className="secondary-button" disabled={runningAction} onClick={handleDiagnostics}>
            <Activity size={15} /> Run diagnostics
          </button>
          <button className="primary-button" disabled={runningAction} onClick={handleRefreshConfig}>
            <Zap size={15} /> Push config sync
          </button>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) { 
  return <div className="detail"><span>{label}</span><strong>{value}</strong></div>; 
}

function TimelineItem({ icon: IconComponent, text, time }: { icon: any; text: string; time: string }) { 
  return (
    <div className="timeline-item">
      <div className="timeline-icon"><IconComponent size={13} /></div>
      <div><strong>{text}</strong><span>{time}</span></div>
    </div>
  ); 
}
