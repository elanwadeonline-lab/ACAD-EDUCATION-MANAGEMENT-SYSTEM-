"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { fetchWithAuth, buildAuthHeaders, API_BASE } from "../../lib/api";
import { DigitalClock } from "./DigitalClock";
import { AcadBrandIcon, BellIcon, ChevronDownIcon, SettingsIcon, LogOutIcon, StudentNotificationSymbol } from "../icons/StudentIcons";
import styles from "./StudentTopBar.module.css";

type StudentNotification = {
  id: number;
  type: string;
  message: string;
  link: string | null;
  is_read: number;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "Just now";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 15) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function getNotificationIcon(type: string): React.ReactNode {
  return <StudentNotificationSymbol type={type} size={15} />;
}

const STUDENT_NAV_ITEMS = [
  { href: "/student/dashboard", label: "Overview" },
  { href: "/student/results", label: "Results & Analytics" },
  { href: "/student/report-card", label: "Report Card" },
  { href: "/student/practice", label: "Practice" },
  { href: "/student/offline-assignments", label: "Offline Hub" },
];

export function StudentTopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifyMenuOpen, setNotifyMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadNotifications = async () => {
    try {
      const res = await fetchWithAuth<any>("/api/notifications", {}, { redirectOn401: false });
      if (res) {
        const items: StudentNotification[] = res.items || (Array.isArray(res.data?.items) ? res.data.items : []);
        setNotifications(items.slice(0, 8));
        const unread = typeof res.unreadCount === "number"
          ? res.unreadCount
          : items.filter((i) => !i.is_read).length;
        setUnreadCount(unread);
      }
    } catch {
      // Background poll failure is non-blocking
    }
  };

  useEffect(() => {
    loadNotifications();
    const pollInterval = setInterval(loadNotifications, 10000);

    const controller = new AbortController();
    abortRef.current = controller;

    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;
    const BASE_DELAY_MS = 1000;
    const MAX_DELAY_MS = 30000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/notifications/stream`, {
          credentials: "include",
          headers: buildAuthHeaders(undefined, "student", false),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          if (!controller.signal.aborted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, reconnectAttempts));
            reconnectAttempts++;
            reconnectTimer = setTimeout(connectSSE, delay);
          }
          return;
        }

        reconnectAttempts = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;

            const rawJson = dataLine.slice(6).trim();
            if (!rawJson || rawJson === ": keepalive") continue;

            try {
              const payload = JSON.parse(rawJson);
              if (payload?.id || payload?.message) {
                setUnreadCount((prev) => prev + 1);
                setNotifications((prev) => [payload as StudentNotification, ...prev.filter((p) => p.id !== payload.id)].slice(0, 8));
                window.dispatchEvent(
                  new CustomEvent("notification_received", { detail: payload })
                );
              }
            } catch {
              // Parse error ignored
            }
          }
        }

        if (!controller.signal.aborted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, reconnectAttempts));
          reconnectAttempts++;
          reconnectTimer = setTimeout(connectSSE, delay);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        if (!controller.signal.aborted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, reconnectAttempts));
          reconnectAttempts++;
          reconnectTimer = setTimeout(connectSSE, delay);
        }
      }
    };

    connectSSE();

    const handler = (e: any) => {
      const detail = e.detail;
      if (detail && detail.id) {
        setNotifications((prev) => [detail, ...prev.filter((p) => p.id !== detail.id)].slice(0, 8));
      } else {
        loadNotifications();
      }
    };
    window.addEventListener("notification_received", handler);

    return () => {
      clearInterval(pollInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      controller.abort();
      window.removeEventListener("notification_received", handler);
    };
  }, []);

  const handleItemClick = async (n: StudentNotification) => {
    setNotifyMenuOpen(false);
    if (!n.is_read) {
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: 1 } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await fetchWithAuth(`/api/notifications/${n.id}/read`, { method: "PUT" }, { redirectOn401: false });
      } catch {}
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  const handleMarkAllRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    try {
      await fetchWithAuth("/api/notifications/read", { method: "PUT" }, { redirectOn401: false });
    } catch {}
  };

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(e.target as Node)) {
        setNotifyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* Left: Brand Identity & Primary Portal Navigation */}
        <div className={styles.brandGroup}>
          <Link href="/student/dashboard" className={styles.brandLink}>
            <div className={styles.brandIcon}>
              <AcadBrandIcon width={26} height={26} />
            </div>
            <span className={styles.brandText}>Acqad</span>
          </Link>

          <nav aria-label="Student portal navigation" className={styles.portalNav}>
            {STUDENT_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#92400E" : "#475569",
                    background: isActive ? "rgba(146, 64, 14, 0.08)" : "transparent",
                    padding: "0.375rem 0.6875rem",
                    borderRadius: "6px",
                    textDecoration: "none",
                    transition: "background 120ms ease, color 120ms ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Real-Time Clock, Notifications & Candidate Account Options */}
        <div className={styles.rightGroup}>
          {/* Live System Clock */}
          <div className={styles.clockWrapper}>
            <DigitalClock />
          </div>

          {/* Interactive Notification Bell with Badge & Dropdown */}
          <div className={styles.notifyWrapper} ref={notifyRef}>
            <button
              type="button"
              className={styles.notifyBtn}
              title={`${unreadCount} academic notifications`}
              aria-label={`${unreadCount} notifications`}
              aria-expanded={notifyMenuOpen}
              onClick={() => setNotifyMenuOpen((v) => !v)}
            >
              <BellIcon width={16} height={16} />
              {unreadCount > 0 && (
                <span className={styles.notifyBadge}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notifyMenuOpen && (
              <div className={styles.notifyMenu}>
                <div className={styles.notifyHeader}>
                  <span className={styles.notifyTitle}>Academic Updates</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className={styles.notifyClearBtn}
                      onClick={handleMarkAllRead}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className={styles.notifyList}>
                  {notifications.length === 0 ? (
                    <div className={styles.notifyEmpty}>
                      No academic notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = !n.is_read;
                      return (
                        <div
                          key={n.id}
                          className={`${styles.notifyItem} ${isUnread ? styles.notifyItemUnread : ""}`}
                          onClick={() => handleItemClick(n)}
                        >
                          <div className={styles.notifyIconBox}>
                            {getNotificationIcon(n.type)}
                          </div>
                          <div className={styles.notifyItemContent}>
                            <span className={`${styles.notifyItemText} ${isUnread ? styles.notifyItemTextBold : ""}`}>
                              {n.message}
                            </span>
                            <div className={styles.notifyItemFooter}>
                              <span className={styles.notifyItemTime}>
                                {timeAgo(n.created_at)}
                              </span>
                              {isUnread && <span className={styles.notifyUnreadDot} />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{ padding: "0.5rem", borderTop: "1px solid var(--color-border, #E2E8F0)", textAlign: "center" }}>
                  <Link
                    href="/student/notifications"
                    onClick={() => setNotifyMenuOpen(false)}
                    style={{ fontSize: "0.75rem", fontWeight: 600, color: "#92400E", textDecoration: "none" }}
                  >
                    View all notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill Menu */}
          <div className={styles.userWrapper} ref={menuRef}>
            <button
              type="button"
              className={styles.userBtn}
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-expanded={userMenuOpen}
              aria-label="Candidate account options"
            >
              <div className={styles.userAvatar}>
                {user?.name?.charAt(0)?.toUpperCase() ?? "S"}
              </div>
              <div className={styles.userInfoCol}>
                <span className={styles.userName}>
                  {user?.name?.split(" ")[0] ?? "Student"}
                </span>
                {user?.grade && (
                  <span className={styles.userGradeSub}>{user.grade}</span>
                )}
              </div>
              <ChevronDownIcon width={12} height={12} className={`${styles.chevron} ${userMenuOpen ? styles.chevronOpen : ""}`} />
            </button>

            {userMenuOpen && (
              <div className={styles.userMenu}>
                <div className={styles.menuHeader}>
                  <div className={styles.menuName}>{user?.name ?? "Student"}</div>
                  <div className={styles.menuMeta}>
                    {user?.reg_id || user?.email || "Candidate"}
                  </div>
                  {user?.grade && (
                    <div className={styles.menuGradePill}>{user.grade}</div>
                  )}
                </div>
                <div className={styles.menuDivider} />
                <Link
                  href="/student/settings"
                  className={styles.menuItem}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <SettingsIcon width={14} height={14} />
                  Profile &amp; Settings
                </Link>
                <button
                  type="button"
                  className={`${styles.menuItem} ${styles.logoutItem}`}
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await logout();
                    window.location.href = "/";
                  }}
                >
                  <LogOutIcon width={14} height={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
