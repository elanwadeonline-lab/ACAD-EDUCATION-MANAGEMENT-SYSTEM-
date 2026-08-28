"use client";

import React, { useEffect, useState } from "react";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

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

  const actionColors: Record<string, string> = {
    PLATFORM_LOGIN: "#60A5FA",
    CREATE_SCHOOL: "#34D399",
    CREATE_ORGANIZATION: "#34D399",
    PROVISION_INSTALLATION: "#A78BFA",
    REVOKE_INSTALLATION: "#F87171",
    PUSH_CONFIG: "#FBBF24",
    PUSH_CONFIG_ALL_NODES: "#FBBF24",
    CONVERT_TRIAL_TO_PAID: "#34D399",
    EXTEND_TRIAL: "#60A5FA",
    SET_FEATURE_FLAG: "#A78BFA",
    UPDATE_SCHOOL: "#60A5FA",
    DELETE_SESSION: "#F87171",
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>Platform Audit Trail</h1>
        <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
          Tamper-evident, append-only log of all operator actions. {filtered.length} of {logs.length} entries shown.
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#F87171", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className={styles.tableContainer} style={{ padding: "0.85rem 1.15rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "#64748B", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "#64748B", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "#64748B", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "#64748B", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>Loading audit trail…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B", fontSize: "0.8125rem" }}>
            No audit log entries match the current filters.
          </div>
        ) : (
          <table className={styles.table}>
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
                    <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div className={styles.mono} style={{ color: "#CBD5E1", fontSize: "0.75rem" }}>{log.actor_email}</div>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={{
                      background: `${actionColors[log.action] ?? "#60A5FA"}18`,
                      color: actionColors[log.action] ?? "#60A5FA",
                      fontSize: "0.6875rem",
                    }}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.75rem" }}>
                      <span style={{ color: "#94A3B8" }}>{log.target_type}</span>
                      <span className={styles.mono} style={{ color: "#64748B", marginLeft: "0.35rem" }}>#{log.target_id}</span>
                    </div>
                  </td>
                  <td>
                    {log.details_json && log.details_json !== "null" ? (
                      <details style={{ cursor: "pointer" }}>
                        <summary style={{ fontSize: "0.6875rem", color: "#64748B", cursor: "pointer" }}>View details</summary>
                        <pre style={{
                          fontSize: "0.6875rem",
                          color: "#CBD5E1",
                          background: "#070A10",
                          padding: "0.5rem",
                          borderRadius: "4px",
                          marginTop: "0.25rem",
                          overflowX: "auto",
                          maxWidth: "280px",
                        }}>
                          {JSON.stringify(JSON.parse(log.details_json), null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span style={{ color: "#334155", fontSize: "0.6875rem" }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "#64748B" }}>{log.ip_address || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
