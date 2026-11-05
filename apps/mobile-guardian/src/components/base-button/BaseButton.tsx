import {
  useBaseTriggerState,
  baseActivationProps,
  useBaseReducedMotion,
  spring,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export type ButtonVariant =
  'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'default' | 'lg' | 'icon';

export type BaseButtonProps = {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** Icon or element before the label (16px icons match the family). */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  theme?: BaseTheme;
  testID?: string;
  accessibilityLabel?: string;
};

// Visual heights stay compact inside a real 44pt / 48dp interaction target.
const SIZES: Record<
  ButtonSize,
  { height: number; padding: number; font: number; gap: number }
> = {
  xs: { height: 24, padding: 8, font: 12, gap: 4 },
  sm: { height: 32, padding: 12, font: 14, gap: 6 },
  default: { height: 36, padding: 16, font: 14, gap: 8 },
  lg: { height: 40, padding: 24, font: 14, gap: 8 },
  icon: { height: 36, padding: 0, font: 14, gap: 0 },
};

export function BaseButton({
  children,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  leading,
  trailing,
  onPress,
  fullWidth = false,
  style,
  theme: override,
  testID,
  accessibilityLabel,
}: BaseButtonProps) {
  const theme = useBaseTheme(override);
  const triggerState = useBaseTriggerState();
  const { colors } = theme;
  const pressed = useSharedValue(1);
  const reduced = useBaseReducedMotion();
  const dark = theme.scheme === 'dark';
  const s = SIZES[size];

  const surface = {
    default: {
      bg: colors.primary,
      fg: colors.primaryForeground,
      border: undefined,
      shadow: theme.shadow.xs,
    },
    secondary: {
      bg: colors.secondary,
      fg: colors.secondaryForeground,
      border: undefined,
      shadow: theme.shadow.xs,
    },
    outline: {
      bg: dark ? colors.inputSurface : colors.background,
      fg: colors.foreground,
      border: dark ? colors.input : colors.border,
      shadow: theme.shadow.xs,
    },
    ghost: {
      bg: 'transparent',
      fg: colors.foreground,
      border: undefined,
      shadow: undefined,
    },
    destructive: {
      bg: colors.destructiveSurface,
      fg: '#ffffff',
      border: undefined,
      shadow: theme.shadow.xs,
    },
    link: {
      bg: 'transparent',
      fg: colors.primary,
      border: undefined,
      shadow: undefined,
    },
  }[variant];

  const flattened = StyleSheet.flatten(style) ?? {};
  const layoutKeys = new Set([
    'width',
    'minWidth',
    'maxWidth',
    'alignSelf',
    'flex',
    'flexGrow',
    'flexShrink',
    'flexBasis',
    'margin',
    'marginTop',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'marginHorizontal',
    'marginVertical',
    'marginStart',
    'marginEnd',
    'position',
    'top',
    'bottom',
    'left',
    'right',
    'start',
    'end',
    'zIndex',
  ]);
  const layoutStyle = Object.fromEntries(
    Object.entries(flattened).filter(([key]) => layoutKeys.has(key)),
  );
  const surfaceStyle = Object.fromEntries(
    Object.entries(flattened).filter(([key]) => !layoutKeys.has(key)),
  );
  const stretch =
    fullWidth ||
    flattened.width !== undefined ||
    Boolean(flattened.flex || flattened.flexGrow);
  const inactive = disabled || loading;
  const tap = Gesture.Tap()
    .enabled(!inactive)
    .onBegin(() => {
      if (!reduced)
        pressed.set(
          withSpring(theme.motion.scales.press, spring(theme, 'press')),
        );
    })
    .onFinalize(() => {
      pressed.set(reduced ? 1 : withSpring(1, spring(theme, 'press')));
    })
    .onEnd((_event, success) => {
      if (!success) return;
      if (onPress) scheduleOnRN(onPress);
    });

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.get() }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <View
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{
          disabled: inactive,
          busy: loading,
          expanded: triggerState?.expanded,
        }}
        aria-expanded={triggerState?.expanded}
        {...(Platform.OS === 'web' && triggerState
          ? { 'aria-haspopup': 'menu' as const }
          : {})}
        aria-disabled={inactive}
        aria-busy={loading}
        {...baseActivationProps(() => onPress?.(), inactive)}
        style={[
          {
            minHeight: Platform.OS === 'android' ? 48 : 44,
            minWidth: Platform.OS === 'android' ? 48 : 44,
            justifyContent: 'center',
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
          },
          layoutStyle,
          {
            minHeight: Platform.OS === 'android' ? 48 : 44,
            minWidth: Math.max(
              Platform.OS === 'android' ? 48 : 44,
              typeof flattened.minWidth === 'number' ? flattened.minWidth : 0,
            ),
          },
        ]}
      >
        <Animated.View
          style={[
            {
              height: s.height,
              minWidth: size === 'icon' ? s.height : undefined,
              paddingHorizontal: s.padding,
              borderRadius: theme.radius.md,
              borderWidth: surface.border ? 1 : 0,
              borderColor: surface.border,
              backgroundColor: surface.bg,
              boxShadow: surface.shadow,
              opacity: disabled ? 0.5 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: stretch ? 'stretch' : 'center',
              gap: s.gap,
            },
            surfaceStyle,
            animated,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={surface.fg} size="small" />
          ) : (
            leading
          )}
          {typeof children === 'string' ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: s.font,
                lineHeight: 20,
                color: surface.fg,
              }}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {trailing}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
