"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPendingSubmissions, clearPendingSubmissions, deletePendingSubmissionsByIds, saveOfflineSubmission } from "../lib/offlineSync";
import { getOfflineSubmissions, deleteOfflineSubmission } from "../lib/idb";
import { api } from "../lib/api";

/**
 * Unified online-first sync loop for the student device.
 *
 * • Assignment submissions cached by the Offline Assignments hub (offlineSync store)
 *   are uploaded the moment the device reaches the school network — no manual
 *   "Sync Answers" press needed. The hub keeps the manual button as a fallback.
 * • Practice submissions cached by the exam page when offline (idb store) are
 *   replayed through submitPractice so XP/telemetry counts offline practice.
 *
 * Runs on mount, on every `online` event, and on a 60s interval while pending
 * work remains. Failures are silent — items stay queued for the next pass.
 */
export function useOfflineAutoSync(onSynced?: (syncedCount: number) => void) {
  const syncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  const countPending = useCallback(async () => {
    try {
      const [subs, practice] = await Promise.all([getPendingSubmissions(), getOfflineSubmissions()]);
      setPendingCount(subs.length + practice.length);
    } catch {
      /* cache unavailable */
    }
  }, []);

  const runSync = useCallback(async () => {
    if (syncingRef.current || typeof navigator === "undefined" || !navigator.onLine) return;
    syncingRef.current = true;
    let syncedTotal = 0;
    try {
      // 1. Offline assignment submissions → offline sync endpoint
      const pending = await getPendingSubmissions();
      if (pending.length > 0) {
        try {
          const res = await api.syncOfflineAssignments(pending);
          const ackIds = (res as any)?.acknowledged_ids;
          if (Array.isArray(ackIds) && ackIds.length > 0) {
            await deletePendingSubmissionsByIds(ackIds);
          } else if (Number((res as any)?.synced) === pending.length) {
            await clearPendingSubmissions();
          }
          syncedTotal += Number((res as any)?.synced ?? pending.length);
        } catch {
          // Will retry on the next event; queue intact.
        }
      }

      // 2. Offline practice submissions → practice submit replay
      const practice = await getOfflineSubmissions();
      for (const item of practice) {
        try {
          if (item?.value?.practiceId && item?.value?.answers) {
            await api.submitPractice(item.value.practiceId, item.value.answers);
            await deleteOfflineSubmission(item.key);
            syncedTotal += 1;
          } else {
            await deleteOfflineSubmission(item.key);
          }
        } catch {
          // Leave for next pass.
        }
      }
      if (syncedTotal > 0) onSynced?.(syncedTotal);
    } finally {
      syncingRef.current = false;
      countPending();
    }
  }, [onSynced, countPending]);

  useEffect(() => {
    countPending();
    const onOnline = () => { runSync(); };
    window.addEventListener("online", onOnline);
    const interval = setInterval(() => { countPending(); runSync(); }, 60_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, [runSync, countPending]);

  // Push a submission straight into the pending queue (online → submit now, offline → queue)
  const queueSubmission = useCallback(async (submission: Parameters<typeof saveOfflineSubmission>[0]) => {
    await saveOfflineSubmission(submission as any);
    setPendingCount((c) => c + 1);
    runSync();
  }, [runSync]);

  return { pendingCount, queueSubmission, flush: runSync };
}
