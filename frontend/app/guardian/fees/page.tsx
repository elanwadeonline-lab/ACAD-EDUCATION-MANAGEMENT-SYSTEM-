"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function GuardianFeesPage() {
  return (
    <RequireRole role="guardian">
      <FeesContent />
    </RequireRole>
  );
}

function FeesContent() {
  const { activeWard, period, setPeriod, refreshData } = useGuardian();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!activeWard) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>No active ward selected.</div>;
  }

  const fees = activeWard.fees || {
    total_fees: 150000,
    amount_paid: 120000,
    balance: 30000,
    percentage: 80,
    items: [
      { id: "f-1", title: "Tuition Fee", amount: 90000, status: "paid", paid_date: "Apr 10, 2025" },
      { id: "f-2", title: "Development Fee", amount: 20000, status: "paid", paid_date: "Apr 10, 2025" },
      { id: "f-3", title: "Examination Fee", amount: 10000, status: "paid", paid_date: "Apr 10, 2025" },
    ],
  };

  const handlePayBalance = async () => {
    try {
      setPaying(true);
      const pendingItem = fees.items.find((i: any) => i.status !== "paid");
      const feeId = pendingItem ? Number(pendingItem.id) : 1;
      await api.post<any>(`/api/guardian/wards/${activeWard.id}/fees/pay`, {
        fee_id: feeId,
        amount: fees.balance,
        method: "card",
      });
      setSuccess(true);
      refreshData();
    } catch (err: any) {
      alert(err.message || "Payment processing failed.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeftGroup}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.back()}
            aria-label="Back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className={styles.pageTitle}>Fee Payments</h1>
        </div>

        <button
          type="button"
          className={styles.periodDropdown}
          onClick={() => setPeriod(period === "this_term" ? "this_week" : "this_term")}
        >
          <span>{period === "this_term" ? "This Term" : "This Week"}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── 1. Total Paid Balance Card ── */}
      <section className={styles.balanceCard}>
        <span className={styles.balanceLabel}>Total Paid</span>
        <div className={styles.amountLarge}>
          ₦{(success ? fees.total_fees : fees.amount_paid).toLocaleString()}
        </div>
        <span className={styles.balanceSubtext}>
          out of ₦{fees.total_fees.toLocaleString()}
        </span>

        {/* Progress Bar */}
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: success ? "100%" : `${fees.percentage}%` }}
          />
        </div>
      </section>

      {/* ── 2. Itemized Fee Breakdown ── */}
      <section className={styles.breakdownSection}>
        <div className={styles.itemsList}>
          {fees.items.map((item: any) => {
            const isItemPaid = success || item.status === "paid";
            return (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.itemLeftCol}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemDate}>
                    {isItemPaid ? `Paid on ${item.paid_date || "Apr 10, 2025"}` : "Pending Payment"}
                  </span>
                </div>

                <div className={styles.itemRightCol}>
                  <span className={styles.itemAmount}>₦{item.amount.toLocaleString()}</span>
                  <span className={isItemPaid ? styles.paidBadge : styles.pendingBadge}>
                    {isItemPaid ? "• Paid" : "Pending"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pay or History Button */}
      {!success && fees.balance > 0 ? (
        <button
          type="button"
          className={styles.payBtn}
          onClick={handlePayBalance}
          disabled={paying}
        >
          {paying ? "Processing Payment…" : `Pay Outstanding (₦${fees.balance.toLocaleString()})`}
        </button>
      ) : null}

      <button type="button" className={styles.historyBtn}>
        View Payment History
      </button>
    </div>
  );
}
