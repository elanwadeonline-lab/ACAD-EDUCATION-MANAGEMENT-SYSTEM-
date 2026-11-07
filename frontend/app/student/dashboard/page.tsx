"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { LearningOverview } from "../../../components/student/LearningOverview";
import { StudentLearningSummary } from "../../../components/learning/StudentLearningSummary";
import { groupStudentAssessments } from "../../../lib/studentDashboard";
import { api } from "../../../lib/api";
import type {
  Subject,
  ExamResult,
  ActiveExamData,
} from "../../../lib/types";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useAuth } from "../../../hooks/useAuth";
import { useAcademic } from "../../../components/context/AcademicContext";
import { useToast } from "../../../hooks/useToast";
import { scorePct, letterGrade } from "../../../lib/gradeUtils";
import { CalendarIcon, GraduationCapIcon, AwardIcon } from "../../../components/icons/StudentIcons";
import { StudentThemeToggle } from "../../../components/student/StudentThemeToggle";
import { useOfflineAutoSync } from "../../../hooks/useOfflineAutoSync";
import styles from "./page.module.css";

export default function StudentDashboardPage() {
  return (
    <RequireRole role="student">
      <DashboardContent />
    </RequireRole>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { selectedSession, selectedTerm } = useAcademic();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [activeExamsList, setActiveExamsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const timeOffsetRef = useRef<number>(0);

  const { showToast } = useToast();

  useOfflineAutoSync((n) => {
    if (n > 0) showToast(`${n} saved submission${n === 1 ? "" : "s"} synced to the school server.`, "success");
  });

  const [telemetry, setTelemetry] = useState<import("../../../lib/types").StudentTelemetry | null>(null);

  const fetchData = async (signal?: AbortSignal, isInitial = false) => {
    try {
      const [subjectsData, resultsData, activeData, telemetryData] = await Promise.all([
        api.getSubjects(selectedSession?.id, selectedTerm?.id),
        api.getResults(selectedSession?.id, selectedTerm?.id),
        api.getActiveExams(),
        api.getStudentTelemetry().catch(() => null),
      ]);

      if (signal?.aborted) return;

      setTelemetry(telemetryData);

      const payload = activeData as ActiveExamData;
      if (payload && payload.server_time) {
        const serverMs = new Date(payload.server_time).getTime();
        timeOffsetRef.current = serverMs - Date.now();
      }
      const rawActive = Array.isArray(activeData) ? activeData : ((activeData as any)?.exams ?? []);
      setActiveExamsList(rawActive);

      const now = Date.now() + timeOffsetRef.current;
      setSubjects(subjectsData ?? []);
      setResults(resultsData ?? []);
    } catch (err: any) {
      if (signal?.aborted) return;
      if (isInitial) setError(err.message || "Failed to load dashboard data");
    } finally {
      if (!signal?.aborted && isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const abortController = new AbortController();

    fetchData(abortController.signal, true).then(() => {
      if (!mounted) return;
    });
    const interval = setInterval(() => {
      fetchData(abortController.signal, false);
    }, 15000);
    const clockInterval = setInterval(() => setCurrentTime(Date.now() + timeOffsetRef.current), 1000);

    const onNotif = () => {
      if (mounted) {
        fetchData(abortController.signal, false);
      }
    };
    window.addEventListener("notification_received", onNotif);

    return () => {
      mounted = false;
      abortController.abort();
      clearInterval(interval);
      clearInterval(clockInterval);
      window.removeEventListener("notification_received", onNotif);
    };
  }, [selectedSession?.id, selectedTerm?.id]);

  const completedResults = useMemo(
    () => results.filter((r) => r.status === "completed"),
    [results]
  );

  const releasedResults = useMemo(
    () =>
      completedResults.filter((r) => {
        const isPractice = Boolean(r.practice_id) || r.subject_name?.includes("JAMB") || r.subject_name?.includes("UTME");
        return isPractice || (r.is_result_released !== false && (r.result_status === "released" || !r.result_status));
      }),
    [completedResults]
  );

  const takenIds = useMemo(
    () => new Set(completedResults.map((r) => Number(r.subject_id))),
    [completedResults]
  );

  const allDisplaySubjects = useMemo(() => {
    const map = new Map<number, Subject>();
    for (const s of subjects) {
      map.set(Number(s.id), s);
    }
    for (const r of completedResults) {
      const sid = Number(r.subject_id);
      if (sid && !map.has(sid)) {
        map.set(sid, {
          id: sid,
          name: r.subject_name || "Examination Paper",
          code: (r as any).subject_code || (r.subject_name ? r.subject_name.slice(0, 6).toUpperCase() : "EXAM"),
          term: (r as any).term || "Current Term",
          total_score: Number(r.total_score || 100),
          teacher_id: 0,
          is_published: 1,
          mode: ((r as any).subject_mode as any) || "exam",
        });
      }
    }
    return Array.from(map.values());
  }, [subjects, completedResults]);

  const { liveExams, upcomingExams, completedExams, expiredExams, unscheduledExams, assignmentItems, inProgressExams } = useMemo(
    () => groupStudentAssessments(allDisplaySubjects, takenIds, currentTime, activeExamsList, results),
    [allDisplaySubjects, takenIds, currentTime, activeExamsList, results]
  );

  // Academic Performance Analytics (Part A2) — Real data only, zero invented formulas
  const academicAnalytics = useMemo(() => {
    const count = releasedResults.length;
    if (count === 0) {
      return {
        avgPct: 0,
        avgGrade: "—",
        highestPct: 0,
        highestSubject: "—",
        formalAvg: null as number | null,
        practiceAvg: null as number | null,
        deltaFromPrior: null as number | null,
        subjectBreakdown: [] as Array<{
          id: number;
          subjectName: string;
          code: string;
          score: number;
          total: number;
          pct: number;
          grade: string;
          date: string;
        }>,
        trendSeries: [] as Array<{ label: string; subject: string; pct: number }>,
      };
    }

    const withPct = releasedResults.map((r) => {
      const pct = scorePct(r.score, r.total_score);
      const isPractice = Boolean(r.practice_id) || r.subject_name?.includes("JAMB") || r.subject_name?.includes("UTME");
      return {
        id: r.id,
        subjectId: Number(r.subject_id),
        subjectName: r.subject_name || "Assessment",
        code: isPractice ? "PRACTICE" : "EXAM",
        score: Number(r.score ?? 0),
        total: Number(r.total_score ?? 100),
        pct,
        grade: letterGrade(pct),
        isPractice,
        endTime: r.end_time || "",
      };
    });

    const sumPct = withPct.reduce((acc, item) => acc + item.pct, 0);
    const avgPct = Math.round(sumPct / count);
    const avgGrade = letterGrade(avgPct);

    const sortedByPct = [...withPct].sort((a, b) => b.pct - a.pct);
    const highest = sortedByPct[0];

    const formalItems = withPct.filter((i) => !i.isPractice);
    const practiceItems = withPct.filter((i) => i.isPractice);

    const formalAvg =
      formalItems.length > 0
        ? Math.round(formalItems.reduce((a, b) => a + b.pct, 0) / formalItems.length)
        : null;
    const practiceAvg =
      practiceItems.length > 0
        ? Math.round(practiceItems.reduce((a, b) => a + b.pct, 0) / practiceItems.length)
        : null;

    // Chronological trend & comparison with earlier sittings when >= 2 results exist
    const chronological = [...withPct].sort((a, b) => {
      if (!a.endTime || !b.endTime) return a.id - b.id;
      return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
    });

    let deltaFromPrior: number | null = null;
    if (chronological.length >= 2) {
      const latest = chronological[chronological.length - 1];
      const priorAvg = Math.round(
        chronological.slice(0, -1).reduce((a, b) => a + b.pct, 0) / (chronological.length - 1)
      );
      deltaFromPrior = latest.pct - priorAvg;
    }

    //Latest score per subject for Subject Performance BarList
    const subjectMap = new Map<string, (typeof withPct)[number]>();
    for (const item of chronological) {
      const key = item.subjectId ? `id_${item.subjectId}` : item.subjectName;
      subjectMap.set(key, item);
    }
    const subjectBreakdown = Array.from(subjectMap.values())
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        subjectName: item.subjectName,
        code: item.code,
        score: item.score,
        total: item.total,
        pct: item.pct,
        grade: item.grade,
        date: item.endTime
          ? new Date(item.endTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
          : "Completed",
      }));

    const trendSeries = chronological.slice(-8).map((item, idx) => ({
      label: item.endTime
        ? new Date(item.endTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
        : `#${idx + 1}`,
      subject: item.subjectName,
      pct: item.pct,
    }));

    return {
      avgPct,
      avgGrade,
      highestPct: highest?.pct ?? 0,
      highestSubject: highest?.subjectName ?? "—",
      formalAvg,
      practiceAvg,
      deltaFromPrior,
      subjectBreakdown,
      trendSeries,
    };
  }, [releasedResults]);

  return (
    <div className={styles.container}>


      {/* ── 1. Institutional Candidate Identity Header ── */}
      <header className={styles.headerBar}>
        <div className={styles.headerIdentity}>
          <div className={styles.eyebrowRow}>
            {selectedSession?.name && (
              <span className={styles.sessionBadge}>
                {selectedSession.name}
                {selectedTerm?.name ? ` · ${selectedTerm.name}` : ""}
              </span>
            )}
            <span className={styles.metaPill}>
              Cohort: {user?.grade || telemetry?.cohortName || "General"}
            </span>
            {user?.reg_id && (
              <span className={styles.metaPill}>Reg ID: {user.reg_id}</span>
            )}
          </div>
          <h1 className={styles.pageTitle}>Learning insights</h1>
          <p className={styles.pageSubtitle}>
            {user?.name ? `${user.name}, here’s your learning at a glance.` : "Adaptive learning. Steady progress."}
          </p>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.referenceDate}><CalendarIcon width="20" height="20" />{new Date(currentTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
          <Link href="/student/report-card" className={styles.secondaryBtn}>
            <GraduationCapIcon width="15" height="15" />
            <span>Term Report Card</span>
          </Link>
          <Link href="/student/results" className={styles.secondaryBtn}>
            <AwardIcon width="15" height="15" />
            <span>All Results ({completedResults.length})</span>
          </Link>
          <StudentThemeToggle />
        </div>
      </header>

      <nav className={styles.sectionNav} aria-label="Learning sections"><Link href="/student/dashboard">Overview</Link><Link href="/student/examinations">Examinations</Link><Link href="/student/practice">Practice</Link><Link href="/student/results">Results</Link></nav>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--color-danger-bg)",
            color: "var(--color-danger)",
            borderRadius: "8px",
            border: "1px solid var(--color-danger-border)",
            fontSize: "0.8125rem",
          }}
        >
          {error}
        </div>
      )}

      {inProgressExams.length > 0 && (
        <div style={{
          marginBottom: "1.25rem",
          padding: "1rem 1.25rem",
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div>
            <strong style={{ display: "block", color: "var(--color-text)", fontSize: "0.9375rem" }}>
              Assessment In Progress: {inProgressExams[0].name}
            </strong>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Your examination timer is running on the server. Resume your session before the window closes.
            </span>
          </div>
          <Link
            href={`/student/exam?subjectId=${inProgressExams[0].id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#D97706",
              color: "#FFFFFF",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.875rem",
              textDecoration: "none"
            }}
          >
            Resume Examination →
          </Link>
        </div>
      )}

      <LearningOverview
        loading={loading}
        average={releasedResults.length ? academicAnalytics.avgPct : null}
        grade={academicAnalytics.avgGrade}
        delta={academicAnalytics.deltaFromPrior}
        trend={academicAnalytics.trendSeries.map(point => ({ label: point.label, score: point.pct, subject: point.subject }))}
        subjects={academicAnalytics.subjectBreakdown}
        results={[...releasedResults].sort((a,b) => (b.end_time ? new Date(b.end_time).getTime() : b.id) - (a.end_time ? new Date(a.end_time).getTime() : a.id))}
        telemetry={telemetry}
        completed={completedExams.length}
        total={allDisplaySubjects.length}
        formalAverage={academicAnalytics.formalAvg}
        practiceAverage={academicAnalytics.practiceAvg}
        highestSubject={academicAnalytics.highestSubject}
        highestScore={releasedResults.length ? academicAnalytics.highestPct : null}
      />
      <StudentLearningSummary />

    </div>
  );
}
