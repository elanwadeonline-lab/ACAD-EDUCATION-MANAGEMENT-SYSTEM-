"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./control.module.css";
import { controlApi } from "../../lib/controlApi";
import {
  AlertTriangleIcon,
  ClockIcon,
  ActivityIcon,
  ShieldIcon,
  SchoolIcon,
  ServerIcon,
} from "../../components/control/ControlIcons";

export default function ControlCommandCenterPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    controlApi
      .getOverview()
      .then((res) => setOverview(res))
      .catch((err) => console.error("Failed to fetch overview:", err))
      .finally(() => setLoading(false));

    const timer = setInterval(() => {
      controlApi.getOverview().then((res) => setOverview(res)).catch(() => {});
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#64748B" }}>
        Loading Mission Control telemetry…
      </div>
    );
  }

  const metrics = overview?.metrics || {};
  const activeAlerts = overview?.activeAlerts || [];
  const expiringTrials = overview?.expiringTrials || [];
  const liveEvents = overview?.liveEvents || [];

  return (
    <div>
      {/* ── Top Metric Grid ── */}
      <div className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Schools</div>
          <div className={styles.metricValue}>{metrics.totalSchools ?? 0}</div>
          <div className={styles.metricSubtext}>
            {metrics.activeSchools ?? 0} active · {metrics.trialSchools ?? 0} in trial
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Fleet Health</div>
          <div className={styles.metricValue} style={{ color: "#34D399" }}>
            {metrics.healthyInstallations ?? 0}
          </div>
          <div className={styles.metricSubtext}>
            {metrics.warningInstallations ?? 0} warning · {metrics.criticalInstallations ?? 0} critical
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Offline Nodes</div>
          <div className={styles.metricValue} style={{ color: metrics.offlineInstallations > 0 ? "#F87171" : "#94A3B8" }}>
            {metrics.offlineInstallations ?? 0}
          </div>
          <div className={styles.metricSubtext}>Unreachable for &gt; 30m</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Exams</div>
          <div className={styles.metricValue} style={{ color: "#60A5FA" }}>
            {metrics.activeExamSessions ?? 0}
          </div>
          <div className={styles.metricSubtext}>{metrics.examsConductedToday ?? 0} conducted today</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Open Incidents</div>
          <div className={styles.metricValue} style={{ color: metrics.openIncidentsCount > 0 ? "#FBBF24" : "#94A3B8" }}>
            {metrics.openIncidentsCount ?? 0}
          </div>
          <div className={styles.metricSubtext}>{metrics.activeAlertsCount ?? 0} active alarms</div>
        </div>
      </div>

      {/* ── Attention Required Drawer ── */}
      {activeAlerts.length > 0 && (
        <div className={styles.attentionBanner}>
          <div className={styles.attentionHeader}>
            <div className={styles.attentionTitle}>
              <AlertTriangleIcon size={16} color="#F87171" />
              <span>Attention Required ({activeAlerts.length})</span>
            </div>
            <Link href="/control/alerts" className={`${styles.btn} ${styles.btnSecondary}`}>
              View All Alerts →
            </Link>
          </div>

          <div className={styles.attentionList}>
            {activeAlerts.map((alt: any) => (
              <div key={alt.id} className={styles.attentionItem}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className={`${styles.statusDot} ${alt.severity === "critical" ? styles.dotCritical : styles.dotWarning}`} />
                    <span style={{ fontWeight: 600, color: "#F8FAFC", fontSize: "0.8125rem" }}>
                      {alt.school_name} ({alt.school_code})
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#F87171", fontWeight: 600 }}>
                      · {alt.title}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.2rem" }}>
                    {alt.details}
                  </div>
                </div>

                <Link
                  href={`/control/schools/${alt.school_id}`}
                  className={`${styles.btn} ${styles.btnDanger}`}
                  style={{ flexShrink: 0 }}
                >
                  Investigate →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-Column Operational Split ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        {/* Left: Trials Expiring */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ClockIcon size={16} color="#FBBF24" />
              <div className={styles.tableTitle}>Trials Requiring Action</div>
            </div>
            <Link href="/control/trials" className={`${styles.btn} ${styles.btnSecondary}`}>
              Manage Trials
            </Link>
          </div>

          {expiringTrials.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "#64748B", fontSize: "0.8125rem" }}>
              No trials expiring within the next 7 days.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Expires In</th>
                  <th>Quota</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expiringTrials.map((tr: any) => (
                  <tr key={tr.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{tr.school_name}</div>
                      <div className={styles.mono} style={{ color: "#64748B" }}>{tr.school_code}</div>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: "rgba(245, 158, 11, 0.12)", color: "#FBBF24" }}>
                        {tr.days_remaining} days left
                      </span>
                    </td>
                    <td className={styles.mono}>{tr.student_limit} students</td>
                    <td>
                      <Link href={`/control/schools/${tr.school_id}`} className={`${styles.btn} ${styles.btnPrimary}`}>
                        Convert
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Live Fleet Activity Stream */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ActivityIcon size={16} color="#60A5FA" />
              <div className={styles.tableTitle}>Live Fleet Activity</div>
            </div>
            <span className={styles.mono} style={{ fontSize: "0.625rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Real-Time Stream
            </span>
          </div>

          {liveEvents.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "#64748B", fontSize: "0.8125rem" }}>
              No recent telemetry events recorded.
            </div>
          ) : (
            <div style={{ padding: "0.25rem 0", maxHeight: "320px", overflowY: "auto" }}>
              {liveEvents.map((ev: any) => (
                <div
                  key={ev.id}
                  style={{
                    padding: "0.6rem 1.15rem",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span
                      className={`${styles.statusDot} ${
                        ev.severity === "critical"
                          ? styles.dotCritical
                          : ev.severity === "warning"
                          ? styles.dotWarning
                          : styles.dotHealthy
                      }`}
                    />
                    <div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#E2E8F0" }}>
                        {ev.event_type.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "#64748B" }}>
                        {ev.school_name} · <span className={styles.mono}>v{ev.software_version}</span>
                      </div>
                    </div>
                  </div>

                  <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>
                    {new Date(ev.event_timestamp || ev.received_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
