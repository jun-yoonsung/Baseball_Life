import { useMemo, useState } from 'react';
import {
  BAT_KEYS,
  BAT_POS,
  COUNTRY_NAME,
  createCareer,
  makeCandidates,
  NATIONALITIES,
  PIT_KEYS,
  PIT_POS,
  POS_NAME,
  randomSeed,
  RATING_NAME,
  RATING_SUM,
  startCareer,
  velocityKmh,
  type BatPos,
  type Career,
  type Country,
  type CreateInput,
  type Hand,
  type Nationality,
  type PitPos,
  type Role,
} from '../engine';
import { ConfirmButton, PotentialBadge } from '../ui/components';
import { PlayerAvatar, Radar } from '../ui/graphics';

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} type="button" className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

// 드래프트 자격: KBO는 한국, NPB는 일본 학교 출신. MLB는 국제 아마추어 계약으로 누구나 입단할 수 있다.
function startOptions(n: Nationality): Country[] {
  if (n === 'KR') return ['KR', 'US'];
  if (n === 'JP') return ['JP', 'US'];
  return ['US'];
}

export function CreatePage({ onCreate, hasCareer }: { onCreate: (c: Career) => void; hasCareer: boolean }) {
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState<Nationality>('KR');
  const [startCountry, setStartCountry] = useState<Country>('KR');
  const [role, setRole] = useState<Role>('batter');
  const [batPos, setBatPos] = useState<BatPos>('SS');
  const [pitPos, setPitPos] = useState<PitPos>('SP');
  const [bats, setBats] = useState<Hand>('R');
  const [throws, setThrows] = useState<'R' | 'L'>('R');
  const [seed, setSeed] = useState(() => randomSeed());
  const [picked, setPicked] = useState<string | null>(null);

  const input: CreateInput = { name, nationality, startCountry, role, batPos, pitPos, bats, throws };
  const cands = useMemo(
    () => makeCandidates({ name: '', nationality, startCountry, role, batPos, pitPos, bats, throws }, seed),
    [nationality, startCountry, role, batPos, pitPos, bats, throws, seed],
  );
  const chosen = cands.find((c) => c.id === picked);

  const start = () => {
    if (!chosen) return;
    onCreate(startCareer(createCareer(input, chosen)));
  };

  // 포수/내야수는 우투만 현실적
  const leftOk = role === 'pitcher' || !['C', '2B', '3B', 'SS'].includes(batPos) || role === 'twoWay';

  return (
    <div className="grid">
      <div>
        <h1>선수 만들기</h1>
        <p className="muted">모든 후보는 고교 졸업반(만 18세)에서 시작합니다. 능력치 합계는 {RATING_SUM}으로 같고, 구성과 숨겨진 재능이 다릅니다.</p>
      </div>
      <section className="card grid">
        <label className="field">
          선수 이름
          <input type="text" value={name} maxLength={20} placeholder="닉네임을 권장합니다 (실명·연락처 금지)" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-2">
          <label className="field">
            국적
            <select
              value={nationality}
              onChange={(e) => {
                const n = e.target.value as Nationality;
                setNationality(n);
                if (!startOptions(n).includes(startCountry)) setStartCountry(startOptions(n)[0]);
              }}
            >
              {NATIONALITIES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.flag} {n.name}
                </option>
              ))}
            </select>
            <span className="muted small">{nationality === 'KR' ? '대한민국 국적은 병역 의무가 있습니다.' : '국적은 국가대표 출전과 병역에 영향을 줍니다.'}</span>
          </label>
          <label className="field">
            시작 국가
            <select value={startCountry} onChange={(e) => setStartCountry(e.target.value as Country)}>
              {startOptions(nationality).map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_NAME[c]} ({c === 'KR' ? 'KBO 신인 드래프트' : c === 'JP' ? 'NPB 드래프트 회의' : nationality === 'US' ? 'MLB 드래프트' : 'MLB 국제 아마추어 계약'})
                </option>
              ))}
            </select>
            <span className="muted small">KBO·NPB 드래프트는 자국 학교 출신만 참가할 수 있습니다. 다른 국적은 MLB 국제 아마추어 계약으로 시작합니다.</span>
          </label>
        </div>
        <div className="field">
          <b>역할</b>
          <Seg
            value={role}
            onChange={(r) => (setRole(r), setPicked(null))}
            options={[
              ['batter', '타자'],
              ['pitcher', '투수'],
              ['twoWay', '이도류'],
            ]}
          />
        </div>
        {role !== 'pitcher' && (
          <div className="field">
            <b>수비 포지션</b>
            <Seg value={batPos} onChange={(p) => (setBatPos(p), setPicked(null))} options={BAT_POS.map((p) => [p, POS_NAME[p]])} />
          </div>
        )}
        {role !== 'batter' && (
          <div className="field">
            <b>투수 보직</b>
            <Seg value={pitPos} onChange={(p) => (setPitPos(p), setPicked(null))} options={PIT_POS.filter((p) => role !== 'twoWay' || p === 'SP').map((p) => [p, POS_NAME[p]])} />
          </div>
        )}
        <div className="grid grid-2">
          <div className="field">
            <b>투구 손</b>
            <Seg
              value={throws}
              onChange={setThrows}
              options={[
                ['R', '우투'],
                ['L', leftOk ? '좌투' : '좌투 (포지션 제한)'],
              ]}
            />
          </div>
          <div className="field">
            <b>타석</b>
            <Seg
              value={bats}
              onChange={setBats}
              options={[
                ['R', '우타'],
                ['L', '좌타'],
                ['S', '스위치'],
              ]}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="spread" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>후보 선택</h2>
          <button className="btn" onClick={() => (setSeed(randomSeed()), setPicked(null))}>
            🔄 후보 다시 뽑기
          </button>
        </div>
        <div className="grid grid-3">
          {cands.map((c) => (
            <button key={c.id} className={`cand ${picked === c.id ? 'on' : ''}`} onClick={() => setPicked(c.id)}>
              <div className="cand-head">
                <div className="avatar-wrap">
                  <PlayerAvatar c={{ teamId: null, number: 0, role, throws, bats, age: 18 }} size={64} />
                  <div className="ovr-chip small-chip">
                    <b>{c.ovr}</b>
                    <span>OVR</span>
                  </div>
                </div>
                <b style={{ fontSize: 17 }}>{c.style}</b>
              </div>
              <span className="muted small">{c.styleDesc}</span>
              <div className="row">
                <PotentialBadge v={c.scoutPotential} />
                {c.traits.map((t) => (
                  <span key={t} className="badge blue">
                    {t}
                  </span>
                ))}
              </div>
              <div className={role === 'twoWay' ? 'radar-pair' : ''}>
                {role !== 'pitcher' && <Radar items={BAT_KEYS.map((k) => ({ label: RATING_NAME[k], value: c.bat[k] }))} />}
                {role !== 'batter' && <Radar items={PIT_KEYS.map((k) => ({ label: RATING_NAME[k], value: c.pit[k] }))} color="var(--info)" />}
              </div>
              {role !== 'batter' && <span className="muted small">최고 구속 {velocityKmh(c.pit.velocity)}km/h</span>}
            </button>
          ))}
        </div>
        <p className="muted small">스카우트 잠재력 평가는 추정치입니다. 실제 잠재력과 성장 유형(조기 완성형·대기만성형)은 숨겨져 있습니다.</p>
      </section>

      <ConfirmButton
        className="btn primary big block"
        disabled={!chosen || !name.trim() || (throws === 'L' && !leftOk)}
        skip={!hasCareer}
        message="진행 중인 커리어가 있습니다. 새로 시작하면 기존 커리어는 사라집니다."
        confirmLabel="새로 시작"
        onConfirm={start}
        label={!name.trim() ? '이름을 입력하세요' : !chosen ? '후보를 선택하세요' : `${name.trim()} 선수로 커리어 시작`}
      />
    </div>
  );
}
