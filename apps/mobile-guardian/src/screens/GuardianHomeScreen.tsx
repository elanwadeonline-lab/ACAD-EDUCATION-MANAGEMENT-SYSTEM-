import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { Box as View } from '../components/ui/box';
import { Pressable } from '../components/ui/pressable';
import { Card, BaseEmptyState, BaseSlidingNumber } from '../components/common/NativeUI';
import { useRouter } from 'expo-router';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useActiveWard } from '../context/ActiveWardContext';
import { Page, Button, Feedback, Section, Avatar, Row, useRemote, ui } from '../components/common/NativeUI';
import { QuickActions } from '../components/common/QuickActions';
import {
  SolidTrendingUp,
  SolidGraduationCap,
  SolidWallet,
  SolidAttendance,
  SolidLinkChild,
  SolidBell,
} from '../components/common/SolidIcons';
import { finite } from '../api/records';

export function GuardianHomeScreen() {
  const router = useRouter();
  const { user, token } = useGuardianAuth();
  const { activeWard: w, openSwitcher, isLoadingWards, error, refreshWards, updatedAt } = useActiveWard();
  const updates = useRemote<{ items: any[]; unreadCount: number }>('/api/guardian/notifications', token || '');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
  const avgVal = finite(w?.average_score);
  const attVal = w?.attendance?.total_days ? finite(w?.attendance_pct) : null;

  const go = (route: string) => {
    router.push(route as any);
  };

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
          onPress={() => go('/updates')}
          style={s.notifBtn}
        >
          <SolidBell size={22} color="#000000" secondaryColor="#000000" />
          {!!updates.data?.unreadCount && <View style={s.notificationDot} />}
        </Pressable>
      </View>

      <Feedback loading={isLoadingWards} error={error} onRetry={() => void refreshWards()} />

      {w ? (
        <>
          {/* Active Child Switcher Card */}
          <Pressable
            style={s.childCard}
            onPress={() => go('/select-child')}
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
            </View>
          </Pressable>

          {/* Snapshot Metrics */}
          <View style={s.snapshot}>
            {/* Term Average Card */}
            <Pressable
              onPress={() => go('/academics')}
              style={s.metricCard}
              accessibilityRole="button"
              accessibilityLabel="Academic term average"
            >
              <View style={s.metricTop}>
                <SolidTrendingUp size={22} color="#FFFFFF" secondaryColor="#E5E5E5" />
                <View style={s.metricChipWrap}>
                  <Text style={s.metricChip}>Academics</Text>
                </View>
              </View>
              {avgVal !== null ? (
                <BaseSlidingNumber
                  value={avgVal / 100}
                  format={{ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                  fontSize={28}
                  color="#FFFFFF"
                />
              ) : (
                <Text style={[ui.metric, { color: '#FFFFFF' }]}>—</Text>
              )}
              <Text style={s.metricLabel}>Term average</Text>
              <Text style={s.metricSub}>
                {w.completed_exams || 0} completed assessments
              </Text>
            </Pressable>

            {/* Attendance Card */}
            <Pressable
              onPress={() => go('/attendance')}
              style={s.metricCard}
              accessibilityRole="button"
              accessibilityLabel="School attendance rate"
            >
              <View style={s.metricTop}>
                <SolidAttendance size={22} color="#FFFFFF" secondaryColor="#E5E5E5" />
                <View style={s.metricChipWrap}>
                  <Text style={s.metricChip}>Attendance</Text>
                </View>
              </View>
              {attVal !== null ? (
                <BaseSlidingNumber
                  value={attVal / 100}
                  format={{ style: 'percent', maximumFractionDigits: 0 }}
                  fontSize={28}
                  color="#FFFFFF"
                />
              ) : (
                <Text style={[ui.metric, { color: '#FFFFFF' }]}>—</Text>
              )}
              <Text style={s.metricLabel}>Attendance rate</Text>
              <Text style={s.metricSub}>
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
              onPress={() => go('/payments')}
            />
            <Row
              title="Latest report card"
              detail="Published examination scores and teacher remarks"
              icon={<SolidGraduationCap size={20} color="#F59E0B" secondaryColor="#D97706" />}
              onPress={() => go('/academics')}
            />
          </Card>

          {/* Updates Feed Preview */}
          <Section title="Updates for you" action="View all" onPress={() => go('/updates')} />
          <Feedback loading={updates.loading} error={updates.error} onRetry={updates.reload} />
          {updates.data?.items?.slice(0, 3).map((n) => (
            <Row
              key={n.id}
              title={n.type?.replace(/_/g, ' ').toUpperCase() || 'SCHOOL UPDATE'}
              detail={n.message}
              icon={<SolidBell size={18} color="#F59E0B" secondaryColor="#D97706" />}
              onPress={() => go('/updates')}
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
          actions={<Button label="Link a child" onPress={() => go('/link')} />}
        />
      ) : null}
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
    fontFamily: 'Manrope_500Medium',
  },
  name: {
    fontSize: 22,
    fontWeight: '500',
    color: '#0F172A',
    letterSpacing: -0.5,
    fontFamily: 'Manrope_500Medium',
  },
  notifBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    position: 'relative',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  notificationDot: {
    position: 'absolute',
    right: 4,
    top: 4,
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
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.02)',
          cursor: 'pointer',
        }
      : {}),
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Manrope_600SemiBold',
  },
  micro: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  switchPill: {
    marginLeft: 'auto',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F59E0B',
    fontFamily: 'Manrope_500Medium',
  },
  snapshot: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#111014',
    borderWidth: 0,
    borderColor: 'transparent',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 6px 16px -2px rgba(0, 0, 0, 0.28), 0 2px 6px -1px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
        }
      : {}),
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricChipWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metricChip: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: 'Manrope_600SemiBold',
  },
  metricLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.1,
    fontFamily: 'Manrope_600SemiBold',
  },
  metricSub: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '500',
    lineHeight: 16,
    fontFamily: 'Manrope_500Medium',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 10,
    gap: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -1px rgba(15, 23, 42, 0.02)',
        }
      : {}),
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
});
