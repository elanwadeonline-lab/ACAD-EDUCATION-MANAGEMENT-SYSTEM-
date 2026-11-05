import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, type Href } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { BrandLogo } from '../components/common/OfficialMark';
import { Page, Button, ui, SchoolInput as TextInput } from '../components/common/NativeUI';
import { BaseSignInBlock } from '../components/base-sign-in-block';
import { BaseSheet } from '../components/base-sheet';
import { CinematicLogoReveal } from '../components/common/CinematicLogoReveal';
import { useGuardianAuth } from '../context/GuardianAuthContext';
import { Colors as C } from '../theme/tokens';

const ONBOARDING_BG = require('../../assets/images/onboarding_guardian.jpg');

export function GuardianEntry() {
  const { user, isLoading, error, signIn, server } = useGuardianAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [signing, setSigning] = useState(false);
  const [address, setAddress] = useState(server);
  const [help, setHelp] = useState(false);
  const insets = useSafeAreaInsets();

  if (user) {
    return <Redirect href={'/(main)/home' as Href} />;
  }

  // Cinematic Logo Introduction plays on initial launch
  if (showSplash) {
    return <CinematicLogoReveal onComplete={() => setShowSplash(false)} />;
  }

  // Sign In Flow powered by BaseSignInBlock
  if (signing) {
    return (
      <>
        <BaseSignInBlock
          copy={{
            title: 'ACQAD Guardian',
            heading: 'Welcome back.',
            description: 'A closer connection to your child’s school day.',
            email: 'Guardian email',
            emailPlaceholder: 'Email or registration identifier',
            forgot: 'Need help signing in?',
            registerHint: 'Accounts and child links are approved by your school.',
            register: 'Contact your school office',
          }}
          brand={
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <BrandLogo size={46} />
            </View>
          }
          providers={[]}
          showRemember={false}
          insets={insets}
          onBack={() => setSigning(false)}
          loading={isLoading}
          error={error}
          validate={(v) => ({
            email: v.email.trim() ? undefined : 'Enter your school account.',
            password: v.password ? undefined : 'Enter your password.',
          })}
          onSubmit={(v) => void signIn(v.email.trim(), v.password, address).catch(() => {})}
          onForgotPassword={() => setHelp(true)}
          onRegister={() => setHelp(true)}
          formAccessory={
            !process.env.EXPO_PUBLIC_API_URL || address ? (
              <View style={{ gap: 8 }}>
                <Text style={ui.label}>School server {Platform.OS === 'web' ? '(leave blank for preview)' : ''}</Text>
                <TextInput
                  accessibilityLabel="School server address"
                  value={address}
                  onChangeText={setAddress}
                  editable={!isLoading}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={ui.input}
                  placeholder="https://your-school.example"
                />
              </View>
            ) : undefined
          }
        />
        <BaseSheet
          visible={help}
          onVisibleChange={setHelp}
          title="Your school can help"
          bottomInset={insets.bottom}
          closeLabel="Close sign-in help"
          footer={<Button label="Back to sign in" onPress={() => setHelp(false)} />}
        >
          <Text style={[ui.muted, { paddingBottom: 20 }]}>
            Contact your school office for a guardian account, a password reset, or your school’s server address. The school verifies your identity before granting access to student records.
          </Text>
        </BaseSheet>
      </>
    );
  }

  // Full-Screen Photography Onboarding Composition
  return (
    <View style={s.container}>
      {/* Full-bleed realistic professional photography spanning container */}
      <Image source={ONBOARDING_BG} style={s.bgImage} resizeMode="cover" />

      {/* Cinematic Gradient Overlay for text contrast */}
      <View style={s.gradientOverlay} />

      {/* Top Branding */}
      <View style={[s.topHeader, { paddingTop: Math.max(insets.top + 10, 36) }]}>
        <BrandLogo size={42} lightText={true} />
      </View>

      {/* Bottom Content Composition */}
      <View style={[s.bottomContent, { paddingBottom: Math.max(insets.bottom + 20, 36) }]}>
        <View style={s.textBlock}>
          <Text style={s.eyebrow}>YOUR FAMILY. THEIR FUTURE.</Text>
          <Text style={s.headline}>Be part of your child’s academic journey.</Text>
          <Text style={s.subhead}>
            Their progress, school messages, and important moments. Together in one place.
          </Text>
        </View>

        {/* Primary Action Button */}
        <Button label="Get Started" disabled={isLoading} onPress={() => setSigning(true)} />

        {/* Sign In Alternative */}
        <Pressable
          style={s.signInLink}
          onPress={() => setSigning(true)}
          accessibilityRole="button"
          accessibilityLabel="Already have an account? Sign in"
        >
          <Text style={s.signInText}>
            Already have a school account? <Text style={s.signInBold}>Sign in</Text>
          </Text>
        </Pressable>

        {/* Trust Badge */}
        <View style={s.trustBadge}>
          <ShieldCheck size={16} color="#FBBF24" />
          <Text style={s.trustText}>Verified, school-approved guardian access.</Text>
        </View>

        {isLoading && <ActivityIndicator color="#F59E0B" style={{ marginTop: 8 }} />}
      </View>
    </View>
  );
}

const SYSTEM_FONT =
  Platform.OS === 'web'
    ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    : 'System';

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0D12',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          width: '100%',
          height: '100vh',
          minHeight: '100vh',
        }
      : {}),
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(12, 13, 18, 0.40)',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(180deg, rgba(12, 13, 18, 0.55) 0%, rgba(12, 13, 18, 0.15) 35%, rgba(12, 13, 18, 0.75) 75%, rgba(12, 13, 18, 0.95) 100%)',
        }
      : {}),
  },
  topHeader: {
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  bottomContent: {
    paddingHorizontal: 24,
    gap: 14,
    zIndex: 10,
  },
  textBlock: {
    gap: 10,
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#FBBF24',
    textTransform: 'uppercase',
    fontFamily: SYSTEM_FONT,
  },
  headline: {
    fontSize: 28,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 36,
    letterSpacing: -0.3,
    fontFamily: SYSTEM_FONT,
  },
  subhead: {
    fontSize: 14.5,
    color: '#E2E8F0',
    lineHeight: 22,
    fontWeight: '500',
    fontFamily: SYSTEM_FONT,
  },
  signInLink: {
    paddingVertical: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  signInText: {
    fontSize: 13.5,
    color: '#E2E8F0',
    fontWeight: '500',
    fontFamily: SYSTEM_FONT,
  },
  signInBold: {
    color: '#FBBF24',
    fontWeight: '500',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 4,
  },
  trustText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: SYSTEM_FONT,
  },
});
