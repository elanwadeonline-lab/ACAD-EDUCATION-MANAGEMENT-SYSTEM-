import {beforeAll,expect,test} from 'bun:test';
import db,{queries} from '../db';
import {generateToken} from '../auth';
import {schoolDisplayName} from '../shared/brand';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8139';
let admin:number,teacher:number,otherTeacher:number,student:number,otherStudent:number,guardian:number,classId:number,subjectId:number,termId:number,sessionId:number,gradingId:number;
const token=(id:number,role:string)=>generateToken(id,role);
const request=(path:string,id:number,role:string,body?:unknown)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token(id,role)}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
const json=async(r:Response)=>(await r.json() as any).data;
beforeAll(()=>{
 const stamp=Date.now();
 const add=(role:string,name:string)=>Number(db.query('INSERT INTO users(name,email,password_hash,role,is_active,grade) VALUES(?,?,?, ?,1,?)').run(name,`${name}-${stamp}@workflow.test`,'unused-qa-hash',role,role==='student'?'SS 2':null).lastInsertRowid);
 admin=add('operator','Admin');teacher=add('teacher','Teacher');otherTeacher=add('teacher','Other');student=add('student','Amina');otherStudent=add('student','David');guardian=add('guardian','Guardian');
 let session=queries.getActiveAcademicSession.get() as any;
 if(!session){const id=Number(db.query("INSERT INTO academic_sessions(name,is_active,status) VALUES(?,1,'active')").run(`QA-${stamp}`).lastInsertRowid);session={id,name:`QA-${stamp}`};}sessionId=Number(session.id);
 let term=queries.getActiveAcademicTerm.get() as any;
 if(!term){const id=Number(db.query("INSERT INTO academic_terms(session_id,name,is_active,status) VALUES(?,'First Term',1,'active')").run(sessionId).lastInsertRowid);term={id,name:'First Term'};}termId=Number(term.id);
 db.query("INSERT OR IGNORE INTO terms(id,session,name,start_date,end_date,is_active) VALUES(?,?,?,'2026-01-01','2026-12-31',1)").run(termId,session.name,term.name);
 classId=Number(db.query("INSERT INTO classes(name,level,class_teacher_id) VALUES(?,'senior',?)").run(`SS 2-${stamp}`,teacher).lastInsertRowid);
 db.query('INSERT INTO class_enrollments(student_id,class_id,term_id) VALUES(?,?,?)').run(student,classId,termId);
 db.query("INSERT INTO guardian_student_links(guardian_id,student_id,relationship,status) VALUES(?,?,'Parent','approved')").run(guardian,student);
 subjectId=Number(db.query("INSERT INTO subjects(name,code,term,duration,teacher_id,total_score,class,session,exam_datetime,created_by) VALUES('Physics',?,?,60,?,50,'SS 2',?,'2027-01-10T09:00:00Z',?)").run(`PHY-${stamp}`,term.name,teacher,session.name,teacher).lastInsertRowid);
 gradingId=Number(db.query("INSERT INTO grading_subjects(name,code,class_id,term_id,session_id,teacher_id) VALUES('Physics',?,?,?,?,?)").run(`GP-${stamp}`,classId,termId,sessionId,teacher).lastInsertRowid);
 db.query("INSERT INTO grading_policies(grading_subject_id,name,type,max_marks,is_exam) VALUES(?,'Written paper','manual',50,1)").run(gradingId);
 db.query("INSERT INTO term_results(student_id,grading_subject_id,ca_score,exam_score,total_score,grade,is_approved,term_id,session_id) VALUES(?,?,10,20,30,'C',1,?,?)").run(student,gradingId,termId,sessionId);
});
test('setup reset requires authentication and non-admin roles cannot invoke it',async()=>{
 expect((await fetch(base+'/api/setup/reset-wizard',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":"RESET"}'})).status).toBe(401);
 expect((await request('/api/setup/reset-wizard',teacher,'teacher',{confirm:'RESET'})).status).toBe(403);
 expect((await json(await fetch(base+'/api/setup/status'))).setupRequired).toBe(false);
 expect((db.query('SELECT COUNT(*) n FROM users').get() as any).n).toBeGreaterThan(5);
});
test('teacher registers are class-scoped and invalid batches save no partial rows',async()=>{
 const path='/api/teacher/attendance/batch';const body={class_id:classId,date:'2026-11-10',records:[{student_id:student,status:'present'}]};
 expect((await request(path,otherTeacher,'teacher',body)).status).toBe(403);
 expect((await request(path,teacher,'teacher',{...body,records:[...body.records,{student_id:otherStudent,status:'absent'}]})).status).toBe(403);
 expect((db.query('SELECT COUNT(*) n FROM attendance_records WHERE student_id=?').get(student) as any).n).toBe(0);
 expect((await request(`/api/guardian/wards/${student}/attendance`,otherTeacher,'teacher',{date:'2026-11-10',status:'present'})).status).toBe(403);
 expect((await request(`/api/guardian/wards/${student}/attendance`,otherTeacher,'teacher')).status).toBe(403);
});
test('attendance persists and reaches the linked guardian on the authenticated event stream',async()=>{
 const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),5000);
 const response=await fetch(base+'/api/notifications/stream',{headers:{Authorization:`Bearer ${token(guardian,'guardian')}`,Cookie:`__exampool_session=${token(teacher,'teacher')}`},signal:abort.signal});
 expect(response.status).toBe(200);const reader=response.body!.getReader();await reader.read();
 const saved=await request('/api/teacher/attendance/batch',teacher,'teacher',{class_id:classId,date:'2026-11-10',records:[{student_id:student,status:'present'}]});expect(saved.status).toBe(200);
 try{let received='';while(!received.includes('"type":"attendance"')){const next=await reader.read();if(next.done)break;received+=new TextDecoder().decode(next.value);}expect(received).toContain('Daily Roll Call');expect(received).toContain('attendance');}
 finally{clearTimeout(timeout);abort.abort();await reader.cancel().catch(()=>{});}
 const notifications=await json(await request('/api/guardian/notifications',guardian,'guardian'));expect(notifications.items.some((n:any)=>n.type==='attendance')).toBe(true);
});
test('teacher PDF upload, admin review, revision conflict and attachment privacy form one complete journey',async()=>{
 const form=new FormData();form.set('file',new File(['%PDF-1.4\n%QA lesson note\n%%EOF'],'lesson.pdf',{type:'application/pdf'}));
 const upload=await fetch(base+'/api/learning/files',{method:'POST',headers:{Authorization:`Bearer ${token(teacher,'teacher')}`},body:form});expect(upload.status).toBe(201);const file=await json(upload);
 const created=await request('/api/learning/notes',teacher,'teacher',{subject_id:subjectId,title:'Reflection',body:'First draft',state:'submitted',file_ids:[file.id]});expect(created.status).toBe(200);const note=await json(created);
 const rows=await json(await request('/api/learning/notes',admin,'operator'));const version=rows.find((r:any)=>r.id===note.id).updated_at;
 expect((await request('/api/learning/notes',student,'student')).status).toBe(403);
 expect((await request(`/api/learning/files/${file.id}`,otherTeacher,'teacher')).status).toBe(403);
 expect((await request(`/api/learning/notes/${note.id}/review`,teacher,'teacher',{state:'approved',expected_updated_at:version})).status).toBe(403);
 expect((await request(`/api/learning/notes/${note.id}`,teacher,'teacher',{subject_id:subjectId,title:'Reflection',body:'Revised draft',state:'submitted',file_ids:[file.id]})).status).toBe(200);
 expect((await request(`/api/learning/notes/${note.id}/review`,admin,'operator',{state:'approved',expected_updated_at:version})).status).toBe(409);
 const current=(await json(await request('/api/learning/notes',admin,'operator'))).find((r:any)=>r.id===note.id);
 expect((await request(`/api/learning/notes/${note.id}/review`,admin,'operator',{state:'approved',expected_updated_at:current.updated_at})).status).toBe(200);
 expect((await request(`/api/learning/files/${file.id}`,student,'student')).status).toBe(403);
 expect((await request(`/api/learning/files/${file.id}`,admin,'operator')).status).toBe(200);
});
test('upload rejects a document with spoofed PDF content',async()=>{
 const form=new FormData();form.set('file',new File(['<script>not a PDF</script>'],'lesson.pdf',{type:'application/pdf'}));
 expect((await fetch(base+'/api/learning/files',{method:'POST',headers:{Authorization:`Bearer ${token(teacher,'teacher')}`},body:form})).status).toBe(400);
});
test('guardian report returns approved awarded marks, selected period and a real school identity',async()=>{
 const response=await request(`/api/guardian/wards/${student}/report-card`,guardian,'guardian');expect(response.status).toBe(200);const report=await json(response);
 expect(report.results).toHaveLength(1);expect(report.results[0]).toMatchObject({score:30,total_score:50});expect(report.term_id).toBe(termId);expect(report.school_name).not.toMatch(/exampool/i);
 expect((await request(`/api/guardian/wards/${otherStudent}/report-card`,guardian,'guardian')).status).toBe(403);
 expect((await request(`/api/guardian/wards/${student}/report-card?termId=999999&sessionId=${sessionId}`,guardian,'guardian')).status).toBe(400);
 const ward=await json(await request(`/api/guardian/wards/${student}/performance`,guardian,'guardian'));expect(ward.average_score).toBe(60);
 db.query('UPDATE term_results SET is_approved=0 WHERE grading_subject_id=?').run(gradingId);
 const hidden=await json(await request(`/api/guardian/wards/${student}/performance`,guardian,'guardian'));expect(hidden.average_score).toBeNull();expect(hidden.subjects_performance).toHaveLength(0);
});
test('result-release endpoint rejects invalid actions and past schedules',async()=>{
 expect((await request('/api/teacher/results/publish',teacher,'teacher',{subject_id:subjectId,action:'typo'})).status).toBe(400);
 expect((await request('/api/teacher/results/publish',teacher,'teacher',{subject_id:subjectId,action:'schedule',release_time:'2020-01-01'})).status).toBe(400);
 expect((await request('/api/teacher/results/publish',otherTeacher,'teacher',{subject_id:subjectId,action:'publish_now'})).status).toBe(403);
});
test('branding preserves actual institutions and replaces only old product defaults',()=>{expect(schoolDisplayName('ExamPool School')).toBe('Acqad');expect(schoolDisplayName('Grace College')).toBe('Grace College');});

test('approving a gradebook persists published results and notifies its linked guardian',async()=>{
 const before=await json(await request('/api/guardian/notifications',guardian,'guardian'));
 const approved=await request(`/api/grading/approve/${gradingId}`,admin,'operator',{});expect(approved.status).toBe(200);
 const after=await json(await request('/api/guardian/notifications',guardian,'guardian'));
 expect(after.items.filter((n:any)=>n.type==='results_published').length).toBe(before.items.filter((n:any)=>n.type==='results_published').length+1);
 expect((db.query('SELECT is_approved FROM term_results WHERE grading_subject_id=?').get(gradingId) as any).is_approved).toBe(1);
});

test('a blank tab cannot adopt a shared cookie and a rejected explicit token never falls back to another user',async()=>{
 const cookie=`__exampool_session=${token(student,'student')}`;
 const blank=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie,'X-Tab-Session':'required','X-Portal-Role':'student'}});expect(blank.status).toBe(401);
 const expired=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie,Authorization:'Bearer invalid-explicit-token','X-Tab-Session':'required'}});expect(expired.status).toBe(401);
 const explicit=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie,Authorization:`Bearer ${token(otherStudent,'student')}`,'X-Tab-Session':'required'}});expect(explicit.status).toBe(200);expect((await json(explicit)).user.id).toBe(otherStudent);
});
