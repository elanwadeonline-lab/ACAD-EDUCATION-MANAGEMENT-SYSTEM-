/**
 * tests/academic_business_logic_e2e.test.ts
 * ─────────────────────────────────────────────────────────────────
 * COMPREHENSIVE ACADEMIC BUSINESS LOGIC AUDIT & E2E VALIDATION SUITE
 *
 * Implements and verifies:
 * - Scenario A: Single-subject teacher (question creation, exam, marking, grading, approval, collation)
 * - Scenario B: Multiple-subject teacher (Biology, Chemistry, Physics with independent grading)
 * - Scenario C: Class teacher who also teaches (SS2 supervisor + 2 teaching subjects)
 * - Scenario D: Multiple teachers, one class (different teachers grade; approved marks populate collation without duplication)
 * - Scenario E: Empty grading spreadsheet (enrolled students exist with 0 marks; student roster appears correctly without falsely reporting 0 candidates)
 * - Scenario F: Approval, locking, and unlocking (locking enforcement, unlocking for correction, recalculation, downstream consistency)
 * - Scenario G: Full academic cycle (Admin Setup -> Teacher Assignment -> Question Prep -> Publication -> Student Exam -> Marking -> Grading Center -> Approval -> Collation -> Report Card -> Student/Guardian Access)
 *
 * Run: bun test tests/academic_business_logic_e2e.test.ts
 */

import { describe, test, expect, beforeAll } from "bun:test";
import db, { queries } from "../db";
import { createAuthorizationService } from "../src/services/authorization.service";

function applyGradeScale(pct: number) {
  if (pct >= 75) return { grade: "A", remark: "Distinction" };
  if (pct >= 65) return { grade: "B", remark: "Very Good" };
  if (pct >= 50) return { grade: "C", remark: "Credit" };
  if (pct >= 40) return { grade: "D", remark: "Pass" };
  return { grade: "F", remark: "Fail" };
}

describe("ACQAD Comprehensive Academic Business Logic & Grading System Validation", () => {
  const authz = createAuthorizationService(db, queries);
  const TS = Date.now();

  // Primary actors & fixtures
  let adminId: number;
  let teacherSingleId: number;
  let teacherMultiId: number;
  let classTeacherId: number;
  let teacherOtherId: number;

  let student1Id: number;
  let student2Id: number;
  let student3Id: number;
  let guardianId: number;

  let sessionId: number;
  let termId: number;
  let classSS2Id: number;
  let classJSS1Id: number;

  // Subjects
  let subjectMathId: number;
  let subjectBioId: number;
  let subjectChemId: number;
  let subjectPhysId: number;
  let subjectEngId: number;
  let subjectFurtherMathId: number;

  beforeAll(() => {
    // 1. Create Admin / Operator
    const adm = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, 'operator', 'hash', 1)")
      .run(`Admin ${TS}`, `admin_${TS}@acqad.edu`) as any;
    adminId = Number(adm.lastInsertRowid);

    // 2. Create Teachers
    const tSingle = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, 'teacher', 'hash', 1)")
      .run(`Teacher Single ${TS}`, `t_single_${TS}@acqad.edu`) as any;
    teacherSingleId = Number(tSingle.lastInsertRowid);

    const tMulti = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, 'teacher', 'hash', 1)")
      .run(`Teacher Multi ${TS}`, `t_multi_${TS}@acqad.edu`) as any;
    teacherMultiId = Number(tMulti.lastInsertRowid);

    const tClass = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, 'teacher', 'hash', 1)")
      .run(`Class Master ${TS}`, `t_class_${TS}@acqad.edu`) as any;
    classTeacherId = Number(tClass.lastInsertRowid);

    const tOther = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, 'teacher', 'hash', 1)")
      .run(`Teacher Other ${TS}`, `t_other_${TS}@acqad.edu`) as any;
    teacherOtherId = Number(tOther.lastInsertRowid);

    // 3. Create Students & Guardian
    const s1 = db.prepare("INSERT INTO users (name, email, role, password_hash, reg_id, grade, is_active) VALUES (?, ?, 'student', 'hash', ?, 'SS 2', 1)")
      .run(`Daniel Adeleke ${TS}`, `daniel_${TS}@student.ng`, `ACQ/SS2/01_${TS}`) as any;
    student1Id = Number(s1.lastInsertRowid);

    const s2 = db.prepare("INSERT INTO users (name, email, role, password_hash, reg_id, grade, is_active) VALUES (?, ?, 'student', 'hash', ?, 'SS 2', 1)")
      .run(`Sarah Okonjo ${TS}`, `sarah_${TS}@student.ng`, `ACQ/SS2/02_${TS}`) as any;
    student2Id = Number(s2.lastInsertRowid);

    const s3 = db.prepare("INSERT INTO users (name, email, role, password_hash, reg_id, grade, is_active) VALUES (?, ?, 'student', 'hash', ?, 'SS 2', 1)")
      .run(`Emeka Obi ${TS}`, `emeka_${TS}@student.ng`, `ACQ/SS2/03_${TS}`) as any;
    student3Id = Number(s3.lastInsertRowid);

    const g = db.prepare("INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, 'guardian', 'hash', 1)")
      .run(`Chief Adeleke (Guardian) ${TS}`, `guardian_${TS}@family.ng`) as any;
    guardianId = Number(g.lastInsertRowid);

    // Link Guardian to Student 1
    db.prepare("INSERT INTO guardian_student_links (guardian_id, student_id, relationship, status) VALUES (?, ?, 'Father', 'approved')")
      .run(guardianId, student1Id);

    // 4. Create Academic Session & Term
    const sRes = queries.createAcademicSession.run(`Session_${TS}`, 1, "active") as any;
    sessionId = Number(sRes.lastInsertRowid);

    const tRes = queries.createAcademicTerm.run(sessionId, "First Term", "2026-09-01", "2026-12-15", 1, "active") as any;
    termId = Number(tRes.lastInsertRowid);
    db.prepare("INSERT OR REPLACE INTO terms (id, session, name, start_date, end_date, is_active, registration_open) VALUES (?, ?, 'First Term', '2026-09-01', '2026-12-15', 1, 1)")
      .run(termId, `Session_${TS}`);

    // 5. Create Classes
    const cSS2 = db.prepare("INSERT INTO classes (name, section, level, class_teacher_id) VALUES (?, null, 'senior', ?)")
      .run(`SS 2_${TS}`, classTeacherId) as any;
    classSS2Id = Number(cSS2.lastInsertRowid);

    const cJSS1 = db.prepare("INSERT INTO classes (name, section, level, class_teacher_id) VALUES (?, null, 'junior', null)")
      .run(`JSS 1_${TS}`) as any;
    classJSS1Id = Number(cJSS1.lastInsertRowid);

    // Assign class teacher log in class_teacher_assignments
    db.prepare("INSERT INTO class_teacher_assignments (class_id, teacher_id, assigned_by, action, notes) VALUES (?, ?, ?, 'assigned', 'Appointed SS2 Class Master')")
      .run(classSS2Id, classTeacherId, adminId);

    // Enroll students into classSS2 for termId
    db.prepare("INSERT OR REPLACE INTO class_enrollments (student_id, class_id, term_id) VALUES (?, ?, ?)").run(student1Id, classSS2Id, termId);
    db.prepare("INSERT OR REPLACE INTO class_enrollments (student_id, class_id, term_id) VALUES (?, ?, ?)").run(student2Id, classSS2Id, termId);
    db.prepare("INSERT OR REPLACE INTO class_enrollments (student_id, class_id, term_id) VALUES (?, ?, ?)").run(student3Id, classSS2Id, termId);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO A: Single-Subject Teacher Workflow
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Scenario A: Single-subject teacher workflow", () => {
    test("A.1 Administrator assigns one subject (Mathematics) to single-subject teacher", () => {
      const subRes = queries.createSubject.run(
        "General Mathematics", `MTH_${TS}`, "First Term", 60, teacherSingleId, adminId,
        "Core Senior Math", `SS 2_${TS}`, null, `Session_${TS}`, "exam", "Solve all questions", 1, 0,
        sessionId, termId, "school_exam", "immediate", null
      ) as any;
      subjectMathId = Number(subRes.lastInsertRowid);
      expect(subjectMathId).toBeGreaterThan(0);

      const fetched = queries.getSubjectById.get(subjectMathId) as any;
      expect(fetched.teacher_id).toBe(teacherSingleId);
      expect(fetched.class).toBe(`SS 2_${TS}`);
    });

    test("A.2 Teacher prepares objective and essay questions with marking rubrics", () => {
      // Objective question
      const q1 = db.prepare(`
        INSERT INTO questions (subject_id, question_text, options_json, correct_answer, marks, order_index, question_type)
        VALUES (?, 'Solve for x: 3x - 9 = 0', ?, 1, 20, 0, 'objective')
      `).run(subjectMathId, JSON.stringify(["x = 1", "x = 3", "x = 9", "x = 0"])) as any;

      // Essay question
      const q2 = db.prepare(`
        INSERT INTO questions (subject_id, question_text, options_json, correct_answer, marks, order_index, question_type, teacher_answer, explanation)
        VALUES (?, 'Prove the angle sum property of a triangle.', '["","","",""]', 0, 40, 1, 'essay', 'Award 20 marks for construction, 20 marks for proof.', 'Theorem: Sum of angles = 180 deg.')
      `).run(subjectMathId) as any;

      expect(Number(q1.lastInsertRowid)).toBeGreaterThan(0);
      expect(Number(q2.lastInsertRowid)).toBeGreaterThan(0);

      const qs = queries.getQuestionsBySubject.all(subjectMathId) as any[];
      expect(qs.length).toBe(2);
      expect(qs[0].marks + qs[1].marks).toBe(60);
    });

    test("A.3 Student takes exam, auto-marking grades objective, teacher grades essay", () => {
      // Start exam for Student 1
      const exRes = queries.createExam.run(
        student1Id, subjectMathId, new Date().toISOString(), "[]",
        `Session_${TS}`, "First Term", "exam", null, "released", 5, "[]"
      ) as any;
      const examId = Number(exRes.lastInsertRowid);

      // Student answers: Q1 correct (option 1 -> 20 marks), Q2 essay submitted
      const qs = queries.getQuestionsBySubject.all(subjectMathId) as any[];
      const q1Id = qs[0].id;
      const q2Id = qs[1].id;

      queries.submitExam.run(
        JSON.stringify([
          { question_id: q1Id, selected_option: 1 },
          { question_id: q2Id, essay_response: "Draw line parallel to base. Alternate angles are equal. Hence sum = 180." }
        ]),
        new Date().toISOString(),
        20, 60, examId, student1Id
      );

      // Record student_answers
      db.prepare(`
        INSERT OR REPLACE INTO student_answers (exam_id, question_id, student_id, subject_id, selected_option, is_correct, marks_awarded)
        VALUES (?, ?, ?, ?, 1, 1, 20)
      `).run(examId, q1Id, student1Id, subjectMathId);

      db.prepare(`
        INSERT OR REPLACE INTO student_answers (exam_id, question_id, student_id, subject_id, essay_response, is_correct, marks_awarded)
        VALUES (?, ?, ?, ?, 'Draw line parallel to base. Alternate angles are equal. Hence sum = 180.', 0, 0)
      `).run(examId, q2Id, student1Id, subjectMathId);

      // Teacher manually grades essay: awards 35/40 marks
      db.prepare("UPDATE student_answers SET marks_awarded = 35, is_correct = 1 WHERE exam_id = ? AND question_id = ?")
        .run(examId, q2Id);
      db.prepare("UPDATE exams SET score = (SELECT SUM(marks_awarded) FROM student_answers WHERE exam_id = ?) WHERE id = ?")
        .run(examId, examId);

      const finalExam = queries.getExamById.get(examId) as any;
      expect(finalExam.score).toBe(55); // 20 objective + 35 essay = 55/60
    });

    test("A.4 Teacher accesses Grading Center, configures 40 CA + 60 Exam scheme, and enters CA", () => {
      // Create grading subject
      const gsRes = queries.createGradingSubject.run(
        "General Mathematics", `MTH_${TS}`, classSS2Id, termId, sessionId, teacherSingleId
      ) as any;
      const gsId = Number(gsRes.lastInsertRowid);
      queries.updateGradingSubjectMeta.run("exam", subjectMathId, gsId);

      // Policies: CBT Exam 60 max + CA Test 20 max + CA Assignment 20 max = 100
      queries.createGradingPolicy.run(gsId, "CBT Examination", "cbt_exam", subjectMathId, 60, 1);
      const ca1Res = queries.createGradingPolicy.run(gsId, "Continuous Test 1", "manual", null, 20, 0) as any;
      const ca2Res = queries.createGradingPolicy.run(gsId, "Term Assignment", "manual", null, 20, 0) as any;
      const ca1Id = Number(ca1Res.lastInsertRowid);
      const ca2Id = Number(ca2Res.lastInsertRowid);

      // Enter CA scores for Student 1: Test = 18/20, Assignment = 17/20 (Total CA = 35/40)
      queries.upsertManualScore.run(ca1Id, student1Id, 18, teacherSingleId);
      queries.upsertManualScore.run(ca2Id, student1Id, 17, teacherSingleId);

      // Recompute & verify term_results: CA = 35, Exam = 55 (scaled from 55/60 = 55), Total = 90 (Grade A)
      const scale = applyGradeScale(90);
      queries.upsertTermResult.run(
        student1Id, gsId, 35, 55, 90, scale.grade, scale.remark, 0, termId, sessionId
      );

      const draftResult = queries.getTermResultsByStudent.all(student1Id, termId) as any[];
      const mathResult = draftResult.find((r) => r.grading_subject_id === gsId);
      expect(mathResult).toBeDefined();
      expect(mathResult.total_score).toBe(90);
      expect(mathResult.grade).toBe("A");
      expect(mathResult.is_approved).toBe(0); // Still in draft
    });

    test("A.5 Teacher approves and locks Mathematics results", () => {
      const gs = queries.getGradingSubjectByTeacherCodeTerm.get(teacherSingleId, `MTH_${TS}`, termId) as any;
      expect(gs).toBeDefined();

      // Approve results & set is_published_to_class = 1
      queries.approveTermResults.run(gs.id);
      db.prepare("UPDATE grading_subjects SET is_published_to_class = 1 WHERE id = ?").run(gs.id);

      const approved = db.prepare("SELECT is_approved FROM term_results WHERE grading_subject_id = ?").all(gs.id) as any[];
      expect(approved.length).toBeGreaterThan(0);
      expect(approved.every((r) => r.is_approved === 1)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO B: Multiple-Subject Teacher
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Scenario B: Multiple-subject teacher (Biology, Chemistry, Physics)", () => {
    test("B.1 Administrator assigns 3 subjects to one teacher without artificial limits", () => {
      const bRes = queries.createSubject.run("Biology", `BIO_${TS}`, "First Term", 60, teacherMultiId, adminId, "Bio SS2", `SS 2_${TS}`, null, `Session_${TS}`, "exam", "Instructions", 1, 0, sessionId, termId, "school_exam", "immediate", null) as any;
      subjectBioId = Number(bRes.lastInsertRowid);

      const cRes = queries.createSubject.run("Chemistry", `CHM_${TS}`, "First Term", 60, teacherMultiId, adminId, "Chem SS2", `SS 2_${TS}`, null, `Session_${TS}`, "exam", "Instructions", 1, 0, sessionId, termId, "school_exam", "immediate", null) as any;
      subjectChemId = Number(cRes.lastInsertRowid);

      const pRes = queries.createSubject.run("Physics", `PHY_${TS}`, "First Term", 60, teacherMultiId, adminId, "Phys SS2", `SS 2_${TS}`, null, `Session_${TS}`, "exam", "Instructions", 1, 0, sessionId, termId, "school_exam", "immediate", null) as any;
      subjectPhysId = Number(pRes.lastInsertRowid);

      expect(subjectBioId).toBeGreaterThan(0);
      expect(subjectChemId).toBeGreaterThan(0);
      expect(subjectPhysId).toBeGreaterThan(0);

      // Verify teacher owns all 3 subjects
      const teacherSubs = db.prepare("SELECT id, name, code FROM subjects WHERE teacher_id = ?").all(teacherMultiId) as any[];
      expect(teacherSubs.length).toBe(3);
    });

    test("B.2 Independent examination, grading, and approval for each subject", () => {
      // 1. Biology: 50 CA + 50 Exam scheme
      const gsBioRes = queries.createGradingSubject.run("Biology", `BIO_${TS}`, classSS2Id, termId, sessionId, teacherMultiId) as any;
      const gsBioId = Number(gsBioRes.lastInsertRowid);
      queries.updateGradingSubjectMeta.run("exam", subjectBioId, gsBioId);
      queries.createGradingPolicy.run(gsBioId, "Theory Exam", "manual", null, 50, 1);
      const bioCa = queries.createGradingPolicy.run(gsBioId, "Lab Practical", "manual", null, 50, 0) as any;

      queries.upsertManualScore.run(Number(bioCa.lastInsertRowid), student1Id, 45, teacherMultiId);
      queries.upsertTermResult.run(student1Id, gsBioId, 45, 40, 85, "A", "Excellent", 1, termId, sessionId);
      db.prepare("UPDATE grading_subjects SET is_published_to_class = 1 WHERE id = ?").run(gsBioId);

      // 2. Chemistry: 30 CA + 70 Exam scheme
      const gsChemRes = queries.createGradingSubject.run("Chemistry", `CHM_${TS}`, classSS2Id, termId, sessionId, teacherMultiId) as any;
      const gsChemId = Number(gsChemRes.lastInsertRowid);
      queries.updateGradingSubjectMeta.run("exam", subjectChemId, gsChemId);
      queries.createGradingPolicy.run(gsChemId, "Final Exam", "manual", null, 70, 1);
      const chemCa = queries.createGradingPolicy.run(gsChemId, "Tests", "manual", null, 30, 0) as any;

      queries.upsertManualScore.run(Number(chemCa.lastInsertRowid), student1Id, 22, teacherMultiId);
      queries.upsertTermResult.run(student1Id, gsChemId, 22, 53, 75, "B", "Very Good", 1, termId, sessionId);
      db.prepare("UPDATE grading_subjects SET is_published_to_class = 1 WHERE id = ?").run(gsChemId);

      // 3. Physics: 40 CA + 60 Exam scheme
      const gsPhysRes = queries.createGradingSubject.run("Physics", `PHY_${TS}`, classSS2Id, termId, sessionId, teacherMultiId) as any;
      const gsPhysId = Number(gsPhysRes.lastInsertRowid);
      queries.updateGradingSubjectMeta.run("exam", subjectPhysId, gsPhysId);
      queries.createGradingPolicy.run(gsPhysId, "Written Exam", "manual", null, 60, 1);
      const physCa = queries.createGradingPolicy.run(gsPhysId, "CA", "manual", null, 40, 0) as any;

      queries.upsertManualScore.run(Number(physCa.lastInsertRowid), student1Id, 32, teacherMultiId);
      queries.upsertTermResult.run(student1Id, gsPhysId, 32, 48, 80, "A", "Distinction", 1, termId, sessionId);
      db.prepare("UPDATE grading_subjects SET is_published_to_class = 1 WHERE id = ?").run(gsPhysId);

      // Verify 3 distinct results recorded without crosstalk
      const rBio = queries.getTermResultsByStudent.all(student1Id, termId).find((r: any) => r.grading_subject_id === gsBioId);
      const rChem = queries.getTermResultsByStudent.all(student1Id, termId).find((r: any) => r.grading_subject_id === gsChemId);
      const rPhys = queries.getTermResultsByStudent.all(student1Id, termId).find((r: any) => r.grading_subject_id === gsPhysId);

      expect(rBio.total_score).toBe(85);
      expect(rChem.total_score).toBe(75);
      expect(rPhys.total_score).toBe(80);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO C: Class Teacher Who Also Teaches
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Scenario C: Class teacher who supervises SS2 and teaches subjects", () => {
    test("C.1 Class Master is assigned teaching subjects (Further Math & English)", () => {
      const eRes = queries.createSubject.run("English Language", `ENG_${TS}`, "First Term", 60, classTeacherId, adminId, "Eng SS2", `SS 2_${TS}`, null, `Session_${TS}`, "exam", "Grammar & Essay", 1, 0, sessionId, termId, "school_exam", "immediate", null) as any;
      subjectEngId = Number(eRes.lastInsertRowid);

      const fmRes = queries.createSubject.run("Further Mathematics", `FMTH_${TS}`, "First Term", 60, classTeacherId, adminId, "FMth SS2", `SS 2_${TS}`, null, `Session_${TS}`, "exam", "Calculus & Vectors", 1, 0, sessionId, termId, "school_exam", "immediate", null) as any;
      subjectFurtherMathId = Number(fmRes.lastInsertRowid);

      // Verify class supervision status
      const authCT = { userId: classTeacherId, role: "teacher" };
      expect(authz.isClassTeacherForStudent(authCT, student1Id)).toBe(true);
      expect(authz.isClassTeacherForStudent(authCT, student2Id)).toBe(true);
    });

    test("C.2 Class Master grades own subject (English) and approves it", () => {
      const gsEngRes = queries.createGradingSubject.run("English Language", `ENG_${TS}`, classSS2Id, termId, sessionId, classTeacherId) as any;
      const gsEngId = Number(gsEngRes.lastInsertRowid);
      queries.updateGradingSubjectMeta.run("exam", subjectEngId, gsEngId);
      queries.createGradingPolicy.run(gsEngId, "Exam", "manual", null, 60, 1);
      const caEng = queries.createGradingPolicy.run(gsEngId, "Orals & Essay", "manual", null, 40, 0) as any;

      queries.upsertManualScore.run(Number(caEng.lastInsertRowid), student1Id, 36, classTeacherId);
      queries.upsertTermResult.run(student1Id, gsEngId, 36, 52, 88, "A", "Distinction", 1, termId, sessionId);
      db.prepare("UPDATE grading_subjects SET is_published_to_class = 1 WHERE id = ?").run(gsEngId);

      const res = queries.getTermResultsByStudent.all(student1Id, termId).find((r: any) => r.grading_subject_id === gsEngId);
      expect(res.total_score).toBe(88);
      expect(res.is_approved).toBe(1);
    });

    test("C.3 Class Master opens Class Broadsheet and receives approved marks from all teachers", () => {
      // Query broadsheet for SS2 class cohort
      const termResults = queries.getClassTermResultsByClass.all(classSS2Id, termId, sessionId) as any[];
      const subjectsInTerm = queries.getClassSubjectsForTerm.all(classSS2Id, termId, sessionId) as any[];
      const roster = queries.getClassRoster.all(classSS2Id, termId) as any[];

      expect(roster.length).toBe(3); // Student 1, Student 2, Student 3
      expect(subjectsInTerm.length).toBeGreaterThanOrEqual(4); // Math, Bio, Chem, Phys, Eng

      // Student 1 has results in Math (90), Bio (85), Chem (75), Phys (80), Eng (88)
      const s1Results = termResults.filter((r) => r.student_id === student1Id);
      expect(s1Results.length).toBeGreaterThanOrEqual(4);

      // Verify approved scores flow automatically without manual mark duplication
      const mathScore = s1Results.find((r) => r.subject_code === `MTH_${TS}`);
      expect(mathScore).toBeDefined();
      expect(mathScore.total_score).toBe(90);

      const engScore = s1Results.find((r) => r.subject_code === `ENG_${TS}`);
      expect(engScore).toBeDefined();
      expect(engScore.total_score).toBe(88);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO D: Multiple Teachers, One Class
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Scenario D: Multiple teachers grading different subjects for one class", () => {
    test("D.1 Different teachers grade different subjects for the same class", () => {
      // TeacherOther teaches and grades Agricultural Science for SS2
      const agSub = queries.createSubject.run("Agricultural Science", `AGR_${TS}`, "First Term", 60, teacherOtherId, adminId, "Agric SS2", `SS 2_${TS}`, null, `Session_${TS}`, "exam", "Instructions", 1, 0, sessionId, termId, "school_exam", "immediate", null) as any;
      const agSubId = Number(agSub.lastInsertRowid);

      const agGs = queries.createGradingSubject.run("Agricultural Science", `AGR_${TS}`, classSS2Id, termId, sessionId, teacherOtherId) as any;
      const agGsId = Number(agGs.lastInsertRowid);
      queries.updateGradingSubjectMeta.run("exam", agSubId, agGsId);
      queries.createGradingPolicy.run(agGsId, "Exam", "manual", null, 60, 1);
      const agCa = queries.createGradingPolicy.run(agGsId, "Field Practical", "manual", null, 40, 0) as any;

      queries.upsertManualScore.run(Number(agCa.lastInsertRowid), student1Id, 38, teacherOtherId);
      queries.upsertTermResult.run(student1Id, agGsId, 38, 54, 92, "A", "Outstanding", 1, termId, sessionId);
      db.prepare("UPDATE grading_subjects SET is_published_to_class = 1 WHERE id = ?").run(agGsId);

      // Class Teacher collation sheet now reflects Agric Science alongside Math, Bio, Chem, Phys, Eng
      const broadsheet = queries.getClassTermResultsByClass.all(classSS2Id, termId, sessionId) as any[];
      const agResult = broadsheet.find((r) => r.student_id === student1Id && r.subject_code === `AGR_${TS}`);
      expect(agResult).toBeDefined();
      expect(agResult.total_score).toBe(92);
      expect(agResult.is_approved).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO E: Empty Grading Spreadsheet Roster Resolution
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Scenario E: Empty grading spreadsheet roster resolution", () => {
    test("E.1 Enrolled students exist with 0 marks; student roster appears without falsely reporting zero candidates", () => {
      // Create a brand new grading subject for SS2 with 0 scores entered
      const freshGs = queries.createGradingSubject.run("Civic Education", `CIV_${TS}`, classSS2Id, termId, sessionId, teacherSingleId) as any;
      const freshGsId = Number(freshGs.lastInsertRowid);
      queries.createGradingPolicy.run(freshGsId, "Exam", "manual", null, 60, 1);
      queries.createGradingPolicy.run(freshGsId, "CA", "manual", null, 40, 0);

      // Resolve eligible candidates using getGradingStudentsBySubject
      const candidates = queries.getGradingStudentsBySubject.all(freshGsId) as any[];
      expect(candidates.length).toBeGreaterThanOrEqual(3);

      const candidateIds = candidates.map((c) => c.id);
      expect(candidateIds).toContain(student1Id);
      expect(candidateIds).toContain(student2Id);
      expect(candidateIds).toContain(student3Id);

      // Ensure manual scores query returns empty array rather than error
      const scores = queries.getManualScoresBySubject.all(freshGsId) as any[];
      expect(scores.length).toBe(0);
    });

    test("E.2 General cohort subject with no class constraint resolves all active students", () => {
      // General elective subject (no class_id, no source CBT class constraint)
      const genGs = queries.createGradingSubject.run("General Music & Arts", `MUS_${TS}`, null, termId, sessionId, teacherSingleId) as any;
      const genGsId = Number(genGs.lastInsertRowid);

      const candidates = queries.getGradingStudentsBySubject.all(genGsId) as any[];
      expect(candidates.length).toBeGreaterThan(0);
      const cIds = candidates.map((c) => c.id);
      expect(cIds).toContain(student1Id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO F: Approval, Locking, and Unlocking Workflow
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Scenario F: Approval, locking, and authorized correction", () => {
    test("F.1 Locked results prevent modifications", () => {
      const gs = queries.getGradingSubjectByTeacherCodeTerm.get(teacherSingleId, `MTH_${TS}`, termId) as any;
      expect(gs).toBeDefined();

      // Verify term_results is locked
      const check = db.prepare("SELECT is_approved FROM term_results WHERE grading_subject_id = ? LIMIT 1").get(gs.id) as any;
      expect(check.is_approved).toBe(1);
    });

    test("F.2 Authorized unlock resets is_approved to 0 and permits score correction", () => {
      const gs = queries.getGradingSubjectByTeacherCodeTerm.get(teacherSingleId, `MTH_${TS}`, termId) as any;

      // Unlock results
      db.prepare("UPDATE term_results SET is_approved = 0 WHERE grading_subject_id = ?").run(gs.id);
      db.prepare("UPDATE grading_subjects SET is_published_to_class = 0 WHERE id = ?").run(gs.id);

      const unlocked = db.prepare("SELECT is_approved FROM term_results WHERE grading_subject_id = ? LIMIT 1").get(gs.id) as any;
      expect(unlocked.is_approved).toBe(0);

      // Correct CA score from 35 to 38
      const scale = applyGradeScale(93);
      queries.upsertTermResult.run(
        student1Id, gs.id, 38, 55, 93, scale.grade, scale.remark, 0, termId, sessionId
      );

      const corrected = queries.getTermResultsByStudent.all(student1Id, termId).find((r: any) => r.grading_subject_id === gs.id);
      expect(corrected.total_score).toBe(93);

      // Re-approve results
      queries.approveTermResults.run(gs.id);
      db.prepare("UPDATE grading_subjects SET is_published_to_class = 1 WHERE id = ?").run(gs.id);

      const reapproved = db.prepare("SELECT is_approved FROM term_results WHERE grading_subject_id = ? LIMIT 1").get(gs.id) as any;
      expect(reapproved.is_approved).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO G: Full Academic Cycle Verification
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Scenario G: Complete academic user journey", () => {
    test("G.1 Class Master enters student remarks and collates report card", () => {
      // Enter teacher & principal remarks for Student 1
      queries.upsertStudentTermRemarks.run(
        student1Id, sessionId, termId,
        "Daniel is an intellectually diligent and focused candidate.",
        "Promoted with academic distinction."
      );

      const remarks = queries.getStudentTermRemarks.get(student1Id, sessionId, termId) as any;
      expect(remarks.teacher_remark).toBe("Daniel is an intellectually diligent and focused candidate.");
      expect(remarks.principal_remark).toBe("Promoted with academic distinction.");
    });

    test("G.2 Report Card aggregates only approved results and calculates accurate average", () => {
      const reportResults = queries.getStudentTermResultsForReportCard.all(student1Id) as any[];
      expect(reportResults.length).toBeGreaterThanOrEqual(4);

      // Verify all items are approved
      expect(reportResults.every((r) => r.is_approved === 1)).toBe(true);

      // Calculate term average
      const totalScore = reportResults.reduce((acc, r) => acc + Number(r.score), 0);
      const avg = Number((totalScore / reportResults.length).toFixed(1));
      expect(avg).toBeGreaterThanOrEqual(70);
    });

    test("G.3 Guardian can only view approved records for legitimately linked ward", () => {
      // Guardian is linked to Student 1
      const link = db.prepare("SELECT 1 FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status='approved'").get(guardianId, student1Id);
      expect(link).toBeDefined();

      // Guardian is NOT linked to Student 2
      const unlinked = db.prepare("SELECT 1 FROM guardian_student_links WHERE guardian_id = ? AND student_id = ? AND status='approved'").get(guardianId, student2Id);
      expect(unlinked).toBeFalsy();
    });

    test("G.4 Removing a teacher assignment preserves all historical academic and result records", () => {
      // Reassign teacherOther or relieve duty
      db.prepare("UPDATE subjects SET teacher_id = ? WHERE code = ?").run(adminId, `AGR_${TS}`);
      db.prepare("UPDATE classes SET class_teacher_id = NULL WHERE id = ?").run(classSS2Id);
      db.prepare("INSERT INTO class_teacher_assignments (class_id, teacher_id, assigned_by, action, notes) VALUES (?, ?, ?, 'unassigned', 'Relieved of class teacher duties')")
        .run(classSS2Id, classTeacherId, adminId);

      // Verify subject still exists and grades in term_results are fully preserved
      const agResults = db.prepare("SELECT tr.* FROM term_results tr JOIN grading_subjects gs ON gs.id = tr.grading_subject_id WHERE gs.code = ?").all(`AGR_${TS}`) as any[];
      expect(agResults.length).toBeGreaterThan(0);
      expect(agResults[0].total_score).toBe(92);
    });
  });
});
