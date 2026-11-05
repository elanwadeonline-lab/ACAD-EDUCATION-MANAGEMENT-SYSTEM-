import {
  baseActivationProps,
  useBaseReducedMotion,
  spring,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export type BaseTab = {
  value: string;
  label: string;
  content?: React.ReactNode;
};

export type BaseTabsProps = {
  tabs: BaseTab[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  theme?: BaseTheme;
  testID?: string;
};

export function BaseTabs({
  tabs,
  value: controlled,
  defaultValue,
  onValueChange,
  theme: override,
  testID,
}: BaseTabsProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const reduced = useBaseReducedMotion();
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value);
  const value = controlled ?? internal;
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  );

  // Triggers are flex-1, so the highlight geometry follows from the list width alone.
  const listWidth = useSharedValue(0);
  const slot = useSharedValue(index);
  const placed = useRef(false);

  useEffect(() => {
    if (!placed.current || reduced) slot.set(index);
    else slot.set(withSpring(index, spring(theme, 'selection')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reduced]);

  const onListLayout = (e: LayoutChangeEvent) => {
    listWidth.set(e.nativeEvent.layout.width);
    placed.current = true;
  };

  // Panel: the outgoing content leaves in panelOut, the new one enters in panelIn from a 12px shift.
  const [shown, setShown] = useState(value);
  const panel = useSharedValue(1);
  const direction = useSharedValue(1);
  const lastIndex = useRef(index);

  useEffect(() => {
    if (value === shown) return;
    direction.set(index >= lastIndex.current ? 1 : -1);
    lastIndex.current = index;
    const swap = (next: string) => {
      setShown(next);
      panel.set(withTiming(1, timing(theme, 'panelIn', reduced)));
    };
    panel.set(
      withTiming(0, timing(theme, 'panelOut', reduced), (finished) => {
        if (finished) scheduleOnRN(swap, value);
      }),
    );
  }, [value, shown, index, theme, reduced, panel, direction]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panel.get(),
    transform: [
      {
        translateX:
          (1 - panel.get()) * theme.motion.shifts.tabs * direction.get(),
      },
    ],
  }));

  const dark = theme.scheme === 'dark';
  const count = tabs.length;
  const highlightStyle = useAnimatedStyle(() => {
    const w = (listWidth.get() - 6) / count;
    return { width: w, transform: [{ translateX: 3 + slot.get() * w }] };
  });

  const select = (next: string) => {
    if (controlled === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const content = tabs.find((t) => t.value === shown)?.content;

  return (
    <View testID={testID} style={{ gap: 8 }}>
      <View
        accessibilityRole="tablist"
        onLayout={onListLayout}
        style={{
          height: Platform.OS === 'android' ? 48 : 44,
          paddingHorizontal: 3,
          borderRadius: theme.radius.lg,
          backgroundColor: 'transparent',
          flexDirection: 'row',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: (Platform.OS === 'android' ? 48 : 44) / 2 - 18,
            height: 36,
            borderRadius: theme.radius.lg,
            backgroundColor: colors.muted,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: (Platform.OS === 'android' ? 48 : 44) / 2 - 15,
              height: 29,
              left: 0,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: dark ? colors.input : 'transparent',
              backgroundColor: colors.primary,
              boxShadow: theme.shadow.sm,
            },
            highlightStyle,
          ]}
        />
        {tabs.map((tab) => (
          <TabTrigger
            key={tab.value}
            label={tab.label}
            testID={testID ? `${testID}-tab-${tab.value}` : undefined}
            active={tab.value === value}
            theme={theme}
            onPress={() => select(tab.value)}
          />
        ))}
      </View>
      {content !== undefined ? (
        <Animated.View style={panelStyle}>{content}</Animated.View>
      ) : null}
    </View>
  );
}

function TabTrigger({
  label,
  active,
  theme,
  onPress,
  testID,
}: {
  testID?: string;
  label: string;
  active: boolean;
  theme: BaseTheme;
  onPress: () => void;
}) {
  const reduced = useBaseReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, timing(theme, 'color', reduced)));
  }, [active, theme, reduced, progress]);

  // text-foreground/60 in light, text-muted-foreground in dark; active text-foreground.
  const idle =
    theme.scheme === 'dark'
      ? theme.colors.mutedForeground
      : 'rgba(10,10,10,0.6)';
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.get(),
      [0, 1],
      [idle, theme.colors.primaryForeground],
    ),
  }));

  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) scheduleOnRN(onPress);
  });

  return (
    <GestureDetector gesture={tap}>
      <View
        accessible
        testID={testID}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        aria-selected={active}
        {...(Platform.OS === 'web'
          ? {
              onClick: (e: any) => {
                e?.stopPropagation?.();
                onPress();
              },
            }
          : {})}
        {...baseActivationProps(onPress)}
        style={{
          flex: 1,
          height: Platform.OS === 'android' ? 48 : 44,
          minWidth: Platform.OS === 'android' ? 48 : 44,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
          ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
        }}
      >
        <Animated.Text
          numberOfLines={1}
          style={[
            { fontFamily: theme.fonts.medium, fontSize: 14, lineHeight: 20 },
            textStyle,
          ]}
        >
          {label}
        </Animated.Text>
      </View>
    </GestureDetector>
  );
}
