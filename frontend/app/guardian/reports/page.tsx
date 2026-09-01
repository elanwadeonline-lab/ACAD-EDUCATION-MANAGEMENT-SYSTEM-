"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian, type WardReportDocument } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
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
  const { activeWard, period, setPeriod, openChildSwitcher } = useGuardian();
  const router = useRouter();
  const [selectedDoc, setSelectedDoc] = useState<WardReportDocument | null>(null);
  const [reportCardData, setReportCardData] = useState<{ results: any[]; remarks: any[] } | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>No active ward selected.</div>;
  }

  const reports: WardReportDocument[] = (activeWard.reports && activeWard.reports.length > 0)
    ? activeWard.reports
    : [];

  const handleOpenDoc = async (doc: WardReportDocument) => {
    setSelectedDoc(doc);
    try {
      setLoadingCard(true);
      const res = await api.get<{ results: any[]; remarks: any[] }>(`/api/guardian/wards/${activeWard.student_id || activeWard.id}/report-card`);
      setReportCardData(res);
    } catch {
      setReportCardData(null);
    } finally {
      setLoadingCard(false);
    }
  };

  const handleShareDoc = async (doc: WardReportDocument) => {
    try {
      const tokenRes = await api.get<{ share_url: string; token: string }>(`/api/guardian/wards/${activeWard.student_id || activeWard.id}/share-token`);
      const fullUrl = `${window.location.origin}${tokenRes.share_url}`;
      await navigator.clipboard.writeText(fullUrl);
      setShareToast(`Verified report link copied to clipboard!`);
      setTimeout(() => setShareToast(null), 3500);
    } catch {
      const fallbackUrl = `${window.location.origin}/student/report-card?student_id=${activeWard.student_id || activeWard.id}`;
      await navigator.clipboard.writeText(fallbackUrl);
      setShareToast(`Report link copied to clipboard!`);
      setTimeout(() => setShareToast(null), 3500);
    }
  };

  return (
    <div className={styles.container}>
      {/* ── Top Header Controls ── */}
      <div className={styles.topControlRow || styles.headerRow}>
        <button
          type="button"
          className={styles.childSelectBtn || styles.addLinkBtn}
          onClick={openChildSwitcher}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--g-surface, #FFFFFF)", border: "1px solid var(--g-border, #E2E8F0)", borderRadius: "999px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", color: "var(--g-text-primary, #0F172A)" }}
        >
          <StudentAvatar name={activeWard.name} imageUrl={activeWard.image_url} size="xs" />
          <span>{activeWard.name.split(" ")[0]}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

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
        {reports.length === 0 ? (
          <div style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            background: "var(--g-surface, #FFFFFF)",
            border: "1px solid var(--g-border, #E2E8F0)",
            borderRadius: "var(--g-radius-lg, 16px)",
            color: "var(--g-text-secondary, #64748B)",
            fontSize: "0.875rem"
          }}>
            No official term report documents issued for this period yet.
          </div>
        ) : (
          reports.map((doc, idx) => {
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
          })
        )}
      </div>

      {/* ── Report Viewer Modal ── */}
      {selectedDoc && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDoc(null)}>
          <div className={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetTitleGroup}>
                <span className={styles.sheetDocType}>{selectedDoc.category.toUpperCase()} REPORT</span>
                <h3 className={styles.sheetTitle}>{selectedDoc.title}</h3>
                <span className={styles.sheetWardMeta}>{activeWard.name} • {activeWard.grade}</span>
              </div>
              <button
                type="button"
                className={styles.sheetCloseBtn}
                onClick={() => setSelectedDoc(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.sheetBody}>
              {loadingCard ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>
                  Generating official report broadsheet…
                </div>
              ) : reportCardData ? (
                <div className={styles.reportSheetPreview}>
                  <div className={styles.previewSchoolHeader}>
                    <span className={styles.previewSchoolName}>ACADEMY / EXAMPOOL HIGH SCHOOL</span>
                    <span className={styles.previewTerm}>TERMLY ACADEMIC ASSESSMENT BROADSHEET</span>
                  </div>

                  <div className={styles.studentSummaryGrid}>
                    <div><strong>Student:</strong> {activeWard.name}</div>
                    <div><strong>Reg No:</strong> {activeWard.admission_number || activeWard.reg_id}</div>
                    <div><strong>Class:</strong> {activeWard.grade}</div>
                    <div><strong>Term Attendance:</strong> {activeWard.attendance_pct || 92}%</div>
                  </div>

                  {reportCardData.results && reportCardData.results.length > 0 ? (
                    <table className={styles.gradesTable}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>CA (40)</th>
                          <th>Exam (60)</th>
                          <th>Total</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportCardData.results.map((r: any, idx: number) => (
                          <tr key={idx}>
                            <td>{r.subject_name || r.name}</td>
                            <td>{r.ca_score ?? "—"}</td>
                            <td>{r.exam_score ?? "—"}</td>
                            <td><strong>{r.total_score ?? r.score}%</strong></td>
                            <td><span className={styles.gradeBadgeInline}>{r.grade || "A"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>
                      No examination marks recorded for this assessment sheet yet.
                    </div>
                  )}

                  {reportCardData.remarks && reportCardData.remarks.length > 0 && (
                    <div className={styles.remarksBlock}>
                      <span className={styles.remarksHeading}>Official Comments:</span>
                      {reportCardData.remarks.map((rem: any, idx: number) => (
                        <p key={idx} className={styles.remarkQuote}>
                          <strong>{rem.author || "Principal"}:</strong> {rem.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>
                  Official broadsheet details will appear as results are approved.
                </div>
              )}
            </div>

            <div className={styles.sheetFooter}>
              <button
                type="button"
                className={styles.shareReportBtn}
                onClick={() => handleShareDoc(selectedDoc)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>Share Verified Link</span>
              </button>

              <button
                type="button"
                className={styles.downloadPdfBtn}
                onClick={() => window.print()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
