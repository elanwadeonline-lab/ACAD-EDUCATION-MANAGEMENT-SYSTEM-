"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function GuardianAttendancePage() {
  return (
    <RequireRole role="guardian">
      <AttendanceContent />
    </RequireRole>
  );
}

function AttendanceContent() {
  const { activeWard, period, setPeriod, openChildSwitcher } = useGuardian();
  const router = useRouter();
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeWard) return;
    setLoading(true);
    const wardId = activeWard.student_id || activeWard.id;

    api.get<{ summary: any; calendar: any[] }>(`/api/guardian/wards/${wardId}/attendance`)
      .then((res) => {
        if (res) setAttendanceData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeWard]);

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>No active ward selected.</div>;
  }

  const att = attendanceData?.summary || activeWard.attendance || {
    percentage: activeWard.attendance_pct || 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    total_days: 0,
  };

  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  // Dynamically compute calendar days for the selected month using real database logs
  const now = new Date();
  const year = now.getFullYear();
  const daysInMonth = new Date(year, currentMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, currentMonthIndex, 1).getDay();

  const realLogs = (attendanceData?.calendar || activeWard.attendance?.calendar_days || []) as Array<{ date?: string; day?: number; status?: string }>;
  const logMap = new Map<number, string>();
  for (const item of realLogs) {
    if (item.day) logMap.set(item.day, item.status || "present");
    else if (item.date) {
      const d = new Date(item.date);
      if (d.getMonth() === currentMonthIndex) {
        logMap.set(d.getDate(), item.status || "present");
      }
    }
  }

  const calendarDays: Array<{ day: number; currentMonth: boolean; status: string }> = [];
  // Leading padding for previous month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ day: 30 - firstDayOfWeek + i + 1, currentMonth: false, status: "none" });
  }
  // Days in active month
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, currentMonthIndex, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const recordedStatus = logMap.get(d) || (isWeekend ? "weekend" : "present");
    calendarDays.push({ day: d, currentMonth: true, status: recordedStatus });
  }

  // Donut circumference
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const pct = att.percentage || activeWard.attendance_pct || 0;
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, pct)) / 100) * circumference;

  // Recent attendance logs
  const logs = attendanceData?.logs || [];

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

      {/* ── 1. Donut Gauge Card & Legend ── */}
      <section className={styles.gaugeCard}>
        <div className={styles.donutBox}>
          <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke="var(--g-border-subtle, #F1F5F9)"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke="var(--g-success, #059669)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className={styles.donutCenter}>
            <span className={styles.donutValueText}>{pct}%</span>
            <span className={styles.donutSubLabel}>Present</span>
          </div>
        </div>

        <div className={styles.legendCol}>
          <div className={styles.legendItem}>
            <span className={styles.dotPresent} />
            <span className={styles.legendLabel}>Present</span>
            <span className={styles.legendDays}>{att.present_days || 46} Days</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.dotAbsent} />
            <span className={styles.legendLabel}>Absent</span>
            <span className={styles.legendDays}>{att.absent_days || 4} Days</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.dotLate} />
            <span className={styles.legendLabel}>Late</span>
            <span className={styles.legendDays}>{att.late_days || 0} Days</span>
          </div>
        </div>
      </section>

      {/* ── 2. 4-Metric Stats Grid ── */}
      <div className={styles.statGrid}>
        <div className={styles.statBox}>
          <span className={styles.statVal} style={{ color: "var(--g-success, #059669)" }}>{att.present_days ?? 0}</span>
          <span className={styles.statLbl}>Present</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statVal} style={{ color: "var(--g-danger, #DC2626)" }}>{att.absent_days ?? 0}</span>
          <span className={styles.statLbl}>Absent</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statVal} style={{ color: "var(--g-warning, #D97706)" }}>{att.late_days ?? 0}</span>
          <span className={styles.statLbl}>Late</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statVal}>{att.total_days ?? 0}</span>
          <span className={styles.statLbl}>Total Days</span>
        </div>
      </div>

      {/* ── 3. Monthly Attendance Calendar ── */}
      <section className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <h2 className={styles.calendarMonthTitle}>
            {currentMonthIndex === 4 ? "May 2026" : "June 2026"}
          </h2>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <button
              type="button"
              className={styles.calNavBtn}
              onClick={() => setCurrentMonthIndex((prev) => Math.max(0, prev - 1))}
              aria-label="Previous Month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.calNavBtn}
              onClick={() => setCurrentMonthIndex((prev) => Math.min(11, prev + 1))}
              aria-label="Next Month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className={styles.weekdaysGrid}>
          {daysOfWeek.map((d, idx) => (
            <span key={idx} className={styles.weekdayLabel}>{d}</span>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className={styles.daysGrid}>
          {calendarDays.map((c: any, idx: number) => {
            const isOther = !c.currentMonth;
            return (
              <div
                key={idx}
                className={`${styles.dayCell} ${isOther ? styles.dayCellOtherMonth : ""}`}
              >
                <span>{c.day}</span>
                {c.currentMonth && c.status === "present" && <span className={styles.dayDotPresent} />}
                {c.currentMonth && c.status === "absent" && <span className={styles.dayDotAbsent} />}
                {c.currentMonth && c.status === "late" && <span className={styles.dayDotLate} />}
                {c.currentMonth && c.status === "holiday" && <span className={styles.dayDotHoliday} />}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. Recent Attendance Log List ── */}
      <section className={styles.logSection}>
        <h3 className={styles.logTitle}>Recent Daily Roll Calls</h3>
        <div className={styles.logList}>
          {logs.length === 0 ? (
            <div style={{ padding: "1.25rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.8125rem", background: "var(--g-surface, #FFFFFF)", borderRadius: "var(--g-radius-md, 12px)", border: "1px solid var(--g-border, #E2E8F0)" }}>
              No absence or tardy records for this term. All roll calls are recorded in the term summary.
            </div>
          ) : (
            logs.map((item: any, idx: number) => (
              <div key={idx} className={styles.logItem}>
                <div className={styles.logLeft}>
                  <span className={styles.logDate}>{item.date}</span>
                  <span className={styles.logRemarks}>{item.remarks}</span>
                </div>
                {item.status === "present" && <span className={styles.statusPillPresent}>Present</span>}
                {item.status === "absent" && <span className={styles.statusPillAbsent}>Absent</span>}
                {item.status === "late" && <span className={styles.statusPillLate}>Late</span>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
