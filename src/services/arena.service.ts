import type { Database } from 'bun:sqlite';
import { randomBytes, randomInt } from 'node:crypto';
import type { ArenaMode, ArenaOverview, ArenaSession, ArenaStatus } from '../../shared/arena';
import {departments,type StudyJourney} from '../../shared/study-journey';

type Student = { id: number; name: string; grade: string | null; grade_level_id: number | null };
type Item = { id: number; text: string; options: string[]; correct: number; explanation: string | null; topic: string | null };
type Session = {
  id: string; mode: ArenaMode; status: ArenaStatus; host_id: number; room_code: string | null;
  package_id: string; title: string; questions_json: string; expires_at: number;
};
type Player = { user_id: number; name: string; answers_json: string; score: number; finished_at: number | null; reward_xp: number };

export class ArenaError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const displayName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]?.[0]}.` : parts[0] || 'Learner';
};
const normalizeGrade = (grade: string | null) => (grade || '').toLowerCase().replace(/\s+/g, '');
const studyDay = (now: number) => new Date(now + 3_600_000).toISOString().slice(0, 10);
const weekStart = (now: number) => {
  const d = new Date(now + 3_600_000);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - 3_600_000;
};

/** Owns only Arena tables. Existing exams, practice logs and school grades are unchanged. */
export class ArenaService {
  constructor(private db: Database, private now: () => number = Date.now) {
    db.run(`
      CREATE TABLE IF NOT EXISTS arena_sessions (
        id TEXT PRIMARY KEY, mode TEXT NOT NULL CHECK(mode IN ('solo','duel')),
        status TEXT NOT NULL CHECK(status IN ('waiting','active','completed','closed')),
        host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        room_code TEXT UNIQUE, package_id TEXT NOT NULL, title TEXT NOT NULL,
        questions_json TEXT NOT NULL, request_key TEXT NOT NULL,
        created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
        UNIQUE(host_id, request_key)
      );
      CREATE TABLE IF NOT EXISTS arena_players (
        session_id TEXT NOT NULL REFERENCES arena_sessions(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answers_json TEXT NOT NULL DEFAULT '[]', score INTEGER NOT NULL DEFAULT 0,
        finished_at INTEGER, reward_xp INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(session_id,user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_arena_player_user ON arena_players(user_id,session_id);
      CREATE INDEX IF NOT EXISTS idx_arena_session_status ON arena_sessions(status,expires_at);
      CREATE TABLE IF NOT EXISTS arena_rewards (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL, study_day TEXT NOT NULL,
        session_id TEXT REFERENCES arena_sessions(id) ON DELETE SET NULL,
        points INTEGER NOT NULL CHECK(points=10), created_at INTEGER NOT NULL,
        PRIMARY KEY(user_id,question_id,study_day)
      );
      CREATE INDEX IF NOT EXISTS idx_arena_rewards_week ON arena_rewards(created_at,user_id);
      CREATE TABLE IF NOT EXISTS arena_partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES arena_sessions(id) ON DELETE CASCADE,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_low INTEGER NOT NULL, user_high INTEGER NOT NULL,
        goal TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined','closed')),
        created_at INTEGER NOT NULL, UNIQUE(user_low,user_high), CHECK(requester_id != recipient_id)
      );
      CREATE INDEX IF NOT EXISTS idx_arena_partners_recipient ON arena_partners(recipient_id,status);
      CREATE TABLE IF NOT EXISTS arena_journeys (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        selection_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
    `);
  }

  private student(id: number): Student {
    const student = this.db.query("SELECT id,name,grade,grade_level_id FROM users WHERE id=? AND role='student' AND is_active=1").get(id) as Student | null;
    if (!student) throw new ArenaError(403, 'The Practice Arena is available to active students.');
    return student;
  }

  private sameCohort(a: Student, b: Student) {
    if (a.grade_level_id && b.grade_level_id) return a.grade_level_id === b.grade_level_id;
    return !!normalizeGrade(a.grade) && normalizeGrade(a.grade) === normalizeGrade(b.grade);
  }

  private expire() {
    this.db.query("UPDATE arena_sessions SET status='closed' WHERE status IN ('waiting','active') AND expires_at<=?").run(this.now());
  }

  private active(userId: number): Session | null {
    return this.db.query(`SELECT s.* FROM arena_sessions s JOIN arena_players p ON p.session_id=s.id
      WHERE p.user_id=? AND s.status IN ('waiting','active') AND p.finished_at IS NULL ORDER BY s.created_at DESC LIMIT 1`).get(userId) as Session | null;
  }

  private session(id: string): Session {
    const row = this.db.query('SELECT * FROM arena_sessions WHERE id=?').get(id) as Session | null;
    if (!row) throw new ArenaError(404, 'This quest could not be found.');
    return row;
  }

  private players(id: string): Player[] {
    return this.db.query(`SELECT p.*,u.name FROM arena_players p JOIN users u ON u.id=p.user_id WHERE p.session_id=? ORDER BY p.rowid`).all(id) as Player[];
  }

  private membership(session: Session, userId: number) {
    const player = this.players(session.id).find(p => p.user_id === userId);
    if (!player) throw new ArenaError(403, 'You are not a player in this room.');
    return player;
  }

  /** Eligibility is conservative: only well-formed objective items with a usable answer key. */
  private items(packageId?: string): { id: string; title: string; item: Item }[] {
    const rows = this.db.query(`SELECT id,exam_body,year,subject_code,paper_type,question_text,options_json,correct_answer,solution_text,topic_tag
      FROM content_bank.content_bank WHERE paper_type='objective'
      AND (? IS NULL OR exam_body || '_' || year || '_' || subject_code=?)
      ORDER BY exam_body,year DESC,subject_code,id`).all(packageId ?? null,packageId ?? null) as any[];
    return rows.flatMap(row => {
      const id = `${row.exam_body}_${row.year}_${row.subject_code}`;
      if (packageId && id !== packageId) return [];
      let options: unknown;
      try { options = JSON.parse(row.options_json); } catch { return []; }
      if (!Array.isArray(options) || options.length < 2 || options.length > 8 || options.some(o => typeof o !== 'string' || !o.trim())) return [];
      const answer = String(row.correct_answer ?? '').trim();
      const correct = /^[A-H]$/i.test(answer) ? answer.toUpperCase().charCodeAt(0) - 65 : /^\d+$/.test(answer) ? Number(answer) : -1;
      if (!String(row.question_text || '').trim() || correct < 0 || correct >= options.length) return [];
      return [{ id, title: `${row.exam_body} ${row.year} · ${row.subject_code}`, item: {
        id: Number(row.id), text: row.question_text, options: options as string[], correct,
        explanation: row.solution_text || null, topic: row.topic_tag || null,
      } }];
    });
  }

  overview(userId: number): ArenaOverview {
    const me = this.student(userId);
    this.expire();
    // Count eligible papers in SQLite; do not hydrate every question and answer key for a menu.
    const catalog=this.db.query(`WITH parsed AS (
      SELECT exam_body,year,subject_code,question_text,
        CASE WHEN json_valid(options_json) THEN CASE WHEN json_type(options_json)='array' THEN options_json ELSE '[]' END ELSE '[]' END AS opts,
        TRIM(COALESCE(correct_answer,'')) AS answer
      FROM content_bank.content_bank WHERE paper_type='objective'
    ), keyed AS (SELECT *, CASE
      WHEN LENGTH(answer)=1 AND UPPER(answer) BETWEEN 'A' AND 'H' THEN UNICODE(UPPER(answer))-65
      WHEN LENGTH(answer)>0 AND answer NOT GLOB '*[^0-9]*' THEN CAST(answer AS INTEGER)
      ELSE -1 END AS correct FROM parsed)
    SELECT exam_body || '_' || year || '_' || subject_code AS id,
      exam_body || ' ' || year || ' · ' || subject_code AS title,COUNT(*) AS questionCount
    FROM keyed WHERE LENGTH(TRIM(COALESCE(question_text,''), ' ' || CHAR(9) || CHAR(10) || CHAR(13)))>0
      AND json_array_length(opts) BETWEEN 2 AND 8 AND correct>=0 AND correct<json_array_length(opts)
      AND NOT EXISTS(SELECT 1 FROM json_each(opts) o WHERE o.type!='text' OR LENGTH(TRIM(o.value, ' ' || CHAR(9) || CHAR(10) || CHAR(13)))=0)
    GROUP BY exam_body,year,subject_code HAVING COUNT(*)>=5 ORDER BY exam_body,year DESC,subject_code`).all() as {id:string;title:string;questionCount:number}[];
    const xp = Number((this.db.query('SELECT COALESCE(SUM(points),0) AS xp FROM arena_rewards WHERE user_id=?').get(userId) as any).xp);
    const week = weekStart(this.now());
    const weeklyXp = Number((this.db.query('SELECT COALESCE(SUM(points),0) AS xp FROM arena_rewards WHERE user_id=? AND created_at>=?').get(userId, week) as any).xp);
    const students = this.db.query(`SELECT u.id,u.name,u.grade,u.grade_level_id,COALESCE(SUM(r.points),0) AS xp
      FROM users u LEFT JOIN arena_rewards r ON r.user_id=u.id AND r.created_at>=?
      WHERE u.role='student' AND u.is_active=1 GROUP BY u.id HAVING xp>0 ORDER BY xp DESC,u.id ASC`).all(week) as (Student & { xp: number })[];
    const ranked = students.filter(s => s.id === userId || this.sameCohort(me, s));
    const ownIndex = ranked.findIndex(s => s.id === userId);
    const board = ranked.slice(0, 5);
    if (ownIndex >= 5 && ranked[ownIndex]) board.push(ranked[ownIndex]!);
    const active = this.active(userId);
    const pending = active || this.db.query(`SELECT s.* FROM arena_sessions s JOIN arena_players p ON p.session_id=s.id
      WHERE p.user_id=? AND s.status='active' ORDER BY s.created_at DESC LIMIT 1`).get(userId) as Session | null;
    const partners = this.db.query(`SELECT p.*,u.name FROM arena_partners p JOIN users u ON u.id=CASE WHEN p.requester_id=? THEN p.recipient_id ELSE p.requester_id END
      WHERE (p.requester_id=? OR p.recipient_id=?) AND p.status IN ('pending','accepted') AND u.is_active=1 ORDER BY p.created_at DESC LIMIT 30`).all(userId,userId,userId) as any[];
    return {
      papers: catalog, xp, weeklyXp,
      level: Math.floor(xp / 100) + 1, nextLevelXp: (Math.floor(xp / 100) + 1) * 100,
      completed: Number((this.db.query('SELECT COUNT(*) AS n FROM arena_players WHERE user_id=? AND finished_at IS NOT NULL').get(userId) as any).n),
      active: pending ? this.view(pending.id,userId) : null,
      recent: (this.db.query(`SELECT s.*,p.score FROM arena_sessions s JOIN arena_players p ON p.session_id=s.id
        WHERE p.user_id=? ORDER BY s.created_at DESC LIMIT 5`).all(userId) as (Session & {score:number})[]).map(s=>({id:s.id,title:s.title,mode:s.mode,status:s.status,score:s.status==='completed'?s.score:null,total:(JSON.parse(s.questions_json) as Item[]).length})),
      leaderboard: board.map(s => ({ rank: ranked.indexOf(s) + 1, name: displayName(s.name), xp: Number(s.xp), isSelf: s.id === userId })),
      partners: partners.map(p => ({ id: p.id, name: displayName(p.name), goal: p.goal, incoming: p.recipient_id === userId, status: p.status })),
    };
  }

  journey(userId:number):StudyJourney|null {
    this.student(userId);
    const row=this.db.query('SELECT selection_json FROM arena_journeys WHERE user_id=?').get(userId) as any;
    return row?JSON.parse(row.selection_json):null;
  }

  saveJourney(userId:number,data:any):StudyJourney {
    this.student(userId);
    if(!data || !Object.hasOwn(departments,data.department) || typeof data.examBody!=='string' || data.examBody.length>40 || !Array.isArray(data.subjects)) throw new ArenaError(400,'Choose an exam body and department.');
    const allowed=departments[data.department as keyof typeof departments] as readonly string[];
    const subjects=data.subjects;
    if(subjects.some((s:unknown)=>typeof s!=='string'||!allowed.includes(s)) || new Set(subjects).size!==subjects.length || (data.examBody==='JAMB'?(subjects.length!==4||!subjects.includes('ENG')):subjects.length!==0)) throw new ArenaError(400,'For JAMB, choose Use of English and three distinct department subjects. Other exam bodies use your department.');
    const published=this.overview(userId).papers;
    if(!published.some(p=>p.id.startsWith(`${data.examBody}_`))) throw new ArenaError(400,'This examination body has no eligible published papers.');
    const selection={examBody:data.examBody,department:data.department,subjects} as StudyJourney;
    this.db.query('INSERT INTO arena_journeys(user_id,selection_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET selection_json=excluded.selection_json,updated_at=excluded.updated_at').run(userId,JSON.stringify(selection),this.now());
    return selection;
  }

  createJourney(userId:number,requestKey:string):ArenaSession {
    const selection=this.journey(userId);
    if(!selection)throw new ArenaError(400,'Choose your study journey first.');
    const papers=this.overview(userId).papers;
    const subjects=selection.examBody==='JAMB'?selection.subjects:departments[selection.department];
    const selected=subjects.map(subject=>papers.find(p=>p.id.startsWith(`${selection.examBody}_`)&&p.id.endsWith(`_${subject}`))).filter(Boolean);
    if(selection.examBody==='JAMB'&&selected.length!==4)throw new ArenaError(400,'Your four subjects need published papers with at least five valid questions each.');
    if(!selected.length)throw new ArenaError(400,'No eligible papers are available for this department yet.');
    return this.create(userId,`journey:${selected.map(p=>p!.id).join('|')}`,'solo',requestKey,selected.map(p=>p!.id));
  }

  create(userId: number, packageId: string, mode: ArenaMode, requestKey: string, journeyPapers?:string[]): ArenaSession {
    this.student(userId); this.expire();
    if (!['solo','duel'].includes(mode) || typeof packageId !== 'string' || !packageId || packageId.length > (journeyPapers?2000:128) || typeof requestKey !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(requestKey)) throw new ArenaError(400,'Choose a paper and a valid quest mode.');
    const previous = this.db.query('SELECT * FROM arena_sessions WHERE host_id=? AND request_key=?').get(userId,requestKey) as Session | null;
    if (previous) {
      if (previous.package_id !== packageId || previous.mode !== mode) throw new ArenaError(409,'This request was already used for a different quest.');
      return this.view(previous.id,userId);
    }
    const entries = journeyPapers?journeyPapers.flatMap(id=>{
      const items=this.items(id);
      if(items.length<5)throw new ArenaError(400,'A selected subject no longer has enough published questions.');
      for(let i=items.length-1;i>0;i--){const j=randomInt(i+1);[items[i],items[j]]=[items[j]!,items[i]!];}
      return items.slice(0,5).map(entry=>({...entry,item:{...entry.item,topic:`${entry.title}${entry.item.topic?` · ${entry.item.topic}`:''}`}}));
    }):this.items(packageId);
    if (entries.length < 5) throw new ArenaError(400,'This paper needs at least five valid multiple-choice questions. Ask your teacher to check the paper.');
    // Shuffle on the server once, then preserve the same immutable set for both players.
    for (let i=entries.length-1;i>0;i--) { const j=randomInt(i+1); [entries[i],entries[j]]=[entries[j]!,entries[i]!]; }
    const id = randomBytes(16).toString('hex');
    let code: string | null = null;
    if (mode === 'duel') {
      do { code = randomBytes(4).toString('hex').toUpperCase(); } while (this.db.query('SELECT 1 FROM arena_sessions WHERE room_code=?').get(code));
    }
    this.db.transaction(() => {
      if (this.active(userId)) throw new ArenaError(409,'Finish or leave your current quest before starting another.');
      this.db.query(`INSERT INTO arena_sessions(id,mode,status,host_id,room_code,package_id,title,questions_json,request_key,created_at,expires_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,mode,mode==='solo'?'active':'waiting',userId,code,packageId,journeyPapers?`${this.journey(userId)!.examBody} · ${this.journey(userId)!.department} journey`:entries[0]!.title,JSON.stringify(entries.slice(0,journeyPapers?entries.length:5).map(e=>e.item)),requestKey,this.now(),this.now()+86_400_000);
      this.db.query('INSERT INTO arena_players(session_id,user_id) VALUES(?,?)').run(id,userId);
    })();
    return this.view(id,userId);
  }

  join(userId: number, code: string): ArenaSession {
    const me = this.student(userId); this.expire();
    if (typeof code !== 'string' || !/^[A-F0-9]{8}$/i.test(code)) throw new ArenaError(400,'Enter the eight-character room code.');
    const row = this.db.query('SELECT * FROM arena_sessions WHERE room_code=?').get(code.toUpperCase()) as Session | null;
    if (!row) throw new ArenaError(404,'Room not found. Check the code with your classmate.');
    this.db.transaction(() => {
      const session = this.session(row.id);
      if (this.players(row.id).some(p=>p.user_id===userId)) return;
      if (session.status !== 'waiting') throw new ArenaError(409,'This room is full, finished or expired.');
      if (!this.sameCohort(me,this.student(session.host_id))) throw new ArenaError(403,'Challenge rooms are for students in the same school year.');
      if (this.active(userId)) throw new ArenaError(409,'Finish or leave your current quest before joining.');
      this.db.query('INSERT INTO arena_players(session_id,user_id) VALUES(?,?)').run(row.id,userId);
      this.db.query("UPDATE arena_sessions SET status='active' WHERE id=?").run(row.id);
    })();
    return this.view(row.id,userId);
  }

  view(id: string, userId: number): ArenaSession {
    this.student(userId); this.expire();
    const session = this.session(id), mine = this.membership(session,userId);
    const items = JSON.parse(session.questions_json) as Item[], answers = JSON.parse(mine.answers_json) as number[];
    const finished = mine.finished_at !== null, settled = session.status === 'completed';
    const current = session.status === 'active' && !finished ? items[answers.length] : null;
    return {
      id,mode:session.mode,status:session.status,title:session.title,roomCode:session.room_code,expiresAt:session.expires_at,
      total:items.length,answered:answers.length,finished,score:settled?mine.score:null,xp:mine.reward_xp,
      question: current ? { position:answers.length,text:current.text,options:current.options,topic:current.topic } : null,
      players:this.players(id).map(p=>({id:p.user_id,name:displayName(p.name),answered:(JSON.parse(p.answers_json) as number[]).length,finished:p.finished_at!==null,score:settled?p.score:null})),
      review:settled?items.map((q,i)=>({text:q.text,options:q.options,selected:answers[i]!,correct:q.correct,explanation:q.explanation})):[],
    };
  }

  answer(id: string, userId: number, position: number, option: number): ArenaSession {
    this.student(userId); this.expire();
    this.db.transaction(() => {
      const session=this.session(id), mine=this.membership(session,userId);
      const items=JSON.parse(session.questions_json) as Item[], answers=JSON.parse(mine.answers_json) as number[];
      if (!Number.isInteger(position) || !Number.isInteger(option) || position<0 || position>=items.length || option<0 || option>=items[position]!.options.length) throw new ArenaError(400,'Choose one of the answers shown.');
      if (position<answers.length) {
        if (answers[position]!==option) throw new ArenaError(409,'That answer is already locked.');
        return; // Identical network retry is safe, including after match settlement.
      }
      if (session.status!=='active' || mine.finished_at!==null) throw new ArenaError(409,'This quest is not accepting answers.');
      if (position!==answers.length) throw new ArenaError(409,'Refresh the quest to answer the current question.');
      answers.push(option);
      const score=answers.reduce((sum,chosen,i)=>sum+(chosen===items[i]!.correct?1:0),0);
      const finished=answers.length===items.length;
      this.db.query('UPDATE arena_players SET answers_json=?,score=?,finished_at=? WHERE session_id=? AND user_id=?').run(JSON.stringify(answers),score,finished?this.now():null,id,userId);
      const players=this.players(id);
      if (players.every(p=>p.finished_at!==null)) {
        this.db.query("UPDATE arena_sessions SET status='completed' WHERE id=?").run(id);
        for (const player of players) {
          const choices=JSON.parse(player.answers_json) as number[];
          let earned=0;
          items.forEach((q,i)=>{
            if (choices[i]!==q.correct) return;
            const result=this.db.query('INSERT OR IGNORE INTO arena_rewards(user_id,question_id,study_day,session_id,points,created_at) VALUES(?,?,?,?,10,?)').run(player.user_id,q.id,studyDay(this.now()),id,this.now());
            earned+=Number(result.changes)*10;
          });
          this.db.query('UPDATE arena_players SET reward_xp=? WHERE session_id=? AND user_id=?').run(earned,id,player.user_id);
        }
      }
    })();
    return this.view(id,userId);
  }

  leave(id: string,userId: number): ArenaSession {
    this.student(userId); this.expire();
    const session=this.session(id); this.membership(session,userId);
    if (session.status==='waiting' || session.status==='active') this.db.query("UPDATE arena_sessions SET status='closed' WHERE id=?").run(id);
    return this.view(id,userId);
  }

  invite(id: string,userId: number) {
    const me=this.student(userId),session=this.session(id); this.membership(session,userId);
    if (session.mode!=='duel' || session.status!=='completed') throw new ArenaError(409,'Finish a two-player challenge before inviting a study partner.');
    const peer=this.players(id).find(p=>p.user_id!==userId);
    if (!peer || !this.sameCohort(me,this.student(peer.user_id))) throw new ArenaError(403,'This study partner is no longer available.');
    const low=Math.min(userId,peer.user_id),high=Math.max(userId,peer.user_id);
    const prior=this.db.query('SELECT * FROM arena_partners WHERE user_low=? AND user_high=?').get(low,high) as any;
    if (prior && ['pending','accepted'].includes(prior.status)) return {sent:true};
    if (prior) throw new ArenaError(409,'This study invitation was declined or ended. Choose another classmate.');
    this.db.query(`INSERT INTO arena_partners(session_id,requester_id,recipient_id,user_low,user_high,goal,status,created_at)
      VALUES(?,?,?,?,?,?,'pending',?)`).run(id,userId,peer.user_id,low,high,`Review ${session.title} together`,this.now());
    return {sent:true};
  }

  respond(partnerId: number,userId: number,action: string) {
    this.student(userId);
    const link=this.db.query('SELECT * FROM arena_partners WHERE id=? AND (requester_id=? OR recipient_id=?)').get(partnerId,userId,userId) as any;
    if (!link) throw new ArenaError(404,'Study invitation not found.');
    if (!['accept','decline','end'].includes(action)) throw new ArenaError(400,'Choose accept, decline or end.');
    if (action==='accept' || action==='decline') {
      if (link.recipient_id!==userId || link.status!=='pending') throw new ArenaError(403,'Only the invited student can respond to a pending invitation.');
      if (action==='accept' && !this.sameCohort(this.student(link.requester_id),this.student(link.recipient_id))) throw new ArenaError(403,'This study partner is no longer in your school year.');
    }
    const status=action==='accept'?'accepted':action==='decline'?'declined':'closed';
    this.db.query('UPDATE arena_partners SET status=? WHERE id=?').run(status,partnerId);
    return {updated:true};
  }
}
