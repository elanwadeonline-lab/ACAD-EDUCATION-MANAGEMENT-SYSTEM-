"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Home, UserRound, Bell, MessageSquare as MessageCircle, ClipboardList, ChartNoAxesCombined, Gamepad2 } from "../icons/StudentIcons";
import { BooksIcon } from '@phosphor-icons/react/dist/csr/Books';
import styles from "./StudentReferenceRail.module.css";
const LibraryIcon=({size=24}:{size?:number})=><BooksIcon weight="regular" size={size} aria-hidden="true"/>;
const items=[{href:"/student/dashboard",label:"Home",Icon:Home},{href:"/student/library",label:"Study",Icon:LibraryIcon},{href:"/student/practice",label:"Practice",Icon:Gamepad2},{href:"/student/community",label:"Community",Icon:MessageCircle}];
const moreItems=[{href:"/student/examinations",label:"Examinations & assignments",Icon:ClipboardList},{href:"/student/results",label:"Results & activity",Icon:ChartNoAxesCombined},{href:"/student/report-card",label:"Report card",Icon:ClipboardList},{href:"/student/notifications",label:"Notifications",Icon:Bell},{href:"/student/settings",label:"Profile & settings",Icon:UserRound}];
export function StudentReferenceRail(){
 const path=(usePathname()||"").replace(/\/+$/,"");
 const [open,setOpen]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>setOpen(false),[path]);
 const active=(href:string)=>path===href||path.startsWith(href+"/");
 return <><nav className={styles.rail} aria-label="Student navigation">
 {items.map(({href,label,Icon})=><Link key={href} href={href} aria-current={active(href)?"page":undefined}><Icon size={22}/><span>{label}</span></Link>)}
 <button ref={trigger} type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} data-active={moreItems.some(i=>active(i.href))||undefined}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg><span>More</span></button>
 </nav><Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.sheet} onCloseAutoFocus={e=>{e.preventDefault();trigger.current?.focus();}}>
 <div className={styles.sheetHeader}><div><Dialog.Title className={styles.sheetTitle}>Your learning space</Dialog.Title><Dialog.Description className={styles.sheetDescription}>Examinations, results and your account.</Dialog.Description></div><Dialog.Close className={styles.close} aria-label="Close navigation">×</Dialog.Close></div>
 <nav aria-label="More student pages" className={styles.moreList}>{moreItems.map(({href,label,Icon})=><Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={active(href)?"page":undefined}><Icon size={22}/><span>{label}</span><span aria-hidden="true">›</span></Link>)}</nav>
 </Dialog.Content></Dialog.Portal></Dialog.Root></>;
}
