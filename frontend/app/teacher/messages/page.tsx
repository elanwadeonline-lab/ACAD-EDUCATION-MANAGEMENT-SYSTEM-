"use client";

import React, { useState, useEffect, useRef } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import styles from "./page.module.css";
import {subscribeSchoolEvents} from "../../../lib/live-events";

interface TeacherThread {
  id: number;
  guardian_id: number;
  guardian_name: string;
  guardian_email: string;
  student_id: number;
  student_name: string;
  student_grade: string;
  subject: string;
  category: string;
  last_message: string;
  last_message_at: string;
  unread_for_recipient: number;
}

interface Message {
  id: number;
  sender_id: number;
  sender_role: "guardian" | "teacher" | "operator";
  sender_name: string;
  text: string;
  created_at: string;
}

export default function TeacherMessagesPage() {
  return (
    <RequireRole role="teacher">
      <TeacherMessagesContent />
    </RequireRole>
  );
}

function TeacherMessagesContent() {
  const [threads, setThreads] = useState<TeacherThread[]>([]);
  const [activeThread, setActiveThread] = useState<TeacherThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const activeId = useRef<number | null>(null);
  const sendLock = useRef(false);
  const selectionVersion = useRef(0);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const res = await api.get<TeacherThread[]>("/api/teacher/messages/threads");
      if (Array.isArray(res)) {
        setThreads(res);
      }
    } catch (err) {
      setError("Unable to load conversations. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const handleSelectThread = async (t: TeacherThread) => {
    if (sendLock.current) return;
    const version = ++selectionVersion.current;
    activeId.current = t.id;
    setActiveThread(t); setMessages([]); setNewReply(""); setError("");
    try {
      const res = await api.get<{ thread: TeacherThread; messages: Message[] }>(`/api/teacher/messages/threads/${t.id}`);
      if (version === selectionVersion.current && res?.messages) {
        setMessages(res.messages);
      }
    } catch (err) {
      if (version === selectionVersion.current) setError("Unable to load this conversation. Select it again to retry.");
    }
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Real-time SSE live message listener inside teacher chat
  useEffect(() => {
    return subscribeSchoolEvents(data=>{
      if(data.type!=='chat_message')return;
      void loadThreads();
      if(activeThread&&Number(data.thread_id)===Number(activeThread.id)){
        const id=activeThread.id;
        void api.get<{messages:Message[]}>(`/api/teacher/messages/threads/${id}`).then(result=>{
          if(activeId.current===id&&result?.messages)setMessages(current=>[...new Map([...current,...result.messages].map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id));
        }).catch(()=>{});
      }
    });
  }, [activeThread]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !activeThread || sendLock.current) return;
    const threadId = activeThread.id;
    const textToSend = newReply.trim();
    sendLock.current = true; setSending(true); setError("");
    try {
      const saved = await api.post<Message>(`/api/teacher/messages/threads/${threadId}`, { text: textToSend });
      if (!saved) throw new Error("Unable to save this reply. Please try again.");
      if (activeId.current === threadId) {
        setMessages(prev => prev.some(m => m.id === saved.id) ? prev : [...prev, saved]);
        setNewReply("");
      }
      void loadThreads();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send. Your draft is kept; try again.");
    } finally {
      sendLock.current = false; setSending(false);
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.guardian_name.toLowerCase().includes(q) ||
      t.student_name.toLowerCase().includes(q) ||
      (t.last_message && t.last_message.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Messages</h1>
      </div>

      <div className={styles.searchBox}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          aria-label="Search conversations"
          placeholder="Search by parent name, student name, or message..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.threadsGrid} data-active={!!activeThread}>
        {/* Threads List */}
        <div className={styles.threadsSidebar}>
          {loading && <div style={{ padding: "1.5rem", textAlign: "center", color: "#94A3B8" }}>Loading inquiries...</div>}
          {!loading && filteredThreads.length === 0 && (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#94A3B8", fontSize: "0.875rem" }}>
              No messages found.
            </div>
          )}
          {filteredThreads.map((t) => {
            const isActive = activeThread?.id === t.id;
            return (
              <div
                key={t.id}
                className={`${styles.threadItem} ${isActive ? styles.threadItemActive : ""}`}
                role="button" tabIndex={0} aria-pressed={isActive} aria-disabled={sending}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void handleSelectThread(t); } }}
                onClick={() => void handleSelectThread(t)}
              >
                <div className={styles.avatar}>{t.guardian_name.charAt(0)}</div>
                <div className={styles.threadInfo}>
                  <div className={styles.threadNameRow}>
                    <span className={styles.senderName}>{t.guardian_name}</span>
                    <span className={styles.timeLabel}>
                      {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                    </span>
                  </div>
                  <div className={styles.wardLabel}>
                    Ward: <strong>{t.student_name}</strong> ({t.student_grade || "JSS 3"})
                  </div>
                  <p className={styles.lastMsg}>{t.last_message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Active Area */}
        <div className={styles.chatArea}>
          {activeThread ? (
            <>
              <div className={styles.chatHeader}>
                <button className={styles.backButton} disabled={sending} onClick={()=>{selectionVersion.current++;activeId.current=null;setActiveThread(null);setMessages([]);}}>← Conversations</button>
                <div className={styles.chatHeaderTitle}>{activeThread.guardian_name}</div>
                <div className={styles.chatHeaderSub}>
                  Parent of <strong>{activeThread.student_name}</strong> • {activeThread.guardian_email}
                </div>
              </div>

              <div className={styles.chatMessages} ref={chatMessagesRef}>
                {messages.map((m) => {
                  const isMe = m.sender_role === "teacher";
                  return (
                    <div
                      key={m.id}
                      className={isMe ? styles.bubbleTeacher : styles.bubbleGuardian}
                    >
                      <p style={{ margin: 0 }}>{m.text}</p>
                      <span style={{ fontSize: "0.625rem", opacity: 0.7, display: "block", textAlign: isMe ? "right" : "left", marginTop: 4 }}>
                        {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <form className={styles.chatInputRow} onSubmit={handleSendReply}>
                <input
                  type="text"
                  maxLength={4000}
                  aria-label="Reply to parent"
                  placeholder="Type your response to parent..."
                  className={styles.chatInput}
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" className={styles.sendBtn} disabled={sending}>
                  {sending ? "..." : "Send Reply"}
                </button>
              </form>
            </>
          ) : (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ marginTop: "1rem" }}>Select a conversation to read and reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
