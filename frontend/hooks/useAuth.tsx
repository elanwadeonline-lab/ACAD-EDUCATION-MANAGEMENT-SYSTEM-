"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  api,
  clearTabSession,
  getSession,
  inferPortalRoleFromPath,
  setTabSession,
  type SessionUser,
} from "../lib/api";

type User = SessionUser;

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True when GET /api/auth/me returned 503 (server in first-run setup). */
  setupRequired: boolean;
};

type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "HYDRATE_SESSION"; payload: { user: User | null; setupRequired: boolean } };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
};

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setupRequired: false,
};

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false, setupRequired: false };
    case "LOGOUT":
      return { ...state, user: null, isAuthenticated: false, isLoading: false, setupRequired: false };
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: Boolean(action.payload),
        isLoading: false,
        setupRequired: false,
      };
    case "HYDRATE_SESSION":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: Boolean(action.payload.user),
        isLoading: false,
        setupRequired: action.payload.setupRequired,
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const pathname = usePathname();
  const portalRole = useMemo(() => inferPortalRoleFromPath(pathname || undefined), [pathname]);

  const init = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const { user, setupRequired } = await getSession(portalRole);
      dispatch({ type: "HYDRATE_SESSION", payload: { user, setupRequired } });
    } catch {
      dispatch({ type: "LOGOUT" });
    }
  }, [portalRole]);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const result = await api.login({ email, password });
      // fetchWithAuth now throws on 401, so result should always be truthy here.
      // Keep the null guard as a safety net for unexpected edge cases.
      if (!result) throw new Error("Login failed. Please try again.");
      const loggedInUser = (result.user ?? result) as User;
      if (result.token) {
        setTabSession(result.token, loggedInUser?.role ?? null, result.session_id ?? null);
      }
      dispatch({ type: "LOGIN", payload: loggedInUser });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    const currentRole = state.user?.role ?? portalRole;
    await api.logout().catch(() => undefined);
    clearTabSession(currentRole);
    try {
      if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_AUTH_CACHE" });
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_GUARDIAN_CACHE" });
      }
    } catch {}
    dispatch({ type: "LOGOUT" });
  }, [state.user?.role, portalRole]);

  useEffect(() => {
    void init();
  }, [init]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      init,
    }),
    [state, login, logout, init],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
