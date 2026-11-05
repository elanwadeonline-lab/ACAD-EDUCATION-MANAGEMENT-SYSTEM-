import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  useBaseReducedMotion,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect } from 'react';
import { Text, View, type TextStyle } from 'react-native';

export type BaseSlidingNumberProps = {
  value: number;
  /** Intl options, e.g. { style: 'currency', currency: 'USD' }. */
  format?: Intl.NumberFormatOptions;
  locale?: string;
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  fontFamily?: string;
  theme?: BaseTheme;
  testID?: string;
};

// Each digit is a 0–9 wheel that springs to its place (Motion: stiffness 200, damping 20, mass 0.4).
const DIGIT_SPRING = { stiffness: 200, damping: 20, mass: 0.4 };

export function BaseSlidingNumber({
  value,
  format,
  locale = 'en-US',
  fontSize = 24,
  lineHeight,
  color,
  fontFamily,
  theme: override,
  testID,
}: BaseSlidingNumberProps) {
  const theme = useBaseTheme(override);
  const height = lineHeight ?? Math.round(fontSize * 1.25);
  const text = new Intl.NumberFormat(locale, format).format(value);
  const style: TextStyle = {
    fontSize,
    lineHeight: height,
    height,
    color: color ?? theme.colors.foreground,
    fontFamily: fontFamily ?? theme.fonts.semibold,
    fontVariant: ['tabular-nums'],
  };
  // Key digits from the right so units stay units when the number grows.
  const chars = text.split('');
  let digitIndex = 0;
  const keyed = chars
    .map((ch) => ({ ch, isDigit: /\d/.test(ch) }))
    .reverse()
    .map((c, i) => ({
      ...c,
      key: c.isDigit ? `d${digitIndex++}` : `s${i}${c.ch}`,
    }))
    .reverse();

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={{ flexDirection: 'row', height, overflow: 'hidden' }}
    >
      {keyed.map(({ ch, isDigit, key }) =>
        isDigit ? (
          <Digit key={key} digit={Number(ch)} height={height} style={style} />
        ) : (
          <Text key={key} style={style} aria-hidden>
            {ch}
          </Text>
        ),
      )}
    </View>
  );
}

function Digit({
  digit,
  height,
  style,
}: {
  digit: number;
  height: number;
  style: TextStyle;
}) {
  const reduced = useBaseReducedMotion();
  const position = useSharedValue(digit);
  useEffect(() => {
    position.set(
      reduced
        ? digit
        : withSpring(digit, {
            ...DIGIT_SPRING,
            reduceMotion: ReduceMotion.Never,
          }),
    );
  }, [digit, reduced, position]);
  const wheel = useAnimatedStyle(() => ({
    transform: [{ translateY: -position.get() * height }],
  }));
  return (
    // The wheels are visual only: the root view carries the formatted value for screen readers.
    <View
      style={{ height, overflow: 'hidden' }}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[style, { opacity: 0 }]}>0</Text>
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, wheel]}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Text key={n} style={[style, { textAlign: 'center' }]}>
            {n}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}
