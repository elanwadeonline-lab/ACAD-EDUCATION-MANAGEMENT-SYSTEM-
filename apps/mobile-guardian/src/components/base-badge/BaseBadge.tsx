import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useBaseTheme, type BaseTheme } from '../base-theme';
import { BaseSlidingNumber } from '../base-sliding-number';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
export type BaseBadgeProps = {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  /** A 12 pt icon or other small leading element. */
  leading?: React.ReactNode;
  count?: number;
  style?: StyleProp<ViewStyle>;
  theme?: BaseTheme;
  testID?: string;
  accessibilityLabel?: string;
};

export function BaseBadge({
  children,
  variant = 'default',
  leading,
  count,
  style,
  theme: override,
  testID,
  accessibilityLabel,
}: BaseBadgeProps) {
  const theme = useBaseTheme(override);
  const { colors } = theme;
  const surface = {
    default: {
      background: colors.primary,
      foreground: colors.primaryForeground,
    },
    secondary: {
      background: colors.secondary,
      foreground: colors.secondaryForeground,
    },
    destructive: {
      background: colors.destructiveSurface,
      foreground: '#ffffff',
    },
    outline: { background: 'transparent', foreground: colors.foreground },
  }[variant];
  const label =
    accessibilityLabel ??
    [
      typeof children === 'string' || typeof children === 'number'
        ? children
        : undefined,
      count,
    ]
      .filter((part) => part !== undefined)
      .join(' ');
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label || undefined}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          borderRadius: theme.radius.full,
          borderWidth: 1,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          backgroundColor: surface.background,
          paddingHorizontal: 8,
          paddingVertical: 2,
        },
        style,
      ]}
    >
      {leading ? (
        <View aria-hidden importantForAccessibility="no-hide-descendants">
          {leading}
        </View>
      ) : null}
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          style={{
            fontFamily: theme.fonts.medium,
            fontSize: 12,
            lineHeight: 16,
            color: surface.foreground,
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
      {count !== undefined ? (
        <View
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <BaseSlidingNumber
            value={count}
            fontSize={12}
            lineHeight={16}
            fontFamily={theme.fonts.medium}
            color={surface.foreground}
            theme={theme}
          />
        </View>
      ) : null}
    </View>
  );
}
