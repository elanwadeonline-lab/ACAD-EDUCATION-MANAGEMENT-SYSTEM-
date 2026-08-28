import db from "../db";

console.log("🧹 Purging test QA/QC sessions from exampool.db...");

const testSessions = db.prepare(`
  SELECT id, name FROM academic_sessions 
  WHERE name LIKE 'Session_%' OR name LIKE 'Test_%' OR name LIKE '%_178%'
`).all() as { id: number; name: string }[];

console.log(`Found ${testSessions.length} test sessions to purge.`);

db.transaction(() => {
  for (const s of testSessions) {
    const terms = db.prepare("SELECT id FROM academic_terms WHERE session_id = ?").all(s.id) as { id: number }[];
    const termIds = terms.map(t => t.id);

    for (const tId of termIds) {
      try { db.prepare("DELETE FROM attendance_records WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM fee_structures WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM grading_calculated_results WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM attendance WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM class_enrollments WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM student_term_remarks WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM academic_calendar WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM term_results WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM grading_subjects WHERE term_id = ?").run(tId); } catch {}
      try { db.prepare("DELETE FROM academic_terms WHERE id = ?").run(tId); } catch {}
    }

    try { db.prepare("UPDATE subjects SET session_id = NULL WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("UPDATE exams SET session_id = NULL WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("DELETE FROM attendance_records WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("DELETE FROM fee_structures WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("DELETE FROM grading_calculated_results WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("DELETE FROM annual_results WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("DELETE FROM student_term_remarks WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("DELETE FROM term_results WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("DELETE FROM grading_subjects WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("UPDATE timetables SET session_id = NULL WHERE session_id = ?").run(s.id); } catch {}
    try { db.prepare("DELETE FROM terms WHERE session = ?").run(s.name); } catch {}
    try { db.prepare("DELETE FROM academic_terms WHERE session_id = ?").run(s.id); } catch {}
    db.prepare("DELETE FROM academic_sessions WHERE id = ?").run(s.id);
  }

  // Ensure canonical sessions exist: 2024/2025, 2025/2026, 2026/2027
  const canonical = ["2024/2025", "2025/2026", "2026/2027"];
  for (const name of canonical) {
    const existing = db.prepare("SELECT id FROM academic_sessions WHERE name = ?").get(name) as any;
    let sId = existing?.id;
    if (!sId) {
      const res = db.prepare("INSERT INTO academic_sessions (name, is_active, status) VALUES (?, 0, 'active')").run(name);
      sId = Number(res.lastInsertRowid);
    }
    // Ensure 3 terms exist for each canonical session
    const termNames = ["First Term", "Second Term", "Third Term"];
    for (let i = 0; i < termNames.length; i++) {
      const tName = termNames[i];
      const hasTerm = db.prepare("SELECT id FROM academic_terms WHERE session_id = ? AND name = ?").get(sId, tName) as any;
      if (!hasTerm) {
        db.prepare("INSERT INTO academic_terms (session_id, name, is_active, status) VALUES (?, ?, 0, 'archived')").run(sId, tName);
      }
    }
  }

  // Set 2026/2027 as active session with First Term active
  db.prepare("UPDATE academic_sessions SET is_active = 0").run();
  db.prepare("UPDATE academic_sessions SET is_active = 1 WHERE name = '2026/2027'").run();
  
  const activeS = db.prepare("SELECT id FROM academic_sessions WHERE is_active = 1 LIMIT 1").get() as any;
  if (activeS) {
    db.prepare("UPDATE academic_terms SET is_active = 0 WHERE session_id = ?").run(activeS.id);
    db.prepare("UPDATE academic_terms SET is_active = 1 WHERE session_id = ? AND name = 'First Term'").run(activeS.id);
  }
})();

const remaining = db.prepare("SELECT id, name, is_active FROM academic_sessions ORDER BY id ASC").all();
console.log("✅ Academic sessions cleaned and canonical baseline restored:", remaining);
