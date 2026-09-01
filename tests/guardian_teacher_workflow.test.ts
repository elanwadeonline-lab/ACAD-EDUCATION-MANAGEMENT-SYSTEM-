import { describe, test, expect, beforeAll } from "bun:test";
import db, { queries } from "../db";
import { generateToken } from "../auth";

describe("Guardian-Teacher Hybrid Workflow & Attendance API Tests", () => {
  let teacherUser: any;
  let guardianUser: any;
  let studentUser: any;
  let jss3Class: any;
  let teacherToken: string;
  let guardianToken: string;

  const baseUrl = "http://localhost:8001";

  beforeAll(() => {
    teacherUser = db.prepare("SELECT * FROM users WHERE email = 'teacher@exampool.ng'").get() as any;
    guardianUser = db.prepare("SELECT * FROM users WHERE email = 'guardian@exampool.ng'").get() as any;
    studentUser = db.prepare("SELECT * FROM users WHERE email = 'student@exampool.ng'").get() as any;

    let term = queries.getActiveAcademicTerm.get() as any;
    if (!term) {
      term = db.prepare("SELECT id FROM academic_terms LIMIT 1").get() as any || { id: 1 };
    }
    const termId = term.id;

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

    // Assign student grade and enroll in class
    db.prepare("UPDATE users SET grade = 'JSS 3' WHERE id = ?").run(studentUser.id);
    db.prepare("DELETE FROM class_enrollments WHERE student_id = ?").run(studentUser.id);
    db.prepare("INSERT INTO class_enrollments (class_id, student_id, term_id) VALUES (?, ?, ?)").run(jss3Class.id, studentUser.id, termId);

    // Link guardian to student
    db.prepare("INSERT OR IGNORE INTO guardian_student_links (guardian_id, student_id, relationship, status) VALUES (?, ?, 'Parent', 'approved')").run(guardianUser.id, studentUser.id);
    db.prepare("UPDATE guardian_student_links SET status = 'approved' WHERE guardian_id = ? AND student_id = ?").run(guardianUser.id, studentUser.id);

    teacherToken = generateToken(teacherUser.id, "teacher");
    guardianToken = generateToken(guardianUser.id, "guardian");
  });

  test("1. GET /api/teacher/attendance/roster returns class roster and student list", async () => {
    const res = await fetch(`${baseUrl}/api/teacher/attendance/roster?date=2026-06-15`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    const body = json.data;
    expect(body.has_class).toBe(true);
    expect(body.class_name).toBe("JSS 3");
    expect(Array.isArray(body.students)).toBe(true);
    expect(body.students.length).toBeGreaterThan(0);
    expect(body.students[0].name).toBeDefined();
    expect(body.students[0].status).toBeDefined();
  });

  test("2. POST /api/teacher/attendance/batch marks attendance and creates guardian notification", async () => {
    const today = "2026-06-15";
    const res = await fetch(`${baseUrl}/api/teacher/attendance/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        class_id: jss3Class.id,
        date: today,
        records: [
          { student_id: studentUser.id, status: "present", remarks: "Arrived on time 07:45 AM" },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    const body = json.data;
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);

    // Verify record in database
    const record = db.prepare("SELECT * FROM attendance_records WHERE student_id = ? AND date = ?").get(studentUser.id, today) as any;
    expect(record).toBeDefined();
    expect(record.status).toBe("present");
    expect(record.remarks).toContain("Arrived on time");

    // Verify notification created for guardian
    const notifs = db.prepare("SELECT * FROM notifications WHERE user_id = ? AND type = 'attendance' ORDER BY id DESC LIMIT 1").get(guardianUser.id) as any;
    expect(notifs).toBeDefined();
    expect(notifs.message).toContain("Daily Roll Call");
  });

  test("3. POST /api/guardian/settings/profile updates guardian contact info", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/settings/profile`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guardianToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: "+234 809 999 8888",
        address: "Block B, Victoria Island, Lagos",
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    const body = json.data;
    expect(body.success).toBe(true);

    const updatedUser = db.prepare("SELECT phone, address FROM users WHERE id = ?").get(guardianUser.id) as any;
    expect(updatedUser.phone).toBe("+234 809 999 8888");
    expect(updatedUser.address).toContain("Victoria Island");
  });

  test("4. POST /api/guardian/settings/notifications updates notification preferences", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/settings/notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guardianToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notify_attendance: 1,
        notify_results: 1,
        notify_fees: 0,
        notify_messages: 1,
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    const body = json.data;
    expect(body.success).toBe(true);

    const updatedUser = db.prepare("SELECT notify_fees, notify_attendance FROM users WHERE id = ?").get(guardianUser.id) as any;
    expect(updatedUser.notify_fees).toBe(0);
    expect(updatedUser.notify_attendance).toBe(1);
  });

  test("5. GET /api/guardian/wards/:id/share-token generates report card share token", async () => {
    const res = await fetch(`${baseUrl}/api/guardian/wards/${studentUser.id}/share-token`, {
      headers: { Authorization: `Bearer ${guardianToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    const body = json.data;
    expect(body.token).toBeDefined();
    expect(body.share_url).toContain(`/student/report-card?student_id=${studentUser.id}`);
  });

  test("6. GET /api/notifications/vapid-public-key returns VAPID key", async () => {
    const res = await fetch(`${baseUrl}/api/notifications/vapid-public-key`);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.publicKey).toBeDefined();
  });
});
