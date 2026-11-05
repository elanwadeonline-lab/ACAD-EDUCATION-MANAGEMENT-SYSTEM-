import {
  useBaseReducedMotion,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect, useId, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export type BaseSheetProps = {
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  /** Actions, stacked full width. */
  footer?: React.ReactNode;
  /** Safe-area bottom inset from the host (useSafeAreaInsets().bottom). */
  bottomInset?: number;
  /** Accessibility label for the backdrop that closes the sheet. */
  closeLabel?: string;
  theme?: BaseTheme;
  testID?: string;
};

export function BaseSheet({
  visible: controlled,
  defaultVisible = false,
  onVisibleChange,
  title,
  description,
  children,
  footer,
  bottomInset = 0,
  closeLabel = 'Close',
  theme: override,
  testID,
}: BaseSheetProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const reduced = useBaseReducedMotion();
  const { height: screenHeight } = useWindowDimensions();
  const [internal, setInternal] = useState(defaultVisible);
  const visible = controlled ?? internal;
  // Stays mounted while the exit animation runs.
  const [mounted, setMounted] = useState(visible);

  // Mount as soon as it opens (adjusting state during render, not in an effect).
  if (visible && !mounted) setMounted(true);

  const offset = useSharedValue(screenHeight);
  const shade = useSharedValue(0);
  const panelHeight = useSharedValue(screenHeight);
  const titleId = useId();
  const descriptionId = useId();
  const dragOrigin = useSharedValue(0);
  const dragTranslation = useSharedValue(0);
  const dragging = useSharedValue(false);
  const dismissing = useSharedValue(false);

  useEffect(() => {
    let current = true;
    const finishExit = () => {
      // A completed exit may already be queued on JS when the host reopens.
      if (current) setMounted(false);
    };
    if (visible) {
      dismissing.set(false);
      offset.set(withTiming(0, timing(theme, 'drawer', reduced)));
      shade.set(withTiming(1, timing(theme, 'overlay', reduced)));
    } else if (mounted) {
      shade.set(withTiming(0, timing(theme, 'fade', reduced)));
      offset.set(
        withTiming(
          panelHeight.get(),
          timing(theme, dismissing.get() ? 'dismiss' : 'drawerOut', reduced),
          (finished) => {
            if (finished) scheduleOnRN(finishExit);
          },
        ),
      );
    }
    return () => {
      current = false;
    };
  }, [
    visible,
    mounted,
    reduced,
    theme,
    offset,
    shade,
    panelHeight,
    dismissing,
  ]);

  const close = () => {
    if (controlled === undefined) setInternal(false);
    onVisibleChange?.(false);
  };

  const dismiss = Gesture.Pan()
    .activeOffsetY(8)
    .onStart((event) => {
      cancelAnimation(offset);
      dragOrigin.set(offset.get());
      dragTranslation.set(event.translationY);
      dragging.set(true);
    })
    .onUpdate((event) => {
      const delta = event.translationY - dragTranslation.get();
      // Anchor to the interrupted position, including the activation threshold.
      offset.set(dragOrigin.get() + (delta > 0 ? delta : delta / 6));
    })
    .onEnd((event) => {
      dragging.set(false);
      if (
        event.translationY - dragTranslation.get() > panelHeight.get() * 0.25 ||
        event.velocityY > 500
      ) {
        dismissing.set(true);
        scheduleOnRN(close);
      } else {
        offset.set(withTiming(0, timing(theme, 'drawer', reduced)));
      }
    })
    .onFinalize(() => {
      if (dragging.get()) {
        dragging.set(false);
        offset.set(withTiming(0, timing(theme, 'drawer', reduced)));
      }
    });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
  }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.get() }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.overlay,
            },
            shadeStyle,
          ]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          />
        </Animated.View>
        <GestureDetector gesture={dismiss}>
          <Animated.View
            testID={testID}
            role="dialog"
            accessibilityViewIsModal
            aria-modal
            accessibilityLabel={title}
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            onLayout={(e) => panelHeight.set(e.nativeEvent.layout.height)}
            style={[
              {
                maxHeight: screenHeight * 0.8,
                backgroundColor: colors.background,
                borderTopLeftRadius: theme.radius.lg,
                borderTopRightRadius: theme.radius.lg,
                borderTopWidth: 1,
                borderColor: colors.border,
                paddingBottom: bottomInset,
              },
              panelStyle,
            ]}
          >
            <View
              style={{
                alignSelf: 'center',
                marginTop: 16,
                width: 100,
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: colors.muted,
              }}
            />
            {title || description ? (
              <View style={{ padding: 16, gap: 2, alignItems: 'center' }}>
                {title ? (
                  <Text
                    nativeID={titleId}
                    accessibilityRole="header"
                    style={{
                      fontFamily: theme.fonts.semibold,
                      fontSize: 16,
                      lineHeight: 24,
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
                      color: colors.mutedForeground,
                      textAlign: 'center',
                    }}
                  >
                    {description}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {children ? (
              <View style={{ paddingHorizontal: 16, flexShrink: 1, minHeight: 0 }}>{children}</View>
            ) : null}
            {footer ? (
              <View style={{ padding: 16, gap: 8 }}>{footer}</View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
