import { alertRepository } from "../database/repositories/alertRepository";
import type { HealthEvaluation } from "./healthEngine";

/**
 * Automated Alert Alarm Engine
 * Analyzes health evaluation results and auto-generates platform alerts when thresholds are breached.
 * Includes deduplication to prevent flood of identical alerts for active problems.
 */
export function checkAndGenerateAlerts(
  schoolId: number,
  installationId: string,
  evaluation: HealthEvaluation
): void {
  // 1. Storage Alert
  if (evaluation.factors.storage.usagePercent >= 95) {
    if (!alertRepository.hasOpenAlert(installationId, "storage_critical")) {
      alertRepository.create({
        school_id: schoolId,
        installation_id: installationId,
        alert_type: "storage_critical",
        severity: "critical",
        title: "Storage Exhaustion Alarm (> 95% full)",
        details: `Node storage disk is at ${evaluation.factors.storage.usagePercent}% capacity. Immediate action required.`,
      });
    }
  } else if (evaluation.factors.storage.usagePercent >= 90) {
    if (!alertRepository.hasOpenAlert(installationId, "storage_warning") && !alertRepository.hasOpenAlert(installationId, "storage_critical")) {
      alertRepository.create({
        school_id: schoolId,
        installation_id: installationId,
        alert_type: "storage_warning",
        severity: "warning",
        title: "Storage Warning (> 90% full)",
        details: `Node storage disk is at ${evaluation.factors.storage.usagePercent}% capacity.`,
      });
    }
  }

  // 2. Database Integrity Alert
  if (evaluation.factors.database.status !== "healthy" && evaluation.factors.database.status !== "ok") {
    if (!alertRepository.hasOpenAlert(installationId, "database_corruption")) {
      alertRepository.create({
        school_id: schoolId,
        installation_id: installationId,
        alert_type: "database_corruption",
        severity: "critical",
        title: "SQLite Database Integrity Failure",
        details: `Local database health check returned: ${evaluation.factors.database.status}`,
      });
    }
  }

  // 3. Backup Overdue Alert
  if (evaluation.factors.backup.hoursSinceLast > 48) {
    if (!alertRepository.hasOpenAlert(installationId, "backup_failed")) {
      alertRepository.create({
        school_id: schoolId,
        installation_id: installationId,
        alert_type: "backup_failed",
        severity: "high",
        title: "Automated Daily Backup Overdue (> 48h)",
        details: `Last local backup was recorded ${Math.floor(evaluation.factors.backup.hoursSinceLast)} hours ago.`,
      });
    }
  }
}
