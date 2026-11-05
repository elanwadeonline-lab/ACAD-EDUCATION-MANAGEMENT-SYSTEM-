# Base Button

A button with spring-driven press feedback and configurable content, size, variant, and theme.

## How it works

1. Six variants (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`) and five sizes read their colors, radius and shadow from the Base theme.
2. The press is a Gesture Handler tap: it springs to `0.97` on touch-down and back on release (stiffness 550, damping 30, mass 1), on its own shared value so a fast double tap never gets stuck.
3. Visual heights are 24/32/36/40; a layout wrapper reserves a 48 dp Android or 44 pt iOS/web touch target while preserving the visual surface.
4. `loading` swaps the leading slot for a spinner and blocks presses; `disabled` dims to 50%.

## Install

```bash
npx nativeanimation add base-button
```

The CLI also copies `base-theme`. Dependencies, if you copy by hand:

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets
```

## Usage

```tsx
import { BaseButton } from './base-button';

<BaseButton onPress={save}>Save changes</BaseButton>
```

With icons, variants and states:

```tsx
<BaseButton variant="outline" size="sm" leading={<Plus size={16} color={theme.colors.foreground} />}>
  New project
</BaseButton>
<BaseButton variant="destructive" loading={deleting} onPress={remove}>Delete</BaseButton>
<BaseButton size="icon" variant="ghost" accessibilityLabel="Next page"><ChevronRight size={16} /></BaseButton>
```

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. Every piece also takes a `theme` prop that wins over the provider.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | — | Label text, or any element. |
| `variant` | `'default' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive' \| 'link'` | `'default'` | Visual style. |
| `size` | `'xs' \| 'sm' \| 'default' \| 'lg' \| 'icon'` | `'default'` | Height and padding. |
| `onPress` | `() => void` | — | Called on tap. |
| `loading` | `boolean` | `false` | Shows a spinner and blocks presses. |
| `disabled` | `boolean` | `false` | Dims and blocks presses. |
| `leading` / `trailing` | `ReactNode` | — | Icon or element before / after the label. |
| `fullWidth` | `boolean` | `false` | Stretches to the container width. |
| `style` | `StyleProp<ViewStyle>` | — | Extra styles for the button. |
| `accessibilityLabel` | `string` | — | Required for icon-only buttons. |
| `theme` | `BaseTheme` | provider | Overrides the theme from `BaseThemeProvider`. |
| `testID` | `string` | — | Test identifier on the root view. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Runs on iOS, Android and web, in Expo Go
and in development builds. Part of **Native Animation Base**, a free family that shares one theme: install
`base-theme` once (the CLI does it for you) and every Base piece picks it up.

## Accessibility

Announced as a button with synchronized disabled and busy states. Supports screen-reader activation and Enter/Space on web. With Reduce Motion on, the press scale is skipped; the press still works.
