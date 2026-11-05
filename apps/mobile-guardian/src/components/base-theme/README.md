# Base Theme

The shared theme of **Native Animation Base**: a neutral palette in light and dark, six named accents, radii, shadows
and the motion tokens (springs, curves and durations) every Base piece animates with.

## How it works

1. `createBaseTheme({ scheme, accent })` returns plain tokens: colors (background, foreground, card, primary, muted,
   border, input, ring…), radius (`--radius` 0.625rem → 6/8/10/14), shadows and fonts.
2. Accents replace only `primary`, `primaryForeground`, `ring`, and the derived `ringSoft`; all surfaces stay neutral.
3. Motion tokens hold named springs (always with `mass: 1`), cubic-bezier curves and durations; `spring()` and
   `timing()` turn them into Reanimated configs.
4. `BaseThemeProvider` shares one theme with every Base piece; `useBaseTheme()` reads it.

## Install

```bash
npx nativeanimation add base-theme
```

Every Base piece installs it automatically.

## Usage

```tsx
import { BaseThemeProvider } from './base-theme';

export default function App() {
  const scheme = useColorScheme() ?? 'light';
  return (
    <BaseThemeProvider scheme={scheme} accent="bloom">
      <Root />
    </BaseThemeProvider>
  );
}
```

Your own palette:

```tsx
const brand = createBaseTheme({ scheme: 'light' });
brand.colors.primary = '#e11d48';
<BaseThemeProvider theme={brand}>…</BaseThemeProvider>
```

The fonts are Geist (`Geist_400Regular`, `Geist_500Medium`) loaded with `@expo-google-fonts/geist`; replace
`theme.fonts` to use your own.

## Props (`BaseThemeProvider`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `scheme` | `'light' \| 'dark'` | `'light'` | Color scheme. |
| `accent` | `BaseAccent` (keys and aliases below) | `'neutral'` | Primary, primary foreground, and focus ring colors. |
| `theme` | `BaseTheme` | — | A fully custom theme; wins over `scheme` and `accent`. |

## Accents

| Name | Key | Legacy alias |
|---|---|---|
| Quill | `quill` | `neutral` (default) |
| Tide | `tide` | `blue` |
| Grove | `grove` | `green` |
| Bloom | `bloom` | `violet` |
| Cove | `cove` | — |
| Kiln | `kiln` | — |

`BaseAccent` accepts all six keys and all four legacy aliases. Aliases resolve to the same colors as their named
accent; `theme.accent` keeps the value you passed. Quill preserves the original neutral colors, including its ring.
The other legacy aliases use the new palette, so existing blue, green, and violet themes change appearance.
The default stays `neutral` in both `createBaseTheme()` and `BaseThemeProvider`.

Use the exported `baseAccents` list to build selectors in this order, with visible names instead of raw keys:

```tsx
import { baseAccents, createBaseTheme } from './base-theme';

const options = baseAccents.map(({ key, name }) => ({
  value: key,
  label: name,
  color: createBaseTheme({ scheme: 'light', accent: key }).colors.primary,
}));
```

`BaseAccentName` is the union of the six named keys. `BaseAccent` now includes ten keys; exhaustive switches and
`Record<BaseAccent, ...>` maps must handle the six new keys as well as the legacy aliases.

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Runs on iOS, Android and web, in Expo Go
and in development builds. Part of **Native Animation Base**, a free family that shares one theme: install
`base-theme` once (the CLI does it for you) and every Base piece picks it up.

## Accessibility

The nine text pairs in `contrast.test.mjs` meet 4.5:1 for all six accents and four aliases in light and dark
(20 key/scheme combinations). This includes primary text on its fill and muted text on the muted surface.
This is not a complete AA audit. Quill keeps the original focus ring, whose 50% composite falls below 3:1 on
neutral surfaces; focus contrast is outside this text-contrast test. Custom palettes need their own contrast checks.

`useBaseReducedMotion()` reads the initial system preference and subscribes to changes while the app is open
(`AccessibilityInfo` on native, plus `prefers-reduced-motion` on web). Base pieces skip or shorten motion immediately.
Native starts with reduced motion until the initial asynchronous preference query resolves.

Design tokens adapted from shadcn/ui (MIT). See `NOTICE.md`.
