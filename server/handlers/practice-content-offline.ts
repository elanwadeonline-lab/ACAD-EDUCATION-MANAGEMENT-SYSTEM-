// Zone file extracted from server.ts during route modularization.
// Route logic below is verbatim from server.ts; identifiers resolve via ../server bindings.
import db, { queries } from "../../db";
import { isPositiveIntId, trimStr } from "../../validation";
import crypto from "node:crypto";
import path from "path";
import fs from "fs";
import {
  apiSuccess, apiMessage, apiError, readJson, requireAuth, requireRole, sqlInt, rowCount,
  auditLog, notifyUser, notifyOperators, isSqliteUniqueError, jsonSafeStringify,
  corsHeaders, authz, licenseValidator, stripCorrectAnswer,
} from "../../server";


export async function tryPracticeContentOffline(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  if (pathname === "/api/content/search" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator", "teacher"]);
    const q = url.searchParams.get("q");
    if (!q) return apiError(400, "Query string 'q' required");
    // [SECURITY FIX] Cap FTS query length — prevents pathological SQLite FTS patterns
    if (q.length > 200) return apiError(400, "Query string too long (max 200 chars)");
    const results = queries.searchContentBank.all(q);
    return apiSuccess({ results });
  }

  if (pathname === "/api/content/package-questions" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator", "teacher"]);
    const packageId = url.searchParams.get("packageId");
    if (!packageId) return apiError(400, "Missing packageId");
    if (packageId.length > 128) return apiError(400, "Invalid packageId");
    const parts = packageId.split("_");
    if (parts.length < 3) return apiError(400, "Invalid packageId");
    const [exam_body, yearStr, ...rest] = parts;
    if (!exam_body || !yearStr) return apiError(400, "Invalid packageId");
    const year = parseInt(yearStr, 10);
    const subject_code = rest.join("_");

    const questions = db.prepare(`
      SELECT id, exam_body, year, subject_code, paper_type, question_text, options_json, correct_answer, solution_text, difficulty, topic_tag, diagram_path
      FROM content_bank.content_bank
      WHERE exam_body = ? AND year = ? AND subject_code = ?
      ORDER BY id ASC
    `).all(exam_body, year, subject_code) as any[];

    return apiSuccess({ questions });
  }

  if (pathname === "/api/content/questions" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator", "teacher"]);
    const body = await readJson(req);

    const exam_body = trimStr(body?.exam_body) || "JAMB";
    const year = Number(body?.year) || new Date().getFullYear();
    const subject_code = trimStr(body?.subject_code) || "GEN";
    const paper_type = body?.paper_type === "theory" ? "theory" : "objective";
    const question_text = trimStr(body?.question_text);
    if (!question_text) return apiError(400, "question_text is required");

    let optionsJson = "[]";
    if (Array.isArray(body?.options)) {
      optionsJson = JSON.stringify(body.options);
    } else if (typeof body?.options_json === "string") {
      optionsJson = body.options_json;
    }

    const correct_answer = trimStr(body?.correct_answer?.toString()) || "A";
    const solution_text = trimStr(body?.solution_text) || null;
    const difficulty = Math.max(1, Math.min(5, Number(body?.difficulty || 3)));
    const topic_tag = trimStr(body?.topic_tag) || null;

    const result = db.prepare(`
      INSERT INTO content_bank.content_bank
      (exam_body, year, subject_code, paper_type, question_text, options_json, correct_answer, solution_text, difficulty, topic_tag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(exam_body, year, subject_code, paper_type, question_text, optionsJson, correct_answer, solution_text, difficulty, topic_tag) as { lastInsertRowid: number | bigint };

    const created = db.prepare("SELECT * FROM content_bank.content_bank WHERE id = ?").get(Number(result.lastInsertRowid));
    return apiSuccess(created, 201);
  }

  const contentQMatch = pathname.match(/^\/api\/content\/questions\/(\d+)$/);
  if (contentQMatch && method === "PUT") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator", "teacher"]);
    const questionId = Number(contentQMatch[1]);
    if (!isPositiveIntId(questionId)) return apiError(400, "Invalid question id");

    const body = await readJson(req);
    const questionText = trimStr(body?.question_text);
    if (!questionText) return apiError(400, "question_text cannot be empty");

    let optionsJson: string;
    if (Array.isArray(body?.options)) {
      optionsJson = JSON.stringify(body.options);
    } else if (typeof body?.options_json === "string") {
      optionsJson = body.options_json;
    } else {
      optionsJson = "[]";
    }

    const correctAnswer = trimStr(body?.correct_answer?.toString()) || "A";
    const solutionText = trimStr(body?.solution_text) || null;
    const difficulty = Math.max(1, Math.min(5, Number(body?.difficulty || 3)));
    const topicTag = trimStr(body?.topic_tag) || null;

    db.prepare(`
      UPDATE content_bank.content_bank
      SET question_text = ?, options_json = ?, correct_answer = ?, solution_text = ?, difficulty = ?, topic_tag = ?
      WHERE id = ?
    `).run(questionText, optionsJson, correctAnswer, solutionText, difficulty, topicTag, questionId);

    const updated = db.prepare("SELECT * FROM content_bank.content_bank WHERE id = ?").get(questionId);
    return apiSuccess(updated);
  }

  if (contentQMatch && method === "DELETE") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator", "teacher"]);
    const questionId = Number(contentQMatch[1]);
    if (!isPositiveIntId(questionId)) return apiError(400, "Invalid question id");

    db.prepare("DELETE FROM content_bank.content_bank WHERE id = ?").run(questionId);
    return apiMessage("Question deleted from content bank");
  }

  const contentPkgMatch = pathname.match(/^\/api\/content\/packages\/([A-Za-z0-9_.-]+)$/);
  if (contentPkgMatch && method === "DELETE") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator", "teacher"]);
    const packageId = contentPkgMatch[1];
    if (!packageId) return apiError(400, "Invalid packageId");
    const parts = packageId.split("_");
    if (parts.length < 3) return apiError(400, "Invalid packageId");
    const [exam_body, yearStr, ...rest] = parts;
    if (!exam_body || !yearStr) return apiError(400, "Invalid packageId");
    const year = parseInt(yearStr, 10);
    const subject_code = rest.join("_");

    db.prepare(`
      DELETE FROM content_bank.content_bank
      WHERE exam_body = ? AND year = ? AND subject_code = ?
    `).run(exam_body, year, subject_code);

    return apiMessage("Package deleted from content bank");
  }

  // ── v4.1 Practice Sandbox API ────────────────────────────────────────────────
  if (pathname === "/api/practice/start" && method === "POST") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["student", "operator", "teacher"]);
    const practiceId = url.searchParams.get("practiceId");
    if (!practiceId) return apiError(400, "Missing practiceId");
    // [SECURITY FIX VULN-03] Cap practiceId length
    if (practiceId.length > 128) return apiError(400, "Invalid practiceId");

    const parts = practiceId.split("_");
    if (parts.length < 3) return apiError(400, "Invalid practiceId");
    const exam_body = parts[0] as string;
    const year = parseInt(parts[1] as string, 10);
    const subject_code = parts.slice(2).join("_");

    // Practice sessions are ephemeral (not persisted as exams); generate a transient ID from timestamp + crypto randomness
    const transientExamId = Date.now() % 1000000 + crypto.randomInt(1000, 9999);
    
    const rawQuestions = db.prepare(`
      SELECT id, question_text, options_json, correct_answer, solution_text, difficulty, topic_tag
      FROM content_bank.content_bank
      WHERE exam_body = ? AND year = ? AND subject_code = ?
      ORDER BY id ASC
    `).all(exam_body, year, subject_code) as any[];

    if (!rawQuestions.length) return apiError(404, "No questions found for this package");

    const questions = rawQuestions.map(q => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = typeof q.options_json === "string" ? JSON.parse(q.options_json) : (q.options_json || []);
      } catch {
        parsedOptions = [];
      }
      return {
        id: q.id,
        question_text: q.question_text,
        question_type: "multiple_choice",
        options_json: JSON.stringify(parsedOptions),
        options: parsedOptions,
        correct_answer: q.correct_answer,
        solution: q.solution_text || null,
        explanation: q.solution_text || null,
        solution_text: q.solution_text || null,
        topic_tag: q.topic_tag || null,
        difficulty: q.difficulty || null,
        marks: 1
      };
    });

    return apiSuccess({
      exam: {
        id: transientExamId,
        subject: { id: transientExamId, title: `${exam_body} ${year} - ${subject_code}`, duration: 45, duration_minutes: 45 },
        questions
      }
    });
  }

  if (pathname === "/api/practice/submit" && method === "POST") {
    const auth = requireAuth(req);
    const body = await readJson(req);
    const practiceId = url.searchParams.get("practiceId") || body?.practiceId || body?.practice_id;
    if (!practiceId || typeof practiceId !== "string") return apiError(400, "Missing practiceId");

    const answers = body?.answers || [];

    const parts = practiceId.split("_");
    const exam_body = parts[0] as string;
    const year = parseInt(parts[1] as string, 10);
    const subject_code = parts.slice(2).join("_");

    const rawQuestions = db.prepare(`
      SELECT id, question_text, options_json, correct_answer, solution_text, difficulty, topic_tag
      FROM content_bank.content_bank
      WHERE exam_body = ? AND year = ? AND subject_code = ?
    `).all(exam_body, year, subject_code) as any[];

    const correctMap = new Map();
    for (const q of rawQuestions) {
      correctMap.set(q.id, q.correct_answer);
    }

    let score = 0;
    let total = 0;

    const tx = db.transaction(() => {
      for (const ans of answers) {
        if (!ans.question_id) continue;
        const correctOpt = correctMap.get(ans.question_id);
        if (correctOpt !== undefined && correctOpt !== null) {
          total++;
          const optLetter = typeof correctOpt === "string" && /^[A-E]$/i.test(correctOpt)
            ? correctOpt.toUpperCase().charCodeAt(0) - 65
            : Number(correctOpt);
          const selectedNum = typeof ans.selected_option === "number"
            ? ans.selected_option
            : typeof ans.selected_option === "string" && /^[A-E]$/i.test(ans.selected_option)
              ? ans.selected_option.toUpperCase().charCodeAt(0) - 65
              : Number(ans.selected_option);

          const isCorrect = (String(ans.selected_option) === String(correctOpt) || optLetter === selectedNum) ? 1 : 0;
          if (isCorrect) score++;
          try {
             queries.insertPracticeLog.run(
               auth.userId,
               ans.question_id,
               ans.selected_option?.toString() || ans.essay_response || null,
               isCorrect,
               ans.time_spent_seconds || 0,
               Date.now(),
               "lan", // By default, server submissions are 'lan'. Offline will be synced differently.
               "N/A", // device_fingerprint
               "unsigned" // log_signature
             );
          } catch(e) { console.error("Practice log err:", e); }
        }
      }
    });
    tx();

    // Build comprehensive per-question review for learning practice
    const review = rawQuestions.map((q) => {
      const userAns = answers.find((a: any) => a.question_id === q.id);
      const correctOpt = q.correct_answer;
      const optLetter = typeof correctOpt === "string" && /^[A-E]$/i.test(correctOpt)
        ? correctOpt.toUpperCase().charCodeAt(0) - 65
        : Number(correctOpt);
      const selectedNum = userAns?.selected_option !== undefined && userAns?.selected_option !== null
        ? (typeof userAns.selected_option === "number"
            ? userAns.selected_option
            : typeof userAns.selected_option === "string" && /^[A-E]$/i.test(userAns.selected_option)
              ? userAns.selected_option.toUpperCase().charCodeAt(0) - 65
              : Number(userAns.selected_option))
        : null;
      const isCorrect = selectedNum !== null && (String(userAns?.selected_option) === String(correctOpt) || optLetter === selectedNum);
      
      let parsedOptions: string[] = [];
      try {
        parsedOptions = typeof q.options_json === "string" ? JSON.parse(q.options_json) : (q.options_json || []);
      } catch {
        parsedOptions = [];
      }

      return {
        question_id: q.id,
        question_text: q.question_text,
        options: parsedOptions,
        selected_option: userAns?.selected_option ?? null,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        solution_text: q.solution_text || null,
        topic_tag: q.topic_tag || null,
        difficulty: q.difficulty || null
      };
    });

    return apiSuccess({
      score,
      total_score: total || rawQuestions.length,
      answered_questions: answers.length,
      total_questions: rawQuestions.length,
      review
    });
  }

  // ── Offline Assignments Sync ────────────────────────────────────────────────
  // [SECURITY FIX] Removed duplicate /api/upload route (dead code -- first handler above always matched)
  // Offline file uploads are handled via base64 file_data in the /api/offline/sync payload instead

  if (pathname === "/api/offline/assignments" && method === "GET") {
    let auth;
    try { auth = requireAuth(req); } catch (e) { return apiError(401, "Not authenticated"); }
    
    // Get all assignments for the student
    const subjects = queries.getEnrolledSubjectsByStudent.all(auth.userId) as any[];
    const assignments = subjects.filter(s => s.is_assignment === 1 && s.is_published === 1);
    
    for (const assignment of assignments) {
      assignment.questions = stripCorrectAnswer(queries.getQuestionsBySubject.all(assignment.id) as any[], auth.role);
    }
    
    return apiSuccess({ assignments });
  }

  if (pathname === "/api/offline/sync" && method === "POST") {
    const auth = requireAuth(req);
    const body = await readJson(req);
    const { exams } = body; 
    
    if (!Array.isArray(exams)) return apiError(400, "Invalid payload");
    
    let synced = 0;
    const acknowledged_ids: any[] = [];
    // Helper to extract CURRENT_TERM outside loop
    const currentTermRow = queries.getSetting.get("CURRENT_TERM") as any;
    const currentTerm = currentTermRow?.value || "T1";
    
    // Make sure uploads directory exists for offline files
    const uploadDir = path.join(import.meta.dir, "..", "..", "frontend", "public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // Pre-process offline files to avoid file I/O inside db.transaction() which deadlocks SQLite
    for (const examData of exams) {
      if (Array.isArray(examData.answers)) {
        for (const ans of examData.answers) {
          if (ans.file_data && typeof ans.file_data === "string" && ans.file_name) {
            const match = ans.file_data.match(/^data:(.+);base64,(.+)$/);
            // [SECURITY FIX VULN-04] Validate MIME type against allowlist before writing to disk
            const ALLOWED_MIME_TYPES = [
              "image/jpeg", "image/png", "image/gif", "image/webp",
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ];
            if (match && ALLOWED_MIME_TYPES.includes(match[1])) {
               try {
                 const buffer = Buffer.from(match[2], 'base64');
                 const safeName = ans.file_name.replace(/[^a-zA-Z0-9.-]/g, '').slice(0, 64);
                 const filename = crypto.randomBytes(8).toString('hex') + "_" + safeName;
                 await Bun.write(path.join(uploadDir, filename), buffer);
                 ans.file_url = `/uploads/${filename}`;
               } catch(e) {
                 console.error("[exampool] Failed to write offline file", e);
               }
            }
          }
        }
      }
    }

    const tx = db.transaction(() => {
      for (const examData of exams) {
        // ── Offline PRACTICE submissions (JAMB/WAEC/etc. self-study items) ──
        // The exam page queues these as { practiceId, answers } when the device
        // is offline; give each answered question its own practice log so
        // telemetry (XP, topic mastery) counts offline practice too.
        if (typeof examData?.practiceId === "string" && Array.isArray(examData?.answers)) {
          const parts = examData.practiceId.split("_");
          if (parts.length < 3) continue;
          const cb_exam_body = parts[0];
          const cb_year = parseInt(parts[1], 10);
          const cb_subject = parts.slice(2).join("_");
          const cbRows = db.prepare(`
            SELECT id, correct_answer FROM content_bank.content_bank
            WHERE exam_body = ? AND year = ? AND subject_code = ?
          `).all(cb_exam_body, cb_year, cb_subject) as Array<{ id: number; correct_answer: any }>;
          const correctOf = new Map(cbRows.map((r) => [Number(r.id), r.correct_answer]));
          for (const ans of examData.answers) {
            const qid = Number(ans?.question_id);
            if (!qid || !correctOf.has(qid)) continue;
            const correctOpt = correctOf.get(qid);
            const optLetter = typeof correctOpt === "string" && /^[A-E]$/i.test(String(correctOpt))
              ? String(correctOpt).toUpperCase().charCodeAt(0) - 65
              : Number(correctOpt);
            const selectedNum = typeof ans.selected_option === "number"
              ? ans.selected_option
              : typeof ans.selected_option === "string" && /^[A-E]$/i.test(String(ans.selected_option))
                ? String(ans.selected_option).toUpperCase().charCodeAt(0) - 65
                : Number(ans.selected_option);
            const isCorrect = (String(ans.selected_option) === String(correctOpt) || optLetter === selectedNum) ? 1 : 0;
            try {
              queries.insertPracticeLog.run(
                auth.userId,
                qid,
                String(ans.selected_option ?? ans.essay_response ?? ""),
                isCorrect,
                Number(ans.time_spent_seconds || 0),
                Date.now(),
                "offline",
                "N/A",
                "unsigned"
              );
            } catch (e) { console.error("Offline practice log err:", e); }
          }
          synced++;
          const submissionId = examData.id ?? examData.submission_id ?? examData.client_id;
          if (submissionId != null) acknowledged_ids.push(submissionId);
          continue;
        }

        const { subject_id, start_time, end_time, answers } = examData;
        if (!subject_id) continue;
        
        const subject = queries.getSubjectById.get(subject_id) as any;
        if (!subject) continue;
        
        // [SECURITY FIX] Verify enrollment
        const enrollment = db.prepare(
          "SELECT id FROM subject_enrollments WHERE subject_id = ? AND student_id = ?"
        ).get(subject_id, auth.userId);
        if (!enrollment) continue;
        
        let exam = queries.getExamByStudentSubject.get(auth.userId, subject_id) as any;
        if (!exam) {
           // [SECURITY FIX] Only untimed assignments can be instantiated out-of-band via offline sync
           if (subject.is_assignment !== 1) continue;
           
           queries.createExam.run(
             auth.userId,
             subject_id,
             start_time || new Date().toISOString(),
             JSON.stringify(answers || []),
             subject.session || currentTerm,
             subject.term || currentTerm,
             "assignment",
             null,
             "released",
             5,
             "[]"
           );
           exam = queries.getExamByStudentSubject.get(auth.userId, subject_id) as any;
        } else if (exam.status === "completed") {
           // Already completed — acknowledge so client removes it from pending queue
           const submissionId = examData.id ?? examData.submission_id ?? examData.client_id;
           if (submissionId != null) acknowledged_ids.push(submissionId);
           continue;
        }

        // [SECURITY FIX] Enforce strict CBT time limits on offline sync
        // If a student tries to submit a CBT exam via offline sync hours later, block it.
        if (subject.is_assignment !== 1) {
           const deadline = Date.parse(exam.start_time) + Number(subject.duration) * 60_000 + 30_000; // 30s grace
           if (Date.now() > deadline) {
             continue; // Reject late offline CBT submissions (prevents time bypass cheating)
           }
        }
        
        // Securely calculate score on the server
        let calculatedScore = 0;
        let calculatedTotal = 0;
        const processedAnswers = [];
        const safeAnswers = Array.isArray(answers) ? answers : [];
        
        for (const ans of safeAnswers) {
          const qRow = queries.getQuestionById.get(ans.question_id) as any;
          if (!qRow) continue;
          
          calculatedTotal += qRow.marks || 1;
          
          let isCorrect = 0;
          let marksAwarded = 0;
          
          if (qRow.question_type === "objective" || qRow.question_type === "true_false") {
            if (Number(qRow.correct_answer) === Number(ans.selected_option)) {
              isCorrect = 1;
              marksAwarded = qRow.marks || 1;
              calculatedScore += marksAwarded;
            }
          }
          
          // Handle offline file upload
          let finalFileUrl = ans.file_url ?? null;
          processedAnswers.push({
            question_id: ans.question_id,
            selected_option: ans.selected_option ?? null,
            essay_response: ans.essay_response ?? null,
            is_correct: isCorrect,
            marks_awarded: marksAwarded,
            file_url: finalFileUrl
          });
        }
        
        // Use atomic UPDATE with rowCount guard to prevent race conditions
        const submitRes = queries.submitExam.run(
          JSON.stringify(processedAnswers), 
          end_time || new Date().toISOString(), 
          calculatedScore, 
          calculatedTotal, 
          exam.id, 
          auth.userId
        ) as any;
        
        // If changes === 0, the exam was already submitted by another concurrent request
        if (!submitRes || submitRes.changes === 0) {
          continue;
        }
        
        // Insert granular answers
        for (const ans of processedAnswers) {
          queries.insertStudentAnswer.run(
            exam.id, ans.question_id, auth.userId, subject_id,
            ans.selected_option, ans.essay_response,
            ans.is_correct, ans.marks_awarded, ans.file_url
          );
        }
        
        // Free the redundant JSON blob — student_answers is now the authoritative store
        queries.updateExamAnswersJson.run(exam.id);
        
        synced++;
        const submissionId = examData.id ?? examData.submission_id ?? examData.client_id;
        if (submissionId != null) acknowledged_ids.push(submissionId);
      }
    });
    tx();
    
    return apiSuccess({ synced, acknowledged_ids });
  }

  // ── v4.1 License API ───────────────────────────────────────────────────────
  return null;
}
