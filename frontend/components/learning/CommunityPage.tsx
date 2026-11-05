"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '../../hooks/useAuth';
import {arenaApi} from '../../lib/arena';
import {learningRequest, type LearningPost,type LearningReply} from '../../lib/learning';
import {useLearningPage} from './useLearningPage';
import s from './LearningSpace.module.css';
const errorText=(e:unknown)=>e instanceof Error?e.message:'Unable to connect. Please retry.';
const date=(n:number)=>new Date(n).toLocaleString();
export function CommunityPage(){
 const {user}=useAuth();
 const [view,navigate]=useLearningPage('thread');
 const [posts,setPosts]=useState<LearningPost[]>([]),[thread,setThread]=useState<{post:LearningPost;replies:LearningReply[]}|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[online,setOnline]=useState<number|null>(null);
 const [filter,setFilter]=useState('all'),[title,setTitle]=useState(''),[body,setBody]=useState(''),[kind,setKind]=useState('question'),[code,setCode]=useState(''),[reply,setReply]=useState('');
 const [more,setMore]=useState(true);
 const lock=useRef(false),paginated=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 const refresh=useCallback(async()=>{
  if(view && view!=='new')setThread(await learningRequest(`/posts/${Number(view)}`));
  else if(!view){const data=await learningRequest<LearningPost[]>('/posts');setPosts(data);setMore(data.length===40);}
 },[view]);
 useEffect(()=>{if(!user)return;let alive=true;paginated.current=false;setError('');setLoading(true);setThread(null);setReply('');
  const load=async()=>{try{if(view && view!=='new'){const data=await learningRequest<{post:LearningPost;replies:LearningReply[]}>(`/posts/${Number(view)}`);if(alive)setThread(data);}else if(!view){const data=await learningRequest<LearningPost[]>('/posts');if(alive){setPosts(data);setMore(data.length===40);}}if(alive)setError('');}catch(e){if(alive)setError(errorText(e));}finally{if(alive)setLoading(false);}};
  void load();const timer=setInterval(()=>{if(!document.hidden&&!paginated.current)void load();},10000);heading.current?.focus();return()=>{alive=false;clearInterval(timer);};
 },[view,user?.id]);
 useEffect(()=>{if(!user)return;let alive=true;const beat=()=>{if(!document.hidden)void learningRequest<{count:number}>('/presence',{}).then(data=>{if(alive)setOnline(data.count);}).catch(()=>undefined);};beat();const timer=setInterval(beat,25000);return()=>{alive=false;clearInterval(timer);};},[user?.id]);
 async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));}finally{lock.current=false;setBusy(false);}}
 const staff=user?.role==='teacher'||user?.role==='operator';
 const visible=posts.filter(p=>filter==='all'||(filter==='unanswered'?p.reply_count===0&&!p.resolved:p.kind===filter));
 return <section className={s.page}>
  <header className={s.header}><div><span className={s.eyebrow}>School community</span><h1 ref={heading} tabIndex={-1}>{view==='new'?'Start a discussion':thread?thread.post.title:'Learn together'}</h1><p className={s.muted}>{view==='new'?'Your post will be visible to all students and school staff.':'Ask a question, share an approach, or find a challenge partner.'}</p></div><div className={s.actions}>{!view&&<button className={s.primary} onClick={()=>navigate('new')}>Ask the community</button>}{view&&<button onClick={()=>navigate('')}>← All discussions</button>}{user?.role!=='student'&&<Link href={`/${user?.role==='operator'?'ADMIN':'teacher'}/lesson-notes`}>Lesson notes</Link>}</div></header>
  {error&&<div role="alert" className={s.error}>{error} <button onClick={()=>void run(refresh)}>Retry</button></div>}
  {view==='new'?<form className={s.form} onSubmit={e=>{e.preventDefault();void run(async()=>{const result=await learningRequest<{post:LearningPost}>('/posts',{title,body,kind,challenge_code:code});setTitle('');setBody('');setCode('');navigate(String(result.post.id));});}}>
   <label>Post type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="question">Question · I need help</option><option value="discussion">Discussion · Share an idea</option><option value="challenge">Challenge · Find a partner</option></select></label>
   <label>Title<input required maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} placeholder="What would you like to work through?"/></label>
   <label>Question or message<textarea required maxLength={10000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Paste your question or code, and explain what you have tried."/></label>
   {kind==='challenge'&&<label>Practice Arena challenge code<input required maxLength={8} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/><span className={s.muted}>Create a challenge in Practice Arena first, then paste its code. Joining follows the Arena’s class and room rules.</span></label>}
   <div className={s.actions}><button className={s.primary} disabled={busy}>Post to community</button><button type="button" onClick={()=>navigate('')}>Back to discussions</button></div>
  </form>:view?loading&&!thread?<p role="status">Loading discussion…</p>:thread&&<>
   <div className={s.meta}><span className={s.kind}>{thread.post.kind}</span><span>{thread.post.author_name} · {thread.post.author_role}</span><span>{date(thread.post.created_at)}</span>{!!thread.post.resolved&&<span>Resolved</span>}</div>
   <article className={s.paper}><div className={s.body}>{thread.post.body}</div>{thread.post.challenge_code&&<div className={s.actions}><code>{thread.post.challenge_code}</code>{user?.role==='student'&&<button disabled={busy} className={s.primary} onClick={()=>void run(async()=>{await arenaApi.join(thread.post.challenge_code!);window.location.href='/student/practice/';})}>Join challenge</button>}</div>}</article>
   {(staff||user?.id===thread.post.author_id)&&<div className={s.actions}><button disabled={busy} onClick={()=>void run(async()=>{await learningRequest(`/posts/${thread.post.id}/moderate`,{action:'resolve'});await refresh();})}>{thread.post.resolved?'Reopen question':'Mark resolved'}</button><button disabled={busy} onClick={()=>{if(window.confirm('Hide this discussion and its replies from the community?'))void run(async()=>{await learningRequest(`/posts/${thread.post.id}/moderate`,{action:'hide'});navigate('');});}}>Hide discussion</button></div>}
   <section className={s.replies}><h2>Replies · {thread.replies.length}</h2>{thread.replies.length===0&&<p className={s.muted}>No replies yet. Share an explanation or ask a follow-up question.</p>}{thread.replies.map(r=><article key={r.id} className={s.reply}><div className={s.meta}><strong>{r.author_name}</strong><span>{r.author_role} · {date(r.created_at)}</span></div><div className={s.body}>{r.body}</div>{staff&&<button className={s.textButton} disabled={busy} onClick={()=>void run(async()=>{await learningRequest(`/posts/${thread.post.id}/moderate`,{action:'hide-reply',reply_id:r.id});await refresh();})}>Hide reply</button>}</article>)}</section>
   <form className={s.form} onSubmit={e=>{e.preventDefault();void run(async()=>{const next=await learningRequest<{post:LearningPost;replies:LearningReply[]}>(`/posts/${thread.post.id}/replies`,{body:reply});setThread(next);setReply('');});}}><label>Your reply<textarea required maxLength={10000} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Explain your steps so others can learn too."/></label><div><button disabled={busy} className={s.primary}>Post reply</button></div></form>
  </>:<>
   <div className={s.toolbar}><label>Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All discussions</option><option value="unanswered">Needs an answer</option><option value="question">Questions</option><option value="challenge">Challenges</option><option value="discussion">Discussions</option></select></label><span className={s.muted}>{online===null?'Shared school space':`${online} ${online===1?'student':'students'} active in the community`}</span></div>
   {loading?<p role="status">Loading discussions…</p>:visible.length===0?<div className={s.empty}><h2>{posts.length?'No matching discussions':'Be the first to ask'}</h2><p>Post a question or share a topic you would like to understand.</p><button onClick={()=>navigate('new')}>Start a discussion</button></div>:visible.map(p=><article key={p.id} className={s.row}><div className={s.meta}><span className={s.kind}>{p.kind}</span><span>{p.author_name}</span><span>{date(p.created_at)}</span>{!!p.resolved&&<span>Resolved</span>}</div><h2><button className={s.rowLink} onClick={()=>navigate(String(p.id))}>{p.title}</button></h2><div className={s.excerpt}>{p.body}</div><span className={s.muted}>{p.reply_count} replies{p.challenge_code?` · Code ${p.challenge_code}`:''}</span></article>)}
   {more&&!loading&&<button disabled={busy} onClick={()=>void run(async()=>{const older=await learningRequest<LearningPost[]>(`/posts?before=${posts[posts.length-1]?.id}`);paginated.current=true;setPosts(current=>[...current,...older]);setMore(older.length===40);})}>Load older discussions</button>}
  </>}
 </section>;
}
