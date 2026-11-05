"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UserRound, Bell, MessageSquare as MessageCircle, ClipboardList, ChartNoAxesCombined, Gamepad2 } from "../icons/StudentIcons";
import styles from "./StudentReferenceRail.module.css";
import { BooksIcon } from '@phosphor-icons/react/dist/csr/Books';
const LibraryIcon=({size=24}:{size?:number})=> <BooksIcon weight="fill" color="var(--icon-purple)" size={size} aria-hidden="true"/>;
const items=[{href:"/student/dashboard",label:"Learning home",Icon:Home},{href:"/student/practice",label:"Practice questions",Icon:Gamepad2},{href:"/student/examinations",label:"Examinations and assignments",Icon:ClipboardList},{href:"/student/results",label:"Results and activity",Icon:ChartNoAxesCombined},{href:"/student/library",label:"Learning library",Icon:LibraryIcon},{href:"/student/community",label:"Student community",Icon:MessageCircle},{href:"/student/notifications",label:"Notifications",Icon:Bell},{href:"/student/settings",label:"Student profile",Icon:UserRound}];
export function StudentReferenceRail() {
 const path=(usePathname()||"").replace(/\/+$/,"");
 return <nav className={styles.rail} aria-label="Student navigation">{items.map(({href,label,Icon})=><Link key={href} href={href} aria-label={label} title={label} aria-current={path===href?"page":undefined}><Icon size={24} /></Link>)}</nav>;
}
