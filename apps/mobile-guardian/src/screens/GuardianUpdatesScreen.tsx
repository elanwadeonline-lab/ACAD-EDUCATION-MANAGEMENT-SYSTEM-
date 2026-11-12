import React from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseListDetailBlock, type ListDetailItem } from '../components/base-list-detail-block';
import { SolidBell } from '../components/common/SolidIcons';
import { Search } from 'lucide-react-native';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useRemote } from '../components/common/NativeUI';
import { type CalendarEvent } from '../api/client';

export function GuardianUpdatesScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useGuardianAuth();

  const notices = useRemote<{ items: any[]; unreadCount: number }>('/api/guardian/notifications', token || '');
  const events = useRemote<CalendarEvent[]>('/api/v2/calendar', token || '');

  const dateText = (val?: string) =>
    val && Number.isFinite(Date.parse(val))
      ? new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

  const items: ListDetailItem[] = [
    ...(notices.data?.items || []).map((n) => ({
      id: `notice-${n.id}`,
      title: n.type?.replace(/_/g, ' ').toUpperCase() || 'SCHOOL ANNOUNCEMENT',
      description: `${n.message}\n\nPublished: ${dateText(n.created_at)}`,
      initials: 'SC',
      category: ['announcement', 'broadcast', 'school_announcement'].includes(n.type) ? 'announcements' : 'notices',
      badge: n.is_read ? 'School' : 'New',
    })),
    ...(events.data || []).map((e) => ({
      id: `event-${e.id}`,
      title: e.title,
      description: [(e as any).description, `Date: ${dateText(e.start_date)}`, e.venue ? `Venue: ${e.venue}` : ''].filter(Boolean).join('\n\n'),
      initials: 'EV',
      category: 'events',
      badge: 'Academic',
    })),
  ];

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
    <BaseListDetailBlock
      readOnly
      items={items}
      insets={insets}
      onBack={handleBack}
      loading={notices.loading || events.loading}
      error={notices.error || events.error}
      onRetry={() => {
        notices.reload();
        events.reload();
      }}
      filters={[
        { value: 'announcements', label: 'Announcements' },
        { value: 'events', label: 'Events' },
        { value: 'notices', label: 'Notices' },
      ]}
      icons={{
        search: <Search size={18} color={C.muted} />,
        empty: <SolidBell size={32} color="#F59E0B" secondaryColor="#D97706" />,
      }}
      copy={{
        title: 'School Updates',
        subtitle: 'Announcements and notifications from administration',
        search: 'Search updates…',
        filters: 'Categories',
        emptyTitle: 'All caught up',
        emptyDescription: 'New school announcements and circulars will appear here when published.',
        noResults: 'No matching updates',
        noResultsDescription: 'Try selecting a different filter tab or search phrase.',
        errorTitle: 'Updates could not be loaded',
        close: 'Dismiss details',
        reset: 'Show all updates',
      }}
    />
  );
}
