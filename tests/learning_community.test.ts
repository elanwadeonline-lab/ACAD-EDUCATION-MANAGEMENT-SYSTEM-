import {afterEach,beforeEach,describe,expect,test} from 'bun:test';
import {Database} from 'bun:sqlite';
import {LearningCommunityService,LearningError,type LearningActor} from '../src/services/learning-community.service';
let db:Database,service:LearningCommunityService;
const student={userId:1,role:'student'},other={userId:2,role:'student'},teacher={userId:3,role:'teacher'},admin={userId:4,role:'operator'},secondTeacher={userId:5,role:'teacher'};
beforeEach(()=>{
 db=new Database(':memory:');
 db.run(`PRAGMA foreign_keys=ON;
 CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,role TEXT,is_active INTEGER,grade TEXT,grade_level_id INTEGER);
 INSERT INTO users VALUES(1,'Student One','student',1,'SS 2',2),(2,'Other Class','student',1,'SS 1',1),(3,'Teacher One','teacher',1,NULL,NULL),(4,'Admin','operator',1,NULL,NULL),(5,'Other Teacher','teacher',1,NULL,NULL),(6,'Inactive','student',0,'SS 2',2),(7,'Guardian','guardian',1,NULL,NULL);
 CREATE TABLE subjects(id INTEGER PRIMARY KEY,name TEXT,class TEXT,grade_level_id INTEGER,teacher_id INTEGER,term TEXT,session TEXT);
 INSERT INTO subjects VALUES(1,'Math','SS 2',2,3,'First Term','2026/2027'),(2,'Science','SS 1',1,5,'First Term','2026/2027'),(3,'Unassigned',NULL,NULL,3,'First Term','2026/2027');
 CREATE TABLE arena_sessions(room_code TEXT,host_id INTEGER,status TEXT,expires_at INTEGER);
 INSERT INTO arena_sessions VALUES('ABCDEF12',1,'waiting',200000),('EXPIRED1',1,'waiting',1),('OTHER123',2,'waiting',200000);`);
 service=new LearningCommunityService(db,()=>100000);
});
describe('Student resource library stays separate from teacher preparation notes',()=>{
 const material=(extra:any={})=>({subject_id:1,title:'Fraction practice guide',body:'Find a common denominator.',kind:'lesson',state:'published',...extra});
 test('only published materials reach the assigned class',()=>{service.saveResource(teacher,material({state:'draft'}));expect(service.resources(student)).toHaveLength(0);service.saveResource(teacher,material());expect(service.resources(student)).toHaveLength(1);expect(service.resources(other)).toHaveLength(0);expect(service.resources(secondTeacher)).toHaveLength(0);status(()=>service.resources({userId:7,role:'guardian'}),403);});
 test('progress persists per student, supports completion and reopening, and cannot cross classes',()=>{const {id}=service.saveResource(teacher,material());service.resourceProgress(student,id,{action:'open'});expect(service.resources(student)[0]).toMatchObject({opened_at:100000,completed_at:null});service.resourceProgress(student,id,{action:'complete'});service.resourceProgress(student,id,{action:'open'});expect(service.resources(student)[0].completed_at).toBe(100000);status(()=>service.resourceProgress(other,id,{action:'complete'}),404);service.resourceProgress(student,id,{action:'reopen'});expect(service.resources(student)[0].completed_at).toBeNull();});
 test('student cannot publish and video links reject executable schemes',()=>{status(()=>service.saveResource(student,material()),403);status(()=>service.saveResource(teacher,material({kind:'video',external_url:'javascript:alert(1)'})),400);status(()=>service.saveResource(teacher,material({subject_id:2})),403);service.saveResource(teacher,material({kind:'video',external_url:'https://school.example/lesson'}));expect(service.resources(student)[0].kind).toBe('video');});
 test('resource files have separate ownership and access from private teacher note files',()=>{const privateFile=service.addFile(teacher,{filename:'Private.pdf',storage_key:'private-key',mime:'application/pdf',bytes:20});const {id:noteId}=service.saveNote(teacher,noteData('submitted',{file_ids:[privateFile.id]}));service.review(admin,noteId,{state:'approved'});status(()=>service.saveResource(teacher,material({kind:'pdf',file_ids:[privateFile.id]})),403);const file=service.addResourceFile(teacher,{filename:'Student.pdf',storage_key:'public-material-key',mime:'application/pdf',bytes:20});const {id}=service.saveResource(teacher,material({kind:'pdf',file_ids:[file.id]}));expect(service.resourceFile(student,file.id).filename).toBe('Student.pdf');status(()=>service.file(student,privateFile.id),403);status(()=>service.resourceFile(other,file.id),403);service.saveResource(teacher,material({state:'draft',kind:'pdf',file_ids:[file.id]}),id);status(()=>service.resourceFile(student,file.id),403);});
});
afterEach(()=>db.close());
function status(action:()=>unknown,n:number){try{action();throw new Error('Expected rejection');}catch(e){expect(e).toBeInstanceOf(LearningError);expect((e as LearningError).status).toBe(n);}}
const question=()=>service.post(student,{kind:'question',title:'Fractions',body:'How does one half plus one third work?'});
const noteData=(state='draft',extra:any={})=>({subject_id:1,title:'Fractions',body:'Worked examples',state,...extra});
describe('School community permissions and persistence',()=>{
 test('all active students can see and reply; no private contact details are returned',()=>{const {post}=question();service.reply(other,post.id,{body:'Use a common denominator.'});expect(service.feed(other)).toHaveLength(1);const thread=service.thread(student,post.id);expect(thread.replies[0]).toMatchObject({author_name:'Other Class',body:'Use a common denominator.'});expect(thread.post).not.toHaveProperty('email');expect((service.feed(student)[0] as any).reply_count).toBe(1);});
 test('rejects inactive, guardian, and forged roles',()=>{for(const actor of [{userId:6,role:'student'},{userId:7,role:'guardian'},{userId:1,role:'operator'}])status(()=>service.feed(actor),403);});
 test('only owner and staff resolve or hide a question',()=>{const {post}=question();status(()=>service.moderate(other,post.id,{action:'resolve'}),403);service.moderate(student,post.id,{action:'resolve'});expect(service.thread(other,post.id).post.resolved).toBe(1);service.moderate(teacher,post.id,{action:'hide'});expect(service.feed(student)).toHaveLength(0);status(()=>service.reply(other,post.id,{body:'Hidden'}),404);});
 test('staff can hide a reply',()=>{const {post}=question();const reply=service.reply(other,post.id,{body:'Reply'}).replies[0] as any;status(()=>service.moderate(student,post.id,{action:'hide-reply',reply_id:reply.id}),403);service.moderate(admin,post.id,{action:'hide-reply',reply_id:reply.id});expect(service.thread(student,post.id).replies).toHaveLength(0);});
 test('accepts only the host’s waiting, unexpired challenge',()=>{const data={kind:'challenge',title:'Join me',body:'Let us practice',challenge_code:'abcdef12'};expect(service.post(student,data).post.challenge_code).toBe('ABCDEF12');for(const code of ['EXPIRED1','OTHER123','MISSING1'])status(()=>service.post(student,{...data,challenge_code:code}),400);});
 test('validates text and uses bounded cursor pagination',()=>{status(()=>service.post(student,{kind:'question',title:'',body:'Hi'}),400);for(let i=0;i<45;i++)question();expect(service.feed(student)).toHaveLength(40);expect(service.feed(student,6)).toHaveLength(5);});
 test('presence counts only recent active students',()=>{expect(service.presence(student)).toEqual({count:1});expect(service.presence(teacher)).toEqual({count:1});db.query('UPDATE learning_presence SET seen_at=1').run();expect(service.presence(other)).toEqual({count:1});});
 test('staff can lock and unlock community chat, students cannot lock or post when locked',()=>{
  expect(service.chatStatus(student).is_locked).toBe(false);
  status(()=>service.setChatLock(student,{locked:true}),403);
  service.setChatLock(admin,{locked:true,reason:'Study hours: chat paused.'});
  expect(service.chatStatus(student).is_locked).toBe(true);
  expect(service.chatStatus(student).reason).toBe('Study hours: chat paused.');
  status(()=>service.post(student,{kind:'question',title:'Test',body:'Blocked'}),423);
  const {post}=service.post(teacher,{kind:'discussion',title:'Staff announcement',body:'Quiet hours in effect.'});
  expect(post.title).toBe('Staff announcement');
  service.setChatLock(teacher,{locked:false});
  expect(service.chatStatus(student).is_locked).toBe(false);
  expect(service.post(student,{kind:'question',title:'Fractions',body:'Now open'}).post.title).toBe('Fractions');
 });
 test('students and staff can react with emoji to posts and replies',()=>{
  const {post}=question();
  const res1=service.toggleReaction(student,{post_id:post.id,emoji:'💡'});
  expect(res1.reactions[0]).toMatchObject({emoji:'💡',count:1,has_reacted:true});
  const res2=service.toggleReaction(teacher,{post_id:post.id,emoji:'💡'});
  expect(res2.reactions[0].count).toBe(2);
  const res3=service.toggleReaction(student,{post_id:post.id,emoji:'💡'});
  expect(res3.reactions[0].count).toBe(1);
  expect(res3.reactions[0].has_reacted).toBe(false);
 });
 test('staff can pin discussions and verify teacher answers',()=>{
  const q1=question().post;
  const q2=service.post(student,{kind:'discussion',title:'Important Notice',body:'Read carefully.'}).post;
  service.moderate(teacher,q2.id,{action:'pin'});
  const feed=service.feed(student);
  expect(feed[0].id).toBe(q2.id);
  expect(feed[0].pinned).toBe(1);
  const rep=service.reply(teacher,q1.id,{body:'Official Teacher Solution'}).replies[0] as any;
  expect(rep.is_staff_verified).toBe(1);
 });
});
describe('Teacher lesson notes and admin review',()=>{
 test('students cannot access notes in any state',()=>{const {id}=service.saveNote(teacher,noteData('submitted'));status(()=>service.notes(student),403);service.review(admin,id,{state:'approved'});status(()=>service.notes(student),403);expect(service.notes(teacher)[0].state).toBe('approved');expect(service.notes(secondTeacher)).toHaveLength(0);});
 test('admin returns feedback, teacher resubmits, and admin approves',()=>{const {id}=service.saveNote(teacher,noteData('submitted'));service.review(admin,id,{state:'returned',feedback:'Add an example'});expect(service.notes(teacher)[0].feedback).toBe('Add an example');status(()=>service.review(admin,id,{state:'approved'}),409);service.saveNote(teacher,noteData('submitted',{body:'New example'}),id);service.review(admin,id,{state:'approved'});expect(service.notes(teacher)[0]).toMatchObject({body:'New example',state:'approved'});});
 test('teachers cannot self approve, publish, or review; other teachers cannot edit',()=>{const {id}=service.saveNote(teacher,noteData());status(()=>service.saveNote(teacher,noteData('published')),400);status(()=>service.saveNote(teacher,noteData('approved')),400);status(()=>service.saveNote(secondTeacher,noteData('draft',{subject_id:2}),id),404);status(()=>service.review(teacher,id,{state:'approved'}),403);status(()=>service.saveNote(teacher,noteData('draft',{subject_id:2})),403);status(()=>service.saveNote(student,noteData()),403);});
 test('attachments stay private even after approval and cannot be stolen',()=>{const file=service.addFile(teacher,{filename:'Lesson.pdf',storage_key:'random',mime:'application/pdf',bytes:100});const {id}=service.saveNote(teacher,noteData('submitted',{file_ids:[file.id]}));status(()=>service.file(student,file.id),403);expect(service.file(admin,file.id).filename).toBe('Lesson.pdf');status(()=>service.saveNote(secondTeacher,noteData('draft',{subject_id:2,file_ids:[file.id]})),403);service.review(admin,id,{state:'approved'});expect(service.file(teacher,file.id).filename).toBe('Lesson.pdf');status(()=>service.file(student,file.id),403);status(()=>service.file(secondTeacher,file.id),403);status(()=>service.saveNote(teacher,noteData('draft',{file_ids:[file.id]})),403);});
 test('photo-only notes work and invalid saves leave no partial records',()=>{const file=service.addFile(teacher,{filename:'Photo.jpg',storage_key:'photo',mime:'image/jpeg',bytes:20});service.saveNote(teacher,noteData('submitted',{body:'',file_ids:[file.id]}));status(()=>service.saveNote(teacher,noteData('draft',{body:'',file_ids:[]})),400);status(()=>service.saveNote(teacher,noteData('draft',{file_ids:[999]})),403);expect(service.notes(admin)).toHaveLength(1);});
});

test('reviewing a stale lesson-note version fails and cannot approve changed contents',()=>{
 const {id}=service.saveNote(teacher,noteData('submitted'));const version=service.notes(admin).find(n=>n.id===id).updated_at;
 service.saveNote(teacher,noteData('submitted',{body:'Changed after admin opened the note'}),id);
 status(()=>service.review(admin,id,{state:'approved',expected_updated_at:version}),409);
 expect(service.notes(admin).find(n=>n.id===id).state).toBe('submitted');
 const current=service.notes(admin).find(n=>n.id===id);service.review(admin,id,{state:'approved',expected_updated_at:current.updated_at});
 expect(service.notes(teacher).find(n=>n.id===id).state).toBe('approved');
});
