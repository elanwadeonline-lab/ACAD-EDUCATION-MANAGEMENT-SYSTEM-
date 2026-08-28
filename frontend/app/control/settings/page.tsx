"use client";

import React, { useEffect, useState } from "react";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

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

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FFFFFF" }}>
          Platform Settings & Staff Access
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "0.2rem" }}>
          Supervisory access controls, operator roles, and platform security policies.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* Left: Staff Table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Platform Staff & Operators</div>
          </div>

          <table className={styles.table}>
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
                  <td style={{ fontWeight: 600, color: "#F8FAFC" }}>{u.name}</td>
                  <td className={styles.mono}>{u.email}</td>
                  <td>
                    <span className={styles.statusBadge} style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60A5FA" }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={{ background: u.is_active ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", color: u.is_active ? "#34D399" : "#F87171" }}>
                      {u.is_active ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className={styles.mono}>
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Add Staff Form */}
        <div className={styles.tableContainer} style={{ padding: "1.25rem" }}>
          <div className={styles.tableTitle} style={{ marginBottom: "1rem" }}>
            Add Platform Operator
          </div>

          <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
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
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
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
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
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
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.25rem" }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
              >
                <option value="ops_engineer">Operations Engineer</option>
                <option value="support_agent">Support Agent</option>
                <option value="admin">Platform Administrator</option>
                <option value="auditor">Compliance Auditor</option>
              </select>
            </div>

            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: "100%", justifyContent: "center" }}>
              Create Operator Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
