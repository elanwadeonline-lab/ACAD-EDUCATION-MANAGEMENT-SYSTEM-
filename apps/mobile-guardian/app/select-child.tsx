import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../src/components/base-header';
import { Card } from '../src/components/ui/card';
import { Avatar, AvatarFallbackText, AvatarImage } from '../src/components/ui/avatar';
import { Badge, BadgeText } from '../src/components/ui/badge';
import { BaseButton } from '../src/components/base-button';
import { BaseEmptyState } from '../src/components/base-empty-state';
import { SolidLinkChild } from '../src/components/common/SolidIcons';
import { Check, Plus, ChevronRight } from 'lucide-react-native';
import { Colors as C } from '../src/theme/tokens';
import { useActiveWard } from '../src/context/ActiveWardContext';
import { API_BASE_URL } from '../src/api/client';

const DANIEL_AVATAR = require('../assets/images/student_daniel.jpg');

export default function SelectChildScreen() {
  const router = useRouter();
  const { wards, activeWard, setActiveWard } = useActiveWard();

  const handleSelect = (ward: any) => {
    setActiveWard(ward);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/home');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title="Choose a Student"
        subtitle="Switch active child records & view"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(main)/home');
          }
        }}
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.instruction}>
          Select a child to view their academic assessments, fee balances, and daily attendance records.
        </Text>

        <View style={styles.list}>
          {wards.map((ward) => {
            const isSelected = activeWard?.id === ward.id;
            const imageUrl = ward.image_url
              ? ward.image_url.startsWith('/')
                ? API_BASE_URL + ward.image_url
                : ward.image_url
              : null;

            const isDaniel = ward.name?.toLowerCase().includes('daniel');
            const avatarSrc = imageUrl ? { uri: imageUrl } : isDaniel ? DANIEL_AVATAR : null;

            return (
              <Pressable
                key={ward.id}
                onPress={() => handleSelect(ward)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${ward.name}`}
                style={({ pressed }) => [
                  styles.wardCard,
                  isSelected && styles.wardCardActive,
                  pressed && styles.wardCardPressed,
                ]}
              >
                <Avatar style={styles.avatar}>
                  <AvatarFallbackText style={styles.avatarText}>
                    {ward.name}
                  </AvatarFallbackText>
                  {avatarSrc && (
                    <AvatarImage
                      source={avatarSrc}
                      accessibilityLabel={`${ward.name} profile`}
                      style={styles.avatarImage}
                    />
                  )}
                </Avatar>

                <View style={styles.wardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.wardName}>{ward.name}</Text>
                    {isSelected && (
                      <Badge variant="secondary" style={styles.selectedBadge}>
                        <Check size={12} color="#059669" strokeWidth={2.5} />
                        <BadgeText style={styles.selectedText}>Active</BadgeText>
                      </Badge>
                    )}
                  </View>
                  <Text style={styles.wardClass}>
                    {ward.grade || ward.class_name || 'Class not assigned'}
                    {ward.school_name ? ` · ${ward.school_name}` : ''}
                  </Text>
                  <Text style={styles.wardReg}>
                    ID: {ward.reg_id || 'School record linked'}
                  </Text>
                </View>

                {!isSelected && (
                  <View style={styles.actionArrow}>
                    <ChevronRight size={18} color="#94A3B8" />
                  </View>
                )}
              </Pressable>
            );
          })}

          {!wards.length && (
            <BaseEmptyState
              icon={<SolidLinkChild size={36} color="#F43F5E" secondaryColor="#E11D48" />}
              title="No children linked yet"
              description="Request an institutional link using your child’s student registration ID."
            />
          )}
        </View>

        {/* Link Another Child Action Card */}
        <Card style={styles.linkCard}>
          <View style={styles.linkCardContent}>
            <View style={styles.linkIconWrap}>
              <SolidLinkChild size={24} color="#F43F5E" secondaryColor="#E11D48" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.linkCardTitle}>Need to add another student?</Text>
              <Text style={styles.linkCardSub}>
                Submit an admission registration ID for school administration verification.
              </Text>
            </View>
          </View>
          <BaseButton
            variant="outline"
            fullWidth
            onPress={() => router.push('/link')}
            style={{ marginTop: 8 }}
          >
            Link a Child
          </BaseButton>
        </Card>
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
  instruction: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    paddingHorizontal: 2,
  },
  list: {
    gap: 12,
  },
  wardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.02)',
          cursor: 'pointer',
          transition: 'box-shadow 0.15s ease',
        }
      : {}),
  },
  wardCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.75,
  },
  wardCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 17,
  },
  wardInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  wardClass: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  wardReg: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  selectedBadge: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  actionArrow: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 16,
    gap: 10,
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  linkCardContent: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  linkCardSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});

