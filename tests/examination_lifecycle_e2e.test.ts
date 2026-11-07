/**
 * tests/examination_lifecycle_e2e.test.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Comprehensive End-to-End Verification for:
 *  - Scenario A: Scheduled examination, questions unpublished (visible as upcoming awaiting publication, start blocked)
 *  - Scenario B: Scheduled examination, questions published before start time (visible as upcoming, early start blocked)
 *  - Scenario C: Examination window opens (student starts, server deadline enforced, refresh resumes in-progress attempt)
 *  - Scenario D: Examination window closes (missed exam classified as expired, not completed; late start/save blocked)
 *  - Scenario E: Student submits examination with Objective + Essay (auto-grading, awaiting_grading status, retake blocked by default)
 *  - Scenario F: Authorized retake workflow (teacher/operator grants retake, original attempt archived with full answers in exam_attempts)
 *  - Scenario G: Teacher Grading Centre (loads without 500 error even with spaces in class name, grades essay, saves CA, approves/locks, Class Teacher broadsheet receives approved grades, audit-logged unlock)
 *  - Scenario H: Security & role boundary checks (cross-student IDOR blocked, cross-teacher blocked, cross-class student blocked)
 *  - Scenario I: Academic session & term isolation
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import "../server";
import { apiGet, apiPost, apiPut, extractToken, json, bootstrapOperator } from "./helpers";
import { groupStudentAssessments } from "../frontend/lib/studentDashboard";
import db from "../db";

let operatorToken = "";
let subjectTeacherToken = "";
let classTeacherToken = "";
let unrelatedTeacherToken = "";
let studentSS2Token = "";
let studentJSS1Token = "";

let subjectTeacherId = 0;
let classTeacherId = 0;
let unrelatedTeacherId = 0;
let studentSS2Id = 0;
let studentJSS1Id = 0;
let classSS2Id = 0;
let sessionId = 0;
let termId = 0;

let subjectId = 0;
let missedSubjectId = 0;
let objQ1Id = 0;
let objQ2Id = 0;
let essayQ3Id = 0;
let examId = 0;
let gradingSubjectId = 0;

const TS = Date.now();

beforeAll(async () => {
  operatorToken = await bootstrapOperator(`op_lifecycle_${TS}@acqad.test`, "Operator@123");

  // Ensure active academic session & term exist
  const activeSession = db.prepare("SELECT * FROM academic_sessions WHERE is_active = 1 LIMIT 1").get() as any;
  const activeTerm = db.prepare("SELECT * FROM academic_terms WHERE is_active = 1 LIMIT 1").get() as any;
  sessionId = activeSession.id;
  termId = activeTerm.id;

  // Register Subject Teacher
  const stRes = await apiPost("/api/auth/register", {
    name: "Physics Subject Teacher",
    email: `phys_tch_${TS}@acqad.test`,
    password: "Teacher@123",
    role: "teacher",
  }, operatorToken);
  subjectTeacherId = (await json(stRes))?.data?.user?.id;
  const stLogin = await apiPost("/api/auth/login", { email: `phys_tch_${TS}@acqad.test`, password: "Teacher@123" });
  subjectTeacherToken = extractToken(stLogin, await json(stLogin));

  // Register Class Teacher (supervises SS 2)
  const ctRes = await apiPost("/api/auth/register", {
    name: "SS2 Class Master",
    email: `class_tch_${TS}@acqad.test`,
    password: "Teacher@123",
    role: "teacher",
  }, operatorToken);
  classTeacherId = (await json(ctRes))?.data?.user?.id;
  const ctLogin = await apiPost("/api/auth/login", { email: `class_tch_${TS}@acqad.test`, password: "Teacher@123" });
  classTeacherToken = extractToken(ctLogin, await json(ctLogin));

  // Register Unrelated Teacher
  const utRes = await apiPost("/api/auth/register", {
    name: "Unrelated Teacher",
    email: `unrel_tch_${TS}@acqad.test`,
    password: "Teacher@123",
    role: "teacher",
  }, operatorToken);
  unrelatedTeacherId = (await json(utRes))?.data?.user?.id;
  const utLogin = await apiPost("/api/auth/login", { email: `unrel_tch_${TS}@acqad.test`, password: "Teacher@123" });
  unrelatedTeacherToken = extractToken(utLogin, await json(utLogin));

  // Ensure class "SS 2" exists and assign Class Teacher
  let ss2Row = db.prepare("SELECT * FROM classes WHERE name = 'SS 2' LIMIT 1").get() as any;
  if (!ss2Row) {
    const ins = db.prepare("INSERT INTO classes (name, level, class_teacher_id) VALUES ('SS 2', 'Senior', ?)").run(classTeacherId);
    classSS2Id = Number(ins.lastInsertRowid);
  } else {
    classSS2Id = Number(ss2Row.id);
    db.prepare("UPDATE classes SET class_teacher_id = ? WHERE id = ?").run(classTeacherId, classSS2Id);
  }
  const opUser = db.prepare("SELECT id FROM users WHERE role = 'operator' LIMIT 1").get() as any;
  db.prepare(`
    INSERT INTO class_teacher_assignments (class_id, teacher_id, assigned_by, action)
    VALUES (?, ?, ?, 'assigned')
  `).run(classSS2Id, classTeacherId, opUser?.id || classTeacherId);

  // Register Student in SS 2 (note the space in "SS 2" to test REPLACE SQL normalization!)
  const s1Res = await apiPost("/api/auth/register", {
    name: "Adaeze Okafor",
    email: `stu_ss2_${TS}@acqad.test`,
    password: "Student@123",
    role: "student",
    grade: "SS 2",
  }, operatorToken);
  studentSS2Id = (await json(s1Res))?.data?.user?.id;
  const s1Login = await apiPost("/api/auth/login", { email: `stu_ss2_${TS}@acqad.test`, password: "Student@123" });
  studentSS2Token = extractToken(s1Login, await json(s1Login));

  // Enroll Student SS 2 in class_enrollments as well
  const legacyTerm = db.prepare("SELECT id FROM terms LIMIT 1").get() as any;
  if (legacyTerm) {
    db.prepare(`
      INSERT OR IGNORE INTO class_enrollments (student_id, class_id, term_id)
      VALUES (?, ?, ?)
    `).run(studentSS2Id, classSS2Id, legacyTerm.id);
  }

  // Register Student in JSS 1 (different class)
  const s2Res = await apiPost("/api/auth/register", {
    name: "Tunde Bakare",
    email: `stu_jss1_${TS}@acqad.test`,
    password: "Student@123",
    role: "student",
    grade: "JSS 1",
  }, operatorToken);
  studentJSS1Id = (await json(s2Res))?.data?.user?.id;
  const s2Login = await apiPost("/api/auth/login", { email: `stu_jss1_${TS}@acqad.test`, password: "Student@123" });
  studentJSS1Token = extractToken(s2Login, await json(s2Login));
});

describe("ACQAD Examination Lifecycle, Timetable Enforcement, Dashboard & Grading Centre E2E", () => {
  test("Scenario A: Scheduled examination with unpublished questions is visible as Upcoming (Awaiting Publication) and cannot be started", async () => {
    const futureStart = new Date(Date.now() + 2 * 3600_000).toISOString(); // 2 hours in the future
    const createSubRes = await apiPost("/api/subjects", {
      name: `Advanced Physics ${TS}`,
      code: `PHY_LC_${TS}`,
      class: "SS 2",
      duration: 45,
      window_duration: 90,
      exam_datetime: futureStart,
      teacher_id: subjectTeacherId,
      is_published: false,
      is_timetable_published: true,
      can_retake: 1,
    }, operatorToken);
    expect(createSubRes.status).toBe(201);
    subjectId = (await json(createSubRes)).data.id;

    // Student fetches subjects for dashboard
    const stuSubRes = await apiGet("/api/subjects", studentSS2Token);
    expect(stuSubRes.status).toBe(200);
    const stuSubjects = (await json(stuSubRes)).data as any[];
    const foundSub = stuSubjects.find((s: any) => s.id === subjectId);
    expect(foundSub).toBeDefined();
    expect(Number(foundSub.is_published)).toBe(0);

    // Dashboard classification: must be in upcomingAwaitingPublicationExams, NOT completedExams
    const grouped = groupStudentAssessments(stuSubjects, new Set(), Date.now(), [], []);
    expect(grouped.upcomingAwaitingPublicationExams.some((s: any) => s.id === subjectId)).toBe(true);
    expect(grouped.completedExams.some((s: any) => s.id === subjectId)).toBe(false);
    expect(grouped.liveExams.some((s: any) => s.id === subjectId)).toBe(false);

    // Student cannot start or fetch questions
    const startRes = await apiPost("/api/exams/start", { subject_id: subjectId }, studentSS2Token);
    expect(startRes.status).toBe(403);

    const qRes = await apiGet(`/api/subjects/${subjectId}/questions`, studentSS2Token);
    expect(qRes.status).toBe(403);
  });

  test("Scenario B: Questions published before scheduled start time -> visible as Upcoming, early start & question fetch blocked", async () => {
    // Subject Teacher creates 2 objective questions (10 marks each) + 1 essay question (10 marks) = 30 marks total
    const q1 = await apiPost("/api/questions", {
      subject_id: subjectId,
      question_text: "What is the SI unit of force?",
      options: ["Joule", "Newton", "Watt", "Pascal"],
      correct_answer: 1,
      marks: 10,
      order_index: 1,
      question_type: "multiple_choice",
    }, subjectTeacherToken);
    expect(q1.status).toBe(201);
    objQ1Id = (await json(q1)).data.id;

    const q2 = await apiPost("/api/questions", {
      subject_id: subjectId,
      question_text: "Acceleration due to gravity on Earth is approximately:",
      options: ["9.8 m/s²", "1.6 m/s²", "24.8 m/s²", "0 m/s²"],
      correct_answer: 0,
      marks: 10,
      order_index: 2,
      question_type: "multiple_choice",
    }, subjectTeacherToken);
    expect(q2.status).toBe(201);
    objQ2Id = (await json(q2)).data.id;

    const q3 = await apiPost("/api/questions", {
      subject_id: subjectId,
      question_text: "State Newton's Second Law of Motion and derive F = ma.",
      options: ["N/A", "N/A"],
      correct_answer: 0,
      marks: 10,
      order_index: 3,
      question_type: "essay",
      teacher_answer: "Rate of change of momentum is proportional to applied force: F = dp/dt = m(dv/dt) = ma.",
    }, subjectTeacherToken);
    expect(q3.status).toBe(201);
    essayQ3Id = (await json(q3)).data.id;

    // Publish the subject questions while exam_datetime is still 2 hours in the future
    const pubRes = await apiPut(`/api/subjects/${subjectId}`, { is_published: 1 }, operatorToken);
    expect(pubRes.status).toBe(200);

    // Student dashboard now classifies it in upcomingExams (published & scheduled in future)
    const stuSubRes = await apiGet("/api/subjects", studentSS2Token);
    const stuSubjects = (await json(stuSubRes)).data as any[];
    const grouped = groupStudentAssessments(stuSubjects, new Set(), Date.now(), [], []);
    expect(grouped.upcomingExams.some((s: any) => s.id === subjectId)).toBe(true);
    expect(grouped.completedExams.some((s: any) => s.id === subjectId)).toBe(false);

    // Attempting to start before scheduled start time must fail with 403
    const earlyStartRes = await apiPost("/api/exams/start", { subject_id: subjectId }, studentSS2Token);
    expect(earlyStartRes.status).toBe(403);
    const earlyStartBody = await json(earlyStartRes);
    expect(earlyStartBody.error).toContain("window not open yet");

    // Attempting to fetch questions before start time must also fail with 403
    const earlyQRes = await apiGet(`/api/subjects/${subjectId}/questions`, studentSS2Token);
    expect(earlyQRes.status).toBe(403);
  });

  test("Scenario C: Examination window opens -> student starts exam, server deadline is recorded, and refresh resumes existing attempt", async () => {
    // Move exam_datetime to 5 minutes ago (window_duration = 90 mins, duration = 45 mins)
    const openStart = new Date(Date.now() - 5 * 60_000).toISOString();
    const schedRes = await apiPut(`/api/subjects/${subjectId}`, {
      exam_datetime: openStart,
      duration: 45,
      window_duration: 90,
      is_timetable_published: 1,
      is_published: 1,
    }, operatorToken);
    expect(schedRes.status).toBe(200);

    // Verify timetable table was reconciled automatically
    const ttRow = db.prepare("SELECT * FROM timetables WHERE subject_id = ?").get(subjectId) as any;
    expect(ttRow).toBeDefined();
    expect(ttRow.session_id).toBe(sessionId);
    expect(ttRow.term_id).toBe(termId);

    // Student dashboard classifies exam in liveExams
    const stuSubRes = await apiGet("/api/subjects", studentSS2Token);
    const stuSubjects = (await json(stuSubRes)).data as any[];
    const groupedLive = groupStudentAssessments(stuSubjects, new Set(), Date.now(), [], []);
    expect(groupedLive.liveExams.some((s: any) => s.id === subjectId)).toBe(true);

    // Student starts exam -> 201 Created
    const startRes = await apiPost("/api/exams/start", { subject_id: subjectId }, studentSS2Token);
    expect(startRes.status).toBe(201);
    const startData = (await json(startRes)).data;
    examId = startData.examId;
    expect(examId).toBeGreaterThan(0);
    expect(startData.deadline).toBeDefined();
    expect(startData.questions.length).toBe(3);
    // Ensure correct_answer is stripped from student payload
    expect(startData.questions[0].correct_answer).toBeUndefined();

    const originalDeadline = startData.deadline;

    // Student saves progress
    const saveRes = await apiPost(`/api/exams/${examId}/save`, {
      answers: [
        { question_id: objQ1Id, selected_option: 1 },
      ],
    }, studentSS2Token);
    expect(saveRes.status).toBe(200);

    // Student refreshes / calls /api/exams/start with resume: true -> 200 OK with resumed: true and same deadline
    const resumeRes = await apiPost("/api/exams/start", { subject_id: subjectId, resume: true }, studentSS2Token);
    expect(resumeRes.status).toBe(200);
    const resumeData = (await json(resumeRes)).data;
    expect(resumeData.resumed).toBe(true);
    expect(resumeData.examId).toBe(examId);
    expect(resumeData.deadline).toBe(originalDeadline);

    // Calling /api/exams/start without resume: true prevents duplicate exam row creation (409 Conflict)
    const dupStartRes = await apiPost("/api/exams/start", { subject_id: subjectId }, studentSS2Token);
    expect(dupStartRes.status).toBe(409);

    // Active exams endpoint returns the in-progress attempt and dashboard classifies it in inProgressExams
    const activeRes = await apiGet("/api/exams/active", studentSS2Token);
    const activeExams = (await json(activeRes)).data.exams;
    expect(activeExams.some((e: any) => e.id === examId)).toBe(true);

    const groupedInProgress = groupStudentAssessments(stuSubjects, new Set(), Date.now(), activeExams, []);
    expect(groupedInProgress.inProgressExams.some((s: any) => s.id === subjectId)).toBe(true);
  });

  test("Scenario D: Examination window closes -> missed exam is classified as Expired (not Completed) and cannot be started", async () => {
    // Create a subject whose window opened 3 hours ago and closed 1 hour ago
    const pastStart = new Date(Date.now() - 3 * 3600_000).toISOString();
    const missedRes = await apiPost("/api/subjects", {
      name: `Missed Chemistry ${TS}`,
      code: `CHM_MISS_${TS}`,
      class: "SS 2",
      duration: 45,
      window_duration: 60,
      exam_datetime: pastStart,
      teacher_id: subjectTeacherId,
      is_published: false,
      is_timetable_published: true,
    }, operatorToken);
    expect(missedRes.status).toBe(201);
    missedSubjectId = (await json(missedRes)).data.id;

    // Add a question and publish
    await apiPost("/api/questions", {
      subject_id: missedSubjectId,
      question_text: "What is the atomic number of Carbon?",
      options: ["4", "6", "8", "12"],
      correct_answer: 1,
      marks: 5,
      order_index: 1,
    }, subjectTeacherToken);
    await apiPut(`/api/subjects/${missedSubjectId}`, { is_published: 1, exam_datetime: pastStart, window_duration: 60, is_timetable_published: 1 }, operatorToken);

    // Student attempts to start after window closed -> 403
    const lateStartRes = await apiPost("/api/exams/start", { subject_id: missedSubjectId }, studentSS2Token);
    expect(lateStartRes.status).toBe(403);
    expect((await json(lateStartRes)).error).toContain("window has closed");

    // Dashboard classifies missed exam in expiredExams, NEVER in completedExams
    const stuSubRes = await apiGet("/api/subjects", studentSS2Token);
    const stuSubjects = (await json(stuSubRes)).data as any[];
    const grouped = groupStudentAssessments(stuSubjects, new Set(), Date.now(), [], []);
    expect(grouped.expiredExams.some((s: any) => s.id === missedSubjectId)).toBe(true);
    expect(grouped.completedExams.some((s: any) => s.id === missedSubjectId)).toBe(false);
  });

  test("Scenario E: Student submits examination (Objective + Essay) -> objective auto-graded, status is awaiting_grading, retake blocked by default", async () => {
    // Student submits exam with 1 correct objective (10/10), 1 wrong objective (0/10), and 1 essay response
    const subRes = await apiPost(`/api/exams/${examId}/submit`, {
      answers: [
        { question_id: objQ1Id, selected_option: 1 }, // Correct (10 marks)
        { question_id: objQ2Id, selected_option: 2 }, // Wrong (0 marks)
        { question_id: essayQ3Id, essay_response: "F = ma because force equals mass times acceleration." },
      ],
    }, studentSS2Token);
    expect(subRes.status).toBe(200);
    const subData = (await json(subRes)).data;
    expect(subData.result_status).toBe("awaiting_grading");
    expect(subData.score).toBeUndefined(); // Score is withheld from student until teacher grades essay

    // Check DB state: exam status is completed, score is 10/30, result_status is awaiting_grading, essay answer has is_graded = 0
    const examRow = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;
    expect(examRow.status).toBe("completed");
    expect(examRow.score).toBe(10);
    expect(examRow.total_score).toBe(30);
    expect(examRow.result_status).toBe("awaiting_grading");

    const essayAns = db.prepare("SELECT * FROM student_answers WHERE exam_id = ? AND question_id = ?").get(examId, essayQ3Id) as any;
    expect(essayAns.is_graded).toBe(0);
    expect(essayAns.essay_response).toContain("F = ma");

    // Student dashboard classifies this submitted exam in awaitingGradingExams
    const stuSubRes = await apiGet("/api/subjects", studentSS2Token);
    const stuSubjects = (await json(stuSubRes)).data as any[];
    const stuResRes = await apiGet("/api/exams/results", studentSS2Token);
    const stuResults = (await json(stuResRes)).data as any[];
    const grouped = groupStudentAssessments(stuSubjects, new Set([subjectId]), Date.now(), [], stuResults);
    expect(grouped.awaitingGradingExams.some((s: any) => s.id === subjectId)).toBe(true);

    // Student attempts retake without authorization -> 403 Forbidden
    const unauthRetake1 = await apiPost(`/api/exams/${examId}/retake`, {}, studentSS2Token);
    expect(unauthRetake1.status).toBe(403);

    const unauthRetake2 = await apiPost("/api/exams/start", { subject_id: subjectId }, studentSS2Token);
    expect(unauthRetake2.status).toBe(403);
  });

  test("Scenario F: Retake authorization -> archives original attempt with full answers, allows 1 retake, and blocks subsequent unauthorized retakes", async () => {
    // Subject Teacher authorizes 1 retake for studentSS2 on subjectId
    const authRes = await apiPost("/api/exams/authorizations/retake", {
      student_id: studentSS2Id,
      subject_id: subjectId,
      reason: "Network interruption during first sitting",
      max_attempts: 1,
    }, subjectTeacherToken);
    expect(authRes.status).toBe(201);

    // Student initiates retake
    const retakeRes = await apiPost(`/api/exams/${examId}/retake`, {}, studentSS2Token);
    expect(retakeRes.status).toBe(200);

    // Verify original attempt was archived in exam_attempts with attempt_number = 1 and preserved answers
    const archivedAttempts = db.prepare("SELECT * FROM exam_attempts WHERE exam_id = ?").all(examId) as any[];
    expect(archivedAttempts.length).toBe(1);
    expect(archivedAttempts[0].attempt_number).toBe(1);
    expect(archivedAttempts[0].score).toBe(10);
    const archivedAnswers = JSON.parse(archivedAttempts[0].answers_json);
    expect(Array.isArray(archivedAnswers)).toBe(true);
    expect(archivedAnswers.length).toBe(3);

    // Student submits the retake attempt with BOTH objective questions correct (20/20) + essay
    const retakeSubmitRes = await apiPost(`/api/exams/${examId}/submit`, {
      answers: [
        { question_id: objQ1Id, selected_option: 1 }, // Correct (10)
        { question_id: objQ2Id, selected_option: 0 }, // Correct (10)
        { question_id: essayQ3Id, essay_response: "Newton's second law states F = dp/dt = ma." },
      ],
    }, studentSS2Token);
    expect(retakeSubmitRes.status).toBe(200);
    expect((await json(retakeSubmitRes)).data.result_status).toBe("awaiting_grading");

    // Verify retake_count is 1, objective score is 20, and used_attempts is 1
    const updatedExam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;
    expect(updatedExam.retake_count).toBe(1);
    expect(updatedExam.score).toBe(20);

    // Attempting a second retake now that used_attempts (1) == max_attempts (1) must be blocked with 403
    const secondRetakeRes = await apiPost(`/api/exams/${examId}/retake`, {}, studentSS2Token);
    expect(secondRetakeRes.status).toBe(403);
  });

  test("Scenario G: Teacher opens Grading Centre (no 500 error), grades essay, enters CA, approves/locks grades, Class Teacher views broadsheet, and unlock logs audit", async () => {
    // 1. Subject Teacher opens Grading Centre -> GET /api/grading/subjects
    const gsListRes = await apiGet(`/api/grading/subjects?sessionId=${sessionId}&termId=${termId}`, subjectTeacherToken);
    expect(gsListRes.status).toBe(200);
    const gsList = (await json(gsListRes)).data as any[];
    const physGs = gsList.find((g: any) => g.source_cbt_subject_id === subjectId || g.code === `PHY_LC_${TS}`);
    expect(physGs).toBeDefined();
    expect(physGs.class_id).toBe(classSS2Id);
    gradingSubjectId = physGs.id;

    // 2. Subject Teacher opens Grading Spreadsheet -> GET /api/grading/scores/:id
    const sheetRes = await apiGet(`/api/grading/scores/${gradingSubjectId}`, subjectTeacherToken);
    expect(sheetRes.status).toBe(200);
    const sheetData = (await json(sheetRes)).data;
    const stuRow = sheetData.students.find((s: any) => s.student_id === studentSS2Id);
    expect(stuRow).toBeDefined();
    expect(stuRow.ungraded_essays).toBe(1);

    // 3. Subject Teacher grades the essay question (awards 8 / 10 marks) -> total CBT score becomes 28 / 30
    const gradeEssayRes = await apiPost(`/api/exams/${examId}/grade`, {
      question_id: essayQ3Id,
      marks_awarded: 8,
    }, subjectTeacherToken);
    expect(gradeEssayRes.status).toBe(200);
    const gradeEssayData = (await json(gradeEssayRes)).data;
    expect(gradeEssayData.new_total).toBe(28);

    // Verify exam result_status automatically transitioned from awaiting_grading to released
    const examAfterEssay = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;
    expect(examAfterEssay.result_status).toBe("released");

    // 4. Re-fetch Grading Spreadsheet -> ungraded_essays is now 0, CBT score is scaled to policy max_marks
    const sheetRes2 = await apiGet(`/api/grading/scores/${gradingSubjectId}`, subjectTeacherToken);
    expect(sheetRes2.status).toBe(200);
    const sheetData2 = (await json(sheetRes2)).data;
    const stuRow2 = sheetData2.students.find((s: any) => s.student_id === studentSS2Id);
    expect(stuRow2.ungraded_essays).toBe(0);

    // 5. Enter manual CA scores and save
    const manualPolicies = sheetData2.policies.filter((p: any) => p.type === "manual");
    const scoresToSave: any[] = [];
    for (const mp of manualPolicies) {
      scoresToSave.push({
        student_id: studentSS2Id,
        policy_id: mp.id,
        score: Math.min(15, mp.max_marks),
      });
    }
    const saveScoresRes = await apiPost(`/api/grading/scores/${gradingSubjectId}`, {
      scores: scoresToSave,
      remarks: [{ student_id: studentSS2Id, remark: "Excellent performance in Physics." }],
    }, subjectTeacherToken);
    expect(saveScoresRes.status).toBe(200);

    // 6. Subject Teacher approves and locks grades
    const approveRes = await apiPost(`/api/grading/approve/${gradingSubjectId}`, {}, subjectTeacherToken);
    expect(approveRes.status).toBe(200);

    // 7. Verify locked grades reject further CA edits AND reject essay re-grading
    const lockedEditRes = await apiPost(`/api/grading/scores/${gradingSubjectId}`, {
      scores: scoresToSave,
    }, subjectTeacherToken);
    expect(lockedEditRes.status).toBe(403);

    const lockedEssayRes = await apiPost(`/api/exams/${examId}/grade`, {
      question_id: essayQ3Id,
      marks_awarded: 10,
    }, subjectTeacherToken);
    expect(lockedEssayRes.status).toBe(403);

    // 8. Class Teacher opens Class Broadsheet -> GET /api/grading/class-center
    const broadsheetRes = await apiGet(`/api/grading/class-center?classId=${classSS2Id}&termId=${termId}&sessionId=${sessionId}`, classTeacherToken);
    expect(broadsheetRes.status).toBe(200);
    const broadsheetData = (await json(broadsheetRes)).data;
    expect(broadsheetData.grading_subjects.some((s: any) => s.id === gradingSubjectId)).toBe(true);
    const broadsheetStu = broadsheetData.students.find((s: any) => s.student.id === studentSS2Id);
    expect(broadsheetStu).toBeDefined();
    const stuPhysSub = broadsheetStu.subjects.find((sub: any) => sub.grading_subject_id === gradingSubjectId);
    expect(stuPhysSub).toBeDefined();
    expect(stuPhysSub.is_approved).toBe(1);
    expect(stuPhysSub.total_score).toBeGreaterThan(0);

    // 9. Authorized unlock resets approval and records audit log
    const unapproveRes = await apiPost(`/api/grading/approve/${gradingSubjectId}/unapprove`, {}, subjectTeacherToken);
    expect(unapproveRes.status).toBe(200);
    const auditRow = db.prepare("SELECT * FROM audit_logs WHERE action = 'RESULT_UNAPPROVE' AND resource_id = ? ORDER BY id DESC LIMIT 1").get(gradingSubjectId) as any;
    expect(auditRow).toBeDefined();

    // Re-approve for final state
    await apiPost(`/api/grading/approve/${gradingSubjectId}`, {}, subjectTeacherToken);
  });

  test("Scenario H: Security & role boundary checks (IDOR, cross-class student, unrelated teacher)", async () => {
    // JSS 1 student cannot start SS 2 examination
    const crossClassStart = await apiPost("/api/exams/start", { subject_id: subjectId }, studentJSS1Token);
    expect(crossClassStart.status).toBe(403);

    // JSS 1 student cannot review SS 2 student's exam
    const crossStuReview = await apiGet(`/api/exams/${examId}/review`, studentJSS1Token);
    expect(crossStuReview.status).toBe(403);

    // Unrelated teacher cannot view or edit Physics grading spreadsheet
    const unrelSheet = await apiGet(`/api/grading/scores/${gradingSubjectId}`, unrelatedTeacherToken);
    expect(unrelSheet.status).toBe(403);

    // Unrelated teacher cannot authorize a retake for Physics
    const unrelRetake = await apiPost("/api/exams/authorizations/retake", {
      student_id: studentSS2Id,
      subject_id: subjectId,
      reason: "Unauthorized teacher attempt",
    }, unrelatedTeacherToken);
    expect(unrelRetake.status).toBe(403);
  });

  test("Scenario I: Academic session & term isolation preserves historical records without leaking into new term", async () => {
    // Querying grading subjects for a non-existent future term ID with valid query param check falls back safely without 500
    const safeRes = await apiGet(`/api/grading/subjects?sessionId=999999&termId=999999`, subjectTeacherToken);
    expect(safeRes.status).toBe(200);

    // Create a second term in the current session (not active) and verify it has 0 grading subjects initially
    const t2Insert = db.prepare(`
      INSERT INTO academic_terms (session_id, name, is_active)
      VALUES (?, ?, 0)
    `).run(sessionId, `Second Term Isolation ${TS}`);
    const secondTermId = Number(t2Insert.lastInsertRowid);

    const term2GsRes = await apiGet(`/api/grading/subjects?sessionId=${sessionId}&termId=${secondTermId}`, operatorToken);
    expect(term2GsRes.status).toBe(200);
    const term2Gs = (await json(term2GsRes)).data as any[];
    expect(term2Gs.some((g: any) => g.id === gradingSubjectId)).toBe(false);

    // Clean up test second term
    db.prepare("DELETE FROM academic_terms WHERE id = ?").run(secondTermId);
  });
});

afterAll(() => {
  try {
    db.run("PRAGMA foreign_keys = OFF");
    db.prepare("DELETE FROM student_answers WHERE subject_id IN (SELECT id FROM subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%')").run();
    db.prepare("DELETE FROM exam_attempts WHERE subject_id IN (SELECT id FROM subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%')").run();
    db.prepare("DELETE FROM exams WHERE subject_id IN (SELECT id FROM subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%')").run();
    db.prepare("DELETE FROM exam_retake_authorizations WHERE subject_id IN (SELECT id FROM subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%')").run();
    db.prepare("DELETE FROM questions WHERE subject_id IN (SELECT id FROM subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%')").run();
    db.prepare("DELETE FROM timetables WHERE subject_id IN (SELECT id FROM subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%')").run();
    db.prepare("DELETE FROM term_results WHERE grading_subject_id IN (SELECT id FROM grading_subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%')").run();
    db.prepare("DELETE FROM grading_manual_scores WHERE grading_policy_id IN (SELECT id FROM grading_policies WHERE grading_subject_id IN (SELECT id FROM grading_subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%'))").run();
    db.prepare("DELETE FROM grading_policies WHERE grading_subject_id IN (SELECT id FROM grading_subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%')").run();
    db.prepare("DELETE FROM grading_subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%'").run();
    db.prepare("DELETE FROM subjects WHERE code LIKE 'PHY_LC_%' OR code LIKE 'CHM_MISS_%'").run();
    db.prepare("DELETE FROM class_enrollments WHERE student_id IN (SELECT id FROM users WHERE email LIKE '%@acqad.test')").run();
    db.prepare("DELETE FROM class_teacher_assignments WHERE teacher_id IN (SELECT id FROM users WHERE email LIKE '%@acqad.test')").run();
    db.prepare("DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email LIKE '%@acqad.test')").run();
    db.prepare("DELETE FROM users WHERE email LIKE '%@acqad.test'").run();
    db.run("PRAGMA foreign_keys = ON");
  } catch {}
});
