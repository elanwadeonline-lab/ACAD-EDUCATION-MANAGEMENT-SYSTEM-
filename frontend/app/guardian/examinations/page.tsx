"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian, type WardExamEvent } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function GuardianExaminationsPage() {
  return (
    <RequireRole role="guardian">
      <ExaminationsList />
    </RequireRole>
  );
}

function ExaminationsList() {
  const { activeWard, openChildSwitcher } = useGuardian();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "completed">("all");
  const [events, setEvents] = useState<WardExamEvent[]>([]);
  const [selectedExam, setSelectedExam] = useState<WardExamEvent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeWard) return;
    setLoading(true);
    const wardId = activeWard.student_id || activeWard.id;

    api.get<any[]>(`/api/guardian/wards/${wardId}/exams`)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          const formatted = res.map((e: any, idx: number) => {
            const d = new Date(e.exam_date || e.scheduled_date || Date.now());
            return {
              id: e.id || idx + 1,
              title: e.title || e.subject_name || "Examination",
              subject_name: e.subject_name || "Subject",
              month: d.toLocaleString("default", { month: "short" }).toUpperCase(),
              day: d.getDate(),
              weekday: d.toLocaleString("default", { weekday: "short" }),
              time_str: e.time_str || `${e.start_time || "09:00"} - ${e.end_time || "11:00"}`,
              venue: e.venue || "CBT Center",
              status: e.status || "upcoming",
              instructions: e.instructions || "Arrive 15 minutes before the start time with valid student registration slip.",
              duration_minutes: e.duration_minutes || 60,
              total_questions: e.total_questions || 40,
            };
          });
          setEvents(formatted);
        } else if (activeWard.upcoming_events && activeWard.upcoming_events.length > 0) {
          setEvents(activeWard.upcoming_events);
        } else {
          setEvents([]);
        }
      })
      .catch(() => {
        if (activeWard.upcoming_events) setEvents(activeWard.upcoming_events);
        else setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [activeWard]);

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>No active ward selected.</div>;
  }

  const filteredEvents = events.filter((ev) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") return ev.status === "upcoming" || ev.status === "live" || ev.status === "event";
    if (activeTab === "completed") return ev.status === "completed";
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Examinations</h1>

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
          Upcoming ({events.filter(e => e.status !== "completed").length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "completed" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          Completed ({events.filter(e => e.status === "completed").length})
        </button>
      </div>

      {/* Event Cards */}
      <div className={styles.examList}>
        {filteredEvents.length === 0 ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.875rem", background: "var(--g-surface, #FFFFFF)", borderRadius: "var(--g-radius-lg, 16px)", border: "1px solid var(--g-border, #E2E8F0)" }}>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--g-text-primary, #0F172A)", marginBottom: "0.35rem" }}>
              No examinations found
            </p>
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>
              Scheduled examinations for this academic term will appear here.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className={styles.examCard}
              onClick={() => setSelectedExam(ev)}
            >
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
                  <span className={styles.timeAndVenue}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{ev.time_str}</span>
                    <span>•</span>
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
          ))
        )}
      </div>

      {/* Interactive Exam Details Bottom Sheet */}
      <AnimatePresence>
        {selectedExam && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedExam(null)}
          >
            <motion.div
              className={styles.sheetContent}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.sheetHandle} />
              <div className={styles.sheetHeader}>
                <h3 className={styles.sheetTitle}>{selectedExam.title}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  style={{ background: "none", border: "none", color: "var(--g-text-muted, #64748B)", cursor: "pointer" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className={styles.sheetDetailsGrid}>
                <div className={styles.gridItem}>
                  <span className={styles.gridLabel}>Date & Time</span>
                  <span className={styles.gridVal}>{selectedExam.day} {selectedExam.month}, {selectedExam.time_str}</span>
                </div>
                <div className={styles.gridItem}>
                  <span className={styles.gridLabel}>Venue / Lab</span>
                  <span className={styles.gridVal}>{selectedExam.venue}</span>
                </div>
                <div className={styles.gridItem}>
                  <span className={styles.gridLabel}>Exam Mode</span>
                  <span className={styles.gridVal}>CBT Digital Assessment</span>
                </div>
                <div className={styles.gridItem}>
                  <span className={styles.gridLabel}>Duration</span>
                  <span className={styles.gridVal}>{selectedExam.duration_minutes || 60} Minutes</span>
                </div>
              </div>

              {selectedExam.instructions && (
                <div style={{ background: "var(--g-primary-subtle, #EFF4FF)", border: "1px solid var(--g-primary-border, #DBEAFE)", borderRadius: "12px", padding: "0.85rem", fontSize: "0.8125rem", color: "var(--g-text-primary, #0F172A)" }}>
                  <div style={{ fontWeight: 700, color: "var(--g-primary, #165AF6)", marginBottom: "0.2rem" }}>
                    Special Exam Instructions:
                  </div>
                  {selectedExam.instructions}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
