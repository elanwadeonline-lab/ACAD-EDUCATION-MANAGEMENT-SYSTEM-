"use client";

import React from "react";
import { SunIcon as Sun } from '@phosphor-icons/react/dist/csr/Sun';
import { MoonIcon as Moon } from '@phosphor-icons/react/dist/csr/Moon';
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
        color: "var(--color-text)",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        cursor: "pointer",
        transition: "all 150ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {isDark ? (
        <>
          <Sun size={16} weight="fill" color="var(--icon-gold)" />
          {!compact && <span>Light</span>}
        </>
      ) : (
        <>
          <Moon size={15} weight="fill" color="var(--icon-purple)" />
          {!compact && <span>Dark</span>}
        </>
      )}
    </button>
  );
}

