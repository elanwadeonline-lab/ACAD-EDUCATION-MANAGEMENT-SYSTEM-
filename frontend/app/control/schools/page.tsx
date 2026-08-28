"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

export default function ControlSchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadSchools = () => {
    setLoading(true);
    controlApi
      .getSchools({ status: filterStatus, search: searchTerm })
      .then((res) => setSchools(res.schools || []))
      .catch((err) => console.error("Failed to load schools:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchools();
  }, [filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSchools();
  };

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
            School Fleet Directory
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            Manage registered campuses, installations, operational states, and licensing.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <form onSubmit={handleSearchSubmit}>
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
            + Provision School
          </Link>
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

      {/* ── Schools Table Matrix ── */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            Loading school fleet…
          </div>
        ) : schools.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            No schools found matching current filter.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>School Name & Code</th>
                <th>Organization</th>
                <th>Status</th>
                <th>Health Score</th>
                <th>Installations</th>
                <th>Primary Contact</th>
                <th>Action</th>
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
                        style={{ fontWeight: 600, color: "#F8FAFC", textDecoration: "none" }}
                      >
                        {sc.name}
                      </Link>
                      <div className={styles.mono} style={{ color: "#64748B" }}>
                        {sc.school_code} · {sc.location || "Nigeria"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8125rem", color: "#94A3B8" }}>
                        {sc.organization_name || "Independent"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={styles.statusBadge}
                        style={{
                          background:
                            sc.status === "active"
                              ? "rgba(59, 130, 246, 0.15)"
                              : sc.status === "trial"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(100, 116, 139, 0.15)",
                          color:
                            sc.status === "active"
                              ? "#60A5FA"
                              : sc.status === "trial"
                              ? "#FBBF24"
                              : "#94A3B8",
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
                        {sc.health_score ?? 100}% · {healthStatus}
                      </span>
                    </td>
                    <td className={styles.mono}>
                      {sc.installations_count ?? 0} node(s)
                    </td>
                    <td>
                      <div style={{ fontSize: "0.75rem", color: "#CBD5E1" }}>
                        {sc.primary_admin_name || "N/A"}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "#64748B" }}>
                        {sc.primary_admin_email || sc.primary_admin_phone || "No contact"}
                      </div>
                    </td>
                    <td>
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
        )}
      </div>
    </div>
  );
}
