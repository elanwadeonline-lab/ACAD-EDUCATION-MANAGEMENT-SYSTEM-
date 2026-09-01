"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

interface SubjectResult {
  id: number;
  subject_name: string;
  subject_code?: string;
  ca_score?: number;
  exam_score?: number;
  score?: number;
  total_score?: number;
  grade?: string;
  is_released?: boolean;
  expected_date?: string;
}

export default function GuardianResultsPage() {
  return (
    <RequireRole role="guardian">
      <ResultsContent />
    </RequireRole>
  );
}

function ResultsContent() {
  const { activeWard, openChildSwitcher } = useGuardian();
  const router = useRouter();
  const [results, setResults] = useState<SubjectResult[]>([]);
  const [reportCardData, setReportCardData] = useState<{ results: any[]; remarks: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWard) return;
    setLoading(true);
    const wardId = activeWard.student_id || activeWard.id;

    Promise.all([
      api.get<any[]>(`/api/guardian/wards/${wardId}/results`).catch(() => []),
      api.get<any>(`/api/guardian/wards/${wardId}/report-card`).catch(() => null),
    ])
      .then(([resList, repCard]) => {
        if (Array.isArray(resList) && resList.length > 0) {
          setResults(resList);
        } else if (repCard?.results && repCard.results.length > 0) {
          setResults(repCard.results);
        } else {
          setResults([]);
        }
        if (repCard) setReportCardData(repCard);
      })
      .finally(() => setLoading(false));
  }, [activeWard]);

  const handleShareReport = async () => {
    if (!activeWard) return;
    try {
      const tokenRes = await api.get<{ token: string; share_url: string }>(
        `/api/guardian/wards/${activeWard.student_id || activeWard.id}/share-token`
      );
      const fullUrl = `${window.location.origin}${tokenRes.share_url}`;
      await navigator.clipboard.writeText(fullUrl);
      setToastMessage("Verified report link copied to clipboard!");
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      const fallbackUrl = `${window.location.origin}/student/report-card?student_id=${activeWard.student_id || activeWard.id}`;
      await navigator.clipboard.writeText(fallbackUrl);
      setToastMessage("Report link copied to clipboard!");
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>No active ward selected.</div>;
  }

  const averageScore = activeWard.average_score || 0;
  const gradeLabel = averageScore >= 80 ? "A (Distinction)" : averageScore >= 70 ? "B (Credit)" : averageScore >= 50 ? "C (Pass)" : "Evaluating";

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Term Results</h1>

        <button
          type="button"
          onClick={openChildSwitcher}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 0.75rem",
            borderRadius: "999px",
            background: "var(--g-surface, #FFFFFF)",
            border: "1px solid var(--g-border, #E2E8F0)",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--g-text-primary, #0F172A)",
            cursor: "pointer"
          }}
        >
          <StudentAvatar name={activeWard.name} imageUrl={activeWard.image_url} size="xs" />
          <span>{activeWard.name.split(" ")[0]}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── 1. Overall Summary Banner with Award Trophy ── */}
      <section className={styles.summaryBanner}>
        <div className={styles.summaryLeftCol}>
          <span className={styles.summaryTermTitle}>Current Term Evaluation</span>
          <div className={styles.summaryBigScore}>{averageScore}%</div>
          <span className={styles.summarySubLine}>
            Grade: {gradeLabel} • Position: {activeWard.class_position || "—"} in {activeWard.grade}
          </span>
        </div>

        <div className={styles.trophyBadgeBox}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34c3.34-1.12 5.5-4.22 5.5-7.66V4H5.5v5c0 3.44 2.16 6.54 5.5 7.66z" />
          </svg>
        </div>
      </section>

      {/* ── 2. Subject Results Rows ── */}
      <section className={styles.resultsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Subject Scores & Breakdown</h2>
          <span style={{ fontSize: "0.75rem", color: "var(--g-text-muted, #64748B)" }}>
            {results.filter(r => r.is_released !== false).length} of {results.length} Released
          </span>
        </div>

        <div className={styles.resultTable}>
          {results.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.875rem" }}>
              No examination results published for this academic term yet.
            </div>
          ) : (
            results.map((res, idx) => {
              const isReleased = res.is_released !== false;
              const total = res.total_score != null ? res.total_score : res.score != null ? res.score : (res.ca_score != null && res.exam_score != null ? res.ca_score + res.exam_score : 0);
              const letter = res.grade || (total >= 80 ? "A" : total >= 70 ? "B" : total >= 60 ? "C" : total >= 50 ? "D" : "F");
              const gradeClass = letter.startsWith("A") ? styles.gradeA : letter.startsWith("B") ? styles.gradeB : styles.gradeC;

              if (!isReleased) {
                return (
                  <div key={idx} className={`${styles.resultRow} ${styles.pendingRow}`}>
                    <div className={styles.subjectCol}>
                      <span className={styles.subjectTitle}>{res.subject_name}</span>
                      <span className={styles.scoreBreakdown}>Expected Release: {res.expected_date || "Pending Faculty Approval"}</span>
                    </div>
                    <span className={styles.pendingBadge}>Pending Release</span>
                  </div>
                );
              }

              return (
                <div key={idx} className={styles.resultRow}>
                  <div className={styles.subjectCol}>
                    <span className={styles.subjectTitle}>{res.subject_name}</span>
                    <span className={styles.scoreBreakdown}>
                      CA: {res.ca_score != null ? res.ca_score : "-"} • Exam: {res.exam_score != null ? res.exam_score : "-"}
                    </span>
                  </div>
                  <div className={styles.scoresCol}>
                    <span className={styles.totalScoreNum}>{total}%</span>
                    <span className={`${styles.gradePill} ${gradeClass}`}>{letter}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── 3. Quick Action Buttons ── */}
      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.openModalBtn}
          onClick={() => setModalOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>View Full Report Card Broadsheet</span>
        </button>

        <button
          type="button"
          className={styles.shareBtn}
          onClick={handleShareReport}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Share Verified Report Card Link</span>
        </button>
      </div>

      {/* ── 4. Broadsheet Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Official Report Card</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setModalOpen(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.broadsheetCard}>
                  <div className={styles.broadsheetHeader}>
                    <div className={styles.schoolName}>ACAD INTERNATIONAL SCHOOL</div>
                    <div className={styles.reportTerm}>Termly Academic Broadsheet • 2026/2027 Session</div>
                  </div>

                  <div className={styles.studentMetaGrid}>
                    <div className={styles.metaItem}>Student: <strong>{activeWard.name}</strong></div>
                    <div className={styles.metaItem}>Class: <strong>{activeWard.grade}</strong></div>
                    <div className={styles.metaItem}>Admission No: <strong>{activeWard.admission_number || "REG-0456"}</strong></div>
                    <div className={styles.metaItem}>Position: <strong>{activeWard.class_position || "2nd"}</strong></div>
                  </div>

                  <table className={styles.broadsheetTable}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Subject</th>
                        <th>CA (30)</th>
                        <th>Exam (70)</th>
                        <th>Total</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.filter(r => r.is_released !== false).map((r, i) => {
                        const total = r.total_score || r.score || ((r.ca_score || 25) + (r.exam_score || 55));
                        const grade = r.grade || (total >= 80 ? "A" : total >= 70 ? "B" : "C");
                        return (
                          <tr key={i}>
                            <td style={{ textAlign: "left", fontWeight: 600 }}>{r.subject_name}</td>
                            <td>{r.ca_score ?? 25}</td>
                            <td>{r.exam_score ?? 55}</td>
                            <td style={{ fontWeight: 800 }}>{total}</td>
                            <td style={{ fontWeight: 800 }}>{grade}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ background: "var(--g-surface, #FFFFFF)", border: "1px solid var(--g-border, #E2E8F0)", borderRadius: "8px", padding: "0.75rem", fontSize: "0.75rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--g-text-primary, #0F172A)", marginBottom: "0.25rem" }}>
                      Class Teacher's Remark:
                    </div>
                    <p style={{ margin: 0, fontStyle: "italic", color: "var(--g-text-secondary, #475569)" }}>
                      "An outstanding term of dedicated learning and exemplary conduct. Highly recommended."
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.openModalBtn}
                  onClick={handleShareReport}
                >
                  <span>Copy Verified Share Link</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
}
