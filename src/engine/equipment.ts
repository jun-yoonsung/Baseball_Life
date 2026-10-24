// 장비 상점: 돈을 써서 장비를 사면 장착 기간 동안 능력치 보정과 부상 감소 효과를 받는다.
import { isBatKey } from './ratings';
import type { Career, RatingKey } from './types';

export type Slot = 'bat' | 'batGlove' | 'wrist' | 'spikes' | 'glove' | 'guard' | 'care' | 'pitchLab';

export const SLOT_NAME: Record<Slot, string> = {
  bat: '배트',
  batGlove: '배팅 장갑',
  wrist: '아대 (손목 보호대)',
  spikes: '스파이크',
  glove: '글러브',
  guard: '보호대',
  care: '컨디셔닝',
  pitchLab: '피칭 랩',
};

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  tier: 1 | 2 | 3 | 4;
  price: number; // 원
  seasons: number;
  for: 'bat' | 'pit' | 'all';
  bonus: Partial<Record<RatingKey, number>>;
  injury?: number; // 부상 확률 배수 (0.9 = 10% 감소)
  condition?: number; // 시즌 시작 컨디션 보너스
  desc: string;
}

const MAN = 10_000;

export const ITEMS: Item[] = [
  { id: 'bat-ash', slot: 'bat', name: '애쉬 배트 묶음', tier: 1, price: 300 * MAN, seasons: 1, for: 'bat', bonus: { contact: 1 }, desc: '탄성이 좋아 정확한 타격에 유리한 물푸레나무 배트.' },
  { id: 'bat-birch', slot: 'bat', name: '버치 배트 묶음', tier: 2, price: 600 * MAN, seasons: 1, for: 'bat', bonus: { contact: 1, power: 1 }, desc: '애쉬와 메이플의 장점을 섞은 자작나무 배트.' },
  { id: 'bat-maple', slot: 'bat', name: '프로 메이플 배트', tier: 3, price: 1200 * MAN, seasons: 1, for: 'bat', bonus: { power: 2, contact: 1 }, desc: '단단한 단풍나무. 타구 속도가 빠릅니다.' },
  { id: 'bat-custom', slot: 'bat', name: '맞춤 제작 메이플 배트', tier: 4, price: 2500 * MAN, seasons: 1, for: 'bat', bonus: { power: 3, contact: 2 }, desc: '스윙 데이터에 맞춰 무게중심과 길이를 깎은 맞춤 배트.' },
  { id: 'bg-basic', slot: 'batGlove', name: '기본 배팅 장갑', tier: 1, price: 80 * MAN, seasons: 1, for: 'bat', bonus: { contact: 0.5 }, desc: '그립을 잡아 주는 기본 장갑.' },
  { id: 'bg-pro', slot: 'batGlove', name: '프로 배팅 장갑', tier: 2, price: 250 * MAN, seasons: 1, for: 'bat', bonus: { contact: 1 }, desc: '얇은 양가죽으로 배트 감각이 살아납니다.' },
  { id: 'bg-custom', slot: 'batGlove', name: '맞춤 배팅 장갑', tier: 3, price: 600 * MAN, seasons: 1, for: 'bat', bonus: { contact: 1, eye: 1 }, desc: '손 치수에 맞춘 장갑. 방망이를 끝까지 볼 여유가 생깁니다.' },
  { id: 'wr-basic', slot: 'wrist', name: '기본 아대', tier: 1, price: 50 * MAN, seasons: 2, for: 'all', bonus: {}, injury: 0.96, desc: '땀을 막고 손목을 감싸는 기본 아대.' },
  { id: 'wr-comp', slot: 'wrist', name: '압박 손목 아대', tier: 2, price: 200 * MAN, seasons: 2, for: 'all', bonus: { power: 1, stuff: 1 }, injury: 0.95, desc: '손목을 단단히 고정해 힘 전달이 좋아집니다.' },
  { id: 'wr-pro', slot: 'wrist', name: '프리미엄 손목 보호대', tier: 3, price: 500 * MAN, seasons: 2, for: 'all', bonus: { power: 1, contact: 1, stuff: 1 }, injury: 0.92, desc: '경량 패드로 사구와 염좌를 함께 막아 줍니다.' },
  { id: 'sp-basic', slot: 'spikes', name: '기본 징 스파이크', tier: 1, price: 150 * MAN, seasons: 1, for: 'all', bonus: { speed: 1, stamina: 0.5 }, desc: '흙 그라운드용 금속 징 스파이크.' },
  { id: 'sp-light', slot: 'spikes', name: '경량 스파이크', tier: 2, price: 400 * MAN, seasons: 1, for: 'all', bonus: { speed: 2, stamina: 1 }, desc: '무게를 줄여 첫걸음이 빨라집니다.' },
  { id: 'sp-custom', slot: 'spikes', name: '맞춤 스파이크', tier: 3, price: 900 * MAN, seasons: 1, for: 'all', bonus: { speed: 2, fielding: 1, stamina: 1, control: 1 }, desc: '발 모양을 본떠 만든 스파이크. 하체가 안정됩니다.' },
  { id: 'gl-ready', slot: 'glove', name: '기성품 글러브', tier: 1, price: 200 * MAN, seasons: 3, for: 'all', bonus: { fielding: 1, control: 0.5 }, desc: '매장에서 산 기성 글러브.' },
  { id: 'gl-order', slot: 'glove', name: '프로 오더 글러브', tier: 2, price: 800 * MAN, seasons: 3, for: 'all', bonus: { fielding: 2, control: 1 }, desc: '포지션과 손에 맞춰 주문한 글러브.' },
  { id: 'gl-craft', slot: 'glove', name: '장인 수제 글러브', tier: 3, price: 2000 * MAN, seasons: 3, for: 'all', bonus: { fielding: 3, arm: 1, control: 1, composure: 1 }, desc: '장인이 한 땀씩 꿰맨 글러브. 포구가 손에 붙습니다.' },
  { id: 'gd-basic', slot: 'guard', name: '팔꿈치·정강이 보호대', tier: 1, price: 150 * MAN, seasons: 3, for: 'bat', bonus: {}, injury: 0.9, desc: '사구와 파울 타구로 인한 부상을 줄입니다.' },
  { id: 'gd-pro', slot: 'guard', name: '맞춤 보호대 세트', tier: 2, price: 600 * MAN, seasons: 3, for: 'bat', bonus: { eye: 1 }, injury: 0.82, desc: '몸쪽 공에 겁먹지 않게 해 주는 맞춤 보호대.' },
  { id: 'gd-arm', slot: 'guard', name: '어깨·팔꿈치 케어 밴드', tier: 2, price: 600 * MAN, seasons: 3, for: 'pit', bonus: {}, injury: 0.82, desc: '투구 후 회복을 돕는 압박 밴드와 냉찜질 세트.' },
  { id: 'care-sleep', slot: 'care', name: '수면·회복 장비', tier: 2, price: 1000 * MAN, seasons: 1, for: 'all', bonus: {}, injury: 0.9, condition: 10, desc: '수면 분석기와 회복 장비. 시즌 내내 컨디션을 지킵니다.' },
  { id: 'care-wear', slot: 'care', name: '웨어러블 분석기', tier: 3, price: 1500 * MAN, seasons: 1, for: 'all', bonus: { eye: 1, control: 1 }, condition: 5, desc: '스윙·투구 동작을 측정해 매일 피드백합니다.' },
  { id: 'care-team', slot: 'care', name: '개인 트레이닝팀 계약', tier: 4, price: 5000 * MAN, seasons: 1, for: 'all', bonus: { speed: 1, stamina: 1 }, injury: 0.85, condition: 15, desc: '트레이너·영양사·물리치료사가 시즌 내내 붙습니다.' },
  { id: 'pl-weighted', slot: 'pitchLab', name: '가중구 훈련 세트', tier: 1, price: 800 * MAN, seasons: 1, for: 'pit', bonus: { velocity: 1 }, injury: 1.05, desc: '무거운 공과 가벼운 공으로 팔 스피드를 끌어올립니다.' },
  { id: 'pl-track', slot: 'pitchLab', name: '투구 추적 장비', tier: 3, price: 2000 * MAN, seasons: 1, for: 'pit', bonus: { stuff: 1, breaking: 1 }, desc: '회전수와 무브먼트를 측정해 구종을 다듬습니다.' },
  { id: 'pl-lab', slot: 'pitchLab', name: '피칭 랩 시즌 이용권', tier: 4, price: 4000 * MAN, seasons: 1, for: 'pit', bonus: { velocity: 1, stuff: 1, breaking: 1, control: 1 }, desc: '고속 카메라와 생체역학 분석으로 투구폼을 최적화합니다.' },
];

export const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function itemUsable(c: Pick<Career, 'role'>, item: Item) {
  if (item.for === 'all') return true;
  if (c.role === 'twoWay') return true;
  return (item.for === 'bat') === (c.role === 'batter');
}

// 현재 장비 보정 합계 (선수 역할에 맞는 능력치만)
export function equipmentBonus(c: Career): Partial<Record<RatingKey, number>> {
  const out: Partial<Record<RatingKey, number>> = {};
  for (const own of c.equipment ?? []) {
    const it = ITEM_MAP[own.id];
    if (!it || !itemUsable(c, it)) continue;
    for (const [k, v] of Object.entries(it.bonus) as [RatingKey, number][]) {
      const relevant = isBatKey(k) ? c.role !== 'pitcher' : c.role !== 'batter';
      if (relevant) out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

export function injuryMultiplier(c: Career) {
  return (c.equipment ?? []).reduce((m, o) => m * (ITEM_MAP[o.id]?.injury ?? 1), 1);
}

export function conditionBonus(c: Career) {
  return (c.equipment ?? []).reduce((s, o) => s + (ITEM_MAP[o.id]?.condition ?? 0), 0);
}

// 시즌 동안만 장비 보정을 능력치에 더했다가 빼 준다
export function applyEquipment(c: Career, sign: 1 | -1) {
  for (const [k, v] of Object.entries(equipmentBonus(c)) as [RatingKey, number][]) {
    if (isBatKey(k)) c.bat[k] = c.bat[k] + v * sign;
    else c.pit[k] = c.pit[k] + v * sign;
  }
}

export function buyItem(input: Career, itemId: string): Career {
  const it = ITEM_MAP[itemId];
  if (!it || input.phase === 'retired' || input.moneyKRW < it.price) return input;
  const c = structuredClone(input);
  c.moneyKRW -= it.price;
  c.equipment = (c.equipment ?? []).filter((o) => ITEM_MAP[o.id]?.slot !== it.slot);
  c.equipment.push({ id: it.id, seasonsLeft: it.seasons });
  c.log.push({ year: c.year, age: c.age, text: `[장비] ${it.name} 구입 (${Math.round(it.price / MAN).toLocaleString()}만원)`, tone: 'info' });
  return c;
}

// 시즌이 끝나면 사용 기간을 줄이고, 다 쓴 장비는 정리한다
export function wearEquipment(c: Career): string[] {
  const worn: string[] = [];
  c.equipment = (c.equipment ?? [])
    .map((o) => ({ ...o, seasonsLeft: o.seasonsLeft - 1 }))
    .filter((o) => {
      if (o.seasonsLeft > 0) return true;
      worn.push(ITEM_MAP[o.id]?.name ?? o.id);
      return false;
    });
  return worn;
}

export function grantItem(c: Career, itemId: string) {
  const it = ITEM_MAP[itemId];
  if (!it) return;
  c.equipment = (c.equipment ?? []).filter((o) => ITEM_MAP[o.id]?.slot !== it.slot);
  c.equipment.push({ id: it.id, seasonsLeft: it.seasons });
}

