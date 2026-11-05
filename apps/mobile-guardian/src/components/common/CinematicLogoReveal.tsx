import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, G, Path, Rect } from 'react-native-svg';
import { Pressable } from '../ui/pressable';
import { Colors as C } from '../../theme/tokens';
import { useBaseReducedMotion } from '../base-theme';

export interface CinematicLogoRevealProps {
  onComplete: () => void;
  autoPlay?: boolean;
}

export function CleanAcqadEmblem({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="ACQAD emblem">
      <Defs>
        <LinearGradient id="cinematic-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FBBF24" />
          <Stop offset="50%" stopColor="#D97706" />
          <Stop offset="100%" stopColor="#92400E" />
        </LinearGradient>
        <LinearGradient id="cinematic-magenta" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#EC4899" />
          <Stop offset="100%" stopColor="#BE185D" />
        </LinearGradient>
      </Defs>
      <G transform="rotate(-10 50 50)">
        {/* Outer Shield / Geometric Crest */}
        <Path
          d="M20 28 C20 18, 30 14, 46 16 L76 22 C84 24, 88 32, 86 42 L80 74 C78 84, 70 88, 56 86 L26 80 C16 78, 14 70, 16 58 Z"
          fill="url(#cinematic-gold)"
        />
        {/* Accent Facet without opaque black */}
        <Path
          d="M16 58 L26 80 C70 88, 78 84, 80 74 L83 60 C55 68, 30 65, 16 58 Z"
          fill="#FFFFFF"
          opacity={0.3}
        />
        {/* Transparent inner window facet - no black blob */}
        <Path
          d="M32 36 C30 26, 68 28, 72 34 C76 40, 72 68, 66 72 C60 76, 28 72, 32 36 Z"
          fill="url(#cinematic-magenta)"
          opacity={0.15}
        />
        {/* Center Diamond Gem */}
        <Rect
          x={44}
          y={44}
          width={15}
          height={15}
          rx={2}
          transform="rotate(45 51.5 51.5)"
          fill="#F59E0B"
        />
      </G>
    </Svg>
  );
}

export function CinematicLogoReveal({ onComplete, autoPlay = true }: CinematicLogoRevealProps) {
  const reducedMotion = useBaseReducedMotion();

  const logoScale = useSharedValue(reducedMotion ? 1 : 0.6);
  const logoOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const logoRotation = useSharedValue(reducedMotion ? 0 : -15);

  const wordmarkTranslate = useSharedValue(reducedMotion ? 0 : 20);
  const wordmarkOpacity = useSharedValue(reducedMotion ? 1 : 0);

  const taglineOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const overallOpacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      const timer = setTimeout(onComplete, 1200);
      return () => clearTimeout(timer);
    }

    if (!autoPlay) return;

    // Stage 1: Emblem reveal with gentle spring and rotation settle
    logoOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 100 });
    logoRotation.value = withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) });

    // Stage 2: ACQAD Wordmark rises
    wordmarkOpacity.value = withDelay(500, withTiming(1, { duration: 450 }));
    wordmarkTranslate.value = withDelay(
      500,
      withSpring(0, { damping: 15, stiffness: 120 })
    );

    // Stage 3: Brand description reveals
    taglineOpacity.value = withDelay(950, withTiming(1, { duration: 500 }));

    // Stage 4: Fade out and handoff to onboarding
    overallOpacity.value = withDelay(
      2200,
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { rotate: `${logoRotation.value}deg` }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslate.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: overallOpacity.value,
  }));

  return (
    <Animated.View style={[styles.backdrop, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={logoStyle}>
          <CleanAcqadEmblem size={96} />
        </Animated.View>

        <Animated.View style={[styles.wordmarkBlock, wordmarkStyle]}>
          <Text style={styles.brandTitle}>ACQAD</Text>
          <Text style={styles.brandRole}>GUARDIAN</Text>
        </Animated.View>

        <Animated.View style={[styles.taglineBlock, taglineStyle]}>
          <View style={styles.divider} />
          <Text style={styles.taglineText}>Educational Excellence & Family Connection</Text>
        </Animated.View>
      </View>

      <Pressable
        style={styles.skipBtn}
        onPress={onComplete}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0C0D12',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  wordmarkBlock: {
    alignItems: 'center',
    gap: 4,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2.5,
  },
  brandRole: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  taglineBlock: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  divider: {
    width: 40,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  taglineText: {
    fontSize: 12.5,
    color: '#94A3B8',
    letterSpacing: 0.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  skipBtn: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});

