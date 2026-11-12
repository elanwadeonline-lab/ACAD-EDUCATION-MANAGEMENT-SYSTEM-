"use client";
import {useEffect,useRef,useState} from 'react';
import {fetchWithAuth,API_BASE,buildAuthHeaders} from '../../lib/api';
import {arenaRequestKey} from '../../lib/arena';
import type {LearningResource,LessonFile} from '../../lib/learning';
import s from './StudyWorkspace.module.css';

type Message={id:number;author_id:number;body:string;resource_id:number|null;quote:string;page:number|null;created_at:number};
type Thread={resources:LearningResource[];messages:Message[];nextBefore:number|null};
async function request(path:string,body?:unknown) {
  const result=await fetchWithAuth<Thread>(`/api/arena${path}`,body===undefined?{}:{method:'POST',body:JSON.stringify(body)},{redirectOn503:false});
  if(!result)throw new Error('Your study space is unavailable. Try again.');
  return result;
}
export function StudyWorkspace({partnerId,userId,name}:{partnerId:number;userId:number;name:string}) {
  const [thread,setThread]=useState<Thread|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [resourceId,setResourceId]=useState(''),[body,setBody]=useState(''),[quote,setQuote]=useState(''),[page,setPage]=useState('');
  const [tab,setTab]=useState<'chat'|'read'>('chat'),[fileUrl,setFileUrl]=useState(''),[fileMime,setFileMime]=useState('');
  const [selectedFile,setSelectedFile]=useState<number|null>(null);
  const [focusQuote,setFocusQuote]=useState('');
  const lock=useRef(false),intent=useRef<{signature:string;key:string}|null>(null);
  const fileVersion=useRef(0),urlRef=useRef(''),reading=useRef<HTMLElement>(null),messagesRef=useRef<HTMLDivElement>(null),followLatest=useRef(true);
  const resource=thread?.resources.find(r=>String(r.id)===resourceId);
  const path=`/partners/${partnerId}/messages`;
  const merge=(current:Thread|null,next:Thread):Thread=>({...next,nextBefore:current&&current.messages.length>50?current.nextBefore:next.nextBefore,messages:[...new Map([...(current?.messages??[]),...next.messages].map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id)});
  const report=(e:unknown)=>setError(e instanceof Error?e.message:'Connection failed. Try again.');
  useEffect(()=>{if(followLatest.current&&messagesRef.current)messagesRef.current.scrollTop=messagesRef.current.scrollHeight;},[thread?.messages.at(-1)?.id,tab]);
  useEffect(()=>{if(tab==='read'&&focusQuote)reading.current?.querySelector('mark')?.scrollIntoView({block:'nearest'});},[tab,resourceId,focusQuote]);
  const highlight=(paragraph:string)=>{
    const anchor=[focusQuote,...(thread?.messages.filter(m=>String(m.resource_id)===resourceId).map(m=>m.quote)||[])].find(q=>q&&paragraph.includes(q));
    if(!anchor)return paragraph;
    const index=paragraph.indexOf(anchor);
    return <>{paragraph.slice(0,index)}<mark>{anchor}</mark>{paragraph.slice(index+anchor.length)}</>;
  };
  useEffect(()=>{
    let cancelled=false,pending=false;
    const load=async()=>{
      if(pending||lock.current||document.hidden)return;
      pending=true;
      try{const next=await request(path);if(!cancelled){setThread(current=>merge(current,next));setError('');}}
      catch(e){if(!cancelled)report(e);}finally{pending=false;}
    };
    void load();const timer=window.setInterval(load,8000);
    document.addEventListener('visibilitychange',load);
    return()=>{cancelled=true;clearInterval(timer);document.removeEventListener('visibilitychange',load);};
  },[path]);
  useEffect(()=>()=>{fileVersion.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current);},[]);
  function chooseResource(id:string){fileVersion.current++;setResourceId(id);setQuote('');setFocusQuote('');setPage('');setFileUrl('');setSelectedFile(null);if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current='';}
  async function openFile(file:LessonFile){
    const version=++fileVersion.current;
    try{
      const response=await fetch(`${API_BASE}/api/learning/library/files/${file.id}`,{credentials:'include',headers:buildAuthHeaders()});
      if(!response.ok)throw new Error('Unable to open this material. Refresh and retry.');
      const blob=await response.blob();if(version!==fileVersion.current)return;
      if(urlRef.current)URL.revokeObjectURL(urlRef.current);
      urlRef.current=URL.createObjectURL(blob);setFileUrl(urlRef.current);setFileMime(file.mime);setSelectedFile(file.id);
    }catch(e){report(e);}
  }
  async function send(){
    if(lock.current||!body.trim())return;
    lock.current=true;setBusy(true);setError('');
    const payload={body:body.trim(),resourceId:resource?resource.id:null,quote,page:page?Number(page):null};
    const signature=JSON.stringify(payload);
    if(intent.current?.signature!==signature)intent.current={signature,key:arenaRequestKey()};
    followLatest.current=true;
    try{const next=await request(path,{...payload,requestKey:intent.current!.key});setThread(current=>merge(current,next));setBody('');setQuote('');setPage('');intent.current=null;}
    catch(e){report(e);}finally{lock.current=false;setBusy(false);}
  }
  async function older(){
    if(lock.current||!thread?.nextBefore)return;
    lock.current=true;setBusy(true);
    try{const next=await request(`${path}?before=${thread.nextBefore}`);setThread(current=>current?{...current,nextBefore:next.nextBefore,messages:[...next.messages,...current.messages]}:next);}catch(e){report(e);}finally{lock.current=false;setBusy(false);}
  }
  return <div className={s.workspace}>
    <p className={s.muted}>Private study with {name}. Messages and shared notes are saved to your accounts.</p>
    {error&&<p className={s.error} role="alert">{error}</p>}
    <div className={s.tabs} role="group" aria-label="Study workspace view"><button aria-pressed={tab==='chat'} onClick={()=>setTab('chat')}>Conversation</button><button aria-pressed={tab==='read'} onClick={()=>setTab('read')}>Read & annotate</button></div>
    <div className={s.columns}>
      <section className={s.reader} data-visible={tab==='read'} aria-label="Shared class materials">
        <label>Class material<select value={resourceId} onChange={e=>chooseResource(e.target.value)}><option value="">Choose a material</option>{thread?.resources.map(r=><option key={r.id} value={r.id}>{r.subject_name} · {r.title}</option>)}</select></label>
        {!thread?<p role="status">Loading your study space…</p>:!thread.resources.length?<p className={s.muted}>Published materials available to both partners will appear here.</p>:!resource?<p className={s.muted}>Choose a class material to read and discuss together.</p>:<>
          <h3>{resource.title}</h3>
          <article ref={reading} className={s.reading}>{resource.body.split(/\n\s*\n/).map((paragraph,index)=><div key={index}><p>{highlight(paragraph)}</p><button onClick={()=>{setQuote(paragraph.slice(0,2000));setTab('chat');}}>Discuss this passage</button></div>)}</article>
          {!!resource.body&&<button onClick={()=>{const selection=window.getSelection();if(selection?.rangeCount&&reading.current?.contains(selection.getRangeAt(0).commonAncestorContainer)){setQuote(selection.toString().slice(0,2000));setTab('chat');}else setError('Select a passage in the reading first, then choose Add selected passage.');}}>Add selected passage to note</button>}
          {resource.files.map(file=><button aria-pressed={selectedFile===file.id} key={file.id} onClick={()=>void openFile(file)}>Read {file.filename}</button>)}
          {fileUrl&&(fileMime==='application/pdf'?<><object className={s.pdf} data={`${fileUrl}${page?`#page=${page}`:''}`} type="application/pdf" aria-label="PDF material"><p>Your browser cannot embed this PDF. Use Open material below.</p></object><a href={fileUrl} target="_blank" rel="noopener noreferrer">Open material in PDF reader</a></>:<img className={s.image} src={fileUrl} alt="Class learning material"/>)}
          <p className={s.muted}>For a PDF, add a page number and paste the passage into your note. Selectable text depends on the PDF reader.</p>
        </>}
      </section>
      <section className={s.conversation} data-visible={tab==='chat'} aria-label="Private conversation">
        <div ref={messagesRef} className={s.messages} aria-label="Saved messages" onScroll={e=>{const list=e.currentTarget;followLatest.current=list.scrollHeight-list.scrollTop-list.clientHeight<60;}}>
          {thread?.nextBefore&&<button disabled={busy} onClick={()=>void older()}>Load earlier messages</button>}
          {thread&&!thread.messages.length&&<p className={s.muted}>Start with a question, or choose a material to read together.</p>}
          {thread?.messages.map(m=><article key={m.id} className={s.message} data-self={m.author_id===userId}>
            <small>{m.author_id===userId?'You':name} · {new Date(m.created_at).toLocaleString([],{dateStyle:'short',timeStyle:'short'})}</small>
            {m.resource_id&&<button className={s.reference} onClick={()=>{chooseResource(String(m.resource_id));setFocusQuote(m.quote);setPage(m.page?String(m.page):'');setTab('read');}}>{thread.resources.find(r=>r.id===m.resource_id)?.title}{m.page?` · Page ${m.page}`:''}</button>}
            {m.quote&&<blockquote>{m.quote}</blockquote>}<p>{m.body}</p>
          </article>)}
        </div>
        <form className={s.composer} onSubmit={e=>{e.preventDefault();void send();}}>
          {resource&&<><p className={s.muted}>Note on {resource.title}</p><div className={s.anchor}><label>Page (optional)<input type="number" min="1" max="10000" inputMode="numeric" value={page} onChange={e=>setPage(e.target.value)}/></label><label>Passage (optional)<textarea maxLength={2000} rows={2} value={quote} onChange={e=>setQuote(e.target.value)} placeholder="Selected text or a passage from the PDF"/></label></div><button type="button" onClick={()=>chooseResource('')}>Remove material reference</button></>}
          <label htmlFor={`study-message-${partnerId}`}>{resource?'Your note':'Message'}</label><textarea id={`study-message-${partnerId}`} maxLength={4000} rows={3} value={body} onChange={e=>setBody(e.target.value)} placeholder="Ask a question or share an idea…" disabled={busy} required/>
          <button className={s.primary} disabled={busy||!thread||!body.trim()}>{busy?'Saving…':resource?'Save shared note':'Send message'}</button>
        </form>
      </section>
    </div>
  </div>;
}
