// 타석 단위 확률 시뮬레이션.
// 능력치를 리그 평균과 비교한 z값으로 바꿔 각 결과의 확률을 정한다.
import { FIELD_SCALE, POS_ADJ } from './data';
import { clamp, type Rng } from './rng';
import type { BatPos, BatRatings, BattingLine, PitchingLine, PitRatings } from './types';

export interface PaProbs {
  k: number;
  bb: number;
  hbp: number;
  hr: number;
  s: number;
  d: number;
  t: number;
  out: number;
}

// 상위권은 수확 체감: 리그 평균보다 15 이상 높은 부분은 절반만 반영
const z = (v: number, avg: number) => {
  const raw = clamp((v - avg) / 10, -3.5, 4);
  return raw > 1.5 ? 1.5 + (raw - 1.5) * 0.5 : raw;
};

export function batProbs(b: BatRatings, avg: number): PaProbs {
  const zc = z(b.contact, avg);
  const zp = z(b.power, avg);
  const ze = z(b.eye, avg);
  const zs = z(b.speed, avg);
  const k = clamp(0.185 * Math.exp(-0.33 * zc - 0.12 * ze + 0.06 * zp), 0.04, 0.42);
  const bb = clamp(0.085 * Math.exp(0.3 * ze + 0.08 * zp), 0.025, 0.2);
  const hbp = 0.011;
  const hr = clamp(0.024 * Math.exp(0.55 * zp + 0.08 * zc), 0.0015, 0.09);
  const babip = clamp(0.31 + 0.018 * zc + 0.008 * zs, 0.22, 0.39);
  return split(k, bb, hbp, hr, babip, clamp(0.19 + 0.025 * zp + 0.008 * zs, 0.1, 0.32), clamp(0.025 + 0.012 * zs, 0.003, 0.07));
}

export function pitProbs(p: PitRatings, avg: number, reliever: boolean): PaProbs {
  const zv = z(p.velocity + (reliever ? 3 : 0), avg);
  const zc = z(p.control, avg);
  const zs = z(p.stuff + (reliever ? 2 : 0), avg);
  const zb = z(p.breaking, avg);
  const k = clamp(0.185 * Math.exp(0.22 * zv + 0.2 * zs + 0.2 * zb), 0.07, 0.42);
  const bb = clamp(0.085 * Math.exp(-0.42 * zc + 0.05 * zv), 0.025, 0.2);
  const hbp = clamp(0.011 * Math.exp(-0.2 * zc), 0.004, 0.02);
  const hr = clamp(0.024 * Math.exp(-0.28 * zs - 0.12 * zc - 0.1 * zv - 0.05 * zb), 0.008, 0.06);
  const babip = clamp(0.31 - 0.01 * zs - 0.004 * zb, 0.25, 0.35);
  return split(k, bb, hbp, hr, babip, 0.19, 0.025);
}

function split(k: number, bb: number, hbp: number, hr: number, babip: number, dShare: number, tShare: number): PaProbs {
  const inPlay = Math.max(0.2, 1 - k - bb - hbp - hr);
  const hits = inPlay * babip;
  return { k, bb, hbp, hr, d: hits * dShare, t: hits * tShare, s: hits * (1 - dShare - tShare), out: inPlay * (1 - babip) };
}

type Outcome = 'k' | 'bb' | 'hbp' | 'hr' | 's' | 'd' | 't' | 'out';
const ORDER: Outcome[] = ['k', 'bb', 'hbp', 'hr', 's', 'd', 't', 'out'];

function roll(p: PaProbs, rng: Rng): Outcome {
  let r = rng.next();
  for (const o of ORDER) {
    r -= p[o];
    if (r <= 0) return o;
  }
  return 'out';
}

export function emptyBat(): BattingLine {
  return { G: 0, PA: 0, AB: 0, H: 0, D: 0, T: 0, HR: 0, R: 0, RBI: 0, BB: 0, HBP: 0, SO: 0, SB: 0, CS: 0 };
}

export function emptyPit(): PitchingLine {
  return { G: 0, GS: 0, W: 0, L: 0, SV: 0, HLD: 0, outs: 0, BF: 0, H: 0, S1: 0, D: 0, T: 0, HR: 0, ER: 0, BB: 0, HBP: 0, SO: 0 };
}

export function simBatting(line: BattingLine, b: BatRatings, avg: number, games: number, pa: number, rng: Rng, form = 0) {
  const adj = { ...b, contact: b.contact + form, power: b.power + form, eye: b.eye + form / 2 };
  const p = batProbs(adj, avg);
  const zs = z(b.speed, avg);
  const att = clamp(0.035 * Math.exp(1.1 * zs), 0.004, 0.33);
  const succ = clamp(0.68 + 0.07 * zs, 0.45, 0.9);
  let s = 0;
  let d = 0;
  let t = 0;
  let hr = 0;
  let bb = 0;
  let hbp = 0;
  let k = 0;
  let outs = 0;
  for (let i = 0; i < pa; i++) {
    const o = roll(p, rng);
    if (o === 's') s++;
    else if (o === 'd') d++;
    else if (o === 't') t++;
    else if (o === 'hr') hr++;
    else if (o === 'bb') bb++;
    else if (o === 'hbp') hbp++;
    else if (o === 'k') k++;
    else outs++;
  }
  const onFirst = s + bb + hbp;
  let sb = 0;
  let cs = 0;
  for (let i = 0; i < onFirst; i++) {
    if (rng.chance(att)) {
      if (rng.chance(succ)) sb++;
      else cs++;
    }
  }
  const h = s + d + t + hr;
  line.G += games;
  line.PA += pa;
  line.AB += pa - bb - hbp;
  line.H += h;
  line.D += d;
  line.T += t;
  line.HR += hr;
  line.BB += bb;
  line.HBP += hbp;
  line.SO += k;
  line.SB += sb;
  line.CS += cs;
  const noise = () => rng.normal(1, 0.08);
  line.RBI += Math.max(0, Math.round((hr * 1.55 + t * 0.62 + d * 0.45 + s * 0.17 + (outs + k * 0.2) * 0.03) * noise()));
  line.R += Math.max(0, Math.round((hr + (s + bb + hbp) * 0.3 + d * 0.45 + t * 0.6 + sb * 0.12) * noise()));
}

export function simPitchApp(line: PitchingLine, p: PaProbs, targetOuts: number, rng: Rng) {
  let outs = 0;
  let baserunners = 0;
  while (outs < targetOuts) {
    const o = roll(p, rng);
    line.BF++;
    if (o === 'k') {
      line.SO++;
      outs++;
    } else if (o === 'out') outs++;
    else if (o === 'bb') {
      line.BB++;
      baserunners++;
    } else if (o === 'hbp') {
      line.HBP++;
      baserunners++;
    } else {
      line.H++;
      if (o === 's') line.S1++;
      if (o === 'd') line.D++;
      if (o === 't') line.T++;
      if (o === 'hr') line.HR++;
      baserunners++;
    }
    // 난타당하면 조기 강판
    if (baserunners >= 7 + Math.floor(outs / 3)) break;
  }
  line.outs += outs;
}

// BaseRuns 득점 추정
export function baseRuns(l: Pick<PitchingLine, 'H' | 'S1' | 'D' | 'T' | 'HR' | 'BB' | 'HBP' | 'outs'>): number {
  const tb = l.S1 + 2 * l.D + 3 * l.T + 4 * l.HR;
  const A = l.H + l.BB + l.HBP - l.HR;
  const B = (1.4 * tb - 0.6 * l.H - 3 * l.HR + 0.1 * (l.BB + l.HBP)) * 1.1;
  const C = l.outs;
  if (B + C <= 0) return l.HR;
  return (A * Math.max(0, B)) / (Math.max(0, B) + C) + l.HR;
}

// 리그 평균(z=0) 기준값. 모든 리그가 같은 기준을 쓴다.
const AVG_P = split(0.185, 0.085, 0.011, 0.024, 0.31, 0.19, 0.025);
export const LG_WOBA = woba({ s: AVG_P.s, d: AVG_P.d, t: AVG_P.t, hr: AVG_P.hr, bb: AVG_P.bb, hbp: AVG_P.hbp, pa: 1 });
export const LG_ERA = (() => {
  const outsPerPa = AVG_P.k + AVG_P.out;
  const bf = 27 / outsPerPa;
  const r = baseRuns({
    H: (AVG_P.s + AVG_P.d + AVG_P.t + AVG_P.hr) * bf,
    S1: AVG_P.s * bf,
    D: AVG_P.d * bf,
    T: AVG_P.t * bf,
    HR: AVG_P.hr * bf,
    BB: AVG_P.bb * bf,
    HBP: AVG_P.hbp * bf,
    outs: 27,
  });
  return r * ER_FACTOR();
})();

function ER_FACTOR() {
  return 0.9;
}

export function woba(x: { s: number; d: number; t: number; hr: number; bb: number; hbp: number; pa: number }): number {
  if (x.pa <= 0) return 0;
  return (0.69 * x.bb + 0.72 * x.hbp + 0.89 * x.s + 1.27 * x.d + 1.62 * x.t + 2.1 * x.hr) / x.pa;
}

export function battingWar(l: BattingLine, b: BatRatings, pos: BatPos, avg: number, seasonGames: number): number {
  if (l.PA === 0) return 0;
  const singles = l.H - l.D - l.T - l.HR;
  const w = woba({ s: singles, d: l.D, t: l.T, hr: l.HR, bb: l.BB, hbp: l.HBP, pa: l.PA });
  const batRuns = ((w - LG_WOBA) / 1.2) * l.PA;
  const runRuns = l.SB * 0.2 - l.CS * 0.4;
  const [fs, as] = FIELD_SCALE[pos];
  const share = Math.min(1, l.G / Math.max(1, seasonGames));
  const fieldRuns = (z(b.fielding, avg) * fs + z(b.arm, avg) * as) * share * 0.9;
  const posRuns = (POS_ADJ[pos] * l.PA) / 650;
  const repl = (20 * l.PA) / 600;
  return Math.round(((batRuns + runRuns + fieldRuns + posRuns + repl) / 10) * 10) / 10;
}

export function pitchingWar(l: PitchingLine, role: 'SP' | 'RP' | 'CL'): number {
  if (l.outs === 0) return 0;
  const ip = l.outs / 3;
  const era = (l.ER * 9) / ip;
  const repl = role === 'SP' ? LG_ERA * 1.25 : LG_ERA * 1.12;
  const leverage = role === 'CL' ? 1.6 : role === 'RP' ? 1.2 : 1;
  return Math.round((((repl - era) * ip) / 9 / 10) * leverage * 10) / 10;
}

export function finishPitchingHalf(
  line: PitchingLine,
  before: PitchingLine,
  composureZ: number,
  rng: Rng,
) {
  const d = {
    H: line.H - before.H,
    S1: line.S1 - before.S1,
    D: line.D - before.D,
    T: line.T - before.T,
    HR: line.HR - before.HR,
    BB: line.BB - before.BB,
    HBP: line.HBP - before.HBP,
    outs: line.outs - before.outs,
  };
  const runs = baseRuns(d) * ER_FACTOR() * (1 - 0.04 * composureZ) * rng.normal(1, 0.07);
  line.ER += Math.max(0, Math.round(runs));
}

export function zOf(v: number, avg: number) {
  return z(v, avg);
}
