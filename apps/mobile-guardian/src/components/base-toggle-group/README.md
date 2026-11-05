# Base Toggle Group

Spring-driven toggles, sliding single selection, and checkmark filter chips with configurable items, selection, sizes, variants, and theme.

## How it works

1. `BaseToggle` works on its own; `BaseToggleGroup` manages a single string or multiple selected values.
2. Default single selection moves one measured indicator with the highlight spring (500/40, mass 1). Other variants fade their background and text in 200 ms.
3. Chips reveal a checkmark with the pop spring (400/29, mass 1), remove it in 150 ms, and resize its space with the reflow spring (500/40, mass 1).
4. Press feedback uses scale 0.97 and the press spring (550/30, mass 1). Visual heights are 32/36/40 pt; the surrounding target is at least 44 pt on iOS/web and 48 dp on Android.

For more elaborate filtering and list rearrangement, explore `filter-chips-reflow`.

## Install

```bash
npx nativeanimation add base-toggle-group
```

The CLI also copies `base-theme`. Dependencies, if you copy by hand:

```bash
npx expo install lucide-react-native react-native-svg react-native-gesture-handler react-native-reanimated react-native-worklets
```

Mount a `GestureHandlerRootView` at the app root. Free forever. MIT.

## Usage

```tsx
import { BaseToggle, BaseToggleGroup } from './base-toggle-group';

<BaseToggle label="Bookmark" value={saved} onValueChange={setSaved} />
<BaseToggleGroup
  type="multiple"
  variant="chip"
  value={teams}
  onValueChange={setTeams}
  items={[
    { value: 'design', label: 'Design' },
    { value: 'engineering', label: 'Engineering' },
  ]}
  accessibilityLabel="Teams"
/>
```

```tsx
<BaseToggleGroup
  value={view}
  onValueChange={setView}
  attached
  items={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]}
  accessibilityLabel="View"
/>
```

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. The `theme` prop overrides the provider. Supply 16 pt icons through `icon`. Icon-only items use their `value` as their accessible name, so use readable values.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `{ value: string; label?: string; icon?: ReactNode; disabled?: boolean }[]` | — | Group options. Values must be unique. |
| `type` | `'single' \| 'multiple'` | `'single'` | Group selection mode. |
| `value` | `string \| string[]` | empty selection | Controlled group value, matching `type`. |
| `onValueChange` | `(value) => void` | — | Receives the string or array for the selected mode. Selecting the active single item clears it. |
| `attached` | `boolean` | `false` | Joins items with outer corner radii and shared borders. |
| `variant` | `'default' \| 'outline' \| 'chip'` | `'default'` | Surface and selection treatment. |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Visual height 32, 36, or 40 pt. Chips always use 32 pt. |
| `theme` | `BaseTheme` | provider | Theme override. |
| `style` | `StyleProp<ViewStyle>` | — | Container style. |
| `testID` | `string` | — | Root ID; group controls append `-<value>`. |
| `accessibilityLabel` | `string` | — | Group or standalone control name. |

`BaseToggle` shares the appearance props above and takes the following instead of `items`, `type`, and `attached`:

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `boolean` | — | Controlled selected state. |
| `defaultValue` | `boolean` | `false` | Uncontrolled initial state. |
| `onValueChange` | `(value: boolean) => void` | — | Receives the selected state. |
| `label` | `string` | — | Visible and accessible name. |
| `icon` | `ReactNode` | — | Optional caller-owned icon. |
| `disabled` | `boolean` | `false` | Prevents activation and dims to 0.5. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Targets iOS, Android, and web, in Expo Go and development builds. Part of **Native Animation Base**, a free family sharing one theme. No safe-area padding is applied. Multiple groups wrap; attached and sliding groups stay on one row, so keep their item count appropriate to the available width.

## Accessibility

Single groups expose a radio group and radio items; standalone and multiple toggles expose buttons with selected and checked states. Disabled controls cannot activate. Supports screen-reader activation, Enter/Space, and a custom focus ring on web. Reduce Motion removes scaling and moving/resizing springs and applies selection immediately.
