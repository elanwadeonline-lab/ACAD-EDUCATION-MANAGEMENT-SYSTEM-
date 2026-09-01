"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../control.module.css";
import { controlApi } from "../../../../lib/controlApi";
import {
  ZapIcon,
  ServerIcon,
  ShieldIcon,
  DatabaseIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ActivityIcon,
  FlagIcon,
  ClockIcon,
} from "../../../../components/control/ControlIcons";

export default function SchoolDetailContent() {
  const params = useParams();
  const router = useRouter();
  const schoolId = (params?.id as string) || "1";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "infrastructure" | "activity" | "deployments" | "flags" | "backups" | "incidents" | "onboarding"
  >("overview");

  // Provision Node State
  const [nodeIdInput, setNodeIdInput] = useState("NODE-PRIMARY");
  const [provisionResult, setProvisionResult] = useState<any>(null);
  const [provisionLoading, setProvisionLoading] = useState(false);

  // Feature Flag State
  const [flagToggles, setFlagToggles] = useState<Record<string, boolean>>({});

  // Incident State
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentSeverity, setNewIncidentSeverity] = useState("medium");
  const [newIncidentDesc, setNewIncidentDesc] = useState("");

  const [liveStats, setLiveStats] = useState<any>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [syncTriggering, setSyncTriggering] = useState(false);

  const loadData = () => {
    if (!schoolId) return;
    controlApi
      .getSchoolDetail(schoolId)
      .then((res) => {
        setData(res);
        setFlagToggles(res.feature_flags || {});
      })
      .catch((err) => console.error("Failed to load school detail:", err))
      .finally(() => setLoading(false));

    controlApi
      .getSchoolLiveStats(schoolId)
      .then((res) => setLiveStats(res))
      .catch(() => {});

    controlApi
      .getSchoolTelemetryHistory(schoolId, 30)
      .then((res) => setTelemetryHistory(res.history || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      controlApi.getSchoolLiveStats(schoolId).then(setLiveStats).catch(() => {});
      controlApi.getSchoolTelemetryHistory(schoolId, 30).then((res) => setTelemetryHistory(res.history || [])).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [schoolId]);

  if (loading) {
    return <div style={{ padding: "4rem", textAlign: "center", color: "#64748B" }}>Loading 360° school workspace…</div>;
  }

  if (!data?.school) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "#F87171" }}>
        School record not found. <Link href="/control/schools" style={{ color: "#60A5FA" }}>Back to directory</Link>
      </div>
    );
  }

  const { school, installations = [], trial, license, alerts = [], incidents = [], backups = [] } = data;

  const handleFlagChange = async (flagKey: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setFlagToggles((prev) => ({ ...prev, [flagKey]: newVal }));
    try {
      await controlApi.setFeatureFlag(Number(schoolId), flagKey, newVal);
    } catch {
      setFlagToggles((prev) => ({ ...prev, [flagKey]: currentVal }));
    }
  };

  const handleProvisionNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionLoading(true);
    try {
      const res = await controlApi.provisionInstallation({
        school_id: Number(schoolId),
        node_id: nodeIdInput.trim(),
      });
      setProvisionResult(res);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to provision node.");
    } finally {
      setProvisionLoading(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentTitle) return;
    try {
      await controlApi.createIncident({
        school_id: Number(schoolId),
        title: newIncidentTitle,
        severity: newIncidentSeverity,
        description: newIncidentDesc,
      });
      setNewIncidentTitle("");
      setNewIncidentDesc("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create incident.");
    }
  };

  const handleExtendTrial = async () => {
    if (!trial) return;
    const days = prompt("Enter additional days to extend trial (e.g. 14):", "14");
    if (!days || isNaN(Number(days))) return;
    try {
      await controlApi.extendTrial(trial.id, Number(days));
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to extend trial.");
    }
  };

  const handleConvertTrial = async () => {
    if (!trial) return;
    const plan = prompt("Select Plan Tier to activate ('starter', 'standard', 'enterprise'):", "standard");
    if (!plan) return;
    try {
      await controlApi.convertTrial(trial.id, plan);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to convert trial.");
    }
  };

  return (
    <div>
      {/* ── Top Campus Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.25rem" }}>
            <Link href="/control/schools" style={{ fontSize: "0.8125rem", color: "#60A5FA", textDecoration: "none" }}>
              ← Schools
            </Link>
            <span style={{ color: "#334155" }}>/</span>
            <span className={styles.mono} style={{ color: "#94A3B8" }}>{school.school_code}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--text-heading)" }}>{school.name}</h1>
            <span
              className={styles.statusBadge}
              style={{
                background:
                  school.status === "active"
                    ? "rgba(59, 130, 246, 0.15)"
                    : school.status === "trial"
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(100, 116, 139, 0.15)",
                color:
                  school.status === "active"
                    ? "#60A5FA"
                    : school.status === "trial"
                    ? "#FBBF24"
                    : "#94A3B8",
              }}
            >
              {school.status}
            </span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            {school.location || "Nigeria"} · {school.organization_name}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {school.status === "trial" && (
            <>
              <button onClick={handleExtendTrial} className={`${styles.btn} ${styles.btnSecondary}`}>
                + Extend Trial
              </button>
              <button onClick={handleConvertTrial} className={`${styles.btn} ${styles.btnPrimary}`}>
                Convert to Paid License
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Operational Tabs ── */}
      <div className={styles.tabsBar}>
        {[
          { key: "overview", label: "Overview" },
          { key: "infrastructure", label: `Infrastructure (${installations.length})` },
          { key: "activity", label: "Operational Activity" },
          { key: "deployments", label: "Deploy Node" },
          { key: "flags", label: "Modules & Flags" },
          { key: "backups", label: `Backups (${backups.length})` },
          { key: "incidents", label: `Incidents (${incidents.length})` },
          { key: "onboarding", label: "Onboarding Checklist" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`${styles.tabBtn} ${activeTab === t.key ? styles.tabBtnActive : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div>
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>License / Plan</div>
              <div className={styles.metricValue} style={{ textTransform: "capitalize", color: "#60A5FA" }}>
                {license?.plan_tier || trial?.status || "None"}
              </div>
              <div className={styles.metricSubtext}>
                {license ? `Expires ${new Date(license.valid_until).toLocaleDateString()}` : "Trial Mode"}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Health Score</div>
              <div className={styles.metricValue} style={{ color: "#34D399" }}>
                {school.health_score ?? 100}%
              </div>
              <div className={styles.metricSubtext}>{school.health_status}</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Registered Nodes</div>
              <div className={styles.metricValue}>{installations.length}</div>
              <div className={styles.metricSubtext}>Local hardware servers</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Active Alarms</div>
              <div className={styles.metricValue} style={{ color: alerts.length > 0 ? "#F87171" : "#94A3B8" }}>
                {alerts.length}
              </div>
              <div className={styles.metricSubtext}>Platform alerts</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div className={styles.tableContainer} style={{ padding: "1.25rem" }}>
              <div className={styles.tableTitle} style={{ marginBottom: "1rem" }}>
                Campus Contact Information
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8125rem" }}>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Primary Admin:</span>{" "}
                  <strong style={{ color: "var(--text-heading)" }}>{school.primary_admin_name || "Unassigned"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Admin Email:</span>{" "}
                  <span className={styles.mono} style={{ color: "var(--text-primary)" }}>{school.primary_admin_email || "N/A"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Admin Phone:</span>{" "}
                  <span className={styles.mono} style={{ color: "var(--text-primary)" }}>{school.primary_admin_phone || "N/A"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Organization:</span>{" "}
                  <span style={{ color: "var(--accent)" }}>{school.organization_name}</span>
                </div>
              </div>
            </div>

            <div className={styles.tableContainer} style={{ padding: "1.25rem" }}>
              <div className={styles.tableTitle} style={{ marginBottom: "1rem" }}>
                Commercial Entitlement Status
              </div>
              {license ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8125rem" }}>
                  <div>
                    <span style={{ color: "#64748B" }}>License Key:</span>{" "}
                    <span className={styles.mono} style={{ color: "#60A5FA" }}>{license.license_key}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Tier:</span>{" "}
                    <span style={{ textTransform: "uppercase", fontWeight: 700, color: "#34D399" }}>{license.plan_tier}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Student Quota:</span>{" "}
                    <span className={styles.mono}>{license.max_students} students</span>
                  </div>
                </div>
              ) : trial ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8125rem" }}>
                  <div>
                    <span style={{ color: "#64748B" }}>Trial Status:</span>{" "}
                    <span className={styles.statusBadge} style={{ background: "rgba(245, 158, 11, 0.15)", color: "#FBBF24" }}>
                      Active Trial
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Expiration Date:</span>{" "}
                    <span className={styles.mono} style={{ color: "var(--text-heading)" }}>{new Date(trial.expires_at).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Trial Quota:</span>{" "}
                    <span className={styles.mono}>{trial.student_limit} students</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>No active trial or license found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: INFRASTRUCTURE ── */}
      {activeTab === "infrastructure" && (
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Connected Installation Nodes</div>
            <button onClick={() => setActiveTab("deployments")} className={`${styles.btn} ${styles.btnPrimary}`}>
              + Provision New Node
            </button>
          </div>

          {installations.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No installation nodes registered for this campus yet.
            </div>
          ) : (
            <div className={styles.tableResponsive}>
              <table className={styles.table} style={{ minWidth: "800px" }}>
                <thead>
                  <tr>
                    <th>Installation ID</th>
                    <th>Node ID</th>
                    <th>Health Status</th>
                    <th>Version</th>
                    <th>Local LAN IP</th>
                    <th>Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody>
                  {installations.map((inst: any) => (
                    <tr key={inst.id}>
                      <td>
                        <span className={styles.mono} style={{ fontWeight: 600, color: "var(--accent)" }}>
                          {inst.installation_id}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, color: "var(--text-heading)" }}>{inst.node_id}</span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${inst.health_status === "healthy" ? styles.badgeHealthy : styles.badgeWarning}`}>
                          <span className={`${styles.statusDot} ${inst.health_status === "healthy" ? styles.dotHealthy : styles.dotWarning}`} />
                          {inst.health_score}% · {inst.health_status}
                        </span>
                      </td>
                      <td className={styles.mono}>
                        v{inst.software_version} ({inst.release_channel})
                      </td>
                      <td className={styles.mono}>{inst.local_ip || "127.0.0.1"}</td>
                      <td>
                        <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                          {inst.last_heartbeat_at ? new Date(inst.last_heartbeat_at).toLocaleString() : "Never"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: ACTIVITY (LIVE TELEMETRY) ── */}
      {activeTab === "activity" && (
        <div>
          {/* Live Vitals Grid */}
          <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Active Connected Clients</div>
              <div className={styles.metricValue} style={{ color: liveStats?.active_connected_clients != null ? "var(--accent)" : "var(--text-muted)" }}>
                {liveStats?.active_connected_clients ?? "—"}
              </div>
              <div className={styles.metricSubtext}>{liveStats?.active_connected_clients != null ? "Concurrent LAN users" : "No telemetry"}</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Live Exam Sessions</div>
              <div className={styles.metricValue} style={{ color: liveStats?.active_exam_sessions != null && liveStats.active_exam_sessions > 0 ? "var(--success)" : "var(--text-muted)" }}>
                {liveStats?.active_exam_sessions ?? "—"}
              </div>
              <div className={styles.metricSubtext}>{liveStats?.active_exam_sessions != null ? "Currently active in hall" : "No telemetry"}</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Exams Today</div>
              <div className={styles.metricValue} style={{ color: "var(--purple)" }}>
                {liveStats?.exams_conducted_today ?? 0}
              </div>
              <div className={styles.metricSubtext}>Recorded today</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Live Health Score</div>
              <div
                className={styles.metricValue}
                style={{
                  color: (school.health_score ?? 100) > 80 ? "var(--success)" : (school.health_score ?? 100) > 50 ? "var(--warning)" : "var(--danger)",
                }}
              >
                {school.health_score ?? 100}%
              </div>
              <div className={styles.metricSubtext}>Status: {school.health_status}</div>
            </div>
          </div>

          {/* Quick Supervisory Config Push */}
          <div className={styles.tableContainer} style={{ padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-heading)", fontSize: "0.875rem" }}>Supervisory Control &amp; Config Push</div>
              <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Push instant updates down to local campus nodes via the encrypted bidirectional queue.</div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                disabled={syncTriggering}
                onClick={async () => {
                  setSyncTriggering(true);
                  try {
                    await controlApi.pushConfigToSchool(Number(schoolId), "feature_flags");
                    alert("Feature flags push queued for campus nodes.");
                  } catch (e: any) { alert(e.message); } finally { setSyncTriggering(false); }
                }}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                Push Flags
              </button>
              <button
                disabled={syncTriggering}
                onClick={async () => {
                  setSyncTriggering(true);
                  try {
                    await controlApi.pushConfigToSchool(Number(schoolId), "license");
                    alert("License update push queued for campus nodes.");
                  } catch (e: any) { alert(e.message); } finally { setSyncTriggering(false); }
                }}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                Push License
              </button>
              <button
                disabled={syncTriggering}
                onClick={async () => {
                  setSyncTriggering(true);
                  try {
                    await controlApi.pushConfigToSchool(Number(schoolId), "config");
                    alert("Config refresh signal queued.");
                  } catch (e: any) { alert(e.message); } finally { setSyncTriggering(false); }
                }}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Request Sync Pulse
              </button>
            </div>
          </div>

          {/* Heartbeat Telemetry Time-Series */}
          <div className={styles.tableContainer} style={{ marginBottom: "1.25rem" }}>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>Recent Node Heartbeat Pulses</div>
              <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#34D399" }}>
                ● Real-Time Feed
              </span>
            </div>

            {telemetryHistory.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                Awaiting initial heartbeat telemetry from campus node agent.
              </div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.table} style={{ minWidth: "820px" }}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Node</th>
                      <th>CPU</th>
                      <th>Memory</th>
                      <th>Disk</th>
                      <th>Clients / Exams</th>
                      <th>DB Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetryHistory.slice(0, 15).map((hb: any) => (
                      <tr key={hb.id}>
                        <td className={styles.mono} style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(hb.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--accent)", fontSize: "0.8125rem" }}>
                          {hb.node_id || "NODE-PRIMARY"}
                        </td>
                        <td className={styles.mono} style={{ color: (hb.cpu_usage || 0) > 80 ? "var(--danger)" : "var(--success)" }}>
                          {Math.round(hb.cpu_usage || 0)}%
                        </td>
                        <td className={styles.mono} style={{ color: (hb.memory_usage || 0) > 80 ? "var(--danger)" : "var(--success)" }}>
                          {Math.round(hb.memory_usage || 0)}%
                        </td>
                        <td className={styles.mono} style={{ color: (hb.storage_usage || 0) > 85 ? "var(--danger)" : "var(--text-muted)" }}>
                          {Math.round(hb.storage_usage || 0)}%
                        </td>
                        <td>
                          <span className={styles.mono} style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {hb.connected_clients ?? 0} clients · {hb.active_exam_sessions ?? 0} exams
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${hb.db_status === "healthy" || !hb.db_status ? styles.badgeHealthy : styles.badgeCritical}`}>
                            {hb.db_status || "healthy"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Telemetry Events Stream */}
          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>Live Telemetry Event Log</div>
              <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#64748B" }}>
                Auto-Drained from Node Queue
              </span>
            </div>

            {!liveStats?.recent_events || liveStats.recent_events.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "#64748B", fontSize: "0.8125rem" }}>
                No events recorded yet. Operational events will stream here automatically.
              </div>
            ) : (
              <div style={{ padding: "0.5rem 0", maxHeight: "300px", overflowY: "auto" }}>
                {liveStats.recent_events.map((ev: any) => (
                  <div
                    key={ev.id}
                    style={{
                      padding: "0.6rem 1.25rem",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span
                        className={`${styles.statusDot} ${
                          ev.severity === "critical"
                            ? styles.dotCritical
                            : ev.severity === "warning"
                            ? styles.dotWarning
                            : styles.dotHealthy
                        }`}
                      />
                      <div>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#E2E8F0" }}>
                          {ev.event_type.replace(/_/g, " ")}
                        </div>
                        {ev.metadata_json && (
                          <div className={styles.mono} style={{ fontSize: "0.6875rem", color: "#64748B" }}>
                            {ev.metadata_json}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>
                      {new Date(ev.event_timestamp || ev.received_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: DEPLOYMENTS ── */}
      {activeTab === "deployments" && (
        <div style={{ maxWidth: "700px" }}>
          <div className={styles.tableContainer} style={{ padding: "1.5rem" }}>
            <div className={styles.tableTitle} style={{ marginBottom: "0.5rem" }}>
              Provision On-Premise Installation Node
            </div>
            <p style={{ fontSize: "0.8125rem", color: "#64748B", marginBottom: "1.25rem" }}>
              Generate cryptographic installation credentials for this campus server machine.
            </p>

            <form onSubmit={handleProvisionNode} style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <input
                type="text"
                value={nodeIdInput}
                onChange={(e) => setNodeIdInput(e.target.value)}
                placeholder="Node Identifier (e.g. NODE-MAIN-LAB)"
                className={styles.input}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" disabled={provisionLoading} className={`${styles.btn} ${styles.btnPrimary}`}>
                {provisionLoading ? "Provisioning…" : "Generate Node Credentials"}
              </button>
            </form>

            {provisionResult && (
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-panel)", borderRadius: "8px", padding: "1.25rem" }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--success)", marginBottom: "0.5rem" }}>
                  Installation Node Provisioned Successfully
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--danger)", marginBottom: "0.75rem" }}>
                  Important: Copy the secret key now. It is never displayed again!
                </div>

                <pre
                  className={styles.mono}
                  style={{
                    background: "var(--bg-input)",
                    padding: "1rem",
                    borderRadius: "6px",
                    color: "var(--accent)",
                    fontSize: "0.75rem",
                    overflowX: "auto",
                    border: "1px solid var(--border-input)",
                  }}
                >
                  {JSON.stringify(
                    {
                      ACAD_INSTALLATION_ID: provisionResult.credentials.installation_id,
                      ACAD_INSTALLATION_SECRET: provisionResult.credentials.secret_key,
                      ACAD_CLOUD_ENDPOINT: "https://control.acad.ng",
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: FLAGS ── */}
      {activeTab === "flags" && (
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Modular Feature Flags & Controls</div>
          </div>
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "600px" }}>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "cbt_exam", name: "Offline CBT Examination Engine", cat: "Core CBT" },
                  { key: "question_bank", name: "Offline Question Bank Management", cat: "Core CBT" },
                  { key: "grading_center", name: "Flexible 70/30 Grading Policies", cat: "Academic" },
                  { key: "report_cards", name: "Report Card Computation & Printing", cat: "Academic" },
                  { key: "timetables", name: "Automated Timetable Generation", cat: "Academic" },
                  { key: "guardian_portal", name: "Guardian Observation Portal", cat: "Portals" },
                  { key: "attendance_tracker", name: "Student Attendance & Roll Call", cat: "Operations" },
                  { key: "fee_management", name: "School Fee Billing & Ledger", cat: "Commercial" },
                  { key: "offline_assignments", name: "Offline Homework & Assignments", cat: "Learning" },
                  { key: "ai_learning_engine", name: "AI Question Generator & Analytics", cat: "Advanced" },
                ].map((m) => {
                  const isEnabled = Boolean(flagToggles[m.key]);
                  return (
                    <tr key={m.key}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-heading)" }}>{m.name}</div>
                        <div className={styles.mono} style={{ color: "var(--text-muted)" }}>{m.key}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{m.cat}</span>
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{
                            background: isEnabled ? "var(--success-bg)" : "var(--bg-hover)",
                            color: isEnabled ? "var(--success)" : "var(--text-muted)",
                          }}
                        >
                          {isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                        <button
                          onClick={() => handleFlagChange(m.key, isEnabled)}
                          className={`${styles.btn} ${isEnabled ? styles.btnDanger : styles.btnPrimary}`}
                        >
                          {isEnabled ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: BACKUPS ── */}
      {activeTab === "backups" && (
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Automated Backup Telemetry</div>
          </div>
          {backups.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No backup records reported by local nodes yet.
            </div>
          ) : (
            <div className={styles.tableResponsive}>
              <table className={styles.table} style={{ minWidth: "720px" }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Destination</th>
                    <th>Size</th>
                    <th>Duration</th>
                    <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b: any) => (
                    <tr key={b.id}>
                      <td className={styles.mono}>{new Date(b.timestamp).toLocaleString()}</td>
                      <td>{b.destination}</td>
                      <td className={styles.mono}>{(b.backup_size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
                      <td className={styles.mono}>{b.duration_ms} ms</td>
                      <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                        <span className={styles.statusBadge} style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 7: INCIDENTS ── */}
      {activeTab === "incidents" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>Support Incident Tickets</div>
            </div>

            {incidents.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No open support incidents for this school.
              </div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.table} style={{ minWidth: "680px" }}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title & Description</th>
                      <th>Severity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc: any) => (
                      <tr key={inc.id}>
                        <td className={styles.mono} style={{ color: "var(--accent)" }}>{inc.incident_code}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text-heading)" }}>{inc.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "normal" }}>{inc.description}</div>
                        </td>
                        <td>
                          <span className={styles.statusBadge} style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                            {inc.severity}
                          </span>
                        </td>
                        <td>
                          <span className={styles.mono} style={{ textTransform: "uppercase" }}>{inc.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.tableContainer} style={{ padding: "1.25rem" }}>
            <div className={styles.tableTitle} style={{ marginBottom: "1rem" }}>
              Log Support Incident
            </div>
            <form onSubmit={handleCreateIncident} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Incident Title
                </label>
                <input
                  type="text"
                  value={newIncidentTitle}
                  onChange={(e) => setNewIncidentTitle(e.target.value)}
                  className={styles.input}
                  style={{ width: "100%" }}
                  placeholder="e.g. CBT Exam crash during mock"
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Severity
                </label>
                <select
                  value={newIncidentSeverity}
                  onChange={(e) => setNewIncidentSeverity(e.target.value)}
                  className={styles.input}
                  style={{ width: "100%" }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Description & Context
                </label>
                <textarea
                  value={newIncidentDesc}
                  onChange={(e) => setNewIncidentDesc(e.target.value)}
                  className={styles.input}
                  style={{ width: "100%", height: "80px" }}
                  placeholder="Details regarding hardware, network or student impact…"
                />
              </div>

              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: "100%", justifyContent: "center" }}>
                Create Support Incident
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 8: ONBOARDING ── */}
      {activeTab === "onboarding" && (
        <div style={{ maxWidth: "600px" }}>
          <div className={styles.tableContainer} style={{ padding: "1.5rem" }}>
            <div className={styles.tableTitle} style={{ marginBottom: "1.25rem" }}>
              Campus Pilot Onboarding Progress
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {[
                { step: 1, title: "Provision On-Premise Installation Node", done: installations.length > 0 },
                { step: 2, title: "Conduct Initial Heartbeat Verification", done: installations.some((i: any) => i.last_heartbeat_at) },
                { step: 3, title: "Onboard Teachers & Subject Cohorts", done: true },
                { step: 4, title: "Execute Pilot CBT Exam Session", done: false },
                { step: 5, title: "Convert Trial to Paid Commercial License", done: school.status === "active" },
              ].map((s) => (
                <div
                  key={s.step}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    padding: "0.75rem 1rem",
                    background: s.done ? "var(--success-bg)" : "var(--bg-input)",
                    border: `1px solid ${s.done ? "var(--success)" : "var(--border-panel)"}`,
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: s.done ? "var(--success)" : "var(--border-input)",
                      color: s.done ? "#FFFFFF" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.6875rem",
                    }}
                  >
                    {s.done ? "✓" : s.step}
                  </div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: s.done ? "var(--text-heading)" : "var(--text-secondary)" }}>
                    {s.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
