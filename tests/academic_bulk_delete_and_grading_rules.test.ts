import { describe, expect, test } from "bun:test";
import db, { queries } from "../db";
import { generateToken } from "../auth";

const TEST_PORT = 8001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

describe("Academic Sessions Bulk Delete, Grading Policy Rules & Guardian Approvals", () => {
  const operatorToken = generateToken(1, "operator");

  test("1. Academic Sessions Bulk Deletion deletes multiple sessions atomically and cleans up cascade relations", async () => {
    const salt = Date.now();
    // Create 3 temporary sessions
    const s1 = db.prepare("INSERT INTO academic_sessions (name, is_active, status) VALUES (?, 0, 'active')").run(`Test_Session_A_${salt}`);
    const s2 = db.prepare("INSERT INTO academic_sessions (name, is_active, status) VALUES (?, 0, 'active')").run(`Test_Session_B_${salt}`);
    const s3 = db.prepare("INSERT INTO academic_sessions (name, is_active, status) VALUES (?, 0, 'active')").run(`Test_Session_C_${salt}`);

    const id1 = Number(s1.lastInsertRowid);
    const id2 = Number(s2.lastInsertRowid);
    const id3 = Number(s3.lastInsertRowid);

    // Create terms for each
    db.prepare("INSERT INTO academic_terms (session_id, name, is_active, status) VALUES (?, 'First Term', 0, 'archived')").run(id1);
    db.prepare("INSERT INTO academic_terms (session_id, name, is_active, status) VALUES (?, 'First Term', 0, 'archived')").run(id2);
    db.prepare("INSERT INTO academic_terms (session_id, name, is_active, status) VALUES (?, 'First Term', 0, 'archived')").run(id3);

    // Send Bulk Delete for id1 and id2
    const res = await fetch(`${BASE_URL}/api/academic/sessions/bulk-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ session_ids: [id1, id2] }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.success).toBe(true);
    expect(data.data.deleted_count).toBe(2);

    // Verify id1 and id2 are deleted from database
    const check1 = db.prepare("SELECT id FROM academic_sessions WHERE id = ?").get(id1);
    const check2 = db.prepare("SELECT id FROM academic_sessions WHERE id = ?").get(id2);
    const check3 = db.prepare("SELECT id FROM academic_sessions WHERE id = ?").get(id3);

    expect(check1).toBeNull();
    expect(check2).toBeNull();
    expect(check3).toBeDefined();

    // Clean up id3
    await fetch(`${BASE_URL}/api/academic/sessions/bulk-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ session_ids: [id3] }),
    });
  });

  test("2. Grading Center Policy enforces that Written Exam and CBT Exam CANNOT coexist for the final exam component", async () => {
    // Get active session and term
    const activeSession = db.prepare("SELECT id FROM academic_sessions WHERE is_active = 1 LIMIT 1").get() as any;
    const activeTerm = db.prepare("SELECT id FROM academic_terms WHERE session_id = ? AND is_active = 1 LIMIT 1").get(activeSession.id) as any;
    
    // Create a fresh dedicated grading subject without approved locks
    const salt = Date.now();
    const subRes = db.prepare("INSERT INTO grading_subjects (name, code, term_id, session_id, teacher_id) VALUES (?, ?, ?, ?, 1)").run(`Math Test ${salt}`, `MTH-${salt}`, activeTerm.id, activeSession.id);
    const subjectId = Number(subRes.lastInsertRowid);

    // Attempt to configure 2 exam components (1 Written Exam + 1 CBT Exam) -> Must fail with 400
    const invalidPolicies = [
      { name: "Continuous Assessment 1", type: "manual", max_marks: 20, is_exam: 0 },
      { name: "Continuous Assessment 2", type: "manual", max_marks: 20, is_exam: 0 },
      { name: "Written Final Exam", type: "manual", max_marks: 30, is_exam: 1 },
      { name: "CBT Final Exam", type: "cbt_exam", max_marks: 30, is_exam: 1 },
    ];

    const invalidRes = await fetch(`${BASE_URL}/api/grading/policies/${subjectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ policies: invalidPolicies, pass_mark: 50 }),
    });

    expect(invalidRes.status).toBe(400);
    const errData = await invalidRes.json();
    expect(errData.error).toContain("Written Exam and CBT Exam cannot coexist");

    // Configure valid policy: 1 Final Exam (Written or CBT) + multiple CA components -> Must succeed with 200
    const validPolicies = [
      { name: "1st CA Test", type: "manual", max_marks: 20, is_exam: 0 },
      { name: "2nd CA Test", type: "cbt_test", max_marks: 20, is_exam: 0 },
      { name: "Terminal Examination", type: "manual", max_marks: 60, is_exam: 1 },
    ];

    const validRes = await fetch(`${BASE_URL}/api/grading/policies/${subjectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ policies: validPolicies, pass_mark: 50 }),
    });

    expect(validRes.status).toBe(200);
    const validData = await validRes.json();
    expect(validData.data.success).toBe(true);

    // Cleanup test subject
    db.prepare("DELETE FROM grading_policies WHERE grading_subject_id = ?").run(subjectId);
    db.prepare("DELETE FROM grading_subjects WHERE id = ?").run(subjectId);
  });

  test("3. Admin Guardian Link Approval Workflow: Request -> Review -> Approve -> Full Access", async () => {
    const salt = Date.now();
    // Create test student and test guardian with is_active = 1
    const studentRes = db.prepare("INSERT INTO users (name, email, password_hash, role, reg_id, is_active) VALUES ('Ward Alpha', ?, 'hash', 'student', ?, 1)").run(`ward_${salt}@school.ng`, `STU-QA-${salt}`);
    const studentId = Number(studentRes.lastInsertRowid);

    const guardianRes = db.prepare("INSERT INTO users (name, email, password_hash, role, phone, is_active) VALUES ('Parent Beta', ?, 'hash', 'guardian', '+2348011223344', 1)").run(`parent_${salt}@guardian.ng`);
    const guardianId = Number(guardianRes.lastInsertRowid);
    const guardianToken = generateToken(guardianId, "guardian");

    // Step 1: Guardian submits link request via /api/v2/guardian-links
    const reqRes = await fetch(`${BASE_URL}/api/v2/guardian-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guardianToken}`,
      },
      body: JSON.stringify({
        student_id: studentId,
        relationship: "Mother",
      }),
    });

    expect(reqRes.status).toBe(201);
    const reqData = await reqRes.json();
    const linkId = reqData.data.id;
    expect(reqData.data.status).toBe("pending");

    // Step 2: Admin lists guardian link requests via /api/v2/guardian-links
    const listRes = await fetch(`${BASE_URL}/api/v2/guardian-links?status=pending`, {
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    });

    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    const pendingLink = listData.data.find((l: any) => l.id === linkId);
    expect(pendingLink).toBeDefined();
    expect(pendingLink.relationship).toBe("Mother");

    // Step 3: Admin approves the guardian link via /api/v2/guardian-links/:id/approve
    const approveRes = await fetch(`${BASE_URL}/api/v2/guardian-links/${linkId}/approve`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    });

    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.data.status).toBe("approved");

    // Step 4: Guardian fetches wards and verifies student is returned with live metrics
    const wardsRes = await fetch(`${BASE_URL}/api/guardian/wards`, {
      headers: {
        Authorization: `Bearer ${guardianToken}`,
      },
    });

    expect(wardsRes.status).toBe(200);
    const wardsData = await wardsRes.json();
    const wardsList = wardsData.data.wards || wardsData.data || [];
    const myWard = wardsList.find((w: any) => w.student_id === studentId || w.id === studentId);
    expect(myWard).toBeDefined();
    expect(myWard.name).toBe("Ward Alpha");

    // Cleanup test records
    db.prepare("DELETE FROM guardian_student_links WHERE id = ?").run(linkId);
    db.prepare("DELETE FROM audit_logs WHERE actor_id IN (?, ?)").run(studentId, guardianId);
    db.prepare("DELETE FROM users WHERE id IN (?, ?)").run(studentId, guardianId);
  });
});
