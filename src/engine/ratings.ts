import { BAT_KEYS, BAT_WEIGHTS, PIT_KEYS, PIT_WEIGHTS } from './data';
import { clamp, type Rng } from './rng';
import type { BatPos, BatRatings, Career, PitPos, PitRatings, RatingKey } from './types';

export function batOvr(r: BatRatings, pos: BatPos): number {
  const w = BAT_WEIGHTS[pos];
  return Math.round(BAT_KEYS.reduce((s, k) => s + r[k] * w[k], 0));
}

export function pitOvr(r: PitRatings, pos: PitPos): number {
  const w = PIT_WEIGHTS[pos];
  return Math.round(PIT_KEYS.reduce((s, k) => s + r[k] * w[k], 0));
}

export function combineTwoWay(b: number, p: number): number {
  return Math.round(Math.max(b, p) + 0.3 * Math.max(0, Math.min(b, p) - 50));
}

export function overall(c: Pick<Career, 'role' | 'bat' | 'pit' | 'batPos' | 'pitPos'>): number {
  if (c.role === 'batter') return batOvr(c.bat, c.batPos);
  if (c.role === 'pitcher') return pitOvr(c.pit, c.pitPos);
  return combineTwoWay(batOvr(c.bat, c.batPos), pitOvr(c.pit, c.pitPos));
}

export function isBatKey(k: RatingKey): k is keyof BatRatings {
  return (BAT_KEYS as string[]).includes(k);
}

export function addRating(c: Career, key: RatingKey, delta: number) {
  if (isBatKey(key)) c.bat[key] = clamp(Math.round((c.bat[key] + delta) * 10) / 10, 15, 99);
  else c.pit[key] = clamp(Math.round((c.pit[key] + delta) * 10) / 10, 15, 99);
}

export function gradeOf(v: number): string {
  if (v >= 90) return 'S';
  if (v >= 84) return 'A+';
  if (v >= 78) return 'A';
  if (v >= 73) return 'B+';
  if (v >= 68) return 'B';
  if (v >= 63) return 'C+';
  if (v >= 58) return 'C';
  return 'D';
}

export function velocityKmh(v: number): number {
  return Math.round(125 + v * 0.36);
}

// 연간 성장/노화. 성장 폭(dOvr)을 계산한 다음 능력치별로 나눠 준다.
// 훈련 집중 능력치는 두 배로 받는다.
export function applyGrowth(c: Career, ptShare: number, rng: Rng, growthMul = 1): { before: number; after: number } {
  const before = overall(c);
  const age = c.age;
  const h = c.hidden;
  let typeMul = 1;
  if (h.growthType === 'early') typeMul = age <= 22 ? 1.3 : age >= 26 ? 0.75 : 1;
  if (h.growthType === 'late') typeMul = age <= 22 ? 0.8 : age >= 24 && age <= 30 ? 1.35 : 1;
  const rate = age <= 20 ? 0.24 : age <= 23 ? 0.21 : age <= 26 ? 0.16 : age <= 29 ? 0.08 : age <= 31 ? 0.03 : 0;
  const intensity = c.training.intensity === 3 ? 1.2 : c.training.intensity === 1 ? 0.85 : 1;
  const rest = c.training.focus === 'rest' ? 0.7 : 1;
  const pt = 0.55 + 0.45 * clamp(ptShare, 0, 1);
  const gap = h.potential - before;
  let delta = Math.max(0, gap) * rate * typeMul * intensity * rest * pt * h.workEthic * growthMul;
  delta += rng.normal(0, 0.8);
  if (gap < -2) delta = Math.min(delta, 0.5);

  // 노화
  const peakEnd = h.growthType === 'late' ? 33 : h.growthType === 'early' ? 29 : 31;
  if (age > peakEnd) {
    const yrs = age - peakEnd;
    const decline = (0.3 + yrs * 0.3 + (age >= 35 ? (age - 34) * 0.7 : 0)) * h.durability;
    delta -= decline * (c.training.focus === 'rest' ? 0.85 : 1) + Math.max(0, rng.normal(0, 0.4));
  }

  distribute(c, delta, rng, age > peakEnd);
  const after = overall(c);
  return { before, after };
}

function distribute(c: Career, delta: number, rng: Rng, aging: boolean) {
  const focus = c.training.focus;
  const sets: ('bat' | 'pit')[] = c.role === 'batter' ? ['bat'] : c.role === 'pitcher' ? ['pit'] : ['bat', 'pit'];
  const share = sets.length === 2 ? 0.7 : 1;
  for (const set of sets) {
    const keys = set === 'bat' ? BAT_KEYS : PIT_KEYS;
    const w: Record<string, number> =
      set === 'bat' ? (BAT_WEIGHTS[c.batPos] as Record<string, number>) : (PIT_WEIGHTS[c.pitPos] as Record<string, number>);
    const alloc: Record<string, number> = {};
    for (const k of keys) {
      let a = 1;
      if (!aging && focus === k) a = 2.4;
      if (aging) {
        if (k === 'speed' || k === 'velocity') a = 1.6;
        if (k === 'eye' || k === 'control' || k === 'composure') a = 0.5;
        if (k === 'power' || k === 'stuff') a = 0.9;
      }
      alloc[k] = a * rng.range(0.6, 1.4);
    }
    const denom = keys.reduce((s, k) => s + (w[k] || 0.05) * alloc[k], 0);
    for (const k of keys) {
      const inc = (delta * share * alloc[k]) / denom;
      addRating(c, k, inc);
    }
  }
}
