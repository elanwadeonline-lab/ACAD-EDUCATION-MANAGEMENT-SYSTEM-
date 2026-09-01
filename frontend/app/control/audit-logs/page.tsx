"use client";

import React, { useEffect, useState } from "react";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { ShieldCheck, History, UserCheck, Terminal } from "lucide-react";

const ACTION_TYPES = [
  "ALL",
  "PLATFORM_LOGIN",
  "CREATE_SCHOOL",
  "CREATE_ORGANIZATION",
  "PROVISION_INSTALLATION",
  "REVOKE_INSTALLATION",
  "PUSH_CONFIG",
  "PUSH_CONFIG_ALL_NODES",
  "CONVERT_TRIAL_TO_PAID",
  "EXTEND_TRIAL",
  "SET_FEATURE_FLAG",
  "UPDATE_SCHOOL",
  "DELETE_SESSION",
];

export default function ControlAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [actionFilter, setActionFilter] = useState("ALL");
  const [actorSearch, setActorSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    controlApi.getAuditLogs()
      .then((res) => setLogs(res.logs || []))
      .catch((err: any) => setError(err.message || "Failed to load audit logs."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
    if (actorSearch && !log.actor_email?.toLowerCase().includes(actorSearch.toLowerCase())) return false;
    if (dateFrom && log.created_at < dateFrom) return false;
    if (dateTo && log.created_at > dateTo + "T23:59:59") return false;
    return true;
  });

  const uniqueActors = new Set(logs.map((l) => l.actor_email)).size;
  const configMutations = logs.filter((l) => ["SET_FEATURE_FLAG", "PUSH_CONFIG", "PUSH_CONFIG_ALL_NODES"].includes(l.action)).length;
  const provisioningEvents = logs.filter((l) => ["CREATE_SCHOOL", "PROVISION_INSTALLATION", "CONVERT_TRIAL_TO_PAID"].includes(l.action)).length;

  const actionColors: Record<string, string> = {
    PLATFORM_LOGIN: "var(--accent)",
    CREATE_SCHOOL: "var(--success)",
    CREATE_ORGANIZATION: "var(--success)",
    PROVISION_INSTALLATION: "var(--purple)",
    REVOKE_INSTALLATION: "var(--danger)",
    PUSH_CONFIG: "var(--warning)",
    PUSH_CONFIG_ALL_NODES: "var(--warning)",
    CONVERT_TRIAL_TO_PAID: "var(--success)",
    EXTEND_TRIAL: "var(--accent)",
    SET_FEATURE_FLAG: "var(--purple)",
    UPDATE_SCHOOL: "var(--accent)",
    DELETE_SESSION: "var(--danger)",
  };

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
          Platform Audit Trail
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Tamper-evident, append-only log of all operator actions. {filtered.length} of {logs.length} entries shown.
        </p>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Audit Entries</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : logs.length}
          </div>
          <div className={styles.metricSubtext}>Immutable security events</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Operators</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : uniqueActors}
          </div>
          <div className={styles.metricSubtext}>Authenticated platform staff</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Config Mutations</div>
          <div className={styles.metricValue} style={{ color: "var(--warning)" }}>
            {loading ? "—" : configMutations}
          </div>
          <div className={styles.metricSubtext}>Downlink flags &amp; pushes</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Provisioning Actions</div>
          <div className={styles.metricValue} style={{ color: "var(--purple)" }}>
            {loading ? "—" : provisioningEvents}
          </div>
          <div className={styles.metricSubtext}>Schools &amp; nodes created</div>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--danger-text)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className={styles.tableContainer} style={{ padding: "0.85rem 1.15rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className={styles.input}
              style={{ width: "100%", fontSize: "0.8125rem" }}
            >
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Actor Email
            </label>
            <input
              type="text"
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              placeholder="Filter by email…"
              className={styles.input}
              style={{ width: "100%", fontSize: "0.8125rem" }}
            />
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={styles.input}
              style={{ fontSize: "0.8125rem" }}
            />
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={styles.input}
              style={{ fontSize: "0.8125rem" }}
            />
          </div>
          {(actionFilter !== "ALL" || actorSearch || dateFrom || dateTo) && (
            <div style={{ flex: "0 0 auto", alignSelf: "flex-end" }}>
              <button
                onClick={() => { setActionFilter("ALL"); setActorSearch(""); setDateFrom(""); setDateTo(""); }}
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{ fontSize: "0.75rem" }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading audit trail…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
            No audit log entries match the current filters.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "860px" }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                  <th>Client IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div className={styles.mono} style={{ color: "var(--text-primary)", fontSize: "0.75rem", fontWeight: 500 }}>{log.actor_email}</div>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{
                        background: "var(--bg-elevated)",
                        color: actionColors[log.action] ?? "var(--accent)",
                        border: `1px solid ${actionColors[log.action] ?? "var(--accent)"}33`,
                        fontSize: "0.6875rem",
                      }}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{log.target_type}</span>
                        <span className={styles.mono} style={{ color: "var(--text-muted)", marginLeft: "0.35rem" }}>#{log.target_id}</span>
                      </div>
                    </td>
                    <td>
                      {log.details_json && log.details_json !== "null" ? (
                        <details style={{ cursor: "pointer" }}>
                          <summary style={{ fontSize: "0.6875rem", color: "var(--accent)", cursor: "pointer" }}>View details</summary>
                          <pre style={{
                            fontSize: "0.6875rem",
                            color: "var(--text-primary)",
                            background: "var(--bg-input)",
                            padding: "0.5rem",
                            borderRadius: "4px",
                            marginTop: "0.25rem",
                            overflowX: "auto",
                            maxWidth: "280px",
                            border: "1px solid var(--border-input)",
                          }}>
                            {JSON.stringify(JSON.parse(log.details_json), null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                        {log.ip_address || "127.0.0.1"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
