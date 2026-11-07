import db from "../db";
import { hashPassword } from "../auth";

export async function bootstrapDefaultSystemAccounts(): Promise<void> {
  try {
    // If an operator (school administrator) exists, the school onboarding setup has been completed.
    // Skip demo bootstrap to protect production records and prevent overriding school data.
    const operator = db.prepare("SELECT id FROM users WHERE role = 'operator' LIMIT 1").get();
    if (operator) {
      console.log("[bootstrap] Administrator account exists. Preserving production records.");
      return;
    }

    const passwordHash = await hashPassword("password");

    // 1. Ensure guardian exists (initial seed only)
    let guardian = db.prepare("SELECT id FROM users WHERE email = 'guardian@exampool.ng'").get() as any;
    if (!guardian) {
      const gRes = db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_active, phone, address) VALUES (?, ?, 'guardian', ?, 1, ?, ?)"
      ).run("Chief John Doe (Guardian)", "guardian@exampool.ng", passwordHash, "+234 801 234 5678", "14 Victoria Island Crescent, Lagos");
      guardian = { id: Number(gRes.lastInsertRowid) };
      console.log("[bootstrap] Initialized default guardian: guardian@exampool.ng");
    } else {
      db.prepare("UPDATE users SET is_active = 1 WHERE id = ?").run(guardian.id);
    }

    // 2. Ensure default teacher exists (with password 'password')
    let teacher = db.prepare("SELECT id FROM users WHERE email = 'teacher@exampool.ng' OR role = 'teacher' LIMIT 1").get() as any;
    let teacherId: number;
    if (!teacher) {
      const tRes = db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_active, phone) VALUES (?, ?, 'teacher', ?, 1, ?)"
      ).run("Mr. Samuel Adeleke (Mathematics & Sciences)", "teacher@exampool.ng", passwordHash, "+234 802 345 6789");
      teacherId = Number(tRes.lastInsertRowid);
      console.log("[bootstrap] Created default teacher: teacher@exampool.ng / password");
    } else {
      teacherId = Number(teacher.id);
      db.prepare("UPDATE users SET is_active = 1 WHERE id = ?").run(teacherId);
    }

    // 3. Ensure student (Daniel Adeleke) exists
    let student = db.prepare("SELECT id FROM users WHERE email = 'student1@exampool.ng' OR name LIKE '%Daniel Adeleke%'").get() as any;
    let studentId: number;
    if (!student) {
      const sRes = db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_active, grade, reg_id) VALUES (?, ?, 'student', ?, 1, 'SS 2', 'ACQAD/2026/SS2/001')"
      ).run("Daniel Adeleke", "student1@exampool.ng", passwordHash);
      studentId = Number(sRes.lastInsertRowid);
      console.log("[bootstrap] Created default student: Daniel Adeleke (SS 2)");
    } else {
      studentId = Number(student.id);
      db.prepare("UPDATE users SET is_active = 1, grade = 'SS 2' WHERE id = ?").run(studentId);
    }

    // 4. Ensure guardian-student link
    db.run(`
      CREATE TABLE IF NOT EXISTS guardian_student_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guardian_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        relationship TEXT DEFAULT 'Parent/Guardian',
        status TEXT DEFAULT 'approved',
        verification_method TEXT DEFAULT 'manual_admin' CHECK(verification_method IN ('manual_admin','dob_match','pin_match')),
        verified_by_data TEXT,
        verified_by INTEGER,
        verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guardian_id, student_id)
      )
    `);

    db.prepare(`
      INSERT OR REPLACE INTO guardian_student_links 
      (guardian_id, student_id, relationship, status, verification_method, verified_at)
      VALUES (?, ?, 'Father', 'approved', 'manual_admin', CURRENT_TIMESTAMP)
    `).run(guardian.id, studentId);

    // 5. Ensure academic session & term
    db.run(`
      CREATE TABLE IF NOT EXISTS academic_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        is_active INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT
      )
    `);

    let activeSession = db.prepare("SELECT id FROM academic_sessions WHERE is_active = 1").get() as any;
    if (!activeSession) {
      db.prepare(
        "INSERT OR IGNORE INTO academic_sessions (name, is_active, start_date, end_date) VALUES ('2025/2026', 1, '2025-09-01', '2026-07-31')"
      ).run();
      activeSession = db.prepare("SELECT id FROM academic_sessions WHERE name = '2025/2026'").get() as any;
    }

    let activeTerm = db.prepare("SELECT id FROM terms WHERE is_active = 1").get() as any;
    if (!activeTerm) {
      const termRes = db.prepare(
        "INSERT INTO terms (session, name, start_date, end_date, is_active, registration_open) VALUES ('2025/2026', 'First Term', '2025-09-01', '2025-12-18', 1, 1)"
      ).run();
      activeTerm = { id: Number(termRes.lastInsertRowid) };
    }

    // 6. Ensure default subjects & results for Daniel
    const subjectsSeed = [
      { name: "Mathematics", code: "MTH101", score: 85, remark: "Exceptional analytical proficiency." },
      { name: "English Language", code: "ENG101", score: 78, remark: "Strong comprehension and oral expression." },
      { name: "Physics", code: "PHY101", score: 82, remark: "Commendable problem-solving aptitude." },
      { name: "Chemistry", code: "CHM101", score: 74, remark: "Consistent practical and theoretical performance." },
      { name: "Biology", code: "BIO101", score: 88, remark: "Mastery of biological concepts and diagrammatic clarity." },
    ];

    for (const sub of subjectsSeed) {
      let subjectRow = db.prepare("SELECT id FROM subjects WHERE code = ?").get(sub.code) as any;
      let subjectId: number;
      if (!subjectRow) {
        const subRes = db.prepare(`
          INSERT INTO subjects 
          (name, code, term, duration, exam_datetime, teacher_id, created_by, is_published, class, session_id, term_id)
          VALUES (?, ?, 'First Term', 60, '2026-11-15T09:00:00Z', ?, ?, 0, 'SS 2', ?, ?)
        `).run(sub.name, sub.code, teacherId, teacherId, activeSession?.id || 1, activeTerm?.id || 1);
        subjectId = Number(subRes.lastInsertRowid);
      } else {
        subjectId = Number(subjectRow.id);
        db.prepare("UPDATE subjects SET teacher_id = ?, is_published = 0, class = COALESCE(class, 'SS 2') WHERE id = ?").run(teacherId, subjectId);
      }

      // Seed sample questions for the teacher so the question bank and text editor are populated
      const existingQ = db.prepare("SELECT COUNT(*) as count FROM questions WHERE subject_id = ?").get(subjectId) as any;
      if (!existingQ || existingQ.count === 0) {
        if (sub.code === "MTH101") {
          db.prepare(`
            INSERT INTO questions (subject_id, question_text, options_json, correct_answer, marks, order_index, question_type, explanation, solution)
            VALUES (?, 'Solve for x in the quadratic equation: 2x² - 8x + 6 = 0', ?, 0, 2, 0, 'objective', 'Divide by 2: x² - 4x + 3 = 0. Factors are (x - 1)(x - 3) = 0, giving x = 1 or x = 3.', 'Step 1: Simplify by dividing each term by 2.\nStep 2: Factorize: (x - 1)(x - 3) = 0.\nStep 3: Solve x = 1, x = 3.')
          `).run(subjectId, JSON.stringify(["x = 1 or x = 3", "x = -1 or x = -3", "x = 2 or x = 4", "x = 0 or x = 6"]));
          db.prepare(`
            INSERT INTO questions (subject_id, question_text, options_json, correct_answer, marks, order_index, question_type, teacher_answer, explanation)
            VALUES (?, 'State Pythagoras Theorem and calculate the hypotenuse of a right-angled triangle with sides 6cm and 8cm.', '["","","",""]', 0, 5, 1, 'essay', 'Award 2 marks for stating a² + b² = c². Award 3 marks for calculation: 6² + 8² = 36 + 64 = 100, c = 10cm.', 'c = √(a² + b²) = √(36 + 64) = 10cm')
          `).run(subjectId);
        } else {
          db.prepare(`
            INSERT INTO questions (subject_id, question_text, options_json, correct_answer, marks, order_index, question_type, explanation)
            VALUES (?, 'Which of the following represents a foundational principle in ' || ? || '?', ?, 0, 2, 0, 'objective', 'Core syllabus definition.')
          `).run(subjectId, sub.name, JSON.stringify(["Option A: Core Principle", "Option B: Secondary Theory", "Option C: Non-Applicable Case", "Option D: None of the above"]));
        }
      }

      // Check if exam / result exists for Daniel
      const existingExam = db.prepare(
        "SELECT id FROM exams WHERE student_id = ? AND subject_id = ?"
      ).get(studentId, subjectId) as any;

      if (!existingExam) {
        db.prepare(`
          INSERT INTO exams 
          (student_id, subject_id, start_time, end_time, score, total_score, teacher_remark, session_id, term_id, status, result_status)
          VALUES (?, ?, '2025-10-15T09:00:00Z', '2025-10-15T10:00:00Z', ?, 100, ?, ?, ?, 'completed', 'published')
        `).run(studentId, subjectId, sub.score, sub.remark, activeSession?.id || 1, activeTerm?.id || 1);
      }
    }

    // 7. Ensure Attendance records for Daniel
    const existingAtt = db.prepare("SELECT COUNT(*) as count FROM attendance_records WHERE student_id = ?").get(studentId) as any;
    if (!existingAtt || existingAtt.count === 0) {
      const today = new Date();
      for (let i = 0; i < 25; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const dateStr = d.toISOString().split("T")[0];
        const status = i === 4 || i === 12 ? "absent" : "present";
        db.prepare(`
          INSERT OR IGNORE INTO attendance_records (student_id, date, status, remarks, marked_by)
          VALUES (?, ?, ?, ?, 1)
        `).run(studentId, dateStr, status, status === "absent" ? "Excused sick leave" : "Present at roll-call");
      }
    }

    console.log("[bootstrap] Default system accounts & ACQAD Guardian demo data verified.");
  } catch (err) {
    console.error("[bootstrap] Error initializing default accounts:", err);
  }
}
