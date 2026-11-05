# Base Sliding Number

A rolling number display with independent digit springs and configurable value, formatting, font, and color.

## How it works

1. The value is formatted with `Intl.NumberFormat`, so currency, percent, grouping and fixed digits all work.
2. Every digit is a 0–9 wheel clipped to one line; it springs to its digit (stiffness 200, damping 20, mass 0.4).
3. Digits are keyed from the right, so units stay units when the number gains a digit.
4. Tabular figures keep the width steady while digits roll.

## Install

```bash
npx nativeanimation add base-sliding-number
```

The CLI also copies `base-theme`. Dependencies, if you copy by hand:

```bash
npx expo install react-native-reanimated react-native-worklets
```

## Usage

```tsx
import { BaseSlidingNumber } from './base-sliding-number';

<BaseSlidingNumber value={followers} fontSize={40} />
```

Currency and a two-digit timer:

```tsx
<BaseSlidingNumber value={total} format={{ style: 'currency', currency: 'USD' }} fontSize={24} />
<BaseSlidingNumber value={seconds} format={{ minimumIntegerDigits: 2 }} />
```

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. Every piece also takes a `theme` prop that wins over the provider.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | — | The number to show. |
| `format` | `Intl.NumberFormatOptions` | — | Formatting (currency, digits…). |
| `locale` | `string` | `'en-US'` | Locale for formatting. |
| `fontSize` / `lineHeight` | `number` | `24` / `1.25×` | Type size and the height of each wheel. |
| `color` / `fontFamily` | `string` | theme | Text color and font. |
| `theme` | `BaseTheme` | provider | Overrides the theme from `BaseThemeProvider`. |
| `testID` | `string` | — | Test identifier on the root view. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Runs on iOS, Android and web, in Expo Go
and in development builds. Part of **Native Animation Base**, a free family that shares one theme: install
`base-theme` once (the CLI does it for you) and every Base piece picks it up.

## Accessibility

Screen readers read the formatted value as one label, not digit by digit. With Reduce Motion on, digits change without rolling.
