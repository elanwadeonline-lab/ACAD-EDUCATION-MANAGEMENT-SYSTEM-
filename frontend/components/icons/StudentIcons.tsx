"use client";
import React, { createContext, forwardRef, useContext } from 'react';
import type { ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import type { Icon } from '@phosphor-icons/react';
import { AcqadMark } from '../brand/AcqadLogo';
import {ArrowCounterClockwiseIcon as PhosphorArrowCounterClockwise} from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import {ArrowRightIcon as PhosphorArrowRight} from '@phosphor-icons/react/dist/csr/ArrowRight';
import {ArrowUpRightIcon as PhosphorArrowUpRight} from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import {ArrowsClockwiseIcon as PhosphorArrowsClockwise} from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import {BellIcon as PhosphorBell} from '@phosphor-icons/react/dist/csr/Bell';
import {BookOpenTextIcon as PhosphorBookOpenText} from '@phosphor-icons/react/dist/csr/BookOpenText';
import {BuildingsIcon as PhosphorBuildings} from '@phosphor-icons/react/dist/csr/Buildings';
import {CalculatorIcon as PhosphorCalculator} from '@phosphor-icons/react/dist/csr/Calculator';
import {CalendarDotsIcon as PhosphorCalendarDots} from '@phosphor-icons/react/dist/csr/CalendarDots';
import {CaretDownIcon as PhosphorCaretDown} from '@phosphor-icons/react/dist/csr/CaretDown';
import {CaretRightIcon as PhosphorCaretRight} from '@phosphor-icons/react/dist/csr/CaretRight';
import {ChartLineUpIcon as PhosphorChartLineUp} from '@phosphor-icons/react/dist/csr/ChartLineUp';
import {ChatCircleDotsIcon as PhosphorChatCircleDots} from '@phosphor-icons/react/dist/csr/ChatCircleDots';
import {CheckCircleIcon as PhosphorCheckCircle} from '@phosphor-icons/react/dist/csr/CheckCircle';
import {CheckFatIcon as PhosphorCheckFat} from '@phosphor-icons/react/dist/csr/CheckFat';
import {ClipboardTextIcon as PhosphorClipboardText} from '@phosphor-icons/react/dist/csr/ClipboardText';
import {ClockIcon as PhosphorClock} from '@phosphor-icons/react/dist/csr/Clock';
import {CopyIcon as PhosphorCopy} from '@phosphor-icons/react/dist/csr/Copy';
import {CrownIcon as PhosphorCrown} from '@phosphor-icons/react/dist/csr/Crown';
import {DesktopIcon as PhosphorDesktop} from '@phosphor-icons/react/dist/csr/Desktop';
import {DiamondIcon as PhosphorDiamond} from '@phosphor-icons/react/dist/csr/Diamond';
import {DownloadSimpleIcon as PhosphorDownloadSimple} from '@phosphor-icons/react/dist/csr/DownloadSimple';
import {FileTextIcon as PhosphorFileText} from '@phosphor-icons/react/dist/csr/FileText';
import {FireIcon as PhosphorFire} from '@phosphor-icons/react/dist/csr/Fire';
import {FlagIcon as PhosphorFlag} from '@phosphor-icons/react/dist/csr/Flag';
import {GameControllerIcon as PhosphorGameController} from '@phosphor-icons/react/dist/csr/GameController';
import {GearSixIcon as PhosphorGearSix} from '@phosphor-icons/react/dist/csr/GearSix';
import {GraduationCapIcon as PhosphorGraduationCap} from '@phosphor-icons/react/dist/csr/GraduationCap';
import {HouseIcon as PhosphorHouse} from '@phosphor-icons/react/dist/csr/House';
import {LockKeyIcon as PhosphorLockKey} from '@phosphor-icons/react/dist/csr/LockKey';
import {MagnifyingGlassIcon as PhosphorMagnifyingGlass} from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import {MedalIcon as PhosphorMedal} from '@phosphor-icons/react/dist/csr/Medal';
import {MountainsIcon as PhosphorMountains} from '@phosphor-icons/react/dist/csr/Mountains';
import {PencilSimpleIcon as PhosphorPencilSimple} from '@phosphor-icons/react/dist/csr/PencilSimple';
import {PlayCircleIcon as PhosphorPlayCircle} from '@phosphor-icons/react/dist/csr/PlayCircle';
import {PulseIcon as PhosphorPulse} from '@phosphor-icons/react/dist/csr/Pulse';
import {ShieldCheckIcon as PhosphorShieldCheck} from '@phosphor-icons/react/dist/csr/ShieldCheck';
import {SignOutIcon as PhosphorSignOut} from '@phosphor-icons/react/dist/csr/SignOut';
import {SparkleIcon as PhosphorSparkle} from '@phosphor-icons/react/dist/csr/Sparkle';
import {StackIcon as PhosphorStack} from '@phosphor-icons/react/dist/csr/Stack';
import {SwordIcon as PhosphorSword} from '@phosphor-icons/react/dist/csr/Sword';
import {TargetIcon as PhosphorTarget} from '@phosphor-icons/react/dist/csr/Target';
import {TrashIcon as PhosphorTrash} from '@phosphor-icons/react/dist/csr/Trash';
import {TrayIcon as PhosphorTray} from '@phosphor-icons/react/dist/csr/Tray';
import {TrendUpIcon as PhosphorTrendUp} from '@phosphor-icons/react/dist/csr/TrendUp';
import {TrophyIcon as PhosphorTrophy} from '@phosphor-icons/react/dist/csr/Trophy';
import {UserCircleIcon as PhosphorUserCircle} from '@phosphor-icons/react/dist/csr/UserCircle';
import {UsersThreeIcon as PhosphorUsersThree} from '@phosphor-icons/react/dist/csr/UsersThree';
import {WarningIcon as PhosphorWarning} from '@phosphor-icons/react/dist/csr/Warning';
import {WarningCircleIcon as PhosphorWarningCircle} from '@phosphor-icons/react/dist/csr/WarningCircle';
import {XIcon as PhosphorX} from '@phosphor-icons/react/dist/csr/X';
import {XCircleIcon as PhosphorXCircle} from '@phosphor-icons/react/dist/csr/XCircle';
export type StudentIconProps = LucideProps & {width?: string | number;height?: string | number};
// Official filled paths, imported individually to keep unused icons out of the bundle.
function studentIcon(Component: Icon, tone='muted', defaultSize=20) {
 const Result=forwardRef<SVGSVGElement,StudentIconProps>((props,ref)=>{
  const {width,height,size,strokeWidth,absoluteStrokeWidth,stroke,fill,color,style,...rest}=props;
  const labelled=Boolean(props['aria-label']||props['aria-labelledby']);
  return <Component {...rest} ref={ref} size={size??width??height??defaultSize} weight="fill"
   style={{color:color??`var(--icon-${tone}, currentColor)`,...style}} focusable="false"
   aria-hidden={labelled?undefined:true} role={labelled?'img':undefined} data-icon-source="phosphor" data-icon-weight="fill"/>;
 });
 Result.displayName='StudentFilledIcon';return Result;
}
export const Activity = studentIcon(PhosphorPulse, 'muted');
export const AlertCircle = studentIcon(PhosphorWarningCircle, 'danger');
export const ArrowRight = studentIcon(PhosphorArrowRight, 'muted');
export const ArrowUpRight = studentIcon(PhosphorArrowUpRight, 'muted');
export const Award = studentIcon(PhosphorMedal, 'gold');
export const Bell = studentIcon(PhosphorBell, 'pink');
export const BookOpen = studentIcon(PhosphorBookOpenText, 'blue');
export const Calculator = studentIcon(PhosphorCalculator, 'muted');
export const CalendarDays = studentIcon(PhosphorCalendarDots, 'pink');
export const ChartNoAxesCombined = studentIcon(PhosphorChartLineUp, 'purple');
export const Check = studentIcon(PhosphorCheckFat, 'green');
export const CircleCheck = studentIcon(PhosphorCheckCircle, 'green');
export const CircleX = studentIcon(PhosphorXCircle, 'danger');
export const ChevronDown = studentIcon(PhosphorCaretDown, 'muted');
export const ChevronRight = studentIcon(PhosphorCaretRight, 'muted');
export const ClipboardList = studentIcon(PhosphorClipboardText, 'green');
export const Clock3 = studentIcon(PhosphorClock, 'pink');
export const Copy = studentIcon(PhosphorCopy, 'muted');
export const Crown = studentIcon(PhosphorCrown, 'gold');
export const Download = studentIcon(PhosphorDownloadSimple, 'muted');
export const FileText = studentIcon(PhosphorFileText, 'purple');
export const Flag = studentIcon(PhosphorFlag, 'muted');
export const Flame = studentIcon(PhosphorFire, 'orange');
export const Gamepad2 = studentIcon(PhosphorGameController, 'blue');
export const Gem = studentIcon(PhosphorDiamond, 'purple');
export const GraduationCap = studentIcon(PhosphorGraduationCap, 'purple');
export const Home = studentIcon(PhosphorHouse, 'orange');
export const Inbox = studentIcon(PhosphorTray, 'muted');
export const Layers = studentIcon(PhosphorStack, 'muted');
export const Lock = studentIcon(PhosphorLockKey, 'muted');
export const LogOut = studentIcon(PhosphorSignOut, 'muted');
export const Medal = studentIcon(PhosphorMedal, 'gold');
export const MessageSquare = studentIcon(PhosphorChatCircleDots, 'purple');
export const Monitor = studentIcon(PhosphorDesktop, 'muted');
export const Mountain = studentIcon(PhosphorMountains, 'green');
export const Pencil = studentIcon(PhosphorPencilSimple, 'muted');
export const Play = studentIcon(PhosphorPlayCircle, 'blue');
export const RefreshCw = studentIcon(PhosphorArrowsClockwise, 'muted');
export const RotateCcw = studentIcon(PhosphorArrowCounterClockwise, 'muted');
export const School = studentIcon(PhosphorBuildings, 'muted');
export const Search = studentIcon(PhosphorMagnifyingGlass, 'muted');
export const Settings = studentIcon(PhosphorGearSix, 'muted');
export const ShieldCheck = studentIcon(PhosphorShieldCheck, 'green');
export const Sparkles = studentIcon(PhosphorSparkle, 'gold');
export const Swords = studentIcon(PhosphorSword, 'purple');
export const Target = studentIcon(PhosphorTarget, 'pink');
export const Trash2 = studentIcon(PhosphorTrash, 'muted');
export const TrendingUp = studentIcon(PhosphorTrendUp, 'purple');
export const TriangleAlert = studentIcon(PhosphorWarning, 'gold');
export const Trophy = studentIcon(PhosphorTrophy, 'gold');
export const UserRound = studentIcon(PhosphorUserCircle, 'blue');
export const Users = studentIcon(PhosphorUsersThree, 'blue');
export const X = studentIcon(PhosphorX, 'muted');
export const CheckCircle2=CircleCheck;

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

// Semantic filled achievements retain the existing badge IDs and data.
const achievements:Record<string,typeof Medal>={first_exam:GraduationCap,exam_5:Mountain,high_scorer:Target,perfect:Gem,streak_7:Flame,practice_50:BookOpen,top_rank:Crown,level_5:Medal,mastery_quest:Swords,speed_solver:Clock3,perfect_attendance:CalendarDays,champion:Trophy};
export function AchievementSymbol({id,size=28}:{id:string;size?:number;strokeWidth?:number}){const Icon=achievements[id]||Medal;return <Icon size={size}/>;}
export function StudentNotificationSymbol({type,size=16}:{type:string;size?:number;strokeWidth?:number}){
 const icons:Record<string,typeof Bell>={exam:ClipboardList,subject_published:BookOpen,exam_submitted:CircleCheck,results:ChartNoAxesCombined,result_released:ChartNoAxesCombined,attendance:CalendarDays,remark_added:MessageSquare};
 const Icon=icons[type]||Bell;return <Icon size={size}/>;
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
