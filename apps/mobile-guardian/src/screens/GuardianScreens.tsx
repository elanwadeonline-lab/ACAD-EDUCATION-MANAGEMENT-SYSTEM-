import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Box as View } from '../components/ui/box';
import { Pressable } from '../components/ui/pressable';
import { Progress, ProgressFilledTrack } from '../components/ui/progress';
import {
  Card,
  SchoolInput as TextInput,
  useNotice,
  BaseEmptyState,
  BaseAlert,
  BaseSeparator,
  BaseSlidingNumber,
  BaseSelect,
  BaseDialog,
  BaseToggleGroup,
} from '../components/common/NativeUI';
import { useRouter, type Href } from 'expo-router';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react-native';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useActiveWard } from '../context/ActiveWardContext';
import { feeLedger, money, finite, type Payment } from '../api/records';
import { Page, Button, Feedback, Section, Avatar, Row, Pill, useRemote, ui } from '../components/common/NativeUI';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { CircularProgressGauge } from '../components/common/CircularProgressGauge';
import { QuickActions } from '../components/common/QuickActions';
import {
  SolidGraduationCap,
  SolidWallet,
  SolidMessage,
  SolidCalendar,
  SolidAttendance,
  SolidLinkChild,
  SolidBell,
  SolidShield,
} from '../components/common/SolidIcons';

const destinations: Record<string, string> = {
  home: '/(main)/home',
  academics: '/(main)/academics',
  payments: '/(main)/payments',
  more: '/(main)/more',
  attendance: '/attendance',
  calendar: '/calendar',
  messages: '/messages',
  updates: '/updates',
  link: '/link',
  settings: '/settings',
  profile: '/profile',
};

const dateText = (value?: string) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date not recorded';

const pct = (value: unknown) => (finite(value) === null ? '—' : `${finite(value)}%`);

export function GuardianScreen({ screen }: { screen: string }) {
  const router = useRouter();
  const { user } = useGuardianAuth();
  const ward = useActiveWard();

  const go = (next: string) => {
    const target = destinations[next] || (next.startsWith('/') ? next : `/${next}`);
    router.push(target as Href);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(main)/home' as Href));

  if (!user) {
    return (
      <Page title="Your family">
        <BaseEmptyState
          icon={<SolidShield size={36} color="#3B82F6" secondaryColor="#1D4ED8" />}
          title="Sign in required"
          description="Sign in to your guardian account to view school records."
          actions={<Button label="Sign in" onPress={() => router.replace('/' as Href)} />}
        />
      </Page>
    );
  }

  if (screen === 'home') return <Home go={go} />;
  if (screen === 'profile' || screen === 'more') return <MoreHub go={go} back={back} />;
  if (screen === 'academics') return <Academics go={go} back={back} />;
  if (screen === 'payments') return <Payments go={go} back={back} />;

  // Dynamic redirects for screens that have dedicated pages
  if (['attendance', 'calendar', 'messages', 'updates', 'link', 'settings'].includes(screen)) {
    go(screen);
    return null;
  }

  return (
    <Page title="School Information" onBack={back}>
      <BaseEmptyState title="Choose a section" description="Select a section from your family overview." />
    </Page>
  );
}

function Home({ go }: { go: (name: string) => void }) {
  const { user, token } = useGuardianAuth();
  const { activeWard: w, openSwitcher, isLoadingWards, error, refreshWards, updatedAt } = useActiveWard();
  const updates = useRemote<{ items: any[]; unreadCount: number }>('/api/guardian/notifications', token || '');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
  const avgVal = finite(w?.average_score);
  const attVal = w?.attendance?.total_days ? finite(w?.attendance_pct) : null;

  return (
    <Page refreshing={isLoadingWards} onRefresh={() => { void refreshWards(); updates.reload(); }}>
      {/* Home Header */}
      <View style={s.homeHeader}>
        <View>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.name}>{user?.name}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="School notifications"
          onPress={() => go('updates')}
          style={s.notifBtn}
        >
          <SolidBell size={22} color="#F59E0B" secondaryColor="#D97706" />
          {!!updates.data?.unreadCount && <View style={s.notificationDot} />}
        </Pressable>
      </View>

      <Feedback loading={isLoadingWards} error={error} onRetry={() => void refreshWards()} />

      {w ? (
        <>
          {/* Active Child Switcher Card */}
          <Pressable
            style={s.childCard}
            onPress={openSwitcher}
            accessibilityRole="button"
            accessibilityLabel={`Switch child, currently ${w.name}`}
          >
            <Avatar name={w.name} uri={w.image_url} size={50} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.childName}>{w.name}</Text>
              <Text style={ui.small}>{w.grade || 'Class not recorded'}{w.school_name ? ` · ${w.school_name}` : ''}</Text>
              <Text style={s.micro}>{w.reg_id || 'School record linked'}</Text>
            </View>
            <View style={s.switchPill}>
              <Text style={s.switchText}>Switch</Text>
              <ChevronDown color={C.primary} size={15} />
            </View>
          </Pressable>

          {/* Snapshot Metrics */}
          <View style={s.snapshot}>
            <Pressable
              onPress={() => go('academics')}
              style={[s.metricCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              accessibilityRole="button"
            >
              <View style={s.metricTop}>
                <SolidGraduationCap size={22} color="#10B981" secondaryColor="#059669" />
                <Text style={[s.metricChip, { color: '#059669' }]}>Academics</Text>
              </View>
              {avgVal !== null ? (
                <BaseSlidingNumber
                  value={avgVal / 100}
                  format={{ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                  fontSize={28}
                  color="#0F172A"
                />
              ) : (
                <Text style={ui.metric}>—</Text>
              )}
              <Text style={s.metricLabel}>Term average</Text>
              <Text style={ui.small}>{w.completed_exams || 0} completed assessments</Text>
            </Pressable>

            <Pressable
              onPress={() => go('attendance')}
              style={[s.metricCard, { backgroundColor: '#ECFEFF', borderColor: '#A5F3FC' }]}
              accessibilityRole="button"
            >
              <View style={s.metricTop}>
                <SolidAttendance size={22} color="#06B6D4" secondaryColor="#0891B2" />
                <Text style={[s.metricChip, { color: '#0891B2' }]}>Attendance</Text>
              </View>
              {attVal !== null ? (
                <BaseSlidingNumber
                  value={attVal / 100}
                  format={{ style: 'percent', maximumFractionDigits: 0 }}
                  fontSize={28}
                  color="#0F172A"
                />
              ) : (
                <Text style={ui.metric}>—</Text>
              )}
              <Text style={s.metricLabel}>Attendance rate</Text>
              <Text style={ui.small}>
                {w.attendance?.total_days ? `${w.attendance.present_days}/${w.attendance.total_days} recorded days` : 'No attendance recorded'}
              </Text>
            </Pressable>
          </View>

          {/* Quick Actions Component */}
          <Section title="Quick actions" />
          <QuickActions onNavigate={go} />

          {/* Summary Links */}
          <Card style={s.summaryCard}>
            <Row
              title="Fees & payment records"
              detail="Outstanding charges, allocations and recorded receipts"
              icon={<SolidWallet size={20} color="#F59E0B" secondaryColor="#D97706" />}
              onPress={() => go('payments')}
            />
            <Row
              title="Latest report card"
              detail="Published examination scores and teacher remarks"
              icon={<SolidGraduationCap size={20} color="#10B981" secondaryColor="#059669" />}
              onPress={() => go('academics')}
            />
          </Card>

          {/* Updates Feed Preview */}
          <Section title="Updates for you" action="View all" onPress={() => go('updates')} />
          <Feedback loading={updates.loading} error={updates.error} onRetry={updates.reload} />
          {updates.data?.items?.slice(0, 3).map((n) => (
            <Row
              key={n.id}
              title={n.type?.replace(/_/g, ' ').toUpperCase() || 'SCHOOL UPDATE'}
              detail={n.message}
              icon={<SolidBell size={18} color="#F59E0B" secondaryColor="#D97706" />}
              onPress={() => go('updates')}
              right={!n.is_read ? <View style={s.unread} /> : undefined}
            />
          ))}
          {!updates.loading && !updates.error && !updates.data?.items?.length && (
            <BaseEmptyState
              icon={<SolidBell size={28} color="#F59E0B" secondaryColor="#D97706" />}
              title="All caught up"
              description="School updates will appear here when they are published."
            />
          )}

          {updatedAt && (
            <Text style={s.freshness}>
              Updated {new Date(updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · Pull down to refresh
            </Text>
          )}
        </>
      ) : !isLoadingWards && !error ? (
        <BaseEmptyState
          icon={<SolidLinkChild size={36} color="#F43F5E" secondaryColor="#E11D48" />}
          title="Bring your family into view"
          description="Request a link using your child’s registration number. The school approves access before records appear."
          actions={<Button label="Link a child" onPress={() => go('link')} />}
        />
      ) : null}
    </Page>
  );
}

function Academics({ back, go }: { back: () => void; go: (screen: string) => void }) {
  const router = useRouter();
  const { activeWard: w } = useActiveWard();
  const { token } = useGuardianAuth();

  const [tab, setTab] = useState(0);
  const [chosenPeriod, setChosenPeriod] = useState('');

  const reportSource = useRemote<{ results: any[]; remarks: any[] }>(
    `/api/guardian/wards/${w!.id}/report-card`,
    `${token}:${w!.id}`
  );
  const academic = useRemote<any>('/api/academic/active', token || '');

  const currentKey = academic.data?.activeTerm?.id ? `${academic.data?.activeSession?.id}:${academic.data.activeTerm.id}` : '';
  const periods = new Map<string, string>();
  if (currentKey) periods.set(currentKey, [academic.data?.activeSession?.name, academic.data?.activeTerm?.name].filter(Boolean).join(' · '));
  for (const row of reportSource.data?.results || []) periods.set(`${row.session_id}:${row.term_id}`, [row.session_name, row.term].filter(Boolean).join(' · '));

  const selectedPeriod = chosenPeriod || currentKey || periods.keys().next().value || '';
  const published = (reportSource.data?.results || []).filter(
    (row) => (row.is_approved === undefined || Number(row.is_approved) === 1) && (!selectedPeriod || `${row.session_id}:${row.term_id}` === selectedPeriod)
  );
  const report = {
    ...reportSource,
    data: reportSource.data ? { results: published, remarks: reportSource.data.remarks.filter((row) => !selectedPeriod || `${row.session_id}:${row.term_id}` === selectedPeriod) } : null,
  };
  const results = { ...reportSource, data: reportSource.data ? published : null };

  const isCurrent = !selectedPeriod || selectedPeriod === currentKey;
  const subjects = isCurrent
    ? (w?.subjects_performance || [])
    : published.map((r) => ({
        subject_name: r.subject_name,
        subject_code: r.code,
        score: finite(r.total_score) && finite(r.score) !== null ? Math.round((Number(r.score) / Number(r.total_score)) * 1000) / 10 : 0,
        grade: r.grade,
      }));

  const periodOptions = [...periods].map(([value, label]) => ({ value, label, description: w?.name }));

  const openDetail = (item: any) => {
    router.push({
      pathname: '/academics/detail',
      params: {
        subject: item.subject_name || item.name || 'Subject Result',
        data: JSON.stringify(item),
      },
    });
  };

  return (
    <Page title="Academics" onBack={back} onRefresh={() => { results.reload(); report.reload(); academic.reload(); }} refreshing={results.loading}>
      {periodOptions.length > 0 ? (
        <BaseSelect
          label="Academic period"
          value={selectedPeriod}
          onValueChange={setChosenPeriod}
          options={periodOptions}
          placeholder="Published academic records"
          accessibilityLabel="Choose academic period"
        />
      ) : (
        <Text style={s.period}>Published academic records · {w?.name}</Text>
      )}

      <View style={s.segment}>
        <SegmentedControl options={['Overview', 'Results', 'Subjects']} selectedIndex={tab} onChange={setTab} />
      </View>

      {tab === 0 ? (
        <>
          <CircularProgressGauge
            percentage={isCurrent ? finite(w?.average_score) : null}
            label={finite(w?.average_score) === null ? 'Average not recorded' : 'Term average'}
            trendText=""
            size={220}
          />

          <Section title="Subject performance" />
          {subjects.length ? (
            subjects.map((subject, i) => (
              <Pressable
                key={i}
                style={s.subjectCard}
                onPress={() => openDetail(subject)}
                accessibilityRole="button"
              >
                <View style={s.inline}>
                  <Text style={ui.rowTitle}>{subject.subject_name}</Text>
                  <Text style={s.score}>{pct(subject.score)}</Text>
                  <ChevronRight size={17} color={C.muted} />
                </View>
                <Progress
                  value={Math.max(0, Math.min(100, Number(subject.score) || 0))}
                  style={{ height: 6, backgroundColor: '#E9EEDC', borderRadius: 4 }}
                >
                  <ProgressFilledTrack style={{ backgroundColor: '#10B981', borderRadius: 4 }} />
                </Progress>
              </Pressable>
            ))
          ) : (
            <BaseEmptyState
              icon={<GraduationCap size={26} color={C.primary} />}
              title="No subject scores yet"
              description="Subject performance appears after the school publishes results."
            />
          )}

          <Button label="View attendance records" quiet onPress={() => go('attendance')} />
        </>
      ) : tab === 1 ? (
        <>
          <Feedback loading={results.loading} error={results.error} onRetry={results.reload} />
          {results.data?.map((r, i) => (
            <Row
              key={r.id || i}
              title={r.subject_name || r.subject_code || 'Published result'}
              detail={`${r.grade || 'Grade not recorded'} · ${r.remark || r.remarks || 'School-published assessment'}`}
              right={
                <Text style={s.score}>
                  {finite(r.total_score) && finite(r.score) !== null ? `${r.score}/${r.total_score}` : pct(r.score)}
                </Text>
              }
              onPress={() => openDetail(r)}
            />
          ))}

          <Section title="Report card remarks" />
          <Feedback loading={report.loading} error={report.error} onRetry={report.reload} />
          {report.data?.remarks?.map((r, i) => (
            <View key={i} style={ui.card}>
              <Text style={ui.rowTitle}>{r.teacher_remark ? 'Class teacher’s remark' : 'School remark'}</Text>
              <Text style={ui.muted}>{r.teacher_remark || r.principal_remark || r.remark || 'No remark recorded'}</Text>
            </View>
          ))}
        </>
      ) : (
        <>
          <Section title={`${subjects.length} recorded subjects`} />
          {subjects.map((subject, i) => (
            <Row
              key={i}
              title={subject.subject_name}
              detail={[subject.subject_code, subject.grade].filter(Boolean).join(' · ') || 'School subject'}
              right={<Text style={s.score}>{pct(subject.score)}</Text>}
              onPress={() => openDetail(subject)}
            />
          ))}
        </>
      )}
    </Page>
  );
}

function Payments({ back, go }: { back: () => void; go: (screen: string) => void }) {
  const router = useRouter();
  const { activeWard: w } = useActiveWard();
  const { token } = useGuardianAuth();

  const [tab, setTab] = useState(0);
  const records = useRemote<{ structures: any[]; payments: Payment[] }>(
    `/api/guardian/wards/${w!.id}/fees`,
    `${token}:${w!.id}`
  );
  const ledger = records.data ? feeLedger(records.data) : null;

  const openPaymentDetail = (item: any) => {
    router.push({
      pathname: '/payments/detail',
      params: {
        title: item.title || item.fee_title || 'Fee Invoice',
        data: JSON.stringify(item),
      },
    });
  };

  return (
    <Page title="Fees & Payments" onBack={back} refreshing={records.loading} onRefresh={records.reload}>
      <Text style={s.period}>{w?.name} · School ledger</Text>
      <View style={s.segment}>
        <SegmentedControl options={['Overview', 'History']} selectedIndex={tab} onChange={setTab} />
      </View>

      <Feedback loading={records.loading} error={records.error} onRetry={records.reload} />

      {ledger && (
        <>
          {tab === 0 ? (
            <>
              {/* Balance Card */}
              <Card style={s.balanceCard}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={s.balanceLabel}>Outstanding balance</Text>
                  {ledger.invoices.length ? (
                    <BaseSlidingNumber
                      value={ledger.balance}
                      locale="en-NG"
                      format={{ style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }}
                      fontSize={32}
                      color="#0F172A"
                    />
                  ) : (
                    <Text style={ui.metric}>—</Text>
                  )}
                  <Text style={ui.small}>
                    {ledger.invoices.length ? `${ledger.invoices.length} active charges · ${money(ledger.paid)} allocated` : 'No fees published for this period'}
                  </Text>
                </View>
                <View style={s.walletCircle}>
                  <SolidWallet size={36} color="#F59E0B" secondaryColor="#D97706" />
                </View>
              </Card>

              <Section title="Fee invoices" />
              {ledger.invoices.map((f) => (
                <Row
                  key={f.id}
                  title={f.title}
                  detail={`${money(f.amount)}${f.due_date ? ` · Due ${dateText(f.due_date)}` : ''}`}
                  icon={<SolidWallet size={19} color="#F59E0B" secondaryColor="#D97706" />}
                  right={
                    <Pill
                      text={f.status === 'partial' ? 'Part paid' : f.status === 'paid' ? 'Paid' : 'Pending'}
                      positive={f.status === 'paid'}
                    />
                  }
                  onPress={() => openPaymentDetail(f)}
                />
              ))}
            </>
          ) : (
            <>
              {ledger.payments.length ? (
                ledger.payments.map((p) => (
                  <Row
                    key={p.id}
                    title={p.fee_title || 'Recorded payment'}
                    detail={`${dateText(p.paid_at)} · Ref: ${p.payment_ref}`}
                    right={<Text style={s.score}>{money(p.amount_paid)}</Text>}
                    onPress={() => openPaymentDetail(p)}
                  />
                ))
              ) : (
                <BaseEmptyState
                  icon={<SolidWallet size={32} color="#F59E0B" secondaryColor="#D97706" />}
                  title="No payment history"
                  description="Confirmed payment receipts from the bursary will be archived here."
                />
              )}
            </>
          )}
        </>
      )}
    </Page>
  );
}

function MoreHub({ go, back }: { go: (screen: string) => void; back: () => void }) {
  const { user, logout } = useGuardianAuth();
  const { wards, openSwitcher } = useActiveWard();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <Page title="More">
      <View style={s.profileIdentity}>
        <Avatar name={user?.name || 'Guardian'} size={72} />
        <Text style={s.name}>{user?.name}</Text>
        <Text style={ui.muted}>Authorized Guardian · {wards.length} linked {wards.length === 1 ? 'ward' : 'wards'}</Text>
        <Text style={ui.small}>{user?.email}</Text>
      </View>

      <Card style={s.hubCard}>
        <Row
          title="Messages"
          detail="Direct communication with teachers & admin"
          icon={<SolidMessage size={20} color="#6366F1" secondaryColor="#4F46E5" />}
          onPress={() => go('messages')}
        />
        <Row
          title="Attendance"
          detail="Daily check-in logs and attendance trends"
          icon={<SolidAttendance size={20} color="#06B6D4" secondaryColor="#0891B2" />}
          onPress={() => go('attendance')}
        />
        <Row
          title="School calendar"
          detail="Term schedule, examinations and dates"
          icon={<SolidCalendar size={20} color="#8B5CF6" secondaryColor="#7C3AED" />}
          onPress={() => go('calendar')}
        />
        <Row
          title="School updates"
          detail="Announcements, official circulars and events"
          icon={<SolidBell size={20} color="#F59E0B" secondaryColor="#D97706" />}
          onPress={() => go('updates')}
        />
      </Card>

      <BaseSeparator label="Account & preferences" />

      <Card style={s.hubCard}>
        <Row
          title="My Profile"
          detail="Personal verified credentials & security"
          icon={<SolidShield size={20} color="#3B82F6" secondaryColor="#1D4ED8" />}
          onPress={() => go('profile')}
        />
        <Row
          title="Linked students"
          detail={`${wards.length} approved ${wards.length === 1 ? 'link' : 'links'}`}
          icon={<SolidLinkChild size={20} color="#F43F5E" secondaryColor="#E11D48" />}
          onPress={openSwitcher}
        />
        <Row
          title="Link another child"
          detail="Request student record verification"
          icon={<SolidLinkChild size={20} color="#F43F5E" secondaryColor="#E11D48" />}
          onPress={() => go('link')}
        />
        <Row
          title="Notification preferences"
          detail="Alerts for results, attendance and fees"
          icon={<SolidBell size={20} color="#F59E0B" secondaryColor="#D97706" />}
          onPress={() => go('settings')}
        />
      </Card>

      <Button
        label="Sign Out"
        quiet
        onPress={() => setConfirmSignOut(true)}
      />

      <BaseDialog
        role="alertdialog"
        visible={confirmSignOut}
        onVisibleChange={setConfirmSignOut}
        title="Sign out of Guardian?"
        description="You will need your school-registered email and password to sign back in."
        footer={
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <Button label="Cancel" quiet onPress={() => setConfirmSignOut(false)} />
            <Button label="Sign out" onPress={() => void logout().catch(() => {})} />
          </View>
        }
      />
    </Page>
  );
}

const s = StyleSheet.create({
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  greeting: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    backgroundColor: '#DC2626',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  childCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 10px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -1px rgba(15, 23, 42, 0.02)',
          cursor: 'pointer',
        }
      : {}),
  },
  childName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  micro: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  switchText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  snapshot: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 10px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -1px rgba(15, 23, 42, 0.02)',
          cursor: 'pointer',
        }
      : {}),
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricChip: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricLabel: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 8,
    gap: 2,
  },
  hubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  freshness: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    paddingTop: 4,
  },
  unread: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  period: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 18,
  },
  segment: {
    marginHorizontal: -4,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 'auto',
  },
  balanceCard: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 18,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  walletCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIdentity: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
});
