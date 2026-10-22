import { kstDate, loadHistory, rankEntries, type RankingEntry } from './engine';
import { capability, type Db } from './platform';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export interface RankingResult {
  date: string;
  entries: RankingEntry[];
  source: 'shared' | 'server' | 'local';
}

async function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

const entriesPath = (date: string) => `rankings/${date}/entries`;

function toEntries(docs: { data(): Record<string, unknown> | undefined }[]): RankingEntry[] {
  return docs.map((d) => d.data() as unknown as RankingEntry).filter((e) => e && typeof e.name === 'string' && typeof e.mvp === 'number');
}

function localResult(date: string): RankingResult {
  return { date, entries: rankEntries(loadHistory().filter((e) => e.date === date)), source: 'local' };
}

// 랭킹 구독: 아티팩트 공유 저장소 → 랭킹 서버 → 이 기기 기록 순으로 시도한다.
export function watchRankings(date: string, onData: (r: RankingResult) => void): () => void {
  let stop: (() => void) | null = null;
  let timer: number | null = null;
  let alive = true;
  (async () => {
    const db = await capability<Db>('db');
    if (!alive) return;
    if (db) {
      stop = db.collection(entriesPath(date)).onSnapshot(
        (s) => alive && onData({ date, entries: rankEntries(toEntries(s.docs)), source: 'shared' }),
        () => alive && onData(localResult(date)),
      );
      return;
    }
    const pull = async () => {
      try {
        const res = await withTimeout(fetch(`${BASE}/api/rankings?date=${encodeURIComponent(date)}`));
        if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error(String(res.status));
        const data = (await res.json()) as { date: string; entries: RankingEntry[] };
        if (alive) onData({ date: data.date, entries: data.entries, source: 'server' });
      } catch {
        if (alive) onData(localResult(date));
      }
    };
    await pull();
    timer = window.setInterval(pull, 60_000);
  })();
  return () => {
    alive = false;
    stop?.();
    if (timer) window.clearInterval(timer);
  };
}

export async function submitEntry(e: RankingEntry): Promise<boolean> {
  const db = await capability<Db>('db');
  if (db) {
    try {
      await db.collection(entriesPath(e.date)).doc(e.id).set({ ...e });
      return true;
    } catch {
      return false;
    }
  }
  try {
    const res = await withTimeout(
      fetch(`${BASE}/api/rankings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e),
      }),
    );
    return res.ok && !!res.headers.get('content-type')?.includes('json');
  } catch {
    return false;
  }
}

export function lastDays(n = 7): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(kstDate(Date.now() - i * 86400_000));
  return out;
}
