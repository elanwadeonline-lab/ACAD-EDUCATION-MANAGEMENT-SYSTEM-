import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, GraduationCap, CheckCircle } from 'lucide-react-native';
import { Page, Button, Feedback, Section, Row, useRemote, ui } from '../components/common/NativeUI';
import { BaseSelect } from '../components/base-select';
import { UnderlineTabs } from '../components/common/UnderlineTabs';
import { CircularProgressGauge } from '../components/common/CircularProgressGauge';
import { BaseEmptyState } from '../components/base-empty-state';
import { Progress, ProgressFilledTrack } from '../components/ui/progress';
import { Pressable } from '../components/ui/pressable';
import { SolidBook } from '../components/common/SolidIcons';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useActiveWard } from '../context/ActiveWardContext';
import { finite } from '../api/records';
import { getPerformanceLabel } from '../utils/performanceColors';

const pct = (value: unknown) => (finite(value) === null ? '—' : `${finite(value)}%`);

export function GuardianAcademicsScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const { activeWard: w } = useActiveWard();
  const { token } = useGuardianAuth();

  const [tab, setTab] = useState(0);
  const [chosenPeriod, setChosenPeriod] = useState('');

  // Reset chosen period when switching active child
  useEffect(() => {
    setChosenPeriod('');
  }, [w?.id]);

  const reportSource = useRemote<{ results: any[]; remarks: any[] }>(
    w ? `/api/guardian/wards/${w.id}/report-card` : null,
    `${token}:${w?.id || ''}`
  );
  const academic = useRemote<any>('/api/academic/active', token || '');

  const currentKey = academic.data?.activeTerm?.id ? `${academic.data?.activeSession?.id}:${academic.data.activeTerm.id}` : '';
  const periods = new Map<string, string>();
  for (const row of reportSource.data?.results || []) {
    if (row.session_id && row.term_id) {
      periods.set(`${row.session_id}:${row.term_id}`, [row.session_name, row.term].filter(Boolean).join(' · '));
    }
  }
  if (currentKey && periods.size === 0) {
    periods.set(currentKey, [academic.data?.activeSession?.name, academic.data?.activeTerm?.name].filter(Boolean).join(' · '));
  }

  const availableKeys = Array.from(periods.keys());
  const defaultPeriod = (currentKey && periods.has(currentKey))
    ? currentKey
    : (availableKeys[availableKeys.length - 1] || '');
  const selectedPeriod = chosenPeriod || defaultPeriod;

  const published = (reportSource.data?.results || []).filter(
    (row) => (row.is_approved === undefined || Number(row.is_approved) === 1) && (!selectedPeriod || `${row.session_id}:${row.term_id}` === selectedPeriod)
  );

  // Dynamic Average calculation strictly from actual academic records
  let periodAverage: number | null = null;
  if (published.length > 0) {
    const sum = published.reduce((acc, r) => {
      const max = Number(r.total_score) || 100;
      const sc = Number(r.score !== undefined && r.score !== null ? r.score : (Number(r.ca_score || 0) + Number(r.exam_score || 0)));
      return acc + (max > 0 ? (sc / max) * 100 : 0);
    }, 0);
    periodAverage = Math.round((sum / published.length) * 10) / 10;
  } else if ((!selectedPeriod || selectedPeriod === currentKey) && finite(w?.average_score) !== null && (w?.average_score ?? 0) > 0) {
    periodAverage = finite(w?.average_score);
  }

  const isCurrent = !selectedPeriod || selectedPeriod === currentKey;
  const subjects = published.length > 0
    ? published.map((r) => {
        const total = Number(r.total_score) || 100;
        const sc = Number(r.score !== undefined && r.score !== null ? r.score : (Number(r.ca_score || 0) + Number(r.exam_score || 0)));
        const scorePct = total > 0 ? Math.round((sc / total) * 1000) / 10 : 0;
        return {
          ...r,
          subject_name: r.subject_name,
          subject_code: r.code || (r.subject_name || 'SUB').slice(0, 4).toUpperCase(),
          score: scorePct,
          grade: r.grade || (scorePct >= 80 ? 'A' : scorePct >= 70 ? 'B' : scorePct >= 60 ? 'C' : scorePct >= 50 ? 'D' : 'F'),
          ca_score: r.ca_score,
          exam_score: r.exam_score,
          teacher_remark: r.teacher_remark,
          principal_remark: r.principal_remark,
        };
      })
    : (isCurrent && (w?.subjects_performance?.length || 0) > 0 ? (w?.subjects_performance || []) : []);

  const periodOptions = [...periods].map(([value, label]) => ({ value, label, description: w?.name }));

  // Extract structured remarks for this period
  const rawRemarks = (reportSource.data?.remarks || []).filter(
    (row) => !selectedPeriod || `${row.session_id}:${row.term_id}` === selectedPeriod || (!row.session_id && !row.term_id)
  );
  const periodRemarks: Array<{ role: string; body: string }> = [];
  for (const r of rawRemarks) {
    if (r.teacher_remark) {
      periodRemarks.push({ role: "Class Teacher’s Remark", body: r.teacher_remark });
    }
    if (r.principal_remark) {
      periodRemarks.push({ role: "Principal’s Official Endorsement", body: r.principal_remark });
    }
  }

  const report = {
    ...reportSource,
    data: reportSource.data ? { results: published, remarks: periodRemarks } : null,
  };
  const results = { ...reportSource, data: reportSource.data ? published : null };

  const openDetail = (item: any) => {
    router.push({
      pathname: '/academics/detail',
      params: {
        subject: item.subject_name || item.name || 'Subject Result',
        data: JSON.stringify(item),
      },
    });
  };

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
    <Page title="Academics" onBack={handleBack} onRefresh={() => { results.reload(); report.reload(); academic.reload(); }} refreshing={results.loading}>
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

      <UnderlineTabs
        tabs={['Overview', 'Results', 'Subjects']}
        selectedIndex={tab}
        onChange={setTab}
      >
        {/* Pane 0: Overview */}
        <View style={{ gap: 16 }}>
          {periodAverage !== null ? (
            <CircularProgressGauge
              percentage={periodAverage}
              label="Term average"
              trendText=""
              size={220}
            />
          ) : (
            <BaseEmptyState
              icon={<GraduationCap size={28} color="#000000" />}
              title="No term average recorded"
              description="Official grades and term average will be computed and displayed once results are published by the school."
            />
          )}

          <Section title="Subject performance" />
          {subjects.length ? (
            subjects.map((subject, i) => {
              const numScore = Number(subject.score) || 0;
              const label = getPerformanceLabel(numScore);
              return (
                <Pressable
                  key={i}
                  style={s.subjectCard}
                  onPress={() => openDetail(subject)}
                  accessibilityRole="button"
                >
                  <View style={s.inline}>
                    <Text style={s.subjectRowTitle}>{subject.subject_name}</Text>
                    <Text style={s.perfTextClean}>{label}</Text>
                    <Text style={s.score}>{pct(subject.score)}</Text>
                    <ChevronRight size={17} color={C.muted} />
                  </View>
                  <Progress
                    value={Math.max(0, Math.min(100, numScore))}
                    style={{ height: 5, backgroundColor: '#F1F5F9', borderRadius: 4 }}
                  >
                    <ProgressFilledTrack style={{ backgroundColor: '#F59E0B', borderRadius: 4 }} />
                  </Progress>
                </Pressable>
              );
            })
          ) : (
            <BaseEmptyState
              icon={<GraduationCap size={26} color="#000000" />}
              title="No subject scores yet"
              description="Subject performance appears after the school publishes results."
            />
          )}

          <Button label="View attendance records" quiet onPress={() => router.push('/attendance')} />
        </View>

        {/* Pane 1: Results */}
        <View style={{ gap: 16 }}>
          <Feedback loading={results.loading} error={results.error} onRetry={results.reload} />
          {published.length > 0 ? (
            published.map((r, i) => (
              <Row
                key={r.exam_id || r.id || i}
                title={r.subject_name || r.subject_code || 'Published result'}
                detail={`${r.grade ? `Grade ${r.grade} · ` : ''}${r.teacher_remark || r.remark || r.remarks || 'School-published assessment'}`}
                right={
                  <Text style={s.resultScoreClean}>
                    {finite(r.total_score) && finite(r.score) !== null
                      ? `${r.score}/${r.total_score}`
                      : pct(r.score)}
                  </Text>
                }
                onPress={() => openDetail(r)}
              />
            ))
          ) : !results.loading ? (
            <BaseEmptyState
              icon={<GraduationCap size={26} color="#000000" />}
              title="No published results"
              description="Official examination and test results for this period have not been released by the school."
            />
          ) : null}

          <Section title="Report card remarks" />
          <Feedback loading={report.loading} error={report.error} onRetry={report.reload} />
          {periodRemarks.length > 0 ? (
            periodRemarks.map((rem, i) => (
              <View key={i} style={s.remarkItemCard}>
                <View style={s.remarkTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={15} color="#F59E0B" />
                    <Text style={s.remarkRoleText}>{rem.role}</Text>
                  </View>
                  <View style={s.officialChip}>
                    <Text style={s.officialChipText}>Official</Text>
                  </View>
                </View>
                <Text style={s.remarkItemBody}>{rem.body}</Text>
              </View>
            ))
          ) : !report.loading ? (
            <BaseEmptyState
              icon={<CheckCircle size={24} color="#000000" />}
              title="No remarks recorded"
              description="Formal teacher comments and principal endorsement have not been filed for this period."
            />
          ) : null}
        </View>

        {/* Pane 2: Subjects */}
        <View style={{ gap: 12 }}>
          <Section title={`${subjects.length} recorded subjects`} />
          {subjects.length > 0 ? (
            subjects.map((subject, i) => {
              const numScore = Number(subject.score) || 0;
              const label = getPerformanceLabel(numScore);
              return (
                <Pressable
                  key={i}
                  style={s.subjectCard}
                  onPress={() => openDetail(subject)}
                  accessibilityRole="button"
                  accessibilityLabel={`${subject.subject_name}: ${pct(subject.score)}`}
                >
                  <View style={s.subjectHeaderRow}>
                    <SolidBook size={20} color="#F59E0B" secondaryColor="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.subjectTitle}>{subject.subject_name}</Text>
                      <Text style={s.subjectCode}>
                        {subject.subject_code || 'Subject'}
                        {subject.grade ? ` · Grade ${subject.grade}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={s.subjectScoreClean}>{pct(subject.score)}</Text>
                      <Text style={s.perfTextClean}>{label}</Text>
                    </View>
                    <ChevronRight size={17} color={C.muted} />
                  </View>
                  <Progress
                    value={Math.max(0, Math.min(100, numScore))}
                    style={{ height: 5, backgroundColor: '#F1F5F9', borderRadius: 4, marginTop: 6 }}
                  >
                    <ProgressFilledTrack style={{ backgroundColor: '#F59E0B', borderRadius: 4 }} />
                  </Progress>
                </Pressable>
              );
            })
          ) : (
            <BaseEmptyState
              icon={<SolidBook size={26} color="#000000" secondaryColor="#000000" />}
              title="No recorded subjects"
              description="Subject registrations and assessments for this period have not been published."
            />
          )}
        </View>
      </UnderlineTabs>
    </Page>
  );
}

const s = StyleSheet.create({
  period: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
  },
  segment: {
    marginHorizontal: -4,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 16,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -1px rgba(15, 23, 42, 0.02)',
          cursor: 'pointer',
        }
      : {}),
  },
  subjectRowTitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    color: '#0F172A',
    flex: 1,
  },
  score: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    color: '#0F172A',
  },
  perfTextClean: {
    fontSize: 11.5,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    color: '#D97706',
    textTransform: 'capitalize',
  },
  resultScoreClean: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subjectScoreClean: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    color: '#0F172A',
  },
  remarkItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 16,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 2px 8px -1px rgba(15, 23, 42, 0.05)',
        }
      : {}),
  },
  remarkTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remarkRoleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Manrope_500Medium',
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
  remarkItemBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
  },
  subjectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Manrope_500Medium',
  },
  subjectCode: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
  },
});
