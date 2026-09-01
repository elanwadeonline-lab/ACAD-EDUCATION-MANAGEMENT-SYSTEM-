"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

interface FeeItem {
  id: string | number;
  title: string;
  amount: number;
  due_date?: string;
  status: "paid" | "pending" | "partial" | string;
}

interface FeeData {
  total: number;
  paid: number;
  balance: number;
  due_date: string;
  items: FeeItem[];
  payment_history?: Array<{ id: string; title: string; date: string; amount: number; reference: string }>;
}

export default function GuardianFeesPage() {
  return (
    <RequireRole role="guardian">
      <FeesContent />
    </RequireRole>
  );
}

function FeesContent() {
  const { activeWard, period, setPeriod, openChildSwitcher } = useGuardian();
  const router = useRouter();
  const [feeData, setFeeData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [cardNumber, setCardNumber] = useState("4000 1234 5678 9010");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("321");
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadFees = () => {
    if (!activeWard) return;
    setLoading(true);
    const wardId = activeWard.student_id || activeWard.id;

    api.get<FeeData>(`/api/guardian/wards/${wardId}/fees`)
      .then((res) => {
        if (res && (res.total != null || res.items)) {
          setFeeData(res);
          setPayAmount(res.balance || 0);
        } else if (activeWard.fees) {
          const liveFees: FeeData = {
            total: (activeWard.fees as any).total_fees || activeWard.fees.total || 0,
            paid: (activeWard.fees as any).amount_paid || activeWard.fees.paid || 0,
            balance: activeWard.fees.balance || 0,
            due_date: (activeWard.fees as any).due_date || "End of Term",
            items: (activeWard.fees.items as any) || [],
            payment_history: (activeWard.fees as any).payment_history || [],
          };
          setFeeData(liveFees);
          setPayAmount(liveFees.balance);
        } else {
          setFeeData({ total: 0, paid: 0, balance: 0, due_date: "End of Term", items: [], payment_history: [] });
        }
      })
      .catch(() => {
        setFeeData({ total: 0, paid: 0, balance: 0, due_date: "End of Term", items: [], payment_history: [] });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFees();
  }, [activeWard]);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWard || payAmount <= 0 || processing) return;

    setProcessing(true);
    const wardId = activeWard.student_id || activeWard.id;

    try {
      await api.post(`/api/guardian/wards/${wardId}/fees/pay`, {
        amount: payAmount,
        payment_method: "card",
        card_last4: cardNumber.slice(-4),
      });

      setShowPayModal(false);
      setToastMessage(`Payment of ₦${payAmount.toLocaleString()} processed successfully!`);
      setTimeout(() => setToastMessage(null), 4000);
      loadFees();
    } catch (err: any) {
      setToastMessage(err.message || "Payment processing failed");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setProcessing(false);
    }
  };

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)" }}>No active ward selected.</div>;
  }

  const fees = feeData || {
    total: 0,
    paid: 0,
    balance: 0,
    due_date: "End of Term",
    items: [],
    payment_history: [],
  };

  const pctPaid = fees.total > 0 ? Math.round((fees.paid / fees.total) * 100) : 100;

  return (
    <div className={styles.container}>
      {/* ── Top Header Controls ── */}
      <div className={styles.topControlRow}>
        <button
          type="button"
          className={styles.childSelectBtn}
          onClick={openChildSwitcher}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <StudentAvatar name={activeWard.name} imageUrl={activeWard.image_url} size="xs" />
          <span className={styles.childSelectName}>{activeWard.name}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button
          type="button"
          className={styles.periodBadge}
          onClick={() => setPeriod(period === "this_term" ? "this_week" : "this_term")}
        >
          <span>{period === "this_term" ? "This Term" : "This Week"}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── 1. Balance Summary Card ── */}
      <section className={styles.balanceCard}>
        <span className={styles.balanceLabel}>Outstanding Balance</span>
        <div className={styles.amountLarge}>₦{fees.balance.toLocaleString()}</div>
        <span className={styles.balanceSubtext}>
          Paid ₦{fees.paid.toLocaleString()} of ₦{fees.total.toLocaleString()} ({pctPaid}%) • Due {fees.due_date}
        </span>

        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${pctPaid}%` }} />
        </div>

        {fees.balance > 0 && (
          <button
            type="button"
            className={styles.payNowHeroBtn}
            onClick={() => {
              setPayAmount(fees.balance);
              setShowPayModal(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <span>Pay Fees (₦{fees.balance.toLocaleString()})</span>
          </button>
        )}
      </section>

      {/* ── 2. Itemized Ledger ── */}
      <section className={styles.breakdownSection}>
        <h2 className={styles.sectionHeading}>Term Fee Breakdown</h2>
        <div className={styles.itemsList}>
          {fees.items.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.875rem" }}>
              No outstanding fee items scheduled for this term.
            </div>
          ) : (
            fees.items.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.itemLeftCol}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemDueDate}>Due by {item.due_date || "Term End"}</span>
                </div>
                <div className={styles.itemRightCol}>
                  <span className={styles.itemAmount}>₦{item.amount.toLocaleString()}</span>
                  <span className={`${styles.itemStatusPill} ${item.status === "paid" ? styles.itemPaid : styles.itemPending}`}>
                    {item.status === "paid" ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── 3. Payment Receipts History ── */}
      <section className={styles.receiptsSection}>
        <h3 className={styles.sectionHeading}>Payment Receipts & History</h3>
        <div className={styles.itemsList}>
          {(fees.payment_history || []).length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--g-text-secondary, #64748B)", fontSize: "0.875rem" }}>
              No previous payment receipts recorded for this session.
            </div>
          ) : (
            (fees.payment_history || []).map((rec) => (
              <div key={rec.id} className={styles.receiptItem}>
                <div className={styles.receiptLeft}>
                  <span className={styles.receiptTitle}>{rec.title}</span>
                  <span className={styles.receiptDate}>{rec.date} • Ref: {rec.reference}</span>
                </div>
                <span className={styles.receiptAmount}>₦{rec.amount.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── 4. Checkout Simulation Modal ── */}
      <AnimatePresence>
        {showPayModal && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPayModal(false)}
          >
            <motion.div
              className={styles.checkoutModal}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Fee Checkout Simulator</h3>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--g-text-muted, #64748B)", cursor: "pointer" }}
                  onClick={() => setShowPayModal(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form className={styles.modalBody} onSubmit={handleProcessPayment}>
                <div className={styles.cardInputGroup}>
                  <label className={styles.inputLabel}>Payment Amount (₦)</label>
                  <input
                    type="number"
                    className={styles.inputField}
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    max={fees.balance}
                    min={1000}
                    required
                  />
                </div>

                <div className={styles.cardInputGroup}>
                  <label className={styles.inputLabel}>Card Number</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div className={styles.cardInputGroup}>
                    <label className={styles.inputLabel}>Expiry</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.cardInputGroup}>
                    <label className={styles.inputLabel}>CVV</label>
                    <input
                      type="password"
                      className={styles.inputField}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      maxLength={3}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.payConfirmBtn}
                  disabled={processing || payAmount <= 0}
                >
                  {processing ? "Processing Payment…" : `Confirm Payment of ₦${payAmount.toLocaleString()}`}
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
