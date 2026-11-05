/* ACQAD demo capture — operates the REAL running app (Next dev :3000 -> Bun API :8001) with approved demo accounts.
 * Credentials are read from env vars (DEMO_*), never written to output.
 * Host-identifying data (LAN IPs, hostname, hardware fingerprint) is blurred before capture. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const puppeteer = require('../../../frontend/node_modules/puppeteer-core');

const ORIGIN = process.env.DEMO_URL || 'http://127.0.0.1:3100';
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8001';
const OUT = path.resolve(__dirname, '../../screenshots');
const REC = path.resolve(__dirname, '../../recordings');
const LOG = path.resolve(__dirname, '../../reports/capture-log.json');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const HOST = os.hostname();

fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(path.join(OUT, 'fullpage'), { recursive: true }); fs.mkdirSync(REC, { recursive: true });

const ACCOUNTS = {
  operator: { id: process.env.DEMO_OP_EMAIL, pw: process.env.DEMO_OP_PASS, login: '/ADMIN/' },
  teacher: { id: process.env.DEMO_T_EMAIL, pw: process.env.DEMO_T_PASS, login: '/teacher/' },
  student: { id: process.env.DEMO_S_EMAIL, pw: process.env.DEMO_S_PASS, login: '/' },
  guardian: { id: process.env.DEMO_G_EMAIL, pw: process.env.DEMO_G_PASS, login: '/guardian/' },
};
const DESKTOP = { width: 1920, height: 1080, deviceScaleFactor: 1 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const authCache = {};
async function getAuthToken(role) {
  if (authCache[role]) return authCache[role];
  const a = ACCOUNTS[role];
  const loginPath = '/api/auth/login';
  const res = await fetch(`${BACKEND}${loginPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Portal-Role': role },
    body: JSON.stringify({ email: a.id, password: a.pw, identifier: a.id })
  });
  const data = await res.json();
  const d = data.data || data;
  if (!d.token) throw new Error(`Authentication failed for ${role}: ${JSON.stringify(data)}`);
  authCache[role] = { token: d.token, user: d.user, sessionId: d.session_id };
  return authCache[role];
}

const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : { captures: {}, issues: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function settle(page, extra = 1200) {
  await page.waitForNetworkIdle({ idleTime: 700, timeout: 25000 }).catch(() => {});
  // wait for common loading indicators to disappear
  await page.waitForFunction(() => {
    const t = document.body?.innerText || '';
    return !/^\s*Loading/i.test(t) && !document.querySelector('[class*="spinner"],[class*="Spinner"],.animate-spin');
  }, { timeout: 15000 }).catch(() => {});
  await sleep(extra);
}

async function redact(page) {
  await page.evaluate((host) => {
    const ip = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
    const fp = /EP-HW-|HWFP|fingerprint:/i;
    const hostRe = host ? new RegExp(host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = new Set();
    while (walker.nextNode()) {
      const n = walker.currentNode; const t = n.textContent || '';
      if ((ip.test(t) && !/^\s*\d+\.\d+\.\d+\s*$/.test(t)) || fp.test(t) || (hostRe && hostRe.test(t))) hits.add(n.parentElement);
    }
    document.querySelectorAll('input').forEach((i) => { if (ip.test(i.value) || (hostRe && hostRe.test(i.value))) hits.add(i); });
    document.querySelectorAll('code').forEach((c) => { if (/[A-F0-9]{8,}/i.test(c.textContent || '')) hits.add(c); });
    hits.forEach((el) => { if (el && el !== document.body) { el.style.filter = 'blur(7px)'; el.setAttribute('data-redacted', '1'); } });
  }, HOST).catch(() => {});
}

async function shot(page, file, meta, opts = {}) {
  if (ONLY.length && !ONLY.some((o) => file.startsWith(o))) return;
  await settle(page, opts.wait ?? 1200);
  await redact(page);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  const p = path.join(OUT, file);
  await page.screenshot({ path: p, type: 'png' });
  if (opts.full) await page.screenshot({ path: path.join(OUT, 'fullpage', file), type: 'png', fullPage: true }).catch(() => {});
  const text = await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 400)).catch(() => '');
  const vp = page.viewport();
  log.captures[file] = { ...meta, url: page.url().replace(ORIGIN, ''), viewport: `${vp.width}x${vp.height}@${vp.deviceScaleFactor}x`, redactions: await page.$$eval('[data-redacted]', (e) => e.length).catch(() => 0), textSample: text, capturedAt: new Date().toISOString() };
  console.log('  ✓', file, '|', text.slice(0, 90));
}

async function newRolePage(browser, role, viewport = DESKTOP) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setBypassCSP(true);
  await page.setBypassServiceWorker(true);
  await page.setViewport(viewport);

  if (role !== 'public') {
    const auth = await getAuthToken(role);
    const domain = new URL(ORIGIN).hostname;
    await page.setCookie(
      { name: '__exampool_session', value: auth.token, domain, path: '/' },
      { name: `__exampool_session_${role}`, value: auth.token, domain, path: '/' }
    );
    await page.evaluateOnNewDocument((r, tok, u, sId) => {
      sessionStorage.setItem(`exampool_tab_token_${r}`, tok);
      sessionStorage.setItem('exampool_tab_role', r);
      sessionStorage.setItem(`exampool_tab_session_id_${r}`, sId);
      sessionStorage.setItem(`exampool_tab_user_${r}`, JSON.stringify(u));
    }, role, auth.token, auth.user, auth.sessionId);
  }

  page.on('pageerror', (e) => log.issues.push({ role, url: page.url(), type: 'pageerror', msg: String(e.message).slice(0, 200) }));
  page.on('response', (r) => { const u = r.url(); if (u.includes('/api/') && r.status() >= 400) log.issues.push({ role, url: page.url().replace(ORIGIN, ''), type: 'api', status: r.status(), api: u.replace(/^https?:\/\/[^/]+/, '') }); });
  return { ctx, page };
}

async function go(page, route, wait) {
  await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await settle(page, wait ?? 1500);
}

async function login(page, role) {
  const target = role === 'operator' ? '/ADMIN/dashboard/' : `/${role}/dashboard/`;
  await go(page, target, 2500);
}

async function clickText(page, text, selector = 'button, [role=tab], a') {
  return page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').trim().toLowerCase().includes(t.toLowerCase()) && e.offsetParent !== null);
    if (el) { el.scrollIntoView({ block: 'center' }); el.click(); return true; } return false;
  }, text, selector);
}

/* Interaction recorder: CDP screencast frames -> timestamped JPEGs (assembled later with ffmpeg). */
async function startRec(page, name) {
  const dir = path.join(REC, 'frames', name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const client = await page.createCDPSession();
  const frames = [];
  client.on('Page.screencastFrame', async (f) => {
    const file = path.join(dir, String(frames.length).padStart(5, '0') + '.jpg');
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    client.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  return { async stop() { await client.send('Page.stopScreencast').catch(() => {}); await sleep(300);
    // ffconcat list with real inter-frame durations
    const lines = ['ffconcat version 1.0'];
    frames.forEach((fr, i) => { const d = i < frames.length - 1 ? Math.max(0.033, frames[i + 1].t - fr.t) : 1.5; lines.push(`file '${fr.file.replace(/\\/g, '/')}'`, `duration ${d.toFixed(3)}`); });
    if (frames.length) lines.push(`file '${frames[frames.length - 1].file.replace(/\\/g, '/')}'`);
    fs.writeFileSync(path.join(dir, 'list.ffconcat'), lines.join('\n'));
    console.log(`  ● recording ${name}: ${frames.length} frames`); return frames.length; } };
}

/* ───────────────────────── ROLE FLOWS ───────────────────────── */
async function publicPages(browser) {
  console.log('\n[public]');
  const { ctx, page } = await newRolePage(browser, 'public');
  await go(page, '/'); await shot(page, 'S01_brand_student-login_desktop.png', { role: 'Public', module: 'Branding / Authentication', purpose: 'Opening view — ACQAD student sign-in with brand identity' });
  await go(page, '/ADMIN/'); await shot(page, 'S02_brand_admin-login_desktop.png', { role: 'Public', module: 'Administration', purpose: 'Administration portal sign-in' });
  await go(page, '/teacher/'); await shot(page, 'S03_brand_teacher-login_desktop.png', { role: 'Public', module: 'Teacher', purpose: 'Teacher portal sign-in' });
  await go(page, '/guardian/'); await shot(page, 'S04_brand_guardian-login_desktop.png', { role: 'Public', module: 'Guardian', purpose: 'Guardian portal sign-in' });
  await go(page, '/~offline/'); await shot(page, 'S05_offline_fallback_desktop.png', { role: 'Public', module: 'Offline & Synchronisation', purpose: 'PWA offline fallback screen shown when the school server is unreachable' });
  await go(page, '/kiosk/'); await shot(page, 'S06_exam_kiosk-terminal_desktop.png', { role: 'Public', module: 'Assessment & Examination', purpose: 'Lockdown kiosk terminal entry for exam halls' });
  await page.setViewport(MOBILE);
  await go(page, '/guardian/'); await shot(page, 'M01_guardian-login_mobile.png', { role: 'Public', module: 'Guardian', purpose: 'Guardian sign-in on a phone' });
  await go(page, '/'); await shot(page, 'M02_student-login_mobile.png', { role: 'Public', module: 'Student', purpose: 'Student sign-in on a phone' });
  // Control Plane: the deployed service is API-only; capture its real live health response.
  await page.setViewport(DESKTOP);
  try { await page.goto('https://acad-controll.onrender.com/', { waitUntil: 'networkidle2', timeout: 45000 });
    await shot(page, 'S90_controlplane_api-health_desktop.png', { role: 'Technical Administrator', module: 'Control Plane & Monitoring', purpose: 'Live ACAD Supervisory Control Plane API health response (deployed service is API-only)' }, { wait: 500 });
  } catch (e) { log.issues.push({ role: 'public', type: 'controlplane', msg: String(e.message) }); }
  await ctx.close();
}

async function operator(browser) {
  console.log('\n[operator]');
  const { ctx, page } = await newRolePage(browser, 'operator');
  await login(page, 'operator');
  const R = 'Administrator';
  await shot(page, 'A01_admin_dashboard.png', { role: R, module: 'Administration', purpose: 'Institutional overview with active session/term and KPIs' }, { full: true });
  await go(page, '/ADMIN/academic-sessions/'); await shot(page, 'A02_admin_academic-sessions.png', { role: R, module: 'School Management', purpose: 'Academic sessions and terms' }, { full: true });
  for (const [tab, f, p] of [['Class', 'A03_admin_classes.png', 'Classes and grade levels'], ['Grading', 'A04_admin_grading-schemes.png', 'Grading schemes / configuration'], ['Calendar', 'A05_admin_calendar.png', 'Academic calendar events']]) {
    await go(page, '/ADMIN/academic-sessions/');
    if (await clickText(page, tab, '[role=tab], button')) await shot(page, f, { role: R, module: 'School Management', purpose: p });
    else log.issues.push({ role: 'operator', type: 'ui', msg: `tab "${tab}" not found on academic-sessions` });
  }
  await go(page, '/ADMIN/class-teachers/'); await shot(page, 'A06_admin_class-teachers.png', { role: R, module: 'School Management', purpose: 'Class teacher assignment and history' }, { full: true });
  await go(page, '/ADMIN/subjects/'); await shot(page, 'A07_admin_subjects.png', { role: R, module: 'School Management', purpose: 'Subject registry, teacher assignment and enrollment' }, { full: true });
  await go(page, '/ADMIN/users/'); await shot(page, 'A08_admin_users.png', { role: R, module: 'Administration', purpose: 'User management across all roles' }, { full: true });
  if (await clickText(page, 'Guardian', '[role=tab], button')) await shot(page, 'A09_admin_users-guardians.png', { role: R, module: 'Guardian', purpose: 'Guardian accounts and ward links' });
  await go(page, '/ADMIN/timetable/'); await shot(page, 'A10_admin_timetable.png', { role: R, module: 'Assessment & Examination', purpose: 'Examination timetable scheduling' }, { full: true });
  await go(page, '/ADMIN/content/'); await shot(page, 'A11_admin_content-bank.png', { role: R, module: 'Assessment & Examination', purpose: 'Past-question content bank import & search' });
  await go(page, '/ADMIN/annual-results/'); await shot(page, 'A12_admin_annual-results.png', { role: R, module: 'Results & Analytics', purpose: 'Annual results computation & promotion' });
  await go(page, '/ADMIN/report-card/'); await shot(page, 'A13_admin_report-card.png', { role: R, module: 'Results & Analytics', purpose: 'Report card workspace' });
  if (await clickText(page, 'Open Report', 'button')) await shot(page, 'A14_admin_report-card-open.png', { role: R, module: 'Results & Analytics', purpose: 'Opened report card for a student' });
  await go(page, '/ADMIN/messages/'); await shot(page, 'A15_admin_messages.png', { role: R, module: 'Communication & Notifications', purpose: 'Administrative guardian messaging inbox' });
  await go(page, '/ADMIN/notifications/'); await shot(page, 'A16_admin_notifications.png', { role: R, module: 'Communication & Notifications', purpose: 'Notification centre' });
  await go(page, '/ADMIN/kiosk-dashboard/'); await shot(page, 'A17_admin_kiosk-monitor.png', { role: R, module: 'Offline & Synchronisation', purpose: 'Kiosk terminal fleet monitor (LAN)' });
  await go(page, '/ADMIN/settings/'); await shot(page, 'A18_admin_settings.png', { role: R, module: 'Administration', purpose: 'School configuration and branding' });
  if (await clickText(page, 'Network', 'button, [role=tab]')) await shot(page, 'A19_admin_settings-network.png', { role: R, module: 'Offline & Synchronisation', purpose: 'LAN network & zero-config domain access (IPs redacted)' });
  if (await clickText(page, 'Backup', 'button, [role=tab]')) await shot(page, 'A20_admin_settings-backup.png', { role: R, module: 'Offline & Synchronisation', purpose: 'Database backup and restore' });
  await go(page, '/ADMIN/license/'); await shot(page, 'A21_admin_license.png', { role: R, module: 'Control Plane & Monitoring', purpose: 'License & hardware binding (host identity redacted)' }, { full: true });
  // Raw JSON of entitlements synced from the Control Plane (real endpoint, operator-authenticated)
  await go(page, '/api/system/entitlements'); await shot(page, 'A22_admin_entitlements-json.png', { role: 'Technical Administrator', module: 'Control Plane & Monitoring', purpose: 'Live entitlements/feature flags synchronised from the Control Plane (raw API view)' }, { wait: 400 });
  await ctx.close();
}

async function teacher(browser) {
  console.log('\n[teacher]');
  const { ctx, page } = await newRolePage(browser, 'teacher');
  await login(page, 'teacher');
  const R = 'Teacher';
  await shot(page, 'T01_teacher_dashboard.png', { role: R, module: 'Teacher', purpose: 'Teaching overview with assigned subjects' }, { full: true });
  const menu = await page.$('button[aria-label^="See more for"]');
  if (menu) { await menu.click(); await sleep(500); await shot(page, 'T02_teacher_subject-menu.png', { role: R, module: 'Teacher', purpose: 'Per-subject actions: inspect questions, gradebook, results' }, { wait: 300 }); await page.keyboard.press('Escape'); }
  await go(page, '/teacher/questions/'); await shot(page, 'T03_teacher_question-bank.png', { role: R, module: 'Assessment & Examination', purpose: 'Question bank & assessment authoring' }, { full: true });
  await go(page, '/teacher/assignments/'); await shot(page, 'T04_teacher_assignments.png', { role: R, module: 'Assessment & Examination', purpose: 'Assignments (online & offline packs)' }, { full: true });
  await go(page, '/teacher/content/'); await shot(page, 'T05_teacher_content-bank.png', { role: R, module: 'Assessment & Examination', purpose: 'Past-question bank browser' });
  await go(page, '/teacher/grading/'); await shot(page, 'T06_teacher_grading-centre.png', { role: R, module: 'Results & Analytics', purpose: 'Subject grading centre' }, { full: true });
  await go(page, '/teacher/grading/details/?id=49'); await shot(page, 'T07_teacher_gradebook.png', { role: R, module: 'Results & Analytics', purpose: 'Gradebook: CA + exam weighting with CBT scores' }, { full: true });
  if (await clickText(page, 'Score Breakdown', '[role=tab], button')) await shot(page, 'T08_teacher_gradebook-breakdown.png', { role: R, module: 'Results & Analytics', purpose: 'Assessment weight breakdown' });
  await go(page, '/teacher/results/'); await shot(page, 'T09_teacher_results.png', { role: R, module: 'Results & Analytics', purpose: 'Examination results and publication status' }, { full: true });
  await go(page, '/teacher/class-grading/'); await shot(page, 'T10_teacher_class-broadsheet.png', { role: R, module: 'Results & Analytics', purpose: 'Class teacher broadsheet & remarks (JSS 3)' });
  await go(page, '/teacher/attendance/'); await shot(page, 'T11_teacher_attendance.png', { role: R, module: 'Teacher', purpose: 'Attendance register' });
  await go(page, '/teacher/students/'); await shot(page, 'T12_teacher_students.png', { role: R, module: 'Teacher', purpose: 'Student roster' });
  await go(page, '/teacher/messages/'); await shot(page, 'T13_teacher_messages.png', { role: R, module: 'Communication & Notifications', purpose: 'Teacher–guardian messaging' });
  await go(page, '/teacher/report-card/'); await shot(page, 'T14_teacher_report-card.png', { role: R, module: 'Results & Analytics', purpose: 'Class report cards' });
  await go(page, '/teacher/notifications/'); await shot(page, 'T15_teacher_notifications.png', { role: R, module: 'Communication & Notifications', purpose: 'Teacher notification centre' });
  await ctx.close();
}

async function student(browser) {
  console.log('\n[student]');
  const { ctx, page } = await newRolePage(browser, 'student');
  await login(page, 'student');
  const R = 'Student';
  await go(page, '/student/dashboard/');
  await shot(page, 'ST01_student_dashboard.png', { role: R, module: 'Student', purpose: 'Learning insights dashboard' }, { full: true });
  await go(page, '/student/examinations/'); await shot(page, 'ST02_student_examinations.png', { role: R, module: 'Assessment & Examination', purpose: 'Available assessments & timetable' }, { full: true });
  const opened = await page.evaluate(() => { const b = [...document.querySelectorAll('button[aria-haspopup=dialog], main button')].find((x) => x.offsetParent && /physics|homework|check|exam|online/i.test(x.textContent || '')); if (b) { b.click(); return b.textContent.trim().slice(0, 60); } return null; });
  if (opened) { await sleep(700); await shot(page, 'ST03_student_assessment-readiness.png', { role: R, module: 'Assessment & Examination', purpose: `Assessment readiness dialog (${opened})` }, { wait: 400 }); await page.keyboard.press('Escape'); }
  await go(page, '/student/results/'); await shot(page, 'ST04_student_results.png', { role: R, module: 'Results & Analytics', purpose: 'Released results' }, { full: true });
  await go(page, '/student/report-card/'); await shot(page, 'ST05_student_report-card.png', { role: R, module: 'Results & Analytics', purpose: 'Student report card' });
  await go(page, '/student/practice/'); await shot(page, 'ST06_student_practice.png', { role: R, module: 'Student', purpose: 'Past-question practice catalogue' });
  await go(page, '/student/offline-assignments/'); await shot(page, 'ST07_student_offline-assignments.png', { role: R, module: 'Offline & Synchronisation', purpose: 'Offline assignment packs and sync' });
  await go(page, '/student/notifications/'); await shot(page, 'ST08_student_notifications.png', { role: R, module: 'Communication & Notifications', purpose: 'Student notifications' });

  // ── Live CBT attempt on a published, retake-enabled assignment (subject 20) ──
  const SUBJ = process.env.DEMO_SUBJECT || '20';
  const stAuth = await getAuthToken('student');
  try {
    await fetch(`${BACKEND}/api/exams/2/retake`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stAuth.token}`, 'X-Portal-Role': 'student' }
    });
  } catch (e) {}
  await go(page, `/student/exam/?subjectId=${SUBJ}`, 2500);
  await shot(page, 'ST10_exam_instructions.png', { role: R, module: 'Assessment & Examination', purpose: 'Examination instructions / preflight' });
  const rec = await startRec(page, 'R02_student_cbt-attempt');
  try {
    const started = (await clickText(page, 'Begin Assessment', 'button')) || (await clickText(page, 'Resume Assessment', 'button'));
    if (!started) throw new Error('Begin/Resume Assessment button not found');
    await page.waitForFunction(() => document.querySelector('[class*="optionButton"], textarea'), { timeout: 30000 });
    await sleep(1500);
    await shot(page, 'ST11_exam_active-question.png', { role: R, module: 'Assessment & Examination', purpose: 'Active CBT question with timer and navigator' }, { wait: 600 });
    const opt = await page.$('[class*="optionButton"]'); if (opt) { await opt.click(); await sleep(900); }
    await shot(page, 'ST12_exam_answer-selected.png', { role: R, module: 'Assessment & Examination', purpose: 'Answer selected & auto-saved' }, { wait: 500 });
    if (await clickText(page, 'Next', 'button')) { await sleep(1200);
      const ta = await page.$('textarea'); if (ta) { await ta.type('Velocity is the rate of change of displacement with time.', { delay: 25 }); await sleep(600); }
      const opt2 = await page.$('[class*="optionButton"]'); if (!ta && opt2) { await opt2.click(); await sleep(600); }
      await shot(page, 'ST13_exam_question-navigation.png', { role: R, module: 'Assessment & Examination', purpose: 'Question navigation (second question)' }, { wait: 500 });
    }
    if (await clickText(page, 'Submit', 'button')) {
      await page.waitForFunction(() => /Final Attempt Summary|Confirm/i.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
      await sleep(800); await shot(page, 'ST14_exam_submit-summary.png', { role: R, module: 'Assessment & Examination', purpose: 'Final attempt summary before submission' }, { wait: 400 });
      await clickText(page, 'Confirm', 'button');
      await sleep(4000);
      await shot(page, 'ST15_exam_submission-receipt.png', { role: R, module: 'Assessment & Examination', purpose: 'Submission confirmation & receipt' }, { wait: 800 });
      if (await clickText(page, 'Review Question Breakdown', 'button')) { await sleep(900); await shot(page, 'ST16_exam_evaluation-review.png', { role: R, module: 'Results & Analytics', purpose: 'Evaluation review breakdown' }, { wait: 400 }); }
    }
  } catch (e) { log.issues.push({ role: 'student', type: 'exam-flow', msg: String(e.message) }); await shot(page, 'ST19_exam_flow-state.png', { role: R, module: 'Assessment & Examination', purpose: 'Exam flow state when automation stopped' }); }
  await rec.stop();
  // mobile student
  await page.setViewport(MOBILE);
  await go(page, '/student/dashboard/'); await shot(page, 'M10_student_dashboard_mobile.png', { role: R, module: 'Student', purpose: 'Student dashboard on a phone' });
  await go(page, '/student/results/'); await shot(page, 'M11_student_results_mobile.png', { role: R, module: 'Results & Analytics', purpose: 'Student results on a phone' });
  await ctx.close();
}

async function guardian(browser) {
  console.log('\n[guardian]');
  const { ctx, page } = await newRolePage(browser, 'guardian', MOBILE);
  await login(page, 'guardian');
  const R = 'Guardian';
  await go(page, '/guardian/dashboard/'); await shot(page, 'M20_guardian_dashboard_mobile.png', { role: R, module: 'Guardian', purpose: 'Family overview on a phone' });
  const sw = await page.$('button[aria-haspopup=dialog]');
  if (sw) { await sw.click(); await sleep(700); await shot(page, 'M21_guardian_switch-child_mobile.png', { role: R, module: 'Guardian', purpose: 'Switch between linked children' }, { wait: 300 }); await page.keyboard.press('Escape'); }
  const pages = [['wards', 'Linked children'], ['performance', 'Academic performance'], ['results', 'Released results'], ['reports', 'Report cards'], ['examinations', 'Upcoming examinations'], ['attendance', 'Attendance'], ['fees', 'Fees'], ['messages', 'Messages with the school'], ['announcements', 'School announcements'], ['notifications', 'Notifications'], ['calendar', 'School calendar'], ['links', 'Link another child'], ['settings', 'Profile & preferences']];
  let i = 22;
  for (const [p, purpose] of pages) {
    await go(page, `/guardian/${p}/`);
    const mod = ['messages', 'announcements', 'notifications'].includes(p) ? 'Communication & Notifications' : ['performance', 'results', 'reports'].includes(p) ? 'Results & Analytics' : 'Guardian';
    await shot(page, `M${i++}_guardian_${p}_mobile.png`, { role: R, module: mod, purpose: `${purpose} (mobile)` });
  }
  await page.setViewport(DESKTOP);
  await go(page, '/guardian/dashboard/'); await shot(page, 'G01_guardian_dashboard_desktop.png', { role: R, module: 'Guardian', purpose: 'Guardian dashboard on desktop' }, { full: true });
  await go(page, '/guardian/performance/'); await shot(page, 'G02_guardian_performance_desktop.png', { role: R, module: 'Results & Analytics', purpose: 'Guardian performance analytics on desktop' });
  await go(page, '/guardian/messages/'); await shot(page, 'G03_guardian_messages_desktop.png', { role: R, module: 'Communication & Notifications', purpose: 'Guardian messaging on desktop' });
  // short navigation recording on mobile
  await page.setViewport(MOBILE);
  const rec = await startRec(page, 'R03_guardian_mobile-tour');
  for (const p of ['dashboard', 'results', 'performance', 'messages']) { await go(page, `/guardian/${p}/`, 1800); await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' })); await sleep(1500); }
  await rec.stop();
  await ctx.close();
}

async function adminTour(browser) {
  console.log('\n[admin tour recording]');
  const { ctx, page } = await newRolePage(browser, 'operator');
  await login(page, 'operator');
  const rec = await startRec(page, 'R01_admin_navigation-tour');
  for (const p of ['dashboard', 'academic-sessions', 'subjects', 'users', 'timetable']) { await go(page, `/ADMIN/${p}/`, 1800); await redact(page); await sleep(1200); }
  await rec.stop();
  await ctx.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, pipe: true, args: ['--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', '--lang=en-GB'] });
  const flows = { publicPages, operator, teacher, student, guardian, adminTour };
  const want = (process.env.FLOWS || 'publicPages,operator,teacher,student,guardian,adminTour').split(',');
  try {
    for (const f of want) { try { await flows[f](browser); } catch (e) { console.error(`flow ${f} failed:`, e.message); log.issues.push({ flow: f, type: 'flow-failure', msg: String(e.message) }); } fs.writeFileSync(LOG, JSON.stringify(log, null, 2)); }
  } finally { await browser.close(); fs.writeFileSync(LOG, JSON.stringify(log, null, 2)); }
  console.log(`\nDone. ${Object.keys(log.captures).length} captures, ${log.issues.length} issues logged.`);
})();

