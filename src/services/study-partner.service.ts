import type { Database } from 'bun:sqlite';
import { ArenaError } from './arena.service';
import { LearningCommunityService } from './learning-community.service';

/** Private, durable conversations scoped to a mutually accepted partnership. */
export class StudyPartnerService {
  constructor(private db: Database, private learning: LearningCommunityService, private now = Date.now) {
    db.run(`CREATE TABLE IF NOT EXISTS study_messages (
      id INTEGER PRIMARY KEY, partner_id INTEGER NOT NULL REFERENCES arena_partners(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL,
      resource_id INTEGER REFERENCES learning_resources(id), quote TEXT NOT NULL DEFAULT '',
      page INTEGER, request_key TEXT NOT NULL, created_at INTEGER NOT NULL,
      UNIQUE(author_id,request_key));
      CREATE INDEX IF NOT EXISTS idx_study_messages_thread ON study_messages(partner_id,id);`);
  }

  private membership(id: number, userId: number) {
    const link = this.db.query(`SELECT p.* FROM arena_partners p
      JOIN users a ON a.id=p.requester_id JOIN users b ON b.id=p.recipient_id
      WHERE p.id=? AND (p.requester_id=? OR p.recipient_id=?) AND p.status='accepted'
      AND a.is_active=1 AND b.is_active=1 AND a.role='student' AND b.role='student'
      AND ((a.grade_level_id IS NOT NULL AND b.grade_level_id IS NOT NULL AND a.grade_level_id=b.grade_level_id)
        OR ((a.grade_level_id IS NULL OR b.grade_level_id IS NULL) AND COALESCE(a.grade,'')!=''
          AND LOWER(REPLACE(a.grade,' ',''))=LOWER(REPLACE(b.grade,' ',''))))`).get(id,userId,userId) as any;
    if (!link) throw new ArenaError(403,'This private study space is available only to active, accepted study partners in the same school year.');
    return link;
  }

  private materials(link: any) {
    const peerIds = new Set(this.learning.resources({userId:link.recipient_id,role:'student'}).map(r=>r.id));
    return this.learning.resources({userId:link.requester_id,role:'student'}).filter(r=>peerIds.has(r.id)).map(r=>({...r,opened_at:null,completed_at:null}));
  }

  thread(id: number, userId: number, before = Number.MAX_SAFE_INTEGER) {
    const link=this.membership(id,userId);
    if (!Number.isSafeInteger(before) || before<1) throw new ArenaError(400,'Invalid message cursor.');
    const resources=this.materials(link);
    const allowed=new Set(resources.map(r=>r.id));
    const rows=this.db.query(`SELECT id,author_id,body,resource_id,quote,page,created_at FROM study_messages
      WHERE partner_id=? AND id<? ORDER BY id DESC LIMIT 50`).all(id,before) as any[];
    return {resources,messages:rows.reverse().map(row=>row.resource_id&&!allowed.has(row.resource_id)
      ? {...row,body:'This material is no longer available to both partners.',resource_id:null,quote:'',page:null}:row),
      nextBefore:rows.length===50?rows[0].id:null};
  }

  send(id: number,userId: number,data: any) {
    const link=this.membership(id,userId);
    const body=typeof data?.body==='string'?data.body.trim():'';
    const quote=typeof data?.quote==='string'?data.quote.trim():'';
    const requestKey=data?.requestKey;
    if (!body || body.length>4000 || quote.length>2000 || typeof requestKey!=='string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(requestKey)) throw new ArenaError(400,'Write a message up to 4,000 characters and retry with a valid request key.');
    const resourceId=data.resourceId??null, page=data.page??null;
    if (resourceId!==null && (!Number.isSafeInteger(resourceId)||!this.materials(link).some(r=>r.id===resourceId))) throw new ArenaError(403,'Choose a published material available to both partners.');
    if ((quote||page!==null)&&resourceId===null) throw new ArenaError(400,'Choose the material for this note.');
    if (page!==null&&(!Number.isInteger(page)||page<1||page>10000)) throw new ArenaError(400,'Enter a valid PDF page number.');
    const prior=this.db.query('SELECT * FROM study_messages WHERE author_id=? AND request_key=?').get(userId,requestKey) as any;
    if(prior) {
      if(prior.partner_id!==id||prior.body!==body||prior.resource_id!==resourceId||prior.quote!==quote||prior.page!==page) throw new ArenaError(409,'This request was already used for a different message.');
    } else this.db.query('INSERT INTO study_messages(partner_id,author_id,body,resource_id,quote,page,request_key,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,userId,body,resourceId,quote,page,requestKey,this.now());
    return this.thread(id,userId);
  }
}
