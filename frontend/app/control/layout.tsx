"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./control.module.css";
import { controlApi, PlatformUser } from "../../lib/controlApi";
import {
  ZapIcon,
  SchoolIcon,
  ServerIcon,
  ClockIcon,
  KeyIcon,
  FlagIcon,
  ActivityIcon,
  AlertTriangleIcon,
  ShieldIcon,
  DatabaseIcon,
  GitBranchIcon,
  SettingsIcon,
  LogOutIcon,
} from "../../components/control/ControlIcons";

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === "/control/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    controlApi
      .getMe()
      .then((res) => {
        if (res?.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        router.push("/control/login");
      })
      .finally(() => setLoading(false));
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await controlApi.logout();
    } catch {}
    localStorage.removeItem("acad_platform_token");
    router.push("/control/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className={styles.shell} style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div className={styles.brandLogo} style={{ width: "36px", height: "36px" }}>
            <ZapIcon size={20} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: "0.8125rem", color: "#64748B" }}>Connecting to ACAD Mission Control…</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Command Center", href: "/control", section: "Operations", icon: <ZapIcon size={15} /> },
    { label: "Schools Fleet", href: "/control/schools", section: "Operations", icon: <SchoolIcon size={15} /> },
    { label: "Installations", href: "/control/installations", section: "Operations", icon: <ServerIcon size={15} /> },
    { label: "Trials", href: "/control/trials", section: "Commercial", icon: <ClockIcon size={15} /> },
    { label: "Licenses", href: "/control/licenses", section: "Commercial", icon: <KeyIcon size={15} /> },
    { label: "Feature Flags", href: "/control/feature-flags", section: "Commercial", icon: <FlagIcon size={15} /> },
    { label: "Fleet Monitor", href: "/control/monitoring", section: "Observability", icon: <ActivityIcon size={15} /> },
    { label: "Alerts & Alarms", href: "/control/alerts", section: "Observability", icon: <AlertTriangleIcon size={15} /> },
    { label: "Support Tickets", href: "/control/incidents", section: "Observability", icon: <ShieldIcon size={15} /> },
    { label: "Backups", href: "/control/backups", section: "Infrastructure", icon: <DatabaseIcon size={15} /> },
    { label: "Sync Queue", href: "/control/sync-queue", section: "Infrastructure", icon: <ActivityIcon size={15} /> },
    { label: "Release Channels", href: "/control/releases", section: "Infrastructure", icon: <GitBranchIcon size={15} /> },
    { label: "Audit Logs", href: "/control/audit-logs", section: "Infrastructure", icon: <ClockIcon size={15} /> },
    { label: "Platform Staff", href: "/control/settings", section: "System", icon: <SettingsIcon size={15} /> },
  ];

  let currentSection = "";

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandLogo}>
            <ZapIcon size={16} color="#FFFFFF" />
          </div>
          <div className={styles.brandTitle}>ACAD CONTROL</div>
          <span className={styles.brandBadge}>Cloud</span>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const showSection = item.section !== currentSection;
            if (showSection) currentSection = item.section;

            const isActive =
              item.href === "/control"
                ? pathname === "/control"
                : pathname.startsWith(item.href);

            return (
              <React.Fragment key={item.href}>
                {showSection && <div className={styles.navSectionLabel}>{item.section}</div>}
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                >
                  <span style={{ color: isActive ? "#60A5FA" : "#64748B", display: "flex", alignItems: "center" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <div className={styles.userAvatar}>{user?.name?.charAt(0) || "P"}</div>
            <div>
              <div className={styles.userName}>{user?.name || "Platform Operator"}</div>
              <div className={styles.userRole}>{user?.role?.replace(/_/g, " ") || "operator"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={styles.btn}
            style={{ background: "transparent", color: "#64748B", padding: "0.3rem" }}
            title="Sign out of Control Plane"
          >
            <LogOutIcon size={15} />
          </button>
        </div>
      </aside>

      {/* ── Main Workspace ── */}
      <main className={styles.main}>
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <span style={{ fontSize: "0.6875rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Supervisory Control Plane
            </span>
            <span style={{ color: "#334155" }}>/</span>
            <span className={styles.topBarTitle}>
              {pathname === "/control"
                ? "Command Center"
                : pathname.split("/")[2]?.replace(/-/g, " ").toUpperCase() || "Workspace"}
            </span>
          </div>
          <div className={styles.topBarActions}>
            <span className={styles.statusBadge} style={{ background: "rgba(16, 185, 129, 0.08)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <span className={`${styles.statusDot} ${styles.dotHealthy}`} />
              Telemetry Ingestion Active
            </span>
            <Link href="/control/schools/new" className={`${styles.btn} ${styles.btnPrimary}`}>
              + Provision School
            </Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
