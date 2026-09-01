"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import { PageHeader, Button } from "../../../components/ui";
import { SearchIcon, MessageIcon } from "../../../components/icons/Icons";
import styles from "./page.module.css";

interface Thread {
  id: number;
  guardian_id: number;
  recipient_id: number;
  student_id: number | null;
  category: string;
  subject?: string;
  last_message: string;
  last_message_at: string;
  unread_for_recipient: number;
  unread_for_guardian: number;
  guardian_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  student_name?: string;
  student_grade?: string;
  student_reg_id?: string;
}

interface Message {
  id: number;
  thread_id: number;
  sender_id: number;
  sender_role: string;
  sender_name?: string;
  text: string;
  is_read: number;
  created_at: string;
}

export default function AdminMessagesPage() {
  return (
    <RequireRole role="operator">
      <AdminMessagesContent />
    </RequireRole>
  );
}

function AdminMessagesContent() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [activeThreadDetail, setActiveThreadDetail] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "billing" | "admissions" | "general">("all");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const loadThreads = useCallback(async () => {
    try {
      const data = await api.getAdminMessageThreads();
      const list = Array.isArray(data) ? data : [];
      setThreads(list);
      if (list.length > 0 && selectedThreadId == null) {
        setSelectedThreadId(Number(list[0].id));
      }
    } catch (err) {
      console.warn("Failed to load admin inquiry threads:", err);
    } finally {
      setLoadingThreads(false);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const loadMessages = useCallback(async (threadId: number) => {
    try {
      setLoadingMessages(true);
      const res = await api.getAdminMessageThread(threadId);
      if (res?.thread) {
        setActiveThreadDetail(res.thread);
      }
      setMessages(Array.isArray(res?.messages) ? res.messages : []);
      // Optimistically update thread unread badge in list
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unread_for_recipient: 0 } : t))
      );
    } catch (err) {
      console.warn("Failed to load thread messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      loadMessages(selectedThreadId);
    }
  }, [selectedThreadId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-Time Server-Sent Events (SSE) listener
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/notifications/stream");
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "chat_message") {
            showToast(`💬 ${data.message || `New message from ${data.sender_name || "Guardian"}`}`);
            loadThreads();
            if (selectedThreadId && Number(data.thread_id) === Number(selectedThreadId)) {
              const incomingMsg: Message = {
                id: Number(data.message_id || Date.now()),
                thread_id: Number(data.thread_id),
                sender_id: Number(data.sender_id || 0),
                sender_role: data.sender_role || "guardian",
                sender_name: data.sender_name || "Guardian",
                text: data.text || data.message || "",
                is_read: 1,
                created_at: data.created_at || new Date().toISOString(),
              };
              setMessages((prev) => {
                if (prev.some((m) => m.id === incomingMsg.id || (m.text === incomingMsg.text && m.sender_role === incomingMsg.sender_role))) {
                  return prev;
                }
                return [...prev, incomingMsg];
              });
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (es) es.close();
    };
  }, [loadThreads, selectedThreadId]);

  const handleSendReply = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || replyText).trim();
    if (!textToSend || !selectedThreadId) return;

    setSending(true);
    try {
      const res = await api.sendAdminMessageReply(selectedThreadId, textToSend);
      setReplyText("");
      const newMsg: Message = {
        id: res?.id || Date.now(),
        thread_id: selectedThreadId,
        sender_id: 1,
        sender_role: "operator",
        sender_name: "School Administration",
        text: textToSend,
        is_read: 0,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      showToast("Reply sent to guardian");
      loadThreads();
    } catch (err: any) {
      showToast(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (t.guardian_name && t.guardian_name.toLowerCase().includes(q)) ||
        (t.student_name && t.student_name.toLowerCase().includes(q)) ||
        (t.student_reg_id && t.student_reg_id.toLowerCase().includes(q)) ||
        (t.last_message && t.last_message.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterTab === "unread") return Number(t.unread_for_recipient) > 0;
      if (filterTab === "billing") return t.category === "finance" || t.category === "fees";
      if (filterTab === "admissions") return t.category === "admissions";
      if (filterTab === "general") return t.category === "school" || t.category === "general";

      return true;
    });
  }, [threads, search, filterTab]);

  const quickReplies = [
    "Thank you for reaching out. School administration is currently reviewing this matter.",
    "Payment has been confirmed and updated on your ward's fee ledger.",
    "Your ward's attendance record has been reconciled and updated.",
    "Please check your Guardian portal under Reports to review the latest broadsheet scorecard.",
  ];

  return (
    <div className={styles.container}>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            padding: "0.65rem 1rem",
            borderRadius: "8px",
            background: "#0F172A",
            color: "#FFFFFF",
            fontSize: "0.8125rem",
            fontWeight: 600,
            zIndex: 1100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toast}
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────── */}
      <PageHeader
        eyebrow="Guardian Communication"
        title="Guardian Inquiries & Helpdesk"
        subtitle="Manage parental inquiries, admissions support, and student academic communications."
        actions={
          <Button variant="secondary" size="sm" onClick={() => loadThreads()}>
            Refresh Inquiries
          </Button>
        }
      />

      <div className={styles.hubGrid}>
        {/* ── Left Pane: Thread List ────────────────────────── */}
        <div className={styles.leftPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.searchBox}>
              <div className={styles.searchIcon}>
                <SearchIcon width={14} height={14} />
              </div>
              <input
                type="text"
                placeholder="Search guardian or ward…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.tabList}>
              {(["all", "unread", "billing", "admissions", "general"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterTab(t)}
                  className={`${styles.tabBtn} ${filterTab === t ? styles.tabBtnActive : ""}`}
                >
                  {t === "all"
                    ? "All Inquiries"
                    : t === "unread"
                    ? `Unread (${threads.filter((th) => Number(th.unread_for_recipient) > 0).length})`
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.threadList}>
            {loadingThreads ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748B", fontSize: "0.8125rem" }}>
                Loading inquiries…
              </div>
            ) : filteredThreads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748B", fontSize: "0.8125rem" }}>
                No inquiries found in this category.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = thread.id === selectedThreadId;
                const hasUnread = Number(thread.unread_for_recipient) > 0;
                const guardianInitial = (thread.guardian_name || "G").charAt(0).toUpperCase();

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(Number(thread.id))}
                    className={`${styles.threadItem} ${isActive ? styles.threadItemActive : ""}`}
                  >
                    <div className={styles.threadAvatar}>{guardianInitial}</div>
                    <div className={styles.threadContent}>
                      <div className={styles.threadTopRow}>
                        <span className={styles.guardianName}>{thread.guardian_name || "Guardian"}</span>
                        <span className={styles.timeLabel}>
                          {thread.last_message_at
                            ? new Date(thread.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" })
                            : "Recent"}
                        </span>
                      </div>

                      {thread.student_name && (
                        <div className={styles.wardBadge}>
                          Ward: {thread.student_name} {thread.student_grade ? `(${thread.student_grade})` : ""}
                        </div>
                      )}

                      <div className={styles.lastMessage}>{thread.last_message || "No messages yet"}</div>
                    </div>
                    {hasUnread && <div className={styles.unreadDot} />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Pane: Active Thread Chat ─────────────────── */}
        <div className={styles.rightPanel}>
          {selectedThreadId && activeThreadDetail ? (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderLeft}>
                  <div className={styles.threadAvatar}>
                    {(activeThreadDetail.guardian_name || "G").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.chatGuardianTitle}>
                      {activeThreadDetail.guardian_name || "Guardian"}
                    </div>
                    <div className={styles.chatGuardianMeta}>
                      {activeThreadDetail.student_name && (
                        <span>
                          <strong>Ward:</strong> {activeThreadDetail.student_name} (
                          {activeThreadDetail.student_grade || "Class"} · {activeThreadDetail.student_reg_id || "REG"})
                        </span>
                      )}
                      {activeThreadDetail.guardian_phone && (
                        <span>· 📞 {activeThreadDetail.guardian_phone}</span>
                      )}
                      {activeThreadDetail.guardian_email && (
                        <span>· ✉️ {activeThreadDetail.guardian_email}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className={styles.messagesArea}>
                {loadingMessages ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#64748B", fontSize: "0.8125rem" }}>
                    Loading message history…
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#64748B", fontSize: "0.8125rem" }}>
                    No messages in this thread yet. Send a reply below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_role === "operator";
                    return (
                      <div
                        key={msg.id}
                        className={isMe ? styles.messageBubbleMe : styles.messageBubbleThem}
                      >
                        <div className={styles.bubbleSender}>
                          {isMe ? "School Administration" : activeThreadDetail.guardian_name || "Guardian"}
                        </div>
                        <div className={styles.bubbleText}>{msg.text}</div>
                        <div className={styles.bubbleTime}>
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Suggestions */}
              <div className={styles.quickRepliesBar}>
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.quickPill}
                    onClick={() => handleSendReply(undefined, qr)}
                    disabled={sending}
                  >
                    + {qr.length > 35 ? qr.slice(0, 35) + "…" : qr}
                  </button>
                ))}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendReply} className={styles.composerArea}>
                <textarea
                  className={styles.composerInput}
                  placeholder="Type official response to guardian… (Press Enter to send, Shift+Enter for new line)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  rows={2}
                />
                <Button type="submit" variant="primary" size="sm" loading={sending} disabled={!replyText.trim()}>
                  Send Reply
                </Button>
              </form>
            </>
          ) : (
            <div className={styles.emptyState}>
              <MessageIcon width={48} height={48} style={{ color: "#94A3B8", marginBottom: "0.75rem" }} />
              <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text, #0F172A)", marginBottom: "0.25rem" }}>
                Select an Inquiry Thread
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-muted, #64748B)", maxWidth: "320px" }}>
                Choose a guardian from the left column to view message history and send official administrative responses.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
