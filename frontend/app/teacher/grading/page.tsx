"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import { useAcademic } from "../../../components/context/AcademicContext";
import {
  PageHeader,
  Button,
  FilterBar,
  Table,
  type TableColumn,
} from "../../../components/ui";
import {
  BookIcon,
  CheckCircleIcon,
  ClockIcon,
  SubjectIcon,
  PlusIcon,
} from "../../../components/icons/Icons";
import styles from "./page.module.css";

export default function GradingCenterPage() {
  return (
    <RequireRole role="teacher">
      <GradingCenter />
    </RequireRole>
  );
}

function GradingCenter() {
  const { selectedSession, selectedTerm } = useAcademic();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [gradingConfig, setGradingConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");

  // Create Manual Subject Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formClassId, setFormClassId] = useState<string>("");
  const [formMode, setFormMode] = useState<string>("exam");
  const [formMsg, setFormMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const [subs, cfg, clsData] = await Promise.all([
        api.getGradingSubjects(selectedSession?.id, selectedTerm?.id),
        api.getGradingConfig(),
        api.getClasses().catch(() => []),
      ]);
      if (!signal?.aborted) {
        setSubjects(subs || []);
        setGradingConfig(cfg);
        const classList = Array.isArray(clsData) ? clsData : (Array.isArray((clsData as any)?.classes) ? (clsData as any).classes : []);
        setClasses(classList || []);
      }
    } catch (e: unknown) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "Failed to load grading data");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [selectedSession?.id, selectedTerm?.id]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      setFormMsg({ type: "error", text: "Please enter both Subject Name and Subject Code." });
      return;
    }
    try {
      setCreating(true);
      setFormMsg(null);
      await api.createGradingSubject({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        class_id: formClassId ? Number(formClassId) : null,
        term_id: selectedTerm?.id,
        session_id: selectedSession?.id,
        mode: formMode,
      });
      setIsCreateModalOpen(false);
      setFormName("");
      setFormCode("");
      setFormClassId("");
      await loadData();
    } catch (err: any) {
      setFormMsg({ type: "error", text: err.message || "Failed to create subject gradebook" });
    } finally {
      setCreating(false);
    }
  };

  const caMax = gradingConfig?.ca_max ?? 40;
  const examMax = gradingConfig?.exam_max ?? 60;

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.class?.toLowerCase().includes(q);

      const matchMode = modeFilter === "all" || (s.mode || "exam") === modeFilter;
      return matchSearch && matchMode;
    });
  }, [subjects, search, modeFilter]);

  const approvedCount = useMemo(() => subjects.filter((s) => s.is_approved).length, [subjects]);
  const pendingCount = useMemo(() => subjects.filter((s) => !s.is_approved).length, [subjects]);

  const columns: TableColumn<any>[] = [
    {
      key: "name",
      header: "Subject & Code",
      sortable: true,
      render: (s) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{s.name}</div>
          <span className={styles.codeBadge}>{s.code}</span>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class / Cohort",
      render: (s) => (
        <span style={{ fontSize: "0.8125rem", color: s.class ? "var(--color-text)" : "var(--color-muted)" }}>
          {s.class || "All Cohorts"}
        </span>
      ),
    },
    {
      key: "mode",
      header: "Assessment Mode",
      width: "140px",
      render: (s) => (
        <span className={styles.codeBadge}>
          {(s.mode || "exam").toUpperCase()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Gradebook Status",
      align: "center",
      width: "160px",
      render: (s) => (
        <span className={`${styles.statusTag} ${s.is_approved ? styles.statusApproved : styles.statusPending}`}>
          {s.is_approved ? "Approved" : "In Progress"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      width: "160px",
      render: (s) => (
        <Link href={`/teacher/grading/details?id=${s.id}`}>
          <Button variant="secondary" size="xs">
            Open Gradebook →
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        eyebrow="Evaluation & Gradebook"
        title="Subject Grading Center"
        subtitle={`Continuous Assessment (${caMax}%) + Examination (${examMax}%) = 100% total weight.`}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PlusIcon width="13" height="13" />}
            onClick={() => {
              setFormMsg(null);
              setIsCreateModalOpen(true);
            }}
          >
            + Create Subject Gradebook
          </Button>
        }
      />

      {/* ── Create Subject Gradebook Modal ────────────────────── */}
      {isCreateModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem",
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            overflow: "hidden",
            border: "1px solid #E2E8F0",
          }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>Create Subject Gradebook</h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#64748B" }}>
                  Add a subject for manual written scoring or continuous evaluation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: "1.25rem", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubject} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {formMsg && (
                <div style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: formMsg.type === "error" ? "#FEF2F2" : "#ECFDF5",
                  color: formMsg.type === "error" ? "#DC2626" : "#059669",
                  border: `1px solid ${formMsg.type === "error" ? "#FECACA" : "#A7F3D0"}`,
                }}>
                  {formMsg.text}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, Civic Education, Biology"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Subject Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MTH101, CIV201, BIO301"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem", textTransform: "uppercase", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Class / Cohort (Optional)
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem", outline: "none", background: "#FFFFFF" }}
                >
                  <option value="">All Cohorts / General Subject</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Assessment Type
                </label>
                <select
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem", outline: "none", background: "#FFFFFF" }}
                >
                  <option value="exam">Terminal Examination (CA + Final Exam)</option>
                  <option value="test">Continuous Assessment Test</option>
                  <option value="quiz">Class Quiz / Practical</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={creating}
                >
                  Create Gradebook
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "0.875rem 1rem", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-danger, #DC2626)", fontSize: "0.8125rem" }}>
          {error}
        </div>
      )}

      {/* ── Minimalist KPI Metrics Row ──────────────────────── */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Gradebook Courses</span>
            <div className={styles.statIcon} style={{ color: "#06B6D4" }}><BookIcon width="15" height="15" /></div>
          </div>
          <div>
            <div className={styles.statValue}>{subjects.length}</div>
            <div className={styles.statFootnote}>Active subject gradebooks</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Approved Records</span>
            <div className={styles.statIcon} style={{ color: "#10B981" }}><CheckCircleIcon width="15" height="15" /></div>
          </div>
          <div>
            <div className={styles.statValue}>{approvedCount}</div>
            <div className={styles.statFootnote}>Finalized and locked</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Pending Grading</span>
            <div className={styles.statIcon} style={{ color: "#F97316" }}><ClockIcon width="15" height="15" /></div>
          </div>
          <div>
            <div className={styles.statValue}>{pendingCount}</div>
            <div className={styles.statFootnote}>Awaiting score input</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Evaluation Policy</span>
            <div className={styles.statIcon} style={{ color: "#6366F1" }}><SubjectIcon width="15" height="15" /></div>
          </div>
          <div>
            <div className={styles.statValue} style={{ fontSize: "1.125rem" }}>
              {caMax} CA / {examMax} Exam
            </div>
            <div className={styles.statFootnote}>Institutional standard</div>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by subject name, code, or class cohort..."
        filters={[
          {
            id: "mode",
            value: modeFilter,
            onChange: setModeFilter,
            options: [
              { label: "All Assessment Modes", value: "all" },
              { label: "Final Exams", value: "exam" },
              { label: "Continuous Assessment Tests", value: "test" },
              { label: "Quizzes", value: "quiz" },
            ],
          },
        ]}
        hasActiveFilters={Boolean(search || modeFilter !== "all")}
        onReset={() => {
          setSearch("");
          setModeFilter("all");
        }}
      />

      {/* ── Gradebook Table ────────────────────────────────────── */}
      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(s) => s.id}
          loading={loading}
          emptyTitle="No Grading Activities Found"
          emptySubtitle="Subject gradebooks will appear here once candidates complete tests or exams."
        />
      </div>
    </div>
  );
}
