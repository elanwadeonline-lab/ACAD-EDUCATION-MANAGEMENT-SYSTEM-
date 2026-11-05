import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../../src/components/base-header';
import { Input, InputField } from '../../src/components/ui/input';
import { Button, ButtonText } from '../../src/components/ui/button';
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
  const params = useLocalSearchParams<{ id?: string; name?: string; role?: string; recipientId?: string }>();
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

  const conversation = useRemote<{ thread: any; messages: any[] }>(
    threadId ? `/api/guardian/messages/threads/${threadId}` : null,
    token || ''
  );

  const messages = conversation.data?.messages || [];

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');

    try {
      if (!isNew && threadId) {
        await requestData(`/api/guardian/messages/threads/${threadId}`, {
          method: 'POST',
          body: JSON.stringify({ text: text.trim() }),
        });
      } else if (params.recipientId && activeWard) {
        const result = await requestData<{ threadId: number }>('/api/guardian/messages/new-thread', {
          method: 'POST',
          body: JSON.stringify({
            recipient_id: Number(params.recipientId),
            student_id: activeWard.id,
            text: text.trim(),
          }),
        });
        toast('Conversation started');
        router.replace({
          pathname: `/messages/${result.threadId}`,
          params: { id: String(result.threadId), name: recipientName, role: recipientRole },
        });
        return;
      }
      setText('');
      conversation.reload();
      toast('Message sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title={recipientName}
        subtitle={`${recipientRole} · ${activeWard?.name || 'Student'}`}
        onBack={() => router.back()}
        align="left"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {conversation.loading && (
            <View style={{ gap: 12, paddingVertical: 16 }}>
              <BaseSkeleton width="60%" height={40} radius={14} />
              <BaseSkeleton width="75%" height={50} radius={14} style={{ alignSelf: 'flex-end' }} />
              <BaseSkeleton width="50%" height={36} radius={14} />
            </View>
          )}

          {isNew && !messages.length && (
            <View style={styles.startNotice}>
              <Text style={styles.startTitle}>Start a conversation with {recipientName}</Text>
              <Text style={styles.startDesc}>
                Messages sent here are visible to the teacher and school leadership. Inquiries are typically responded to during school office hours.
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
            <Input style={styles.textInputWrap}>
              <InputField
                value={text}
                onChangeText={setText}
                placeholder={`Message ${recipientName}…`}
                multiline
                maxLength={4000}
                style={styles.textInputField}
              />
            </Input>

            <Button
              onPress={handleSend}
              disabled={sending || !text.trim()}
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
            >
              <Send size={18} color="#FFFFFF" />
            </Button>
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
    borderRadius: 18,
    gap: 4,
  },
  bubbleRight: {
    backgroundColor: '#FEF3C7',
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
    fontSize: 14,
    lineHeight: 20,
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
    color: '#94A3B8',
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  textInputField: {
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
});

