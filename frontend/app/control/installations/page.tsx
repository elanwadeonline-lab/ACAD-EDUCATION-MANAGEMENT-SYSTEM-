"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

const HEALTH_TABS = ["all", "healthy", "warning", "degraded", "critical", "offline"];

type PushType = "feature_flags" | "license" | "config" | "force_update" | "reboot_request";
const PUSH_OPTIONS: { value: PushType; label: string; desc: string }[] = [
  { value: "feature_flags", label: "Feature Flags", desc: "Push current flag state to node" },
  { value: "license", label: "License Entitlements", desc: "Refresh license quotas & modules" },
  { value: "config", label: "General Config", desc: "Send config refresh signal" },
  { value: "force_update", label: "Force Update Signal", desc: "Tell node to apply pending update" },
  { value: "reboot_request", label: "Reboot Request", desc: "Request graceful service restart" },
];

export default function ControlInstallationsPage() {
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHealth, setFilterHealth] = useState("all");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Push config state: maps installation_id → drawer open
  const [pushDrawer, setPushDrawer] = useState<string | null>(null);
  const [pushType, setPushType] = useState<PushType>("feature_flags");
  const [pushLoading, setPushLoading] = useState(false);

  // Revoke confirmation state
  const [revokeConfirm, setRevokeConfirm] = useState<number | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const loadInstallations = async () => {
    try {
      const res = await controlApi.getInstallations({ healthStatus: filterHealth === "all" ? undefined : filterHealth });
      setInstallations(res.installations || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch installations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadInstallations();
  }, [filterHealth]);

  const handlePushConfig = async (installationId: string) => {
    setPushLoading(true);
    try {
      const res = await controlApi.pushConfigToInstallation(installationId, pushType);
      setSuccessMsg(res.message || `Config push queued for ${installationId}`);
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
    try {
      await controlApi.revokeInstallation(id);
      setSuccessMsg(`Installation ${nodeId} revoked. It can no longer send heartbeats.`);
      setRevokeConfirm(null);
      await loadInstallations();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to revoke installation.");
    } finally {
      setRevokeLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>Fleet Installation Nodes</h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
            Supervise physical servers, VMs, and edge appliances. Push configs and manage node lifecycle.
          </p>
        </div>
        <Link href="/control/schools/new" className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: "0.8125rem" }}>
          + Provision New Node
        </Link>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#F87171", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer" }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#34D399", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      <div className={styles.tabsBar} style={{ marginBottom: "1rem" }}>
        {HEALTH_TABS.map((tab) => (
          <button key={tab} onClick={() => setFilterHealth(tab)} className={`${styles.tabBtn} ${filterHealth === tab ? styles.tabBtnActive : ""}`}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>Loading installation fleet…</div>
        ) : installations.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            No installation nodes found matching current filter.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Installation ID &amp; Node</th>
                <th>Campus</th>
                <th>Health</th>
                <th>Version</th>
                <th>IPs</th>
                <th>Last Pulse</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {installations.map((inst) => (
                <React.Fragment key={inst.id}>
                  <tr style={{ opacity: inst.is_revoked ? 0.45 : 1 }}>
                    <td>
                      <div className={styles.mono} style={{ fontWeight: 600, color: "#60A5FA", fontSize: "0.75rem" }}>
                        {inst.installation_id}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{inst.node_id}</div>
                    </td>
                    <td>
                      <Link href={`/control/schools/${inst.school_id}`} style={{ fontWeight: 600, color: "#F8FAFC", textDecoration: "none", fontSize: "0.8125rem" }}>
                        {inst.school_name}
                      </Link>
                      <div className={styles.mono} style={{ color: "#64748B", fontSize: "0.6875rem" }}>{inst.school_code}</div>
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
                        {inst.health_score}% · {inst.health_status}
                      </span>
                    </td>
                    <td>
                      <span className={styles.mono} style={{ fontSize: "0.75rem", color: "#60A5FA" }}>v{inst.software_version}</span>
                      <div className={styles.mono} style={{ fontSize: "0.6rem", color: "#334155", textTransform: "uppercase" }}>{inst.release_channel}</div>
                    </td>
                    <td>
                      <div className={styles.mono} style={{ fontSize: "0.6875rem", color: "#CBD5E1" }}>LAN: {inst.local_ip || "—"}</div>
                      <div className={styles.mono} style={{ fontSize: "0.6875rem", color: "#64748B" }}>WAN: {inst.public_ip || "Dynamic"}</div>
                    </td>
                    <td className={styles.mono} style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>
                      {inst.last_heartbeat_at ? new Date(inst.last_heartbeat_at).toLocaleTimeString() : "Never"}
                    </td>
                    <td>
                      {inst.is_revoked ? (
                        <span className={styles.statusBadge} style={{ background: "rgba(239, 68, 68, 0.1)", color: "#F87171" }}>Revoked</span>
                      ) : (
                        <span className={styles.statusBadge} style={{ background: "rgba(16, 185, 129, 0.1)", color: "#34D399" }}>Active</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.3rem" }}>
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
                    <tr style={{ background: "rgba(59, 130, 246, 0.04)" }}>
                      <td colSpan={8} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(59, 130, 246, 0.15)" }}>
                        <div style={{ marginBottom: "0.75rem", fontSize: "0.8125rem", fontWeight: 600, color: "#93C5FD" }}>
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
                                border: `1px solid ${pushType === opt.value ? "rgba(59, 130, 246, 0.6)" : "rgba(255,255,255,0.08)"}`,
                                background: pushType === opt.value ? "rgba(59, 130, 246, 0.12)" : "#0B0F19",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: pushType === opt.value ? "#93C5FD" : "#E2E8F0" }}>{opt.label}</div>
                              <div style={{ fontSize: "0.6875rem", color: "#64748B" }}>{opt.desc}</div>
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
                    <tr style={{ background: "rgba(239, 68, 68, 0.04)" }}>
                      <td colSpan={8} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(239, 68, 68, 0.15)" }}>
                        <div style={{ marginBottom: "0.75rem" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#F87171" }}>Confirm Revocation</span>
                          <span style={{ fontSize: "0.8125rem", color: "#94A3B8", marginLeft: "0.75rem" }}>
                            Revoking <strong>{inst.node_id}</strong> will permanently block it from sending heartbeats or receiving config. This cannot be undone.
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
        )}
      </div>
    </div>
  );
}
