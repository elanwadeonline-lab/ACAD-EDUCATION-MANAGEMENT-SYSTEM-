import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../../src/components/base-header';
import { BaseSeparator } from '../../src/components/base-separator';
import { Card } from '../../src/components/ui/card';
import { Badge, BadgeText } from '../../src/components/ui/badge';
import { SolidCalendar } from '../../src/components/common/SolidIcons';
import { Colors as C } from '../../src/theme/tokens';
import { useActiveWard } from '../../src/context/ActiveWardContext';

export default function CalendarDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data?: string; title?: string }>();
  const { activeWard } = useActiveWard();

  let event: any = {};
  try {
    if (params.data) {
      event = JSON.parse(params.data);
    }
  } catch (e) {
    event = {};
  }

  const title = event.title || params.title || 'School Calendar Event';
  const venue = event.venue || 'School Main Auditorium';
  const startDate = event.start_date ? new Date(event.start_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date announced by school';
  const timeStr = event.time_str || '10:00 AM – 1:00 PM';
  const description = event.description || 'All parents, guardians and faculty members are invited to participate in this academic session event.';

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title="Event Details"
        subtitle={`${activeWard?.name || 'Academic'} · School Calendar`}
        onBack={() => router.back()}
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.iconCircle}>
              <SolidCalendar size={28} color="#8B5CF6" secondaryColor="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroSub}>{venue}</Text>
            </View>
            <Badge variant="secondary" style={styles.badge}>
              <BadgeText style={styles.badgeText}>School Event</BadgeText>
            </Badge>
          </View>

          <BaseSeparator inset={0} />

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{startDate}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{timeStr}</Text>
            </View>
          </View>
        </View>

        {/* Event Agenda & Notes */}
        <Text style={styles.sectionHeader}>Event Description</Text>
        <Card style={styles.card}>
          <Text style={styles.descText}>{description}</Text>
        </Card>

        <Text style={styles.sectionHeader}>Important Notice for Guardians</Text>
        <Card style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            • Prompt arrival is appreciated to ensure the program starts on schedule.{'\n'}
            • Parking is available at the secondary school sports complex.{'\n'}
            • For inquiries regarding special accommodations, please message the school administration office.
          </Text>
        </Card>
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
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.03)',
        }
      : {}),
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 11,
  },
  detailRow: {
    gap: 10,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  descText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  noticeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
  },
  noticeText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 22,
  },
});

