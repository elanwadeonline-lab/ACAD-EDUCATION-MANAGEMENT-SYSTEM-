"use client";

import React from "react";

export interface ActiveGoldBadgeProps {
  type?: "session" | "term" | "custom";
  label?: string;
  size?: "sm" | "md" | "lg";
  glowing?: boolean;
  showDot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ActiveGoldBadge({
  type = "session",
  label,
  size = "sm",
  className = "",
  style = {},
}: ActiveGoldBadgeProps) {
  const defaultLabel =
    label ||
    (type === "session"
      ? "Active Session"
      : type === "term"
      ? "Active Term"
      : "Active");

  const isSmall = size === "sm";
  const isLarge = size === "lg";

  const padding = isSmall
    ? "0.125rem 0.45rem"
    : isLarge
    ? "0.25rem 0.65rem"
    : "0.175rem 0.5rem";
  const fontSize = isSmall ? "0.6875rem" : isLarge ? "0.75rem" : "0.6875rem";

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.01em",
        padding,
        borderRadius: "4px",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-3)",
        lineHeight: 1.2,
        userSelect: "none",
        ...style,
      }}
    >
      <span>{defaultLabel}</span>
    </span>
  );
}
