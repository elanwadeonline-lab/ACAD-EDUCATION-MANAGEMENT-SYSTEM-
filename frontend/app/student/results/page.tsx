"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useAcademic } from "../../../components/context/AcademicContext";
import { useToast } from "../../../hooks/useToast";
import { api } from "../../../lib/api";
import type { ExamResult, Subject } from "../../../lib/types";
import { Button } from "../../../components/ui";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { StudentReviewModal } from "../../../components/student/StudentReviewModal";
import { scorePct, letterGrade } from "../../../lib/gradeUtils";
import {
  AwardIcon,
  CheckCircleIcon,
  ClockIcon,
  TrendingUpIcon,
} from "../../../components/icons/StudentIcons";
import styles from "./page.module.css";

export default function StudentResultsPage() {
  return (
    <RequireRole role="student">
      <StudentResults />
    </RequireRole>
  );
}

function StudentResults() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { selectedSession, selectedTerm } = useAcademic();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"all" | "exams" | "practice">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [retaking, setRetaking] = useState<number | null>(null);
  const [reviewingExam, setReviewingExam] = useState<{ id: number; subjectName: string } | null>(null);
  const [retakeTarget, setRetakeTarget] = useState<{ examId: number; subjectId: number } | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);

    Promise.all([
      api.getResults(selectedSession?.id, selectedTerm?.id),
      api.getSubjects(selectedSession?.id, selectedTerm?.id),
    ])
      .then(([resData, subData]) => {
        if (signal.aborted) return;
        setResults((resData as ExamResult[])?.filter((r) => r.status === "completed") ?? []);
        setSubjects((subData as Subject[]) ?? []);
      })
      .catch(() => {
        if (!signal.aborted) showToast("Failed to load assessment results.", "error");
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedSession?.id, selectedTerm?.id, showToast]);

  const confirmRetake = async () => {
    if (!retakeTarget) return;
    setRetaking(retakeTarget.examId);
    setRetakeTarget(null);
    try {
      await api.retakeExam(retakeTarget.examId);
      localStorage.removeItem(`exam_answers_${retakeTarget.examId}`);
      router.push(`/student/exam?subjectId=${retakeTarget.subjectId}`);
    } catch (err: any) {
      showToast(err.message || "Failed to retake exam.", "error");
      setRetaking(null);
    }
  };

  const filteredResults = useMemo(() => {
    let base = results;
    if (selectedTab === "exams") {
      base = results.filter(
        (r) => !r.practice_id && !r.subject_name?.includes("JAMB") && !r.subject_name?.includes("UTME")
      );
    } else if (selectedTab === "practice") {
      base = results.filter(
        (r) => Boolean(r.practice_id) || r.subject_name?.includes("JAMB") || r.subject_name?.includes("UTME")
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => (r.subject_name || "").toLowerCase().includes(q));
  }, [results, selectedTab, searchQuery]);

  const releasedResults = useMemo(() => {
    return results.filter((r) => {
      const isPractice =
        Boolean(r.practice_id) || r.subject_name?.includes("JAMB") || r.subject_name?.includes("UTME");
      return isPractice || (r.is_result_released !== false && (r.result_status === "released" || !r.result_status));
    });
  }, [results]);

  const stats = useMemo(() => {
    const count = releasedResults.length;
    if (count === 0) return { count: 0, totalCompleted: results.length, avg: 0, highest: 0, gradeLetter: "—" };
    const percentages = releasedResults.map((r) => scorePct(r.score, r.total_score));
    const avg = Math.round(percentages.reduce((a, b) => a + b, 0) / count);
    const highest = Math.max(...percentages);
    const gradeLetter = letterGrade(highest);
    return { count, totalCompleted: results.length, avg, highest, gradeLetter };
  }, [releasedResults, results.length]);

  const chartData = useMemo(() => {
    return releasedResults.slice(-8).map((r) => {
      const pct = scorePct(r.score, r.total_score);
      const shortName =
        (r.subject_name || "Exam").length > 14
          ? `${(r.subject_name || "Exam").slice(0, 12)}…`
          : r.subject_name || "Exam";
      return {
        id: r.id,
        name: shortName,
        fullName: r.subject_name || "Exam",
        pct,
        score: r.score ?? 0,
        total: r.total_score || 100,
        grade: letterGrade(pct),
      };
    });
  }, [releasedResults]);

  const schoolExamsCount = useMemo(() => {
    return results.filter(
      (r) => !r.practice_id && !r.subject_name?.includes("JAMB") && !r.subject_name?.includes("UTME")
    ).length;
  }, [results]);

  const practiceCount = useMemo(() => {
    return results.filter(
      (r) => Boolean(r.practice_id) || r.subject_name?.includes("JAMB") || r.subject_name?.includes("UTME")
    ).length;
  }, [results]);

  return (
    <div className={styles.container}>
      <ConfirmDialog
        open={!!retakeTarget}
        onClose={() => setRetakeTarget(null)}
        onConfirm={confirmRetake}
        title="Retake Examination Sitting?"
        message="Your previous attempt score will be archived and a new sitting attempt will be initialized."
        confirmLabel="Retake Sitting"
        loading={retaking !== null}
      />

      {/* ── 1. Institutional Header & Telemetry Strip ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Academic Performance &amp; Results</h1>
          <p className={styles.heroSubtitle}>
            Verified evaluation records, subject-by-subject comparisons, and question-level script reviews.
          </p>
        </div>

        <div className={styles.telemetryPillGroup}>
          <div className={styles.telemetryBadge}>
            <div className={styles.telemetryIcon}>
              <AwardIcon width="18" height="18" />
            </div>
            <div className={styles.telemetryBadgeContent}>
              <span className={styles.telemetryNumber}>
                {selectedSession?.name || "Current Session"}
              </span>
              <span className={styles.telemetryText}>
                {selectedTerm?.name || "Active Academic Term"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. 3-KPI Analytics Strip ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Completed Evaluations</span>
          <span className={styles.statValue}>{stats.totalCompleted}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cumulative Average</span>
          <span className={styles.statValue}>
            {stats.count > 0 ? `${stats.avg}% (${letterGrade(stats.avg)})` : "—"}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Top Attainment</span>
          <span className={styles.statValue}>
            {stats.count > 0 ? `${stats.highest}% (${stats.gradeLetter})` : "—"}
          </span>
        </div>
      </div>

      {/* ── 2.5 Visual Subject Performance Comparison (Part A2) ── */}
      {chartData.length > 0 && (
        <section className={styles.analyticsSection}>
          <div className={styles.analyticsCard}>
            <div className={styles.analyticsHeader}>
              <div>
                <h2 className={styles.analyticsTitle}>Subject Score Comparison</h2>
                <p className={styles.analyticsSubtitle}>
                  Percentage attainment across recent released assessments.
                </p>
              </div>
              <TrendingUpIcon width="16" height="16" style={{ color: "#92400E" }} />
            </div>
            <div style={{ width: "100%", height: 195 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                    }}
                    formatter={(val: any, _n: any, p: any) => [
                      `${val}% (${p?.payload?.score}/${p?.payload?.total} · Grade ${p?.payload?.grade})`,
                      p?.payload?.fullName || "Subject",
                    ]}
                  />
                  <Bar dataKey="pct" radius={[5, 5, 0, 0]} maxBarSize={38}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={
                          entry.pct >= 70 ? "#059669" : entry.pct >= 50 ? "#92400E" : "#D97706"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.analyticsCard}>
            <div className={styles.analyticsHeader}>
              <div>
                <h2 className={styles.analyticsTitle}>Grade Distribution</h2>
                <p className={styles.analyticsSubtitle}>
                  Summary of released sittings by performance band.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "0.25rem" }}>
              {[
                {
                  label: "Distinction & Credit (70% – 100%)",
                  count: chartData.filter((d) => d.pct >= 70).length,
                  color: "#059669",
                },
                {
                  label: "Pass Band (50% – 69%)",
                  count: chartData.filter((d) => d.pct >= 50 && d.pct < 70).length,
                  color: "#92400E",
                },
                {
                  label: "Needs Improvement (< 50%)",
                  count: chartData.filter((d) => d.pct < 50).length,
                  color: "#D97706",
                },
              ].map((band) => {
                const bandPct =
                  chartData.length > 0 ? Math.round((band.count / chartData.length) * 100) : 0;
                return (
                  <div key={band.label} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{band.label}</span>
                      <span style={{ fontWeight: 700, color: "var(--color-text-2)", fontVariantNumeric: "tabular-nums" }}>
                        {band.count} ({bandPct}%)
                      </span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressBar}
                        style={{ width: `${bandPct}%`, background: band.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Enrolled Assessment Records Container ── */}
      <section className={styles.resultsContainer}>
        <div className={styles.resultsHeader}>
          <div className={styles.resultsTitleGroup}>
            <div className={styles.resultsIconBadge}>
              <CheckCircleIcon width="18" height="18" />
            </div>
            <div>
              <span className={styles.resultsEyebrow}>Evaluation Records</span>
              <h2 className={styles.resultsClassTitle}>
                Submitted Evaluations ({filteredResults.length})
              </h2>
            </div>
          </div>

          <div className={styles.controlsRow}>
            <input
              type="search"
              className={styles.searchBox}
              placeholder="Filter by subject name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter evaluations by subject name"
            />

            {/* Filter Tab Chips */}
            <div className={styles.tabList}>
              <button
                type="button"
                className={`${styles.tabBtn} ${selectedTab === "all" ? styles.tabBtnActive : ""}`}
                onClick={() => setSelectedTab("all")}
              >
                <span>All</span>
                <span className={styles.tabCount}>{results.length}</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${selectedTab === "exams" ? styles.tabBtnActive : ""}`}
                onClick={() => setSelectedTab("exams")}
              >
                <span>School Exams</span>
                <span className={styles.tabCount}>{schoolExamsCount}</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${selectedTab === "practice" ? styles.tabBtnActive : ""}`}
                onClick={() => setSelectedTab("practice")}
              >
                <span>Practice</span>
                <span className={styles.tabCount}>{practiceCount}</span>
              </button>
            </div>

            {/* Table vs Cards View Toggle */}
            <div className={styles.viewToggle} role="group" aria-label="Result presentation mode">
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === "table" ? styles.viewToggleBtnActive : ""}`}
                onClick={() => setViewMode("table")}
              >
                Table
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === "cards" ? styles.viewToggleBtnActive : ""}`}
                onClick={() => setViewMode("cards")}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", gap: "0.75rem", color: "var(--color-text-2)", fontSize: "0.875rem" }}>
            <div className="spinner" style={{ width: 22, height: 22, borderColor: "#E2E8F0", borderTopColor: "#92400E" }} />
            <span>Loading examination results…</span>
          </div>
        ) : filteredResults.length === 0 ? (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px dashed #E2E8F0",
              borderRadius: "16px",
              padding: "3.5rem 2rem",
              textAlign: "center",
            }}
          >
            <AwardIcon width="36" height="36" style={{ color: "#94A3B8", margin: "0 auto 0.75rem" }} />
            <div style={{ fontWeight: 700, color: "var(--color-text-2)", fontSize: "0.9375rem", marginBottom: "0.25rem" }}>
              No Matching Evaluation Submissions
            </div>
            <div style={{ color: "var(--color-text-2)", fontSize: "0.8125rem" }}>
              Completed formal test sittings and practice sessions will appear here.
            </div>
          </div>
        ) : viewMode === "table" ? (
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Date Submitted</th>
                  <th className={styles.numCell}>Marks</th>
                  <th className={styles.numCell}>Percentage</th>
                  <th className={styles.numCell}>Grade</th>
                  <th>Status</th>
                  <th className={styles.numCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r) => {
                  const subject = subjects.find((s) => s.id === Number(r.subject_id));
                  const isPractice =
                    Boolean(r.practice_id) ||
                    r.subject_name?.includes("JAMB") ||
                    r.subject_name?.includes("UTME");
                  const isReleased =
                    isPractice ||
                    (r.is_result_released !== false &&
                      (r.result_status === "released" || !r.result_status));
                  const pct = isReleased && r.score !== null ? scorePct(r.score, r.total_score) : 0;
                  const grade = isReleased && r.score !== null ? letterGrade(pct) : "—";
                  const canRetake = !isPractice && subject?.can_retake === 1;
                  const isGradeA = grade.startsWith("A");
                  const isGradeB = grade.startsWith("B");
                  const isGradeC = grade.startsWith("C");

                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: "var(--color-text-2)" }}>
                        {r.subject_name || `Subject #${r.subject_id}`}
                      </td>
                      <td>
                        <span className={styles.subjectCode}>
                          {isPractice ? "PRACTICE" : subject?.code || "EXAM"}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-text-2)", fontVariantNumeric: "tabular-nums" }}>
                        {r.end_time
                          ? new Date(r.end_time).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Submitted"}
                      </td>
                      <td className={styles.numCell}>
                        {isReleased ? `${r.score ?? 0} / ${r.total_score || 100}` : "Held"}
                      </td>
                      <td className={styles.numCell} style={{ fontWeight: 700 }}>
                        {isReleased ? `${pct}%` : "Pending"}
                      </td>
                      <td className={styles.numCell}>
                        <span
                          className={`${styles.gradeBadge} ${
                            !isReleased
                              ? ""
                              : isGradeA
                              ? styles.gradeA
                              : isGradeB
                              ? styles.gradeB
                              : isGradeC
                              ? styles.gradeC
                              : styles.gradeF
                          }`}
                        >
                          {grade}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: !isReleased ? "#D97706" : pct >= 50 ? "#059669" : "#DC2626",
                          }}
                        >
                          {!isReleased ? "Pending Release" : pct >= 50 ? "Pass" : "Below Pass"}
                        </span>
                      </td>
                      <td className={styles.numCell}>
                        <div style={{ display: "inline-flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() =>
                              setReviewingExam({ id: r.id, subjectName: r.subject_name || "Exam" })
                            }
                            disabled={!isReleased}
                          >
                            {isReleased ? "Review" : "Held"}
                          </Button>
                          {canRetake && (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() =>
                                setRetakeTarget({ examId: r.id, subjectId: Number(r.subject_id) })
                              }
                              disabled={retaking === r.id}
                            >
                              Retake
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.resultsGrid}>
            {filteredResults.map((r) => {
              const subject = subjects.find((s) => s.id === Number(r.subject_id));
              const isPractice =
                Boolean(r.practice_id) ||
                r.subject_name?.includes("JAMB") ||
                r.subject_name?.includes("UTME");
              const isReleased =
                isPractice ||
                (r.is_result_released !== false &&
                  (r.result_status === "released" || !r.result_status));
              const pct = isReleased && r.score !== null ? scorePct(r.score, r.total_score) : 0;
              const grade = isReleased && r.score !== null ? letterGrade(pct) : "—";
              const canRetake = !isPractice && subject?.can_retake === 1;
              const isGradeA = grade.startsWith("A");
              const isGradeB = grade.startsWith("B");
              const isGradeC = grade.startsWith("C");

              return (
                <div key={r.id} className={styles.resultCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.subjectTitle}>
                        {r.subject_name || `Subject #${r.subject_id}`}
                      </div>
                      <span className={styles.subjectCode}>
                        {isPractice ? "CBT PRACTICE" : subject?.code || "EXAM"}
                      </span>
                    </div>
                    {isReleased ? (
                      <div className={styles.scoreBadge}>
                        <span className={styles.scoreNumber}>{r.score ?? 0}</span>
                        <span className={styles.scoreTotal}>/ {r.total_score || "?"} marks</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.3rem 0.65rem",
                          background: "#FFFBEB",
                          border: "1px solid #FDE68A",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: r.result_status === "scheduled" ? "#92400E" : "#D97706",
                        }}
                      >
                        <ClockIcon width="12" height="12" />
                        <span>
                          {r.result_status === "scheduled" ? "Scheduled" : "Pending Release"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress track */}
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{
                        width: isReleased ? `${Math.min(pct, 100)}%` : "100%",
                        background: !isReleased
                          ? "#CBD5E1"
                          : pct >= 70
                          ? "#059669"
                          : pct >= 50
                          ? "#92400E"
                          : "#D97706",
                      }}
                    />
                  </div>

                  <div className={styles.metricsRow}>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Percentage</span>
                      <span className={styles.metricValue}>
                        {isReleased ? `${pct}%` : "Pending"}
                      </span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Grade</span>
                      <span
                        className={`${styles.gradeBadge} ${
                          !isReleased
                            ? ""
                            : isGradeA
                            ? styles.gradeA
                            : isGradeB
                            ? styles.gradeB
                            : isGradeC
                            ? styles.gradeC
                            : styles.gradeF
                        }`}
                        style={!isReleased ? { background: "#F1F5F9", color: "var(--color-text-2)" } : undefined}
                      >
                        {grade}
                      </span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Status</span>
                      <span
                        className={styles.metricValue}
                        style={{
                          color: !isReleased ? "#D97706" : pct >= 50 ? "#059669" : "#DC2626",
                        }}
                      >
                        {!isReleased ? "Under Review" : pct >= 50 ? "Pass" : "Fail"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.submittedDate}>
                      {r.end_time
                        ? new Date(r.end_time).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Submitted"}
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() =>
                          setReviewingExam({ id: r.id, subjectName: r.subject_name || "Exam" })
                        }
                        disabled={!isReleased}
                        title={
                          !isReleased
                            ? "Results will be reviewable once released by instructor"
                            : "Review question breakdown"
                        }
                      >
                        {isReleased ? "Review" : "Held"}
                      </Button>
                      {canRetake && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() =>
                            setRetakeTarget({ examId: r.id, subjectId: Number(r.subject_id) })
                          }
                          disabled={retaking === r.id}
                        >
                          Retake
                        </Button>
                      )}
                      {isPractice && r.practice_id && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => router.push(`/student/exam?practiceId=${r.practice_id}`)}
                        >
                          Practice
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Question Review Modal ──────────────────────────── */}
      {reviewingExam && (
        <StudentReviewModal
          examId={reviewingExam.id}
          subjectName={reviewingExam.subjectName}
          onClose={() => setReviewingExam(null)}
        />
      )}
    </div>
  );
}
