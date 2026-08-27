"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequireRole } from "../../../../components/auth/RequireRole";
import { useGuardian } from "../../../../components/guardian/GuardianContext";
import { api } from "../../../../lib/api";
import styles from "./page.module.css";

export default function WardDetailContent() {
  const params = useParams();
  const router = useRouter();
  const wardId = params?.id as string;
  const { wards, guardianName } = useGuardian();

  const [wardData, setWardData] = useState<any>(null);

  useEffect(() => {
    if (!wardId) return;
    const found = wards.find((w) => String(w.id) === String(wardId));
    if (found) {
      setWardData(found);
    } else {
      api.get<any>(`/api/guardian/wards`)
        .then((res) => {
          const list = res?.wards || [];
          const matched = list.find((w: any) => String(w.id) === String(wardId));
          if (matched) setWardData(matched);
        })
        .catch(() => {});
    }
  }, [wardId, wards]);

  const ward = wardData || {
    id: 101,
    name: "Daniel Adeleke",
    grade: "JSS 3A",
    admission_number: "ACD/2021/0456",
    dob: "12 May 2010",
    gender: "Male",
    blood_group: "O+",
    average_score: 78,
    attendance_pct: 92,
    class_position: "3rd",
    guardian_relationship: "Mother",
    guardian_phone: "+234 801 234 5678",
    guardian_email: "adenike.ad@gmail.com",
  };

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
          <div style={{ width: 32 }} />
        </div>

        {/* ── 1. Top Identity Card ── */}
        <section className={styles.profileCard}>
          <div className={styles.avatarLarge}>
            {ward.name ? ward.name.charAt(0).toUpperCase() : "S"}
          </div>
          <h2 className={styles.studentName}>{ward.name}</h2>
          <span className={styles.studentGrade}>{ward.grade}</span>

          <div className={styles.metaRow}>
            <div className={styles.metaCol}>
              <span className={styles.metaLabel}>Admission No.</span>
              <span className={styles.metaVal}>{ward.admission_number || "ACD/2021/0456"}</span>
            </div>
            <div className={styles.metaCol}>
              <span className={styles.metaLabel}>Date of Birth</span>
              <span className={styles.metaVal}>{ward.dob || "12 May 2010"}</span>
            </div>
            <div className={styles.metaCol}>
              <span className={styles.metaLabel}>Gender</span>
              <span className={styles.metaVal}>{ward.gender || "Male"}</span>
            </div>
          </div>
        </section>

        {/* ── 2. Academic Summary Bar ── */}
        <section className={styles.summaryBarCard}>
          <div className={styles.summaryCol}>
            <span className={styles.summaryNum}>{ward.average_score || 78}%</span>
            <span className={styles.summaryLabel}>Average</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryCol}>
            <span className={styles.summaryNum}>{ward.attendance_pct || 92}%</span>
            <span className={styles.summaryLabel}>Attendance</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryCol}>
            <span className={styles.summaryNum}>{ward.class_position || "3rd"}</span>
            <span className={styles.summaryLabel}>Position</span>
          </div>
        </section>

        {/* ── 3. Parent / Guardian Section ── */}
        <section className={styles.sectionCard}>
          <h3 className={styles.sectionHeading}>Parent / Guardian</h3>
          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Name</span>
              <span className={styles.infoValue}>{guardianName || "Mrs. Adenike Adeleke"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Relationship</span>
              <span className={styles.infoValue}>{ward.guardian_relationship || "Mother"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Phone</span>
              <span className={styles.infoValue}>{ward.guardian_phone || "+234 801 234 5678"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Email</span>
              <span className={styles.infoValue}>{ward.guardian_email || "adenike.ad@gmail.com"}</span>
            </div>
          </div>
        </section>

        {/* ── 4. Additional Information ── */}
        <section className={styles.sectionCard}>
          <h3 className={styles.sectionHeading}>Additional Information</h3>
          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Blood Group</span>
              <span className={styles.infoValue}>{ward.blood_group || "O+"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Emergency Contact</span>
              <span className={styles.infoValue}>{ward.guardian_phone || "+234 801 234 5678"}</span>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "0.5rem" }}>
          <Link href="/guardian/performance" className={styles.primaryActionBtn}>
            View Academic Performance
          </Link>
          <Link href="/guardian/attendance" className={styles.secondaryActionBtn}>
            View Attendance Records
          </Link>
        </div>
      </div>
    </RequireRole>
  );
}
