"use client";

import React, { createContext, forwardRef, useContext } from 'react';
import type { ReactNode } from 'react';
import {
  Activity as LucideActivity,
  AlertCircle as LucideAlertCircle,
  ArrowRight as LucideArrowRight,
  ArrowUpRight as LucideArrowUpRight,
  Award as LucideAward,
  Bell as LucideBell,
  BookOpen as LucideBookOpen,
  Calculator as LucideCalculator,
  CalendarDays as LucideCalendar,
  ChartNoAxesCombined as LucideChart,
  Check as LucideCheck,
  CircleCheck as LucideCircleCheck,
  CircleX as LucideCircleX,
  ChevronDown as LucideChevronDown,
  ChevronRight as LucideChevronRight,
  ClipboardList as LucideClipboard,
  Clock3 as LucideClock,
  Copy as LucideCopy,
  Crown as LucideCrown,
  Download as LucideDownload,
  FileText as LucideFileText,
  Flag as LucideFlag,
  Flame as LucideFlame,
  Gamepad2 as LucideGamepad,
  Gem as LucideGem,
  GraduationCap as LucideGraduation,
  House as LucideHome,
  Inbox as LucideInbox,
  Layers as LucideLayers,
  LockKeyhole as LucideLock,
  LogOut as LucideLogOut,
  Medal as LucideMedal,
  MessageSquare as LucideMessage,
  Monitor as LucideMonitor,
  Mountain as LucideMountain,
  Pencil as LucidePencil,
  Play as LucidePlay,
  RefreshCw as LucideRefresh,
  RotateCcw as LucideRotateCcw,
  School as LucideSchool,
  Search as LucideSearch,
  Settings as LucideSettings,
  ShieldCheck as LucideShield,
  Sparkles as LucideSparkles,
  Swords as LucideSwords,
  Target as LucideTarget,
  Trash2 as LucideTrash,
  TrendingUp as LucideTrending,
  TriangleAlert as LucideAlert,
  Trophy as LucideTrophy,
  UserRound as LucideUser,
  Users as LucideUsers,
  X as LucideX,
} from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { AcqadMark } from '../brand/AcqadLogo';

export type StudentIconProps = LucideProps & {
  width?: string | number;
  height?: string | number;
};

// Geometry comes exclusively from official external Lucide vector library.
// Zero handwritten approximate SVG paths.
function studentIcon(Component: LucideIcon, defaultSize = 20) {
  const Icon = forwardRef<SVGSVGElement, StudentIconProps>((props, ref) => {
    const { width, height, size, strokeWidth = 1.75, ...rest } = props;
    const resolvedSize = size ?? width ?? height ?? defaultSize;
    const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
    return (
      <Component
        ref={ref}
        size={resolvedSize}
        strokeWidth={strokeWidth}
        focusable="false"
        aria-hidden={labelled ? undefined : true}
        role={labelled ? 'img' : undefined}
        data-icon-source="lucide"
        {...rest}
      />
    );
  });
  Icon.displayName = `Student${Component.displayName || 'Icon'}`;
  return Icon;
}

export const Activity = studentIcon(LucideActivity);
export const AlertCircle = studentIcon(LucideAlertCircle);
export const ArrowRight = studentIcon(LucideArrowRight);
export const ArrowUpRight = studentIcon(LucideArrowUpRight);
export const Award = studentIcon(LucideAward);
export const Bell = studentIcon(LucideBell);
export const BookOpen = studentIcon(LucideBookOpen);
export const Calculator = studentIcon(LucideCalculator);
export const CalendarDays = studentIcon(LucideCalendar);
export const ChartNoAxesCombined = studentIcon(LucideChart);
export const Check = studentIcon(LucideCheck);
export const CircleCheck = studentIcon(LucideCircleCheck);
export const CheckCircle2 = studentIcon(LucideCircleCheck);
export const CircleX = studentIcon(LucideCircleX);
export const ChevronDown = studentIcon(LucideChevronDown);
export const ChevronRight = studentIcon(LucideChevronRight);
export const ClipboardList = studentIcon(LucideClipboard);
export const Clock3 = studentIcon(LucideClock);
export const Copy = studentIcon(LucideCopy);
export const Crown = studentIcon(LucideCrown);
export const Download = studentIcon(LucideDownload);
export const FileText = studentIcon(LucideFileText);
export const Flag = studentIcon(LucideFlag);
export const Flame = studentIcon(LucideFlame);
export const Gamepad2 = studentIcon(LucideGamepad);
export const Gem = studentIcon(LucideGem);
export const GraduationCap = studentIcon(LucideGraduation);
export const Home = studentIcon(LucideHome);
export const Inbox = studentIcon(LucideInbox);
export const Layers = studentIcon(LucideLayers);
export const Lock = studentIcon(LucideLock);
export const LogOut = studentIcon(LucideLogOut);
export const Medal = studentIcon(LucideMedal);
export const MessageSquare = studentIcon(LucideMessage);
export const Monitor = studentIcon(LucideMonitor);
export const Mountain = studentIcon(LucideMountain);
export const Pencil = studentIcon(LucidePencil);
export const Play = studentIcon(LucidePlay);
export const RefreshCw = studentIcon(LucideRefresh);
export const RotateCcw = studentIcon(LucideRotateCcw);
export const School = studentIcon(LucideSchool);
export const Search = studentIcon(LucideSearch);
export const Settings = studentIcon(LucideSettings);
export const ShieldCheck = studentIcon(LucideShield);
export const Sparkles = studentIcon(LucideSparkles);
export const Swords = studentIcon(LucideSwords);
export const Target = studentIcon(LucideTarget);
export const Trash2 = studentIcon(LucideTrash);
export const TrendingUp = studentIcon(LucideTrending);
export const TriangleAlert = studentIcon(LucideAlert);
export const Trophy = studentIcon(LucideTrophy);
export const UserRound = studentIcon(LucideUser);
export const Users = studentIcon(LucideUsers);
export const X = studentIcon(LucideX);

// Institutional Brand Mark
export const AcadBrandIcon = ({
  width = 24,
  height = 24,
  className = "",
  style,
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <AcqadMark
    width={typeof width === "number" ? width : parseInt(String(width), 10) || 24}
    height={typeof height === "number" ? height : parseInt(String(height), 10) || 24}
    className={className}
    theme="gold"
  />
);

// Standard compatibility names to ensure seamless drop-in replacements across all student surfaces
export {
  Activity as ActivityIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUpRight as ArrowUpRightIcon,
  Award as AwardIcon,
  Bell as BellIcon,
  BookOpen as BookIcon,
  BookOpen as SubjectIcon,
  Calculator as CalculatorIcon,
  CalendarDays as CalendarIcon,
  ChartNoAxesCombined as BarChartIcon,
  Check as CheckIcon,
  CheckCircle2 as CheckCircleIcon,
  CircleX as XCircleIcon,
  CircleX as CloseCircleIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  ClipboardList as ClipboardIcon,
  Clock3 as ClockIcon,
  Crown as CrownIcon,
  Download as DownloadIcon,
  FileText as DocumentIcon,
  Flag as FlagIcon,
  Flame as FlameIcon,
  Gamepad2 as GamepadIcon,
  Gem as GemIcon,
  GraduationCap as GraduationCapIcon,
  Home as HomeIcon,
  Inbox as EmptyBoxIcon,
  Layers as LayersIcon,
  Lock as LockIcon,
  LogOut as LogOutIcon,
  Medal as MedalIcon,
  MessageSquare as MessageSquareIcon,
  Monitor as MonitorIcon,
  Mountain as MountainIcon,
  Pencil as EditIcon,
  Play as PlayIcon,
  RefreshCw as RefreshIcon,
  RotateCcw as RotateCcwIcon,
  School as SchoolIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ShieldCheck as ShieldCheckIcon,
  Sparkles as SparklesIcon,
  Swords as SwordsIcon,
  Target as TargetIcon,
  Trash2 as TrashIcon,
  TrendingUp as TrendingUpIcon,
  TriangleAlert as WarningIcon,
  Trophy as TrophyIcon,
  UserRound as UserIcon,
  Users as UsersIcon,
  X as CloseIcon,
};

const studentScope = createContext(false);
export function StudentIconProvider({ children }: { children: ReactNode }) {
  return <studentScope.Provider value={true}>{children}</studentScope.Provider>;
}
export const useStudentIconScope = () => useContext(studentScope);

// Gamification achievement badges mapped to distinct Lucide iconography
const achievements: Record<string, typeof LucideMedal> = {
  first_exam: LucideGraduation,
  exam_5: LucideMountain,
  high_scorer: LucideTarget,
  perfect: LucideGem,
  streak_7: LucideFlame,
  practice_50: LucideBookOpen,
  top_rank: LucideCrown,
  level_5: LucideMedal,
  mastery_quest: LucideSwords,
  speed_solver: LucideClock,
  perfect_attendance: LucideCalendar,
  champion: LucideTrophy,
};

export function AchievementSymbol({ id, size = 28, strokeWidth = 1.75 }: { id: string; size?: number; strokeWidth?: number }) {
  const Icon = achievements[id] || LucideMedal;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" data-icon-source="lucide" />;
}

// Student notification categorization symbols
export function StudentNotificationSymbol({ type, size = 16, strokeWidth = 1.75 }: { type: string; size?: number; strokeWidth?: number }) {
  const icons: Record<string, typeof LucideBell> = {
    exam: LucideClipboard,
    subject_published: LucideBookOpen,
    exam_submitted: LucideCircleCheck,
    results: LucideChart,
    result_released: LucideChart,
    attendance: LucideCalendar,
    remark_added: LucideMessage,
  };
  const Icon = icons[type] || LucideBell;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" data-icon-source="lucide" />;
}

export const studentReportIcons = {
  SearchIcon: Search,
  UsersIcon: Users,
  DocumentIcon: FileText,
  CheckCircleIcon: CheckCircle2,
  WarningIcon: TriangleAlert,
  EditIcon: Pencil,
  SchoolIcon: School,
  ClipboardIcon: ClipboardList,
  RefreshIcon: RefreshCw,
  ChevronRightIcon: ChevronRight,
  TrophyIcon: Trophy,
  ShieldCheckIcon: ShieldCheck,
  LayersIcon: Layers,
  ActivityIcon: Activity,
  SparklesIcon: Sparkles,
  CrownIcon: Crown,
  BookIcon: BookOpen,
};
