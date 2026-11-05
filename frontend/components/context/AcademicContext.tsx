"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

export interface AcademicSession {
  id: number;
  name: string;
  is_active: number;
  status: string;
  created_at?: string;
}

export interface AcademicTerm {
  id: number;
  session_id: number;
  name: "First Term" | "Second Term" | "Third Term" | string;
  start_date?: string;
  end_date?: string;
  is_active: number;
  status: string;
  registration_open?: number;
}

interface AcademicContextType {
  activeSession: AcademicSession | null;
  activeTerm: AcademicTerm | null;
  selectedSession: AcademicSession | null;
  selectedTerm: AcademicTerm | null;
  sessions: AcademicSession[];
  terms: AcademicTerm[];
  setSelectedSession: (session: AcademicSession | null) => void;
  setSelectedTerm: (term: AcademicTerm | null) => void;
  refreshAcademic: () => Promise<void>;
  loading: boolean;
}

const AcademicContext = createContext<AcademicContextType>({
  activeSession: null,
  activeTerm: null,
  selectedSession: null,
  selectedTerm: null,
  sessions: [],
  terms: [],
  setSelectedSession: () => {},
  setSelectedTerm: () => {},
  refreshAcademic: async () => {},
  loading: true,
});

export const AcademicProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeSession, setActiveSession] = useState<AcademicSession | null>(null);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [selectedSession, setSelectedSessionRaw] = useState<AcademicSession | null>(null);
  const [selectedTerm, setSelectedTermRaw] = useState<AcademicTerm | null>(null);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab-isolated persistence — use sessionStorage so academic session/term selection in one tab
  // never contaminates another user's or role's tab in the same browser.
  const setSelectedSession = useCallback((s: AcademicSession | null) => {
    setSelectedSessionRaw(s);
    try {
      if (s) sessionStorage.setItem("exampool_selected_session", JSON.stringify(s));
      else sessionStorage.removeItem("exampool_selected_session");
    } catch {}
  }, []);
  const setSelectedTerm = useCallback((t: AcademicTerm | null) => {
    setSelectedTermRaw(t);
    try {
      if (t) sessionStorage.setItem("exampool_selected_term", JSON.stringify(t));
      else sessionStorage.removeItem("exampool_selected_term");
    } catch {}
  }, []);

  const refreshAcademic = useCallback(async () => {
    try {
      setLoading(true);
      const resActive = await api.getActiveAcademic();
      const resAll = await api.getAcademicSessions().catch(() => ({ sessions: [], terms: [] }));
      
      if (resAll) {
        setSessions(resAll.sessions || []);
        setTerms(resAll.terms || []);
      }

      if (resActive) {
        if (resActive.activeSession) {
          setActiveSession(resActive.activeSession);
          // Restore persisted selection if valid, otherwise default to active
          try {
            const stored = sessionStorage.getItem("exampool_selected_session");
            if (stored) {
              const parsed = JSON.parse(stored);
              const stillExists = resAll?.sessions?.some((s: any) => s.id === parsed.id);
              if (stillExists) {
                setSelectedSessionRaw(parsed);
              } else {
                setSelectedSessionRaw(resActive.activeSession);
                sessionStorage.setItem("exampool_selected_session", JSON.stringify(resActive.activeSession));
              }
            } else {
              setSelectedSessionRaw(resActive.activeSession);
            }
          } catch {
            setSelectedSessionRaw(resActive.activeSession);
          }
        } else {
          setActiveSession(null);
          setSelectedSessionRaw(null);
          try { sessionStorage.removeItem("exampool_selected_session"); } catch {}
        }

        if (resActive.activeTerm) {
          setActiveTerm(resActive.activeTerm);
          try {
            const storedT = sessionStorage.getItem("exampool_selected_term");
            if (storedT) {
              const parsedT = JSON.parse(storedT);
              // Allow null (All Terms) persistence
              if (parsedT === null) {
                setSelectedTermRaw(null);
              } else {
                const stillExistsT = resAll?.terms?.some((t: any) => t.id === parsedT.id);
                if (stillExistsT) {
                  setSelectedTermRaw(parsedT);
                } else {
                  setSelectedTermRaw(resActive.activeTerm);
                  sessionStorage.setItem("exampool_selected_term", JSON.stringify(resActive.activeTerm));
                }
              }
            } else {
              setSelectedTermRaw(resActive.activeTerm);
            }
          } catch {
            setSelectedTermRaw(resActive.activeTerm);
          }
        } else {
          setActiveTerm(null);
          setSelectedTermRaw(null);
          try { sessionStorage.removeItem("exampool_selected_term"); } catch {}
        }
      }
    } catch (e) {
      console.warn("AcademicContext initialization warning:", e);
      const year = new Date().getFullYear();
      const defaultSession = { id: 1, name: `${year}/${year + 1}`, is_active: 1, status: "active" };
      const defaultTerm = { id: 1, session_id: 1, name: "First Term", is_active: 1, status: "active" };
      setActiveSession(defaultSession);
      setSelectedSessionRaw((prev) => prev || defaultSession);
      setActiveTerm(defaultTerm);
      setSelectedTermRaw((prev) => (prev === null ? null : prev || defaultTerm));
      setSessions((prev) => (prev.length ? prev : [defaultSession]));
      setTerms((prev) => (prev.length ? prev : [defaultTerm]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAcademic();
  }, [refreshAcademic]);

  return (
    <AcademicContext.Provider
      value={{
        activeSession,
        activeTerm,
        selectedSession,
        selectedTerm,
        sessions,
        terms,
        setSelectedSession,
        setSelectedTerm,
        refreshAcademic,
        loading,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => useContext(AcademicContext);
