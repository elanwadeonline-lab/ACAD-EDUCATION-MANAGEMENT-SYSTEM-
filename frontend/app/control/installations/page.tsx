"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { Cpu, Plus } from "lucide-react";

const HEALTH_TABS = ["all", "healthy", "warning", "degraded", "critical", "offline"];

const PUSH_OPTIONS = [
  { value: "feature_flags", label: "Feature Flags", desc: "Sync modular capability flag states" },
  { value: "license", label: "License State", desc: "Refresh quota, validity, and plan tier" },
  { value: "config", label: "Config Refresh", desc: "Signal node to reload environment" },
  { value: "force_update", label: "Force OTA Update", desc: "Instruct node to pull latest software release" },
  { value: "reboot_request", label: "Reboot Request", desc: "Request non-destructive background service reboot" },
];

export default function ControlInstallationsPage() {
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHealth, setFilterHealth] = useState("all");
  const [pushDrawer, setPushDrawer] = useState<string | null>(null);
  const [pushType, setPushType] = useState("feature_flags");
  const [pushLoading, setPushLoading] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<number | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = () => {
    setLoading(true);
    controlApi
      .getInstallations({ healthStatus: filterHealth === "all" ? undefined : filterHealth })
      .then((res) => setInstallations(res.installations || []))
      .catch((err) => setError(err.message || "Failed to load installations."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [filterHealth]);

  const handlePushConfig = async (installationId: string) => {
    setPushLoading(true);
    setError("");
    try {
      await controlApi.pushConfigToInstallation(installationId, pushType);
      setSuccessMsg(`Config push (${pushType}) successfully queued for ${installationId}. Delivered on next pulse.`);
      setPushDrawer(null);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to queue config push.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleRevoke = async (id: number, nodeId: string) => {
    setRevokeLoading(true);
    setError("");
    try {
      await controlApi.revokeInstallation(id);
      setSuccessMsg(`Installation node ${nodeId} has been revoked.`);
      setRevokeConfirm(null);
      loadData();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to revoke installation.");
    } finally {
      setRevokeLoading(false);
    }
  };

  const totalNodes = installations.length;
  const healthyNodes = installations.filter((i) => i.health_status === "healthy" && !i.is_revoked).length;
  const warningNodes = installations.filter((i) => ["warning", "degraded", "critical"].includes(i.health_status) && !i.is_revoked).length;
  const revokedNodes = installations.filter((i) => i.is_revoked).length;

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
            Fleet Installation Nodes
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Supervise physical server nodes, virtual machines, local edge appliances, and manage node lifecycles.
          </p>
        </div>
        <Link href="/control/schools/new" className={`${styles.btn} ${styles.btnPrimary}`}>
          <Plus size={14} /> Provision New Node
        </Link>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Installed Nodes</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : totalNodes}
          </div>
          <div className={styles.metricSubtext}>Hardware instances</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Healthy & Active</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : healthyNodes}
          </div>
          <div className={styles.metricSubtext}>Sub-minute latency</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Attention Required</div>
          <div className={styles.metricValue} style={{ color: warningNodes > 0 ? "var(--warning)" : "var(--text-muted)" }}>
            {loading ? "—" : warningNodes}
          </div>
          <div className={styles.metricSubtext}>Warnings or high latency</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Revoked Nodes</div>
          <div className={styles.metricValue} style={{ color: revokedNodes > 0 ? "var(--danger)" : "var(--text-muted)" }}>
            {loading ? "—" : revokedNodes}
          </div>
          <div className={styles.metricSubtext}>Decommissioned keys</div>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--danger-text)", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--success-text)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className={styles.tabsBar} style={{ marginBottom: "1rem" }}>
        {HEALTH_TABS.map((tab) => (
          <button key={tab} onClick={() => setFilterHealth(tab)} className={`${styles.tabBtn} ${filterHealth === tab ? styles.tabBtnActive : ""}`}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Installation Table Matrix ── */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading installation fleet…</div>
        ) : installations.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No installation nodes found matching current filter.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "980px" }}>
              <thead>
                <tr>
                  <th>Installation ID &amp; Node</th>
                  <th>Campus</th>
                  <th>Health</th>
                  <th>Version</th>
                  <th>Network IPs</th>
                  <th>Last Pulse</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: "1.25rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {installations.map((inst) => (
                  <React.Fragment key={inst.id}>
                    <tr style={{ opacity: inst.is_revoked ? 0.45 : 1 }}>
                      <td>
                        <div className={styles.mono} style={{ fontWeight: 600, color: "var(--accent)", fontSize: "0.75rem" }}>
                          {inst.installation_id}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{inst.node_id}</div>
                      </td>
                      <td>
                        <Link href={`/control/schools/${inst.school_id}`} style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none", fontSize: "0.8125rem" }}>
                          {inst.school_name}
                        </Link>
                        <div className={styles.mono} style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>{inst.school_code}</div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${
                          inst.health_status === "healthy" ? styles.badgeHealthy
                            : inst.health_status === "warning" ? styles.badgeWarning
                            : inst.health_status === "degraded" ? styles.badgeDegraded
                            : inst.health_status === "critical" ? styles.badgeCritical
                            : styles.badgeOffline
                        }`}>
                          <span className={`${styles.statusDot} ${
                            inst.health_status === "healthy" ? styles.dotHealthy
                              : inst.health_status === "warning" ? styles.dotWarning
                              : inst.health_status === "degraded" ? styles.dotDegraded
                              : inst.health_status === "critical" ? styles.dotCritical
                              : styles.dotOffline
                          }`} />
                          {inst.health_status === "unknown" ? "Unknown" : `${inst.health_score ?? "—"}${inst.health_score != null ? "%" : ""}`} · {inst.health_status}
                        </span>
                      </td>
                      <td>
                        <span className={styles.mono} style={{ fontSize: "0.75rem", color: "var(--accent)" }}>v{inst.software_version}</span>
                        <div className={styles.mono} style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{inst.release_channel}</div>
                      </td>
                      <td>
                        <div className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-primary)" }}>LAN: {inst.local_ip || "—"}</div>
                        <div className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>WAN: {inst.public_ip || "Dynamic"}</div>
                      </td>
                      <td className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                        {inst.last_heartbeat_at ? new Date(inst.last_heartbeat_at).toLocaleTimeString() : "Never"}
                      </td>
                      <td>
                        {inst.is_revoked ? (
                          <span className={styles.statusBadge} style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>Revoked</span>
                        ) : (
                          <span className={styles.statusBadge} style={{ background: "var(--success-bg)", color: "var(--success)" }}>Active</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                        <div style={{ display: "inline-flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          {!inst.is_revoked && (
                            <>
                              <button
                                onClick={() => { setPushDrawer(pushDrawer === inst.installation_id ? null : inst.installation_id); setRevokeConfirm(null); }}
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                style={{ fontSize: "0.6875rem" }}
                              >
                                Push Config
                              </button>
                              <button
                                onClick={() => { setRevokeConfirm(revokeConfirm === inst.id ? null : inst.id); setPushDrawer(null); }}
                                className={`${styles.btn} ${styles.btnDanger}`}
                                style={{ fontSize: "0.6875rem" }}
                              >
                                Revoke
                              </button>
                            </>
                          )}
                          <Link href={`/control/schools/${inst.school_id}`} className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: "0.6875rem" }}>
                            Inspect
                          </Link>
                        </div>
                      </td>
                    </tr>

                    {/* Push Config Drawer */}
                    {pushDrawer === inst.installation_id && (
                      <tr style={{ background: "var(--accent-bg)" }}>
                        <td colSpan={8} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--accent-border)" }}>
                          <div style={{ marginBottom: "0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--accent)" }}>
                            Push Config to <strong>{inst.node_id}</strong>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                            {PUSH_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setPushType(opt.value)}
                                style={{
                                  padding: "0.5rem 0.85rem",
                                  borderRadius: "6px",
                                  border: `1px solid ${pushType === opt.value ? "var(--accent)" : "var(--border-input)"}`,
                                  background: pushType === opt.value ? "var(--accent-bg)" : "var(--bg-input)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: pushType === opt.value ? "var(--accent)" : "var(--text-heading)" }}>{opt.label}</div>
                                <div style={{ fontSize: "0.6875rem", color: "var(--text-secondary)" }}>{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem" }}>
                            <button onClick={() => handlePushConfig(inst.installation_id)} disabled={pushLoading} className={`${styles.btn} ${styles.btnPrimary}`}>
                              {pushLoading ? "Queuing…" : `Queue ${PUSH_OPTIONS.find(o => o.value === pushType)?.label} Push`}
                            </button>
                            <button onClick={() => setPushDrawer(null)} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Revoke Confirmation */}
                    {revokeConfirm === inst.id && (
                      <tr style={{ background: "var(--danger-bg)" }}>
                        <td colSpan={8} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--danger)" }}>
                          <div style={{ marginBottom: "0.75rem" }}>
                            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--danger)" }}>Confirm Revocation</span>
                            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginLeft: "0.75rem" }}>
                              Revoking <strong>{inst.node_id}</strong> will permanently block it from sending heartbeats or receiving config.
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem" }}>
                            <button onClick={() => handleRevoke(inst.id, inst.node_id)} disabled={revokeLoading} className={`${styles.btn} ${styles.btnDanger}`}>
                              {revokeLoading ? "Revoking…" : "Confirm Revoke"}
                            </button>
                            <button onClick={() => setRevokeConfirm(null)} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
