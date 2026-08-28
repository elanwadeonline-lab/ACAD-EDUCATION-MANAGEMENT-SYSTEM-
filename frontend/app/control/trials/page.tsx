"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

type Plan = "starter" | "standard" | "enterprise";

const PLAN_DESCRIPTIONS: Record<Plan, { label: string; students: number; color: string }> = {
  starter: { label: "Starter", students: 300, color: "#60A5FA" },
  standard: { label: "Standard", students: 800, color: "#A78BFA" },
  enterprise: { label: "Enterprise", students: 2500, color: "#34D399" },
};

export default function ControlTrialsPage() {
  const [trials, setTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Extend drawer state
  const [extendId, setExtendId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState("14");
  const [extendLoading, setExtendLoading] = useState(false);

  // Convert drawer state
  const [convertId, setConvertId] = useState<number | null>(null);
  const [convertPlan, setConvertPlan] = useState<Plan>("standard");
  const [convertLoading, setConvertLoading] = useState(false);

  const loadTrials = async () => {
    setLoading(true);
    try {
      const res = await controlApi.getTrials();
      setTrials(res.trials || []);
    } catch (err: any) {
      setError(err.message || "Failed to load trials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTrials(); }, []);

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendId || !extendDays || isNaN(Number(extendDays))) return;
    setExtendLoading(true);
    try {
      await controlApi.extendTrial(extendId, Number(extendDays));
      setExtendId(null);
      setExtendDays("14");
      await loadTrials();
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
    try {
      await controlApi.convertTrial(convertId, convertPlan);
      setConvertId(null);
      await loadTrials();
    } catch (err: any) {
      setError(err.message || "Failed to convert trial.");
    } finally {
      setConvertLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>
            Free Trial &amp; Conversion Pipeline
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            Track trial durations, quota limits, pilot progress, and convert schools to paid subscriptions.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span className={styles.statusBadge} style={{ background: "rgba(245, 158, 11, 0.12)", color: "#FBBF24" }}>
            {trials.filter(t => t.status === "active").length} Active Trials
          </span>
          <span className={styles.statusBadge} style={{ background: "rgba(16, 185, 129, 0.12)", color: "#34D399" }}>
            {trials.filter(t => t.status === "converted").length} Converted
          </span>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#F87171", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>Loading trial pipeline…</div>
        ) : trials.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>No active or past trials in registry.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Campus Name &amp; Code</th>
                <th>Status</th>
                <th>Expires In</th>
                <th>Quotas</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trials.map((tr) => (
                <React.Fragment key={tr.id}>
                  <tr>
                    <td>
                      <Link href={`/control/schools/${tr.school_id}`} style={{ fontWeight: 600, color: "#F8FAFC", textDecoration: "none" }}>
                        {tr.school_name}
                      </Link>
                      <div className={styles.mono} style={{ color: "#64748B" }}>{tr.school_code}</div>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{
                        background: tr.status === "active" ? "rgba(245, 158, 11, 0.15)" : tr.status === "converted" ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                        color: tr.status === "active" ? "#FBBF24" : tr.status === "converted" ? "#34D399" : "#94A3B8",
                      }}>
                        {tr.status}
                      </span>
                    </td>
                    <td>
                      <span className={styles.mono} style={{ fontWeight: 600, color: (tr.days_remaining ?? 99) <= 5 ? "#F87171" : (tr.days_remaining ?? 99) <= 14 ? "#FBBF24" : "#E2E8F0" }}>
                        {tr.days_remaining !== null && tr.days_remaining !== undefined
                          ? tr.days_remaining > 0 ? `${tr.days_remaining} days left` : "Expired"
                          : "N/A"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.mono} style={{ fontSize: "0.75rem" }}>
                        <div style={{ color: "#CBD5E1" }}>{tr.student_limit} students</div>
                        <div style={{ color: "#64748B" }}>{tr.teacher_limit} teachers</div>
                      </div>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{tr.notes || "—"}</td>
                    <td>
                      {tr.status === "active" && (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
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
                        <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#34D399" }}>Licensed</span>
                      )}
                    </td>
                  </tr>

                  {/* Inline Extend Drawer */}
                  {extendId === tr.id && (
                    <tr style={{ background: "rgba(59, 130, 246, 0.04)" }}>
                      <td colSpan={6} style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(59, 130, 246, 0.15)" }}>
                        <form onSubmit={handleExtend} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#93C5FD" }}>
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
                          <span style={{ fontSize: "0.8125rem", color: "#64748B" }}>days</span>
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
                    <tr style={{ background: "rgba(16, 185, 129, 0.04)" }}>
                      <td colSpan={6} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(16, 185, 129, 0.15)" }}>
                        <form onSubmit={handleConvert}>
                          <div style={{ marginBottom: "1rem" }}>
                            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#6EE7B7" }}>
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
                                  border: `2px solid ${convertPlan === key ? plan.color : "rgba(255,255,255,0.08)"}`,
                                  background: convertPlan === key ? `rgba(${key === "starter" ? "59,130,246" : key === "standard" ? "167,139,250" : "16,185,129"}, 0.1)` : "#0B0F19",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <div style={{ fontWeight: 700, color: plan.color, fontSize: "0.875rem" }}>{plan.label}</div>
                                <div className={styles.mono} style={{ color: "#94A3B8", fontSize: "0.6875rem", marginTop: "0.25rem" }}>
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
        )}
      </div>
    </div>
  );
}
