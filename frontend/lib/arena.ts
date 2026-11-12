import { fetchWithAuth } from './api';
import type { ArenaMode, ArenaOverview, ArenaSession } from '../../shared/arena';

// LAN HTTP may not expose randomUUID; this key deduplicates retries, never grants access.
export const arenaRequestKey=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

async function request<T>(path: string, body?: unknown): Promise<T> {
  const result=await fetchWithAuth<T>(`/api/arena${path}`,body===undefined?{}:{method:'POST',body:JSON.stringify(body)},{redirectOn401:false,redirectOn503:false});
  if (!result) throw new Error('The Practice Arena is unavailable. Please try again.');
  return result;
}
export const arenaApi = {
  overview: () => request<ArenaOverview>('/overview'),
  create: (packageId: string, mode: ArenaMode, requestKey: string) => request<ArenaSession>('/sessions',{packageId,mode,requestKey}),
  join: (code: string) => request<ArenaSession>('/join',{code}),
  session: (id: string) => request<ArenaSession>(`/sessions/${id}`),
  answer: (id: string, position: number, option: number) => request<ArenaSession>(`/sessions/${id}/answer`,{position,option}),
  leave: (id: string) => request<ArenaSession>(`/sessions/${id}/leave`,{}),
  invite: (id: string) => request<{sent:boolean}>(`/sessions/${id}/invite`,{}),
  partner: (id: number, action: 'accept'|'decline'|'end') => request<{updated:boolean}>(`/partners/${id}`,{action}),
};
