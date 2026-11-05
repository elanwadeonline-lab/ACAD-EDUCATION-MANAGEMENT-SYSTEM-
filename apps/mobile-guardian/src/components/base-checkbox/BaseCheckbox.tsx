import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  baseActivationProps,
  useBaseReducedMotion,
  spring,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

export type BaseCheckboxProps = {
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  theme?: BaseTheme;
  testID?: string;
  accessibilityLabel?: string;
};

const BOX = 16;
// The check icon (polyline 4,12 9,17 20,6 on a 24 grid) at 14px, centered in the 16px box.
const K = 14 / 24;
const A = { x: 1 + 4 * K, y: 1 + 12 * K };
const B = { x: 1 + 9 * K, y: 1 + 17 * K };
const C = { x: 1 + 20 * K, y: 1 + 6 * K };
const STROKE = 2 * K;
const LEG1 = Math.hypot(B.x - A.x, B.y - A.y);
const LEG2 = Math.hypot(C.x - B.x, C.y - B.y);
const SPLIT = LEG1 / (LEG1 + LEG2);

export function BaseCheckbox({
  value: controlled,
  defaultValue = false,
  onValueChange,
  disabled = false,
  theme: override,
  testID,
  accessibilityLabel,
}: BaseCheckboxProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const [internal, setInternal] = useState(defaultValue);
  const checked = controlled ?? internal;
  const reduced = useBaseReducedMotion();

  const fill = useSharedValue(checked ? 1 : 0);
  const draw = useSharedValue(checked ? 1 : 0);
  const pop = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (checked) {
      fill.set(withTiming(1, timing(theme, 'fill', reduced)));
      const delay = reduced ? 0 : (theme.motion.transitions.check.delay ?? 0);
      draw.set(
        withDelay(
          delay,
          withTiming(1, timing(theme, 'check', reduced)),
          ReduceMotion.Never,
        ),
      );
      pop.set(
        reduced
          ? 1
          : withDelay(
              delay,
              withSpring(1, spring(theme, 'checkPop')),
              ReduceMotion.Never,
            ),
      );
    } else {
      draw.set(withTiming(0, timing(theme, 'uncheck', reduced)));
      pop.set(withTiming(0, timing(theme, 'popOut', reduced)));
      fill.set(withTiming(0, timing(theme, 'popOut', reduced)));
    }
  }, [checked, reduced, theme, fill, draw, pop]);

  const toggle = () => {
    if (disabled) return;
    const next = !checked;
    if (controlled === undefined) setInternal(next);
    onValueChange?.(next);
  };
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((_event, success) => {
      if (!success) return;
      scheduleOnRN(toggle);
    });

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.get(),
    transform: [
      {
        scale:
          theme.motion.scales.fill +
          (1 - theme.motion.scales.fill) * fill.get(),
      },
    ],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + 0.5 * pop.get() }],
  }));
  const leg1Style = useAnimatedStyle(() => ({
    width:
      Math.min(1, draw.get() / SPLIT) * LEG1 +
      (draw.get() > 0 ? STROKE / 2 : 0),
  }));
  const leg2Style = useAnimatedStyle(() => ({
    width:
      Math.max(0, (draw.get() - SPLIT) / (1 - SPLIT)) * LEG2 +
      (draw.get() > SPLIT ? STROKE / 2 : 0),
  }));

  const stroke = {
    position: 'absolute' as const,
    height: STROKE,
    borderRadius: STROKE,
    backgroundColor: colors.primaryForeground,
    transformOrigin: 'left center',
  };

  return (
    <GestureDetector gesture={tap}>
      <View
        testID={testID}
        accessible
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked, disabled }}
        aria-checked={checked}
        aria-disabled={disabled}
        {...baseActivationProps(toggle, disabled)}
        style={{
          width: Platform.OS === 'android' ? 48 : 44,
          height: Platform.OS === 'android' ? 48 : 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: BOX,
            height: BOX,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: checked ? colors.primary : colors.input,
            backgroundColor: colors.inputSurface,
            boxShadow: theme.shadow.xs,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: -1,
                left: -1,
                width: BOX,
                height: BOX,
                borderRadius: 4,
                backgroundColor: colors.primary,
              },
              fillStyle,
            ]}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: -1,
                left: -1,
                width: BOX,
                height: BOX,
              },
              iconStyle,
            ]}
          >
            <Animated.View
              style={[
                stroke,
                {
                  left: A.x,
                  top: A.y - STROKE / 2,
                  transform: [
                    { rotate: `${Math.atan2(B.y - A.y, B.x - A.x)}rad` },
                  ],
                },
                leg1Style,
              ]}
            />
            <Animated.View
              style={[
                stroke,
                {
                  left: B.x,
                  top: B.y - STROKE / 2,
                  transform: [
                    { rotate: `${Math.atan2(C.y - B.y, C.x - B.x)}rad` },
                  ],
                },
                leg2Style,
              ]}
            />
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
}
