import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../../src/components/base-header';
import { BaseSeparator } from '../../src/components/base-separator';
import { Card } from '../../src/components/ui/card';
import { Badge, BadgeText } from '../../src/components/ui/badge';
import { Progress, ProgressFilledTrack } from '../../src/components/ui/progress';
import { SolidGraduationCap, SolidBook, SolidShield } from '../../src/components/common/SolidIcons';
import { Colors as C } from '../../src/theme/tokens';
import { useActiveWard } from '../../src/context/ActiveWardContext';
import { getPerformanceLabel } from '../../src/utils/performanceColors';
import { CheckCircle2, Award } from 'lucide-react-native';

export default function AcademicDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data?: string; subject?: string }>();
  const { activeWard } = useActiveWard();

  let record: any = {};
  try {
    if (params.data) {
      record = JSON.parse(params.data);
    }
  } catch (e) {
    record = {};
  }

  const subjectName = record.subject_name || record.name || params.subject || 'Subject Result';
  const score = record.score ?? record.total ?? 0;
  const totalScore = record.total_score || 100;
  const percentage = Math.round((Number(score) / Number(totalScore)) * 100);
  const grade = record.grade || (percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 50 ? 'C' : 'P');

  const perfLabel = getPerformanceLabel(percentage);
  const orangeAccent = '#F59E0B';
  const orangeText = '#D97706';

  const caScore = record.ca_score ?? (record.ca1_score !== undefined ? Number(record.ca1_score) + Number(record.ca2_score || 0) : null);
  const examScore = record.exam_score ?? (record.score !== undefined && caScore !== null ? Number(record.score) - Number(caScore) : null);

  const teacherRemark = record.teacher_remark || record.remark || 'No remark recorded by subject teacher.';
  const principalRemark = record.principal_remark || 'No official principal endorsement recorded for this period.';

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title={subjectName}
        subtitle={`${activeWard?.name || 'Student'} · Assessment Breakdown`}
        onBack={() => router.back()}
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Score Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.iconCircle}>
              <SolidGraduationCap size={26} color={orangeAccent} secondaryColor={orangeAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{subjectName}</Text>
              <Text style={styles.heroSub}>{record.subject_code || record.code || 'Academic Course'}</Text>
            </View>
            <Text style={styles.gradeTextClean}>Grade {grade}</Text>
          </View>

          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.bigScore}>{score}<Text style={styles.totalScore}>/{totalScore}</Text></Text>
              <Text style={styles.scoreLabel}>Final Published Score</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={styles.pctTextClean}>{percentage}%</Text>
              <Text style={styles.perfBadgeText}>{perfLabel}</Text>
            </View>
          </View>

          <Progress value={Math.max(0, Math.min(100, percentage))} style={styles.progressBar}>
            <ProgressFilledTrack style={{ backgroundColor: orangeAccent, borderRadius: 4 }} />
          </Progress>
        </View>

        {/* Continuous Assessment Breakdown */}
        <Text style={styles.sectionHeader}>Assessment Breakdown</Text>
        <Card style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownName}>Continuous Assessment (CA)</Text>
              <Text style={styles.breakdownNote}>Assignments, quizzes and classroom participation</Text>
            </View>
            <Text style={styles.breakdownVal}>{caScore !== null ? `${caScore}/40` : '—'}</Text>
          </View>

          <BaseSeparator inset={0} />

          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownName}>Terminal Examination</Text>
              <Text style={styles.breakdownNote}>Official end-of-term standardized paper</Text>
            </View>
            <Text style={styles.breakdownVal}>{examScore !== null ? `${examScore}/60` : '—'}</Text>
          </View>

          <BaseSeparator inset={0} />

          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.breakdownName, { fontWeight: '600' }]}>Total Cumulative</Text>
              <Text style={styles.breakdownNote}>Calculated term score</Text>
            </View>
            <Text style={[styles.breakdownVal, { color: '#0F172A', fontWeight: '600' }]}>
              {score}/{totalScore}
            </Text>
          </View>
        </Card>

        {/* Remarks Section */}
        <Text style={styles.sectionHeader}>Academic Remarks</Text>

        <View style={styles.remarkCard}>
          <View style={styles.remarkHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color={orangeAccent} />
              <Text style={styles.remarkRole}>Subject Teacher’s Remark</Text>
            </View>
            <View style={styles.officialChip}>
              <Text style={styles.officialChipText}>Verified</Text>
            </View>
          </View>
          <Text style={styles.remarkBody}>{teacherRemark}</Text>
        </View>

        <View style={styles.remarkCard}>
          <View style={styles.remarkHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Award size={16} color={orangeAccent} />
              <Text style={styles.remarkRole}>Principal’s Official Endorsement</Text>
            </View>
            <View style={styles.officialChip}>
              <Text style={styles.officialChipText}>Official Seal</Text>
            </View>
          </View>
          <Text style={styles.remarkBody}>{principalRemark}</Text>
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
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 18,
    gap: 16,
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
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.3,
    fontFamily: 'Manrope_600SemiBold',
  },
  heroSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
  },
  gradeTextClean: {
    color: '#D97706',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  bigScore: {
    fontSize: 32,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.8,
    fontFamily: 'Manrope_600SemiBold',
  },
  totalScore: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94A3B8',
    fontFamily: 'Manrope_500Medium',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
  },
  pctTextClean: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D97706',
    fontFamily: 'Manrope_600SemiBold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 6,
    fontFamily: 'Manrope_600SemiBold',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 16,
    gap: 12,
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
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    fontFamily: 'Manrope_500Medium',
  },
  breakdownNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
  },
  breakdownVal: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    fontFamily: 'Manrope_500Medium',
  },
  remarkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 16,
    gap: 8,
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
  remarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remarkRole: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Manrope_500Medium',
  },
  remarkBody: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
  },
  perfBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    color: '#D97706',
    textTransform: 'capitalize',
  },
  officialChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  officialChipText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'Manrope_500Medium',
  },
});

