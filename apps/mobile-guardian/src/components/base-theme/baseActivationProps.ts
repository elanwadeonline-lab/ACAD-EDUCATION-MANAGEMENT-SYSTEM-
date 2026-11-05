import type { KeyboardEvent, MouseEvent } from 'react';
import { Platform, type AccessibilityActionEvent } from 'react-native';

/** Complements Gesture.Tap with assistive activation. Keyboard capture prevents a second activation by Gesture Handler. */
export function baseActivationProps(activate: () => void, disabled = false) {
  const run = () => {
    if (!disabled) activate();
  };
  return {
    onAccessibilityTap: run,
    accessibilityActions: disabled ? [] : [{ name: 'activate' as const }],
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'activate') run();
    },
    ...(Platform.OS === 'web'
      ? {
          tabIndex: disabled ? (-1 as const) : (0 as const),
          onKeyDownCapture: (event: KeyboardEvent) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              if (!event.repeat) run();
            }
          },
          // Virtual clicks from assistive technology have no pointer gesture.
          onClick: (event: MouseEvent) => {
            if (event.detail === 0) run();
          },
        }
      : {}),
  };
}
