"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import ListItemButton from "@mui/material/ListItemButton";
import { ArrowLeft, Home, Users, FileText, MessageCircle, MoreHorizontal, Bell, Plus, Check, X, ChevronDown, CalendarDays, Wallet, ClipboardCheck, Megaphone, Link2 } from "./GuardianSolidIcons";
import { useGuardian } from "./GuardianContext";
import { StudentAvatar } from "./StudentAvatar";
import { AcqadLogo } from "../brand/AcqadLogo";
import styles from "./GuardianMobileShell.module.css";

const navigation = [
  { href: "/guardian/dashboard", label: "Home", Icon: Home, paths: ["/guardian/dashboard"] },
  { href: "/guardian/wards", label: "My children", Icon: Users, paths: ["/guardian/wards"] },
  { href: "/guardian/results", label: "Results", Icon: FileText, paths: ["/guardian/results", "/guardian/reports", "/guardian/performance", "/guardian/examinations"] },
  { href: "/guardian/messages", label: "Messages", Icon: MessageCircle, paths: ["/guardian/messages"] },
  { href: "/guardian/more", label: "More", Icon: MoreHorizontal, paths: ["/guardian/more", "/guardian/settings", "/guardian/fees", "/guardian/attendance", "/guardian/calendar", "/guardian/announcements", "/guardian/links", "/guardian/notifications"] },
];
const tools = [
  { href: "/guardian/attendance", label: "Attendance", Icon: ClipboardCheck },
  { href: "/guardian/calendar", label: "School calendar", Icon: CalendarDays },
  { href: "/guardian/fees", label: "Fees & receipts", Icon: Wallet },
  { href: "/guardian/announcements", label: "Announcements", Icon: Megaphone },
  { href: "/guardian/links", label: "Manage child links", Icon: Link2 },
];

export function GuardianMobileShell({ children }: { children: React.ReactNode }) {
  const pathname = (usePathname() || "").replace(/\/+$/, "");
  const { activeWard, wards, guardianName, setActiveWardId, childSwitcherOpen, openChildSwitcher, closeChildSwitcher,
    unreadNotificationCount, unreadMessageCount } = useGuardian();
  const isHome = pathname === "/guardian/dashboard";
  const pageTitles: Record<string,string> = { "select-child":"Choose a child",more:"School tools",wards:"My children",results:"Results",reports:"Reports",performance:"Progress",examinations:"Examinations",messages:"Messages",settings:"Your account",fees:"Fees & receipts",attendance:"Attendance",calendar:"School calendar",announcements:"School notices",links:"Manage children",notifications:"Notifications" };
  const pageTitle = pageTitles[pathname.split("/")[2]] || "Your family";
  const selectedId = activeWard ? activeWard.student_id || activeWard.id : null;
  const matches = (paths: string[]) => paths.some(p => pathname === p || pathname.startsWith(p + "/"));

  return <div className={styles.pwaContainer}>
    <a className={styles.skipLink} href="#guardian-content">Skip to content</a>
    <aside className={styles.desktopSidebar} aria-label="Guardian workspace">
      <Link href="/guardian/dashboard" className={styles.brandLink}><AcqadLogo size="lg" wordmarkWeight={700}/></Link>
      <p className={styles.navSection}>Your family</p>
      <nav aria-label="Desktop navigation">{navigation.map(({ href, label, Icon, paths }) => <Link key={href} href={href} className={`${styles.desktopNavItem} ${matches(paths) ? styles.desktopNavActive : ""}`} aria-current={matches(paths) ? "page" : undefined}><Icon size={18} /><span>{label}</span></Link>)}</nav>
      <p className={styles.navSection}>School tools</p>
      <nav aria-label="School tools">{tools.map(({ href, label, Icon }) => <Link key={href} href={href} className={styles.desktopNavItem} aria-current={pathname === href ? "page" : undefined}><Icon size={18} /><span>{label}</span></Link>)}</nav>
      <p className={styles.sidebarFoot}>Stay connected to their school day.</p>
    </aside>
    <div className={styles.mobileViewport}>
      <div style={{
        background: "#FFFBEB",
        borderBottom: "1px solid #FDE68A",
        padding: "7px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 12,
        width: "100%",
        boxSizing: "border-box"
      }}>
        <span style={{ color: "#92400E", fontWeight: 500 }}>
          📱 <strong>Native Mobile App</strong> (Expo)
        </span>
        <a
          href="/mobile"
          style={{
            color: "#D97706",
            fontWeight: 600,
            textDecoration: "none",
            background: "#FEF3C7",
            padding: "3px 8px",
            borderRadius: 6,
            border: "1px solid #FCD34D"
          }}
        >
          Open App →
        </a>
      </div>
      <header className={styles.mobileHeader}>
        {isHome ? (<Link href="/guardian/dashboard" className={styles.greetingLink}><span className={styles.parentAvatar}>{guardianName?.trim().charAt(0) || <Users size={20} />}</span><span className={styles.parentGreeting}><small>Hello,</small><strong>{guardianName || "Your family"}</strong></span></Link>) : <div className={styles.subpageHeading}><Link href="/guardian/dashboard" className={styles.iconButton} aria-label="Back to home"><ArrowLeft size={20}/></Link><strong>{pageTitle}</strong></div>}
        <div className={styles.headerRight}>
          {activeWard && !isHome && <button type="button" className={styles.childSelectorPill} onClick={openChildSwitcher} aria-label={`Switch child, currently ${activeWard.name}`} ><StudentAvatar name={activeWard.name} imageUrl={activeWard.image_url} size="xs" /><span className={styles.childSelectorName}>{activeWard.name.split(" ")[0]}</span><ChevronDown size={14} /></button>}
          <Link href="/guardian/notifications" className={styles.iconButton} aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`}><Bell size={20} />{unreadNotificationCount > 0 && <span className={styles.notifyDot}>{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}</Link>
        </div>
      </header>
      {isHome && <nav className={styles.childStrip} aria-label="Select child">
        <Link href="/guardian/links" className={styles.childShortcut}><span className={styles.addChild}><Plus size={22} /></span><span>Add child</span></Link>
        {wards.map(ward => { const id = ward.student_id || ward.id; return <button type="button" key={id} className={`${styles.childShortcut} ${selectedId === id ? styles.childShortcutActive : ""}`} aria-pressed={selectedId === id} aria-label={`View ${ward.name}`} onClick={() => setActiveWardId(id)}><span className={styles.childAvatar}><StudentAvatar name={ward.name} imageUrl={ward.image_url} size="sm" /></span><span>{ward.name.split(" ")[0]}</span></button>; })}
      </nav>}
      <main id="guardian-content" className={styles.mobileContent}>{children}</main>
      <BottomNavigation component="nav" showLabels className={styles.bottomNav} aria-label="Mobile navigation" value={navigation.findIndex(item => matches(item.paths))} sx={{ height: "auto", display: { xs: "flex", md: "none" }, backgroundColor: "var(--g-surface)" }}>
        {navigation.map(({ href, label, Icon, paths }, index) => <BottomNavigationAction key={href} value={index} component={Link} href={href} label={label} aria-current={matches(paths) ? "page" : undefined} icon={<span className={styles.navIconBox}><Icon size={21} />{href === "/guardian/messages" && unreadMessageCount > 0 && <span className={styles.navBadge} />}</span>} />)}
      </BottomNavigation>
    </div>

  </div>;
}
