"use client";

import { MetricCard } from "../../../components/ui/MetricCard";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { ReportCardModal } from "../../../components/teacher/ReportCardModal";
import { api } from "../../../lib/api";
import type { Subject, ExamResult } from "../../../lib/types";
import {
  PageHeader,
  Button,
} from "../../../components/ui";
import {
  SubjectIcon,
  WarningIcon,
  BookIcon,
  UsersIcon,
  DocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ActivityIcon,
  EyeIcon,
} from "../../../components/icons/Icons";
import { useAcademic } from "../../../components/context/AcademicContext";
import { useAuth } from "../../../hooks/useAuth";
import styles from "./page.module.css";

export default function TeacherDashboardPage() {
  return (
    <RequireRole role="teacher">
      <TeacherDashboard />
    </RequireRole>
  );
}

function TeacherDashboard() {
  const { user } = useAuth();
  const isClassTeacher = (user as any)?.is_class_teacher === true;
  const assignedClassName = (user as any)?.assigned_class_name;
  const { selectedSession, selectedTerm, activeSession, activeTerm } = useAcademic();
  const currentTermName = selectedTerm?.name || activeTerm?.name || "First Term";
  const currentSessionName = selectedSession?.name || activeSession?.name || "2026/2027";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Guardian Inquiries state
  const [inquiryThreads, setInquiryThreads] = useState<any[]>([]);
  const [unreadInquiryCount, setUnreadInquiryCount] = useState(0);

  const loadInquiries = useCallback(async () => {
    try {
      const res = await api.get<any[]>("/api/teacher/messages/threads");
      if (Array.isArray(res)) {
        setInquiryThreads(res);
        const unread = res.reduce((acc, t) => acc + (Number(t.unread_for_recipient) || 0), 0);
        setUnreadInquiryCount(unread);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  // Report card quick-launch
  const [reportStudents, setReportStudents] = useState<ExamResult[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportCardStudent, setReportCardStudent] = useState<ExamResult | null>(null);

  const loadReportStudents = useCallback(async (subs: Subject[], signal?: AbortSignal) => {
    setReportLoading(true);
    const allStudentMap: Record<number, ExamResult> = {};
    if (isClassTeacher && (user as any)?.assigned_class_id) {
      try {
        const roster = await api.getClassRoster(Number((user as any).assigned_class_id), selectedTerm?.id);
        if (!signal?.aborted && Array.isArray(roster)) {
          for (const st of roster) {
            if (st.id && !allStudentMap[st.id]) {
              allStudentMap[st.id] = {
                student_user_id: st.id,
                student_name: st.name,
                grade: st.grade || assignedClassName,
                reg_id: st.reg_id,
                exam_status: "completed",
              } as any;
            }
          }
        }
      } catch { /* ignore */ }
    } else {
      await Promise.all(
        subs.map(async (s) => {
          try {
            if (signal?.aborted) return;
            const students = await api.getSubjectStudents(Number(s.id));
            if (signal?.aborted) return;
            for (const st of students ?? []) {
              if (st.exam_status === "completed" && st.student_user_id && !allStudentMap[st.student_user_id]) {
                allStudentMap[st.student_user_id] = st as any;
              }
            }
          } catch { /* ignore */ }
        })
      );
    }
    if (signal?.aborted) return;
    setReportStudents(Object.values(allStudentMap));
    setReportLoading(false);
  }, [isClassTeacher, (user as any)?.assigned_class_id, assignedClassName, selectedTerm?.id]);

  const subjectsRef = useRef<Subject[]>([]);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    (async () => {
      try {
        setLoading(true);
        const subs = (await api.getSubjectsWithCounts(selectedSession?.id, selectedTerm?.id)) ?? [];
        if (signal.aborted) return;

        const examSubs = subs.filter((s) => s.is_assignment !== 1);
        subjectsRef.current = examSubs;
        setSubjects(examSubs);

        const counts: Record<number, number> = {};
        examSubs.forEach((s) => {
          counts[Number(s.id)] = s.question_count ?? 0;
        });
        setQuestionCounts(counts);
        await loadReportStudents(examSubs, signal);
      } catch (err: any) {
        if (!signal.aborted) setError(err.message || "Failed to load courses");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();
    return () => abortController.abort();
  }, [loadReportStudents, selectedSession?.id, selectedTerm?.id]);

  useEffect(() => {
    const handler = (e: Event) => {
      const notif = (e as CustomEvent).detail;
      if (notif?.type === "exam_submitted") {
        loadReportStudents(subjectsRef.current);
      }
      if (notif?.type === "chat_message" || notif?.type === "notification") {
        loadInquiries();
      }
    };
    window.addEventListener("notification_received", handler);
    return () => window.removeEventListener("notification_received", handler);
  }, [loadReportStudents, loadInquiries]);

  const published = useMemo(() => subjects.filter((s) => s.is_published).length, [subjects]);
  const drafts = useMemo(() => subjects.filter((s) => !s.is_published).length, [subjects]);
  const totalQuestions = useMemo(
    () => Object.values(questionCounts).reduce((acc, c) => acc + c, 0),
    [questionCounts]
  );

  return (
    <div className={styles.container}>
      {reportCardStudent && (
        <ReportCardModal
          student={reportCardStudent}
          onClose={() => setReportCardStudent(null)}
        />
      )}

      {/* ── Page Header ───────────────────────────────────── */}
      <PageHeader
        eyebrow={`Faculty Workspace · ${isClassTeacher ? `Class Teacher (${assignedClassName || "Assigned"})` : "Subject Faculty"}`}
        title="Teaching Overview"
        subtitle={`Academic Session ${currentSessionName} · ${currentTermName}`}
        actions={
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href="/teacher/attendance">
              <Button variant="secondary" size="sm">
                Attendance
              </Button>
            </Link>
            <Link href="/teacher/messages">
              <Button variant="secondary" size="sm">
                Inquiries
                {unreadInquiryCount > 0 && (
                  <span className={styles.inquiryBadge} style={{ marginLeft: "0.35rem" }}>
                    {unreadInquiryCount}
                  </span>
                )}
              </Button>
            </Link>
            {isClassTeacher && (
              <>
                <Link href="/teacher/class-grading">
                  <Button variant="secondary" size="sm">
                    Broadsheet ({assignedClassName || "Class"})
                  </Button>
                </Link>
                <Link href="/teacher/report-card">
                  <Button variant="primary" size="sm">
                    Report Cards
                  </Button>
                </Link>
              </>
            )}
            <Link href="/teacher/grading">
              <Button variant="secondary" size="sm">
                Subject Grading
              </Button>
            </Link>
            <Link href="/teacher/results">
              <Button variant={isClassTeacher ? "secondary" : "primary"} size="sm">
                Exam Results
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.875rem 1rem", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "6px", color: "#991B1B", fontSize: "0.8125rem" }}>
          <WarningIcon width="16" height="16" />
          {error}
        </div>
      )}

      {/* ── Restrained KPI Summary Row ──────────────────────── */}
      <section className={styles.statsGrid} aria-label="Teaching summary">
        <MetricCard label="Assigned subjects" value={subjects.length} detail={`${totalQuestions} questions in your item bank`} action={<Link href="/teacher/questions">Questions ↗</Link>} />
        <MetricCard label="Published assessments" value={published} progress={subjects.length ? published / subjects.length * 100 : 0} detail={`${drafts} draft${drafts === 1 ? "" : "s"} in preparation`} />
        <MetricCard label={isClassTeacher ? "Class roster" : "Students assessed"} value={reportStudents.length} detail={isClassTeacher ? "Students in your assigned class" : "Students with completed scripts in this period"} action={<Link href="/teacher/results">Results ↗</Link>} />
        <MetricCard label="Teaching assignment" value={isClassTeacher ? assignedClassName || "Class teacher" : "Subject teacher"} detail={unreadInquiryCount > 0 ? `${unreadInquiryCount} unread guardian message${unreadInquiryCount > 1 ? "s" : ""}` : "No unread guardian messages"} />
      </section>

      {/* ── Assigned Subjects & Question Banks ─────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Assigned Subjects &amp; Question Banks</h2>
          <span className={styles.sectionCount}>{subjects.length} courses</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--color-muted)", fontSize: "0.8125rem" }}>
            Loading assigned subjects…
          </div>
        ) : subjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-muted)", fontSize: "0.8125rem" }}>
            No subjects assigned for this academic period. Contact your operator for course allocation.
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {subjects.map((s) => {
              const qCount = questionCounts[Number(s.id)] ?? 0;
              const isLive = Boolean(s.is_published);
              return (
                <div key={s.id} className={styles.courseCard}>
                  <div className={styles.courseCardTop}>
                    <div>
                      <div className={styles.courseName}>{s.name}</div>
                      <div style={{ marginTop: "0.25rem", display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        <span className={styles.codeBadge}>{s.code}</span>
                        {s.class && <span className={styles.codeBadge}>{s.class}</span>}
                      </div>
                    </div>
                    <div className={styles.courseStatus}>
                      <span className={`${styles.statusTag} ${isLive ? styles.statusLive : styles.statusDraft}`}>{isLive ? "Published" : "Draft"}</span>
                      <Link className={styles.viewSubject} href={`/teacher/results?subjectId=${s.id}`} aria-label={`View ${s.name} results`}><EyeIcon width="18" height="18"/></Link>
                    </div>
                  </div>

                  <div className={styles.courseMetaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Item Bank</span>
                      <span className={styles.metaValue}>{qCount} Questions</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Total Marks</span>
                      <span className={styles.metaValue}>{s.total_score ?? 0} Pts</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Duration</span>
                      <span className={styles.metaValue}>{s.duration || 60} min</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Mode</span>
                      <span className={styles.metaValue}>{(s.mode || "exam").toUpperCase()}</span>
                    </div>
                  </div>

                  <div className={styles.courseActions}>
                    <Link href={`/teacher/questions?subjectId=${s.id}`} className={styles.subjectAction}>Questions</Link>
                    <Link href={`/teacher/questions?subjectId=${s.id}&action=create`} className={styles.subjectAction}>Add question</Link>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button type="button" className={styles.subjectAction} aria-label={`More actions for ${s.name}`}>
                          More <span aria-hidden="true">⌄</span>
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className={styles.actionMenu} align="end" sideOffset={6} collisionPadding={12}>
                          <DropdownMenu.Label className={styles.actionMenuLabel}>{s.name}</DropdownMenu.Label>
                          <DropdownMenu.Item asChild><Link className={styles.actionMenuItem} href={`/teacher/questions?subjectId=${s.id}`}>{isLive ? "Inspect item bank" : "Author questions"}</Link></DropdownMenu.Item>
                          <DropdownMenu.Item asChild><Link className={styles.actionMenuItem} href="/teacher/grading">Gradebook</Link></DropdownMenu.Item>
                          <DropdownMenu.Item asChild><Link className={styles.actionMenuItem} href={`/teacher/results?subjectId=${s.id}`}>Results</Link></DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Guardian Inquiries & Parent Communications ──────── */}
      <section className={styles.inquiriesContainer}>
        <div className={styles.inquiriesHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Guardian Inquiries</h2>
            {unreadInquiryCount > 0 && (
              <span className={styles.inquiryBadge}>
                {unreadInquiryCount} unread
              </span>
            )}
          </div>
          <Link href="/teacher/messages" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary, #92400E)", textDecoration: "none" }}>
            Open Inquiry Desk →
          </Link>
        </div>

        {inquiryThreads.length === 0 ? (
          <div style={{ padding: "1.125rem", textAlign: "center", background: "var(--color-surface-2, #F8FAFC)", borderRadius: "6px", color: "var(--color-muted, #64748B)", fontSize: "0.8125rem" }}>
            No parent inquiries recorded yet for your assigned classes or subjects.
          </div>
        ) : (
          <div className={styles.inquiriesGrid}>
            {inquiryThreads.slice(0, 3).map((t) => {
              const isUnread = Number(t.unread_for_recipient) > 0;
              return (
                <Link
                  key={t.id}
                  href="/teacher/messages"
                  className={`${styles.inquiryCard} ${isUnread ? styles.inquiryCardUnread : ""}`}
                >
                  <div className={styles.inquiryTop}>
                    <div className={styles.inquirySender}>
                      <span>{t.guardian_name || "Guardian"}</span>
                      {t.student_name && (
                        <span className={styles.inquiryWard}>
                          Re: {t.student_name}
                        </span>
                      )}
                    </div>
                    {isUnread && <span className={styles.inquiryBadge}>New</span>}
                  </div>
                  <div className={styles.inquirySnippet}>
                    {t.last_message || t.subject || "Parent inquiry regarding student academic progress."}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.25rem" }}>
                    <span className={styles.inquiryTime}>
                      {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent"}
                    </span>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-primary, #92400E)" }}>
                      Reply →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Completed Candidate Submissions / Report Cards ────── */}
      <section className={styles.reportCardContainer}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h2 className={styles.sectionTitle}>Completed Submissions &amp; Report Preview</h2>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.15rem" }}>
              {isClassTeacher
                ? `Submitted examination scripts for ${assignedClassName || "your class"}. Select a candidate to inspect their report card.`
                : "Recent candidate submissions across your assigned subjects."}
            </div>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => loadReportStudents(subjectsRef.current)}
          >
            Refresh
          </Button>
        </div>

        {reportLoading ? (
          <div style={{ textAlign: "center", padding: "1.75rem", color: "var(--color-muted)", fontSize: "0.8125rem" }}>
            Checking submissions…
          </div>
        ) : reportStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.75rem", color: "var(--color-muted)", fontSize: "0.8125rem", background: "var(--color-surface-2)", borderRadius: "6px" }}>
            No candidate submissions recorded yet for this period.
          </div>
        ) : (
          <div className={styles.studentGrid}>
            {reportStudents.map((st) => (
              <div
                key={st.student_user_id}
                className={styles.studentCard}
                onClick={() => setReportCardStudent(st)}
              >
                <div className={styles.studentAvatar}>
                  {String(st.student_name || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {st.student_name}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {st.grade || "General"} · {st.reg_id || ""}
                  </div>
                </div>
                <DocumentIcon width="13" height="13" style={{ color: "var(--color-muted)" }} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
