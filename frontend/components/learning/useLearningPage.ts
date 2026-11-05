"use client";
import { useEffect,useState } from 'react';
export function useLearningPage(key:string) {
  const [view,setView]=useState('');
  useEffect(()=>{const sync=()=>setView(new URLSearchParams(location.search).get(key)||'');sync();window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[key]);
  const navigate=(next:string)=>{const url=new URL(location.href);if(next)url.searchParams.set(key,next);else url.searchParams.delete(key);history.pushState(null,'',url);setView(next);window.scrollTo(0,0);};
  return [view,navigate] as const;
}
