import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../components/base-header';
import { BaseSeparator } from '../components/base-separator';
import { BaseDialog } from '../components/base-dialog';
import { Avatar, AvatarFallbackText } from '../components/ui/avatar';
import { Button, ButtonText } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { SolidShield } from '../components/common/SolidIcons';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useActiveWard } from '../context/ActiveWardContext';

export function GuardianProfileScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const { user, logout, server } = useGuardianAuth();
  const { wards } = useActiveWard();

  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/more');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title="My Profile"
        subtitle="Guardian account and verified credentials"
        onBack={handleBack}
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityCard}>
          <Avatar style={styles.avatar}>
            <AvatarFallbackText style={styles.avatarText}>
              {user?.name || 'Guardian'}
            </AvatarFallbackText>
          </Avatar>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={styles.name}>{user?.name || 'Verified Guardian'}</Text>
            <Text style={styles.role}>Authorized Guardian · {wards.length} Linked {wards.length === 1 ? 'Ward' : 'Wards'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Account Information</Text>
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user?.name || '—'}</Text>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary Email</Text>
            <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Linked Phone</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Recorded with School Office'}</Text>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Linked Students</Text>
            <Text style={[styles.infoValue, { color: C.primary, fontWeight: '700' }]}>
              {wards.length} Active {wards.length === 1 ? 'Child' : 'Children'}
            </Text>
          </View>
        </Card>

        <Text style={styles.sectionHeader}>Security & School Network</Text>
        <Card style={styles.card}>
          <View style={styles.securityTop}>
            <View style={styles.shieldWrap}>
              <SolidShield size={24} color="#3B82F6" secondaryColor="#1D4ED8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.secTitle}>Session Encryption Active</Text>
              <Text style={styles.secDesc}>
                Device authentication tokens are protected with secure hardware storage.
              </Text>
            </View>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>School Gateway</Text>
            <Text style={styles.infoValue}>{server || 'ACQAD Central Network'}</Text>
          </View>
        </Card>

        <Text style={styles.sectionHeader}>Institutional Support</Text>
        <Card style={styles.card}>
          <Text style={styles.supportText}>
            For corrections to registered names, academic scores, official fee adjustments, or student records, please contact the school administration office directly or use the in-app messaging feature.
          </Text>
          <Button
            variant="outline"
            onPress={() => router.push('/messages')}
            style={{ borderRadius: 12, marginTop: 4 }}
          >
            <ButtonText style={{ color: C.primary, fontWeight: '700' }}>Message School Office</ButtonText>
          </Button>
        </Card>

        <Button
          variant="outline"
          onPress={() => setConfirmSignOut(true)}
          style={styles.signOutBtn}
        >
          <ButtonText style={styles.signOutText}>Sign Out of Guardian Account</ButtonText>
        </Button>
      </ScrollView>

      <BaseDialog
        role="alertdialog"
        visible={confirmSignOut}
        onVisibleChange={setConfirmSignOut}
        title="Sign out of Guardian?"
        description="You will need your school-registered email and password to sign back in."
        footer={
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <Button
              variant="outline"
              onPress={() => setConfirmSignOut(false)}
              style={{ borderRadius: 12, flex: 1 }}
            >
              <ButtonText style={{ color: '#64748B' }}>Cancel</ButtonText>
            </Button>
            <Button
              onPress={() => void logout().catch(() => {})}
              style={{ backgroundColor: '#DC2626', borderRadius: 12, flex: 1 }}
            >
              <ButtonText style={{ color: '#FFFFFF', fontWeight: '700' }}>Sign Out</ButtonText>
            </Button>
          </View>
        }
      />
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
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 20,
    alignItems: 'center',
    gap: 12,
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
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: C.primary,
  },
  name: {
    fontSize: 19,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Manrope_500Medium',
  },
  role: {
    fontSize: 13,
    color: '#64748B',
  },
  email: {
    fontSize: 12,
    color: '#94A3B8',
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
    borderRadius: 20,
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
        }
      : {}),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  securityTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  shieldWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  secDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  supportText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  signOutBtn: {
    borderRadius: 14,
    minHeight: 48,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginTop: 8,
  },
  signOutText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
});
