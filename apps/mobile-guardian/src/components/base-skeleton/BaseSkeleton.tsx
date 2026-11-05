import Animated, {
  ReduceMotion,
  cancelAnimation,
  Easing,
  makeMutable,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  useBaseReducedMotion,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect } from 'react';
import {
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// A single UI-thread clock keeps every mounted block in phase, including late arrivals.
const pulse = makeMutable(1);
let subscribers = 0;
function subscribe() {
  if (subscribers++ === 0) {
    pulse.set(1);
    const config = { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) };
    pulse.set(
      withRepeat(
        withSequence(
          ReduceMotion.Never,
          withTiming(0.5, { ...config, reduceMotion: ReduceMotion.Never }),
          withTiming(1, { ...config, reduceMotion: ReduceMotion.Never }),
        ),
        -1,
        undefined,
        undefined,
        ReduceMotion.Never,
      ),
    );
  }
  return () => {
    if (--subscribers === 0) cancelAnimation(pulse);
  };
}

export type BaseSkeletonProps = {
  /** Width in points or a relative dimension. */
  width?: DimensionValue;
  /** Height in points or a relative dimension. */
  height?: DimensionValue;
  /** Overrides the theme corner radius. */
  radius?: number;
  /** Uses the full corner radius; provide equal width and height. */
  circle?: boolean;
  /** Style applied to the container. */
  style?: StyleProp<ViewStyle>;
  /** Overrides the nearest BaseThemeProvider. */
  theme?: BaseTheme;
  /** Stable identifier for the root or trigger. */
  testID?: string;
};

export function BaseSkeleton({
  width = '100%',
  height = 16,
  radius,
  circle = false,
  style,
  theme: override,
  testID,
}: BaseSkeletonProps) {
  const theme = useBaseTheme(override);
  const reduced = useBaseReducedMotion();
  useEffect(() => {
    if (!reduced) return subscribe();
  }, [reduced]);
  const animated = useAnimatedStyle(() => ({
    opacity: reduced ? 0.7 : pulse.get(),
  }));
  return (
    <Animated.View
      testID={testID}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: circle
            ? theme.radius.full
            : (radius ?? theme.radius.md),
          backgroundColor: theme.colors.accent,
        },
        style,
        animated,
      ]}
    />
  );
}

export type BaseSkeletonTextProps = Omit<
  BaseSkeletonProps,
  'circle' | 'height'
> & {
  /** Number of placeholder lines; the final line is 60% wide. */
  lines?: number;
  /** Height of each placeholder line in points. */
  lineHeight?: number;
};
export function BaseSkeletonText({
  lines = 3,
  lineHeight = 14,
  width = '100%',
  style,
  testID,
  ...props
}: BaseSkeletonTextProps) {
  return (
    <View testID={testID} style={[{ width, gap: 8 }, style]}>
      {Array.from({ length: Math.max(0, Math.floor(lines)) }, (_, index) => (
        <BaseSkeleton
          key={index}
          {...props}
          width={index === Math.floor(lines) - 1 ? '60%' : '100%'}
          height={lineHeight}
        />
      ))}
    </View>
  );
}
export default BaseSkeleton;
