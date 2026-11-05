import React,{createContext,useContext,useEffect,useRef,useState,useCallback} from 'react';
import {Ward,requestData} from '../api/client';
import {useGuardianAuth} from './GuardianAuthContext';
type State={wards:Ward[];activeWard:Ward|null;setActiveWard:(ward:Ward)=>void;isSwitcherOpen:boolean;openSwitcher:()=>void;closeSwitcher:()=>void;isLoadingWards:boolean;error:string;refreshWards:()=>Promise<void>;updatedAt:number|null};
const Context=createContext<State|null>(null);
export function ActiveWardProvider({children}:{children:React.ReactNode}){
  const {token,user}=useGuardianAuth();
  const [wards,setWards]=useState<Ward[]>([]),[activeWard,setSelected]=useState<Ward|null>(null),[isSwitcherOpen,setOpen]=useState(false),[isLoadingWards,setLoading]=useState(false),[error,setError]=useState(''),[updatedAt,setUpdatedAt]=useState<number|null>(null);
  const sequence=useRef(0);
  const refreshWards=useCallback(async()=>{
    const current=++sequence.current;if(!token||!user){setWards([]);setSelected(null);setLoading(false);setError('');return;}
    setLoading(true);setError('');
    try{const data=await requestData<{wards:Ward[]}>('/api/guardian/wards');
      if(current!==sequence.current)return;
      const next=Array.isArray(data.wards)?data.wards.map(w=>({...w,id:Number(w.student_id||w.id),term_average:w.average_score??undefined,attendance_rate:w.attendance_pct??undefined,class_name:w.grade})):[];
      setWards(next);setSelected(prev=>next.find(w=>w.id===prev?.id)||next[0]||null);setUpdatedAt(Date.now());
    }catch(e){if(current===sequence.current){setWards([]);setSelected(null);setError(e instanceof Error?e.message:'Could not load your children.');}}
    finally{if(current===sequence.current)setLoading(false);}
  },[token,user?.id]);
  useEffect(()=>{setWards([]);setSelected(null);setOpen(false);setUpdatedAt(null);void refreshWards();return()=>{sequence.current++;};},[refreshWards]);
  return <Context.Provider value={{wards,activeWard,setActiveWard:ward=>{const owned=wards.find(w=>w.id===ward.id);if(owned)setSelected(owned);setOpen(false);},isSwitcherOpen,openSwitcher:()=>setOpen(true),closeSwitcher:()=>setOpen(false),isLoadingWards,error,refreshWards,updatedAt}}>{children}</Context.Provider>;
}
export function useActiveWard(){const value=useContext(Context);if(!value)throw new Error('ActiveWardProvider required');return value;}
