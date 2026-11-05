import React from 'react';
import { useLocalSearchParams, useRouter, Redirect, type Href } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavigation, type TabName } from '../src/components/common/BottomNavigation';
import { Colors } from '../src/theme/tokens';
import { useGuardianAuth } from '../src/context/GuardianAuthContext';
import { GuardianAttendanceScreen } from '../src/screens/GuardianAttendanceScreen';
import { GuardianCalendarScreen } from '../src/screens/GuardianCalendarScreen';
import { GuardianMessagesScreen } from '../src/screens/GuardianMessagesScreen';
import { GuardianUpdatesScreen } from '../src/screens/GuardianUpdatesScreen';
import { GuardianProfileScreen } from '../src/screens/GuardianProfileScreen';
import { GuardianAcademicsScreen } from '../src/screens/GuardianAcademicsScreen';
import { GuardianPaymentsScreen } from '../src/screens/GuardianPaymentsScreen';
import { GuardianHomeScreen } from '../src/screens/GuardianHomeScreen';

export default function GuardianDetail() {
  const { screen } = useLocalSearchParams<{ screen: string }>();
  const { user } = useGuardianAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!user) {
    return <Redirect href={'/' as Href} />;
  }

  const active: TabName =
    screen === 'attendance' || screen === 'academics'
      ? 'Academics'
      : screen === 'payments'
      ? 'Payments'
      : screen === 'home'
      ? 'Home'
      : 'More';

  const paths: Record<TabName, string> = {
    Home: 'home',
    Academics: 'academics',
    Payments: 'payments',
    More: 'more',
  };

  const renderScreen = () => {
    switch (screen) {
      case 'attendance':
        return <GuardianAttendanceScreen onBack={() => router.replace('/(main)/home' as Href)} />;
      case 'calendar':
        return <GuardianCalendarScreen onBack={() => router.replace('/(main)/home' as Href)} />;
      case 'messages':
        return <GuardianMessagesScreen onBack={() => router.replace('/(main)/home' as Href)} />;
      case 'updates':
        return <GuardianUpdatesScreen onBack={() => router.replace('/(main)/home' as Href)} />;
      case 'profile':
        return <GuardianProfileScreen onBack={() => router.replace('/(main)/more' as Href)} />;
      case 'academics':
        return <GuardianAcademicsScreen onBack={() => router.replace('/(main)/home' as Href)} />;
      case 'payments':
        return <GuardianPaymentsScreen onBack={() => router.replace('/(main)/home' as Href)} />;
      default:
        return <GuardianHomeScreen />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.canvas }}>
      <View style={{ flex: 1 }}>{renderScreen()}</View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: Colors.card }}>
        <BottomNavigation
          activeTab={active}
          onTabPress={(tab) => router.replace(`/(main)/${paths[tab]}` as Href)}
        />
      </View>
    </View>
  );
}
