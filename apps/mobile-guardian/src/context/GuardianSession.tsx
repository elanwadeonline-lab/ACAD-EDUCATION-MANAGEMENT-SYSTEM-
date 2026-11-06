import React,{createContext,useContext,useEffect,useState,useRef} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {API_BASE_URL,setApiBaseUrl,setAuthToken,requestData} from '../api/client';

export interface GuardianUser {id:number;name:string;email:string;phone?:string;address?:string;role:'guardian'}
type Auth={user:GuardianUser|null;token:string|null;isLoading:boolean;error:string;server:string;
  signIn:(email:string,password:string,server:string)=>Promise<void>;login:(token:string,user:GuardianUser)=>void;logout:()=>Promise<void>};
const Context=createContext<Auth|null>(null);
const storageKey='acqad.guardian.session';

async function loadSavedState(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(storageKey).catch(() => null);
}

async function saveSessionState(val: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, val);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(storageKey, val);
}

async function clearSavedState(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(storageKey).catch(() => {});
}

export function GuardianAuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<GuardianUser|null>(null),[token,setToken]=useState<string|null>(null),[isLoading,setLoading]=useState(true),[error,setError]=useState(''),[server,setServer]=useState(API_BASE_URL);
  const generation=useRef(0);
  useEffect(()=>{let cancelled=false;(async()=>{
    try{
      const saved=await loadSavedState();if(!saved)return;
      const state=JSON.parse(saved);if(state.server)setApiBaseUrl(state.server);if(state.token)setAuthToken(state.token);
      const me=await requestData<{user:GuardianUser}>('/api/auth/me');
      if(me.user?.role!=='guardian')throw new Error('This account is not a guardian.');
      if(!cancelled){setUser(me.user);setToken(state.token);if(state.server)setServer(state.server);}
    }catch{setAuthToken(null);await clearSavedState();if(!cancelled)setError('Sign in again to reconnect to your school.');}
    finally{if(!cancelled)setLoading(false);}
  })();return()=>{cancelled=true;};},[]);
  const signIn=async(email:string,password:string,address:string)=>{
    const current=++generation.current;setError('');setLoading(true);
    try{setApiBaseUrl(address);if(Platform.OS!=='web'&&!API_BASE_URL)throw new Error('Enter your school server address.');
      setAuthToken(null);
      const result=await requestData<{token:string;user:GuardianUser}>('/api/auth/login',{method:'POST',body:JSON.stringify({email,password,role:'guardian'})});
      if(result.user?.role!=='guardian'||!result.token)throw new Error('Use an active guardian account.');
      if(current!==generation.current)return;
      await saveSessionState(JSON.stringify({token:result.token,server:API_BASE_URL}));
      setAuthToken(result.token);setToken(result.token);setUser(result.user);setServer(API_BASE_URL);
    }catch(e){setAuthToken(null);const text=e instanceof Error?e.message:'Sign-in failed.';setError(text);throw new Error(text);}
    finally{if(current===generation.current)setLoading(false);}
  };
  const logout=async()=>{++generation.current;try{await requestData('/api/auth/logout',{method:'POST'});}catch{}
    setAuthToken(null);setToken(null);setUser(null);setError('');await clearSavedState();};
  return <Context.Provider value={{user,token,isLoading,error,server,signIn,logout,login:(next,identity)=>{if(identity.role==='guardian'){setAuthToken(next);setToken(next);setUser(identity);}}}}>{children}</Context.Provider>;
}
export function useGuardianAuth(){const value=useContext(Context);if(!value)throw new Error('GuardianAuthProvider required');return value;}
