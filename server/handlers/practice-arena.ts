import db from '../../db';
import { ArenaService, ArenaError } from '../../src/services/arena.service';
import { apiSuccess, apiError, readJson, requireAuth, requireRole, checkRateLimit } from '../../server';

const arena = new ArenaService(db);
const success = (data: unknown, status = 200) => apiSuccess(data,status,{'Cache-Control':'no-store'});

export async function tryPracticeArena(req: Request, method: string, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/api/arena/')) return null;
  const auth=requireAuth(req);
  requireRole(auth.role,['student']);
  try {
    if (method==='GET' && pathname==='/api/arena/overview') return success(arena.overview(auth.userId));
    const match=pathname.match(/^\/api\/arena\/sessions\/([a-f0-9]{32})(?:\/(answer|leave|invite))?$/);
    if (match && method==='GET' && !match[2]) return success(arena.view(match[1]!,auth.userId));
    if (method==='POST') {
      checkRateLimit(`arena_write_${auth.userId}`,90,60_000);
      const body=await readJson(req);
      if (pathname==='/api/arena/sessions') return success(arena.create(auth.userId,body?.packageId,body?.mode,body?.requestKey),201);
      if (pathname==='/api/arena/join') return success(arena.join(auth.userId,body?.code));
      if (match?.[2]==='answer') return success(arena.answer(match[1]!,auth.userId,body?.position,body?.option));
      if (match?.[2]==='leave') return success(arena.leave(match[1]!,auth.userId));
      if (match?.[2]==='invite') return success(arena.invite(match[1]!,auth.userId));
      const partner=pathname.match(/^\/api\/arena\/partners\/(\d+)$/);
      if (partner) return success(arena.respond(Number(partner[1]),auth.userId,body?.action));
    }
    return apiError(404,'Arena action not found.');
  } catch (error) {
    if (error instanceof ArenaError) return apiError(error.status,error.message);
    throw error;
  }
}
