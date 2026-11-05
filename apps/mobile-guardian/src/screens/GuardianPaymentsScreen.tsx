import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Feedback, Section, Row, Pill, useRemote, ui } from '../components/common/NativeUI';
import { UnderlineTabs } from '../components/common/UnderlineTabs';
import { BaseEmptyState } from '../components/base-empty-state';
import { BaseSlidingNumber } from '../components/base-sliding-number';
import { BaseButton } from '../components/base-button';
import { Card } from '../components/ui/card';
import { SolidWallet } from '../components/common/SolidIcons';
import { Colors as C } from '../theme/tokens';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { useActiveWard } from '../context/ActiveWardContext';
import { feeLedger, money, type Payment } from '../api/records';

const dateText = (value?: string) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date not recorded';

export function GuardianPaymentsScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const { activeWard: w } = useActiveWard();
  const { token } = useGuardianAuth();

  const [tab, setTab] = useState(0);
  const records = useRemote<{ structures: any[]; payments: Payment[] }>(
    w ? `/api/guardian/wards/${w.id}/fees` : null,
    `${token}:${w?.id || ''}`
  );
  const ledger = records.data ? feeLedger(records.data) : null;

  const openPaymentDetail = (item: any) => {
    router.push({
      pathname: '/payments/detail',
      params: {
        title: item.title || item.fee_title || 'Fee Invoice',
        data: JSON.stringify(item),
      },
    });
  };

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
    <Page title="Fees & Payments" onBack={handleBack} refreshing={records.loading} onRefresh={records.reload}>
      <Text style={s.period}>{w?.name} · School ledger</Text>
      <Feedback loading={records.loading} error={records.error} onRetry={records.reload} />

      {ledger && (
        <UnderlineTabs
          tabs={['Overview', 'History']}
          selectedIndex={tab}
          onChange={setTab}
        >
          {/* Pane 0: Overview */}
          <View style={{ gap: 16 }}>
            <Card style={s.balanceCard}>
              <View style={s.balanceHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.balanceLabel}>OUTSTANDING BALANCE</Text>
                  {ledger.invoices.length ? (
                    <BaseSlidingNumber
                      value={ledger.balance}
                      locale="en-NG"
                      format={{ style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }}
                      fontSize={32}
                      color="#0F172A"
                    />
                  ) : (
                    <Text style={ui.metric}>—</Text>
                  )}
                  <Text style={ui.small}>
                    {ledger.invoices.length ? `${ledger.invoices.length} active charges · ${money(ledger.paid)} allocated` : 'No fees published for this period'}
                  </Text>
                </View>
                {/* Clean unboxed wallet vector without colored circle or border */}
                <View style={s.walletClean}>
                  <SolidWallet size={34} color="#F59E0B" secondaryColor="#D97706" />
                </View>
              </View>

              {ledger.balance > 0 && ledger.invoices.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <BaseButton
                    variant="default"
                    fullWidth
                    onPress={() => {
                      const pending = ledger.invoices.find((i) => i.status !== 'paid') || ledger.invoices[0];
                      openPaymentDetail(pending);
                    }}
                  >
                    Pay Fees
                  </BaseButton>
                </View>
              )}
            </Card>

            <Section title="Fee invoices" />
            {ledger.invoices.map((f) => (
              <Row
                key={f.id}
                title={f.title}
                detail={`${money(f.amount)}${f.due_date ? ` · Due ${dateText(f.due_date)}` : ''}`}
                icon={<SolidWallet size={19} color="#F59E0B" secondaryColor="#D97706" />}
                right={
                  <Pill
                    text={f.status === 'partial' ? 'Part paid' : f.status === 'paid' ? 'Paid' : 'Pending'}
                    positive={f.status === 'paid'}
                  />
                }
                onPress={() => openPaymentDetail(f)}
              />
            ))}
          </View>

          {/* Pane 1: History */}
          <View style={{ gap: 16 }}>
            {ledger.payments.length ? (
              ledger.payments.map((p) => (
                <Row
                  key={p.id}
                  title={p.fee_title || 'Recorded payment'}
                  detail={`${dateText(p.paid_at)} · Ref: ${p.payment_ref}`}
                  right={<Text style={s.score}>{money(p.amount_paid)}</Text>}
                  onPress={() => openPaymentDetail(p)}
                />
              ))
            ) : (
              <BaseEmptyState
                icon={<SolidWallet size={32} color="#F59E0B" secondaryColor="#D97706" />}
                title="No payment history"
                description="Confirmed payment receipts from the bursary will be archived here."
              />
            )}
          </View>
        </UnderlineTabs>
      )}
    </Page>
  );
}

const s = StyleSheet.create({
  period: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  segment: {
    marginHorizontal: -4,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 6px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        }
      : {}),
  },
  balanceHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.6,
    fontFamily: 'Manrope_500Medium',
  },
  walletClean: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Manrope_500Medium',
    marginLeft: 'auto',
  },
});
