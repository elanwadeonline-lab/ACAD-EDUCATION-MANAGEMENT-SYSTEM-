import {
  baseActivationProps,
  useBaseReducedMotion,
  spring,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import Animated, {
  ReduceMotion,
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInput as TextInputType,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

export type BaseInputOTPProps = {
  length?: number;
  value?: string;
  onChangeText?: (value: string) => void;
  onComplete?: (code: string) => void;
  groups?: number[];
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  theme?: BaseTheme;
  testID?: string;
  accessibilityLabel?: string;
};

const CELL = 36;
const GAP = 4;
const SEPARATOR = 12;
const ERROR_CURVE = Easing.bezier(0.77, 0, 0.175, 1);

function groupForIndex(index: number, groups: number[]) {
  'worklet';
  let cursor = 0;
  for (let group = 0; group < groups.length; group += 1) {
    const end = cursor + groups[group];
    if (index < end) return group;
    cursor = end;
  }
  return Math.max(0, groups.length - 1);
}

function OTPCell({
  index,
  digit,
  active,
  first,
  last,
  error,
  disabled,
  glyphProgress,
  cursor,
  theme,
}: {
  index: number;
  digit: string;
  active: boolean;
  first: boolean;
  last: boolean;
  error: boolean;
  disabled: boolean;
  glyphProgress: ReturnType<typeof useSharedValue<number>>;
  cursor: ReturnType<typeof useSharedValue<number>>;
  theme: BaseTheme;
}) {
  const { colors } = theme;
  const glyphStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      glyphProgress.get(),
      [index, index + 1],
      [0.6, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          glyphProgress.get(),
          [index, index + 1],
          [0.7, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursor.get() }));
  return (
    <View
      style={{
        width: CELL,
        height: CELL,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderLeftWidth: first ? 1 : 0,
        borderColor: error ? colors.destructive : colors.input,
        borderTopLeftRadius: first ? theme.radius.md : 0,
        borderBottomLeftRadius: first ? theme.radius.md : 0,
        borderTopRightRadius: last ? theme.radius.md : 0,
        borderBottomRightRadius: last ? theme.radius.md : 0,
        backgroundColor: colors.inputSurface,
        boxShadow: theme.shadow.xs,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Animated.Text
        style={[
          {
            fontFamily: theme.fonts.medium,
            fontSize: 14,
            color: colors.foreground,
          },
          glyphStyle,
        ]}
      >
        {digit}
      </Animated.Text>
      {active && !digit ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 1,
              height: 16,
              backgroundColor: colors.foreground,
            },
            cursorStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

export function BaseInputOTP({
  length = 6,
  value = '',
  onChangeText,
  onComplete,
  groups,
  error = false,
  disabled = false,
  autoFocus = false,
  style,
  theme: override,
  testID,
  accessibilityLabel = 'One-time passcode',
}: BaseInputOTPProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const reduced = useBaseReducedMotion();
  const inputRef = useRef<TextInputType>(null);
  const normalizedGroups = useMemo(() => {
    const source = groups?.length ? groups : [length];
    const clean = source
      .filter((item) => item > 0)
      .map((item) => Math.floor(item));
    const total = clean.reduce((sum, item) => sum + item, 0);
    return total === length ? clean : [length];
  }, [groups, length]);
  const digits = value.replace(/\D/g, '').slice(0, length);
  const positions = useMemo(() => {
    const result: number[] = [];
    let x = 0;
    for (let index = 0; index < length; index += 1) {
      result.push(x);
      x += CELL + GAP;
      if (
        index + 1 < length &&
        groupForIndex(index, normalizedGroups) !==
          groupForIndex(index + 1, normalizedGroups)
      ) {
        x += SEPARATOR - GAP;
      }
    }
    return result;
  }, [length, normalizedGroups]);
  const totalWidth = positions[length - 1] + CELL;
  const activeIndex = Math.min(digits.length, length - 1);
  const activeX = useSharedValue(positions[activeIndex] ?? 0);
  const shake = useSharedValue(0);
  const cursor = useSharedValue(0);
  const glyphProgress = useSharedValue(0);
  const [focused, setFocused] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);

  useEffect(() => {
    activeX.set(
      reduced
        ? (positions[activeIndex] ?? 0)
        : withSpring(positions[activeIndex] ?? 0, spring(theme, 'highlight')),
    );
  }, [activeIndex, activeX, positions, reduced, theme]);

  useEffect(() => {
    glyphProgress.set(
      reduced
        ? digits.length
        : withSpring(digits.length, {
            reduceMotion: ReduceMotion.Never,
            stiffness: 500,
            damping: 45,
            mass: 1,
          }),
    );
  }, [digits.length, glyphProgress, reduced]);

  useEffect(() => {
    if (error && !reduced) {
      shake.set(
        withSequence(
          ReduceMotion.Never,
          withTiming(3, {
            reduceMotion: ReduceMotion.Never,
            duration: 80,
            easing: ERROR_CURVE,
          }),
          withTiming(-3, {
            reduceMotion: ReduceMotion.Never,
            duration: 100,
            easing: ERROR_CURVE,
          }),
          withTiming(2, {
            reduceMotion: ReduceMotion.Never,
            duration: 90,
            easing: ERROR_CURVE,
          }),
          withTiming(0, {
            reduceMotion: ReduceMotion.Never,
            duration: 130,
            easing: ERROR_CURVE,
          }),
        ),
      );
    } else {
      shake.set(0);
    }
  }, [error, reduced, shake]);

  useEffect(() => {
    cancelAnimation(cursor);
    if (focused && !disabled && !digits[activeIndex]) {
      cursor.set(
        reduced
          ? 1
          : withRepeat(
              withSequence(
                ReduceMotion.Never,
                withTiming(1, {
                  reduceMotion: ReduceMotion.Never,
                  duration: 500,
                }),
                withTiming(0, {
                  reduceMotion: ReduceMotion.Never,
                  duration: 500,
                }),
              ),
              -1,
              true,
              undefined,
              ReduceMotion.Never,
            ),
      );
    } else cursor.set(0);
    return () => cancelAnimation(cursor);
  }, [activeIndex, cursor, disabled, digits, focused, reduced]);

  useEffect(() => {
    if (autoFocus && !disabled) inputRef.current?.focus();
  }, [autoFocus, disabled]);

  const handleText = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, length);
    onChangeText?.(next);
    if (next.length === length) onComplete?.(next);
  };
  useEffect(() => {
    if (focusRequest > 0 && !disabled) inputRef.current?.focus();
  }, [disabled, focusRequest]);

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .hitSlop(8)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(setFocusRequest, focusRequest + 1);
    });

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeX.get() }, { translateX: shake.get() }],
    borderColor: colors.ring,
    opacity: focused && !disabled ? 1 : 0,
  }));
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        testID={testID}
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        aria-disabled={disabled}
        accessibilityValue={{ text: digits }}
        {...baseActivationProps(
          () => setFocusRequest(focusRequest + 1),
          disabled,
        )}
        style={[
          { width: totalWidth, minHeight: 44, justifyContent: 'center' },
          style,
          shakeStyle,
        ]}
      >
        <TextInput
          ref={inputRef}
          value={digits}
          onChangeText={handleText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityState={{ disabled }}
          aria-disabled={disabled}
          editable={!disabled}
          autoFocus={autoFocus}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          keyboardType="number-pad"
          maxLength={length}
          accessibilityLabel={accessibilityLabel}
          style={[
            {
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              top: 0,
              left: 0,
            },
            Platform.OS === 'web'
              ? ({ outlineStyle: 'none' } as unknown as TextStyle)
              : null,
          ]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {normalizedGroups.map((group, groupIndex) => {
            const start = normalizedGroups
              .slice(0, groupIndex)
              .reduce((sum, item) => sum + item, 0);
            return (
              <React.Fragment key={`group-${groupIndex}`}>
                {groupIndex > 0 ? (
                  <Text
                    style={{
                      width: SEPARATOR,
                      textAlign: 'center',
                      color: colors.mutedForeground,
                      fontSize: 14,
                    }}
                  >
                    –
                  </Text>
                ) : null}
                {Array.from({ length: group }, (_, localIndex) => {
                  const index = start + localIndex;
                  return (
                    <View
                      key={`${groupIndex}-${index}`}
                      testID={testID ? `${testID}-cell-${index}` : undefined}
                      style={{
                        marginRight: localIndex === group - 1 ? 0 : GAP,
                        zIndex: index === activeIndex ? 2 : 1,
                      }}
                    >
                      <OTPCell
                        digit={digits[index] ?? ''}
                        index={index}
                        active={index === activeIndex}
                        first={localIndex === 0}
                        last={localIndex === group - 1}
                        error={error}
                        disabled={disabled}
                        glyphProgress={glyphProgress}
                        cursor={cursor}
                        theme={theme}
                      />
                    </View>
                  );
                })}
              </React.Fragment>
            );
          })}
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 4,
              width: CELL,
              height: CELL,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              boxShadow: `0px 0px 0px 3px ${colors.ringSoft}`,
              zIndex: 3,
            },
            ringStyle,
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export default BaseInputOTP;
