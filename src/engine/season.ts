// 한 시즌 진행: 전반기/후반기 시뮬레이션, 수상, 포스트시즌, 국제대회, 성장.
import { countryOfTeam, moveTeam, toKRW } from './contracts';
import {
  AWARD_NAMES,
  LEAGUES,
  MAJOR_OF,
  NATION_STRENGTH,
  POS_NAME,
  THRESHOLDS,
  teamName,
  teamsOf,
  tournamentsAfterSeason,
} from './data';
import { adjust } from './events';
import { addRating, applyGrowth, batOvr, overall, pitOvr } from './ratings';
import { clamp, type Rng } from './rng';
import {
  battingWar,
  emptyBat,
  emptyPit,
  finishPitchingHalf,
  pitchingWar,
  pitProbs,
  simBatting,
  simPitchApp,
  zOf,
} from './sim';
import type { Award, BattingLine, Career, Country, Level, PitchingLine, PitPos, SeasonLine, SeasonRecord } from './types';

type BatRole = 'starter' | 'bench' | 'twoWay';
type PitRole = 'rotation' | 'twoWayRotation' | 'closer' | 'setup' | 'middle';

interface Assignment {
  level: Level;
  teamId: string;
  batRole: BatRole | null;
  pitRole: PitRole | null;
}

interface SeasonState {
  inc: Record<string, number>;
  form: number;
  teamRating: number;
  callup: number;
  majorHalves: number;
  majorAtEnd: boolean;
  lines: Map<string, SeasonLine>;
  lineRole: Map<string, PitPos>;
  ptBat: number;
  ptPit: number;
}

const MAJORS: Level[] = ['KR1', 'JP1', 'MLB'];
export const isMajor = (l: Level) => MAJORS.includes(l);

function incumbent(st: SeasonState, level: Level, kind: string, rng: Rng): number {
  const key = `${level}:${kind}`;
  if (st.inc[key] === undefined) {
    const avg = LEAGUES[level].avg;
    const off = kind === 'SP' ? 1 : kind === 'RP' ? -2 : kind === 'CL' ? 3 : 1.5;
    st.inc[key] = rng.normal(avg + off, 3.5);
  }
  return st.inc[key];
}

function effOvr(c: Career, base: number, st: SeasonState) {
  return base + (c.trust - 50) / 12 + (c.morale - 50) / 25 + st.callup;
}

function assign(c: Career, st: SeasonState, rng: Rng): Assignment | null {
  if (c.military.status === 'serving') {
    if (c.military.kind === 'active') return null;
    return {
      level: 'KR2',
      teamId: 'kr-military',
      batRole: c.role !== 'pitcher' ? 'starter' : null,
      pitRole: c.role === 'batter' ? null : c.role === 'twoWay' ? 'twoWayRotation' : c.pitPos === 'SP' ? 'rotation' : 'setup',
    };
  }
  if (!c.teamId) return null;
  if (c.level === 'COL') {
    return {
      level: 'COL',
      teamId: c.teamId,
      batRole: c.role !== 'pitcher' ? 'starter' : null,
      pitRole: c.role === 'batter' ? null : c.role === 'twoWay' ? 'twoWayRotation' : c.pitPos === 'SP' ? 'rotation' : 'closer',
    };
  }
  const country = countryOfTeam(c.teamId);
  if (!country) return null;
  const ladder: Level[] = country === 'KR' ? ['KR1', 'KR2'] : country === 'JP' ? ['JP1', 'JP2'] : ['MLB', 'AAA', 'AA', 'A'];
  const bo = batOvr(c.bat, c.batPos);
  const po = pitOvr(c.pit, c.pitPos);
  const isBat = c.role !== 'pitcher';
  const isPit = c.role !== 'batter';

  for (let i = 0; i < ladder.length; i++) {
    const level = ladder[i];
    const last = i === ladder.length - 1;
    const avg = LEAGUES[level].avg;
    const major = isMajor(level);
    let batRole: BatRole | null = null;
    let pitRole: PitRole | null = null;
    if (isBat) {
      const e = effOvr(c, bo, st);
      const inc = incumbent(st, level, c.batPos, rng);
      if (e >= inc - 1) batRole = 'starter';
      else if (major && e >= inc - 5 && bo >= avg - 7) batRole = 'bench';
      else if (!major && e >= avg - 6) batRole = 'starter';
    }
    if (isPit) {
      const e = effOvr(c, po, st);
      const pos = c.role === 'twoWay' ? 'SP' : c.pitPos;
      const inc = incumbent(st, level, pos, rng);
      if (pos === 'SP') {
        if (e >= inc - 1.5) pitRole = 'rotation';
        else if (major && e >= inc - 5) pitRole = 'middle';
        else if (!major && e >= avg - 6) pitRole = 'rotation';
      } else if (pos === 'CL') {
        if (e >= inc) pitRole = 'closer';
        else if (e >= inc - 6) pitRole = 'setup';
        else if (!major && e >= avg - 6) pitRole = 'closer';
      } else {
        if (e >= inc + 1) pitRole = 'setup';
        else if (e >= inc - 5) pitRole = 'middle';
        else if (!major && e >= avg - 6) pitRole = 'setup';
      }
    }
    if (c.role === 'twoWay') {
      if (batRole || pitRole || last) {
        // 수준에 못 미치는 쪽은 기용하지 않는다
        let b: BatRole | null = batRole === 'starter' ? 'twoWay' : batRole === 'bench' ? 'bench' : null;
        let p: PitRole | null = pitRole === 'rotation' ? 'twoWayRotation' : pitRole ? 'middle' : null;
        if (!b && !p) {
          if (bo >= po) b = 'twoWay';
          else p = 'twoWayRotation';
        }
        return { level, teamId: c.teamId, batRole: b, pitRole: p };
      }
      continue;
    }
    if (batRole || pitRole || last) {
      return {
        level,
        teamId: c.teamId,
        batRole: isBat ? batRole ?? 'starter' : null,
        pitRole: isPit ? pitRole ?? (c.pitPos === 'SP' ? 'rotation' : 'setup') : null,
      };
    }
  }
  return null;
}

function lineFor(st: SeasonState, level: Level, teamId: string): SeasonLine {
  const key = `${level}|${teamId}`;
  let l = st.lines.get(key);
  if (!l) {
    l = { level, teamId, batWar: 0, pitWar: 0 };
    st.lines.set(key, l);
  }
  return l;
}

function rollInjury(c: Career, rng: Rng, rec: SeasonRecord): number {
  // 반환: 이번 반기에 결장하는 비율
  let miss = 0;
  if (c.injury) {
    if (c.injury.remaining >= 1) {
      c.injury.remaining -= 1;
      if (c.injury.remaining <= 0.001) c.injury = null;
      return 1;
    }
    miss = c.injury.remaining;
    c.injury = null;
  }
  const isPitcher = c.role !== 'batter';
  const base = (isPitcher ? 0.09 : 0.07) * (c.role === 'twoWay' ? 1.2 : 1);
  const ageF = c.age > 31 ? 1 + (c.age - 31) * 0.07 : 1;
  const intF = c.training.intensity === 3 ? 1.4 : c.training.intensity === 1 ? 0.75 : 1;
  const condF = c.condition < 40 ? 1.4 : c.condition > 80 ? 0.85 : 1;
  const retear = Number(c.flags.retearRisk ?? 0);
  if (retear > 0 && rng.chance(retear / 2)) {
    delete c.flags.retearRisk;
    c.flags.tjPending = 1;
    rec.injuries.push('팔꿈치 인대 재손상');
    c.log.push({ year: c.year, age: c.age, text: '재활했던 팔꿈치 인대가 다시 손상됐습니다.', tone: 'bad' });
    return Math.min(1, miss + 0.7);
  }
  if (!rng.chance(base * c.hidden.injuryProne * ageF * intF * condF)) return miss;
  const sev = rng.weighted([
    ['minor', 0.65],
    ['moderate', 0.27],
    ['severe', 0.08],
  ] as const);
  if (sev === 'minor') {
    const name = rng.pick(['햄스트링 미세 손상', '손목 염좌', '옆구리 근육통', '발목 염좌', '허리 통증']);
    rec.injuries.push(name);
    return Math.min(1, miss + rng.range(0.08, 0.3));
  }
  if (sev === 'moderate') {
    const name = rng.pick(isPitcher ? ['어깨 염증', '팔꿈치 통증', '내복사근 부상'] : ['손가락 골절', '햄스트링 부상', '늑골 골절']);
    rec.injuries.push(name);
    const total = rng.range(0.4, 1.1);
    const thisHalf = Math.min(1 - miss, total);
    if (total > thisHalf) c.injury = { name, remaining: total - thisHalf };
    addRating(c, rng.pick(isPitcher ? (['velocity', 'stamina'] as const) : (['speed', 'contact'] as const)), -1);
    c.log.push({ year: c.year, age: c.age, text: `${name}으로 한동안 전력에서 이탈했습니다.`, tone: 'bad' });
    return Math.min(1, miss + thisHalf);
  }
  if (isPitcher && rng.chance(0.7)) {
    rec.injuries.push('팔꿈치 인대 손상');
    c.flags.tjPending = 1;
    c.log.push({ year: c.year, age: c.age, text: '팔꿈치 인대 손상 진단을 받았습니다. 시즌 아웃입니다.', tone: 'bad' });
    return 1;
  }
  const name = rng.pick(['무릎 십자인대 파열', '아킬레스건 부상', '어깨 관절와순 파열']);
  rec.injuries.push(name);
  c.injury = { name, remaining: rng.range(0.8, 1.4) };
  addRating(c, 'speed', -rng.int(2, 5));
  addRating(c, 'fielding', -2);
  c.log.push({ year: c.year, age: c.age, text: `${name}으로 수술대에 올랐습니다.`, tone: 'bad' });
  return 1;
}

function playHalf(c: Career, rec: SeasonRecord, st: SeasonState, half: 0 | 1, rng: Rng) {
  const a = assign(c, st, rng);
  if (c.military.status === 'serving') {
    rec.military = c.military.kind === 'active' ? '현역 복무' : '국군체육부대 복무';
    c.military.halvesLeft = (c.military.halvesLeft ?? 1) - 1;
    if (c.military.kind === 'active') {
      if (c.military.halvesLeft <= 0) discharge(c);
      return;
    }
  }
  if (!a) return;
  c.level = a.level;
  const avail = 1 - rollInjury(c, rng, rec);
  const L = LEAGUES[a.level];
  const hg = L.games / 2;
  const line = lineFor(st, a.level, a.teamId);
  const major = isMajor(a.level);
  if (major) {
    st.majorHalves++;
    if (half === 1) st.majorAtEnd = true;
  }

  if (a.batRole && avail > 0) {
    const bl = (line.bat ??= emptyBat());
    let g = 0;
    let pa = 0;
    if (a.batRole === 'starter') {
      g = Math.round(hg * avail * rng.range(0.9, 1));
      pa = Math.round(g * rng.range(4.05, 4.45));
    } else if (a.batRole === 'bench') {
      g = Math.round(hg * avail * rng.range(0.45, 0.7));
      pa = Math.round(g * rng.range(1.5, 2.2));
    } else {
      g = Math.round(hg * avail * 0.78);
      pa = Math.round(g * rng.range(3.9, 4.3));
    }
    simBatting(bl, c.bat, L.avg, g, pa, rng, st.form);
    st.ptBat += (pa / 550) * (major ? 1 : 0.8);
  }

  if (a.pitRole && avail > 0) {
    const pl = (line.pit ??= emptyPit());
    const before = { ...pl };
    const reliever = a.pitRole === 'closer' || a.pitRole === 'setup' || a.pitRole === 'middle';
    const pr = { ...c.pit, velocity: c.pit.velocity + st.form / 2, stuff: c.pit.stuff + st.form / 2, control: c.pit.control + st.form / 2 };
    const probs = pitProbs(pr, L.avg, reliever);
    const zAll = zOf(pitOvr(c.pit, c.role === 'twoWay' ? 'SP' : c.pitPos), L.avg);
    let apps = 0;
    if (a.pitRole === 'rotation' || a.pitRole === 'twoWayRotation') {
      const starts = Math.round((hg / (a.pitRole === 'rotation' ? 5.1 : 7)) * avail);
      const ipMean = clamp(5.4 + 0.045 * (c.pit.stamina - L.avg) + 0.25 * zAll, 3.5, 7.6);
      for (let i = 0; i < starts; i++) simPitchApp(pl, probs, clamp(Math.round(3 * rng.normal(ipMean, 0.9)), 6, 27), rng);
      pl.GS += starts;
      apps = starts;
      st.lineRole.set(`${a.level}|${a.teamId}`, 'SP');
      st.ptPit += (pl.outs - before.outs) / 3 / (a.pitRole === 'rotation' ? 150 : 100);
    } else {
      const share = a.pitRole === 'closer' ? 0.4 : a.pitRole === 'setup' ? 0.43 : 0.35;
      apps = Math.round(hg * share * avail * rng.range(0.9, 1.05));
      const dist: [number, number][] =
        a.pitRole === 'closer'
          ? [[3, 0.8], [4, 0.12], [2, 0.05], [6, 0.03]]
          : a.pitRole === 'setup'
            ? [[3, 0.65], [2, 0.15], [4, 0.12], [5, 0.08]]
            : [[3, 0.4], [4, 0.15], [5, 0.12], [6, 0.15], [2, 0.1], [9, 0.08]];
      for (let i = 0; i < apps; i++) simPitchApp(pl, probs, rng.weighted(dist), rng);
      st.lineRole.set(`${a.level}|${a.teamId}`, a.pitRole === 'closer' ? 'CL' : 'RP');
      st.ptPit += (pl.outs - before.outs) / 3 / 60;
    }
    pl.G += apps;
    finishPitchingHalf(pl, before, zOf(c.pit.composure, L.avg) + c.hidden.clutch * 0.3, rng);
    decisions(pl, before, a.pitRole, apps, st.teamRating, rng);
  }
}

function decisions(pl: PitchingLine, before: PitchingLine, role: PitRole, apps: number, team: number, rng: Rng) {
  const outs = pl.outs - before.outs;
  if (outs <= 0) return;
  const era = ((pl.ER - before.ER) * 9) / (outs / 3);
  const lg = 4.6;
  if (role === 'rotation' || role === 'twoWayRotation') {
    const dec = rng.binomial(apps, 0.72);
    const wp = clamp(0.5 + (lg - era) * 0.07 + team * 0.06, 0.15, 0.85);
    const w = rng.binomial(dec, wp);
    pl.W += w;
    pl.L += dec - w;
  } else if (role === 'closer') {
    const opp = rng.binomial(apps, clamp(0.62 + team * 0.05, 0.4, 0.8));
    const conv = clamp(0.86 - (era - lg * 0.8) * 0.03, 0.6, 0.96);
    const sv = rng.binomial(opp, conv);
    pl.SV += sv;
    pl.L += rng.binomial(opp - sv, 0.6);
    pl.W += rng.binomial(apps - opp, 0.12);
  } else if (role === 'setup') {
    const opp = rng.binomial(apps, 0.5);
    const hld = rng.binomial(opp, clamp(0.82 - (era - lg * 0.8) * 0.03, 0.55, 0.95));
    pl.HLD += hld;
    pl.W += rng.binomial(apps, 0.07);
    pl.L += rng.binomial(opp - hld, 0.5);
  } else {
    pl.W += rng.binomial(apps, 0.05);
    pl.L += rng.binomial(apps, 0.05);
    pl.HLD += rng.binomial(apps, 0.08);
  }
}

export function discharge(c: Career) {
  c.military.status = 'done';
  c.level = c.military.returnLevel ?? c.level;
  c.teamId = c.military.returnTeamId ?? c.teamId;
  c.log.push({ year: c.year, age: c.age, text: `병역을 마치고 ${teamName(c.teamId)}에 복귀했습니다.`, tone: 'info' });
}

function midSeason(c: Career, rec: SeasonRecord, st: SeasonState, rng: Rng) {
  // 올스타
  const majorLine = [...st.lines.values()].find((l) => isMajor(l.level));
  if (majorLine) {
    const L = LEAGUES[majorLine.level];
    const war =
      (majorLine.bat ? battingWar(majorLine.bat, c.bat, c.batPos, L.avg, L.games) : 0) +
      (majorLine.pit ? pitchingWar(majorLine.pit, st.lineRole.get(`${majorLine.level}|${majorLine.teamId}`) ?? 'SP') : 0);
    if (war >= rng.normal(1.8, 0.4) * (L.games / 144) || (c.fame >= 80 && war > 0.5)) {
      rec.allStar = true;
      c.allStars++;
      adjust(c, 'fame', 4);
      c.log.push({ year: c.year, age: c.age, text: `${L.name} 올스타에 선정됐습니다!`, tone: 'good' });
    }
  }
  // 콜업/강등 보정
  for (const l of st.lines.values()) {
    if (isMajor(l.level)) {
      const ops = l.bat && l.bat.PA > 60 ? opsOf(l.bat) : null;
      const era = l.pit && l.pit.outs > 30 ? (l.pit.ER * 27) / l.pit.outs : null;
      if ((ops !== null && ops < 0.6) || (era !== null && era > 6.2)) st.callup = -3;
    } else if (l.level !== 'COL') {
      const ops = l.bat && l.bat.PA > 60 ? opsOf(l.bat) : null;
      const era = l.pit && l.pit.outs > 30 ? (l.pit.ER * 27) / l.pit.outs : null;
      if ((ops !== null && ops > 0.86) || (era !== null && era < 3)) {
        st.callup = 3;
        rec.notes.push('퓨처스/마이너에서 맹활약해 후반기 콜업 기회를 얻었습니다.');
      }
    }
  }
  // 트레이드 마감
  const country = countryOfTeam(c.teamId);
  if (country && c.military.status !== 'serving' && c.contract && c.contract.type !== 'fa' && c.contract.type !== 'posting') {
    const p = 0.03 + (c.trust < 40 ? 0.07 : 0);
    if (rng.chance(p)) {
      const to = rng.pick(teamsOf(country).filter((t) => t.id !== c.teamId));
      const from = teamName(c.teamId);
      moveTeam(c, to.id, rng, true);
      c.contract.teamId = to.id;
      rec.notes.push(`트레이드 마감일에 ${from}에서 ${to.name}(으)로 트레이드됐습니다.`);
      c.log.push({ year: c.year, age: c.age, text: `${to.name}(으)로 트레이드됐습니다.`, tone: 'info' });
      st.inc = {};
    }
  }
}

export function opsOf(b: BattingLine): number {
  const obp = b.PA ? (b.H + b.BB + b.HBP) / b.PA : 0;
  const tb = b.H + b.D + 2 * b.T + 3 * b.HR;
  const slg = b.AB ? tb / b.AB : 0;
  return obp + slg;
}

function postseason(c: Career, rec: SeasonRecord, st: SeasonState, rng: Rng) {
  const country = countryOfTeam(c.teamId);
  if (!country || c.military.status === 'serving' || rec.military) {
    rec.teamResult = rec.military ? rec.military : c.level === 'COL' ? '대학리그' : '-';
    return;
  }
  const rating = st.teamRating + rec.majorWar * 0.12 + rng.normal(0, 0.3);
  let rank: number;
  let champP: number;
  let series: string;
  if (country === 'KR') {
    rank = clamp(Math.round(5.5 - rating * 2.3), 1, 10);
    champP = [0, 0.45, 0.22, 0.13, 0.08, 0.05][rank] ?? 0;
    series = '한국시리즈';
  } else if (country === 'JP') {
    rank = clamp(Math.round(3.5 - rating * 1.6), 1, 6);
    champP = [0, 0.3, 0.15, 0.08][rank] ?? 0;
    series = '일본시리즈';
  } else {
    rank = clamp(Math.round(8 - rating * 3.4), 1, 15);
    champP = [0, 0.16, 0.14, 0.1, 0.08, 0.07, 0.06][rank] ?? 0;
    series = '월드시리즈';
  }
  const prefix = country === 'KR' ? '정규시즌' : '리그';
  const postCut = country === 'KR' ? 5 : country === 'JP' ? 3 : 6;
  const champion = rank <= postCut && rng.chance(champP);
  rec.champion = champion && st.majorAtEnd;
  if (champion) {
    rec.teamResult = `${prefix} ${rank}위 · ${series} 우승`;
    if (st.majorAtEnd) {
      c.rings++;
      adjust(c, 'fame', 6);
      c.log.push({ year: c.year, age: c.age, text: `${teamName(c.teamId)}, ${series} 우승! 우승 반지를 꼈습니다.`, tone: 'big' });
      const lid = MAJOR_OF[country] as 'KR1' | 'JP1' | 'MLB';
      if (rng.chance(clamp((rec.majorWar / 9) * (1 + c.hidden.clutch * 0.4), 0, 0.5))) {
        rec.awards.push({ year: c.year, key: 'SERIES_MVP', label: AWARD_NAMES[lid].seriesMvp, league: lid });
      }
    }
  } else if (rank <= postCut) {
    const finalist = rng.chance(champP * 1.2);
    rec.teamResult = `${prefix} ${rank}위 · ${finalist ? `${series} 준우승` : '포스트시즌 진출'}`;
  } else {
    rec.teamResult = `${prefix} ${rank}위`;
  }
}

function awards(c: Career, rec: SeasonRecord, st: SeasonState, rng: Rng) {
  const majors = [...st.lines.values()].filter((l) => isMajor(l.level));
  if (!majors.length) return;
  const main = majors.reduce((a, b) => ((a.bat?.PA ?? 0) + (a.pit?.outs ?? 0) >= (b.bat?.PA ?? 0) + (b.pit?.outs ?? 0) ? a : b));
  const lid = main.level as 'KR1' | 'JP1' | 'MLB';
  const T = THRESHOLDS[lid];
  const N = AWARD_NAMES[lid];
  const games = LEAGUES[lid].games;
  const s = (t: [number, number]) => rng.normal(t[0], t[1]);
  const add = (key: string, label: string) => rec.awards.push({ year: c.year, key, label, league: lid });
  const b = main.bat;
  const p = main.pit;
  const war = main.batWar + main.pitWar;
  const role = st.lineRole.get(`${main.level}|${main.teamId}`) ?? 'SP';

  if (b && b.PA > 0) {
    const qual = b.PA >= 3.1 * games;
    if (qual && b.H / b.AB > s(T.AVG)) add('T_AVG', '타격왕');
    if (b.HR > s(T.HR)) add('T_HR', '홈런왕');
    if (b.RBI > s(T.RBI)) add('T_RBI', '타점왕');
    if (b.SB > s(T.SB)) add('T_SB', '도루왕');
    if (b.H > s(T.H)) add('T_H', '최다안타');
    if (b.PA >= games * 2.5 && main.batWar > s(T.POS) + (c.batPos === 'DH' ? 0.8 : 0)) {
      add('POS', `${N.pos} (${c.role === 'twoWay' && c.batPos !== 'DH' ? POS_NAME[c.batPos] : POS_NAME[c.batPos]})`);
    }
    if (c.batPos !== 'DH' && b.G >= games * 0.6 && c.bat.fielding >= rng.normal(80, 3)) add('DEF', `${N.def} (${POS_NAME[c.batPos]})`);
  }
  if (p && p.outs > 0) {
    const qual = p.outs / 3 >= games;
    const era = (p.ER * 27) / p.outs;
    if (p.W > s(T.W)) add('T_W', '다승왕');
    if (qual && era < s(T.ERA)) add('T_ERA', '평균자책점왕');
    if (p.SO > s(T.SO)) add('T_SO', '탈삼진왕');
    if (p.SV > s(T.SV)) add('T_SV', '세이브왕');
    if (p.HLD > s(T.HLD)) add('T_HLD', '홀드왕');
    const pw = main.pitWar * (role === 'SP' ? 1 : 0.8);
    if (pw > s(T.PITCHER)) add(lid === 'MLB' ? 'CY' : 'POS', lid === 'MLB' ? N.pitcher! : `${N.pos} (투수)`);
  }
  // 연속 수상자에게는 기자단의 기준이 조금씩 엄격해진다
  const prevMvp = c.awards.filter((a) => a.key === 'MVP').length;
  if (war > s(T.MVP) + prevMvp * 0.35 - (rec.teamResult.includes('1위') ? 0.3 : 0)) {
    rec.awards.unshift({ year: c.year, key: 'MVP', label: `${LEAGUES[lid].name} MVP`, league: lid });
  }
  const r = c.rookie[lid];
  const rookieOk = lid === 'MLB' ? r.pa < 130 && r.outs < 150 : r.pa < 60 && r.outs < 90 && (r.firstYear === null || c.year - r.firstYear <= 4);
  if (!r.won && rookieOk && war > s(T.ROY)) {
    add('ROY', '신인왕');
    r.won = true;
  }
  for (const l of majors) {
    const t = c.rookie[l.level as 'KR1' | 'JP1' | 'MLB'];
    t.pa += l.bat?.PA ?? 0;
    t.outs += l.pit?.outs ?? 0;
    if (t.firstYear === null && (t.pa > 0 || t.outs > 0)) t.firstYear = c.year;
  }
}

function international(c: Career, rec: SeasonRecord, rng: Rng) {
  const list = tournamentsAfterSeason(c.year);
  const ovr = overall(c);
  const parts: string[] = [];
  for (const t of list) {
    if (t.key === 'AG' && !['KR', 'JP', 'TW'].includes(c.nationality)) continue;
    if (c.military.status === 'serving' && c.military.kind === 'active') continue;
    if (c.level === 'AMA' || c.level === 'COL') continue;
    if (c.level === 'MLB' && t.key !== 'WBC') continue; // 빅리거는 WBC 외 차출 불가
    const bar = { WBC: 70, P12: 64, OLY: 66, AG: c.age <= 25 ? 60 : 72 }[t.key];
    if (ovr < bar + rng.normal(0, 2)) continue;
    c.national.caps++;
    const [g, s, b] = NATION_STRENGTH[c.nationality][t.key];
    const bonus = (ovr - bar) * 0.004 + c.hidden.clutch * 0.02;
    const r = rng.next();
    const medal = r < g + bonus ? '금메달' : r < g + s + bonus ? '은메달' : r < g + s + b + bonus ? '동메달' : null;
    const label = t.key === 'WBC' || t.key === 'P12' ? (medal === '금메달' ? '우승' : medal === '은메달' ? '준우승' : medal === '동메달' ? '3위' : '탈락') : medal ?? '노메달';
    let perf = '';
    let great = false;
    if (c.role !== 'pitcher') {
      const l = emptyBat();
      simBatting(l, c.bat, 67, 7, 28, rng, c.hidden.clutch * 2);
      perf = `타율 ${(l.AB ? l.H / l.AB : 0).toFixed(3).replace(/^0/, '')} ${l.HR}홈런 ${l.RBI}타점`;
      great = opsOf(l) > 1.0;
    } else {
      const l = emptyPit();
      const pr = pitProbs(c.pit, 67, c.pitPos !== 'SP');
      for (let i = 0; i < 3; i++) simPitchApp(l, pr, c.pitPos === 'SP' ? 15 : 3, rng);
      finishPitchingHalf(l, emptyPit(), c.hidden.clutch, rng);
      const era = l.outs ? (l.ER * 27) / l.outs : 0;
      perf = `${Math.floor(l.outs / 3)}이닝 평균자책점 ${era.toFixed(2)} ${l.SO}탈삼진`;
      great = era < 1.5;
    }
    parts.push(`${t.name} 국가대표 · ${label} (${perf})`);
    if (medal) c.national.medals.push(`${t.name} ${medal}`);
    if (medal === '금메달' && great && rng.chance(0.4)) {
      rec.awards.push({ year: c.year, key: 'INTL_MVP', label: `${t.name} MVP`, league: 'INTL' });
    }
    adjust(c, 'fame', medal === '금메달' ? 8 : 3);
    c.log.push({
      year: c.year,
      age: c.age,
      text: `${t.name} 국가대표로 출전 · ${label}`,
      tone: medal === '금메달' ? 'big' : 'info',
    });
    const exempt = c.nationality === 'KR' && ((t.key === 'AG' && medal === '금메달') || (t.key === 'OLY' && medal !== null));
    if (exempt && c.military.status !== 'done' && c.military.status !== 'exempt') {
      const serving = c.military.status === 'serving';
      if (serving) discharge(c);
      c.military.status = 'exempt';
      c.log.push({ year: c.year, age: c.age, text: serving ? '병역 특례로 조기 전역했습니다!' : '병역 특례 혜택을 받았습니다!', tone: 'big' });
    }
  }
  if (parts.length) rec.international = parts.join(' / ');
}

export function simulateSeason(c: Career, rng: Rng): SeasonRecord {
  const rec: SeasonRecord = {
    year: c.year,
    age: c.age,
    lines: [],
    majorWar: 0,
    awards: [],
    allStar: false,
    teamResult: '',
    champion: false,
    ovrStart: overall(c),
    ovrEnd: 0,
    injuries: [],
    notes: [],
    salaryKRW: 0,
  };
  const st: SeasonState = {
    inc: {},
    form: rng.normal(0, 2) + (c.morale - 50) / 25 + (c.flags.motivated ? 1.5 : 0),
    teamRating: rng.normal(0, 1),
    callup: 0,
    majorHalves: 0,
    majorAtEnd: false,
    lines: new Map(),
    lineRole: new Map(),
    ptBat: 0,
    ptPit: 0,
  };
  delete c.flags.motivated;
  const startCountry = countryOfTeam(c.teamId);
  const startedServing = c.military.status === 'serving';

  playHalf(c, rec, st, 0, rng);
  midSeason(c, rec, st, rng);
  if (c.military.status === 'serving' && c.military.kind === 'sangmu' && (c.military.halvesLeft ?? 0) <= 0) discharge(c);
  playHalf(c, rec, st, 1, rng);
  if (c.military.status === 'serving' && c.military.kind === 'sangmu' && (c.military.halvesLeft ?? 0) <= 0) discharge(c);

  for (const l of st.lines.values()) {
    const L = LEAGUES[l.level];
    if (l.bat) l.batWar = battingWar(l.bat, c.bat, c.batPos, L.avg, L.games);
    if (l.pit) l.pitWar = pitchingWar(l.pit, st.lineRole.get(`${l.level}|${l.teamId}`) ?? 'SP');
    rec.lines.push(l);
  }
  rec.majorWar = Math.round(rec.lines.filter((l) => isMajor(l.level)).reduce((s, l) => s + l.batWar + l.pitWar, 0) * 10) / 10;

  postseason(c, rec, st, rng);
  awards(c, rec, st, rng);
  international(c, rec, rng);
  for (const a of rec.awards) c.awards.push(a as Award);
  if (rec.awards.length) adjust(c, 'fame', 3 * rec.awards.length);
  const mvp = rec.awards.find((a) => a.key === 'MVP');
  if (mvp) c.log.push({ year: c.year, age: c.age, text: `${mvp.label} 수상!`, tone: 'big' });

  // 연봉 지급
  if (c.contract && !startedServing) {
    const krw = toKRW(c.contract.salary, c.contract.currency);
    c.moneyKRW += krw;
    c.earningsKRW += krw;
    rec.salaryKRW = krw;
  } else if (startedServing) {
    c.moneyKRW += 20_000_000;
    c.earningsKRW += 20_000_000;
    rec.salaryKRW = 20_000_000;
  }
  c.moneyKRW -= Math.round(Math.max(0, c.moneyKRW) * 0.02); // 생활비

  // 서비스 타임 (FA 자격 일수)
  if (startCountry && !startedServing) {
    if (startCountry === 'US') c.service.US += st.majorHalves * 0.5;
    else if (st.majorHalves >= 2) c.service[startCountry as Country] += 1;
  }

  // 인기
  adjust(c, 'fame', Math.max(-3, Math.min(8, rec.majorWar * 1.5)) - (rec.majorWar <= 0 ? 1 : 0));

  // 성장
  const pt = c.role === 'batter' ? st.ptBat : c.role === 'pitcher' ? st.ptPit : (st.ptBat + st.ptPit) / 2;
  let mul = Number(c.flags.growthBoost ?? 1);
  delete c.flags.growthBoost;
  if (rec.military === '현역 복무') mul *= 0.2;
  const g = applyGrowth(c, pt, rng, mul);
  if (rec.military === '현역 복무') {
    for (const k of ['speed', 'contact', 'velocity', 'control'] as const) addRating(c, k, -0.8);
  }
  rec.ovrEnd = overall(c);
  c.peakOvr = Math.max(c.peakOvr, rec.ovrEnd);
  if (g.after - g.before >= 4) c.log.push({ year: c.year, age: c.age, text: `한 단계 성장했습니다! 오버롤 ${g.before} → ${g.after}`, tone: 'good' });

  // 컨디션 / 멘탈 회복
  const rest = c.training.focus === 'rest';
  c.condition = clamp(Math.round(70 + (c.condition - 70) * 0.4 + (rest ? 15 : 0) - (c.training.intensity === 3 ? 8 : 0) + rng.normal(0, 5)), 20, 100);
  c.morale = clamp(Math.round(c.morale + (rec.majorWar > 3 ? 6 : rec.majorWar < 0 ? -4 : 0) + (rec.awards.length ? 5 : 0) + (rec.injuries.length ? -5 : 0) + (50 - c.morale) * 0.15), 0, 100);
  c.trust = clamp(Math.round(c.trust + (rec.majorWar > 2 ? 5 : rec.majorWar < 0 ? -3 : 1)), 0, 100);
  return rec;
}
