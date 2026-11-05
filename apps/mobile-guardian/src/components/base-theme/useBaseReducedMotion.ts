import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const mediaQuery = () =>
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)')
    : undefined;

// Native starts conservatively until the asynchronous system query resolves.
let reduced = mediaQuery()?.matches ?? true;
const listeners = new Set<() => void>();

function getSnapshot() {
  return reduced;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size > 1) return () => unsubscribe(listener);

  let active = true;
  let revision = 0;
  const update = (value: boolean) => {
    if (!active) return;
    revision += 1;
    if (reduced === value) return;
    reduced = value;
    listeners.forEach((notify) => notify());
  };
  const subscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    update,
  );
  const query = mediaQuery();
  const onMediaChange = (event: MediaQueryListEvent) => update(event.matches);
  query?.addEventListener('change', onMediaChange);
  if (query) update(query.matches);
  else {
    const requestedAt = revision;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (revision === requestedAt) update(value);
    });
  }

  // All subscribers share one system listener; the last unsubscribe owns cleanup.
  cleanup = () => {
    active = false;
    subscription?.remove();
    query?.removeEventListener('change', onMediaChange);
  };
  return () => unsubscribe(listener);
}

let cleanup: (() => void) | undefined;
function unsubscribe(listener: () => void) {
  listeners.delete(listener);
  if (listeners.size === 0) {
    cleanup?.();
    cleanup = undefined;
  }
}

/** Live system preference, shared by all mounted Base controls. */
export function useBaseReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
