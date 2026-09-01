"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { Building2, Plus, Search, ShieldCheck } from "lucide-react";

export default function ControlSchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadSchools = () => {
    setLoading(true);
    setError("");
    controlApi
      .getSchools({ status: filterStatus, search: searchTerm })
      .then((res) => setSchools(res.schools || []))
      .catch((err) => { console.error("Failed to load schools:", err); setError(err.message || "Unable to load schools."); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchools();
  }, [filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSchools();
  };

  const totalCampuses = schools.length;
  const activeCampuses = schools.filter((s) => s.status === "active").length;
  const trialCampuses = schools.filter((s) => s.status === "trial").length;
  const totalNodes = schools.reduce((acc, s) => acc + (s.installations_count || 0), 0);

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
            School Fleet Directory
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Supervise registered campuses, installation nodes, health status, and commercial licensing.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <form onSubmit={handleSearchSubmit} style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search school name or code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
              style={{ width: "240px" }}
            />
          </form>
          <Link href="/control/schools/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            <Plus size={14} /> Provision School
          </Link>
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Campuses</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : totalCampuses}
          </div>
          <div className={styles.metricSubtext}>Registered institutions</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Subscriptions</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : activeCampuses}
          </div>
          <div className={styles.metricSubtext}>Production licenses</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Trialing Campuses</div>
          <div className={styles.metricValue} style={{ color: "var(--warning)" }}>
            {loading ? "—" : trialCampuses}
          </div>
          <div className={styles.metricSubtext}>In evaluation pilot</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Hardware Node Fleet</div>
          <div className={styles.metricValue} style={{ color: "var(--purple)" }}>
            {loading ? "—" : totalNodes}
          </div>
          <div className={styles.metricSubtext}>Active server instances</div>
        </div>
      </div>

      {/* ── Filter Tabs Bar ── */}
      <div className={styles.tabsBar}>
        {["all", "active", "trial", "suspended"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`${styles.tabBtn} ${filterStatus === st ? styles.tabBtnActive : ""}`}
          >
            {st.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--danger-text)", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={loadSchools} style={{ background: "#fff", border: "1px solid var(--danger)", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.75rem", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {/* ── Schools Table Matrix ── */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading school fleet…
          </div>
        ) : schools.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No schools found matching current filter.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "860px" }}>
              <thead>
                <tr>
                  <th>School Name & Code</th>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Health Score</th>
                  <th>Installations</th>
                  <th>Primary Contact</th>
                  <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((sc) => {
                  const healthStatus = sc.health_status || "unknown";
                  const badgeClass =
                    healthStatus === "healthy"
                      ? styles.badgeHealthy
                      : healthStatus === "warning"
                      ? styles.badgeWarning
                      : healthStatus === "degraded"
                      ? styles.badgeDegraded
                      : healthStatus === "critical"
                      ? styles.badgeCritical
                      : styles.badgeOffline;

                  return (
                    <tr key={sc.id}>
                      <td>
                        <Link
                          href={`/control/schools/${sc.id}`}
                          style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none" }}
                        >
                          {sc.name}
                        </Link>
                        <div className={styles.mono} style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>
                          {sc.school_code} · {sc.location || "Nigeria"}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                          {sc.organization_name || "Independent"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{
                            background:
                              sc.status === "active"
                                ? "var(--accent-bg)"
                                : sc.status === "trial"
                                ? "var(--warning-bg)"
                                : "var(--bg-hover)",
                            color:
                              sc.status === "active"
                                ? "var(--accent)"
                                : sc.status === "trial"
                                ? "var(--warning)"
                                : "var(--text-muted)",
                          }}
                        >
                          {sc.status}
                        </span>
                      </td>
                      <td>
                          <span className={`${styles.statusBadge} ${badgeClass}`}>
                            <span
                              className={`${styles.statusDot} ${
                                healthStatus === "healthy"
                                  ? styles.dotHealthy
                                  : healthStatus === "warning"
                                  ? styles.dotWarning
                                  : healthStatus === "degraded"
                                  ? styles.dotDegraded
                                  : healthStatus === "critical"
                                  ? styles.dotCritical
                                  : styles.dotOffline
                              }`}
                            />
                            {sc.health_score != null ? `${sc.health_score}% · ${healthStatus}` : `Unknown · ${healthStatus}`}
                          </span>
                      </td>
                      <td className={styles.mono}>
                        {sc.installations_count ?? 0} node(s)
                      </td>
                      <td>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 500 }}>
                          {sc.primary_admin_name || "N/A"}
                        </div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                          {sc.primary_admin_email || sc.primary_admin_phone || "No contact"}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                        <Link
                          href={`/control/schools/${sc.id}`}
                          className={`${styles.btn} ${styles.btnSecondary}`}
                        >
                          Inspect 360° →
                        </Link>
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
  );
}
