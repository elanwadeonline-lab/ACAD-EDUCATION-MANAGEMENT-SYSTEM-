"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian, type GuardianMessageThread } from "../../../components/guardian/GuardianContext";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

interface Contact {
  id: number;
  name: string;
  role: string;
  role_label: string;
  student_id: number;
  category: "teacher" | "admin" | "school";
}

export default function GuardianMessagesPage() {
  return (
    <RequireRole role="guardian">
      <MessagesList />
    </RequireRole>
  );
}

function MessagesList() {
  const { messages, activeWard, refreshData, openChildSwitcher } = useGuardian();
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<"all" | "teacher" | "admin">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeThread, setActiveThread] = useState<GuardianMessageThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<Array<{ id: string; sender: "me" | "them"; text: string; timestamp: string }>>([]);
  const [newMsgText, setNewMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const displayThreads = messages || [];

  const filteredThreads = useMemo(() => {
    return displayThreads.filter((m) => {
      const isAdmin = m.category === "admin" || m.category === "school" || m.sender_role === "School Administration";
      if (selectedFilter === "teacher" && isAdmin) return false;
      if (selectedFilter === "admin" && !isAdmin) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.sender_name.toLowerCase().includes(q) ||
          m.sender_role.toLowerCase().includes(q) ||
          (m.student_name && m.student_name.toLowerCase().includes(q)) ||
          m.last_message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [displayThreads, selectedFilter, searchQuery]);

  // Load contacts dynamically for active ward
  useEffect(() => {
    if (!activeWard) return;
    const wardId = activeWard.student_id || activeWard.id;
    api.get<Contact[]>(`/api/guardian/messages/contacts?ward_id=${wardId}`)
      .then((data) => {
        if (Array.isArray(data)) {
          setContacts(data);
        } else {
          setContacts([]);
        }
      })
      .catch(() => {
        setContacts([]);
      });
  }, [activeWard]);

  const handleOpenThread = async (thread: GuardianMessageThread) => {
    setActiveThread(thread);
    setThreadMessages(thread.messages || []);
    try {
      const res = await api.get<{ thread: any; messages: any[] }>(`/api/guardian/messages/threads/${thread.id}`);
      if (res?.messages && res.messages.length > 0) {
        const formatted = res.messages.map((m: any) => ({
          id: String(m.id),
          sender: (m.sender_role === "guardian" ? "me" : "them") as "me" | "them",
          text: m.text,
          timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
        }));
        setThreadMessages(formatted);
      }
    } catch {}
  };

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [threadMessages]);

  // Real-time SSE live message listener inside chat window
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/notifications/stream");
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === "chat_message") {
            refreshData();
            // If the message is for the currently open active thread, append it immediately!
            if (activeThread && (String(data.thread_id) === String(activeThread.id) || Number(data.thread_id) === Number(activeThread.id))) {
              const incomingMsg = {
                id: String(data.message_id || `msg-${Date.now()}`),
                sender: (data.sender_role === "guardian" ? "me" : "them") as "me" | "them",
                text: data.text || data.message || "",
                timestamp: data.created_at ? new Date(data.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
              };
              setThreadMessages((prev) => {
                if (prev.some((m) => m.id === incomingMsg.id || (m.text === incomingMsg.text && m.sender === incomingMsg.sender))) {
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
  }, [activeThread, refreshData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim() || !activeThread || sending) return;

    const textToSend = newMsgText.trim();
    setNewMsgText("");
    setSending(true);

    const optimisticMsg = {
      id: `msg-${Date.now()}`,
      sender: "me" as const,
      text: textToSend,
      timestamp: "Just now",
    };
    setThreadMessages((prev) => [...prev, optimisticMsg]);

    try {
      await api.post(`/api/guardian/messages/threads/${activeThread.id}`, { text: textToSend });
      refreshData();
    } catch {
      // Retain optimistic message in offline/demo mode
    } finally {
      setSending(false);
    }
  };

  const handleStartConversationWithContact = async (contact: Contact) => {
    if (!activeWard) return;
    const isContactAdmin = contact.role === "operator" || contact.category === "admin" || contact.category === "school";
    const categoryVal = isContactAdmin ? "admin" : "teacher";
    const studentIdVal = activeWard.student_id || activeWard.id;

    try {
      setShowNewChatModal(false);
      const res = await api.post<{ threadId: number; text: string }>(`/api/guardian/messages/new-thread`, {
        recipient_id: contact.id,
        student_id: studentIdVal,
        text: `Hello ${contact.name}, this is an inquiry regarding ${activeWard.name}.`,
        category: categoryVal,
        subject: `Inquiry regarding ${activeWard.name}`,
      });
      await refreshData();
      const newThreadObj: GuardianMessageThread = {
        id: String(res?.threadId || Date.now()),
        recipient_id: contact.id,
        student_id: studentIdVal,
        student_name: activeWard.name,
        student_grade: activeWard.grade,
        sender_name: contact.name,
        sender_role: contact.role_label,
        category: categoryVal,
        last_message: res?.text || `Hello ${contact.name}, this is an inquiry regarding ${activeWard.name}.`,
        time_label: "Just now",
        unread: false,
        messages: [{ id: "m-init", sender: "me", text: res?.text || `Hello ${contact.name}, this is an inquiry regarding ${activeWard.name}.`, timestamp: "Just now" }],
      };
      handleOpenThread(newThreadObj);
    } catch {
      const fallbackThreadObj: GuardianMessageThread = {
        id: String(Date.now()),
        recipient_id: contact.id,
        student_id: studentIdVal,
        student_name: activeWard.name,
        student_grade: activeWard.grade,
        sender_name: contact.name,
        sender_role: contact.role_label,
        category: categoryVal,
        last_message: `Hello ${contact.name}, this is an inquiry regarding ${activeWard.name}.`,
        time_label: "Just now",
        unread: false,
        messages: [{ id: "m-init", sender: "me", text: `Hello ${contact.name}, this is an inquiry regarding ${activeWard.name}.`, timestamp: "Just now" }],
      };
      handleOpenThread(fallbackThreadObj);
    }
  };

  const teacherContacts = useMemo(() => contacts.filter((c) => c.category === "teacher" || c.role === "teacher"), [contacts]);
  const adminContacts = useMemo(() => contacts.filter((c) => c.category === "admin" || c.category === "school" || c.role === "operator"), [contacts]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Messages & Inquiries</h1>
          {activeWard && (
            <div style={{ fontSize: "0.75rem", color: "var(--g-text-muted, #64748B)", marginTop: "0.15rem" }}>
              Active Ward: <strong style={{ color: "var(--g-text-primary, #0F172A)" }}>{activeWard.name}</strong> ({activeWard.grade})
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles.newChatBtn}
          onClick={() => setShowNewChatModal(true)}
          title="Start New Inquiry"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBarWrapper}>
        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search conversations, teachers, or wards…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button type="button" className={styles.clearSearchBtn} onClick={() => setSearchQuery("")}>
            ✕
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className={styles.filterPillsRow}>
        <button
          type="button"
          className={`${styles.filterPill} ${selectedFilter === "all" ? styles.filterPillActive : ""}`}
          onClick={() => setSelectedFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`${styles.filterPill} ${selectedFilter === "teacher" ? styles.filterPillActive : ""}`}
          onClick={() => setSelectedFilter("teacher")}
        >
          Teachers
        </button>
        <button
          type="button"
          className={`${styles.filterPill} ${selectedFilter === "admin" ? styles.filterPillActive : ""}`}
          onClick={() => setSelectedFilter("admin")}
        >
          Administration
        </button>
      </div>

      {/* Thread List */}
      <div className={styles.threadList}>
        {filteredThreads.length === 0 ? (
          <div style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            background: "var(--g-surface, #FFFFFF)",
            border: "1px solid var(--g-border, #E2E8F0)",
            borderRadius: "var(--g-radius-lg, 16px)",
            color: "var(--g-text-secondary, #64748B)"
          }}>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--g-text-primary, #0F172A)", marginBottom: "0.35rem" }}>
              No conversations found
            </p>
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>
              Tap the "+" icon at the top to message {activeWard?.name ? `${activeWard.name}'s teachers` : "your ward's teachers"} or school administration.
            </p>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isAdminThread = thread.category === "admin" || thread.category === "school" || thread.sender_role === "School Administration";
            return (
              <div
                key={thread.id}
                className={`${styles.threadCard} ${activeThread?.id === thread.id ? styles.threadCardActive : ""}`}
                onClick={() => handleOpenThread(thread)}
              >
                <div className={styles.threadLeft}>
                  <div
                    className={styles.avatarBox}
                    style={isAdminThread ? { background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" } : {}}
                  >
                    {thread.sender_name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.threadMetaCol}>
                    <div className={styles.senderName}>
                      <span>{thread.sender_name}</span>
                      <span className={isAdminThread ? styles.roleTagAdmin : styles.roleTagTeacher}>
                        {isAdminThread ? "Admin" : "Teacher"}
                      </span>
                    </div>
                    {thread.student_name && (
                      <span className={styles.wardTag}>
                        Re: {thread.student_name}
                      </span>
                    )}
                    <span className={styles.lastMsg}>{thread.last_message}</span>
                  </div>
                </div>
                <div className={styles.threadRight}>
                  <span className={styles.timeLabel}>{thread.time_label}</span>
                  {thread.unread && <span className={styles.unreadBadge} />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Chat Screen Overlay */}
      <AnimatePresence>
        {activeThread && (
          <motion.div
            className={styles.chatScreenOverlay}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
          >
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <button
                  type="button"
                  className={styles.chatBackBtn}
                  onClick={() => setActiveThread(null)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div className={styles.chatHeaderInfo}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span className={styles.chatRecipientName}>{activeThread.sender_name}</span>
                    <span className={activeThread.category === "admin" || activeThread.category === "school" ? styles.roleTagAdmin : styles.roleTagTeacher}>
                      {activeThread.category === "admin" || activeThread.category === "school" ? "Admin" : "Teacher"}
                    </span>
                  </div>
                  <span className={styles.chatRecipientRole}>
                    {activeThread.sender_role} {activeThread.student_name ? `• Re: ${activeThread.student_name}` : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.chatMessagesBody} ref={chatBodyRef}>
              {threadMessages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`${styles.chatBubble} ${msg.sender === "me" ? styles.bubbleMe : styles.bubbleThem}`}
                >
                  <span>{msg.text}</span>
                  <span className={styles.bubbleTime}>{msg.timestamp}</span>
                </div>
              ))}
            </div>

            <form className={styles.chatInputBar} onSubmit={handleSendMessage}>
              <input
                type="text"
                className={styles.chatTextInput}
                placeholder="Type an inquiry or message…"
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
              />
              <button
                type="submit"
                className={styles.chatSendBtn}
                disabled={!newMsgText.trim() || sending}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Message Contact Picker Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNewChatModal(false)}
          >
            <motion.div
              className={styles.contactPickerModal}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.contactModalHeader}>
                <div>
                  <h3 className={styles.contactModalTitle}>Start New Inquiry</h3>
                  {activeWard && (
                    <div style={{ fontSize: "0.75rem", color: "var(--g-text-muted, #64748B)" }}>
                      Regarding: <strong style={{ color: "var(--g-text-primary, #0F172A)" }}>{activeWard.name}</strong> ({activeWard.grade})
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--g-text-muted, #64748B)", cursor: "pointer" }}
                  onClick={() => setShowNewChatModal(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className={styles.contactList}>
                {/* 1. Teachers Section */}
                {teacherContacts.length > 0 && (
                  <>
                    <div className={styles.contactSectionTitle}>
                      Assigned Teachers ({activeWard?.name || "Ward"})
                    </div>
                    {teacherContacts.map((c) => (
                      <div
                        key={`teacher-${c.id}`}
                        className={styles.contactItem}
                        onClick={() => handleStartConversationWithContact(c)}
                      >
                        <div className={styles.contactLeft}>
                          <div className={styles.avatarBox} style={{ width: 36, height: 36, fontSize: "0.875rem" }}>
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className={styles.contactName}>{c.name}</div>
                            <div className={styles.contactRole}>{c.role_label}</div>
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    ))}
                  </>
                )}

                {/* 2. Administration Section */}
                {adminContacts.length > 0 && (
                  <>
                    <div className={styles.contactSectionTitle} style={{ marginTop: "0.75rem" }}>
                      School Administration (Admin)
                    </div>
                    {adminContacts.map((c) => (
                      <div
                        key={`admin-${c.id}`}
                        className={styles.contactItem}
                        onClick={() => handleStartConversationWithContact(c)}
                      >
                        <div className={styles.contactLeft}>
                          <div
                            className={styles.avatarBox}
                            style={{
                              width: 36,
                              height: 36,
                              fontSize: "0.875rem",
                              background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                            }}
                          >
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className={styles.contactName}>{c.name}</div>
                            <div className={styles.contactRole} style={{ color: "#7C3AED", fontWeight: 600 }}>
                              {c.role_label}
                            </div>
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    ))}
                  </>
                )}

                {contacts.length === 0 && (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--g-text-muted, #64748B)", fontSize: "0.8125rem" }}>
                    No contacts found. Please verify ward enrollment.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

