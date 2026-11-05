import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseSettingsBlock } from '../src/components/base-settings-block';
import { BaseSwitch } from '../src/components/base-switch';
import { BaseListRow } from '../src/components/base-list-row';
import { BaseButton } from '../src/components/base-button';
import { useGuardianAuth } from '../src/context/GuardianAuthContext';
import { useRemote, useNotice } from '../src/components/common/NativeUI';
import { requestData } from '../src/api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useGuardianAuth();
  const notice = useNotice();

  const record = useRemote<Record<string, any>>('/api/guardian/profile', token || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fields: Array<[string, string, string]> = [
    ['notify_results', 'Result Publications', 'Instant notification when terminal scores and report cards are released.'],
    ['notify_attendance', 'Daily Attendance', 'Alerts when your child is marked present, late, or absent.'],
    ['notify_fees', 'Fee Invoices & Receipts', 'Reminders for outstanding term tuition and confirmed bursary receipts.'],
    ['notify_messages', 'Teacher & School Messages', 'Notifications for new direct messages from faculty and administration.'],
  ];

  const handleSave = async (key: string, value: boolean) => {
    if (saving) return;
    setSaving(true);
    setError('');

    try {
      const next = Object.fromEntries(
        fields.map(([field]) => [field, field === key ? value : !!record.data?.[field]])
      );
      await requestData('/api/guardian/settings/notifications', {
        method: 'POST',
        body: JSON.stringify(next),
      });
      notice('Preferences saved');
      record.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseSettingsBlock
      onBack={() => router.back()}
      insets={insets}
      profile={{
        name: user?.name || 'Guardian',
        email: user?.email || '',
        initials: user?.name ? user.name.trim().split(/\s+/).slice(0, 2).map((v) => v[0]).join('') : 'GD',
      }}
      copy={{
        title: 'Notification Preferences',
        notifications: 'School Alert Channels',
        version: 'ACQAD Guardian · Verified Institutional Access',
        errorTitle: 'Preferences could not be updated',
      }}
      loading={record.loading}
      error={error || record.error}
      showPreferences={false}
      showDanger={false}
      notificationContent={
        <View style={{ gap: 10, paddingVertical: 4 }}>
          {fields.map(([key, title, description]) => (
            <BaseListRow
              key={key}
              title={title}
              description={description}
              trailing={
                <BaseSwitch
                  value={!!record.data?.[key]}
                  disabled={saving || !record.data}
                  onValueChange={(v) => void handleSave(key, v)}
                  accessibilityLabel={`${title} toggle`}
                />
              }
            />
          ))}
          <Text style={styles.note}>
            Preferences are synced with your school guardian record. Push notification delivery adheres to school communication policies.
          </Text>
          {record.error && (
            <BaseButton variant="outline" onPress={record.reload}>
              Try again
            </BaseButton>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});

