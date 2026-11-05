// Zone file extracted from server.ts during route modularization.
// Route logic below is verbatim from server.ts; identifiers resolve via ../server bindings.
import db, { queries } from "../../db";
import { isPositiveIntId, trimStr } from "../../validation";
import {
  apiSuccess, apiMessage, apiError, readJson, requireAuth, requireRole, sqlInt, rowCount,
  auditLog, notifyUser, notifyOperators, isSqliteUniqueError, jsonSafeStringify,
  corsHeaders, authz, licenseValidator, stripCorrectAnswer,
} from "../../server";


export async function tryAdminMessages(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  if (pathname === "/api/admin/messages/threads" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const threads = queries.getAdminMessageThreads.all() as any[];
    return apiSuccess(threads);
  }

  const adminThreadMatch = pathname.match(/^\/api\/admin\/messages\/threads\/(\d+)$/);
  if (adminThreadMatch && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const threadId = Number(adminThreadMatch[1]);
    const thread = queries.getThreadById.get(threadId) as any;
    if (!thread) return apiError(404, "Thread not found");

    // Reset unread counter for recipient/admin
    queries.markThreadReadForRecipient.run(threadId);
    const messages = queries.getMessagesByThread.all(threadId);
    const guardian = queries.getUserById.get(thread.guardian_id) as any;
    const student = thread.student_id ? (queries.getUserById.get(thread.student_id) as any) : null;

    return apiSuccess({
      thread: {
        ...thread,
        guardian_name: guardian?.name || "Guardian",
        guardian_email: guardian?.email,
        guardian_phone: guardian?.phone,
        student_name: student?.name,
        student_grade: student?.grade,
        student_reg_id: student?.reg_id,
      },
      messages,
    });
  }

  if (adminThreadMatch && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const threadId = Number(adminThreadMatch[1]);
    const thread = queries.getThreadById.get(threadId) as any;
    if (!thread) return apiError(404, "Thread not found");

    const body = await readJson(req);
    const text = trimStr(body?.text || "");
    if (!text) return apiError(400, "Message text required");

    const msgRes = queries.insertMessage.run(threadId, auth.userId, "operator", text, 0) as { lastInsertRowid: number | bigint };
    queries.updateThreadLastMessage.run(text, 1, 0, threadId);

    // Dispatch real-time SSE notification & push notification to Guardian
    notifyUser(Number(thread.guardian_id), {
      type: "chat_message",
      thread_id: threadId,
      message_id: Number(msgRes.lastInsertRowid),
      text,
      sender_id: auth.userId,
      sender_role: "operator",
      sender_name: auth.name || "School Administration",
      category: "school",
      message: `School Administration: ${text.slice(0, 80)}`,
      link: "/guardian/messages",
    });

    auditLog(auth.userId, "ADMIN_REPLY_INQUIRY", "guardian_message_threads", threadId, JSON.stringify({ messageId: Number(msgRes.lastInsertRowid) }));

    return apiSuccess({ id: Number(msgRes.lastInsertRowid), text, sender_role: "operator", created_at: new Date().toISOString() }, 201);
  }

  if (pathname === "/api/admin/messages/new-thread" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const body = await readJson(req);
    const guardianId = Number(body?.guardian_id || body?.guardianId);
    const studentId = Number(body?.student_id || body?.studentId || 0);
    const text = trimStr(body?.text || "");
    const subject = trimStr(body?.subject || "School Communication");
    const category = trimStr(body?.category || "school");

    if (!isPositiveIntId(guardianId) || !text) {
      return apiError(400, "guardian_id and text required");
    }

    let thread = db.prepare("SELECT * FROM guardian_message_threads WHERE guardian_id = ? AND recipient_id = ? AND category = 'school'").get(guardianId, auth.userId) as any;
    let threadId: number;
    if (!thread) {
      const res = queries.createMessageThread.run(guardianId, auth.userId, studentId || null, category, subject, text, 1, 0) as { lastInsertRowid: number | bigint };
      threadId = Number(res.lastInsertRowid);
    } else {
      threadId = Number(thread.id);
      queries.updateThreadLastMessage.run(text, 1, 0, threadId);
    }

    const msgRes = queries.insertMessage.run(threadId, auth.userId, "operator", text, 0) as { lastInsertRowid: number | bigint };
    notifyUser(guardianId, {
      type: "chat_message",
      thread_id: threadId,
      message_id: Number(msgRes.lastInsertRowid),
      text,
      sender_id: auth.userId,
      sender_role: "operator",
      sender_name: auth.name || "School Administration",
      category,
      message: `${auth.name || "School Administration"}: ${text.slice(0, 80)}`,
      link: "/guardian/messages",
    });

    return apiSuccess({ threadId, messageId: Number(msgRes.lastInsertRowid), text }, 201);
  }
  return null;
}
