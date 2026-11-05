import Animated, {
  ReduceMotion,
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  useBaseReducedMotion,
  BaseThemeProvider,
  type BaseTheme,
} from '../base-theme';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

type Rect = { x: number; y: number; width: number; height: number };
export function useAnchoredPanel(
  controlled?: boolean,
  onOpenChange?: (open: boolean) => void,
) {
  const triggerRef = useRef<View>(null);
  const [internal, setInternal] = useState(false);
  const open = controlled ?? internal;
  const changeOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setInternal(next);
      onOpenChange?.(next);
      if (!next && Platform.OS === 'web') triggerRef.current?.focus();
    },
    [controlled, onOpenChange],
  );
  return { triggerRef, open, changeOpen };
}
export function AnchoredPanel({
  open,
  onClose,
  anchorRef,
  align = 'start',
  matchWidth = false,
  motion = 'menu',
  theme,
  children,
  accessibilityLabel,
  role = 'menu',
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<View | null>;
  align?: 'start' | 'end';
  matchWidth?: boolean;
  motion?: 'menu' | 'select';
  theme: BaseTheme;
  children: React.ReactNode;
  accessibilityLabel?: string;
  role?: 'menu' | 'list' | 'listbox';
}) {
  const { width, height } = useWindowDimensions();
  const reduced = useBaseReducedMotion();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [origin, setOrigin] = useState<Rect | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const root = useRef<View>(null);
  const panel = useRef<View>(null);
  const version = useRef(0);
  const pose = useSharedValue(0);
  const finishExit = useCallback((ticket: number) => {
    if (version.current === ticket) {
      setMounted(false);
      setAnchor(null);
      setOrigin(null);
      setPanelHeight(0);
    }
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    let current = true;
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      if (current) setAnchor({ x, y, width: w, height: h });
    });
    return () => {
      current = false;
    };
  }, [open, width, height, anchorRef]);
  const ready = Boolean(anchor && origin && panelHeight);
  useEffect(() => {
    const lifecycle = version;
    const ticket = ++lifecycle.current;
    if (!mounted) return;
    if (open && ready) {
      pose.set(
        reduced
          ? 1
          : motion === 'select'
            ? withSpring(1, {
                reduceMotion: ReduceMotion.Never,
                stiffness: 400,
                damping: 29,
                mass: 1,
              })
            : withTiming(1, {
                reduceMotion: ReduceMotion.Never,
                duration: 220,
                easing: Easing.bezier(...theme.motion.curves.soft),
              }),
      );
      if (Platform.OS !== 'web' && panel.current)
        AccessibilityInfo.sendAccessibilityEvent(panel.current, 'focus');
    } else if (!open) {
      pose.set(
        withTiming(
          0,
          {
            reduceMotion: ReduceMotion.Never,
            duration: reduced ? 0 : motion === 'select' ? 150 : 220,
            easing: Easing.bezier(...theme.motion.curves.soft),
          },
          (finished) => {
            if (finished) scheduleOnRN(finishExit, ticket);
          },
        ),
      );
    }
    return () => {
      lifecycle.current++;
      cancelAnimation(pose);
    };
  }, [open, mounted, ready, reduced, motion, theme, pose, finishExit]);
  const localAnchor =
    anchor && origin
      ? { ...anchor, x: anchor.x - origin.x, y: anchor.y - origin.y }
      : null;
  const viewportWidth = origin?.width || width;
  const viewportHeight = origin?.height || height;
  const panelWidth = Math.max(
    0,
    Math.min(
      viewportWidth - 16,
      matchWidth ? (anchor?.width ?? 192) : Math.max(192, anchor?.width ?? 0),
    ),
  );
  const below = localAnchor
    ? Math.max(0, viewportHeight - 8 - localAnchor.y - localAnchor.height - 4)
    : 0;
  const above = localAnchor ? Math.max(0, localAnchor.y - 12) : 0;
  const flipped = panelHeight > below && above > below;
  const maxHeight = Math.max(0, flipped ? above : below);
  const shownHeight = Math.min(panelHeight, maxHeight);
  const left = Math.max(
    8,
    Math.min(
      viewportWidth - panelWidth - 8,
      localAnchor
        ? localAnchor.x + (align === 'end' ? localAnchor.width - panelWidth : 0)
        : 8,
    ),
  );
  const top = Math.max(
    8,
    Math.min(
      viewportHeight - shownHeight - 8,
      localAnchor
        ? flipped
          ? localAnchor.y - shownHeight - 4
          : localAnchor.y + localAnchor.height + 4
        : 8,
    ),
  );
  const animated = useAnimatedStyle(() => ({
    opacity: ready ? pose.get() : 0,
    transform: [
      {
        scale: reduced
          ? 1
          : (motion === 'select' ? 0.8 : 0.9) +
            (motion === 'select' ? 0.2 : 0.1) * pose.get(),
      },
    ],
  }));
  const outside = Gesture.Tap()
    .enabled(open)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(onClose);
    });
  if (!mounted) return null;
  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onShow={() =>
        root.current?.measureInWindow((x, y, w, h) =>
          setOrigin({ x, y, width: w, height: h }),
        )
      }
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BaseThemeProvider theme={theme}>
          <View
            ref={root}
            collapsable={false}
            style={{ flex: 1 }}
            onLayout={() =>
              root.current?.measureInWindow((x, y, w, h) =>
                setOrigin({ x, y, width: w, height: h }),
              )
            }
          >
            <GestureDetector gesture={outside}>
              <Animated.View
                accessible={false}
                importantForAccessibility="no"
                style={StyleSheet.absoluteFill}
              />
            </GestureDetector>
            <Animated.View
              ref={panel}
              // RN Web supports listbox; RN 0.86 native roles use list for this container.
              role={
                role === 'listbox'
                  ? Platform.OS === 'web'
                    ? ('listbox' as 'list')
                    : 'list'
                  : role
              }
              accessibilityLabel={accessibilityLabel}
              accessibilityViewIsModal
              aria-modal
              onAccessibilityEscape={onClose}
              pointerEvents={open && ready ? 'auto' : 'none'}
              {...(Platform.OS === 'web'
                ? {
                    onKeyDown: (event: React.KeyboardEvent) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        onClose();
                      }
                    },
                  }
                : {})}
              style={[
                {
                  position: 'absolute',
                  left,
                  top,
                  width: panelWidth,
                  maxHeight: ready
                    ? maxHeight
                    : Math.max(44, viewportHeight - 16),
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.popover,
                  borderRadius: theme.radius.md,
                  boxShadow: theme.shadow.lg,
                  transformOrigin: `${align === 'end' ? 'right' : 'left'} ${flipped ? 'bottom' : 'top'}`,
                },
                animated,
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={(_w, h) => setPanelHeight(h + 2)}
                contentContainerStyle={{ padding: 4 }}
              >
                {children}
              </ScrollView>
            </Animated.View>
          </View>
        </BaseThemeProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}
