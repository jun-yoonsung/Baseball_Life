import { CURRENCY_OF, MIN_SALARY, TEAM_MAP, teamName, teamsOf } from './data';
import { overall } from './ratings';
import { clamp, type Rng } from './rng';
import type { Career, Contract, Country, Currency, Level, Offer } from './types';

function ageFactor(age: number) {
  if (age <= 30) return 1;
  if (age <= 33) return 0.85;
  if (age <= 36) return 0.62;
  return 0.42;
}

// FA 시장 연봉 (현지 통화)
export function marketSalary(ovr: number, age: number, country: Country): number {
  const af = ageFactor(age);
  if (country === 'KR') return clamp(2e8 * Math.exp((ovr - 60) / 8) * af, MIN_SALARY.KRW, 3.5e9);
  if (country === 'JP') return clamp(4e7 * Math.exp((ovr - 63) / 8) * af, MIN_SALARY.JPY, 9e8);
  return clamp(1.5e6 * Math.exp((ovr - 64) / 5) * af, MIN_SALARY.USD, 5e7);
}

export function roundMoney(v: number, cur: Currency) {
  const unit = cur === 'USD' ? 50_000 : cur === 'JPY' ? 1_000_000 : 10_000_000;
  return Math.max(unit, Math.round(v / unit) * unit);
}

function yearsFor(age: number, ovr: number, country: Country, rng: Rng): number {
  let lo = 1;
  let hi = 2;
  if (age <= 28) [lo, hi] = [4, country === 'US' && ovr >= 78 ? 10 : 6];
  else if (age <= 31) [lo, hi] = [3, 5];
  else if (age <= 34) [lo, hi] = [1, 3];
  if (country === 'KR') hi = Math.min(hi, 6);
  return rng.int(lo, hi);
}

export function majorLevel(country: Country): Level {
  return country === 'KR' ? 'KR1' : country === 'JP' ? 'JP1' : 'MLB';
}

export function countryOfTeam(teamId: string | null): Country | null {
  if (!teamId) return null;
  const c = TEAM_MAP[teamId]?.country;
  return c === 'KR' || c === 'JP' || c === 'US' ? c : null;
}

export interface OfferContext {
  domestic: boolean;
  abroad: boolean;
  includeCurrent: boolean;
  minRole?: boolean;
}

export function makeOffers(c: Career, rng: Rng, ctx: OfferContext): Offer[] {
  const ovr = overall(c);
  const age = c.age;
  const home = countryOfTeam(c.teamId) ?? c.startCountry;
  const offers: Offer[] = [];
  const markets: Country[] = [];
  if (ctx.domestic) markets.push(home);
  if (ctx.abroad) for (const k of ['KR', 'JP', 'US'] as Country[]) if (k !== home) markets.push(k);
  for (const country of markets) {
    const need = country === 'US' ? 66 : country === 'JP' ? 64 : 52;
    if (ovr < need) continue;
    // 아시아 선수가 아닌데 한국/일본 구단의 외국인 선수 제안을 받으려면 실력이 확실해야 한다
    if (country !== home && country !== 'US' && ovr < 70) continue;
    const pool = teamsOf(country).filter((t) => t.id !== c.teamId);
    const interest = clamp((ovr - need) / 12 + 0.3, 0.15, 1) * (age >= 35 ? 0.6 : 1);
    const n = Math.min(pool.length, rng.binomial(country === home ? 4 : 3, interest));
    const picks = [...pool].sort(() => rng.next() - 0.5).slice(0, n);
    for (const t of picks) offers.push(buildOffer(c, t.id, country, ovr, rng));
  }
  if (ctx.includeCurrent && c.teamId && countryOfTeam(c.teamId)) {
    const country = countryOfTeam(c.teamId)!;
    if (ovr >= LEVEL_FLOOR[country] || age < 30) {
      const o = buildOffer(c, c.teamId, country, ovr, rng, 0.92);
      o.note = '원소속 구단 잔류 (구단 신뢰 상승)';
      offers.unshift(o);
    }
  }
  return offers;
}

const LEVEL_FLOOR: Record<Country, number> = { KR: 54, JP: 58, US: 62 };

function buildOffer(c: Career, teamId: string, country: Country, ovr: number, rng: Rng, mul = 1): Offer {
  const cur = CURRENCY_OF[country];
  const sal = roundMoney(marketSalary(ovr, c.age, country) * rng.range(0.85, 1.15) * mul, cur);
  const years = yearsFor(c.age, ovr, country, rng);
  const bonus = country === 'KR' ? roundMoney(sal * years * 0.35, cur) : country === 'JP' ? roundMoney(sal * 0.5, cur) : 0;
  const level: Level =
    country === 'US' && ovr < 69 ? 'AAA' : majorLevel(country);
  return {
    teamId,
    years,
    salary: sal,
    currency: cur,
    bonus,
    type: 'fa',
    level,
    note: country === 'US' && ovr < 69 ? '스플릿 계약 (마이너 시작 가능)' : undefined,
  };
}

export function describeOffer(o: Offer): string {
  return `${teamName(o.teamId)} · ${o.years}년`;
}

export function signContract(c: Career, o: Offer, rng: Rng) {
  const prevTeam = c.teamId;
  c.contract = {
    teamId: o.teamId,
    years: o.years,
    salary: o.salary,
    currency: o.currency,
    type: o.type,
    signedYear: c.year,
    bonus: o.bonus,
  } satisfies Contract;
  if (o.bonus > 0) {
    const krw = toKRW(o.bonus, o.currency);
    c.moneyKRW += krw;
    c.earningsKRW += krw;
  }
  if (prevTeam !== o.teamId) moveTeam(c, o.teamId, rng);
  const country = countryOfTeam(o.teamId);
  if (country) {
    const lv = o.level ?? majorLevel(country);
    if (c.level === 'AMA' || c.level === 'COL' || countryOfTeam(prevTeam) !== country) c.level = lv;
  }
}

export function moveTeam(c: Career, teamId: string, rng: Rng, midSeason = false) {
  const last = c.teamHistory[c.teamHistory.length - 1];
  if (last && last.to === null) last.to = midSeason ? c.year : c.year - 1;
  c.teamHistory.push({ teamId, from: c.year, to: null });
  c.teamId = teamId;
  c.number = rng.int(1, 99);
  c.trust = 50;
}

export function toKRW(v: number, cur: Currency) {
  return Math.round(v * ({ KRW: 1, JPY: 9.3, USD: 1400 } as const)[cur]);
}
