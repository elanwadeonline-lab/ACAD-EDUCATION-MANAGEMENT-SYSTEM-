"use client";

import React from "react";
import Link from "next/link";
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

  const items = (notifications && notifications.length > 0)
    ? notifications
    : [
        {
          id: "n-1",
          title: "Daniel scored 85% in Physics Mock Exam",
          message: "Scored 85/100 in Physics Mock Exam (Class Average: 68%). Great job!",
          category: "academic",
          time_ago: "2 hours ago",
          is_read: false,
          action_link: "/guardian/performance",
        },
        {
          id: "n-2",
          title: "New assignment uploaded for Biology",
          message: "Topic: Cell Division and Genetics. Due date: Monday, June 2nd.",
          category: "assignment",
          time_ago: "Yesterday",
          is_read: false,
          action_link: "/guardian/reports",
        },
        {
          id: "n-3",
          title: "School resumption date: June 3rd, 2025",
          message: "Mid-term break concludes on Monday. Normal classes resume on Tuesday.",
          category: "school",
          time_ago: "2 days ago",
          is_read: true,
          action_link: "/guardian/dashboard",
        },
        {
          id: "n-4",
          title: "PTA Meeting reminder: Tomorrow at 10:00 AM",
          message: "Annual General Parent-Teacher Association Meeting in the Main Auditorium.",
          category: "event",
          time_ago: "2 days ago",
          is_read: true,
          action_link: "/guardian/messages",
        },
        {
          id: "n-5",
          title: "Payment receipt generated for School Fees",
          message: "Receipt #REC-2025-0891 for ₦120,000 has been verified.",
          category: "finance",
          time_ago: "3 days ago",
          is_read: true,
          action_link: "/guardian/fees",
        },
      ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Notifications</h1>
        <button
          type="button"
          className={styles.markReadBtn}
          onClick={markAllNotificationsRead}
        >
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Notification Rows */}
      <div className={styles.notifList}>
        {items.map((item) => {
          let iconBg = "#EFF4FF";
          let iconColor = "#165AF6";
          let iconType = "academic";

          if (item.category === "academic") {
            iconBg = "#ECFDF5";
            iconColor = "#059669";
            iconType = "check";
          } else if (item.category === "assignment") {
            iconBg = "#F5F3FF";
            iconColor = "#7C3AED";
            iconType = "document";
          } else if (item.category === "school") {
            iconBg = "#FFFBEB";
            iconColor = "#D97706";
            iconType = "calendar";
          } else if (item.category === "event") {
            iconBg = "#EFF4FF";
            iconColor = "#165AF6";
            iconType = "users";
          } else if (item.category === "finance") {
            iconBg = "#ECFDF5";
            iconColor = "#059669";
            iconType = "receipt";
          }

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
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
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
                {iconType === "users" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                )}
                {iconType === "receipt" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="10" y2="8" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                    <line x1="6" y1="16" x2="14" y2="16" />
                  </svg>
                )}
              </div>

              <div className={styles.notifTextCol}>
                <span className={styles.notifTitle}>{item.title}</span>
                <span className={styles.notifTime}>{item.time_ago || "Just now"}</span>
              </div>

              {!item.is_read && <span className={styles.unreadDot} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
