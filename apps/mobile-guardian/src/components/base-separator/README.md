# Base Separator

A static horizontal or vertical separator with configurable inset, optional horizontal label, semantics, and theme.

## How it works

1. Lines are exactly 1 pt thick and use the theme border color.
2. Horizontal labels use 12 pt muted text and 12 pt gaps between the text and the two lines.
3. Vertical lines fill the host height. Give the host an explicit height; vertical insets shorten the visible line at each end.
4. Decorative separators are hidden from accessibility; semantic separators use the separator role. There is no animation.

## Install

```bash
npx nativeanimation add base-separator
```

The CLI also copies the family modules listed in `registryDependencies`. Dependencies, if you copy by hand:

```bash
npx expo install react-native-reanimated react-native-worklets
```

## Usage

```tsx
import { View } from 'react-native';
import { BaseSeparator } from './base-separator';

<BaseSeparator inset={16} />
<BaseSeparator label="or" decorative={false} />
<View style={{ height: 44, flexDirection: 'row' }}>
  <BaseSeparator orientation="vertical" />
</View>
```

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. Every piece also takes a `theme` prop that wins over the provider.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `horizontal` | Line direction. |
| `inset` | `number` | `0` | Margin at the line ends, in points. |
| `label` | `string` | — | Centered text for horizontal lines; ignored for vertical lines. |
| `decorative` | `boolean` | `true` | Hides the separator and label from screen readers. |
| `theme` | `BaseTheme` | `provider` | Overrides the theme from BaseThemeProvider. |
| `style` | `StyleProp<ViewStyle>` | — | Container style. |
| `testID` | `string` | — | Stable identifier on the root view. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Runs on iOS, Android and web, in Expo Go
and in development builds. Part of **Native Animation Base**, a free family that shares one theme: install
`base-theme` once (the CLI does it for you) and every Base piece picks it up. Free forever. MIT.

## Accessibility

Decorative separators have no role and are hidden from screen readers. Set `decorative={false}` to expose a separator role and the optional label. This piece has no motion.
