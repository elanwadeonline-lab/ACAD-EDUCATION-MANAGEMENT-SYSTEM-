import {
  Easing,
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

export type BaseScheme = 'light' | 'dark';

/** Named accents in display order; legacy aliases are accepted but not listed. */
export const baseAccents = [
  { key: 'quill', name: 'Quill' },
  { key: 'tide', name: 'Tide' },
  { key: 'grove', name: 'Grove' },
  { key: 'bloom', name: 'Bloom' },
  { key: 'cove', name: 'Cove' },
  { key: 'kiln', name: 'Kiln' },
] as const;

export type BaseAccentName = (typeof baseAccents)[number]['key'];
export type BaseAccent =
  BaseAccentName | 'neutral' | 'blue' | 'green' | 'violet';

type Curve = readonly [number, number, number, number];
type CurveName =
  | 'out'
  | 'soft'
  | 'draw'
  | 'enter'
  | 'leave'
  | 'color'
  | 'fill'
  | 'in'
  | 'drawer'
  | 'away'
  | 'resize'
  | 'inOut';
type SpringName =
  | 'press'
  | 'selection'
  | 'highlight'
  | 'thumb'
  | 'checkPop'
  | 'morph'
  | 'height'
  | 'pop'
  | 'entrance'
  | 'reflow';
type TransitionName =
  | 'overlay'
  | 'sheet'
  | 'drawer'
  | 'drawerOut'
  | 'dismiss'
  | 'fade'
  | 'color'
  | 'panelIn'
  | 'panelOut'
  | 'panelHeight'
  | 'check'
  | 'uncheck'
  | 'fill'
  | 'popOut'
  | 'reveal'
  | 'swap'
  | 'collapse'
  | 'tooltipIn'
  | 'tooltipOut';
type Transition = { duration: number; curve: CurveName; delay?: number };

export type BaseTheme = {
  scheme: BaseScheme;
  accent: BaseAccent;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    /** Destructive button fill (destructive at 60% in dark mode). */
    destructiveSurface: string;
    border: string;
    input: string;
    /** Field and outline-button fill: transparent in light, input/30 in dark. */
    inputSurface: string;
    ring: string;
    /** ring/50, the color of the 3px focus ring. */
    ringSoft: string;
    overlay: string;
  };
  radius: { sm: number; md: number; lg: number; xl: number; full: number };
  space: { 1: number; 2: number; 3: number; 4: number; 6: number };
  fonts: { regular: string; medium: string; semibold: string };
  /** shadow-xs, shadow-sm and shadow-lg as React Native boxShadow strings. */
  shadow: { xs: string; sm: string; lg: string };
  motion: {
    springs: Record<
      SpringName,
      { stiffness: number; damping: number; mass: number }
    >;
    curves: Record<CurveName, Curve>;
    transitions: Record<TransitionName, Transition>;
    scales: {
      press: number;
      choice: number;
      fill: number;
      icon: number;
      tooltip: number;
      popover: number;
    };
    /** The switch thumb stretches to this fraction of its width while pressed. */
    stretch: number;
    shifts: { tabs: number; handoff: number; tooltip: number };
    stagger: number;
  };
};

// Resolve colors without rewriting the caller's accent value in the returned theme.
const accentNames: Record<BaseAccent, BaseAccentName> = {
  quill: 'quill',
  tide: 'tide',
  grove: 'grove',
  bloom: 'bloom',
  cove: 'cove',
  kiln: 'kiln',
  neutral: 'quill',
  blue: 'tide',
  green: 'grove',
  violet: 'bloom',
};

// Accent themes only replace primary, primaryForeground and ring (plus derived ringSoft).
const accents: Record<
  BaseAccentName,
  Record<
    BaseScheme,
    { primary: string; primaryForeground: string; ring: string }
  >
> = {
  // Preserve the original neutral tokens, including its focus ring.
  quill: {
    light: {
      primary: '#171717',
      primaryForeground: '#fafafa',
      ring: '#a1a1a1',
    },
    dark: { primary: '#e5e5e5', primaryForeground: '#171717', ring: '#737373' },
  },
  tide: {
    light: {
      primary: '#0371d0',
      primaryForeground: '#fafafa',
      ring: '#132030',
    },
    dark: { primary: '#88bffe', primaryForeground: '#171717', ring: '#e9f3ff' },
  },
  grove: {
    light: {
      primary: '#417e2f',
      primaryForeground: '#fafafa',
      ring: '#172313',
    },
    dark: { primary: '#a8e995', primaryForeground: '#171717', ring: '#e6f8e2' },
  },
  bloom: {
    light: {
      primary: '#812d9b',
      primaryForeground: '#fafafa',
      ring: '#261a2a',
    },
    dark: { primary: '#c46fe0', primaryForeground: '#171717', ring: '#faecff' },
  },
  cove: {
    light: {
      primary: '#045d57',
      primaryForeground: '#fafafa',
      ring: '#072522',
    },
    dark: { primary: '#10c4b8', primaryForeground: '#171717', ring: '#d9faf6' },
  },
  kiln: {
    light: {
      primary: '#8d4301',
      primaryForeground: '#fafafa',
      ring: '#2c1a0f',
    },
    dark: { primary: '#fea56e', primaryForeground: '#171717', ring: '#ffeee4' },
  },
};

// alpha, timing and spring are worklets: pieces call them inside gesture callbacks, which run on the UI thread
// (without the directive the app crashes on iOS and Android while web keeps working).

/** Adds an alpha channel to a #rrggbb color. */
export function alpha(hex: string, a: number) {
  'worklet';
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function createBaseTheme({
  scheme = 'light',
  accent = 'neutral',
}: { scheme?: BaseScheme; accent?: BaseAccent } = {}): BaseTheme {
  const a = accents[accentNames[accent]][scheme];
  const surfaces =
    scheme === 'dark'
      ? {
          background: '#0a0a0a',
          foreground: '#fafafa',
          card: '#171717',
          cardForeground: '#fafafa',
          popover: '#171717',
          popoverForeground: '#fafafa',
          secondary: '#262626',
          secondaryForeground: '#fafafa',
          muted: '#262626',
          mutedForeground: '#a1a1a1',
          accent: '#404040',
          accentForeground: '#fafafa',
          destructive: '#ff6467',
          destructiveSurface: alpha('#ff6467', 0.6),
          border: 'rgba(255,255,255,0.1)',
          input: 'rgba(255,255,255,0.15)',
          inputSurface: 'rgba(255,255,255,0.045)',
          overlay: 'rgba(0,0,0,0.5)',
        }
      : {
          background: '#ffffff',
          foreground: '#0a0a0a',
          card: '#ffffff',
          cardForeground: '#0a0a0a',
          popover: '#ffffff',
          popoverForeground: '#0a0a0a',
          secondary: '#f5f5f5',
          secondaryForeground: '#171717',
          muted: '#f5f5f5',
          mutedForeground: '#707070',
          accent: '#f5f5f5',
          accentForeground: '#171717',
          destructive: '#e7000b',
          destructiveSurface: '#e7000b',
          border: '#e5e5e5',
          input: '#e5e5e5',
          inputSurface: 'transparent',
          overlay: 'rgba(0,0,0,0.5)',
        };
  return {
    scheme,
    accent,
    colors: { ...surfaces, ...a, ringSoft: alpha(a.ring, 0.5) },
    // --radius: 0.625rem → sm 6, md 8, lg 10, xl 14.
    radius: { sm: 6, md: 8, lg: 10, xl: 14, full: 999 },
    space: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24 },
    fonts: {
      regular: 'Geist_400Regular',
      medium: 'Geist_500Medium',
      semibold: 'Geist_500Medium',
    },
    shadow: {
      xs: '0px 1px 2px 0px rgba(0,0,0,0.05)',
      sm: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
      lg: '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
    },
    motion: {
      // Springs are tuned for mass 1; Reanimated defaults to 4, so mass is always explicit.
      springs: {
        press: { stiffness: 550, damping: 30, mass: 1 },
        selection: { stiffness: 300, damping: 30, mass: 1 },
        highlight: { stiffness: 500, damping: 40, mass: 1 },
        thumb: { stiffness: 300, damping: 25, mass: 1 },
        checkPop: { stiffness: 500, damping: 24, mass: 1 },
        morph: { stiffness: 660, damping: 52, mass: 1 },
        height: { stiffness: 300, damping: 30, mass: 1 },
        pop: { stiffness: 400, damping: 29, mass: 1 },
        entrance: { stiffness: 200, damping: 20, mass: 1 },
        reflow: { stiffness: 500, damping: 40, mass: 1 },
      },
      curves: {
        out: [0.23, 1, 0.32, 1],
        soft: [0.215, 0.61, 0.355, 1],
        draw: [0, 0, 0.58, 1],
        enter: [0.25, 0.1, 0.35, 1],
        leave: [0, 0, 0.58, 1],
        color: [0.25, 0.1, 0.25, 1],
        fill: [0.4, 0, 0.2, 1],
        in: [0.4, 0, 1, 1],
        drawer: [0.34, 1.2, 0.64, 1],
        away: [0.33, 0.17, 0.67, 0.5],
        resize: [0.4, 0, 0.1, 1],
        inOut: [0.77, 0, 0.175, 1],
      },
      transitions: {
        overlay: { duration: 400, curve: 'soft' },
        sheet: { duration: 400, curve: 'soft' },
        drawer: { duration: 400, curve: 'drawer' },
        drawerOut: { duration: 160, curve: 'in' },
        dismiss: { duration: 200, curve: 'away' },
        fade: { duration: 200, curve: 'out' },
        color: { duration: 200, curve: 'color' },
        panelIn: { duration: 300, curve: 'enter' },
        panelOut: { duration: 150, curve: 'leave' },
        panelHeight: { duration: 450, curve: 'resize' },
        check: { duration: 300, curve: 'draw', delay: 200 },
        uncheck: { duration: 300, curve: 'draw' },
        fill: { duration: 300, curve: 'fill' },
        popOut: { duration: 150, curve: 'out' },
        reveal: { duration: 300, curve: 'out' },
        swap: { duration: 150, curve: 'out' },
        collapse: { duration: 280, curve: 'inOut' },
        tooltipIn: { duration: 340, curve: 'enter' },
        tooltipOut: { duration: 130, curve: 'leave' },
      },
      scales: {
        press: 0.97,
        choice: 0.985,
        fill: 0.7,
        icon: 0.5,
        tooltip: 0.7,
        popover: 0.8,
      },
      stretch: 19 / 16,
      shifts: { tabs: 12, handoff: 6, tooltip: 40 },
      stagger: 30,
    },
  };
}

/** Timing config for a named transition; zero duration when reduced motion is on. */
export function timing(
  theme: BaseTheme,
  name: TransitionName,
  reduced = false,
): WithTimingConfig {
  'worklet';
  const t = theme.motion.transitions[name];
  return {
    reduceMotion: ReduceMotion.Never,
    duration: reduced ? 0 : t.duration,
    easing: Easing.bezier(...theme.motion.curves[t.curve]),
  };
}

/** Spring config for a named spring. */
export function spring(theme: BaseTheme, name: SpringName): WithSpringConfig {
  'worklet';
  return { ...theme.motion.springs[name], reduceMotion: ReduceMotion.Never };
}
