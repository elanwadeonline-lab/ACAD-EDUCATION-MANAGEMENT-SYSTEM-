"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { fetchWithAuth, API_BASE } from "../../lib/api";
import { DigitalClock } from "./DigitalClock";
import { AcadBrandIcon } from "../icons/Icons";
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

function getNotificationIcon(type: string): string {
  switch (type) {
    case "exam":
    case "subject_published":
      return "📝";
    case "exam_submitted":
      return "✅";
    case "results":
    case "result_released":
      return "📊";
    case "attendance":
      return "📅";
    case "remark_added":
      return "💬";
    default:
      return "📢";
  }
}

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
        {/* Left: Brand Identity */}
        <div className={styles.brandGroup}>
          <Link href="/student/dashboard" className={styles.brandLink}>
            <div className={styles.brandIcon}>
              <AcadBrandIcon width={18} height={18} stroke="#FFFFFF" color="#FFFFFF" />
            </div>
            <span className={styles.brandText}>ACAD</span>
          </Link>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
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
                    style={{ fontSize: "0.75rem", fontWeight: 600, color: "#165AF6", textDecoration: "none" }}
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
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`${styles.chevron} ${userMenuOpen ? styles.chevronOpen : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
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
