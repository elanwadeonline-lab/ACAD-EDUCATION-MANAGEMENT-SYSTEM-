import Animated, {
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  baseActivationProps,
  useBaseReducedMotion,
  alpha,
  BaseThemeProvider,
  spring,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { Children } from 'react';
import { Platform, Text, View, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

export type BaseListRowProps = Omit<ViewProps, 'children'> & {
  title: string;
  description?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outline' | 'muted';
  size?: 'default' | 'sm';
  theme?: BaseTheme;
};
export type BaseListGroupProps = ViewProps & {
  inset?: boolean;
  theme?: BaseTheme;
};
export type BaseListRowIconProps = ViewProps & { theme?: BaseTheme };

export function BaseListRow({
  title,
  description,
  leading,
  trailing,
  onPress,
  variant = 'default',
  size = 'default',
  theme: override,
  style,
  ...props
}: BaseListRowProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const reduced = useBaseReducedMotion();
  const pressScale = useSharedValue(1);
  const fill = useSharedValue(0);
  const pressSpring = spring(theme, 'press');
  const choiceScale = theme.motion.scales.choice;
  const fillTiming = { duration: reduced ? 0 : 100 };
  const idleColor =
    variant === 'muted' ? alpha(colors.muted, 0.5) : alpha(colors.accent, 0);
  const activeColor = alpha(colors.accent, 0.5);
  const tap = Gesture.Tap()
    .enabled(
      !!onPress &&
        !props.accessibilityState?.disabled &&
        !props['aria-disabled'],
    )
    .onBegin(() => {
      pressScale.set(
        reduced
          ? 1
          : withSpring(choiceScale, {
              ...pressSpring,
              reduceMotion: ReduceMotion.Never,
            }),
      );
      fill.set(
        withTiming(1, { ...fillTiming, reduceMotion: ReduceMotion.Never }),
      );
    })
    .onFinalize(() => {
      pressScale.set(
        reduced
          ? 1
          : withSpring(1, { ...pressSpring, reduceMotion: ReduceMotion.Never }),
      );
      fill.set(
        withTiming(0, { ...fillTiming, reduceMotion: ReduceMotion.Never }),
      );
    })
    .onEnd((_event, success) => {
      if (success && onPress) scheduleOnRN(onPress);
    });
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.get() }],
    backgroundColor: interpolateColor(
      fill.get(),
      [0, 1],
      [idleColor, activeColor],
    ),
  }));
  const row = (
    <Animated.View
      {...props}
      {...(onPress
        ? baseActivationProps(onPress, props.accessibilityState?.disabled)
        : {})}
      aria-checked={props['aria-checked'] ?? props.accessibilityState?.checked}
      aria-selected={
        props['aria-selected'] ?? props.accessibilityState?.selected
      }
      aria-expanded={
        props['aria-expanded'] ?? props.accessibilityState?.expanded
      }
      aria-disabled={
        props['aria-disabled'] ?? props.accessibilityState?.disabled
      }
      aria-busy={props['aria-busy'] ?? props.accessibilityState?.busy}
      accessible={onPress ? true : props.accessible}
      accessibilityRole={onPress ? 'button' : props.accessibilityRole}
      accessibilityLabel={
        props.accessibilityLabel ??
        (onPress ? [title, description].filter(Boolean).join('. ') : undefined)
      }
      onAccessibilityTap={onPress ?? props.onAccessibilityTap}
      accessibilityActions={
        onPress ? [{ name: 'activate' }] : props.accessibilityActions
      }
      onAccessibilityAction={(event) => {
        if (onPress && event.nativeEvent.actionName === 'activate') onPress();
        else props.onAccessibilityAction?.(event);
      }}
      {...(onPress && Platform.OS === 'web'
        ? {
            tabIndex: 0,
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onPress();
              }
            },
          }
        : {})}
      style={[
        {
          minHeight: 44,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          paddingHorizontal: 16,
          paddingVertical: size === 'sm' ? 12 : 16,
          gap: size === 'sm' ? 10 : 16,
          flexDirection: 'row',
          alignItems: description ? 'flex-start' : 'center',
        },
        style,
        animated,
      ]}
    >
      <BaseThemeProvider theme={theme}>
        {leading ? (
          <View style={{ paddingTop: description ? 2 : 0, flexShrink: 0 }}>
            {leading}
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: theme.fonts.medium,
              fontSize: 14,
              lineHeight: 20,
              color: colors.foreground,
            }}
          >
            {title}
          </Text>
          {description ? (
            <Text
              numberOfLines={2}
              style={{
                fontFamily: theme.fonts.regular,
                fontSize: 14,
                lineHeight: 20,
                color: colors.mutedForeground,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {trailing ? (
          <View style={{ paddingTop: description ? 2 : 0, flexShrink: 0 }}>
            {trailing}
          </View>
        ) : null}
      </BaseThemeProvider>
    </Animated.View>
  );
  return onPress ? <GestureDetector gesture={tap}>{row}</GestureDetector> : row;
}

export function BaseListGroup({
  children,
  inset = false,
  theme: override,
  style,
  ...props
}: BaseListGroupProps) {
  const theme = useBaseTheme(override);
  const items = Children.toArray(children);
  return (
    <BaseThemeProvider theme={theme}>
      <View
        {...props}
        style={[
          {
            borderRadius: inset ? theme.radius.xl : undefined,
            borderWidth: inset ? 1 : 0,
            borderColor: theme.colors.border,
            backgroundColor: inset ? theme.colors.card : undefined,
          },
          style,
        ]}
      >
        {items.map((child, index) => (
          <React.Fragment
            key={React.isValidElement(child) ? (child.key ?? index) : index}
          >
            {index > 0 ? (
              <View
                aria-hidden
                style={{ height: 1, backgroundColor: theme.colors.border }}
              />
            ) : null}
            {child}
          </React.Fragment>
        ))}
      </View>
    </BaseThemeProvider>
  );
}

export function BaseListRowIcon({
  theme: override,
  style,
  ...props
}: BaseListRowIconProps) {
  const theme = useBaseTheme(override);
  return (
    <View
      {...props}
      style={[
        {
          width: 32,
          height: 32,
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    />
  );
}
