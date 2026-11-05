import {
  baseActivationProps,
  useBaseReducedMotion,
  BaseThemeProvider,
  spring,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import Animated, {
  ReduceMotion,
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  AccessibilityInfo,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import X from 'lucide-react-native/icons/x';

export type BaseDialogProps = {
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  /** Supply secondary actions first and the primary action last. */
  footer?: React.ReactNode;
  dismissible?: boolean;
  showCloseButton?: boolean;
  closeLabel?: string;
  role?: 'dialog' | 'alertdialog';
  media?: React.ReactNode;
  theme?: BaseTheme;
  testID?: string;
};

const DIALOG_SPRING = { stiffness: 150, damping: 25, mass: 1 };

function fullWidthActions(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (
      !React.isValidElement<{
        children?: React.ReactNode;
        style?: StyleProp<ViewStyle>;
      }>(child)
    )
      return child;
    if (child.type === React.Fragment) {
      return React.cloneElement(
        child,
        {},
        fullWidthActions(child.props.children),
      );
    }
    return React.cloneElement(child, {
      style: [child.props.style, { alignSelf: 'stretch', width: '100%' }],
    });
  });
}

export function BaseDialog({
  visible: controlled,
  defaultVisible = false,
  onVisibleChange,
  title,
  description,
  children,
  footer,
  dismissible = true,
  showCloseButton = true,
  closeLabel = 'Close',
  role = 'dialog',
  media,
  theme: override,
  testID,
}: BaseDialogProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const reduced = useBaseReducedMotion();
  const { width, height } = useWindowDimensions();
  const titleId = useId();
  const descriptionId = useId();
  const heading = useRef<React.ElementRef<typeof Text>>(null);
  const [internal, setInternal] = useState(defaultVisible);
  const visible = controlled ?? internal;
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const transition = useRef(0);
  const pose = useSharedValue(0);
  const opacity = useSharedValue(0);
  const shade = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const pressSpring = spring(theme, 'press');
  const buttonScale = theme.motion.scales.press;
  const finishExit = useCallback((version: number) => {
    if (transition.current === version) setMounted(false);
  }, []);

  useEffect(() => {
    const lifecycle = transition;
    const version = ++lifecycle.current;
    if (!mounted) return;
    if (visible) {
      pose.set(
        reduced
          ? 1
          : withSpring(1, {
              ...DIALOG_SPRING,
              reduceMotion: ReduceMotion.Never,
            }),
      );
      opacity.set(withTiming(1, timing(theme, 'overlay', reduced)));
      shade.set(withTiming(1, timing(theme, 'overlay', reduced)));
    } else {
      const exitTiming = {
        duration: reduced ? 0 : 200,
        easing: Easing.bezier(...theme.motion.curves.soft),
      };
      opacity.set(
        withTiming(0, { ...exitTiming, reduceMotion: ReduceMotion.Never }),
      );
      shade.set(
        withTiming(0, { ...exitTiming, reduceMotion: ReduceMotion.Never }),
      );
      // The modal remains mounted until the physical spring reaches its hidden pose.
      if (reduced) {
        pose.set(0);
        finishExit(version);
      } else {
        pose.set(
          withSpring(
            0,
            { ...DIALOG_SPRING, reduceMotion: ReduceMotion.Never },
            (finished) => {
              if (finished) scheduleOnRN(finishExit, version);
            },
          ),
        );
      }
    }
    return () => {
      // Invalidate callbacks already queued on RN before a reopen or an unmount.
      lifecycle.current++;
      cancelAnimation(pose);
      cancelAnimation(opacity);
      cancelAnimation(shade);
    };
  }, [visible, mounted, reduced, theme, pose, opacity, shade, finishExit]);

  const close = () => {
    if (!visible || !dismissible) return;
    if (controlled === undefined) setInternal(false);
    onVisibleChange?.(false);
  };
  const outside = Gesture.Tap()
    .enabled(dismissible && role !== 'alertdialog' && visible)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(close);
    });
  const closeTap = Gesture.Tap()
    .enabled(dismissible && visible)
    .onBegin(() => {
      pressScale.set(
        reduced
          ? 1
          : withSpring(buttonScale, {
              ...pressSpring,
              reduceMotion: ReduceMotion.Never,
            }),
      );
    })
    .onFinalize(() => {
      pressScale.set(
        reduced
          ? 1
          : withSpring(1, { ...pressSpring, reduceMotion: ReduceMotion.Never }),
      );
    })
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(close);
    });
  const panelStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { perspective: 500 },
      { rotateX: `${reduced ? 0 : -20 * (1 - pose.get())}deg` },
      { scale: reduced ? 1 : 0.8 + 0.2 * pose.get() },
    ],
  }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.get() }));
  const closeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.get() }],
  }));
  if (!mounted) return null;
  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
      onShow={() => {
        if (Platform.OS !== 'web' && heading.current) {
          AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
        }
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BaseThemeProvider theme={theme}>
          <GestureDetector gesture={outside}>
            <Animated.View
              accessible={false}
              importantForAccessibility="no"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.overlay },
                shadeStyle,
              ]}
            />
          </GestureDetector>
          <KeyboardAvoidingView
            pointerEvents="box-none"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
            }}
          >
            <Animated.View
              testID={testID}
              role={role}
              accessibilityViewIsModal
              aria-modal
              accessibilityLabel={title}
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descriptionId : undefined}
              onAccessibilityEscape={close}
              {...(Platform.OS === 'web'
                ? {
                    onKeyDown: (event: React.KeyboardEvent) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        close();
                      }
                    },
                  }
                : {})}
              style={[
                {
                  width: Math.max(0, Math.min(width - 32, 512)),
                  maxHeight: Math.max(44, height - 32),
                  flexShrink: 1,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  boxShadow: theme.shadow.lg,
                },
                panelStyle,
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 24, gap: 16 }}
              >
                {media ? (
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: theme.radius.md,
                      backgroundColor: colors.muted,
                      alignSelf: 'center',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {media}
                  </View>
                ) : null}
                {title || description ? (
                  <View
                    style={{
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal:
                        showCloseButton && dismissible ? 16 : 0,
                    }}
                  >
                    {title ? (
                      <Text
                        ref={heading}
                        accessible
                        nativeID={titleId}
                        accessibilityRole="header"
                        style={{
                          fontFamily: theme.fonts.semibold,
                          fontSize: 18,
                          lineHeight: 24,
                          textAlign: 'center',
                          color: colors.foreground,
                        }}
                      >
                        {title}
                      </Text>
                    ) : null}
                    {description ? (
                      <Text
                        nativeID={descriptionId}
                        style={{
                          fontFamily: theme.fonts.regular,
                          fontSize: 14,
                          lineHeight: 20,
                          textAlign: 'center',
                          color: colors.mutedForeground,
                        }}
                      >
                        {description}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {children}
                {footer ? (
                  <View
                    style={{
                      flexDirection: 'column-reverse',
                      alignItems: 'stretch',
                      gap: 8,
                    }}
                  >
                    {fullWidthActions(footer)}
                  </View>
                ) : null}
              </ScrollView>
              {showCloseButton && dismissible ? (
                <GestureDetector gesture={closeTap}>
                  <Animated.View
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={closeLabel}

                    {...(Platform.OS === 'web'
                      ? {
                          tabIndex: 0,
                          onKeyDown: (event: React.KeyboardEvent) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              close();
                            }
                          },
                        }
                      : {})}
                    {...baseActivationProps(close, false)}
                    style={[
                      {
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 44,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                        borderRadius: theme.radius.md,
                      },
                      closeStyle,
                    ]}
                  >
                    <X size={16} color={colors.foreground} />
                  </Animated.View>
                </GestureDetector>
              ) : null}
            </Animated.View>
          </KeyboardAvoidingView>
        </BaseThemeProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}
