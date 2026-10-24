// 리그 순위표와 실제 포스트시즌 방식 시뮬레이션.
//   KBO: 와일드카드 결정전(4위 1승 어드밴티지) → 준플레이오프 → 플레이오프 → 한국시리즈
//   NPB: 리그별 클라이맥스 시리즈(퍼스트 2·3위, 파이널 1위 1승 어드밴티지) → 일본시리즈
//   MLB: 리그별 지구 우승 3팀 + 와일드카드 3팀, 와일드카드 시리즈 → 디비전 시리즈 → 챔피언십 시리즈 → 월드시리즈
import { DIV_NAME, LEAGUES, SUBLEAGUE_NAME, TEAMS, type SubLeague, type TeamDef } from './data';
import { clamp, type Rng } from './rng';
import type { Country, StandingGroup, StandingRow } from './types';

const short = (id: string) => TEAMS.find((t) => t.id === id)?.name ?? id;

export interface LeagueResult {
  groups: StandingGroup[];
  post: string[];
  champion: string;
  // 팀별 시즌 결과 문구, 포스트시즌 도달 단계
  summary: Record<string, string>;
  pennant: Set<string>;
  rank: Record<string, number>;
}

export function evolveStrength(strength: Record<string, number>, rng: Rng) {
  for (const t of TEAMS) {
    if (t.country === 'NONE') continue;
    const prev = strength[t.id] ?? rng.normal(0, 1);
    strength[t.id] = Math.round((0.65 * prev + rng.normal(0, 0.75)) * 100) / 100;
  }
}

function standingsFor(teams: TeamDef[], s: Record<string, number>, games: number, rng: Rng): StandingRow[] {
  const raw = teams.map((t) => ({ id: t.id, pct: clamp(0.5 + 0.062 * (s[t.id] ?? 0) + rng.normal(0, 0.022), 0.3, 0.7) }));
  const mean = raw.reduce((a, r) => a + r.pct, 0) / raw.length;
  const rows = raw.map((r) => {
    const w = Math.round(games * clamp(r.pct - mean + 0.5, 0.28, 0.72));
    return { teamId: r.id, w, l: games - w, gb: 0 };
  });
  return rows;
}

function sortRows(rows: StandingRow[]): StandingRow[] {
  const sorted = [...rows].sort((a, b) => b.w - b.l - (a.w - a.l));
  const lead = sorted[0];
  for (const r of sorted) r.gb = (lead.w - r.w + (r.l - lead.l)) / 2;
  return sorted;
}

// 한 경기 승리 확률은 두 팀 전력 차이로 정한다
function gameP(sa: number, sb: number) {
  return clamp(0.5 + 0.035 * (sa - sb), 0.3, 0.7);
}

interface SeriesResult {
  winner: string;
  loser: string;
  wa: number; // 먼저 적은 팀(a)의 승수 (어드밴티지 포함)
  wb: number;
  adv: number;
}

function series(a: string, b: string, need: number, s: Record<string, number>, rng: Rng, advA = 0): SeriesResult {
  let wa = advA;
  let wb = 0;
  const p = gameP(s[a] ?? 0, s[b] ?? 0);
  while (wa < need && wb < need) {
    if (rng.chance(p)) wa++;
    else wb++;
  }
  return wa >= need ? { winner: a, loser: b, wa, wb, adv: advA } : { winner: b, loser: a, wa, wb, adv: advA };
}

// "A팀 x-y B팀" 형식. x는 항상 먼저 적은 팀(series의 a)이 실제 경기에서 이긴 수다.
const score = (r: SeriesResult) => `${r.wa - r.adv}-${r.wb}${r.adv ? ` (어드밴티지 ${r.adv}승 별도)` : ''}`;
const line = (title: string, a: string, b: string, r: SeriesResult) => `${title}: ${short(a)} ${score(r)} ${short(b)} → ${short(r.winner)} 승리`;

export function simulateLeague(country: Country, strength: Record<string, number>, boost: Record<string, number>, rng: Rng): LeagueResult {
  const s: Record<string, number> = { ...strength };
  for (const [k, v] of Object.entries(boost)) s[k] = (s[k] ?? 0) + v;
  const games = LEAGUES[country === 'KR' ? 'KR1' : country === 'JP' ? 'JP1' : 'MLB'].games;
  const groups: StandingGroup[] = [];
  const post: string[] = [];
  const summary: Record<string, string> = {};
  const rank: Record<string, number> = {};
  const pennant = new Set<string>();
  const out = (id: string, stage: string) => (summary[id] = `${summary[id]} · ${stage}`);

  if (country === 'KR') {
    const rows = sortRows(standingsFor(TEAMS.filter((t) => t.sub === 'KBO'), s, games, rng));
    rows.forEach((r, i) => {
      r.seed = i < 5 ? i + 1 : undefined;
      rank[r.teamId] = i + 1;
      summary[r.teamId] = `정규시즌 ${i + 1}위 (${r.w}승 ${r.l}패)`;
    });
    groups.push({ name: SUBLEAGUE_NAME.KBO, rows });
    const [t1, t2, t3, t4, t5] = rows.map((r) => r.teamId);
    // 와일드카드: 4위는 1승만 하면 통과, 5위는 2연승 필요
    const wc = series(t4, t5, 2, s, rng, 1);
    post.push(line('와일드카드 결정전', t4, t5, wc));
    out(wc.loser, '와일드카드 결정전 탈락');
    const spo = series(t3, wc.winner, 3, s, rng);
    post.push(line('준플레이오프', t3, wc.winner, spo));
    out(spo.loser, '준플레이오프 탈락');
    const po = series(t2, spo.winner, 3, s, rng);
    post.push(line('플레이오프', t2, spo.winner, po));
    out(po.loser, '플레이오프 탈락');
    const ks = series(t1, po.winner, 4, s, rng);
    post.push(line('한국시리즈', t1, po.winner, ks).replace(/승리$/, '우승'));
    out(ks.loser, '한국시리즈 준우승');
    out(ks.winner, '한국시리즈 우승');
    pennant.add(ks.winner).add(ks.loser);
    return { groups, post, champion: ks.winner, summary, pennant, rank };
  }

  if (country === 'JP') {
    const champs: string[] = [];
    for (const sub of ['CL', 'PL'] as SubLeague[]) {
      const rows = sortRows(standingsFor(TEAMS.filter((t) => t.sub === sub), s, games, rng));
      rows.forEach((r, i) => {
        r.seed = i < 3 ? i + 1 : undefined;
        rank[r.teamId] = i + 1;
        summary[r.teamId] = `${SUBLEAGUE_NAME[sub]} ${i + 1}위 (${r.w}승 ${r.l}패)`;
      });
      groups.push({ name: SUBLEAGUE_NAME[sub], rows });
      const [a, b, c] = rows.map((r) => r.teamId);
      const first = series(b, c, 2, s, rng);
      post.push(line(`${SUBLEAGUE_NAME[sub]} CS 퍼스트 스테이지`, b, c, first));
      out(first.loser, '클라이맥스 시리즈 퍼스트 스테이지 탈락');
      const fin = series(a, first.winner, 4, s, rng, 1);
      post.push(line(`${SUBLEAGUE_NAME[sub]} CS 파이널 스테이지`, a, first.winner, fin));
      out(fin.loser, '클라이맥스 시리즈 파이널 스테이지 탈락');
      champs.push(fin.winner);
    }
    const js = series(champs[0], champs[1], 4, s, rng);
    post.push(line('일본시리즈', champs[0], champs[1], js).replace(/승리$/, '우승'));
    out(js.loser, '일본시리즈 준우승');
    out(js.winner, '일본시리즈 우승');
    pennant.add(js.winner).add(js.loser);
    return { groups, post, champion: js.winner, summary, pennant, rank };
  }

  const pennants: string[] = [];
  for (const sub of ['AL', 'NL'] as SubLeague[]) {
    const divWinners: StandingRow[] = [];
    const others: StandingRow[] = [];
    for (const div of ['East', 'Central', 'West'] as const) {
      const rows = sortRows(standingsFor(TEAMS.filter((t) => t.sub === sub && t.div === div), s, games, rng));
      rows.forEach((r, i) => {
        rank[r.teamId] = i + 1;
        summary[r.teamId] = `${SUBLEAGUE_NAME[sub]} ${DIV_NAME[div]}지구 ${i + 1}위 (${r.w}승 ${r.l}패)`;
      });
      groups.push({ name: `${SUBLEAGUE_NAME[sub]} ${DIV_NAME[div]}지구`, rows });
      divWinners.push(rows[0]);
      others.push(...rows.slice(1));
    }
    divWinners.sort((a, b) => b.w - a.w);
    const wild = [...others].sort((a, b) => b.w - a.w).slice(0, 3);
    const seeds = [...divWinners, ...wild];
    seeds.forEach((r, i) => (r.seed = i + 1));
    const id = seeds.map((r) => r.teamId);
    const lg = sub;
    const w36 = series(id[2], id[5], 2, s, rng);
    const w45 = series(id[3], id[4], 2, s, rng);
    post.push(line(`${lg} 와일드카드 시리즈`, id[2], id[5], w36));
    post.push(line(`${lg} 와일드카드 시리즈`, id[3], id[4], w45));
    out(w36.loser, '와일드카드 시리즈 탈락');
    out(w45.loser, '와일드카드 시리즈 탈락');
    const ds1 = series(id[0], w45.winner, 3, s, rng);
    const ds2 = series(id[1], w36.winner, 3, s, rng);
    post.push(line(`${lg} 디비전 시리즈`, id[0], w45.winner, ds1));
    post.push(line(`${lg} 디비전 시리즈`, id[1], w36.winner, ds2));
    out(ds1.loser, '디비전 시리즈 탈락');
    out(ds2.loser, '디비전 시리즈 탈락');
    const cs = series(ds1.winner, ds2.winner, 4, s, rng);
    post.push(line(`${lg} 챔피언십 시리즈`, ds1.winner, ds2.winner, cs));
    out(cs.loser, '챔피언십 시리즈 탈락');
    pennants.push(cs.winner);
    pennant.add(cs.winner);
  }
  const ws = series(pennants[0], pennants[1], 4, s, rng);
  post.push(line('월드시리즈', pennants[0], pennants[1], ws).replace(/승리$/, '우승'));
  out(ws.loser, '월드시리즈 준우승');
  out(ws.winner, '월드시리즈 우승');
  return { groups, post, champion: ws.winner, summary, pennant, rank };
}
