# Base Toast

A notification stack with swipe dismissal and configurable position, duration, visible count, and theme.

## How it works

1. The provider renders local notifications above its children without blocking the app while collapsed.
2. New notifications enter with a 280/24 spring, mass 1. The back cards scale down by 0.05 and peek out by 12 pt.
3. Tap the stack to expand it. Timers pause while expanded or dragging; an outside tap or 3 seconds of inactivity collapses it.
4. Swipe outward or sideways past 40% of a card, or release quickly, to dismiss. Exit uses the 200 ms away curve.

## Install

```bash
npx nativeanimation add base-toast
```

The CLI also copies `base-theme` and `base-button`. Dependencies, if you copy by hand:

```bash
npx expo install react-native-reanimated react-native-gesture-handler react-native-worklets lucide-react-native react-native-svg
```

Wrap the host app in `GestureHandlerRootView`.

## Usage

```tsx
import { BaseToastProvider, useBaseToast } from './base-toast';
import { BaseButton } from './base-button';

function SaveButton() {
  const toast = useBaseToast();
  return (
    <BaseButton onPress={() => toast.show({ title: 'Changes saved', variant: 'success' })}>
      Save changes
    </BaseButton>
  );
}

<BaseToastProvider bottomInset={insets.bottom} topInset={insets.top}>
  <SaveButton />
</BaseToastProvider>
```

```tsx
const id = toast.show({
  title: 'Upload failed',
  description: 'Check your connection and try again.',
  variant: 'error',
  action: { label: 'Retry', onPress: retryUpload },
});
toast.dismiss(id);
```

`useBaseToast()` returns `show(options) => id` and `dismiss(id)`. Options are `title`, optional `description`, `variant` (`default`, `success`, `error`), and `action: { label, onPress }`. Actions also dismiss their notification. Mount one provider above your app content, inside its `GestureHandlerRootView` and `BaseThemeProvider`. It fills its parent; pass safe-area insets from the host. Notifications are local to this provider and do not overlay a separately presented native Modal.

Wrap your app in `BaseThemeProvider` (from `base-theme`) to choose light/dark and an accent; without it, pieces use the light neutral theme. The `theme` prop overrides the provider. Load the font families declared in your theme once in the host app.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | — | App content; the provider must fill the screen. |
| `position` | `'top' \| 'bottom'` | 'bottom' | Screen edge for the stack. |
| `duration` | `number` | 5000 | Visible time in ms per notification; 0 or Infinity keeps it until dismissed. |
| `maxVisible` | `number` | 3 | Maximum active cards; older cards wait until space opens. |
| `bottomInset / topInset` | `number` | 0 | Safe-area insets supplied by the host. |
| `expanded` | `boolean` | uncontrolled | Optional external control of the stack. |
| `onExpandedChange` | `(expanded: boolean) => void` | — | Called when the stack requests expansion or collapse. |
| `dismissLabel / expandLabel` | `string` | English labels | Accessible action labels. |
| `theme` | `BaseTheme` | provider | Overrides the shared family theme. |
| `style` | `StyleProp<ViewStyle>` | — | Container style. |
| `testID` | `string` | — | Stable test identifier. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Runs on iOS, Android and web, in Expo Go and development builds. Part of **Native Animation Base**, a free family that shares one theme.

## Accessibility

Notifications use a polite live region. Their expandable content exposes a button with synchronized expanded state. Notification actions remain separate accessible buttons. Accessibility actions expose dismissal and expansion; on web, Enter/Space expands and Escape/Delete dismisses a focused notification. Reduce Motion removes scale and animated displacement and makes entry/exit immediate.
