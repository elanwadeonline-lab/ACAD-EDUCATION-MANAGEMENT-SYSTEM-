"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

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

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>
          Active Commercial Licenses
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
          Manage cryptographic license keys, tier entitlements, quota limits, and renewal dates.
        </p>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            Loading license registry…
          </div>
        ) : licenses.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            No active licenses issued.
          </div>
        ) : (
          <table className={styles.table}>
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
                    <span className={styles.mono} style={{ fontWeight: 600, color: "#60A5FA" }}>
                      {lic.license_key}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/control/schools/${lic.school_id}`}
                      style={{ fontWeight: 600, color: "#F8FAFC", textDecoration: "none" }}
                    >
                      {lic.school_name}
                    </Link>
                    <div className={styles.mono} style={{ color: "#64748B" }}>{lic.school_code}</div>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60A5FA" }}>
                      {lic.plan_tier}
                    </span>
                  </td>
                  <td className={styles.mono}>{lic.max_students} students</td>
                  <td className={styles.mono}>{new Date(lic.valid_until).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", maxWidth: "300px" }}>
                      {(lic.enabled_modules || []).map((m: string) => (
                        <span
                          key={m}
                          className={styles.mono}
                          style={{
                            fontSize: "0.625rem",
                            background: "#1E293B",
                            color: "#94A3B8",
                            padding: "0.1rem 0.35rem",
                            borderRadius: "3px",
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
        )}
      </div>
    </div>
  );
}
