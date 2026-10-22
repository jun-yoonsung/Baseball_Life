import { POS_NAME, teamName } from './data';
import { emptyBat, emptyPit } from './sim';
import type { BatTotals, BattingLine, Career, PitchingLine, PitTotals, RetiredSummary, SeasonLine } from './types';

const MAJOR = ['KR1', 'JP1', 'MLB'];

export function sumBat(lines: SeasonLine[]): BatTotals | undefined {
  const t = emptyBat();
  let any = false;
  for (const l of lines) {
    if (!l.bat) continue;
    any = true;
    for (const k of Object.keys(t) as (keyof BattingLine)[]) t[k] += l.bat[k];
  }
  return any ? batRates(t) : undefined;
}

export function batRates(t: BattingLine): BatTotals {
  const AVG = t.AB ? t.H / t.AB : 0;
  const OBP = t.PA ? (t.H + t.BB + t.HBP) / t.PA : 0;
  const SLG = t.AB ? (t.H + t.D + 2 * t.T + 3 * t.HR) / t.AB : 0;
  return { ...t, AVG, OBP, SLG, OPS: OBP + SLG };
}

export function sumPit(lines: SeasonLine[]): PitTotals | undefined {
  const t = emptyPit();
  let any = false;
  for (const l of lines) {
    if (!l.pit) continue;
    any = true;
    for (const k of Object.keys(t) as (keyof PitchingLine)[]) t[k] += l.pit[k];
  }
  return any ? pitRates(t) : undefined;
}

export function pitRates(t: PitchingLine): PitTotals {
  const ip = t.outs / 3;
  return {
    ...t,
    IP: ipString(t.outs),
    ERA: ip ? (t.ER * 9) / ip : 0,
    WHIP: ip ? (t.H + t.BB) / ip : 0,
  };
}

export function ipString(outs: number) {
  return `${Math.floor(outs / 3)}${outs % 3 ? `.${outs % 3}` : ''}`;
}

export const fmtAvg = (v: number) => v.toFixed(3).replace(/^0/, '');

export function majorLines(c: Career): SeasonLine[] {
  return c.seasons.flatMap((s) => s.lines.filter((l) => MAJOR.includes(l.level)));
}

export function careerWar(c: Career): number {
  return Math.round(c.seasons.reduce((s, r) => s + r.majorWar, 0) * 10) / 10;
}

export function countMvp(c: Career) {
  return c.awards.filter((a) => a.key === 'MVP').length;
}

export function countIndividual(c: Career) {
  return c.awards.filter((a) => a.key !== 'MVP').length;
}

export function buildSummary(c: Career): RetiredSummary {
  const lines = majorLines(c);
  const war = careerWar(c);
  const mvp = countMvp(c);
  const awardsCount = countIndividual(c);
  const majorSeasons = c.seasons.filter((s) => s.lines.some((l) => MAJOR.includes(l.level))).length;
  // 팀별 1군 시즌 수와 WAR
  const byTeam = new Map<string, { seasons: number; war: number }>();
  for (const s of c.seasons) {
    const seen = new Set<string>();
    for (const l of s.lines) {
      if (!MAJOR.includes(l.level)) continue;
      const e = byTeam.get(l.teamId) ?? { seasons: 0, war: 0 };
      if (!seen.has(l.teamId)) e.seasons++;
      seen.add(l.teamId);
      e.war += l.batWar + l.pitWar;
      byTeam.set(l.teamId, e);
    }
  }
  let retiredNumber: string | undefined;
  for (const [team, e] of byTeam) {
    if (e.seasons >= 10 && (e.war >= 35 || (c.rings >= 2 && e.war >= 25) || (mvp >= 1 && e.war >= 28))) retiredNumber = teamName(team);
  }
  const hallOfFame = war >= 55 || mvp >= 3 || (war >= 45 && awardsCount >= 10);
  const grade =
    war >= 80
      ? '레전드'
      : hallOfFame
        ? '명예의 전당'
        : war >= 35
          ? '프랜차이즈 스타'
          : war >= 20
            ? '주전급 베테랑'
            : war >= 5
              ? '1군 선수'
              : lines.length
                ? '1군 경험자'
                : '퓨처스 선수';
  const teams = [...new Set(c.teamHistory.map((t) => teamName(t.teamId)))];
  const primaryPos =
    c.role === 'batter' ? c.batPos : c.role === 'pitcher' ? c.pitPos : (sumBat(lines)?.PA ?? 0) > (sumPit(lines)?.outs ?? 0) * 1.3 ? c.batPos : c.pitPos;
  return {
    year: c.year - 1,
    age: c.age,
    seasons: c.seasons.length,
    majorSeasons,
    teams,
    bat: sumBat(lines),
    pit: sumPit(lines),
    war,
    peakOvr: c.peakOvr,
    mvp,
    awardsCount,
    rings: c.rings,
    allStars: c.allStars,
    hallOfFame,
    retiredNumber,
    earningsKRW: c.earningsKRW,
    primaryPos,
    grade,
  };
}

export function posLabel(p: string) {
  return POS_NAME[p as keyof typeof POS_NAME] ?? p;
}
