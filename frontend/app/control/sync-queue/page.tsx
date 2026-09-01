"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { RefreshCw, Plus, CheckCircle2, Clock } from "lucide-react";

export default function ControlSyncQueuePage() {
  const [queueData, setQueueData] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "delivered">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Push modal state
  const [showPushModal, setShowPushModal] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | "">("");
  const [selectedPayloadType, setSelectedPayloadType] = useState("feature_flags");
  const [pushing, setPushing] = useState(false);

  const [error, setError] = useState("");
  const loadData = async () => {
    try {
      setError("");
      const [qRes, sRes] = await Promise.all([
        controlApi.getSyncQueue(),
        controlApi.getSchools(),
      ]);
      setQueueData(qRes);
      setSchools(sRes.schools || []);
    } catch (err: any) {
      setError(err.message || "Unable to load sync queue.");
      console.error("Failed to load sync queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handlePushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) return;
    setPushing(true);
    try {
      await controlApi.pushConfigToSchool(Number(selectedSchoolId), selectedPayloadType);
      setShowPushModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to enqueue sync payload.");
    } finally {
      setPushing(false);
    }
  };

  const queueList = queueData?.queue || [];
  const pendingCount = queueData?.pending_count || 0;
  const deliveredCount = queueList.filter((item: any) => item.status === "delivered").length;
  // Real average delivery latency from delivered items (queued_at → delivered_at)
  const avgLatency = (() => {
    const delivered = queueList.filter((i: any) => i.status === "delivered" && i.queued_at && i.delivered_at);
    if (delivered.length === 0) return null;
    const totalMs = delivered.reduce((acc: number, i: any) => acc + (new Date(i.delivered_at).getTime() - new Date(i.queued_at).getTime()), 0);
    const avgMs = totalMs / delivered.length;
    if (avgMs < 1000) return `${Math.round(avgMs)}ms`;
    if (avgMs < 60000) return `${Math.round(avgMs / 1000)}s`;
    if (avgMs < 3600000) return `${Math.round(avgMs / 60000)}m`;
    return `${(avgMs / 3600000).toFixed(1)}h`;
  })();

  const filteredQueue = queueList.filter((item: any) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchSchool = (item.school_name || "").toLowerCase().includes(term);
      const matchCode = (item.school_code || "").toLowerCase().includes(term);
      const matchInst = (item.installation_id || "").toLowerCase().includes(term);
      const matchType = (item.payload_type || "").toLowerCase().includes(term);
      return matchSchool || matchCode || matchInst || matchType;
    }
    return true;
  });

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
            Bidirectional Config Sync Queue
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Supervisory downlink queue delivering configuration, feature flags, and license updates to school nodes.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => setShowPushModal(true)} className={`${styles.btn} ${styles.btnPrimary}`}>
            <Plus size={14} /> Enqueue Config Push
          </button>
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Pending Delivery</div>
          <div className={styles.metricValue} style={{ color: pendingCount > 0 ? "var(--warning)" : "var(--success)" }}>
            {loading ? "—" : pendingCount}
          </div>
          <div className={styles.metricSubtext}>Awaiting next node pulse</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Delivered (Recent)</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : deliveredCount}
          </div>
          <div className={styles.metricSubtext}>Confirmed acknowledged</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Operations</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : queueList.length}
          </div>
          <div className={styles.metricSubtext}>Logged across fleet</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Avg Delivery Latency</div>
          <div className={styles.metricValue} style={{ color: pendingCount > 5 ? "var(--warning)" : "var(--purple)" }}>
            {loading ? "—" : avgLatency ?? "Unknown"}
          </div>
          <div className={styles.metricSubtext}>{avgLatency ? "Queued → delivered" : "No delivered samples yet"}</div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["all", "pending", "delivered"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`${styles.btn} ${filterStatus === st ? styles.btnPrimary : styles.btnSecondary}`}
              style={{ fontSize: "0.75rem", textTransform: "capitalize" }}
            >
              {st} {st === "pending" && pendingCount > 0 ? `(${pendingCount})` : ""}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by school, node, or type…"
          className={styles.input}
          style={{ width: "260px", fontSize: "0.75rem" }}
        />
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--danger-text)", fontSize: "0.8125rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={loadData} style={{ background: "#fff", border: "1px solid var(--danger)", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.75rem", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {/* ── Queue Table ── */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Downlink Delivery Log</div>
          <span className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
            Auto-polling every 8s
          </span>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.table} style={{ minWidth: "920px" }}>
            <thead>
              <tr>
                <th>Campus</th>
                <th>Target Node</th>
                <th>Payload Type</th>
                <th>Payload Content</th>
                <th>Status</th>
                <th>Queued At</th>
                <th>Delivered At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>Loading sync queue…</td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    No sync queue items found matching filter.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/control/schools/${item.school_id}`} style={{ fontWeight: 600, color: "var(--text-heading)", textDecoration: "none", fontSize: "0.8125rem" }}>
                        {item.school_name || `School #${item.school_id}`}
                      </Link>
                      <div className={styles.mono} style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>
                        {item.school_code || "—"}
                      </div>
                    </td>
                    <td>
                      <span className={styles.mono} style={{ fontWeight: 600, color: "var(--accent)", fontSize: "0.8125rem" }}>
                        {item.node_id || "NODE-PRIMARY"}
                      </span>
                      <div className={styles.mono} style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}>
                        {item.installation_id}
                      </div>
                    </td>
                    <td>
                      <span
                        className={styles.statusBadge}
                        style={{
                          background:
                            item.payload_type === "feature_flags"
                              ? "var(--accent-bg)"
                              : item.payload_type === "license"
                              ? "var(--success-bg)"
                              : "var(--purple-bg)",
                          color:
                            item.payload_type === "feature_flags"
                              ? "var(--accent)"
                              : item.payload_type === "license"
                              ? "var(--success)"
                              : "var(--purple)",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "0.6875rem",
                        }}
                      >
                        {item.payload_type}
                      </span>
                    </td>
                    <td>
                      <div
                        className={styles.mono}
                        style={{
                          maxWidth: "280px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.6875rem",
                          color: "var(--text-secondary)",
                        }}
                        title={item.payload_json}
                      >
                        {item.payload_json}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          item.status === "delivered" ? styles.badgeHealthy : styles.badgeWarning
                        }`}
                      >
                        <span
                          className={`${styles.statusDot} ${
                            item.status === "delivered" ? styles.dotHealthy : styles.dotWarning
                          }`}
                        />
                        {item.status}
                      </span>
                    </td>
                    <td className={styles.mono} style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                      {item.queued_at ? new Date(item.queued_at).toLocaleString() : "—"}
                    </td>
                    <td className={styles.mono} style={{ fontSize: "0.6875rem", color: item.delivered_at ? "var(--success)" : "var(--text-muted)" }}>
                      {item.delivered_at ? new Date(item.delivered_at).toLocaleString() : "Pending"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Enqueue Modal ── */}
      {showPushModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "var(--bg-panel-1)",
              border: "1px solid var(--border-panel)",
              borderRadius: "12px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "var(--shadow-drawer)",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-heading)", marginBottom: "0.5rem" }}>
              Enqueue Downlink Config Push
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Target all nodes of a campus. Payloads are picked up securely by the node agent on its next pulse.
            </p>

            <form onSubmit={handlePushSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                  Target Campus
                </label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(Number(e.target.value) || "")}
                  className={styles.input}
                  required
                >
                  <option value="">Select a campus…</option>
                  {schools.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.school_code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                  Payload Type
                </label>
                <select
                  value={selectedPayloadType}
                  onChange={(e) => setSelectedPayloadType(e.target.value)}
                  className={styles.input}
                >
                  <option value="feature_flags">Feature Flags (Sync all active toggles)</option>
                  <option value="license">License Entitlements (Refresh quota &amp; modules)</option>
                  <option value="config">General Config Refresh</option>
                  <option value="force_update">Force Software Update</option>
                  <option value="reboot_request">Graceful Node Restart</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowPushModal(false)}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pushing || !selectedSchoolId}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  {pushing ? "Enqueuing…" : "Push to Campus Nodes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
