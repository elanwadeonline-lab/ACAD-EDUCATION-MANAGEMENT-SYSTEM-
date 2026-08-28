"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

export default function ControlIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inline resolve form state: maps incident ID → form state
  const [resolveForm, setResolveForm] = useState<Record<number, { rootCause: string; mitigation: string }>>({});
  const [resolveLoading, setResolveLoading] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  useEffect(() => { loadIncidents(); }, []);

  const openResolveForm = (id: number) => {
    setResolveForm((prev) => ({
      ...prev,
      [id]: prev[id] ?? { rootCause: "", mitigation: "" },
    }));
  };

  const closeResolveForm = (id: number) => {
    setResolveForm((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleResolve = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    const form = resolveForm[id];
    if (!form?.rootCause) {
      setError("Root cause is required before resolving an incident.");
      return;
    }
    setResolveLoading(id);
    try {
      await controlApi.updateIncident(id, {
        status: "resolved",
        root_cause: form.rootCause,
        mitigation: form.mitigation || "Resolved by platform operator",
      });
      closeResolveForm(id);
      await loadIncidents();
    } catch (err: any) {
      setError(err.message || "Failed to resolve incident.");
    } finally {
      setResolveLoading(null);
    }
  };

  const filtered = statusFilter === "all" ? incidents : incidents.filter((i) => i.status === statusFilter);
  const openCount = incidents.filter((i) => !["resolved", "closed"].includes(i.status)).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>Support Incidents &amp; Remediation</h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            Track school operational support tickets, hardware failures, and document verified root causes.
          </p>
        </div>
        {openCount > 0 && (
          <span className={styles.statusBadge} style={{ background: "rgba(245, 158, 11, 0.15)", color: "#FBBF24" }}>
            {openCount} Open Tickets
          </span>
        )}
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#F87171", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div className={styles.tabsBar} style={{ marginBottom: "1rem" }}>
        {["all", "open", "investigating", "mitigated", "resolved"].map((tab) => {
          const count = tab === "all" ? incidents.length : incidents.filter((i) => i.status === tab).length;
          return (
            <button key={tab} onClick={() => setStatusFilter(tab)} className={`${styles.tabBtn} ${statusFilter === tab ? styles.tabBtnActive : ""}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>Loading incidents…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#34D399", fontSize: "0.8125rem" }}>
            No support tickets match this filter.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Campus</th>
                <th>Title &amp; Description</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Root Cause</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc) => (
                <React.Fragment key={inc.id}>
                  <tr style={{ opacity: ["resolved", "closed"].includes(inc.status) ? 0.6 : 1 }}>
                    <td className={styles.mono} style={{ fontWeight: 600, color: "#60A5FA" }}>{inc.incident_code}</td>
                    <td>
                      <Link href={`/control/schools/${inc.school_id}`} style={{ fontWeight: 600, color: "#F8FAFC", textDecoration: "none" }}>
                        {inc.school_name}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#F8FAFC", fontSize: "0.8125rem" }}>{inc.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{inc.description}</div>
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
                      <span className={styles.mono} style={{ textTransform: "uppercase", fontSize: "0.6875rem", color: inc.status === "resolved" ? "#34D399" : inc.status === "open" ? "#FBBF24" : "#60A5FA" }}>
                        {inc.status}
                      </span>
                    </td>
                    <td>
                      {inc.root_cause ? (
                        <div style={{ fontSize: "0.75rem", color: "#34D399" }}>
                          <strong>Cause:</strong> {inc.root_cause}
                          {inc.mitigation && <div style={{ color: "#94A3B8", marginTop: "0.2rem" }}><strong>Fix:</strong> {inc.mitigation}</div>}
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Pending investigation</span>
                      )}
                    </td>
                    <td>
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
                    </td>
                  </tr>

                  {/* Inline Resolve Form */}
                  {resolveForm[inc.id] && (
                    <tr style={{ background: "rgba(16, 185, 129, 0.04)" }}>
                      <td colSpan={7} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(16, 185, 129, 0.15)" }}>
                        <form onSubmit={(e) => handleResolve(e, inc.id)}>
                          <div style={{ marginBottom: "0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "#6EE7B7" }}>
                            Resolve Incident: <strong>{inc.incident_code}</strong> — {inc.title}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
                                Verified Root Cause <span style={{ color: "#F87171" }}>*</span>
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
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
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
        )}
      </div>
    </div>
  );
}
