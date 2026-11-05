import type { SVGProps } from "react";
type Props=SVGProps<SVGSVGElement>&{size?:number};
const paths:Record<string,string>={
 home:"M12 2 1 11h3v11h6v-7h4v7h6V11h3Z",
 users:"M8 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM1 21v-5a6 6 0 0 1 12 0v5Zm14 0v-5a8 8 0 0 0-1-4 6 6 0 0 1 9 5v4Z",
 file:"M4 2h10l6 6v14H4Zm10 2v5h5ZM7 12v2h10v-2Zm0 5v2h10v-2Z",
 message:"M3 2h18v15H9l-6 5Zm3 5v2h12V7Zm0 5v2h8v-2Z",
 wallet:"M3 3h17v4H4v2h18v12H2V5Zm13 10v4h4v-4Z",
 calendar:"M5 1h2v3h10V1h2v3h3v18H2V4h3ZM4 10v10h16V10Z",
 bell:"M12 1a7 7 0 0 0-7 7v7l-3 4h20l-3-4V8a7 7 0 0 0-7-7Zm-3 20a3 3 0 0 0 6 0Z",
 more:"M5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
 check:"m3 11 6 6L21 5l2 2L9 21 1 13Z", plus:"M10 2h4v8h8v4h-8v8h-4v-8H2v-4h8Z",
 arrow:"m10 3 2 2-6 6h16v2H6l6 6-2 2L0 11Z", chevron:"m8 3 9 9-9 9-2-2 7-7-7-7Z",
 down:"m3 8 9 9 9-9-2-2-7 7-7-7Z", out:"M7 2h15v15h-3V7L4 22l-2-2L17 5H7Z",
 moon:"M20 16A10 10 0 0 1 8 2a10 10 0 1 0 12 14Z", sun:"M10 0h4v4h-4Zm0 20h4v4h-4ZM0 10h4v4H0Zm20 0h4v4h-4ZM12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z",
 notice:"M2 8h7l12-6v20L9 16H7l2 6H5l-2-6H2Z", close:"m3 1 9 9 9-9 2 2-9 9 9 9-2 2-9-9-9 9-2-2 9-9-9-9Z"
};
const icon=(name:string)=>function SolidIcon({size=24,...props}:Props){return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props} fill="currentColor" stroke="none"><path d={paths[name]} fillRule="evenodd"/></svg>};
export const Home=icon('home'),Users=icon('users'),FileText=icon('file'),MessageCircle=icon('message'),Wallet=icon('wallet'),CalendarDays=icon('calendar'),ClipboardCheck=icon('file'),Bell=icon('bell'),MoreHorizontal=icon('more'),Check=icon('check'),Plus=icon('plus'),ArrowLeft=icon('arrow'),ChevronRight=icon('chevron'),ChevronDown=icon('down'),ArrowUpRight=icon('out'),Moon=icon('moon'),Sun=icon('sun'),Megaphone=icon('notice'),Link2=icon('users'),X=icon('close');
