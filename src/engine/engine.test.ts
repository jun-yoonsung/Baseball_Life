import { describe, expect, it } from 'vitest';
import { advanceSeason, resolveDecision, retireNow, startCareer } from './career';
import { createCareer, makeCandidates, RATING_SUM, type CreateInput } from './create';
import { buildEntry, rankEntries } from './ranking';
import { Rng } from './rng';
import { batProbs, LG_ERA, LG_WOBA } from './sim';
import { careerWar, majorLines, sumBat, sumPit } from './summary';
import type { Career } from './types';
import { exportCareer, importCareer } from './save';

const inputs: CreateInput[] = [
  { name: '김타자', nationality: 'KR', startCountry: 'KR', role: 'batter', batPos: 'SS', pitPos: 'SP', bats: 'R', throws: 'R' },
  { name: '이투수', nationality: 'KR', startCountry: 'KR', role: 'pitcher', batPos: 'DH', pitPos: 'SP', bats: 'L', throws: 'L' },
  { name: '박마무리', nationality: 'JP', startCountry: 'JP', role: 'pitcher', batPos: 'DH', pitPos: 'CL', bats: 'R', throws: 'R' },
  { name: 'Smith', nationality: 'US', startCountry: 'US', role: 'batter', batPos: 'CF', pitPos: 'SP', bats: 'S', throws: 'R' },
  { name: '최이도', nationality: 'KR', startCountry: 'KR', role: 'twoWay', batPos: 'RF', pitPos: 'SP', bats: 'L', throws: 'R' },
];

function playOut(c: Career, rng: Rng, maxSeasons = 40): Career {
  let n = 0;
  while (c.phase !== 'retired' && n < maxSeasons) {
    while (c.pending.length) {
      const d = c.pending[0];
      const opts = d.options.filter((o) => !o.disabled);
      // 은퇴 선택은 피해서 끝까지 플레이
      const pool = opts.filter((o) => o.id !== 'retire');
      const o = (pool.length ? pool : opts)[Math.floor(rng.next() * (pool.length || opts.length))];
      c = resolveDecision(c, d.id, o.id);
      if (c.phase === 'retired') return c;
    }
    c = advanceSeason(c);
    n++;
  }
  return c.phase === 'retired' ? c : retireNow(c);
}

function assertSane(c: Career) {
  const json = JSON.stringify(c);
  expect(json.includes('NaN')).toBe(false);
  expect(json.includes('null,"remaining"')).toBe(false);
  for (const s of c.seasons) {
    for (const l of s.lines) {
      if (l.bat) {
        expect(l.bat.H).toBeLessThanOrEqual(l.bat.AB);
        expect(l.bat.HR + l.bat.D + l.bat.T).toBeLessThanOrEqual(l.bat.H);
        expect(l.bat.PA).toBeGreaterThanOrEqual(l.bat.AB);
      }
      if (l.pit) {
        expect(l.pit.GS).toBeLessThanOrEqual(l.pit.G);
        expect(l.pit.ER).toBeGreaterThanOrEqual(0);
      }
    }
  }
}

describe('model calibration', () => {
  it('average hitter produces league-average numbers', () => {
    const p = batProbs({ contact: 62, power: 62, eye: 62, speed: 62, fielding: 62, arm: 62 }, 62);
    const h = p.s + p.d + p.t + p.hr;
    const ab = 1 - p.bb - p.hbp;
    expect(h / ab).toBeGreaterThan(0.25);
    expect(h / ab).toBeLessThan(0.28);
    expect(LG_WOBA).toBeGreaterThan(0.3);
    expect(LG_ERA).toBeGreaterThan(4);
    expect(LG_ERA).toBeLessThan(5.2);
  });
});

describe('character creation', () => {
  it('candidates have the fixed rating sum', () => {
    for (const input of inputs) {
      const cands = makeCandidates(input, 1234);
      expect(cands).toHaveLength(3);
      for (const cand of cands) {
        if (input.role !== 'pitcher') expect(Object.values(cand.bat).reduce((a, b) => a + b, 0)).toBe(RATING_SUM);
        if (input.role !== 'batter') expect(Object.values(cand.pit).reduce((a, b) => a + b, 0)).toBe(RATING_SUM);
      }
    }
  });
});

describe('full careers', () => {
  it('runs many careers to retirement without invalid state', () => {
    const rng = new Rng(42);
    const summary: string[] = [];
    let mvps = 0;
    let majorPlayers = 0;
    for (let i = 0; i < 60; i++) {
      const input = inputs[i % inputs.length];
      const cand = makeCandidates(input, 1000 + i)[i % 3];
      let c = startCareer(createCareer(input, cand));
      c = playOut(c, rng);
      expect(c.phase).toBe('retired');
      expect(c.retired).toBeDefined();
      assertSane(c);
      if (majorLines(c).length) majorPlayers++;
      mvps += c.retired!.mvp;
      const b = sumBat(majorLines(c));
      const p = sumPit(majorLines(c));
      summary.push(
        `${input.role.padEnd(7)} pot=${c.hidden.potential} peak=${c.peakOvr} age=${c.age} war=${careerWar(c)} mvp=${c.retired!.mvp} aw=${c.retired!.awardsCount} ${
          b ? `AVG=${b.AVG.toFixed(3)} HR=${b.HR} PA=${b.PA}` : ''
        } ${p ? `ERA=${p.ERA.toFixed(2)} W=${p.W} SV=${p.SV} IP=${p.IP}` : ''} ${c.retired!.grade}`,
      );
    }
    if (process.env.SHOW_SIM) console.log(summary.join('\n'));
    expect(majorPlayers).toBeGreaterThan(20);
    expect(mvps).toBeLessThan(200);
  });

  it('save export/import round-trips', () => {
    const cand = makeCandidates(inputs[0], 7)[0];
    let c = startCareer(createCareer(inputs[0], cand));
    c = playOut(c, new Rng(1), 3);
    const back = importCareer(exportCareer(c));
    expect(back.name).toBe(c.name);
    expect(back.seasons.length).toBe(c.seasons.length);
  });

  it('builds and ranks entries', () => {
    const rng = new Rng(5);
    const entries = [];
    for (let i = 0; i < 10; i++) {
      const input = inputs[i % inputs.length];
      let c = startCareer(createCareer(input, makeCandidates(input, 50 + i)[0]));
      c = playOut(c, rng);
      const e = buildEntry(c);
      if (e) entries.push(e);
    }
    const ranked = rankEntries(entries);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i].rank!).toBeGreaterThanOrEqual(ranked[i - 1].rank!);
  });
});
