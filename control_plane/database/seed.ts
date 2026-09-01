import { initializeControlPlaneSchema } from "./schema";
import { userRepository } from "./repositories/userRepository";
import { releaseRepository } from "./repositories/releaseRepository";
import { organizationRepository } from "./repositories/organizationRepository";
import { schoolRepository } from "./repositories/schoolRepository";
import { installationRepository } from "./repositories/installationRepository";
import { licenseRepository } from "./repositories/licenseRepository";
import { getOrCreateNodeIdentity } from "../../node_agent/identity";
import { sendHeartbeat } from "../../node_agent/heartbeat";
import { hashPassword } from "../../auth";
import db from "../../db";

export async function seedControlPlane(): Promise<void> {
  initializeControlPlaneSchema();

  // 1. Seed Default Platform Operators if not exists
  const existingOwner = userRepository.findByEmail("owner@acad.ng");
  if (!existingOwner) {
    const passwordHash = await hashPassword("AdminPassword123!");
    userRepository.create("ACAD Platform Owner", "owner@acad.ng", passwordHash, "owner");
    userRepository.create("Chief Systems Engineer", "ops@acad.ng", passwordHash, "ops_engineer");
    userRepository.create("Customer Success Lead", "support@acad.ng", passwordHash, "support_agent");
    console.log("⚡ [Control Plane] Platform users initialized (owner@acad.ng, ops@acad.ng, support@acad.ng)");
  }

  // 2. Ensure Initial Software Release Record exists
  const releases = releaseRepository.listAll();
  if (releases.length === 0) {
    releaseRepository.create({
      version: "5.3.0",
      release_channel: "stable",
      min_agent_version: "1.0.0",
      release_notes: "Production GA release featuring real-time supervisory telemetry, dynamic modular gating, and automated sync.",
      is_critical_security: false,
    });
  }

  // 3. Auto-seed / sync local organization
  let org = organizationRepository.listAll()[0];
  if (!org) {
    org = organizationRepository.create({
      name: "ACAD Educational Network",
      slug: "acad-network",
      country: "Nigeria",
      city: "Lagos",
      contact_name: "Operations Team",
      contact_email: "ops@acad.ng",
      contact_phone: "+2348000000000",
    });
  }

  // 4. Auto-detect local school identity from local database
  let schoolName = "ExamPool Model International Academy";
  try {
    const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'SCHOOL_NAME'").get() as any;
    if (settingRow?.value) schoolName = settingRow.value;
    const configRow = db.prepare("SELECT org_name FROM config LIMIT 1").get() as any;
    if (configRow?.org_name) schoolName = configRow.org_name;
  } catch {}

  let school = schoolRepository.listAll()[0];
  if (!school) {
    school = schoolRepository.create({
      org_id: org.id,
      school_code: "ACAD-LOCAL",
      name: schoolName,
      location: "Main Campus, Lagos",
      status: "active",
      primary_admin_name: "Principal Administrator",
      primary_admin_email: "admin@acad.local",
      primary_admin_phone: "+2348000000001",
    });
  } else if (schoolName && school.name !== schoolName) {
    schoolRepository.update(school.id, { name: schoolName });
  }

  // 5. Auto-register node installation for local machine
  const identity = getOrCreateNodeIdentity();
  let installation = installationRepository.findByInstallationId(identity.installationId);
  if (!installation) {
    installation = installationRepository.create({
      school_id: school.id,
      installation_id: identity.installationId,
      node_id: identity.nodeId,
      secret_key_hash: identity.secretKey,
      software_version: "5.3.0",
      agent_version: "1.0.0",
      release_channel: "stable",
    });
  }

  // 6. Ensure active license exists
  const existingLicense = licenseRepository.findBySchoolId(school.id);
  if (!existingLicense) {
    licenseRepository.create({
      school_id: school.id,
      license_key: `ACAD-ENT-${Date.now().toString(36).toUpperCase()}`,
      plan_tier: "enterprise",
      max_students: 2500,
      max_teachers: 150,
      max_installations: 5,
      enabled_modules: [
        "cbt_exams",
        "question_banks",
        "grading_center",
        "report_cards",
        "attendance",
        "student_portal",
        "teacher_portal",
        "guardian_portal",
        "ai_proctoring",
      ],
      valid_until: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
  }

  // 7. Fire initial heartbeat pulse immediately so live metrics are instantly recorded
  try {
    await sendHeartbeat();
  } catch {}

  // 8. Start periodic stale-node sweeper (every 5 minutes) — marks heartbeat-timeout nodes as offline with real alerts
  if (Bun.env.NODE_ENV !== "test") {
    setInterval(() => {
      try {
        const count = installationRepository.sweepStaleToOffline();
        if (count > 0) console.log(`[Control Plane] Periodic sweep marked ${count} stale node(s) offline`);
      } catch (err) {
        console.error("[Control Plane] Stale sweep error:", err);
      }
    }, 5 * 60 * 1000);
    // Also sweep once immediately to clean any stale state from previous run
    try { installationRepository.sweepStaleToOffline(); } catch {}
  }
}
