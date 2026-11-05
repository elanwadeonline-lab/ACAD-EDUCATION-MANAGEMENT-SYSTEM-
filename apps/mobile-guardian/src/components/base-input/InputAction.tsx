import {
  baseActivationProps,
  useBaseReducedMotion,
  spring,
  timing,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const NO_WEB_OUTLINE =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export function InputAction({
  children,
  label,
  onPress,
  disabled,
  theme,
  testID,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled: boolean;
  theme: BaseTheme;
  testID?: string;
}) {
  const reduced = useBaseReducedMotion();
  const pressed = useSharedValue(1);
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .hitSlop(Platform.OS === 'android' ? 2 : 0)
    .onBegin(() => {
      pressed.set(
        reduced
          ? 1
          : withSpring(theme.motion.scales.press, spring(theme, 'press')),
      );
    })
    .onFinalize(() => {
      pressed.set(reduced ? 1 : withSpring(1, spring(theme, 'press')));
    })
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(onPress);
    });
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.get() }],
  }));
  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        aria-disabled={disabled}
        hitSlop={Platform.OS === 'android' ? 2 : 0}

        {...(Platform.OS === 'web'
          ? {
              tabIndex: disabled ? -1 : 0,
              // Gesture Handler activates on key-up; prevent browser scrolling without firing twice.
              onKeyDown: (event: React.KeyboardEvent) => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                }
              },
            }
          : {})}
        {...baseActivationProps(onPress, disabled)}
        style={[
          {
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.md,
          },
          NO_WEB_OUTLINE,
          animated,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/** Keeps both glyphs mounted so a rapid reversal interrupts the current swap. */
export function InputGlyph({
  visible,
  children,
  theme,
  exit = 'swap',
}: {
  visible: boolean;
  children: React.ReactNode;
  theme: BaseTheme;
  exit?: 'swap' | 'popOut';
}) {
  const reduced = useBaseReducedMotion();
  const progress = useSharedValue(exit === 'popOut' ? 0 : visible ? 1 : 0);
  useEffect(() => {
    progress.set(
      reduced
        ? visible
          ? 1
          : 0
        : visible
          ? withSpring(1, spring(theme, 'pop'))
          : withTiming(0, timing(theme, exit)),
    );
  }, [visible, reduced, progress, theme, exit]);
  const animated = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, progress.get())),
    transform: [
      {
        scale: reduced
          ? 1
          : theme.motion.scales.icon +
            (1 - theme.motion.scales.icon) * progress.get(),
      },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      aria-hidden
      style={[{ position: 'absolute', width: 16, height: 16 }, animated]}
    >
      <View>{children}</View>
    </Animated.View>
  );
}
