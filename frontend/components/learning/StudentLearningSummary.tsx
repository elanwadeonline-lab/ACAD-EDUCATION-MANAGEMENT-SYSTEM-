"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import LinearProgress from '@mui/material/LinearProgress';
import {BooksIcon} from '@phosphor-icons/react/dist/csr/Books';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/csr/ArrowRight';
import {learningRequest,type LearningResource} from '../../lib/learning';
import {useAuth} from '../../hooks/useAuth';
import s from './LearningSpace.module.css';
export function StudentLearningSummary(){
 const {user}=useAuth();const [resources,setResources]=useState<LearningResource[]|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{if(!user)return;let active=true;void learningRequest<LearningResource[]>('/library').then(data=>{if(active)setResources(data);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[user?.id]);
 const done=resources?.filter(r=>r.completed_at).length||0;
 const next=resources?.filter(r=>!r.completed_at).sort((a,b)=>(b.opened_at||0)-(a.opened_at||0))[0];
 return <section className={s.summary} aria-label="Learning library summary"><div className={s.actions}><BooksIcon size={30} weight="fill" color="var(--color-primary)" aria-hidden="true"/><div><h2>Learning library</h2><p>{failed?'Open your class resources and learning progress.':resources?resources.length?`${done} of ${resources.length} materials completed · ${new Set(resources.map(r=>r.subject_name)).size} subjects`:'Your class materials will appear here when published.':'Loading your learning materials…'}</p></div></div><div className={s.summaryProgress}>{resources&&resources.length>0&&<LinearProgress variant="determinate" value={done/resources.length*100} aria-label="Completed learning materials" sx={{height:5,borderRadius:4,bgcolor:'var(--color-border)','& .MuiLinearProgress-bar':{bgcolor:'var(--color-primary)'}}}/>}<Link href={next?`/student/library?resource=${next.id}`:'/student/library'}>{next?'Continue learning':'Explore library'} <ArrowRightIcon weight="fill" size={16} aria-hidden="true"/></Link></div></section>;
}
