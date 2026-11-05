# Base Avatar

An avatar and overlapping group with press feedback and configurable images, initials, size, and theme.

## How it works

1. Avatars are 24, 32, or 40 pt circles, with initials behind the image and as the error fallback. Presence dots are 8, 10, or 12 pt with a 2 pt background ring.
2. Group members overlap by 8 pt and each has a 2 pt background ring. Extra people become a +N counter.
3. Holding a member lifts it by 30% of its diameter using a 300/17 spring with mass 1. Its name enters from opacity 0 and scale 0.7 using a 400/29 spring with mass 1.
4. Release or gesture cancellation returns the avatar and fades/scales the label out in 130 ms using the theme leave curve. The active preview renders above its neighbors. Only the face and label move; the touch target stays in place during the lift.

## Install

```bash
npx nativeanimation add base-avatar
```

The CLI also copies `base-theme`. Dependencies, if you copy by hand:

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets
```

Load the Geist regular and medium fonts used by the theme once in your app, or supply your own font names in a custom theme. Interactive pieces need a `GestureHandlerRootView` at the app root. The usage examples with buttons or switches assume those Base pieces are installed separately.

## Usage

```tsx
import { BaseAvatar, BaseAvatarGroup } from './base-avatar';

<BaseAvatar source={photo} fallback="AL" status="online"
  accessibilityLabel="Alex Lee, online" />
<BaseAvatarGroup size="lg" max={4} avatars={[
  { key: 'alex', source: photo, fallback: 'AL', name: 'Alex Lee' },
  { key: 'jordan', fallback: 'JR', name: 'Jordan Reed' },
]} onPress={openMembers} accessibilityLabel="View team members" />
```

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. Every piece also takes a `theme` prop that wins over the provider.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `BaseAvatar: source` | `ImageSourcePropType` | `—` | Local or remote React Native image; fallback remains until it loads and on error. |
| `fallback` | `string` | `required` | Initials shown without an image. |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | 24, 32, or 40 pt diameter. |
| `status` | `'online' \| 'busy' \| 'none'` | `'none'` | Presence dot with a background-colored ring. |
| `theme` | `BaseTheme` | `provider` | Shared theme override. |
| `style` | `StyleProp<ViewStyle>` | `—` | Root style, also available on the group. |
| `testID` | `string` | `—` | Root identifier, also available on the group. |
| `accessibilityLabel` | `string` | `fallback + status` | Name and presence; also available on the group as a group label. |
| `BaseAvatarGroup: avatars` | `AvatarItem[]` | `required` | Items have key, fallback, name, and optional source. |
| `max` | `number` | `4` | Maximum visible people before the +N counter; clamped to a nonnegative integer. |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Diameter of every group member and counter. |
| `activeKey` | `string \| null` | `uncontrolled` | Optional controlled name preview, useful for presentations. |
| `onPress` | `() => void` | `—` | Optional action for the whole group; replaces individual interaction with one target. |
| `onActiveChange` | `(key: string \| null) => void` | `—` | Touch/focus preview changes; supply with activeKey for controlled use. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Targets iOS, Android, and web, including Expo Go and development builds. Part of **Native Animation Base**, a free family sharing one theme; the CLI installs its family dependencies automatically.

## Accessibility

Provide names for standalone images and include presence in a custom label. Without a group onPress, members expose each person's full name; the counter lists the hidden names. Members reserve 44 pt height and use horizontal `hitSlop` to expand small visuals. Adjacent hit areas overlap, so the topmost avatar receives a touch in the overlap. Keyboard focus or Enter/Space reveals names on web. Accessibility activation toggles the preview. Reduce Motion removes lift and scale and changes the tooltip immediately.


## Touch targets

Use the optional group onPress to open a member list. It provides one target of at least 48×48 dp on Android and 48×48 pt on iOS and 48×48 px on web, with accessibilityLabel or “View N members” as its name. It replaces individual touch and keyboard previews while preserving controlled previews. Without onPress, overlapping members keep their existing name previews; their individual targets do not meet the 44/48 minimum. Standalone avatars are images. Do not shrink or overlap the group target.
