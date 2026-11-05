"use client";

import React from "react";
import styles from "./XpTargetWave.module.css";

interface XpTargetWaveProps {
  className?: string;
  progress?: number;
}

export function XpTargetWave({ className = "", progress }: XpTargetWaveProps) {
  return (
    <div
      className={`${styles.waveWrapper} ${className}`.trim()}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 500 170"
        preserveAspectRatio="none"
        className={styles.waveSvg}
      >
        <defs>
          {/* Layer 1 - Crest (Pale warm gold / cream) */}
          <linearGradient id="xpWaveL1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#FDE68A" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#FCD34D" stopOpacity="0.90" />
          </linearGradient>

          {/* Layer 2 - Upper body (Warm sunny gold) */}
          <linearGradient id="xpWaveL2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.98" />
            <stop offset="50%" stopColor="#FCD34D" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.95" />
          </linearGradient>

          {/* Layer 3 - Mid body (Rich amber) */}
          <linearGradient id="xpWaveL3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Layer 4 - Base body (Deep golden orange) */}
          <linearGradient id="xpWaveL4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="45%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Layer 5 - Deep foundation (Rich glowing burnt amber) */}
          <linearGradient id="xpWaveL5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="70%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>

          <filter id="waveSoftShadow" x="-5%" y="-5%" width="110%" height="115%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#B45309" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Layer 1: Highest Crest */}
        <path
          d="M 0 120
             C 60 135, 110 138, 170 128
             C 240 116, 290 85, 340 48
             C 380 18, 420 16, 450 38
             C 475 56, 490 74, 500 86
             L 500 170
             L 0 170
             Z"
          fill="url(#xpWaveL1)"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />

        {/* Layer 2: Second Contour */}
        <path
          d="M 0 132
             C 65 144, 115 146, 175 137
             C 245 125, 295 98, 345 64
             C 385 36, 425 34, 455 54
             C 478 70, 492 88, 500 98
             L 500 170
             L 0 170
             Z"
          fill="url(#xpWaveL2)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1"
        />

        {/* Layer 3: Third Contour */}
        <path
          d="M 0 143
             C 70 152, 120 153, 180 146
             C 250 135, 300 110, 350 80
             C 390 54, 430 52, 460 70
             C 480 84, 494 100, 500 112
             L 500 170
             L 0 170
             Z"
          fill="url(#xpWaveL3)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
        />

        {/* Layer 4: Fourth Contour */}
        <path
          d="M 0 153
             C 75 159, 125 159, 185 154
             C 255 145, 305 124, 355 98
             C 395 74, 435 72, 465 88
             C 483 98, 495 114, 500 126
             L 500 170
             L 0 170
             Z"
          fill="url(#xpWaveL4)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.8"
        />

        {/* Layer 5: Deep Base Foundation */}
        <path
          d="M 0 162
             C 80 165, 130 164, 190 161
             C 260 154, 310 138, 360 116
             C 400 94, 440 92, 470 106
             C 485 114, 496 128, 500 138
             L 500 170
             L 0 170
             Z"
          fill="url(#xpWaveL5)"
        />
      </svg>
    </div>
  );
}
