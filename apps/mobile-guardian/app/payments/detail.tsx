import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseHeader } from '../../src/components/base-header';
import { BaseSeparator } from '../../src/components/base-separator';
import { Card } from '../../src/components/ui/card';
import { Badge, BadgeText } from '../../src/components/ui/badge';
import { Button, ButtonText } from '../../src/components/ui/button';
import { SolidWallet } from '../../src/components/common/SolidIcons';
import { Colors as C } from '../../src/theme/tokens';
import { useActiveWard } from '../../src/context/ActiveWardContext';
import { money } from '../../src/api/records';

export default function PaymentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data?: string; title?: string }>();
  const { activeWard } = useActiveWard();

  let item: any = {};
  try {
    if (params.data) {
      item = JSON.parse(params.data);
    }
  } catch (e) {
    item = {};
  }

  const title = item.title || item.fee_title || params.title || 'School Fee Invoice';
  const amount = Number(item.amount || item.amount_paid || 0);
  const paid = Number(item.paid ?? item.amount_paid ?? 0);
  const balance = Number(item.balance ?? (amount > paid ? amount - paid : 0));
  const isPaid = item.status === 'paid' || balance === 0;
  const isPartial = item.status === 'partial' || (paid > 0 && balance > 0);
  const statusLabel = isPaid ? 'Fully Paid' : isPartial ? 'Part Paid' : 'Payment Due';

  const dateText = item.due_date ? `Due ${item.due_date}` : item.paid_at ? `Paid on ${new Date(item.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Current Academic Term';
  const refCode = item.payment_ref || item.reference || `ACQAD-FEE-${item.id || 1042}`;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <BaseHeader
        title="Fee Details"
        subtitle={`${activeWard?.name || 'Student'} · Official Invoice`}
        onBack={() => router.back()}
        align="left"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Invoice Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.iconCircle}>
              <SolidWallet size={28} color="#F59E0B" secondaryColor="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroSub}>{dateText}</Text>
            </View>
            <Badge variant="secondary" style={[styles.statusBadge, isPaid ? styles.badgePaid : isPartial ? styles.badgePartial : styles.badgeDue]}>
              <BadgeText style={[styles.statusText, isPaid ? styles.textPaid : isPartial ? styles.textPartial : styles.textDue]}>
                {statusLabel}
              </BadgeText>
            </Badge>
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Total Invoice Amount</Text>
            <Text style={styles.amountValue}>{money(amount)}</Text>
          </View>

          <BaseSeparator inset={0} />

          <View style={styles.splitRow}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Amount Paid</Text>
              <Text style={[styles.splitValue, { color: '#059669' }]}>{money(paid)}</Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Remaining Balance</Text>
              <Text style={[styles.splitValue, { color: balance > 0 ? '#DC2626' : '#10B981' }]}>{money(balance)}</Text>
            </View>
          </View>
        </View>

        {/* Ledger Breakdown */}
        <Text style={styles.sectionHeader}>Itemized Charges</Text>
        <Card style={styles.card}>
          <View style={styles.itemRow}>
            <View>
              <Text style={styles.itemName}>Tuition & Instruction</Text>
              <Text style={styles.itemSub}>Academic curriculum and classroom instruction</Text>
            </View>
            <Text style={styles.itemVal}>{money(amount * 0.75)}</Text>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.itemRow}>
            <View>
              <Text style={styles.itemName}>STEM Laboratory & ICT</Text>
              <Text style={styles.itemSub}>Practical lab consumables and digital infrastructure</Text>
            </View>
            <Text style={styles.itemVal}>{money(amount * 0.15)}</Text>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.itemRow}>
            <View>
              <Text style={styles.itemName}>Library & Educational Materials</Text>
              <Text style={styles.itemSub}>Textbooks, library access and resource manuals</Text>
            </View>
            <Text style={styles.itemVal}>{money(amount * 0.10)}</Text>
          </View>
        </Card>

        {/* Payment Reference & Bank Information */}
        <Text style={styles.sectionHeader}>Bank Payment Information</Text>
        <Card style={styles.bankCard}>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Bank Name</Text>
            <Text style={styles.bankValue}>Zenith Bank PLC</Text>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Name</Text>
            <Text style={styles.bankValue}>ACQAD Educational Academy</Text>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Number</Text>
            <Text style={[styles.bankValue, { fontWeight: '800', letterSpacing: 1 }]}>1012398402</Text>
          </View>
          <BaseSeparator inset={0} />
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Payment Reference</Text>
            <Text style={[styles.bankValue, { color: C.primary, fontWeight: '700' }]}>{refCode}</Text>
          </View>
        </Card>

        <Text style={styles.disclaimer}>
          Please include the payment reference and your child’s registration number ({activeWard?.reg_id || 'Student ID'}) when initiating wire or mobile transfers. Receipts will reflect automatically upon school bursary verification.
        </Text>
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
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePaid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgePartial: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  badgeDue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
  },
  textPaid: {
    color: '#059669',
  },
  textPartial: {
    color: '#D97706',
  },
  textDue: {
    color: '#DC2626',
  },
  amountBlock: {
    paddingVertical: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitItem: {
    flex: 1,
  },
  splitLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  splitValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  splitDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 14,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  bankLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  bankValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  disclaimer: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
});

