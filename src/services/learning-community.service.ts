import type { Database } from 'bun:sqlite';

export class LearningError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type LearningActor = { userId: number; role: string };
const text = (value: unknown, max: number, required = false) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw new LearningError(400, `Enter ${required ? 'a value of ' : ''}up to ${max} characters.`);
  }
  return value.trim();
};

export class LearningCommunityService {
  constructor(private db: Database, private now = Date.now) {
    db.run(`
      CREATE TABLE IF NOT EXISTS learning_posts (
        id INTEGER PRIMARY KEY, author_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('question','discussion','challenge')),
        challenge_code TEXT, resolved INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS learning_replies (
        id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES learning_posts(id),
        author_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS learning_presence (user_id INTEGER PRIMARY KEY REFERENCES users(id), seen_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS lesson_notes (
        id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES users(id), subject_id INTEGER NOT NULL REFERENCES subjects(id),
        title TEXT NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('draft','submitted','published','returned')),
        feedback TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lesson_note_files (
        id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES users(id), note_id INTEGER REFERENCES lesson_notes(id),
        filename TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, bytes INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_learning_posts_created ON learning_posts(hidden,created_at);
      CREATE INDEX IF NOT EXISTS idx_learning_replies_post ON learning_replies(post_id,id);
      CREATE INDEX IF NOT EXISTS idx_notes_teacher ON lesson_notes(teacher_id,state);
      CREATE TABLE IF NOT EXISTS learning_resources (
        id INTEGER PRIMARY KEY,teacher_id INTEGER NOT NULL REFERENCES users(id),subject_id INTEGER NOT NULL REFERENCES subjects(id),
        title TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('lesson','pdf','video')),
        external_url TEXT NOT NULL DEFAULT '',state TEXT NOT NULL CHECK(state IN ('draft','published')),updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS learning_resource_files (
        id INTEGER PRIMARY KEY,teacher_id INTEGER NOT NULL REFERENCES users(id),resource_id INTEGER REFERENCES learning_resources(id),
        filename TEXT NOT NULL,storage_key TEXT NOT NULL UNIQUE,mime TEXT NOT NULL,bytes INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS learning_resource_progress (
        resource_id INTEGER NOT NULL REFERENCES learning_resources(id),student_id INTEGER NOT NULL REFERENCES users(id),
        opened_at INTEGER NOT NULL,completed_at INTEGER,PRIMARY KEY(resource_id,student_id)
      );
    `);
  }
  private actor(actor: LearningActor) {
    const user = this.db.query('SELECT * FROM users WHERE id=? AND is_active=1').get(actor.userId) as any;
    if (!user || user.role !== actor.role || !['student','teacher','operator'].includes(user.role)) throw new LearningError(403,'This learning space is available to students and school staff.');
    return user;
  }
  private staff(actor: LearningActor) {
    this.actor(actor);
    if (!['teacher','operator'].includes(actor.role)) throw new LearningError(403,'School staff access required.');
  }
  feed(actor: LearningActor, before = Number.MAX_SAFE_INTEGER) {
    this.actor(actor);
    return this.db.query(`SELECT p.*,u.name AS author_name,u.role AS author_role,
      (SELECT COUNT(*) FROM learning_replies r WHERE r.post_id=p.id AND r.hidden=0) AS reply_count
      FROM learning_posts p JOIN users u ON u.id=p.author_id WHERE p.hidden=0 AND p.id<? ORDER BY p.id DESC LIMIT 40`).all(before);
  }
  thread(actor: LearningActor, id: number) {
    this.actor(actor);
    const post = this.db.query(`SELECT p.*,u.name AS author_name,u.role AS author_role FROM learning_posts p JOIN users u ON u.id=p.author_id WHERE p.id=? AND p.hidden=0`).get(id) as any;
    if (!post) throw new LearningError(404,'This discussion is no longer available.');
    const replies = this.db.query(`SELECT r.*,u.name AS author_name,u.role AS author_role FROM learning_replies r JOIN users u ON u.id=r.author_id WHERE r.post_id=? AND r.hidden=0 ORDER BY r.id LIMIT 500`).all(id);
    return {post,replies};
  }
  post(actor: LearningActor, data: any) {
    this.actor(actor);
    const title=text(data?.title,140,true), body=text(data?.body,10000,true);
    if (!['question','discussion','challenge'].includes(data?.kind)) throw new LearningError(400,'Choose a question, discussion, or challenge.');
    let code: string | null = null;
    if (data.kind==='challenge') {
      code=text(data.challenge_code,8,true).toUpperCase();
      const room=this.db.query("SELECT * FROM arena_sessions WHERE room_code=? AND host_id=? AND status='waiting' AND expires_at>?").get(code,actor.userId,this.now());
      if (!room) throw new LearningError(400,'Share a waiting challenge you created in Practice Arena.');
    }
    const result=this.db.query('INSERT INTO learning_posts(author_id,title,body,kind,challenge_code,created_at) VALUES(?,?,?,?,?,?)').run(actor.userId,title,body,data.kind,code,this.now());
    return this.thread(actor,Number(result.lastInsertRowid));
  }
  reply(actor: LearningActor,id: number,data: any) {
    this.thread(actor,id);
    const body=text(data?.body,10000,true);
    const count=this.db.query('SELECT COUNT(*) AS n FROM learning_replies WHERE post_id=? AND hidden=0').get(id) as any;
    if (count.n>=500) throw new LearningError(409,'This discussion has reached its reply limit. Start a new discussion.');
    this.db.query('INSERT INTO learning_replies(post_id,author_id,body,created_at) VALUES(?,?,?,?)').run(id,actor.userId,body,this.now());
    return this.thread(actor,id);
  }
  moderate(actor: LearningActor,id: number,data: any) {
    const {post}=this.thread(actor,id);
    if (post.author_id!==actor.userId && !['teacher','operator'].includes(actor.role)) throw new LearningError(403,'Only the author or school staff can update this discussion.');
    if (data.action==='resolve') this.db.query('UPDATE learning_posts SET resolved=? WHERE id=?').run(post.resolved?0:1,id);
    else if (data.action==='hide') this.db.query('UPDATE learning_posts SET hidden=1 WHERE id=?').run(id);
    else if (data.action==='hide-reply') {
      this.staff(actor);
      this.db.query('UPDATE learning_replies SET hidden=1 WHERE id=? AND post_id=?').run(Number(data.reply_id),id);
    } else throw new LearningError(400,'Unknown discussion action.');
    return {ok:true};
  }
  presence(actor: LearningActor) {
    this.actor(actor);
    this.db.query('INSERT INTO learning_presence(user_id,seen_at) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET seen_at=excluded.seen_at').run(actor.userId,this.now());
    return this.db.query(`SELECT COUNT(*) AS count FROM learning_presence p JOIN users u ON u.id=p.user_id WHERE p.seen_at>? AND u.is_active=1 AND u.role='student'`).get(this.now()-60000);
  }
  subjects(actor: LearningActor) {
    this.staff(actor);
    return this.db.query(`SELECT id,name,class,term,session FROM subjects WHERE ${actor.role==='operator'?'1=1':'teacher_id=?'} ORDER BY name`).all(...(actor.role==='operator'?[]:[actor.userId]));
  }
  private canReadNote(actor: LearningActor,note: any) {
    this.staff(actor);
    return actor.role==='operator' || (actor.role==='teacher' && note.teacher_id===actor.userId);
  }
  notes(actor: LearningActor) {
    this.staff(actor);
    const rows=this.db.query(`SELECT n.*,u.name AS teacher_name,s.name AS subject_name,s.class,s.grade_level_id,s.term,s.session
      FROM lesson_notes n JOIN users u ON u.id=n.teacher_id JOIN subjects s ON s.id=n.subject_id ORDER BY n.updated_at DESC`).all() as any[];
    // Preserve the original SQLite enum for installations created before the
    // teacher-only correction. Its historical "published" value means approved.
    return rows.filter(n=>this.canReadNote(actor,n)).map(n=>({...n,state:n.state==='published'?'approved':n.state,files:this.files(n.id)}));
  }
  private files(id: number) { return this.db.query('SELECT id,filename,mime,bytes FROM lesson_note_files WHERE note_id=?').all(id); }
  saveNote(actor: LearningActor,data: any,id?: number) {
    this.staff(actor);
    if (actor.role!=='teacher') throw new LearningError(403,'Only the assigned teacher can write lesson notes.');
    const title=text(data?.title,160,true), body=text(data?.body,100000);
    const subject=this.db.query('SELECT * FROM subjects WHERE id=? AND teacher_id=?').get(Number(data.subject_id),actor.userId) as any;
    if (!subject) throw new LearningError(403,'Choose one of your assigned subjects.');
    if (!['draft','submitted'].includes(data.state)) throw new LearningError(400,'Save a draft or submit the lesson note to admin for review.');
    const fileIds:number[]=Array.isArray(data.file_ids)?[...new Set<number>(data.file_ids.map((value:unknown)=>Number(value)))]:[];
    if(fileIds.some(id=>!Number.isSafeInteger(id)||id<=0)) throw new LearningError(400,'An attachment ID is invalid.');
    if (fileIds.length>6) throw new LearningError(400,'Attach up to six files.');
    if (!body && !fileIds.length) throw new LearningError(400,'Write a lesson note or attach a PDF or photo.');
    return this.db.transaction(()=>{
      if (id) {
        const existing=this.db.query('SELECT * FROM lesson_notes WHERE id=? AND teacher_id=?').get(id,actor.userId);
        if (!existing) throw new LearningError(404,'Lesson note not found.');
      }
      for (const fileId of fileIds) {
        const file=this.db.query('SELECT * FROM lesson_note_files WHERE id=? AND teacher_id=?').get(fileId,actor.userId) as any;
        if (!file || (file.note_id && file.note_id!==id)) throw new LearningError(403,'An attachment is unavailable for this note.');
      }
      let noteId=id;
      if (!noteId) noteId=Number(this.db.query('INSERT INTO lesson_notes(teacher_id,subject_id,title,body,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(actor.userId,subject.id,title,body,data.state,this.now(),this.now()).lastInsertRowid);
      else this.db.query("UPDATE lesson_notes SET subject_id=?,title=?,body=?,state=?,feedback='',updated_at=? WHERE id=?").run(subject.id,title,body,data.state,this.now(),noteId);
      this.db.query('UPDATE lesson_note_files SET note_id=NULL WHERE note_id=?').run(noteId);
      for(const fileId of fileIds) this.db.query('UPDATE lesson_note_files SET note_id=? WHERE id=?').run(noteId,fileId);
      return {id:noteId};
    })();
  }
  review(actor: LearningActor,id: number,data: any) {
    this.actor(actor);
    if (actor.role!=='operator') throw new LearningError(403,'Only admin can review lesson notes.');
    if (!['approved','returned'].includes(data?.state)) throw new LearningError(400,'Approve the note or return it for changes.');
    const feedback=text(data.feedback||'',2000,data.state==='returned');
    const note=this.db.query("SELECT n.*,s.class,s.grade_level_id FROM lesson_notes n JOIN subjects s ON s.id=n.subject_id WHERE n.id=? AND n.state='submitted'").get(id) as any;
    if (!note) throw new LearningError(409,'This note is no longer awaiting review. Refresh the list.');
    this.db.query('UPDATE lesson_notes SET state=?,feedback=?,updated_at=? WHERE id=?').run(data.state==='approved'?'published':'returned',feedback,this.now(),id);
    return {ok:true};
  }
  addFile(actor: LearningActor,file: {filename:string;storage_key:string;mime:string;bytes:number}) {
    this.staff(actor);
    if(actor.role!=='teacher') throw new LearningError(403,'Only teachers can attach lesson files.');
    const result=this.db.query('INSERT INTO lesson_note_files(teacher_id,filename,storage_key,mime,bytes) VALUES(?,?,?,?,?)').run(actor.userId,file.filename,file.storage_key,file.mime,file.bytes);
    return {id:Number(result.lastInsertRowid),filename:file.filename,mime:file.mime,bytes:file.bytes};
  }
  file(actor: LearningActor,id: number) {
    this.staff(actor);
    const file=this.db.query('SELECT * FROM lesson_note_files WHERE id=?').get(id) as any;
    if(!file) throw new LearningError(404,'Attachment not found.');
    if(file.teacher_id===actor.userId || actor.role==='operator') return file;
    const note=this.db.query('SELECT n.*,s.class,s.grade_level_id FROM lesson_notes n JOIN subjects s ON s.id=n.subject_id WHERE n.id=?').get(file.note_id) as any;
    if(!note || !this.canReadNote(actor,note)) throw new LearningError(403,'This attachment is not available to your account.');
    return file;
  }
  private canReadResource(actor:LearningActor,resource:any) {
    const user=this.actor(actor);
    if(actor.role==='operator'||(actor.role==='teacher'&&resource.teacher_id===actor.userId))return true;
    if(actor.role!=='student'||resource.state!=='published')return false;
    if(resource.grade_level_id&&user.grade_level_id)return resource.grade_level_id===user.grade_level_id;
    return !!resource.class&&!!user.grade&&resource.class.replace(/\s+/g,'').toLowerCase()===user.grade.replace(/\s+/g,'').toLowerCase();
  }
  resources(actor:LearningActor) {
    this.actor(actor);
    const rows=this.db.query(`SELECT r.*,s.name AS subject_name,s.class,s.grade_level_id,s.term,s.session,u.name AS teacher_name,
      p.opened_at,p.completed_at FROM learning_resources r JOIN subjects s ON s.id=r.subject_id
      JOIN users u ON u.id=r.teacher_id LEFT JOIN learning_resource_progress p ON p.resource_id=r.id AND p.student_id=? ORDER BY r.updated_at DESC`).all(actor.userId) as any[];
    return rows.filter(row=>this.canReadResource(actor,row)).map(row=>({...row,files:this.db.query('SELECT id,filename,mime,bytes FROM learning_resource_files WHERE resource_id=?').all(row.id)}));
  }
  saveResource(actor:LearningActor,data:any,id?:number) {
    this.staff(actor);
    const subject=this.db.query(`SELECT * FROM subjects WHERE id=? ${actor.role==='teacher'?'AND teacher_id=?':''}`).get(...(actor.role==='teacher'?[Number(data.subject_id),actor.userId]:[Number(data.subject_id)])) as any;
    if(!subject)throw new LearningError(403,'Choose an assigned subject.');
    const title=text(data.title,160,true),body=text(data.body||'',100000);
    if(!['lesson','pdf','video'].includes(data.kind)||!['draft','published'].includes(data.state))throw new LearningError(400,'Choose a resource type and draft or published status.');
    if(data.state==='published'&&!subject.class&&!subject.grade_level_id)throw new LearningError(400,'Assign a class to this subject before publishing materials.');
    const external=text(data.external_url||'',2000);
    if(external){try{const url=new URL(external);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error();}catch{throw new LearningError(400,'Enter a complete HTTP or HTTPS video link.');}}
    if(data.kind==='video'&&!external)throw new LearningError(400,'Add a video link.');
    const fileIds:number[]=Array.isArray(data.file_ids)?[...new Set<number>(data.file_ids.map((value:unknown)=>Number(value)))]:[];
    if(fileIds.length>6||fileIds.some(value=>!Number.isSafeInteger(value)||value<=0))throw new LearningError(400,'Attach up to six valid files.');
    if(data.kind==='pdf'&&!fileIds.length)throw new LearningError(400,'Attach a PDF for this resource.');
    if(data.kind==='lesson'&&!body&&!fileIds.length)throw new LearningError(400,'Write learning material or attach a file.');
    return this.db.transaction(()=>{
      if(id){const old=this.db.query('SELECT * FROM learning_resources WHERE id=?').get(id) as any;if(!old||(actor.role!=='operator'&&old.teacher_id!==actor.userId))throw new LearningError(403,'You cannot edit this material.');}
      for(const fileId of fileIds){const file=this.db.query('SELECT * FROM learning_resource_files WHERE id=?').get(fileId) as any;if(!file||file.teacher_id!==actor.userId||(file.resource_id&&file.resource_id!==id))throw new LearningError(403,'An attachment is unavailable.');if(data.kind==='pdf'&&file.mime!=='application/pdf')throw new LearningError(400,'PDF resources require PDF attachments.');}
      let resourceId=id;
      if(resourceId)this.db.query('UPDATE learning_resources SET subject_id=?,title=?,body=?,kind=?,external_url=?,state=?,updated_at=? WHERE id=?').run(subject.id,title,body,data.kind,external,data.state,this.now(),resourceId);
      else resourceId=Number(this.db.query('INSERT INTO learning_resources(teacher_id,subject_id,title,body,kind,external_url,state,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(actor.userId,subject.id,title,body,data.kind,external,data.state,this.now()).lastInsertRowid);
      this.db.query('UPDATE learning_resource_files SET resource_id=NULL WHERE resource_id=?').run(resourceId);
      for(const fileId of fileIds)this.db.query('UPDATE learning_resource_files SET resource_id=? WHERE id=?').run(resourceId,fileId);
      return {id:resourceId};
    })();
  }
  resourceProgress(actor:LearningActor,id:number,data:any) {
    this.actor(actor);
    if(actor.role!=='student')throw new LearningError(403,'Only students have learning progress.');
    const resource=this.resources(actor).find(row=>row.id===id);
    if(!resource)throw new LearningError(404,'This material is unavailable to your class.');
    if(!['open','complete','reopen'].includes(data.action))throw new LearningError(400,'Unknown progress action.');
    this.db.query('INSERT INTO learning_resource_progress(resource_id,student_id,opened_at) VALUES(?,?,?) ON CONFLICT(resource_id,student_id) DO UPDATE SET opened_at=excluded.opened_at').run(id,actor.userId,this.now());
    if(data.action!=='open')this.db.query('UPDATE learning_resource_progress SET completed_at=? WHERE resource_id=? AND student_id=?').run(data.action==='complete'?this.now():null,id,actor.userId);
    return {ok:true};
  }
  addResourceFile(actor:LearningActor,file:{filename:string;storage_key:string;mime:string;bytes:number}) {
    this.staff(actor);
    const result=this.db.query('INSERT INTO learning_resource_files(teacher_id,filename,storage_key,mime,bytes) VALUES(?,?,?,?,?)').run(actor.userId,file.filename,file.storage_key,file.mime,file.bytes);
    return {id:Number(result.lastInsertRowid),filename:file.filename,mime:file.mime,bytes:file.bytes};
  }
  resourceFile(actor:LearningActor,id:number) {
    this.actor(actor);
    const file=this.db.query('SELECT * FROM learning_resource_files WHERE id=?').get(id) as any;
    if(!file)throw new LearningError(404,'Attachment not found.');
    if(actor.role==='operator'||(actor.role==='teacher'&&file.teacher_id===actor.userId))return file;
    if(!this.resources(actor).some(resource=>resource.id===file.resource_id))throw new LearningError(403,'This material is not available to your class.');
    return file;
  }
}
