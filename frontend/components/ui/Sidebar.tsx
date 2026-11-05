"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AcqadLogo } from "../brand/AcqadLogo";
import styles from "./Sidebar.module.css";
import React, { type ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
  badge?: ReactNode;
};

type Props = {
  items: NavItem[];
  title: string;
  accentColor?: string;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ items, title, open, onClose }: Props) {
  const pathname = usePathname();
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";

  // Group items by section header
  let lastSection: string | undefined = undefined;

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className={`${styles.backdrop} ${styles.backdropVisible}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${styles.sidebar} ${open ? styles.mobileOpen : ""}`}
        aria-label="Primary navigation"
      >
        {/* ── Brand Header ── */}
        <div className={styles.brand}>
          <div className={styles.brandMeta}><AcqadLogo size="lg" wordmarkWeight={700}/><span className={styles.brandRole}>{title}</span></div>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className={`${styles.mobileClose} md:hidden`}
            aria-label="Close navigation menu"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className={styles.nav} aria-label="Main menu">
          {items.map((item) => {
            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;

            // Precise active matching — avoid false matches on parent paths
            const exactRoutes = [
              "/ADMIN/dashboard",
              "/teacher/dashboard",
              "/student/dashboard",
              "/guardian/dashboard",
            ];
            const isExact = exactRoutes.includes(item.href);
            const normalizedHref = item.href.replace(/\/+$/, "");

            const active = isExact
              ? normalizedPathname === normalizedHref
              : normalizedPathname === normalizedHref ||
                normalizedPathname.startsWith(normalizedHref + "/");

            return (
              <React.Fragment key={item.href}>
                {showSection && (
                  <div className={styles.navSection} role="presentation">
                    <span className={styles.navSectionLabel}>{item.section}</span>
                  </div>
                )}
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`${styles.navItem} ${active ? styles.active : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={styles.navIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && (
                    <span
                      className="ml-auto text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "var(--color-primary-subtle)",
                        color: "var(--color-primary)",
                        minWidth: "18px",
                        textAlign: "center",
                        lineHeight: "1",
                      }}
                      aria-label="notification count"
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
