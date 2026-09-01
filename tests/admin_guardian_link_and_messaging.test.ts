import { describe, it, expect, beforeAll } from "bun:test";
import db from "../db";
import { generateToken, hashPassword } from "../auth";

describe("Admin Guardian Linking & Admin-Guardian Messaging API Tests", () => {
  let adminToken: string;
  let guardianToken: string;
  let adminUser: any;
  let guardianUser: any;
  let studentUser: any;
  const baseUrl = "http://localhost:8001";

  beforeAll(async () => {
    // 1. Ensure operator/admin exists
    adminUser = db.prepare("SELECT * FROM users WHERE role = 'operator' LIMIT 1").get() as any;
    if (!adminUser) {
      const hash = await hashPassword("adminPass123!");
      const res = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES ('System Admin', 'admin@exampool.ng', 'operator', ?, 1)").run(hash);
      adminUser = { id: Number(res.lastInsertRowid), name: "System Admin", email: "admin@exampool.ng", role: "operator" };
    }
    adminToken = generateToken(adminUser.id, "operator");

    // 2. Ensure guardian exists
    guardianUser = db.prepare("SELECT * FROM users WHERE email = 'guardian@exampool.ng'").get() as any;
    if (!guardianUser) {
      const hash = await hashPassword("guardianPassword123!");
      const res = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active, phone) VALUES ('Chief John Doe (Guardian)', 'guardian@exampool.ng', 'guardian', ?, 1, '+234 809 999 8888')").run(hash);
      guardianUser = { id: Number(res.lastInsertRowid), name: "Chief John Doe (Guardian)", email: "guardian@exampool.ng", role: "guardian" };
    }
    guardianToken = generateToken(guardianUser.id, "guardian");

    // 3. Ensure student exists with reg_id
    studentUser = db.prepare("SELECT * FROM users WHERE role = 'student' AND reg_id = 'REG-2026-0001'").get() as any;
    if (!studentUser) {
      const hash = await hashPassword("studentPass123!");
      const res = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active, grade, reg_id) VALUES ('Daniel Adeleke', 'student1@exampool.ng', 'student', ?, 1, 'JSS 3', 'REG-2026-0001')").run(hash);
      studentUser = { id: Number(res.lastInsertRowid), name: "Daniel Adeleke", email: "student1@exampool.ng", role: "student", reg_id: "REG-2026-0001" };
    }
  });

  it("1. GET /api/admin/guardian-links/lookup-student searches students by reg_id", async () => {
    const res = await fetch(`${baseUrl}/api/admin/guardian-links/lookup-student?q=REG-2026`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    const data = json.data ?? json;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].reg_id).toContain("REG-2026");
  });

  it("2. POST /api/admin/guardian-links allows admin to link student by reg_id with auto-approval", async () => {
    const res = await fetch(`${baseUrl}/api/admin/guardian-links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guardian_id: guardianUser.id,
        reg_id: studentUser.reg_id,
        relationship: "Father",
      }),
    });
    expect(res.status).toBe(201);
    const json: any = await res.json();
    const data = json.data ?? json;
    expect(data.status).toBe("approved");
    expect(data.id).toBeDefined();

    // Verify guardian now sees ward in approved list
    const wardsRes = await fetch(`${baseUrl}/api/guardian/wards`, {
      headers: { Authorization: `Bearer ${guardianToken}` },
    });
    expect(wardsRes.status).toBe(200);
    const wardsJson: any = await wardsRes.json();
    const wardsData = wardsJson.data ?? wardsJson;
    expect(wardsData.wards.some((w: any) => w.student_id === studentUser.id || w.id === studentUser.id)).toBe(true);
  });

  it("3. GET /api/admin/guardian-links returns all links for admin review", async () => {
    const res = await fetch(`${baseUrl}/api/admin/guardian-links`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    const data = json.data ?? json;
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((l: any) => l.guardian_id === guardianUser.id && l.student_id === studentUser.id)).toBe(true);
  });

  it("4. Guardian starts message thread with Admin, Admin replies via /api/admin/messages/threads/:id", async () => {
    // 1. Guardian sends message to Admin
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
        subject: "Billing Inquiry",
        text: "Hello School Admin, I have a question regarding the second term lab levy.",
      }),
    });
    expect(sendRes.status).toBe(201);
    const sendJson: any = await sendRes.json();
    const threadData = sendJson.data ?? sendJson;
    const threadId = threadData.threadId;
    expect(threadId).toBeDefined();

    // 2. Admin retrieves inquiry threads
    const adminThreadsRes = await fetch(`${baseUrl}/api/admin/messages/threads`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminThreadsRes.status).toBe(200);
    const adminThreadsJson: any = await adminThreadsRes.json();
    const adminThreads = adminThreadsJson.data ?? adminThreadsJson;
    expect(Array.isArray(adminThreads)).toBe(true);
    const foundThread = adminThreads.find((t: any) => t.id === threadId);
    expect(foundThread).toBeDefined();
    expect(foundThread.guardian_name).toBeDefined();

    // 3. Admin views specific thread messages
    const threadDetailRes = await fetch(`${baseUrl}/api/admin/messages/threads/${threadId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(threadDetailRes.status).toBe(200);
    const detailJson: any = await threadDetailRes.json();
    const detailData = detailJson.data ?? detailJson;
    expect(detailData.messages.length).toBeGreaterThan(0);
    expect(detailData.messages.some((m: any) => m.text.includes("second term lab levy"))).toBe(true);

    // 4. Admin replies to guardian
    const replyRes = await fetch(`${baseUrl}/api/admin/messages/threads/${threadId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Dear Chief John Doe, the lab fee covers full computer access and semester supplies.",
      }),
    });
    expect(replyRes.status).toBe(201);
    const replyJson: any = await replyRes.json();
    const replyData = replyJson.data ?? replyJson;
    expect(replyData.sender_role).toBe("operator");

    // 5. Guardian fetches updated thread
    const guardianThreadRes = await fetch(`${baseUrl}/api/guardian/messages/threads/${threadId}`, {
      headers: { Authorization: `Bearer ${guardianToken}` },
    });
    expect(guardianThreadRes.status).toBe(200);
    const guardianThreadJson: any = await guardianThreadRes.json();
    const guardianThreadData = guardianThreadJson.data ?? guardianThreadJson;
    expect(guardianThreadData.messages.length).toBeGreaterThanOrEqual(2);
    expect(guardianThreadData.messages.some((m: any) => m.text.includes("covers full computer access"))).toBe(true);
  });
});
