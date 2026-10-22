import { NAT_MAP } from './data';
import { fmtAvg } from './summary';
import type { Career } from './types';

export interface RankingEntry {
  id: string;
  date: string; // KST yyyy-mm-dd
  submittedAt: number;
  name: string;
  nationality: string;
  role: Career['role'];
  pos: string;
  mvp: number;
  peakOvr: number;
  awards: number;
  war: number;
  rings: number;
  seasons: number;
  hallOfFame: boolean;
  grade: string;
  teams: string[];
  line: string;
  rank?: number;
}

export function kstDate(ts = Date.now()): string {
  return new Date(ts + 9 * 3600_000).toISOString().slice(0, 10);
}

export function rankingEligible(c: Career): boolean {
  return !!c.retired && c.retired.majorSeasons > 0;
}

export function buildEntry(c: Career): RankingEntry | null {
  const r = c.retired;
  if (!r || r.majorSeasons === 0) return null;
  const parts: string[] = [];
  if (r.bat && r.bat.PA > 0) parts.push(`${fmtAvg(r.bat.AVG)} ${r.bat.HR}홈런 ${r.bat.H}안타`);
  if (r.pit && r.pit.outs > 0) parts.push(`${r.pit.W}승 ${r.pit.SV}세이브 ERA ${r.pit.ERA.toFixed(2)}`);
  return {
    id: c.id,
    date: kstDate(),
    submittedAt: Date.now(),
    name: c.name.slice(0, 20),
    nationality: NAT_MAP[c.nationality]?.flag ?? '',
    role: c.role,
    pos: r.primaryPos,
    mvp: r.mvp,
    peakOvr: r.peakOvr,
    awards: r.awardsCount,
    war: r.war,
    rings: r.rings,
    seasons: r.seasons,
    hallOfFame: r.hallOfFame,
    grade: r.grade,
    teams: r.teams.slice(0, 6),
    line: parts.join(' / '),
  };
}

// 정렬 기준: MVP 횟수 → 최고 오버롤 → 개인상 횟수 → 통산 WAR
export function compareEntries(a: RankingEntry, b: RankingEntry): number {
  return b.mvp - a.mvp || b.peakOvr - a.peakOvr || b.awards - a.awards || b.war - a.war;
}

export function rankEntries(list: RankingEntry[]): RankingEntry[] {
  const sorted = [...list].sort(compareEntries);
  let rank = 0;
  return sorted.map((e, i) => {
    if (i === 0 || compareEntries(sorted[i - 1], e) !== 0) rank = i + 1;
    return { ...e, rank };
  });
}

export const BEST_NINE_SLOTS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'] as const;

export function bestNine(list: RankingEntry[]): Record<string, RankingEntry | undefined> {
  const out: Record<string, RankingEntry | undefined> = {};
  for (const slot of BEST_NINE_SLOTS) {
    const cand = list.filter((e) => (slot === 'RP' ? e.pos === 'RP' || e.pos === 'CL' : e.pos === slot)).sort(compareEntries);
    out[slot] = cand[0];
  }
  return out;
}
