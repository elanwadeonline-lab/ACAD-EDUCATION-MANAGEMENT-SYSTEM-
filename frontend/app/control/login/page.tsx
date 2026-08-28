"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../control.module.css";
import { controlApi } from "../../../lib/controlApi";

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
        background: "radial-gradient(ellipse at top, #131E35 0%, #0B0F17 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div className={styles.brandLogo} style={{ width: "34px", height: "34px", fontSize: "1rem" }}>
            ⚡
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.125rem", color: "#FFFFFF" }}>ACAD MISSION CONTROL</div>
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Supervisory Control Plane</div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#F87171",
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
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
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
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#94A3B8", marginBottom: "0.35rem" }}>
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

        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #1E293B", textAlign: "center" }}>
          <span style={{ fontSize: "0.6875rem", color: "#64748B" }}>
            Restricted access for ACAD platform operators and engineers.
          </span>
        </div>
      </div>
    </div>
  );
}
