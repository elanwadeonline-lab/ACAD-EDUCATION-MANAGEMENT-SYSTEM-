"use client";

import React, { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { ReviewModal } from "../../../components/teacher/ReviewModal";
import { useAcademic } from "../../../components/context/AcademicContext";
import { api } from "../../../lib/api";
import type { EnrolledStudent, Subject, User } from "../../../lib/types";
import { scorePct, letterGrade } from "../../../lib/gradeUtils";
import dynamic from "next/dynamic";
const Modal = dynamic(() => import("../../../components/ui/Modal").then((mod) => mod.Modal), { ssr: false });
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import {
  PageHeader,
  FilterBar,
  Table,
  type TableColumn,
  Button,
} from "../../../components/ui";
import {
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  BookIcon,
  PlusIcon,
} from "../../../components/icons/Icons";
import styles from "./page.module.css";

export default function TeacherStudentsPage() {
  return (
    <RequireRole role="teacher">
      <Suspense fallback={<div className="p-6">Loading student roster...</div>}>
        <StudentRoster />
      </Suspense>
    </RequireRole>
  );
}

function StudentRoster() {
  const params = useSearchParams();
  const subjectId = Number(params.get("subjectId") ?? 0);

  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { selectedSession, selectedTerm, activeSession, activeTerm } = useAcademic();
  const currentSessionName = selectedSession?.name || activeSession?.name || "2026/2027";
  const currentTermName = selectedTerm?.name || activeTerm?.name || "First Term";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [reviewModal, setReviewModal] = useState<any | null>(null);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Enrollment modal state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollMode, setEnrollMode] = useState<"cohort" | "individual">("cohort");
  const [selectedCohort, setSelectedCohort] = useState("JSS 1");
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [unenrollTarget, setUnenrollTarget] = useState<EnrolledStudent | null>(null);
  const [unenrollLoading, setUnenrollLoading] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAllStudents = useCallback(async () => {
    try {
      const data = (await api.getStudents()) as User[];
      setAllStudents(data || []);
    } catch {
      // Ignore
    }
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;
    setEnrollSubmitting(true);
    try {
      if (enrollMode === "cohort") {
        const res = await api.bulkEnrollByGrade(selectedSubjectId, selectedCohort);
        showToast("success", res?.message || `Enrolled students from cohort ${selectedCohort}.`);
      } else {
        if (!selectedStudentId) {
          showToast("error", "Please select a student to enroll.");
          return;
        }
        await api.enrollStudent(selectedSubjectId, selectedStudentId);
        showToast("success", "Student enrolled successfully.");
      }
      setEnrollModalOpen(false);
      setSelectedStudentId(null);
      await loadStudents(selectedSubjectId);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to enroll student(s).");
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleUnenroll = async () => {
    if (!unenrollTarget || !selectedSubjectId) return;
    setUnenrollLoading(true);
    try {
      await api.unenrollStudent(selectedSubjectId, unenrollTarget.id);
      showToast("success", `${unenrollTarget.name} removed from course.`);
      setUnenrollTarget(null);
      await loadStudents(selectedSubjectId);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to unenroll student.");
    } finally {
      setUnenrollLoading(false);
    }
  };

  const loadStudents = useCallback(async (sid: number, signal?: AbortSignal) => {
    if (!sid) return;
    try {
      const data = (await api.getSubjectStudents(sid)) as EnrolledStudent[];
      if (signal?.aborted) return;
      setStudents(data ?? []);
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : "Failed to load students");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
      try {
        setLoading(true);
        const subs = (await api.getSubjects(selectedSession?.id, selectedTerm?.id)) as Subject[];
        if (signal.aborted) return;
        setSubjects(subs ?? []);

        const sid = subjectId > 0 ? subjectId : Number(subs[0]?.id ?? 0);
        setSelectedSubjectId(sid);
        if (sid) await loadStudents(sid, signal);
      } catch (err) {
        if (!signal.aborted) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [subjectId, selectedSession?.id, selectedTerm?.id, loadStudents]);

  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  }, [subjects, selectedSubjectId]);

  const handleSubjectChange = (newId: number) => {
    setSelectedSubjectId(newId);
    loadStudents(newId);
  };

  const filteredStudents = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return students;
    return students.filter(
      (st) =>
        st.name?.toLowerCase().includes(q) ||
        st.email?.toLowerCase().includes(q) ||
        st.reg_id?.toLowerCase().includes(q) ||
        st.grade?.toLowerCase().includes(q)
    );
  }, [students, query]);

  const openReview = async (st: EnrolledStudent) => {
    setReviewModal(st);
    setReviewLoading(true);
    try {
      const res = await api.getExamByStudentSubject(st.id, selectedSubjectId);
      if (res?.id) {
        const detail = await api.getExamReview(res.id);
        setReviewData(detail);
      } else {
        setReviewData(null);
      }
    } catch {
      showToast("error", "Could not load exam attempt details");
    } finally {
      setReviewLoading(false);
    }
  };

  const completedCount = useMemo(() => students.filter((s) => s.exam_status === "completed").length, [students]);
  const inProgressCount = useMemo(() => students.filter((s) => s.exam_status === "in_progress").length, [students]);
  const notStartedCount = useMemo(() => students.filter((s) => !s.exam_status || s.exam_status === "not_started").length, [students]);

  const columns: TableColumn<EnrolledStudent>[] = [
    {
      key: "name",
      header: "Candidate Name",
      sortable: true,
      render: (st) => (
        <div className={styles.candidateCell}>
          <div className={styles.avatar}>{String(st.name || "?").charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.8125rem" }}>{st.name}</div>
            <div style={{ fontSize: "0.6875rem", color: "var(--color-muted)", fontFamily: "var(--font-mono, monospace)" }}>
              {st.reg_id || st.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "grade",
      header: "Class / Cohort",
      render: (st) => (
        <span style={{ fontSize: "0.8125rem", color: "var(--color-text)" }}>
          {st.grade || "General"}
        </span>
      ),
    },
    {
      key: "exam_status",
      header: "Assessment Status",
      align: "center",
      width: "160px",
      render: (st) => {
        const status = st.exam_status || "not_started";
        const isCompleted = status === "completed";
        return (
          <span className={`${styles.statusTag} ${isCompleted ? styles.statusCompleted : styles.statusPending}`}>
            {isCompleted ? "Completed" : status === "in_progress" ? "In Progress" : "Not Started"}
          </span>
        );
      },
    },
    {
      key: "score",
      header: "Recorded Score",
      render: (st) => {
        if (st.exam_status !== "completed" || st.score === undefined || st.score === null) {
          return <span style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>—</span>;
        }
        const pct = scorePct(st.score, st.total_score || 100);
        const grade = letterGrade(pct);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: "var(--color-text)" }}>
              {st.score}
            </span>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem", color: "var(--color-muted)" }}>
              ({pct}% · {grade})
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      width: "180px",
      render: (st) => {
        const isCompleted = st.exam_status === "completed";
        return (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
            {isCompleted ? (
              <Button variant="secondary" size="xs" onClick={() => openReview(st)}>
                Review Submission
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setUnenrollTarget(st)}
                title="Remove candidate from course"
                style={{ color: "var(--color-danger, #DC2626)" }}
              >
                Remove
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      {toast && (
        <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", padding: "0.65rem 1rem", borderRadius: "8px", background: "var(--color-text)", color: "#FFFFFF", fontSize: "0.8125rem", fontWeight: 600, zIndex: 1100 }}>
          {toast.text}
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────── */}
      <PageHeader
        eyebrow="Roster & Enrolled Candidates"
        title="Student Directory"
        subtitle={`Session ${currentSessionName} · ${currentTermName}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)" }}>Course:</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(Number(e.target.value))}
              style={{
                padding: "0.4rem 0.65rem",
                borderRadius: "6px",
                border: "1px solid var(--color-border)",
                background: "#FFFFFF",
                fontSize: "0.8125rem",
                color: "var(--color-text)",
              }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusIcon width="13" height="13" />}
              onClick={() => {
                setEnrollModalOpen(true);
                loadAllStudents();
              }}
              disabled={!selectedSubjectId}
            >
              Enroll Students
            </Button>
          </div>
        }
      />

      {error && (
        <div style={{ padding: "0.875rem 1rem", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-danger, #DC2626)", fontSize: "0.8125rem" }}>
          {error}
        </div>
      )}

      {/* ── Minimalist KPI Metrics Row ──────────────────────── */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Enrolled Roster</span>
            <div className={styles.statIcon} style={{ color: "#4F46E5" }}><UsersIcon width="15" height="15" /></div>
          </div>
          <div>
            <div className={styles.statValue}>{students.length}</div>
            <div className={styles.statFootnote}>{activeSubject?.code || "Subject"} candidates</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Submitted Exams</span>
            <div className={styles.statIcon} style={{ color: "#10B981" }}><CheckCircleIcon width="15" height="15" /></div>
          </div>
          <div>
            <div className={styles.statValue}>{completedCount}</div>
            <div className={styles.statFootnote}>Evaluations completed</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Active Attempts</span>
            <div className={styles.statIcon} style={{ color: "#F97316" }}><ClockIcon width="15" height="15" /></div>
          </div>
          <div>
            <div className={styles.statValue}>{inProgressCount}</div>
            <div className={styles.statFootnote}>In-progress CBT sessions</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Pending Intake</span>
            <div className={styles.statIcon} style={{ color: "#06B6D4" }}><BookIcon width="15" height="15" /></div>
          </div>
          <div>
            <div className={styles.statValue}>{notStartedCount}</div>
            <div className={styles.statFootnote}>Not yet commenced</div>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <FilterBar
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search candidates by name, reg ID, class..."
        hasActiveFilters={Boolean(query)}
        onReset={() => setQuery("")}
      />

      {/* ── Students Table ─────────────────────────────────────── */}
      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={filteredStudents}
          keyExtractor={(st) => st.id}
          loading={loading}
          emptyTitle="No Candidates Enrolled"
          emptySubtitle={query ? "No candidates match your search." : "No candidates enrolled in this subject yet."}
        />
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <ReviewModal
          activeSubjectName={activeSubject?.name || "Exam Assessment"}
          studentName={reviewModal.name}
          reviewData={reviewData}
          reviewLoading={reviewLoading}
          onClose={() => setReviewModal(null)}
          onGradeUpdate={async () => {
            if (selectedSubjectId) await loadStudents(selectedSubjectId);
          }}
        />
      )}

      {/* Enroll Students Modal */}
      <Modal open={enrollModalOpen} onClose={() => setEnrollModalOpen(false)} size="md">
        <form onSubmit={handleEnroll} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--color-text)" }}>
              Enroll Students — {activeSubject?.name} ({activeSubject?.code})
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "0.25rem" }}>
              Add candidates individually or bulk enroll an entire cohort into this subject roster.
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setEnrollMode("cohort")}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: enrollMode === "cohort" ? "var(--color-primary, #0F172A)" : "#FFFFFF",
                color: enrollMode === "cohort" ? "#FFFFFF" : "var(--color-text)",
                cursor: "pointer",
              }}
            >
              By Class / Cohort
            </button>
            <button
              type="button"
              onClick={() => setEnrollMode("individual")}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: enrollMode === "individual" ? "var(--color-primary, #0F172A)" : "#FFFFFF",
                color: enrollMode === "individual" ? "#FFFFFF" : "var(--color-text)",
                cursor: "pointer",
              }}
            >
              Individual Student
            </button>
          </div>

          {enrollMode === "cohort" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text)" }}>
                Select Cohort / Class Level:
              </label>
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.875rem",
                }}
              >
                <option value="JSS 1">JSS 1</option>
                <option value="JSS 2">JSS 2</option>
                <option value="JSS 3">JSS 3</option>
                <option value="SSS 1">SSS 1</option>
                <option value="SSS 2">SSS 2</option>
                <option value="SSS 3">SSS 3</option>
                <option value="All Cohorts">All Cohorts / All Students</option>
              </select>
              <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                This will automatically enroll all active candidates in {selectedCohort} who are not already enrolled.
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text)" }}>
                Search & Select Candidate:
              </label>
              <input
                type="text"
                placeholder="Search by name, email, or reg ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.8125rem",
                }}
              />
              <div
                style={{
                  maxHeight: "220px",
                  overflowY: "auto",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  padding: "0.25rem",
                }}
              >
                {allStudents
                  .filter((s) => {
                    const enrolledIds = new Set(students.map((e) => e.id));
                    if (enrolledIds.has(s.id)) return false;
                    const q = studentSearch.toLowerCase();
                    if (!q) return true;
                    return (
                      s.name?.toLowerCase().includes(q) ||
                      s.email?.toLowerCase().includes(q) ||
                      s.reg_id?.toLowerCase().includes(q)
                    );
                  })
                  .map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      style={{
                        padding: "0.45rem 0.65rem",
                        borderRadius: "4px",
                        background: selectedStudentId === s.id ? "var(--color-surface-2, #F1F5F9)" : "transparent",
                        border: selectedStudentId === s.id ? "1px solid var(--color-border)" : "1px solid transparent",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)" }}>{s.name}</div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--color-muted)" }}>{s.reg_id || s.email} · {s.grade || "General"}</div>
                      </div>
                      {selectedStudentId === s.id && (
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-primary, #4F46E5)" }}>Selected</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
            <Button variant="secondary" size="sm" type="button" onClick={() => setEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={enrollSubmitting}>
              {enrollMode === "cohort" ? `Enroll ${selectedCohort}` : "Enroll Selected Student"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unenroll Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(unenrollTarget)}
        title="Remove Candidate from Course"
        message={`Are you sure you want to unenroll ${unenrollTarget?.name || "this student"} from ${activeSubject?.name}? They will no longer see this exam on their dashboard.`}
        confirmLabel="Remove Student"
        variant="danger"
        loading={unenrollLoading}
        onConfirm={handleUnenroll}
        onClose={() => setUnenrollTarget(null)}
      />
    </div>
  );
}
