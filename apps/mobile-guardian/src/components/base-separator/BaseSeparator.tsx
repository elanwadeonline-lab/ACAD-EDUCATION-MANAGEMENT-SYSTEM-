import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useBaseTheme, type BaseTheme } from '../base-theme';

export type BaseSeparatorProps = {
  orientation?: 'horizontal' | 'vertical';
  inset?: number;
  /** Labels apply to horizontal separators. */
  label?: string;
  decorative?: boolean;
  theme?: BaseTheme;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function BaseSeparator({
  orientation = 'horizontal',
  inset = 0,
  label,
  decorative = true,
  theme: override,
  style,
  testID,
}: BaseSeparatorProps) {
  const theme = useBaseTheme(override);
  const vertical = orientation === 'vertical';
  return (
    <View
      testID={testID}
      accessible={!decorative}
      role={decorative ? undefined : 'separator'}
      accessibilityLabel={decorative ? undefined : label}
      aria-hidden={decorative}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      style={[
        vertical
          ? {
              width: 1,
              height: '100%',
              paddingVertical: inset,
            }
          : label
            ? {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: inset,
              }
            : {
                height: 1,
                marginHorizontal: inset,
                backgroundColor: theme.colors.border,
              },
        style,
      ]}
    >
      {vertical ? (
        <View style={{ flex: 1, backgroundColor: theme.colors.border }} />
      ) : null}
      {!vertical && label ? (
        <>
          <View
            style={{ height: 1, flex: 1, backgroundColor: theme.colors.border }}
          />
          <Text
            style={{
              fontFamily: theme.fonts.regular,
              fontSize: 12,
              lineHeight: 16,
              color: theme.colors.mutedForeground,
            }}
          >
            {label}
          </Text>
          <View
            style={{ height: 1, flex: 1, backgroundColor: theme.colors.border }}
          />
        </>
      ) : null}
    </View>
  );
}
