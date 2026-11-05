import db from "../db";
import { hashPassword } from "../auth";

export async function bootstrapDefaultSystemAccounts(): Promise<void> {
  try {
    const passwordHash = await hashPassword("password");
    const adminHash = await hashPassword("Admin@2026");

    // 1. Ensure operator exists
    const operator = db.prepare("SELECT id FROM users WHERE role = 'operator' LIMIT 1").get() as any;
    if (!operator) {
      db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_active) VALUES (?, ?, 'operator', ?, 1)"
      ).run("System Admin", "admin@exampool.ng", adminHash);
      console.log("[bootstrap] Created default admin: admin@exampool.ng / Admin@2026");
    }

    // 2. Ensure guardian exists (with password 'password')
    let guardian = db.prepare("SELECT id FROM users WHERE email = 'guardian@exampool.ng'").get() as any;
    if (!guardian) {
      const gRes = db.prepare(
        "INSERT INTO users (name, email, role, password_hash, is_active, phone, address) VALUES (?, ?, 'guardian', ?, 1, ?, ?)"
      ).run("Chief John Doe (Guardian)", "guardian@exampool.ng", passwordHash, "+234 801 234 5678", "14 Victoria Island Crescent, Lagos");
      guardian = { id: Number(gRes.lastInsertRowid) };
      console.log("[bootstrap] Created default guardian: guardian@exampool.ng / password");
    } else {
      // Ensure active and password is set to 'password'
      db.prepare("UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?").run(passwordHash, guardian.id);
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
          (name, code, term, duration, exam_datetime, teacher_id, created_by, is_published)
          VALUES (?, ?, 'First Term', 60, '2025-10-15T09:00:00Z', 1, 1, 1)
        `).run(sub.name, sub.code);
        subjectId = Number(subRes.lastInsertRowid);
      } else {
        subjectId = Number(subjectRow.id);
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
