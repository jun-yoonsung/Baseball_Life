export type Role = 'batter' | 'pitcher' | 'twoWay';
export type BatPos = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';
export type PitPos = 'SP' | 'RP' | 'CL';
export type Hand = 'R' | 'L' | 'S';
export type Country = 'KR' | 'JP' | 'US';
export type Nationality = 'KR' | 'JP' | 'US' | 'TW' | 'DO';
export type Currency = 'KRW' | 'JPY' | 'USD';
export type Level = 'AMA' | 'COL' | 'KR1' | 'KR2' | 'JP1' | 'JP2' | 'MLB' | 'AAA' | 'AA' | 'A' | 'MIL';

export interface BatRatings {
  contact: number;
  power: number;
  eye: number;
  speed: number;
  fielding: number;
  arm: number;
}

export interface PitRatings {
  velocity: number;
  control: number;
  stuff: number;
  breaking: number;
  stamina: number;
  composure: number;
}

export type BatKey = keyof BatRatings;
export type PitKey = keyof PitRatings;
export type RatingKey = BatKey | PitKey;

export type GrowthType = 'early' | 'normal' | 'late';

export interface Hidden {
  potential: number;
  growthType: GrowthType;
  injuryProne: number;
  workEthic: number;
  clutch: number;
  durability: number;
}

export interface BattingLine {
  G: number;
  PA: number;
  AB: number;
  H: number;
  D: number;
  T: number;
  HR: number;
  R: number;
  RBI: number;
  BB: number;
  HBP: number;
  SO: number;
  SB: number;
  CS: number;
}

export interface PitchingLine {
  G: number;
  GS: number;
  W: number;
  L: number;
  SV: number;
  HLD: number;
  outs: number;
  BF: number;
  H: number;
  S1: number;
  D: number;
  T: number;
  HR: number;
  ER: number;
  BB: number;
  HBP: number;
  SO: number;
}

export interface SeasonLine {
  level: Level;
  teamId: string;
  bat?: BattingLine;
  pit?: PitchingLine;
  batWar: number;
  pitWar: number;
}

export interface Award {
  year: number;
  key: string;
  label: string;
  league: string;
}

export interface SeasonRecord {
  year: number;
  age: number;
  lines: SeasonLine[];
  majorWar: number;
  awards: Award[];
  allStar: boolean;
  teamResult: string;
  champion: boolean;
  ovrStart: number;
  ovrEnd: number;
  injuries: string[];
  notes: string[];
  international?: string;
  salaryKRW: number;
  military?: string;
}

export interface Contract {
  teamId: string;
  years: number;
  salary: number;
  currency: Currency;
  type: 'rookie' | 'standard' | 'fa' | 'posting' | 'developmental' | 'minor' | 'arb' | 'military';
  signedYear: number;
  bonus: number;
}

export interface Offer {
  teamId: string;
  years: number;
  salary: number;
  currency: Currency;
  bonus: number;
  type: Contract['type'];
  note?: string;
  level?: Level;
}

export interface DecisionOption {
  id: string;
  label: string;
  desc?: string;
  disabled?: boolean;
}

export type DecisionKind =
  | 'draftChoice'
  | 'undrafted'
  | 'event'
  | 'fa'
  | 'posting'
  | 'postingOffers'
  | 'military'
  | 'retireSuggest'
  | 'released'
  | 'tommyJohn'
  | 'returnHome';

export interface Decision {
  id: string;
  kind: DecisionKind;
  title: string;
  body: string;
  options: DecisionOption[];
  data?: Record<string, unknown>;
}

export interface LogEntry {
  year: number;
  age: number;
  text: string;
  tone?: 'good' | 'bad' | 'info' | 'big';
}

export interface Injury {
  name: string;
  remaining: number;
}

export interface Military {
  status: 'none' | 'serving' | 'done' | 'exempt';
  kind?: 'sangmu' | 'active';
  halvesLeft?: number;
  returnTeamId?: string;
  returnLevel?: Level;
}

export interface RookieTrack {
  pa: number;
  outs: number;
  firstYear: number | null;
  won: boolean;
}

export interface BatTotals extends BattingLine {
  AVG: number;
  OBP: number;
  SLG: number;
  OPS: number;
}

export interface PitTotals extends PitchingLine {
  IP: string;
  ERA: number;
  WHIP: number;
}

export interface RetiredSummary {
  year: number;
  age: number;
  seasons: number;
  majorSeasons: number;
  teams: string[];
  bat?: BatTotals;
  pit?: PitTotals;
  war: number;
  peakOvr: number;
  mvp: number;
  awardsCount: number;
  rings: number;
  allStars: number;
  hallOfFame: boolean;
  retiredNumber?: string;
  earningsKRW: number;
  primaryPos: BatPos | PitPos;
  grade: string;
}

export interface Career {
  version: 1;
  id: string;
  seed: number;
  rngState: number;
  createdAt: number;
  name: string;
  nationality: Nationality;
  startCountry: Country;
  bats: Hand;
  throws: 'R' | 'L';
  role: Role;
  batPos: BatPos;
  pitPos: PitPos;
  style: string;
  bat: BatRatings;
  pit: PitRatings;
  hidden: Hidden;
  scoutPotential: number;
  age: number;
  year: number;
  level: Level;
  teamId: string | null;
  number: number;
  contract: Contract | null;
  education: 'HS' | 'COL';
  collegeYears: number;
  draft?: { year: number; label: string; teamId: string | null };
  service: Record<Country, number>;
  faCount: number;
  lastFaYear: number | null;
  military: Military;
  condition: number;
  morale: number;
  trust: number;
  fame: number;
  moneyKRW: number;
  earningsKRW: number;
  seasons: SeasonRecord[];
  awards: Award[];
  log: LogEntry[];
  pending: Decision[];
  phase: 'preseason' | 'retired';
  training: { focus: RatingKey | 'balanced' | 'rest'; intensity: 1 | 2 | 3 };
  injury: Injury | null;
  flags: Record<string, number | boolean | string>;
  rookie: Record<'KR1' | 'JP1' | 'MLB', RookieTrack>;
  teamHistory: { teamId: string; from: number; to: number | null }[];
  peakOvr: number;
  rings: number;
  allStars: number;
  national: { caps: number; medals: string[] };
  lastReport?: SeasonRecord;
  retired?: RetiredSummary;
  submitted?: boolean;
}
