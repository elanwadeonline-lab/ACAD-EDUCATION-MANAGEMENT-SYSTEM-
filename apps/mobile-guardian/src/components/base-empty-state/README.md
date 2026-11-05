# Base Empty State

A staggered empty state with configurable icon, title, description, actions, border, and theme.

## How it works

1. Centered content uses 24 pt padding, a large radius and an optional dashed border.
2. The 40 pt icon box sits above an 18 pt title. Descriptions and actions are limited to 384 pt.
3. Icon, title, description and actions fade upward from 6 pt, staggered by 30 ms over 300 ms.
4. The icon also springs from 0.9 to 1 with stiffness 200, damping 20, mass 1.

## Install

```bash
npx nativeanimation add base-empty-state
```

The CLI also copies the family modules listed in `registryDependencies`. Dependencies, if you copy by hand:

```bash
npx expo install react-native-reanimated react-native-worklets
```

## Usage

```tsx
import { FolderPlus } from 'lucide-react-native';
import { BaseEmptyState } from './base-empty-state';
import { BaseButton } from './base-button';

<BaseEmptyState
  icon={<FolderPlus size={24} color={theme.colors.foreground} />}
  title="No projects yet"
  description="Keep your tasks and files together in one place."
  actions={<BaseButton onPress={createProject}>Create project</BaseButton>}
/>
```

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. Every piece also takes a `theme` prop that wins over the provider.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `ReactNode` | — | Icon inside a 40 pt muted box; supply a 24 pt icon in foreground color. |
| `title` | `string` | — | Required heading. |
| `description` | `string` | — | Supporting explanation. |
| `actions` | `ReactNode` | — | Actions arranged in a wrapping centered row. |
| `bordered` | `boolean` | `true` | Shows the dashed border. |
| `theme` | `BaseTheme` | `provider` | Overrides the theme from BaseThemeProvider. |
| `style` | `StyleProp<ViewStyle>` | — | Container style. |
| `testID` | `string` | — | Stable identifier on the root view. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Runs on iOS, Android and web, in Expo Go
and in development builds. Part of **Native Animation Base**, a free family that shares one theme: install
`base-theme` once (the CLI does it for you) and every Base piece picks it up. Free forever. MIT.

## Accessibility

The title is a heading and the decorative icon is hidden from screen readers. Caller-supplied actions keep their own labels and semantics. With Reduce Motion on, content appears immediately without staggering, translation, or scaling. The included demo uses Base buttons for its actions.
