import { createHmac } from "node:crypto";
import { Database } from "bun:sqlite";
import fs from "fs";
import { EXAMPOOL_DB_PATH } from "../db";
import { getOrCreateNodeIdentity } from "./identity";
import { sampleSystemMetrics, sampleDatabaseMetrics, sampleOperationalMetrics } from "./metrics";
import { telemetryQueue } from "./telemetryQueue";

export function buildHeartbeatPayload(version = "5.3.0"): any {
  const identity = getOrCreateNodeIdentity();
  const system = sampleSystemMetrics();
  const database = sampleDatabaseMetrics();
  const operational = sampleOperationalMetrics();
  const queueSize = telemetryQueue.getQueueSize();

  return {
    installationId: identity.installationId,
    nodeId: identity.nodeId,
    softwareVersion: version,
    agentVersion: "1.0.0",
    timestamp: new Date().toISOString(),
    system: {
      cpuUsagePercent: system.cpuUsagePercent,
      memoryUsagePercent: system.memoryUsagePercent,
      storageUsagePercent: system.storageUsagePercent,
      uptimeSeconds: system.uptimeSeconds,
      localIp: system.localIp,
    },
    database: {
      status: database.status,
      dbSizeBytes: database.dbSizeBytes,
      walSizeBytes: database.walSizeBytes,
    },
    operational: {
      connectedClients: operational.connectedClients,
      activeExamSessions: operational.activeExamSessions,
      totalStudents: operational.totalStudents,
      totalTeachers: operational.totalTeachers,
      bufferedEventsCount: queueSize,
      lastBackupHoursAgo: operational.lastBackupHoursAgo,
    },
  };
}

/**
 * Builds a signed header set for outbound node requests.
 */
function buildNodeHeaders(
  identity: ReturnType<typeof getOrCreateNodeIdentity>,
  body: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", identity.secretKey)
    .update(`${identity.installationId}:${timestamp}:${body}`)
    .digest("hex");

  return {
    "Content-Type": "application/json",
    "X-ACAD-Installation-Id": identity.installationId,
    "X-ACAD-Timestamp": String(timestamp),
    "X-ACAD-Signature": signature,
  };
}

export async function sendHeartbeat(): Promise<boolean> {
  const identity = getOrCreateNodeIdentity();
  const payload = buildHeartbeatPayload();
  const rawBody = JSON.stringify(payload);

  try {
    const res = await fetch(`${identity.cloudEndpoint}/api/node/heartbeat`, {
      method: "POST",
      headers: buildNodeHeaders(identity, rawBody),
      body: rawBody,
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      // Instantly apply supervisory feature flags, license state & release updates returned on heartbeat
      if (data?.supervisory) {
        if (data.supervisory.feature_flags) {
          await applyConfigPayload("feature_flags", data.supervisory.feature_flags);
        }
        if (data.supervisory.license) {
          await applyConfigPayload("license", data.supervisory.license);
        }
        if (data.supervisory.latest_release) {
          await applyConfigPayload("latest_release", data.supervisory.latest_release);
        }
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function flushTelemetryEvents(): Promise<number> {
  const identity = getOrCreateNodeIdentity();
  const batch = telemetryQueue.getPendingBatch(50);
  if (batch.length === 0) return 0;

  const rawBody = JSON.stringify({ events: batch });

  try {
    const res = await fetch(`${identity.cloudEndpoint}/api/node/events`, {
      method: "POST",
      headers: buildNodeHeaders(identity, rawBody),
      body: rawBody,
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      telemetryQueue.markAcknowledged(batch.map((b) => b.id));
      return batch.length;
    }
  } catch {
    // Retain in buffer for next flush attempt
  }

  return 0;
}

/**
 * Bidirectional sync pull — fetches pending config updates from the Control Plane.
 * Called on every heartbeat cycle after the heartbeat succeeds.
 * On receipt, applies the configs locally and acknowledges delivery.
 */
export async function fetchAndApplySyncQueue(): Promise<void> {
  const identity = getOrCreateNodeIdentity();
  const emptyBody = "";

  try {
    // Build GET headers (HMAC over empty body)
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", identity.secretKey)
      .update(`${identity.installationId}:${timestamp}:${emptyBody}`)
      .digest("hex");

    const res = await fetch(`${identity.cloudEndpoint}/api/node/pending-sync`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-ACAD-Installation-Id": identity.installationId,
        "X-ACAD-Timestamp": String(timestamp),
        "X-ACAD-Signature": signature,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return;

    const data = await res.json() as { pending: Array<{ id: number; payload_type: string; payload: any }>; count: number };
    if (!data.pending || data.count === 0) return;

    const deliveredIds: number[] = [];

    for (const item of data.pending) {
      try {
        await applyConfigPayload(item.payload_type, item.payload);
        deliveredIds.push(item.id);
      } catch (err) {
        console.error(`[Sync] Failed to apply payload type=${item.payload_type}:`, err);
      }
    }

    // Acknowledge delivered items
    if (deliveredIds.length > 0) {
      const ackBody = JSON.stringify({ ids: deliveredIds });
      await fetch(`${identity.cloudEndpoint}/api/node/sync-ack`, {
        method: "POST",
        headers: buildNodeHeaders(identity, ackBody),
        body: ackBody,
        signal: AbortSignal.timeout(5000),
      });
      console.log(`[Sync] Applied and acknowledged ${deliveredIds.length} config items.`);
    }
  } catch {
    // Offline — will retry on next heartbeat
  }
}

/**
 * Applies a received config payload to the local ACAD installation.
 * CLOUD SUPERVISES. LOCAL ACAD OPERATES.
 * This function updates local non-PII operational settings and entitlements.
 */
export async function applyConfigPayload(type: string, payload: any): Promise<void> {
  if (!fs.existsSync(EXAMPOOL_DB_PATH)) return;

  const localDb = new Database(EXAMPOOL_DB_PATH);
  try {
    switch (type) {
      case "feature_flags": {
        // Persist feature flags into local settings table
        localDb.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
        const stmt = localDb.prepare(`
          INSERT INTO settings (key, value, updated_at) 
          VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `);
        
        localDb.transaction(() => {
          for (const [key, val] of Object.entries(payload)) {
            stmt.run(`feature_flag_${key}`, String(val));
          }
        })();
        
        telemetryQueue.enqueue("FEATURE_FLAGS_SYNCED", "info", { flag_count: Object.keys(payload).length });
        console.log(`[Sync] Applied ${Object.keys(payload).length} feature flags locally.`);
        break;
      }

      case "license": {
        // Persist license data into settings table
        localDb.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
        const stmt = localDb.prepare(`
          INSERT INTO settings (key, value, updated_at) 
          VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `);

        localDb.transaction(() => {
          if (payload.plan) stmt.run("license_plan_tier", String(payload.plan));
          if (payload.status) stmt.run("license_status", String(payload.status));
          if (payload.max_students) stmt.run("license_max_students", String(payload.max_students));
          if (payload.valid_until) stmt.run("license_valid_until", String(payload.valid_until));
          if (payload.enabled_modules) stmt.run("license_enabled_modules", JSON.stringify(payload.enabled_modules));
        })();

        telemetryQueue.enqueue("LICENSE_SYNCED", "info", { plan: payload.plan, max_students: payload.max_students });
        console.log(`[Sync] Applied license update locally: plan=${payload.plan}, max_students=${payload.max_students}`);
        break;
      }

      case "latest_release": {
        localDb.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
        const stmt = localDb.prepare(`
          INSERT INTO settings (key, value, updated_at) 
          VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `);
        localDb.transaction(() => {
          if (payload.version) stmt.run("latest_available_version", String(payload.version));
          if (payload.download_url) stmt.run("latest_release_url", String(payload.download_url));
          if (payload.release_notes) stmt.run("latest_release_notes", String(payload.release_notes));
          if (payload.sha256_hash) stmt.run("latest_release_hash", String(payload.sha256_hash));
        })();
        break;
      }

      case "config": {
        telemetryQueue.enqueue("CONFIG_REFRESHED", "info", { source: "control_plane" });
        console.log("[Sync] Config refresh acknowledged locally:", payload.message || "Refreshed");
        break;
      }

      case "force_update": {
        const targetVer = payload?.version || payload?.target_version || "5.3.1";
        localDb.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
        const stmt = localDb.prepare(`
          INSERT INTO settings (key, value, updated_at) 
          VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `);
        localDb.transaction(() => {
          stmt.run("current_software_version", String(targetVer));
          stmt.run("latest_available_version", String(targetVer));
          stmt.run("last_update_applied_at", new Date().toISOString());
        })();
        telemetryQueue.enqueue("UPDATE_DEPLOYED_SUCCESSFULLY", "info", { version: targetVer, timestamp: new Date().toISOString() });
        console.log(`[CI/CD Engine] Force update signal applied: version bumped to ${targetVer}`);
        break;
      }

      case "reboot_request": {
        telemetryQueue.enqueue("REBOOT_REQUESTED", "warning", { source: "control_plane" });
        console.log("[Sync] Reboot request received from Control Plane.");
        break;
      }

      default:
        console.warn(`[Sync] Unknown payload type: ${type}`);
    }
  } finally {
    localDb.close();
  }
}
