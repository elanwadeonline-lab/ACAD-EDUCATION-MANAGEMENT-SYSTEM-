"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

interface GuardianLink {
  id: number;
  student_id: number;
  student_name: string;
  grade: string;
  reg_id: string;
  relationship: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  created_at: string;
}

export default function GuardianLinksPage() {
  return (
    <RequireRole role="guardian">
      <LinksContent />
    </RequireRole>
  );
}

function LinksContent() {
  const router = useRouter();
  const { refreshData } = useGuardian();
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "approved" | "pending">("all");
  const [searchReg, setSearchReg] = useState("");
  const [relationship, setRelationship] = useState("Mother");
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await api.getGuardianLinks();
      const items = Array.isArray(res) ? res : ((res as any)?.data || []);
      setLinks(items);
    } catch (err: any) {
      console.error("Failed to fetch guardian links:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchReg.trim() || submitting) return;

    try {
      setSubmitting(true);
      await api.createGuardianLink({
        reg_id: searchReg.trim(),
        relationship: relationship.trim() || "Parent",
      });
      setToastMessage("Student link request submitted for school verification.");
      setTimeout(() => setToastMessage(null), 3500);
      setSearchReg("");
      setModalOpen(false);
      await fetchLinks();
      await refreshData();
    } catch (err: any) {
      setToastMessage(err?.message || "Failed to submit link request");
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeLink = async (linkId: number) => {
    if (!confirm("Are you sure you want to revoke this student link?")) return;
    try {
      await api.deleteGuardianLink(linkId);
      setToastMessage("Link request cancelled.");
      setTimeout(() => setToastMessage(null), 3000);
      await fetchLinks();
      await refreshData();
    } catch (err: any) {
      alert(err?.message || "Failed to revoke link");
    }
  };

  const filteredLinks = links.filter((l) => {
    if (activeTab === "approved") return l.status === "approved";
    if (activeTab === "pending") return l.status === "pending";
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Linked Children</h1>
          <p className={styles.pageSubtitle}>Manage and link your student accounts</p>
        </div>
        <button
          type="button"
          className={styles.addLinkBtn}
          onClick={() => setModalOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Link Student</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabList}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "all" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All ({links.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "approved" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("approved")}
        >
          Approved ({links.filter(l => l.status === "approved").length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "pending" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending ({links.filter(l => l.status === "pending").length})
        </button>
      </div>

      {/* Links List */}
      <div className={styles.linksList}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.875rem" }}>
            Loading student links…
          </div>
        ) : filteredLinks.length === 0 ? (
          <div style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            background: "var(--g-surface, #FFFFFF)",
            border: "1px solid var(--g-border, #E2E8F0)",
            borderRadius: "var(--g-radius-lg, 16px)",
            color: "var(--g-text-secondary, #64748B)"
          }}>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--g-text-primary, #0F172A)", marginBottom: "0.35rem" }}>
              No student links found
            </p>
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>
              Tap "+ Link Student" to connect your child's school profile with their registration ID.
            </p>
          </div>
        ) : (
          filteredLinks.map((link) => {
            const isApproved = link.status === "approved";
            const isPending = link.status === "pending";

            return (
              <div key={link.id} className={styles.linkCard}>
                <div className={styles.cardHeaderRow}>
                  <div className={styles.studentMetaGroup}>
                    <StudentAvatar name={link.student_name} size="md" />
                    <div className={styles.studentMetaCol}>
                      <span className={styles.studentName}>{link.student_name}</span>
                      <span className={styles.studentGrade}>{link.grade} • {link.relationship}</span>
                    </div>
                  </div>

                  <span className={`${styles.statusPill} ${isApproved ? styles.statusApproved : isPending ? styles.statusPending : styles.statusRejected}`}>
                    {isApproved ? "Approved" : isPending ? "Pending Approval" : "Rejected"}
                  </span>
                </div>

                <div className={styles.cardDetailsGrid}>
                  <div>
                    <span className={styles.detailLabel}>Reg / Admission No:</span>{" "}
                    <span className={styles.detailVal}>{link.reg_id || `ID-${link.student_id}`}</span>
                  </div>
                  <div>
                    <span className={styles.detailLabel}>Linked Date:</span>{" "}
                    <span className={styles.detailVal}>{link.created_at ? new Date(link.created_at).toLocaleDateString() : "Recent"}</span>
                  </div>
                </div>

                {isPending && (
                  <button
                    type="button"
                    className={styles.cancelLinkBtn}
                    onClick={() => handleRevokeLink(link.id)}
                  >
                    Cancel Link Request
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Link Student Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Link a Student Profile</h3>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--g-text-muted, #64748B)", cursor: "pointer" }}
                  onClick={() => setModalOpen(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form className={styles.modalBody} onSubmit={handleCreateLink}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Student Registration / Admission No.</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. REG-2026-0001 or Student ID"
                    value={searchReg}
                    onChange={(e) => setSearchReg(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Your Relationship to Student</label>
                  <select
                    className={styles.formInput}
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Legal Guardian</option>
                    <option value="Other">Other Family Member</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting || !searchReg.trim()}
                >
                  {submitting ? "Submitting Request…" : "Send Link Request"}
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