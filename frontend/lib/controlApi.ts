/**
 * ACAD Control Plane Frontend API Client
 * Connects exclusively to /api/platform/* endpoints.
 */

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  role: "owner" | "admin" | "ops_engineer" | "support_agent" | "auditor";
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("acad_platform_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.includes("/control/login")) {
      localStorage.removeItem("acad_platform_token");
      window.location.href = "/control/login";
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const controlApi = {
  // Auth
  login: (email: string, password: string) =>
    request("/api/platform/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/api/platform/auth/logout", { method: "POST" }),
  getMe: () => request<{ success: boolean; user: PlatformUser }>("/api/platform/auth/me"),

  // Command Center Overview
  getOverview: () => request("/api/platform/overview"),

  // Schools
  getSchools: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    return request(`/api/platform/schools?${q.toString()}`);
  },
  getSchoolDetail: (id: number | string) => request(`/api/platform/schools/${id}`),
  createSchool: (data: any) => request("/api/platform/schools", { method: "POST", body: JSON.stringify(data) }),
  updateSchool: (id: number | string, data: any) =>
    request(`/api/platform/schools/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Organizations
  getOrganizations: () => request("/api/platform/organizations"),
  createOrganization: (data: any) =>
    request("/api/platform/organizations", { method: "POST", body: JSON.stringify(data) }),

  // Installations
  getInstallations: (params?: { healthStatus?: string }) => {
    const q = new URLSearchParams();
    if (params?.healthStatus) q.set("healthStatus", params.healthStatus);
    return request(`/api/platform/installations?${q.toString()}`);
  },
  provisionInstallation: (data: { school_id: number; node_id: string; release_channel?: string }) =>
    request("/api/platform/installations/provision", { method: "POST", body: JSON.stringify(data) }),
  revokeInstallation: (id: number) =>
    request(`/api/platform/installations/${id}/revoke`, { method: "POST" }),
  pushConfigToInstallation: (installationId: string, payload_type: string, payload?: any) =>
    request(`/api/platform/installations/${installationId}/push-config`, {
      method: "POST",
      body: JSON.stringify({ payload_type, payload }),
    }),
  pushConfigToSchool: (schoolId: number, payload_type: string) =>
    request(`/api/platform/schools/${schoolId}/push-config`, {
      method: "POST",
      body: JSON.stringify({ payload_type }),
    }),

  // Trials & Licenses
  getTrials: (status?: string) => request(`/api/platform/trials${status ? `?status=${status}` : ""}`),
  extendTrial: (id: number, days: number) =>
    request(`/api/platform/trials/${id}/extend`, { method: "POST", body: JSON.stringify({ days }) }),
  convertTrial: (id: number, plan_tier: string) =>
    request(`/api/platform/trials/${id}/convert`, { method: "POST", body: JSON.stringify({ plan_tier }) }),
  getLicenses: () => request("/api/platform/licenses"),
  createLicense: (data: any) => request("/api/platform/licenses", { method: "POST", body: JSON.stringify(data) }),

  // Feature Flags
  getFeatureFlags: (schoolId: number) => request(`/api/platform/feature-flags/${schoolId}`),
  setFeatureFlag: (schoolId: number, flag_key: string, is_enabled: boolean) =>
    request(`/api/platform/feature-flags/${schoolId}`, { method: "PUT", body: JSON.stringify({ flag_key, is_enabled }) }),

  // Alerts & Incidents
  getAlerts: (params?: { status?: string; severity?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.severity) q.set("severity", params.severity);
    return request(`/api/platform/alerts?${q.toString()}`);
  },
  acknowledgeAlert: (id: number) => request(`/api/platform/alerts/${id}/ack`, { method: "POST" }),
  resolveAlert: (id: number) => request(`/api/platform/alerts/${id}/resolve`, { method: "POST" }),
  getIncidents: (status?: string) => request(`/api/platform/incidents${status ? `?status=${status}` : ""}`),
  createIncident: (data: any) => request("/api/platform/incidents", { method: "POST", body: JSON.stringify(data) }),
  updateIncident: (id: number, data: any) =>
    request(`/api/platform/incidents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  resolveIncident: (id: number, data: { root_cause: string; mitigation?: string }) =>
    request(`/api/platform/incidents/${id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved", ...data }) }),

  // Backups, Releases, Audit Logs, Platform Users & Sync Queue
  getBackups: () => request("/api/platform/backups"),
  getReleases: () => request("/api/platform/releases"),
  createRelease: (data: any) => request("/api/platform/releases", { method: "POST", body: JSON.stringify(data) }),
  broadcastRelease: (data: { version: string; release_notes?: string; download_url?: string; sha256_hash?: string }) =>
    request("/api/platform/releases/broadcast", { method: "POST", body: JSON.stringify(data) }),
  getAuditLogs: () => request("/api/platform/audit-logs"),
  getUsers: () => request("/api/platform/users"),
  createUser: (data: any) => request("/api/platform/users", { method: "POST", body: JSON.stringify(data) }),
  getSyncQueue: () => request("/api/platform/sync-queue"),

  // Live Node Telemetry & Historical Data
  getSchoolLiveStats: (id: number | string) => request(`/api/platform/schools/${id}/live-stats`),
  getSchoolTelemetryHistory: (id: number | string, limit = 60) =>
    request(`/api/platform/schools/${id}/telemetry-history?limit=${limit}`),
  getInstallationHeartbeatHistory: (installationId: string, limit = 60) =>
    request(`/api/platform/installations/${installationId}/heartbeat-history?limit=${limit}`),
  getFleetTimeline: (hours = 24) => request(`/api/platform/monitoring/fleet-timeline?hours=${hours}`),
  getExamActivity: (limit = 50) => request(`/api/platform/monitoring/exam-activity?limit=${limit}`),

  // Host PC Local Exam Pool Live Monitor & Actions
  getLocalExamPoolLive: () => request("/api/platform/local-exam-pool/live"),
  runLocalExamPoolAction: (action: "RUN_DIAGNOSTICS" | "TRIGGER_PULSE" | "WAL_CHECKPOINT" | "FLUSH_QUEUE" | "INTEGRITY_CHECK") =>
    request("/api/platform/local-exam-pool/action", {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
};


