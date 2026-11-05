import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../components/base-header';
import { BaseSeparator } from '../components/base-separator';
import { BaseListRow } from '../components/base-list-row';
import { BaseEmptyState } from '../components/base-empty-state';
import { Card } from '../components/ui/card';
import { Pressable } from '../components/ui/pressable';
import { SolidCalendar } from '../components/common/SolidIcons';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react-native';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useRemote } from '../components/common/NativeUI';
import { calendarCells, localDate, type CalendarEvent } from '../api/records';

export function GuardianCalendarScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const { token } = useGuardianAuth();

  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => localDate(new Date()));

  const events = useRemote<CalendarEvent[]>('/api/v2/calendar', token || '');
  const allEvents = events.data || [];

  const year = month.getFullYear();
  const m = month.getMonth();
  const cells = calendarCells(year, m);

  const onDate = (e: CalendarEvent, day: string) =>
    day >= e.start_date.slice(0, 10) && day <= (e.end_date || e.start_date).slice(0, 10);

  const chosenEvents = allEvents.filter((e) => onDate(e, selected));
  const upcomingEvents = allEvents.filter((e) => Date.parse(e.start_date) >= Date.now()).slice(0, 5);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/home');
    }
  };

  const openEvent = (e: CalendarEvent) => {
    router.push({
      pathname: '/calendar/detail',
      params: {
        title: e.title,
        data: JSON.stringify(e),
      },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title="School Calendar"
        subtitle="Term events and academic schedule"
        onBack={handleBack}
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={events.loading}
            onRefresh={events.reload}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Month Header Navigation */}
        <View style={styles.monthCard}>
          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => {
                const d = new Date(year, m - 1, 1);
                setMonth(d);
                setSelected(localDate(d));
              }}
              style={styles.navBtn}
            >
              <ChevronLeft size={20} color="#0F172A" />
            </Pressable>

            <Text style={styles.monthTitle}>
              {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => {
                const d = new Date(year, m + 1, 1);
                setMonth(d);
                setSelected(localDate(d));
              }}
              style={styles.navBtn}
            >
              <ChevronRight size={20} color="#0F172A" />
            </Pressable>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <Text key={d} style={styles.dayHead}>
                {d}
              </Text>
            ))}

            {cells.map((day, i) => {
              const iso = day ? localDate(new Date(year, m, day)) : '';
              const isSelected = selected === iso;
              const hasEvents = iso ? allEvents.some((e) => onDate(e, iso)) : false;

              return (
                <View key={i} style={styles.dayCell}>
                  {day ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${month.toLocaleDateString('en-GB', { month: 'long' })}`}
                      onPress={() => setSelected(iso)}
                      style={[styles.dayButton, isSelected && styles.daySelected]}
                    >
                      <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>
                        {day}
                      </Text>
                      {hasEvents && (
                        <View style={[styles.eventDot, isSelected && { backgroundColor: '#FFFFFF' }]} />
                      )}
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Selected Date Agenda */}
        <Text style={styles.sectionHeader}>
          {new Date(selected).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        <View style={styles.listCard}>
          {chosenEvents.length ? (
            chosenEvents.map((e) => (
              <BaseListRow
                key={e.id}
                title={e.title}
                description={[e.time_str, e.venue].filter(Boolean).join(' · ') || 'Scheduled school event'}
                leading={
                  <View style={styles.iconCircle}>
                    <SolidCalendar size={22} color="#F59E0B" secondaryColor="#D97706" />
                  </View>
                }
                onPress={() => openEvent(e)}
              />
            ))
          ) : (
            <BaseEmptyState
              icon={<CalendarDays size={28} color="#F59E0B" />}
              title="No events on this date"
              description="No school events or examinations scheduled for the selected day."
            />
          )}
        </View>

        {/* Upcoming Events */}
        <Text style={styles.sectionHeader}>Upcoming Academic Dates</Text>
        <View style={styles.listCard}>
          {upcomingEvents.map((e) => (
            <BaseListRow
              key={e.id}
              title={e.title}
              description={new Date(e.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              leading={
                <View style={styles.iconCircle}>
                  <SolidCalendar size={22} color="#F59E0B" secondaryColor="#D97706" />
                </View>
              }
              onPress={() => openEvent(e)}
            />
          ))}
        </View>
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
  monthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.03)',
        }
      : {}),
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 6,
  },
  dayHead: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    paddingVertical: 8,
  },
  dayCell: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: '#F59E0B',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayNumSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
    position: 'absolute',
    bottom: 3,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 6,
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
  iconCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
