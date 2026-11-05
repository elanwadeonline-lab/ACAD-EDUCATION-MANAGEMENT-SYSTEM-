import {
  useBaseReducedMotion,
  BaseThemeProvider,
  useBaseTheme,
  type BaseTheme,
} from '../base-theme';
import React, { Children, useState } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { BaseHeaderAction } from './BaseHeaderAction';

export type BaseHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  align?: 'center' | 'left';
  scrollY?: SharedValue<number>;
  largeTitle?: boolean;
  topInset?: number;
  theme?: BaseTheme;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function BaseHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  actions,
  align = 'center',
  scrollY,
  largeTitle = false,
  topInset = 0,
  theme: override,
  style,
  testID,
}: BaseHeaderProps) {
  const theme = useBaseTheme(override);
  const reduced = useBaseReducedMotion();
  const [actionsWidth, setActionsWidth] = useState(
    Children.count(actions) * 44,
  );
  const sideWidth = Math.max(onBack ? 44 : 0, actionsWidth);
  const borderStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.get(), [0, 8], [0, 1], Extrapolation.CLAMP)
      : 0,
  }));
  const smallStyle = useAnimatedStyle(() => ({
    opacity: largeTitle
      ? scrollY
        ? interpolate(scrollY.get(), [24, 48], [0, 1], Extrapolation.CLAMP)
        : 0
      : 1,
  }));
  const largeStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.get(), [0, 40], [1, 0], Extrapolation.CLAMP)
      : 1,
    transform: [
      {
        translateY:
          reduced || !scrollY
            ? 0
            : interpolate(scrollY.get(), [0, 40], [0, -8], Extrapolation.CLAMP),
      },
    ],
  }));
  return (
    <BaseThemeProvider theme={theme}>
      <View
        testID={testID}
        style={[
          {
            paddingTop: Math.max(0, topInset),
            backgroundColor: theme.colors.background,
          },
          style,
        ]}
      >
        <View
          style={{
            height: 56,
            paddingHorizontal: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View
            style={{
              width: align === 'center' ? sideWidth : onBack ? 44 : 0,
              alignItems: 'flex-start',
            }}
          >
            {onBack ? (
              <BaseHeaderAction
                theme={theme}
                accessibilityLabel={backLabel}
                onPress={onBack}
                testID={testID ? `${testID}-back` : undefined}
              >
                <ChevronLeft size={20} color={theme.colors.foreground} />
              </BaseHeaderAction>
            ) : null}
          </View>
          <Animated.View
            style={[
              {
                flex: 1,
                minWidth: 0,
                alignItems: align === 'center' ? 'center' : 'flex-start',
              },
              smallStyle,
            ]}
          >
            <Text
              numberOfLines={1}
              accessibilityRole="header"
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: 16,
                lineHeight: 22,
                color: theme.colors.foreground,
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: theme.fonts.regular,
                  fontSize: 12,
                  lineHeight: 16,
                  color: theme.colors.mutedForeground,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </Animated.View>
          <View
            style={{ width: align === 'center' ? sideWidth : actionsWidth }}
          />
          <View
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              setActionsWidth((current) =>
                current === width ? current : width,
              );
            }}
            style={{
              position: 'absolute',
              right: 8,
              top: 6,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {Children.toArray(actions).map((action, index) => (
              <View
                key={
                  React.isValidElement(action) ? (action.key ?? index) : index
                }
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {action}
              </View>
            ))}
          </View>
        </View>
        {largeTitle ? (
          <Animated.View
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
              largeStyle,
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: 30,
                lineHeight: 40,
                letterSpacing: -0.75,
                color: theme.colors.foreground,
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  fontFamily: theme.fonts.regular,
                  fontSize: 14,
                  lineHeight: 20,
                  color: theme.colors.mutedForeground,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </Animated.View>
        ) : null}
        <Animated.View
          aria-hidden
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              height: 1,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: theme.colors.border,
            },
            borderStyle,
          ]}
        />
      </View>
    </BaseThemeProvider>
  );
}
