import {
  useBaseReducedMotion,
  alpha,
  timing,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import X from 'lucide-react-native/icons/x';
import { InputAction, InputGlyph } from './InputAction';
import {
  Platform,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type BaseInputProps = {
  label?: string;
  helperText?: string;
  /** Replaces the helper text and turns the field destructive. */
  error?: string;
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  /** Maximum textarea height, including padding. Minimum height is 64 pt. */
  maxHeight?: number;
  secureTextEntry?: boolean;
  revealable?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  clearLabel?: string;
  /** Extra TextInput props (keyboardType, autoComplete, secureTextEntry…). */
  /** Icon or element inside the field, before the text (16px icons match the family). */
  leading?: React.ReactNode;
  /** Icon, button or element inside the field, after the text. */
  trailing?: React.ReactNode;
  inputProps?: Omit<
    TextInputProps,
    'value' | 'defaultValue' | 'onChangeText' | 'placeholder' | 'editable'
  >;
  theme?: BaseTheme;
  testID?: string;
  accessibilityLabel?: string;
};

export function BaseInput({
  label,
  helperText,
  error,
  value,
  defaultValue,
  onChangeText,
  placeholder,
  disabled = false,
  multiline: multilineProp,
  maxHeight = 160,
  secureTextEntry: secureProp,
  revealable = false,
  clearable = false,
  onClear,
  showPasswordLabel = 'Show password',
  hidePasswordLabel = 'Hide password',
  clearLabel = 'Clear search',
  leading,
  trailing,
  inputProps,
  theme: override,
  testID,
  accessibilityLabel,
}: BaseInputProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const reduced = useBaseReducedMotion();
  const focus = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);
  const [internal, setInternal] = useState(defaultValue ?? '');
  const [revealed, setRevealed] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [inputWidth, setInputWidth] = useState(0);
  const text = value ?? internal;
  const multiline = multilineProp ?? inputProps?.multiline ?? false;
  const secure = secureProp ?? inputProps?.secureTextEntry ?? false;
  const hasReveal = secure && revealable && !multiline;
  const hasClear = clearable && !hasReveal;
  const limit = Math.max(64, maxHeight);
  // Web scrollHeight includes the current frame. Reset it before measuring so deletion can shrink the field.
  const measureWebContent = useCallback(() => {
    if (Platform.OS === 'web' && multiline) {
      const node = inputRef.current as unknown as HTMLTextAreaElement | null;
      if (!node) return;
      const previousHeight = node.style.height;
      node.style.height = '0px';
      const next = Math.ceil(node.scrollHeight);
      node.style.height = previousHeight;
      setContentHeight((current) => (current === next ? current : next));
    }
  }, [multiline]);
  useLayoutEffect(() => {
    measureWebContent();
  }, [text, inputWidth, limit, measureWebContent]);
  const changeText = (next: string) => {
    setInternal(next);
    onChangeText?.(next);
  };
  const clear = () => {
    if (disabled) return;
    changeText('');
    onClear?.();
    inputRef.current?.focus();
  };

  const setFocused = (focused: boolean) => {
    focus.set(withTiming(focused ? 1 : 0, timing(theme, 'color', reduced)));
  };

  const borderIdle = error ? colors.destructive : colors.input;
  const borderFocus = error ? colors.destructive : colors.ring;
  const ringColor = error
    ? theme.scheme === 'dark'
      ? alpha(colors.destructive, 0.4)
      : alpha(colors.destructive, 0.2)
    : colors.ringSoft;

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.get(),
      [0, 1],
      [borderIdle, borderFocus],
    ),
  }));
  // focus-visible:ring-[3px]: a 3px band just outside the border.
  const ringStyle = useAnimatedStyle(() => ({
    opacity: error ? 1 : focus.get(),
  }));

  return (
    <View style={{ gap: 8, opacity: disabled ? 0.5 : 1 }}>
      {label ? (
        <Text
          style={{
            fontFamily: theme.fonts.medium,
            fontSize: 14,
            lineHeight: 14,
            color: colors.foreground,
          }}
        >
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={[
          {
            height: multiline
              ? Math.min(limit, Math.max(64, contentHeight + 2))
              : hasReveal || hasClear
                ? 44
                : 36,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            backgroundColor: colors.inputSurface,
            boxShadow: theme.shadow.xs,
            flexDirection: 'row',
            alignItems: 'center',
          },
          fieldStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: -4,
              left: -4,
              right: -4,
              bottom: -4,
              borderWidth: 3,
              borderRadius: theme.radius.md + 3,
              borderColor: ringColor,
            },
            ringStyle,
          ]}
        />
        {leading ? <View style={{ paddingLeft: 12 }}>{leading}</View> : null}
        <TextInput
          ref={inputRef}
          testID={testID}
          accessibilityLabel={accessibilityLabel ?? label}
          value={text}
          onChangeText={changeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
          {...inputProps}
          accessibilityState={{ ...inputProps?.accessibilityState, disabled }}
          aria-disabled={disabled}
          aria-invalid={Boolean(error)}
          editable={!disabled}
          multiline={multiline}
          secureTextEntry={secure && !revealed && !multiline}
          scrollEnabled={
            multiline ? contentHeight + 2 >= limit : inputProps?.scrollEnabled
          }
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            setInputWidth((current) => (current === width ? current : width));
            inputProps?.onLayout?.(event);
          }}
          onContentSizeChange={(event) => {
            const height = event.nativeEvent.contentSize.height;
            if (Platform.OS !== 'web') setContentHeight(Math.ceil(height));
            inputProps?.onContentSizeChange?.(event);
          }}
          onFocus={(e) => {
            setFocused(true);
            inputProps?.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps?.onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              minWidth: 0,
              height: '100%',
              paddingLeft: multiline ? 12 : leading ? 8 : 12,
              paddingRight: multiline
                ? 12
                : trailing || hasReveal || hasClear
                  ? 8
                  : 12,
              paddingVertical: multiline ? 8 : 0,
              textAlignVertical: multiline ? 'top' : 'center',
              fontFamily: theme.fonts.regular,
              fontSize: 16,
              color: colors.foreground,
              outlineWidth: 0,
              // Web only: hide the browser focus outline; the 3px ring replaces it.
              ...(Platform.OS === 'web'
                ? ({ outlineStyle: 'none' } as object)
                : null),
            },
            inputProps?.style,
          ]}
        />
        {hasReveal ? (
          <InputAction
            theme={theme}
            disabled={disabled}
            testID={testID ? `${testID}-reveal` : undefined}
            label={revealed ? hidePasswordLabel : showPasswordLabel}
            onPress={() => setRevealed((current) => !current)}
          >
            <InputGlyph visible={!revealed} theme={theme}>
              <Eye size={16} color={colors.mutedForeground} />
            </InputGlyph>
            <InputGlyph visible={revealed} theme={theme}>
              <EyeOff size={16} color={colors.mutedForeground} />
            </InputGlyph>
          </InputAction>
        ) : null}
        {hasClear ? (
          <View
            pointerEvents={text ? 'auto' : 'none'}
            accessibilityElementsHidden={!text}
            importantForAccessibility={text ? 'auto' : 'no-hide-descendants'}
            aria-hidden={!text}
          >
            <InputAction
              theme={theme}
              disabled={disabled || !text}
              label={clearLabel}
              onPress={clear}
              testID={testID ? `${testID}-clear` : undefined}
            >
              <InputGlyph visible={!!text} theme={theme} exit="popOut">
                <X size={16} color={colors.mutedForeground} />
              </InputGlyph>
            </InputAction>
          </View>
        ) : null}
        {trailing ? <View style={{ paddingRight: 8 }}>{trailing}</View> : null}
      </Animated.View>
      {error || helperText ? (
        <Text
          style={{
            fontFamily: theme.fonts.regular,
            fontSize: 14,
            lineHeight: 20,
            color: error ? colors.destructive : colors.mutedForeground,
          }}
        >
          {error ?? helperText}
        </Text>
      ) : null}
    </View>
  );
}
