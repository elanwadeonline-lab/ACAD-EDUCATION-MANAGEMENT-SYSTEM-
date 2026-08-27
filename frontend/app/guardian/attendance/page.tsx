"use client";

import React, { useState } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import styles from "./page.module.css";

export default function GuardianAttendancePage() {
  return (
    <RequireRole role="guardian">
      <AttendanceContent />
    </RequireRole>
  );
}

function AttendanceContent() {
  const { activeWard, period, setPeriod } = useGuardian();
  const [currentMonthIndex, setCurrentMonthIndex] = useState(4); // May (0-indexed 4)

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>No active ward selected.</div>;
  }

  const att = activeWard.attendance || {
    percentage: 92,
    present_days: 46,
    absent_days: 4,
    late_days: 0,
    total_days: 50,
  };

  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  // May 2025 calendar days mapping
  // May 1, 2025 starts on Thursday (index 4)
  const calendarDays = [
    { day: 27, currentMonth: false, status: "empty" },
    { day: 28, currentMonth: false, status: "empty" },
    { day: 29, currentMonth: false, status: "empty" },
    { day: 30, currentMonth: false, status: "empty" },
    { day: 1, currentMonth: true, status: "present" },
    { day: 2, currentMonth: true, status: "present" },
    { day: 3, currentMonth: true, status: "weekend" },
    { day: 4, currentMonth: true, status: "weekend" },
    { day: 5, currentMonth: true, status: "present" },
    { day: 6, currentMonth: true, status: "present" },
    { day: 7, currentMonth: true, status: "present" },
    { day: 8, currentMonth: true, status: "present" },
    { day: 9, currentMonth: true, status: "present" },
    { day: 10, currentMonth: true, status: "weekend" },
    { day: 11, currentMonth: true, status: "weekend" },
    { day: 12, currentMonth: true, status: "present" },
    { day: 13, currentMonth: true, status: "absent" },
    { day: 14, currentMonth: true, status: "present" },
    { day: 15, currentMonth: true, status: "present" },
    { day: 16, currentMonth: true, status: "present" },
    { day: 17, currentMonth: true, status: "weekend" },
    { day: 18, currentMonth: true, status: "weekend" },
    { day: 19, currentMonth: true, status: "present" },
    { day: 20, currentMonth: true, status: "present" },
    { day: 21, currentMonth: true, status: "present" },
    { day: 22, currentMonth: true, status: "present" },
    { day: 23, currentMonth: true, status: "holiday" },
    { day: 24, currentMonth: true, status: "weekend" },
    { day: 25, currentMonth: true, status: "weekend" },
    { day: 26, currentMonth: true, status: "present" },
    { day: 27, currentMonth: true, status: "present" },
    { day: 28, currentMonth: true, status: "present" },
    { day: 29, currentMonth: true, status: "present" },
    { day: 30, currentMonth: true, status: "present" },
    { day: 31, currentMonth: true, status: "weekend" },
  ];

  // Donut circumference
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const pct = att.percentage || 92;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Attendance</h1>
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

      {/* ── 1. Donut Gauge Card & Legend ── */}
      <section className={styles.gaugeCard}>
        <div className={styles.donutBox}>
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
              stroke="#059669"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className={styles.donutCenter}>
            <span className={styles.donutValueText}>{pct}%</span>
            <span className={styles.donutSubLabel}>Overall</span>
          </div>
        </div>

        <div className={styles.legendCol}>
          <div className={styles.legendItem}>
            <span className={styles.dotPresent} />
            <span className={styles.legendLabel}>Present</span>
            <span className={styles.legendDays}>{att.present_days || 46} days</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.dotAbsent} />
            <span className={styles.legendLabel}>Absent</span>
            <span className={styles.legendDays}>{att.absent_days || 4} days</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.dotLate} />
            <span className={styles.legendLabel}>Late</span>
            <span className={styles.legendDays}>{att.late_days || 0} days</span>
          </div>
        </div>
      </section>

      {/* ── 2. Attendance Calendar ── */}
      <section className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <span className={styles.calendarMonthTitle}>Attendance Calendar</span>
          <button type="button" className={styles.monthNavBtn}>
            <span>May 2025</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className={styles.calendarGrid}>
          {daysOfWeek.map((d, i) => (
            <div key={i} className={styles.dayHeaderCell}>
              {d}
            </div>
          ))}

          {calendarDays.map((item, idx) => {
            const isDim = !item.currentMonth;
            const isPresent = item.status === "present";
            const isAbsent = item.status === "absent";
            const isLate = item.status === "late";
            const isHoliday = item.status === "holiday";

            return (
              <div
                key={idx}
                className={`${styles.dateCell} ${isDim ? styles.dateDim : ""}`}
              >
                {isPresent && <span className={styles.circlePresent}>{item.day}</span>}
                {isAbsent && <span className={styles.circleAbsent}>{item.day}</span>}
                {isLate && <span className={styles.circleLate}>{item.day}</span>}
                {isHoliday && <span className={styles.circleHoliday}>{item.day}</span>}
                {!isPresent && !isAbsent && !isLate && !isHoliday && (
                  <span className={styles.circlePlain}>{item.day}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
