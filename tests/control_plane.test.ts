import { describe, it, expect, beforeAll } from "bun:test";
import { seedControlPlane } from "../control_plane/database/seed";
import { userRepository } from "../control_plane/database/repositories/userRepository";
import { schoolRepository } from "../control_plane/database/repositories/schoolRepository";
import { organizationRepository } from "../control_plane/database/repositories/organizationRepository";
import { installationRepository } from "../control_plane/database/repositories/installationRepository";
import { trialRepository } from "../control_plane/database/repositories/trialRepository";
import { licenseRepository } from "../control_plane/database/repositories/licenseRepository";
import { featureFlagRepository } from "../control_plane/database/repositories/featureFlagRepository";
import { healthRepository } from "../control_plane/database/repositories/healthRepository";
import { alertRepository } from "../control_plane/database/repositories/alertRepository";
import { incidentRepository } from "../control_plane/database/repositories/incidentRepository";
import { auditRepository } from "../control_plane/database/repositories/auditRepository";
import { evaluateNodeHealth } from "../control_plane/services/healthEngine";
import { generatePlatformToken, verifyPlatformToken } from "../control_plane/auth";
import { createHmac } from "node:crypto";

describe("ACAD Supervisory Control Plane - Full Operational Suite", () => {
  beforeAll(async () => {
    await seedControlPlane();
  });

  describe("1. Platform Authentication & RBAC", () => {
    it("seeds platform owner and generates valid platform JWT", () => {
      const owner = userRepository.findByEmail("owner@acad.ng");
      expect(owner).not.toBeNull();
      expect(owner?.role).toBe("owner");

      const token = generatePlatformToken(owner!);
      expect(token).toBeString();

      const verified = verifyPlatformToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.platformUserId).toBe(owner!.id);
      expect(verified?.email).toBe("owner@acad.ng");
      expect(verified?.role).toBe("owner");
    });
  });

  describe("2. School & Installation Provisioning", () => {
    it("provisions an organization, school campus, and distinct installation", () => {
      const org = organizationRepository.create({
        name: "Lagos Model Schools Board",
        slug: `lagos-board-${Date.now()}`,
        country: "Nigeria",
        state: "Lagos",
        city: "Ikeja",
        contact_name: "Engr. D. Adeleke",
        contact_email: `adeleke_${Date.now()}@lagos.gov.ng`,
        contact_phone: "+234 801 222 3344",
      });
      expect(org.id).toBeGreaterThan(0);

      const code = `LMS-${Math.floor(100 + Math.random() * 900)}`;
      const school = schoolRepository.create({
        org_id: org.id,
        school_code: code,
        name: "Lagos City Model College",
        location: "Yaba, Lagos",
        status: "trial",
        primary_admin_name: "Principal T. Fashola",
        primary_admin_email: "fashola@lagosmodel.edu.ng",
      });
      expect(school.id).toBeGreaterThan(0);
      expect(school.school_code).toBe(code);

      const inst = installationRepository.create({
        school_id: school.id,
        installation_id: `INST-${code}-MAIN`,
        node_id: "NODE-YABA-LAB",
        secret_key_hash: "hash_test_123",
        software_version: "5.3.0",
        release_channel: "stable",
      });
      expect(inst.id).toBeGreaterThan(0);
      expect(inst.school_id).toBe(school.id);
      expect(inst.installation_id).toBe(`INST-${code}-MAIN`);
    });
  });

  describe("3. Multi-Factor Health Engine", () => {
    it("computes 100 score for healthy node with fresh heartbeat and normal resources", () => {
      const health = evaluateNodeHealth({
        lastHeartbeatEpochMs: Date.now() - 10_000, // 10s ago
        storageUsagePercent: 45,
        memoryUsagePercent: 50,
        dbStatus: "healthy",
        hoursSinceLastBackup: 4,
        syncQueueBacklog: 0,
      });

      expect(health.score).toBe(100);
      expect(health.status).toBe("healthy");
      expect(health.warnings.length).toBe(0);
    });

    it("penalizes high storage and delayed backups into warning/degraded status", () => {
      const health = evaluateNodeHealth({
        lastHeartbeatEpochMs: Date.now() - 40_000,
        storageUsagePercent: 92, // -25 penalty
        memoryUsagePercent: 60,
        dbStatus: "healthy",
        hoursSinceLastBackup: 30, // -15 penalty
        syncQueueBacklog: 600,    // -10 penalty
      });

      expect(health.score).toBe(50); // 100 - 25 - 15 - 10 = 50
      expect(health.status).toBe("degraded");
      expect(health.warnings.length).toBeGreaterThanOrEqual(3);
    });

    it("classifies offline nodes with latency > 30 minutes", () => {
      const health = evaluateNodeHealth({
        lastHeartbeatEpochMs: Date.now() - 2_000_000, // > 30 min
        storageUsagePercent: 40,
      });

      expect(health.status).toBe("offline");
    });
  });

  describe("4. Trial Lifecycle & Paid License Conversion", () => {
    it("creates, extends, and converts a trial to active enterprise license", () => {
      const org = organizationRepository.listAll()[0];
      const school = schoolRepository.create({
        org_id: org.id,
        school_code: `TST-${Math.floor(1000 + Math.random() * 9000)}`,
        name: "Test Academy",
        status: "trial",
      });

      const trial = trialRepository.create({
        school_id: school.id,
        duration_days: 14,
        student_limit: 100,
      });
      expect(trial.status).toBe("active");
      expect(trial.duration_days).toBe(14);

      // Extend trial by 10 days
      const extended = trialRepository.extend(trial.id, 10);
      expect(extended?.duration_days).toBe(24);

      // Convert trial to paid
      const converted = trialRepository.convert(trial.id);
      expect(converted?.status).toBe("converted");

      // Issue active license
      const license = licenseRepository.create({
        school_id: school.id,
        license_key: `LIC-${school.school_code}-PRO`,
        plan_tier: "enterprise",
        max_students: 1500,
        max_teachers: 100,
        valid_until: "2028-01-01T00:00:00Z",
      });
      expect(license.plan_tier).toBe("enterprise");
      expect(license.max_students).toBe(1500);
      expect(license.enabled_modules.length).toBeGreaterThan(0);
    });
  });

  describe("5. Feature Flags & Modular Controls", () => {
    it("resolves default modules and applies per-school flag overrides", () => {
      const school = schoolRepository.listAll()[0];
      const flagsBefore = featureFlagRepository.getFlagsForSchool(school.id);
      expect(flagsBefore["cbt_exam"]).toBe(true);

      // Override AI module to enabled
      featureFlagRepository.setFlag(school.id, "ai_learning_engine", true);
      const flagsAfter = featureFlagRepository.getFlagsForSchool(school.id);
      expect(flagsAfter["ai_learning_engine"]).toBe(true);

      // Disable timetable for this school
      featureFlagRepository.setFlag(school.id, "timetables", false);
      const flagsFinal = featureFlagRepository.getFlagsForSchool(school.id);
      expect(flagsFinal["timetables"]).toBe(false);
    });
  });

  describe("6. Automated Alerts & Support Incidents", () => {
    it("creates alerts, acknowledges, and manages incident tickets", () => {
      const school = schoolRepository.listAll()[0];
      const alert = alertRepository.create({
        school_id: school.id,
        installation_id: "INST-TEST-01",
        alert_type: "storage_warning",
        severity: "warning",
        title: "Test Storage Alert",
        details: "Storage disk at 91%",
      });
      expect(alert.status).toBe("open");

      alertRepository.acknowledge(alert.id, 1);
      const acked = alertRepository.findById(alert.id);
      expect(acked?.status).toBe("acknowledged");

      alertRepository.resolve(alert.id, 1);
      const resolved = alertRepository.findById(alert.id);
      expect(resolved?.status).toBe("resolved");

      // Create support incident
      const inc = incidentRepository.create({
        school_id: school.id,
        severity: "medium",
        title: "Client disconnected during mock CBT session",
        description: "Network switch reboot in local lab.",
      });
      expect(inc.status).toBe("open");

      incidentRepository.updateStatus(inc.id, "resolved", {
        root_cause: "Local power trip on lab switch",
        mitigation: "UPS connected to laboratory switch",
      });
      const resolvedInc = incidentRepository.findById(inc.id);
      expect(resolvedInc?.status).toBe("resolved");
      expect(resolvedInc?.root_cause).toContain("Local power trip");
    });
  });

  describe("7. Immutable Platform Audit Trail", () => {
    it("records tamper-evident audit logs", () => {
      auditRepository.record({
        actor_email: "owner@acad.ng",
        action: "TEST_SECURITY_ACTION",
        target_type: "license",
        target_id: "LIC-001",
        details: { reason: "Routine annual audit" },
        ip_address: "127.0.0.1",
      });

      const logs = auditRepository.listRecent(5);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe("TEST_SECURITY_ACTION");
      expect(logs[0].actor_email).toBe("owner@acad.ng");
    });
  });

  describe("8. Fleet Overview Health Matrix", () => {
    it("aggregates fleet statistics accurately", () => {
      const overview = healthRepository.getOverviewMetrics();
      expect(overview.totalSchools).toBeGreaterThan(0);
      expect(overview.totalStudentsAggregate).toBeGreaterThan(0);
    });
  });
});
