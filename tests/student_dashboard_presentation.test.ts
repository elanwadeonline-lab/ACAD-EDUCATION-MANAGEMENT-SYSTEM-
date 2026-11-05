import { describe, expect, test } from "bun:test";
import { groupStudentAssessments } from "../frontend/lib/studentDashboard";
import type { Subject } from "../frontend/lib/types";

const now = Date.parse("2026-11-02T10:00:00Z");
const subject = (id: number, patch: Partial<Subject> = {}): Subject => ({ id, name: `Subject ${id}`, code: `S${id}`, teacher_id: 1, is_published: 1, total_score: 100, term: "First Term", window_duration: 60, ...patch });

describe("student dashboard assessment presentation", () => {
  test("closed windows do not inflate assessment completion", () => {
    const groups = groupStudentAssessments([subject(1, { exam_datetime: "2026-11-01T10:00:00Z" }), subject(2)], new Set([2]), now);
    expect(groups.completedExams.map(s => s.id)).toEqual([2]);
    expect(groups.expiredExams.map(s => s.id)).toEqual([1]);
  });
  test("preserves active, upcoming, assignment and date-TBA groupings", () => {
    const groups = groupStudentAssessments([
      subject(1, { exam_datetime: "2026-11-02T09:30:00Z" }),
      subject(2, { exam_datetime: "2026-11-03T10:00:00Z" }),
      subject(3, { is_assignment: 1 }),
      subject(4, { exam_datetime: "2099-01-01T00:00:00Z" }),
      subject(5, { is_published: 0 }),
    ], new Set(), now);
    expect(groups.liveExams.map(s => s.id)).toEqual([1]);
    expect(groups.upcomingExams.map(s => s.id)).toEqual([2]);
    expect(groups.assignmentItems.map(s => s.id)).toEqual([3]);
    expect(groups.unscheduledExams.map(s => s.id)).toEqual([4]);
    expect(groups.completedExams).toHaveLength(0);
  });
  test("an invalid schedule is unavailable, not completed", () => {
    const groups = groupStudentAssessments([subject(1, { exam_datetime: "invalid" })], new Set(), now);
    expect(groups.unscheduledExams).toHaveLength(1);
    expect(groups.completedExams).toHaveLength(0);
    expect(groups.expiredExams).toHaveLength(0);
  });
});
