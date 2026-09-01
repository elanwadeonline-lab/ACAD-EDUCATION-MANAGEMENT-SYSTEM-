"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequireRole } from "../../../../components/auth/RequireRole";
import { useGuardian } from "../../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../../components/guardian/StudentAvatar";
import { api } from "../../../../lib/api";
import styles from "./page.module.css";

export default function WardDetailContent() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const { wards, guardianName, setActiveWardId } = useGuardian();
  const [activeTab, setActiveTab] = useState<"overview" | "academics" | "attendance" | "info">("overview");

  const ward = wards.find((w) => String(w.id) === String(rawId) || String(w.student_id) === String(rawId)) || wards[0];

  useEffect(() => {
    if (ward) {
      setActiveWardId(ward.student_id || ward.id);
    }
  }, [ward, setActiveWardId]);

  if (!ward) {
    return (
      <RequireRole role="guardian">
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>
          Ward record not found.
        </div>
      </RequireRole>
    );
  }

  return (
    <RequireRole role="guardian">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.headerRow}>
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
          <h1 className={styles.pageTitle}>{ward.name}</h1>
          <div style={{ width: 34 }} />
        </div>

        {/* ── 1. Top Identity Hero Card ── */}
        <section className={styles.profileCard}>
          <StudentAvatar name={ward.name} imageUrl={ward.image_url} size="xl" />
          <h2 className={styles.studentName}>{ward.name}</h2>
          <span className={styles.studentGrade}>{ward.grade}</span>

          <div className={styles.metaRow}>
            <div className={styles.metaCol}>
              <span className={styles.metaLabel}>Admission No.</span>
              <span className={styles.metaVal}>{ward.admission_number || ward.reg_id || `ID: ${ward.id}`}</span>
            </div>
            <div className={styles.metaCol}>
              <span className={styles.metaLabel}>Date of Birth</span>
              <span className={styles.metaVal}>{ward.dob || "Recorded on file"}</span>
            </div>
            <div className={styles.metaCol}>
              <span className={styles.metaLabel}>Gender</span>
              <span className={styles.metaVal}>{ward.gender || "Student"}</span>
            </div>
          </div>
        </section>

        {/* ── 2. Segmented Navigation Tabs ── */}
        <div className={styles.tabList}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "overview" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "academics" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("academics")}
          >
            Academics
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "attendance" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("attendance")}
          >
            Attendance
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "info" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("info")}
          >
            Info
          </button>
        </div>

        {/* ── 3. Tab Content ── */}
        {activeTab === "overview" && (
          <>
            <section className={styles.summaryBarCard}>
              <div className={styles.summaryCol}>
                <span className={styles.summaryNum}>{ward.average_score != null ? `${ward.average_score}%` : "—"}</span>
                <span className={styles.summaryLabel}>Average Score</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryCol}>
                <span className={styles.summaryNum}>{ward.attendance_pct != null ? `${ward.attendance_pct}%` : "—"}</span>
                <span className={styles.summaryLabel}>Attendance</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryCol}>
                <span className={styles.summaryNum}>{ward.class_position || "—"}</span>
                <span className={styles.summaryLabel}>Position</span>
              </div>
            </section>

            <div className={styles.actionLinks}>
              <Link href={`/guardian/messages?ward_id=${ward.student_id || ward.id}`} className={styles.actionBtn} style={{ background: "var(--g-primary-subtle, #EFF4FF)", borderColor: "var(--g-primary-border, #BFDBFE)", color: "var(--g-primary, #165AF6)", fontWeight: 700 }}>
                <span>💬 Message Form Teacher & Admin</span>
                <span>→</span>
              </Link>
              <Link href="/guardian/performance" className={styles.actionBtn}>
                <span>Subject Performance Breakdown</span>
                <span>→</span>
              </Link>
              <Link href="/guardian/results" className={styles.actionBtn}>
                <span>Term Results & Report Card Broadsheet</span>
                <span>→</span>
              </Link>
              <Link href="/guardian/examinations" className={styles.actionBtn}>
                <span>Examination Schedule & Venue</span>
                <span>→</span>
              </Link>
              <Link href="/guardian/fees" className={styles.actionBtn}>
                <span>School Fees & Payment Ledger</span>
                <span>→</span>
              </Link>
            </div>
          </>
        )}

        {activeTab === "academics" && (
          <section className={styles.sectionCard}>
            <h3 className={styles.sectionHeading}>Recent Subject Grades</h3>
            <div className={styles.infoList}>
              {(ward.subjects_performance || []).length === 0 ? (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.8125rem" }}>
                  No subject records found for this term yet.
                </div>
              ) : (
                (ward.subjects_performance || []).slice(0, 5).map((s, idx) => (
                  <div key={idx} className={styles.infoRow}>
                    <span className={styles.infoKey}>{s.subject_name}</span>
                    <span className={styles.infoValue} style={{ color: "var(--g-primary, #165AF6)" }}>
                      {s.score}% ({s.grade})
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link href="/guardian/performance" className={styles.actionBtn} style={{ marginTop: "0.5rem" }}>
              <span>Open Detailed Subject Performance</span>
              <span>→</span>
            </Link>
          </section>
        )}

        {activeTab === "attendance" && (
          <section className={styles.sectionCard}>
            <h3 className={styles.sectionHeading}>Attendance Breakdown</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Overall Rate</span>
                <span className={styles.infoValue}>{ward.attendance?.percentage != null ? `${ward.attendance.percentage}%` : "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Days Present</span>
                <span className={styles.infoValue}>{ward.attendance?.present_days ?? 0} days</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Days Absent</span>
                <span className={styles.infoValue}>{ward.attendance?.absent_days ?? 0} days</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Total School Days</span>
                <span className={styles.infoValue}>{ward.attendance?.total_days ?? 0} days</span>
              </div>
            </div>
            <Link href="/guardian/attendance" className={styles.actionBtn} style={{ marginTop: "0.5rem" }}>
              <span>Open Monthly Attendance Calendar</span>
              <span>→</span>
            </Link>
          </section>
        )}

        {activeTab === "info" && (
          <>
            <section className={styles.sectionCard}>
              <h3 className={styles.sectionHeading}>Parent & Guardian Contact</h3>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Parent Name</span>
                  <span className={styles.infoValue}>{ward.parent_name || guardianName}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Relationship</span>
                  <span className={styles.infoValue}>{ward.relationship || "Parent / Guardian"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Phone</span>
                  <span className={styles.infoValue}>{ward.parent_phone || "Not provided"}</span>
                </div>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <h3 className={styles.sectionHeading}>Health & Emergency Info</h3>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Blood Group</span>
                  <span className={styles.infoValue}>{ward.blood_group || "O+"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Emergency Contact</span>
                  <span className={styles.infoValue}>{ward.emergency_contact || "+234 802 987 6543"}</span>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </RequireRole>
  );
}
