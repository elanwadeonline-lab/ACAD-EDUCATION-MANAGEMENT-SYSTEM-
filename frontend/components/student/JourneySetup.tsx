"use client";
import {useEffect,useRef,useState} from 'react';
import {departments,subjectNames,type Department,type StudyJourney} from '../../../shared/study-journey';
import type {ArenaPaper,ArenaSession} from '../../../shared/arena';
import {fetchWithAuth} from '../../lib/api';
import {arenaRequestKey} from '../../lib/arena';
import s from './StudyWorkspace.module.css';

export function JourneySetup({papers,onStart}:{papers:ArenaPaper[];onStart:(session:ArenaSession)=>void}) {
  const [body,setBody]=useState(''),[department,setDepartment]=useState<Department>('science'),[subjects,setSubjects]=useState<string[]>(['ENG']);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true);
  const lock=useRef(false),intent=useRef<string|null>(null);
  const bodies=[...new Set(papers.map(p=>p.id.split('_')[0]))];
  useEffect(()=>{let active=true;void fetchWithAuth<StudyJourney>('/api/arena/journey',{}, {redirectOn503:false}).then(saved=>{if(active&&saved){setBody(saved.examBody);setDepartment(saved.department);setSubjects(saved.subjects);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const available=(code:string)=>papers.some(p=>p.id.startsWith(`${body}_`)&&p.id.endsWith(`_${code}`));
  const ready=!!body&&(body!=='JAMB'||subjects.length===4&&subjects.every(available));
  async function save(start:boolean){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
    try{
      await fetchWithAuth('/api/arena/journey',{method:'POST',body:JSON.stringify({examBody:body,department,subjects:body==='JAMB'?subjects:[]})},{redirectOn503:false});
      if(start){intent.current??=arenaRequestKey();const result=await fetchWithAuth<ArenaSession>('/api/arena/journey/start',{method:'POST',body:JSON.stringify({requestKey:intent.current})},{redirectOn503:false});if(!result)throw new Error('Unable to start your journey. Try again.');intent.current=null;onStart(result);}
      else setNotice('Your study journey is saved to your account.');
    }catch(e){setError(e instanceof Error?e.message:'Unable to save. Try again.');}finally{lock.current=false;setBusy(false);}
  }
  return <section className={s.workspace} style={{marginBottom:24}} aria-label="Solo study journey">
    <h3>Choose your solo journey</h3><p className={s.muted}>Choose an exam body and department. Each quest draws five questions per available subject. Internal school exams stay in your school exam area.</p>
    {loading?<p role="status">Loading your saved journey…</p>:<fieldset disabled={busy} style={{border:0,padding:0,display:'grid',gap:12}}>
      <label>Exam body<select value={body} onChange={e=>{setBody(e.target.value);setSubjects(['ENG']);intent.current=null;setNotice('');}}><option value="">Choose published exam body</option>{bodies.filter(b=>b!=='INTERNAL').map(b=><option key={b}>{b}</option>)}</select></label>
      {body&&<label>Department<select value={department} onChange={e=>{setDepartment(e.target.value as Department);setSubjects(['ENG']);intent.current=null;setNotice('');}}><option value="science">Science</option><option value="commercial">Commercial</option><option value="arts">Arts</option></select></label>}
      {body==='JAMB'&&<><p className={s.muted}>Use of English is included. Choose three more subjects ({subjects.length}/4). Check your course requirements when choosing.</p><div className={s.subjects}>{departments[department].map(code=><label key={code}><input type="checkbox" checked={subjects.includes(code)} disabled={code==='ENG'||!available(code)||subjects.length===4&&!subjects.includes(code)} onChange={e=>{setSubjects(current=>e.target.checked?[...current,code]:current.filter(s=>s!==code));intent.current=null;setNotice('');}}/>{subjectNames[code]||code}{!available(code)&&' · Awaiting upload'}</label>)}</div></>}
      {body&&body!=='JAMB'&&<p className={s.muted}>Your quest uses published papers for your department. A four-subject combination is only required for JAMB.</p>}
      <div className={s.tabs} style={{display:'flex',flexWrap:'wrap'}}><button disabled={!ready} onClick={()=>void save(false)}>Save journey</button><button className={s.primary} disabled={!ready} onClick={()=>void save(true)}>{busy?'Preparing…':'Start solo journey'}</button></div>
    </fieldset>}
    {error&&<p className={s.error} role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  </section>;
}
