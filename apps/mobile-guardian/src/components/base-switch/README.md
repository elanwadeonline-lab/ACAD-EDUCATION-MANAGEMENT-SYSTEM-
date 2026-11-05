# Base Switch

A switch with a stretching, spring-driven thumb that takes its colors and radius from a configurable theme.

## How it works

1. The track is 32 × 18.4 pt with a 16 pt thumb.
2. On touch-down the thumb stretches to 19/16 of its width, anchored so it grows toward the side it will move to.
3. On release it springs across (stiffness 300, damping 25, mass 1) and shrinks back; track and thumb colors fade in 200 ms.
4. A layout wrapper reserves a 48 dp Android or 44 pt iOS/web touch target around the unchanged track.

## Install

```bash
npx nativeanimation add base-switch
```

The CLI also copies `base-theme`. Dependencies, if you copy by hand:

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets
```

## Usage

```tsx
import { BaseSwitch } from './base-switch';

<BaseSwitch value={enabled} onValueChange={setEnabled} accessibilityLabel="Push notifications" />
```

Uncontrolled and disabled:

```tsx
<BaseSwitch defaultValue accessibilityLabel="Wi-Fi sync" />
<BaseSwitch disabled accessibilityLabel="Locked setting" />
```

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. Every piece also takes a `theme` prop that wins over the provider.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `boolean` | — | On or off (controlled). |
| `defaultValue` | `boolean` | `false` | Initial state (uncontrolled). |
| `onValueChange` | `(value: boolean) => void` | — | Called when toggled. |
| `disabled` | `boolean` | `false` | Dims and blocks toggling. |
| `accessibilityLabel` | `string` | — | What the switch controls. |
| `theme` | `BaseTheme` | provider | Overrides the theme from `BaseThemeProvider`. |
| `testID` | `string` | — | Test identifier on the root view. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Runs on iOS, Android and web, in Expo Go
and in development builds. Part of **Native Animation Base**, a free family that shares one theme: install
`base-theme` once (the CLI does it for you) and every Base piece picks it up.

## Accessibility

Announced as a switch with synchronized checked and disabled states. Supports screen-reader activation and Enter/Space on web. With Reduce Motion on, the thumb moves without the spring or the stretch.
