"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
import { api } from "../../../lib/api";
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
  const [perfData, setPerfData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeWard) return;
    setLoading(true);
    api.get<any>(`/api/guardian/wards/${activeWard.student_id || activeWard.id}/performance`)
      .then((res) => {
        if (res) setPerfData(res);
      })
      .catch((err) => {
        console.warn("[Performance] Fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [activeWard]);

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>No active ward selected.</div>;
  }

  const wardAvg = perfData?.average_score || activeWard.average_score || 0;
  const scoreDelta = perfData?.score_delta || activeWard.score_delta || "+0.0";

  // Circular gauge calculations (SVG circumference)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, wardAvg)) / 100) * circumference;

  const subjects = (perfData?.subjects_performance && perfData.subjects_performance.length > 0)
    ? perfData.subjects_performance
    : (activeWard.subjects_performance && activeWard.subjects_performance.length > 0)
      ? activeWard.subjects_performance
      : [];

  return (
    <div className={styles.container}>
      {/* ── Top Header Controls ── */}
      <div className={styles.topControlRow}>
        <button
          type="button"
          className={styles.childSelectBtn}
          onClick={openChildSwitcher}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <StudentAvatar name={activeWard.name} imageUrl={activeWard.image_url} size="xs" />
          <span className={styles.childSelectName}>{activeWard.name}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

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
              stroke="var(--g-border-subtle, #F1F5F9)"
              strokeWidth="9"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke="var(--g-primary, #165AF6)"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
        </div>

        <div className={styles.donutMetaCol}>
          <span className={styles.donutLabel}>Overall Term Average</span>
          <div className={styles.donutValueRow}>
            <span className={styles.donutBigNumber}>{wardAvg}%</span>
            <span className={styles.donutSubBadge}>
              {String(scoreDelta).startsWith("+") || Number(scoreDelta) > 0 ? `▲ ${scoreDelta}%` : `▼ ${scoreDelta}%`}
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--g-text-muted, #64748B)" }}>
            Position: {activeWard.class_position || "—"} in {activeWard.grade}
          </span>
        </div>
      </section>

      {/* ── 2. Subject Breakdown Section ── */}
      <section className={styles.subjectSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Subject Breakdown</h2>
          <span style={{ fontSize: "0.75rem", color: "var(--g-text-muted, #64748B)", fontWeight: 600 }}>
            {subjects.length} Subjects Graded
          </span>
        </div>

        <div className={styles.subjectList}>
          {subjects.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.8125rem" }}>
              No subject score records recorded for this term yet.
            </div>
          ) : (
            subjects.map((sub: any, idx: number) => {
              const letter = sub.grade || (sub.score >= 80 ? "A" : sub.score >= 70 ? "B" : sub.score >= 60 ? "C" : sub.score >= 50 ? "D" : "F");
              const gradeClass = letter.startsWith("A") ? styles.gradeA : letter.startsWith("B") ? styles.gradeB : styles.gradeC;
              const barColor = sub.color || (letter.startsWith("A") ? "var(--g-success, #059669)" : letter.startsWith("B") ? "var(--g-primary, #165AF6)" : "var(--g-warning, #D97706)");

              return (
                <div key={idx} className={styles.subjectItem}>
                  <div className={styles.subjectTopRow}>
                    <div className={styles.subjectInfoLeft}>
                      <span className={styles.subjectBadgeBox}>{sub.subject_code || sub.subject_name.slice(0, 3).toUpperCase()}</span>
                      <span className={styles.subjectName}>{sub.subject_name}</span>
                    </div>
                    <div className={styles.subjectScoreGroup}>
                      <span className={styles.subjectScoreVal}>{sub.score}%</span>
                      <span className={`${styles.gradeBadge} ${gradeClass}`}>{letter}</span>
                    </div>
                  </div>

                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${Math.min(100, Math.max(0, sub.score))}%`, background: barColor }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── 3. Teacher Feedback & Remarks ── */}
      <section className={styles.remarkCard}>
        <h3 className={styles.remarkHeading}>Form Teacher Feedback</h3>
        <div className={styles.remarkQuoteBox}>
          <p className={styles.remarkText}>
            {perfData?.teacher_remark || (activeWard as any).teacher_remark
              ? `"${perfData?.teacher_remark || (activeWard as any).teacher_remark}"`
              : `"${activeWard.name} is making steady progress in ${activeWard.grade}. Complete end-of-term evaluations will be published soon."`}
          </p>
          <span className={styles.remarkAuthor}>
            — {perfData?.form_teacher_name || (activeWard as any).form_teacher_name || "Class Teacher"} ({activeWard.grade})
          </span>
        </div>
      </section>

      {/* ── 4. Full Result Action Link ── */}
      <Link href="/guardian/results" className={styles.viewFullResultBtn}>
        <span>View Full Term Report Card & Broadsheet</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}
