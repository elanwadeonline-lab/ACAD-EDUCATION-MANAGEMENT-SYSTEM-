import Animated, {
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  useBaseReducedMotion,
  BaseThemeProvider,
  spring,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

export type BaseEmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  bordered?: boolean;
  theme?: BaseTheme;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function Entrance({
  children,
  index,
  icon = false,
  theme,
}: {
  children: React.ReactNode;
  index: number;
  icon?: boolean;
  theme: BaseTheme;
}) {
  const reduced = useBaseReducedMotion();
  const progress = useSharedValue(0);
  const scale = useSharedValue(reduced ? 1 : 0.9);
  useEffect(() => {
    const delay = reduced ? 0 : index * theme.motion.stagger;
    progress.set(
      withDelay(
        delay,
        withTiming(1, timing(theme, 'reveal', reduced)),
        ReduceMotion.Never,
      ),
    );
    scale.set(
      reduced || !icon
        ? 1
        : withDelay(
            delay,
            withSpring(1, spring(theme, 'entrance')),
            ReduceMotion.Never,
          ),
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(scale);
    };
  }, [index, icon, reduced, theme, progress, scale]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      {
        translateY: reduced
          ? 0
          : theme.motion.shifts.handoff * (1 - progress.get()),
      },
      { scale: reduced ? 1 : scale.get() },
    ],
  }));
  return (
    <Animated.View style={[{ alignItems: 'center', width: '100%' }, animated]}>
      {children}
    </Animated.View>
  );
}

export function BaseEmptyState({
  icon,
  title,
  description,
  actions,
  bordered = true,
  theme: override,
  style,
  testID,
}: BaseEmptyStateProps) {
  const theme = useBaseTheme(override);
  return (
    <BaseThemeProvider theme={theme}>
      <View
        testID={testID}
        style={[
          {
            alignItems: 'center',
            gap: 24,
            padding: 24,
            borderRadius: theme.radius.lg,
            borderWidth: bordered ? 1 : 0,
            borderStyle: 'dashed',
            borderColor: theme.colors.border,
          },
          style,
        ]}
      >
        <View style={{ alignItems: 'center', width: '100%' }}>
          {icon ? (
            <Entrance index={0} icon theme={theme}>
              <View
                aria-hidden
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                {icon}
              </View>
            </Entrance>
          ) : null}
          <Entrance index={1} theme={theme}>
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: 18,
                lineHeight: 26,
                textAlign: 'center',
                color: theme.colors.foreground,
              }}
            >
              {title}
            </Text>
          </Entrance>
          {description ? (
            <Entrance index={2} theme={theme}>
              <Text
                style={{
                  marginTop: 8,
                  maxWidth: 384,
                  fontFamily: theme.fonts.regular,
                  fontSize: 14,
                  lineHeight: 14 * 1.625,
                  textAlign: 'center',
                  color: theme.colors.mutedForeground,
                }}
              >
                {description}
              </Text>
            </Entrance>
          ) : null}
        </View>
        {actions ? (
          <Entrance index={3} theme={theme}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 8,
                maxWidth: 384,
              }}
            >
              {actions}
            </View>
          </Entrance>
        ) : null}
      </View>
    </BaseThemeProvider>
  );
}
