import type { Subject } from "./types";

export function groupStudentAssessments(subjects: Subject[], takenIds: Set<number>, now: number) {
  const live: Subject[] = [], upcoming: Subject[] = [], completed: Subject[] = [], expired: Subject[] = [], unscheduled: Subject[] = [], assignments: Subject[] = [];
  for (const subject of subjects) {
    if (takenIds.has(Number(subject.id))) { completed.push(subject); continue; }
    if (Number(subject.is_published) !== 1) continue;
    if (Number(subject.is_assignment) === 1) { assignments.push(subject); continue; }
    if (subject.exam_datetime?.startsWith("2099")) { unscheduled.push(subject); continue; }
    if (!subject.exam_datetime) { live.push(subject); continue; }
    const start = new Date(subject.exam_datetime).getTime();
    if (!Number.isFinite(start)) { unscheduled.push(subject); continue; }
    const end = start + Number(subject.window_duration || 120) * 60_000;
    if (now >= start && now <= end) live.push(subject);
    else if (now < start) upcoming.push(subject);
    else expired.push(subject);
  }
  return { liveExams: live, upcomingExams: upcoming, completedExams: completed, expiredExams: expired, unscheduledExams: unscheduled, assignmentItems: assignments };
}
