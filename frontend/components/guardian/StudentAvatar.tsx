"use client";

import React from "react";

interface Props {
  name?: string;
  gender?: "boy" | "girl" | "auto";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  imageUrl?: string | null;
  className?: string;
  showBadge?: boolean;
}

const SIZE_MAP = {
  xs: { box: 28, svg: 18, radius: "8px" },
  sm: { box: 36, svg: 22, radius: "10px" },
  md: { box: 48, svg: 30, radius: "14px" },
  lg: { box: 64, svg: 40, radius: "18px" },
  xl: { box: 88, svg: 56, radius: "24px" },
};

// Deterministic gender / palette heuristic based on child's name
function getChildStyle(name: string = "", genderProp?: "boy" | "girl" | "auto") {
  const femaleNames = ["sarah", "mary", "grace", "amina", "zainab", "ngozi", "chioma", "fatima", "aisha", "blessing", "funke", "ada", "kemi", "esther", "joy", "chidinma", "hadiza", "hawa", "bisi", "yewande"];
  const lower = name.toLowerCase();
  
  let isGirl = genderProp === "girl";
  if (genderProp === "boy") isGirl = false;
  else if (!genderProp || genderProp === "auto") {
    isGirl = femaleNames.some(fn => lower.includes(fn));
  }

  if (isGirl) {
    return {
      bg: "linear-gradient(135deg, #F43F5E 0%, #FB7185 50%, #FDA4AF 100%)",
      accent: "#E11D48",
      skinTone: "#FDE047",
      hairColor: "#4A044E",
      shirtColor: "#BE123C",
      gender: "girl" as const,
    };
  }

  // Boy / Neutral Student Style
  return {
    bg: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)",
    accent: "#1D4ED8",
    skinTone: "#FDE047",
    hairColor: "#1E293B",
    shirtColor: "#1E3A8A",
    gender: "boy" as const,
  };
}

export function StudentAvatar({
  name = "Student",
  gender = "auto",
  size = "md",
  imageUrl,
  className = "",
  showBadge = false,
}: Props) {
  const dims = SIZE_MAP[size] || SIZE_MAP.md;
  const style = getChildStyle(name, gender);

  if (imageUrl && imageUrl.trim() !== "") {
    return (
      <div
        className={className}
        style={{
          width: dims.box,
          height: dims.box,
          borderRadius: dims.radius,
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          border: "2px solid #FFFFFF",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {showBadge && (
          <span
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10B981",
              border: "1.5px solid #FFFFFF",
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: dims.box,
        height: dims.box,
        borderRadius: dims.radius,
        background: style.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
        boxShadow: "0 3px 10px rgba(22, 90, 246, 0.18)",
        border: "2px solid rgba(255, 255, 255, 0.8)",
        overflow: "hidden",
      }}
      aria-label={`Student avatar for ${name}`}
    >
      {/* Illustrated Child Character SVG */}
      <svg
        width={dims.svg}
        height={dims.svg}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {style.gender === "girl" ? (
          // ── Girl Student Illustration ──
          <g>
            {/* Hair Back / Pigtails */}
            <circle cx="10" cy="18" r="5" fill="#581C87" />
            <circle cx="26" cy="18" r="5" fill="#581C87" />
            {/* Shirt / Uniform Collar */}
            <path d="M7 36C7 29.5 12 25 18 25C24 25 29 29.5 29 36H7Z" fill="#BE123C" />
            <path d="M14 25L18 30L22 25H14Z" fill="#FFE4E6" />
            {/* Neck */}
            <rect x="15.5" y="21" width="5" height="5" rx="2" fill="#FBBF24" />
            {/* Head */}
            <circle cx="18" cy="15" r="9" fill="#FCD34D" />
            {/* Hair Front / Bangs with Ribbon */}
            <path d="M9 14C9 9 13 6 18 6C23 6 27 9 27 14C24 10 21 11 18 11C15 11 12 10 9 14Z" fill="#581C87" />
            <circle cx="10" cy="11" r="2.5" fill="#FDA4AF" />
            {/* Happy Eyes */}
            <circle cx="15" cy="15" r="1.2" fill="#1E293B" />
            <circle cx="21" cy="15" r="1.2" fill="#1E293B" />
            {/* Cheerful Smile */}
            <path d="M16 18.5C16.8 19.8 19.2 19.8 20 18.5" stroke="#9A3412" strokeWidth="1.2" strokeLinecap="round" />
            {/* Blush */}
            <circle cx="13" cy="17.5" r="1.5" fill="#F43F5E" opacity="0.4" />
            <circle cx="23" cy="17.5" r="1.5" fill="#F43F5E" opacity="0.4" />
          </g>
        ) : (
          // ── Boy / Student Illustration ──
          <g>
            {/* Shirt / School Uniform */}
            <path d="M7 36C7 29.5 12 25 18 25C24 25 29 29.5 29 36H7Z" fill="#1E3A8A" />
            <path d="M14 25L18 30L22 25H14Z" fill="#E0F2FE" />
            {/* Tie / Crest */}
            <polygon points="18,27 19.5,31 18,34 16.5,31" fill="#F59E0B" />
            {/* Neck */}
            <rect x="15.5" y="21" width="5" height="5" rx="2" fill="#FBBF24" />
            {/* Head */}
            <circle cx="18" cy="15" r="9" fill="#FCD34D" />
            {/* Neat Short Hair / Side Sweep */}
            <path d="M9 13C9 8.5 13 6 18 6C23 6 27 8.5 27 13C25 9.5 21 8.5 18 9C15 9.5 12 10.5 9 13Z" fill="#0F172A" />
            {/* Bright Eyes */}
            <circle cx="15" cy="15" r="1.2" fill="#0F172A" />
            <circle cx="21" cy="15" r="1.2" fill="#0F172A" />
            {/* Cheerful Smile */}
            <path d="M16 18.5C16.8 19.8 19.2 19.8 20 18.5" stroke="#9A3412" strokeWidth="1.2" strokeLinecap="round" />
            {/* Cheeks */}
            <circle cx="13" cy="17.5" r="1.2" fill="#FB923C" opacity="0.4" />
            <circle cx="23" cy="17.5" r="1.2" fill="#FB923C" opacity="0.4" />
          </g>
        )}
      </svg>

      {showBadge && (
        <span
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#10B981",
            border: "1.5px solid #FFFFFF",
          }}
        />
      )}
    </div>
  );
}
