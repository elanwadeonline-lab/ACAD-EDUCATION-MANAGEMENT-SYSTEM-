import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  baseActivationProps,
  useBaseReducedMotion,
  spring,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useEffect } from 'react';
import {
  Platform,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { AnchoredPanel, useAnchoredPanel } from './AnchoredPanel';

// Web only: no browser focus outline; the item highlight shows focus instead.
const NO_WEB_OUTLINE =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export type BaseSelectOption = {
  /** Current controlled value. */
  value: string;
  /** Visible label. */
  label: string;
  /** Optional supporting description. */
  description?: string;
  /** Dims the control and prevents activation. */
  disabled?: boolean;
};
export type BaseSelectProps = {
  /** Current controlled value. */
  value?: string;
  /** Called after an enabled choice is activated. */
  onValueChange: (value: string) => void;
  /** Choices shown in the anchored list. */
  options: BaseSelectOption[];
  /** Text shown when no matching value is selected. */
  placeholder?: string;
  /** Visible label. */
  label?: string;
  /** Dims the control and prevents activation. */
  disabled?: boolean;
  /** Optionally controls the anchored panel. */
  open?: boolean;
  /** Called when opening or closing is requested. */
  onOpenChange?: (open: boolean) => void;
  /** Accessible name for this control or task. */
  accessibilityLabel?: string;
  /** Overrides the nearest BaseThemeProvider. */
  theme?: BaseTheme;
  /** Style applied to the container. */
  style?: StyleProp<ViewStyle>;
  /** Stable identifier for the root or trigger. */
  testID?: string;
};
export function BaseSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  label,
  disabled = false,
  open: controlled,
  onOpenChange,
  accessibilityLabel,
  theme: override,
  style,
  testID,
}: BaseSelectProps) {
  const theme = useBaseTheme(override);
  const reduced = useBaseReducedMotion();
  const { triggerRef, open, changeOpen } = useAnchoredPanel(
    controlled,
    onOpenChange,
  );
  const expanded = open && !disabled;
  const rotation = useSharedValue(0);
  const press = useSharedValue(1);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    rotation.set(
      reduced
        ? Number(expanded)
        : withSpring(Number(expanded), spring(theme, 'selection')),
    );
  }, [expanded, reduced, theme, rotation]);
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${180 * rotation.get()}deg` }],
  }));
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.get() }],
  }));
  const toggle = () => {
    if (!disabled) changeOpen(!expanded);
  };
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      press.set(
        reduced
          ? 1
          : withSpring(theme.motion.scales.press, spring(theme, 'press')),
      );
    })
    .onFinalize(() => {
      press.set(reduced ? 1 : withSpring(1, spring(theme, 'press')));
    })
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(toggle);
    });
  return (
    <View style={[{ gap: 8, opacity: disabled ? 0.5 : 1 }, style]}>
      {label ? (
        <Text
          style={{
            fontFamily: theme.fonts.medium,
            fontSize: 14,
            lineHeight: 20,
            color: theme.colors.foreground,
          }}
        >
          {label}
        </Text>
      ) : null}
      <GestureDetector gesture={tap}>
        <Animated.View
          testID={testID}
          accessible
          accessibilityRole="combobox"
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          accessibilityValue={{ text: selected?.label ?? placeholder }}
          accessibilityState={{ expanded, disabled }}
          aria-expanded={expanded}
          aria-disabled={disabled}

          {...(Platform.OS === 'web'
            ? {
                tabIndex: disabled ? -1 : 0,
                onKeyDown: (event: React.KeyboardEvent) => {
                  if (
                    ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)
                  ) {
                    event.preventDefault();
                    if (!disabled) changeOpen(true);
                  }
                },
              }
            : {})}
          {...baseActivationProps(toggle, disabled)}
          style={[
            NO_WEB_OUTLINE,
            [{ minHeight: 44, paddingVertical: 4 }, pressStyle],
          ]}
        >
          <View
            ref={triggerRef}
            collapsable={false}
            style={{
              height: 36,
              borderWidth: 1,
              borderColor: expanded ? theme.colors.ring : theme.colors.input,
              borderRadius: theme.radius.md,
              paddingHorizontal: 12,
              backgroundColor: theme.colors.inputSurface,
              boxShadow: theme.shadow.xs,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {expanded ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  right: -4,
                  bottom: -4,
                  borderWidth: 3,
                  borderColor: theme.colors.ringSoft,
                  borderRadius: theme.radius.md + 3,
                }}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontFamily: theme.fonts.regular,
                fontSize: 14,
                color: selected
                  ? theme.colors.foreground
                  : theme.colors.mutedForeground,
              }}
            >
              {selected?.label ?? placeholder}
            </Text>
            <Animated.View style={chevron}>
              <ChevronDown size={16} color={theme.colors.mutedForeground} />
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>
      <AnchoredPanel
        open={expanded}
        onClose={() => changeOpen(false)}
        anchorRef={triggerRef}
        matchWidth
        motion="select"
        theme={theme}
        role="listbox"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {options.map((option) => (
          <Option
            key={option.value}
            option={option}
            selected={option.value === value}
            theme={theme}
            onSelect={() => {
              changeOpen(false);
              onValueChange(option.value);
            }}
          />
        ))}
      </AnchoredPanel>
    </View>
  );
}
function Option({
  option,
  selected,
  theme,
  onSelect,
}: {
  option: BaseSelectOption;
  selected: boolean;
  theme: BaseTheme;
  onSelect: () => void;
}) {
  const reduced = useBaseReducedMotion();
  const highlight = useSharedValue(0);
  const tap = Gesture.Tap()
    .enabled(!option.disabled)
    .onBegin(() => {
      highlight.set(
        withTiming(1, {
          reduceMotion: ReduceMotion.Never,
          duration: reduced ? 0 : 100,
        }),
      );
    })
    .onFinalize(() => {
      highlight.set(
        withTiming(0, {
          reduceMotion: ReduceMotion.Never,
          duration: reduced ? 0 : 100,
        }),
      );
    })
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(onSelect);
    });
  const animated = useAnimatedStyle(() => ({ opacity: highlight.get() }));
  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible
        accessibilityRole="menuitem"
        role="option"
        accessibilityLabel={
          option.description
            ? `${option.label}. ${option.description}`
            : option.label
        }
        accessibilityState={{ selected, disabled: option.disabled }}
        aria-selected={selected}
        aria-disabled={option.disabled}

        {...(Platform.OS === 'web'
          ? {
              tabIndex: option.disabled ? -1 : 0,
              onFocus: () => highlight.set(1),
              onBlur: () => highlight.set(0),
              onKeyDown: (event: React.KeyboardEvent) => {
                if (
                  !option.disabled &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  onSelect();
                }
              },
            }
          : {})}
        {...baseActivationProps(onSelect, option.disabled)}
        style={[
          NO_WEB_OUTLINE,
          {
            minHeight: 44,
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderRadius: theme.radius.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            opacity: option.disabled ? 0.5 : 1,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              inset: 0,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.accent,
            },
            animated,
          ]}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontFamily: theme.fonts.regular,
              fontSize: 14,
              lineHeight: 20,
              color: theme.colors.popoverForeground,
            }}
          >
            {option.label}
          </Text>
          {option.description ? (
            <Text
              style={{
                fontFamily: theme.fonts.regular,
                fontSize: 12,
                lineHeight: 18,
                color: theme.colors.mutedForeground,
              }}
            >
              {option.description}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 14 }}>
          {selected ? (
            <Check size={14} color={theme.colors.popoverForeground} />
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
export default BaseSelect;
