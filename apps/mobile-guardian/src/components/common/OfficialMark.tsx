import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, G, Path, Rect } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

export function BrandLogo({
  size = 38,
  showSubtitle = true,
  lightText = false,
}: {
  size?: number;
  showSubtitle?: boolean;
  lightText?: boolean;
}) {
  return (
    <View style={s.row}>
      <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="ACQAD logo">
        <Defs>
          <LinearGradient id="official-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F59E0B" />
            <Stop offset="45%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#92400E" />
          </LinearGradient>
          <LinearGradient id="official-chrome" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#E2E8F0" />
            <Stop offset="50%" stopColor="#94A3B8" />
            <Stop offset="100%" stopColor="#FFFFFF" />
          </LinearGradient>
        </Defs>
        <G transform="rotate(-12 50 50)">
          {/* Main Shield Crest */}
          <Path
            d="M20 28 C20 18, 30 14, 46 16 L76 22 C84 24, 88 32, 86 42 L80 74 C78 84, 70 88, 56 86 L26 80 C16 78, 14 70, 16 58 Z"
            fill="url(#official-gold)"
          />
          {/* Chrome / Specular Highlight Accent */}
          <Path
            d="M16 58 L26 80 C70 88, 78 84, 80 74 L83 60 C55 68, 30 65, 16 58 Z"
            fill="url(#official-chrome)"
            opacity={0.85}
          />
          {/* Clean transparent inner window - removed unintended opaque black blob */}
          <Path
            d="M32 36 C30 26, 68 28, 72 34 C76 40, 72 68, 66 72 C60 76, 28 72, 32 36 Z"
            fill="#FFFFFF"
            opacity={0.25}
          />
          {/* Center Amber Gem */}
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
      <View>
        <Text style={[s.brand, lightText && { color: '#fff' }]}>ACQAD</Text>
        {showSubtitle && (
          <Text style={[s.subtitle, lightText && { color: '#FEF3C7' }]}>Guardian</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: Colors.ink,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 1,
  },
});
