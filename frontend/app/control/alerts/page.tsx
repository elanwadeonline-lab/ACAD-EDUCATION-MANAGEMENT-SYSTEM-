"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>Automated Fleet Alarms</h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            Threshold violations, storage exhaustion, backup anomalies, and node offline alarms. Auto-refreshes every 15s.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {criticalCount > 0 && (
            <span className={styles.statusBadge} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#F87171" }}>
              <span className={`${styles.statusDot} ${styles.dotCritical}`} />
              {criticalCount} Critical
            </span>
          )}
          <span className={styles.statusBadge} style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
            {openCount} Open
          </span>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#F87171", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer" }}>✕</button>
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

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>Loading alert center…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#34D399", fontSize: "0.8125rem" }}>
            All systems operational — no active alarms matching this filter.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Campus</th>
                <th>Alert Title &amp; Details</th>
                <th>Status</th>
                <th>Triggered At</th>
                <th>Actions</th>
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
                    <Link href={`/control/schools/${alt.school_id}`} style={{ fontWeight: 600, color: "#F8FAFC", textDecoration: "none" }}>
                      {alt.school_name}
                    </Link>
                    <div className={styles.mono} style={{ color: "#64748B", fontSize: "0.6875rem" }}>{alt.school_code}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#F8FAFC", fontSize: "0.8125rem" }}>{alt.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{alt.details}</div>
                  </td>
                  <td>
                    <span className={styles.mono} style={{
                      textTransform: "uppercase",
                      fontSize: "0.6875rem",
                      color: alt.status === "open" ? "#FBBF24" : alt.status === "acknowledged" ? "#60A5FA" : "#34D399",
                    }}>
                      {alt.status}
                    </span>
                  </td>
                  <td className={styles.mono} style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>
                    {new Date(alt.created_at).toLocaleString()}
                  </td>
                  <td>
                    {alt.status !== "resolved" && (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
