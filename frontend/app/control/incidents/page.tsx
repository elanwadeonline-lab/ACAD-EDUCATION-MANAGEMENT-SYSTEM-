"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { LifeBuoy, CheckCircle2, AlertCircle } from "lucide-react";

type StatusFilter = "all" | "open" | "investigating" | "mitigated" | "resolved" | "closed";
const STATUS_TABS: StatusFilter[] = ["all", "open", "investigating", "mitigated", "resolved", "closed"];

export default function ControlIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [resolveForm, setResolveForm] = useState<Record<number, { rootCause: string; mitigation: string }>>({});
  const [resolveLoading, setResolveLoading] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadIncidents = async () => {
    try {
      const res = await controlApi.getIncidents();
      setIncidents(res.incidents || []);
    } catch (err: any) {
      setError(err.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const openResolveForm = (id: number) => {
    setResolveForm((prev) => ({ ...prev, [id]: { rootCause: "", mitigation: "" } }));
  };

  const closeResolveForm = (id: number) => {
    setResolveForm((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleResolve = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    const form = resolveForm[id];
    if (!form?.rootCause) return;
    setResolveLoading(id);
    try {
      await controlApi.resolveIncident(id, { root_cause: form.rootCause, mitigation: form.mitigation });
      closeResolveForm(id);
      await loadIncidents();
    } catch (err: any) {
      setError(err.message || "Failed to resolve incident.");
    } finally {
      setResolveLoading(null);
    }
  };

  const filtered = filter === "all" ? incidents : incidents.filter((i) => i.status === filter);
  const openCount = incidents.filter((i) => ["open", "investigating"].includes(i.status)).length;
  const criticalCount = incidents.filter((i) => i.severity === "critical" && !["resolved", "closed"].includes(i.status)).length;
  const resolvedCount = incidents.filter((i) => ["resolved", "closed"].includes(i.status)).length;

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
            Fleet Support Incident Tickets
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Track hardware malfunctions, power cuts, sync queue stalls, and log root-cause resolutions.
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
            {openCount} Open Tickets
          </span>
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Support Tickets</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : incidents.length}
          </div>
          <div className={styles.metricSubtext}>All logged events</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Investigation</div>
          <div className={styles.metricValue} style={{ color: openCount > 0 ? "var(--warning)" : "var(--text-muted)" }}>
            {loading ? "—" : openCount}
          </div>
          <div className={styles.metricSubtext}>Awaiting mitigation</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Critical Priority</div>
          <div className={styles.metricValue} style={{ color: criticalCount > 0 ? "var(--danger)" : "var(--text-muted)" }}>
            {loading ? "—" : criticalCount}
          </div>
          <div className={styles.metricSubtext}>Severe campus impact</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Resolved &amp; Closed</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : resolvedCount}
          </div>
          <div className={styles.metricSubtext}>Root-cause documented</div>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--danger-text)", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className={styles.tabsBar} style={{ marginBottom: "1rem" }}>
        {STATUS_TABS.map((tab) => {
          const count = tab === "all" ? incidents.length : incidents.filter((i) => i.status === tab).length;
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

      {/* Incidents Table Matrix */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading incidents…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--success)", fontSize: "0.8125rem" }}>
            No support tickets match this filter.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "900px" }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Campus</th>
                  <th>Title &amp; Description</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Root Cause</th>
                  <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => (
                  <React.Fragment key={inc.id}>
                    <tr style={{ opacity: ["resolved", "closed"].includes(inc.status) ? 0.6 : 1 }}>
                      <td className={styles.mono} style={{ fontWeight: 600, color: "var(--accent)" }}>{inc.incident_code}</td>
                      <td>
                        <Link href={`/control/schools/${inc.school_id}`} style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none" }}>
                          {inc.school_name}
                        </Link>
                      </td>
                      <td style={{ maxWidth: "260px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-heading)", fontSize: "0.8125rem" }}>{inc.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "normal" }}>{inc.description}</div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${
                          inc.severity === "critical" ? styles.badgeCritical
                            : inc.severity === "high" ? styles.badgeDegraded
                            : styles.badgeWarning
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td>
                        <span className={styles.mono} style={{ textTransform: "uppercase", fontSize: "0.6875rem", color: inc.status === "resolved" ? "var(--success)" : inc.status === "open" ? "var(--warning)" : "var(--accent)" }}>
                          {inc.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: "240px" }}>
                        {inc.root_cause ? (
                          <div style={{ fontSize: "0.75rem", color: "var(--success)", whiteSpace: "normal" }}>
                            <strong>Cause:</strong> {inc.root_cause}
                            {inc.mitigation && <div style={{ color: "var(--text-secondary)", marginTop: "0.2rem" }}><strong>Fix:</strong> {inc.mitigation}</div>}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Pending investigation</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                        {!["resolved", "closed"].includes(inc.status) && !resolveForm[inc.id] && (
                          <button onClick={() => openResolveForm(inc.id)} className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: "0.6875rem" }}>
                            Resolve
                          </button>
                        )}
                        {resolveForm[inc.id] && (
                          <button onClick={() => closeResolveForm(inc.id)} className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: "0.6875rem" }}>
                            Cancel
                          </button>
                        )}
                        {["resolved", "closed"].includes(inc.status) && (
                          <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--success)" }}>Resolved</span>
                        )}
                      </td>
                    </tr>

                    {/* Inline Resolve Form */}
                    {resolveForm[inc.id] && (
                      <tr style={{ background: "var(--success-bg)" }}>
                        <td colSpan={7} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--success)" }}>
                          <form onSubmit={(e) => handleResolve(e, inc.id)}>
                            <div style={{ marginBottom: "0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--success)" }}>
                              Resolve Incident: <strong>{inc.incident_code}</strong> — {inc.title}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                                  Verified Root Cause <span style={{ color: "var(--danger)" }}>*</span>
                                </label>
                                <textarea
                                  value={resolveForm[inc.id].rootCause}
                                  onChange={(e) => setResolveForm((prev) => ({ ...prev, [inc.id]: { ...prev[inc.id], rootCause: e.target.value } }))}
                                  className={styles.input}
                                  style={{ width: "100%", height: "72px" }}
                                  placeholder="e.g. Degraded UPS battery cell caused power interruption"
                                  required
                                />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                                  Applied Mitigation / Resolution Steps
                                </label>
                                <textarea
                                  value={resolveForm[inc.id].mitigation}
                                  onChange={(e) => setResolveForm((prev) => ({ ...prev, [inc.id]: { ...prev[inc.id], mitigation: e.target.value } }))}
                                  className={styles.input}
                                  style={{ width: "100%", height: "72px" }}
                                  placeholder="e.g. Replaced with 2KVA Online Lithium UPS unit"
                                />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.75rem" }}>
                              <button type="submit" disabled={resolveLoading === inc.id} className={`${styles.btn} ${styles.btnPrimary}`}>
                                {resolveLoading === inc.id ? "Resolving…" : "Confirm Resolution"}
                              </button>
                              <button type="button" onClick={() => closeResolveForm(inc.id)} className={`${styles.btn} ${styles.btnSecondary}`}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
