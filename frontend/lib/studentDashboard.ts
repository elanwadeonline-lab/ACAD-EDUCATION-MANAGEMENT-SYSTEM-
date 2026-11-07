import type { Subject } from "./types";

export interface StudentAssessmentGrouping {
  liveExams: Subject[];
  upcomingExams: Subject[];
  completedExams: Subject[];
  expiredExams: Subject[];
  unscheduledExams: Subject[];
  assignmentItems: Subject[];
  inProgressExams: Subject[];
  awaitingGradingExams: Subject[];
  upcomingAwaitingPublicationExams: Subject[];
}

export function groupStudentAssessments(
  subjects: Subject[],
  takenIds: Set<number>,
  now: number,
  activeExams?: any[],
  examResults?: any[],
  retakeAuths?: any[]
): StudentAssessmentGrouping {
  const live: Subject[] = [];
  const upcoming: Subject[] = [];
  const completed: Subject[] = [];
  const expired: Subject[] = [];
  const unscheduled: Subject[] = [];
  const assignments: Subject[] = [];
  const inProgress: Subject[] = [];
  const awaitingGrading: Subject[] = [];
  const upcomingAwaitingPub: Subject[] = [];

  const activeMap = new Map<number, any>();
  if (Array.isArray(activeExams)) {
    for (const ae of activeExams) {
      if (ae && ae.subject_id) activeMap.set(Number(ae.subject_id), ae);
    }
  }

  const resultMap = new Map<number, any>();
  if (Array.isArray(examResults)) {
    for (const r of examResults) {
      if (r && r.subject_id) resultMap.set(Number(r.subject_id), r);
    }
  }

  const retakeMap = new Map<number, any>();
  if (Array.isArray(retakeAuths)) {
    for (const ra of retakeAuths) {
      if (ra && ra.subject_id && Number(ra.used_attempts || 0) < Number(ra.max_attempts || 1)) {
        retakeMap.set(Number(ra.subject_id), ra);
      }
    }
  }

  for (const subject of subjects) {
    const sId = Number(subject.id);

    // 1. Check if student has an active in-progress attempt
    const activeAttempt = activeMap.get(sId);
    if (activeAttempt && activeAttempt.status === "in-progress") {
      inProgress.push(subject);
      continue;
    }

    // 2. Check if student already completed this exam
    if (takenIds.has(sId)) {
      const res = resultMap.get(sId);
      if (res && res.result_status === "awaiting_grading") {
        awaitingGrading.push(subject);
      } else {
        completed.push(subject);
      }
      continue;
    }

    // 3. Coursework / Assignments (not window-constrained)
    if (Number(subject.is_assignment) === 1) {
      assignments.push(subject);
      continue;
    }

    // 4. Unscheduled cycle (sentinel "2099-01-01T00:00" or empty)
    const dt = subject.exam_datetime ? subject.exam_datetime.trim() : "";
    const isSentinel = !dt || dt.startsWith("2099") || dt.toLowerCase() === "unscheduled" || dt.toLowerCase() === "tba";

    if (isSentinel) {
      if (Number(subject.is_timetable_published) === 1 && Number(subject.is_published) === 1) {
        live.push(subject);
      } else {
        unscheduled.push(subject);
      }
      continue;
    }

    // 5. Scheduled cycle with parsed start and end
    const start = new Date(dt).getTime();
    if (!Number.isFinite(start)) {
      unscheduled.push(subject);
      continue;
    }
    const end = start + Number(subject.window_duration || 120) * 60_000;

    // Check if questions are unpublished
    if (Number(subject.is_published) !== 1) {
      const subjectWithFlag = { ...subject, awaitingPublication: true };
      upcoming.push(subjectWithFlag);
      upcomingAwaitingPub.push(subjectWithFlag);
      continue;
    }

    // Questions are published: evaluate timing
    if (now >= start && now <= end) {
      live.push(subject);
    } else if (now < start) {
      upcoming.push(subject);
    } else {
      // Window has closed
      // If student has authorized retake, make it available for retake
      if (retakeMap.has(sId)) {
        live.push(subject);
      } else {
        expired.push(subject);
      }
    }
  }

  return {
    liveExams: live,
    upcomingExams: upcoming,
    completedExams: completed,
    expiredExams: expired,
    unscheduledExams: unscheduled,
    assignmentItems: assignments,
    inProgressExams: inProgress,
    awaitingGradingExams: awaitingGrading,
    upcomingAwaitingPublicationExams: upcomingAwaitingPub,
  };
}
