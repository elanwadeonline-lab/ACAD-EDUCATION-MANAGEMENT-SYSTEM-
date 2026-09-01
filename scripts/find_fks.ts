import db from "../db";

function cascadeDeleteSession(sessionId: number, sessionName?: string) {
  const session = sessionName ? { id: sessionId, name: sessionName } : (db.prepare("SELECT id, name FROM academic_sessions WHERE id = ?").get(sessionId) as any);
  if (!session) return;
  const name = session.name;

  // 1. fee_payments
  db.prepare(`
    DELETE FROM fee_payments 
    WHERE fee_id IN (
      SELECT id FROM fee_structures 
      WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
    )
  `).run(sessionId, sessionId);

  // 2. fee_structures
  db.prepare(`
    DELETE FROM fee_structures 
    WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
  `).run(sessionId, sessionId);

  // 3. attendance_records
  db.prepare(`
    DELETE FROM attendance_records 
    WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
  `).run(sessionId, sessionId);

  // 4. grading_student_scores
  db.prepare(`
    DELETE FROM grading_student_scores 
    WHERE grading_scheme_id IN (
      SELECT id FROM grading_schemes 
      WHERE grading_subject_id IN (
        SELECT id FROM grading_subjects 
        WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
      )
    )
  `).run(sessionId, sessionId);

  // 5. grading_calculated_results
  db.prepare(`
    DELETE FROM grading_calculated_results 
    WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
       OR grading_scheme_id IN (
        SELECT id FROM grading_schemes 
        WHERE grading_subject_id IN (
          SELECT id FROM grading_subjects 
          WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
        )
      )
  `).run(sessionId, sessionId, sessionId, sessionId);

  // 6. grading_manual_scores
  db.prepare(`
    DELETE FROM grading_manual_scores 
    WHERE grading_policy_id IN (
      SELECT id FROM grading_policies 
      WHERE grading_subject_id IN (
        SELECT id FROM grading_subjects 
        WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
      )
    )
  `).run(sessionId, sessionId);

  // 7. grading_grade_boundaries, assessments, categories, versions, schemes, policies
  db.prepare(`
    DELETE FROM grading_grade_boundaries 
    WHERE grading_scheme_id IN (
      SELECT id FROM grading_schemes 
      WHERE grading_subject_id IN (
        SELECT id FROM grading_subjects 
        WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
      )
    )
  `).run(sessionId, sessionId);

  db.prepare(`
    DELETE FROM grading_assessments 
    WHERE grading_scheme_id IN (
      SELECT id FROM grading_schemes 
      WHERE grading_subject_id IN (
        SELECT id FROM grading_subjects 
        WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
      )
    )
  `).run(sessionId, sessionId);

  db.prepare(`
    DELETE FROM grading_categories 
    WHERE grading_scheme_id IN (
      SELECT id FROM grading_schemes 
      WHERE grading_subject_id IN (
        SELECT id FROM grading_subjects 
        WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
      )
    )
  `).run(sessionId, sessionId);

  db.prepare(`
    DELETE FROM grading_scheme_versions 
    WHERE grading_scheme_id IN (
      SELECT id FROM grading_schemes 
      WHERE grading_subject_id IN (
        SELECT id FROM grading_subjects 
        WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
      )
    )
  `).run(sessionId, sessionId);

  db.prepare(`
    DELETE FROM grading_schemes 
    WHERE grading_subject_id IN (
      SELECT id FROM grading_subjects 
      WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
    )
  `).run(sessionId, sessionId);

  db.prepare(`
    DELETE FROM grading_policies 
    WHERE grading_subject_id IN (
      SELECT id FROM grading_subjects 
      WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
    )
  `).run(sessionId, sessionId);

  // 8. term_results
  db.prepare(`
    DELETE FROM term_results 
    WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
       OR grading_subject_id IN (
        SELECT id FROM grading_subjects 
        WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
       )
  `).run(sessionId, sessionId, sessionId, sessionId);

  // 9. annual_results
  db.prepare("DELETE FROM annual_results WHERE session_id = ?").run(sessionId);

  // 10. grading_subjects
  db.prepare(`
    DELETE FROM grading_subjects 
    WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
  `).run(sessionId, sessionId);

  // 11. class_enrollments
  db.prepare(`
    DELETE FROM class_enrollments 
    WHERE term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
       OR term_id IN (SELECT id FROM terms WHERE session = ?)
  `).run(sessionId, name);

  // 12. academic_calendar_events
  db.prepare(`
    DELETE FROM academic_calendar_events 
    WHERE term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
       OR term_id IN (SELECT id FROM terms WHERE session = ?)
  `).run(sessionId, name);

  // 13. student_term_remarks
  db.prepare(`
    DELETE FROM student_term_remarks 
    WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)
       OR term IN (SELECT name FROM academic_terms WHERE session_id = ?)
  `).run(sessionId, sessionId, sessionId);

  // 14. un-link session_id and term_id
  db.prepare("UPDATE student_answers SET session_id = NULL, term_id = NULL WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)").run(sessionId, sessionId);
  db.prepare("UPDATE questions SET session_id = NULL, term_id = NULL WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)").run(sessionId, sessionId);
  db.prepare("UPDATE exams SET session_id = NULL, term_id = NULL WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)").run(sessionId, sessionId);
  db.prepare("UPDATE subjects SET session_id = NULL, term_id = NULL WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)").run(sessionId, sessionId);
  db.prepare("UPDATE timetables SET session_id = NULL, term_id = NULL WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)").run(sessionId, sessionId);
  db.prepare("UPDATE users SET session_id = NULL, term_id = NULL WHERE session_id = ? OR term_id IN (SELECT id FROM academic_terms WHERE session_id = ?)").run(sessionId, sessionId);

  // 15. terms & academic_terms
  db.prepare("DELETE FROM terms WHERE session = ?").run(name);
  db.prepare("DELETE FROM academic_terms WHERE session_id = ?").run(sessionId);

  // 16. academic_sessions
  db.prepare("DELETE FROM academic_sessions WHERE id = ?").run(sessionId);
}

console.log("Creating new test session with deep relations...");
const sRes = db.prepare("INSERT INTO academic_sessions (name, is_active, status) VALUES ('Test Clean 8888', 0, 'active')").run();
const sId = Number(sRes.lastInsertRowid);
const tRes = db.prepare("INSERT INTO academic_terms (session_id, name, is_active, status) VALUES (?, 'First Term', 0, 'active')").run(sId);
const tId = Number(tRes.lastInsertRowid);
const fRes = db.prepare("INSERT INTO fee_structures (term_id, session_id, title, amount, is_active) VALUES (?, ?, 'Tuition', 5000, 1)").run(tId, sId);
const fId = Number(fRes.lastInsertRowid);
const uId = (db.prepare("SELECT id FROM users LIMIT 1").get() as any)?.id || 1;
db.prepare("INSERT INTO fee_payments (student_id, fee_id, amount_paid, payment_ref, status, paid_by) VALUES (?, ?, 5000, ?, 'completed', ?)").run(uId, fId, `ref_${Date.now()}`, uId);
db.prepare("INSERT INTO attendance_records (student_id, term_id, session_id, date, status) VALUES (?, ?, ?, '2026-09-01', 'present')").run(uId, tId, sId);
const gsRes = db.prepare("INSERT INTO grading_subjects (name, code, term_id, session_id, teacher_id) VALUES ('Math Test', ?, ?, ?, ?)").run(`MT_${Date.now()}`, tId, sId, uId);
const gsId = Number(gsRes.lastInsertRowid);
const gscRes = db.prepare("INSERT INTO grading_schemes (grading_subject_id, name, created_by) VALUES (?, 'Standard', ?)").run(gsId, uId);
const gscId = Number(gscRes.lastInsertRowid);
db.prepare("INSERT INTO grading_calculated_results (grading_scheme_id, student_id, term_id, session_id, category_breakdown_json, calculated_by) VALUES (?, ?, ?, ?, '{}', ?)").run(gscId, uId, tId, sId, uId);

console.log("Testing cascadeDeleteSession...");
db.transaction(() => {
  cascadeDeleteSession(sId, "Test Clean 8888");
})();

const checkSession = db.prepare("SELECT id FROM academic_sessions WHERE id = ?").get(sId);
console.log("checkSession after delete (should be null):", checkSession);
console.log("CASCADE DELETE SUCCESSFUL!");

