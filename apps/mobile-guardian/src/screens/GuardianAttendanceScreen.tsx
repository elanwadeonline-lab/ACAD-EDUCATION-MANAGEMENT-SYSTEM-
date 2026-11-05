import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../components/base-header';
import { BaseToggleGroup } from '../components/base-toggle-group';
import { BaseSlidingNumber } from '../components/base-sliding-number';
import { BaseSeparator } from '../components/base-separator';
import { BaseListRow } from '../components/base-list-row';
import { BaseEmptyState } from '../components/base-empty-state';
import { Card } from '../components/ui/card';
import { Badge, BadgeText } from '../components/ui/badge';
import { AttendanceBarChart } from '../components/common/AttendanceBarChart';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useActiveWard } from '../context/ActiveWardContext';
import { useRemote } from '../components/common/NativeUI';
import { SolidAttendance } from '../components/common/SolidIcons';
import { monthlyAttendance, finite } from '../api/records';

export function GuardianAttendanceScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const { token } = useGuardianAuth();
  const { activeWard } = useActiveWard();

  const [tab, setTab] = useState('0');

  const record = useRemote<{
    summary: any;
    calendar: Array<{ id: number; date: string; status: string; remarks?: string }>;
  }>(
    activeWard ? `/api/guardian/wards/${activeWard.id}/attendance` : null,
    `${token}:${activeWard?.id || ''}`
  );

  const summary = record.data?.summary;
  const calendar = record.data?.calendar || [];
  const trend = monthlyAttendance(calendar);

  const total = finite(summary?.total_days) || 0;
  const present = finite(summary?.present_days) || 0;
  const absent = finite(summary?.absent_days) || 0;
  const late = finite(summary?.late_days) || 0;
  const rate = total ? Math.round((present / total) * 100) : null;

  const dateText = (value?: string) =>
    value && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      : 'Date not recorded';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/home');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title="Attendance"
        subtitle={`${activeWard?.name || 'Student'} · Verified School Records`}
        onBack={handleBack}
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={record.loading}
            onRefresh={record.reload}
            tintColor={C.primary}
          />
        }
      >
        <BaseToggleGroup
          variant="chip"
          attached={false}
          items={[
            { value: '0', label: 'Summary & Trends' },
            { value: '1', label: 'Daily Logs' },
          ]}
          value={tab}
          onValueChange={(val) => setTab(val || '0')}
          accessibilityLabel="Attendance display mode"
        />

        {tab === '0' ? (
          <>
            {/* Minimal, Executive Hero Card - unboxed, restrained */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.heroLabel}>TERM ATTENDANCE RATE</Text>
                  <Text style={styles.heroSub}>
                    {total ? `${present} of ${total} recorded school days` : 'Term roll call tracking'}
                  </Text>
                </View>
                {/* Clean unboxed icon - no colored background box, no border */}
                <View style={styles.iconClean}>
                  <SolidAttendance size={28} color="#06B6D4" secondaryColor="#0891B2" />
                </View>
              </View>

              <View style={styles.rateRow}>
                {rate !== null ? (
                  <BaseSlidingNumber
                    value={rate / 100}
                    format={{ style: 'percent', maximumFractionDigits: 0 }}
                    fontSize={44}
                    color="#0F172A"
                  />
                ) : (
                  <Text style={styles.heroRateText}>—</Text>
                )}
                {rate !== null && (
                  <Badge variant="secondary" style={styles.statusPill}>
                    <BadgeText style={styles.statusPillText}>
                      {rate >= 90 ? 'Excellent Standing' : rate >= 75 ? 'Good' : 'Needs Attention'}
                    </BadgeText>
                  </Badge>
                )}
              </View>

              <BaseSeparator inset={0} />

              {/* Informative 3 Count Metrics */}
              <View style={styles.statsStrip}>
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, { color: '#059669' }]}>{present}</Text>
                  <Text style={styles.statName}>Days Present</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, { color: '#DC2626' }]}>{absent}</Text>
                  <Text style={styles.statName}>Days Absent</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, { color: '#D97706' }]}>{late}</Text>
                  <Text style={styles.statName}>Days Late</Text>
                </View>
              </View>
            </View>

            {/* Monthly Trend Chart */}
            <Text style={styles.sectionHeader}>Monthly Attendance Distribution</Text>
            <Card style={styles.chartCard}>
              {trend.length ? (
                <AttendanceBarChart data={trend} />
              ) : (
                <BaseEmptyState
                  icon={<SolidAttendance size={32} color="#06B6D4" secondaryColor="#0891B2" />}
                  title="Monthly trend pending"
                  description="Monthly patterns appear when school roll call records are confirmed."
                />
              )}
            </Card>

            {/* Recent Check-ins */}
            <Text style={styles.sectionHeader}>Recent Roll Call Records</Text>
            <View style={styles.listCard}>
              {calendar.slice(-5).reverse().map((r) => (
                <BaseListRow
                  key={r.id}
                  title={dateText(r.date)}
                  description={r.remarks || 'Morning classroom registration'}
                  trailing={
                    <Badge
                      variant="secondary"
                      style={
                        r.status === 'present'
                          ? styles.badgePresent
                          : r.status === 'late'
                          ? styles.badgeLate
                          : styles.badgeAbsent
                      }
                    >
                      <BadgeText
                        style={
                          r.status === 'present'
                            ? styles.textPresent
                            : r.status === 'late'
                            ? styles.textLate
                            : styles.textAbsent
                        }
                      >
                        {r.status.toUpperCase()}
                      </BadgeText>
                    </Badge>
                  }
                />
              ))}
            </View>
          </>
        ) : (
          /* Daily Log Tab */
          <View style={styles.listCard}>
            {calendar.length ? (
              calendar.slice().reverse().map((r) => (
                <BaseListRow
                  key={r.id}
                  title={dateText(r.date)}
                  description={r.remarks || 'Classroom roll call confirmation'}
                  trailing={
                    <Badge
                      variant="secondary"
                      style={
                        r.status === 'present'
                          ? styles.badgePresent
                          : r.status === 'late'
                          ? styles.badgeLate
                          : styles.badgeAbsent
                      }
                    >
                      <BadgeText
                        style={
                          r.status === 'present'
                            ? styles.textPresent
                            : r.status === 'late'
                            ? styles.textLate
                            : styles.textAbsent
                        }
                      >
                        {r.status.toUpperCase()}
                      </BadgeText>
                    </Badge>
                  }
                />
              ))
            ) : (
              <BaseEmptyState
                icon={<SolidAttendance size={32} color="#06B6D4" secondaryColor="#0891B2" />}
                title="No daily logs recorded"
                description="Daily logs will appear when school teachers begin morning roll call."
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 20,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.03)',
        }
      : {}),
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  iconClean: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  heroRateText: {
    fontSize: 44,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '700',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  statCol: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  statName: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 16,
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
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'hidden',
    paddingHorizontal: 8,
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
  badgePresent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textPresent: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeLate: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textLate: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textAbsent: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
});
