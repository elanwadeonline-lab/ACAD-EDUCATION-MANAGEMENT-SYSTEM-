import {
  baseActivationProps,
  useBaseReducedMotion,
  alpha,
  BaseThemeProvider,
  spring,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import X from 'lucide-react-native/icons/x';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const NO_WEB_OUTLINE =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export type BaseAlertProps = {
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  visible?: boolean;
  dismissLabel?: string;
  theme?: BaseTheme;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function BaseAlert({
  variant = 'default',
  icon,
  title,
  description,
  action,
  onDismiss,
  visible = true,
  dismissLabel = 'Dismiss alert',
  theme: override,
  style,
  testID,
}: BaseAlertProps) {
  const theme = useBaseTheme(override);
  const reduced = useBaseReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const [closing, setClosing] = useState(false);
  const opacity = useSharedValue(0);
  const shift = useSharedValue(reduced ? 0 : -theme.motion.shifts.handoff);
  const measured = useSharedValue(0);
  const height = useSharedValue(-1);
  const pressed = useSharedValue(1);
  const dismissCallback = useRef(onDismiss);
  useEffect(() => {
    dismissCallback.current = onDismiss;
  }, [onDismiss]);
  const finish = useCallback(() => {
    setMounted(false);
    dismissCallback.current?.();
  }, []);
  const [previousVisible, setPreviousVisible] = useState(visible);
  if (previousVisible !== visible) {
    setPreviousVisible(visible);
    if (visible) {
      setMounted(true);
      setClosing(false);
    } else setClosing(true);
  }
  useEffect(() => {
    if (!mounted) return;
    if (closing) {
      cancelAnimation(shift);
      opacity.set(
        withTiming(0, timing(theme, 'dismiss', reduced), (finished) => {
          if (!finished) return;
          height.set(measured.get());
          height.set(
            withTiming(0, timing(theme, 'collapse', reduced), (collapsed) => {
              if (collapsed) scheduleOnRN(finish);
            }),
          );
        }),
      );
    } else {
      height.set(-1);
      if (opacity.get() === 0)
        shift.set(reduced ? 0 : -theme.motion.shifts.handoff);
      shift.set(withTiming(0, timing(theme, 'reveal', reduced)));
      opacity.set(withTiming(1, timing(theme, 'reveal', reduced)));
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(height);
      cancelAnimation(shift);
    };
  }, [
    closing,
    mounted,
    reduced,
    theme,
    opacity,
    height,
    measured,
    shift,
    finish,
  ]);
  const requestDismiss = () => {
    if (!closing) setClosing(true);
  };
  const tap = Gesture.Tap()
    .enabled(!!onDismiss && !closing)
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
      if (success) scheduleOnRN(requestDismiss);
    });
  const clipStyle = useAnimatedStyle(() => ({
    height: height.get() < 0 ? 'auto' : height.get(),
  }));
  const entrance = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      {
        translateY: reduced ? 0 : shift.get(),
      },
    ],
  }));
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.get() }],
  }));
  const color =
    variant === 'destructive'
      ? theme.colors.destructive
      : theme.colors.cardForeground;
  if (!mounted) return null;
  return (
    <BaseThemeProvider theme={theme}>
      <Animated.View
        testID={testID}
        style={[{ overflow: 'hidden' }, style, clipStyle]}
        pointerEvents={closing ? 'none' : 'auto'}
        aria-hidden={closing}
        accessibilityElementsHidden={closing}
        importantForAccessibility={closing ? 'no-hide-descendants' : 'auto'}
      >
        <Animated.View
          accessibilityRole={variant === 'destructive' ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          onLayout={(event) => {
            measured.set(event.nativeEvent.layout.height);
          }}
          style={[
            {
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.card,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            },
            entrance,
          ]}
        >
          {icon ? (
            <View aria-hidden style={{ width: 16, height: 16, marginTop: 2 }}>
              {icon}
            </View>
          ) : null}
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: 14,
                lineHeight: 20,
                letterSpacing: -0.35,
                color,
              }}
            >
              {title}
            </Text>
            {description ? (
              <Text
                style={{
                  fontFamily: theme.fonts.regular,
                  fontSize: 14,
                  lineHeight: 14 * 1.625,
                  color:
                    variant === 'destructive'
                      ? alpha(color, 0.9)
                      : theme.colors.mutedForeground,
                }}
              >
                {description}
              </Text>
            ) : null}
            {action ? (
              <View
                style={{
                  paddingTop: theme.space[2],
                  alignSelf: 'flex-start',
                  maxWidth: '100%',
                }}
              >
                {action}
              </View>
            ) : null}
          </View>
          {onDismiss ? (
            <GestureDetector gesture={tap}>
              <Animated.View
                testID={testID ? `${testID}-dismiss` : undefined}
                accessible
                accessibilityRole="button"
                accessibilityLabel={dismissLabel}
                hitSlop={Platform.OS === 'android' ? 2 : 0}

                {...(Platform.OS === 'web'
                  ? {
                      tabIndex: closing ? -1 : 0,
                      // Gesture Handler activates on key-up; prevent browser scrolling without firing twice.
                      onKeyDown: (event: React.KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                        }
                      },
                    }
                  : {})}
                {...baseActivationProps(requestDismiss, closing)}
                style={[
                  {
                    width: 44,
                    height: 44,
                    marginTop: -8,
                    marginRight: -12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: theme.radius.md,
                  },
                  NO_WEB_OUTLINE,
                  pressStyle,
                ]}
              >
                <X size={16} color={color} />
              </Animated.View>
            </GestureDetector>
          ) : null}
        </Animated.View>
      </Animated.View>
    </BaseThemeProvider>
  );
}
