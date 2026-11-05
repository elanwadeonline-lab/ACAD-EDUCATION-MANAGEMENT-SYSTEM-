/**
 * scripts/load_test_concurrency.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Progressive High-Concurrency & Session-Isolation Benchmark Suite (Part F2 & F3)
 *
 * Executes:
 *  - Scenario A: Concurrent Authentication & Session Isolation
 *  - Scenario B: Concurrent Student Dashboard & Telemetry Load
 *  - Scenario C: Concurrent CBT Exam Start
 *  - Scenario D: Concurrent CBT Answer Autosave
 *  - Scenario E: Simultaneous CBT Exam Submission Storm
 *  - Scenario F: Progressive Mixed-Portal Load Stages (50, 100, 500, 1000, 2000, 5000, 10000)
 */

import db, { queries } from "../db";
import { generateTokenWithMeta } from "../auth";

const BASE = process.env.TEST_BASE_URL || "http://localhost:8001";
const TS = Date.now();

interface LatencyStats {
  total: number;
  succeeded: number;
  failed: number;
  unexpected401: number;
  identityMismatches: number;
  durationMs: number;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
}

function computeStats(
  latencies: number[],
  succeeded: number,
  failed: number,
  unexpected401: number,
  identityMismatches: number,
  durationMs: number
): LatencyStats {
  const sorted = [...latencies].sort((a, b) => a - b);
  const total = succeeded + failed;
  const pick = (p: number) => {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
    return Number(sorted[idx].toFixed(2));
  };
  return {
    total,
    succeeded,
    failed,
    unexpected401,
    identityMismatches,
    durationMs: Number(durationMs.toFixed(1)),
    rps: durationMs > 0 ? Math.round((total / durationMs) * 1000) : 0,
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
  };
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) break;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

async function main() {
  console.log("================================================================================");
  console.log(" eCard / ACAD — High-Concurrency & Session-Isolation Benchmark Suite (Part F)");
  console.log(` Target Server: ${BASE}`);
  console.log("================================================================================\n");

  const hash = await Bun.password.hash("BenchPass123!", { algorithm: "bcrypt", cost: 4 });

  let activeSession = queries.getActiveAcademicSession.get() as any;
  if (!activeSession) {
    const sRes = queries.createAcademicSession.run(`2026/2027_BENCH_${TS}`, 1, "active") as any;
    activeSession = { id: Number(sRes.lastInsertRowid), name: `2026/2027_BENCH_${TS}` };
  }
  let activeTerm = queries.getActiveAcademicTerm.get() as any;
  if (!activeTerm) {
    const tRes = queries.createAcademicTerm.run(activeSession.id, "First Term", null, null, 1, "active") as any;
    activeTerm = { id: Number(tRes.lastInsertRowid), name: "First Term" };
  } else if (Number(activeTerm.is_active) !== 1) {
    queries.activateAcademicTerm.run(activeTerm.id);
  }

  // Provision 250 distinct students, 15 teachers, 5 operators, 10 guardians in a single transaction
  const NUM_CBT_STUDENTS = 200;
  const students: Array<{ id: number; email: string; token: string; examId?: number }> = [];
  const teachers: Array<{ id: number; email: string; token: string }> = [];
  const operators: Array<{ id: number; email: string; token: string }> = [];
  const guardians: Array<{ id: number; email: string; token: string }> = [];

  let subjectId = 0;
  let q1Id = 0;
  let q2Id = 0;

  db.transaction(() => {
    const insUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, role, grade, reg_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)"
    );
    const insDevice = db.prepare(
      "INSERT OR IGNORE INTO user_devices (user_id, device_fingerprint, device_name, user_agent, ip) VALUES (?, ?, 'BenchClient', 'BunBench/1.0', '127.0.0.1')"
    );
    const insToken = db.prepare(
      "INSERT INTO user_tokens (jti, user_id, device_fingerprint, token_type, expires_at) VALUES (?, ?, ?, 'access', ?)"
    );

    for (let i = 0; i < 5; i++) {
      const email = `bench_op_${TS}_${i}@school.edu`;
      const r = insUser.run(`Bench Op ${i}`, email, hash, "operator", null, `BOP-${TS}-${i}`) as any;
      const uid = Number(r.lastInsertRowid);
      const meta = generateTokenWithMeta(uid, "operator");
      insDevice.run(uid, `fp_op_${uid}`);
      insToken.run(meta.jti, uid, `fp_op_${uid}`, meta.expiresAt);
      operators.push({ id: uid, email, token: meta.token });
    }

    for (let i = 0; i < 15; i++) {
      const email = `bench_tch_${TS}_${i}@school.edu`;
      const r = insUser.run(`Bench Teacher ${i}`, email, hash, "teacher", null, `BTCH-${TS}-${i}`) as any;
      const uid = Number(r.lastInsertRowid);
      const meta = generateTokenWithMeta(uid, "teacher");
      insDevice.run(uid, `fp_tch_${uid}`);
      insToken.run(meta.jti, uid, `fp_tch_${uid}`, meta.expiresAt);
      teachers.push({ id: uid, email, token: meta.token });
    }

    for (let i = 0; i < 10; i++) {
      const email = `bench_grd_${TS}_${i}@school.edu`;
      const r = insUser.run(`Bench Guardian ${i}`, email, hash, "guardian", null, `BGRD-${TS}-${i}`) as any;
      const uid = Number(r.lastInsertRowid);
      const meta = generateTokenWithMeta(uid, "guardian");
      insDevice.run(uid, `fp_grd_${uid}`);
      insToken.run(meta.jti, uid, `fp_grd_${uid}`, meta.expiresAt);
      guardians.push({ id: uid, email, token: meta.token });
    }

    for (let i = 0; i < NUM_CBT_STUDENTS; i++) {
      const email = `bench_stu_${TS}_${i}@school.edu`;
      const r = insUser.run(`Bench Student ${i}`, email, hash, "student", "JSS1", `BSTU-${TS}-${i}`) as any;
      const uid = Number(r.lastInsertRowid);
      const meta = generateTokenWithMeta(uid, "student");
      insDevice.run(uid, `fp_stu_${uid}`);
      insToken.run(meta.jti, uid, `fp_stu_${uid}`, meta.expiresAt);
      students.push({ id: uid, email, token: meta.token });
    }

    const subRow = queries.createSubject.run(
      `Benchmark CBT ${TS}`,
      `BCBT_${TS}`,
      activeTerm.name || "First Term",
      60,
      teachers[0].id,
      operators[0].id,
      "High Concurrency CBT Subject",
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

    db.prepare(
      "UPDATE subjects SET is_published = 1, is_timetable_published = 1, exam_datetime = ?, window_duration = 180 WHERE id = ?"
    ).run(new Date(Date.now() - 60_000).toISOString(), subjectId);

    const insQ = db.prepare(`
      INSERT INTO questions (subject_id, question_text, options_json, correct_answer, marks, order_index, question_type, session_id, term_id)
      VALUES (?, ?, ?, ?, ?, ?, 'objective', ?, ?)
    `);
    q1Id = Number(
      (insQ.run(subjectId, "25 * 4 = ?", '["80","90","100","110"]', 2, 5, 1, activeSession.id, activeTerm.id) as any)
        .lastInsertRowid
    );
    q2Id = Number(
      (insQ.run(subjectId, "Capital of Nigeria?", '["Lagos","Abuja","Kano","Enugu"]', 1, 5, 2, activeSession.id, activeTerm.id) as any)
        .lastInsertRowid
    );
    queries.updateSubjectTotalScore.run(subjectId, subjectId);

    for (const s of students) {
      queries.enrollStudent.run(subjectId, s.id, operators[0].id);
    }
  })();

  // ── Scenario A: Concurrent Authentication & Identity Verification ───────────
  {
    const latencies: number[] = [];
    let ok = 0;
    let fail = 0;
    let unexp401 = 0;
    let mismatch = 0;
    const t0 = performance.now();

    // 50 HTTP POST /api/auth/login + 150 concurrent /api/auth/me identity verifications
    const loginSlice = students.slice(0, 50);
    await runPool(loginSlice, 25, async (s) => {
      const s0 = performance.now();
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: s.email, password: "BenchPass123!" }),
      });
      latencies.push(performance.now() - s0);
      if (res.status === 200) {
        const body = (await res.json()) as any;
        if (body?.data?.user?.id === s.id) ok++;
        else {
          fail++;
          mismatch++;
        }
      } else {
        fail++;
        if (res.status === 401) unexp401++;
      }
    });

    await runPool(students, 100, async (s) => {
      const s0 = performance.now();
      const res = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${s.token}`, "X-Portal-Role": "student" },
      });
      latencies.push(performance.now() - s0);
      if (res.status === 200) {
        const body = (await res.json()) as any;
        if (body?.data?.user?.id === s.id) ok++;
        else {
          fail++;
          mismatch++;
        }
      } else {
        fail++;
        if (res.status === 401) unexp401++;
      }
    });

    const stats = computeStats(latencies, ok, fail, unexp401, mismatch, performance.now() - t0);
    console.log("[Scenario A — Concurrent Auth & Session Isolation]", JSON.stringify(stats));
  }

  // ── Scenario B: Concurrent Student Dashboard Load (200 students x 4 endpoints = 800 reqs) ──
  {
    const latencies: number[] = [];
    let ok = 0;
    let fail = 0;
    let unexp401 = 0;
    const t0 = performance.now();

    const tasks = students.flatMap((s) => [
      { token: s.token, path: "/api/auth/me" },
      { token: s.token, path: "/api/subjects" },
      { token: s.token, path: "/api/exams/results" },
      { token: s.token, path: "/api/student/telemetry" },
    ]);

    await runPool(tasks, 120, async (t) => {
      const s0 = performance.now();
      const res = await fetch(`${BASE}${t.path}`, {
        headers: { Authorization: `Bearer ${t.token}`, "X-Portal-Role": "student" },
      });
      latencies.push(performance.now() - s0);
      if (res.status === 200) ok++;
      else {
        fail++;
        if (res.status === 401) unexp401++;
      }
    });

    const stats = computeStats(latencies, ok, fail, unexp401, 0, performance.now() - t0);
    console.log("[Scenario B — Concurrent Student Dashboard Load]", JSON.stringify(stats));
  }

  // ── Scenario C: Concurrent CBT Exam Start (200 students simultaneously) ────
  {
    const latencies: number[] = [];
    let ok = 0;
    let fail = 0;
    let unexp401 = 0;
    const t0 = performance.now();

    await runPool(students, 100, async (s) => {
      const s0 = performance.now();
      const res = await fetch(`${BASE}/api/exams/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`,
        },
        body: JSON.stringify({ subject_id: subjectId }),
      });
      latencies.push(performance.now() - s0);
      if (res.status === 200 || res.status === 201) {
        const body = (await res.json()) as any;
        s.examId = body?.data?.exam?.id ?? body?.data?.examId;
        ok++;
      } else {
        fail++;
        if (res.status === 401) unexp401++;
      }
    });

    const stats = computeStats(latencies, ok, fail, unexp401, 0, performance.now() - t0);
    console.log("[Scenario C — Concurrent CBT Exam Start (200 Students)]", JSON.stringify(stats));
  }

  // ── Scenario D: Concurrent CBT Answer Autosave (200 students x 2 saves = 400 writes) ──
  {
    const latencies: number[] = [];
    let ok = 0;
    let fail = 0;
    let unexp401 = 0;
    const t0 = performance.now();

    const saveTasks = students.flatMap((s) => [s, s]);
    await runPool(saveTasks, 100, async (s) => {
      if (!s.examId) return;
      const s0 = performance.now();
      const res = await fetch(`${BASE}/api/exams/${s.examId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`,
        },
        body: JSON.stringify({
          answers: [
            { question_id: q1Id, selected_option: 2 },
            { question_id: q2Id, selected_option: 1 },
          ],
        }),
      });
      latencies.push(performance.now() - s0);
      if (res.status === 200) ok++;
      else {
        fail++;
        if (res.status === 401) unexp401++;
      }
    });

    const stats = computeStats(latencies, ok, fail, unexp401, 0, performance.now() - t0);
    console.log("[Scenario D — Concurrent CBT Answer Autosave (400 Saves)]", JSON.stringify(stats));
  }

  // ── Scenario E: Simultaneous CBT Exam Submission Storm (200 students) ──────
  {
    const latencies: number[] = [];
    let ok = 0;
    let fail = 0;
    let unexp401 = 0;
    let mismatch = 0;
    const t0 = performance.now();

    await runPool(students, 100, async (s) => {
      if (!s.examId) return;
      const s0 = performance.now();
      const res = await fetch(`${BASE}/api/exams/${s.examId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`,
        },
        body: JSON.stringify({
          answers: [
            { question_id: q1Id, selected_option: 2 },
            { question_id: q2Id, selected_option: 1 },
          ],
        }),
      });
      latencies.push(performance.now() - s0);
      if (res.status === 200) {
        const body = (await res.json()) as any;
        if (body?.data?.score === 10) ok++;
        else {
          fail++;
          mismatch++;
        }
      } else {
        fail++;
        if (res.status === 401) unexp401++;
      }
    });

    const stats = computeStats(latencies, ok, fail, unexp401, mismatch, performance.now() - t0);
    console.log("[Scenario E — Simultaneous CBT Exam Submission Storm (200 Submits)]", JSON.stringify(stats));
  }

  // ── Scenario F: Progressive Mixed-Portal Load Stages (50 -> 10,000) ────────
  const stages = [50, 100, 500, 1000, 2000, 5000, 10000];
  console.log("\n--- Progressive Mixed-Portal Concurrency Stages (80% Student / 10% Teacher / 5% Operator / 5% Guardian) ---");

  for (const stageCount of stages) {
    const latencies: number[] = [];
    let ok = 0;
    let fail = 0;
    let unexp401 = 0;
    let mismatch = 0;
    const t0 = performance.now();

    const indices = Array.from({ length: stageCount }, (_, i) => i);
    const concurrency = Math.min(250, stageCount);

    await runPool(indices, concurrency, async (idx) => {
      const bucket = idx % 20;
      let urlPath = "/api/subjects";
      let token = "";
      let expectedUserId: number | null = null;

      if (bucket < 16) {
        // 80% Student traffic across dashboard endpoints
        const stu = students[idx % students.length];
        token = stu.token;
        const subRoute = idx % 4;
        if (subRoute === 0) {
          urlPath = "/api/auth/me";
          expectedUserId = stu.id;
        } else if (subRoute === 1) {
          urlPath = "/api/subjects";
        } else if (subRoute === 2) {
          urlPath = "/api/exams/results";
        } else {
          urlPath = "/api/student/telemetry";
        }
      } else if (bucket < 18) {
        // 10% Teacher traffic
        const tch = teachers[idx % teachers.length];
        token = tch.token;
        urlPath = idx % 2 === 0 ? "/api/subjects/with-question-counts" : "/api/auth/me";
        if (urlPath === "/api/auth/me") expectedUserId = tch.id;
      } else if (bucket === 18) {
        // 5% Operator traffic
        const op = operators[idx % operators.length];
        token = op.token;
        urlPath = idx % 2 === 0 ? "/api/academic/active" : "/api/auth/me";
        if (urlPath === "/api/auth/me") expectedUserId = op.id;
      } else {
        // 5% Guardian traffic
        const grd = guardians[idx % guardians.length];
        token = grd.token;
        urlPath = idx % 2 === 0 ? "/api/guardian/wards" : "/api/auth/me";
        if (urlPath === "/api/auth/me") expectedUserId = grd.id;
      }

      const s0 = performance.now();
      try {
        const res = await fetch(`${BASE}${urlPath}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        latencies.push(performance.now() - s0);
        if (res.status === 200) {
          if (expectedUserId !== null) {
            const body = (await res.json()) as any;
            if (body?.data?.user?.id !== expectedUserId) {
              mismatch++;
              fail++;
              return;
            }
          } else {
            await res.arrayBuffer();
          }
          ok++;
        } else {
          fail++;
          if (res.status === 401) unexp401++;
        }
      } catch {
        latencies.push(performance.now() - s0);
        fail++;
      }
    });

    const stats = computeStats(latencies, ok, fail, unexp401, mismatch, performance.now() - t0);
    console.log(`[Stage ${String(stageCount).padStart(5, " ")} VUs/Reqs]`, JSON.stringify(stats));
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});

