// Zone file extracted from server.ts during route modularization.
// Route logic below is verbatim from server.ts; identifiers resolve via ../server bindings.
import db, { queries } from "../../db";
import { isPositiveIntId, trimStr, MIN_PASSWORD_LENGTH } from "../../validation";
import crypto from "node:crypto";
import { buildRichWardPayload } from "./v2-academic";
import { hashPassword, verifyPassword } from "../../auth";
import {
  apiSuccess, apiMessage, apiError, readJson, requireAuth, requireRole, sqlInt, rowCount,
  auditLog, notifyUser, notifyOperators, isSqliteUniqueError, jsonSafeStringify,
  corsHeaders, authz, licenseValidator, stripCorrectAnswer,
} from "../../server";


export async function tryGuardianPortalZoneA(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  if (pathname === "/api/guardian/wards" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const rawWards = queries.getGuardianWards.all(auth.userId) as any[];
    const wards = rawWards.map((w: any) => buildRichWardPayload(Number(w.student_id), auth.userId)).filter(Boolean);
    const stats = queries.getGuardianStats.get(auth.userId, auth.userId, auth.userId);
    return apiSuccess({ wards, stats });
  }

  if (pathname === "/api/guardian/stats" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const stats = queries.getGuardianStats.get(auth.userId, auth.userId, auth.userId);
    return apiSuccess(stats);
  }

  // ── Guardian Ward Performance ─────────────────────────────────────────────
  const wardPerfMatch = pathname.match(/^\/api\/guardian\/wards\/(\d+)\/performance$/);
  if (wardPerfMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const wardId = Number(wardPerfMatch[1]);
    const link = db.prepare("SELECT student_id FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, wardId) as any;
    if (!link) return apiError(403, "Access denied: not your ward");
    const wardData = buildRichWardPayload(Number(link.student_id), auth.userId);
    return apiSuccess(wardData);
  }

  // ── Guardian Ward Attendance ──────────────────────────────────────────────
  const wardAttMatch = pathname.match(/^\/api\/guardian\/wards\/(\d+)\/attendance$/);
  if (wardAttMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian", "teacher", "operator"]);
    const studentId = Number(wardAttMatch[1]);
    if (auth.role === "guardian") {
      const link = db.prepare("SELECT student_id FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, studentId) as any;
      if (!link) return apiError(403, "Access denied: not your ward");
    }
    const activeTerm = queries.getActiveAcademicTerm.get() as any;
    const tid = activeTerm?.id || 1;
    const summary = queries.getStudentAttendanceSummary.get(studentId, tid) as any;
    const calendar = queries.getStudentAttendanceCalendar.all(studentId, tid) as any[];
    return apiSuccess({ summary, calendar });
  }

  if (wardAttMatch && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["teacher", "operator"]);
    const studentId = Number(wardAttMatch[1]);
    const body = await readJson(req);
    const date = trimStr(body?.date) || new Date().toISOString().slice(0, 10);
    const status = ["present", "absent", "late", "holiday", "excused"].includes(body?.status) ? body.status : "present";
    const remarks = body?.remarks ? trimStr(body.remarks) : null;
    const activeTerm = queries.getActiveAcademicTerm.get() as any;
    const activeSession = queries.getActiveAcademicSession.get() as any;
    const tid = Number(body?.term_id || activeTerm?.id || 1);
    const sid = Number(body?.session_id || activeSession?.id || 1);

    queries.upsertAttendanceRecord.run(studentId, tid, sid, date, status, remarks, auth.userId);
    
    // Broadcast notification to student's guardians
    const guardians = queries.getStudentGuardians.all(studentId) as any[];
    for (const g of guardians) {
      notifyUser(Number(g.guardian_id), {
        type: "attendance",
        message: `Attendance marked as ${status.toUpperCase()} for ${date}`,
        link: "/guardian/attendance",
      });
    }
    return apiSuccess({ success: true, studentId, date, status });
  }

  // ── Guardian Ward Fees ────────────────────────────────────────────────────
  const wardFeesMatch = pathname.match(/^\/api\/guardian\/wards\/(\d+)\/fees$/);
  if (wardFeesMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian", "operator"]);
    const studentId = Number(wardFeesMatch[1]);
    if (auth.role === "guardian") {
      const link = db.prepare("SELECT student_id FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, studentId) as any;
      if (!link) return apiError(403, "Access denied: not your ward");
    }
    const activeTerm = queries.getActiveAcademicTerm.get() as any;
    const activeSession = queries.getActiveAcademicSession.get() as any;
    const tid = activeTerm?.id || 1;
    const sid = activeSession?.id || 1;
    const structures = queries.getFeeStructuresForStudent.all(studentId, tid, sid) as any[];
    const payments = queries.getFeePaymentsForStudent.all(studentId) as any[];
    return apiSuccess({ structures, payments });
  }

  const wardPayMatch = pathname.match(/^\/api\/guardian\/wards\/(\d+)\/fees\/pay$/);
  if (wardPayMatch && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian", "operator"]);
    const studentId = Number(wardPayMatch[1]);
    if (!isPositiveIntId(studentId)) return apiError(400, "Invalid ward id");

    if (auth.role === "guardian") {
      const link = db.prepare("SELECT student_id FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, studentId) as any;
      if (!link) return apiError(403, "Access denied: not your ward");
    }

    const body = await readJson(req);
    const feeId = Number(body?.fee_id || 1);
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError(400, "Payment amount must be a positive number");
    }
    const method_type = ["bank_transfer", "cash", "card", "online_gateway"].includes(body?.method) ? body.method : "card";
    const paymentRef = `PAY-${Date.now()}-${crypto.randomInt(1000, 9999)}`;

    queries.createFeePayment.run(studentId, feeId, amount, paymentRef, method_type, "completed", auth.userId);
    auditLog(auth.userId, "FEE_PAYMENT", "fee_payments", studentId, JSON.stringify({ feeId, amount, paymentRef }));
    return apiSuccess({ success: true, paymentRef, amount, status: "completed" });
  }

  // ── Guardian Ward Results ─────────────────────────────────────────────────
  const wardResultsMatch = pathname.match(/^\/api\/guardian\/wards\/(\d+)\/results$/);
  if (wardResultsMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const wardId = Number(wardResultsMatch[1]);
    if (!isPositiveIntId(wardId)) return apiError(400, "Invalid ward id");
    const link = db.prepare("SELECT student_id FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, wardId) as any;
    if (!link) return apiError(403, "Access denied: not your ward");
    const actualStudentId = Number(link.student_id);
    const termId = Number(url.searchParams.get("term_id") || 0);
    const activeTerm = queries.getActiveTerm.get() as any;
    const resolvedTermId = isPositiveIntId(termId) ? termId : (activeTerm?.id ?? 0);
    if (!resolvedTermId) return apiSuccess([]);
    const results = queries.getWardTermResults.all(actualStudentId, resolvedTermId);
    return apiSuccess(results);
  }

  // ── Guardian Ward Report Card ─────────────────────────────────────────────
  const wardReportMatch = pathname.match(/^\/api\/guardian\/wards\/(\d+)\/report-card$/);
  if (wardReportMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const wardId = Number(wardReportMatch[1]);
    if (!isPositiveIntId(wardId)) return apiError(400, "Invalid ward id");
    const link = db.prepare("SELECT student_id FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, wardId) as any;
    if (!link) return apiError(403, "Access denied: not your ward");
    const actualStudentId = Number(link.student_id);
    const results = queries.getStudentTermResultsForReportCard.all(actualStudentId);
    const remarks = db.prepare("SELECT * FROM student_term_remarks WHERE student_id = ? ORDER BY updated_at DESC").all(actualStudentId);
    return apiSuccess({ results, remarks });
  }

  // ── Guardian Ward Exams ───────────────────────────────────────────────────
  const wardExamsMatch = pathname.match(/^\/api\/guardian\/wards\/(\d+)\/exams$/);
  if (wardExamsMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const wardId = Number(wardExamsMatch[1]);
    if (!isPositiveIntId(wardId)) return apiError(400, "Invalid ward id");
    const link = db.prepare("SELECT student_id FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, wardId) as any;
    if (!link) return apiError(403, "Access denied: not your ward");
    const actualStudentId = Number(link.student_id);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
    const exams = queries.getWardExams.all(actualStudentId, limit);
    return apiSuccess(exams);
  }

  // ── Guardian Message Contacts (Discover Form Teacher, Subject Teachers, Admin)
  if (pathname === "/api/guardian/messages/contacts" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const wardId = Number(url.searchParams.get("ward_id") || url.searchParams.get("student_id") || 0);
    let studentId = wardId;
    if (!studentId) {
      const firstLink = queries.getGuardianWards.get(auth.userId) as any;
      studentId = Number(firstLink?.student_id || 0);
    }
    if (!studentId) return apiSuccess({ contacts: [] });
    // Canonical identifier is the student ID; the guardian must hold an approved link to it.
    const ownsWard = db.prepare("SELECT 1 FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, studentId);
    if (!ownsWard) return apiError(403, "Access denied: not your ward");

    const student = queries.getUserById.get(studentId) as any;
    const enrolledClass = db.prepare("SELECT c.name, c.id as class_id FROM class_enrollments ce JOIN classes c ON c.id = ce.class_id WHERE ce.student_id = ? ORDER BY ce.id DESC LIMIT 1").get(studentId) as any;
    const studentGrade = enrolledClass?.name || student?.grade || "JSS 3";
    const contacts: any[] = [];

    // 1. Form / Class Teacher for the active ward
    try {
      let cls = db.prepare(`
        SELECT c.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email 
        FROM classes c 
        JOIN users u ON u.id = c.class_teacher_id 
        WHERE (c.id = ? OR c.name = ? OR c.level = ?) AND c.class_teacher_id IS NOT NULL AND u.role = 'teacher'
        LIMIT 1
      `).get(enrolledClass?.class_id || 0, studentGrade, student?.grade || studentGrade) as any;

      if (!cls && student?.grade) {
        cls = db.prepare(`
          SELECT c.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email 
          FROM classes c 
          JOIN users u ON u.id = c.class_teacher_id 
          WHERE (c.name LIKE ? OR c.level LIKE ?) AND c.class_teacher_id IS NOT NULL AND u.role = 'teacher'
          ORDER BY c.id ASC LIMIT 1
        `).get(`%${student.grade}%`, `%${student.grade}%`) as any;
      }

      if (cls) {
        contacts.push({
          id: cls.teacher_id,
          name: cls.teacher_name,
          role: "teacher",
          role_label: `Form Teacher (${cls.name || studentGrade})`,
          student_id: studentId,
          category: "teacher",
        });
      }
    } catch {}

    // 2. Subject Teachers for the active ward
    try {
      const subTeachers = db.prepare(`
        SELECT DISTINCT gs.teacher_id as id, u.name, gs.name as subject_name
        FROM grading_subjects gs
        JOIN users u ON u.id = gs.teacher_id
        WHERE gs.class_id IN (SELECT id FROM classes WHERE name = ? OR level = ?) 
           OR gs.class_id = ? 
           OR gs.code LIKE ?
      `).all(studentGrade, studentGrade, enrolledClass?.class_id || 0, `%${studentGrade.replace(/\s+/g, '')}%`) as any[];

      for (const st of subTeachers) {
        if (!contacts.some((c: any) => c.id === st.id)) {
          contacts.push({
            id: st.id,
            name: st.name,
            role: "teacher",
            role_label: `${st.subject_name} Teacher`,
            student_id: studentId,
            category: "teacher",
          });
        }
      }

      // Also CBT subjects enrolled
      const cbtTeachers = db.prepare(`
        SELECT DISTINCT s.teacher_id as id, u.name, s.name as subject_name
        FROM subject_enrollments se
        JOIN subjects s ON s.id = se.subject_id
        JOIN users u ON u.id = s.teacher_id
        WHERE se.student_id = ? AND s.teacher_id IS NOT NULL
      `).all(studentId) as any[];

      for (const ct of cbtTeachers) {
        if (!contacts.some((c: any) => c.id === ct.id)) {
          contacts.push({
            id: ct.id,
            name: ct.name,
            role: "teacher",
            role_label: `${ct.subject_name} Teacher`,
            student_id: studentId,
            category: "teacher",
          });
        }
      }
    } catch {}

    // 3. Fallback: If no teacher contacts were discovered yet, offer all active faculty teachers
    try {
      const teacherContacts = contacts.filter((c: any) => c.category === "teacher");
      if (teacherContacts.length === 0) {
        const allTeachers = db.prepare("SELECT id, name, email FROM users WHERE role = 'teacher' AND is_active = 1 ORDER BY name ASC").all() as any[];
        for (const t of allTeachers) {
          if (!contacts.some((c: any) => c.id === t.id)) {
            contacts.push({
              id: t.id,
              name: t.name,
              role: "teacher",
              role_label: "Faculty Teacher",
              student_id: studentId,
              category: "teacher",
            });
          }
        }
      }
    } catch {}

    // 4. School Administration (Operators / Admins) — STRICTLY category: "admin"
    try {
      const admins = db.prepare("SELECT id, name, email, role FROM users WHERE role = 'operator' ORDER BY id ASC").all() as any[];
      for (const adminUser of admins) {
        contacts.push({
          id: adminUser.id,
          name: adminUser.name || "School Administration",
          role: "operator",
          role_label: "School Administration",
          student_id: studentId,
          category: "admin",
        });
      }
    } catch {}

    return apiSuccess(contacts);
  }

  // ── Guardian Messaging Threads ────────────────────────────────────────────
  if (pathname === "/api/guardian/messages/threads" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const threads = queries.getGuardianThreads.all(auth.userId) as any[];
    return apiSuccess(threads);
  }

  const guardianThreadMatch = pathname.match(/^\/api\/guardian\/messages\/threads\/(\d+)$/);
  if (guardianThreadMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const threadId = Number(guardianThreadMatch[1]);
    const thread = queries.getThreadById.get(threadId) as any;
    if (!thread || Number(thread.guardian_id) !== auth.userId) return apiError(404, "Thread not found");
    
    // Reset unread counter for guardian
    queries.markThreadReadForGuardian.run(threadId);
    const messages = queries.getMessagesByThread.all(threadId);
    return apiSuccess({ thread, messages });
  }

  if (guardianThreadMatch && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const threadId = Number(guardianThreadMatch[1]);
    const thread = queries.getThreadById.get(threadId) as any;
    if (!thread || Number(thread.guardian_id) !== auth.userId) return apiError(404, "Thread not found");

    const body = await readJson(req);
    const text = trimStr(body?.text || "");
    if (!text) return apiError(400, "Message text required");

    const msgRes = queries.insertMessage.run(threadId, auth.userId, "guardian", text, 0) as { lastInsertRowid: number | bigint };
    queries.updateThreadLastMessage.run(text, 0, 1, threadId);

    const isAdminRecipient = thread.recipient_role === "operator" || thread.category === "admin" || thread.category === "school" || thread.category === "system";
    const category = isAdminRecipient ? "admin" : "teacher";

    // Dispatch real-time SSE notification to recipient (teacher/admin)
    const chatPayload = {
      type: "chat_message",
      thread_id: threadId,
      message_id: Number(msgRes.lastInsertRowid),
      text,
      sender_id: auth.userId,
      sender_role: "guardian",
      sender_name: auth.name || "Guardian",
      category,
      message: `${auth.name || "Guardian"}: ${text.slice(0, 80)}`,
      link: isAdminRecipient ? "/ADMIN/messages" : "/teacher/messages",
    };
    notifyUser(Number(thread.recipient_id), chatPayload);
    if (isAdminRecipient) {
      notifyOperators(chatPayload);
    }

    return apiSuccess({ id: Number(msgRes.lastInsertRowid), text, sender_role: "guardian", created_at: new Date().toISOString() }, 201);
  }

  if (pathname === "/api/guardian/messages/new-thread" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const body = await readJson(req);
    const recipientId = Number(body?.recipient_id);
    const studentId = Number(body?.student_id);
    const text = trimStr(body?.text || "");
    
    if (!isPositiveIntId(recipientId) || !isPositiveIntId(studentId) || !text) {
      return apiError(400, "recipient_id, student_id, and text required");
    }

    const recipientUser = queries.getUserById.get(recipientId) as any;
    const ownsThreadWard = db.prepare("SELECT 1 FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, studentId);
    if (!ownsThreadWard) return apiError(403, "Access denied: not your ward");
    const isRecipientOperator = recipientUser?.role === "operator" || body?.category === "admin" || body?.category === "school";
    const category = isRecipientOperator ? "admin" : "teacher";
    const subject = trimStr(body?.subject || `Inquiry regarding ${body?.student_name || "Student"}`);

    let thread = queries.findThreadByParticipants.get(auth.userId, recipientId, studentId) as any;
    let threadId: number;
    if (!thread) {
      const res = queries.createMessageThread.run(auth.userId, recipientId, studentId, category, subject, text, 0, 1) as { lastInsertRowid: number | bigint };
      threadId = Number(res.lastInsertRowid);
    } else {
      threadId = Number(thread.id);
      queries.updateThreadLastMessage.run(text, 0, 1, threadId);
    }

    const msgRes = queries.insertMessage.run(threadId, auth.userId, "guardian", text, 0) as { lastInsertRowid: number | bigint };
    const newChatPayload = {
      type: "chat_message",
      thread_id: threadId,
      message_id: Number(msgRes.lastInsertRowid),
      text,
      sender_id: auth.userId,
      sender_role: "guardian",
      sender_name: auth.name || "Guardian",
      category,
      message: `${auth.name || "Guardian"}: ${text.slice(0, 80)}`,
      link: isRecipientOperator ? "/ADMIN/messages" : "/teacher/messages",
    };
    notifyUser(recipientId, newChatPayload);
    if (isRecipientOperator) {
      notifyOperators(newChatPayload);
    }

    return apiSuccess({ threadId, messageId: Number(msgRes.lastInsertRowid), text }, 201);
  }

  // ── Teacher Messaging Threads ─────────────────────────────────────────────
  if (pathname === "/api/teacher/messages/threads" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["teacher", "operator"]);
    const threads = queries.getTeacherThreads.all(auth.userId) as any[];
    return apiSuccess(threads);
  }

  const teacherThreadMatch = pathname.match(/^\/api\/teacher\/messages\/threads\/(\d+)$/);
  if (teacherThreadMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["teacher", "operator"]);
    const threadId = Number(teacherThreadMatch[1]);
    const thread = queries.getThreadById.get(threadId) as any;
    if (!thread || Number(thread.recipient_id) !== auth.userId) return apiError(404, "Thread not found");

    // Reset unread counter for teacher
    queries.markThreadReadForRecipient.run(threadId);
    const messages = queries.getMessagesByThread.all(threadId);
    return apiSuccess({ thread, messages });
  }

  if (teacherThreadMatch && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["teacher", "operator"]);
    const threadId = Number(teacherThreadMatch[1]);
    const thread = queries.getThreadById.get(threadId) as any;
    if (!thread || Number(thread.recipient_id) !== auth.userId) return apiError(404, "Thread not found");

    const body = await readJson(req);
    const text = trimStr(body?.text || "");
    if (!text) return apiError(400, "Message text required");

    const msgRes = queries.insertMessage.run(threadId, auth.userId, auth.role, text, 0) as { lastInsertRowid: number | bigint };
    queries.updateThreadLastMessage.run(text, 1, 0, threadId);

    // Dispatch real-time SSE notification & message payload to Guardian
    notifyUser(Number(thread.guardian_id), {
      type: "chat_message",
      thread_id: threadId,
      message_id: Number(msgRes.lastInsertRowid),
      text,
      sender_id: auth.userId,
      sender_role: auth.role,
      sender_name: auth.name || "Teacher",
      category: "teacher",
      message: `${auth.name || "Teacher"}: ${text.slice(0, 80)}`,
      link: "/guardian/messages",
    });

    return apiSuccess({ id: Number(msgRes.lastInsertRowid), text, sender_role: auth.role, created_at: new Date().toISOString() }, 201);
  }

  // ── Push Subscriptions (VAPID / Web Push) ──────────────────────────────────
  return null;
}

export async function tryGuardianPortalZoneB(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  if (pathname === "/api/guardian/links" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const links = queries.getGuardianLinksByGuardian.all(auth.userId);
    return apiSuccess(links);
  }

  if (pathname === "/api/guardian/links" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const body = await readJson(req);
    let student_id = isPositiveIntId(Number(body?.student_id)) ? Number(body?.student_id) : 0;
    const rawInput = trimStr(body?.reg_id || body?.regId || body?.student_reg_id || body?.admission_number || (body?.student_id ? String(body.student_id) : ""));

    if (!student_id && rawInput) {
      // 1. Try exact match by reg_id, email, or numeric ID
      let studentMatch = db.prepare(`
        SELECT id, role, name, reg_id, grade 
        FROM users 
        WHERE role = 'student' 
          AND (
            UPPER(TRIM(reg_id)) = UPPER(TRIM(?))
            OR UPPER(TRIM(email)) = UPPER(TRIM(?))
            OR CAST(id AS TEXT) = TRIM(?)
          )
        LIMIT 1
      `).get(rawInput, rawInput, rawInput) as any;

      // 2. Fallback to case-insensitive partial match
      if (!studentMatch) {
        studentMatch = db.prepare(`
          SELECT id, role, name, reg_id, grade 
          FROM users 
          WHERE role = 'student' 
            AND (
              reg_id LIKE ? 
              OR UPPER(TRIM(name)) = UPPER(TRIM(?))
            )
          LIMIT 1
        `).get(`%${rawInput}%`, rawInput) as any;
      }

      if (studentMatch) {
        student_id = Number(studentMatch.id);
      }
    }

    const relationship = trimStr(body?.relationship || "Parent").slice(0, 40);
    if (!isPositiveIntId(student_id)) {
      return apiError(400, "Student registration number or ID not found. Please verify the registration number.");
    }

    const student = queries.getUserById.get(student_id) as any;
    if (!student || student.role !== "student") {
      return apiError(400, "Student registration number or ID not found. Please verify the registration number.");
    }

    try {
      // A previously rejected/revoked request occupies the UNIQUE(guardian_id, student_id)
      // slot — revive it back to pending instead of failing (mirrors the v2 route behavior).
      const terminal = db.prepare("SELECT * FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status IN ('rejected','revoked') ORDER BY id DESC LIMIT 1").get(auth.userId, student_id) as any;
      if (terminal) {
        db.prepare("UPDATE guardian_student_links SET status = 'pending', relationship = ?, verified_by = NULL, verified_at = NULL WHERE id = ?").run(relationship, terminal.id);
        auditLog(auth.userId, "GUARDIAN_LINK_REQUEST", "guardian_student_links", Number(terminal.id), JSON.stringify({
          student_id,
          relationship,
          reg_id: student.reg_id,
          student_name: student.name,
          revived: true
        }));
        return apiSuccess({
          id: Number(terminal.id),
          status: "pending",
          student: {
            id: student.id,
            name: student.name,
            grade: student.grade,
            reg_id: student.reg_id
          },
          message: "Link request submitted successfully."
        }, 201);
      }

      const result = queries.createGuardianLink.run(auth.userId, student_id, relationship) as { lastInsertRowid: number | bigint };
      auditLog(auth.userId, "GUARDIAN_LINK_REQUEST", "guardian_student_links", Number(result.lastInsertRowid), JSON.stringify({
        student_id,
        relationship,
        reg_id: student.reg_id,
        student_name: student.name
      }));
      return apiSuccess({
        id: Number(result.lastInsertRowid),
        status: "pending",
        student: {
          id: student.id,
          name: student.name,
          grade: student.grade,
          reg_id: student.reg_id
        },
        message: "Link request created successfully."
      }, 201);
    } catch (e) {
      if (isSqliteUniqueError(e)) return apiError(409, "A link request between you and this student already exists");
      throw e;
    }
  }

  const guardianSelfLinkMatch = pathname.match(/^\/api\/guardian\/links\/(\d+)$/);
  if (guardianSelfLinkMatch && method === "DELETE") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const linkId = Number(guardianSelfLinkMatch[1]);
    if (!isPositiveIntId(linkId)) return apiError(400, "Invalid link id");
    const link = queries.getGuardianLink.get(linkId) as any;
    if (!link) return apiError(404, "Link not found");
    if (link.guardian_id !== auth.userId) return apiError(403, "Access denied");
    if (link.status !== "pending") return apiError(400, "Can only cancel pending links");
    queries.updateGuardianLinkStatus.run("revoked", auth.userId, linkId);
    auditLog(auth.userId, "GUARDIAN_LINK_CANCELLED", "guardian_student_links", linkId, JSON.stringify({ action: "cancel" }));
    return apiSuccess({ id: linkId, status: "revoked" });
  }

  // ── Guardian Notifications ────────────────────────────────────────────────
  if (pathname === "/api/guardian/notifications" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const notifications = queries.getNotifications.all(auth.userId);
    const unreadRow = queries.getUnreadNotificationCount.get(auth.userId) as any;
    return apiSuccess({ items: notifications, unreadCount: Number(unreadRow?.count || 0) });
  }

  if (pathname === "/api/guardian/notifications/mark-read" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(auth.userId);
    return apiSuccess({ success: true, message: "All notifications marked as read" });
  }

  // ── Guardian Announcements ────────────────────────────────────────────────
  if (pathname === "/api/guardian/announcements" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const category = url.searchParams.get("category") || "all";
    let query = "SELECT * FROM school_announcements";
    const params: any[] = [];
    if (category !== "all") {
      query += " WHERE category = ?";
      params.push(category);
    }
    query += " ORDER BY date DESC, id DESC";
    const announcements = db.prepare(query).all(...params);
    return apiSuccess(announcements);
  }

  // ── Guardian Calendar ─────────────────────────────────────────────────────
  if (pathname === "/api/guardian/calendar" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const activeTerm = queries.getActiveAcademicTerm.get() as any;
    const tid = activeTerm?.id || 1;
    const events = db.prepare("SELECT * FROM academic_calendar_events WHERE term_id = ? ORDER BY start_date ASC").all(tid) as any[];
    return apiSuccess(events || []);
  }

  // ── Guardian Profile ──────────────────────────────────────────────────────
  if (pathname === "/api/guardian/profile" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const guardian = queries.getUserById.get(auth.userId) as any;
    if (!guardian) return apiError(404, "Guardian user not found");
    const wards = queries.getGuardianWards.all(auth.userId) as any[];

    return apiSuccess({
      id: guardian.id,
      name: guardian.name,
      email: guardian.email,
      phone: guardian.phone || "+234 801 234 5678",
      address: guardian.address || "Lagos, Nigeria",
      relationship: guardian.relationship || "Parent / Guardian",
      role: guardian.role,
      notify_attendance: guardian.notify_attendance !== 0,
      notify_results: guardian.notify_results !== 0,
      notify_fees: guardian.notify_fees !== 0,
      notify_messages: guardian.notify_messages !== 0,
      linked_wards_count: wards.length,
    });
  }


  // ── Teacher Attendance: Class Roster & Roll ────────────────────────────────
  return null;
}

export async function tryGuardianPortalZoneC(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  if (pathname === "/api/guardian/settings/password" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const body = await readJson(req);
    const currentPassword = String(body?.current_password || "");
    const newPassword = String(body?.new_password || "");

    if (!currentPassword || !newPassword) return apiError(400, "Current password and new password required");
    if (newPassword.length < MIN_PASSWORD_LENGTH) return apiError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`);

    const user = queries.getUserById.get(auth.userId) as any;
    if (!user) return apiError(404, "User not found");

    const match = await verifyPassword(currentPassword, user.password_hash);
    if (!match) return apiError(400, "Current password is incorrect");

    const newHash = await hashPassword(newPassword);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, auth.userId);
    auditLog(auth.userId, "PASSWORD_UPDATED", "users", auth.userId, "{}");

    return apiSuccess({ success: true, message: "Password updated successfully" });
  }

  // ── Guardian Settings: Profile Update ─────────────────────────────────────
  if (pathname === "/api/guardian/settings/profile" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const body = await readJson(req);
    const phone = trimStr(body?.phone || "");
    const address = trimStr(body?.address || "");

    queries.updateGuardianProfile.run(phone || null, address || null, auth.userId);
    auditLog(auth.userId, "PROFILE_UPDATED", "users", auth.userId, JSON.stringify({ phone, address }));

    return apiSuccess({ success: true, message: "Profile updated successfully" });
  }

  // ── Guardian Settings: Notification Preferences ──────────────────────────
  if (pathname === "/api/guardian/settings/notifications" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const body = await readJson(req);
    const notify_attendance = (body?.notify_attendance === 0 || body?.notify_attendance === false) ? 0 : 1;
    const notify_results = (body?.notify_results === 0 || body?.notify_results === false) ? 0 : 1;
    const notify_fees = (body?.notify_fees === 0 || body?.notify_fees === false) ? 0 : 1;
    const notify_messages = (body?.notify_messages === 0 || body?.notify_messages === false) ? 0 : 1;

    queries.updateGuardianNotificationPreferences.run(
      notify_attendance,
      notify_results,
      notify_fees,
      notify_messages,
      auth.userId
    );

    return apiSuccess({
      success: true,
      message: "Notification preferences saved",
      preferences: { notify_attendance, notify_results, notify_fees, notify_messages },
    });
  }

  // ── Guardian Report Card Share Token ──────────────────────────────────────
  const wardShareTokenMatch = pathname.match(/^\/api\/guardian\/wards\/(\d+)\/share-token$/);
  if (wardShareTokenMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["guardian"]);
    const wardId = Number(wardShareTokenMatch[1]);
    const link = db.prepare("SELECT student_id FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(auth.userId, wardId) as any;
    if (!link) return apiError(403, "Access denied: not your ward");

    const timestamp = Date.now();
    const nonce = crypto.randomBytes(8).toString("hex");
    const payload = `${auth.userId}:${link.student_id}:${timestamp}:${nonce}`;
    const secret = process.env.JWT_SECRET || "acqad-guardian-share-secret";
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const token = Buffer.from(`${payload}.${signature}`).toString("base64url");
    const shareUrl = `/student/report-card?student_id=${link.student_id}&token=${token}`;
    return apiSuccess({ token, share_url: shareUrl });
  }

  // Helper to verify share tokens
  const verifyTokenPayload = (rawToken: string): { valid: boolean; guardianId?: number; studentId?: number; timestamp?: number; error?: string } => {
    try {
      const decoded = Buffer.from(rawToken, "base64url").toString("utf-8");
      const dotIdx = decoded.lastIndexOf(".");
      if (dotIdx === -1) return { valid: false, error: "Missing token signature" };
      const payload = decoded.substring(0, dotIdx);
      const signature = decoded.substring(dotIdx + 1);

      const secret = process.env.JWT_SECRET || "acqad-guardian-share-secret";
      const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const sigBuf = Buffer.from(signature, "hex");
      const expBuf = Buffer.from(expectedSig, "hex");
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return { valid: false, error: "Invalid signature" };
      }

      const parts = payload.split(":");
      if (parts.length < 4) return { valid: false, error: "Malformed payload" };
      const guardianId = Number(parts[0]);
      const studentId = Number(parts[1]);
      const timestamp = Number(parts[2]);

      if (!isPositiveIntId(guardianId) || !isPositiveIntId(studentId) || !Number.isFinite(timestamp)) {
        return { valid: false, error: "Invalid payload parameters" };
      }

      // Reject epoch / 1970 or past invalid timestamps (must be >= 2024-01-01)
      if (timestamp < 1704067200000) {
        return { valid: false, error: "Epoch or invalid timestamp" };
      }

      const now = Date.now();
      // Token expires after 14 days
      if (now - timestamp > 14 * 24 * 60 * 60 * 1000) {
        return { valid: false, error: "Share token has expired" };
      }
      // Clock skew guard
      if (timestamp - now > 5 * 60 * 1000) {
        return { valid: false, error: "Token dated in the future" };
      }

      const link = db.prepare("SELECT 1 FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status = 'approved'").get(guardianId, studentId);
      if (!link) {
        return { valid: false, error: "Guardian link is no longer active" };
      }

      return { valid: true, guardianId, studentId, timestamp };
    } catch {
      return { valid: false, error: "Invalid token" };
    }
  };

  // ── Guardian Verify Report Card Share Token ──────────────────────────────
  if (pathname === "/api/guardian/verify-share-token" && method === "GET") {
    const rawToken = url.searchParams.get("token") || "";
    if (!rawToken) return apiError(400, "Token query parameter required");

    const verified = verifyTokenPayload(rawToken);
    if (!verified.valid || !verified.studentId || !verified.guardianId || !verified.timestamp) {
      return apiError(400, verified.error || "Invalid or expired share token");
    }

    const student = queries.getUserById.get(verified.studentId) as any;
    if (!student || student.role !== "student") return apiError(404, "Student not found");

    const results = queries.getStudentTermResultsForReportCard.all(verified.studentId);
    const remarks = db.prepare("SELECT * FROM student_term_remarks WHERE student_id = ? ORDER BY updated_at DESC").all(verified.studentId);

    return apiSuccess({
      valid: true,
      student_id: verified.studentId,
      guardian_id: verified.guardianId,
      student: { id: student.id, name: student.name, reg_id: student.reg_id, grade: student.grade },
      results,
      remarks,
      created_at: new Date(verified.timestamp).toISOString(),
      expires_at: new Date(verified.timestamp + 14 * 86400 * 1000).toISOString()
    });
  }

  // ── Guest Shared Report Card View ─────────────────────────────────────────
  if (pathname === "/api/guardian/shared-report-card" && method === "GET") {
    const rawToken = url.searchParams.get("token") || "";
    if (!rawToken) return apiError(400, "Token query parameter required");

    const verified = verifyTokenPayload(rawToken);
    if (!verified.valid || !verified.studentId || !verified.guardianId) {
      return apiError(401, verified.error || "Invalid or expired share token");
    }

    const student = queries.getUserById.get(verified.studentId) as any;
    if (!student || student.role !== "student") return apiError(404, "Student not found");

    const results = queries.getStudentTermResultsForReportCard.all(verified.studentId);
    const remarks = db.prepare("SELECT * FROM student_term_remarks WHERE student_id = ? ORDER BY updated_at DESC").all(verified.studentId);

    return apiSuccess({
      student: { id: student.id, name: student.name, reg_id: student.reg_id, grade: student.grade },
      results,
      remarks,
    });
  }

  // ── Result Publishing & Release Controls (Teacher & Operator) ─────────────
  return null;
}
