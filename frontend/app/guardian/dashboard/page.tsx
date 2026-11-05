"use client";

import Link from "next/link";
import ButtonBase from "@mui/material/ButtonBase";
import { ArrowUpRight, CalendarDays, ChevronRight, ClipboardCheck, FileText, MessageCircle, Wallet, Megaphone } from "lucide-react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useGuardian } from "../../../components/guardian/GuardianContext";
import { StudentAvatar } from "../../../components/guardian/StudentAvatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import { MetricCard, ProgressBar } from "../../../components/ui/MetricCard";
import { AcademicChart } from "../../../components/ui/AcademicChart";
import styles from "./page.module.css";

export default function GuardianDashboardPage() {
  return <RequireRole role="guardian"><GuardianDashboard /></RequireRole>;
}

function GuardianDashboard() {
  const { activeWard, guardianName, openChildSwitcher, loading } = useGuardian();
  if (loading) return <div className={styles.loading} role="status"><span className={styles.skeleton} /><span className={styles.skeleton} /><p>Loading your family overview…</p></div>;
  if (!activeWard) return <div className={styles.empty}><span className={styles.kicker}>Your family</span><h1>Welcome, {guardianName || "Guardian"}</h1><p>Link your child’s school record to see results, attendance and school updates.</p><Link href="/guardian/links" className={styles.primaryLink}>Link a child <ArrowUpRight size={16} /></Link></div>;
  const chronological = activeWard.trend_data?.length > 0;
  const chartData = chronological ? activeWard.trend_data.map(p => ({ label: p.week, score: Number(p.score) })) : (activeWard.subjects_performance || []).map(p => ({ label: p.subject_name, score: Number(p.score) }));
  const upcoming = activeWard.upcoming_events?.[0];
  const activities = activeWard.recent_activity || [];
  const shortcuts = [
    { href: "/guardian/results", label: "Results & reports", detail: "Published grades and remarks", Icon: FileText },
    { href: "/guardian/attendance", label: "Attendance", detail: "Daily records and patterns", Icon: ClipboardCheck },
    { href: "/guardian/messages", label: "School messages", detail: activeWard.unread_messages ? `${activeWard.unread_messages} unread messages` : "Talk to teachers and school", Icon: MessageCircle },
    { href: "/guardian/fees", label: "Fees & receipts", detail: "Balance and payment history", Icon: Wallet },
    { href: "/guardian/calendar", label: "School calendar", detail: "Events and important dates", Icon: CalendarDays },
    { href: "/guardian/announcements", label: "Announcements", detail: "The latest from school", Icon: Megaphone },
  ];
  return <div className={styles.container}>
    <header className={styles.pageHeading}><div><span className={styles.kicker}>Your family at a glance</span><h1>A little closer to their school day.</h1></div><span className={styles.scope}>School overview</span></header>
    <section className={styles.childProfile} aria-label="Selected child">
      <StudentAvatar name={activeWard.name} imageUrl={activeWard.image_url} size="md" />
      <div className={styles.childIdentity}><h2>{activeWard.name}</h2><p>{activeWard.grade}{activeWard.school_name ? ` · ${activeWard.school_name}` : ""}</p><small>{activeWard.admission_number || activeWard.reg_id || "Registration not available"}</small></div>
      <button type="button" className={styles.switchButton} onClick={openChildSwitcher} aria-haspopup="dialog">Switch child <ChevronRight size={16} /></button>
    </section>
    {activeWard.fees?.balance > 0 && <Link href="/guardian/fees" className={styles.notice}><Wallet size={18} /><span>Fee balance <strong>₦{activeWard.fees.balance.toLocaleString()}</strong></span><span className={styles.noticeAction}>View fees <ChevronRight size={16} /></span></Link>}
    <section className={styles.statGrid} aria-label="Academic summary">
      <MetricCard compact label="Average score" value={activeWard.average_score != null ? `${activeWard.average_score}%` : "—"} detail="Reported academic average" />
      <MetricCard compact label="Class standing" value={activeWard.class_position || "—"} detail={activeWard.total_class_students ? `Among ${activeWard.total_class_students} students` : "Not yet available"} />
      <MetricCard compact label="Attendance" value={activeWard.attendance_pct != null ? `${activeWard.attendance_pct}%` : "—"} progress={activeWard.attendance_pct ?? undefined} detail={activeWard.attendance?.total_days ? `${activeWard.attendance.present_days} of ${activeWard.attendance.total_days} days present` : "No attendance records yet"} />
      <MetricCard compact label="Completed exams" value={activeWard.completed_exams ?? "—"} detail={activeWard.total_exams ? `${activeWard.total_exams} scheduled subjects` : "No exams scheduled"} />
    </section>
    <section className={styles.toolsSection} aria-labelledby="guardian-tools"><div className={styles.sectionHeading}><h2 id="guardian-tools">Quick tools</h2><Link href="/guardian/wards">Child profile <ArrowUpRight size={14} /></Link></div><div className={styles.toolsGrid}>{shortcuts.map(({ href, label, detail, Icon }) => <ButtonBase component={Link} key={href} href={href} className={styles.tool}><span className={styles.toolTop}><Icon size={21} strokeWidth={1.6} /><ChevronRight size={16} /></span><strong>{label}</strong><span>{detail}</span></ButtonBase>)}</div></section>
    <div className={styles.insightsGrid}>
      <Card className={styles.chartCard}><CardHeader><CardTitle>{chronological ? "Academic progress" : "Subject performance"}</CardTitle><CardDescription>{chronological ? "Recorded scores over time" : "Recorded assessment scores by subject"}</CardDescription></CardHeader><CardContent><AcademicChart data={chartData} kind={chronological ? "trend" : "subjects"} label={chronological ? "Academic scores over time" : "Subject score comparison"} /></CardContent></Card>
      <div className={styles.sideColumn}>
        <Card><CardHeader><CardTitle>Coming up</CardTitle><CardDescription>Keep the next school date in view.</CardDescription></CardHeader><CardContent>{upcoming ? <Link href="/guardian/examinations" className={styles.event}><CalendarDays size={22} /><span><strong>{upcoming.title || upcoming.subject_name}</strong><small>{[upcoming.month, upcoming.day, upcoming.time_str].filter(Boolean).join(" · ") || "See timetable for details"}</small>{upcoming.venue && <small>{upcoming.venue}</small>}</span><ChevronRight size={16} /></Link> : <p className={styles.muted}>No upcoming examinations scheduled.</p>}<Link href="/guardian/calendar" className={styles.textLink}>Open school calendar <ArrowUpRight size={14} /></Link></CardContent></Card>
        <Card><CardHeader><CardTitle>Attendance record</CardTitle></CardHeader><CardContent><div className={styles.attendanceValue}>{activeWard.attendance_pct != null ? `${activeWard.attendance_pct}%` : "—"}<span>recorded attendance</span></div>{activeWard.attendance_pct != null && <ProgressBar value={activeWard.attendance_pct} label="Recorded attendance" />}<Link href="/guardian/attendance" className={styles.textLink}>View daily records <ArrowUpRight size={14} /></Link></CardContent></Card>
      </div>
    </div>
    <section aria-labelledby="guardian-activity"><div className={styles.sectionHeading}><h2 id="guardian-activity">Recent updates</h2><Link href="/guardian/notifications">All updates <ArrowUpRight size={14} /></Link></div><div className={styles.activityList}>{activities.length ? activities.map(activity => <Link key={activity.id} href="/guardian/performance" className={styles.activity}><span className={styles.activityMark} /><span><strong>{activity.title}</strong><small>{activity.date_label}</small></span>{activity.score != null && <span className={styles.activityScore}>{activity.score}</span>}<ChevronRight size={16} /></Link>) : <p className={styles.muted}>New academic updates will appear here when the school publishes them.</p>}</div></section>
  </div>;
}
