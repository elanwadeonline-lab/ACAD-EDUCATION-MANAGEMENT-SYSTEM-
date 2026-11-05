"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { StudentReferenceRail } from "../../components/student/StudentReferenceRail";
import { StudentTopBar } from "../../components/ui/StudentTopBar";
import { AcademicProvider } from "../../components/context/AcademicContext";
import styles from "./layout.module.css";
import { StudentIconProvider } from "../../components/icons/StudentIcons";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Keep exam hall completely clean and full-screen
  if (pathname === "/student/exam" || pathname === "/student/exam/") {
    return <StudentIconProvider>{children}</StudentIconProvider>;
  }

  return (
    <StudentIconProvider><AcademicProvider>
      <div className={`${styles.wrapper} ${styles.referenceFrame}`}>
        <StudentReferenceRail />
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </AcademicProvider></StudentIconProvider>
  );
}
