import { kstDate, loadHistory, rankEntries, type RankingEntry } from './engine';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export interface RankingResult {
  date: string;
  entries: RankingEntry[];
  source: 'server' | 'local';
}

async function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

export async function fetchRankings(date: string): Promise<RankingResult> {
  try {
    const res = await withTimeout(fetch(`${BASE}/api/rankings?date=${encodeURIComponent(date)}`));
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { date: string; entries: RankingEntry[] };
    return { date: data.date, entries: data.entries, source: 'server' };
  } catch {
    const local = loadHistory().filter((e) => e.date === date);
    return { date, entries: rankEntries(local), source: 'local' };
  }
}

export async function submitEntry(e: RankingEntry): Promise<boolean> {
  try {
    const res = await withTimeout(
      fetch(`${BASE}/api/rankings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e),
      }),
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function lastDays(n = 7): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(kstDate(Date.now() - i * 86400_000));
  return out;
}
