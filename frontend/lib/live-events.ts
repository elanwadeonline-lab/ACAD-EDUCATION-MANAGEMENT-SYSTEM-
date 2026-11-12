import {API_BASE,buildAuthHeaders} from './api';
import {tabSessionReady} from './tab-session';

type SchoolEvent={type?:string;[key:string]:unknown};
/** Authenticated per-tab stream; credentials alone can select another role's shared cookie. */
export function subscribeSchoolEvents(onEvent:(event:SchoolEvent)=>void,onReconnect?:()=>void){
 let stopped=false,attempt=0,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined;
 const connect=async()=>{
  await tabSessionReady();
  if(stopped||document.hidden)return;
  controller=new AbortController();
  try{
   const response=await fetch(`${API_BASE}/api/notifications/stream`,{credentials:'include',headers:buildAuthHeaders(),signal:controller.signal,cache:'no-store'});
   if(response.status===401||response.status===403){stopped=true;return;}
   if(!response.ok||!response.body)throw new Error('Live connection unavailable');
   attempt=0;onReconnect?.();
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   try {while(!stopped){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});
    if(buffer.length>1000000)throw new Error('Live event exceeded its size limit');
    const blocks=buffer.split(/\r?\n\r?\n/);buffer=blocks.pop()||'';
    for(const block of blocks){const data=block.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(data)try{onEvent(JSON.parse(data));}catch{}}
   }}finally{await reader.cancel().catch(()=>{});}
  }catch(error){if(controller?.signal.aborted)return;}
  if(!stopped&&!document.hidden)timer=setTimeout(connect,Math.min(30000,1000*2**Math.min(attempt++,5))+Math.random()*300);
 };
 const visible=()=>{clearTimeout(timer);controller?.abort();if(!document.hidden)void connect();};
 document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);void connect();
 return()=>{stopped=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);};
}
