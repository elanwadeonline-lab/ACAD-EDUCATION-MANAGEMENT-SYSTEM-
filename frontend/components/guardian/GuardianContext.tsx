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
}

export interface WardExamEvent {
  id: number;
  title: string;
  subject_name: string;
  date_str: string;
  month: string;
  day: number;
  weekday: string;
  time_str: string;
  venue: string;
  status: "live" | "upcoming" | "completed" | "event";
  instructions?: string;
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
  total_fees: number;
  amount_paid: number;
  balance: number;
  percentage: number;
  items: Array<{
    id: string;
    title: string;
    amount: number;
    paid_date: string;
    status: "paid" | "partial" | "pending";
  }>;
}

export interface WardReportDocument {
  id: string;
  title: string;
  category: "academic" | "attendance" | "behaviour" | "position" | "rank";
  description: string;
  date?: string;
  date_str?: string;
  file_size_kb?: number;
  term?: string;
  downloadUrl?: string;
}

export interface Ward {
  id: number;
  name: string;
  email?: string;
  grade: string;
  admission_number: string;
  avatar_url?: string;
  dob?: string;
  gender?: "Male" | "Female";
  blood_group?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  relationship?: string;
  emergency_contact?: string;
  average_score: number;
  attendance_pct: number;
  class_position: string;
  total_class_students: number;
  completed_exams: number;
  total_exams: number;
  score_delta?: number;
  subjects_performance: WardSubjectPerformance[];
  upcoming_events: WardExamEvent[];
  attendance: WardAttendanceRecord;
  fees: WardFeeRecord;
  reports: WardReportDocument[];
  recent_activity: Array<{
    id: string;
    title: string;
    type: "test" | "assignment" | "attendance" | "notice";
    date_label: string;
    score?: string;
  }>;
  trend_data: Array<{ week: string; score: number }>;
}

export interface GuardianNotification {
  id: string;
  category: "academic" | "assignment" | "school" | "event" | "finance";
  title: string;
  message: string;
  time_ago: string;
  is_read: boolean;
  action_link?: string;
}

export interface GuardianMessageThread {
  id: string;
  sender_name: string;
  sender_role: string;
  sender_avatar?: string;
  category: "teacher" | "school" | "system";
  last_message: string;
  time_label: string;
  unread: boolean;
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
  notifications: GuardianNotification[];
  unreadNotificationCount: number;
  markAllNotificationsRead: () => void;
  messages: GuardianMessageThread[];
  unreadMessageCount: number;
  loading: boolean;
  refreshData: () => Promise<void>;
  guardianName: string;
}

const GuardianContext = createContext<GuardianContextType | null>(null);

const DEFAULT_WARDS: Ward[] = [];
const DEFAULT_NOTIFICATIONS: GuardianNotification[] = [];
const DEFAULT_MESSAGES: GuardianMessageThread[] = [];

export function GuardianProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [activeWardId, setActiveWardIdState] = useState<number | null>(null);
  const [period, setPeriod] = useState<"this_term" | "this_week">("this_term");
  const [childSwitcherOpen, setChildSwitcherOpen] = useState(false);
  const [notifications, setNotifications] = useState<GuardianNotification[]>([]);
  const [messages, setMessages] = useState<GuardianMessageThread[]>([]);
  const [loading, setLoading] = useState(true);

  const guardianName = useMemo(() => {
    if (user?.name) return user.name;
    return "Guardian";
  }, [user]);

  const loadBackendData = useCallback(async () => {
    try {
      setLoading(true);
      const [wardsRes, threadsRes, notifsRes] = await Promise.allSettled([
        api.get<any>("/api/guardian/wards"),
        api.get<any>("/api/guardian/messages/threads"),
        api.get<any>("/api/guardian/notifications"),
      ]);

      if (wardsRes.status === "fulfilled" && Array.isArray(wardsRes.value?.wards)) {
        const liveWards: Ward[] = wardsRes.value.wards.map((bw: any) => ({
          id: Number(bw.student_id || bw.id),
          name: bw.name || bw.student_name || "Student",
          grade: bw.grade || "JSS 3",
          email: bw.email || "",
          admission_number: bw.admission_number || bw.reg_id || `REG-${bw.id}`,
          avatar_url: bw.image_url || undefined,
          dob: bw.dob || undefined,
          gender: bw.gender || undefined,
          blood_group: bw.blood_group || undefined,
          parent_name: bw.parent_name || undefined,
          parent_phone: bw.parent_phone || undefined,
          parent_email: bw.parent_email || undefined,
          relationship: bw.relationship || "Guardian",
          emergency_contact: bw.emergency_contact || undefined,
          average_score: Number(bw.average_score ?? 0),
          attendance_pct: Number(bw.attendance_pct ?? 100),
          class_position: bw.class_position || "—",
          total_class_students: Number(bw.total_class_students ?? 0),
          completed_exams: Number(bw.completed_exams ?? 0),
          total_exams: Number(bw.total_exams ?? 0),
          score_delta: Number(bw.score_delta ?? 0),
          subjects_performance: bw.subjects_performance || [],
          upcoming_events: bw.upcoming_events || [],
          attendance: bw.attendance || {
            percentage: Number(bw.attendance_pct ?? 100),
            present_days: 0,
            absent_days: 0,
            late_days: 0,
            total_days: 0,
            calendar_days: [],
          },
          fees: bw.fees || {
            total_fees: 0,
            amount_paid: 0,
            balance: 0,
            percentage: 100,
            items: [],
          },
          reports: bw.reports || [],
          recent_activity: bw.recent_activity || [],
          trend_data: bw.trend_data || [],
        }));

        setWards(liveWards);
        if (liveWards.length > 0) {
          if (activeWardId == null || !liveWards.some((w) => w.id === activeWardId)) {
            setActiveWardIdState(liveWards[0].id);
          }
        } else {
          setActiveWardIdState(null);
        }
      } else {
        setWards([]);
        setActiveWardIdState(null);
      }

      if (threadsRes.status === "fulfilled" && Array.isArray(threadsRes.value)) {
        const formattedThreads: GuardianMessageThread[] = threadsRes.value.map((t: any) => ({
          id: String(t.id),
          sender_name: t.recipient_name || "Teacher",
          sender_role: t.recipient_role === "teacher" ? `Teacher (${t.student_grade || "Class"})` : "School Admin",
          category: t.category || "teacher",
          last_message: t.last_message || "",
          time_label: t.last_message_at ? new Date(t.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent",
          unread: Number(t.unread_for_guardian) > 0,
          messages: [
            {
              id: `msg-${t.id}-last`,
              sender: "them",
              text: t.last_message || "",
              timestamp: t.last_message_at ? new Date(t.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
            },
          ],
        }));
        setMessages(formattedThreads);
      } else {
        setMessages([]);
      }

      if (notifsRes.status === "fulfilled" && notifsRes.value?.items && Array.isArray(notifsRes.value.items)) {
        const mappedNotifs: GuardianNotification[] = notifsRes.value.items.map((n: any) => ({
          id: String(n.id),
          title: n.type ? n.type.toUpperCase() : "Alert",
          message: n.message || "",
          time_ago: n.created_at ? new Date(n.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recently",
          category: (n.type && ["academic", "assignment", "school", "event", "finance"].includes(n.type)) ? n.type : "academic",
          is_read: Number(n.is_read) === 1,
          action_link: n.link || "/guardian/dashboard",
        }));
        setNotifications(mappedNotifs);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.warn("Guardian data fetch error:", err);
      setWards([]);
      setMessages([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [activeWardId]);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // Real-Time Server-Sent Events (SSE) listener
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/notifications/stream");
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.message) {
            loadBackendData();
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (es) es.close();
    };
  }, [loadBackendData]);

  const activeWard = useMemo(() => {
    if (wards.length === 0) return null;
    return wards.find((w) => w.id === activeWardId) || wards[0] || null;
  }, [wards, activeWardId]);

  const setActiveWardId = useCallback((id: number) => {
    setActiveWardIdState(id);
    setChildSwitcherOpen(false);
  }, []);

  const openChildSwitcher = useCallback(() => setChildSwitcherOpen(true), []);
  const closeChildSwitcher = useCallback(() => setChildSwitcherOpen(false), []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const unreadMessageCount = useMemo(() => {
    return messages.filter((m) => m.unread).length;
  }, [messages]);

  const value = useMemo(
    () => ({
      wards,
      activeWard,
      activeWardId,
      setActiveWardId,
      period,
      setPeriod,
      childSwitcherOpen,
      openChildSwitcher,
      closeChildSwitcher,
      notifications,
      unreadNotificationCount,
      markAllNotificationsRead,
      messages,
      unreadMessageCount,
      loading,
      refreshData: loadBackendData,
      guardianName,
    }),
    [
      wards,
      activeWard,
      activeWardId,
      setActiveWardId,
      period,
      setPeriod,
      childSwitcherOpen,
      openChildSwitcher,
      closeChildSwitcher,
      notifications,
      unreadNotificationCount,
      markAllNotificationsRead,
      messages,
      unreadMessageCount,
      loading,
      loadBackendData,
      guardianName,
    ]
  );

  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
}

export function useGuardian() {
  const ctx = useContext(GuardianContext);
  if (!ctx) {
    throw new Error("useGuardian must be used within a GuardianProvider");
  }
  return ctx;
}
