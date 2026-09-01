"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";
import { ShieldCheck } from "lucide-react";

export default function ControlLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@acad.ng");
  const [password, setPassword] = useState("AdminPassword123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);

    try {
      const res = await controlApi.login(email, password);
      if (res?.token) {
        localStorage.setItem("acad_platform_token", res.token);
        router.push("/control");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate platform user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.shell}
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-app)",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--bg-panel-1)",
          border: "1px solid var(--border-panel)",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "var(--shadow-drawer)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div className={styles.brandLogo} style={{ width: "36px", height: "36px" }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
              ACAD MISSION CONTROL
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Supervisory Control Plane</div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "var(--danger-bg)",
              border: "1px solid var(--danger)",
              color: "var(--danger-text)",
              padding: "0.65rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Staff Email Address
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
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Password
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

          <button
            type="submit"
            disabled={loading}
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ width: "100%", justifyContent: "center", padding: "0.65rem", marginTop: "0.5rem" }}
          >
            {loading ? "Authenticating…" : "Sign In to Control Plane"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-panel)", textAlign: "center" }}>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
            Restricted access for ACAD platform operators and engineers.
          </span>
        </div>
      </div>
    </div>
  );
}
