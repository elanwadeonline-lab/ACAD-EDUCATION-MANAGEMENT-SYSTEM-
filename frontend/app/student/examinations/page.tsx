"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useAcademic } from "../../../components/context/AcademicContext";
import { Modal } from "../../../components/ui/Modal";
import { api } from "../../../lib/api";
import type { Subject, ExamResult } from "../../../lib/types";
import { groupStudentAssessments } from "../../../lib/studentDashboard";
import styles from "../../../components/student/AssessmentFlow.module.css";

type Assessment = Subject & { exam_body?: string; awaitingPublication?: boolean };
export default function ExaminationsPage() { return <RequireRole role="student"><Examinations /></RequireRole>; }

function Examinations() {
  const router = useRouter();
  const { selectedSession, selectedTerm } = useAcademic();
  const [subjects, setSubjects] = useState<Assessment[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [activeExamsList, setActiveExamsList] = useState<any[]>([]);
  const [retakeAuths, setRetakeAuths] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSelected(null);
    setSubjects([]);
    setResults([]);
    setActiveExamsList([]);
    setRetakeAuths([]);

    Promise.all([
      api.getSubjects(selectedSession?.id, selectedTerm?.id),
      api.getResults(selectedSession?.id, selectedTerm?.id),
      api.getActiveExams(),
      api.getRetakeAuthorizations().catch(() => []),
    ])
      .then(([papers, scores, clock, retakes]) => {
        if (active) {
          setSubjects(papers || []);
          setResults(scores || []);
          const rawActive = Array.isArray(clock) ? clock : ((clock as any)?.exams ?? []);
          setActiveExamsList(rawActive);
          setRetakeAuths(retakes || []);
          const time = (clock as { server_time?: string })?.server_time;
          if (time) setNow(new Date(time).getTime());
        }
      })
      .catch((e) => {
        if (active) setError(e.message || "Could not load assessments.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const timer = setInterval(() => setNow((time) => time + 1000), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedSession?.id, selectedTerm?.id]);

  const taken = useMemo(
    () => new Set(results.filter((r) => r.status === "completed").map((r) => Number(r.subject_id))),
    [results]
  );

  const retakeAuthSet = useMemo(() => {
    const s = new Set<number>();
    for (const r of retakeAuths) {
      if (r && r.subject_id && Number(r.used_attempts || 0) < Number(r.max_attempts || 1)) {
        s.add(Number(r.subject_id));
      }
    }
    return s;
  }, [retakeAuths]);

  const inProgressSet = useMemo(() => {
    const s = new Set<number>();
    for (const ae of activeExamsList) {
      if (ae && ae.subject_id && ae.status === "in-progress") s.add(Number(ae.subject_id));
    }
    return s;
  }, [activeExamsList]);

  const visible = useMemo(() => {
    return subjects.filter((s) => {
      const sid = Number(s.id);
      return (
        Number(s.is_published) === 1 ||
        Number(s.is_timetable_published) === 1 ||
        taken.has(sid) ||
        inProgressSet.has(sid) ||
        (s.exam_datetime && !s.exam_datetime.startsWith("2099"))
      );
    });
  }, [subjects, taken, inProgressSet]);

  const bodyOf = (s: Assessment) => s.exam_body || "School assessments";
  const bodies = useMemo(() => [...new Set(visible.map(bodyOf))], [visible]);

  const groups = useMemo(
    () => groupStudentAssessments(subjects, taken, now, activeExamsList, results, retakeAuths),
    [subjects, taken, now, activeExamsList, results, retakeAuths]
  );

  const status = (s: Assessment) => {
    const sid = Number(s.id);
    if (inProgressSet.has(sid)) return "In Progress — Resume Examination";
    if (groups.awaitingGradingExams.some((p) => p.id === s.id)) return "Submitted — Awaiting Teacher Grading";
    if (retakeAuthSet.has(sid)) return "Retake Authorized — Available";
    if (taken.has(sid)) return "Completed";
    if (groups.assignmentItems.some((p) => p.id === s.id)) return "Assignment available";
    if (groups.liveExams.some((p) => p.id === s.id)) return "Available now";
    if (groups.upcomingAwaitingPublicationExams.some((p) => p.id === s.id)) return "Upcoming — Awaiting Question Publication";
    if (groups.upcomingExams.some((p) => p.id === s.id)) {
      return s.exam_datetime ? `Scheduled for ${new Date(s.exam_datetime).toLocaleDateString("en-GB")}` : "Scheduled";
    }
    if (groups.expiredExams.some((p) => p.id === s.id)) return "Window closed";
    if (groups.unscheduledExams.some((p) => p.id === s.id)) return "Date to be announced";
    return "Scheduled";
  };

  const isSelInProgress = selected ? inProgressSet.has(Number(selected.id)) : false;
  const isSelRetakeAuth = selected ? retakeAuthSet.has(Number(selected.id)) : false;
  const isSelCompleted = selected ? taken.has(Number(selected.id)) && !isSelRetakeAuth : false;
  const isSelAwaitingGrading = selected ? groups.awaitingGradingExams.some((p) => p.id === selected.id) : false;
  const isSelLive = selected ? groups.liveExams.some((p) => p.id === selected.id) : false;
  const isSelAssignment = selected ? groups.assignmentItems.some((p) => p.id === selected.id) : false;

  const ready = selected && (isSelInProgress || isSelRetakeAuth || isSelLive || isSelAssignment);

  return (
    <div className={styles.page}>
      <header>
        <span className={styles.eyebrow}>Your assessment desk</span>
        <h1>Examinations & assignments</h1>
        <p>Select an examination body to browse the available assessments.</p>
      </header>

      {loading ? (
        <p role="status">Loading assessments…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <div className={styles.filters}>
            <label>
              Examination body
              <select
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setSelected(null);
                }}
              >
                <option value="">Choose an exam body</option>
                {bodies.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>

          {!body ? (
            <p className={styles.empty}>
              {bodies.length ? "Choose an exam body to view its assessments." : "No assessments are currently available."}
            </p>
          ) : (
            <div className={styles.list}>
              {visible
                .filter((p) => bodyOf(p) === body)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={styles.row}
                    aria-haspopup="dialog"
                    onClick={() => setSelected(p)}
                  >
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {status(p)} · {p.window_duration || 120} minutes
                      </small>
                    </span>
                    <span>View details →</span>
                  </button>
                ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || "Assessment details"}
        description="Review the assessment before opening the exam hall."
        size="sm"
      >
        {selected && (
          <div className={styles.details}>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{status(selected)}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{selected.window_duration || 120} minutes</dd>
              </div>
              {selected.exam_datetime && !selected.exam_datetime.startsWith("2099") && (
                <div>
                  <dt>Scheduled time</dt>
                  <dd>{new Date(selected.exam_datetime).toLocaleString("en-GB")}</dd>
                </div>
              )}
            </dl>

            <p>
              {isSelInProgress
                ? "You have an active session for this examination in progress. You can resume directly."
                : isSelRetakeAuth
                ? "An administrative retake has been authorized for this examination."
                : isSelAwaitingGrading
                ? "Your answers have been submitted. Subjective essay questions are currently awaiting teacher evaluation."
                : isSelCompleted
                ? "You have already completed this examination sitting."
                : ready
                ? "Choose Open exam hall to continue to the exam instructions and start controls."
                : "This assessment cannot be started from its current status."}
            </p>

            <div className={styles.actions}>
              {isSelInProgress ? (
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => router.push(`/student/exam?subjectId=${selected.id}`)}
                >
                  Resume examination →
                </button>
              ) : isSelRetakeAuth ? (
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => router.push(`/student/exam?subjectId=${selected.id}`)}
                >
                  Start authorized retake →
                </button>
              ) : isSelAwaitingGrading ? (
                <Link href="/student/results">View submission status →</Link>
              ) : isSelCompleted ? (
                <Link href="/student/results">View published results →</Link>
              ) : (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!ready}
                  onClick={() => router.push(`/student/exam?subjectId=${selected.id}`)}
                >
                  Open exam hall →
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
