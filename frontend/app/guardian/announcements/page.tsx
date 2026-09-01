"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

interface Announcement {
  id: number;
  title: string;
  category: "school" | "academic" | string;
  date: string;
  date_str: string;
  priority?: "normal" | "important";
  content: string;
  action_label?: string;
}

export default function GuardianAnnouncementsPage() {
  return (
    <RequireRole role="guardian">
      <AnnouncementsList />
    </RequireRole>
  );
}

function AnnouncementsList() {
  const router = useRouter();
  const { openChildSwitcher } = useGuardian();
  const [activeTab, setActiveTab] = useState<"all" | "school" | "academic">("all");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<Announcement[]>(`/api/guardian/announcements?category=${activeTab}`)
      .then((res) => {
        if (Array.isArray(res)) {
          setAnnouncements(res);
        } else {
          setAnnouncements([]);
        }
      })
      .catch(() => {
        setAnnouncements([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Announcements</h1>

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

      {/* Category Tabs */}
      <div className={styles.tabList}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "all" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "school" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("school")}
        >
          School News
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "academic" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("academic")}
        >
          Academic
        </button>
      </div>

      {/* Cards Feed */}
      <div className={styles.cardList}>
        {announcements.length === 0 ? (
          <div style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            background: "var(--g-surface, #FFFFFF)",
            border: "1px solid var(--g-border, #E2E8F0)",
            borderRadius: "var(--g-radius-lg, 16px)",
            color: "var(--g-text-secondary, #64748B)"
          }}>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--g-text-primary, #0F172A)", marginBottom: "0.35rem" }}>
              No announcements
            </p>
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>
              Official school and academic announcements will be published here.
            </p>
          </div>
        ) : (
          announcements.map((item) => {
            const isAcademic = item.category === "academic";
            return (
              <div
                key={item.id}
                className={styles.announcementCard}
                onClick={() => setSelectedAnnouncement(item)}
              >
                <div className={styles.cardTopRow}>
                  <span className={`${styles.categoryPill} ${isAcademic ? styles.catAcademic : styles.catSchool}`}>
                    {isAcademic ? "Academic" : "School News"}
                  </span>
                  <span className={styles.dateStr}>{item.date_str}</span>
                </div>

                <h2 className={styles.cardHeading}>{item.title}</h2>
                <p className={styles.cardTeaser}>
                  {item.content.length > 110 ? `${item.content.substring(0, 110)}…` : item.content}
                </p>

                <span className={styles.readMoreLink}>
                  <span>Read Full Announcement</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Reader Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAnnouncement(null)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <span className={`${styles.categoryPill} ${selectedAnnouncement.category === "academic" ? styles.catAcademic : styles.catSchool}`}>
                  {selectedAnnouncement.category === "academic" ? "Academic Announcement" : "School Announcement"}
                </span>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setSelectedAnnouncement(null)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className={styles.modalBody}>
                <div style={{ fontSize: "0.75rem", color: "var(--g-text-muted, #64748B)" }}>
                  Published on {selectedAnnouncement.date_str}
                </div>
                <h3 className={styles.modalTitle}>{selectedAnnouncement.title}</h3>
                <p className={styles.modalFullText}>{selectedAnnouncement.content}</p>

                {selectedAnnouncement.action_label && (
                  <button
                    type="button"
                    className={styles.modalActionBtn}
                    onClick={() => setSelectedAnnouncement(null)}
                  >
                    {selectedAnnouncement.action_label}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
