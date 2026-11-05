"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { ReportCardPage } from "../../../components/report-card/ReportCardPage";

function ReportCardContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (token) {
    return <ReportCardPage />;
  }

  return (
    <RequireRole role="student">
      <ReportCardPage />
    </RequireRole>
  );
}

export default function StudentReportCardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading report card...</div>}>
      <ReportCardContent />
    </Suspense>
  );
}
