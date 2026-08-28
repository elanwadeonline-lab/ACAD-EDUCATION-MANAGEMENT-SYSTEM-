# ACAD Supervisory Control Plane & Platform Ecosystem Walkthrough

## Executive Summary

The **ACAD Supervisory Control Plane** has been fully designed, implemented, and verified according to the master architecture specification (**"CLOUD SUPERVISES. LOCAL ACAD OPERATES."**). 

The platform provides a standalone, multi-tenant supervisory layer sitting above independent on-premise school installations on local LANs.

---

## Key Achievements & Verified Components

### 1. Database Isolation (`control_plane/database/`)
- Isolated SQLite database (`acad_control.db`), completely segregated from local school academic records (`exampool.db`).
- WAL journal mode, busy timeouts, and high-performance PRAGMAs.
- 14 dedicated relational tables:
  - `platform_users`, `organizations`, `schools`, `installations`, `licenses`, `trials`, `feature_flags`, `installation_heartbeats`, `telemetry_events`, `alerts`, `incidents`, `backups_telemetry`, `software_releases`, `platform_audit_logs`.
- Dedicated repository layer (No god-files): `userRepository`, `schoolRepository`, `installationRepository`, `trialRepository`, `licenseRepository`, `featureFlagRepository`, `telemetryRepository`, `healthRepository`, `alertRepository`, `incidentRepository`, `backupRepository`, `releaseRepository`, `auditRepository`.

### 2. Platform Authentication & Node Cryptography (`control_plane/auth.ts` & `nodeAuth.ts`)
- **Platform RBAC**: Owner, Administrator, Operations Engineer, Support Agent, Compliance Auditor.
- **Platform JWT**: 12-hour session tokens via `acad_platform_token` cookie and Bearer headers.
- **Node HMAC-SHA256**: Telemetry requests signed with `HMAC-SHA256(installationId:timestamp:body, secretKey)` with a ±300s replay prevention window.

### 3. Multi-Factor Health Engine (`control_plane/services/healthEngine.ts`)
- Computes continuous **0–100 Health Scores** based on 6 core factors:
  - Heartbeat latency (< 3m: Healthy, > 10m: Delayed, > 30m: Offline).
  - Storage free percentage (> 90% Warning, > 95% Critical).
  - RAM consumption.
  - SQLite database state.
  - Daily backup freshness (> 24h Warning, > 48h Overdue).
  - Local sync queue backlog.
- Automatic alarm generator for threshold breaches (`alertEngine.ts`).

### 4. Node Agent Daemon (`node_agent/`)
- **Machine Identity**: `node_agent/identity.ts` loads/generates local installation credentials.
- **Hardware & DB Sampler**: `node_agent/metrics.ts` samples CPU, RAM, disk, SQLite database & WAL sizes.
- **Offline FIFO Queue**: `node_agent/telemetryQueue.ts` provides local SQLite buffer (`telemetry_buffer.db`) holding up to 10,000 events during internet outages.
- **Heartbeat & Telemetry Daemon**: `node_agent/agent.ts` sends periodic 60s pulse with automatic flush upon reconnection.

### 5. Mission Control UI (`frontend/app/control/`)
Built with modern infrastructure aesthetics (Dark carbon theme, semantic status dots, dense tabular layouts, JetBrains Mono metrics):
- `/control`: Attention-oriented Command Center with Critical Drawer, Expiring Trials, Fleet Health Matrix, and Live Fleet Activity.
- `/control/schools`: Multi-campus directory with status filter pills and quick stats.
- `/control/schools/new`: School Provisioning Wizard.
- `/control/schools/[id]`: **360° Operations Workspace** featuring all 9 tabs:
  1. Overview (Key metrics & commercial status)
  2. Infrastructure (Connected nodes & LAN IPs)
  3. Operational Activity (Live telemetry stream)
  4. Deploy Node (1-click credential generator)
  5. Modules & Feature Flags (3-tier per-school toggles)
  6. Backups (Automated snapshot logs & verification)
  7. Incidents (Support tickets & resolution tracking)
  8. Onboarding Checklist (5-stage pilot tracker)
  9. Audit Trail (Immutable history)
- `/control/installations`: Fleet hardware & VM server supervisor.
- `/control/trials`: Free trial duration & conversion tracker.
- `/control/licenses`: Cryptographic license key registry.
- `/control/feature-flags`: Modular feature toggles.
- `/control/monitoring`: Fleet health matrix & telemetry stream.
- `/control/alerts`: Platform alarm acknowledgment & resolution.
- `/control/incidents`: Support incident tracking.
- `/control/backups`: Fleet backup verification.
- `/control/releases`: Update channels & version management.
- `/control/audit-logs`: Tamper-evident operator action audit logs.
- `/control/settings`: Platform staff operators & RBAC management.
- `/control/login`: Operator sign-in page.

---

## Verification Results

### Backend Automated Test Suite
- `bun test tests/control_plane.test.ts`: **10 pass, 0 fail, 41 assertions** (379ms).
  - Platform user seeding & login.
  - School and node provisioning.
  - Multi-factor health scoring & threshold penalization.
  - Trial lifecycle (creation, extension, conversion to paid enterprise license).
  - Feature flag resolution & per-school overrides.
  - Alert alarms & support incident remediation.
  - Tamper-evident audit logging.
  - Fleet overview aggregation.

### Frontend Static Build
- `bun run build` in `frontend/`: **All 93 static & SSG pages compiled and exported with 0 errors**.
