export type HealthStatus = 'Healthy' | 'Warning' | 'Critical' | 'Offline' | 'Degraded' | 'Unknown';
export type TrialTone = 'green' | 'amber' | 'red';
export type Icon = typeof import('lucide-react').Activity;

export type School = {
  name: string;
  location: string;
  initials: string;
  tone: string;
  health: HealthStatus;
  uptime: number;
  students: string;
  sync: string;
  trial: string;
  trialTone: TrialTone;
  version: string;
  lastSeen: string;
  cpu: number;
  storage: number;
};

export const schools: School[] = [
  { name: 'Greenfield College', location: 'Lagos, Lagos State', initials: 'GC', tone: 'blue', health: 'Healthy', uptime: 92, students: '642', sync: '35 sec ago', trial: '18 days left', trialTone: 'green', version: 'v1.8.2', lastSeen: 'May 25, 10:24 AM', cpu: 34, storage: 62 },
  { name: 'Kings Academy', location: 'Ibadan, Oyo State', initials: 'KA', tone: 'gold', health: 'Healthy', uptime: 88, students: '310', sync: '1 min ago', trial: '7 days left', trialTone: 'amber', version: 'v1.8.2', lastSeen: 'May 25, 10:03 AM', cpu: 48, storage: 71 },
  { name: 'Sunrise High School', location: 'Abuja, FCT', initials: 'SH', tone: 'navy', health: 'Critical', uptime: 28, students: '480', sync: '4 hrs ago', trial: '23 days left', trialTone: 'green', version: 'v1.8.1', lastSeen: 'May 25, 06:42 AM', cpu: 92, storage: 88 },
  { name: 'Fountain School', location: 'Port Harcourt, Rivers', initials: 'FS', tone: 'slate', health: 'Warning', uptime: 65, students: '215', sync: '9 min ago', trial: '3 days left', trialTone: 'red', version: 'v1.8.2', lastSeen: 'May 25, 10:15 AM', cpu: 67, storage: 89 },
  { name: 'Heritage College', location: 'Kano, Kano State', initials: 'HC', tone: 'green', health: 'Healthy', uptime: 79, students: '1,024', sync: '50 sec ago', trial: '10 days left', trialTone: 'amber', version: 'v1.8.2', lastSeen: 'May 25, 10:24 AM', cpu: 31, storage: 56 },
  { name: 'Bright Future Academy', location: 'Enugu, Enugu State', initials: 'BF', tone: 'orange', health: 'Offline', uptime: 0, students: '388', sync: '2 hrs ago', trial: 'Converted', trialTone: 'green', version: 'v1.7.9', lastSeen: 'May 25, 08:11 AM', cpu: 0, storage: 44 },
];

export const activity = [38, 46, 34, 52, 63, 67, 57, 78];

export type Trial = {
  school: string;
  initials: string;
  tone: string;
  status: 'Lead' | 'Trial Created' | 'Onboarding' | 'Active' | 'Expiring' | 'Converted' | 'Expired';
  startDate: string;
  endDate: string;
  students: number;
  studentLimit: number;
  teachers: number;
  teacherLimit: number;
  modules: string[];
  onboardingStep: number;
  totalSteps: number;
  lastActivity: string;
};

export const trials: Trial[] = [
  { school: 'Greenfield College', initials: 'GC', tone: 'blue', status: 'Active', startDate: 'May 7', endDate: 'Jun 12', students: 642, studentLimit: 800, teachers: 38, teacherLimit: 50, modules: ['CBT', 'Grading', 'Reports'], onboardingStep: 11, totalSteps: 11, lastActivity: '2 min ago' },
  { school: 'Kings Academy', initials: 'KA', tone: 'gold', status: 'Expiring', startDate: 'May 18', endDate: 'Jun 1', students: 310, studentLimit: 500, teachers: 22, teacherLimit: 30, modules: ['CBT', 'Question Bank'], onboardingStep: 11, totalSteps: 11, lastActivity: '5 min ago' },
  { school: 'Sunrise High School', initials: 'SH', tone: 'navy', status: 'Active', startDate: 'May 2', endDate: 'Jun 17', students: 480, studentLimit: 600, teachers: 31, teacherLimit: 40, modules: ['CBT', 'Grading', 'Reports', 'Timetable'], onboardingStep: 11, totalSteps: 11, lastActivity: '4 hrs ago' },
  { school: 'Fountain School', initials: 'FS', tone: 'slate', status: 'Expiring', startDate: 'May 22', endDate: 'May 28', students: 215, studentLimit: 400, teachers: 16, teacherLimit: 25, modules: ['CBT'], onboardingStep: 8, totalSteps: 11, lastActivity: '9 min ago' },
  { school: 'Heritage College', initials: 'HC', tone: 'green', status: 'Onboarding', startDate: 'May 15', endDate: 'Jun 25', students: 1024, studentLimit: 1200, teachers: 64, teacherLimit: 80, modules: ['CBT', 'Grading', 'Reports', 'Timetable', 'Guardian'], onboardingStep: 6, totalSteps: 11, lastActivity: '1 min ago' },
  { school: 'Bright Future Academy', initials: 'BF', tone: 'orange', status: 'Converted', startDate: 'Apr 10', endDate: 'May 10', students: 388, studentLimit: 500, teachers: 28, teacherLimit: 35, modules: ['CBT', 'Grading', 'Reports'], onboardingStep: 11, totalSteps: 11, lastActivity: '2 hrs ago' },
  { school: 'Lighthouse Academy', initials: 'LA', tone: 'blue', status: 'Lead', startDate: '—', endDate: '—', students: 0, studentLimit: 0, teachers: 0, teacherLimit: 0, modules: [], onboardingStep: 1, totalSteps: 11, lastActivity: '3 days ago' },
  { school: 'Cedar Grove School', initials: 'CG', tone: 'green', status: 'Trial Created', startDate: 'May 24', endDate: 'Jun 24', students: 0, studentLimit: 500, teachers: 0, teacherLimit: 30, modules: [], onboardingStep: 3, totalSteps: 11, lastActivity: '1 day ago' },
];

export type Alert = {
  id: string;
  severity: 'Info' | 'Warning' | 'High' | 'Critical';
  title: string;
  description: string;
  school: string;
  installation: string;
  time: string;
  acknowledged: boolean;
};

export const alerts: Alert[] = [
  { id: 'ALT-0042', severity: 'Critical', title: 'Installation offline', description: 'No heartbeat received for over 10 minutes', school: 'Sunrise High School', installation: 'INST-SH29A', time: '4 min ago', acknowledged: false },
  { id: 'ALT-0041', severity: 'High', title: 'Storage above 85%', description: 'Disk usage has exceeded the warning threshold', school: 'Fountain School', installation: 'INST-FS81C', time: '12 min ago', acknowledged: false },
  { id: 'ALT-0040', severity: 'High', title: 'High CPU usage', description: 'Server CPU sustained above 90% for 15 minutes', school: 'Sunrise High School', installation: 'INST-SH29A', time: '18 min ago', acknowledged: false },
  { id: 'ALT-0039', severity: 'Warning', title: 'Backup delayed', description: 'Last successful backup was over 26 hours ago', school: 'Fountain School', installation: 'INST-FS81C', time: '25 min ago', acknowledged: true },
  { id: 'ALT-0038', severity: 'Warning', title: 'Low disk space', description: 'Greenfield College disk usage at 89%', school: 'Greenfield College', installation: 'INST-GC7F93', time: '32 min ago', acknowledged: false },
  { id: 'ALT-0037', severity: 'Warning', title: 'Sync failures', description: '3 consecutive sync failures detected', school: 'Bright Future Academy', installation: 'INST-BF44D', time: '1 hr ago', acknowledged: false },
  { id: 'ALT-0036', severity: 'Info', title: 'Version outdated', description: '2 schools running unsupported versions', school: 'Multiple', installation: '—', time: '1 hr ago', acknowledged: true },
  { id: 'ALT-0035', severity: 'Info', title: 'Agent outdated', description: 'ACAD Node agent needs updating on 1 installation', school: 'Bright Future Academy', installation: 'INST-BF44D', time: '2 hr ago', acknowledged: true },
];

export type Incident = {
  id: string;
  title: string;
  description: string;
  school: string;
  installation: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Acknowledged' | 'Investigating' | 'Mitigated' | 'Resolved' | 'Closed';
  detected: string;
  version: string;
  assigned: string;
};

export const incidents: Incident[] = [
  { id: 'ACAD-1042', title: 'Exam submissions not appearing in grading center', description: 'Students report completed exam submissions are not showing up for teachers in the grading center. Affects objective-type exams only.', school: 'Sunrise High School', installation: 'INST-SH29A', severity: 'High', status: 'Investigating', detected: '14:32, May 25', version: 'v1.8.2', assigned: 'Tunde B.' },
  { id: 'ACAD-1041', title: 'Database connection errors during exam', description: 'Intermittent database connection drops during active exam sessions causing student disconnections.', school: 'Sunrise High School', installation: 'INST-SH29A', severity: 'High', status: 'Acknowledged', detected: '13:15, May 25', version: 'v1.8.1', assigned: 'Tunde B.' },
  { id: 'ACAD-1040', title: 'Backup failures overnight', description: 'Scheduled backup failed for the third consecutive night. Local backup service is not completing.', school: 'Fountain School', installation: 'INST-FS81C', severity: 'Medium', status: 'Investigating', detected: '08:00, May 25', version: 'v1.8.2', assigned: 'Ngozi O.' },
  { id: 'ACAD-1039', title: 'Report card generation timeout', description: 'Report card generation times out for classes with over 60 students.', school: 'Heritage College', installation: 'INST-HC29A', severity: 'Medium', status: 'Mitigated', detected: '10:42, May 24', version: 'v1.8.2', assigned: 'Ngozi O.' },
  { id: 'ACAD-1038', title: 'Sync queue not draining', description: 'Telemetry sync queue is stuck at 47 pending events and not draining.', school: 'Bright Future Academy', installation: 'INST-BF44D', severity: 'Low', status: 'Open', detected: '16:20, May 24', version: 'v1.7.9', assigned: 'Unassigned' },
  { id: 'ACAD-1037', title: 'Tab-switch false positives', description: 'Examination security module flagging legitimate tab switches during fullscreen exams.', school: 'Kings Academy', installation: 'INST-KA18B', severity: 'Low', status: 'Resolved', detected: '09:00, May 23', version: 'v1.8.2', assigned: 'Tunde B.' },
];

export type BackupRecord = {
  school: string;
  initials: string;
  tone: string;
  lastBackup: string;
  status: 'Healthy' | 'Warning' | 'Critical' | 'Unknown';
  size: string;
  destination: string;
  frequency: string;
  failures: number;
};

export const backups: BackupRecord[] = [
  { school: 'Greenfield College', initials: 'GC', tone: 'blue', lastBackup: '2 hrs ago', status: 'Healthy', size: '1.2 GB', destination: 'Local + Cloud', frequency: 'Every 6 hrs', failures: 0 },
  { school: 'Kings Academy', initials: 'KA', tone: 'gold', lastBackup: '5 hrs ago', status: 'Healthy', size: '680 MB', destination: 'Local', frequency: 'Every 12 hrs', failures: 0 },
  { school: 'Sunrise High School', initials: 'SH', tone: 'navy', lastBackup: '26 hrs ago', status: 'Critical', size: '1.8 GB', destination: 'Local', frequency: 'Every 6 hrs', failures: 3 },
  { school: 'Fountain School', initials: 'FS', tone: 'slate', lastBackup: '14 hrs ago', status: 'Warning', size: '420 MB', destination: 'Local', frequency: 'Every 12 hrs', failures: 2 },
  { school: 'Heritage College', initials: 'HC', tone: 'green', lastBackup: '1 hr ago', status: 'Healthy', size: '2.4 GB', destination: 'Local + Cloud', frequency: 'Every 4 hrs', failures: 0 },
  { school: 'Bright Future Academy', initials: 'BF', tone: 'orange', lastBackup: 'Unknown', status: 'Unknown', size: '—', destination: 'Local', frequency: 'Every 12 hrs', failures: 0 },
];

export type License = {
  school: string;
  initials: string;
  tone: string;
  licenseId: string;
  plan: 'Starter' | 'Growth' | 'Enterprise';
  status: 'Trial' | 'Active' | 'Suspended' | 'Expired' | 'Cancelled';
  startDate: string;
  expiration: string;
  studentLimit: number;
  teacherLimit: number;
  modules: string[];
};

export const licenses: License[] = [
  { school: 'Greenfield College', initials: 'GC', tone: 'blue', licenseId: 'LIC-GC7F93', plan: 'Growth', status: 'Trial', startDate: 'May 7, 2025', expiration: 'Jun 12, 2025', studentLimit: 800, teacherLimit: 50, modules: ['CBT', 'Grading', 'Reports'] },
  { school: 'Kings Academy', initials: 'KA', tone: 'gold', licenseId: 'LIC-KA18B', plan: 'Starter', status: 'Trial', startDate: 'May 18, 2025', expiration: 'Jun 1, 2025', studentLimit: 500, teacherLimit: 30, modules: ['CBT', 'Question Bank'] },
  { school: 'Heritage College', initials: 'HC', tone: 'green', licenseId: 'LIC-HC29A', plan: 'Enterprise', status: 'Trial', startDate: 'May 15, 2025', expiration: 'Jun 25, 2025', studentLimit: 1200, teacherLimit: 80, modules: ['CBT', 'Grading', 'Reports', 'Timetable', 'Guardian'] },
  { school: 'Bright Future Academy', initials: 'BF', tone: 'orange', licenseId: 'LIC-BF44D', plan: 'Growth', status: 'Active', startDate: 'May 10, 2025', expiration: 'May 10, 2026', studentLimit: 500, teacherLimit: 35, modules: ['CBT', 'Grading', 'Reports'] },
  { school: 'Sunrise High School', initials: 'SH', tone: 'navy', licenseId: 'LIC-SH29A', plan: 'Growth', status: 'Suspended', startDate: 'May 2, 2025', expiration: 'Jun 17, 2025', studentLimit: 600, teacherLimit: 40, modules: ['CBT', 'Grading', 'Reports', 'Timetable'] },
  { school: 'Fountain School', initials: 'FS', tone: 'slate', licenseId: 'LIC-FS81C', plan: 'Starter', status: 'Trial', startDate: 'May 22, 2025', expiration: 'May 28, 2025', studentLimit: 400, teacherLimit: 25, modules: ['CBT'] },
];

export type Release = {
  version: string;
  date: string;
  channel: 'Stable' | 'Beta' | 'Canary' | 'Deprecated';
  acadVersion: string;
  nodeVersion: string;
  agentVersion: string;
  notes: string[];
  installations: number;
  supported: boolean;
};

export const releases: Release[] = [
  { version: 'v1.8.2', date: 'May 20, 2025', channel: 'Stable', acadVersion: '1.8.2', nodeVersion: '1.3.0', agentVersion: '1.2.1', notes: ['Fixed report card timeout for large classes', 'Improved sync queue draining', 'Added attendance module support'], installations: 21, supported: true },
  { version: 'v1.8.1', date: 'May 10, 2025', channel: 'Stable', acadVersion: '1.8.1', nodeVersion: '1.2.2', agentVersion: '1.2.0', notes: ['Database connection pool improvements', 'Fixed tab-switch false positives', 'Enhanced backup compression'], installations: 3, supported: true },
  { version: 'v1.9.0-beta', date: 'May 24, 2025', channel: 'Beta', acadVersion: '1.9.0', nodeVersion: '1.4.0', agentVersion: '1.3.0', notes: ['New analytics dashboard', 'Guardian portal redesign', 'Real-time exam monitoring'], installations: 2, supported: true },
  { version: 'v1.7.9', date: 'Apr 15, 2025', channel: 'Deprecated', acadVersion: '1.7.9', nodeVersion: '1.1.0', agentVersion: '1.1.0', notes: ['Legacy version', 'No longer receiving security updates', 'Migration to v1.8.x recommended'], installations: 1, supported: false },
  { version: 'v1.9.0-canary', date: 'May 26, 2025', channel: 'Canary', acadVersion: '1.9.0', nodeVersion: '1.4.1', agentVersion: '1.3.1', notes: ['Experimental: AI-assisted grading preview', 'Early access: encrypted cloud backup'], installations: 0, supported: true },
];

export type FeatureFlag = {
  name: string;
  key: string;
  enabled: boolean;
  description: string;
  schools: string[];
};

export const featureFlags: FeatureFlag[] = [
  { name: 'CBT Examinations', key: 'cbt', enabled: true, description: 'Computer-based testing module with timed exams and auto-submission', schools: ['All schools'] },
  { name: 'Question Banks', key: 'question_bank', enabled: true, description: 'Centralized question repository with tagging and categorization', schools: ['All schools'] },
  { name: 'Grading Center', key: 'grading', enabled: true, description: 'Configurable grading and weighting with objective auto-grading', schools: ['All schools'] },
  { name: 'Report Cards', key: 'report_cards', enabled: true, description: 'Report card generation with customizable templates', schools: ['All schools'] },
  { name: 'Timetable', key: 'timetable', enabled: true, description: 'Class and exam scheduling with conflict detection', schools: ['Greenfield', 'Heritage', 'Sunrise'] },
  { name: 'Guardian Portal', key: 'guardian', enabled: true, description: 'Parent/guardian access to student results and progress', schools: ['Heritage'] },
  { name: 'Attendance', key: 'attendance', enabled: false, description: 'Student attendance tracking with reporting', schools: [] },
  { name: 'Analytics', key: 'analytics', enabled: false, description: 'Advanced analytics and insights dashboards', schools: [] },
  { name: 'AI Grading Preview', key: 'ai_grading', enabled: false, description: 'Experimental AI-assisted grading for objective questions', schools: [] },
];

export type AuditEntry = {
  actor: string;
  initials: string;
  action: 'create' | 'update' | 'delete' | 'revoke';
  target: string;
  timestamp: string;
  reason: string;
};

export const auditLog: AuditEntry[] = [
  { actor: 'David Adeleke', initials: 'DA', action: 'create', target: 'School: Cedar Grove School', timestamp: 'May 25, 10:24 AM', reason: 'New school registration' },
  { actor: 'David Adeleke', initials: 'DA', action: 'create', target: 'Trial: TRIAL-CG01', timestamp: 'May 25, 10:25 AM', reason: 'Trial created for Cedar Grove' },
  { actor: 'Tunde Bello', initials: 'TB', action: 'update', target: 'Incident: ACAD-1042', timestamp: 'May 25, 10:18 AM', reason: 'Status changed to Investigating' },
  { actor: 'Ngozi Okafor', initials: 'NO', action: 'update', target: 'Feature flag: attendance', timestamp: 'May 25, 09:45 AM', reason: 'Disabled for Fountain School' },
  { actor: 'David Adeleke', initials: 'DA', action: 'update', target: 'License: LIC-SH29A', timestamp: 'May 25, 09:12 AM', reason: 'License suspended due to non-payment' },
  { actor: 'Tunde Bello', initials: 'TB', action: 'revoke', target: 'Installation: INST-OLD12', timestamp: 'May 24, 04:30 PM', reason: 'Credential compromise — credentials revoked' },
  { actor: 'Ngozi Okafor', initials: 'NO', action: 'update', target: 'Trial: TRIAL-HC29', timestamp: 'May 24, 02:15 PM', reason: 'Trial extended by 10 days' },
  { actor: 'David Adeleke', initials: 'DA', action: 'create', target: 'Platform user: Ngozi Okafor', timestamp: 'May 24, 11:00 AM', reason: 'New support agent onboarded' },
  { actor: 'David Adeleke', initials: 'DA', action: 'update', target: 'Version policy', timestamp: 'May 23, 03:45 PM', reason: 'v1.7.9 marked as deprecated' },
  { actor: 'Tunde Bello', initials: 'TB', action: 'delete', target: 'Alert: ALT-0034', timestamp: 'May 23, 01:20 PM', reason: 'False positive alert dismissed' },
];

export const lifecycleSteps = ['Lead', 'Trial Created', 'Provisioned', 'Deployed', 'Onboarding', 'Active', 'Expiring', 'Converted'];
