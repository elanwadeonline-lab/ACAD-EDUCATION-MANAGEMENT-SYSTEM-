"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useAcademic } from "../../../components/context/AcademicContext";
import {
  PageHeader,
  Button,
  ConfirmDialog,
  Modal,
  EmptyState,
} from "../../../components/ui";
import {
  CalendarIcon,
  PlusIcon,
  CheckCircleIcon,
  WarningIcon,
  CheckIcon,
  TrashIcon,
} from "../../../components/icons/Icons";
import styles from "./page.module.css";

export default function AcademicSessionsPage() {
  return (
    <RequireRole role="operator">
      <AcademicSessionsContent />
    </RequireRole>
  );
}

function AcademicSessionsContent() {
  const { activeSession, activeTerm, refreshAcademic, selectedSession } = useAcademic();
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set());

  // Modal States
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [submittingSession, setSubmittingSession] = useState(false);
  const [submittingTerm, setSubmittingTerm] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Form States
  const [newSessionName, setNewSessionName] = useState("");
  const [selectedSessionForTerm, setSelectedSessionForTerm] = useState<number>(0);
  const [termType, setTermType] = useState<"term" | "semester">("term");
  const [newTermName, setNewTermName] = useState<string>("First Term");

  // Notifications & Confirmations
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const toggleSelectAll = () => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(sessions.map((s) => s.id)));
    }
  };

  const toggleSelectSession = (id: number) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteSessions = () => {
    const count = selectedSessionIds.size;
    if (count === 0) return;
    setConfirmState({
      open: true,
      title: `Delete ${count} Academic Session${count > 1 ? "s" : ""}?`,
      message: `Permanently delete the selected ${count} academic session(s) and all their associated terms? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          setDeletingBulk(true);
          const res = await api.bulkDeleteAcademicSessions(Array.from(selectedSessionIds));
          setMsg({ type: "success", text: res.message || `Successfully deleted ${count} session(s).` });
          setSelectedSessionIds(new Set());
          await loadData();
          await refreshAcademic();
        } catch (err: any) {
          setMsg({ type: "error", text: err.message || "Failed to bulk delete sessions" });
        } finally {
          setDeletingBulk(false);
        }
      },
    });
  };

  useEffect(() => {
    if (selectedSession?.id) {
      setSelectedSessionForTerm(selectedSession.id);
    }
  }, [selectedSession]);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await api.getAcademicSessions();
      if (signal?.aborted) return;
      if (res) {
        setSessions(res.sessions || []);
        setTerms(res.terms || []);
        if (res.sessions?.length > 0 && !selectedSessionForTerm) {
          setSelectedSessionForTerm(res.sessions[0].id);
        }
      }
    } catch (err: any) {
      if (!signal?.aborted) {
        setMsg({ type: "error", text: err.message || "Failed to load academic sessions" });
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [selectedSessionForTerm]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    try {
      setSubmittingSession(true);
      const res = await api.createAcademicSession(newSessionName.trim());
      setMsg({ type: "success", text: res.message || "Academic session created successfully." });
      setNewSessionName("");
      setIsSessionModalOpen(false);
      await loadData();
      await refreshAcademic();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to create session" });
    } finally {
      setSubmittingSession(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForTerm) return;
    try {
      setSubmittingTerm(true);
      const res = await api.createAcademicTerm(selectedSessionForTerm, newTermName);
      setMsg({ type: "success", text: res.message || "Academic term created successfully." });
      setIsTermModalOpen(false);
      await loadData();
      await refreshAcademic();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to create term" });
    } finally {
      setSubmittingTerm(false);
    }
  };

  const handleActivateSession = (sessionId: number, sessionName: string) => {
    setConfirmState({
      open: true,
      title: "Activate Academic Session?",
      message: `Set "${sessionName}" as the active academic session? All new enrollments and gradebooks will default to this year.`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await api.activateAcademicSession(sessionId);
          setMsg({ type: "success", text: res.message || "Academic session activated." });
          await loadData();
          await refreshAcademic();
        } catch (err: any) {
          setMsg({ type: "error", text: err.message || "Failed to activate session" });
        }
      },
    });
  };

  const handleActivateTerm = (termId: number, termName: string) => {
    setConfirmState({
      open: true,
      title: "Activate Term / Semester?",
      message: `Set "${termName}" as the active examination and grading cycle?`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await api.activateAcademicTerm(termId);
          setMsg({ type: "success", text: res.message || "Academic term activated." });
          await loadData();
          await refreshAcademic();
        } catch (err: any) {
          setMsg({ type: "error", text: err.message || "Failed to activate term" });
        }
      },
    });
  };

  const handleEndTerm = () => {
    setConfirmState({
      open: true,
      title: "Conclude Active Term?",
      message:
        "Are you sure you want to end the current active term? This will finalize the grading cycle and conclude all scheduled examination windows.",
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await api.endTerm();
          setMsg({ type: "success", text: res.message || "Current term ended successfully." });
          await loadData();
          await refreshAcademic();
        } catch (err: any) {
          setMsg({ type: "error", text: err.message || "Failed to end term" });
        }
      },
    });
  };

  const handleDeleteSession = (sessionId: number, sessionName: string) => {
    setConfirmState({
      open: true,
      title: "Delete Academic Session?",
      message: `Permanently delete "${sessionName}" and all its terms? This cannot be undone. Sessions with exams or gradebooks cannot be deleted.`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await api.deleteAcademicSession(sessionId);
          setMsg({ type: "success", text: res.message || "Academic session deleted." });
          await loadData();
          await refreshAcademic();
        } catch (err: any) {
          setMsg({ type: "error", text: err.message || "Failed to delete session" });
        }
      },
    });
  };

  const handleDeleteTerm = (termId: number, termName: string) => {
    setConfirmState({
      open: true,
      title: "Delete Term?",
      message: `Permanently delete "${termName}"? Terms with exams or gradebooks cannot be deleted.`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await (api as any).deleteAcademicTerm(termId);
          setMsg({ type: "success", text: res.message || "Term deleted." });
          await loadData();
          await refreshAcademic();
        } catch (err: any) {
          setMsg({ type: "error", text: err.message || "Failed to delete term" });
        }
      },
    });
  };

  return (
    <div className={styles.container}>
      <ConfirmDialog
        open={Boolean(confirmState?.open)}
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
        title={confirmState?.title || ""}
        message={confirmState?.message || ""}
      />

      {/* ── Page Header ───────────────────────────────────── */}
      <PageHeader
        eyebrow="Academic Structure"
        title="Academic Calendar"
        subtitle="Manage academic years, term transitions, and operational lifecycles."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PlusIcon width="13" height="13" />}
              onClick={() => {
                if (sessions.length > 0 && !selectedSessionForTerm) {
                  setSelectedSessionForTerm(activeSession?.id || sessions[0].id);
                }
                setIsTermModalOpen(true);
              }}
              disabled={sessions.length === 0}
            >
              Add Term
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusIcon width="13" height="13" />}
              onClick={() => {
                setNewSessionName("");
                setIsSessionModalOpen(true);
              }}
            >
              New Session
            </Button>
          </div>
        }
      />

      {/* ── Feedback Alerts ───────────────────────────────── */}
      {msg && (
        <div
          className={`${styles.alertBanner} ${
            msg.type === "success" ? styles.alertSuccess : styles.alertError
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircleIcon width="16" height="16" />
            ) : (
              <WarningIcon width="16" height="16" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className={styles.alertClose}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── Live Operational Status Banner ── */}
      <div className={styles.liveBanner}>
        <div className={styles.liveBannerLeft}>
          <div className={styles.liveBannerIcon}>
            <CalendarIcon width="18" height="18" />
          </div>
          <div className={styles.liveBannerText}>
            <div className="flex items-center gap-2">
              <span className={styles.liveBannerLabel}>
                <span className={activeSession ? styles.statusDotActive : styles.statusDotInactive} />
                Current System State
              </span>
            </div>
            {activeSession ? (
              <div className={styles.liveBannerValue}>
                Operating in <strong>{activeSession.name}</strong> academic session
                {activeTerm ? (
                  <>
                    , <strong>{activeTerm.name}</strong>
                  </>
                ) : (
                  ""
                )}.
              </div>
            ) : (
              <div className={styles.liveBannerValue}>
                No active academic session configured. System is dormant.
              </div>
            )}
          </div>
        </div>

        <div className={styles.liveBannerAction}>
          {activeTerm ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEndTerm}
              leftIcon={<WarningIcon width="13" height="13" />}
            >
              End Current Term
            </Button>
          ) : activeSession ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTermModalOpen(true)}
              leftIcon={<PlusIcon width="13" height="13" />}
            >
              Initialize Term
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Chronological Session Lifecycle ────────────────── */}
      <section className={styles.timelineSection}>
        <div className={styles.sectionHeader} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className={styles.sectionTitle}>
            <span>Session Directory</span>
            <span className={styles.sectionCount}>{sessions.length}</span>
          </div>

          {sessions.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontWeight: 600, color: "#64748B", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sessions.length > 0 && selectedSessionIds.size === sessions.length}
                  onChange={toggleSelectAll}
                  style={{ width: "14px", height: "14px", accentColor: "#0F766E", cursor: "pointer" }}
                />
                Select All ({sessions.length})
              </label>
            </div>
          )}
        </div>

        {/* ── Bulk Actions Toolbar ── */}
        {selectedSessionIds.size > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
            color: "#FFFFFF",
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            border: "1px solid #334155",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38BDF8" }}>
                {selectedSessionIds.size} session{selectedSessionIds.size > 1 ? "s" : ""} selected
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSessionIds(new Set())}
                style={{ color: "#94A3B8" }}
              >
                Clear
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<TrashIcon width="13" height="13" />}
                onClick={handleBulkDeleteSessions}
                loading={deletingBulk}
              >
                Delete Selected ({selectedSessionIds.size})
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-xs text-slate-500 font-medium">Loading academic sessions…</span>
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No Academic Sessions"
            description="Create your school's first academic session to begin configuring terms and grading cycles."
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusIcon width="13" height="13" />}
                onClick={() => setIsSessionModalOpen(true)}
              >
                Create Academic Session
              </Button>
            }
          />
        ) : (
          <div className={styles.timelineCard}>
            <div className={styles.timelineContainer}>
              {sessions.map((s) => {
                const sessionTerms = terms.filter((t) => t.session_id === s.id);
                const isGroupActive = Boolean(s.is_active);
                const isSelected = selectedSessionIds.has(s.id);

                return (
                  <div
                    key={s.id}
                    className={`${styles.timelineYearGroup} ${
                      isGroupActive ? styles.timelineYearGroupActive : ""
                    }`}
                    style={isSelected ? { background: "rgba(15, 118, 110, 0.05)", borderRadius: "8px", padding: "0.5rem" } : undefined}
                  >
                    <div className={styles.timelineYearMarker}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSession(s.id)}
                        style={{ width: "15px", height: "15px", accentColor: "#0F766E", cursor: "pointer", marginRight: "0.35rem" }}
                        title={`Select session "${s.name}"`}
                      />
                      <div
                        className={`${styles.timelineYearDot} ${
                          isGroupActive ? styles.timelineYearDotActive : ""
                        }`}
                      />
                      <h3
                        className={`${styles.timelineYearName} ${
                          !isGroupActive ? styles.timelineYearNameInactive : ""
                        }`}
                      >
                        {s.name}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {isGroupActive ? (
                          <span className={styles.activeSessionBadge}>Active Session</span>
                        ) : (
                          <button
                            type="button"
                            className={styles.activateLink}
                            onClick={() => handleActivateSession(s.id, s.name)}
                          >
                            Set Active →
                          </button>
                        )}
                        <button
                          type="button"
                          title={`Delete session "${s.name}"`}
                          onClick={() => handleDeleteSession(s.id, s.name)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#EF4444",
                            padding: "0.2rem",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <TrashIcon width="14" height="14" />
                        </button>
                      </div>
                    </div>

                    <div className={styles.termsList}>
                      {sessionTerms.length > 0 ? (
                        sessionTerms.map((t) => (
                          <div
                            key={t.id}
                            className={styles.termRow}
                          >
                            <div className="flex items-center gap-2">
                              <span className={styles.termName}>{t.name}</span>
                            </div>
                            <div className={styles.termMeta}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {t.is_active ? (
                                  <span className={styles.activeTermBadge}>Active Term</span>
                                ) : isGroupActive ? (
                                  <button
                                    type="button"
                                    className={styles.activateTermLink}
                                    onClick={() => handleActivateTerm(t.id, t.name)}
                                  >
                                    Activate Term
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  title={`Delete term "${t.name}"`}
                                  onClick={() => handleDeleteTerm(t.id, t.name)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#EF4444",
                                    padding: "0.2rem",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <TrashIcon width="13" height="13" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={styles.noTerms}>
                          <span>No terms configured for this academic year.</span>
                          <button
                            type="button"
                            className={styles.addTermInline}
                            onClick={() => {
                              setSelectedSessionForTerm(s.id);
                              setIsTermModalOpen(true);
                            }}
                          >
                            + Add Term
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── MODAL: CREATE ACADEMIC SESSION ──────────────────── */}
      <Modal
        open={isSessionModalOpen}
        onClose={() => {
          if (!submittingSession) setIsSessionModalOpen(false);
        }}
        title="Create Academic Session"
        size="md"
      >
        <form onSubmit={handleCreateSession} className={styles.modalForm}>
          <p className={styles.modalIntro}>
            Define the academic year label (e.g. 2026/2027). This sets the scope for student cohorts, class rosters, and gradebooks.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Session Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 2026/2027"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className={styles.formInput}
              required
              autoFocus
            />
          </div>

          <div className={styles.modalFooter}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={submittingSession}
              onClick={() => setIsSessionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<CheckIcon width="14" height="14" />}
              loading={submittingSession}
              disabled={submittingSession || !newSessionName.trim()}
            >
              Create Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: CREATE ACADEMIC TERM ─────────────────────── */}
      <Modal
        open={isTermModalOpen}
        onClose={() => {
          if (!submittingTerm) setIsTermModalOpen(false);
        }}
        title="Add Academic Term or Semester"
        size="md"
      >
        <form onSubmit={handleCreateTerm} className={styles.modalForm}>
          <p className={styles.modalIntro}>
            Attach an examination and grading period to an academic session.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Target Academic Session <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSessionForTerm}
              onChange={(e) => setSelectedSessionForTerm(Number(e.target.value))}
              className={styles.formSelect}
              required
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? "(Active Session)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Academic System</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="termTypeModal"
                  value="term"
                  checked={termType === "term"}
                  onChange={() => {
                    setTermType("term");
                    setNewTermName("First Term");
                  }}
                  className={styles.radioInput}
                />
                Term System (3 cycles)
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="termTypeModal"
                  value="semester"
                  checked={termType === "semester"}
                  onChange={() => {
                    setTermType("semester");
                    setNewTermName("First Semester");
                  }}
                  className={styles.radioInput}
                />
                Semester System (2 cycles)
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Term Cycle Name <span className="text-red-500">*</span>
            </label>
            <select
              value={newTermName}
              onChange={(e) => setNewTermName(e.target.value)}
              className={styles.formSelect}
            >
              {termType === "term" ? (
                <>
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </>
              ) : (
                <>
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </>
              )}
            </select>
          </div>

          <div className={styles.modalFooter}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={submittingTerm}
              onClick={() => setIsTermModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<CheckIcon width="14" height="14" />}
              loading={submittingTerm}
              disabled={submittingTerm || !selectedSessionForTerm}
            >
              Add Term
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
