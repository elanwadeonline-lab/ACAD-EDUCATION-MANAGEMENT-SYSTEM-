"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { KeyRound, ShieldCheck } from "lucide-react";

export default function ControlLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    controlApi
      .getLicenses()
      .then((res) => setLicenses(res.licenses || []))
      .catch((err) => console.error("Failed to load licenses:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalLicenses = licenses.length;
  const enterpriseCount = licenses.filter((l) => l.plan_tier?.toLowerCase() === "enterprise").length;
  const standardCount = licenses.filter((l) => l.plan_tier?.toLowerCase() === "standard").length;
  const totalStudentCap = licenses.reduce((acc, l) => acc + (l.max_students || 0), 0);

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
          Active Commercial Licenses
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Manage cryptographic license keys, tier entitlements, quota limits, and renewal dates.
        </p>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Licenses Issued</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : totalLicenses}
          </div>
          <div className={styles.metricSubtext}>Signed digital contracts</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Enterprise Tier</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : enterpriseCount}
          </div>
          <div className={styles.metricSubtext}>Multi-campus coverage</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Standard Tier</div>
          <div className={styles.metricValue} style={{ color: "var(--purple)" }}>
            {loading ? "—" : standardCount}
          </div>
          <div className={styles.metricSubtext}>Single campus deployments</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Student Capacity</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : totalStudentCap.toLocaleString()}
          </div>
          <div className={styles.metricSubtext}>Licensed active seats</div>
        </div>
      </div>

      {/* ── Licenses Table Matrix ── */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading license registry…
          </div>
        ) : licenses.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No active licenses issued.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "860px" }}>
              <thead>
                <tr>
                  <th>License Key</th>
                  <th>Campus</th>
                  <th>Tier</th>
                  <th>Student Quota</th>
                  <th>Valid Until</th>
                  <th>Enabled Modules</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic) => (
                  <tr key={lic.id}>
                    <td>
                      <span className={styles.mono} style={{ fontWeight: 600, color: "var(--accent)" }}>
                        {lic.license_key}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/control/schools/${lic.school_id}`}
                        style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none" }}
                      >
                        {lic.school_name}
                      </Link>
                      <div className={styles.mono} style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>{lic.school_code}</div>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                        {lic.plan_tier}
                      </span>
                    </td>
                    <td className={styles.mono}>{lic.max_students} students</td>
                    <td className={styles.mono}>{new Date(lic.valid_until).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", maxWidth: "340px" }}>
                        {(lic.enabled_modules || []).map((m: string) => (
                          <span
                            key={m}
                            className={styles.mono}
                            style={{
                              fontSize: "0.625rem",
                              background: "var(--bg-elevated)",
                              color: "var(--text-secondary)",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "3px",
                              border: "1px solid var(--border-panel)",
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
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
