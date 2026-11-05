"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { NotificationBell } from "./NotificationBell";
import { DigitalClock } from "./DigitalClock";
import { AcademicSwitcher } from "./AcademicSwitcher";
import styles from "./TopBar.module.css";

type Props = {
  onMenuClick: () => void;
  title?: string;
};

const BREADCRUMB_MAP: Record<string, string> = {
  "/teacher/dashboard":   "Dashboard",
  "/teacher/questions":   "Question Bank",
  "/teacher/results":     "Results",
  "/teacher/students":    "Students",
  "/teacher/grading":     "Grading",
  "/teacher/report-card": "Report Cards",
  "/teacher/attendance":  "Attendance",
  "/teacher/assignments": "Assignments",
  "/teacher/content":     "Content",
  "/teacher/settings":    "Settings",
  "/teacher/messages":    "Messages",
  "/teacher/notifications": "Notifications",
  "/student/dashboard":   "Dashboard",
  "/student/exam":        "Exam Room",
  "/student/results":     "Results",
  "/student/settings":    "Settings",
  "/ADMIN/dashboard":         "Dashboard",
  "/ADMIN/subjects":          "Subjects",
  "/ADMIN/timetable":         "Timetable",
  "/ADMIN/users":             "Users",
  "/ADMIN/settings":          "Settings",
  "/ADMIN/academic-sessions": "Academic Sessions",
  "/ADMIN/class-teachers":    "Class Teachers",
  "/ADMIN/report-card":       "Report Cards",
  "/ADMIN/annual-results":    "Annual Results",
  "/ADMIN/messages":          "Messages",
  "/ADMIN/notifications":     "Notifications",
  "/ADMIN/content":           "Content",
  "/guardian/dashboard":      "Dashboard",
  "/guardian/wards":          "My Wards",
  "/guardian/links":          "Guardian Links",
  "/guardian/calendar":       "Calendar",
  "/guardian/notifications":  "Notifications",
};

export function TopBar({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const roleLabel =
    user?.role === "operator" ? "Operator"
    : user?.role === "teacher" ? "Teacher"
    : user?.role === "guardian" ? "Guardian"
    : "Student";

  // Get initials from name
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className={styles.topbar} role="banner">
      {/* Left — mobile hamburger + digital clock */}
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          aria-expanded={undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className={styles.clockWrapper}>
          <DigitalClock />
        </div>
      </div>

      {/* Right — session switcher, notifications, user */}
      <div className={styles.right} role="toolbar" aria-label="Header actions">
        {/* Academic Session & Term switcher */}
        {user && <AcademicSwitcher />}

        <div className={styles.divider} role="separator" />

        {/* Notification bell — operators and teachers only */}
        {(user?.role === "operator" || user?.role === "teacher" || user?.role === "guardian") && (
          <NotificationBell
            role={
              user.role === "operator" ? "ADMIN"
              : user.role === "guardian" ? "guardian"
              : "teacher"
            }
          />
        )}

        {/* User chip */}
        <div className={styles.userChipWrap} ref={menuRef}>
          <button
            className={styles.userChip}
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-label="User account menu"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
          >
            <div
              className={styles.avatar}
              aria-hidden="true"
              style={{ background: "var(--color-primary)" }}
            >
              {initials}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user?.name ?? "—"}</span>
              <span className={styles.userRole}>{roleLabel}</span>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={`${styles.chevron} ${userMenuOpen ? styles.chevronOpen : ""}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className={styles.userDropdown} role="menu">
              {/* User header */}
              <div className={styles.dropdownHeader}>
                <div
                  className={styles.dropdownAvatar}
                  aria-hidden="true"
                  style={{ background: "var(--color-primary)" }}
                >
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.dropdownName}>{user?.name ?? "—"}</div>
                  <div className={styles.dropdownEmail}>{user?.email ?? ""}</div>
                </div>
              </div>

              {/* Sign out */}
              <button
                className={styles.dropdownItem}
                role="menuitem"
                onClick={async () => {
                  setUserMenuOpen(false);
                  await logout();
                  window.location.href = "/";
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
