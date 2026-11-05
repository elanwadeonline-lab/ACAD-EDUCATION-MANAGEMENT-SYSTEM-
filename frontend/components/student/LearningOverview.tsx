"use client";

import Link from "next/link";
import { ArrowUpRight, Award, Check, Clock3, AchievementSymbol } from "../icons/StudentIcons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { type AcademicChartPoint } from "../ui/AcademicChart";
import { ProgressBar } from "../ui/MetricCard";
import { XpTargetWave } from "./XpTargetWave";
import type { ExamResult, StudentTelemetry } from "../../lib/types";
import { scorePct } from "../../lib/gradeUtils";
import styles from "./LearningOverview.module.css";

type SubjectScore = { id: number; subjectName: string; pct: number; grade: string };
type Props = {
  loading: boolean;
  average: number | null;
  grade: string;
  delta: number | null;
  trend: AcademicChartPoint[];
  subjects: SubjectScore[];
  results: ExamResult[];
  telemetry: StudentTelemetry | null;
  completed: number;
  total: number;
  formalAverage: number | null;
  practiceAverage: number | null;
  highestSubject: string;
  highestScore: number | null;
};

export function LearningOverview(props: Props) {
  const { loading, subjects, results, telemetry, completed, total } = props;
  const earned = telemetry?.badges?.filter((badge) => badge.unlocked) || [];

  if (loading) {
    return (
      <section className={styles.loading} role="status" aria-label="Loading learning insights">
        <span />
        <span />
        <span />
        <p>Loading your learning insights…</p>
      </section>
    );
  }

  const xpPercent =
    telemetry?.levelProgressPct != null
      ? Math.round(telemetry.levelProgressPct)
      : 0;

  return (
    <section id="learning-overview" className={styles.grid} aria-label="Learning insights">
      {/* ── 1. XP Target Card with Restored Signature Landscape Waves ── */}
      <Card className={styles.performance}>
        <CardHeader>
          <CardTitle>XP target</CardTitle>
          <div className={styles.xpHero}>
            <div className={styles.score}>
              {xpPercent}%
            </div>
            <p className={styles.comparison}>
              {telemetry?.nextLevelXp != null
                ? "Progress to your next learning level"
                : "Progress to your next learning level"}
            </p>
            {/* Exact flowing landscape wave contours from reference design */}
            <XpTargetWave progress={xpPercent} />
          </div>
        </CardHeader>
        <CardContent>
          <div className={styles.completion}>
            <div>
              <span>Assessments completed</span>
              <strong>
                {completed}
                <small> / {total}</small>
              </strong>
            </div>
            <ProgressBar value={total ? (completed / total) * 100 : 0} label="Completed assessments" />
          </div>
          <dl className={styles.breakdown}>
            <div>
              <dt>Formal exams</dt>
              <dd>{props.formalAverage !== null ? `${props.formalAverage}%` : "—"}</dd>
            </div>
            <div>
              <dt>Practice average</dt>
              <dd>{props.practiceAverage !== null ? `${props.practiceAverage}%` : "—"}</dd>
            </div>
            <div>
              <dt>Highest score</dt>
              <dd title={props.highestSubject}>{props.highestScore !== null ? `${props.highestScore}%` : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── 2. Recent Activity Card ── */}
      <Card className={styles.activity}>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Your latest published results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles.activityList}>
            {results.length ? (
              results.slice(0, 3).map((result) => (
                <Link key={result.id} href="/student/results" className={styles.activityItem}>
                  <span className={styles.activityIcon}>
                    <Check size={16} />
                  </span>
                  <span className={styles.activityText}>
                    <strong>{result.subject_name || "Assessment"}</strong>
                    <small>
                      {result.end_time
                        ? new Date(result.end_time).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })
                        : "Completed"}
                    </small>
                  </span>
                  <span className={styles.resultScore}>
                    {scorePct(result.score, result.total_score)}%
                  </span>
                </Link>
              ))
            ) : (
              <p className={styles.empty}>
                Complete an assessment. Your results will appear once they are published.
              </p>
            )}
          </div>
          <div className={styles.earned}>
            <h3>
              Earned achievements <Award size={16} />
            </h3>
            {earned.length ? (
              earned.slice(0, 2).map((badge) => (
                <div key={badge.id} className={styles.achievement}>
                  <span className={styles.achievementMark}>
                    <AchievementSymbol id={badge.id} />
                  </span>
                  <div>
                    <strong>{badge.name}</strong>
                    <small>{badge.description}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.empty}>
                {telemetry
                  ? "Keep learning to unlock your first achievement."
                  : "Learning achievements are currently unavailable."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Right Column: Subject Progress & Learning Goals ── */}
      <div className={styles.rightColumn}>
        <Card>
          <CardHeader>
            <CardTitle>Subject progress</CardTitle>
            <CardDescription>Latest published scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.subjects}>
              {subjects.length ? (
                subjects.slice(0, 3).map((subject) => (
                  <div key={subject.id} className={styles.subject}>
                    <div>
                      <span>{subject.subjectName}</span>
                      <strong>{subject.pct}%</strong>
                    </div>
                    <ProgressBar value={subject.pct} label={`${subject.subjectName} score`} />
                  </div>
                ))
              ) : (
                <p className={styles.empty}>
                  Your subject scores will appear after results are published.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning goals</CardTitle>
            <CardDescription>
              {telemetry
                ? telemetry.level != null
                  ? `Level ${telemetry.level}${telemetry.levelTitle ? ` · ${telemetry.levelTitle}` : ""}`
                  : "Your daily practice goal"
                : "Learning data unavailable"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {telemetry ? (
              <>
                <div className={styles.xpValue}>
                  {telemetry.xp != null ? telemetry.xp.toLocaleString() : "—"}
                  <span>XP earned</span>
                </div>
                <ProgressBar value={telemetry.levelProgressPct ?? 0} label="Progress to next level" />
                <p className={styles.goalCaption}>
                  {telemetry.nextLevelXp != null && telemetry.xpToNext != null
                    ? `${telemetry.xpToNext.toLocaleString()} XP to your next level`
                    : telemetry.nextLevelXp === null
                    ? "Highest level reached"
                    : "Level progress is not available"}
                </p>
                <div className={styles.dailyGoal}>
                  <Clock3 size={16} />
                  <span>Daily practice</span>
                  <strong>
                    {telemetry.todayQuestions}/{telemetry.dailyGoal}
                  </strong>
                </div>
                <ProgressBar
                  value={
                    telemetry.dailyGoal > 0 ? (telemetry.todayQuestions / telemetry.dailyGoal) * 100 : 0
                  }
                  label="Daily practice goal"
                />
                <Link className={styles.practiceLink} href="/student/practice">
                  Continue practice <ArrowUpRight size={14} />
                </Link>
              </>
            ) : (
              <p className={styles.empty}>
                Your XP, level and daily practice goal will appear when learning data is available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
