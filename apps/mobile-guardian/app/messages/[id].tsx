import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, KeyboardAvoidingView,TextInput,Pressable,RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../../src/components/base-header';
import { BaseAlert } from '../../src/components/base-alert';
import { BaseSkeleton } from '../../src/components/base-skeleton';
import { Send, AlertCircle } from 'lucide-react-native';
import { Colors as C } from '../../src/theme/tokens';
import { useGuardianAuth } from '../../src/context/GuardianAuthContext';
import { useActiveWard } from '../../src/context/ActiveWardContext';
import { requestData } from '../../src/api/client';
import { useRemote, useNotice } from '../../src/components/common/NativeUI';

export default function MessageThreadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string; role?: string; recipientId?: string; studentId?:string;studentName?:string }>();
  const { user, token } = useGuardianAuth();
  const { activeWard } = useActiveWard();
  const toast = useNotice();

  const isNew = params.id === 'new';
  const threadId = !isNew ? params.id : null;
  const recipientName = params.name || 'School Faculty';
  const recipientRole = params.role || 'Teacher';

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const followLatest=useRef(true),sendLock=useRef(false);

  const conversation = useRemote<{ thread: any; messages: any[] }>(
    threadId ? `/api/guardian/messages/threads/${threadId}` : null,
    token || ''
  );

  const messages = conversation.data?.messages || [];

  useEffect(() => {
    if(followLatest.current)scrollViewRef.current?.scrollToEnd({ animated: false });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sendLock.current) return;
    sendLock.current=true;followLatest.current=true;
    setSending(true);
    setError('');

    try {
      if (!isNew && threadId) {
        await requestData(`/api/guardian/messages/threads/${threadId}`, {
          method: 'POST',
          body: JSON.stringify({ text: text.trim() }),
        });
      } else if (params.recipientId && (params.studentId||activeWard?.id)) {
        const result = await requestData<{ threadId: number }>('/api/guardian/messages/new-thread', {
          method: 'POST',
          body: JSON.stringify({
            recipient_id: Number(params.recipientId),
            student_id: Number(params.studentId||activeWard?.id),
            text: text.trim(),
          }),
        });
        toast('Conversation started');
        router.replace({
          pathname: '/messages/[id]',
          params: { id: String(result.threadId), name: recipientName, role: recipientRole },
        });
        return;
      } else {throw new Error('Choose your child and a school contact before sending.');}
      setText('');
      conversation.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message could not be sent.');
    } finally {
      sendLock.current=false;setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title={recipientName}
        subtitle={`${recipientRole} · ${conversation.data?.thread?.student_name || params.studentName || activeWard?.name || 'Student'}`}
        onBack={()=>router.canGoBack()?router.back():router.replace('/messages')}
        align="left"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          refreshControl={<RefreshControl refreshing={conversation.loading} onRefresh={conversation.reload} tintColor={C.primary}/>}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={()=>{if(followLatest.current)scrollViewRef.current?.scrollToEnd({animated:false});}}
          onScroll={event=>{const {layoutMeasurement,contentOffset,contentSize}=event.nativeEvent;followLatest.current=contentSize.height-contentOffset.y-layoutMeasurement.height<80;}}
          scrollEventThrottle={100}
        >
          {conversation.loading && (
            <View style={{ gap: 12, paddingVertical: 16 }}>
              <BaseSkeleton width="60%" height={40} radius={14} />
              <BaseSkeleton width="75%" height={50} radius={14} style={{ alignSelf: 'flex-end' }} />
              <BaseSkeleton width="50%" height={36} radius={14} />
            </View>
          )}

          {!!conversation.error&&<BaseAlert variant="destructive" title="Connection interrupted" description="Your last messages and draft are kept. Reopen this conversation or pull to refresh your messages."/>}
          {isNew && !messages.length && (
            <View style={styles.startNotice}>
              <Text style={styles.startTitle}>Start a conversation with {recipientName}</Text>
              <Text style={styles.startDesc}>
                Ask about lessons, attendance or your child’s progress. Your message stays linked to this student record.
              </Text>
            </View>
          )}

          {messages.map((m: any) => {
            const isMe = m.sender_role === 'guardian' || m.sender_id === user?.id;
            const time = m.created_at ? new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <View
                key={m.id}
                style={[
                  styles.bubbleWrap,
                  isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft,
                ]}
              >
                <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  <Text style={[styles.bubbleText, isMe ? styles.textRight : styles.textLeft]}>
                    {m.text}
                  </Text>
                  <Text style={[styles.bubbleTime, isMe ? styles.timeRight : styles.timeLeft]}>
                    {time}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputArea}>
          {!!error && (
            <BaseAlert
              variant="destructive"
              icon={<AlertCircle size={16} color={C.danger} />}
              title="Could not send"
              description={error}
              onDismiss={() => setError('')}
              style={{ marginBottom: 8 }}
            />
          )}

          <View style={styles.inputRow}>
            <View style={styles.textInputWrap}>
              <TextInput
                accessibilityLabel="Message to school"
                editable={!sending}
                value={text}
                onChangeText={setText}
                placeholder={`Message ${recipientName}…`}
                multiline
                maxLength={4000}
                style={styles.textInputField}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={sending?'Sending message':'Send message'}
              onPress={handleSend}
              disabled={sending || !text.trim() || (isNew&&!params.recipientId) || (!isNew&&!!conversation.error)}
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
            >
              <Send size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  bubbleWrap: {
    width: '100%',
    flexDirection: 'row',
  },
  bubbleWrapRight: {
    justifyContent: 'flex-end',
  },
  bubbleWrapLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  bubbleRight: {
    backgroundColor: C.primaryLight,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 24,
  },
  textRight: {
    color: '#0F172A',
  },
  textLeft: {
    color: '#1E293B',
  },
  bubbleTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  timeRight: {
    color: '#92400E',
  },
  timeLeft: {
    color: C.muted,
  },
  startNotice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  startTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  startDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  inputArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInputWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  textInputField: {
    fontSize: 16,
    lineHeight:22,
    color: C.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
});

