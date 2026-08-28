"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

function ResourceBar({ value, label }: { value: number; label: string }) {
  const color = value > 85 ? "#F87171" : value > 70 ? "#FBBF24" : "#34D399";
  return (
    <div style={{ marginBottom: "0.3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "#64748B", marginBottom: "0.15rem" }}>
        <span>{label}</span>
        <span style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>{value ?? 0}%</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "4px", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(value ?? 0, 100)}%`, background: color, height: "100%", borderRadius: "2px", transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function HeartbeatAgo({ ts }: { ts: string | null }) {
  if (!ts) return <span style={{ color: "#64748B", fontSize: "0.6875rem" }}>Never</span>;
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diffMins = Math.floor((now - then) / 60000);
  const color = diffMins > 30 ? "#F87171" : diffMins > 10 ? "#FBBF24" : "#34D399";
  const label = diffMins < 2 ? "Just now" : diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;
  return <span className={styles.mono} style={{ fontSize: "0.6875rem", color }}>{label}</span>;
}

export default function ControlMonitoringPage() {
  const [overview, setOverview] = useState<any>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const loadData = async () => {
    try {
      const [ov, inst] = await Promise.all([controlApi.getOverview(), controlApi.getInstallations()]);
      setOverview(ov);
      setInstallations(inst.installations || []);
    } catch (err) {
      console.error("Monitoring load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => { loadData(); setTick((t) => t + 1); }, 10000);
    return () => clearInterval(interval);
  }, []);

  const metrics = overview?.metrics || {};

  const summaryCards = [
    { label: "Healthy Nodes", value: metrics.healthyInstallations ?? 0, color: "#34D399", sub: "Operating optimally" },
    { label: "Warning / Degraded", value: (metrics.warningInstallations ?? 0) + (metrics.degradedInstallations ?? 0), color: "#FBBF24", sub: "Elevated thresholds" },
    { label: "Critical / Offline", value: (metrics.criticalInstallations ?? 0) + (metrics.offlineInstallations ?? 0), color: metrics.offlineInstallations > 0 || metrics.criticalInstallations > 0 ? "#F87171" : "#64748B", sub: "Missed heartbeats" },
    { label: "Active Exam Sessions", value: metrics.activeExamSessions ?? 0, color: "#60A5FA", sub: "Across all LAN networks" },
    { label: "Total Schools", value: metrics.totalSchools ?? 0, color: "#A78BFA", sub: "Registered campuses" },
    { label: "Avg Health Score", value: `${Math.round(metrics.avgHealthScore ?? 100)}%`, color: metrics.avgHealthScore < 70 ? "#F87171" : "#34D399", sub: "Fleet-wide average" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>Fleet Health &amp; Telemetry Monitor</h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            Live hardware metrics, heartbeat latencies, and active exam workloads across all school nodes.
          </p>
        </div>
        <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#334155" }}>
          Auto-refresh every 10s
        </span>
      </div>

      {/* Summary metric cards */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.5rem" }}>
        {summaryCards.map((card) => (
          <div key={card.label} className={styles.metricCard}>
            <div className={styles.metricLabel}>{card.label}</div>
            <div className={styles.metricValue} style={{ color: card.color, fontSize: typeof card.value === "string" ? "1.75rem" : "2rem" }}>
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
            <span className={styles.statusBadge} style={{ background: "rgba(16, 185, 129, 0.08)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.6875rem" }}>
              <span className={`${styles.statusDot} ${styles.dotHealthy}`} />
              Live Telemetry
            </span>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Node Identifier</th>
              <th>Campus</th>
              <th>Health</th>
              <th style={{ minWidth: "140px" }}>Resource Utilization</th>
              <th>Clients / Exams</th>
              <th>Software</th>
              <th>Last Heartbeat</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#64748B" }}>Loading fleet data…</td>
              </tr>
            ) : installations.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#64748B" }}>No installation nodes registered.</td>
              </tr>
            ) : (
              installations.map((inst) => (
                <tr key={inst.id}>
                  <td>
                    <span className={styles.mono} style={{ fontWeight: 600, color: "#60A5FA", fontSize: "0.8125rem" }}>{inst.node_id}</span>
                    <div className={styles.mono} style={{ fontSize: "0.6rem", color: "#334155", marginTop: "0.15rem" }}>{inst.installation_id}</div>
                  </td>
                  <td>
                    <Link href={`/control/schools/${inst.school_id}`} style={{ fontWeight: 600, color: "#F8FAFC", textDecoration: "none", fontSize: "0.8125rem" }}>
                      {inst.school_name}
                    </Link>
                    <div className={styles.mono} style={{ color: "#64748B", fontSize: "0.6875rem" }}>{inst.local_ip || "—"}</div>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${
                      inst.health_status === "healthy" ? styles.badgeHealthy
                        : inst.health_status === "warning" ? styles.badgeWarning
                        : inst.health_status === "degraded" ? styles.badgeDegraded
                        : inst.health_status === "critical" ? styles.badgeCritical
                        : styles.badgeOffline
                    }`}>
                      <span className={`${styles.statusDot} ${
                        inst.health_status === "healthy" ? styles.dotHealthy
                          : inst.health_status === "warning" ? styles.dotWarning
                          : inst.health_status === "degraded" ? styles.dotDegraded
                          : inst.health_status === "critical" ? styles.dotCritical
                          : styles.dotOffline
                      }`} />
                      {inst.health_score}%
                    </span>
                  </td>
                  <td style={{ minWidth: "140px" }}>
                    {inst.last_cpu_usage !== undefined ? (
                      <div style={{ padding: "0.2rem 0" }}>
                        <ResourceBar label="CPU" value={Math.round(inst.last_cpu_usage ?? 0)} />
                        <ResourceBar label="RAM" value={Math.round(inst.last_memory_usage ?? 0)} />
                        <ResourceBar label="Disk" value={Math.round(inst.last_storage_usage ?? 0)} />
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.6875rem", color: "#334155" }}>No telemetry yet</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.mono} style={{ fontSize: "0.75rem", color: "#CBD5E1" }}>{inst.connected_clients ?? "—"} clients</div>
                    <div className={styles.mono} style={{ fontSize: "0.75rem", color: "#A78BFA" }}>{inst.active_exam_sessions ?? 0} exams</div>
                  </td>
                  <td>
                    <span className={styles.mono} style={{ fontSize: "0.75rem", color: "#60A5FA" }}>v{inst.software_version}</span>
                    <div className={styles.mono} style={{ fontSize: "0.6rem", color: "#334155", textTransform: "uppercase" }}>{inst.release_channel}</div>
                  </td>
                  <td>
                    <HeartbeatAgo ts={inst.last_heartbeat_at} />
                  </td>
                  <td>
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
  );
}
