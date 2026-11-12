import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { ArenaService, ArenaError } from '../src/services/arena.service';

let db: Database;
let arena: ArenaService;
let now: number;
const paper='JAMB_2026_MTH';
const key=(n:number)=>`arena_request_${n}`;
beforeEach(()=>{
  now=Date.parse('2026-11-04T12:00:00Z');
  db=new Database(':memory:');
  db.run(`PRAGMA foreign_keys=ON;
    CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,role TEXT,is_active INTEGER,grade TEXT,grade_level_id INTEGER);
    INSERT INTO users VALUES(1,'Amina Yusuf','student',1,'SS 2',2),(2,'David Cole','student',1,'SS 2',2),(3,'Other Year','student',1,'SS 1',1),(4,'Teacher User','teacher',1,NULL,NULL),(5,'Classmate Three','student',1,'SS 2',2);
    ATTACH DATABASE ':memory:' AS content_bank;
    CREATE TABLE content_bank.content_bank(id INTEGER PRIMARY KEY,exam_body TEXT,year INTEGER,subject_code TEXT,paper_type TEXT,question_text TEXT,options_json TEXT,correct_answer TEXT,solution_text TEXT,topic_tag TEXT);`);
  const insert=db.query("INSERT INTO content_bank.content_bank VALUES(?,'JAMB',2026,'MTH','objective',?,'[\"Incorrect\",\"Correct\"]','B','Explanation','Algebra')");
  for(let i=1;i<=5;i++)insert.run(i,`Question ${i}`);
  arena=new ArenaService(db,()=>now);
});
afterEach(()=>db.close());

function finish(id:string,user:number,option=1){
  let session=arena.view(id,user);
  while(session.question)session=arena.answer(id,user,session.question.position,option);
  return session;
}
function status(task:()=>unknown,expected:number){
  try{task();throw new Error('Expected ArenaError');}catch(e){expect(e).toBeInstanceOf(ArenaError);expect((e as ArenaError).status).toBe(expected);}
}

describe('Persistent department study journeys',()=>{
  function publishCombination(){
    for(const [index,subject] of ['ENG','PHY','CHM'].entries())for(let i=1;i<=5;i++)db.query(`INSERT INTO content_bank.content_bank VALUES(?,'JAMB',2026,?,'objective','Question','["Incorrect","Correct"]','B',NULL,NULL)`).run(100+index*10+i,subject);
  }
  test('JAMB requires four distinct subjects including English and preserves each account',()=>{
    publishCombination();
    const selection={examBody:'JAMB',department:'science',subjects:['ENG','MTH','PHY','CHM']};
    expect(arena.saveJourney(1,selection)).toEqual(selection);
    expect(new ArenaService(db).journey(1)).toEqual(selection);expect(arena.journey(2)).toBeNull();
    for(const subjects of [['MTH','PHY','CHM','BIO'],['ENG','MTH'],['ENG','MTH','MTH','PHY'],['ENG','COM','PHY','CHM']])status(()=>arena.saveJourney(1,{...selection,subjects}),400);
  });
  test('solo journey draws five questions per selected subject and resumes safely',()=>{
    publishCombination();arena.saveJourney(1,{examBody:'JAMB',department:'science',subjects:['ENG','MTH','PHY','CHM']});
    const quest=arena.createJourney(1,key(50));expect(quest.total).toBe(20);
    expect(arena.createJourney(1,key(50)).id).toBe(quest.id);
    const complete=finish(quest.id,1);expect(complete.score).toBe(20);expect(complete.xp).toBe(200);
  });
  test('missing subject uploads block a full combination',()=>{
    arena.saveJourney(1,{examBody:'JAMB',department:'science',subjects:['ENG','MTH','PHY','CHM']});
    status(()=>arena.createJourney(1,key(51)),400);
  });
  test('WAEC uses department without imposing JAMB four-subject requirements',()=>{
    db.run("UPDATE content_bank.content_bank SET exam_body='WAEC'");
    arena.saveJourney(1,{examBody:'WAEC',department:'commercial',subjects:[]});
    expect(arena.createJourney(1,key(52)).total).toBe(5);
  });
});

describe('Practice Arena persistence, privacy and reward integrity',()=>{
  test('overview uses real eligible papers and does not invent players',()=>{
    const overview=arena.overview(1);
    expect(overview.papers).toEqual([{id:paper,title:'JAMB 2026 · MTH',questionCount:5}]);
    expect(overview.leaderboard).toEqual([]);expect(overview.partners).toEqual([]);expect(overview.xp).toBe(0);
  });
  test('solo exposes only the current question and hides the key until completion',()=>{
    const session=arena.create(1,paper,'solo',key(1));
    expect(session.total).toBe(5);expect(session.question?.options).toHaveLength(2);
    expect(session.question).not.toHaveProperty('correct');expect(session.review).toEqual([]);expect(session.score).toBeNull();
    const complete=finish(session.id,1);
    expect(complete.status).toBe('completed');expect(complete.score).toBe(5);expect(complete.xp).toBe(50);expect(complete.review).toHaveLength(5);
    expect(arena.overview(1).weeklyXp).toBe(50);
  });
  test('identical creation retries resume one quest and conflict on different intent',()=>{
    const first=arena.create(1,paper,'solo',key(1));
    expect(arena.create(1,paper,'solo',key(1)).id).toBe(first.id);
    status(()=>arena.create(1,paper,'duel',key(1)),409);
    expect((db.query('SELECT COUNT(*) AS n FROM arena_sessions').get() as any).n).toBe(1);
  });
  test('saved answers are immutable and retrying final answer cannot duplicate rewards',()=>{
    const session=arena.create(1,paper,'solo',key(1));
    arena.answer(session.id,1,0,1);
    expect(arena.answer(session.id,1,0,1).answered).toBe(1);
    status(()=>arena.answer(session.id,1,0,0),409);
    finish(session.id,1);arena.answer(session.id,1,4,1);
    expect(arena.overview(1).xp).toBe(50);
  });
  test('rejects fabricated scores, out-of-order positions and invalid options',()=>{
    const session=arena.create(1,paper,'solo',key(1));
    status(()=>arena.answer(session.id,1,3,1),409);
    status(()=>arena.answer(session.id,1,0,5000),400);
    status(()=>arena.answer(session.id,1,0,NaN),400);
    expect(arena.view(session.id,1).answered).toBe(0);
  });
  test('another student cannot read, answer, leave or invite from a private quest',()=>{
    const session=arena.create(1,paper,'solo',key(1));
    status(()=>arena.view(session.id,2),403);status(()=>arena.answer(session.id,2,0,1),403);
    status(()=>arena.leave(session.id,2),403);status(()=>arena.invite(session.id,2),403);
    status(()=>arena.overview(4),403);
  });
  test('closed and expired quests cannot grant XP and release the active slot',()=>{
    const session=arena.create(1,paper,'solo',key(1));
    arena.answer(session.id,1,0,1);arena.leave(session.id,1);
    status(()=>arena.answer(session.id,1,1,1),409);expect(arena.overview(1).xp).toBe(0);
    const next=arena.create(1,paper,'solo',key(2));now+=86_400_001;
    expect(arena.view(next.id,1).status).toBe('closed');expect(arena.overview(1).active).toBeNull();
  });
  test('same-day repeated correct questions do not farm XP; a new study day can reward retrieval',()=>{
    finish(arena.create(1,paper,'solo',key(1)).id,1);
    const repeat=finish(arena.create(1,paper,'solo',key(2)).id,1);
    expect(repeat.score).toBe(5);expect(repeat.xp).toBe(0);expect(arena.overview(1).xp).toBe(50);
    now+=86_400_000;
    expect(finish(arena.create(1,paper,'solo',key(3)).id,1).xp).toBe(50);
  });
  test('wrong answers receive explanations but no correctness reward',()=>{
    const complete=finish(arena.create(1,paper,'solo',key(1)).id,1,0);
    expect(complete.score).toBe(0);expect(complete.xp).toBe(0);
    expect(complete.review[0]).toMatchObject({selected:0,correct:1,explanation:'Explanation'});
  });
  test('quest snapshots survive source edits and service recreation',()=>{
    const session=arena.create(1,paper,'solo',key(1));arena.answer(session.id,1,0,1);
    db.query("UPDATE content_bank.content_bank SET correct_answer='A',question_text='Edited'").run();
    arena=new ArenaService(db,()=>now);
    expect(arena.overview(1).active?.answered).toBe(1);
    const complete=finish(session.id,1);expect(complete.score).toBe(5);expect(complete.review[0]?.text).not.toBe('Edited');
  });
  test('malformed/unkeyed/non-objective questions cannot start a quest',()=>{
    db.query("UPDATE content_bank.content_bank SET correct_answer='Z' WHERE id=1").run();
    expect(arena.overview(1).papers).toEqual([]);status(()=>arena.create(1,paper,'solo',key(1)),400);
  });
  test('a player cannot open multiple unfinished quests',()=>{
    arena.create(1,paper,'solo',key(1));status(()=>arena.create(1,paper,'duel',key(2)),409);
  });
  test('weekly leaderboard scopes cohorts and resets without deleting lifetime XP',()=>{
    finish(arena.create(3,paper,'solo',key(1)).id,3);
    finish(arena.create(1,paper,'solo',key(2)).id,1);
    expect(arena.overview(1).leaderboard.map(p=>p.name)).toEqual(['Amina Y.']);
    now+=7*86_400_000;
    expect(arena.overview(1).leaderboard).toEqual([]);expect(arena.overview(1).xp).toBe(50);
  });
});

describe('Two-player rooms and mutual study partnerships',()=>{
  test('room is private, same-cohort, capped at two, and joining twice is safe',()=>{
    const room=arena.create(1,paper,'duel',key(1));
    expect(room.status).toBe('waiting');expect(room.question).toBeNull();
    status(()=>arena.join(3,room.roomCode!),403);
    const joined=arena.join(2,room.roomCode!);expect(joined.players).toHaveLength(2);
    expect(arena.join(2,room.roomCode!).id).toBe(room.id);status(()=>arena.join(5,room.roomCode!),409);
    expect(arena.view(room.id,1).question).toEqual(joined.question);
  });
  test('answers, scores and XP stay sealed until both players finish',()=>{
    const room=arena.create(1,paper,'duel',key(1));arena.join(2,room.roomCode!);
    const first=finish(room.id,1);expect(first.finished).toBe(true);expect(first.review).toEqual([]);expect(first.score).toBeNull();expect(first.xp).toBe(0);
    expect(arena.view(room.id,2).players.every(p=>p.score===null)).toBe(true);
    const second=finish(room.id,2,0);expect(second.status).toBe('completed');expect(second.score).toBe(0);
    expect(arena.view(room.id,1)).toMatchObject({score:5,xp:50,status:'completed'});
    expect(arena.overview(1).recent[0]?.score).toBe(5);
  });
  test('leaving a room closes it for both players without giving completion rewards',()=>{
    const room=arena.create(1,paper,'duel',key(1));arena.join(2,room.roomCode!);finish(room.id,1);
    arena.leave(room.id,2);expect(arena.view(room.id,1).status).toBe('closed');expect(arena.overview(1).xp).toBe(0);
  });
  test('partner request needs a shared completed match and recipient consent',()=>{
    const room=arena.create(1,paper,'duel',key(1));arena.join(2,room.roomCode!);
    status(()=>arena.invite(room.id,1),409);finish(room.id,1);finish(room.id,2);
    arena.invite(room.id,1);arena.invite(room.id,1);
    expect(arena.overview(1).partners).toHaveLength(1);
    const invitation=arena.overview(2).partners[0]!;expect(invitation.incoming).toBe(true);
    status(()=>arena.respond(invitation.id,1,'accept'),403);status(()=>arena.respond(invitation.id,3,'accept'),404);
    arena.respond(invitation.id,2,'accept');expect(arena.overview(1).partners[0]?.status).toBe('accepted');
    arena.respond(invitation.id,1,'end');expect(arena.overview(2).partners).toEqual([]);
    status(()=>arena.invite(room.id,2),409);
  });
  test('declined invitations cannot be repeatedly resent',()=>{
    const room=arena.create(1,paper,'duel',key(1));arena.join(2,room.roomCode!);finish(room.id,1);finish(room.id,2);arena.invite(room.id,1);
    arena.respond(arena.overview(2).partners[0]!.id,2,'decline');status(()=>arena.invite(room.id,1),409);
  });
});
