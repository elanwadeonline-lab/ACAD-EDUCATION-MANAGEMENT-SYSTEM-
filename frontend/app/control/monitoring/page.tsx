"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { subscribeControlStream } from "../../../lib/controlStream";

function ResourceBar({ value, label }: { value: number; label: string }) {
  const color = value > 85 ? "var(--danger)" : value > 70 ? "var(--warning)" : "var(--success)";
  return (
    <div style={{ marginBottom: "0.3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "var(--text-secondary)", marginBottom: "0.15rem" }}>
        <span>{label}</span>
        <span style={{ color, fontFamily: "'DM Mono', monospace" }}>{value ?? 0}%</span>
      </div>
      <div style={{ background: "var(--border-panel)", borderRadius: "2px", height: "4px", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(value ?? 0, 100)}%`, background: color, height: "100%", borderRadius: "2px", transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function HeartbeatAgo({ ts }: { ts: string | null }) {
  if (!ts) return <span style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>Never</span>;
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diffMins = Math.floor((now - then) / 60000);
  const color = diffMins > 30 ? "var(--danger)" : diffMins > 10 ? "var(--warning)" : "var(--success)";
  const label = diffMins < 2 ? "Just now" : diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;
  return <span className={styles.mono} style={{ fontSize: "0.6875rem", color }}>{label}</span>;
}

export default function ControlMonitoringPage() {
  const [overview, setOverview] = useState<any>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  const [localExamPool, setLocalExamPool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const loadData = async () => {
    try {
      const [ov, inst, localPool] = await Promise.all([
        controlApi.getOverview().catch(() => null),
        controlApi.getInstallations().catch(() => ({ installations: [] })),
        controlApi.getLocalExamPoolLive().catch(() => null),
      ]);
      if (ov) setOverview(ov);
      if (inst?.installations) setInstallations(inst.installations);
      if (localPool) setLocalExamPool(localPool);
    } catch (err) {
      console.error("Monitoring load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const stop = subscribeControlStream({
      onData: (stream) => {
        if (stream.metrics) setOverview((prev: any) => ({ ...(prev || {}), metrics: stream.metrics }));
        // tick forces HeartbeatAgo to recompute relative timestamps
        setTick((t) => t + 1);
      },
      pollingFn: async () => {
        await loadData();
        setTick((t) => t + 1);
        return null;
      },
      pollingIntervalMs: 10000,
    });
    // Dedicated installation poll every 10s even when SSE is pushing metrics (installations not in stream)
    const installPoll = setInterval(() => {
      controlApi.getInstallations().then((r) => { if (r?.installations) setInstallations(r.installations); }).catch(() => {});
      controlApi.getLocalExamPoolLive().then((r) => setLocalExamPool(r)).catch(() => {});
    }, 10000);
    return () => { stop(); clearInterval(installPoll); };
  }, []);

  const metrics = overview?.metrics || {};

  const summaryCards = [
    { label: "Healthy Nodes", value: metrics.healthyInstallations ?? 0, color: "var(--success)", sub: "Operating optimally" },
    { label: "Active Exam Sessions", value: metrics.activeExamSessions ?? 0, color: "var(--accent)", sub: "Across all LAN networks" },
    { label: "Total Questions (Pool)", value: metrics.totalQuestionsAggregate ?? 0, color: "var(--purple)", sub: "Verified questions in bank" },
    { label: "CBT Exams Configured", value: metrics.totalExamsAggregate ?? 0, color: "var(--warning)", sub: "Local host database" },
    { label: "Total Students", value: metrics.totalStudentsAggregate ?? 0, color: "var(--success)", sub: "Enrolled candidates" },
    { label: "Avg Health Score", value: metrics.avgHealthScore != null ? `${Math.round(metrics.avgHealthScore)}%` : "—", color: metrics.avgHealthScore != null && metrics.avgHealthScore < 70 ? "var(--danger)" : "var(--success)", sub: "Fleet-wide average" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>Fleet Health &amp; Telemetry Monitor</h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Live hardware metrics, heartbeat latencies, and active exam workloads across all school nodes.
          </p>
        </div>
        <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
          Live SSE + 10s fallback
        </span>
      </div>

      {/* Summary metric cards */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        {summaryCards.map((card) => (
          <div key={card.label} className={styles.metricCard}>
            <div className={styles.metricLabel}>{card.label}</div>
            <div className={styles.metricValue} style={{ color: card.color, fontSize: typeof card.value === "string" ? "1.5rem" : "1.75rem" }}>
              {loading ? "—" : card.value}
            </div>
            <div className={styles.metricSubtext}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Node matrix table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Node Heartbeat &amp; Resource Matrix</div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className={styles.statusBadge} style={{ background: "var(--success-bg)", color: "var(--success)", fontSize: "0.6875rem" }}>
              <span className={`${styles.statusDot} ${styles.dotHealthy}`} />
              Live Telemetry
            </span>
          </div>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.table} style={{ minWidth: "980px" }}>
            <thead>
              <tr>
                <th>Node Identifier</th>
                <th>Campus</th>
                <th>Health</th>
                <th>Resource Load (CPU / RAM / Disk)</th>
                <th>Clients / Exams</th>
                <th>Software</th>
                <th>Last Heartbeat</th>
                <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>Loading fleet data…</td>
                </tr>
              ) : installations.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>No installation nodes registered.</td>
                </tr>
              ) : (
                installations.map((inst) => (
                  <tr key={inst.id}>
                    <td>
                      <span className={styles.mono} style={{ fontWeight: 600, color: "var(--accent)", fontSize: "0.8125rem" }}>{inst.node_id}</span>
                      <div className={styles.mono} style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{inst.installation_id}</div>
                    </td>
                    <td>
                      <Link href={`/control/schools/${inst.school_id}`} style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none", fontSize: "0.8125rem" }}>
                        {inst.school_name}
                      </Link>
                      <div className={styles.mono} style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>{inst.local_ip || "—"}</div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${
                        inst.health_status === "healthy" ? styles.badgeHealthy
                          : inst.health_status === "warning" ? styles.badgeWarning
                          : inst.health_status === "degraded" ? styles.badgeDegraded
                          : inst.health_status === "critical" ? styles.badgeCritical
                          : inst.health_status === "offline" ? styles.badgeOffline
                          : styles.badgeOffline
                      }`}>
                        <span className={`${styles.statusDot} ${
                          inst.health_status === "healthy" ? styles.dotHealthy
                            : inst.health_status === "warning" ? styles.dotWarning
                            : inst.health_status === "degraded" ? styles.dotDegraded
                            : inst.health_status === "critical" ? styles.dotCritical
                            : styles.dotOffline
                        }`} />
                        {inst.health_status === "unknown" ? "Unknown" : inst.health_score != null ? `${inst.health_score}%` : "—"} · {inst.health_status || "unknown"}
                      </span>
                    </td>
                    <td style={{ minWidth: "140px" }}>
                      {inst.last_cpu_usage != null || inst.last_memory_usage != null || inst.last_storage_usage != null ? (
                        <div style={{ padding: "0.2rem 0" }}>
                          {inst.last_cpu_usage != null && <ResourceBar label="CPU" value={Math.round(inst.last_cpu_usage)} />}
                          {inst.last_memory_usage != null && <ResourceBar label="RAM" value={Math.round(inst.last_memory_usage)} />}
                          {inst.last_storage_usage != null && <ResourceBar label="Disk" value={Math.round(inst.last_storage_usage)} />}
                          {inst.last_cpu_usage == null && inst.last_memory_usage == null && inst.last_storage_usage == null && (
                            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>No telemetry yet</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>No telemetry — Waiting for agent</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.mono} style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}>{inst.connected_clients ?? "—"} clients</div>
                      <div className={styles.mono} style={{ fontSize: "0.75rem", color: "var(--purple)" }}>{inst.active_exam_sessions ?? "—"} exams</div>
                    </td>
                    <td>
                      <span className={styles.mono} style={{ fontSize: "0.75rem", color: inst.software_version ? "var(--accent)" : "var(--text-muted)" }}>{inst.software_version ? `v${inst.software_version}` : "Unknown"}</span>
                      <div className={styles.mono} style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{inst.release_channel || "—"}</div>
                    </td>
                    <td>
                      <HeartbeatAgo ts={inst.last_heartbeat_at} />
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                      <Link href={`/control/schools/${inst.school_id}`} className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: "0.6875rem" }}>
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
