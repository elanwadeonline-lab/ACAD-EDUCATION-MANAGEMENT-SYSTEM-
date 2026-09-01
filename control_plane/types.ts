/**
 * ACAD Supervisory Control Plane - Data Contracts & Type Definitions
 * Strict separation between Cloud Platform types and Local School Academic types.
 */

export type PlatformRole = "owner" | "admin" | "ops_engineer" | "support_agent" | "auditor";

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  role: PlatformRole;
  is_active: number;
  last_login_at?: string | null;
  created_at: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  country: string;
  state?: string | null;
  city?: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
}

export type SchoolStatus = "lead" | "trial" | "active" | "suspended" | "churned";

export interface School {
  id: number;
  org_id: number;
  school_code: string;
  name: string;
  location?: string | null;
  status: SchoolStatus;
  primary_admin_name?: string | null;
  primary_admin_email?: string | null;
  primary_admin_phone?: string | null;
  created_at: string;
  updated_at: string;
  // Computed / Joined fields
  organization_name?: string;
  installations_count?: number;
  health_status?: HealthStatus;
  health_score?: number;
  active_trial?: Trial | null;
  active_license?: License | null;
}

export type HealthStatus = "healthy" | "warning" | "degraded" | "critical" | "offline" | "unknown";
export type ReleaseChannel = "stable" | "beta" | "canary";

export interface Installation {
  id: number;
  school_id: number;
  installation_id: string; // e.g. "INST-7F93A2"
  node_id: string;         // e.g. "NODE-MAIN-01"
  secret_key_hash?: string;
  software_version: string;
  agent_version: string;
  release_channel: ReleaseChannel;
  public_ip?: string | null;
  local_ip?: string | null;
  last_heartbeat_at?: string | null;
  health_status: HealthStatus;
  health_score: number;
  is_revoked: number;
  created_at: string;
  // Joined fields
  school_name?: string;
  school_code?: string;
}

export type TrialStatus = "lead" | "provisioned" | "active" | "expiring" | "converted" | "expired";

export interface Trial {
  id: number;
  school_id: number;
  installation_id?: string | null;
  status: TrialStatus;
  duration_days: number;
  started_at: string;
  expires_at: string;
  converted_at?: string | null;
  student_limit: number;
  teacher_limit: number;
  onboarding_step: number;
  notes?: string | null;
  created_at: string;
  // Computed
  days_remaining?: number;
  usage_intensity?: "low" | "medium" | "high";
}

export type PlanTier = "trial" | "starter" | "standard" | "enterprise" | "government";
export type LicenseStatus = "trial" | "active" | "suspended" | "expired" | "cancelled";

export interface License {
  id: number;
  school_id: number;
  license_key: string;
  plan_tier: PlanTier;
  status: LicenseStatus;
  max_students: number;
  max_teachers: number;
  max_installations: number;
  enabled_modules: string[];
  valid_from: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: number;
  school_id: number;
  flag_key: string;
  is_enabled: number;
  updated_by?: number | null;
  updated_at: string;
}

export interface InstallationHeartbeat {
  id?: number;
  installation_id: string;
  timestamp: string;
  cpu_usage?: number;
  memory_usage?: number;
  storage_usage?: number;
  db_status?: string;
  connected_clients?: number;
  active_exam_sessions?: number;
  sync_queue_size?: number;
  raw_payload_json?: string;
}

export type AlertSeverity = "info" | "warning" | "high" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: number;
  school_id: number;
  installation_id: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  details?: string | null;
  status: AlertStatus;
  acknowledged_by?: number | null;
  resolved_by?: number | null;
  created_at: string;
  resolved_at?: string | null;
  // Joined
  school_name?: string;
  school_code?: string;
}

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "acknowledged" | "investigating" | "mitigated" | "resolved" | "closed";

export interface Incident {
  id: number;
  incident_code: string; // e.g. "ACAD-1042"
  school_id: number;
  installation_id?: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description?: string | null;
  assigned_to?: number | null;
  assigned_name?: string | null;
  root_cause?: string | null;
  mitigation?: string | null;
  created_at: string;
  resolved_at?: string | null;
  // Joined
  school_name?: string;
}

export interface BackupTelemetry {
  id: number;
  installation_id: string;
  school_id: number;
  backup_type: "local_snapshot" | "encrypted_cloud_sync";
  backup_size_bytes: number;
  destination: string;
  is_successful: number;
  duration_ms: number;
  error_message?: string | null;
  timestamp: string;
  created_at: string;
  // Joined
  school_name?: string;
}

export interface SoftwareRelease {
  id: number;
  version: string;
  release_channel: ReleaseChannel;
  min_agent_version: string;
  release_notes?: string | null;
  download_url?: string | null;
  sha256_hash?: string | null;
  is_critical_security: number;
  released_at: string;
}

export interface PlatformAuditLog {
  id: number;
  actor_id?: number | null;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details_json?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface FleetOverviewMetrics {
  totalSchools: number;
  activeSchools: number;
  trialSchools: number;
  expiringTrialsCount: number;
  expiredTrialsCount: number;
  offlineInstallations: number;
  healthyInstallations: number;
  warningInstallations: number;
  degradedInstallations: number;
  criticalInstallations: number;
  totalStudentsAggregate: number;
  totalTeachersAggregate: number;
  totalQuestionsAggregate?: number;
  totalExamsAggregate?: number;
  examsConductedToday: number;
  activeExamSessions: number;
  openIncidentsCount: number;
  activeAlertsCount: number;
  avgHealthScore: number;
  totalConnectedClients: number;
}

