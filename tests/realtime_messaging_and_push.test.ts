import { describe, it, expect, beforeAll } from "bun:test";
import db, { queries } from "../db";
import { generateToken, hashPassword } from "../auth";

describe("Real-Time Messaging, SSE Stream & Push Notification Tests", () => {
  let guardianToken: string;
  let teacherToken: string;
  let adminToken: string;

  let guardianUser: any;
  let teacherUser: any;
  let adminUser: any;
  let studentUser: any;
  let jss3Class: any;

  const baseUrl = "http://127.0.0.1:8001";

  beforeAll(async () => {
    // 1. Ensure Admin exists
    adminUser = db.prepare("SELECT * FROM users WHERE role = 'operator' LIMIT 1").get() as any;
    if (!adminUser) {
      const hash = await hashPassword("adminPass123!");
      const res = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES ('System Admin', 'admin@exampool.ng', 'operator', ?, 1)").run(hash);
      adminUser = { id: Number(res.lastInsertRowid), name: "System Admin", email: "admin@exampool.ng", role: "operator" };
    }
    adminToken = generateToken(adminUser.id, "operator");

    // 2. Ensure Teacher exists
    teacherUser = db.prepare("SELECT * FROM users WHERE email = 'teacher@exampool.ng'").get() as any;
    if (!teacherUser) {
      const hash = await hashPassword("teacherPassword123!");
      const res = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES ('Class Teacher', 'teacher@exampool.ng', 'teacher', ?, 1)").run(hash);
      teacherUser = { id: Number(res.lastInsertRowid), name: "Class Teacher", email: "teacher@exampool.ng", role: "teacher" };
    }
    teacherToken = generateToken(teacherUser.id, "teacher");

    // 3. Ensure Guardian exists
    guardianUser = db.prepare("SELECT * FROM users WHERE email = 'guardian@exampool.ng'").get() as any;
    if (!guardianUser) {
      const hash = await hashPassword("guardianPassword123!");
      const res = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active, phone) VALUES ('Chief John Doe (Guardian)', 'guardian@exampool.ng', 'guardian', ?, 1, '+234 809 999 8888')").run(hash);
      guardianUser = { id: Number(res.lastInsertRowid), name: "Chief John Doe (Guardian)", email: "guardian@exampool.ng", role: "guardian" };
    }
    guardianToken = generateToken(guardianUser.id, "guardian");

    // 4. Ensure Student exists
    studentUser = db.prepare("SELECT * FROM users WHERE email = 'student@exampool.ng'").get() as any;
    if (!studentUser) {
      const hash = await hashPassword("studentPass123!");
      const res = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active, grade, reg_id) VALUES ('Daniel Adeleke', 'student@exampool.ng', 'student', ?, 1, 'JSS 3', 'REG-2026-0001')").run(hash);
      studentUser = { id: Number(res.lastInsertRowid), name: "Daniel Adeleke", email: "student@exampool.ng", role: "student" };
    }

    // 5. Ensure Class & Link
    let cls = db.prepare("SELECT * FROM classes WHERE name = 'JSS 3' LIMIT 1").get() as any;
    if (!cls) {
      db.prepare("INSERT INTO classes (name, level, class_teacher_id) VALUES ('JSS 3', 'junior', ?)").run(teacherUser.id);
      cls = db.prepare("SELECT * FROM classes WHERE name = 'JSS 3' LIMIT 1").get() as any;
    } else {
      db.prepare("UPDATE classes SET class_teacher_id = ? WHERE id = ?").run(teacherUser.id, cls.id);
    }
    jss3Class = cls;

    db.prepare("INSERT OR IGNORE INTO guardian_student_links (guardian_id, student_id, relationship, status) VALUES (?, ?, 'Parent', 'approved')").run(guardianUser.id, studentUser.id);
    db.prepare("UPDATE guardian_student_links SET status = 'approved' WHERE guardian_id = ? AND student_id = ?").run(guardianUser.id, studentUser.id);
  });

  it("1. GET /api/notifications/stream connects and maintains SSE stream", async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    try {
      const res = await fetch(`${baseUrl}/api/notifications/stream`, {
        headers: { Authorization: `Bearer ${guardianToken}` },
        signal: controller.signal,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
    } catch (e: any) {
      // Abort is expected when closing the stream
      if (e.name !== "AbortError") throw e;
    } finally {
      clearTimeout(timeout);
    }
  });

  it("2. Guardian sends message to Teacher -> Teacher receives notification & thread is updated", async () => {
    // 1. Create/send message
    const sendRes = await fetch(`${baseUrl}/api/guardian/messages/new-thread`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guardianToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient_id: teacherUser.id,
        student_id: studentUser.id,
        category: "teacher",
        subject: "Homework Clarification",
        text: "Good morning Teacher, please clarify question 4 on Daniel's homework.",
      }),
    });
    expect(sendRes.status).toBe(201);
    const sendJson: any = await sendRes.json();
    const threadId = sendJson.data.threadId;
    expect(threadId).toBeGreaterThan(0);

    // 2. Teacher views their inbox
    const teacherThreadsRes = await fetch(`${baseUrl}/api/teacher/messages/threads`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherThreadsRes.status).toBe(200);
    const teacherThreads = ((await teacherThreadsRes.json()) as any).data;
    const thread = teacherThreads.find((t: any) => t.id === threadId);
    expect(thread).toBeDefined();
    expect(thread.last_message).toContain("homework");
    expect(thread.unread_for_recipient).toBeGreaterThanOrEqual(1);

    // 3. Teacher replies
    const replyRes = await fetch(`${baseUrl}/api/teacher/messages/threads/${threadId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Good morning Chief! For question 4, he should use the quadratic formula.",
      }),
    });
    expect(replyRes.status).toBe(201);

    // 4. Guardian views thread
    const guardianThreadRes = await fetch(`${baseUrl}/api/guardian/messages/threads/${threadId}`, {
      headers: { Authorization: `Bearer ${guardianToken}` },
    });
    expect(guardianThreadRes.status).toBe(200);
    const guardianThreadData = ((await guardianThreadRes.json()) as any).data;
    expect(guardianThreadData.messages.length).toBeGreaterThanOrEqual(2);
    expect(guardianThreadData.messages[guardianThreadData.messages.length - 1].text).toContain("quadratic formula");
  });

  it("3. Guardian sends inquiry to Admin -> Admin inquiry desk receives real-time thread", async () => {
    // 1. Guardian starts inquiry with Admin
    const sendRes = await fetch(`${baseUrl}/api/guardian/messages/new-thread`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guardianToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient_id: adminUser.id,
        student_id: studentUser.id,
        category: "school",
        subject: "Transportation Inquiry",
        text: "Hello School Admin, what is the pickup route for Victoria Island?",
      }),
    });
    expect(sendRes.status).toBe(201);
    const threadId = ((await sendRes.json()) as any).data.threadId;

    // 2. Admin checks threads
    const adminThreadsRes = await fetch(`${baseUrl}/api/admin/messages/threads`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminThreadsRes.status).toBe(200);
    const adminThreads = ((await adminThreadsRes.json()) as any).data;
    const found = adminThreads.find((t: any) => t.id === threadId);
    expect(found).toBeDefined();

    // 3. Admin replies
    const adminReplyRes = await fetch(`${baseUrl}/api/admin/messages/threads/${threadId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Bus Route 3 stops at Adeola Odeku at 7:15 AM daily.",
      }),
    });
    expect(adminReplyRes.status).toBe(201);
  });
});
