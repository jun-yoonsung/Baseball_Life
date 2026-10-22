import type { ReactNode } from 'react';
import {
  batRates,
  fmtAvg,
  formatKRW,
  gradeOf,
  ipString,
  LEAGUES,
  pitRates,
  RATING_NAME,
  sumBat,
  sumPit,
  TEAM_MAP,
  teamName,
  type Career,
  type RatingKey,
  type SeasonLine,
  type SeasonRecord,
} from '../engine';

export function BallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#fff" stroke="#d0d0d0" strokeWidth="2" />
      <path d="M14 10c8 8 8 36 0 44M50 10c-8 8-8 36 0 44" fill="none" stroke="#c8102e" strokeWidth="3" strokeDasharray="4 3" />
    </svg>
  );
}

export function RatingBar({ k, v }: { k: RatingKey; v: number }) {
  return (
    <div className="rbar">
      <span>{RATING_NAME[k]}</span>
      <div className="track">
        <div className="fill" style={{ width: `${Math.min(100, v)}%`, opacity: 0.45 + (v / 100) * 0.55 }} />
      </div>
      <span className="val">{Math.round(v)}</span>
    </div>
  );
}

export function Meter({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="meter">
      <div className="lbl">{label}</div>
      <div className="num">
        {value}
        {suffix}
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function TeamLine({ teamId, sub }: { teamId: string | null; sub?: ReactNode }) {
  const color = teamId ? TEAM_MAP[teamId]?.color ?? '#888' : '#888';
  return (
    <div className="teamline">
      <span className="teamdot" style={{ background: color }} />
      <span>{teamName(teamId)}</span>
      {sub}
    </div>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function PotentialBadge({ v }: { v: number }) {
  const g = gradeOf(v);
  return <span className={`badge ${g.startsWith('S') || g.startsWith('A') ? 'gold' : 'green'}`}>잠재력 {g}</span>;
}

const lvlName = (l: SeasonLine) => LEAGUES[l.level].short;
const MAJOR = ['KR1', 'JP1', 'MLB'];

export function BattingTable({ seasons, showMinor }: { seasons: SeasonRecord[]; showMinor: boolean }) {
  const rows = seasons.flatMap((s) => s.lines.filter((l) => l.bat && l.bat.PA > 0 && (showMinor || MAJOR.includes(l.level))).map((l) => ({ s, l })));
  if (!rows.length) return <p className="muted small">타격 기록이 없습니다.</p>;
  const total = sumBat(rows.filter((r) => MAJOR.includes(r.l.level)).map((r) => r.l));
  return (
    <div className="table-wrap">
      <table className="stats">
        <thead>
          <tr>
            <th>연도</th>
            <th className="l">팀</th>
            <th className="l">리그</th>
            <th>경기</th>
            <th>타석</th>
            <th>타율</th>
            <th>안타</th>
            <th>2루타</th>
            <th>홈런</th>
            <th>타점</th>
            <th>득점</th>
            <th>도루</th>
            <th>볼넷</th>
            <th>삼진</th>
            <th>출루율</th>
            <th>장타율</th>
            <th>OPS</th>
            <th>WAR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ s, l }, i) => {
            const b = batRates(l.bat!);
            return (
              <tr key={i} className={MAJOR.includes(l.level) ? '' : 'minor'}>
                <td>{s.year}</td>
                <td className="l">{teamName(l.teamId)}</td>
                <td className="l">{lvlName(l)}</td>
                <td>{b.G}</td>
                <td>{b.PA}</td>
                <td>{fmtAvg(b.AVG)}</td>
                <td>{b.H}</td>
                <td>{b.D}</td>
                <td>{b.HR}</td>
                <td>{b.RBI}</td>
                <td>{b.R}</td>
                <td>{b.SB}</td>
                <td>{b.BB}</td>
                <td>{b.SO}</td>
                <td>{fmtAvg(b.OBP)}</td>
                <td>{fmtAvg(b.SLG)}</td>
                <td>{fmtAvg(b.OPS)}</td>
                <td>{l.batWar.toFixed(1)}</td>
              </tr>
            );
          })}
          {total && (
            <tr className="total">
              <td>1군 통산</td>
              <td className="l" />
              <td className="l" />
              <td>{total.G}</td>
              <td>{total.PA}</td>
              <td>{fmtAvg(total.AVG)}</td>
              <td>{total.H}</td>
              <td>{total.D}</td>
              <td>{total.HR}</td>
              <td>{total.RBI}</td>
              <td>{total.R}</td>
              <td>{total.SB}</td>
              <td>{total.BB}</td>
              <td>{total.SO}</td>
              <td>{fmtAvg(total.OBP)}</td>
              <td>{fmtAvg(total.SLG)}</td>
              <td>{fmtAvg(total.OPS)}</td>
              <td>{rows.filter((r) => MAJOR.includes(r.l.level)).reduce((a, r) => a + r.l.batWar, 0).toFixed(1)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PitchingTable({ seasons, showMinor }: { seasons: SeasonRecord[]; showMinor: boolean }) {
  const rows = seasons.flatMap((s) => s.lines.filter((l) => l.pit && l.pit.outs > 0 && (showMinor || MAJOR.includes(l.level))).map((l) => ({ s, l })));
  if (!rows.length) return <p className="muted small">투구 기록이 없습니다.</p>;
  const total = sumPit(rows.filter((r) => MAJOR.includes(r.l.level)).map((r) => r.l));
  return (
    <div className="table-wrap">
      <table className="stats">
        <thead>
          <tr>
            <th>연도</th>
            <th className="l">팀</th>
            <th className="l">리그</th>
            <th>경기</th>
            <th>선발</th>
            <th>승</th>
            <th>패</th>
            <th>세이브</th>
            <th>홀드</th>
            <th>이닝</th>
            <th>평균자책점</th>
            <th>피안타</th>
            <th>피홈런</th>
            <th>볼넷</th>
            <th>탈삼진</th>
            <th>WHIP</th>
            <th>WAR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ s, l }, i) => {
            const p = pitRates(l.pit!);
            return (
              <tr key={i} className={MAJOR.includes(l.level) ? '' : 'minor'}>
                <td>{s.year}</td>
                <td className="l">{teamName(l.teamId)}</td>
                <td className="l">{lvlName(l)}</td>
                <td>{p.G}</td>
                <td>{p.GS}</td>
                <td>{p.W}</td>
                <td>{p.L}</td>
                <td>{p.SV}</td>
                <td>{p.HLD}</td>
                <td>{ipString(p.outs)}</td>
                <td>{p.ERA.toFixed(2)}</td>
                <td>{p.H}</td>
                <td>{p.HR}</td>
                <td>{p.BB}</td>
                <td>{p.SO}</td>
                <td>{p.WHIP.toFixed(2)}</td>
                <td>{l.pitWar.toFixed(1)}</td>
              </tr>
            );
          })}
          {total && (
            <tr className="total">
              <td>1군 통산</td>
              <td className="l" />
              <td className="l" />
              <td>{total.G}</td>
              <td>{total.GS}</td>
              <td>{total.W}</td>
              <td>{total.L}</td>
              <td>{total.SV}</td>
              <td>{total.HLD}</td>
              <td>{total.IP}</td>
              <td>{total.ERA.toFixed(2)}</td>
              <td>{total.H}</td>
              <td>{total.HR}</td>
              <td>{total.BB}</td>
              <td>{total.SO}</td>
              <td>{total.WHIP.toFixed(2)}</td>
              <td>{rows.filter((r) => MAJOR.includes(r.l.level)).reduce((a, r) => a + r.l.pitWar, 0).toFixed(1)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function lineSummary(l: SeasonLine): string {
  const parts: string[] = [];
  if (l.bat && l.bat.PA > 0) {
    const b = batRates(l.bat);
    parts.push(`${b.G}경기 타율 ${fmtAvg(b.AVG)} ${b.HR}홈런 ${b.RBI}타점 ${b.SB}도루 OPS ${fmtAvg(b.OPS)}`);
  }
  if (l.pit && l.pit.outs > 0) {
    const p = pitRates(l.pit);
    const extra = p.SV ? ` ${p.SV}세이브` : p.HLD ? ` ${p.HLD}홀드` : '';
    parts.push(`${p.G}경기 ${p.W}승 ${p.L}패${extra} ${p.IP}이닝 평균자책점 ${p.ERA.toFixed(2)} ${p.SO}탈삼진`);
  }
  return parts.join(' / ');
}

export function SeasonReport({ rec, career, onClose }: { rec: SeasonRecord; career: Career; onClose: () => void }) {
  const diff = rec.ovrEnd - rec.ovrStart;
  return (
    <Modal onClose={onClose}>
      <div className="spread">
        <h2 style={{ margin: 0 }}>
          {rec.year} 시즌 결산 <span className="muted small">만 {rec.age}세</span>
        </h2>
        <span className={`badge ${diff > 0 ? 'green' : diff < 0 ? 'red' : ''}`}>
          오버롤 {rec.ovrStart} → {rec.ovrEnd} ({diff >= 0 ? '+' : ''}
          {diff})
        </span>
      </div>
      <p className="muted" style={{ margin: '6px 0 14px' }}>
        {teamName(career.seasons.at(-1)?.lines.at(-1)?.teamId ?? career.teamId)} · {rec.teamResult || '-'}
      </p>
      {rec.awards.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {rec.awards.map((a, i) => (
            <span key={i} className={`award-chip ${a.key === 'MVP' ? 'mvp' : ''}`}>
              🏆 {a.label}
            </span>
          ))}
        </div>
      )}
      <div className="kpis" style={{ marginBottom: 12 }}>
        <div className="kpi">
          <div className="lbl">1군 WAR</div>
          <div className="num">{rec.majorWar.toFixed(1)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">연봉</div>
          <div className="num" style={{ fontSize: 15 }}>
            {rec.salaryKRW ? formatKRW(rec.salaryKRW) : '-'}
          </div>
        </div>
        <div className="kpi">
          <div className="lbl">올스타</div>
          <div className="num">{rec.allStar ? '선정' : '-'}</div>
        </div>
      </div>
      {rec.lines.length === 0 && <p>{rec.military ?? '이번 시즌은 경기에 나서지 못했습니다.'}</p>}
      {rec.lines.map((l, i) => (
        <div key={i} className="notice" style={{ marginBottom: 8 }}>
          <b>
            {LEAGUES[l.level].name} · {teamName(l.teamId)}
          </b>
          <div className="small">{lineSummary(l) || '출전 기록 없음'}</div>
        </div>
      ))}
      {rec.military && rec.lines.length > 0 && <p className="small">🎖 {rec.military}</p>}
      {rec.international && <p className="small">🌏 {rec.international}</p>}
      {rec.injuries.length > 0 && <p className="small" style={{ color: 'var(--bad)' }}>🩹 부상: {rec.injuries.join(', ')}</p>}
      {rec.notes.map((n, i) => (
        <p key={i} className="small">
          📌 {n}
        </p>
      ))}
      <button className="btn primary block" onClick={onClose} style={{ marginTop: 10 }}>
        오프시즌으로
      </button>
    </Modal>
  );
}
