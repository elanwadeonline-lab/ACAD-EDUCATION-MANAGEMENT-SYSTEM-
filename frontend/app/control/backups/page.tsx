"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

export default function ControlBackupsPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    controlApi
      .getBackups()
      .then((res) => setBackups(res.backups || []))
      .catch((err) => console.error("Failed to load backups:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>
          Fleet Backup Telemetry & Integrity
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
          Verify local snapshot creation times, snapshot sizes, durations, and backup integrity across all school nodes.
        </p>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            Loading backup logs…
          </div>
        ) : backups.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            No backup logs recorded yet.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Campus</th>
                <th>Type</th>
                <th>Snapshot Size</th>
                <th>Destination</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id}>
                  <td className={styles.mono}>{new Date(b.timestamp).toLocaleString()}</td>
                  <td>
                    <Link
                      href={`/control/schools/${b.school_id}`}
                      style={{ fontWeight: 600, color: "#F8FAFC", textDecoration: "none" }}
                    >
                      {b.school_name}
                    </Link>
                  </td>
                  <td>
                    <span className={styles.mono} style={{ color: "#60A5FA" }}>{b.backup_type}</span>
                  </td>
                  <td className={styles.mono}>{(b.backup_size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
                  <td className={styles.mono}>{b.destination}</td>
                  <td className={styles.mono}>{b.duration_ms} ms</td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{
                        background: b.is_successful ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: b.is_successful ? "#34D399" : "#F87171",
                      }}
                    >
                      {b.is_successful ? "✓ Verified" : "✗ Failed"}
                    </span>
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
