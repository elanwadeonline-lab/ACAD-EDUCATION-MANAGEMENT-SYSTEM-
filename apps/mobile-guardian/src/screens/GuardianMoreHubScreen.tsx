import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseListRow } from '../components/base-list-row';
import { BaseDialog } from '../components/base-dialog';
import { Avatar, AvatarFallbackText } from '../components/ui/avatar';
import { Button, ButtonText } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  SolidMessage,
  SolidAttendance,
  SolidCalendar,
  SolidBell,
  SolidShield,
  SolidLinkChild,
} from '../components/common/SolidIcons';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useActiveWard } from '../context/ActiveWardContext';

export function GuardianMoreHubScreen() {
  const router = useRouter();
  const { user, logout } = useGuardianAuth();
  const { wards, openSwitcher } = useActiveWard();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const go = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      {/* Screen reader accessible landmark - visible top-left heading removed per specification */}
      <View
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel="More options and account hub"
        style={styles.srOnly}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card directly below safe area */}
        <View style={styles.profileIdentity}>
          <Avatar style={styles.avatar}>
            <AvatarFallbackText style={styles.avatarText}>
              {user?.name || 'Guardian'}
            </AvatarFallbackText>
          </Avatar>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.role}>
              Authorized Guardian · {wards.length} linked {wards.length === 1 ? 'ward' : 'wards'}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Hub Services */}
        <Text style={styles.sectionHeader}>School Services</Text>
        <Card style={styles.hubCard}>
          <BaseListRow
            title="Messages"
            description="Direct communication with teachers & admin"
            leading={
              <View style={styles.iconClean}>
                <SolidMessage size={22} color="#6366F1" secondaryColor="#4F46E5" />
              </View>
            }
            onPress={() => go('/messages')}
          />
          <BaseListRow
            title="Attendance"
            description="Daily check-in logs and attendance trends"
            leading={
              <View style={styles.iconClean}>
                <SolidAttendance size={22} color="#06B6D4" secondaryColor="#0891B2" />
              </View>
            }
            onPress={() => go('/attendance')}
          />
          <BaseListRow
            title="School calendar"
            description="Term schedule, examinations and dates"
            leading={
              <View style={styles.iconClean}>
                <SolidCalendar size={22} color="#8B5CF6" secondaryColor="#7C3AED" />
              </View>
            }
            onPress={() => go('/calendar')}
          />
          <BaseListRow
            title="School updates"
            description="Announcements, official circulars and events"
            leading={
              <View style={styles.iconClean}>
                <SolidBell size={22} color="#F59E0B" secondaryColor="#D97706" />
              </View>
            }
            onPress={() => go('/updates')}
          />
        </Card>

        {/* Account & Settings */}
        <Text style={styles.sectionHeader}>Account & Preferences</Text>
        <Card style={styles.hubCard}>
          <BaseListRow
            title="My Profile"
            description="Personal verified credentials & security"
            leading={
              <View style={styles.iconClean}>
                <SolidShield size={22} color="#3B82F6" secondaryColor="#1D4ED8" />
              </View>
            }
            onPress={() => go('/profile')}
          />
          <BaseListRow
            title="Linked students"
            description={`${wards.length} approved ${wards.length === 1 ? 'link' : 'links'} (tap to switch active child)`}
            leading={
              <View style={styles.iconClean}>
                <SolidLinkChild size={22} color="#F43F5E" secondaryColor="#E11D48" />
              </View>
            }
            onPress={() => go('/select-child')}
          />
          <BaseListRow
            title="Link another child"
            description="Request student record verification"
            leading={
              <View style={styles.iconClean}>
                <SolidLinkChild size={22} color="#F43F5E" secondaryColor="#E11D48" />
              </View>
            }
            onPress={() => go('/link')}
          />
          <BaseListRow
            title="Notification preferences"
            description="Alerts for results, attendance and fees"
            leading={
              <View style={styles.iconClean}>
                <SolidBell size={22} color="#F59E0B" secondaryColor="#D97706" />
              </View>
            }
            onPress={() => go('/settings')}
          />
        </Card>

        {/* Sign Out Button */}
        <Button
          variant="outline"
          onPress={() => setConfirmSignOut(true)}
          style={styles.signOutBtn}
        >
          <ButtonText style={styles.signOutText}>Sign Out of Guardian Account</ButtonText>
        </Button>
      </ScrollView>

      {/* Confirmation Dialog */}
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
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 24, // Increased horizontal padding
    paddingTop: 16, // Clean spacing below safe area
    paddingBottom: 40,
    gap: 16,
  },
  profileIdentity: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 6px 18px -3px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
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
    fontSize: 24,
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
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  hubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        }
      : {}),
  },
  // Clean unboxed icon styling - NO colored background square, NO border
  iconClean: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
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
