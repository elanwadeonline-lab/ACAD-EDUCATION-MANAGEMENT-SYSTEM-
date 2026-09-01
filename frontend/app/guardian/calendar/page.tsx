"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

interface CalendarItem {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  type: "exam_period" | "holiday" | "event" | "resumption" | "deadline" | "other";
  time_str?: string;
  venue?: string;
}

export default function GuardianCalendarPage() {
  return (
    <RequireRole role="guardian">
      <CalendarContent />
    </RequireRole>
  );
}

function CalendarContent() {
  const router = useRouter();
  const { openChildSwitcher } = useGuardian();
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    setLoading(true);
    api.get<CalendarItem[]>("/api/guardian/calendar")
      .then((res) => {
        if (Array.isArray(res)) {
          setEvents(res);
        } else {
          setEvents([]);
        }
      })
      .catch(() => {
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (filter === "all") return true;
    return ev.type === filter;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Academic Calendar</h1>

        <button
          type="button"
          onClick={openChildSwitcher}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
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
          <span>Wards</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabList}>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === "all" ? styles.tabBtnActive : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === "exam_period" ? styles.tabBtnActive : ""}`}
          onClick={() => setFilter("exam_period")}
        >
          Exams
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === "event" ? styles.tabBtnActive : ""}`}
          onClick={() => setFilter("event")}
        >
          School Events
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === "holiday" ? styles.tabBtnActive : ""}`}
          onClick={() => setFilter("holiday")}
        >
          Holidays
        </button>
      </div>

      {/* Month Carousel Heading */}
      <section className={styles.monthSection}>
        <div className={styles.monthHeaderRow}>
          <h2 className={styles.monthTitle}>{months[currentMonthIndex]} 2026</h2>
          <div className={styles.monthNavGroup}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setCurrentMonthIndex((prev) => Math.max(0, prev - 1))}
              aria-label="Previous month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setCurrentMonthIndex((prev) => Math.min(11, prev + 1))}
              aria-label="Next month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Events Feed */}
        <div className={styles.eventsList}>
          {filteredEvents.length === 0 ? (
            <div style={{
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              background: "var(--g-surface, #FFFFFF)",
              border: "1px solid var(--g-border, #E2E8F0)",
              borderRadius: "var(--g-radius-lg, 16px)",
              color: "var(--g-text-secondary, #64748B)"
            }}>
              <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--g-text-primary, #0F172A)", marginBottom: "0.35rem" }}>
                No events scheduled
              </p>
              <p style={{ fontSize: "0.8125rem", margin: 0 }}>
                Scheduled examinations, school holidays, and PTA fixtures will appear on this calendar.
              </p>
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const d = new Date(ev.start_date);
              const monthStr = d.toLocaleString("default", { month: "short" }).toUpperCase();
              const dayNum = d.getDate();
              const badgeClass = ev.type === "exam_period" ? styles.badgeExam : ev.type === "holiday" ? styles.badgeHoliday : styles.badgeEvent;
              const badgeText = ev.type === "exam_period" ? "Exam" : ev.type === "holiday" ? "Holiday" : "Event";

              return (
                <div key={ev.id} className={styles.eventCard}>
                  <div className={styles.eventDateBox}>
                    <span className={styles.eventMonth}>{monthStr}</span>
                    <span className={styles.eventDay}>{dayNum}</span>
                  </div>

                  <div className={styles.eventInfoCol}>
                    <div className={styles.eventTitleRow}>
                      <span className={styles.eventTitle}>{ev.title}</span>
                      <span className={`${styles.eventBadge} ${badgeClass}`}>{badgeText}</span>
                    </div>
                    <span className={styles.eventMetaLine}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{ev.time_str || "09:00 AM"} • {ev.venue || "Campus"}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}