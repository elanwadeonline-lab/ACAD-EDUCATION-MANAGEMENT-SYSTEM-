"use client";

import React, { useEffect, useState, useCallback } from "react";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

const ALL_MODULES = [
  { key: "cbt_exam", name: "Offline CBT Examination Engine", cat: "Core CBT", critical: true },
  { key: "question_bank", name: "Offline Question Bank Management", cat: "Core CBT", critical: true },
  { key: "grading_center", name: "Flexible 70/30 Grading Policies", cat: "Academic", critical: false },
  { key: "report_cards", name: "Report Card Computation & Printing", cat: "Academic", critical: false },
  { key: "timetables", name: "Automated Timetable Generation", cat: "Academic", critical: false },
  { key: "guardian_portal", name: "Guardian Observation Portal", cat: "Portals", critical: false },
  { key: "attendance_tracker", name: "Student Attendance & Roll Call", cat: "Operations", critical: false },
  { key: "fee_management", name: "School Fee Billing & Ledger", cat: "Commercial", critical: false },
  { key: "offline_assignments", name: "Offline Homework & Assignments", cat: "Learning", critical: false },
  { key: "ai_learning_engine", name: "AI Question Generator & Analytics", cat: "Advanced", critical: false },
];

export default function ControlFeatureFlagsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [flagToggles, setFlagToggles] = useState<Record<string, boolean>>({});
  const [schoolSearch, setSchoolSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [pendingSync, setPendingSync] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    controlApi.getSchools()
      .then((res) => { setSchools(res.schools || []); })
      .catch((err: any) => setError(err.message || "Failed to load schools."))
      .finally(() => setLoading(false));
  }, []);

  const loadFlags = useCallback(async (schoolId: number) => {
    setFlagsLoading(true);
    try {
      const res = await controlApi.getFeatureFlags(schoolId);
      setFlagToggles(res.flags || {});
    } catch (err: any) {
      setError(err.message || "Failed to load feature flags.");
    } finally {
      setFlagsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSchoolId) loadFlags(selectedSchoolId);
  }, [selectedSchoolId, loadFlags]);

  const handleToggle = async (flagKey: string, currentVal: boolean) => {
    if (!selectedSchoolId) return;
    const newVal = !currentVal;
    setFlagToggles((prev) => ({ ...prev, [flagKey]: newVal }));
    try {
      await controlApi.setFeatureFlag(selectedSchoolId, flagKey, newVal);
      setPendingSync(true); // Mark that we need to sync to node
      setSuccessMsg(`${flagKey} ${newVal ? "enabled" : "disabled"}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setFlagToggles((prev) => ({ ...prev, [flagKey]: currentVal }));
      setError(err.message || "Failed to update flag.");
    }
  };

  const handlePushToNodes = async () => {
    if (!selectedSchoolId) return;
    try {
      const res = await controlApi.pushConfigToSchool(selectedSchoolId, "feature_flags");
      setSuccessMsg(`Config pushed to ${res.queued_to_nodes} node(s) — they will apply on next heartbeat.`);
      setPendingSync(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to push config.");
    }
  };

  const filteredSchools = schools.filter((s) =>
    s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.school_code.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  // Group modules by category
  const byCategory: Record<string, typeof ALL_MODULES> = {};
  for (const m of ALL_MODULES) {
    if (!byCategory[m.cat]) byCategory[m.cat] = [];
    byCategory[m.cat].push(m);
  }

  const enabledCount = Object.values(flagToggles).filter(Boolean).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>Modular Feature Flags</h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            Per-school capability controls. Changes are queued to the node and applied on the next heartbeat cycle.
          </p>
        </div>
        {selectedSchoolId && pendingSync && (
          <button onClick={handlePushToNodes} className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: "0.8125rem" }}>
            Push Config to Nodes
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#F87171", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer" }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#34D399", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.25rem" }}>
        {/* ── School Selector Sidebar ── */}
        <div className={styles.tableContainer} style={{ padding: "1rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", marginBottom: "0.75rem" }}>
            Select Campus
          </div>
          <input
            type="text"
            value={schoolSearch}
            onChange={(e) => setSchoolSearch(e.target.value)}
            placeholder="Search campus…"
            className={styles.input}
            style={{ width: "100%", marginBottom: "0.75rem", fontSize: "0.8125rem" }}
          />
          {loading ? (
            <div style={{ color: "#64748B", fontSize: "0.75rem", textAlign: "center", padding: "1rem" }}>Loading schools…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "480px", overflowY: "auto" }}>
              {filteredSchools.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSchoolId(s.id)}
                  style={{
                    textAlign: "left",
                    padding: "0.65rem 0.75rem",
                    borderRadius: "6px",
                    border: `1px solid ${selectedSchoolId === s.id ? "rgba(59, 130, 246, 0.4)" : "transparent"}`,
                    background: selectedSchoolId === s.id ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  <div style={{ fontWeight: 600, color: selectedSchoolId === s.id ? "#93C5FD" : "#E2E8F0", fontSize: "0.8125rem" }}>
                    {s.name}
                  </div>
                  <div className={styles.mono} style={{ color: "#64748B", fontSize: "0.6875rem" }}>{s.school_code}</div>
                </button>
              ))}
              {filteredSchools.length === 0 && (
                <div style={{ color: "#64748B", fontSize: "0.75rem", textAlign: "center", padding: "1rem" }}>No schools match.</div>
              )}
            </div>
          )}
        </div>

        {/* ── Flag Matrix ── */}
        <div>
          {!selectedSchoolId ? (
            <div className={styles.tableContainer} style={{ padding: "4rem", textAlign: "center", color: "#64748B" }}>
              Select a campus from the left panel to manage its feature flags.
            </div>
          ) : flagsLoading ? (
            <div className={styles.tableContainer} style={{ padding: "4rem", textAlign: "center", color: "#64748B" }}>
              Loading flags for {selectedSchool?.name}…
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <div>
                  <div className={styles.tableTitle}>{selectedSchool?.name}</div>
                  <div className={styles.mono} style={{ color: "#64748B", fontSize: "0.6875rem" }}>
                    {enabledCount} of {ALL_MODULES.length} modules enabled
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {pendingSync && (
                    <span className={styles.statusBadge} style={{ background: "rgba(245, 158, 11, 0.15)", color: "#FBBF24", fontSize: "0.6875rem" }}>
                      Pending node sync
                    </span>
                  )}
                  <button
                    onClick={handlePushToNodes}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ fontSize: "0.75rem" }}
                    title="Push current flag state to all active installation nodes"
                  >
                    Push to Nodes
                  </button>
                </div>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_MODULES.map((m) => {
                    const isEnabled = Boolean(flagToggles[m.key]);
                    return (
                      <tr key={m.key}>
                        <td>
                          <div style={{ fontWeight: 600, color: "#F8FAFC", fontSize: "0.8125rem" }}>{m.name}</div>
                          <div className={styles.mono} style={{ color: "#64748B", fontSize: "0.6875rem" }}>{m.key}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{m.cat}</span>
                          {m.critical && (
                            <span className={styles.statusBadge} style={{ marginLeft: "0.4rem", background: "rgba(239, 68, 68, 0.1)", color: "#F87171", fontSize: "0.6rem" }}>
                              Core
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={styles.statusBadge} style={{
                            background: isEnabled ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            color: isEnabled ? "#34D399" : "#64748B",
                          }}>
                            <span className={`${styles.statusDot} ${isEnabled ? styles.dotHealthy : styles.dotOffline}`} />
                            {isEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggle(m.key, isEnabled)}
                            className={`${styles.btn} ${isEnabled ? styles.btnDanger : styles.btnPrimary}`}
                            style={{ fontSize: "0.75rem" }}
                            disabled={m.critical && isEnabled}
                            title={m.critical && isEnabled ? "Core modules cannot be disabled" : undefined}
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
          )}
        </div>
      </div>
    </div>
  );
}
