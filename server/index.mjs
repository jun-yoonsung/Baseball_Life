// 랭킹 API + 정적 파일 서버. 외부 의존성 없이 Node 내장 모듈만 사용한다.
//   GET  /api/health
//   GET  /api/rankings?date=YYYY-MM-DD   (한국시간 기준, 최근 7일)
//   POST /api/rankings                   (은퇴 선수 기록 등록)
import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync, createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const DATA = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(ROOT, 'server', 'data');
const PORT = Number(process.env.PORT ?? 8787);
const MAX_PER_DAY = 5000;

const kstDate = (ts = Date.now()) => new Date(ts + 9 * 3600_000).toISOString().slice(0, 10);
const recentDates = () => Array.from({ length: 7 }, (_, i) => kstDate(Date.now() - i * 86400_000));

const POS = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL']);
const ROLES = new Set(['batter', 'pitcher', 'twoWay']);

function compare(a, b) {
  return b.mvp - a.mvp || b.peakOvr - a.peakOvr || b.awards - a.awards || b.war - a.war;
}

function rank(list) {
  const sorted = [...list].sort(compare);
  let r = 0;
  return sorted.map((e, i) => {
    if (i === 0 || compare(sorted[i - 1], e) !== 0) r = i + 1;
    return { ...e, rank: r };
  });
}

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, max) : '');
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

function sanitize(body) {
  if (!body || typeof body !== 'object') return null;
  const e = {
    id: str(body.id, 64),
    date: kstDate(),
    submittedAt: Date.now(),
    name: str(body.name, 20).trim(),
    nationality: str(body.nationality, 8),
    role: ROLES.has(body.role) ? body.role : null,
    pos: POS.has(body.pos) ? body.pos : null,
    mvp: num(body.mvp, 0, 30),
    peakOvr: num(body.peakOvr, 0, 99),
    awards: num(body.awards, 0, 300),
    war: num(body.war, -50, 250),
    rings: num(body.rings, 0, 30),
    seasons: num(body.seasons, 0, 40),
    hallOfFame: body.hallOfFame === true,
    grade: str(body.grade, 20),
    teams: Array.isArray(body.teams) ? body.teams.slice(0, 6).map((t) => str(t, 20)) : [],
    line: str(body.line, 120),
  };
  if (!e.id || !e.name || !e.role || !e.pos) return null;
  for (const k of ['mvp', 'peakOvr', 'awards', 'war', 'rings', 'seasons']) if (e[k] === null) return null;
  e.war = Math.round(e.war * 10) / 10;
  return e;
}

// 날짜별 JSON 파일. 쓰기는 직렬화해서 경쟁 조건을 막는다.
const cache = new Map();
let writing = Promise.resolve();

async function load(date) {
  if (cache.has(date)) return cache.get(date);
  const file = join(DATA, `${date}.json`);
  let list = [];
  try {
    list = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    list = [];
  }
  cache.set(date, list);
  return list;
}

async function persist(date, list) {
  await mkdir(DATA, { recursive: true });
  const file = join(DATA, `${date}.json`);
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(list));
  await rename(tmp, file);
}

// 간단한 IP별 제한: 10분에 20건
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 20;
}

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  });
  res.end(body);
}

async function readBody(req, limit = 8192) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        fail(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
    req.on('error', fail);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res, pathname) {
  if (!existsSync(DIST)) return send(res, 404, 'dist 폴더가 없습니다. 먼저 npm run build 를 실행하세요.');
  let file = normalize(join(DIST, decodeURIComponent(pathname)));
  if (!file.startsWith(DIST)) return send(res, 403, 'forbidden');
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': file.includes(`${join(DIST, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

export const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, date: kstDate() });
    if (url.pathname === '/api/rankings' && req.method === 'GET') {
      const date = url.searchParams.get('date') ?? kstDate();
      if (!recentDates().includes(date)) return send(res, 400, { error: '최근 7일만 조회할 수 있습니다.' });
      const list = await load(date);
      return send(res, 200, { date, entries: rank(list).slice(0, 500) }, { 'Cache-Control': 'no-cache' });
    }
    if (url.pathname === '/api/rankings' && req.method === 'POST') {
      const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
      if (limited(ip)) return send(res, 429, { error: '잠시 후 다시 시도해 주세요.' });
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return send(res, 400, { error: '잘못된 요청입니다.' });
      }
      const entry = sanitize(body);
      if (!entry) return send(res, 400, { error: '기록 형식이 올바르지 않습니다.' });
      const date = entry.date;
      writing = writing.catch(() => {}).then(async () => {
        const list = await load(date);
        if (list.some((e) => e.id === entry.id)) return;
        if (list.length >= MAX_PER_DAY) return;
        list.push(entry);
        await persist(date, list);
      });
      await writing;
      return send(res, 201, { ok: true, date });
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' });
    return serveStatic(req, res, url.pathname);
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'server error' });
  }
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`베이스볼 라이프 서버: http://localhost:${PORT}`));
}
