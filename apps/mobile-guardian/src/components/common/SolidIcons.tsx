import React from 'react';
import Svg, { Path, Rect, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface SolidIconProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
}

/** Solid Filled Academics / Graduation Cap Icon */
export function SolidGraduationCap({ size = 24, color = '#10B981', secondaryColor = '#059669' }: SolidIconProps) {
  const isSolid = color === secondaryColor || color === '#000000';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {!isSolid && (
        <Defs>
          <LinearGradient id="gradCapGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        </Defs>
      )}
      {/* Cap Diamond */}
      <Path
        d="M12 3L1 9L12 15L23 9L12 3Z"
        fill={isSolid ? color : "url(#gradCapGrad)"}
      />
      {/* Cap Underneath */}
      <Path
        d="M5 13.18V17.5C5 19.43 8.13 21 12 21C15.87 21 19 19.43 19 17.5V13.18L12 17L5 13.18Z"
        fill={isSolid ? color : secondaryColor}
      />
      {/* Tassel */}
      <Path
        d="M23 9V17C23 17.55 22.55 18 22 18C21.45 18 21 17.55 21 17V10.09L23 9Z"
        fill={color}
      />
      <Circle cx="22" cy="18" r="1.5" fill={color} />
    </Svg>
  );
}

/** Solid Filled Wallet / Fees Icon */
export function SolidWallet({ size = 24, color = '#F59E0B', secondaryColor = '#D97706' }: SolidIconProps) {
  const isSolid = color === secondaryColor || color === '#000000';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {!isSolid && (
        <Defs>
          <LinearGradient id="walletGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        </Defs>
      )}
      {/* Wallet Body */}
      <Rect x="2" y="5" width="20" height="15" rx="3.5" fill={isSolid ? color : "url(#walletGrad)"} />
      {/* Top Fold Accent */}
      <Path
        d="M3 5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V6H3V5Z"
        fill={isSolid ? color : secondaryColor}
        opacity={isSolid ? 0.4 : 0.6}
      />
      {/* Flap */}
      <Path
        d="M15 10H21C21.55 10 22 10.45 22 11V14C22 14.55 21.55 15 21 15H15C13.9 15 13 14.1 13 13V12C13 10.9 13.9 10 15 10Z"
        fill="#FFFFFF"
      />
      {/* Flap Button */}
      <Circle cx="16.5" cy="12.5" r="1.25" fill={isSolid ? "#000000" : secondaryColor} />
    </Svg>
  );
}

/** Solid Filled Messages / Chat Icon */
export function SolidMessage({ size = 24, color = '#6366F1', secondaryColor = '#4F46E5' }: SolidIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="msgGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={secondaryColor} />
        </LinearGradient>
      </Defs>
      {/* Bubble */}
      <Path
        d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H7V22L12.5 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
        fill="url(#msgGrad)"
      />
      {/* 3 Dots */}
      <Circle cx="8" cy="10" r="1.5" fill="#FFFFFF" />
      <Circle cx="12" cy="10" r="1.5" fill="#FFFFFF" />
      <Circle cx="16" cy="10" r="1.5" fill="#FFFFFF" />
    </Svg>
  );
}

/** Solid Filled Calendar Icon */
export function SolidCalendar({ size = 24, color = '#8B5CF6', secondaryColor = '#7C3AED' }: SolidIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="calGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={secondaryColor} />
        </LinearGradient>
      </Defs>
      {/* Calendar Base */}
      <Rect x="3" y="4" width="18" height="17" rx="3.5" fill="url(#calGrad)" />
      {/* Top Banner */}
      <Path
        d="M3 7.5C3 5.57 4.57 4 6.5 4H17.5C19.43 4 21 5.57 21 7.5V9H3V7.5Z"
        fill={secondaryColor}
      />
      {/* Rings */}
      <Rect x="7" y="2" width="2" height="4" rx="1" fill="#FFFFFF" />
      <Rect x="15" y="2" width="2" height="4" rx="1" fill="#FFFFFF" />
      {/* Grid Dots */}
      <Circle cx="7.5" cy="12.5" r="1.2" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="12" cy="12.5" r="1.2" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="16.5" cy="12.5" r="1.2" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="7.5" cy="16.5" r="1.2" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="12" cy="16.5" r="1.2" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="16.5" cy="16.5" r="1.2" fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
}

/** Solid Filled Attendance / Clipboard Icon */
export function SolidAttendance({ size = 24, color = '#06B6D4', secondaryColor = '#0891B2' }: SolidIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="attGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={secondaryColor} />
        </LinearGradient>
      </Defs>
      {/* Clipboard Body */}
      <Rect x="4" y="5" width="16" height="16" rx="3" fill="url(#attGrad)" />
      {/* Clip */}
      <Path
        d="M9 3H15C15.55 3 16 3.45 16 4V6H8V4C8 3.45 8.45 3 9 3Z"
        fill={secondaryColor}
      />
      {/* Checkmark */}
      <Path
        d="M9.5 13.5L11.5 15.5L15 11"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Line */}
      <Rect x="8" y="8" width="8" height="1.5" rx="0.75" fill="#FFFFFF" opacity={0.7} />
    </Svg>
  );
}

/** Solid Filled Link Child / Users Icon */
export function SolidLinkChild({ size = 24, color = '#F43F5E', secondaryColor = '#E11D48' }: SolidIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="linkChildGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={secondaryColor} />
        </LinearGradient>
      </Defs>
      {/* Main Parent Head */}
      <Circle cx="9" cy="8" r="4" fill="url(#linkChildGrad)" />
      {/* Parent Body */}
      <Path
        d="M2 19C2 15.69 4.69 13 8 13H10C13.31 13 16 15.69 16 19V21H2V19Z"
        fill="url(#linkChildGrad)"
      />
      {/* Plus Symbol */}
      <Circle cx="18" cy="11" r="5" fill={secondaryColor} />
      <Path
        d="M18 8.5V13.5M15.5 11H20.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Solid Filled Bell / Notification Icon */
export function SolidBell({ size = 24, color = '#F59E0B', secondaryColor = '#D97706' }: SolidIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="bellGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={secondaryColor} />
        </LinearGradient>
      </Defs>
      {/* Bell Body */}
      <Path
        d="M12 2C10.9 2 10 2.9 10 4C7.2 4.7 5 7.1 5 10V15L3 17V18H21V17L19 15V10C19 7.1 16.8 4.7 14 4C14 2.9 13.1 2 12 2Z"
        fill="url(#bellGrad)"
      />
      {/* Clapper */}
      <Path
        d="M10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19H10Z"
        fill={secondaryColor}
      />
    </Svg>
  );
}

/** Solid Filled Shield / Security Icon */
export function SolidShield({ size = 24, color = '#3B82F6', secondaryColor = '#1D4ED8' }: SolidIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={secondaryColor} />
        </LinearGradient>
      </Defs>
      <Path
        d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
        fill="url(#shieldGrad)"
      />
      <Path
        d="M10 12.5L11.5 14L15 10"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Solid Filled Book Icon */
export function SolidBook({ size = 24, color = '#10B981', secondaryColor = '#059669' }: SolidIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="bookGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={secondaryColor} />
        </LinearGradient>
      </Defs>
      <Path
        d="M4 6C4 4.34 5.34 3 7 3H20V19H7C5.34 19 4 17.66 4 16V6Z"
        fill="url(#bookGrad)"
      />
      <Path
        d="M4 16C4 17.66 5.34 19 7 19H20V21H7C4.79 21 3 19.21 3 17V5C3 4.45 3.45 4 4 4V16Z"
        fill={secondaryColor}
      />
      <Path
        d="M8 7H16M8 11H14"
        stroke="#FFFFFF"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Solid Filled Home Icon */
export function SolidHome({ size = 24, color = '#1B4332', secondaryColor = '#2D6A4F' }: SolidIconProps) {
  const isSolid = color === secondaryColor || color === '#000000';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {!isSolid && (
        <Defs>
          <LinearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        </Defs>
      )}
      {/* Roof */}
      <Path
        d="M12 2.5L2 11H5V20.5C5 21.05 5.45 21.5 6 21.5H18C18.55 21.5 19 21.05 19 20.5V11H22L12 2.5Z"
        fill={isSolid ? color : "url(#homeGrad)"}
      />
      {/* Door */}
      <Path
        d="M10 14.5C10 13.67 10.67 13 11.5 13H12.5C13.33 13 14 13.67 14 14.5V21.5H10V14.5Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

/** Solid Filled Grid / More Hub Icon */
export function SolidGrid({ size = 24, color = '#6366F1', secondaryColor = '#4F46E5' }: SolidIconProps) {
  const isSolid = color === secondaryColor || color === '#000000';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {!isSolid && (
        <Defs>
          <LinearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        </Defs>
      )}
      <Rect x="3" y="3" width="7.5" height="7.5" rx="2" fill={isSolid ? color : "url(#gridGrad)"} />
      <Rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill={isSolid ? color : "url(#gridGrad)"} />
      <Rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill={isSolid ? color : "url(#gridGrad)"} />
      <Rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill={isSolid ? color : "url(#gridGrad)"} />
    </Svg>
  );
}

/** Solid Filled Upward Trending / Bar Chart Metric Icon */
export function SolidTrendingUp({ size = 24, color = '#F59E0B', secondaryColor = '#D97706' }: SolidIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="trendGrad" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor={secondaryColor} />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
      </Defs>
      {/* 3 ascending metric bars */}
      <Rect x="3" y="14" width="4" height="7" rx="1.5" fill="url(#trendGrad)" opacity={0.65} />
      <Rect x="10" y="10" width="4" height="11" rx="1.5" fill="url(#trendGrad)" opacity={0.85} />
      <Rect x="17" y="6" width="4" height="15" rx="1.5" fill="url(#trendGrad)" />
      {/* Dynamic rising trend arrow */}
      <Path
        d="M4 10L10 5L15 8L21 2"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 2H21V6"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}



