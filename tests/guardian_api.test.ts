import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import db, { queries } from "../db";
import { generateToken, hashPassword } from "../auth";
import { bootstrapOperator } from "./helpers";

describe("Guardian Portal & Hybrid Messaging API Tests", () => {
  let guardianUser: any;
  let teacherUser: any;
  let studentUser: any;
  let jss3Class: any;
  let guardianToken: string;
  let teacherToken: string;

  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:8001";

  beforeAll(async () => {
    await bootstrapOperator("op_guardian_api@acqad.test", "Operator@123");
    const pwdHash = await hashPassword("Password@123");

    db.prepare("INSERT OR IGNORE INTO users (name, email, role, password_hash, is_active) VALUES ('Test Guardian', 'guardian_api@acqad.test', 'guardian', ?, 1)").run(pwdHash);
    db.prepare("INSERT OR IGNORE INTO users (name, email, role, password_hash, is_active) VALUES ('Test Teacher', 'teacher_api@acqad.test', 'teacher', ?, 1)").run(pwdHash);
    db.prepare("INSERT OR IGNORE INTO users (name, email, role, password_hash, is_active, grade, reg_id) VALUES ('Default Student', 'student_api@acqad.test', 'student', ?, 1, 'JSS 3', 'REG-G-001')").run(pwdHash);

    guardianUser = db.prepare("SELECT * FROM users WHERE email = 'guardian_api@acqad.test'").get() as any;
    teacherUser = db.prepare("SELECT * FROM users WHERE email = 'teacher_api@acqad.test'").get() as any;
    studentUser = db.prepare("SELECT * FROM users WHERE email = 'student_api@acqad.test'").get() as any;

    // Reset any previous class teacher assignments for teacher
    db.prepare("UPDATE classes SET class_teacher_id = NULL WHERE class_teacher_id = ?").run(teacherUser.id);

    let cls = db.prepare("SELECT * FROM classes WHERE name = 'JSS 3' LIMIT 1").get() as any;
    if (!cls) {
      db.prepare("INSERT INTO classes (name, level, class_teacher_id) VALUES ('JSS 3', 'junior', ?)").run(teacherUser.id);
      cls = db.prepare("SELECT * FROM classes WHERE name = 'JSS 3' LIMIT 1").get() as any;
    } else {
      db.prepare("UPDATE classes SET class_teacher_id = ? WHERE id = ?").run(teacherUser.id, cls.id);
    }
    jss3Class = cls;

    // 3. Ensure active session & term
    let session = queries.getActiveAcademicSession.get() as any;
    if (!session) {
      db.prepare("INSERT INTO academic_sessions (name, is_active) VALUES ('2026/2027', 1)").run();
      session = queries.getActiveAcademicSession.get() as any;
    }
    let term = queries.getActiveAcademicTerm.get() as any;
    if (!term) {
      db.prepare("INSERT INTO academic_terms (session_id, name, start_date, end_date, is_active) VALUES (?, 'First Term', '2026-01-01', '2026-04-30', 1)").run(session.id);
      term = queries.getActiveAcademicTerm.get() as any;
    }

    const sessionId = session.id;
    const termId = term.id;
    db.prepare("INSERT OR IGNORE INTO terms (id, session, name, start_date, end_date, is_active, registration_open) VALUES (?, ?, ?, '2026-01-01', '2026-12-31', 1, 1)").run(termId, session.name, term.name);

    // 1. Assign student and teacher to JSS 3 and enroll
    db.prepare("UPDATE users SET grade = 'JSS 3' WHERE id = ?").run(studentUser.id);
    db.prepare("UPDATE users SET grade = 'JSS 3' WHERE id = ?").run(teacherUser.id);
    db.prepare("DELETE FROM class_enrollments WHERE student_id = ?").run(studentUser.id);
    db.prepare("INSERT INTO class_enrollments (class_id, student_id, term_id) VALUES (?, ?, ?)").run(jss3Class.id, studentUser.id, termId);

    // 2. Link guardian to student
    db.prepare("INSERT OR IGNORE INTO guardian_student_links (guardian_id, student_id, relationship, status) VALUES (?, ?, 'Parent', 'approved')").run(guardianUser.id, studentUser.id);
    db.prepare("UPDATE guardian_student_links SET status = 'approved' WHERE guardian_id = ? AND student_id = ?").run(guardianUser.id, studentUser.id);

    // 4. Seed 4 grading subjects & term results + 1 CBT timetable event
    let cbtSub = db.prepare("SELECT id FROM subjects WHERE code = 'MTH_J3_CBT'").get() as any;
    if (!cbtSub) {
      const r = db.prepare("INSERT INTO subjects (name, code, term, duration, exam_datetime, teacher_id, created_by, is_published, class, session_id, term_id) VALUES ('Mathematics', 'MTH_J3_CBT', ?, 60, '2026-12-01T09:00:00Z', ?, ?, 1, 'JSS 3', ?, ?)").run(term.name, teacherUser.id, teacherUser.id, sessionId, termId);
      cbtSub = { id: Number(r.lastInsertRowid) };
    }
    db.prepare("DELETE FROM timetables WHERE subject_id = ?").run(cbtSub.id);
    db.prepare("INSERT INTO timetables (subject_id, class, exam_date, start_time, end_time, duration, exam_mode, allow_students, session_id, term_id) VALUES (?, 'JSS 3', '2026-12-01', '09:00', '10:00', 60, 'CBT', 1, ?, ?)").run(cbtSub.id, sessionId, termId);

    const subjects = [
      { name: "Mathematics", code: "MTH_J3" },
      { name: "English Language", code: "ENG_J3" },
      { name: "Basic Science", code: "SCI_J3" },
      { name: "Social Studies", code: "SOS_J3" },
    ];

    for (const sub of subjects) {
      let gs = db.prepare("SELECT * FROM grading_subjects WHERE code = ? AND class_id = ? AND term_id = ?").get(sub.code, jss3Class.id, termId) as any;
      if (!gs) {
        const gsRes = queries.createGradingSubject.run(sub.name, sub.code, jss3Class.id, termId, sessionId, teacherUser.id) as any;
        gs = { id: Number(gsRes.lastInsertRowid) };
      }
      queries.upsertTermResult.run(studentUser.id, gs.id, 30.00, 55.00, 85.00, "A", "Outstanding", 1, termId, sessionId);
    }

    // 5. Seed fee structures & payments
    db.prepare("DELETE FROM fee_payments WHERE student_id = ?").run(studentUser.id);
    db.prepare("DELETE FROM fee_structures WHERE class_id = ?").run(jss3Class.id);
    db.prepare("INSERT INTO fee_structures (class_id, term_id, session_id, title, amount) VALUES (?, ?, ?, 'Tuition Fee', 100000)").run(jss3Class.id, termId, sessionId);
    db.prepare("INSERT INTO fee_structures (class_id, term_id, session_id, title, amount) VALUES (?, ?, ?, 'Lab & Exam Fee', 30000)").run(jss3Class.id, termId, sessionId);
    db.prepare("INSERT INTO fee_structures (class_id, term_id, session_id, title, amount) VALUES (?, ?, ?, 'Development Levy', 20000)").run(jss3Class.id, termId, sessionId);

    const feeRows = db.prepare("SELECT id FROM fee_structures WHERE class_id = ? ORDER BY id ASC LIMIT 2").all(jss3Class.id) as any[];
    if (feeRows.length >= 2) {
      queries.createFeePayment.run(studentUser.id, feeRows[0].id, 100000, "REF-001", "bank_transfer", "completed", guardianUser.id);
      queries.createFeePayment.run(studentUser.id, feeRows[1].id, 30000, "REF-002", "card", "completed", guardianUser.id);
    }

    // 5b. Seed attendance records
    db.prepare("DELETE FROM attendance_records WHERE student_id = ?").run(studentUser.id);
    const today = new Date().toISOString().split("T")[0];
    db.prepare("INSERT INTO attendance_records (student_id, term_id, session_id, date, status, marked_by) VALUES (?, ?, ?, ?, 'present', ?)").run(studentUser.id, termId, sessionId, today, teacherUser.id);

    // 6. Seed message thread between guardian and teacher
    db.prepare("DELETE FROM guardian_message_threads WHERE guardian_id = ?").run(guardianUser.id);
    db.prepare("INSERT INTO guardian_message_threads (guardian_id, recipient_id, student_id, category, subject, last_message, unread_for_guardian, unread_for_recipient) VALUES (?, ?, ?, 'teacher', 'Term Inquiry', 'Hello Teacher', 0, 1)").run(guardianUser.id, teacherUser.id, studentUser.id);

    guardianToken = generateToken(guardianUser.id, "guardian");
    teacherToken = generateToken(teacherUser.id, "teacher");
  });

  test("1. GET /api/guardian/wards returns rich ward data", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/wards`, {
      headers: { Cookie: `__exampool_session=${guardianToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.wards).toBeDefined();
    expect(json.data.wards.length).toBeGreaterThan(0);
    
    const ward = json.data.wards[0];
    expect(ward.name).toBe("Default Student");
    expect(ward.grade).toBe("JSS 3");
    expect(ward.average_score).toBeGreaterThan(0);
    expect(ward.attendance).toBeDefined();
    expect(ward.attendance.percentage).toBeGreaterThan(0);
    expect(ward.fees).toBeDefined();
    expect(ward.fees.items.length).toBeGreaterThan(0);
    expect(ward.upcoming_events.length).toBeGreaterThan(0);
  });

  test("2. GET /api/guardian/wards/:id/performance returns breakdown", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/wards/${studentUser.id}/performance`, {
      headers: { Cookie: `__exampool_session=${guardianToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.subjects_performance.length).toBe(4);
    expect(json.data.subjects_performance[0].grade).toBeDefined();
  });

  test("3. GET /api/guardian/wards/:id/attendance returns monthly calendar dots", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/wards/${studentUser.id}/attendance`, {
      headers: { Cookie: `__exampool_session=${guardianToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.summary.present_days).toBeGreaterThan(0);
    expect(json.data.calendar.length).toBeGreaterThan(0);
  });

  test("4. GET /api/guardian/wards/:id/fees returns itemized ledger", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/wards/${studentUser.id}/fees`, {
      headers: { Cookie: `__exampool_session=${guardianToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.structures.length).toBe(3);
    expect(json.data.payments.length).toBe(2);
  });

  test("5. GET /api/guardian/messages/contacts discovers Form Teacher and Subject Teachers", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/messages/contacts?ward_id=${studentUser.id}`, {
      headers: { Cookie: `__exampool_session=${guardianToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.length).toBeGreaterThan(0);
    const formTeacher = json.data.find((c: any) => c.role_label.includes("Form Teacher"));
    expect(formTeacher).toBeDefined();
  });

  test("6. Guardian sends message to Teacher & Teacher replies", async () => {
    // 1. Guardian fetches threads
    const threadsRes = await fetch(`${baseUrl}/api/guardian/messages/threads`, {
      headers: { Cookie: `__exampool_session=${guardianToken}` },
    });
    expect(threadsRes.status).toBe(200);
    const threadsJson = await threadsRes.json() as any;
    expect(threadsJson.data.length).toBeGreaterThan(0);
    const threadId = threadsJson.data[0].id;

    // 2. Guardian posts a message
    const sendRes = await fetch(`${baseUrl}/api/guardian/messages/threads/${threadId}`, {
      method: "POST",
      headers: {
        Cookie: `__exampool_session=${guardianToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: "Hello Mr. Adeleke, testing real-time chat from Guardian!" }),
    });
    expect(sendRes.status).toBe(201);

    // 3. Teacher reads the thread
    const teacherReadRes = await fetch(`${baseUrl}/api/teacher/messages/threads/${threadId}`, {
      headers: { Cookie: `__exampool_session=${teacherToken}` },
    });
    expect(teacherReadRes.status).toBe(200);
    const threadDetails = await teacherReadRes.json() as any;
    const lastMsg = threadDetails.data.messages[threadDetails.data.messages.length - 1];
    expect(lastMsg.text).toBe("Hello Mr. Adeleke, testing real-time chat from Guardian!");

    // 4. Teacher replies
    const replyRes = await fetch(`${baseUrl}/api/teacher/messages/threads/${threadId}`, {
      method: "POST",
      headers: {
        Cookie: `__exampool_session=${teacherToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: "Received loud and clear, Chief Doe! Real-time messaging is online." }),
    });
    expect(replyRes.status).toBe(201);
  });

  afterAll(() => {
    try {
      db.run("PRAGMA foreign_keys = OFF");
      db.prepare("DELETE FROM guardian_messages WHERE thread_id IN (SELECT id FROM guardian_message_threads WHERE guardian_id = ?)").run(guardianUser?.id || 0);
      db.prepare("DELETE FROM guardian_message_threads WHERE guardian_id = ?").run(guardianUser?.id || 0);
      db.prepare("DELETE FROM fee_payments WHERE student_id = ?").run(studentUser?.id || 0);
      db.prepare("DELETE FROM fee_structures WHERE class_id = ? AND title IN ('Tuition Fee','Lab & Exam Fee','Development Levy')").run(jss3Class?.id || 0);
      db.prepare("DELETE FROM attendance_records WHERE student_id = ?").run(studentUser?.id || 0);
      db.prepare("DELETE FROM term_results WHERE student_id = ?").run(studentUser?.id || 0);
      db.prepare("DELETE FROM grading_subjects WHERE code IN ('MTH_J3','ENG_J3','SCI_J3','SOS_J3')").run();
      db.prepare("DELETE FROM timetables WHERE subject_id IN (SELECT id FROM subjects WHERE code = 'MTH_J3_CBT')").run();
      db.prepare("DELETE FROM subjects WHERE code = 'MTH_J3_CBT'").run();
      db.prepare("DELETE FROM guardian_student_links WHERE guardian_id = ?").run(guardianUser?.id || 0);
      db.prepare("DELETE FROM class_enrollments WHERE student_id = ?").run(studentUser?.id || 0);
      db.prepare("UPDATE classes SET class_teacher_id = NULL WHERE class_teacher_id = ?").run(teacherUser?.id || 0);
      db.prepare("DELETE FROM users WHERE email IN ('guardian_api@acqad.test','teacher_api@acqad.test','student_api@acqad.test','op_guardian_api@acqad.test')").run();
      db.run("PRAGMA foreign_keys = ON");
    } catch {}
  });
});
