// Zone file extracted from server.ts during route modularization.
// Route logic below is verbatim from server.ts; identifiers resolve via ../server bindings.
import db, { queries } from "../../db";
import { isPositiveIntId, trimStr } from "../../validation";
import {
  apiSuccess, apiMessage, apiError, readJson, requireAuth, requireRole, sqlInt, rowCount,
  auditLog, notifyUser, notifyOperators, isSqliteUniqueError, jsonSafeStringify,
  corsHeaders, authz, licenseValidator, stripCorrectAnswer,
} from "../../server";


export async function tryGuardianLinksAdmin(req: Request, method: string, pathname: string, url: URL): Promise<Response | null> {
  if ((pathname === "/api/v2/guardian-links" || pathname === "/api/admin/guardian-links") && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const status = url.searchParams.get("status");
    if (status === "pending") return apiSuccess(queries.getPendingGuardianLinks.all());
    return apiSuccess(queries.getAllGuardianLinks.all());
  }

  if (pathname === "/api/admin/guardian-links/lookup-student" && method === "GET") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator", "guardian"]);
    const q = trimStr(url.searchParams.get("q") || url.searchParams.get("query") || "");
    if (!q) return apiSuccess([]);
    const students = db.prepare(`
      SELECT u.id, u.name, u.email, u.reg_id, u.grade, u.image_url,
             (SELECT COUNT(*) FROM guardian_student_links gsl WHERE gsl.student_id = u.id AND gsl.status = 'approved') as linked_guardians_count
      FROM users u
      WHERE u.role = 'student' AND u.is_active = 1
        AND (
          UPPER(u.reg_id) LIKE UPPER(?)
          OR UPPER(u.name) LIKE UPPER(?)
          OR UPPER(u.email) LIKE UPPER(?)
          OR CAST(u.id AS TEXT) = ?
        )
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, q);
    return apiSuccess(students);
  }

  if ((pathname === "/api/v2/guardian-links" || pathname === "/api/admin/guardian-links") && method === "POST") {
    const auth = requireAuth(req);
    // Guardians can request their own links; operators can create on their behalf
    requireRole(auth.role, ["guardian", "operator"]);
    const body = await readJson(req);
    const guardian_id = auth.role === "guardian" ? auth.userId : Number(body?.guardian_id || body?.guardianId);
    let student_id = isPositiveIntId(Number(body?.student_id || body?.studentId)) ? Number(body?.student_id || body?.studentId) : 0;
    const regIdV2 = trimStr(body?.reg_id || body?.regId || body?.student_reg_id || body?.admission_number || (body?.student_id ? String(body.student_id) : ""));
    if (!student_id && regIdV2) {
      let studentMatch = db.prepare(`
        SELECT id, role, name, reg_id 
        FROM users 
        WHERE role = 'student' 
          AND (
            UPPER(TRIM(reg_id)) = UPPER(TRIM(?))
            OR UPPER(TRIM(email)) = UPPER(TRIM(?))
            OR CAST(id AS TEXT) = TRIM(?)
          )
        LIMIT 1
      `).get(regIdV2, regIdV2, regIdV2) as any;

      if (!studentMatch) {
        studentMatch = db.prepare(`
          SELECT id, role, name, reg_id 
          FROM users 
          WHERE role = 'student' 
            AND (
              reg_id LIKE ? 
              OR UPPER(TRIM(name)) = UPPER(TRIM(?))
            )
          LIMIT 1
        `).get(`%${regIdV2}%`, regIdV2) as any;
      }

      if (studentMatch) {
        student_id = Number(studentMatch.id);
      }
    }
    const relationship = trimStr(body?.relationship || "Parent").slice(0, 40);
    if (!isPositiveIntId(guardian_id) || !isPositiveIntId(student_id)) return apiError(400, "Student registration number or ID not found. Please verify the registration number.");
    const student = queries.getUserById.get(student_id) as any;
    const guardian = queries.getUserById.get(guardian_id) as any;
    if (!student || student.role !== "student") return apiError(400, "Invalid student id");
    if (!guardian || guardian.role !== "guardian") return apiError(400, "Guardian must have the guardian role");
    
    const isAdmin = auth.role === "operator";
    const initialStatus = isAdmin ? "approved" : "pending";
    const verificationMethod = "manual_admin";
    const verifiedBy = isAdmin ? auth.userId : null;
    const verifiedAt = isAdmin ? new Date().toISOString() : null;

    try {
      const existing = db.prepare("SELECT * FROM guardian_student_links WHERE guardian_id = ? AND student_id = ?").get(guardian_id, student_id) as any;
      let linkId: number;
      if (existing) {
        if (isAdmin) {
          db.prepare("UPDATE guardian_student_links SET status = 'approved', relationship = ?, verification_method = 'manual_admin', verified_by = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(relationship, auth.userId, existing.id);
          linkId = Number(existing.id);
        } else if (existing.status === "approved") {
          return apiError(409, "This student is already linked to your account");
        } else {
          db.prepare("UPDATE guardian_student_links SET status = 'pending', relationship = ? WHERE id = ?")
            .run(relationship, existing.id);
          linkId = Number(existing.id);
        }
      } else {
        const result = db.prepare(`
          INSERT INTO guardian_student_links (guardian_id, student_id, relationship, status, verification_method, verified_by, verified_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(guardian_id, student_id, relationship, initialStatus, verificationMethod, verifiedBy, verifiedAt) as { lastInsertRowid: number | bigint };
        linkId = Number(result.lastInsertRowid);
      }

      auditLog(auth.userId, `GUARDIAN_LINK_${initialStatus.toUpperCase()}`, "guardian_student_links", linkId, JSON.stringify({ guardian_id, student_id, relationship }));
      
      // Real-time SSE notification to Guardian if admin approved or created the link
      if (isAdmin) {
        notifyUser(guardian_id, {
          type: "notification",
          message: `Your child ${student.name} (${student.reg_id || student.grade || "Student"}) has been linked to your Guardian Portal by School Administration.`,
          link: "/guardian/wards",
        });
      }

      return apiSuccess({ id: linkId, status: initialStatus, message: isAdmin ? "Student linked and approved successfully" : "Link request submitted for admin approval" }, 201);
    } catch (e) {
      if (isSqliteUniqueError(e)) return apiError(409, "A link between this guardian and student already exists");
      throw e;
    }
  }

  const guardianLinkActionMatch = pathname.match(/^\/api\/(?:v2|admin)\/guardian-links\/(\d+)\/(approve|reject|revoke)$/);
  if (guardianLinkActionMatch && (method === "PUT" || method === "POST")) {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const linkId = Number(guardianLinkActionMatch[1]);
    const action = guardianLinkActionMatch[2] as string;
    if (!isPositiveIntId(linkId)) return apiError(400, "Invalid link id");
    const link = queries.getGuardianLink.get(linkId) as any;
    if (!link) return apiError(404, "Guardian link not found");
    const newStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "revoked";
    queries.updateGuardianLinkStatus.run(newStatus, auth.userId, linkId);
    auditLog(auth.userId, `GUARDIAN_LINK_${newStatus.toUpperCase()}`, "guardian_student_links", linkId, JSON.stringify({ action }));
    
    // Real-time SSE notification to Guardian
    if (newStatus === "approved") {
      notifyUser(Number(link.guardian_id), {
        type: "notification",
        message: "Your link request for your child has been approved by School Administration.",
        link: "/guardian/wards",
      });
    }

    return apiSuccess({ id: linkId, status: newStatus });
  }

  const guardianLinkDeleteMatch = pathname.match(/^\/api\/(?:v2|admin)\/guardian-links\/(\d+)$/);
  if (guardianLinkDeleteMatch && method === "DELETE") {
    const auth = requireAuth(req);
    requireRole(auth.role, ["operator"]);
    const linkId = Number(guardianLinkDeleteMatch[1]);
    if (!isPositiveIntId(linkId)) return apiError(400, "Invalid link id");
    db.prepare("DELETE FROM guardian_student_links WHERE id = ?").run(linkId);
    auditLog(auth.userId, "GUARDIAN_LINK_DELETED", "guardian_student_links", linkId, "{}");
    return apiSuccess({ id: linkId, message: "Guardian link deleted" });
  }

  // ── v2: Academic Calendar Events ──────────────────────────────────────────
  return null;
}
