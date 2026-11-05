import { Platform, View } from 'react-native';
import {
  baseActivationProps,
  useBaseReducedMotion,
  spring,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export type BaseSwitchProps = {
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  theme?: BaseTheme;
  testID?: string;
  accessibilityLabel?: string;
};

// Track 32 x 18.4 with a 1px transparent border, thumb 16.
const TRACK_W = 32;
const TRACK_H = 18.4;
const THUMB = 16;
const INNER = TRACK_W - 2;

export function BaseSwitch({
  value: controlled,
  defaultValue = false,
  onValueChange,
  disabled = false,
  theme: override,
  testID,
  accessibilityLabel,
}: BaseSwitchProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const [internal, setInternal] = useState(defaultValue);
  const checked = controlled ?? internal;
  const reduced = useBaseReducedMotion();

  // position: 0 at the start, 1 at the end. width: the thumb's width, stretched while pressed.
  const position = useSharedValue(checked ? 1 : 0);
  const width = useSharedValue(THUMB);
  const color = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    position.set(
      reduced
        ? checked
          ? 1
          : 0
        : withSpring(checked ? 1 : 0, spring(theme, 'thumb')),
    );
    color.set(withTiming(checked ? 1 : 0, timing(theme, 'color', reduced)));
  }, [checked, reduced, theme, position, color]);

  const toggle = () => {
    if (disabled) return;
    const next = !checked;
    if (controlled === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const stretched = THUMB * theme.motion.stretch;
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      if (!reduced) width.set(withSpring(stretched, spring(theme, 'thumb')));
    })
    .onFinalize(() => {
      width.set(reduced ? THUMB : withSpring(THUMB, spring(theme, 'thumb')));
    })
    .onEnd((_event, success) => {
      if (!success) return;
      scheduleOnRN(toggle);
    });

  const dark = theme.scheme === 'dark';
  // dark:data-[state=unchecked]:bg-input/80
  const offTrack = dark ? 'rgba(255,255,255,0.12)' : colors.input;
  const offThumb = dark ? colors.foreground : colors.background;
  const onThumb = dark ? colors.primaryForeground : colors.background;

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      color.get(),
      [0, 1],
      [offTrack, colors.primary],
    ),
  }));
  // The thumb keeps its far edge anchored, so a stretch grows toward the side it is heading to.
  const thumbStyle = useAnimatedStyle(() => ({
    width: width.get(),
    transform: [{ translateX: position.get() * (INNER - width.get()) }],
    backgroundColor: interpolateColor(color.get(), [0, 1], [offThumb, onThumb]),
  }));

  return (
    <GestureDetector gesture={tap}>
      <View
        testID={testID}
        accessible
        accessibilityRole="switch"
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
        <Animated.View
          style={[
            {
              width: TRACK_W,
              height: TRACK_H,
              borderRadius: theme.radius.full,
              borderWidth: 1,
              borderColor: 'transparent',
              justifyContent: 'center',
              boxShadow: theme.shadow.xs,
              opacity: disabled ? 0.5 : 1,
            },
            trackStyle,
          ]}
        >
          <Animated.View
            style={[
              { height: THUMB, borderRadius: theme.radius.full },
              thumbStyle,
            ]}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
