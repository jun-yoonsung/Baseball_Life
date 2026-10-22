import { useEffect, useState } from 'react';
import { bestNine, POS_NAME, type RankingEntry } from '../engine';
import { fetchRankings, lastDays, type RankingResult } from '../api';

const SLOT_XY: Record<string, [number, number]> = {
  CF: [200, 58],
  LF: [78, 112],
  RF: [322, 112],
  SS: [140, 175],
  '2B': [260, 175],
  '3B': [76, 250],
  '1B': [324, 250],
  SP: [200, 250],
  C: [200, 345],
  DH: [330, 345],
  RP: [70, 345],
};

function Field({ nine }: { nine: Record<string, RankingEntry | undefined> }) {
  return (
    <svg viewBox="0 0 400 380" className="field-svg" role="img" aria-label="오늘의 베스트 나인">
      <path d="M200 360 L20 180 A255 255 0 0 1 380 180 Z" fill="color-mix(in srgb, var(--primary) 22%, var(--surface))" />
      <path d="M200 340 L280 260 L200 180 L120 260 Z" fill="color-mix(in srgb, #b07a43 35%, var(--surface))" stroke="#fff" strokeWidth="2" />
      <circle cx="200" cy="255" r="12" fill="color-mix(in srgb, #b07a43 50%, var(--surface))" />
      {Object.entries(SLOT_XY).map(([slot, [x, y]]) => {
        const e = nine[slot];
        return (
          <g key={slot} transform={`translate(${x} ${y})`}>
            <rect x={-46} y={-20} width={92} height={40} rx={9} fill="var(--surface)" stroke={e ? 'var(--gold)' : 'var(--border)'} strokeWidth="1.5" />
            <text textAnchor="middle" y={-5} fontSize="10" fill="var(--muted)" fontWeight="700">
              {POS_NAME[slot as keyof typeof POS_NAME] ?? slot}
              {slot === 'RP' ? '·마무리' : ''}
            </text>
            <text textAnchor="middle" y={11} fontSize="12" fill="var(--text)" fontWeight="800">
              {e ? e.name.slice(0, 8) : '—'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RankingsPage() {
  const days = lastDays(7);
  const [date, setDate] = useState(days[0]);
  const [data, setData] = useState<RankingResult | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    fetchRankings(date).then((d) => alive && setData(d));
    const t = window.setInterval(() => fetchRankings(date).then((d) => alive && setData(d)), 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [date]);

  const entries = data?.entries ?? [];
  const nine = bestNine(entries);

  return (
    <div className="grid">
      <div>
        <h1>오늘의 랭킹</h1>
        <p className="muted">한국시간 기준 당일 은퇴한 선수의 기록입니다. MVP 횟수 → 최고 오버롤 → 개인상 횟수 → 통산 WAR 순으로 비교하고, 모두 같으면 공동 순위입니다.</p>
      </div>
      <div className="seg">
        {days.map((d, i) => (
          <button key={d} className={d === date ? 'on' : ''} onClick={() => setDate(d)}>
            {i === 0 ? '오늘' : d.slice(5).replace('-', '/')}
          </button>
        ))}
      </div>
      {data?.source === 'local' && <div className="notice">⚠️ 랭킹 서버에 연결할 수 없어 이 기기에서 은퇴한 선수만 보여 줍니다.</div>}

      <section className="card">
        <h2>오늘의 베스트 나인</h2>
        <Field nine={nine} />
        <p className="muted small" style={{ textAlign: 'center' }}>
          포지션별 1위 선수로 구성합니다. 기록이 없는 자리는 비워 둡니다.
        </p>
      </section>

      <section className="card">
        <h2>순위표</h2>
        {!data && <p className="muted">불러오는 중…</p>}
        {data && entries.length === 0 && <p className="muted">아직 등록된 기록이 없습니다. 첫 번째 주인공이 되어 보세요!</p>}
        {entries.length > 0 && (
          <div className="table-wrap">
            <table className="stats">
              <thead>
                <tr>
                  <th>순위</th>
                  <th className="l">선수</th>
                  <th className="l">포지션</th>
                  <th>MVP</th>
                  <th>최고 OVR</th>
                  <th>개인상</th>
                  <th>WAR</th>
                  <th>우승</th>
                  <th className="l">통산 기록</th>
                  <th className="l">등급</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 200).map((e) => (
                  <tr key={e.id}>
                    <td>{e.rank}</td>
                    <td className="l">
                      {e.nationality} <b>{e.name}</b>
                      {e.hallOfFame && ' 🏛'}
                    </td>
                    <td className="l">{e.role === 'twoWay' ? '이도류' : POS_NAME[e.pos as keyof typeof POS_NAME] ?? e.pos}</td>
                    <td>{e.mvp}</td>
                    <td>{e.peakOvr}</td>
                    <td>{e.awards}</td>
                    <td>{e.war.toFixed(1)}</td>
                    <td>{e.rings}</td>
                    <td className="l">{e.line}</td>
                    <td className="l">{e.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">기기에서 제출된 기록이므로 조작을 완전히 막는 공식 대회용 랭킹은 아닙니다. 공개를 원하지 않는 기록은 삭제를 요청할 수 있습니다.</p>
      </section>
    </div>
  );
}
