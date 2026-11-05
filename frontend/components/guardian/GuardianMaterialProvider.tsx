"use client";
import { useMemo, type ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useGuardian } from "./GuardianContext";

export function GuardianMaterialProvider({ children }: { children: ReactNode }) {
 const { theme } = useGuardian();
 const materialTheme = useMemo(() => createTheme({
  palette: { mode: theme, primary: { main: theme === "dark" ? "#F59E0B" : "#92400E" }, background: { paper: theme === "dark" ? "#1C1D22" : "#FFFFFF" } },
  typography: { fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", button: { textTransform: "none", fontWeight: 500 } },
  shape: { borderRadius: 16 },
  components: { MuiBottomNavigationAction: { styleOverrides: { root: { minWidth: 0, minHeight: 56 }, label: { fontSize: "0.6875rem", "&.Mui-selected": { fontSize: "0.6875rem" } } } }, MuiButtonBase: { defaultProps: { disableRipple: false } } }
 }), [theme]);
 return <AppRouterCacheProvider options={{ key: "guardian", enableCssLayer: true }}><ThemeProvider theme={materialTheme}>{children}</ThemeProvider></AppRouterCacheProvider>;
}

