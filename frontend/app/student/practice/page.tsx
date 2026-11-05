"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import { savePackage, getAllPackageIds, getOfflineSubmissions, deleteOfflineSubmission } from "../../../lib/idb";
import { useToast } from "../../../hooks/useToast";
import { PracticeCatalog } from "../../../components/student/PracticeCatalog";
import { PracticeArena } from "../../../components/student/PracticeArena";
import styles from "./page.module.css";

const SUBJECT_MAP: Record<string, string> = {
  MTH: "Mathematics",
  ENG: "English Language",
  PHY: "Physics",
  CHM: "Chemistry",
  BIO: "Biology",
  GOV: "Government",
  ECO: "Economics",
  LIT: "Literature in English",
  CRS: "Christian Religious Studies",
  IRS: "Islamic Religious Studies",
  ACC: "Accounting",
  COM: "Commerce",
  GEO: "Geography",
  AGR: "Agricultural Science",
};

const getSubjectName = (code: string) => {
  return SUBJECT_MAP[code.toUpperCase()] || code;
};

export default function PracticeSandboxPage() {
  return (
    <RequireRole role="student">
      <PracticeSandbox />
    </RequireRole>
  );
}

function PracticeSandbox() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [downloadedPkgs, setDownloadedPkgs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const syncOfflineSubmissions = async () => {
      try {
        if (!navigator.onLine) return;
        const offlineSubs = await getOfflineSubmissions();
        if (offlineSubs.length > 0) {
          for (const sub of offlineSubs) {
            try {
              await api.submitPractice(sub.value.practiceId, sub.value.answers);
              await deleteOfflineSubmission(sub.key);
            } catch (e) {
              // Silently handle sync failures
            }
          }
        }
      } catch (e) {
        // Silently handle outer sync failures
      }
    };

    const loadPackages = async () => {
      try {
        try {
          await syncOfflineSubmissions();
        } catch (e) {
          // ignore sync error
        }

        try {
          const data = (await api.getContentManifest()) as any;
          if (!signal.aborted && data?.packages) {
            setPackages(data.packages);
          }
        } catch (netErr) {
          console.warn("Could not fetch online packages, checking local cache", netErr);
        }

        const cached = await getAllPackageIds();
        if (!signal.aborted) setDownloadedPkgs(cached);
      } catch (err: any) {
        if (!signal.aborted) setError(err.message || "Failed to load practice catalog.");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    loadPackages();
    return () => controller.abort();
  }, []);

  const handleStartPractice = (pkgId: string) => {
    const isDownloaded = downloadedPkgs.includes(pkgId);
    if (!navigator.onLine && !isDownloaded) {
      showToast("You are offline. Please connect to download this package first.", "error");
      return;
    }
    router.push(`/student/exam?practiceId=${pkgId}${isDownloaded ? "&offlinePkg=true" : ""}`);
  };

  const handleDownload = async (pkgId: string) => {
    setDownloadingId(pkgId);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_BASE}/api/practice/download?packageId=${encodeURIComponent(pkgId)}`, { credentials: "include" });
      let epkg: any = null;
      if (res.ok) {
        epkg = await res.json().catch(() => null);
        // If server returns encrypted epkg (ciphertext), try to hydrate via content API as fallback for offline
        const hasQuestions = epkg && ((Array.isArray(epkg.questions) && epkg.questions.length) || epkg.data?.questions);
        if (!hasQuestions) {
          try {
            const pkgData = await api.getPackageQuestions(pkgId) as any;
            const qs = pkgData?.questions || pkgData?.data?.questions;
            if (Array.isArray(qs) && qs.length) epkg = { questions: qs, downloaded_at: Date.now() };
          } catch {}
        }
      } else {
        // Fallback to questions API when download endpoint unavailable (e.g., content_bank empty)
        const pkgData = await api.getPackageQuestions(pkgId) as any;
        const qs = pkgData?.questions || pkgData?.data?.questions;
        if (Array.isArray(qs) && qs.length) epkg = { questions: qs, downloaded_at: Date.now() };
        else throw new Error("Failed to download package");
      }
      if (!epkg) throw new Error("Failed to download package");
      await savePackage(pkgId, epkg);
      setDownloadedPkgs((prev) => [...prev, pkgId]);
      showToast("Package downloaded for offline practice!", "success");
    } catch (err: any) {
      showToast("Download failed: " + err.message, "error");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "320px", gap: "0.75rem", color: "var(--color-text-2)", fontSize: "0.875rem" }}>
        <div className="spinner" style={{ width: 22, height: 22, borderColor: "#E2E8F0", borderTopColor: "#92400E" }} />
        <span>Loading practice catalog…</span>
      </div>
    );
  }

  return <PracticeCatalog papers={packages} downloaded={downloadedPkgs} downloading={downloadingId} onDownload={handleDownload} onStart={handleStartPractice} subjectName={getSubjectName} arena={<PracticeArena />} />;
}
