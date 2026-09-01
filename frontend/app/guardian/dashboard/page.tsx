"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
import styles from "./page.module.css";

export default function GuardianDashboardPage() {
  return (
    <RequireRole role="guardian">
      <GuardianDashboard />
    </RequireRole>
  );
}

function GuardianDashboard() {
  const { activeWard, guardianName, period, setPeriod, openChildSwitcher, loading } = useGuardian();
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "0.75rem", color: "var(--g-text-secondary, #64748B)", fontSize: "0.875rem" }}>
        <div className="spinner" style={{ width: 28, height: 28, borderColor: "var(--g-border, #E2E8F0)", borderTopColor: "var(--g-primary, #165AF6)" }} />
        <span>Loading student data…</span>
      </div>
    );
  }

  if (!activeWard) {
    return (
      <div className={styles.container}>
        <section className={styles.greetingSection}>
          <h1 className={styles.greetingHeading}>Welcome, {guardianName}</h1>
          <p className={styles.greetingSubtitle}>Connect your children to monitor their real-time performance.</p>
        </section>

        <div style={{
          background: "var(--g-surface, #FFFFFF)",
          border: "1px solid var(--g-border, #E2E8F0)",
          borderRadius: "var(--g-radius-lg, 16px)",
          padding: "2.5rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1rem",
          marginTop: "1rem",
          boxShadow: "var(--g-shadow-sm, 0 2px 10px rgba(0,0,0,0.03))"
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "var(--g-primary-subtle, #EFF4FF)",
            color: "var(--g-primary, #165AF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--g-text-primary, #0F172A)" }}>No Linked Wards Found</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--g-text-secondary, #64748B)", maxWidth: "320px", lineHeight: 1.5 }}>
            You haven't linked any student profiles yet. Link your student using their admission number or student registration ID.
          </p>
          <Link
            href="/guardian/links"
            style={{
              marginTop: "0.5rem",
              background: "var(--g-primary, #165AF6)",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "0.875rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "10px",
              textDecoration: "none",
              boxShadow: "0 4px 12px var(--g-primary-glow, rgba(22, 90, 246, 0.25))"
            }}
          >
            Link a Ward Now
          </Link>
        </div>
      </div>
    );
  }

  // Trend line chart computation from live student subject performance
  const trendPoints: Array<{ week: string; score: number }> = (activeWard.trend_data && activeWard.trend_data.length > 0)
    ? activeWard.trend_data
    : (activeWard.subjects_performance && activeWard.subjects_performance.length > 0)
      ? activeWard.subjects_performance.map((s) => ({ week: s.subject_name.slice(0, 4).toUpperCase(), score: s.score || 0 }))
      : [];

  const svgWidth = 320;
  const svgHeight = 110;
  const paddingX = 25;
  const paddingY = 20;

  const minScore = 40;
  const maxScore = 100;

  const coordinates = trendPoints.map((pt, i) => {
    const x = paddingX + (i / Math.max(trendPoints.length - 1, 1)) * (svgWidth - paddingX * 2);
    const normalizedY = Math.max(0, Math.min(1, (pt.score - minScore) / (maxScore - minScore)));
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
    return { x, y, week: pt.week, score: pt.score };
  });

  const pathD = coordinates.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = coordinates[idx - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }, "");

  // Upcoming exam preview from live ward data
  const upcomingExam = activeWard.upcoming_events?.[0] || null;

  // Recent activity from live ward data
  const recentActivities = activeWard.recent_activity || [];

  return (
    <div className={styles.container}>
      {/* ── 1. Header Greeting & Period Selector ── */}
      <section className={styles.greetingSection}>
        <div className={styles.greetingTitleRow}>
          <h1 className={styles.greetingHeading}>Hello, {guardianName.split(" ")[0]}</h1>
          <button
            type="button"
            className={styles.periodDropdown}
            onClick={() => setPeriod(period === "this_term" ? "this_week" : "this_term")}
          >
            <span>{period === "this_term" ? "This Term" : "This Week"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        <p className={styles.greetingSubtitle}>Here is your ward's latest academic performance overview.</p>
      </section>

      {/* ── 2. Active Child Spotlight Card (Tap to Switch) ── */}
      <div className={styles.activeChildHero} onClick={openChildSwitcher}>
        <div className={styles.childHeroLeft}>
          <StudentAvatar name={activeWard.name} imageUrl={activeWard.image_url} size="md" />
          <div className={styles.childHeroMeta}>
            <h2 className={styles.childHeroName}>{activeWard.name}</h2>
            <span className={styles.childHeroSub}>
              {activeWard.grade} • Adm: {activeWard.admission_number || activeWard.reg_id || `ID-${activeWard.id}`}
            </span>
          </div>
        </div>
        <div className={styles.childHeroSwitchBtn}>
          <span>Switch</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── 3. Needs Attention Notice Block ── */}
      {activeWard.fees && activeWard.fees.balance > 0 ? (
        <div className={styles.attentionCard}>
          <div className={styles.attentionLeft}>
            <svg className={styles.attentionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className={styles.attentionText}>
              Outstanding fee balance: ₦{activeWard.fees.balance.toLocaleString()}
            </p>
          </div>
          <Link href="/guardian/fees" className={styles.attentionAction}>
            Pay Now →
          </Link>
        </div>
      ) : (
        <div className={styles.attentionCard} style={{ background: "var(--g-success-subtle, #ECFDF5)", borderColor: "var(--g-success-border, #A7F3D0)" }}>
          <div className={styles.attentionLeft}>
            <svg style={{ color: "var(--g-success, #059669)", flexShrink: 0 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className={styles.attentionText} style={{ color: "var(--g-text-primary, #0F172A)" }}>
              All fees and report cards are up to date!
            </p>
          </div>
          <Link href="/guardian/results" className={styles.attentionAction} style={{ color: "var(--g-success, #059669)" }}>
            View Results →
          </Link>
        </div>
      )}

      {/* ── 3b. Teacher & Administration Direct Chat Banner ── */}
      <Link href="/guardian/messages" className={styles.attentionCard} style={{ background: "var(--g-primary-subtle, #EFF4FF)", borderColor: "var(--g-primary-border, #BFDBFE)", marginTop: "-0.25rem", textDecoration: "none", cursor: "pointer" }}>
        <div className={styles.attentionLeft}>
          <div style={{ background: "var(--g-primary, #165AF6)", color: "#FFFFFF", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--g-primary, #165AF6)" }}>
              {activeWard.unread_messages ? `${activeWard.unread_messages} New Message${activeWard.unread_messages > 1 ? "s" : ""}` : "Chat with Teachers & Admin"}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--g-text-secondary, #64748B)" }}>
              Inquire with Form Teacher, Subject Teachers & School Admin
            </span>
          </div>
        </div>
        <span className={styles.attentionAction} style={{ color: "var(--g-primary, #165AF6)" }}>
          Open Chat →
        </span>
      </Link>

      {/* ── 4. 2x2 Snapshot KPI Grid ── */}
      <div className={styles.statGrid}>
        {/* Average Score */}
        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconBox} style={{ background: "var(--g-primary-subtle, #EFF4FF)", color: "var(--g-primary, #165AF6)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </div>
            <span className={styles.statBadgeGreen}>
              {activeWard.score_delta ? `${Number(activeWard.score_delta) > 0 ? "+" : ""}${activeWard.score_delta}%` : "—"}
            </span>
          </div>
          <div className={styles.statValue}>
            {activeWard.average_score != null ? `${activeWard.average_score}%` : "—"}
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statLabel}>Average Score</span>
          </div>
        </div>

        {/* Class Position */}
        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconBox} style={{ background: "var(--g-purple-subtle, #F5F3FF)", color: "var(--g-purple, #7C3AED)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
            <span className={styles.statSubtextPill}>
              of {activeWard.total_class_students || 0}
            </span>
          </div>
          <div className={styles.statValue}>{activeWard.class_position || "—"}</div>
          <div className={styles.statMeta}>
            <span className={styles.statLabel}>Class Position</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconBox} style={{ background: "var(--g-success-subtle, #ECFDF5)", color: "var(--g-success, #059669)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className={styles.statBadgeGreen}>
              {activeWard.attendance?.present_days ?? 0}/{activeWard.attendance?.total_days ?? 0}d
            </span>
          </div>
          <div className={styles.statValue}>
            {activeWard.attendance_pct != null ? `${activeWard.attendance_pct}%` : "—"}
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statLabel}>Attendance Rate</span>
          </div>
        </div>

        {/* Completed Exams */}
        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconBox} style={{ background: "var(--g-warning-subtle, #FFFBEB)", color: "var(--g-warning, #D97706)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span className={styles.statSubtextPill}>
              {activeWard.total_exams ?? 0} Total
            </span>
          </div>
          <div className={styles.statValue}>{activeWard.completed_exams ?? 0}</div>
          <div className={styles.statMeta}>
            <span className={styles.statLabel}>Completed Exams</span>
          </div>
        </div>
      </div>

      {/* ── 5. Performance Trend Interactive SVG Line Chart ── */}
      <section className={styles.trendCard}>
        <div className={styles.trendHeader}>
          <div className={styles.trendTitleCol}>
            <h3 className={styles.trendTitle}>Performance Trend</h3>
            <span className={styles.trendSubtitle}>Weekly score progression</span>
          </div>
          <div className={styles.trendBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span>+4.2%</span>
          </div>
        </div>

        <div className={styles.chartContainer}>
          {trendPoints.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.8125rem" }}>
              Awaiting examination results for this term to generate performance progression chart.
            </div>
          ) : (
            <>
              {activePointIndex !== null && coordinates[activePointIndex] && (
                <div
                  className={styles.chartTooltip}
                  style={{ left: `${(coordinates[activePointIndex].x / svgWidth) * 100}%` }}
                >
                  {coordinates[activePointIndex].week}: {coordinates[activePointIndex].score}%
                </div>
              )}

              <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--g-primary, #165AF6)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--g-primary, #165AF6)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area under curve */}
                <path
                  d={`${pathD} L ${coordinates[coordinates.length - 1]?.x || svgWidth} ${svgHeight - paddingY} L ${coordinates[0]?.x || 0} ${svgHeight - paddingY} Z`}
                  fill="url(#trendGradient)"
                />

                {/* Main curve */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--g-primary, #165AF6)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Points */}
                {coordinates.map((pt, idx) => (
                  <g key={pt.week} onClick={() => setActivePointIndex(idx)} style={{ cursor: "pointer" }}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={activePointIndex === idx ? 6 : 4}
                      fill="var(--g-surface, #FFFFFF)"
                      stroke="var(--g-primary, #165AF6)"
                      strokeWidth={activePointIndex === idx ? 3 : 2}
                      style={{ transition: "all 140ms ease" }}
                    />
                    <text
                      x={pt.x}
                      y={svgHeight - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={activePointIndex === idx ? "700" : "500"}
                      fill={activePointIndex === idx ? "var(--g-primary, #165AF6)" : "var(--g-text-tertiary, #94A3B8)"}
                    >
                      {pt.week}
                    </text>
                  </g>
                ))}
              </svg>
            </>
          )}
        </div>
      </section>

      {/* ── 6. Upcoming Examination Spotlight ── */}
      <section className={styles.upcomingCard}>
        <div className={styles.upcomingHeaderRow}>
          <h3 className={styles.upcomingTitle}>Upcoming Examination</h3>
          <Link href="/guardian/examinations" className={styles.seeAllLink}>
            Timetable →
          </Link>
        </div>

        {upcomingExam ? (
          <div className={styles.examTile}>
            <div className={styles.examDatePill}>
              <span className={styles.examMonth}>{upcomingExam.month || "EXAM"}</span>
              <span className={styles.examDay}>{upcomingExam.day || "1"}</span>
            </div>
            <div className={styles.examDetails}>
              <span className={styles.examSubject}>{upcomingExam.title || upcomingExam.subject_name}</span>
              <span className={styles.examVenue}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{upcomingExam.time_str || "09:00 AM"} • {upcomingExam.venue || "CBT Center"}</span>
              </span>
            </div>
          </div>
        ) : (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.8125rem" }}>
            No upcoming examinations scheduled for this period.
          </div>
        )}
      </section>

      {/* ── 7. Recent Activity Feed ── */}
      <section className={styles.activitySection}>
        <div className={styles.sectionHeadingRow}>
          <h3 className={styles.sectionHeading}>Recent Activity</h3>
          <Link href="/guardian/notifications" className={styles.seeAllLink}>
            All Alerts →
          </Link>
        </div>

        {recentActivities.length > 0 ? (
          <div className={styles.activityList}>
            {recentActivities.map((act) => (
              <Link key={act.id} href="/guardian/performance" className={styles.activityItem}>
                <div className={styles.activityItemLeft}>
                  <span className={styles.activityDot} />
                  <div className={styles.activityTextCol}>
                    <span className={styles.activityTitle}>{act.title}</span>
                    <span className={styles.activityDate}>{act.date_label}</span>
                  </div>
                </div>
                {act.score && <span className={styles.activityScoreBadge}>{act.score}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ padding: "1.25rem", textAlign: "center", background: "var(--g-surface, #FFFFFF)", borderRadius: "var(--g-radius-md, 12px)", border: "1px solid var(--g-border, #E2E8F0)", color: "var(--g-text-secondary, #64748B)", fontSize: "0.8125rem" }}>
            No recent activity recorded for this period yet.
          </div>
        )}
      </section>
    </div>
  );
}
