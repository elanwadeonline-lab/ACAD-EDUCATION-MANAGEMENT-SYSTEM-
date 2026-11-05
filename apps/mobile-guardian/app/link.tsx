import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../src/components/base-header';
import { BaseSelect } from '../src/components/base-select';
import { BaseAlert } from '../src/components/base-alert';
import { BaseListRow } from '../src/components/base-list-row';
import { BaseEmptyState } from '../src/components/base-empty-state';
import { Input, InputField } from '../src/components/ui/input';
import { Button, ButtonText } from '../src/components/ui/button';
import { Card } from '../src/components/ui/card';
import { Badge, BadgeText } from '../src/components/ui/badge';
import { SolidLinkChild } from '../src/components/common/SolidIcons';
import { CheckCircle2, AlertCircle, Users } from 'lucide-react-native';
import { Colors as C } from '../src/theme/tokens';
import { useGuardianAuth } from '../src/context/GuardianAuthContext';
import { useActiveWard } from '../src/context/ActiveWardContext';
import { requestData } from '../src/api/client';
import { useRemote, useNotice } from '../src/components/common/NativeUI';

export default function LinkChildScreen() {
  const router = useRouter();
  const { token } = useGuardianAuth();
  const { refreshWards } = useActiveWard();
  const toast = useNotice();

  const [regId, setRegId] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const links = useRemote<any[]>('/api/guardian/links', token || '');

  const relationshipOptions = [
    { value: 'Parent', label: 'Parent', description: 'Mother or Father of the student' },
    { value: 'Mother', label: 'Mother' },
    { value: 'Father', label: 'Father' },
    { value: 'Guardian', label: 'Legal Guardian', description: 'Authorized family guardian' },
    { value: 'Sponsor', label: 'Academic Sponsor', description: 'Responsible for fees and sponsorship' },
  ];

  const handleSubmit = async () => {
    if (!regId.trim() || !relationship.trim() || busy) return;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      await requestData('/api/guardian/links', {
        method: 'POST',
        body: JSON.stringify({
          student_reg_id: regId.trim().toUpperCase(),
          relationship,
        }),
      });

      setRegId('');
      setNotice('Link request submitted successfully. School administration will review and approve within 24 hours.');
      toast('Child link request sent');
      links.reload();
      await refreshWards();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit child link request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title="Link a Child"
        subtitle="Connect your child’s institutional record"
        onBack={() => router.back()}
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={links.loading}
            onRefresh={links.reload}
            tintColor={C.primary}
          />
        }
      >
        {/* Form Card */}
        <Card style={styles.formCard}>
          <View style={styles.formHero}>
            <View style={styles.iconCircle}>
              <SolidLinkChild size={30} color="#F43F5E" secondaryColor="#E11D48" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>Institutional Verification</Text>
              <Text style={styles.formDesc}>
                Enter the student registration ID issued on your child’s admission letter or school badge.
              </Text>
            </View>
          </View>

          {!!error && (
            <BaseAlert
              variant="destructive"
              icon={<AlertCircle size={18} color={C.danger} />}
              title="Request failed"
              description={error}
              onDismiss={() => setError('')}
            />
          )}

          {!!notice && (
            <BaseAlert
              icon={<CheckCircle2 size={18} color={C.success} />}
              title="Request submitted"
              description={notice}
              onDismiss={() => setNotice('')}
            />
          )}

          <View style={{ gap: 6 }}>
            <Text style={styles.inputLabel}>Student Registration ID</Text>
            <Input style={styles.inputBox}>
              <InputField
                value={regId}
                onChangeText={setRegId}
                autoCapitalize="characters"
                placeholder="e.g. REG-MVH7YKJ9"
                style={styles.inputText}
              />
            </Input>
          </View>

          <BaseSelect
            label="Your Relationship to Student"
            value={relationship}
            onValueChange={setRelationship}
            options={relationshipOptions}
            accessibilityLabel="Choose relationship to student"
          />

          <Button
            onPress={handleSubmit}
            disabled={busy || !regId.trim()}
            style={styles.submitBtn}
          >
            <ButtonText style={styles.submitBtnText}>
              {busy ? 'Verifying & Submitting…' : 'Submit Link Request'}
            </ButtonText>
          </Button>
        </Card>

        {/* Existing Link Requests List */}
        <Text style={styles.sectionHeader}>Link Requests & Status</Text>
        <View style={styles.listCard}>
          {(links.data || []).map((l: any) => {
            const isApproved = l.status === 'approved';
            return (
              <BaseListRow
                key={l.id}
                title={l.student_name || l.name || l.student_reg_id || 'Student Link'}
                description={`${l.relationship || 'Guardian'} · Reg: ${l.student_reg_id || 'Submitted'}`}
                trailing={
                  <Badge
                    variant="secondary"
                    style={isApproved ? styles.badgeApproved : styles.badgePending}
                  >
                    <BadgeText style={isApproved ? styles.textApproved : styles.textPending}>
                      {isApproved ? 'APPROVED' : 'PENDING APPROVAL'}
                    </BadgeText>
                  </Badge>
                }
              />
            );
          })}

          {!links.loading && !(links.data || []).length && (
            <BaseEmptyState
              icon={<Users size={28} color={C.primary} />}
              title="No link requests submitted"
              description="Use the form above to connect your first student record."
            />
          )}
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
  formCard: {
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
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.03)',
        }
      : {}),
  },
  formHero: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  formDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  inputText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  badgeApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textApproved: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textPending: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
});

