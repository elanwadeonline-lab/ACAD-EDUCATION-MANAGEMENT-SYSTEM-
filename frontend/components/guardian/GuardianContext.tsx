"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

export interface WardSubjectPerformance {
  subject_name: string;
  subject_code: string;
  score: number;
  grade: string;
  trend: "up" | "down" | "stable";
  color?: string;
  ca_score?: number;
  exam_score?: number;
  status?: string;
}

export interface WardExamEvent {
  id: number;
  title: string;
  subject_name: string;
  date_str?: string;
  month: string;
  day: number;
  weekday: string;
  time_str: string;
  venue: string;
  status: "live" | "upcoming" | "completed" | "event";
  instructions?: string | null;
  exam_date?: string;
  duration_minutes?: number;
  total_questions?: number;
}

export interface WardAttendanceRecord {
  percentage: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  total_days: number;
  calendar_days: Array<{
    day: number;
    status: "present" | "absent" | "late" | "holiday" | "weekend" | "empty";
  }>;
}

export interface WardFeeRecord {
  total_fees?: number;
  amount_paid?: number;
  total?: number;
  paid?: number;
  balance: number;
  percentage?: number;
  due_date?: string;
  items?: Array<{
    id: string | number;
    title: string;
    amount: number;
    paid_date?: string;
    status: "paid" | "partial" | "pending";
    due_date?: string;
  }>;
}

export interface WardReportDocument {
  id: string | number;
  title: string;
  category: "academic" | "attendance" | "behaviour" | "position" | "rank";
  description: string;
  date?: string;
  date_str?: string;
  file_size_kb?: number;
  term?: string;
  downloadUrl?: string;
  url?: string;
}

export interface Ward {
  id: number;
  student_id: number;
  name: string;
  email?: string;
  grade: string;
  admission_number: string;
  reg_id?: string;
  avatar_url?: string;
  image_url?: string;
  dob?: string;
  gender?: "Male" | "Female";
  blood_group?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  relationship?: string;
  emergency_contact?: string;
  school_name?: string;
  average_score: number;
  attendance_pct: number;
  class_position: string;
  total_class_students: number;
  completed_exams: number;
  total_exams: number;
  score_delta?: string | number;
  unread_messages?: number;
  subjects_performance: WardSubjectPerformance[];
  upcoming_events: WardExamEvent[];
  attendance: WardAttendanceRecord;
  fees: WardFeeRecord;
  reports: WardReportDocument[];
  recent_activity: Array<{
    id: string;
    title: string;
    type: "test" | "assignment" | "attendance" | "notice" | "result";
    date_label: string;
    score?: string;
  }>;
  trend_data: Array<{ week: string; score: number }>;
}

export interface GuardianNotification {
  id: string | number;
  category: "academic" | "assignment" | "school" | "event" | "finance" | "attendance" | "exam" | "result";
  title: string;
  message: string;
  time_ago: string;
  is_read: boolean;
  action_link?: string;
  created_at?: string;
}

export interface GuardianMessageThread {
  id: string | number;
  recipient_id?: number;
  guardian_id?: number;
  student_id?: number;
  student_name?: string;
  student_grade?: string;
  sender_name: string;
  sender_role: string;
  sender_avatar?: string;
  category: "teacher" | "school" | "system" | "admin";
  last_message: string;
  time_label: string;
  unread: boolean;
  unread_count?: number;
  messages: Array<{
    id: string;
    sender: "them" | "me";
    text: string;
    timestamp: string;
  }>;
}

interface GuardianContextType {
  wards: Ward[];
  activeWard: Ward | null;
  activeWardId: number | null;
  setActiveWardId: (id: number) => void;
  period: "this_term" | "this_week";
  setPeriod: (period: "this_term" | "this_week") => void;
  childSwitcherOpen: boolean;
  openChildSwitcher: () => void;
  closeChildSwitcher: () => void;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  unreadNotificationCount: number;
  unreadMessageCount: number;
  notifications: GuardianNotification[];
  messages: GuardianMessageThread[];
  loading: boolean;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  refreshData: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const GuardianContext = createContext<GuardianContextType | null>(null);

export function GuardianProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [activeWardId, setActiveWardIdState] = useState<number | null>(null);
  const [period, setPeriod] = useState<"this_term" | "this_week">("this_term");
  const [childSwitcherOpen, setChildSwitcherOpen] = useState(false);
  const [notifications, setNotifications] = useState<GuardianNotification[]>([]);
  const [messages, setMessages] = useState<GuardianMessageThread[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("acad_guardian_theme") as "light" | "dark" | null;
      if (savedTheme) {
        setThemeState(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setThemeState("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch {}
  }, []);

  const setTheme = useCallback((newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("acad_guardian_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  // Load wards, notifications, and messages from backend
  const refreshData = useCallback(async () => {
    if (!user || user.role !== "guardian") return;
    try {
      setLoading(true);

      // 1. Fetch wards list & aggregated stats
      const wardsRes = await api.get<{ wards: Ward[]; stats?: any }>("/api/guardian/wards");
      const fetchedWards = wardsRes?.wards || [];
      setWards(fetchedWards);

      // Set initial active ward if not selected or invalid
      if (fetchedWards.length > 0) {
        const savedWardId = typeof window !== "undefined" ? Number(localStorage.getItem("acad_active_ward_id")) : null;
        const exists = fetchedWards.some((w) => w.id === savedWardId || w.student_id === savedWardId);
        if (savedWardId && exists) {
          setActiveWardIdState(savedWardId);
        } else {
          const firstId = fetchedWards[0].student_id || fetchedWards[0].id;
          setActiveWardIdState(firstId);
          try { localStorage.setItem("acad_active_ward_id", String(firstId)); } catch {}
        }
      }

      // 2. Fetch Notifications
      try {
        const notifRes = await api.get<{ items: any[]; unreadCount: number }>("/api/guardian/notifications");
        if (notifRes?.items) {
          const formattedNotifs: GuardianNotification[] = notifRes.items.map((n: any) => ({
            id: n.id,
            category: (n.type as any) || "academic",
            title: n.title || (n.message ? n.message.slice(0, 40) + "…" : "Notification"),
            message: n.message,
            time_ago: n.created_at ? formatTimeAgo(n.created_at) : "Recently",
            is_read: Boolean(n.is_read),
            action_link: n.link || n.action_link || "/guardian/dashboard",
            created_at: n.created_at,
          }));
          setNotifications(formattedNotifs);
          setUnreadNotificationCount(notifRes.unreadCount || formattedNotifs.filter(n => !n.is_read).length);
        }
      } catch {}

      // 3. Fetch Message Threads
      try {
        const threadsRes = await api.get<any[]>("/api/guardian/messages/threads");
        if (Array.isArray(threadsRes)) {
          const formattedThreads: GuardianMessageThread[] = threadsRes.map((t: any) => {
            const isAdmin = t.recipient_role === "operator" || t.category === "admin" || t.category === "school" || t.category === "system";
            return {
              id: String(t.id),
              recipient_id: t.recipient_id,
              guardian_id: t.guardian_id,
              student_id: t.student_id,
              student_name: t.student_name,
              student_grade: t.student_grade,
              sender_name: t.recipient_name || (isAdmin ? "School Administration" : "Class Teacher"),
              sender_role: isAdmin ? "School Administration" : (t.student_name ? `${t.student_name}'s Teacher` : "Teacher"),
              category: (isAdmin ? "admin" : "teacher") as "teacher" | "school" | "system" | "admin",
              last_message: t.last_message || "No messages yet",
              time_label: t.last_message_at ? formatTimeAgo(t.last_message_at) : "Today",
              unread: Number(t.unread_for_guardian) > 0,
              unread_count: Number(t.unread_for_guardian) || 0,
              messages: [],
            };
          });
          setMessages(formattedThreads);
        }
      } catch {}

    } catch (err) {
      console.warn("[GuardianContext] Failed to load live guardian data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time SSE / event listener
  useEffect(() => {
    if (!user || user.role !== "guardian") return;
    let eventSource: EventSource | null = null;
    try {
      // Auto-request browser push notification permission if default
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        try {
          Notification.requestPermission().catch(() => {});
        } catch {}
      }

      eventSource = new EventSource("/api/notifications/stream");
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && (data.type === "notification" || data.type === "chat_message" || data.type === "attendance" || data.type === "results_published" || data.type === "exam" || data.type === "results")) {
            refreshData();

            // Push native browser notification if enabled
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              const notifTitle = data.type === "chat_message" 
                ? (data.sender_name ? `💬 Message from ${data.sender_name}` : "💬 New Message") 
                : (data.title || "🔔 ACAD Guardian Alert");
              const notifBody = data.text || data.message || "You have a new update";
              try {
                const notif = new Notification(notifTitle, {
                  body: notifBody,
                  icon: "/favicon.ico",
                  badge: "/favicon.ico",
                  tag: data.type === "chat_message" ? `msg-${data.thread_id || Date.now()}` : `notif-${data.id || Date.now()}`,
                });
                notif.onclick = () => {
                  window.focus();
                  if (data.link) {
                    window.location.href = data.link;
                  }
                };
              } catch {}
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [user, refreshData]);

  const setActiveWardId = useCallback((id: number) => {
    setActiveWardIdState(id);
    try {
      localStorage.setItem("acad_active_ward_id", String(id));
    } catch {}
    setChildSwitcherOpen(false);
  }, []);

  const activeWard = useMemo(() => {
    if (!wards || wards.length === 0) return null;
    return wards.find((w) => w.id === activeWardId || w.student_id === activeWardId) || wards[0];
  }, [wards, activeWardId]);

  const unreadMessageCount = useMemo(() => {
    return messages.filter((m) => m.unread).length;
  }, [messages]);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.post("/api/guardian/notifications/mark-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotificationCount(0);
    } catch (err) {
      console.warn("[GuardianContext] Failed to mark notifications as read:", err);
    }
  }, []);

  return (
    <GuardianContext.Provider
      value={{
        wards,
        activeWard,
        activeWardId,
        setActiveWardId,
        period,
        setPeriod,
        childSwitcherOpen,
        openChildSwitcher: () => setChildSwitcherOpen(true),
        closeChildSwitcher: () => setChildSwitcherOpen(false),
        guardianName: user?.name || "Guardian",
        guardianEmail: user?.email || "",
        guardianPhone: user?.phone || "+234 801 234 5678",
        unreadNotificationCount,
        unreadMessageCount,
        notifications,
        messages,
        loading,
        theme,
        setTheme,
        toggleTheme,
        refreshData,
        markAllNotificationsRead,
      }}
    >
      {children}
    </GuardianContext.Provider>
  );
}

export function useGuardian() {
  const context = useContext(GuardianContext);
  if (!context) {
    throw new Error("useGuardian must be used within a GuardianProvider");
  }
  return context;
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 2) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}
