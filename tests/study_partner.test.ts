import {beforeEach,afterEach,expect,test} from 'bun:test';
import {Database} from 'bun:sqlite';
import {ArenaService,ArenaError} from '../src/services/arena.service';
import {LearningCommunityService} from '../src/services/learning-community.service';
import {StudyPartnerService} from '../src/services/study-partner.service';
let db:Database,arena:ArenaService,study:StudyPartnerService,partnerId:number;
beforeEach(()=>{
  db=new Database(':memory:');
  db.run(`PRAGMA foreign_keys=ON;
    CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,role TEXT,is_active INTEGER,grade TEXT,grade_level_id INTEGER);
    INSERT INTO users VALUES(1,'Amina','student',1,'SS2',2),(2,'David','student',1,'SS2',2),(3,'Third student','student',1,'SS2',2),(4,'Teacher','teacher',1,NULL,NULL);
    CREATE TABLE subjects(id INTEGER PRIMARY KEY,name TEXT,class TEXT,grade_level_id INTEGER,term TEXT,session TEXT,teacher_id INTEGER);
    INSERT INTO subjects VALUES(1,'Physics','SS2',2,'First','2026',4),(2,'Other class','SS1',1,'First','2026',4);
    ATTACH DATABASE ':memory:' AS content_bank;
    CREATE TABLE content_bank.content_bank(id INTEGER PRIMARY KEY,exam_body TEXT,year INTEGER,subject_code TEXT,paper_type TEXT,question_text TEXT,options_json TEXT,correct_answer TEXT,solution_text TEXT,topic_tag TEXT);`);
  for(let i=1;i<=5;i++)db.query(`INSERT INTO content_bank.content_bank VALUES(?,'JAMB',2026,'PHY','objective','Question','["No","Yes"]','B',NULL,NULL)`).run(i);
  arena=new ArenaService(db);
  const learning=new LearningCommunityService(db);
  study=new StudyPartnerService(db,learning);
  db.run(`INSERT INTO learning_resources VALUES(1,4,1,'Light','First paragraph.\nSecond paragraph.','lesson','','published',1),(2,4,2,'Other class','Private','lesson','','published',1),(3,4,1,'Draft','Draft text','lesson','','draft',1);`);
  const session=arena.create(1,'JAMB_2026_PHY','duel','study_room_1');
  arena.join(2,session.roomCode!);
  for(const userId of [1,2])for(let i=0;i<5;i++)arena.answer(session.id,userId,i,1);
  arena.invite(session.id,1);
  partnerId=arena.overview(1).partners[0]!.id;
  arena.respond(partnerId,2,'accept');
});
afterEach(()=>db.close());
function denied(fn:()=>unknown,status=403){try{fn();throw new Error('Expected rejection');}catch(e){expect(e).toBeInstanceOf(ArenaError);expect((e as ArenaError).status).toBe(status);}}
const message=(extra={})=>({body:'Review this together',requestKey:'message_key_1',...extra});
test('only accepted participants can read and send private messages',()=>{
  denied(()=>study.thread(partnerId,3));denied(()=>study.send(partnerId,3,message()));denied(()=>study.thread(partnerId,4));
  study.send(partnerId,1,message());expect(study.thread(partnerId,2).messages[0]).toMatchObject({body:'Review this together',author_id:1});
  arena.respond(partnerId,1,'end');denied(()=>study.thread(partnerId,2));denied(()=>study.send(partnerId,1,message()));
});
test('notes persist with material, selected passage and PDF page anchors',()=>{
  study.send(partnerId,1,message({resourceId:1,quote:'First paragraph.',page:2}));
  expect(new StudyPartnerService(db,new LearningCommunityService(db)).thread(partnerId,2).messages[0]).toMatchObject({resource_id:1,quote:'First paragraph.',page:2});
  expect(study.thread(partnerId,1).resources.map(r=>r.id)).toEqual([1]);
});
test('rejects cross-class materials, drafts, invalid anchors and empty content',()=>{
  for(const resourceId of [2,3,999])denied(()=>study.send(partnerId,1,message({resourceId})),403);
  for(const extra of [{quote:'No material'},{page:1},{resourceId:1,page:0},{resourceId:1,page:1.5},{body:''},{body:'a'.repeat(4001)}])denied(()=>study.send(partnerId,1,message(extra)),400);
});
test('network retries are idempotent and altered retries conflict',()=>{
  study.send(partnerId,1,message());study.send(partnerId,1,message());
  expect(study.thread(partnerId,1).messages).toHaveLength(1);
  denied(()=>study.send(partnerId,1,message({body:'Different intent'})),409);
});
test('revokes access when a partner is inactive or moves school year',()=>{
  db.run('UPDATE users SET is_active=0 WHERE id=2');denied(()=>study.thread(partnerId,1));
  db.run('UPDATE users SET is_active=1,grade_level_id=1 WHERE id=2');denied(()=>study.thread(partnerId,1));
});
test('redacts anchored notes when a material is unpublished',()=>{
  study.send(partnerId,1,message({resourceId:1,quote:'First paragraph.',page:1}));
  db.run("UPDATE learning_resources SET state='draft' WHERE id=1");
  expect(study.thread(partnerId,2).messages[0]).toMatchObject({resource_id:null,quote:'',page:null,body:'This material is no longer available to both partners.'});
});
test('message history uses bounded, non-overlapping cursor pages',()=>{
  for(let i=0;i<55;i++)study.send(partnerId,1,message({requestKey:`page_message_${i}`}));
  const latest=study.thread(partnerId,2),older=study.thread(partnerId,2,latest.nextBefore!);
  expect(latest.messages).toHaveLength(50);expect(older.messages).toHaveLength(5);
  expect(older.messages[4]!.id).toBeLessThan(latest.messages[0]!.id);expect(older.nextBefore).toBeNull();
});
