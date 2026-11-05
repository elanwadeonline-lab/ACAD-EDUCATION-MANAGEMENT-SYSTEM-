"use client";

import { MetricCard } from "../../../components/ui/MetricCard";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import { scorePct } from "../../../lib/gradeUtils";
import { useAcademic } from "../../../components/context/AcademicContext";
import type { Subject, User, ExamResult } from "../../../lib/types";
import {
  UsersIcon,
  BookIcon,
  CalendarIcon,
  RefreshIcon,
  ActivityIcon,
  SettingsIcon,
  ChevronRightIcon,
  PlusIcon,
} from "../../../components/icons/Icons";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { AdminGlobalSearch } from "../../../components/admin/AdminGlobalSearch";
import { SessionSnapshotCard } from "../../../components/admin/SessionSnapshotCard";
import styles from "./page.module.css";

export default function OperatorDashboardPage() {
  return (
    <RequireRole role="operator">
      <OperatorDashboard />
    </RequireRole>
  );
}

function OperatorDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const { selectedSession, selectedTerm, activeSession } = useAcademic();

  const isCurrentSessionActive = Boolean(
    selectedSession?.is_active ||
    (activeSession && selectedSession?.id === activeSession?.id)
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");

        const [u, s, r] = await Promise.all([
          api.getUsers(selectedSession?.id, selectedTerm?.id),
          api.getSubjects(selectedSession?.id, selectedTerm?.id),
          api.getResults(selectedSession?.id, selectedTerm?.id),
        ]);
        setUsers(u ?? []);
        setSubjects(s ?? []);
        setResults(r ?? []);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedSession?.id, selectedTerm?.id]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const students  = users.filter((u) => u.role === "student").length;
    const teachers  = users.filter((u) => u.role === "teacher").length;
    const operators = users.filter((u) => u.role === "operator").length;
    const guardians = users.filter((u) => u.role === "guardian").length;
    const published = subjects.filter((s) => s.is_published).length;
    const drafts    = Math.max(0, subjects.length - published);
    const publishedPct = subjects.length > 0 ? Math.round((published / subjects.length) * 100) : 0;
    const completed = results.filter(result => result.status === "completed");
    const graded = completed.filter(result => result.score != null && Number(result.total_score) > 0);
    const avgScore = graded.length
      ? (graded.reduce((sum, result) => sum + scorePct(result.score, result.total_score), 0) / graded.length).toFixed(1)
      : null;
    return {
      students,
      teachers,
      operators,
      guardians,
      subjects: subjects.length,
      published,
      drafts,
      publishedPct,
      exams: completed.length,
      avgScore,
    };
  }, [users, subjects, results]);

  /* ── Error state ── */
  if (error) {
    return (
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "2.5rem 1.75rem",
          textAlign: "center",
          maxWidth: "440px",
          margin: "3rem auto",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-danger-bg)",
            color: "var(--color-danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}
        >
          <ActivityIcon width="18" height="18" />
        </div>
        <h3
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--color-text)",
            marginBottom: "0.35rem",
          }}
        >
          Unable to Load Dashboard
        </h3>
        <p
          style={{
            color: "var(--color-muted)",
            fontSize: "0.8rem",
            marginBottom: "1.25rem",
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => loadData()}
        >
          <RefreshIcon width="13" height="13" />
          Retry
        </button>
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.headerWrapper}>
          <div className={styles.headerLeft}>
            <Skeleton width={160} height={26} borderRadius="6px" />
            <Skeleton width={240} height={14} borderRadius="4px" style={{ marginTop: "0.3rem" }} />
          </div>
          <div className={styles.headerRight}>
            <Skeleton width={130} height={28} borderRadius="6px" />
            <Skeleton width={72} height={28} borderRadius="6px" />
          </div>
        </div>

        <section className={styles.statsGrid} aria-label="Loading academic metrics">
          {[0,1,2,3].map(index => <Skeleton key={index} height={150} borderRadius="12px" />)}
        </section>

        <Skeleton height={110} borderRadius="10px" />
        <Skeleton height={160} borderRadius="10px" />
      </div>
    );
  }

  const quickLinks = [
    {
      href: "/ADMIN/subjects",
      label: "Subjects & Curricula",
      desc: "Configure subject codes, question banks, and faculty allocations.",
      icon: <BookIcon width="15" height="15" />,
    },
    {
      href: "/ADMIN/timetable",
      label: "Timetable & CBT Windows",
      desc: "Schedule examination slots, duration limits, and publication state.",
      icon: <CalendarIcon width="15" height="15" />,
    },
    {
      href: "/ADMIN/users",
      label: "Users & Cohort Access",
      desc: "Manage student enrollments, faculty accounts, and role permissions.",
      icon: <UsersIcon width="15" height="15" />,
    },
    {
      href: "/ADMIN/settings",
      label: "System & Backups",
      desc: "Database snapshots, academic locks, and security configuration.",
      icon: <SettingsIcon width="15" height="15" />,
    },
  ];

  return (
    <div className={styles.dashboardContainer}>
      {/* ── Page Header (Plain Contextual Role & Session Text — No Boxed Badges or Radio Dots) ── */}
      <div className={styles.headerWrapper}>
        <div className={styles.headerLeft}>
          <span className={styles.contextLine}>
            Operator Workspace · {isCurrentSessionActive ? "Active Session" : "Historical Archive"}:{" "}
            <strong style={{ color: "var(--color-text, #0F172A)", fontWeight: 600 }}>
              {selectedSession?.name || "Unconfigured"}
            </strong>
            {selectedTerm?.name ? ` · ${selectedTerm.name}` : " · All Terms"}
          </span>
          <h1 className={styles.pageTitle}>Institutional Overview</h1>
          <p className={styles.subtitle}>
            Enrollment capacity, curriculum readiness, and examination throughput for the selected academic period.
          </p>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.dateContext}>
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={styles.syncBtn}
            title="Refresh dashboard data"
            aria-label="Refresh dashboard data"
          >
            <RefreshIcon
              width="12"
              height="12"
              style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
            />
            <span>{refreshing ? "Syncing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── ZONE 1: Primary Overview (Purpose-Driven KPI Patterns) ── */}
      <section className={styles.statsGrid} aria-label="Institutional performance metrics">
        <MetricCard label="Enrolled students" value={stats.students} action={<Link href="/ADMIN/users">Directory ↗</Link>} detail={`${stats.teachers} teachers · ${stats.operators} operators${stats.guardians ? ` · ${stats.guardians} guardians` : ""}`} />
        <MetricCard label="Subjects & assessments" value={stats.subjects} progress={stats.publishedPct} detail={`${stats.published} published · ${stats.drafts} drafts`} />
        <MetricCard label="Completed submissions" value={stats.exams} action={<Link href="/ADMIN/report-card">Reports ↗</Link>} detail={stats.avgScore !== null ? `${stats.avgScore}% average across ${stats.exams} scripts` : "No graded scripts in this academic period"} />
        <MetricCard label="Academic session" value={selectedSession?.name || "Not configured"} action={<Link href="/ADMIN/academic-sessions">Manage ↗</Link>} detail={`${selectedTerm?.name || "All terms"} · ${isCurrentSessionActive ? "Active session" : "Historical records"}`} />
      </section>

      {/* ── ZONE 2: Operational Activity & Global Lookup ── */}
      <AdminGlobalSearch />

      <SessionSnapshotCard />

      {/* ── ZONE 3: Academic Overview — Configured Subjects Table ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <span>Configured Curricula &amp; CBT Windows</span>
            <span className={styles.sectionCount}>{subjects.length}</span>
          </div>
          <Link href="/ADMIN/subjects" className={styles.sectionLink}>
            View all subjects
            <ChevronRightIcon width="13" height="13" />
          </Link>
        </div>

        {subjects.length > 0 ? (
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Class / Cohort</th>
                    <th>Term</th>
                    <th>Duration</th>
                    <th>State</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.slice(0, 8).map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: "var(--color-text)" }}>
                        {s.name}
                      </td>
                      <td>
                        <span className={styles.codeBadge}>{s.code}</span>
                      </td>
                      <td style={{ color: "var(--color-text-2)" }}>
                        {s.class || "General"}
                      </td>
                      <td style={{ color: "var(--color-muted)" }}>
                        {s.term || selectedTerm?.name || "General"}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--color-muted)" }}>
                        {s.duration ? `${s.duration} min` : "60 min"}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusTag} ${
                            s.is_published ? styles.statusPublished : styles.statusDraft
                          }`}
                        >
                          {s.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href="/ADMIN/subjects" className={styles.manageLink}>
                          Configure
                          <ChevronRightIcon width="12" height="12" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No Subjects Configured"
            description="Create your first academic subject or configure CBT windows for this period."
            action={
              <Link
                href="/ADMIN/subjects"
                className="btn btn-primary btn-sm"
              >
                <PlusIcon width="13" height="13" />
                Create Subject
              </Link>
            }
            icon={<BookIcon width="22" height="22" />}
          />
        )}
      </section>

      {/* ── ZONE 4: Administrative Access ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <span>Administrative Modules</span>
          </div>
        </div>

        <div className={styles.quickGrid}>
          {quickLinks.map((l) => (
            <Link key={l.href} href={l.href} className={styles.quickCard}>
              <div className={styles.quickIcon}>{l.icon}</div>
              <div className={styles.quickContent}>
                <div className={styles.quickLabel}>{l.label}</div>
                <div className={styles.quickDesc}>{l.desc}</div>
              </div>
              <div className={styles.quickArrow}>
                <ChevronRightIcon width="14" height="14" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
