"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useStudentTheme } from "../context/StudentThemeContext";

interface StudentThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function StudentThemeToggle({ className = "", compact = false }: StudentThemeToggleProps) {
  const { isDark, toggleTheme } = useStudentTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        height: "38px",
        minHeight: "38px",
        padding: compact ? "0 10px" : "0 14px",
        borderRadius: "99px",
        fontSize: "0.8125rem",
        fontWeight: 600,
        color: isDark ? "#F8FAFC" : "#1E293B",
        backgroundColor: isDark ? "#1E2533" : "#FFFFFF",
        border: isDark ? "1px solid #333E54" : "1px solid #CBD5E1",
        cursor: "pointer",
        transition: "all 150ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {isDark ? (
        <>
          <Sun size={16} color="#FBBF24" strokeWidth={2.2} />
          {!compact && <span>Light</span>}
        </>
      ) : (
        <>
          <Moon size={15} color="#64748B" strokeWidth={2.2} />
          {!compact && <span>Dark</span>}
        </>
      )}
    </button>
  );
}

