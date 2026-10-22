import { useState } from 'react';
import {
  advanceSeason,
  BAT_KEYS,
  batOvr,
  canRetire,
  careerWar,
  countIndividual,
  countMvp,
  currentLevelLabel,
  formatKRW,
  formatMoney,
  LEAGUES,
  NAT_MAP,
  overall,
  PIT_KEYS,
  pitOvr,
  RATING_NAME,
  resolveDecision,
  retireNow,
  roleLabel,
  teamName,
  velocityKmh,
  type Career,
  type Decision,
  type RatingKey,
} from '../engine';
import { BattingTable, Meter, PitchingTable, PotentialBadge, RatingBar, SeasonReport, TeamLine } from '../ui/components';

type Tab = 'stats' | 'ratings' | 'awards' | 'log' | 'contract';

export function CareerPage({ career, setCareer, notify }: { career: Career | null; setCareer: (c: Career | null) => void; notify: (m: string) => void }) {
  const [tab, setTab] = useState<Tab>('stats');
  const [report, setReport] = useState(false);
  const [showMinor, setShowMinor] = useState(true);

  if (!career) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h2>진행 중인 커리어가 없습니다</h2>
        <p className="muted">새 선수를 만들거나, 설정에서 저장 파일을 가져오세요.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn primary" href="#/new">
            선수 만들기
          </a>
          <a className="btn" href="#/settings">
            저장 파일 가져오기
          </a>
        </div>
      </div>
    );
  }

  const c = career;
  const ovr = overall(c);
  const nat = NAT_MAP[c.nationality];
  const pending = c.pending[0];

  const play = () => {
    try {
      const next = advanceSeason(c);
      setCareer(next);
      setReport(true);
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const decide = (d: Decision, optId: string) => setCareer(resolveDecision(c, d.id, optId));

  const retire = () => {
    if (window.confirm('정말 은퇴할까요? 은퇴하면 커리어가 끝나고 랭킹에 등록됩니다.')) setCareer(retireNow(c));
  };

  const focusOptions: [Career['training']['focus'], string][] = [
    ['balanced', '균형 훈련'],
    ...(c.role !== 'pitcher' ? BAT_KEYS.map((k) => [k, `${RATING_NAME[k]} 집중`] as [RatingKey, string]) : []),
    ...(c.role !== 'batter' ? PIT_KEYS.map((k) => [k, `${RATING_NAME[k]} 집중`] as [RatingKey, string]) : []),
    ['rest', '휴식·회복 (부상 위험↓, 노화 완화)'],
  ];

  return (
    <div className="grid">
      <section className="card">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div className="profile">
            <div className="ovr">
              <b>{ovr}</b>
              <span>OVR</span>
            </div>
            <div>
              <h1>
                {nat.flag} {c.name} {c.number > 0 && <span className="muted" style={{ fontSize: 16 }}>#{c.number}</span>}
              </h1>
              <TeamLine teamId={c.teamId} sub={<span className="badge">{currentLevelLabel(c)}</span>} />
              <div className="muted small">
                {c.phase === 'retired' ? `${c.retired?.year}시즌 후 은퇴` : `${c.year}시즌`} · 만 {c.age}세 · {roleLabel(c)} · {c.throws === 'R' ? '우투' : '좌투'}
                {c.bats === 'R' ? '우타' : c.bats === 'L' ? '좌타' : '양타'} · {c.style}
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <PotentialBadge v={c.scoutPotential} />
                {c.role === 'twoWay' && (
                  <span className="badge blue">
                    타자 {batOvr(c.bat, c.batPos)} · 투수 {pitOvr(c.pit, c.pitPos)}
                  </span>
                )}
                {c.role !== 'batter' && <span className="badge">최고 {velocityKmh(c.pit.velocity)}km/h</span>}
                {c.injury && <span className="badge red">🩹 {c.injury.name}</span>}
                {c.military.status === 'exempt' && c.nationality === 'KR' && <span className="badge green">병역 면제</span>}
                {c.military.status === 'done' && <span className="badge green">병역 필</span>}
              </div>
            </div>
          </div>
          <div className="kpis" style={{ flex: '1 1 240px', maxWidth: 360 }}>
            <div className="kpi">
              <div className="lbl">통산 WAR</div>
              <div className="num">{careerWar(c).toFixed(1)}</div>
            </div>
            <div className="kpi">
              <div className="lbl">MVP</div>
              <div className="num">{countMvp(c)}</div>
            </div>
            <div className="kpi">
              <div className="lbl">개인상</div>
              <div className="num">{countIndividual(c)}</div>
            </div>
          </div>
        </div>
        <div className="meters">
          <Meter label="컨디션" value={c.condition} />
          <Meter label="멘탈" value={c.morale} />
          <Meter label="감독 신뢰" value={c.trust} />
          <Meter label="인기" value={c.fame} />
        </div>
      </section>

      {c.phase === 'retired' ? (
        <RetiredCard c={c} />
      ) : pending ? (
        <section className="card decision">
          <div className="spread">
            <h2 style={{ margin: 0 }}>{pending.title}</h2>
            {c.pending.length > 1 && <span className="badge">남은 결정 {c.pending.length}</span>}
          </div>
          <p style={{ margin: '8px 0 0' }}>{pending.body}</p>
          <div className="opts">
            {pending.options.map((o) => (
              <button key={o.id} className="opt" disabled={o.disabled} onClick={() => decide(pending, o.id)}>
                <b>{o.label}</b>
                {o.desc && <span>{o.desc}</span>}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="card">
          <h2>{c.year}시즌 준비</h2>
          <div className="grid grid-2">
            <label className="field">
              비시즌 훈련
              <select value={c.training.focus} onChange={(e) => setCareer({ ...c, training: { ...c.training, focus: e.target.value as Career['training']['focus'] } })}>
                {focusOptions.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <span className="muted small">집중 능력치는 성장 시 더 많이 오릅니다.</span>
            </label>
            <div className="field">
              <span>훈련 강도</span>
              <div className="seg">
                {(
                  [
                    [1, '가볍게'],
                    [2, '보통'],
                    [3, '강하게'],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} className={c.training.intensity === v ? 'on' : ''} onClick={() => setCareer({ ...c, training: { ...c.training, intensity: v } })}>
                    {l}
                  </button>
                ))}
              </div>
              <span className="muted small">강할수록 성장 폭이 크지만 부상 위험과 피로가 늘어납니다.</span>
            </div>
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn primary big" style={{ flex: 1 }} onClick={play}>
              ▶ {c.year}시즌 진행
            </button>
            {canRetire(c) && (
              <button className="btn danger" onClick={retire}>
                은퇴 선언
              </button>
            )}
          </div>
          {c.lastReport && (
            <button className="btn" style={{ marginTop: 10 }} onClick={() => setReport(true)}>
              지난 시즌 결산 다시 보기
            </button>
          )}
        </section>
      )}

      <div className="tabs" role="tablist">
        {(
          [
            ['stats', '시즌 기록'],
            ['ratings', '능력치'],
            ['awards', `수상 (${c.awards.length})`],
            ['log', '커리어 일지'],
            ['contract', '계약·신상'],
          ] as [Tab, string][]
        ).map(([t, l]) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <section className="card">
          <div className="spread">
            <h3 style={{ margin: 0 }}>시즌별 기록</h3>
            <label className="row small">
              <input type="checkbox" checked={showMinor} onChange={(e) => setShowMinor(e.target.checked)} /> 2군·마이너·대학 포함
            </label>
          </div>
          {c.role !== 'pitcher' && (
            <>
              <h3 style={{ marginTop: 14 }}>타격</h3>
              <BattingTable seasons={c.seasons} showMinor={showMinor} />
            </>
          )}
          {c.role !== 'batter' && (
            <>
              <h3 style={{ marginTop: 14 }}>투구</h3>
              <PitchingTable seasons={c.seasons} showMinor={showMinor} />
            </>
          )}
          {c.seasons.length > 0 && (
            <>
              <h3 style={{ marginTop: 14 }}>팀 성적</h3>
              <div className="table-wrap">
                <table className="stats">
                  <thead>
                    <tr>
                      <th>연도</th>
                      <th>나이</th>
                      <th className="l">결과</th>
                      <th>OVR</th>
                      <th>WAR</th>
                      <th className="l">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.seasons.map((s) => (
                      <tr key={s.year}>
                        <td>{s.year}</td>
                        <td>{s.age}</td>
                        <td className="l">{s.teamResult || '-'}</td>
                        <td>{s.ovrEnd}</td>
                        <td>{s.majorWar.toFixed(1)}</td>
                        <td className="l">
                          {[s.allStar && '올스타', s.injuries.length && `부상 ${s.injuries.length}회`, s.military].filter(Boolean).join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'ratings' && (
        <section className="grid grid-2">
          {c.role !== 'pitcher' && (
            <div className="card">
              <h3>
                타자 능력치 <span className="muted small">({batOvr(c.bat, c.batPos)} OVR)</span>
              </h3>
              {BAT_KEYS.map((k) => (
                <RatingBar key={k} k={k} v={c.bat[k]} />
              ))}
            </div>
          )}
          {c.role !== 'batter' && (
            <div className="card">
              <h3>
                투수 능력치 <span className="muted small">({pitOvr(c.pit, c.pitPos)} OVR)</span>
              </h3>
              {PIT_KEYS.map((k) => (
                <RatingBar key={k} k={k} v={c.pit[k]} />
              ))}
            </div>
          )}
          <div className="card">
            <h3>성장 곡선</h3>
            <OvrChart c={c} />
            <p className="muted small">최고 오버롤 {c.peakOvr}. 오버롤은 포지션별 능력치 가중평균입니다.</p>
          </div>
        </section>
      )}

      {tab === 'awards' && (
        <section className="card">
          {c.awards.length === 0 && <p className="muted">아직 수상 경력이 없습니다.</p>}
          {[...new Set(c.awards.map((a) => a.year))].reverse().map((y) => (
            <div key={y} style={{ marginBottom: 10 }}>
              <b>{y}</b>{' '}
              {c.awards
                .filter((a) => a.year === y)
                .map((a, i) => (
                  <span key={i} className={`award-chip ${a.key === 'MVP' ? 'mvp' : ''}`}>
                    🏆 {a.label}
                  </span>
                ))}
            </div>
          ))}
          <div className="kpis" style={{ marginTop: 14 }}>
            <div className="kpi">
              <div className="lbl">우승 반지</div>
              <div className="num">{c.rings}</div>
            </div>
            <div className="kpi">
              <div className="lbl">올스타</div>
              <div className="num">{c.allStars}</div>
            </div>
            <div className="kpi">
              <div className="lbl">국가대표</div>
              <div className="num">{c.national.caps}회</div>
            </div>
          </div>
          {c.national.medals.length > 0 && <p className="small">🥇 {c.national.medals.join(' · ')}</p>}
        </section>
      )}

      {tab === 'log' && (
        <section className="card">
          <ul className="log">
            {[...c.log].reverse().map((l, i) => (
              <li key={i}>
                <span className="yr">
                  {l.year} · {l.age}세
                </span>
                <span className={l.tone ?? ''}>{l.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'contract' && <ContractTab c={c} />}

      {report && c.lastReport && <SeasonReport rec={c.lastReport} career={c} onClose={() => setReport(false)} />}
    </div>
  );
}

function ContractTab({ c }: { c: Career }) {
  const k = c.contract;
  const country = k ? (k.currency === 'KRW' ? 'KR' : k.currency === 'JPY' ? 'JP' : 'US') : null;
  const typeName: Record<string, string> = {
    rookie: '신인 계약',
    standard: '연봉 계약',
    fa: 'FA 계약',
    posting: '포스팅 계약',
    developmental: '육성선수 계약',
    minor: '마이너 계약',
    arb: '연봉 조정',
    military: '복무',
  };
  return (
    <section className="grid grid-2">
      <div className="card">
        <h3>현재 계약</h3>
        {k ? (
          <div className="kpis">
            <div className="kpi">
              <div className="lbl">구단</div>
              <div className="num" style={{ fontSize: 15 }}>
                {teamName(k.teamId)}
              </div>
            </div>
            <div className="kpi">
              <div className="lbl">연봉</div>
              <div className="num" style={{ fontSize: 15 }}>
                {formatMoney(k.salary, k.currency)}
              </div>
            </div>
            <div className="kpi">
              <div className="lbl">남은 기간</div>
              <div className="num">{k.years}년</div>
            </div>
            <div className="kpi">
              <div className="lbl">종류</div>
              <div className="num" style={{ fontSize: 15 }}>
                {typeName[k.type]}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">계약된 구단이 없습니다.</p>
        )}
        <h3 style={{ marginTop: 16 }}>재산</h3>
        <div className="kpis">
          <div className="kpi">
            <div className="lbl">보유 자산</div>
            <div className="num" style={{ fontSize: 15 }}>
              {formatKRW(c.moneyKRW)}
            </div>
          </div>
          <div className="kpi">
            <div className="lbl">통산 수입</div>
            <div className="num" style={{ fontSize: 15 }}>
              {formatKRW(c.earningsKRW)}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <h3>신상</h3>
        <table className="stats">
          <tbody>
            <tr>
              <td>입단</td>
              <td className="l">{c.draft?.label ?? '-'}</td>
            </tr>
            <tr>
              <td>학력</td>
              <td className="l">{c.education === 'COL' ? '대졸' : '고졸'}</td>
            </tr>
            <tr>
              <td>1군 등록 시즌</td>
              <td className="l">
                한국 {c.service.KR} · 일본 {c.service.JP} · 미국 {c.service.US}
                {country && country !== 'US' && c.faCount === 0 && ` (FA까지 ${Math.max(0, (c.education === 'COL' ? 7 : 8) - c.service[country])}시즌)`}
                {country === 'US' && ` (FA까지 ${Math.max(0, 6 - c.service.US)}시즌)`}
              </td>
            </tr>
            <tr>
              <td>FA 계약</td>
              <td className="l">{c.faCount}회</td>
            </tr>
            <tr>
              <td>병역</td>
              <td className="l">
                {c.nationality !== 'KR'
                  ? '해당 없음'
                  : c.military.status === 'none'
                    ? '미필 (만 28세까지 입대)'
                    : c.military.status === 'serving'
                      ? `복무 중 (${c.military.kind === 'sangmu' ? '국군체육부대' : '현역'})`
                      : c.military.status === 'exempt'
                        ? '면제 (병역 특례)'
                        : '필'}
              </td>
            </tr>
            <tr>
              <td>소속 리그</td>
              <td className="l">{c.level !== 'AMA' && c.level !== 'MIL' ? LEAGUES[c.level].name : '-'}</td>
            </tr>
          </tbody>
        </table>
        <h3 style={{ marginTop: 16 }}>소속 팀 이력</h3>
        <ul className="log">
          {c.teamHistory.map((t, i) => (
            <li key={i}>
              <span className="yr">
                {t.from}–{t.to ?? ''}
              </span>
              <span>{teamName(t.teamId)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OvrChart({ c }: { c: Career }) {
  const pts = [{ age: 18, v: c.seasons[0]?.ovrStart ?? overall(c) }, ...c.seasons.map((s) => ({ age: s.age + 1, v: s.ovrEnd }))];
  if (pts.length < 2) return <p className="muted small">시즌을 진행하면 그래프가 그려집니다.</p>;
  const W = 320;
  const H = 140;
  const minA = pts[0].age;
  const maxA = Math.max(minA + 1, pts[pts.length - 1].age);
  const x = (a: number) => 24 + ((a - minA) / (maxA - minA)) * (W - 34);
  const y = (v: number) => H - 18 - ((v - 30) / 70) * (H - 28);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.age).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} role="img" aria-label="나이별 오버롤 변화">
      {[40, 60, 80].map((v) => (
        <g key={v}>
          <line x1={24} x2={W - 10} y1={y(v)} y2={y(v)} stroke="var(--border)" />
          <text x={2} y={y(v) + 4} fontSize="10" fill="var(--muted)">
            {v}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
      {pts.map((p, i) => (
        <circle key={i} cx={x(p.age)} cy={y(p.v)} r="2.5" fill="var(--primary)" />
      ))}
      <text x={24} y={H - 2} fontSize="10" fill="var(--muted)">
        {minA}세
      </text>
      <text x={W - 10} y={H - 2} fontSize="10" fill="var(--muted)" textAnchor="end">
        {maxA}세
      </text>
    </svg>
  );
}

function RetiredCard({ c }: { c: Career }) {
  const r = c.retired!;
  return (
    <section className="card" style={{ borderColor: 'var(--gold)', borderWidth: 2 }}>
      <div className="spread">
        <h2 style={{ margin: 0 }}>🎉 커리어 종료 · {r.grade}</h2>
        <div className="row">
          {r.hallOfFame && <span className="badge gold">명예의 전당</span>}
          {r.retiredNumber && <span className="badge gold">영구결번 #{c.number} ({r.retiredNumber})</span>}
        </div>
      </div>
      <p className="muted">
        {r.seasons}시즌 (1군 {r.majorSeasons}시즌) · 만 {r.age}세 은퇴 · {r.teams.join(' → ')}
      </p>
      <div className="kpis">
        <div className="kpi">
          <div className="lbl">MVP</div>
          <div className="num">{r.mvp}</div>
        </div>
        <div className="kpi">
          <div className="lbl">최고 OVR</div>
          <div className="num">{r.peakOvr}</div>
        </div>
        <div className="kpi">
          <div className="lbl">개인상</div>
          <div className="num">{r.awardsCount}</div>
        </div>
        <div className="kpi">
          <div className="lbl">통산 WAR</div>
          <div className="num">{r.war.toFixed(1)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">우승</div>
          <div className="num">{r.rings}</div>
        </div>
        <div className="kpi">
          <div className="lbl">통산 수입</div>
          <div className="num" style={{ fontSize: 15 }}>
            {formatKRW(r.earningsKRW)}
          </div>
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        {r.majorSeasons > 0 ? '1군 출전 기록이 있어 오늘의 랭킹에 자동 등록됩니다.' : '1군 출전 기록이 없어 랭킹에는 등록되지 않습니다.'}
      </p>
      <div className="row">
        <a className="btn primary" href="#/new">
          새 커리어 시작
        </a>
        <a className="btn" href="#/rankings">
          오늘의 랭킹 보기
        </a>
      </div>
    </section>
  );
}
