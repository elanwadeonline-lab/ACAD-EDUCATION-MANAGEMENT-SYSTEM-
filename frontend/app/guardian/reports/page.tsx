"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian, type WardReportDocument } from "../../../components/guardian/GuardianContext";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function GuardianReportsPage() {
  return (
    <RequireRole role="guardian">
      <ReportsList />
    </RequireRole>
  );
}

function ReportsList() {
  const { activeWard, period, setPeriod } = useGuardian();
  const router = useRouter();
  const [selectedDoc, setSelectedDoc] = useState<WardReportDocument | null>(null);
  const [reportCardData, setReportCardData] = useState<{ results: any[]; remarks: any[] } | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>No active ward selected.</div>;
  }

  const reports: WardReportDocument[] = (activeWard.reports && activeWard.reports.length > 0)
    ? activeWard.reports
    : [
        {
          id: "rep-1",
          title: "Academic Performance Report",
          category: "academic",
          date_str: "May 2025",
          file_size_kb: 450,
          description: "Detailed subject performance",
        },
        {
          id: "rep-2",
          title: "Termly Assessment Report",
          category: "academic",
          date_str: "May 2025",
          file_size_kb: 380,
          description: "CA, Test & Exam breakdown",
        },
        {
          id: "rep-3",
          title: "Attendance Report",
          category: "attendance",
          date_str: "May 2025",
          file_size_kb: 210,
          description: "Daily & monthly attendance",
        },
        {
          id: "rep-4",
          title: "Behaviour Report",
          category: "behaviour",
          date_str: "May 2025",
          file_size_kb: 190,
          description: "Behaviour & class participation",
        },
        {
          id: "rep-5",
          title: "Rank & Position Report",
          category: "rank",
          date_str: "May 2025",
          file_size_kb: 290,
          description: "Class & overall ranking",
        },
      ];

  const handleOpenDoc = async (doc: WardReportDocument) => {
    setSelectedDoc(doc);
    try {
      setLoadingCard(true);
      const res = await api.get<{ results: any[]; remarks: any[] }>(`/api/guardian/wards/${activeWard.id}/report-card`);
      setReportCardData(res);
    } catch {
      setReportCardData(null);
    } finally {
      setLoadingCard(false);
    }
  };

  const handleShareDoc = async (doc: WardReportDocument) => {
    try {
      const tokenRes = await api.get<{ share_url: string; token: string }>(`/api/guardian/wards/${activeWard.id}/share-token`);
      const fullUrl = `${window.location.origin}${tokenRes.share_url}`;
      await navigator.clipboard.writeText(fullUrl);
      setShareToast(`Verified report link copied to clipboard!`);
      setTimeout(() => setShareToast(null), 3500);
    } catch {
      const fallbackUrl = `${window.location.origin}/student/report-card?student_id=${activeWard.id}`;
      await navigator.clipboard.writeText(fallbackUrl);
      setShareToast(`Report link copied to clipboard!`);
      setTimeout(() => setShareToast(null), 3500);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
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
          <h1 className={styles.pageTitle}>Reports</h1>
        </div>

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

      {shareToast && (
        <div className={styles.shareToast}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{shareToast}</span>
        </div>
      )}

      {/* 5 Report Cards */}
      <div className={styles.reportList}>
        {reports.map((doc, idx) => {
          // Color & Icon mapping matching Screen 6
          const icons = [
            { bg: "#EFF4FF", color: "#165AF6", type: "document" },
            { bg: "#F5F3FF", color: "#7C3AED", type: "clipboard" },
            { bg: "#ECFDF5", color: "#059669", type: "calendar" },
            { bg: "#FFF1F2", color: "#E11D48", type: "shield" },
            { bg: "#FEF3C7", color: "#D97706", type: "trophy" },
          ];
          const iconMeta = icons[idx % icons.length];

          return (
            <div
              key={doc.id}
              className={styles.reportCard}
              onClick={() => handleOpenDoc(doc)}
            >
              <div className={styles.reportCardLeft}>
                <div className={styles.reportIconBox} style={{ background: iconMeta.bg, color: iconMeta.color }}>
                  {iconMeta.type === "document" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  )}
                  {iconMeta.type === "clipboard" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                  )}
                  {iconMeta.type === "calendar" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  )}
                  {iconMeta.type === "shield" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  )}
                  {iconMeta.type === "trophy" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="7" />
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                    </svg>
                  )}
                </div>

                <div className={styles.reportTextCol}>
                  <span className={styles.reportTitle}>{doc.title}</span>
                  <span className={styles.reportDesc}>{doc.description || "Official termly transcript"}</span>
                </div>
              </div>

              <div className={styles.viewTrigger}>
                <span>View</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Report Viewer Modal ── */}
      {selectedDoc && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDoc(null)}>
          <div className={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalDocTitle}>{selectedDoc.title}</h2>
                <p className={styles.modalDocMeta}>
                  {activeWard.name} • {activeWard.grade} • {selectedDoc.date_str}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedDoc(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingCard ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748B" }}>
                  Generating official encrypted transcript…
                </div>
              ) : (
                <div className={styles.officialDocument}>
                  <div className={styles.docWatermark}>ACAD VERIFIED TRANSCRIPT</div>

                  {/* Header of official slip */}
                  <div className={styles.docSlipHeader}>
                    <div>
                      <div className={styles.docSchoolName}>ACADEMY MODEL HIGH SCHOOL</div>
                      <div className={styles.docSchoolSub}>Continuous Assessment & Official Grade Record</div>
                    </div>
                    <div className={styles.docBadge}>OFFICIAL</div>
                  </div>

                  <div className={styles.docStudentMetaGrid}>
                    <div>
                      <span className={styles.metaLabel}>Student:</span> {activeWard.name}
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Admission No:</span> {activeWard.admission_number || "ACD/2021/0456"}
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Class:</span> {activeWard.grade}
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Term:</span> First Term 2025/2026
                    </div>
                  </div>

                  {/* Subjects Table */}
                  <table className={styles.gradesTable}>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th style={{ textAlign: "center" }}>Score</th>
                        <th style={{ textAlign: "center" }}>Grade</th>
                        <th style={{ textAlign: "center" }}>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportCardData?.results && reportCardData.results.length > 0) ? (
                        reportCardData.results.map((r, i) => (
                          <tr key={i}>
                            <td>{r.subject_name}</td>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{r.total_score || r.score}%</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#165AF6" }}>{r.grade || "A"}</td>
                            <td style={{ textAlign: "center" }}>{r.remark || "Excellent"}</td>
                          </tr>
                        ))
                      ) : (
                        (activeWard.subjects_performance || []).map((sub, i) => (
                          <tr key={i}>
                            <td>{sub.subject_name}</td>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{sub.score}%</td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#165AF6" }}>{sub.grade}</td>
                            <td style={{ textAlign: "center" }}>{sub.score >= 80 ? "Distinction" : "Credit"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Principal Sign-off */}
                  <div className={styles.docSignoffRow}>
                    <div>
                      <div className={styles.signoffTitle}>Principal's Remark:</div>
                      <div className={styles.signoffText}>An exceptional academic performance with sustained excellence across STEM disciplines.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.shareBtn}
                onClick={() => handleShareDoc(selectedDoc)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>Share Transcript Link</span>
              </button>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={() => window.print()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
