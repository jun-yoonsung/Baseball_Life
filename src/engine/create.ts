import { BAT_KEYS, PIT_KEYS, START_YEAR, TEAMS } from './data';
import { batOvr, overall, pitOvr } from './ratings';
import { clamp, Rng } from './rng';
import type {
  BatKey,
  BatPos,
  BatRatings,
  Career,
  Country,
  Hand,
  Hidden,
  Nationality,
  PitKey,
  PitPos,
  PitRatings,
  Role,
} from './types';

export const RATING_SUM = 270;

interface Archetype<K extends string> {
  name: string;
  desc: string;
  bias: Partial<Record<K, number>>;
}

export const BAT_ARCHETYPES: Archetype<BatKey>[] = [
  { name: '교타자', desc: '정확한 타격으로 안타를 생산합니다.', bias: { contact: 12, eye: 5, power: -6 } },
  { name: '거포', desc: '한 방으로 경기를 뒤집는 장타자.', bias: { power: 14, contact: -3, speed: -7 } },
  { name: '호타준족', desc: '치고 달리는 만능형.', bias: { contact: 5, power: 4, speed: 9, eye: -4 } },
  { name: '수비 장인', desc: '글러브로 팀을 지킵니다.', bias: { fielding: 13, arm: 6, power: -7 } },
  { name: '선구안', desc: '볼넷을 골라내는 출루 머신.', bias: { eye: 13, contact: 4, speed: -4 } },
  { name: '강견', desc: '레이저 송구의 소유자.', bias: { arm: 13, fielding: 4, contact: -4 } },
];

export const PIT_ARCHETYPES: Archetype<PitKey>[] = [
  { name: '파이어볼러', desc: '강속구로 타자를 압도합니다.', bias: { velocity: 14, stuff: 4, control: -7 } },
  { name: '제구 마스터', desc: '원하는 곳에 정확히 꽂아 넣습니다.', bias: { control: 14, composure: 3, velocity: -6 } },
  { name: '변화구 마술사', desc: '춤추는 변화구로 헛스윙을 유도.', bias: { breaking: 14, control: 3, velocity: -5 } },
  { name: '이닝이터', desc: '지치지 않는 철완.', bias: { stamina: 15, control: 3, stuff: -5 } },
  { name: '강심장', desc: '위기에서 더 강해지는 승부사.', bias: { composure: 13, stuff: 5, stamina: -5 } },
];

const POS_BAT_BIAS: Record<BatPos, Partial<Record<BatKey, number>>> = {
  C: { fielding: 4, arm: 6, speed: -6 },
  '1B': { power: 5, contact: 2, speed: -5, arm: -3 },
  '2B': { fielding: 4, speed: 3, power: -4 },
  '3B': { arm: 4, power: 3, speed: -3 },
  SS: { fielding: 6, arm: 3, power: -5 },
  LF: { contact: 2, power: 2, arm: -3 },
  CF: { speed: 7, fielding: 2, power: -4 },
  RF: { arm: 5, power: 3, speed: -2 },
  DH: { power: 6, contact: 4, fielding: -8, arm: -4 },
};

const POS_PIT_BIAS: Record<PitPos, Partial<Record<PitKey, number>>> = {
  SP: { stamina: 6, control: 2, velocity: -2 },
  RP: { velocity: 4, stuff: 3, stamina: -6 },
  CL: { velocity: 4, composure: 4, stamina: -8 },
};

function buildSet<K extends string>(
  keys: readonly K[],
  biases: Partial<Record<K, number>>[],
  rng: Rng,
  sum: number,
): Record<K, number> {
  const raw = {} as Record<K, number>;
  for (const k of keys) {
    let v = sum / keys.length;
    for (const b of biases) v += b[k] ?? 0;
    raw[k] = v + rng.normal(0, 3);
  }
  // 합계를 정확히 맞춘다
  const total = keys.reduce((s, k) => s + raw[k], 0);
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = clamp(Math.round(raw[k] + (sum - total) / keys.length), 22, 75);
  let diff = sum - keys.reduce((s, k) => s + out[k], 0);
  let i = 0;
  while (diff !== 0 && i < 200) {
    const k = keys[i % keys.length];
    const step = diff > 0 ? 1 : -1;
    if (out[k] + step >= 22 && out[k] + step <= 75) {
      out[k] += step;
      diff -= step;
    }
    i++;
  }
  return out;
}

export interface CreateInput {
  name: string;
  nationality: Nationality;
  startCountry: Country;
  role: Role;
  batPos: BatPos;
  pitPos: PitPos;
  bats: Hand;
  throws: 'R' | 'L';
}

export interface Candidate {
  id: string;
  style: string;
  styleDesc: string;
  bat: BatRatings;
  pit: PitRatings;
  hidden: Hidden;
  scoutPotential: number;
  ovr: number;
  batOvr: number;
  pitOvr: number;
  seed: number;
  traits: string[];
}

export function makeCandidates(input: CreateInput, seed: number, count = 3): Candidate[] {
  const rng = new Rng(seed);
  const list: Candidate[] = [];
  const batArch = [...BAT_ARCHETYPES].sort(() => rng.next() - 0.5);
  const pitArch = [...PIT_ARCHETYPES].sort(() => rng.next() - 0.5);
  for (let i = 0; i < count; i++) {
    const ba = batArch[i % batArch.length];
    const pa = pitArch[i % pitArch.length];
    const isBat = input.role !== 'pitcher';
    const isPit = input.role !== 'batter';
    const bat = buildSet(BAT_KEYS, isBat ? [ba.bias, POS_BAT_BIAS[input.batPos]] : [], rng, isBat ? RATING_SUM : 150) as BatRatings;
    const pit = buildSet(PIT_KEYS, isPit ? [pa.bias, POS_PIT_BIAS[input.pitPos]] : [], rng, isPit ? RATING_SUM : 150) as PitRatings;
    if (!isPit) {
      // 야수는 송구 능력에 따라 구속만 약간 반영
      pit.velocity = clamp(Math.round(bat.arm * 0.7 + 8), 22, 60);
    }
    const hidden: Hidden = {
      potential: Math.round(clamp(rng.normal(input.role === 'twoWay' ? 73 : 71, 8.5), 54, 95)),
      growthType: rng.weighted([
        ['early', 0.25],
        ['normal', 0.5],
        ['late', 0.25],
      ] as const),
      injuryProne: Math.round(clamp(rng.normal(input.role === 'twoWay' ? 1.15 : 1, 0.22), 0.55, 1.7) * 100) / 100,
      workEthic: Math.round(clamp(rng.normal(1, 0.08), 0.82, 1.18) * 100) / 100,
      clutch: Math.round(clamp(rng.normal(0, 0.5), -1, 1) * 100) / 100,
      durability: Math.round(clamp(rng.normal(1, 0.15), 0.65, 1.35) * 100) / 100,
    };
    const scoutPotential = Math.round(hidden.potential + rng.normal(0, 5));
    const traits: string[] = [];
    if (hidden.workEthic >= 1.08) traits.push('연습벌레');
    if (hidden.injuryProne <= 0.8) traits.push('강철 몸');
    if (hidden.injuryProne >= 1.3) traits.push('유리몸 주의');
    if (hidden.clutch >= 0.5) traits.push('클러치');
    if (hidden.clutch <= -0.5) traits.push('새가슴');
    const base = { role: input.role, bat, pit, batPos: input.batPos, pitPos: input.pitPos };
    list.push({
      id: `c${i}`,
      style: input.role === 'batter' ? ba.name : input.role === 'pitcher' ? pa.name : `${pa.name} · ${ba.name}`,
      styleDesc: input.role === 'batter' ? ba.desc : input.role === 'pitcher' ? pa.desc : '마운드와 타석을 모두 지배하는 이도류.',
      bat,
      pit,
      hidden,
      scoutPotential,
      ovr: overall(base),
      batOvr: batOvr(bat, input.batPos),
      pitOvr: pitOvr(pit, input.pitPos),
      seed: (rng.next() * 2 ** 32) >>> 0,
      traits,
    });
  }
  return list;
}

function initialStrength(seed: number): Record<string, number> {
  const rng = new Rng(seed ^ 0x5bd1e995);
  const out: Record<string, number> = {};
  for (const t of TEAMS) if (t.country !== 'NONE') out[t.id] = Math.round(rng.normal(0, 1) * 100) / 100;
  return out;
}

export function createCareer(input: CreateInput, cand: Candidate): Career {
  const c: Career = {
    version: 2,
    id: `${Date.now().toString(36)}-${cand.seed.toString(36)}`,
    seed: cand.seed,
    rngState: cand.seed,
    createdAt: Date.now(),
    name: input.name.trim() || '무명 선수',
    nationality: input.nationality,
    startCountry: input.startCountry,
    bats: input.bats,
    throws: input.throws,
    role: input.role,
    batPos: input.batPos,
    pitPos: input.pitPos,
    style: cand.style,
    bat: { ...cand.bat },
    pit: { ...cand.pit },
    hidden: { ...cand.hidden },
    scoutPotential: cand.scoutPotential,
    age: 18,
    year: START_YEAR,
    level: 'AMA',
    teamId: null,
    number: 0,
    contract: null,
    education: 'HS',
    collegeYears: 0,
    service: { KR: 0, JP: 0, US: 0 },
    faCount: 0,
    lastFaYear: null,
    military: { status: input.nationality === 'KR' ? 'none' : 'exempt' },
    condition: 80,
    morale: 60,
    trust: 50,
    fame: 5,
    moneyKRW: 0,
    earningsKRW: 0,
    seasons: [],
    awards: [],
    log: [],
    pending: [],
    phase: 'preseason',
    training: { focus: 'balanced', intensity: 2 },
    injury: null,
    flags: {},
    rookie: {
      KR1: { pa: 0, outs: 0, firstYear: null, won: false },
      JP1: { pa: 0, outs: 0, firstYear: null, won: false },
      MLB: { pa: 0, outs: 0, firstYear: null, won: false },
    },
    teamHistory: [],
    peakOvr: cand.ovr,
    rings: 0,
    allStars: 0,
    national: { caps: 0, medals: [] },
    callups: [],
    equipment: [],
    world: { strength: initialStrength(cand.seed) },
  };
  return c;
}
