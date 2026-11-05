# Base Badge

A status badge with a sliding count and configurable content, leading icon, count, and theme.

## How it works

1. Four variants map to the theme's primary, secondary, destructive, and outline surfaces.
2. A full radius, 8 × 2 pt padding, and 12/16 pt medium text keep labels compact. Icons are supplied by the caller.
3. `count` composes `BaseSlidingNumber` at 12 pt with a 16 pt line height. The number receives the same theme and foreground color.

## Install

```bash
npx nativeanimation add base-badge
```

The CLI also copies `base-theme` and `base-sliding-number`. Dependencies, if you copy by hand:

```bash
npx expo install react-native-reanimated react-native-worklets
```

Load the Geist regular and medium fonts used by the theme once in your app, or supply your own font names in a custom theme.

## Usage

```tsx
import { BaseBadge } from './base-badge';

<BaseBadge variant="secondary">Paid</BaseBadge>
<BaseBadge variant="outline">Refunded</BaseBadge>
<BaseBadge count={unread}>Unread</BaseBadge>
```

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. Every piece also takes a `theme` prop that wins over the provider.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | `—` | Label; strings and numbers receive the badge text style. |
| `variant` | `'default' \| 'secondary' \| 'destructive' \| 'outline'` | `'default'` | Surface and foreground pair. |
| `leading` | `ReactNode` | `—` | Optional 12 pt icon; supply its color to match the variant. |
| `count` | `number` | `—` | Animated number after the label, including zero. |
| `style` | `StyleProp<ViewStyle>` | `—` | Root view style. |
| `theme` | `BaseTheme` | `provider` | Theme override, also passed to the number. |
| `testID` | `string` | `—` | Root identifier. |
| `accessibilityLabel` | `string` | `label + count` | Explicit name, especially for custom label elements. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Targets iOS, Android, and web, including Expo Go and development builds. Part of **Native Animation Base**, a free family sharing one theme; the CLI installs its family dependencies automatically.

## Accessibility

The badge is informational, with a single accessible label containing its text and count. Decorative icons and digit wheels are hidden from screen readers. Supply `accessibilityLabel` for custom label content. `BaseSlidingNumber` handles Reduce Motion by changing digits immediately. The badge is not a touch target.
