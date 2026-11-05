"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '../../hooks/useAuth';
import {learningRequest,uploadLessonFile,downloadLessonFile,type LessonNote,type LessonFile} from '../../lib/learning';
import {useLearningPage} from './useLearningPage';
import s from './LearningSpace.module.css';
type Subject={id:number;name:string;class:string;term:string;session:string};
const message=(e:unknown)=>e instanceof Error?e.message:'Unable to connect. Please retry.';
export function LessonNotesPage(){
 const {user}=useAuth();const [view,navigate]=useLearningPage('note');
 const [notes,setNotes]=useState<LessonNote[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[filter,setFilter]=useState('all');
 const lock=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 const refresh=useCallback(async()=>{const data=await learningRequest<LessonNote[]>('/notes');setNotes(data);if(user?.role==='teacher')setSubjects(await learningRequest<Subject[]>('/subjects'));},[user?.role]);
 useEffect(()=>{if(!user)return;let live=true;void refresh().catch(e=>{if(live)setError(message(e));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[refresh,user?.id]);
 useEffect(()=>{setFeedback('');heading.current?.focus();},[view]);
 const editing=view==='new'||view.startsWith('edit-'),id=Number(view.replace('edit-',''));
 const note=notes.find(n=>n.id===id);
 async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(message(e));}finally{lock.current=false;setBusy(false);}}
 const teacher=user?.role==='teacher',admin=user?.role==='operator';
 return <section className={s.page}><header className={s.header}><div><span className={s.eyebrow}>{admin?'Academic review':'Teaching workspace'}</span><h1 ref={heading} tabIndex={-1}>{editing?(view==='new'?'Write a lesson note':'Edit lesson note'):view&&note?note.title:'Lesson notes'}</h1><p className={s.muted}>{admin?'Review teachers’ lesson notes, approve submissions, or return feedback.':'Prepare your teaching notes and submit them to admin for review.'}</p></div><div className={s.actions}>{view?<button onClick={()=>navigate('')}>← All lesson notes</button>:teacher&&<button className={s.primary} onClick={()=>navigate('new')}>Write a lesson note</button>}<Link href={`/${admin?'ADMIN':teacher?'teacher':'student'}/community`}>Community</Link></div></header>
 {error&&<div role="alert" className={s.error}>{error} <button onClick={()=>void run(refresh)}>Retry</button></div>}
 {loading?<p role="status">Loading lesson notes…</p>:editing&&teacher?(view!=='new'&&!note?<p>This note is no longer available. Return to the list and refresh.</p>:<NoteEditor key={view} note={note} subjects={subjects} onSaved={async id=>{await refresh();navigate(String(id));}}/>):view?note?<>
  <div className={s.meta}><span className={s.kind}>{note.state}</span><span>{note.subject_name} · {note.class||'Class not assigned'}</span><span>{note.session} · {note.term}</span><span>{note.teacher_name}</span></div>
  {note.feedback&&<div className={s.notice}><strong>Admin feedback</strong><p>{note.feedback}</p></div>}
  <article className={s.paper}><div className={s.body}>{note.body||'This lesson note is available in the attachments below.'}</div>{note.files.map(file=><div className={s.file} key={file.id}><span>{file.filename} · {(file.bytes/1024/1024).toFixed(1)} MB</span><button disabled={busy} onClick={()=>void run(()=>downloadLessonFile(file))}>Download attachment</button></div>)}</article>
  {teacher&&<button onClick={()=>navigate(`edit-${note.id}`)}>Edit lesson note</button>}
  {admin&&note.state==='submitted'&&<section className={s.review}><h2>Review this submission</h2><p className={s.muted}>Approve this teacher’s lesson note or return it with feedback. These documents stay within the teacher and admin workspace.</p><label>Feedback to teacher<textarea maxLength={2000} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Required when returning for changes."/></label><div className={s.actions}><button className={s.primary} disabled={busy} onClick={()=>void run(async()=>{await learningRequest(`/notes/${note.id}/review`,{state:'approved',feedback});await refresh();})}>Approve lesson note</button><button disabled={busy||!feedback.trim()} onClick={()=>void run(async()=>{await learningRequest(`/notes/${note.id}/review`,{state:'returned',feedback});await refresh();})}>Return for changes</button></div></section>}
 </>:<p>This lesson note is unavailable. Return to the list and refresh.</p>:<>
  <div className={s.toolbar}><label>Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All lesson notes</option>{(teacher||admin)&&<><option value="draft">Drafts</option><option value="submitted">Awaiting admin review</option><option value="returned">Returned for changes</option></>}<option value="approved">Approved</option></select></label><button disabled={busy} onClick={()=>void run(refresh)}>Refresh notes</button></div>
  {notes.filter(n=>filter==='all'||n.state===filter).map(n=><article key={n.id} className={s.row}><div className={s.meta}><span className={s.kind}>{n.state}</span><span>{n.subject_name} · {n.class||'Class not assigned'}</span><span>{n.term}</span></div><h2><button className={s.rowLink} onClick={()=>navigate(String(n.id))}>{n.title}</button></h2><div className={s.excerpt}>{n.body||`${n.files.length} attached lesson files`}</div><span className={s.muted}>{n.teacher_name} · Updated {new Date(n.updated_at).toLocaleDateString()} · {n.files.length} attachments</span></article>)}
  {!notes.some(n=>filter==='all'||n.state===filter)&&<div className={s.empty}><h2>No lesson notes here yet</h2><p>{teacher?'Start with an assigned subject, then type your note or attach a PDF or photo.':'Teachers’ lesson notes will appear here when saved or submitted for review.'}</p>{teacher&&<button onClick={()=>navigate('new')}>Write a lesson note</button>}</div>}
 </>}
 </section>;
}
function NoteEditor({note,subjects,onSaved}:{note?:LessonNote;subjects:Subject[];onSaved:(id:number)=>Promise<void>}){
 const [title,setTitle]=useState(note?.title||''),[body,setBody]=useState(note?.body||''),[subject,setSubject]=useState(String(note?.subject_id||subjects[0]?.id||'')),[files,setFiles]=useState<LessonFile[]>(note?.files||[]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 async function upload(list:FileList|null){if(!list||lock.current)return;const selected=Array.from(list);if(files.length+selected.length>6){setError('Attach up to six files.');return;}lock.current=true;setBusy(true);setError('');try{for(const file of selected){if(file.size>15*1024*1024)throw new Error(`${file.name} exceeds 15 MB.`);const result=await uploadLessonFile(file);setFiles(current=>[...current,result]);}}catch(e){setError(message(e));}finally{setBusy(false);lock.current=false;}}
 async function save(state:string){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await learningRequest<{id:number}>(note?`/notes/${note.id}`:'/notes',{title,body,subject_id:Number(subject),file_ids:files.map(f=>f.id),state});await onSaved(result.id);}catch(e){setError(message(e));}finally{setBusy(false);lock.current=false;}}
 return <form className={s.form} onSubmit={e=>{e.preventDefault();void save('draft');}}>
  {error&&<div className={s.error} role="alert">{error}</div>}
  {!subjects.length&&<p className={s.notice}>No assigned subjects yet. Ask admin to assign a subject before creating a lesson note.</p>}
  <label>Assigned subject<select required disabled={busy} value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Choose a subject</option>{subjects.map(sub=><option key={sub.id} value={sub.id}>{sub.name} · {sub.class||'No class'} · {sub.term} · {sub.session}</option>)}</select></label>
  <label>Lesson title<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="For example: Introduction to fractions"/></label>
  <label>Lesson note<textarea maxLength={100000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write the objectives, explanation, worked examples, and class activities."/></label>
  <label>Attach PDFs or photos<input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy||files.length>=6} onChange={e=>{void upload(e.target.files);e.target.value='';}}/><span className={s.muted}>Up to 6 files, 15 MB each. You can select photos of handwritten notes.</span></label>
  <label>Take a photo of your note<input type="file" accept="image/*" capture="environment" disabled={busy||files.length>=6} onChange={e=>{void upload(e.target.files);e.target.value='';}}/></label>
  {files.map(f=><div className={s.file} key={f.id}><span>{f.filename}</span><button type="button" disabled={busy} onClick={()=>setFiles(current=>current.filter(file=>file.id!==f.id))}>Remove attachment</button></div>)}
  <p className={s.muted}>Save your preparation as a draft, then submit it to admin for review. Lesson notes and their attachments are not shared with students.</p>
  <div className={s.actions}><button disabled={busy||!subjects.length}>Save draft</button><button type="button" className={s.primary} disabled={busy||!subject||!title.trim()||(!body.trim()&&!files.length)} onClick={()=>void save('submitted')}>Submit to admin</button>{busy&&<span role="status">Saving…</span>}</div>
 </form>;
}
