import { controlDb } from "./client";

/**
 * Initializes all database tables and indexes for the ACAD Supervisory Control Plane.
 */
export function initializeControlPlaneSchema(): void {
  // 1. Platform Staff Users
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS platform_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'ops_engineer', 'support_agent', 'auditor')),
      mfa_secret    TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
      last_login_at TEXT,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
  `);

  // 2. Multi-school Educational Organizations
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      slug          TEXT UNIQUE NOT NULL,
      country       TEXT NOT NULL DEFAULT 'Nigeria',
      state         TEXT,
      city          TEXT,
      contact_name  TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
  `);

  // 3. School Campuses
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS schools (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id              INTEGER NOT NULL,
      school_code         TEXT UNIQUE NOT NULL,
      name                TEXT NOT NULL,
      location            TEXT,
      status              TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('lead', 'trial', 'active', 'suspended', 'churned')),
      primary_admin_name  TEXT,
      primary_admin_email TEXT,
      primary_admin_phone TEXT,
      created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT
    )
  `);

  // 4. Physical / Virtual Server Installations
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS installations (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id         INTEGER NOT NULL,
      installation_id   TEXT UNIQUE NOT NULL,
      node_id           TEXT NOT NULL,
      secret_key_hash   TEXT NOT NULL,
      software_version  TEXT NOT NULL DEFAULT '5.3.0',
      agent_version     TEXT NOT NULL DEFAULT '1.0.0',
      release_channel   TEXT NOT NULL DEFAULT 'stable' CHECK(release_channel IN ('stable', 'beta', 'canary')),
      public_ip         TEXT,
      local_ip          TEXT,
      last_heartbeat_at TEXT,
      health_status     TEXT NOT NULL DEFAULT 'unknown' CHECK(health_status IN ('healthy', 'warning', 'degraded', 'critical', 'offline', 'unknown')),
      health_score      INTEGER NOT NULL DEFAULT 100,
      is_revoked        INTEGER NOT NULL DEFAULT 0 CHECK (is_revoked IN (0,1)),
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // 5. Licenses
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS licenses (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id             INTEGER NOT NULL,
      license_key           TEXT UNIQUE NOT NULL,
      plan_tier             TEXT NOT NULL DEFAULT 'standard' CHECK(plan_tier IN ('trial', 'starter', 'standard', 'enterprise', 'government')),
      status                TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('trial', 'active', 'suspended', 'expired', 'cancelled')),
      max_students          INTEGER NOT NULL DEFAULT 500,
      max_teachers          INTEGER NOT NULL DEFAULT 50,
      max_installations     INTEGER NOT NULL DEFAULT 1,
      enabled_modules_json  TEXT NOT NULL DEFAULT '["cbt_exam","question_bank","grading_center","report_cards"]',
      valid_from            TEXT NOT NULL,
      valid_until           TEXT NOT NULL,
      created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // 6. Trials Lifecycle
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS trials (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id       INTEGER NOT NULL,
      installation_id TEXT,
      status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('lead', 'provisioned', 'active', 'expiring', 'converted', 'expired')),
      duration_days   INTEGER NOT NULL DEFAULT 30,
      started_at      TEXT NOT NULL,
      expires_at      TEXT NOT NULL,
      converted_at    TEXT,
      student_limit   INTEGER NOT NULL DEFAULT 150,
      teacher_limit   INTEGER NOT NULL DEFAULT 15,
      onboarding_step INTEGER NOT NULL DEFAULT 1,
      notes           TEXT,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // 7. Feature Flags (Per-school modular controls)
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id   INTEGER NOT NULL,
      flag_key    TEXT NOT NULL,
      is_enabled  INTEGER NOT NULL DEFAULT 1 CHECK(is_enabled IN (0,1)),
      updated_by  INTEGER,
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      UNIQUE(school_id, flag_key),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // 8. Installation Heartbeats
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS installation_heartbeats (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      installation_id       TEXT NOT NULL,
      timestamp             TEXT NOT NULL,
      cpu_usage             REAL,
      memory_usage          REAL,
      storage_usage         REAL,
      db_status             TEXT,
      connected_clients     INTEGER,
      active_exam_sessions  INTEGER,
      sync_queue_size       INTEGER,
      raw_payload_json      TEXT,
      FOREIGN KEY (installation_id) REFERENCES installations(installation_id) ON DELETE CASCADE
    )
  `);

  // 9. Operational Telemetry Events
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id         INTEGER NOT NULL,
      installation_id   TEXT NOT NULL,
      event_type        TEXT NOT NULL,
      severity          TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'high', 'critical')),
      metadata_json     TEXT,
      software_version  TEXT,
      event_timestamp   TEXT NOT NULL,
      received_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
  `);

  // 10. Automated Alert Alarms
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id       INTEGER NOT NULL,
      installation_id TEXT NOT NULL,
      alert_type      TEXT NOT NULL,
      severity        TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'high', 'critical')),
      title           TEXT NOT NULL,
      details         TEXT,
      status          TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved')),
      acknowledged_by INTEGER,
      resolved_by     INTEGER,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      resolved_at     TEXT,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // 11. Support Incidents
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS incidents (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_code   TEXT UNIQUE NOT NULL,
      school_id       INTEGER NOT NULL,
      installation_id TEXT,
      severity        TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      status          TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'investigating', 'mitigated', 'resolved', 'closed')),
      title           TEXT NOT NULL,
      description     TEXT,
      assigned_to     INTEGER,
      root_cause      TEXT,
      mitigation      TEXT,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      resolved_at     TEXT,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // 12. Backup Telemetry Records
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS backups_telemetry (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      installation_id   TEXT NOT NULL,
      school_id         INTEGER NOT NULL,
      backup_type       TEXT NOT NULL DEFAULT 'local_snapshot',
      backup_size_bytes INTEGER NOT NULL DEFAULT 0,
      destination       TEXT NOT NULL,
      is_successful     INTEGER NOT NULL DEFAULT 1,
      duration_ms       INTEGER NOT NULL DEFAULT 0,
      error_message     TEXT,
      timestamp         TEXT NOT NULL,
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // 13. Software Releases
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS software_releases (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      version               TEXT UNIQUE NOT NULL,
      release_channel       TEXT NOT NULL DEFAULT 'stable' CHECK(release_channel IN ('stable', 'beta', 'canary')),
      min_agent_version     TEXT NOT NULL DEFAULT '1.0.0',
      release_notes         TEXT,
      download_url          TEXT,
      sha256_hash           TEXT,
      is_critical_security  INTEGER NOT NULL DEFAULT 0,
      released_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
  `);

  // 14. Platform Audit Log (Immutable append-only)
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS platform_audit_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id      INTEGER,
      actor_email   TEXT NOT NULL,
      action        TEXT NOT NULL,
      target_type   TEXT NOT NULL,
      target_id     TEXT NOT NULL,
      details_json  TEXT,
      ip_address    TEXT,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
  `);

  // 15. Bidirectional Sync Queue (Cloud → Node config push delivery)
  controlDb.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      installation_id TEXT NOT NULL,
      school_id       INTEGER NOT NULL,
      payload_type    TEXT NOT NULL CHECK(payload_type IN ('feature_flags', 'license', 'config', 'force_update', 'reboot_request', 'diagnostics')),
      payload_json    TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'delivered', 'failed')),
      queued_by       INTEGER,
      queued_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      delivered_at    TEXT,
      FOREIGN KEY (installation_id) REFERENCES installations(installation_id) ON DELETE CASCADE
    )
  `);
  // Migrate existing table if it lacks new payload types (older CHECK constraint)
  try {
    const sql = (controlDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sync_queue'").get() as any)?.sql || "";
    if (sql && !sql.includes("'diagnostics'")) {
      // Rebuild table with expanded CHECK
      controlDb.run("PRAGMA foreign_keys = OFF");
      controlDb.run(`
        CREATE TABLE sync_queue_new (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          installation_id TEXT NOT NULL,
          school_id       INTEGER NOT NULL,
          payload_type    TEXT NOT NULL CHECK(payload_type IN ('feature_flags', 'license', 'config', 'force_update', 'reboot_request', 'diagnostics')),
          payload_json    TEXT NOT NULL,
          status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'delivered', 'failed')),
          queued_by       INTEGER,
          queued_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
          delivered_at    TEXT,
          FOREIGN KEY (installation_id) REFERENCES installations(installation_id) ON DELETE CASCADE
        )
      `);
      controlDb.run(`INSERT INTO sync_queue_new (id, installation_id, school_id, payload_type, payload_json, status, queued_by, queued_at, delivered_at) SELECT id, installation_id, school_id, payload_type, payload_json, status, queued_by, queued_at, delivered_at FROM sync_queue`);
      controlDb.run("DROP TABLE sync_queue");
      controlDb.run("ALTER TABLE sync_queue_new RENAME TO sync_queue");
      controlDb.run("PRAGMA foreign_keys = ON");
    }
  } catch (e) {
    console.warn("[schema] sync_queue diagnostics migration skipped:", e);
  }

  // Optimized Query Indexes
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_installations_school_id ON installations(school_id)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_installations_health ON installations(health_status)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_trials_school_id ON trials(school_id)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_trials_status ON trials(status)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_licenses_school_id ON licenses(school_id)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_heartbeats_install_time ON installation_heartbeats(installation_id, timestamp)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_telemetry_school_time ON telemetry_events(school_id, event_timestamp)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_alerts_school_status ON alerts(school_id, status)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)");
  controlDb.run("CREATE INDEX IF NOT EXISTS idx_audit_time ON platform_audit_logs(created_at)");
}
