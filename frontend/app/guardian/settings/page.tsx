"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function GuardianSettingsPage() {
  return (
    <RequireRole role="guardian">
      <SettingsContent />
    </RequireRole>
  );
}

function SettingsContent() {
  const { guardianName, wards } = useGuardian();
  const { logout } = useAuth();

  // Modals state
  const [activeModal, setActiveModal] = useState<"security" | "profile" | "notifications" | "support" | null>(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile Form State
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notification Preferences
  const [notifyAttendance, setNotifyAttendance] = useState(true);
  const [notifyResults, setNotifyResults] = useState(true);
  const [notifyFees, setNotifyFees] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: "error", text: "Please enter your current and new password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordMsg(null);
      await api.post("/api/guardian/settings/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg({ type: "success", text: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err?.message || "Failed to update password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileMsg(null);
      await api.post("/api/guardian/settings/profile", {
        phone,
        address,
      });
      setProfileMsg({ type: "success", text: "Contact profile updated successfully!" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err?.message || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setNotifSaving(true);
      setNotifMsg(null);

      // Register web push if enabled
      if (pushEnabled && "serviceWorker" in navigator && "Notification" in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            const reg = await navigator.serviceWorker.ready;
            const keyRes = (await api.get("/api/notifications/vapid-public-key")) as any;
            if (keyRes?.publicKey) {
              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: keyRes.publicKey,
              });
              await api.post("/api/notifications/subscribe-push", sub.toJSON());
            }
          }
        } catch {}
      }

      await api.post("/api/guardian/settings/notifications", {
        notify_attendance: notifyAttendance,
        notify_results: notifyResults,
        notify_fees: notifyFees,
        notify_messages: notifyMessages,
      });

      setNotifMsg({ type: "success", text: "Notification preferences saved!" });
    } catch (err: any) {
      setNotifMsg({ type: "error", text: err?.message || "Failed to save preferences." });
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Settings</h1>

      {/* ── Settings Row List ── */}
      <section className={styles.settingsCard}>
        {/* 1. Profile Information */}
        <button
          type="button"
          className={styles.settingRow}
          onClick={() => setActiveModal("profile")}
        >
          <span className={styles.settingLabel}>Profile Information</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* 2. Change Password */}
        <button
          type="button"
          className={styles.settingRow}
          onClick={() => setActiveModal("security")}
        >
          <span className={styles.settingLabel}>Change Password</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* 3. Notification Preferences */}
        <button
          type="button"
          className={styles.settingRow}
          onClick={() => setActiveModal("notifications")}
        >
          <span className={styles.settingLabel}>Notification Preferences</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* 4. Linked Children */}
        <Link href="/guardian/wards" className={styles.settingRow}>
          <span className={styles.settingLabel}>Linked Children</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        {/* 5. Language */}
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Language</span>
          <div className={styles.settingRightGroup}>
            <span className={styles.settingValueText}>English</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* 6. Help & Support */}
        <button
          type="button"
          className={styles.settingRow}
          onClick={() => setActiveModal("support")}
        >
          <span className={styles.settingLabel}>Help & Support</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* 7. About */}
        <div className={styles.settingRow} style={{ borderBottom: "none" }}>
          <span className={styles.settingLabel}>About ACAD Guardian</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </section>

      {/* ── Log Out Button ── */}
      <button
        type="button"
        className={styles.logoutBtn}
        onClick={() => logout()}
      >
        Log Out
      </button>

      {/* ── Modal: Security & Password ── */}
      {activeModal === "security" && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Change Password</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {passwordMsg && (
              <div className={passwordMsg.type === "success" ? styles.toastSuccess : styles.toastError}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Password</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>New Password</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Confirm New Password</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={passwordSaving}>
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Contact Profile ── */}
      {activeModal === "profile" && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Guardian Profile</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {profileMsg && (
              <div className={profileMsg.type === "success" ? styles.toastSuccess : styles.toastError}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Phone Number / WhatsApp</label>
                <input
                  type="tel"
                  className={styles.formInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Residential Address</label>
                <textarea
                  className={styles.formInput}
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your home address"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Notifications Preferences ── */}
      {activeModal === "notifications" && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Notification Channels</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {notifMsg && (
              <div className={notifMsg.type === "success" ? styles.toastSuccess : styles.toastError}>
                {notifMsg.text}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600, color: "#0F172A", cursor: "pointer", padding: "0.5rem 0", borderBottom: "1px solid #F1F5F9" }}>
                <span>Daily Attendance Roll Call</span>
                <input type="checkbox" checked={notifyAttendance} onChange={(e) => setNotifyAttendance(e.target.checked)} />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600, color: "#0F172A", cursor: "pointer", padding: "0.5rem 0", borderBottom: "1px solid #F1F5F9" }}>
                <span>CBT Exam & Test Score Releases</span>
                <input type="checkbox" checked={notifyResults} onChange={(e) => setNotifyResults(e.target.checked)} />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600, color: "#0F172A", cursor: "pointer", padding: "0.5rem 0", borderBottom: "1px solid #F1F5F9" }}>
                <span>Fee Receipts & Payment Confirmations</span>
                <input type="checkbox" checked={notifyFees} onChange={(e) => setNotifyFees(e.target.checked)} />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600, color: "#0F172A", cursor: "pointer", padding: "0.5rem 0", borderBottom: "1px solid #F1F5F9" }}>
                <span>Teacher & Admin Direct Messages</span>
                <input type="checkbox" checked={notifyMessages} onChange={(e) => setNotifyMessages(e.target.checked)} />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600, color: "#0F172A", cursor: "pointer", padding: "0.5rem 0" }}>
                <div>
                  <div>Web Push (Locked Screen Alerts)</div>
                  <div style={{ fontSize: "0.6875rem", color: "#64748B", fontWeight: 400 }}>Wake device and show banner when screen is locked</div>
                </div>
                <input type="checkbox" checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} />
              </label>

              <button type="button" className={styles.submitBtn} onClick={handleSaveNotifications} disabled={notifSaving} style={{ marginTop: "0.5rem" }}>
                {notifSaving ? "Saving Preferences..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Support Desk ── */}
      {activeModal === "support" && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Help & Support Desk</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ background: "#F8FAFC", padding: "1.25rem", borderRadius: 12, border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0F172A" }}>ExamPool School Support</div>
              <div style={{ fontSize: "0.8125rem", color: "#475569", lineHeight: 1.5 }}>
                Need help linking your ward, verifying exam records, or resolving payment queries? Reach our local academic liaison desk.
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#165AF6", fontWeight: 600 }}>
                Email: support@acad.edu
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#165AF6", fontWeight: 600 }}>
                Hotline: +234 800 222 3456
              </div>
            </div>

            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => setActiveModal(null)}
              style={{ marginTop: "0.5rem" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
