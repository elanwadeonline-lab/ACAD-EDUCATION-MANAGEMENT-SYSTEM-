import db from '../../db';
import path from 'node:path';
import { mkdir, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { LearningCommunityService, LearningError } from '../../src/services/learning-community.service';
import { apiSuccess, apiError, readJson, requireAuth, checkRateLimit, auditLog } from '../../server';

let service: LearningCommunityService | undefined;
const fileRoot=path.join(path.dirname(Bun.env.EXAMPOOL_DB || path.join(process.cwd(),'exampool.db')),'lesson-note-attachments');
export async function tryLearningCommunity(req: Request,method: string,pathname: string,url: URL): Promise<Response|null> {
  if (!pathname.startsWith('/api/learning/')) return null;
  const actor=requireAuth(req);
  const learning=service ||= new LearningCommunityService(db);
  try {
    const success=(data: unknown,status=200)=>apiSuccess(data,status,{'Cache-Control':'no-store'});
    if(method==='GET' && pathname==='/api/learning/chat-status') return success(learning.chatStatus(actor));
    if(method==='GET' && pathname==='/api/learning/posts') return success(learning.feed(actor,Number(url.searchParams.get('before'))||undefined));
    const post=pathname.match(/^\/api\/learning\/posts\/(\d+)(?:\/(replies|moderate))?$/);
    if(method==='GET' && post && !post[2]) return success(learning.thread(actor,Number(post[1])));
    if(method==='GET' && pathname==='/api/learning/notes') return success(learning.notes(actor));
    if(method==='GET' && pathname==='/api/learning/library') return success(learning.resources(actor));
    if(method==='GET' && pathname==='/api/learning/subjects') return success(learning.subjects(actor));
    const file=pathname.match(/^\/api\/learning\/(library\/)?files\/(\d+)$/);
    if(method==='GET' && file) {
      const record=file[1]?learning.resourceFile(actor,Number(file[2])):learning.file(actor,Number(file[2]));
      const stored=Bun.file(path.join(fileRoot,record.storage_key));
      if(!await stored.exists()) return apiError(404,'The attachment file is missing. Ask the teacher to attach it again.');
      return new Response(stored,{headers:{'Content-Type':record.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(record.filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(method==='POST') {
      checkRateLimit(`learning_write_${actor.userId}`,40,60_000);
      if(pathname==='/api/learning/chat-lock') return success(learning.setChatLock(actor,data));
      if(pathname==='/api/learning/react') return success(learning.toggleReaction(actor,data));
      if(pathname==='/api/learning/presence') return success(learning.presence(actor));
      if(pathname==='/api/learning/files'||pathname==='/api/learning/library/files') {
        const library=pathname.includes('/library/');
        if(actor.role!=='teacher'&&!(library&&actor.role==='operator')) return apiError(403,'School staff access required for uploads.');
        const form=await req.formData();
        const upload=form.get('file');
        if(!upload || typeof upload==='string' || upload.size===0 || upload.size>15*1024*1024) return apiError(400,'Choose a PDF or photo up to 15 MB.');
        const bytes=new Uint8Array(await upload.arrayBuffer());
        const mime=Buffer.from(bytes.subarray(0,5)).toString()==='%PDF-'?'application/pdf':
          bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff?'image/jpeg':
          Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':
          Buffer.from(bytes.subarray(0,4)).toString()==='RIFF'&&Buffer.from(bytes.subarray(8,12)).toString()==='WEBP'?'image/webp':null;
        if(!mime) return apiError(400,'Only valid PDF, JPEG, PNG, or WebP files are supported.');
        checkRateLimit(`lesson_upload_${actor.userId}`,12,60_000);
        const key=randomBytes(24).toString('hex');
        await mkdir(fileRoot,{recursive:true});
        const target=path.join(fileRoot,key);
        await Bun.write(target,bytes);
        try { const metadata={filename:upload.name.replace(/[\x00-\x1f]/g,'').slice(0,180)||'Learning attachment',storage_key:key,mime,bytes:upload.size};return success(library?learning.addResourceFile(actor,metadata):learning.addFile(actor,metadata),201); }
        catch(error) {await unlink(target);throw error;}
      }
      const data=await readJson(req);
      let result: unknown;
      if(pathname==='/api/learning/posts') result=learning.post(actor,data);
      else if(post?.[2]==='replies') result=learning.reply(actor,Number(post[1]),data);
      else if(post?.[2]==='moderate') result=learning.moderate(actor,Number(post[1]),data);
      else if(pathname==='/api/learning/notes') result=learning.saveNote(actor,data);
      else if(pathname==='/api/learning/library') result=learning.saveResource(actor,data);
      else if(pathname.match(/^\/api\/learning\/library\/\d+\/progress$/)) result=learning.resourceProgress(actor,Number(pathname.split('/')[4]),data);
      else if(pathname.match(/^\/api\/learning\/library\/\d+$/)) result=learning.saveResource(actor,data,Number(pathname.split('/')[4]));
      else {
        const note=pathname.match(/^\/api\/learning\/notes\/(\d+)(?:\/(review))?$/);
        if(!note) return apiError(404,'Learning action not found.');
        result=note[2]?learning.review(actor,Number(note[1]),data):learning.saveNote(actor,data,Number(note[1]));
      }
      auditLog(actor.userId,'LEARNING_UPDATE','learning',null,JSON.stringify({path:pathname}));
      return success(result);
    }
    return apiError(404,'Learning action not found.');
  } catch(error) {
    if(error instanceof LearningError) return apiError(error.status,error.message);
    throw error;
  }
}
