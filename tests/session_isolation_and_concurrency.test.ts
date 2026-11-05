import { describe, test, expect, beforeAll } from "bun:test";
import db, { queries } from "../db";
import { BASE_URL } from "./helpers";

const BASE = BASE_URL;
const TS = Date.now();

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
}

describe("Part D, E, F1 & G: Multi-Role Session Isolation, OWASP Session Management & CBT Concurrency", () => {
  let operatorCreds = { email: `op_iso_${TS}@school.edu`, password: "Password123!" };
  let teacherCreds = { email: `tch_iso_${TS}@school.edu`, password: "Password123!" };
  let student1Creds = { email: `stu1_iso_${TS}@school.edu`, password: "Password123!" };
  let student2Creds = { email: `stu2_iso_${TS}@school.edu`, password: "Password123!" };
  let guardianCreds = { email: `grd_iso_${TS}@school.edu`, password: "Password123!" };

  let operatorSession: { token: string; jti: string; user: any; cookies: string };
  let teacherSession: { token: string; jti: string; user: any; cookies: string };
  let student1SessionA: { token: string; jti: string; user: any; cookies: string };
  let student1SessionB: { token: string; jti: string; user: any; cookies: string };
  let student2Session: { token: string; jti: string; user: any; cookies: string };
  let guardianSession: { token: string; jti: string; user: any; cookies: string };

  let subjectId: number;
  let q1Id: number;
  let q2Id: number;

  beforeAll(async () => {
    const hash = await Bun.password.hash("Password123!", { algorithm: "bcrypt", cost: 4 });

    // Ensure an active academic session & term exist
    let activeSession = queries.getActiveAcademicSession.get() as any;
    if (!activeSession) {
      const sRes = queries.createAcademicSession.run(`2026/2027_${TS}`, 1, "active") as any;
      activeSession = { id: Number(sRes.lastInsertRowid), name: `2026/2027_${TS}` };
    }
    let activeTerm = queries.getActiveAcademicTerm.get() as any;
    if (!activeTerm) {
      const tRes = queries.createAcademicTerm.run(activeSession.id, "First Term", null, null, 1, "active") as any;
      activeTerm = { id: Number(tRes.lastInsertRowid), name: "First Term" };
    }

    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, role, grade, reg_id, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    );
    insertUser.run("Operator Iso", operatorCreds.email, hash, "operator", null, `OP-${TS}`, null);
    const tRow = insertUser.run("Teacher Iso", teacherCreds.email, hash, "teacher", null, `TCH-${TS}`, null) as any;
    const s1Row = insertUser.run("Student One Iso", student1Creds.email, hash, "student", "JSS1", `STU1-${TS}`, null) as any;
    const s2Row = insertUser.run("Student Two Iso", student2Creds.email, hash, "student", "JSS1", `STU2-${TS}`, null) as any;
    insertUser.run("Guardian Iso", guardianCreds.email, hash, "guardian", null, `GRD-${TS}`, "08011112222");

    const teacherId = Number(tRow.lastInsertRowid);
    const student1Id = Number(s1Row.lastInsertRowid);
    const student2Id = Number(s2Row.lastInsertRowid);

    // Create a published CBT subject with 2 objective questions and enroll both students
    const subRow = queries.createSubject.run(
      `Concurrent CBT ${TS}`,
      `CBT_${TS}`,
      activeTerm.name || "First Term",
      60,
      teacherId,
      1,
      "Concurrency Test Subject",
      "JSS1",
      null,
      activeSession.name || "2026/2027",
      "exam",
      "Answer all questions",
      1,
      activeSession.id,
      activeTerm.id,
      0,
      "school_exam",
      "immediate",
      null
    ) as any;
    subjectId = Number(subRow.lastInsertRowid);

    const insertQuestion = db.prepare(`
      INSERT INTO questions (subject_id, question_text, options_json, correct_answer, marks, order_index, question_type, session_id, term_id)
      VALUES (?, ?, ?, ?, ?, ?, 'objective', ?, ?)
    `);

    const q1 = insertQuestion.run(
      subjectId,
      "What is 12 + 8?",
      JSON.stringify(["18", "20", "22", "24"]),
      1,
      5,
      1,
      activeSession.id,
      activeTerm.id
    ) as any;
    q1Id = Number(q1.lastInsertRowid);

    const q2 = insertQuestion.run(
      subjectId,
      "Which protocol secures HTTP traffic?",
      JSON.stringify(["FTP", "TLS", "SMTP", "ARP"]),
      1,
      5,
      2,
      activeSession.id,
      activeTerm.id
    ) as any;
    q2Id = Number(q2.lastInsertRowid);

    queries.updateSubjectTotalScore.run(subjectId, subjectId);
    db.prepare("UPDATE subjects SET is_published = 1, is_timetable_published = 1, exam_datetime = ?, window_duration = 120 WHERE id = ?").run(
      new Date(Date.now() - 60_000).toISOString(),
      subjectId
    );
    queries.enrollStudent.run(subjectId, student1Id, 1);
    queries.enrollStudent.run(subjectId, student2Id, 1);
  });

  async function loginUser(email: string, password: string, userAgent: string) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
    const cookieHeader = setCookies
      .map((c) => c.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");
    return {
      token: body.data.token as string,
      jti: body.data.session_id as string,
      user: body.data.user,
      cookies: cookieHeader,
    };
  }

  test("F1.1: Simultaneous logins across Operator, Teacher, Student 1 (2 devices), Student 2, and Guardian", async () => {
    const [op, tch, s1A, s1B, s2, grd] = await Promise.all([
      loginUser(operatorCreds.email, operatorCreds.password, "Chrome/120 Windows Operator-Tab"),
      loginUser(teacherCreds.email, teacherCreds.password, "Chrome/120 Windows Teacher-Tab"),
      loginUser(student1Creds.email, student1Creds.password, "Chrome/120 Windows Student1-Laptop"),
      loginUser(student1Creds.email, student1Creds.password, "Safari/17 iPhone Student1-Mobile"),
      loginUser(student2Creds.email, student2Creds.password, "Firefox/121 Windows Student2-PC"),
      loginUser(guardianCreds.email, guardianCreds.password, "Chrome/120 Android Guardian-Phone"),
    ]);

    operatorSession = op;
    teacherSession = tch;
    student1SessionA = s1A;
    student1SessionB = s1B;
    student2Session = s2;
    guardianSession = grd;

    // Every session must have a unique cryptographic JTI and JWT
    const jtis = new Set([op.jti, tch.jti, s1A.jti, s1B.jti, s2.jti, grd.jti]);
    expect(jtis.size).toBe(6);

    expect(op.user.role).toBe("operator");
    expect(tch.user.role).toBe("teacher");
    expect(s1A.user.role).toBe("student");
    expect(s2.user.role).toBe("student");
    expect(grd.user.role).toBe("guardian");
  });

  test("F1.2: Shared browser cookie jar cannot overwrite tab-explicit Bearer token or role-scoped cookie", async () => {
    // Combine ALL role cookies into one shared browser Cookie header (simulating same browser across tabs)
    const combinedBrowserCookies = [
      operatorSession.cookies,
      teacherSession.cookies,
      student1SessionA.cookies,
      guardianSession.cookies,
    ].join("; ");

    // 1. Student 2's tab sends Authorization: Bearer <student2Token> even while Student 1's cookie is in the browser jar
    const s2MeRes = await fetch(`${BASE}/api/auth/me`, {
      headers: {
        Cookie: combinedBrowserCookies,
        Authorization: `Bearer ${student2Session.token}`,
        "X-Portal-Role": "student",
      },
    });
    expect(s2MeRes.status).toBe(200);
    const s2Me = (await parseJson(s2MeRes)).data.user;
    expect(s2Me.id).toBe(student2Session.user.id);
    expect(s2Me.email).toBe(student2Creds.email);

    // 2. Operator tab using X-Portal-Role: operator resolves Operator session from shared cookies
    const opMeRes = await fetch(`${BASE}/api/auth/me`, {
      headers: {
        Cookie: combinedBrowserCookies,
        "X-Portal-Role": "operator",
      },
    });
    expect(opMeRes.status).toBe(200);
    const opMe = (await parseJson(opMeRes)).data.user;
    expect(opMe.id).toBe(operatorSession.user.id);
    expect(opMe.role).toBe("operator");

    // 3. Teacher tab using X-Portal-Role: teacher resolves Teacher session from shared cookies
    const tchMeRes = await fetch(`${BASE}/api/auth/me`, {
      headers: {
        Cookie: combinedBrowserCookies,
        "X-Portal-Role": "teacher",
      },
    });
    expect(tchMeRes.status).toBe(200);
    const tchMe = (await parseJson(tchMeRes)).data.user;
    expect(tchMe.id).toBe(teacherSession.user.id);
    expect(tchMe.role).toBe("teacher");

    // 4. Guardian tab using X-Portal-Role: guardian resolves Guardian session from shared cookies
    const grdMeRes = await fetch(`${BASE}/api/auth/me`, {
      headers: {
        Cookie: combinedBrowserCookies,
        "X-Portal-Role": "guardian",
      },
    });
    expect(grdMeRes.status).toBe(200);
    const grdMe = (await parseJson(grdMeRes)).data.user;
    expect(grdMe.id).toBe(guardianSession.user.id);
    expect(grdMe.role).toBe("guardian");
  });

  test("D4.1: OWASP Session Visibility (GET /api/auth/sessions) & Independent Single-Device Logout", async () => {
    // Student 1 lists active sessions from Device A
    const listRes = await fetch(`${BASE}/api/auth/sessions`, {
      headers: { Authorization: `Bearer ${student1SessionA.token}` },
    });
    expect(listRes.status).toBe(200);
    const sessions = (await parseJson(listRes)).data.sessions as any[];
    expect(sessions.length).toBeGreaterThanOrEqual(2);

    const currentA = sessions.find((s) => s.jti === student1SessionA.jti);
    const otherB = sessions.find((s) => s.jti === student1SessionB.jti);
    expect(currentA).toBeDefined();
    expect(currentA.is_current).toBe(true);
    expect(otherB).toBeDefined();
    expect(otherB.is_current).toBe(false);

    // Student 2 cannot revoke Student 1's session (IDOR protection)
    const idorRevoke = await fetch(`${BASE}/api/auth/sessions/${student1SessionB.jti}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${student2Session.token}` },
    });
    expect(idorRevoke.status).toBe(403);

    // Student 1 logs out on Device B ONLY
    const logoutB = await fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${student1SessionB.token}` },
    });
    expect(logoutB.status).toBe(200);

    // Device B token is now rejected with 401
    const meBAfter = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${student1SessionB.token}` },
    });
    expect(meBAfter.status).toBe(401);

    // Device A for Student 1, plus Student 2, Teacher, Operator, Guardian ALL remain active!
    const [meA, meS2, meTch, meOp, meGrd] = await Promise.all([
      fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${student1SessionA.token}` } }),
      fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${student2Session.token}` } }),
      fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${teacherSession.token}` } }),
      fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${operatorSession.token}` } }),
      fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${guardianSession.token}` } }),
    ]);
    expect(meA.status).toBe(200);
    expect(meS2.status).toBe(200);
    expect(meTch.status).toBe(200);
    expect(meOp.status).toBe(200);
    expect(meGrd.status).toBe(200);
  });

  test("E2 & G2: Concurrent CBT Exam Start, Autosave, Cross-Student IDOR Isolation & Idempotent Double-Submit", async () => {
    // Student 1 and Student 2 start the CBT exam simultaneously
    const [start1Res, start2Res] = await Promise.all([
      fetch(`${BASE}/api/exams/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${student1SessionA.token}`,
        },
        body: JSON.stringify({ subject_id: subjectId }),
      }),
      fetch(`${BASE}/api/exams/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${student2Session.token}`,
        },
        body: JSON.stringify({ subject_id: subjectId }),
      }),
    ]);

    expect([200, 201]).toContain(start1Res.status);
    expect([200, 201]).toContain(start2Res.status);

    const start1 = (await parseJson(start1Res)).data;
    const start2 = (await parseJson(start2Res)).data;

    const exam1Id = start1.exam.id as number;
    const exam2Id = start2.exam.id as number;
    expect(exam1Id).not.toBe(exam2Id);

    // Stripped questions must NEVER leak correct_answer during active exam
    for (const q of start1.questions) {
      expect(q.correct_answer).toBeUndefined();
    }

    // Cross-student IDOR check: Student 1 tries to save answers into Student 2's exam
    const idorSave = await fetch(`${BASE}/api/exams/${exam2Id}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${student1SessionA.token}`,
      },
      body: JSON.stringify({ answers: [{ question_id: q1Id, selected_option: 0 }] }),
    });
    expect(idorSave.status).toBe(403);

    // Concurrent autosaves: Student 1 answers both right (1, 1 => 10/10); Student 2 answers 1 right, 1 wrong (1, 0 => 5/10)
    const s1Answers = [
      { question_id: q1Id, selected_option: 1 },
      { question_id: q2Id, selected_option: 1 },
    ];
    const s2Answers = [
      { question_id: q1Id, selected_option: 1 },
      { question_id: q2Id, selected_option: 0 },
    ];

    const [save1, save2] = await Promise.all([
      fetch(`${BASE}/api/exams/${exam1Id}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${student1SessionA.token}`,
        },
        body: JSON.stringify({ answers: s1Answers }),
      }),
      fetch(`${BASE}/api/exams/${exam2Id}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${student2Session.token}`,
        },
        body: JSON.stringify({ answers: s2Answers }),
      }),
    ]);
    expect(save1.status).toBe(200);
    expect(save2.status).toBe(200);

    // Concurrent submit + simulated double-submit on Student 1
    const [sub1First, sub1Duplicate, sub2First] = await Promise.all([
      fetch(`${BASE}/api/exams/${exam1Id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${student1SessionA.token}`,
        },
        body: JSON.stringify({ answers: s1Answers }),
      }),
      fetch(`${BASE}/api/exams/${exam1Id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${student1SessionA.token}`,
        },
        body: JSON.stringify({ answers: s1Answers }),
      }),
      fetch(`${BASE}/api/exams/${exam2Id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${student2Session.token}`,
        },
        body: JSON.stringify({ answers: s2Answers }),
      }),
    ]);

    expect([sub1First.status, sub1Duplicate.status]).toContain(200);
    expect([200, 409]).toContain(sub1Duplicate.status);
    expect(sub2First.status).toBe(200);

    const winningSub1 = sub1First.status === 200 ? sub1First : sub1Duplicate;
    const res1Data = (await parseJson(winningSub1)).data;
    const res2Data = (await parseJson(sub2First)).data;

    expect(res1Data.score).toBe(10);
    expect(res1Data.total_score).toBe(10);
    expect(res2Data.score).toBe(5);
    expect(res2Data.total_score).toBe(10);

    // Verify no duplicate student_answers rows were created for Exam 1
    const countRow = db
      .prepare("SELECT COUNT(*) as cnt FROM student_answers WHERE exam_id = ?")
      .get(exam1Id) as { cnt: number };
    expect(countRow.cnt).toBe(2);

    // Cross-student IDOR check on exam review: Student 2 cannot review Student 1's script
    const idorReview = await fetch(`${BASE}/api/exams/${exam1Id}/review`, {
      headers: { Authorization: `Bearer ${student2Session.token}` },
    });
    expect(idorReview.status).toBe(403);
  });
});
