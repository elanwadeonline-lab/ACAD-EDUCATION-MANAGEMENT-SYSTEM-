import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Command,
  Cpu,
  Database,
  ExternalLink,
  FlaskConical,
  Gauge,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';

 type Icon = typeof LayoutDashboard;

type School = {
  name: string;
  location: string;
  initials: string;
  tone: string;
  health: 'Healthy' | 'Warning' | 'Critical' | 'Offline';
  uptime: number;
  students: string;
  sync: string;
  trial: string;
  trialTone: 'green' | 'amber' | 'red';
  version: string;
  lastSeen: string;
  cpu: number;
  storage: number;
};

type NavItem = { label: string; icon: Icon; badge?: string };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', icon: LayoutDashboard },
      { label: 'Schools', icon: Building2 },
      { label: 'Installations', icon: Cpu },
      { label: 'Trials', icon: FlaskConical, badge: '11' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Monitoring', icon: Activity },
      { label: 'Alerts', icon: Bell, badge: '14' },
      { label: 'Incidents', icon: LifeBuoy, badge: '6' },
      { label: 'Backups', icon: Archive },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Licenses', icon: KeyRound },
      { label: 'Analytics', icon: Gauge },
      { label: 'Releases', icon: PackageCheck },
      { label: 'Feature flags', icon: SlidersHorizontal },
      { label: 'Audit logs', icon: ClipboardList },
    ],
  },
];

const schools: School[] = [
  { name: 'Greenfield College', location: 'Lagos, Lagos State', initials: 'GC', tone: 'blue', health: 'Healthy', uptime: 92, students: '642', sync: '35 sec ago', trial: '18 days left', trialTone: 'green', version: 'v1.8.2', lastSeen: 'May 25, 10:24 AM', cpu: 34, storage: 62 },
  { name: 'Kings Academy', location: 'Ibadan, Oyo State', initials: 'KA', tone: 'gold', health: 'Healthy', uptime: 88, students: '310', sync: '1 min ago', trial: '7 days left', trialTone: 'amber', version: 'v1.8.2', lastSeen: 'May 25, 10:03 AM', cpu: 48, storage: 71 },
  { name: 'Sunrise High School', location: 'Abuja, FCT', initials: 'SH', tone: 'navy', health: 'Critical', uptime: 28, students: '480', sync: '4 hrs ago', trial: '23 days left', trialTone: 'green', version: 'v1.8.1', lastSeen: 'May 25, 06:42 AM', cpu: 92, storage: 88 },
  { name: 'Fountain School', location: 'Port Harcourt, Rivers', initials: 'FS', tone: 'slate', health: 'Warning', uptime: 65, students: '215', sync: '9 min ago', trial: '3 days left', trialTone: 'red', version: 'v1.8.2', lastSeen: 'May 25, 10:15 AM', cpu: 67, storage: 89 },
  { name: 'Heritage College', location: 'Kano, Kano State', initials: 'HC', tone: 'green', health: 'Healthy', uptime: 79, students: '1,024', sync: '50 sec ago', trial: '10 days left', trialTone: 'amber', version: 'v1.8.2', lastSeen: 'May 25, 10:24 AM', cpu: 31, storage: 56 },
  { name: 'Bright Future Academy', location: 'Enugu, Enugu State', initials: 'BF', tone: 'orange', health: 'Offline', uptime: 0, students: '388', sync: '2 hrs ago', trial: 'Converted', trialTone: 'green', version: 'v1.7.9', lastSeen: 'May 25, 08:11 AM', cpu: 0, storage: 44 },
];

const activity = [38, 46, 34, 52, 63, 67, 57, 78];

function App() {
  const [activeNav, setActiveNav] = useState('Overview');
  const [query, setQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredSchools = useMemo(() => schools.filter((school) => {
    const search = query.toLowerCase();
    return school.name.toLowerCase().includes(search) || school.location.toLowerCase().includes(search) || school.version.toLowerCase().includes(search);
  }), [query]);

  const showNotice = (message: string): void => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const isOverview = activeNav === 'Overview';

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
          <div className="workspace-avatar">AO</div>
          <div className="workspace-copy"><strong>ACAD Operations</strong><span>Platform workspace</span></div>
          <ChevronDown size={14} className="muted-icon" />
        </div>

        <nav className="side-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button className={`nav-item ${activeNav === item.label ? 'active' : ''}`} key={item.label} onClick={() => { setActiveNav(item.label); setSidebarOpen(false); }}>
                    <IconComponent size={16} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {item.badge && <span className={`nav-badge ${item.label === 'Alerts' ? 'danger' : ''}`}>{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-line"><span className="pulse-dot" /> All systems operational</div>
          <button className="profile-button" onClick={() => showNotice('Profile menu is ready for platform identity settings.')}>
            <div className="profile-avatar">DA</div>
            <div className="profile-copy"><strong>David Adeleke</strong><span>Platform owner</span></div>
            <MoreHorizontal size={16} className="muted-icon" />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div>
              <div className="eyebrow">ACAD / {activeNav.toUpperCase()}</div>
              <h1>{isOverview ? 'Command center' : activeNav}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="global-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search schools, installations..." /><kbd>⌘ K</kbd></div>
            <button className="icon-button" onClick={() => showNotice('No new system notifications.')} aria-label="Notifications"><Bell size={17} /><span className="notification-dot">4</span></button>
            <button className="icon-button" onClick={() => showNotice('Help center opened.')} aria-label="Help"><CircleHelp size={17} /></button>
          </div>
        </header>

        <div className="content-scroll">
          {isOverview ? (
            <>
              <section className="hero-row">
                <div><h2>Good morning, David <span className="wave">/</span></h2><p>Here’s what’s happening across your ACAD ecosystem today.</p></div>
                <div className="hero-actions"><button className="secondary-button" onClick={() => showNotice('Report export queued for download.')}><ExternalLink size={15} /> Export report</button><button className="primary-button" onClick={() => showNotice('School registration started.')}><Plus size={16} /> Register school</button></div>
              </section>

              <section className="metrics-grid">
                <MetricCard icon={Building2} label="Total schools" value="27" trend="2 this week" tone="blue" />
                <MetricCard icon={FlaskConical} label="Active trials" value="11" trend="3 this week" tone="green" />
                <MetricCard icon={CalendarClock} label="Expiring soon" value="14" trend="Next 7 days" tone="amber" />
                <MetricCard icon={WifiOff} label="Offline installations" value="4" trend="Needs attention" tone="red" negative />
                <MetricCard icon={Users} label="Total students" value="8,421" trend="642 this week" tone="blue" />
                <MetricCard icon={GraduationCap} label="Total teachers" value="634" trend="31 this week" tone="purple" />
              </section>

              <section className="dashboard-grid">
                <div className="panel fleet-panel">
                  <PanelHeader title="Fleet health" subtitle="Live status of all school installations" action="View all schools" onAction={() => setActiveNav('Schools')} />
                  <div className="table-wrap"><table><thead><tr><th>School / installation</th><th>Health</th><th>Students</th><th>Last sync</th><th>Trial status</th><th>Version</th><th /></tr></thead><tbody>{filteredSchools.slice(0, 5).map((school) => <SchoolRow key={school.name} school={school} onOpen={() => setSelectedSchool(school)} />)}</tbody></table></div>
                  <div className="legend"><LegendDot color="green" label="Healthy (80–100)" /><LegendDot color="amber" label="Warning (50–79)" /><LegendDot color="red" label="Critical (0–49)" /><LegendDot color="slate" label="Offline" /></div>
                </div>

                <div className="panel activity-panel">
                  <PanelHeader title="System activity" subtitle="Events and sync volume" action="Last 7 days" />
                  <div className="chart-legend"><span><i className="chart-dot blue-dot" /> Events</span><span><i className="chart-dot green-dot" /> Installations</span><span><i className="chart-dot purple-dot" /> Syncs</span></div>
                  <div className="chart"><div className="chart-y"><span>8k</span><span>6k</span><span>4k</span><span>2k</span><span>0</span></div><svg viewBox="0 0 360 195" role="img" aria-label="System activity over the last seven days"><path className="grid-line" d="M8 16H350 M8 58H350 M8 100H350 M8 142H350 M8 184H350" /><ChartLine values={activity.map((value) => value * 0.92)} color="#4d8dff" /><ChartLine values={activity.map((value) => value * 0.62)} color="#2dcc83" /><ChartLine values={activity.map((value) => value * 0.38)} color="#a779ff" /></svg><div className="chart-x"><span>May 19</span><span>May 21</span><span>May 23</span><span>May 25</span></div></div>
                  <div className="activity-footer"><span><Zap size={14} /> Peak activity</span><strong>May 25, 11:24 AM</strong></div>
                </div>

                <div className="side-stack">
                  <div className="panel alerts-panel"><PanelHeader title="Recent alerts" subtitle="Needs your attention" action="View all" onAction={() => setActiveNav('Alerts')} /><AlertItem icon={WifiOff} tone="red" title="School offline" text="Sunrise High School has been offline for 4 hours" time="4m ago" /><AlertItem icon={Cpu} tone="amber" title="High CPU usage" text="Fountain School server CPU is at 92%" time="12m ago" /><AlertItem icon={Database} tone="amber" title="Low disk space" text="Greenfield College disk usage is at 89%" time="25m ago" /><AlertItem icon={ArrowDownRight} tone="blue" title="Version outdated" text="2 schools are running unsupported versions" time="1h ago" /></div>
                  <div className="panel actions-panel"><div className="panel-title-row"><div><h3>Quick actions</h3><p>Common operational tasks</p></div><Sparkles size={16} className="sparkle" /></div><div className="quick-actions"><QuickAction icon={Building2} label="Register school" onClick={() => showNotice('School registration started.')} /><QuickAction icon={FlaskConical} label="Create trial" onClick={() => showNotice('Trial creation started.')} /><QuickAction icon={KeyRound} label="Generate license" onClick={() => showNotice('License generation started.')} /><QuickAction icon={LifeBuoy} label="Open incident" onClick={() => showNotice('Incident intake opened.')} /></div></div>
                </div>
              </section>

              <section className="lower-grid">
                <div className="panel matrix-panel"><PanelHeader title="Platform health matrix" subtitle="Current installation distribution" action="Full health report" /><div className="matrix-content"><div className="donut"><div><strong>27</strong><span>Total<br />installations</span></div></div><div className="matrix-list"><MatrixRow color="green" label="Healthy" value="21" percent="77.8%" /><MatrixRow color="amber" label="Warning" value="3" percent="11.1%" /><MatrixRow color="orange" label="Degraded" value="1" percent="3.7%" /><MatrixRow color="red" label="Critical" value="1" percent="3.7%" /><MatrixRow color="slate" label="Offline" value="2" percent="7.4%" /></div></div><button className="text-link" onClick={() => setActiveNav('Monitoring')}>View full health report <ChevronRight size={14} /></button></div>
                <div className="panel top-schools-panel"><PanelHeader title="Top schools by activity" subtitle="Active users · Last 7 days" action="View all schools" onAction={() => setActiveNav('Schools')} />{['Greenfield College', 'Kings Academy', 'Heritage College', 'Fountain School', 'Bright Future Academy'].map((name, index) => <div className="ranking-row" key={name}><span className="rank">{index + 1}</span><div className="rank-copy"><strong>{name}</strong><span>{schools[index]?.location.split(',')[0]}</span></div><div className="rank-bar"><i style={{ width: `${92 - index * 14}%` }} /></div><strong className="rank-number">{['1,249', '982', '764', '612', '521'][index]}</strong></div>)}</div>
                <div className="panel pipeline-panel"><PanelHeader title="Trial pipeline" subtitle="Current conversion funnel" action="Full pipeline" /><div className="funnel"><FunnelRow label="Leads" value="31" width="100%" /><FunnelRow label="Trial created" value="27" width="88%" /><FunnelRow label="Onboarding" value="14" width="68%" /><FunnelRow label="Active" value="11" width="54%" /><FunnelRow label="Expiring" value="14" width="43%" /><FunnelRow label="Converted" value="5" width="32%" /></div></div>
              </section>
            </>
          ) : (
            <ListView title={activeNav} query={query} schools={filteredSchools} onOpenSchool={setSelectedSchool} onAction={showNotice} />
          )}
        </div>
      </main>

      {selectedSchool && <SchoolDrawer school={selectedSchool} onClose={() => setSelectedSchool(null)} onAction={showNotice} />}
      {notice && <div className="toast"><Check size={16} /> {notice}</div>}
    </div>
  );
}

function MetricCard({ icon: IconComponent, label, value, trend, tone, negative = false }: { icon: Icon; label: string; value: string; trend: string; tone: string; negative?: boolean }) {
  return <div className={`metric-card tone-${tone}`}><div className="metric-top"><div className="metric-icon"><IconComponent size={17} /></div><span>{label}</span></div><div className="metric-value">{value}</div><div className={`metric-trend ${negative ? 'negative' : ''}`}>{negative ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />} {trend}</div><div className="metric-spark"><i /><i /><i /><i /><i /></div></div>;
}

function PanelHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action: string; onAction?: () => void }) {
  return <div className="panel-header"><div><h3>{title}</h3><p>{subtitle}</p></div><button className="panel-action" onClick={onAction}>{action} <ChevronRight size={13} /></button></div>;
}

function SchoolRow({ school, onOpen }: { school: School; onOpen: () => void }) {
  return <tr onClick={onOpen}><td><div className="school-cell"><div className={`school-logo ${school.tone}`}>{school.initials}</div><div><strong>{school.name}</strong><span>{school.location}</span></div></div></td><td><div className="health-cell"><span className={`health-dot ${school.health.toLowerCase()}`} /> <strong className={school.health.toLowerCase()}>{school.health}</strong><div className={`health-ring ${school.health.toLowerCase()}`}><span>{school.uptime}%</span></div></div></td><td><strong>{school.students}</strong><span className="table-change">+ {school.name === 'Heritage College' ? '48' : '32'}</span></td><td><strong>{school.sync}</strong><span className="table-sub">{school.lastSeen}</span></td><td><span className={`trial-pill ${school.trialTone}`}>{school.trial}</span></td><td><span className="version-text">{school.version}</span></td><td><button className="row-more" onClick={(event) => { event.stopPropagation(); onOpen(); }}><MoreHorizontal size={16} /></button></td></tr>;
}

function LegendDot({ color, label }: { color: string; label: string }) { return <span><i className={`legend-dot ${color}`} />{label}</span>; }
function AlertItem({ icon: IconComponent, tone, title, text, time }: { icon: Icon; tone: string; title: string; text: string; time: string }) { return <div className="alert-item"><div className={`alert-icon ${tone}`}><IconComponent size={15} /></div><div className="alert-copy"><strong>{title}</strong><span>{text}</span></div><time>{time}</time></div>; }
function QuickAction({ icon: IconComponent, label, onClick }: { icon: Icon; label: string; onClick: () => void }) { return <button className="quick-action" onClick={onClick}><IconComponent size={15} /><span>{label}</span><ChevronRight size={13} /></button>; }
function MatrixRow({ color, label, value, percent }: { color: string; label: string; value: string; percent: string }) { return <div className="matrix-row"><i className={`legend-dot ${color}`} /><span>{label}</span><strong>{value}</strong><small>({percent})</small></div>; }
function FunnelRow({ label, value, width }: { label: string; value: string; width: string }) { return <div className="funnel-row"><div className="funnel-shape" style={{ width }}><span>{label}</span></div><strong>{value}</strong></div>; }

function ChartLine({ values, color }: { values: number[]; color: string }) {
  const points = values.map((value, index) => `${10 + index * 48},${184 - value * 2.1}`).join(' ');
  return <><polyline points={points} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />{values.map((value, index) => <circle key={`${color}-${index}`} cx={10 + index * 48} cy={184 - value * 2.1} r="3.2" fill="#0b111d" stroke={color} strokeWidth="2" />)}</>;
}

function ListView({ title, query, schools: visibleSchools, onOpenSchool, onAction }: { title: string; query: string; schools: School[]; onOpenSchool: (school: School) => void; onAction: (message: string) => void }) {
  const isSchools = title === 'Schools' || title === 'Installations';
  return <div className="list-view"><section className="hero-row"><div><div className="eyebrow">ACAD / WORKSPACE</div><h2>{title}</h2><p>{isSchools ? 'Manage and monitor every connected school installation.' : 'Operational workspace for the ACAD platform team.'}</p></div><button className="primary-button" onClick={() => onAction(`${title} action started.`)}><Plus size={16} /> {title === 'Trials' ? 'Create trial' : 'Create new'}</button></section><div className="list-toolbar"><div className="filter-search"><Search size={15} /><span>{query || `Search ${title.toLowerCase()}...`}</span></div><button className="secondary-button"><SlidersHorizontal size={15} /> Filters</button><button className="secondary-button"><Clock3 size={15} /> Updated recently</button></div>{isSchools ? <div className="panel full-list"><div className="table-wrap"><table><thead><tr><th>School / installation</th><th>Health</th><th>Students</th><th>Last sync</th><th>Trial status</th><th>Version</th><th /></tr></thead><tbody>{visibleSchools.map((school) => <SchoolRow key={school.name} school={school} onOpen={() => onOpenSchool(school)} />)}</tbody></table></div></div> : <div className="empty-ops panel"><div className="empty-icon"><Activity size={22} /></div><h3>{title} workspace is ready</h3><p>Connect this operational surface to your platform data to manage {title.toLowerCase()} with the same control-plane workflow.</p><button className="primary-button" onClick={() => onAction('Workspace configuration started.')}><Sparkles size={15} /> Configure workspace</button></div>}</div>;
}

function SchoolDrawer({ school, onClose, onAction }: { school: School; onClose: () => void; onAction: (message: string) => void }) {
  return <div className="drawer-backdrop" onClick={onClose}><aside className="school-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div><div className="eyebrow">SCHOOL / {school.initials}</div><h2>{school.name}</h2><p>{school.location}</p></div><button className="icon-button" onClick={onClose} aria-label="Close school details"><X size={18} /></button></div><div className={`drawer-health ${school.health.toLowerCase()}`}><span className={`health-dot ${school.health.toLowerCase()}`} /><div><strong>{school.health} installation</strong><span>Last heartbeat {school.sync}</span></div><span className="drawer-uptime">{school.uptime}% uptime</span></div><div className="drawer-section"><div className="drawer-section-title">Installation overview <span>INST-7F93A2</span></div><div className="detail-grid"><Detail label="Software version" value={school.version} /><Detail label="Students" value={school.students} /><Detail label="CPU usage" value={`${school.cpu}%`} /><Detail label="Storage" value={`${school.storage}%`} /><Detail label="Database" value={school.health === 'Critical' ? 'Attention' : 'Healthy'} /><Detail label="Connected clients" value="83" /></div></div><div className="drawer-section"><div className="drawer-section-title">Enabled modules</div><div className="module-list"><span><Check size={13} /> CBT examinations</span><span><Check size={13} /> Question banks</span><span><Check size={13} /> Report cards</span><span className="disabled"><X size={13} /> Attendance</span></div></div><div className="drawer-section"><div className="drawer-section-title">Latest activity <span>Today</span></div><div className="timeline"><TimelineItem icon={BookOpen} text="Exam session completed" time="9 minutes ago" /><TimelineItem icon={Database} text="Telemetry sync completed" time="35 seconds ago" /><TimelineItem icon={ShieldCheck} text="Health check passed" time="42 seconds ago" /></div></div><div className="drawer-actions"><button className="secondary-button" onClick={() => onAction(`Diagnostics requested for ${school.name}.`)}><Activity size={15} /> Run diagnostics</button><button className="primary-button" onClick={() => onAction(`Configuration refresh requested for ${school.name}.`)}><Zap size={15} /> Refresh config</button></div></aside></div>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="detail"><span>{label}</span><strong>{value}</strong></div>; }
function TimelineItem({ icon: IconComponent, text, time }: { icon: Icon; text: string; time: string }) { return <div className="timeline-item"><div className="timeline-icon"><IconComponent size={13} /></div><div><strong>{text}</strong><span>{time}</span></div></div>; }

export default App;
