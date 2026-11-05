"use client";

import React from "react";

export interface AcqadLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  showSubtitle?: boolean;
  theme?: "gold" | "monochrome" | "dark";
  className?: string;
  badgeStyle?: boolean;
  wordmarkWeight?: 500 | 600 | 700;
}

/**
 * AcqadMark: The official tilted emblem with inner diamond and dual-gradient contour
 * Extracted directly from the official Acqad flyer and branding assets.
 */
export function AcqadMark({
  width = 32,
  height = 32,
  className = "",
  theme = "gold",
}: {
  width?: number;
  height?: number;
  className?: string;
  theme?: "gold" | "monochrome" | "dark";
}) {
  const isGold = theme === "gold";
  const markId = React.useId().replace(/:/g, "");

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Acqad Logo"
    >
      <defs>
        {/* Acqad Imperial Gold Gradient */}
        <linearGradient id={`${markId}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="45%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Acqad Metallic Platinum / Chrome Gradient */}
        <linearGradient id={`${markId}-chrome`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* Ambient Glow */}
        <filter id={`${markId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#F59E0B" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Main Tilted Geometric Shield Body */}
      <g transform="rotate(-12 50 50)" filter={isGold ? `url(#${markId}-glow)` : undefined}>
        {/* Outer Tilted Asymmetric Rounded Square */}
        <path
          d="M20 28 C20 18, 30 14, 46 16 L76 22 C84 24, 88 32, 86 42 L80 74 C78 84, 70 88, 56 86 L26 80 C16 78, 14 70, 16 58 Z"
          fill={isGold ? `url(#${markId}-gold)` : "currentColor"}
        />

        {/* Bottom Metallic Chrome Accent Corner */}
        {isGold && (
          <path
            d="M16 58 L26 80 C70 88, 78 84, 80 74 L83 60 C55 68, 30 65, 16 58 Z"
            fill={`url(#${markId}-chrome)`}
            opacity="0.95"
          />
        )}

        {/* Inner Curved Contour Cutout (Teardrop / Diamond Negative Space) */}
        <path
          d="M32 36 C30 26, 68 28, 72 34 C76 40, 72 68, 66 72 C60 76, 28 72, 32 36 Z"
          fill="#0C0D12"
        />

        {/* Central Rotated Diamond Dot (Acqad Core) */}
        <rect
          x="44"
          y="44"
          width="15"
          height="15"
          rx="2"
          transform="rotate(45 51.5 51.5)"
          fill={isGold ? "#F59E0B" : "currentColor"}
        />
      </g>
    </svg>
  );
}

/**
 * Full Acqad Brand Lockup with mark + typography and optional circular emblem badge
 */
export function AcqadLogo({
  size = "md",
  showWordmark = true,
  showSubtitle = false,
  theme = "gold",
  className = "",
  badgeStyle = false,
  wordmarkWeight = 700,
}: AcqadLogoProps) {
  const sizeMap = {
    sm: { icon: 22, text: "text-lg", sub: "text-[9px]" },
    md: { icon: 28, text: "text-xl", sub: "text-[10px]" },
    lg: { icon: 38, text: "text-2xl", sub: "text-xs" },
    xl: { icon: 54, text: "text-4xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];

  // Circular Badge Mode (Matching the 3D Metallic Flyer Badge)
  if (badgeStyle) {
    return (
      <div
        className={`relative inline-flex flex-col items-center justify-center rounded-full p-8 shadow-2xl ${className}`}
        style={{
          background: "radial-gradient(circle at 50% 30%, #1E2230 0%, #0C0D12 60%, #060709 100%)",
          border: "3px solid #94A3B8",
          boxShadow: "0 0 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.1), 0 0 20px rgba(245,158,11,0.2)",
        }}
      >
        <AcqadMark width={size === "xl" ? 72 : 56} height={size === "xl" ? 72 : 56} theme="gold" />
        <span className="mt-3 font-display text-3xl font-bold tracking-tight text-white">Acqad</span>
        {showSubtitle && (
          <span className="mt-1 max-w-[220px] text-center text-[10px] font-medium leading-tight tracking-wider uppercase text-slate-300">
            Academic Coordination, Quality & Administration, Digital Platform
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <AcqadMark width={currentSize.icon} height={currentSize.icon} theme={theme} />
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span
              className={`font-display ${currentSize.text} font-semibold tracking-tight`}
              style={{ letterSpacing: "-0.03em", fontWeight: wordmarkWeight }}
            >
              Acqad
            </span>
          </div>
          {showSubtitle && (
            <span className={`font-sans ${currentSize.sub} font-medium uppercase tracking-widest text-amber-500/90 dark:text-amber-400/90 mt-0.5`}>
              Digital Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
