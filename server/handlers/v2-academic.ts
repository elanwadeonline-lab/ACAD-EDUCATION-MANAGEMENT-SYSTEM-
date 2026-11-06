// Zone file extracted from server.ts during route modularization.
// Route logic below is verbatim from server.ts; identifiers resolve via ../server bindings.
import db, { queries } from "../../db";
import { publishedScorePercent } from "../../src/utils/published-score";
import { isPositiveIntId, trimStr, isValidExamDateTime } from "../../validation";
import {
  apiSuccess, apiMessage, apiError, readJson, requireAuth, requireRole, sqlInt, rowCount,
  auditLog, notifyUser, notifyOperators, isSqliteUniqueError, jsonSafeStringify,
  corsHeaders, authz, licenseValidator, stripCorrectAnswer,
} from "../../server";

export async function tryV2AcademicCore(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  if (pathname === "/api/v2/terms" && method === "GET") {
    requireAuth(req);
    return apiSuccess(queries.getAllTerms.all());
  }

  if (pathname === "/api/v2/terms/active" && method === "GET") {
    requireAuth(req);
    const term = queries.getActiveTerm.get();
    return apiSuccess(term ?? null);
  }

  if (pathname === "/api/v2/terms" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const body = await readJson(req);
    const session = trimStr(body?.session).slice(0, 20);
    const name = trimStr(body?.name).slice(0, 40);
    const start_date = trimStr(body?.start_date);
    const end_date = trimStr(body?.end_date);
    if (!session || !name || !start_date || !end_date) return apiError(400, "session, name, start_date, end_date required");
    if (!isValidExamDateTime(start_date) || !isValidExamDateTime(end_date)) return apiError(400, "Invalid date format");
    const result = queries.createTerm.run(session, name, start_date, end_date) as { lastInsertRowid: number | bigint };
    return apiSuccess({ id: Number(result.lastInsertRowid) }, 201);
  }

  const termIdMatch = pathname.match(/^\/api\/v2\/terms\/(\d+)$/);
  if (termIdMatch && method === "PUT") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const termId = Number(termIdMatch[1]);
    if (!isPositiveIntId(termId)) return apiError(400, "Invalid term id");
    const term = queries.getTermById.get(termId) as any;
    if (!term) return apiError(404, "Term not found");
    const body = await readJson(req);
    queries.updateTerm.run(
      trimStr(body?.session) || term.session,
      trimStr(body?.name) || term.name,
      trimStr(body?.start_date) || term.start_date,
      trimStr(body?.end_date) || term.end_date,
      body?.registration_open !== undefined ? Number(body.registration_open) : term.registration_open,
      termId
    );
    return apiSuccess(queries.getTermById.get(termId));
  }

  const termActivateMatch = pathname.match(/^\/api\/v2\/terms\/(\d+)\/activate$/);
  if (termActivateMatch && method === "PUT") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const termId = Number(termActivateMatch[1]);
    if (!isPositiveIntId(termId)) return apiError(400, "Invalid term id");
    const term = queries.getTermById.get(termId) as any;
    if (!term) return apiError(404, "Term not found");
    // [ATOMIC] Single transaction: deactivate all, then activate one.
    // Prevents dual-active-term race condition even with concurrent admin clicks.
    db.transaction(() => {
      queries.deactivateAllTerms.run();
      queries.activateTerm.run(termId);
    })();
    auditLog(auth.userId, "TERM_ACTIVATE", "terms", termId, JSON.stringify({ session: term.session, name: term.name }));
    return apiSuccess(queries.getTermById.get(termId));
  }

  // ── v2: Classes ───────────────────────────────────────────────────────────
  if ((pathname === "/api/v2/classes/teacher-assignments/history" || pathname === "/api/v2/classes/assignment-history") && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    return apiSuccess(queries.getClassTeacherAssignmentHistory.all());
  }

  if (pathname === "/api/v2/classes" && method === "GET") {
    requireAuth(req);
    return apiSuccess(queries.getAllClasses.all());
  }

  if (pathname === "/api/v2/classes" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const body = await readJson(req);
    const name = trimStr(body?.name).slice(0, 50);
    const section = trimStr(body?.section).slice(0, 20) || null;
    const level = body?.level === "senior" ? "senior" : "junior";
    const classTeacherId = body?.class_teacher_id ? Number(body.class_teacher_id) || null : null;
    const notes = trimStr(body?.notes || "");
    if (!name) return apiError(400, "Class name required");
    try {
      const result = queries.createClass.run(name, section, level) as { lastInsertRowid: number | bigint };
      const newClassId = Number(result.lastInsertRowid);
      // Assign class teacher if provided (clear any previous assignment for that teacher)
      if (classTeacherId) {
        queries.unassignTeacherFromAllClasses.run(classTeacherId);
        queries.assignClassTeacher.run(classTeacherId, newClassId);
        queries.logClassTeacherAssignment.run(newClassId, classTeacherId, auth.userId, "assigned", notes || "Initial class creation");
      }
      auditLog(auth.userId, "CLASS_CREATE", "classes", newClassId, JSON.stringify({ name, section, class_teacher_id: classTeacherId }));
      return apiSuccess({ id: newClassId }, 201);
    } catch (e) {
      if (isSqliteUniqueError(e)) return apiError(409, "A class with this name and section already exists");
      throw e;
    }
  }

  const assignTeacherMatch = pathname.match(/^\/api\/v2\/classes\/(\d+)\/assign-teacher$/);
  if (assignTeacherMatch && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const classId = Number(assignTeacherMatch[1]);
    if (!isPositiveIntId(classId)) return apiError(400, "Invalid class id");
    const cls = queries.getClassById.get(classId) as any;
    if (!cls) return apiError(404, "Class not found");
    const body = await readJson(req);
    const rawTeacherId = body?.teacher_id;
    const teacherId = rawTeacherId ? Number(rawTeacherId) : null;
    const notes = trimStr(body?.notes || "");

    let action: "assigned" | "reassigned" | "unassigned" = "unassigned";

    if (teacherId) {
      const teacher = queries.getUserById.get(teacherId) as any;
      if (!teacher || teacher.role !== "teacher" || sqlInt(teacher.is_active) !== 1) {
        return apiError(400, "Invalid or inactive teacher");
      }
      action = cls.class_teacher_id ? "reassigned" : "assigned";
      queries.assignClassTeacher.run(teacherId, classId);
      queries.logClassTeacherAssignment.run(classId, teacherId, auth.userId, action, notes || null);

      try {
        queries.createNotification.run(
          teacherId,
          "class_teacher_assigned",
          `You have been assigned as Class Teacher for ${cls.name}${cls.section ? ` (${cls.section})` : ""}.`,
          "/teacher/report-card"
        );
      } catch {}
    } else {
      action = "unassigned";
      queries.unassignClassTeacher.run(classId);
      queries.logClassTeacherAssignment.run(classId, null, auth.userId, action, notes || null);
    }

    if (cls.class_teacher_id) authz.invalidateTeacherCache(Number(cls.class_teacher_id));
    if (teacherId) authz.invalidateTeacherCache(Number(teacherId));

    auditLog(auth.userId, "CLASS_TEACHER_" + action.toUpperCase(), "classes", classId, JSON.stringify({ teacher_id: teacherId, notes }));
    return apiSuccess(queries.getClassById.get(classId));
  }

  const classIdMatch = pathname.match(/^\/api\/v2\/classes\/(\d+)$/);
  if (classIdMatch && method === "PUT") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const classId = Number(classIdMatch[1]);
    if (!isPositiveIntId(classId)) return apiError(400, "Invalid class id");
    const cls = queries.getClassById.get(classId) as any;
    if (!cls) return apiError(404, "Class not found");
    const body = await readJson(req);
    // class_teacher_id: null clears assignment, undefined keeps existing
    const classTeacherId =
      body?.class_teacher_id === null ? null
      : body?.class_teacher_id ? Number(body.class_teacher_id)
      : cls.class_teacher_id ?? null;
    const notes = trimStr(body?.notes || "");
    
    // Log change to class_teacher_assignments if teacher changed
    if (classTeacherId !== cls.class_teacher_id) {
      if (classTeacherId) {
        const action = cls.class_teacher_id ? "reassigned" : "assigned";
        queries.logClassTeacherAssignment.run(classId, classTeacherId, auth.userId, action, notes || "Updated via class settings");
      } else {
        queries.logClassTeacherAssignment.run(classId, null, auth.userId, "unassigned", notes || "Removed via class settings");
      }
    }

    queries.updateClass.run(
      trimStr(body?.name) || cls.name,
      body?.section !== undefined ? (trimStr(body.section) || null) : cls.section,
      body?.level === "senior" ? "senior" : (body?.level === "junior" ? "junior" : cls.level),
      classTeacherId,
      classId
    );
    auditLog(auth.userId, "CLASS_UPDATE", "classes", classId, JSON.stringify({ class_teacher_id: classTeacherId }));
    return apiSuccess(queries.getClassById.get(classId));
  }

  if (classIdMatch && method === "DELETE") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const classId = Number(classIdMatch[1]);
    if (!isPositiveIntId(classId)) return apiError(400, "Invalid class id");
    const count = (queries.getEnrollmentCountForClass.get(classId) as any)?.count ?? 0;
    if (count > 0) return apiError(409, "Cannot delete class with enrolled students");
    queries.deleteClass.run(classId);
    return apiMessage("Class deleted");
  }

  // ── v2: Class Roster ──────────────────────────────────────────────────────
  const classRosterMatch = pathname.match(/^\/api\/v2\/classes\/(\d+)\/roster$/);
  if (classRosterMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator", "teacher"]);
    const classId = Number(classRosterMatch[1]);
    if (!isPositiveIntId(classId)) return apiError(400, "Invalid class id");

    // [SECURITY FIX] Ensure teacher is the class teacher for this class
    if (auth.role === "teacher") {
      const cls = queries.getClassById.get(classId) as any;
      if (!cls || Number(cls.class_teacher_id) !== auth.userId) {
         return apiError(403, "You are not the class teacher for this class");
      }
    }

    // Resolve term_id: query param → active academic_term → active legacy term
    const qTermId = Number(url.searchParams.get("term_id") || 0);
    const termId: number = qTermId
      || (queries.getActiveAcademicTerm.get() as any)?.id
      || (queries.getActiveTerm.get() as any)?.id
      || 0;

    if (!termId) return apiSuccess([]);
    return apiSuccess(queries.getClassRoster.all(classId, termId));
  }


  // ── v2: Class Enrollments (bulk) ─────────────────────────────────────────
  if (pathname === "/api/v2/class-enrollments/bulk" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const body = await readJson(req);
    const { term_id, class_id, student_ids } = body ?? {};
    if (!isPositiveIntId(term_id) || !isPositiveIntId(class_id) || !Array.isArray(student_ids)) {
      return apiError(400, "term_id, class_id, and student_ids[] required");
    }
    if (student_ids.length > 500) return apiError(400, "Max 500 students per bulk enroll");
    const term = queries.getTermById.get(term_id) as any;
    const cls = queries.getClassById.get(class_id) as any;
    // [FIX] Accept academic_terms ids too — the legacy `terms` table is not seeded on
    // fresh databases, so bulk enrollment previously 404'd ("Term not found") even
    // though class rosters (getClassRoster) key on academic term ids.
    const academicTerm = queries.getAcademicTermById.get(term_id) as any;
    if (!term && !academicTerm) return apiError(404, "Term not found");
    if (!cls) return apiError(404, "Class not found");
    let enrolled = 0;
    db.transaction(() => {
      for (const sid of student_ids) {
        if (!isPositiveIntId(Number(sid))) continue;
        queries.enrollStudentInClass.run(Number(sid), class_id, term_id);
        enrolled++;
      }
    })();
    auditLog(auth.userId, "CLASS_ENROLL_BULK", "class_enrollments", class_id, JSON.stringify({ term_id, count: enrolled }));
    return apiSuccess({ enrolled });
  }

  // ── v2 & Admin: Guardian Links ───────────────────────────────────────────
  return null;
}

export async function tryV2Calendar(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  if (pathname === "/api/v2/calendar" && method === "GET") {
    requireAuth(req);
    const termId = Number(url.searchParams.get("term_id") || 0);
    const activeTerm = queries.getActiveTerm.get() as any;
    const resolvedTermId = isPositiveIntId(termId) ? termId : (activeTerm?.id ?? 0);
    if (!resolvedTermId) return apiSuccess([]);
    return apiSuccess(queries.getCalendarByTerm.all(resolvedTermId));
  }

  if (pathname === "/api/v2/calendar" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const body = await readJson(req);
    const term_id = Number(body?.term_id);
    const title = trimStr(body?.title).slice(0, 100);
    const description = trimStr(body?.description).slice(0, 500) || null;
    const start_date = trimStr(body?.start_date);
    const end_date = trimStr(body?.end_date);
    const VALID_EVENT_TYPES = ["holiday","exam_period","resumption","event","deadline","other"];
    const type = VALID_EVENT_TYPES.includes(body?.type) ? body.type : "event";
    if (!isPositiveIntId(term_id) || !title || !start_date || !end_date) {
      return apiError(400, "term_id, title, start_date, end_date required");
    }
    if (!isValidExamDateTime(start_date) || !isValidExamDateTime(end_date)) return apiError(400, "Invalid date format");
    const result = queries.createCalendarEvent.run(term_id, title, description, start_date, end_date, type, auth.userId) as { lastInsertRowid: number | bigint };
    return apiSuccess(queries.getCalendarEvent.get(Number(result.lastInsertRowid)), 201);
  }

  const calEventMatch = pathname.match(/^\/api\/v2\/calendar\/(\d+)$/);
  if (calEventMatch && method === "PUT") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const eventId = Number(calEventMatch[1]);
    if (!isPositiveIntId(eventId)) return apiError(400, "Invalid event id");
    const ev = queries.getCalendarEvent.get(eventId) as any;
    if (!ev) return apiError(404, "Event not found");
    const body = await readJson(req);
    const VALID_EVENT_TYPES = ["holiday","exam_period","resumption","event","deadline","other"];
    queries.updateCalendarEvent.run(
      trimStr(body?.title) || ev.title,
      body?.description !== undefined ? trimStr(body.description).slice(0, 500) : ev.description,
      trimStr(body?.start_date) || ev.start_date,
      trimStr(body?.end_date) || ev.end_date,
      VALID_EVENT_TYPES.includes(body?.type) ? body.type : ev.type,
      eventId
    );
    return apiSuccess(queries.getCalendarEvent.get(eventId));
  }

  if (calEventMatch && method === "DELETE") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const eventId = Number(calEventMatch[1]);
    if (!isPositiveIntId(eventId)) return apiError(400, "Invalid event id");
    const ev = queries.getCalendarEvent.get(eventId) as any;
    if (!ev) return apiError(404, "Event not found");
    queries.deleteCalendarEvent.run(eventId);
    return apiMessage("Event deleted");
  }

  // Legacy v2 timetable API endpoints removed (repurposed timetables table)

  // ── Helper: Build Rich Ward Payload for Guardian Dashboard & Pages ──────────
  return null;
}

// Helper module-scope so guardian-portal zones can reuse it.
export function buildRichWardPayload(studentId: number, guardianId: number, termId?: number, sessionId?: number) {
    const student = queries.getUserById.get(studentId) as any;
    if (!student) return null;

    const activeTerm = queries.getActiveAcademicTerm.get() as any;
    const activeSession = queries.getActiveAcademicSession.get() as any;
    const tid = termId || activeTerm?.id || 1;
    const sid = sessionId || activeSession?.id || 1;

    // 1. Determine student's enrolled class
    const enrolledClass = db.prepare("SELECT c.name, c.id as class_id FROM class_enrollments ce JOIN classes c ON c.id = ce.class_id WHERE ce.student_id = ? ORDER BY ce.id DESC LIMIT 1").get(studentId) as any;
    const studentGrade = enrolledClass?.name || student.grade || "JSS 3";

    // 1. Subjects & Performance
    const results = queries.getStudentTermResultsForReportCard.all(studentId) as any[];
    let termResults = results.filter((r: any) => Number(r.term_id) === Number(tid) && Number(r.session_id) === Number(sid));
    
    // If student has no results in current active term, fall back to their most recent term with results
    if (termResults.length === 0 && results.length > 0) {
      const latest = results[results.length - 1];
      termResults = results.filter((r: any) => Number(r.term_id) === Number(latest.term_id) && Number(r.session_id) === Number(latest.session_id));
    }

    let averageScore: number | null = null;
    if (termResults.length > 0) {
      const sum = termResults.reduce((acc: number, r: any) => acc + publishedScorePercent(r), 0);
      averageScore = Math.round((sum / termResults.length) * 10) / 10;
    } else {
      const examsAvg = db.prepare("SELECT ROUND(AVG(CASE WHEN status='completed' AND total_score>0 THEN CAST(score AS REAL)/total_score*100 END), 1) as avg FROM exams WHERE student_id = ?").get(studentId) as any;
      averageScore = examsAvg?.avg !== null && examsAvg?.avg !== undefined ? Number(examsAvg.avg) : null;
    }

    let classPosition = "1st of 1";
    try {
      const classPeers = db.prepare(`
        SELECT tr.student_id, AVG(tr.total_score) as avg_score
        FROM term_results tr
        JOIN users u ON u.id = tr.student_id
        WHERE (u.grade = ? OR u.id IN (SELECT student_id FROM class_enrollments WHERE class_id = ?)) AND tr.term_id = ? AND tr.is_approved = 1
        GROUP BY tr.student_id
        ORDER BY avg_score DESC
      `).all(studentGrade, enrolledClass?.class_id || 0, tid) as any[];

      if (classPeers.length > 0) {
        const rankIdx = classPeers.findIndex((p: any) => Number(p.student_id) === studentId);
        const rank = rankIdx >= 0 ? rankIdx + 1 : 1;
        const total = classPeers.length;
        const suffix = (r: number) => {
          if (r === 1) return "1st";
          if (r === 2) return "2nd";
          if (r === 3) return "3rd";
          return `${r}th`;
        };
        classPosition = `${suffix(rank)} of ${total}`;
      }
    } catch {}

    const subjectColors = ["#165AF6", "#059669", "#7C3AED", "#D97706", "#DB2777", "#0891B2", "#4F46E5"];
    const subjects_performance = termResults.map((r: any, idx: number) => {
      const score = publishedScorePercent(r);
      const code = (r.code || r.subject_name || "SUB").slice(0, 4).toUpperCase();
      const color = subjectColors[idx % subjectColors.length];
      return {
        subject_name: r.subject_name,
        subject_code: code,
        score,
        ca_score: Number(r.ca_score || 0),
        exam_score: Number(r.exam_score || 0),
        grade: r.grade || (score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F"),
        color,
        is_approved: Number(r.is_approved || 0),
      };
    });

    // 2. Attendance
    const attSummary = queries.getStudentAttendanceSummary.get(studentId, tid) as any;
    const totalDays = Number(attSummary?.total_days || 0);
    const presentDays = Number(attSummary?.present_days || 0);
    const absentDays = Number(attSummary?.absent_days || 0);
    const lateDays = Number(attSummary?.late_days || 0);
    const attPct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    const rawCalendar = queries.getStudentAttendanceCalendar.all(studentId, tid) as any[];
    const calendar_days = rawCalendar.map((c: any) => {
      const dayNum = parseInt(c.date.slice(-2), 10);
      return {
        day: dayNum,
        status: c.status,
        date: c.date,
        remarks: c.remarks || null,
      };
    });

    // 3. Fees
    const feeStructures = queries.getFeeStructuresForStudent.all(studentId, tid, sid) as any[];
    const feePayments = queries.getFeePaymentsForStudent.all(studentId) as any[];

    let totalFees = 0;
    const items = feeStructures.map((fs: any) => {
      const amt = Number(fs.amount || 0);
      totalFees += amt;
      const payment = feePayments.find((fp: any) => Number(fp.fee_id) === Number(fs.id) && fp.status === "completed");
      const isPaid = !!payment;
      return {
        id: fs.id,
        title: fs.title,
        amount: amt,
        status: isPaid ? "paid" : "pending",
        paid_date: payment ? payment.paid_at.slice(0, 10) : null,
        due_date: fs.due_date || null,
      };
    });

    const amountPaid = feePayments.filter((fp: any) => fp.status === "completed").reduce((acc: number, fp: any) => acc + Number(fp.amount_paid || 0), 0);
    const balance = Math.max(0, totalFees - amountPaid);
    const feePct = totalFees > 0 ? Math.min(100, Math.round((amountPaid / totalFees) * 100)) : 100;

    // 4. Upcoming Examinations & Timetable
    const timetableEvents = db.prepare(`
      SELECT t.*, s.name as subject_name
      FROM timetables t
      LEFT JOIN subjects s ON s.id = t.subject_id
      WHERE (t.session_id = ? OR t.session_id IS NULL) AND (t.term_id = ? OR t.term_id IS NULL)
      ORDER BY t.exam_date ASC, t.start_time ASC
    `).all(sid, tid) as any[];

    const upcoming_events = timetableEvents.map((t: any, idx: number) => {
      const d = new Date(t.exam_date || "2026-06-01");
      const month = d.toLocaleString("default", { month: "short" }).toUpperCase();
      const day = d.getDate();
      const weekday = d.toLocaleString("default", { weekday: "short" });
      const nowStr = new Date().toISOString().slice(0, 10);
      let status = "upcoming";
      if (t.exam_date === nowStr) status = "live";
      else if (t.exam_date < nowStr) status = "completed";

      return {
        id: t.id || idx + 1,
        month,
        day,
        weekday,
        title: t.subject_name || t.paper_type || "Examination",
        time_str: `${t.start_time || "09:00"} - ${t.end_time || "11:00"}`,
        venue: t.venue || "Examination Hall",
        status,
        instructions: t.instructions || null,
      };
    });

    // 5. Reports
    const reports = [
      {
        id: 1,
        title: `${activeTerm?.name || "First Term"} Report Card`,
        category: "academic",
        date: "2026-07-24",
        term: `${activeTerm?.name || "First Term"} ${activeSession?.name || "2026/2027"}`,
        description: "Comprehensive academic broadsheet with subject CA, exam scores, and principal remarks.",
        url: `/api/grading/report-card/${studentId}`,
      },
      {
        id: 2,
        title: "Attendance & Punctuality Record",
        category: "attendance",
        date: "2026-07-20",
        term: `${activeTerm?.name || "First Term"}`,
        description: `${presentDays} of ${totalDays} school days attended (${attPct}% attendance rate).`,
        url: `/api/guardian/wards/${studentId}/attendance`,
      },
      {
        id: 3,
        title: "Behavioral & Character Assessment",
        category: "behaviour",
        date: "2026-07-15",
        term: `${activeTerm?.name || "First Term"}`,
        description: "Conduct, team participation, attentiveness, and neatness evaluation by Form Teacher.",
        url: `/api/guardian/wards/${studentId}/reports`,
      }
    ];

    const unreadMsg = db.prepare("SELECT SUM(unread_for_guardian) as count FROM guardian_message_threads WHERE guardian_id = ? AND student_id = ?").get(guardianId, studentId) as any;

    return {
      id: studentId,
      student_id: studentId,
      name: student.name,
      grade: studentGrade,
      admission_number: student.reg_id || `REG-${studentId}`,
      reg_id: student.reg_id,
      image_url: student.image_url || null,
      average_score: averageScore,
      score_delta: "+2.4",
      attendance_pct: attPct,
      class_position: classPosition,
      unread_messages: Number(unreadMsg?.count || 0),
      subjects_performance,
      attendance: {
        percentage: attPct,
        present_days: presentDays,
        absent_days: absentDays,
        late_days: lateDays,
        total_days: totalDays,
        calendar_days,
      },
      fees: {
        balance,
        percentage: feePct,
        amount_paid: amountPaid,
        total_fees: totalFees,
        items,
      },
      upcoming_events,
      reports,
    };
  }
