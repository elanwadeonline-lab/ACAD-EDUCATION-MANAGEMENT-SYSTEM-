"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import styles from "./page.module.css";

export default function GuardianNotificationsPage() {
  return (
    <RequireRole role="guardian">
      <NotificationsList />
    </RequireRole>
  );
}

function NotificationsList() {
  const { notifications, markAllNotificationsRead } = useGuardian();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "important">("all");

  const items = notifications || [];

  const filteredItems = items.filter((item) => {
    if (activeFilter === "unread") return !item.is_read;
    if (activeFilter === "important") return item.category === "academic" || item.category === "finance" || item.category === "exam";
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Notifications</h1>

        {items.some((i) => !i.is_read) && (
          <button
            type="button"
            className={styles.markReadBtn}
            onClick={markAllNotificationsRead}
          >
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabList}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "all" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "unread" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("unread")}
        >
          Unread ({items.filter((i) => !i.is_read).length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "important" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("important")}
        >
          Important ({items.filter((i) => i.category === "academic" || i.category === "finance" || i.category === "exam").length})
        </button>
      </div>

      {/* Notifications Feed */}
      <div className={styles.notifList}>
        {filteredItems.length === 0 ? (
          <div style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            background: "var(--g-surface, #FFFFFF)",
            border: "1px solid var(--g-border, #E2E8F0)",
            borderRadius: "var(--g-radius-lg, 16px)",
            color: "var(--g-text-secondary, #64748B)"
          }}>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--g-text-primary, #0F172A)", marginBottom: "0.35rem" }}>
              No notifications yet
            </p>
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>
              Live updates on examination completions, attendance roll calls, and school alerts will appear here.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const iconBg = item.category === "attendance" ? "#ECFDF5" : item.category === "finance" ? "#FEF3C7" : item.category === "exam" ? "#F5F3FF" : "#EFF4FF";
            const iconColor = item.category === "attendance" ? "#059669" : item.category === "finance" ? "#D97706" : item.category === "exam" ? "#7C3AED" : "#165AF6";
            const iconType = item.category === "attendance" ? "check" : item.category === "finance" ? "receipt" : item.category === "exam" ? "calendar" : "document";

            return (
              <Link
                key={item.id}
                href={item.action_link || "/guardian/dashboard"}
                className={`${styles.notifCard} ${!item.is_read ? styles.notifUnread : ""}`}
              >
                <div
                  className={styles.notifIconCircle}
                  style={{ background: iconBg, color: iconColor }}
                >
                  {iconType === "check" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {iconType === "document" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                  {iconType === "calendar" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  )}
                  {iconType === "receipt" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
                      <line x1="8" y1="8" x2="16" y2="8" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  )}
                </div>

                <div className={styles.notifTextCol}>
                  <span className={styles.notifTitle}>{item.title}</span>
                  {item.message && <span className={styles.notifMessage}>{item.message}</span>}
                  <span className={styles.notifTime}>{item.time_ago || "Recently"}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
