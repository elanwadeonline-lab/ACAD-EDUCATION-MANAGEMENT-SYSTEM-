"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface StudentThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const StudentThemeContext = createContext<StudentThemeContextType>({
  theme: "light",
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = "acqad_student_theme";
function applyTheme(theme:Theme) {
  const root=document.documentElement;
  root.dataset.theme=theme;
  root.classList.toggle('dark',theme==='dark');
  root.style.colorScheme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0A0D14':'#FFFFFF');
}

export function StudentThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const sync=()=>{
      let saved:string|null=null;
      try{saved=localStorage.getItem(STORAGE_KEY)||localStorage.getItem('acqad_theme');}catch{}
      const next:Theme=saved==='light'||saved==='dark'?saved:media.matches?'dark':'light';
      setThemeState(next);applyTheme(next);
    };
    const storage=(event:StorageEvent)=>{if(event.key===STORAGE_KEY||event.key==='acqad_theme'||event.key===null)sync();};
    sync();media.addEventListener('change',sync);window.addEventListener('storage',storage);
    return()=>{media.removeEventListener('change',sync);window.removeEventListener('storage',storage);};
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem('acqad_theme', next);
    } catch {}
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <StudentThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme, setTheme }}>
      {children}
    </StudentThemeContext.Provider>
  );
}

export function useStudentTheme() {
  return useContext(StudentThemeContext);
}

