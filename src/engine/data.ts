import type { BatKey, BatPos, Country, Currency, Level, Nationality, PitKey, PitPos } from './types';

// 모든 구단, 리그 명칭은 가상의 설정이다. 실존 구단과 무관하다.

export interface LeagueDef {
  id: Level;
  name: string;
  short: string;
  country: Country | null;
  avg: number; // 해당 리그 주전 평균 오버롤
  games: number;
  major: boolean;
}

export const LEAGUES: Record<Level, LeagueDef> = {
  AMA: { id: 'AMA', name: '고교 야구', short: '고교', country: null, avg: 40, games: 0, major: false },
  COL: { id: 'COL', name: '대학리그', short: '대학', country: null, avg: 46, games: 40, major: false },
  KR1: { id: 'KR1', name: '한국 프로리그', short: '한국 1군', country: 'KR', avg: 62, games: 144, major: true },
  KR2: { id: 'KR2', name: '한국 퓨처스리그', short: '퓨처스', country: 'KR', avg: 51, games: 108, major: false },
  JP1: { id: 'JP1', name: '일본 프로리그', short: '일본 1군', country: 'JP', avg: 66, games: 143, major: true },
  JP2: { id: 'JP2', name: '일본 2군 리그', short: '일본 2군', country: 'JP', avg: 54, games: 120, major: false },
  MLB: { id: 'MLB', name: '미국 빅리그', short: '빅리그', country: 'US', avg: 71, games: 162, major: true },
  AAA: { id: 'AAA', name: '트리플A', short: 'AAA', country: 'US', avg: 61, games: 150, major: false },
  AA: { id: 'AA', name: '더블A', short: 'AA', country: 'US', avg: 55, games: 138, major: false },
  A: { id: 'A', name: '싱글A', short: 'A', country: 'US', avg: 48, games: 132, major: false },
  MIL: { id: 'MIL', name: '군 복무', short: '군복무', country: 'KR', avg: 0, games: 0, major: false },
};

export const MAJOR_OF: Record<Country, Level> = { KR: 'KR1', JP: 'JP1', US: 'MLB' };

export interface TeamDef {
  id: string;
  name: string;
  country: Country | 'NONE';
  color: string;
}

export const TEAMS: TeamDef[] = [
  { id: 'kr-blazers', name: '서울 블레이저스', country: 'KR', color: '#1f4e9c' },
  { id: 'kr-comets', name: '서울 코메츠', country: 'KR', color: '#8a1538' },
  { id: 'kr-seahawks', name: '인천 씨호크스', country: 'KR', color: '#c8102e' },
  { id: 'kr-storm', name: '수원 스톰', country: 'KR', color: '#222222' },
  { id: 'kr-thunder', name: '대전 썬더볼츠', country: 'KR', color: '#f37321' },
  { id: 'kr-sunrise', name: '광주 썬라이즈', country: 'KR', color: '#d71920' },
  { id: 'kr-redhorns', name: '대구 레드혼즈', country: 'KR', color: '#0d4ea6' },
  { id: 'kr-oceans', name: '부산 오션스', country: 'KR', color: '#03256c' },
  { id: 'kr-irons', name: '창원 아이언즈', country: 'KR', color: '#315288' },
  { id: 'kr-falcons', name: '고양 팔콘스', country: 'KR', color: '#5a2d82' },
  { id: 'jp-skylarks', name: '도쿄 스카이라크스', country: 'JP', color: '#e05a00' },
  { id: 'jp-ravens', name: '도쿄 레이븐스', country: 'JP', color: '#13294b' },
  { id: 'jp-harbors', name: '요코하마 하버즈', country: 'JP', color: '#0055a5' },
  { id: 'jp-castle', name: '나고야 골든캐슬', country: 'JP', color: '#b8860b' },
  { id: 'jp-blaze', name: '오사카 블레이즈', country: 'JP', color: '#ffd200' },
  { id: 'jp-rivers', name: '히로시마 리버스', country: 'JP', color: '#cf2027' },
  { id: 'jp-strikers', name: '후쿠오카 스트라이커즈', country: 'JP', color: '#f5c400' },
  { id: 'jp-wolves', name: '삿포로 스노우울브즈', country: 'JP', color: '#004b8d' },
  { id: 'us-skyliners', name: '뉴욕 스카이라이너스', country: 'US', color: '#0c2340' },
  { id: 'us-harborhawks', name: '보스턴 하버호크스', country: 'US', color: '#bd3039' },
  { id: 'us-sunsets', name: 'LA 선셋츠', country: 'US', color: '#005a9c' },
  { id: 'us-foghorns', name: '샌프란시스코 포그혼즈', country: 'US', color: '#fd5a1e' },
  { id: 'us-windies', name: '시카고 윈디스', country: 'US', color: '#0e3386' },
  { id: 'us-lonestars', name: '텍사스 론스타즈', country: 'US', color: '#003278' },
  { id: 'us-rainiers', name: '시애틀 레이니어스', country: 'US', color: '#005c5c' },
  { id: 'us-peaches', name: '애틀랜타 피치스', country: 'US', color: '#ce1141' },
  { id: 'us-northstars', name: '토론토 노스스타즈', country: 'US', color: '#134a8e' },
  { id: 'us-waves', name: '샌디에이고 웨이브즈', country: 'US', color: '#2f241d' },
  { id: 'us-flamingos', name: '마이애미 플라밍고스', country: 'US', color: '#ef3340' },
  { id: 'us-orbiters', name: '휴스턴 오비터스', country: 'US', color: '#eb6e1f' },
  { id: 'kr-military', name: '국군체육부대', country: 'NONE', color: '#4b5320' },
  { id: 'col-kr', name: '한빛대학교', country: 'NONE', color: '#2e7d32' },
  { id: 'col-jp', name: '도요대학', country: 'NONE', color: '#2e7d32' },
  { id: 'col-us', name: '스테이트 대학', country: 'NONE', color: '#2e7d32' },
];

export const TEAM_MAP: Record<string, TeamDef> = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

export function teamName(id: string | null | undefined): string {
  if (!id) return '무소속';
  return TEAM_MAP[id]?.name ?? id;
}

export function teamsOf(country: Country): TeamDef[] {
  return TEAMS.filter((t) => t.country === country);
}

export const COUNTRY_NAME: Record<Country, string> = { KR: '한국', JP: '일본', US: '미국' };

export const NATIONALITIES: { id: Nationality; name: string; flag: string }[] = [
  { id: 'KR', name: '대한민국', flag: '🇰🇷' },
  { id: 'JP', name: '일본', flag: '🇯🇵' },
  { id: 'US', name: '미국', flag: '🇺🇸' },
  { id: 'TW', name: '대만', flag: '🇹🇼' },
  { id: 'DO', name: '도미니카공화국', flag: '🇩🇴' },
];

export const NAT_MAP = Object.fromEntries(NATIONALITIES.map((n) => [n.id, n])) as Record<
  Nationality,
  (typeof NATIONALITIES)[number]
>;

export const BAT_POS: BatPos[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
export const PIT_POS: PitPos[] = ['SP', 'RP', 'CL'];

export const POS_NAME: Record<BatPos | PitPos, string> = {
  C: '포수',
  '1B': '1루수',
  '2B': '2루수',
  '3B': '3루수',
  SS: '유격수',
  LF: '좌익수',
  CF: '중견수',
  RF: '우익수',
  DH: '지명타자',
  SP: '선발투수',
  RP: '중계투수',
  CL: '마무리투수',
};

export const BAT_KEYS: BatKey[] = ['contact', 'power', 'eye', 'speed', 'fielding', 'arm'];
export const PIT_KEYS: PitKey[] = ['velocity', 'control', 'stuff', 'breaking', 'stamina', 'composure'];

export const RATING_NAME: Record<BatKey | PitKey, string> = {
  contact: '컨택',
  power: '파워',
  eye: '선구안',
  speed: '주루',
  fielding: '수비',
  arm: '송구',
  velocity: '구속',
  control: '제구',
  stuff: '구위',
  breaking: '변화구',
  stamina: '체력',
  composure: '멘탈',
};

// 포지션별 오버롤 가중치 (합 1)
export const BAT_WEIGHTS: Record<BatPos, Record<BatKey, number>> = {
  C: { contact: 0.2, power: 0.15, eye: 0.1, speed: 0.05, fielding: 0.25, arm: 0.25 },
  '1B': { contact: 0.3, power: 0.35, eye: 0.2, speed: 0.05, fielding: 0.07, arm: 0.03 },
  '2B': { contact: 0.25, power: 0.12, eye: 0.13, speed: 0.15, fielding: 0.25, arm: 0.1 },
  '3B': { contact: 0.22, power: 0.25, eye: 0.12, speed: 0.06, fielding: 0.2, arm: 0.15 },
  SS: { contact: 0.2, power: 0.1, eye: 0.1, speed: 0.15, fielding: 0.3, arm: 0.15 },
  LF: { contact: 0.28, power: 0.28, eye: 0.16, speed: 0.12, fielding: 0.1, arm: 0.06 },
  CF: { contact: 0.22, power: 0.15, eye: 0.12, speed: 0.22, fielding: 0.2, arm: 0.09 },
  RF: { contact: 0.25, power: 0.27, eye: 0.13, speed: 0.1, fielding: 0.1, arm: 0.15 },
  DH: { contact: 0.35, power: 0.4, eye: 0.2, speed: 0.05, fielding: 0, arm: 0 },
};

export const PIT_WEIGHTS: Record<PitPos, Record<PitKey, number>> = {
  SP: { velocity: 0.18, control: 0.2, stuff: 0.2, breaking: 0.2, stamina: 0.15, composure: 0.07 },
  RP: { velocity: 0.25, control: 0.18, stuff: 0.25, breaking: 0.2, stamina: 0.04, composure: 0.08 },
  CL: { velocity: 0.25, control: 0.17, stuff: 0.25, breaking: 0.18, stamina: 0.02, composure: 0.13 },
};

// WAR 계산용 포지션 보정 (600타석당 득점)
export const POS_ADJ: Record<BatPos, number> = {
  C: 12,
  SS: 7,
  '2B': 3,
  '3B': 2,
  CF: 2.5,
  LF: -7,
  RF: -7,
  '1B': -12,
  DH: -17,
};
export const FIELD_SCALE: Record<BatPos, [number, number]> = {
  C: [4, 4],
  '1B': [2, 0.5],
  '2B': [6, 0.5],
  '3B': [5, 2],
  SS: [8, 2],
  LF: [3, 1],
  CF: [7, 1.5],
  RF: [3, 3],
  DH: [0, 0],
};

export const TO_KRW: Record<Currency, number> = { KRW: 1, JPY: 9.3, USD: 1400 };
export const CURRENCY_OF: Record<Country, Currency> = { KR: 'KRW', JP: 'JPY', US: 'USD' };
export const MIN_SALARY: Record<Currency, number> = { KRW: 30_000_000, JPY: 4_400_000, USD: 800_000 };

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
    return `$${Math.round(amount / 1000)}K`;
  }
  if (currency === 'JPY') {
    if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억 엔`;
    return `${Math.round(amount / 10_000).toLocaleString()}만 엔`;
  }
  return formatKRW(amount);
}

export function formatKRW(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const a = Math.abs(amount);
  if (a >= 100_000_000) {
    const eok = Math.floor(a / 100_000_000);
    const man = Math.round((a % 100_000_000) / 10_000_000) * 1000;
    return `${sign}${eok.toLocaleString()}억${man ? ` ${man}만` : ''}원`;
  }
  return `${sign}${Math.round(a / 10_000).toLocaleString()}만원`;
}

// 리그별 타이틀 1위 기록 분포 [평균, 표준편차]
export interface Thresholds {
  AVG: [number, number];
  HR: [number, number];
  RBI: [number, number];
  SB: [number, number];
  H: [number, number];
  W: [number, number];
  ERA: [number, number];
  SO: [number, number];
  SV: [number, number];
  HLD: [number, number];
  MVP: [number, number];
  ROY: [number, number];
  POS: [number, number];
  PITCHER: [number, number];
}

export const THRESHOLDS: Record<'KR1' | 'JP1' | 'MLB', Thresholds> = {
  KR1: {
    AVG: [0.345, 0.012],
    HR: [36, 5],
    RBI: [112, 10],
    SB: [42, 8],
    H: [182, 9],
    W: [15.5, 1.5],
    ERA: [2.6, 0.3],
    SO: [185, 18],
    SV: [35, 4],
    HLD: [30, 4],
    MVP: [7.5, 1.0],
    ROY: [2.4, 0.8],
    POS: [4.0, 1.0],
    PITCHER: [5.5, 1.0],
  },
  JP1: {
    AVG: [0.33, 0.012],
    HR: [33, 5],
    RBI: [100, 10],
    SB: [32, 7],
    H: [170, 9],
    W: [14, 1.5],
    ERA: [2.0, 0.3],
    SO: [170, 18],
    SV: [37, 4],
    HLD: [36, 5],
    MVP: [6.5, 1.0],
    ROY: [2.6, 0.8],
    POS: [3.8, 1.0],
    PITCHER: [5.5, 1.0],
  },
  MLB: {
    AVG: [0.33, 0.012],
    HR: [46, 5],
    RBI: [120, 10],
    SB: [45, 10],
    H: [200, 10],
    W: [17, 1.5],
    ERA: [2.6, 0.3],
    SO: [240, 20],
    SV: [40, 4],
    HLD: [32, 4],
    MVP: [8.0, 1.2],
    ROY: [3.8, 1.0],
    POS: [4.5, 1.0],
    PITCHER: [6.5, 1.0],
  },
};

export interface LeagueAwardNames {
  pos: string;
  def: string;
  series: string;
  seriesMvp: string;
  pitcher?: string;
}

export const AWARD_NAMES: Record<'KR1' | 'JP1' | 'MLB', LeagueAwardNames> = {
  KR1: { pos: '골든글러브', def: '수비상', series: '한국시리즈', seriesMvp: '한국시리즈 MVP' },
  JP1: { pos: '베스트 나인', def: '골든글러브', series: '일본시리즈', seriesMvp: '일본시리즈 MVP' },
  MLB: { pos: '최우수 타자상', def: '골드글러브', series: '월드시리즈', seriesMvp: '월드시리즈 MVP', pitcher: '최우수 투수상' },
};

// 국제대회. 시즌이 끝난 뒤 오프시즌에 처리한다.
export interface Tournament {
  key: 'P12' | 'OLY' | 'WBC' | 'AG';
  name: string;
}

export function tournamentsAfterSeason(year: number): Tournament[] {
  const list: Tournament[] = [];
  if ((year - 2027) % 4 === 0) list.push({ key: 'P12', name: `${year} 프리미어12` });
  if (year === 2028) list.push({ key: 'OLY', name: '2028 LA 올림픽' });
  if ((year - 2028) % 4 === 0 && year >= 2028) list.push({ key: 'WBC', name: `${year + 1} 월드 베이스볼 클래식` });
  if ((year - 2030) % 4 === 0 && year >= 2030) list.push({ key: 'AG', name: `${year} 아시안게임` });
  return list;
}

// 국가별 대회 성적 확률 [우승, 준우승, 3위]
export const NATION_STRENGTH: Record<Nationality, Record<Tournament['key'], [number, number, number]>> = {
  KR: { P12: [0.15, 0.15, 0.15], OLY: [0.15, 0.15, 0.2], WBC: [0.07, 0.08, 0.12], AG: [0.62, 0.25, 0.1] },
  JP: { P12: [0.35, 0.2, 0.15], OLY: [0.35, 0.2, 0.15], WBC: [0.3, 0.15, 0.15], AG: [0.25, 0.45, 0.2] },
  US: { P12: [0.15, 0.15, 0.15], OLY: [0.3, 0.2, 0.15], WBC: [0.28, 0.2, 0.15], AG: [0, 0, 0] },
  TW: { P12: [0.15, 0.15, 0.2], OLY: [0.1, 0.12, 0.15], WBC: [0.04, 0.06, 0.1], AG: [0.12, 0.3, 0.45] },
  DO: { P12: [0.12, 0.15, 0.15], OLY: [0.12, 0.15, 0.2], WBC: [0.22, 0.18, 0.15], AG: [0, 0, 0] },
};

export const START_YEAR = 2027;
