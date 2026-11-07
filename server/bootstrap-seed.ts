import db from "../db";

/**
 * Purges any legacy auto-seeded demo accounts, subjects (MTH101, ENG101, PHY101, CHM101, BIO101),
 * sample questions, and fabricated attendance records that may have been created by earlier
 * bootstrap scripts. Does NOT seed any hardcoded subjects, teachers, students, or guardians.
 */
export async function bootstrapDefaultSystemAccounts(): Promise<void> {
  try {
    const demoUsers = db
      .prepare(
        "SELECT id, email, role FROM users WHERE email IN ('guardian@exampool.ng', 'teacher@exampool.ng', 'student1@exampool.ng') OR reg_id = 'ACQAD/2026/SS2/001'"
      )
      .all() as Array<{ id: number; email: string; role: string }>;

    const demoTeacherIds = demoUsers.filter((u) => u.role === "teacher").map((u) => u.id);
    const demoUserIds = demoUsers.map((u) => u.id);

    // Find any hardcoded bootstrap subjects (by sentinel timestamp, demo teacher, orphaned creator, or hardcoded sample questions)
    const demoSubjects = db
      .prepare(
        `SELECT DISTINCT s.id FROM subjects s
         LEFT JOIN questions q ON q.subject_id = s.id
         WHERE s.exam_datetime = '2026-11-15T09:00:00Z'
            OR (s.code IN ('MTH101', 'ENG101', 'PHY101', 'CHM101', 'BIO101')
                AND (
                  ${demoTeacherIds.length > 0 ? `s.teacher_id IN (${demoTeacherIds.join(",")}) OR s.created_by IN (${demoTeacherIds.join(",")}) OR ` : ""}
                  s.teacher_id NOT IN (SELECT id FROM users)
                  OR s.created_by NOT IN (SELECT id FROM users)
                  OR q.question_text LIKE 'Which of the following represents a foundational principle in %'
                  OR q.question_text LIKE 'Solve for x in the quadratic equation: 2x² - 8x + 6 = 0%'
                ))`
      )
      .all() as Array<{ id: number }>;

    const demoSubjectIds = demoSubjects.map((s) => s.id);

    if (demoUserIds.length === 0 && demoSubjectIds.length === 0) {
      return;
    }

    db.run("PRAGMA foreign_keys = OFF");
    try {
      db.transaction(() => {
        if (demoSubjectIds.length > 0) {
          const subIn = demoSubjectIds.join(",");
          try { db.run(`DELETE FROM student_answers WHERE subject_id IN (${subIn})`); } catch {}
          try { db.run(`DELETE FROM exam_attempts WHERE subject_id IN (${subIn})`); } catch {}
          try { db.run(`DELETE FROM exam_retake_authorizations WHERE subject_id IN (${subIn})`); } catch {}
          try { db.run(`DELETE FROM exams WHERE subject_id IN (${subIn})`); } catch {}
          try { db.run(`DELETE FROM questions WHERE subject_id IN (${subIn})`); } catch {}
          try { db.run(`DELETE FROM subject_enrollments WHERE subject_id IN (${subIn})`); } catch {}
          try { db.run(`DELETE FROM timetables WHERE subject_id IN (${subIn})`); } catch {}
          try { db.run(`DELETE FROM grading_subjects WHERE source_cbt_subject_id IN (${subIn})`); } catch {}
          try { db.run(`DELETE FROM subjects WHERE id IN (${subIn})`); } catch {}
        }

        if (demoUserIds.length > 0) {
          const usrIn = demoUserIds.join(",");
          try { db.run(`DELETE FROM guardian_student_links WHERE guardian_id IN (${usrIn}) OR student_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM attendance_records WHERE student_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM subject_enrollments WHERE student_id IN (${usrIn}) OR enrolled_by IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM class_enrollments WHERE student_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM student_answers WHERE student_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM exam_attempts WHERE student_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM exam_retake_authorizations WHERE student_id IN (${usrIn}) OR authorized_by IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM exams WHERE student_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM grading_subjects WHERE teacher_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM notifications WHERE user_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM user_tokens WHERE user_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM user_devices WHERE user_id IN (${usrIn})`); } catch {}
          try { db.run(`DELETE FROM users WHERE id IN (${usrIn})`); } catch {}
        }
      })();
      console.log(
        `[bootstrap] Purged ${demoSubjectIds.length} hardcoded demo subject(s) and ${demoUserIds.length} hardcoded demo user account(s).`
      );
    } finally {
      db.run("PRAGMA foreign_keys = ON");
    }
  } catch (err) {
    console.error("[bootstrap] Cleanup warning:", err);
  }
}
