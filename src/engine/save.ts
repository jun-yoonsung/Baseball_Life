import type { RankingEntry } from './ranking';
import type { Career } from './types';

const KEY = 'baseball-life:career';
const HISTORY = 'baseball-life:history';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadCareer(): Career | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    return validate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCareer(c: Career | null) {
  try {
    const s = storage();
    if (!s) return;
    if (c) s.setItem(KEY, JSON.stringify(c));
    else s.removeItem(KEY);
  } catch {
    /* 저장 공간 부족 등은 무시 */
  }
}

export function loadHistory(): RankingEntry[] {
  try {
    const raw = storage()?.getItem(HISTORY);
    return raw ? (JSON.parse(raw) as RankingEntry[]) : [];
  } catch {
    return [];
  }
}

export function addHistory(e: RankingEntry) {
  try {
    const list = loadHistory().filter((x) => x.id !== e.id);
    list.unshift(e);
    storage()?.setItem(HISTORY, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* noop */
  }
}

export function clearHistory() {
  try {
    storage()?.removeItem(HISTORY);
  } catch {
    /* noop */
  }
}

export function validate(x: unknown): Career {
  const c = x as Career;
  if (!c || typeof c !== 'object' || c.version !== 1 || typeof c.name !== 'string' || !Array.isArray(c.seasons) || !c.bat || !c.pit) {
    throw new Error('올바른 저장 파일이 아닙니다.');
  }
  return c;
}

export function exportCareer(c: Career): string {
  return JSON.stringify({ app: 'baseball-life', exportedAt: new Date().toISOString(), career: c, history: loadHistory() });
}

export function importCareer(text: string): Career {
  const data = JSON.parse(text);
  const career = validate(data?.career ?? data);
  if (Array.isArray(data?.history)) for (const h of data.history as RankingEntry[]) addHistory(h);
  return career;
}
