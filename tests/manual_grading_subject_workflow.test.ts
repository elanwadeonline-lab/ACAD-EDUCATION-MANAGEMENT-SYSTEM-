import { describe, it, expect, beforeAll } from "bun:test";
import db, { queries } from "../db";
import { generateToken } from "../auth";

const BASE_URL = `http://localhost:${process.env.PORT || 8001}`;

describe("Manual Grading Subject Workflow (Non-CBT & Paper Exams)", () => {
  let teacherToken: string;
  let teacherId: number;
  let studentId: number;
  let testClassId: number;
  let testSessionId: number;
  let testTermId: number;

  beforeAll(() => {
    const salt = Date.now();

    // 1. Ensure Active Academic Session & Term
    let session = queries.getActiveAcademicSession.get() as any;
    if (!session) {
      const sRes = db.prepare("INSERT INTO academic_sessions (name, is_active, status) VALUES ('2026/2027 Test Session', 1, 'active')").run();
      session = { id: Number(sRes.lastInsertRowid), name: "2026/2027 Test Session" };
    }
    testSessionId = session.id;

    let term = queries.getActiveAcademicTerm.get() as any;
    if (!term) {
      const tRes = db.prepare("INSERT INTO academic_terms (session_id, name, is_active, status) VALUES (?, 'First Term', 1, 'active')").run(testSessionId);
      term = { id: Number(tRes.lastInsertRowid), name: "First Term" };
    }
    testTermId = term.id;

    // 2. Create Class / Cohort
    const classRes = db.prepare("INSERT INTO classes (name, section) VALUES (?, 'A')").run(`JSS 2-${salt}`);
    testClassId = Number(classRes.lastInsertRowid);

    // 3. Create Teacher User
    const teacherRes = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('Mr. Samuel Johnson', ?, 'hash', 'teacher', 1)").run(`teacher_${salt}@school.ng`);
    teacherId = Number(teacherRes.lastInsertRowid);
    teacherToken = generateToken(teacherId, "teacher");

    // 4. Create Student User and enroll in class
    const studentRes = db.prepare("INSERT INTO users (name, email, password_hash, role, reg_id, is_active) VALUES ('Amina Bello', ?, 'hash', 'student', ?, 1)").run(`student_${salt}@school.ng`, `STU-${salt}`);
    studentId = Number(studentRes.lastInsertRowid);
    db.prepare("INSERT INTO class_enrollments (student_id, class_id, term_id) VALUES (?, ?, ?)").run(studentId, testClassId, testTermId);
  });

  it("1. Teacher can directly create a manual subject gradebook without any CBT exam", async () => {
    const subjectCode = `CIV-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/grading/subjects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        name: "Civic & Moral Education",
        code: subjectCode,
        class_id: testClassId,
        term_id: testTermId,
        session_id: testSessionId,
        mode: "exam",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data?.id).toBeDefined();

    const subjectId = body.data.id;

    // Verify grading subject in DB
    const gs = db.prepare("SELECT * FROM grading_subjects WHERE id = ?").get(subjectId) as any;
    expect(gs).toBeDefined();
    expect(gs.name).toBe("Civic & Moral Education");
    expect(gs.teacher_id).toBe(teacherId);

    // Verify default policies created (Written Exam 60 max, CA 40 max)
    const policies = db.prepare("SELECT * FROM grading_policies WHERE grading_subject_id = ?").all(subjectId) as any[];
    expect(policies.length).toBeGreaterThanOrEqual(2);
    const examPolicy = policies.find(p => p.is_exam === 1);
    expect(examPolicy).toBeDefined();
    expect(examPolicy.type).toBe("manual");
    expect(examPolicy.max_marks).toBe(60);

    // Verify student roster discovery returns the enrolled student
    const students = queries.getGradingStudentsBySubject.all(subjectId) as any[];
    expect(students.some(s => s.id === studentId)).toBe(true);

    // Enter manual scores
    const caPolicy = policies.find(p => p.is_exam === 0);
    expect(caPolicy).toBeDefined();

    const scoresPayload = [
      { student_id: studentId, grading_policy_id: examPolicy.id, score: 52 },
      { student_id: studentId, grading_policy_id: caPolicy.id, score: 34 },
    ];

    for (const entry of scoresPayload) {
      queries.upsertManualScore.run(Number(entry.grading_policy_id), Number(entry.student_id), Number(entry.score), teacherId);
    }

    // Save and recompute term results
    const totalScore = 52 + 34; // 86
    queries.upsertTermResult.run(
      studentId, subjectId,
      34, 52, totalScore,
      "A", "Excellent",
      1, // approved
      testTermId, testSessionId
    );

    // Approve the Gradebook
    queries.approveTermResults.run(subjectId);

    // Verify calculated Term Results
    const termResult = db.prepare("SELECT * FROM term_results WHERE grading_subject_id = ? AND student_id = ?").get(subjectId, studentId) as any;
    expect(termResult).toBeDefined();
    expect(termResult.exam_score).toBe(52);
    expect(termResult.ca_score).toBe(34);
    expect(termResult.total_score).toBe(86);
    expect(termResult.grade).toBe("A");
    expect(termResult.is_approved).toBe(1);
  });
});
