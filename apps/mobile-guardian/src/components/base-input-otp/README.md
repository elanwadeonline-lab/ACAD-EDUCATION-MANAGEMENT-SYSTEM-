# Base Input OTP

A passcode field with a sliding focus ring and configurable code length, digit groups, and theme.

## How it works

1. One invisible numeric `TextInput` owns focus, autofill, and the keyboard.
2. Visible slots render the current string so the layout stays predictable on every platform.
3. A shared focus ring springs between slots while new digits use a glyph spring.
4. Pasted codes are accepted as one change, and completion is reported through `onComplete`.
5. Error feedback uses a short horizontal shake and destructive border color.

## Install

```bash
npx nativeanimation add base-input-otp
```

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets
```

## Usage

```tsx
<BaseInputOTP value={code} onChangeText={setCode} onComplete={submit} />
```

```tsx
<BaseInputOTP length={6} groups={[3, 3]} error={hasError} autoFocus accessibilityLabel="Verification code" />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | 6 | Number of numeric characters. |
| `value` | `string` | `""` | Controlled code value. |
| `onChangeText` | `(value: string) => void` | — | Called with filtered numeric text. |
| `onComplete` | `(code: string) => void` | — | Called when the code reaches `length`. |
| `groups` | `number[]` | `[length]` | Slot groups separated by an en dash. |
| `error` | `boolean` | false | Uses destructive styling and shakes the field. |
| `disabled` | `boolean` | false | Disables focus and input. |
| `autoFocus` | `boolean` | false | Focuses the hidden input on mount. |
| `theme` | `BaseTheme` | provider | Overrides the family theme. |
| `style` | `StyleProp<ViewStyle>` | — | Root style. |
| `testID` | `string` | — | Stable root identifier. |

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Runs on iOS, Android, and web in Expo Go or a development build.

## Accessibility

The hidden input exposes one-time-code autofill and a numeric keyboard. The root announces the field label and disabled state. Reduced motion removes slot and error movement while preserving focus and color feedback.
