import { createContext, useContext } from 'react';

// Internal family bridge: a menu's existing trigger API remains unchanged.
export const BaseTriggerState = createContext<
  { expanded: boolean } | undefined
>(undefined);
export function useBaseTriggerState() {
  return useContext(BaseTriggerState);
}
