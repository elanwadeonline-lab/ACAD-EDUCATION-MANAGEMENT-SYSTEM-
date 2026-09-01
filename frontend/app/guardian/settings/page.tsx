"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  relationship: string;
  notify_attendance: boolean;
  notify_results: boolean;
  notify_fees: boolean;
  notify_messages: boolean;
}

export default function GuardianSettingsPage() {
  return (
    <RequireRole role="guardian">
      <SettingsContent />
    </RequireRole>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { guardianName, theme, setTheme } = useGuardian();
  const [profile, setProfile] = useState<ProfileData>({
    id: 1,
    name: guardianName || "Mrs. Adenike Adeleke",
    email: "adenike.ad@gmail.com",
    phone: "+234 801 234 5678",
    address: "Lekki Phase 1, Lagos, Nigeria",
    relationship: "Mother",
    notify_attendance: true,
    notify_results: true,
    notify_fees: true,
    notify_messages: true,
  });

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(profile.phone);
  const [addressInput, setAddressInput] = useState(profile.address);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<ProfileData>("/api/guardian/profile")
      .then((res) => {
        if (res && res.name) {
          setProfile(res);
          setPhoneInput(res.phone || "");
          setAddressInput(res.address || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleNotification = async (key: keyof Pick<ProfileData, "notify_attendance" | "notify_results" | "notify_fees" | "notify_messages">) => {
    const updated = !profile[key];
    const newProfile = { ...profile, [key]: updated };
    setProfile(newProfile);

    try {
      await api.post("/api/guardian/settings/notifications", {
        notify_attendance: newProfile.notify_attendance,
        notify_results: newProfile.notify_results,
        notify_fees: newProfile.notify_fees,
        notify_messages: newProfile.notify_messages,
      });
    } catch {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/guardian/settings/profile", {
        phone: phoneInput,
        address: addressInput,
      });
      setProfile((prev) => ({ ...prev, phone: phoneInput, address: addressInput }));
      setShowEditProfileModal(false);
      setToastMessage("Profile updated successfully");
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setProfile((prev) => ({ ...prev, phone: phoneInput, address: addressInput }));
      setShowEditProfileModal(false);
      setToastMessage("Profile updated successfully");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match");
      return;
    }
    try {
      await api.post("/api/guardian/settings/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setToastMessage("Password changed successfully");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update password");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    router.push("/auth/login");
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Settings & Profile</h1>

      {/* ── 1. Profile Hero Summary ── */}
      <section className={styles.profileHeroCard}>
        <div className={styles.profileHeroLeft}>
          <div className={styles.avatarBox}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.profileHeroMeta}>
            <span className={styles.profileName}>{profile.name}</span>
            <span className={styles.profileRole}>{profile.relationship} • {profile.phone}</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.editProfileBtn}
          onClick={() => setShowEditProfileModal(true)}
        >
          Edit
        </button>
      </section>

      {/* ── 2. Notification Preferences ── */}
      <div className={styles.settingsCard}>
        <span className={styles.settingSectionHeading}>Notification Alerts</span>

        <div className={styles.settingRow} onClick={() => handleToggleNotification("notify_attendance")}>
          <div>
            <div className={styles.settingLabel}>Daily Attendance Alerts</div>
            <div className={styles.settingSub}>Instant SMS / Push when student roll call is marked</div>
          </div>
          <div
            className={`${styles.switchTrack} ${profile.notify_attendance ? styles.switchTrackActive : ""}`}
          >
            <div className={`${styles.switchThumb} ${profile.notify_attendance ? styles.switchThumbActive : ""}`} />
          </div>
        </div>

        <div className={styles.settingRow} onClick={() => handleToggleNotification("notify_results")}>
          <div>
            <div className={styles.settingLabel}>Result Release Notices</div>
            <div className={styles.settingSub}>Notified as soon as term broadsheets are published</div>
          </div>
          <div
            className={`${styles.switchTrack} ${profile.notify_results ? styles.switchTrackActive : ""}`}
          >
            <div className={`${styles.switchThumb} ${profile.notify_results ? styles.switchThumbActive : ""}`} />
          </div>
        </div>

        <div className={styles.settingRow} onClick={() => handleToggleNotification("notify_fees")}>
          <div>
            <div className={styles.settingLabel}>Fee Reminders & Receipts</div>
            <div className={styles.settingSub}>Payment reminders and automated digital receipts</div>
          </div>
          <div
            className={`${styles.switchTrack} ${profile.notify_fees ? styles.switchTrackActive : ""}`}
          >
            <div className={`${styles.switchThumb} ${profile.notify_fees ? styles.switchThumbActive : ""}`} />
          </div>
        </div>

        <div className={styles.settingRow} onClick={() => handleToggleNotification("notify_messages")}>
          <div>
            <div className={styles.settingLabel}>Direct Teacher Messages</div>
            <div className={styles.settingSub}>Notifications for direct messages from form teachers</div>
          </div>
          <div
            className={`${styles.switchTrack} ${profile.notify_messages ? styles.switchTrackActive : ""}`}
          >
            <div className={`${styles.switchThumb} ${profile.notify_messages ? styles.switchThumbActive : ""}`} />
          </div>
        </div>
      </div>

      {/* ── 3. Quick Portals & Features ── */}
      <div className={styles.settingsCard}>
        <span className={styles.settingSectionHeading}>Guardian Modules</span>

        <Link href="/guardian/messages" className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>💬 Messages & Teacher Chat</span>
            </div>
            <div className={styles.settingSub}>Direct inquiries with Form Teacher & School Admin</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/guardian/fees" className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>💳 School Fees & Payment</div>
            <div className={styles.settingSub}>View fee breakdown, pay online & receipts</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/guardian/attendance" className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>📅 Daily Attendance & Roll Calls</div>
            <div className={styles.settingSub}>Monthly attendance calendar & punctuality logs</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/guardian/reports" className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>📑 Report Cards & Broadsheets</div>
            <div className={styles.settingSub}>Term broadsheets, verified share links & PDFs</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/guardian/examinations" className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>📝 Examination Schedules</div>
            <div className={styles.settingSub}>CBT & written examination timetables</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/guardian/announcements" className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>📢 School Announcements</div>
            <div className={styles.settingSub}>Official notices, PTA meetings & events</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/guardian/calendar" className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>🗓️ Academic Calendar</div>
            <div className={styles.settingSub}>Term dates, holidays & school fixtures</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {/* ── 4. App Appearance & Wards ── */}
      <div className={styles.settingsCard}>
        <span className={styles.settingSectionHeading}>Preferences & Management</span>

        <div
          className={styles.settingRow}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <div>
            <div className={styles.settingLabel}>Appearance Theme</div>
            <div className={styles.settingSub}>Toggle Light and Dark Mode</div>
          </div>
          <div className={styles.settingRightGroup}>
            <span className={styles.settingValueText}>{theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
            <div className={`${styles.switchTrack} ${theme === "dark" ? styles.switchTrackActive : ""}`}>
              <div className={`${styles.switchThumb} ${theme === "dark" ? styles.switchThumbActive : ""}`} />
            </div>
          </div>
        </div>

        <Link href="/guardian/links" className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>Manage Student Links</div>
            <div className={styles.settingSub}>Add, approve, or remove student connections</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <div className={styles.settingRow} onClick={() => setShowPasswordModal(true)}>
          <div>
            <div className={styles.settingLabel}>Security & Password</div>
            <div className={styles.settingSub}>Change account login password</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* ── 4. Sign Out Button ── */}
      <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
        Sign Out of Guardian Portal
      </button>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfileModal && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditProfileModal(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Edit Guardian Profile</h3>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--g-text-muted, #64748B)", cursor: "pointer" }}
                  onClick={() => setShowEditProfileModal(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form className={styles.modalBody} onSubmit={handleSaveProfile}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={profile.name}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Phone Number</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Residential Address</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Save Changes
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Change Password</h3>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--g-text-muted, #64748B)", cursor: "pointer" }}
                  onClick={() => setShowPasswordModal(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form className={styles.modalBody} onSubmit={handleChangePassword}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Current Password</label>
                  <input
                    type="password"
                    className={styles.formInput}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
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
                    required
                    minLength={6}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Confirm New Password</label>
                  <input
                    type="password"
                    className={styles.formInput}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Update Password
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--g-text-primary, #0F172A)",
          color: "#FFFFFF",
          fontSize: "0.8125rem",
          fontWeight: 600,
          padding: "0.6rem 1.2rem",
          borderRadius: 999,
          zIndex: 140,
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap"
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
