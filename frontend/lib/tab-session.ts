const OWNER_KEY='exampool_tab_owner';
let ready:Promise<void>|undefined;
const newId=()=>`ecard-tab:${typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)}`;
function clearCopiedSession(){
 const keys=Array.from({length:sessionStorage.length},(_,i)=>sessionStorage.key(i));
 for(const key of keys)if(key&&(key.startsWith('exampool_tab_')||key==='exampool_selected_session'||key==='exampool_selected_term'))sessionStorage.removeItem(key);
}
/** sessionStorage is copied by window.open/duplicate; a copied login must not claim a new tab. */
export function tabSessionReady():Promise<void>{
 if(typeof window==='undefined')return Promise.resolve();
 if(ready)return ready;
 ready=new Promise(resolve=>{
  try{
   let owner=window.name.startsWith('ecard-tab:')?window.name:newId();
   const saved=sessionStorage.getItem(OWNER_KEY);
   if(saved&&saved!==owner)clearCopiedSession();
   window.name=owner;sessionStorage.setItem(OWNER_KEY,owner);
   if(typeof BroadcastChannel==='undefined'){resolve();return;}
   const channel=new BroadcastChannel('ecard-tab-session-ownership');
   const runtime=newId();let checking=true;
   channel.onmessage=({data})=>{
    if(!data||data.owner!==owner||data.sender===runtime)return;
    if(data.kind==='claim')channel.postMessage({kind:'occupied',owner,sender:runtime,target:data.sender});
    if(data.kind==='occupied'&&data.target===runtime&&checking){clearCopiedSession();owner=newId();window.name=owner;sessionStorage.setItem(OWNER_KEY,owner);}
   };
   channel.postMessage({kind:'claim',owner,sender:runtime});
   setTimeout(()=>{checking=false;resolve();},150);
   window.addEventListener('pagehide',()=>channel.close(),{once:true});
  }catch{resolve();}
 });
 return ready;
}
export function initializeTabSession(){void tabSessionReady();}
