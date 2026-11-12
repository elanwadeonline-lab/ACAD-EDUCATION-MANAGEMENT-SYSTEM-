import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../components/base-header';
import { BaseToggleGroup } from '../components/base-toggle-group';
import { BaseListRow } from '../components/base-list-row';
import { BaseEmptyState } from '../components/base-empty-state';
import { Input, InputField } from '../components/ui/input';
import { Avatar, AvatarFallbackText } from '../components/ui/avatar';
import { Button, ButtonText } from '../components/ui/button';
import { SolidMessage } from '../components/common/SolidIcons';
import { Plus, Users } from 'lucide-react-native';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useActiveWard } from '../context/ActiveWardContext';
import { useRemote,Feedback } from '../components/common/NativeUI';

export function GuardianMessagesScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const { token } = useGuardianAuth();
  const { activeWard } = useActiveWard();

  const [tab, setTab] = useState('0');
  const [search, setSearch] = useState('');
  const [showContacts, setShowContacts] = useState(false);

  const threads = useRemote<any[]>('/api/guardian/messages/threads', `${token}:${activeWard?.id || ''}`);
  const contacts = useRemote<any>(showContacts&&activeWard ? `/api/guardian/messages/contacts?student_id=${activeWard.id}` : null, token || '');

  const threadList = threads.data || [];
  const filteredThreads = threadList.filter((t) => {
    const matchesChild = !t.student_id || Number(t.student_id) === activeWard?.id;
    const matchesTab = tab === '0' || (tab === '1' && t.category === 'teacher') || (tab === '2' && t.category !== 'teacher');
    const matchesSearch = `${t.recipient_name || ''} ${t.last_message || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesChild && matchesTab && matchesSearch;
  });

  const contactList = Array.isArray(contacts.data) ? contacts.data : contacts.data?.contacts || [];

  const handleBack = () => {
    if (showContacts) {
      setShowContacts(false);
    } else if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/home');
    }
  };

  const openThread = (t: any) => {
    router.push({
      pathname: '/messages/[id]',
      params: {
        id: String(t.id),
        name: t.recipient_name || 'Teacher',
        role: t.recipient_role === 'operator' ? 'School administration' : 'Teacher',
      },
    });
  };

  const startThreadWithContact = (c: any) => {
    setShowContacts(false);
    router.push({
      pathname: '/messages/[id]',
      params: {
        id:'new',
        recipientId: String(c.id),
        studentId:String(activeWard?.id||''),
        studentName:activeWard?.name||'',
        name: c.name,
        role: c.role_label || c.role || 'Teacher',
      },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title={showContacts ? 'Choose a contact' : 'Messages'}
        subtitle={activeWard ? `Conversations about ${activeWard.name}` : 'School messages'}
        onBack={handleBack}
        actions={
          !showContacts ? (
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowContacts(true)}
              style={styles.newBtn}
            >
              <Plus size={16} color={C.primary} />
              <ButtonText style={{ color: C.primary, fontSize: 13, fontWeight: '700' }}>New</ButtonText>
            </Button>
          ) : undefined
        }
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={threads.loading || contacts.loading}
            onRefresh={() => {
              threads.reload();
              if (showContacts) contacts.reload();
            }}
            tintColor={C.primary}
          />
        }
      >
        <Text style={styles.subNote}>School conversations stay linked to your child. Updates refresh while the app is open.</Text>
        <Feedback loading={showContacts?contacts.loading:threads.loading} error={showContacts?contacts.error:threads.error} onRetry={()=>showContacts?contacts.reload():threads.reload()}/>
        {showContacts ? (
          <>
            <Text style={styles.subNote}>Select a teacher or administrative staff member to start a conversation:</Text>
            {contactList.map((c: any) => (
              <BaseListRow
                key={c.id}
                title={c.name}
                description={c.role_label || c.role || 'Subject Teacher'}
                leading={
                  <Avatar style={styles.avatar}>
                    <AvatarFallbackText style={{ color: C.primary, fontWeight: '700' }}>{c.name}</AvatarFallbackText>
                  </Avatar>
                }
                onPress={() => startThreadWithContact(c)}
              />
            ))}
            {!contacts.loading && !contactList.length && (
              <BaseEmptyState
                icon={<Users size={28} color={C.primary} />}
                title="No faculty contacts"
                description="No assigned teachers found for this student record."
              />
            )}
          </>
        ) : (
          <>
            <Input style={styles.searchBar}>
              <InputField
                value={search}
                onChangeText={setSearch}
                placeholder="Search teachers or messages…"
                style={styles.searchInput}
              />
            </Input>

            <BaseToggleGroup
              variant="chip"
              attached={false}
              items={[
                { value: '0', label: 'All' },
                { value: '1', label: 'Teachers' },
                { value: '2', label: 'School Admin' },
              ]}
              value={tab}
              onValueChange={(val) => setTab(val || '0')}
              accessibilityLabel="Filter message categories"
            />

            {filteredThreads.map((t) => (
              <BaseListRow
                key={t.id}
                title={t.recipient_name || 'Faculty Member'}
                description={t.last_message || 'Open conversation'}
                leading={
                  <Avatar style={styles.avatar}>
                    <AvatarFallbackText style={{ color: C.primary, fontWeight: '700' }}>
                      {t.recipient_name || 'Staff'}
                    </AvatarFallbackText>
                  </Avatar>
                }
                trailing={
                  <View style={styles.trailingCol}>
                    <Text style={styles.timeText}>
                      {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                    </Text>
                    {t.unread_for_guardian > 0 && <View style={styles.unreadDot} />}
                  </View>
                }
                onPress={() => openThread(t)}
              />
            ))}

            {!threads.loading && !filteredThreads.length && (
              <BaseEmptyState
                icon={<SolidMessage size={36} color={C.primary} secondaryColor={C.primaryDark} />}
                title={search ? 'No matching conversations' : 'No conversations yet'}
                description={search ? 'Try searching for a different teacher name or subject.' : "Use '+ New' above to start a message with your child’s class teacher."}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const MANROPE_MEDIUM =
  Platform.OS === 'web' ? 'Manrope_500Medium, Manrope, sans-serif' : 'Manrope_500Medium';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 14,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    minHeight: 46,
    paddingHorizontal: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 2px 8px -1px rgba(15, 23, 42, 0.05)',
        }
      : {}),
  },
  searchInput: {
    fontSize: 16,
    color: '#0F172A',
    fontFamily: MANROPE_MEDIUM,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: MANROPE_MEDIUM,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  subNote: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    fontFamily: MANROPE_MEDIUM,
    fontWeight: '500',
  },
});
