import Animated, {
  ReduceMotion,
  cancelAnimation,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  useBaseReducedMotion,
  BaseThemeProvider,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BaseHeader } from '../base-header';

export type BlockProps = {
  /** Host-provided safe-area insets. */
  insets?: { top?: number; bottom?: number };
  /** Overrides the shared family theme, including nested controls. */
  theme?: BaseTheme;
  /** Host navigation callback; no router is required. */
  onBack?: () => void;
  /** Accessible name for the back action. */
  backLabel?: string;
  /** Stable identifier on the primary action. */
  testID?: string;
  /** Container layout override. */
  style?: StyleProp<ViewStyle>;
  /** Host-controlled pending state. */
  loading?: boolean;
  /** Host-controlled failure message. */
  error?: string;
};

/** Local layout only; controls and their motion belong to the installed Base pieces. */
export function BlockFrame({
  title,
  subtitle,
  largeTitle = false,
  children,
  actions,
  scroll = true,
  ...props
}: BlockProps & {
  title: string;
  subtitle?: string;
  largeTitle?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  scroll?: boolean;
}) {
  const theme = useBaseTheme(props.theme);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  return (
    <BaseThemeProvider theme={theme}>
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : Platform.OS === 'android'
              ? 'height'
              : undefined
        }
        style={[
          { flex: 1, minHeight: 0, backgroundColor: theme.colors.background },
          props.style,
        ]}
      >
        <BaseHeader
          title={title}
          subtitle={subtitle}
          largeTitle={largeTitle}
          align="left"
          scrollY={scrollY}
          topInset={props.insets?.top ?? 0}
          onBack={props.onBack}
          backLabel={props.backLabel}
          actions={actions}
        />
        {scroll ? (
          <Animated.ScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              padding: theme.space[4],
              paddingBottom: (props.insets?.bottom ?? 0) + theme.space[6],
              gap: theme.space[6],
              width: '100%',
              maxWidth: 640,
              alignSelf: 'center',
            }}
          >
            {children}
          </Animated.ScrollView>
        ) : (
          <View
            style={{
              flex: 1,
              minHeight: 0,
              paddingHorizontal: theme.space[4],
              paddingBottom: props.insets?.bottom ?? 0,
              width: '100%',
              maxWidth: 640,
              alignSelf: 'center',
            }}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </BaseThemeProvider>
  );
}

export function BlockSection({
  children,
  index = 0,
  title,
}: {
  children: React.ReactNode;
  index?: number;
  title?: string;
}) {
  const theme = useBaseTheme();
  const reduced = useBaseReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    progress.set(
      reduced
        ? 1
        : withDelay(
            index * theme.motion.stagger,
            withTiming(1, timing(theme, 'reveal')),
            ReduceMotion.Never,
          ),
    );
    return () => cancelAnimation(progress);
  }, [index, theme, reduced, progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      {
        translateY: reduced
          ? 0
          : (1 - progress.get()) * theme.motion.shifts.handoff,
      },
    ],
  }));
  return (
    <Animated.View style={[{ gap: theme.space[4] }, animated]}>
      {title ? (
        <BlockText muted medium>
          {title}
        </BlockText>
      ) : null}
      {children}
    </Animated.View>
  );
}

export function BlockText({
  children,
  muted = false,
  medium = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  medium?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useBaseTheme();
  return (
    <Text
      style={[
        {
          fontFamily: medium ? theme.fonts.medium : theme.fonts.regular,
          fontSize: 14,
          lineHeight: 20,
          color: muted ? theme.colors.mutedForeground : theme.colors.foreground,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
