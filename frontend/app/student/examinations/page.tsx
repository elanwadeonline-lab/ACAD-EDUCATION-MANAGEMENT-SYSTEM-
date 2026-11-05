"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useAcademic } from "../../../components/context/AcademicContext";
import { Modal } from "../../../components/ui/Modal";
import { api } from "../../../lib/api";
import type { Subject, ExamResult } from "../../../lib/types";
import { groupStudentAssessments } from "../../../lib/studentDashboard";
import styles from "../../../components/student/AssessmentFlow.module.css";

type Assessment = Subject & { exam_body?: string };
export default function ExaminationsPage() { return <RequireRole role="student"><Examinations /></RequireRole>; }
function Examinations() {
 const router = useRouter(); const { selectedSession, selectedTerm } = useAcademic();
 const [subjects,setSubjects] = useState<Assessment[]>([]), [results,setResults] = useState<ExamResult[]>([]);
 const [body,setBody] = useState(""), [selected,setSelected] = useState<Assessment|null>(null), [error,setError] = useState(""), [loading,setLoading] = useState(true), [now,setNow] = useState(Date.now());
 useEffect(()=>{ let active=true;setLoading(true);setError("");setSelected(null);setSubjects([]);setResults([]);
 Promise.all([api.getSubjects(selectedSession?.id,selectedTerm?.id),api.getResults(selectedSession?.id,selectedTerm?.id),api.getActiveExams()]).then(([papers,scores,clock])=>{if(active){setSubjects(papers);setResults(scores);const time=(clock as {server_time?:string}).server_time;if(time)setNow(new Date(time).getTime());}}).catch(e=>{if(active)setError(e.message||"Could not load assessments.");}).finally(()=>{if(active)setLoading(false);});
 const timer=setInterval(()=>setNow(time=>time+1000),1000);return()=>{active=false;clearInterval(timer);};
 },[selectedSession?.id,selectedTerm?.id]);
 const taken=new Set(results.filter(r=>r.status==="completed").map(r=>Number(r.subject_id)));
 const visible=subjects.filter(s=>Number(s.is_published)===1||taken.has(Number(s.id)));
 const bodyOf=(s:Assessment)=>s.exam_body||"School assessments";
 const bodies=[...new Set(visible.map(bodyOf))];
 const groups=groupStudentAssessments(subjects,taken,now);
 const status=(s:Assessment)=>taken.has(Number(s.id))?"Completed":groups.assignmentItems.some(p=>p.id===s.id)?"Assignment available":groups.liveExams.some(p=>p.id===s.id)?"Available now":groups.expiredExams.some(p=>p.id===s.id)?"Window closed":groups.unscheduledExams.some(p=>p.id===s.id)?"Date to be announced":"Scheduled";
 const ready=selected&&(groups.liveExams.some(p=>p.id===selected.id)||groups.assignmentItems.some(p=>p.id===selected.id));
 return <div className={styles.page}><header><span className={styles.eyebrow}>Your assessment desk</span><h1>Examinations & assignments</h1><p>Select an examination body to browse the available assessments.</p></header>
 {loading?<p role="status">Loading assessments…</p>:error?<p role="alert">{error}</p>:<><div className={styles.filters}><label>Examination body<select value={body} onChange={e=>{setBody(e.target.value);setSelected(null);}}><option value="">Choose an exam body</option>{bodies.map(b=><option key={b}>{b}</option>)}</select></label></div>{!body?<p className={styles.empty}>{bodies.length?"Choose an exam body to view its assessments.":"No assessments are currently available."}</p>:<div className={styles.list}>{visible.filter(p=>bodyOf(p)===body).map(p=><button key={p.id} type="button" className={styles.row} aria-haspopup="dialog" onClick={()=>setSelected(p)}><span><strong>{p.name}</strong><small>{status(p)} · {p.window_duration||120} minutes</small></span><span>View details →</span></button>)}</div>}</>}
 <Modal open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected?.name||"Assessment details"} description="Review the assessment before opening the exam hall." size="sm">{selected&&<div className={styles.details}><dl><div><dt>Status</dt><dd>{status(selected)}</dd></div><div><dt>Duration</dt><dd>{selected.window_duration||120} minutes</dd></div>{selected.exam_datetime&&!selected.exam_datetime.startsWith("2099")&&<div><dt>Scheduled time</dt><dd>{new Date(selected.exam_datetime).toLocaleString("en-GB")}</dd></div>}</dl><p>{ready?"Choose Open exam hall to continue to the existing exam instructions and start controls.":"This assessment cannot be started from its current status."}</p><div className={styles.actions}>{taken.has(Number(selected.id))?<Link href="/student/results">View published results →</Link>:<button type="button" className={styles.primary} disabled={!ready} onClick={()=>router.push(`/student/exam?subjectId=${selected.id}`)}>Open exam hall →</button>}</div></div>}</Modal>
 </div>;
}
