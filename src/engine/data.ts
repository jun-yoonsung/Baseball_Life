import type { BatKey, BatPos, Country, Currency, Level, Nationality, PitKey, PitPos } from './types';

// 실제 리그·구단 구성 (개인 플레이용). 엠블럼은 로고가 아닌 약칭 글자로만 그린다.

// 리그별 득점 환경. 삼진·볼넷·홈런 비율과 인플레이 타율(BABIP)을 보정한다.
export interface LeagueEnv {
  k: number;
  bb: number;
  hr: number;
  babip: number;
}

export interface LeagueDef {
  id: Level;
  name: string;
  short: string;
  country: Country | null;
  avg: number; // 해당 리그 주전 평균 오버롤
  games: number;
  major: boolean;
  env: LeagueEnv;
}

const ENV = (k: number, bb: number, hr: number, babip: number): LeagueEnv => ({ k, bb, hr, babip });

export const LEAGUES: Record<Level, LeagueDef> = {
  AMA: { id: 'AMA', name: '고교 야구', short: '고교', country: null, avg: 40, games: 0, major: false, env: ENV(1, 1, 1, 0) },
  COL: { id: 'COL', name: '대학 야구', short: '대학', country: null, avg: 46, games: 40, major: false, env: ENV(0.95, 1.1, 0.9, 0.01) },
  KR1: { id: 'KR1', name: 'KBO 리그', short: 'KBO', country: 'KR', avg: 62, games: 144, major: true, env: ENV(0.99, 1.04, 0.92, 0.008) },
  KR2: { id: 'KR2', name: 'KBO 퓨처스리그', short: '퓨처스', country: 'KR', avg: 51, games: 116, major: false, env: ENV(1, 1.1, 0.9, 0.015) },
  JP1: { id: 'JP1', name: 'NPB', short: 'NPB', country: 'JP', avg: 66, games: 143, major: true, env: ENV(1.1, 0.92, 0.6, -0.02) },
  JP2: { id: 'JP2', name: 'NPB 2군 (이스턴·웨스턴)', short: 'NPB 2군', country: 'JP', avg: 54, games: 120, major: false, env: ENV(1.02, 1, 0.8, -0.004) },
  MLB: { id: 'MLB', name: 'MLB', short: 'MLB', country: 'US', avg: 71, games: 162, major: true, env: ENV(1.22, 0.98, 1.1, -0.012) },
  AAA: { id: 'AAA', name: '트리플A', short: 'AAA', country: 'US', avg: 61, games: 150, major: false, env: ENV(1.15, 1.08, 1.12, 0.008) },
  AA: { id: 'AA', name: '더블A', short: 'AA', country: 'US', avg: 55, games: 138, major: false, env: ENV(1.2, 1.06, 0.95, 0) },
  A: { id: 'A', name: '싱글A', short: 'A', country: 'US', avg: 48, games: 132, major: false, env: ENV(1.25, 1.15, 0.75, 0.005) },
  MIL: { id: 'MIL', name: '군 복무', short: '군복무', country: 'KR', avg: 0, games: 0, major: false, env: ENV(1, 1, 1, 0) },
};

export const INTL_ENV = ENV(1.1, 1, 0.9, -0.005);

export const MAJOR_OF: Record<Country, Level> = { KR: 'KR1', JP: 'JP1', US: 'MLB' };

export type SubLeague = 'KBO' | 'CL' | 'PL' | 'AL' | 'NL';

export const SUBLEAGUE_NAME: Record<SubLeague, string> = {
  KBO: 'KBO 리그',
  CL: '센트럴리그',
  PL: '퍼시픽리그',
  AL: '아메리칸리그',
  NL: '내셔널리그',
};

export interface TeamDef {
  id: string;
  name: string;
  abbr: string;
  country: Country | 'NONE';
  color: string;
  sub?: SubLeague;
  div?: 'East' | 'Central' | 'West';
}

const T = (id: string, name: string, abbr: string, country: Country, color: string, sub: SubLeague, div?: TeamDef['div']): TeamDef => ({
  id,
  name,
  abbr,
  country,
  color,
  sub,
  div,
});

export const TEAMS: TeamDef[] = [
  T('kr-lg', 'LG 트윈스', 'LG', 'KR', '#c30452', 'KBO'),
  T('kr-kt', 'KT 위즈', 'KT', 'KR', '#231f20', 'KBO'),
  T('kr-ssg', 'SSG 랜더스', 'SSG', 'KR', '#ce0e2d', 'KBO'),
  T('kr-nc', 'NC 다이노스', 'NC', 'KR', '#315288', 'KBO'),
  T('kr-kia', 'KIA 타이거즈', 'KIA', 'KR', '#ea0029', 'KBO'),
  T('kr-samsung', '삼성 라이온즈', '삼성', 'KR', '#074ca1', 'KBO'),
  T('kr-doosan', '두산 베어스', '두산', 'KR', '#131230', 'KBO'),
  T('kr-lotte', '롯데 자이언츠', '롯데', 'KR', '#041e42', 'KBO'),
  T('kr-hanwha', '한화 이글스', '한화', 'KR', '#ff6600', 'KBO'),
  T('kr-kiwoom', '키움 히어로즈', '키움', 'KR', '#570514', 'KBO'),
  T('jp-giants', '요미우리 자이언츠', 'G', 'JP', '#f97709', 'CL'),
  T('jp-tigers', '한신 타이거스', 'T', 'JP', '#ffe201', 'CL'),
  T('jp-baystars', '요코하마 DeNA 베이스타스', 'DB', 'JP', '#0055a5', 'CL'),
  T('jp-carp', '히로시마 도요 카프', 'C', 'JP', '#e50012', 'CL'),
  T('jp-dragons', '주니치 드래건스', 'D', 'JP', '#002569', 'CL'),
  T('jp-swallows', '도쿄 야쿠르트 스왈로스', 'S', 'JP', '#072c58', 'CL'),
  T('jp-hawks', '후쿠오카 소프트뱅크 호크스', 'H', 'JP', '#f5c700', 'PL'),
  T('jp-buffaloes', '오릭스 버펄로스', 'B', 'JP', '#0b1c3d', 'PL'),
  T('jp-marines', '지바 롯데 마린스', 'M', 'JP', '#221815', 'PL'),
  T('jp-eagles', '도호쿠 라쿠텐 골든이글스', 'E', 'JP', '#85010f', 'PL'),
  T('jp-lions', '사이타마 세이부 라이온스', 'L', 'JP', '#1f366a', 'PL'),
  T('jp-fighters', '홋카이도 닛폰햄 파이터스', 'F', 'JP', '#006298', 'PL'),
  T('us-nyy', '뉴욕 양키스', 'NYY', 'US', '#0c2340', 'AL', 'East'),
  T('us-bos', '보스턴 레드삭스', 'BOS', 'US', '#bd3039', 'AL', 'East'),
  T('us-tor', '토론토 블루제이스', 'TOR', 'US', '#134a8e', 'AL', 'East'),
  T('us-tb', '탬파베이 레이스', 'TB', 'US', '#092c5c', 'AL', 'East'),
  T('us-bal', '볼티모어 오리올스', 'BAL', 'US', '#df4601', 'AL', 'East'),
  T('us-cle', '클리블랜드 가디언스', 'CLE', 'US', '#00385d', 'AL', 'Central'),
  T('us-det', '디트로이트 타이거스', 'DET', 'US', '#0c2340', 'AL', 'Central'),
  T('us-kc', '캔자스시티 로열스', 'KC', 'US', '#004687', 'AL', 'Central'),
  T('us-min', '미네소타 트윈스', 'MIN', 'US', '#002b5c', 'AL', 'Central'),
  T('us-cws', '시카고 화이트삭스', 'CWS', 'US', '#27251f', 'AL', 'Central'),
  T('us-hou', '휴스턴 애스트로스', 'HOU', 'US', '#eb6e1f', 'AL', 'West'),
  T('us-sea', '시애틀 매리너스', 'SEA', 'US', '#0c2c56', 'AL', 'West'),
  T('us-tex', '텍사스 레인저스', 'TEX', 'US', '#003278', 'AL', 'West'),
  T('us-laa', 'LA 에인절스', 'LAA', 'US', '#ba0021', 'AL', 'West'),
  T('us-ath', '애슬레틱스', 'ATH', 'US', '#003831', 'AL', 'West'),
  T('us-atl', '애틀랜타 브레이브스', 'ATL', 'US', '#ce1141', 'NL', 'East'),
  T('us-phi', '필라델피아 필리스', 'PHI', 'US', '#e81828', 'NL', 'East'),
  T('us-nym', '뉴욕 메츠', 'NYM', 'US', '#002d72', 'NL', 'East'),
  T('us-mia', '마이애미 말린스', 'MIA', 'US', '#00a3e0', 'NL', 'East'),
  T('us-wsh', '워싱턴 내셔널스', 'WSH', 'US', '#ab0003', 'NL', 'East'),
  T('us-mil', '밀워키 브루어스', 'MIL', 'US', '#12284b', 'NL', 'Central'),
  T('us-chc', '시카고 컵스', 'CHC', 'US', '#0e3386', 'NL', 'Central'),
  T('us-stl', '세인트루이스 카디널스', 'STL', 'US', '#c41e3a', 'NL', 'Central'),
  T('us-cin', '신시내티 레즈', 'CIN', 'US', '#c6011f', 'NL', 'Central'),
  T('us-pit', '피츠버그 파이리츠', 'PIT', 'US', '#27251f', 'NL', 'Central'),
  T('us-lad', 'LA 다저스', 'LAD', 'US', '#005a9c', 'NL', 'West'),
  T('us-sd', '샌디에이고 파드리스', 'SD', 'US', '#2f241d', 'NL', 'West'),
  T('us-sf', '샌프란시스코 자이언츠', 'SF', 'US', '#fd5a1e', 'NL', 'West'),
  T('us-ari', '애리조나 다이아몬드백스', 'ARI', 'US', '#a71930', 'NL', 'West'),
  T('us-col', '콜로라도 로키스', 'COL', 'US', '#33006f', 'NL', 'West'),
  { id: 'kr-military', name: '상무 피닉스', abbr: '상무', country: 'NONE', color: '#4b5320' },
  { id: 'col-kr', name: '대학 야구부', abbr: 'U', country: 'NONE', color: '#2e7d32' },
  { id: 'col-jp', name: '대학 야구부 (일본)', abbr: 'U', country: 'NONE', color: '#2e7d32' },
  { id: 'col-us', name: 'NCAA 대학 야구부', abbr: 'U', country: 'NONE', color: '#2e7d32' },
];

export const DIV_NAME: Record<NonNullable<TeamDef['div']>, string> = { East: '동부', Central: '중부', West: '서부' };

export const TEAM_MAP: Record<string, TeamDef> = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

export function teamName(id: string | null | undefined): string {
  if (!id) return '무소속';
  return TEAM_MAP[id]?.name ?? id;
}

export function teamsOf(country: Country): TeamDef[] {
  return TEAMS.filter((t) => t.country === country);
}

export function subLeagueOf(id: string | null | undefined): SubLeague | undefined {
  return id ? TEAM_MAP[id]?.sub : undefined;
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
  R: [number, number];
  OBP: [number, number];
  SLG: [number, number];
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
    R: [110, 9],
    OBP: [0.445, 0.015],
    SLG: [0.6, 0.03],
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
    R: [92, 9],
    OBP: [0.415, 0.015],
    SLG: [0.56, 0.03],
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
    R: [122, 10],
    OBP: [0.415, 0.012],
    SLG: [0.62, 0.03],
    MVP: [8.0, 1.2],
    ROY: [3.8, 1.0],
    POS: [4.5, 1.0],
    PITCHER: [6.5, 1.0],
  },
};

// 실제 수상 명칭
export function awardNames(lid: 'KR1' | 'JP1' | 'MLB', sub: SubLeague | undefined) {
  if (lid === 'KR1')
    return { mvp: 'KBO 정규시즌 MVP', roy: 'KBO 신인상', pos: 'KBO 골든글러브', def: 'KBO 수비상', series: '한국시리즈', seriesMvp: '한국시리즈 MVP', allStar: 'KBO 올스타' };
  if (lid === 'JP1') {
    const lg = sub === 'PL' ? '퍼시픽리그' : '센트럴리그';
    return { mvp: `${lg} MVP`, roy: `${lg} 신인왕`, pos: `${lg} 베스트나인`, def: `${lg} 골든글러브`, series: '일본시리즈', seriesMvp: '일본시리즈 MVP', allStar: 'NPB 올스타' };
  }
  const lg = sub === 'NL' ? 'NL' : 'AL';
  return {
    mvp: `${lg} MVP`,
    roy: `${lg} 신인왕`,
    pos: `${lg} 실버슬러거`,
    def: `${lg} 골드글러브`,
    series: '월드시리즈',
    seriesMvp: '월드시리즈 MVP',
    allStar: `${lg} 올스타`,
    cy: `${lg} 사이영상`,
    aaron: `${lg} 행크 애런상`,
    reliever: lg === 'AL' ? 'AL 마리아노 리베라상' : 'NL 트레버 호프먼상',
    lcsMvp: `${lg}CS MVP`,
  };
}

// 국제대회. 시즌이 끝난 뒤 오프시즌에 처리한다.
export interface Tournament {
  key: 'P12' | 'OLY' | 'WBC' | 'AG';
  name: string;
  year: number;
}

export function tournamentsAfterSeason(year: number): Tournament[] {
  const list: Tournament[] = [];
  if ((year - 2027) % 4 === 0) list.push({ key: 'P12', name: `${year} WBSC 프리미어12`, year });
  if (year === 2028) list.push({ key: 'OLY', name: '2028 LA 올림픽', year });
  if ((year - 2028) % 4 === 0 && year >= 2028) list.push({ key: 'WBC', name: `${year + 1} 월드 베이스볼 클래식(WBC)`, year: year + 1 });
  if ((year - 2030) % 4 === 0 && year >= 2030) list.push({ key: 'AG', name: `${year} 아시안게임`, year });
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
