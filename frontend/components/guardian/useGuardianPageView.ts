"use client";
import {useEffect,useState,useCallback} from 'react';
export function useGuardianPageView(){
 const [view,setView]=useState('');
 useEffect(()=>{const read=()=>setView(new URLSearchParams(location.search).get('view')||'');read();addEventListener('popstate',read);return()=>removeEventListener('popstate',read)},[]);
 useEffect(()=>{if(!view)return;const heading=document.querySelector<HTMLElement>('[data-guardian-detail] h3');if(heading){heading.tabIndex=-1;heading.focus()}},[view]);
 const navigate=useCallback((value:string)=>{const url=new URL(location.href);if(value)url.searchParams.set('view',value);else url.searchParams.delete('view');history.pushState(null,'',url);setView(value);window.scrollTo(0,0)},[]);
 return [view,navigate] as const;
}
export function useGuardianRecordPage<T extends {id:string|number}>(records:T[]){
 const [view,navigate]=useGuardianPageView();
 const selected=records.find(item=>String(item.id)===view)||null;
 return [selected,(item:T|null)=>navigate(item?String(item.id):'')] as const;
}
