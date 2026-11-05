export const Colors = {
  primary: "#92400E",
  primaryDark: "#78350F",
  primaryLight: "#FFFBEB",
  primaryTint: "#FEF3C7",
  primaryGlow: "rgba(217, 119, 6, 0.14)",

  ink: "#111014",
  inkSubtle: "#1C1917",
  slate: "#475569",
  muted: "#6B7280",
  caption: "#64748B",

  canvas: "#FAFAF9",
  card: "#FFFFFF",
  cardBorder: "#E6E6E9",
  divider: "#ECECEF",

  lime: "#D5E87A",
  limeText: "#4D7C0F",
  limeBg: "#F7FEE7",

  success: "#16A34A",
  successBg: "#DCFCE7",
  successBorder: "#86EFAC",

  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  dangerBorder: "#FCA5A5",

  warning: "#D97706",
  warningBg: "#FEF3C7",
  warningBorder: "#FCD34D",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 48,
};

export const Radii = {
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  sheet: 24,
  pill: 9999,
};

export const Typography = {
  fontFamily: 'Manrope_500Medium',
  display: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  header: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  subHeader: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.slate,
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.ink,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.muted,
  },
  badge: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    fontWeight: "700" as const,
  },
};

