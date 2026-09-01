"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { FlaskConical, Clock, CheckCircle2 } from "lucide-react";

type Plan = "starter" | "standard" | "enterprise";

const PLAN_DESCRIPTIONS: Record<Plan, { label: string; students: number; color: string }> = {
  starter: { label: "Starter Tier", students: 500, color: "var(--accent)" },
  standard: { label: "Standard Tier", students: 1000, color: "var(--purple)" },
  enterprise: { label: "Enterprise Tier", students: 5000, color: "var(--success)" },
};

export default function ControlTrialsPage() {
  const [trials, setTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [extendId, setExtendId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState("14");
  const [extendLoading, setExtendLoading] = useState(false);
  const [convertId, setConvertId] = useState<number | null>(null);
  const [convertPlan, setConvertPlan] = useState<Plan>("standard");
  const [convertLoading, setConvertLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTrials = () => {
    setLoading(true);
    controlApi
      .getTrials()
      .then((res) => setTrials(res.trials || []))
      .catch((err) => setError(err.message || "Failed to load trials."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTrials();
  }, []);

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendId) return;
    setExtendLoading(true);
    setError("");
    try {
      await controlApi.extendTrial(extendId, Number(extendDays));
      setExtendId(null);
      loadTrials();
    } catch (err: any) {
      setError(err.message || "Failed to extend trial.");
    } finally {
      setExtendLoading(false);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertId) return;
    setConvertLoading(true);
    setError("");
    try {
      await controlApi.convertTrial(convertId, convertPlan);
      setConvertId(null);
      loadTrials();
    } catch (err: any) {
      setError(err.message || "Failed to convert trial.");
    } finally {
      setConvertLoading(false);
    }
  };

  const activeCount = trials.filter((t) => t.status === "active").length;
  const convertedCount = trials.filter((t) => t.status === "converted").length;
  const expiringSoonCount = trials.filter((t) => t.status === "active" && (t.days_remaining ?? 99) <= 7).length;
  const totalStudentsInPilot = trials.reduce((acc, t) => acc + (t.student_limit || 0), 0);

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
            Free Trial &amp; Conversion Pipeline
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Track pilot evaluation periods, student quotas, trial durations, and convert schools to paid subscriptions.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span className={styles.statusBadge} style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
            {activeCount} Active Trials
          </span>
          <span className={styles.statusBadge} style={{ background: "var(--success-bg)", color: "var(--success)" }}>
            {convertedCount} Converted
          </span>
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Pilot Trials</div>
          <div className={styles.metricValue} style={{ color: "var(--warning)" }}>
            {loading ? "—" : activeCount}
          </div>
          <div className={styles.metricSubtext}>Schools in evaluation</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Expiring &lt; 7 Days</div>
          <div className={styles.metricValue} style={{ color: expiringSoonCount > 0 ? "var(--danger)" : "var(--text-muted)" }}>
            {loading ? "—" : expiringSoonCount}
          </div>
          <div className={styles.metricSubtext}>Urgent conversion candidates</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Converted to Paid</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : convertedCount}
          </div>
          <div className={styles.metricSubtext}>Active commercial licenses</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Pilot Quota</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : totalStudentsInPilot.toLocaleString()}
          </div>
          <div className={styles.metricSubtext}>Allocated evaluation seats</div>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--danger-text)", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* ── Trials Table Matrix ── */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading trial pipeline…</div>
        ) : trials.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No active or past trials in registry.</div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "880px" }}>
              <thead>
                <tr>
                  <th>Campus Name &amp; Code</th>
                  <th>Status</th>
                  <th>Expires In</th>
                  <th>Quotas</th>
                  <th>Notes</th>
                  <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((tr) => (
                  <React.Fragment key={tr.id}>
                    <tr>
                      <td>
                        <Link href={`/control/schools/${tr.school_id}`} style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none" }}>
                          {tr.school_name}
                        </Link>
                        <div className={styles.mono} style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>{tr.school_code}</div>
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{
                          background: tr.status === "active" ? "var(--warning-bg)" : tr.status === "converted" ? "var(--success-bg)" : "var(--bg-hover)",
                          color: tr.status === "active" ? "var(--warning)" : tr.status === "converted" ? "var(--success)" : "var(--text-muted)",
                        }}>
                          {tr.status}
                        </span>
                      </td>
                      <td>
                        <span className={styles.mono} style={{ fontWeight: 600, color: (tr.days_remaining ?? 99) <= 5 ? "var(--danger)" : (tr.days_remaining ?? 99) <= 14 ? "var(--warning)" : "var(--text-primary)" }}>
                          {tr.days_remaining !== null && tr.days_remaining !== undefined
                            ? tr.days_remaining > 0 ? `${tr.days_remaining} days left` : "Expired"
                            : "N/A"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.mono} style={{ fontSize: "0.75rem" }}>
                          <div style={{ color: "var(--text-primary)" }}>{tr.student_limit} students</div>
                          <div style={{ color: "var(--text-muted)" }}>{tr.teacher_limit} teachers</div>
                        </div>
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{tr.notes || "—"}</td>
                      <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                        {tr.status === "active" && (
                          <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => { setExtendId(extendId === tr.id ? null : tr.id); setConvertId(null); }}
                              className={`${styles.btn} ${styles.btnSecondary}`}
                            >
                              {extendId === tr.id ? "Cancel" : "Extend"}
                            </button>
                            <button
                              onClick={() => { setConvertId(convertId === tr.id ? null : tr.id); setExtendId(null); }}
                              className={`${styles.btn} ${styles.btnPrimary}`}
                            >
                              {convertId === tr.id ? "Cancel" : "Convert"}
                            </button>
                          </div>
                        )}
                        {tr.status === "converted" && (
                          <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--success)" }}>Licensed</span>
                        )}
                      </td>
                    </tr>

                    {/* Inline Extend Drawer */}
                    {extendId === tr.id && (
                      <tr style={{ background: "var(--accent-bg)" }}>
                        <td colSpan={6} style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--accent-border)" }}>
                          <form onSubmit={handleExtend} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--accent)" }}>
                              Extend trial for <strong>{tr.school_name}</strong> by:
                            </span>
                            <input
                              type="number"
                              value={extendDays}
                              onChange={(e) => setExtendDays(e.target.value)}
                              min="1"
                              max="365"
                              className={styles.input}
                              style={{ width: "80px" }}
                            />
                            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>days</span>
                            <button type="submit" disabled={extendLoading} className={`${styles.btn} ${styles.btnPrimary}`}>
                              {extendLoading ? "Extending…" : "Confirm Extension"}
                            </button>
                            <button type="button" onClick={() => setExtendId(null)} className={`${styles.btn} ${styles.btnSecondary}`}>
                              Cancel
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}

                    {/* Inline Convert Drawer */}
                    {convertId === tr.id && (
                      <tr style={{ background: "var(--success-bg)" }}>
                        <td colSpan={6} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--success)" }}>
                          <form onSubmit={handleConvert}>
                            <div style={{ marginBottom: "1rem" }}>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--success)" }}>
                                Convert <strong>{tr.school_name}</strong> to a paid commercial license:
                              </span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                              {(Object.entries(PLAN_DESCRIPTIONS) as [Plan, any][]).map(([key, plan]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setConvertPlan(key)}
                                  style={{
                                    padding: "0.85rem",
                                    borderRadius: "8px",
                                    border: `2px solid ${convertPlan === key ? plan.color : "var(--border-input)"}`,
                                    background: convertPlan === key ? "var(--bg-elevated)" : "var(--bg-input)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <div style={{ fontWeight: 700, color: plan.color, fontSize: "0.875rem" }}>{plan.label}</div>
                                  <div className={styles.mono} style={{ color: "var(--text-secondary)", fontSize: "0.6875rem", marginTop: "0.25rem" }}>
                                    Up to {plan.students.toLocaleString()} students
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "0.75rem" }}>
                              <button type="submit" disabled={convertLoading} className={`${styles.btn} ${styles.btnPrimary}`}>
                                {convertLoading ? "Converting…" : `Activate ${PLAN_DESCRIPTIONS[convertPlan].label} License`}
                              </button>
                              <button type="button" onClick={() => setConvertId(null)} className={`${styles.btn} ${styles.btnSecondary}`}>
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
