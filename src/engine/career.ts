// 커리어 진행의 진입점: 시작, 시즌 진행, 오프시즌 결정, 은퇴.
import { countryOfTeam, describeOffer, makeOffers, marketSalary, moveTeam, roundMoney, signContract } from './contracts';
import { COUNTRY_NAME, CURRENCY_OF, formatMoney, LEAGUES, MIN_SALARY, POS_NAME, teamName, teamsOf } from './data';
import { adjust, EVENT_MAP, pickEvents } from './events';
import { addRating, overall } from './ratings';
import { clamp, Rng } from './rng';
import { playTournament, simulateSeason } from './season';
import { buildSummary } from './summary';
import type { Callup, Career, Country, Decision, DecisionOption, Level, Offer } from './types';

let decisionSeq = 0;
const did = (kind: string) => `${kind}-${Date.now().toString(36)}-${(decisionSeq++).toString(36)}`;

function log(c: Career, text: string, tone?: 'good' | 'bad' | 'info' | 'big') {
  c.log.push({ year: c.year, age: c.age, text, tone });
}

export function startCareer(c: Career): Career {
  const next = structuredClone(c);
  log(next, `${next.name}, 고교 졸업반. 프로 무대를 향한 여정이 시작됩니다.`, 'info');
  next.pending.push(draftChoiceDecision(next, false));
  return next;
}

function draftChoiceDecision(c: Career, college: boolean): Decision {
  const country = COUNTRY_NAME[c.startCountry];
  const intl = c.startCountry === 'US' && HOME[c.nationality] !== 'US';
  const options: DecisionOption[] = [
    intl
      ? { id: 'draft', label: 'MLB 국제 아마추어 계약', desc: '쇼케이스에 나가 MLB 구단들의 계약 제안을 기다립니다.' }
      : { id: 'draft', label: `${DRAFT_NAME[c.startCountry]} 참가`, desc: `${country} 프로 구단의 지명을 기다립니다.` },
  ];
  if (!college) {
    options.push({ id: 'college', label: '대학 진학', desc: '4년간 대학에서 기량을 키운 뒤 다시 드래프트에 도전합니다. (FA 요건 1년 단축)' });
    if (c.startCountry !== 'US') {
      options.push({
        id: 'usa',
        label: '미국 직행',
        desc: '미국 구단과 마이너 계약을 맺습니다. (스카우트 평가 B+ 이상 필요)',
        disabled: c.scoutPotential < 73,
      });
    }
  }
  return {
    id: did('draft'),
    kind: 'draftChoice',
    title: college ? '대학 졸업, 다시 드래프트로' : '진로 선택',
    body: college
      ? `대학 4년을 마쳤습니다. 현재 오버롤 ${overall(c)}. 이제 프로의 문을 두드릴 시간입니다.`
      : `스카우트 평가 잠재력 ${c.scoutPotential}. 고교 졸업 후 어떤 길을 걸을까요?`,
    options,
    data: { college },
  };
}

const HOME: Partial<Record<Career['nationality'], Country>> = { KR: 'KR', JP: 'JP', US: 'US' };
const DRAFT_NAME: Record<Country, string> = { KR: 'KBO 신인 드래프트', JP: 'NPB 드래프트 회의', US: 'MLB 드래프트' };

// 하위 팀부터 지명한다 (전력이 약한 팀이 앞 순번)
function draftOrder(c: Career, country: Country) {
  return [...teamsOf(country)].sort((a, b) => (c.world.strength[a.id] ?? 0) - (c.world.strength[b.id] ?? 0));
}

function internationalSigning(c: Career, rng: Rng, score: number) {
  if (score < 46) {
    log(c, 'MLB 구단들의 국제 아마추어 계약 제안을 받지 못했습니다.', 'bad');
    c.pending.unshift(undraftedDecision(c));
    return;
  }
  const bonus = roundMoney(score >= 63 ? rng.range(2e6, 4.5e6) : score >= 58 ? rng.range(5e5, 1.5e6) : score >= 52 ? rng.range(1e5, 3e5) : rng.range(1e4, 5e4), 'USD');
  const team = rng.pick(teamsOf('US'));
  const label = `${c.year - 1} MLB 국제 아마추어 자유계약`;
  c.draft = { year: c.year - 1, label, teamId: team.id };
  signContract(c, { teamId: team.id, years: 1, salary: 35_000, currency: 'USD', bonus, type: 'minor', level: 'A' }, rng);
  c.flags.directAbroad = 1;
  log(c, `${label} — ${team.name}와 계약! 계약금 ${formatMoney(bonus, 'USD')}`, bonus >= 1e6 ? 'big' : 'good');
}

function runDraft(c: Career, rng: Rng) {
  const country = c.startCountry;
  const score = overall(c) * 0.55 + c.hidden.potential * 0.45 + rng.normal(0, 3);
  // MLB 드래프트는 미국·캐나다·푸에르토리코 아마추어 대상. 그 밖의 국적은 국제 아마추어 계약으로 입단한다.
  if (country === 'US' && HOME[c.nationality] !== 'US') {
    internationalSigning(c, rng, score);
    return;
  }
  const maxRound = country === 'KR' ? 11 : country === 'JP' ? 7 : 20;
  const step = country === 'US' ? 1 : 1.5;
  let round = score >= 63 ? 1 : Math.floor((63 - score) / step) + 2;
  if (score < 46 || round > maxRound) {
    log(c, `${c.year - 1}년 신인 드래프트에서 지명받지 못했습니다.`, 'bad');
    c.pending.unshift(undraftedDecision(c));
    return;
  }
  round = Math.max(1, round);
  const order = draftOrder(c, country);
  const pick = rng.int(1, order.length);
  const team = order[pick - 1];
  const cur = CURRENCY_OF[country];
  const bonusTable: Record<Country, number[]> = {
    KR: [0, 3e8, 1.2e8, 9e7, 7e7, 6e7, 5e7, 4e7, 4e7, 3e7, 3e7, 3e7],
    JP: [0, 1e8, 7e7, 5e7, 4e7, 3e7, 3e7, 3e7],
    US: [0, 2.5e6, 1e6, 7e5, 5e5, 3.5e5, 2e5, 2e5, 2e5, 2e5, 2e5, ...Array(10).fill(1.25e5)],
  };
  let bonus = bonusTable[country][round] ?? bonusTable[country][bonusTable[country].length - 1];
  if (round === 1 && pick <= 3) bonus *= country === 'US' ? 3 : 1.6;
  bonus = roundMoney(bonus, cur);
  const label = `${c.year - 1} ${DRAFT_NAME[country]} ${round}라운드 ${pick}순위`;
  c.draft = { year: c.year - 1, label, teamId: team.id };
  const salary = country === 'KR' ? 3e7 : country === 'JP' ? 7e6 : 35_000;
  signContract(
    c,
    { teamId: team.id, years: 1, salary, currency: cur, bonus, type: country === 'US' ? 'minor' : 'rookie', level: country === 'KR' ? 'KR2' : country === 'JP' ? 'JP2' : 'A' },
    rng,
  );
  c.fame = clamp(c.fame + (round === 1 ? 10 : round <= 3 ? 4 : 1), 0, 100);
  log(c, `${label} — ${team.name} 입단! 계약금 ${formatMoney(bonus, cur)}`, round === 1 ? 'big' : 'good');
}

function undraftedDecision(c: Career): Decision {
  const options: DecisionOption[] = [{ id: 'dev', label: '육성선수 계약', desc: '연봉은 최저 수준이지만 2군에서 기회를 노립니다.' }];
  if (c.education === 'HS' && c.collegeYears === 0) options.push({ id: 'college', label: '대학 진학', desc: '4년 뒤 다시 도전합니다.' });
  options.push({ id: 'retire', label: '야구를 그만둔다' });
  return { id: did('undrafted'), kind: 'undrafted', title: '드래프트 미지명', body: '어느 구단도 이름을 부르지 않았습니다. 하지만 아직 끝은 아닙니다.', options };
}

function offerOptions(offers: Offer[]): DecisionOption[] {
  return offers.map((o, i) => ({
    id: `offer-${i}`,
    label: describeOffer(o),
    desc: `연봉 ${formatMoney(o.salary, o.currency)}${o.bonus ? ` · 계약금 ${formatMoney(o.bonus, o.currency)}` : ''}${o.note ? ` · ${o.note}` : ''}`,
  }));
}

// 시즌 진행 + 오프시즌 처리
export function advanceSeason(input: Career): Career {
  if (input.phase === 'retired') return input;
  if (input.pending.length) throw new Error('먼저 결정을 내려야 합니다.');
  const c = structuredClone(input);
  const rng = new Rng(c.rngState);
  const rec = simulateSeason(c, rng);
  c.seasons.push(rec);
  c.lastReport = rec;
  offseason(c, rng, rec.majorWar);
  c.rngState = rng.state;
  return c;
}

function offseason(c: Career, rng: Rng, war: number) {
  c.age++;
  c.year++;
  c.scoutPotential = Math.round(c.hidden.potential + rng.normal(0, Math.max(1, 5 - c.seasons.length * 0.6)));
  const ovr = overall(c);

  if (c.age >= 45) {
    retireInPlace(c, '만 45세, 더 이상 현역을 이어갈 수 없어 은퇴합니다.');
    return;
  }

  if (c.flags.tjPending) {
    delete c.flags.tjPending;
    c.pending.push({
      id: did('tj'),
      kind: 'tommyJohn',
      title: '팔꿈치 인대 손상',
      body: '의료진은 토미존 수술을 권합니다. 수술하면 1년 이상 재활해야 하지만 재발 위험이 적습니다.',
      options: [
        { id: 'surgery', label: '토미존 수술', desc: '약 1년 반 재활. 구속이 오히려 늘어날 수도 있습니다.' },
        { id: 'rehab', label: '재활로 버틴다', desc: '빠르게 복귀하지만 재손상 위험이 큽니다.' },
      ],
    });
  }

  // 국가대표 소집
  for (const t of c.callups ?? []) {
    const exemptHope = c.nationality === 'KR' && c.military.status !== 'exempt' && c.military.status !== 'done' && (t.key === 'AG' || t.key === 'OLY');
    c.pending.push({
      id: did('nat'),
      kind: 'national',
      title: `국가대표 소집 · ${t.name}`,
      body: `${t.name} 대표팀 최종 명단에 이름을 올렸습니다.${exemptHope ? (t.key === 'AG' ? ' 금메달을 따면 병역 특례를 받습니다.' : ' 메달을 따면 병역 특례를 받습니다.') : ''} 국가대표 경력 ${c.national.caps}회.`,
      options: [
        { id: 'join', label: '대표팀에 합류한다', desc: '명예와 인기를 얻지만 휴식이 줄어 컨디션이 떨어집니다.' },
        { id: 'decline', label: '소속팀에 집중한다', desc: '이번 대회는 불참합니다. 구단 신뢰가 오르지만 여론은 아쉬워합니다.' },
        { id: 'retire', label: '국가대표 은퇴를 선언한다', desc: '앞으로 대표팀에 뽑히지 않습니다.', disabled: c.national.caps === 0 },
      ],
      data: { callup: t },
    });
  }
  c.callups = [];

  // 대학
  if (c.level === 'COL') {
    c.collegeYears++;
    if (c.collegeYears >= 4) c.pending.push(draftChoiceDecision(c, true));
    addEvents(c, rng);
    return;
  }

  const serving = c.military.status === 'serving';
  // 계약 처리
  if (!serving && c.contract) {
    c.contract.years--;
    if (c.contract.years <= 0) handleExpiry(c, rng, war);
  } else if (!serving && !c.contract && c.teamId === null && c.level !== 'AMA') {
    releasedDecision(c, rng, '무적 상태입니다. 다시 기회를 줄 구단을 찾습니다.');
  }

  // 방출
  if (!serving && c.contract && c.contract.years > 0 && c.pending.every((d) => d.kind !== 'fa' && d.kind !== 'released')) {
    const country = countryOfTeam(c.teamId);
    if (country) {
      const majorAvg = LEAGUES[country === 'KR' ? 'KR1' : country === 'JP' ? 'JP1' : 'MLB'].avg;
      const minorOnly = c.seasons[c.seasons.length - 1]?.lines.every((l) => !['KR1', 'JP1', 'MLB'].includes(l.level));
      if (minorOnly && ovr < majorAvg - 13 && c.age >= 25 && c.contract.type !== 'fa' && rng.chance(0.45)) {
        log(c, `${teamName(c.teamId)}에서 방출됐습니다.`, 'bad');
        c.contract = null;
        const last = c.teamHistory[c.teamHistory.length - 1];
        if (last && last.to === null) last.to = c.year - 1;
        c.teamId = null;
        releasedDecision(c, rng, '구단으로부터 방출 통보를 받았습니다.');
      }
    }
  }

  // 포스팅
  const country = countryOfTeam(c.teamId);
  if (
    !serving &&
    c.contract &&
    (country === 'KR' || country === 'JP') &&
    c.service[country] >= 7 &&
    c.contract.type !== 'fa' &&
    ovr >= 66 &&
    c.flags.postedYear !== c.year &&
    !c.pending.some((d) => d.kind === 'fa')
  ) {
    c.pending.push({
      id: did('posting'),
      kind: 'posting',
      title: '빅리그 도전?',
      body: `${country === 'KR' ? '한국' : '일본'}에서 ${c.service[country]}시즌을 뛰어 포스팅 자격을 얻었습니다. MLB에 도전할까요?`,
      options: [
        { id: 'post', label: '포스팅을 신청한다', desc: '구단이 동의하면 빅리그 구단들의 제안을 받습니다.' },
        { id: 'stay', label: '팀에 남는다', desc: '감독 신뢰가 오릅니다.' },
      ],
    });
  }

  // 병역
  if (c.nationality === 'KR' && c.military.status === 'none' && c.teamId) {
    if (c.age >= 28) {
      enlist(c, 'active');
      log(c, '입영 연기 기한이 끝나 현역으로 입대했습니다.', 'bad');
    } else if (c.age >= 21) {
      c.pending.push({
        id: did('mil'),
        kind: 'military',
        title: '병역 문제',
        body: `만 ${c.age}세. 병역 의무를 언제, 어떻게 해결할까요? 만 28세가 되면 현역으로 입대해야 합니다. (아시안게임 금메달, 올림픽 메달 시 면제)`,
        options: [
          { id: 'sangmu', label: '상무 피닉스(국군체육부대) 지원', desc: '합격하면 1년 반 동안 퓨처스리그에서 뛰며 복무합니다.', disabled: c.age > 27 },
          { id: 'active', label: '현역 입대', desc: '1년 반 동안 야구를 쉬어야 합니다. 능력치가 떨어집니다.' },
          { id: 'later', label: '입대를 미룬다', desc: '국제대회 메달로 면제를 노립니다.', disabled: c.age >= 27 },
        ],
      });
    }
  }

  // 은퇴 권유
  if (c.age >= 36 && c.pending.every((d) => d.kind !== 'released')) {
    const prev = c.seasons[c.seasons.length - 1];
    if (c.age >= 40 || (prev && prev.majorWar < 1) || rng.chance(0.3)) {
      c.pending.push({
        id: did('retire'),
        kind: 'retireSuggest',
        title: '은퇴를 고민할 시기',
        body: `만 ${c.age}세. 구단과 가족은 "박수 칠 때 떠나는 것도 방법"이라고 조언합니다.`,
        options: [
          { id: 'continue', label: '현역 연장', desc: '아직 끝나지 않았습니다.' },
          { id: 'retire', label: '은퇴한다', desc: '커리어를 마무리하고 랭킹에 등록합니다.' },
        ],
      });
    }
  }

  addEvents(c, rng);
}

function addEvents(c: Career, rng: Rng) {
  const evs = pickEvents(c, rng, rng.chance(0.45) ? 2 : 1);
  for (const e of evs) {
    c.pending.push({
      id: did('ev'),
      kind: 'event',
      title: e.title,
      body: e.body(c),
      options: e.options.map((o) => ({ id: o.id, label: o.label, desc: o.desc, disabled: o.enabled ? !o.enabled(c) : false })),
      data: { eventId: e.id },
    });
  }
}

function faRequirement(c: Career, country: Country): number {
  if (country === 'US') return 6;
  const base = c.education === 'COL' ? 7 : 8;
  return c.faCount > 0 ? 4 : base;
}

function handleExpiry(c: Career, rng: Rng, war: number) {
  const contract = c.contract!;
  const country = countryOfTeam(contract.teamId);
  if (!country) return;
  const ovr = overall(c);
  const serviceNeeded = faRequirement(c, country);
  const sinceFa = c.lastFaYear === null ? c.service[country] : c.year - c.lastFaYear;
  const faEligible =
    contract.type === 'fa' || contract.type === 'posting'
      ? country !== 'US' || c.service.US >= 6
      : c.service[country] >= serviceNeeded && (c.lastFaYear === null || sinceFa >= 4);

  if (faEligible) {
    const offers = makeOffers(c, rng, { domestic: true, abroad: true, includeCurrent: true });
    applyAgent(c, offers);
    if (!offers.length) {
      c.contract = null;
      const last = c.teamHistory[c.teamHistory.length - 1];
      if (last && last.to === null) last.to = c.year - 1;
      c.teamId = null;
      releasedDecision(c, rng, 'FA 시장에 나왔지만 제안이 없습니다.');
      return;
    }
    c.pending.push({
      id: did('fa'),
      kind: 'fa',
      title: 'FA 자격 취득!',
      body: `자유계약선수(FA)가 됐습니다. 오버롤 ${ovr}, 만 ${c.age}세. 어느 팀과 계약할까요?`,
      options: [...offerOptions(offers), { id: 'retire', label: '은퇴한다' }],
      data: { offers },
    });
    return;
  }

  // 구단 보류권 하에서 1년 재계약
  const cur = contract.currency;
  let salary = contract.salary;
  if (contract.type === 'minor') {
    const minorAvg = LEAGUES[c.level]?.avg ?? 50;
    if (c.age >= 26 && ovr < minorAvg - 4 && rng.chance(0.5)) {
      log(c, `${teamName(c.teamId)}에서 방출됐습니다.`, 'bad');
      c.contract = null;
      c.teamId = null;
      releasedDecision(c, rng, '마이너 계약이 끝나고 방출됐습니다.');
      return;
    }
    salary = c.level === 'MLB' ? MIN_SALARY.USD : 35_000 + (c.level === 'AAA' ? 15_000 : 0);
    contract.type = c.level === 'MLB' ? 'standard' : 'minor';
  } else if (country === 'US') {
    salary = c.service.US < 3 ? MIN_SALARY.USD * (1 + 0.05 * c.service.US) : Math.max(salary, Math.min(marketSalary(ovr, c.age, 'US') * (0.3 + 0.12 * c.service.US), 3e7));
    contract.type = c.service.US >= 3 ? 'arb' : 'standard';
  } else {
    const raise = 1 + 0.3 * war - 0.05;
    salary = Math.min(Math.max(salary * raise, salary * 0.7), marketSalary(ovr, c.age, country) * 0.75, salary * 3.5);
    salary = Math.max(MIN_SALARY[cur], salary);
    if (contract.type === 'rookie' || contract.type === 'developmental') contract.type = 'standard';
  }
  salary = roundMoney(salary, cur);
  const prev = contract.salary;
  contract.salary = salary;
  contract.years = 1;
  contract.signedYear = c.year;
  if (salary !== prev) log(c, `연봉 협상: ${formatMoney(prev, cur)} → ${formatMoney(salary, cur)}`, salary > prev ? 'good' : 'bad');
}

function applyAgent(c: Career, offers: Offer[]) {
  const m = Number(c.flags.agent ?? 1);
  if (m !== 1) for (const o of offers) o.salary = roundMoney(o.salary * m, o.currency);
}

function releasedDecision(c: Career, rng: Rng, body: string) {
  const offers = makeOffers(c, rng, { domestic: true, abroad: false, includeCurrent: false })
    .slice(0, 3)
    .map((o) => ({ ...o, years: 1, bonus: 0, type: 'standard' as const, salary: roundMoney(o.salary * 0.6, o.currency) }));
  const options: DecisionOption[] = [...offerOptions(offers)];
  if (c.age < 40) options.push({ id: 'wait', label: '무적 상태로 개인 훈련', desc: '1년간 개인 훈련을 하며 다시 기회를 기다립니다.' });
  options.push({ id: 'retire', label: '은퇴한다' });
  c.pending.unshift({ id: did('rel'), kind: 'released', title: '새 팀을 찾아서', body, options, data: { offers } });
}

function enlist(c: Career, kind: 'sangmu' | 'active') {
  c.military = { status: 'serving', kind, halvesLeft: 3, returnTeamId: c.teamId ?? undefined, returnLevel: c.level };
  if (kind === 'sangmu') {
    c.level = 'KR2';
    log(c, '상무 피닉스에 입대했습니다. 퓨처스리그에서 뛰며 복무합니다.', 'info');
  } else {
    c.level = 'MIL';
    log(c, '현역으로 입대했습니다. 잠시 그라운드를 떠납니다.', 'info');
  }
}

export function resolveDecision(input: Career, decisionId: string, optionId: string): Career {
  const c = structuredClone(input);
  const idx = c.pending.findIndex((d) => d.id === decisionId);
  if (idx < 0) return input;
  const d = c.pending[idx];
  const opt = d.options.find((o) => o.id === optionId);
  if (!opt || opt.disabled) return input;
  c.pending.splice(idx, 1);
  const rng = new Rng(c.rngState);

  switch (d.kind) {
    case 'draftChoice': {
      if (optionId === 'draft') runDraft(c, rng);
      else if (optionId === 'college') {
        c.education = 'COL';
        c.level = 'COL';
        c.teamId = c.startCountry === 'KR' ? 'col-kr' : c.startCountry === 'JP' ? 'col-jp' : 'col-us';
        log(c, `${teamName(c.teamId)}에 진학했습니다.`, 'info');
      } else if (optionId === 'usa') {
        const team = rng.pick(teamsOf('US'));
        const bonus = roundMoney(clamp(3e5 + (c.scoutPotential - 73) * 1.2e5, 2e5, 2.5e6), 'USD');
        c.startCountry = 'US';
        signContract(c, { teamId: team.id, years: 1, salary: 35_000, currency: 'USD', bonus, type: 'minor', level: 'A' }, rng);
        c.draft = { year: c.year - 1, label: `${c.year - 1} 국제 유망주 계약`, teamId: team.id };
        log(c, `${team.name}과 마이너 계약! 계약금 ${formatMoney(bonus, 'USD')}`, 'big');
      }
      break;
    }
    case 'undrafted': {
      if (optionId === 'dev') {
        const team = rng.pick(teamsOf(c.startCountry));
        const cur = CURRENCY_OF[c.startCountry];
        signContract(
          c,
          {
            teamId: team.id,
            years: 1,
            salary: MIN_SALARY[cur] * (c.startCountry === 'US' ? 0.044 : 1),
            currency: cur,
            bonus: 0,
            type: c.startCountry === 'US' ? 'minor' : 'developmental',
            level: c.startCountry === 'KR' ? 'KR2' : c.startCountry === 'JP' ? 'JP2' : 'A',
          },
          rng,
        );
        c.draft = { year: c.year - 1, label: '육성선수 입단', teamId: team.id };
        log(c, `${team.name}에 육성선수로 입단했습니다.`, 'info');
      } else if (optionId === 'college') {
        c.education = 'COL';
        c.level = 'COL';
        c.teamId = c.startCountry === 'KR' ? 'col-kr' : c.startCountry === 'JP' ? 'col-jp' : 'col-us';
        log(c, `${teamName(c.teamId)}에 진학했습니다.`, 'info');
      } else retireInPlace(c, '프로의 꿈을 접고 새로운 길을 찾기로 했습니다.');
      break;
    }
    case 'event': {
      const ev = EVENT_MAP[String(d.data?.eventId)];
      const o = ev?.options.find((x) => x.id === optionId);
      if (o) log(c, `[${ev.title}] ${o.apply(c, rng)}`, 'info');
      break;
    }
    case 'fa':
    case 'released':
    case 'postingOffers': {
      if (optionId === 'retire') {
        retireInPlace(c, '정든 그라운드를 떠나기로 했습니다.');
        break;
      }
      if (optionId === 'wait' || optionId === 'stay') {
        if (d.kind === 'postingOffers') log(c, '빅리그 제안을 거절하고 팀에 남았습니다.', 'info');
        else {
          c.contract = null;
          c.teamId = null;
          log(c, '무적 상태로 개인 훈련에 들어갑니다.', 'bad');
        }
        break;
      }
      const offers = (d.data?.offers ?? []) as Offer[];
      const o = offers[Number(optionId.replace('offer-', ''))];
      if (!o) break;
      const same = o.teamId === c.teamId;
      const offer: Offer = d.kind === 'postingOffers' && o.type !== 'minor' ? { ...o, type: 'posting' } : o;
      signContract(c, offer, rng);
      if (d.kind === 'fa') {
        c.faCount++;
        c.lastFaYear = c.year;
        if (same) adjust(c, 'trust', 15);
      }
      if (d.kind === 'postingOffers') {
        c.level = offer.level ?? 'MLB';
        log(c, `포스팅으로 ${teamName(o.teamId)}과 ${o.years}년 계약! 빅리그 도전이 시작됩니다.`, 'big');
      } else {
        log(
          c,
          `${teamName(o.teamId)}과 ${o.years}년 계약 (연봉 ${formatMoney(o.salary, o.currency)}${o.bonus ? `, 계약금 ${formatMoney(o.bonus, o.currency)}` : ''})${same ? ' — 잔류' : ''}`,
          d.kind === 'fa' ? 'big' : 'good',
        );
      }
      break;
    }
    case 'posting': {
      c.flags.postedYear = c.year;
      if (optionId === 'stay') {
        adjust(c, 'trust', 6);
        log(c, '포스팅을 포기하고 팀에 남았습니다.', 'info');
        break;
      }
      if (c.trust < 35 && !rng.chance(0.5)) {
        adjust(c, 'morale', -8);
        log(c, '구단이 포스팅을 허락하지 않았습니다.', 'bad');
        break;
      }
      // 만 25세 미만은 MLB 국제 아마추어 규정을 적용받아 마이너 계약만 가능하다
      const young = c.age < 25;
      const offers = makeOffers(c, rng, { domestic: false, abroad: true, includeCurrent: false })
        .filter((o) => o.currency === 'USD')
        .map((o) =>
          young
            ? { ...o, type: 'minor' as const, years: 1, salary: 35_000, bonus: roundMoney(Math.min(2.5e6, o.salary * 0.15), 'USD'), level: 'AAA' as Level, note: '만 25세 미만 국제 아마추어 규정 (마이너 계약)' }
            : { ...o, type: 'posting' as const },
        );
      applyAgent(c, offers);
      if (!offers.length) {
        adjust(c, 'morale', -10);
        log(c, '포스팅을 신청했지만 응찰한 빅리그 구단이 없었습니다.', 'bad');
        break;
      }
      c.pending.unshift({
        id: did('po'),
        kind: 'postingOffers',
        title: '빅리그 구단의 제안',
        body: `${offers.length}개 구단이 관심을 보였습니다. 계약하면 미국으로 떠납니다.`,
        options: [...offerOptions(offers), { id: 'stay', label: '모두 거절하고 잔류' }],
        data: { offers },
      });
      break;
    }
    case 'military': {
      if (optionId === 'sangmu') {
        const ok = rng.chance(overall(c) >= 52 ? 0.85 : 0.4);
        if (ok) enlist(c, 'sangmu');
        else {
          log(c, '상무 서류 전형에서 탈락했습니다.', 'bad');
          if (c.age >= 27) enlist(c, 'active');
        }
      } else if (optionId === 'active') enlist(c, 'active');
      else log(c, '입대를 1년 미뤘습니다.', 'info');
      break;
    }
    case 'retireSuggest': {
      if (optionId === 'retire') retireInPlace(c, '박수 받으며 은퇴를 선언했습니다.');
      else log(c, '현역 연장을 선언했습니다!', 'info');
      break;
    }
    case 'national': {
      const t = d.data?.callup as Callup | undefined;
      if (!t) break;
      if (optionId === 'join') playTournament(c, t, rng);
      else if (optionId === 'decline') {
        c.national.declined = (c.national.declined ?? 0) + 1;
        adjust(c, 'trust', 4);
        adjust(c, 'fame', -4);
        adjust(c, 'condition', 6);
        log(c, `${t.name} 대표팀 소집에 응하지 않고 소속팀 훈련에 집중했습니다.`, 'info');
      } else {
        c.national.retired = true;
        c.pending = c.pending.filter((x) => x.kind !== 'national');
        adjust(c, 'fame', -2);
        log(c, `국가대표 은퇴를 선언했습니다. (A매치 ${c.national.caps}회${c.national.medals.length ? ` · ${c.national.medals.join(', ')}` : ''})`, 'big');
      }
      break;
    }
    case 'tommyJohn': {
      if (optionId === 'surgery') {
        c.injury = { name: '토미존 수술 재활', remaining: 1.5 };
        c.flags.tj = Number(c.flags.tj ?? 0) + 1;
        addRating(c, 'velocity', Math.round(rng.normal(0.5, 2)));
        addRating(c, 'control', -2);
        log(c, '토미존 수술을 받았습니다. 긴 재활이 시작됩니다.', 'bad');
      } else {
        c.injury = { name: '팔꿈치 재활', remaining: 0.4 };
        c.flags.retearRisk = 0.45;
        log(c, '수술 대신 재활을 택했습니다.', 'info');
      }
      break;
    }
    default:
      break;
  }
  c.rngState = rng.state;
  return c;
}

function retireInPlace(c: Career, reason: string) {
  log(c, reason, 'big');
  c.pending = [];
  c.phase = 'retired';
  const last = c.teamHistory[c.teamHistory.length - 1];
  if (last && last.to === null) last.to = c.year - 1;
  c.retired = buildSummary(c);
  const v = c.retired.hofVote;
  if (v && v.pct > 0) log(c, v.inducted ? `${v.org} 투표 ${v.pct}% 득표, 첫 해 헌액!` : `${v.org} 투표 ${v.pct}% 득표 (헌액 기준 75%)`, v.inducted ? 'big' : 'info');
  else if (v) log(c, `${v.org} 후보 자격(1군 10시즌)을 채우지 못했습니다.`, 'info');
  if (c.retired.retiredNumber) log(c, `${c.retired.retiredNumber}에서 등번호 ${c.number}번이 영구결번됐습니다.`, 'big');
}

export function retireNow(input: Career): Career {
  const c = structuredClone(input);
  retireInPlace(c, `만 ${c.age}세, 은퇴를 선언했습니다.`);
  return c;
}

export function canRetire(c: Career) {
  return c.phase !== 'retired' && c.level !== 'AMA';
}

export function currentLevelLabel(c: Career): string {
  if (c.phase === 'retired') return '은퇴';
  if (c.military.status === 'serving') return c.military.kind === 'active' ? '현역 복무 중' : '상무 피닉스';
  if (c.level === 'AMA') return '고교 졸업반';
  if (!c.teamId) return '무적';
  return LEAGUES[c.level as Level]?.short ?? c.level;
}

export function roleLabel(c: Career): string {
  if (c.role === 'twoWay') return `이도류 (${POS_NAME[c.pitPos]} / ${POS_NAME[c.batPos]})`;
  return c.role === 'batter' ? POS_NAME[c.batPos] : POS_NAME[c.pitPos];
}

export { moveTeam };
