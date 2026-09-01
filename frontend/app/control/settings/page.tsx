"use client";

import React, { useEffect, useState } from "react";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { Users, UserPlus, Shield, Lock } from "lucide-react";

export default function ControlSettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Staff Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ops_engineer");

  const loadUsers = () => {
    setLoading(true);
    controlApi
      .getUsers()
      .then((res) => setUsers(res.users || []))
      .catch((err) => console.error("Failed to load users:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    try {
      await controlApi.createUser({ name, email, password, role });
      setName("");
      setEmail("");
      setPassword("");
      loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed to create user.");
    }
  };

  const activeUsers = users.filter((u) => u.is_active).length;
  const superAdminCount = users.filter((u) => u.role === "super_admin").length;

  return (
    <div>
      {/* ── Section Header ── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
          Platform Settings &amp; Staff Access
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Supervisory access controls, operator roles, and platform security policies.
        </p>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className={styles.metricGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Registered Operators</div>
          <div className={styles.metricValue} style={{ color: "var(--accent)" }}>
            {loading ? "—" : users.length}
          </div>
          <div className={styles.metricSubtext}>Platform accounts</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Operators</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            {loading ? "—" : activeUsers}
          </div>
          <div className={styles.metricSubtext}>Authenticated staff</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Super Administrators</div>
          <div className={styles.metricValue} style={{ color: "var(--purple)" }}>
            {loading ? "—" : superAdminCount}
          </div>
          <div className={styles.metricSubtext}>Full mission control privileges</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Security Policy</div>
          <div className={styles.metricValue} style={{ color: "var(--success)" }}>
            Enforced
          </div>
          <div className={styles.metricSubtext}>256-bit token signatures</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Left: Staff Table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Platform Staff &amp; Operators</div>
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.table} style={{ minWidth: "620px" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Platform Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-heading)" }}>{u.name}</td>
                    <td className={styles.mono} style={{ color: "var(--text-primary)" }}>{u.email}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: u.is_active ? "var(--success-bg)" : "var(--danger-bg)", color: u.is_active ? "var(--success)" : "var(--danger)" }}>
                        {u.is_active ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td className={styles.mono} style={{ color: "var(--text-muted)", fontSize: "0.6875rem" }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Add Staff Form */}
        <div className={styles.tableContainer} style={{ padding: "1.25rem" }}>
          <div className={styles.tableTitle} style={{ marginBottom: "1rem" }}>
            Add Platform Operator
          </div>

          <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                Temporary Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
              >
                <option value="ops_engineer">Operations Engineer (Read/Write)</option>
                <option value="support_agent">Support Agent (Read Only + Tickets)</option>
                <option value="super_admin">Super Administrator (Full Root)</option>
              </select>
            </div>

            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}>
              Provision Platform Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
