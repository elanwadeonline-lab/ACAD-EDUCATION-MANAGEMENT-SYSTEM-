"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import styles from "./page.module.css";

export default function GuardianPerformancePage() {
  return (
    <RequireRole role="guardian">
      <PerformanceContent />
    </RequireRole>
  );
}

function PerformanceContent() {
  const { activeWard, period, setPeriod, openChildSwitcher } = useGuardian();
  const router = useRouter();

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>No active ward selected.</div>;
  }

  // Circular gauge calculations (SVG circumference)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((activeWard.average_score || 78) / 100) * circumference;

  const subjects = (activeWard.subjects_performance && activeWard.subjects_performance.length > 0)
    ? activeWard.subjects_performance
    : [
        { subject_name: "Mathematics", subject_code: "MTH", score: 92, grade: "A", trend: "up" as const, color: "#165AF6" },
        { subject_name: "English Language", subject_code: "ENG", score: 81, grade: "B+", trend: "up" as const, color: "#0F766E" },
        { subject_name: "Physics", subject_code: "PHY", score: 85, grade: "A-", trend: "up" as const, color: "#D97706" },
        { subject_name: "Chemistry", subject_code: "CHM", score: 61, grade: "C+", trend: "down" as const, color: "#E11D48" },
        { subject_name: "Biology", subject_code: "BIO", score: 74, grade: "B", trend: "stable" as const, color: "#7C3AED" },
      ];

  return (
    <div className={styles.container}>
      {/* ── Top Header Controls ── */}
      <div className={styles.topControlRow}>
        <div className={styles.headerLeftGroup}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.back()}
            aria-label="Back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.childSelectBtn}
            onClick={openChildSwitcher}
          >
            <span className={styles.childSelectName}>{activeWard.name}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          className={styles.periodBadge}
          onClick={() => setPeriod(period === "this_term" ? "this_week" : "this_term")}
        >
          <span>{period === "this_term" ? "This Term" : "This Week"}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── 1. Overall Average Donut Widget Card ── */}
      <section className={styles.donutCard}>
        <div className={styles.donutRingBox}>
          <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="9"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke="#165AF6"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
        </div>
        <div className={styles.donutMetaCol}>
          <span className={styles.donutLabel}>Overall Average</span>
          <div className={styles.donutValueRow}>
            <span className={styles.donutBigNumber}>{activeWard.average_score || 78}%</span>
          </div>
          <span className={styles.donutSubBadge}>• Good Performance</span>
        </div>
      </section>

      {/* ── 2. Subject Performance List ── */}
      <section className={styles.subjectSection}>
        <h2 className={styles.subjectSectionTitle}>Subject Performance</h2>

        <div className={styles.subjectList}>
          {subjects.map((sub) => {
            const isA = sub.grade.startsWith("A");
            const isB = sub.grade.startsWith("B");
            const gradeBg = isA ? "#ECFDF5" : isB ? "#EFF4FF" : "#FFF1F2";
            const gradeColor = isA ? "#059669" : isB ? "#165AF6" : "#E11D48";

            return (
              <div key={sub.subject_code} className={styles.subjectCard}>
                <div className={styles.subjectTopRow}>
                  <div className={styles.subjectNameCol}>
                    <div className={styles.subjectIconBox} style={{ background: `${sub.color || "#165AF6"}15`, color: sub.color || "#165AF6" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <span className={styles.subjectName}>{sub.subject_name}</span>
                  </div>

                  <div className={styles.subjectScoreRow}>
                    <span className={styles.subjectScoreNum}>{sub.score}%</span>
                    <span className={styles.gradeBadge} style={{ background: gradeBg, color: gradeColor }}>
                      {sub.grade}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressBar}
                    style={{
                      width: `${sub.score}%`,
                      background: sub.color || "#165AF6",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Link href="/guardian/reports" className={styles.viewDetailedBtn}>
          View Detailed Report
        </Link>
      </section>
    </div>
  );
}
