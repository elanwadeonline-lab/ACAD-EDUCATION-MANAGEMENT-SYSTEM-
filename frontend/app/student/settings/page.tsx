"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { ChangePasswordModal } from "../../../components/auth/ChangePasswordModal";
import { useAuth } from "../../../hooks/useAuth";
import { api, type ActiveSessionItem } from "../../../lib/api";
import { Button } from "../../../components/ui";
import { LockIcon, GraduationCapIcon, MonitorIcon } from "../../../components/icons/StudentIcons";
import { ErrorState } from "../../../components/ui/ErrorState";
import styles from "./page.module.css";

export default function StudentSettingsPage() {
  return (
    <RequireRole role="student">
      <StudentSettings />
    </RequireRole>
  );
}

function StudentSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showPwModal, setShowPwModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingJti, setRevokingJti] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await api.getActiveSessions();
      if (res && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
      }
    } catch {
      // Non-blocking if sessions endpoint fails
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    api
      .getMyProfile()
      .then((p) => {
        setProfile(p);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load profile");
        setLoading(false);
      });
    void loadSessions();
  }, []);

  const handleRevokeSession = async (jti: string, isCurrent: boolean) => {
    setRevokingJti(jti);
    try {
      await api.revokeSession(jti);
      if (isCurrent) {
        await logout();
        router.replace("/");
        return;
      }
      await loadSessions();
    } catch {
      // ignore
    } finally {
      setRevokingJti(null);
    }
  };

  const handleLogoutOtherSessions = async () => {
    setRevokingAll(true);
    try {
      await api.logoutAllSessions(true);
      await loadSessions();
    } catch {
      // ignore
    } finally {
      setRevokingAll(false);
    }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "S";

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "320px", gap: "0.75rem", color: "#64748B", fontSize: "0.875rem" }}>
        <div className="spinner" style={{ width: 22, height: 22, borderColor: "#E2E8F0", borderTopColor: "#92400E" }} />
        <span>Loading candidate profile…</span>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError("");
          setLoading(true);
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}

      {/* ── 1. Hero Identity & Telemetry Strip ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Student Profile &amp; Security</h1>
          <p className={styles.heroSubtitle}>
            Manage registration details, assigned class cohort, and portal authentication credentials.
          </p>
        </div>

        <div className={styles.telemetryPillGroup}>
          <div className={styles.telemetryBadge}>
            <div className={styles.telemetryIcon}>
              <GraduationCapIcon width="18" height="18" />
            </div>
            <div className={styles.telemetryBadgeContent}>
              <span className={styles.telemetryNumber}>{user?.grade || "Candidate"}</span>
              <span className={styles.telemetryText}>Assigned Cohort</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Profile Information Card ──────────────────────── */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.avatar}>{initial}</div>
          <div>
            <div className={styles.name}>{user?.name ?? "—"}</div>
            <div className={styles.email}>{user?.email ?? "—"}</div>
            {user?.grade && (
              <span className={styles.gradeBadge}>{user.grade}</span>
            )}
          </div>
        </div>

        <div className={styles.gridFields}>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>System Role</span>
            <span className={styles.fieldValue}>Candidate (Student)</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Class / Grade</span>
            <span className={styles.fieldValue}>{user?.grade || "General Cohort"}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Registration ID</span>
            <span className={styles.fieldValue} style={{ fontFamily: "monospace" }}>
              {profile?.user?.reg_id || "Unset"}
            </span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Phone Contact</span>
            <span className={styles.fieldValue}>{profile?.user?.phone || "—"}</span>
          </div>
        </div>
      </section>

      {/* ── 3. Security & Authentication Card ────────────────── */}
      <section className={styles.card}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9375rem", fontWeight: 700, color: "#0F172A" }}>
          <LockIcon width="16" height="16" style={{ color: "#92400E" }} />
          <span>Security &amp; Authentication</span>
        </div>

        <div>
          <div className={styles.actionRow}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0F172A" }}>Portal Password</div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.15rem" }}>
                Update your password to keep your examination attempts secure.
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowPwModal(true)}>
              Change Password
            </Button>
          </div>

          <div className={styles.actionRow}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0F172A" }}>Sign Out (This Session)</div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.15rem" }}>
                End only this browser session without interrupting other active devices.
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await logout();
                router.replace("/");
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </section>

      {/* ── 4. Active Sessions & Device Management (OWASP Session Visibility & Revocation) ── */}
      <section className={styles.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9375rem", fontWeight: 700, color: "#0F172A" }}>
              <MonitorIcon width="16" height="16" style={{ color: "#92400E" }} />
              <span>Active Sessions &amp; Devices</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.2rem" }}>
              Review devices currently signed in to your student account and revoke any unrecognized session.
            </div>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={revokingAll}
              onClick={handleLogoutOtherSessions}
            >
              {revokingAll ? "Revoking…" : "Sign Out Other Devices"}
            </Button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "0.5rem" }}>
          {sessionsLoading && sessions.length === 0 ? (
            <div style={{ fontSize: "0.8125rem", color: "#64748B", padding: "0.5rem 0" }}>
              Loading active sessions…
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ fontSize: "0.8125rem", color: "#64748B", padding: "0.5rem 0" }}>
              Current browser session is active.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.jti}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  padding: "0.75rem 0.875rem",
                  borderRadius: "8px",
                  border: s.is_current ? "1px solid rgba(146, 64, 14, 0.28)" : "1px solid #E2E8F0",
                  background: s.is_current ? "#FFFBEB" : "#F8FAFC",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0F172A" }}>
                      {s.device_name || "Browser Session"}
                    </span>
                    {s.is_current && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          color: "#92400E",
                          background: "rgba(217, 119, 6, 0.14)",
                          padding: "0.1rem 0.45rem",
                          borderRadius: "999px",
                        }}
                      >
                        Current Session
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontFamily: "var(--font-mono, monospace)" }}>
                    IP: {s.ip || "local"} · Signed in {new Date(s.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={revokingJti === s.jti}
                  onClick={() => handleRevokeSession(s.jti, s.is_current)}
                >
                  {revokingJti === s.jti ? "Revoking…" : s.is_current ? "Sign Out" : "Revoke"}
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
