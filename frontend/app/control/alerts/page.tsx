"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { AlertOctagon, CheckCircle2, ShieldAlert } from "lucide-react";

type SeverityFilter = "all" | "critical" | "high" | "warning";
const SEVERITY_TABS: SeverityFilter[] = ["all", "critical", "high", "warning"];

export default function ControlAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadAlerts = async () => {
    try {
      const res = await controlApi.getAlerts();
      setAlerts(res.alerts || []);
    } catch (err: any) {
      setError(err.message || "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAck = async (id: number) => {
    setActionLoading(id);
    try {
      await controlApi.acknowledgeAlert(id);
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || "Failed to acknowledge alert.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (id: number) => {
    setActionLoading(id);
    try {
      await controlApi.resolveAlert(id);
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || "Failed to resolve alert.");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);
  const openCount = alerts.filter((a) => a.status === "open").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" && a.status !== "resolved").length;
  const highCount = alerts.filter((a) => a.severity === "high" && a.status !== "resolved").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
            Automated Fleet Alarms
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Threshold violations, storage exhaustion, backup anomalies, and node offline alarms. Auto-refreshes every 15s.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {criticalCount > 0 && (
            <span className={styles.statusBadge} style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <span className={`${styles.statusDot} ${styles.dotCritical}`} />
              {criticalCount} Critical
            </span>
          )}
          <span className={styles.statusBadge} style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {openCount} Open
          </span>
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Alarms Logged</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : alerts.length}
          </div>
          <div className={styles.metricSubtext}>Historical fleet events</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Critical Alarms</div>
          <div className={styles.metricValue} style={{ color: criticalCount > 0 ? "var(--danger)" : "var(--text-muted)" }}>
            {loading ? "—" : criticalCount}
          </div>
          <div className={styles.metricSubtext}>Immediate operator action</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>High &amp; Warnings</div>
          <div className={styles.metricValue} style={{ color: highCount > 0 ? "var(--warning)" : "var(--text-muted)" }}>
            {loading ? "—" : highCount}
          </div>
          <div className={styles.metricSubtext}>Elevated resource utilization</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Resolved Alarms</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : resolvedCount}
          </div>
          <div className={styles.metricSubtext}>Mitigated issues</div>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--danger-text)", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Severity filter tabs */}
      <div className={styles.tabsBar} style={{ marginBottom: "1rem" }}>
        {SEVERITY_TABS.map((tab) => {
          const count = tab === "all" ? alerts.length : alerts.filter((a) => a.severity === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`${styles.tabBtn} ${filter === tab ? styles.tabBtnActive : ""}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Alerts Table Matrix */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading alert center…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--success)", fontSize: "0.8125rem" }}>
            All systems operational — no active alarms matching this filter.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "860px" }}>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Campus</th>
                  <th>Alert Title &amp; Details</th>
                  <th>Status</th>
                  <th>Triggered At</th>
                  <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((alt) => (
                  <tr key={alt.id} style={{ opacity: alt.status === "resolved" ? 0.5 : 1 }}>
                    <td>
                      <span className={`${styles.statusBadge} ${
                        alt.severity === "critical" ? styles.badgeCritical
                          : alt.severity === "high" ? styles.badgeDegraded
                          : styles.badgeWarning
                      }`}>
                        {alt.severity === "critical" && <span className={`${styles.statusDot} ${styles.dotCritical}`} />}
                        {alt.severity}
                      </span>
                    </td>
                    <td>
                      <Link href={`/control/schools/${alt.school_id}`} style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none" }}>
                        {alt.school_name}
                      </Link>
                      <div className={styles.mono} style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>{alt.school_code}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-heading)", fontSize: "0.8125rem" }}>{alt.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{alt.details}</div>
                    </td>
                    <td>
                      <span className={styles.mono} style={{
                        textTransform: "uppercase",
                        fontSize: "0.6875rem",
                        color: alt.status === "open" ? "var(--warning)" : alt.status === "acknowledged" ? "var(--accent)" : "var(--success)",
                      }}>
                        {alt.status}
                      </span>
                    </td>
                    <td className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                      {new Date(alt.created_at).toLocaleString()}
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                      {alt.status !== "resolved" && (
                        <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          {alt.status === "open" && (
                            <button
                              onClick={() => handleAck(alt.id)}
                              disabled={actionLoading === alt.id}
                              className={`${styles.btn} ${styles.btnSecondary}`}
                              style={{ fontSize: "0.6875rem" }}
                            >
                              {actionLoading === alt.id ? "…" : "Ack"}
                            </button>
                          )}
                          <button
                            onClick={() => handleResolve(alt.id)}
                            disabled={actionLoading === alt.id}
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            style={{ fontSize: "0.6875rem" }}
                          >
                            {actionLoading === alt.id ? "…" : "Resolve"}
                          </button>
                          <Link
                            href={`/control/schools/${alt.school_id}`}
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ fontSize: "0.6875rem" }}
                          >
                            Investigate
                          </Link>
                        </div>
                      )}
                      {alt.status === "resolved" && (
                        <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--success)" }}>Mitigated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
