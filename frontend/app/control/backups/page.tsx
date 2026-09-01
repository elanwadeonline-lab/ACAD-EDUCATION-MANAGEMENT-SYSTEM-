"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { Database, HardDrive, CheckCircle2, AlertTriangle } from "lucide-react";

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

  const totalBackups = backups.length;
  const verifiedBackups = backups.filter((b) => b.is_successful).length;
  const failedBackups = backups.filter((b) => !b.is_successful).length;
  const totalVolumeBytes = backups.reduce((acc, b) => acc + (b.backup_size_bytes || 0), 0);
  const totalVolumeMB = (totalVolumeBytes / (1024 * 1024)).toFixed(1);

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
          Fleet Backup Telemetry &amp; Integrity
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Verify local snapshot creation times, snapshot sizes, durations, and backup integrity across all school nodes.
        </p>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Snapshots</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : totalBackups}
          </div>
          <div className={styles.metricSubtext}>Recorded WAL archives</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Verified Integrity</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : verifiedBackups}
          </div>
          <div className={styles.metricSubtext}>Passed checksum check</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Failed / Incomplete</div>
          <div className={styles.metricValue} style={{ color: failedBackups > 0 ? "var(--danger)" : "var(--text-muted)" }}>
            {loading ? "—" : failedBackups}
          </div>
          <div className={styles.metricSubtext}>Requires engineer action</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Stored Volume</div>
          <div className={styles.metricValue} style={{ color: "var(--purple)" }}>
            {loading ? "—" : `${totalVolumeMB} MB`}
          </div>
          <div className={styles.metricSubtext}>Compressed snapshots</div>
        </div>
      </div>

      {/* ── Backups Table Matrix ── */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading backup logs…
          </div>
        ) : backups.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No backup logs recorded yet.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "800px" }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Campus</th>
                  <th>Type</th>
                  <th>Snapshot Size</th>
                  <th>Destination</th>
                  <th>Duration</th>
                  <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td className={styles.mono}>{new Date(b.timestamp).toLocaleString()}</td>
                    <td>
                      <Link
                        href={`/control/schools/${b.school_id}`}
                        style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none" }}
                      >
                        {b.school_name}
                      </Link>
                    </td>
                    <td>
                      <span className={styles.mono} style={{ color: "var(--accent)" }}>{b.backup_type}</span>
                    </td>
                    <td className={styles.mono}>{(b.backup_size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
                    <td className={styles.mono}>{b.destination}</td>
                    <td className={styles.mono}>{b.duration_ms} ms</td>
                    <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                      <span
                        className={styles.statusBadge}
                        style={{
                          background: b.is_successful ? "var(--success-bg)" : "var(--danger-bg)",
                          color: b.is_successful ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {b.is_successful ? "✓ Verified" : "✗ Failed"}
                      </span>
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
