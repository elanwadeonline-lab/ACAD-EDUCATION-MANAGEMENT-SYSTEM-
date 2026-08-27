"use client";

import React, { useState } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian, type WardExamEvent } from "../../../components/guardian/GuardianContext";
import styles from "./page.module.css";

export default function GuardianExaminationsPage() {
  return (
    <RequireRole role="guardian">
      <ExaminationsList />
    </RequireRole>
  );
}

function ExaminationsList() {
  const { activeWard } = useGuardian();
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "completed">("all");

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>No active ward selected.</div>;
  }

  const events: WardExamEvent[] = activeWard.upcoming_events || [];

  const filteredEvents = events.filter((ev) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") return ev.status === "upcoming" || ev.status === "live" || ev.status === "event";
    if (activeTab === "completed") return ev.status === "completed";
    return true;
  });

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Examinations & Timetable</h1>
      </div>

      {/* Tabs */}
      <div className={styles.tabList}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "all" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All ({events.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "upcoming" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          Live & Upcoming
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "completed" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          Completed
        </button>
      </div>

      {/* Event Cards */}
      <div className={styles.examList}>
        {filteredEvents.map((ev) => (
          <div key={ev.id} className={styles.examCard}>
            <div className={styles.cardMainRow}>
              <div className={styles.dateBox}>
                <span className={styles.dateMonth}>{ev.month}</span>
                <span className={styles.dateDay}>{ev.day}</span>
                <span className={styles.dateWeekday}>{ev.weekday}</span>
              </div>
              <div className={styles.examInfoCol}>
                <div className={styles.examTitleLine}>
                  <span className={styles.examTitle}>{ev.title}</span>
                  {ev.status === "live" && <span className={`${styles.statusPill} ${styles.statusLive}`}>• Live Now</span>}
                  {ev.status === "upcoming" && <span className={`${styles.statusPill} ${styles.statusUpcoming}`}>Upcoming</span>}
                  {ev.status === "completed" && <span className={`${styles.statusPill} ${styles.statusCompleted}`}>Completed</span>}
                </div>
                <span className={styles.timeAndVenue} style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{ev.time_str}</span>
                  <span>•</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{ev.venue}</span>
                </span>
              </div>
            </div>

            {ev.instructions && (
              <div className={styles.instructionsBox}>
                <strong>Note:</strong> {ev.instructions}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
