// claude.ai 아티팩트 런타임 연동. 일반 웹 호스팅에서는 window.claude 가 없으므로 모두 null 로 떨어진다.

interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

const cache = new Map<string, Promise<unknown>>();

export function capability<T>(name: string): Promise<T | null> {
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!rt || typeof rt.use !== 'function') return Promise.resolve(null);
  if (!cache.has(name)) cache.set(name, rt.use(name).catch(() => null));
  return cache.get(name) as Promise<T | null>;
}

export interface DbDoc {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface DbQuery {
  get(): Promise<{ docs: DbDoc[] }>;
  onSnapshot(next: (s: { docs: DbDoc[] }) => void, error?: (e: { code: string }) => void): () => void;
}

export interface Db {
  collection(path: string): DbQuery & { doc(id: string): { set(d: Record<string, unknown>): Promise<void> } };
}

export interface Downloads {
  save(req: { filename: string; data: string | Blob }): Promise<unknown>;
}
