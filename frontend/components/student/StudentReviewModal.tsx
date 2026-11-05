"use client";

import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import { api } from "../../lib/api";
import { PracticeReviewItem } from "../../lib/types";
import { CloseIcon, CheckCircleIcon, XCircleIcon } from "../icons/StudentIcons";

type StudentReviewModalProps = {
  examId?: number;
  subjectName: string;
  practiceData?: {
    score: number;
    total_score: number;
    items: PracticeReviewItem[];
  };
  onClose: () => void;
};

export function StudentReviewModal({ examId, subjectName, practiceData, onClose }: StudentReviewModalProps) {
  const [reviewData, setReviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    if (practiceData) {
      setReviewData({
        exam: {
          score: practiceData.score,
          total_score: practiceData.total_score,
          end_time: new Date().toISOString(),
          start_time: null,
        },
        answers: (practiceData.items || []).map((it, idx) => ({
          id: it.question_id || idx,
          question_text: it.question_text,
          question_type: "objective",
          options_json: JSON.stringify(it.options || []),
          selected_option: it.selected_option,
          correct_answer: it.correct_answer,
          is_correct: it.is_correct ? 1 : 0,
          marks_awarded: it.is_correct ? 1 : 0,
          marks: 1,
          solution: it.solution_text || it.solution || null,
          explanation: it.explanation || it.solution_text || null,
        })),
      });
      setLoading(false);
      return;
    }

    if (!examId) {
      setError("No exam or practice session provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .getExamReview(examId)
      .then((data) => {
        if (mounted) setReviewData(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Failed to load review data");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [examId, practiceData]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="student-review-title" slotProps={{ paper:{sx:{bgcolor:"var(--color-surface)",color:"var(--color-text)",borderRadius:2,boxShadow:"0 12px 40px #00000018",p:{xs:2,sm:3},maxHeight:"90dvh"}} }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.75rem",
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "1.25rem",
          }}
        >
          <div>
            <h2 id="student-review-title" style={{ fontSize: "1.375rem", fontWeight: 500, color: "var(--color-text)", margin: 0, letterSpacing: "-0.02em" }}>
              Assessment Evaluation Review
            </h2>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "0.25rem", fontWeight: 500 }}>
              {subjectName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-3)",
              borderRadius: "6px",
              padding: "0.4rem 0.75rem",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><CloseIcon width={13} height={13} /> Close</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div className="spinner" />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", color: "var(--color-text-2)", padding: "2rem", background: "var(--color-surface-2)", borderRadius: "10px" }}>
            {error}
          </div>
        ) : reviewData ? (
          <div>
            <div style={{ display: "flex", gap: "0.875rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
              {[
                {
                  label: "Final Score",
                  value: `${reviewData.exam?.score ?? 0} / ${reviewData.exam?.total_score ?? 0}`,
                },
                {
                  label: "Sitting Duration",
                  value:
                    reviewData.exam?.end_time && reviewData.exam?.start_time
                      ? `${Math.max(
                          1,
                          Math.round(
                            (Date.parse(reviewData.exam.end_time) - Date.parse(reviewData.exam.start_time)) / 60000
                          )
                        )} mins`
                      : "—",
                },
                {
                  label: "Date Submitted",
                  value: reviewData.exam?.end_time
                    ? new Date(reviewData.exam.end_time).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--color-surface-2)",
                    borderRadius: "10px",
                    padding: "0.875rem 1.15rem",
                    minWidth: "130px",
                    border: "1px solid var(--color-border)",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--color-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 500,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: "1.125rem", color: "var(--color-text)", fontFamily: "var(--font-mono, monospace)" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {(reviewData.answers ?? []).length === 0 ? (
              <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", textAlign: "center", padding: "2rem 0" }}>
                No question breakdown available.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {(reviewData.answers as any[]).map((a, idx) => {
                  const opts = (() => {
                    try {
                      return JSON.parse(a.options_json || "[]");
                    } catch {
                      return [];
                    }
                  })();
                  const isEssay = a.question_type === "essay";

                  const correctIdx = typeof a.correct_answer === "string" && /^[A-E]$/i.test(a.correct_answer)
                    ? a.correct_answer.toUpperCase().charCodeAt(0) - 65
                    : (typeof a.correct_answer === "number" ? a.correct_answer : Number(a.correct_answer));

                  const correctLetter = Number.isInteger(correctIdx) && correctIdx >= 0 && correctIdx <= 25
                    ? String.fromCharCode(65 + correctIdx)
                    : String(a.correct_answer || "");

                  const correctText = Number.isInteger(correctIdx) && opts[correctIdx]
                    ? `${correctLetter}. ${opts[correctIdx]}`
                    : (a.correct_answer !== undefined ? `Option ${a.correct_answer}` : "—");

                  const selectedIdx = typeof a.selected_option === "string" && /^[A-E]$/i.test(a.selected_option)
                    ? a.selected_option.toUpperCase().charCodeAt(0) - 65
                    : (typeof a.selected_option === "number" ? a.selected_option : Number(a.selected_option));

                  const selectedLetter = Number.isInteger(selectedIdx) && selectedIdx >= 0 && selectedIdx <= 25
                    ? String.fromCharCode(65 + selectedIdx)
                    : (a.selected_option !== null && a.selected_option !== undefined ? String(a.selected_option) : "");

                  const selectedText = Number.isInteger(selectedIdx) && opts[selectedIdx]
                    ? `${selectedLetter}. ${opts[selectedIdx]}`
                    : (a.selected_option !== null && a.selected_option !== undefined ? (selectedLetter ? `Option ${selectedLetter}` : String(a.selected_option)) : "No answer");

                  return (
                    <div
                      key={a.id || idx}
                      style={{
                        background: a.is_correct ? "rgba(16, 185, 129, 0.04)" : "rgba(239, 68, 68, 0.04)",
                        border: `1px solid ${a.is_correct ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.25)"}`,
                        borderRadius: "10px",
                        padding: "1.25rem 1.4rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.875rem",
                          gap: "1rem",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "0.9375rem", color: "var(--color-text)", lineHeight: 1.5 }}>
                          <span style={{ color: "var(--color-muted)", marginRight: "0.4rem", fontFamily: "var(--font-mono, monospace)" }}>
                            Q{idx + 1}.
                          </span>
                          {a.question_text}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: a.is_correct ? "var(--color-text-3)" : "var(--color-text-3)",
                              background: a.is_correct ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                              padding: "0.2rem 0.55rem",
                              borderRadius: "4px",
                              fontFamily: "var(--font-mono, monospace)",
                            }}
                          >
                            {a.marks_awarded} / {a.marks} marks
                          </span>
                        </div>
                      </div>

                      {isEssay ? (
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-text-2)",
                            background: "var(--color-surface)",
                            padding: "0.875rem 1rem",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <div style={{ marginBottom: "0.6rem" }}>
                            <strong style={{ color: "var(--color-text)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Your Submission:
                            </strong>
                            <br />
                            <span style={{ whiteSpace: "pre-wrap", marginTop: "0.25rem", display: "block" }}>
                              {a.essay_response || <em style={{ color: "var(--color-muted)" }}>No response provided</em>}
                            </span>
                          </div>
                          {a.teacher_answer && (
                            <div style={{ paddingTop: "0.6rem", borderTop: "1px solid var(--color-surface-2)" }}>
                              <strong style={{ color: "var(--color-text)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Expected Rubric / Guide:
                              </strong>
                              <br />
                              <span style={{ whiteSpace: "pre-wrap", marginTop: "0.25rem", display: "block" }}>
                                {a.teacher_answer}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.875rem", color: "var(--color-text-2)", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                            <span style={{ color: "var(--color-muted)", width: "110px", flexShrink: 0, fontSize: "0.78rem", fontWeight: 600 }}>
                              Your Answer:
                            </span>
                            <strong style={{ color: a.is_correct ? "var(--color-text-3)" : "var(--color-text-3)" }}>
                              {selectedText}
                            </strong>
                          </div>
                          {!a.is_correct && a.correct_answer !== undefined && (
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                              <span style={{ color: "var(--color-muted)", width: "110px", flexShrink: 0, fontSize: "0.78rem", fontWeight: 600 }}>
                                Correct Answer:
                              </span>
                              <strong style={{ color: "var(--color-text-2)" }}>
                                {correctText}
                              </strong>
                            </div>
                          )}

                          {a.explanation && (
                            <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.85rem", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "0.8125rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                              <strong style={{ color: "var(--color-text-2)", display: "block", marginBottom: "0.2rem" }}>Explanation:</strong>
                              {a.explanation}
                            </div>
                          )}

                          {a.solution && (
                            <div style={{ marginTop: "0.4rem", padding: "0.6rem 0.85rem", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "0.8125rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                                <strong style={{ color: "var(--color-text)" }}>Worked Solution:</strong>
                                {a.is_solution_revealed && (
                                  <span style={{ fontSize: "0.6875rem", fontWeight: 500, color: "var(--color-text-2)", background: "var(--color-surface-2)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                                    ✓ Unlocked During Attempt
                                  </span>
                                )}
                              </div>
                              <span style={{ whiteSpace: "pre-wrap" }}>{a.solution}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
