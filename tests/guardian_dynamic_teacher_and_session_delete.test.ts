import { describe, test, expect, beforeAll } from "bun:test";
import db from "../db";
import { generateToken, hashPassword } from "../auth";

describe("Guardian Dynamic Teacher Mapping, Admin Classification & Session Delete Cascade", () => {
  const baseUrl = "http://localhost:8001";
  let adminToken: string;
  let guardianToken: string;
  let teacher1Token: string;
  let teacher2Token: string;
  let adminId: number;
  let guardianId: number;
  let teacher1Id: number;
  let teacher2Id: number;
  let ward1Id: number;
  let ward2Id: number;
  let class1Id: number;
  let class2Id: number;

  beforeAll(async () => {
    // Clean up / seed test data
    const ts = Date.now();
    const adminEmail = `admin_test_${ts}@school.com`;
    const guardianEmail = `guardian_test_${ts}@mail.com`;
    const teacher1Email = `teacher1_${ts}@school.com`;
    const teacher2Email = `teacher2_${ts}@school.com`;
    const pwdHash = await hashPassword("pass123!");

    // 1. Create Admin (Daniel James)
    const aRes = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'operator', 1)")
      .run("Daniel James", adminEmail, pwdHash);
    adminId = Number(aRes.lastInsertRowid);

    // 2. Create Guardian
    const gRes = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'guardian', 1)")
      .run("Guardian Smith", guardianEmail, pwdHash);
    guardianId = Number(gRes.lastInsertRowid);

    // 3. Create Teacher 1 (JSS 1 Form Teacher) & Teacher 2 (SS 2 Form Teacher)
    const t1Res = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'teacher', 1)")
      .run("Mrs. Alice Johnson", teacher1Email, pwdHash);
    teacher1Id = Number(t1Res.lastInsertRowid);

    const t2Res = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'teacher', 1)")
      .run("Mr. Robert Vance", teacher2Email, pwdHash);
    teacher2Id = Number(t2Res.lastInsertRowid);

    // 4. Create Classes
    const c1Res = db.prepare("INSERT INTO classes (name, level, class_teacher_id) VALUES (?, 'junior', ?)").run(`JSS 1A_${ts}`, teacher1Id);
    class1Id = Number(c1Res.lastInsertRowid);

    const c2Res = db.prepare("INSERT INTO classes (name, level, class_teacher_id) VALUES (?, 'senior', ?)").run(`SS 2A_${ts}`, teacher2Id);
    class2Id = Number(c2Res.lastInsertRowid);

    // 5. Create Students (Ward 1 & Ward 2)
    const w1Res = db.prepare("INSERT INTO users (name, email, password_hash, role, grade, reg_id, is_active) VALUES (?, ?, ?, 'student', ?, ?, 1)")
      .run("Ward One", `ward1_${ts}@school.com`, pwdHash, `JSS 1A_${ts}`, `REG1_${ts}`);
    ward1Id = Number(w1Res.lastInsertRowid);

    const w2Res = db.prepare("INSERT INTO users (name, email, password_hash, role, grade, reg_id, is_active) VALUES (?, ?, ?, 'student', ?, ?, 1)")
      .run("Ward Two", `ward2_${ts}@school.com`, pwdHash, `SS 2A_${ts}`, `REG2_${ts}`);
    ward2Id = Number(w2Res.lastInsertRowid);

    // Link wards to classes via class_enrollments
    db.prepare("INSERT OR REPLACE INTO class_enrollments (student_id, class_id, term_id) VALUES (?, ?, 1)").run(ward1Id, class1Id);
    db.prepare("INSERT OR REPLACE INTO class_enrollments (student_id, class_id, term_id) VALUES (?, ?, 1)").run(ward2Id, class2Id);

    // Link wards to guardian
    db.prepare("INSERT OR REPLACE INTO guardian_student_links (guardian_id, student_id, status) VALUES (?, ?, 'approved')").run(guardianId, ward1Id);
    db.prepare("INSERT OR REPLACE INTO guardian_student_links (guardian_id, student_id, status) VALUES (?, ?, 'approved')").run(guardianId, ward2Id);

    // Generate auth tokens via auth helper
    adminToken = generateToken(adminId, "operator");
    guardianToken = generateToken(guardianId, "guardian");
    teacher1Token = generateToken(teacher1Id, "teacher");
    teacher2Token = generateToken(teacher2Id, "teacher");
  });

  test("1. Guardian App Contacts: Admin is classified under 'admin' (not mixed with teachers)", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/messages/contacts?ward_id=${ward1Id}`, {
      headers: { Authorization: `Bearer ${guardianToken}` },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    const contacts = json?.data || json;

    // Verify Daniel James is present with category 'admin' and role_label 'School Administration'
    const adminContact = contacts.find((c: any) => c.id === adminId || c.role === "operator");
    expect(adminContact).toBeDefined();
    expect(adminContact.category).toBe("admin");
    expect(adminContact.role).toBe("operator");
    expect(adminContact.role_label).toBe("School Administration");
  });

  test("2. Guardian App Dynamic Teacher Mapping: Ward 1 gets Teacher 1 (JSS 1), Ward 2 gets Teacher 2 (SS 2)", async () => {
    // Contacts for Ward 1
    const res1 = await fetch(`${baseUrl}/api/guardian/messages/contacts?ward_id=${ward1Id}`, {
      headers: { Authorization: `Bearer ${guardianToken}` },
    });
    expect(res1.status).toBe(200);
    const json1 = (await res1.json()) as any;
    const contacts1 = json1?.data || json1;
    const formTeacher1 = contacts1.find((c: any) => c.id === teacher1Id);
    expect(formTeacher1).toBeDefined();
    expect(formTeacher1.category).toBe("teacher");
    expect(formTeacher1.role_label).toContain("Form Teacher");

    // Contacts for Ward 2
    const res2 = await fetch(`${baseUrl}/api/guardian/messages/contacts?ward_id=${ward2Id}`, {
      headers: { Authorization: `Bearer ${guardianToken}` },
    });
    expect(res2.status).toBe(200);
    const json2 = (await res2.json()) as any;
    const contacts2 = json2?.data || json2;
    const formTeacher2 = contacts2.find((c: any) => c.id === teacher2Id);
    expect(formTeacher2).toBeDefined();
    expect(formTeacher2.category).toBe("teacher");
    expect(formTeacher2.role_label).toContain("Form Teacher");
  });

  test("3. Guardian sends inquiry to Ward 1 Form Teacher -> Teacher views in dashboard/messages", async () => {
    // Send inquiry to Teacher 1 regarding Ward 1
    const createRes = await fetch(`${baseUrl}/api/guardian/messages/new-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${guardianToken}` },
      body: JSON.stringify({
        recipient_id: teacher1Id,
        student_id: ward1Id,
        student_name: "Ward One",
        text: "How is Ward One performing in class this week?",
      }),
    });
    expect(createRes.status).toBe(201);
    const createData = (await createRes.json()) as any;
    const threadId = createData?.data?.threadId;
    expect(threadId).toBeDefined();

    // Teacher 1 fetches threads
    const tRes = await fetch(`${baseUrl}/api/teacher/messages/threads`, {
      headers: { Authorization: `Bearer ${teacher1Token}` },
    });
    expect(tRes.status).toBe(200);
    const tData = (await tRes.json()) as any;
    const threads = tData?.data || tData;
    const thread = threads.find((t: any) => t.id === threadId);
    expect(thread).toBeDefined();
    expect(thread.student_name).toBe("Ward One");
    expect(thread.last_message).toContain("performing in class");

    // Teacher 1 replies
    const replyRes = await fetch(`${baseUrl}/api/teacher/messages/threads/${threadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${teacher1Token}` },
      body: JSON.stringify({
        text: "Ward One is doing excellently, especially in mathematics!",
      }),
    });
    expect(replyRes.status).toBe(201);
  });

  test("4. Guardian sends message to School Admin -> Admin views under Admin Messages", async () => {
    const createRes = await fetch(`${baseUrl}/api/guardian/messages/new-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${guardianToken}` },
      body: JSON.stringify({
        recipient_id: adminId,
        student_id: ward1Id,
        student_name: "Ward One",
        text: "Hello Administration, inquiry on next term fees schedule.",
        category: "admin",
      }),
    });
    expect(createRes.status).toBe(201);
    const createData = (await createRes.json()) as any;
    const threadId = createData?.data?.threadId;

    // Admin fetches message threads
    const adminRes = await fetch(`${baseUrl}/api/admin/messages/threads`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminRes.status).toBe(200);
    const adminData = (await adminRes.json()) as any;
    const adminThreads = adminData?.data || adminData;
    const adminThread = adminThreads.find((t: any) => t.id === threadId);
    expect(adminThread).toBeDefined();
    expect(adminThread.category).toBe("admin");
  });

  test("5. Deleting Academic Session with full cascade FKs (fee payments, structures, attendance, scores) completes without Server Error", async () => {
    const ts = Date.now();
    const sessionName = `TestSession_${ts}`;

    // Create session & term
    const sRes = db.prepare("INSERT INTO academic_sessions (name, is_active, status) VALUES (?, 0, 'active')").run(sessionName);
    const testSessionId = Number(sRes.lastInsertRowid);
    const tRes = db.prepare("INSERT INTO academic_terms (session_id, name, is_active, status) VALUES (?, 'First Term', 0, 'active')").run(testSessionId);
    const testTermId = Number(tRes.lastInsertRowid);

    // Insert fee structure and fee payment (the main cause of FOREIGN KEY constraint failure previously)
    const feeRes = db.prepare("INSERT INTO fee_structures (class_id, session_id, term_id, title, amount) VALUES (?, ?, ?, ?, 50000)")
      .run(class1Id, testSessionId, testTermId, `Tuition_${ts}`);
    const testFeeId = Number(feeRes.lastInsertRowid);

    db.prepare("INSERT INTO fee_payments (student_id, fee_id, amount_paid, payment_ref, method, status, paid_by) VALUES (?, ?, 50000, ?, 'bank_transfer', 'completed', ?)")
      .run(ward1Id, testFeeId, `REF_${ts}`, guardianId);

    // Insert attendance record
    db.prepare("INSERT INTO attendance_records (student_id, session_id, term_id, status, date) VALUES (?, ?, ?, 'present', '2026-09-01')")
      .run(ward1Id, testSessionId, testTermId);

    // Insert grading subject, scheme, category, assessment and scores
    const gsRes = db.prepare("INSERT INTO grading_subjects (name, code, session_id, term_id, teacher_id) VALUES (?, ?, ?, ?, ?)")
      .run(`Test Subject_${ts}`, `TS_${ts}`, testSessionId, testTermId, teacher1Id);
    const testGsId = Number(gsRes.lastInsertRowid);

    const schemeRes = db.prepare("INSERT INTO grading_schemes (grading_subject_id, name, created_by) VALUES (?, 'Default Scheme', ?)")
      .run(testGsId, teacher1Id);
    const testSchemeId = Number(schemeRes.lastInsertRowid);

    const catRes = db.prepare("INSERT INTO grading_categories (grading_scheme_id, name, weight) VALUES (?, 'Exam', 100)")
      .run(testSchemeId);
    const testCatId = Number(catRes.lastInsertRowid);

    const assessRes = db.prepare("INSERT INTO grading_assessments (grading_category_id, grading_scheme_id, name, type) VALUES (?, ?, 'Exam 1', 'examination')")
      .run(testCatId, testSchemeId);
    const testAssessId = Number(assessRes.lastInsertRowid);

    db.prepare("INSERT INTO grading_student_scores (grading_assessment_id, grading_scheme_id, student_id, score, entered_by) VALUES (?, ?, ?, 85, ?)")
      .run(testAssessId, testSchemeId, ward1Id, teacher1Id);

    // Call DELETE /api/academic/sessions/:id
    const deleteRes = await fetch(`${baseUrl}/api/academic/sessions/${testSessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(deleteRes.status).toBe(200);
    const deleteData = (await deleteRes.json()) as any;
    expect(deleteData?.data?.success ?? deleteData?.success).toBe(true);

    // Verify session is completely removed
    const remaining = db.prepare("SELECT id FROM academic_sessions WHERE id = ?").get(testSessionId);
    expect(remaining).toBeNull();
  });
});
