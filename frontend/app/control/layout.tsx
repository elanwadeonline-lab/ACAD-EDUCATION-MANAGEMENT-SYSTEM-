"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./control.css";
import { controlApi, PlatformUser } from "../../lib/controlApi";
import {
  ShieldCheck,
  PanelLeftClose,
  ChevronDown,
  LayoutDashboard,
  Building2,
  Cpu,
  FlaskConical,
  Activity,
  Bell,
  LifeBuoy,
  Archive,
  KeyRound,
  Gauge,
  PackageCheck,
  SlidersHorizontal,
  ClipboardList,
  MoreHorizontal,
  Menu,
  Search,
  CircleHelp
} from "lucide-react";

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [overviewMetrics, setOverviewMetrics] = useState<any>(null);

  const isLoginPage = pathname === "/control/login";
  
  // Set default theme to dark if not set
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const loadOverviewStats = () => {
    controlApi.getOverview()
      .then((res) => {
        if (res) setOverviewMetrics(res);
      })
      .catch(() => {});
  };

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

    loadOverviewStats();
    const timer = setInterval(loadOverviewStats, 15000);
    return () => clearInterval(timer);
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
      <div className="app-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <ShieldCheck size={36} color="#4d8dff" />
          <span style={{ fontSize: "0.8125rem", color: "#64748B" }}>Connecting to ACAD Mission Control…</span>
        </div>
      </div>
    );
  }

  const alertCount = overviewMetrics?.activeAlerts?.length ?? overviewMetrics?.metrics?.activeAlertsCount ?? 0;
  const trialCount = overviewMetrics?.metrics?.trialSchools ?? 0;
  const incidentCount = overviewMetrics?.metrics?.openIncidentsCount ?? 0;

  const dynamicNavGroups = [
    {
      label: 'Workspace',
      items: [
        { label: 'Command Center', href: '/control', icon: LayoutDashboard },
        { label: 'Schools', href: '/control/schools', icon: Building2 },
        { label: 'Installations', href: '/control/installations', icon: Cpu },
        { label: 'Trials', href: '/control/trials', icon: FlaskConical, badge: trialCount > 0 ? String(trialCount) : undefined },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Monitoring', href: '/control/monitoring', icon: Activity },
        { label: 'Alerts', href: '/control/alerts', icon: Bell, badge: alertCount > 0 ? String(alertCount) : undefined },
        { label: 'Incidents', href: '/control/incidents', icon: LifeBuoy, badge: incidentCount > 0 ? String(incidentCount) : undefined },
        { label: 'Backups', href: '/control/backups', icon: Archive },
        { label: 'Sync Queue', href: '/control/sync-queue', icon: SlidersHorizontal },
      ],
    },
    {
      label: 'Platform',
      items: [
        { label: 'Licenses', href: '/control/licenses', icon: KeyRound },
        { label: 'Releases', href: '/control/releases', icon: PackageCheck },
        { label: 'Feature flags', href: '/control/feature-flags', icon: SlidersHorizontal },
        { label: 'Audit logs', href: '/control/audit-logs', icon: ClipboardList },
        { label: 'Settings', href: '/control/settings', icon: Gauge },
      ],
    },
  ];

  let activeNavLabel = "Workspace";
  for (const group of dynamicNavGroups) {
    for (const item of group.items) {
      if (item.href === "/control" && pathname === "/control") {
         activeNavLabel = item.label;
      } else if (item.href !== "/control" && pathname.startsWith(item.href)) {
         activeNavLabel = item.label;
      }
    }
  }

  const localExamPool = overviewMetrics?.localExamPool;
  const hostLocalIp = localExamPool?.system?.localIp || "127.0.0.1";
  const hostPort = localExamPool?.system?.serverPort || 8001;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><ShieldCheck size={22} strokeWidth={1.8} /></div>
          <div>
            <div className="brand-name">ACAD</div>
            <div className="brand-subtitle">CONTROL PLANE</div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><PanelLeftClose size={17} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">
            {user?.name?.slice(0, 2).toUpperCase() || "AO"}
          </div>
          <div className="workspace-copy">
            <strong>ACAD Operations</strong>
            <span>Platform workspace</span>
          </div>
          <ChevronDown size={14} className="muted-icon" />
        </div>

        <nav className="side-nav">
          {dynamicNavGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = item.href === "/control" ? pathname === "/control" : pathname.startsWith(item.href);
                return (
                  <Link href={item.href} className={`nav-item ${isActive ? 'active' : ''}`} key={item.label} onClick={() => setSidebarOpen(false)}>
                    <IconComponent size={16} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {item.badge && <span className={`nav-badge ${item.label === 'Alerts' ? 'danger' : ''}`}>{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-line">
            <span className="pulse-dot" /> Live Telemetry Streaming
          </div>
          <button className="profile-button" onClick={handleLogout}>
            <div className="profile-avatar">{user?.name?.charAt(0) || "O"}</div>
            <div className="profile-copy"><strong>{user?.name || "Operator"}</strong><span>{user?.role?.replace(/_/g, " ") || "Platform User"}</span></div>
            <MoreHorizontal size={16} className="muted-icon" />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div>
              <div className="eyebrow">ACAD / {pathname === '/control' ? 'COMMAND CENTER' : activeNavLabel.toUpperCase()}</div>
              <h1>{pathname === '/control' ? 'Command center' : activeNavLabel}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search schools, installations..." />
              <kbd>⌘ K</kbd>
            </div>
            <button className="theme-toggle" onClick={() => {
              const current = document.documentElement.getAttribute('data-theme');
              document.documentElement.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
            }} aria-label="Toggle theme">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
            </button>
            <button className="icon-button" aria-label="Notifications"><Bell size={17} />{alertCount > 0 && <span className="notification-dot">{alertCount > 9 ? "9+" : alertCount}</span>}</button>
            <button className="icon-button" aria-label="Help"><CircleHelp size={17} /></button>
          </div>
        </header>

        <div className="content-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}
