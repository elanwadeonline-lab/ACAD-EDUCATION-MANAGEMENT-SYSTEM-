export type ArenaMode = 'solo' | 'duel';
export type ArenaStatus = 'waiting' | 'active' | 'completed' | 'closed';
export type ArenaPaper = { id: string; title: string; questionCount: number };
export type ArenaQuestion = { position: number; text: string; options: string[]; topic: string | null };
export type ArenaReview = { text: string; options: string[]; selected: number; correct: number; explanation: string | null };
export type ArenaPlayer = { id: number; name: string; answered: number; finished: boolean; score: number | null };
export type ArenaSession = {
  id: string; mode: ArenaMode; status: ArenaStatus; title: string; roomCode: string | null;
  expiresAt: number; total: number; answered: number; score: number | null; xp: number;
  finished: boolean; question: ArenaQuestion | null; players: ArenaPlayer[]; review: ArenaReview[];
};
export type ArenaPartner = { id: number; name: string; goal: string; incoming: boolean; status: 'pending' | 'accepted'; };
export type ArenaOverview = {
  papers: ArenaPaper[]; xp: number; weeklyXp: number; level: number; nextLevelXp: number;
  completed: number; active: ArenaSession | null;
  recent: { id: string; title: string; mode: ArenaMode; status: ArenaStatus; score: number | null; total: number }[];
  leaderboard: { rank: number; name: string; xp: number; isSelf: boolean }[];
  partners: ArenaPartner[];
};
