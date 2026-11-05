import React, { createContext, useContext, useMemo } from 'react';
import {
  createBaseTheme,
  type BaseAccent,
  type BaseScheme,
  type BaseTheme,
} from './theme';

const fallback = createBaseTheme();
const BaseThemeContext = createContext<BaseTheme>(fallback);

export function BaseThemeProvider({
  children,
  scheme = 'light',
  accent = 'neutral',
  theme,
}: {
  children: React.ReactNode;
  scheme?: BaseScheme;
  accent?: BaseAccent;
  /** A fully custom theme; wins over scheme and accent. */
  theme?: BaseTheme;
}) {
  const value = useMemo(
    () => theme ?? createBaseTheme({ scheme, accent }),
    [theme, scheme, accent],
  );
  return (
    <BaseThemeContext.Provider value={value}>
      {children}
    </BaseThemeContext.Provider>
  );
}

/** The theme from the nearest provider, or light neutral without one. A `theme` prop wins over both. */
export function useBaseTheme(override?: BaseTheme) {
  const context = useContext(BaseThemeContext);
  return override ?? context;
}
