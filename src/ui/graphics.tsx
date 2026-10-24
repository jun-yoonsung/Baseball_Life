// 게임 그래픽: 선수 일러스트, 구단 엠블럼, 레이더 차트, 타구 분포, 투구 결과, WAR 막대, 아이콘.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Rng } from '../engine/rng';
import { TEAM_MAP, type BattingLine, type Career, type PitchingLine, type SeasonRecord } from '../engine';

const SKIN = '#e9b48f';
const SKIN_SHADE = '#d39a74';
const LEATHER = '#a8672f';
const WOOD = '#c99358';

export function teamColor(id: string | null | undefined): string {
  return (id && TEAM_MAP[id]?.color) || '#5f6f66';
}

// 배경색 위에서 읽히는 글자색 (흰색 또는 짙은 남색)
export function inkOn(hex: string): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#1b2420' : '#ffffff';
}

function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * (1 + amt)))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function teamCode(id: string | null | undefined): string {
  if (!id) return '?';
  return TEAM_MAP[id]?.abbr ?? id.charAt(0).toUpperCase();
}

export function TeamEmblem({ teamId, size = 36, title }: { teamId: string | null | undefined; size?: number; title?: string }) {
  const c = teamColor(teamId);
  const ink = inkOn(c);
  return (
    <svg viewBox="0 0 40 44" width={size} height={size * 1.1} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} className="emblem">
      <path d="M20 2 L37 8 V22 C37 33 29 39 20 42 C11 39 3 33 3 22 V8 Z" fill={c} stroke={shade(c, -0.35)} strokeWidth="1.5" />
      <path d="M20 6.5 L33 11 V22 C33 30 27.5 35 20 37.6 C12.5 35 7 30 7 22 V11 Z" fill="none" stroke={ink} strokeOpacity="0.35" strokeWidth="1.2" />
      <text
        x="20"
        y={teamCode(teamId).length > 2 ? 26 : 27.5}
        textAnchor="middle"
        fontSize={teamCode(teamId).length > 2 ? 10.5 : teamCode(teamId).length === 2 ? 13 : 17}
        fontWeight="900"
        fill={ink}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        textLength={teamCode(teamId).length > 2 ? 26 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {teamCode(teamId)}
      </text>
    </svg>
  );
}

type AvatarCareer = Pick<Career, 'teamId' | 'number' | 'role' | 'throws' | 'bats' | 'age'> & { phase?: Career['phase'] };

// 선수 일러스트. 투수는 글러브, 타자는 배트를 들고, 좌투/좌타면 좌우 반전한다.
export function PlayerAvatar({ c, size = 112, ring }: { c: AvatarCareer; size?: number; ring?: string }) {
  const uid = useId().replace(/:/g, '');
  const col = c.phase === 'retired' ? '#7b6a4f' : teamColor(c.teamId);
  const ink = inkOn(col);
  const dark = shade(col, -0.3);
  const pitcher = c.role !== 'batter';
  const left = pitcher ? c.throws === 'L' : c.bats === 'L';
  const hair = c.age >= 35 ? '#b9b4ac' : '#2c2622';
  const num = c.number > 0 ? String(c.number) : '';
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="선수 일러스트" className="avatar">
      <defs>
        <clipPath id={`clip-${uid}`}>
          <circle cx="60" cy="60" r="58" />
        </clipPath>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity="0.28" />
          <stop offset="1" stopColor={col} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="var(--surface-2)" />
      <g clipPath={`url(#clip-${uid})`}>
        <rect width="120" height="120" fill={`url(#bg-${uid})`} />
        <path d="M-10 104 Q60 88 130 104 V130 H-10 Z" fill="var(--field)" opacity="0.55" />
        <g transform={left ? 'translate(120 0) scale(-1 1)' : undefined}>
          {!pitcher && (
            <g>
              <path d="M78 74 L104 14 L109 16 L84 76 Z" fill={WOOD} stroke={shade(WOOD, -0.3)} strokeWidth="0.8" />
              <circle cx="80" cy="76" r="3.2" fill={shade(WOOD, -0.25)} />
            </g>
          )}
          {/* 몸통 */}
          <path d="M26 122 C26 96 38 84 60 82 C82 84 94 96 94 122 Z" fill={col} />
          <path d="M60 82 L60 122" stroke={dark} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
          <path d="M52 82 L60 92 L68 82" fill="none" stroke={dark} strokeWidth="2" />
          {/* 팔 */}
          <path d="M34 96 C28 104 30 114 40 116" fill="none" stroke={col} strokeWidth="11" strokeLinecap="round" />
          <path d="M86 96 C92 102 88 108 80 112" fill="none" stroke={col} strokeWidth="11" strokeLinecap="round" />
          {!pitcher && <circle cx="80" cy="78" r="5.5" fill={SKIN} />}
          {pitcher && (
            <g>
              <path d="M28 98 C20 96 18 110 26 116 C32 120 42 118 44 110 C46 102 36 98 28 98 Z" fill={LEATHER} stroke={shade(LEATHER, -0.3)} strokeWidth="1" />
              <path d="M27 104 L39 106 M27 109 L39 111" stroke={shade(LEATHER, -0.35)} strokeWidth="1" />
              <circle cx="82" cy="112" r="6" fill="#f7f4ee" stroke="#d3c9bb" />
              <path d="M78 109 Q82 112 78 115 M86 109 Q82 112 86 115" fill="none" stroke="#c8102e" strokeWidth="0.8" />
            </g>
          )}
          {/* 목, 얼굴 */}
          <rect x="54" y="72" width="12" height="12" rx="3" fill={SKIN_SHADE} />
          <circle cx="60" cy="60" r="17" fill={SKIN} />
          <path d="M44 60 Q44 70 48 72" fill="none" stroke={hair} strokeWidth="3" strokeLinecap="round" />
          <circle cx="54" cy="61" r="1.8" fill="#2a211c" />
          <circle cx="66" cy="61" r="1.8" fill="#2a211c" />
          <path d="M55 68 Q60 71.5 65 68" fill="none" stroke="#7a4b35" strokeWidth="1.6" strokeLinecap="round" />
          {c.age >= 30 && <path d="M50 70 Q60 78 70 70" fill="none" stroke={hair} strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />}
          {/* 모자 */}
          <path d="M42 56 C42 37 78 37 78 56 Z" fill={col} stroke={dark} strokeWidth="1" />
          <path d="M60 39 L60 56" stroke={dark} strokeWidth="0.8" opacity="0.6" />
          <path d="M74 55 C84 54 92 56 93 58 C88 60 80 60 72 59 Z" fill={dark} />
          <circle cx="60" cy="39" r="1.6" fill={dark} />
        </g>
        {/* 등번호/가슴 번호는 반전하지 않는다 */}
        <text x="60" y="110" textAnchor="middle" fontSize="15" fontWeight="900" fill={ink} fontFamily="Georgia, 'Times New Roman', serif">
          {num}
        </text>
        <text x={left ? 64 : 56} y="51" textAnchor="middle" fontSize={teamCode(c.teamId).length > 2 ? 5.5 : 8} fontWeight="900" fill={ink} fontFamily="Georgia, serif" fontStyle="italic">
          {c.phase === 'retired' ? '' : teamCode(c.teamId)}
        </text>
      </g>
      <circle cx="60" cy="60" r="58" fill="none" stroke={ring ?? 'var(--border)'} strokeWidth={ring ? 3 : 1.5} />
    </svg>
  );
}

// 6각형 능력치 레이더
export function Radar({ items, size = 240, color = 'var(--primary)' }: { items: { label: string; value: number }[]; size?: number; color?: string }) {
  const W = 260;
  const cx = W / 2;
  const cy = 128;
  const R = 86;
  const n = items.length;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const scale = (v: number) => (Math.max(20, Math.min(100, v)) - 20) / 80;
  const ring = (f: number) => items.map((_, i) => pt(i, R * f).join(',')).join(' ');
  const poly = items.map((it, i) => pt(i, R * scale(it.value)).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${W} 256`} width="100%" style={{ maxWidth: size }} role="img" aria-label={items.map((i) => `${i.label} ${Math.round(i.value)}`).join(', ')} className="radar">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill={f === 1 ? 'var(--surface-2)' : 'none'} stroke="var(--border)" strokeWidth="1" />
      ))}
      {items.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />;
      })}
      <polygon points={poly} fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2.5" strokeLinejoin="round" className="radar-shape" />
      {items.map((it, i) => {
        const [x, y] = pt(i, R * scale(it.value));
        return <circle key={i} cx={x} cy={y} r="3.5" fill={color} />;
      })}
      {items.map((it, i) => {
        const [x, y] = pt(i, R + 22);
        return (
          <g key={it.label}>
            <text x={x} y={y - 2} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--muted)">
              {it.label}
            </text>
            <text x={x} y={y + 13} textAnchor="middle" fontSize="13" fontWeight="900" fill="var(--text)">
              {Math.round(it.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 타구 분포: 시즌 안타 수를 바탕으로 그린 예시 그림 (실제 타구 좌표는 기록하지 않는다)
export function SprayChart({ bat, seed, bats }: { bat: BattingLine; seed: number; bats: Career['bats'] }) {
  const rng = new Rng(seed);
  const cx = 130;
  const cy = 200;
  const singles = bat.H - bat.D - bat.T - bat.HR;
  const total = singles + bat.D + bat.T + bat.HR;
  const k = total > 90 ? 90 / total : 1;
  const pull = bats === 'L' ? 1 : bats === 'R' ? -1 : 0;
  const dots: { x: number; y: number; t: 's' | 'd' | 't' | 'hr' }[] = [];
  const place = (count: number, t: 's' | 'd' | 't' | 'hr', r0: number, r1: number, spread: number) => {
    for (let i = 0; i < Math.round(count * k); i++) {
      const a = (rng.normal(pull * 8, spread) * Math.PI) / 180;
      const r = rng.range(r0, r1);
      dots.push({ x: cx + Math.sin(a) * r, y: cy - Math.cos(a) * r, t });
    }
  };
  place(singles, 's', 62, 112, 24);
  place(bat.D, 'd', 112, 148, 30);
  place(bat.T, 't', 140, 158, 36);
  place(bat.HR, 'hr', 168, 186, 24);
  const fill = { s: 'var(--info)', d: 'var(--good)', t: 'var(--gold)', hr: 'var(--accent)' };
  return (
    <figure className="chart-fig">
      <svg viewBox="0 0 260 210" width="100%" role="img" aria-label={`타구 분포: 단타 ${singles}, 2루타 ${bat.D}, 3루타 ${bat.T}, 홈런 ${bat.HR}`}>
        <path d={`M${cx} ${cy} L${cx - 116} ${cy - 116} A164 164 0 0 1 ${cx + 116} ${cy - 116} Z`} fill="var(--field)" fillOpacity="0.45" />
        <path d={`M${cx - 116} ${cy - 116} A164 164 0 0 1 ${cx + 116} ${cy - 116}`} fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="4 3" />
        <path d={`M${cx} ${cy} L${cx - 42} ${cy - 42} L${cx} ${cy - 84} L${cx + 42} ${cy - 42} Z`} fill="var(--dirt)" fillOpacity="0.7" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.t === 'hr' ? 4 : 3} fill={fill[d.t]} fillOpacity="0.85" stroke="var(--surface)" strokeWidth="0.8" />
        ))}
      </svg>
      <figcaption className="legend">
        <span>
          <i style={{ background: fill.s }} />
          단타 {singles}
        </span>
        <span>
          <i style={{ background: fill.d }} />
          2루타 {bat.D}
        </span>
        <span>
          <i style={{ background: fill.t }} />
          3루타 {bat.T}
        </span>
        <span>
          <i style={{ background: fill.hr }} />
          홈런 {bat.HR}
        </span>
      </figcaption>
    </figure>
  );
}

// 투구 결과 도넛: 상대 타자를 어떻게 처리했는지
export function PitchDonut({ pit }: { pit: PitchingLine }) {
  const hits = pit.H - pit.HR;
  const walks = pit.BB + pit.HBP;
  const outs = Math.max(0, pit.BF - pit.SO - hits - pit.HR - walks);
  const parts = [
    { label: '탈삼진', v: pit.SO, c: 'var(--primary)' },
    { label: '범타', v: outs, c: 'var(--info)' },
    { label: '피안타', v: hits, c: 'var(--gold)' },
    { label: '볼넷·사구', v: walks, c: 'var(--muted)' },
    { label: '피홈런', v: pit.HR, c: 'var(--accent)' },
  ];
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  const R = 62;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const era = pit.outs ? (pit.ER * 27) / pit.outs : 0;
  return (
    <figure className="chart-fig">
      <svg viewBox="0 0 200 170" width="100%" role="img" aria-label={parts.map((p) => `${p.label} ${p.v}`).join(', ')}>
        <g transform="rotate(-90 100 85)">
          {parts.map((p) => {
            const len = (p.v / total) * C;
            const el = <circle key={p.label} cx="100" cy="85" r={R} fill="none" stroke={p.c} strokeWidth="22" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />;
            acc += len;
            return el;
          })}
        </g>
        <text x="100" y="80" textAnchor="middle" fontSize="12" fill="var(--muted)" fontWeight="700">
          평균자책점
        </text>
        <text x="100" y="102" textAnchor="middle" fontSize="24" fill="var(--text)" fontWeight="900">
          {era.toFixed(2)}
        </text>
      </svg>
      <figcaption className="legend">
        {parts.map((p) => (
          <span key={p.label}>
            <i style={{ background: p.c }} />
            {p.label} {p.v}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

// 시즌별 1군 WAR 막대. MVP 시즌은 금색.
export function WarBars({ seasons, mvpYears }: { seasons: SeasonRecord[]; mvpYears: Set<number> }) {
  if (!seasons.length) return <p className="muted small">시즌을 진행하면 그래프가 그려집니다.</p>;
  const W = 520;
  const H = 170;
  const top = 18;
  const bottom = 26;
  const maxV = Math.max(4, ...seasons.map((s) => s.majorWar));
  const minV = Math.min(0, ...seasons.map((s) => s.majorWar));
  const y = (v: number) => top + ((maxV - v) / (maxV - minV)) * (H - top - bottom);
  const bw = (W - 40) / seasons.length;
  const step = seasons.length > 14 ? Math.ceil(seasons.length / 7) : seasons.length > 7 ? 2 : 1;
  const ticks = [0, Math.round(maxV / 2), Math.round(maxV)].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="chart-wide" role="img" aria-label="시즌별 1군 WAR">
      {ticks.map((t) => (
        <g key={t}>
          <line x1="32" x2={W - 6} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={t === 0 ? 1.5 : 1} />
          <text x="26" y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}
      {seasons.map((s, i) => {
        const x = 36 + i * bw;
        const v = s.majorWar;
        const mvp = mvpYears.has(s.year);
        const y0 = y(0);
        const y1 = y(v);
        return (
          <g key={s.year}>
            <rect
              x={x + bw * 0.15}
              y={Math.min(y0, y1)}
              width={bw * 0.7}
              height={Math.max(1, Math.abs(y1 - y0))}
              rx="2"
              fill={mvp ? 'var(--gold)' : v < 0 ? 'var(--bad)' : s.military ? 'var(--muted)' : 'var(--primary)'}
              opacity={v === 0 ? 0.4 : 1}
            >
              <title>{`${s.year} (${s.age}세) WAR ${v.toFixed(1)}${mvp ? ' · MVP' : ''}`}</title>
            </rect>
            {mvp && (
              <text x={x + bw / 2} y={y1 - 4} textAnchor="middle" fontSize="11" fill="var(--gold)">
                ★
              </text>
            )}
            {i % step === 0 && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {`'${String(s.year).slice(2)}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// 커리어 타임라인: 나이 축 위에 소속팀 띠와 주요 사건
export function CareerTimeline({ c }: { c: Career }) {
  if (!c.seasons.length) return null;
  const first = c.seasons[0].year;
  const last = c.seasons[c.seasons.length - 1].year;
  const span = Math.max(1, last - first + 1);
  const W = 520;
  const x = (yr: number) => 10 + ((yr - first) / span) * (W - 20);
  const segs: { teamId: string; from: number; to: number }[] = [];
  for (const s of c.seasons) {
    const l = [...s.lines].sort((a, b) => (b.bat?.PA ?? 0) + (b.pit?.outs ?? 0) - ((a.bat?.PA ?? 0) + (a.pit?.outs ?? 0)))[0];
    const team = l?.teamId ?? (s.military ? 'kr-military' : null);
    if (!team) continue;
    const prev = segs[segs.length - 1];
    if (prev && prev.teamId === team && prev.to === s.year) prev.to = s.year + 1;
    else segs.push({ teamId: team, from: s.year, to: s.year + 1 });
  }
  const mvp = new Set(c.awards.filter((a) => a.key === 'MVP').map((a) => a.year));
  const majorYears = new Set(c.seasons.filter((s) => s.lines.some((l) => ['KR1', 'JP1', 'MLB'].includes(l.level))).map((s) => s.year));
  return (
    <svg viewBox={`0 0 ${W} 96`} width="100%" className="chart-wide" role="img" aria-label="커리어 타임라인">
      {segs.map((s, i) => {
        const col = teamColor(s.teamId);
        const w = x(s.to) - x(s.from);
        return (
          <g key={i}>
            <rect x={x(s.from)} y="30" width={Math.max(2, w - 1.5)} height="22" rx="5" fill={col}>
              <title>{`${TEAM_MAP[s.teamId]?.name ?? s.teamId} ${s.from}–${s.to - 1}`}</title>
            </rect>
            {w > 54 && (
              <text x={x(s.from) + 6} y="45.5" fontSize="11" fontWeight="800" fill={inkOn(col)}>
                {(TEAM_MAP[s.teamId]?.name ?? '').split(' ').slice(-1)[0]}
              </text>
            )}
          </g>
        );
      })}
      {c.seasons.map((s) => (
        <g key={s.year}>
          {majorYears.has(s.year) && <rect x={x(s.year) + 1} y="56" width={Math.max(1, x(s.year + 1) - x(s.year) - 2)} height="3" rx="1.5" fill="var(--primary)" />}
          {(mvp.has(s.year) || s.champion) && (
            <text x={(x(s.year) + x(s.year + 1)) / 2} y="22" textAnchor="middle" fontSize="13" fill="var(--gold)">
              {mvp.has(s.year) ? '★' : '◆'}
            </text>
          )}
        </g>
      ))}
      <text x="10" y="80" fontSize="11" fill="var(--muted)">
        {first} · {c.seasons[0].age}세
      </text>
      <text x={W - 10} y="80" fontSize="11" fill="var(--muted)" textAnchor="end">
        {last} · {c.seasons[c.seasons.length - 1].age}세
      </text>
      <text x={W / 2} y="80" fontSize="10.5" fill="var(--muted)" textAnchor="middle">
        ★ MVP · ◆ 우승 · 초록 밑줄 1군 시즌
      </text>
    </svg>
  );
}

export function TrophyIcon({ size = 16, mvp }: { size?: number; mvp?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="trophy">
      <path d="M7 3h10v4a5 5 0 0 1-10 0Z" fill={mvp ? '#fff' : 'currentColor'} />
      <path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" fill="none" stroke={mvp ? '#fff' : 'currentColor'} strokeWidth="1.6" />
      <path d="M11 12h2v4h-2zM8 17h8v3H8z" fill={mvp ? '#fff' : 'currentColor'} />
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  draftChoice: (
    <>
      <path d="M12 38 C12 22 52 22 52 38 Z" fill="var(--primary)" />
      <path d="M46 37 C56 36 60 38 61 40 C56 42 50 42 44 41 Z" fill="var(--primary)" opacity="0.7" />
      <rect x="10" y="40" width="44" height="14" rx="3" fill="var(--surface)" stroke="var(--border)" />
      <text x="32" y="51" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--text)">
        DRAFT
      </text>
    </>
  ),
  fa: (
    <>
      <rect x="14" y="8" width="34" height="46" rx="3" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <path d="M20 18h22M20 25h22M20 32h14" stroke="var(--muted)" strokeWidth="2" />
      <path d="M22 44 q6 -6 10 0 t10 0" fill="none" stroke="var(--primary)" strokeWidth="2.4" />
      <path d="M44 34 L56 22 L60 26 L48 38 L43 39 Z" fill="var(--gold)" />
    </>
  ),
  posting: (
    <>
      <path d="M6 36 L58 18 L62 22 L40 34 L44 52 L38 54 L30 38 L16 42 L12 48 L8 46 Z" fill="var(--info)" />
      <circle cx="50" cy="48" r="6" fill="var(--surface)" stroke="var(--muted)" />
    </>
  ),
  military: (
    <>
      <path d="M10 40 C10 20 54 20 54 40 Z" fill="#4b5320" />
      <rect x="6" y="38" width="52" height="6" rx="3" fill="#3a4119" />
      <path d="M32 26 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 Z" fill="var(--gold)" />
    </>
  ),
  tommyJohn: (
    <>
      <rect x="12" y="12" width="40" height="40" rx="10" fill="var(--surface)" stroke="var(--bad)" strokeWidth="2.5" />
      <path d="M32 20 V44 M20 32 H44" stroke="var(--bad)" strokeWidth="7" strokeLinecap="round" />
    </>
  ),
  retireSuggest: (
    <>
      <rect x="10" y="10" width="44" height="44" rx="6" fill="#b08d57" />
      <rect x="14" y="14" width="36" height="36" rx="4" fill="none" stroke="#f3e2bf" strokeWidth="1.5" />
      <path d="M22 40 h20 M24 33 h16 M27 26 h10" stroke="#f3e2bf" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  released: (
    <>
      <rect x="14" y="20" width="36" height="30" rx="4" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <path d="M24 20 V14 h16 v6" fill="none" stroke="var(--muted)" strokeWidth="2.5" />
      <path d="M22 35 h20" stroke="var(--muted)" strokeWidth="2.5" />
    </>
  ),
  event: (
    <>
      <circle cx="32" cy="32" r="22" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <path d="M18 24 C26 28 26 36 18 40 M46 24 C38 28 38 36 46 40" fill="none" stroke="#c8102e" strokeWidth="2" strokeDasharray="3 2.5" />
    </>
  ),
};
ICONS.national = (
  <>
    <rect x="10" y="12" width="44" height="30" rx="3" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
    <circle cx="32" cy="27" r="8" fill="#c8102e" />
    <path d="M24 27 a8 8 0 0 0 16 0 a4 4 0 0 0 -8 0 a4 4 0 0 1 -8 0" fill="#0047a0" />
    <path d="M22 46 L32 58 L42 46" fill="var(--gold)" />
    <circle cx="32" cy="48" r="7" fill="var(--gold)" stroke="#9a7212" />
  </>
);
ICONS.undrafted = ICONS.draftChoice;
ICONS.postingOffers = ICONS.posting;
ICONS.returnHome = ICONS.posting;

export function DecisionArt({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" className="decision-art">
      {ICONS[kind] ?? ICONS.event}
    </svg>
  );
}

function reduceMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// 홈 화면 야구장 일러스트 (야간 경기)
export function StadiumScene() {
  return (
    <svg viewBox="0 0 640 300" className="stadium" preserveAspectRatio="xMidYMax slice" role="img" aria-label="야간 경기가 열리는 야구장">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1d33" />
          <stop offset="1" stopColor="#1f4b5e" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0" r="0.6">
          <stop offset="0" stopColor="#fff6d6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="300" fill="url(#sky)" />
      {[
        [40, 30],
        [120, 52],
        [210, 22],
        [430, 40],
        [520, 18],
        [600, 50],
        [330, 28],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill="#fff" opacity="0.7" />
      ))}
      {/* 조명탑 */}
      {[70, 570].map((x) => (
        <g key={x}>
          <rect x={x - 2} y="58" width="4" height="120" fill="#2b3b48" />
          <rect x={x - 22} y="44" width="44" height="16" rx="3" fill="#33485a" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={x - 15 + i * 10} cy="52" r="3.6" fill="#fff8de" />
          ))}
          <ellipse cx={x} cy="120" rx="160" ry="120" fill="url(#glow)" />
        </g>
      ))}
      {/* 관중석 */}
      <path d="M0 170 Q320 70 640 170 V210 H0 Z" fill="#203241" />
      <path d="M0 182 Q320 92 640 182 V214 H0 Z" fill="#2a4152" />
      {Array.from({ length: 60 }).map((_, i) => {
        const x = 8 + i * 10.6;
        const y = 178 - Math.sin((i / 59) * Math.PI) * 74 + ((i * 7) % 5);
        return <circle key={i} cx={x} cy={y} r="2.2" fill={['#e9b48f', '#c8102e', '#fff', '#3fae72', '#f5c400'][i % 5]} opacity="0.8" />;
      })}
      {/* 전광판 */}
      <rect x="270" y="96" width="100" height="40" rx="4" fill="#0d1218" stroke="#435a6b" />
      <text x="320" y="113" textAnchor="middle" fontSize="11" fill="#ffcf4a" fontFamily="ui-monospace, monospace" fontWeight="700">
        HOME 3 : 2 AWAY
      </text>
      <text x="320" y="128" textAnchor="middle" fontSize="10" fill="#7ee0a1" fontFamily="ui-monospace, monospace">
        9회말 2사 만루
      </text>
      {/* 그라운드 */}
      <path d="M0 210 Q320 176 640 210 V300 H0 Z" fill="#2f8f5b" />
      <path d="M0 230 Q320 196 640 230" fill="none" stroke="#3aa569" strokeWidth="14" opacity="0.5" />
      <path d="M320 292 L230 244 L320 210 L410 244 Z" fill="#c7915a" />
      <path d="M320 284 L246 244 L320 218 L394 244 Z" fill="#2f8f5b" />
      {[
        [320, 288],
        [236, 244],
        [320, 213],
        [404, 244],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 4} y={y - 4} width="8" height="8" fill="#fff" transform={`rotate(45 ${x} ${y})`} />
      ))}
      <ellipse cx="320" cy="248" rx="11" ry="5" fill="#c7915a" />
      {/* 날아가는 공 */}
      <path className="ball-arc" d="M320 282 Q470 90 590 150" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="4 6" />
      {reduceMotion() ? (
        <circle cx="590" cy="150" r="5" fill="#fff" />
      ) : (
        <circle r="5" fill="#fff">
          <animateMotion dur="3.2s" repeatCount="indefinite" path="M320 282 Q470 90 590 150" keyPoints="0;1;1" keyTimes="0;0.7;1" calcMode="linear" />
          <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.7;1" dur="3.2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

// 시즌 진행 연출: 전광판 숫자가 올라가고, 끝나면 onDone
export function SeasonSim({ rec, c, onDone }: { rec: SeasonRecord; c: Career; onDone: () => void }) {
  const [t, setT] = useState(0);
  const reduce = reduceMotion();
  useEffect(() => {
    if (reduce) {
      onDone();
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setT(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else window.setTimeout(onDone, 350);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone, reduce]);
  const main = [...rec.lines].sort((a, b) => (b.bat?.PA ?? 0) + (b.pit?.outs ?? 0) - ((a.bat?.PA ?? 0) + (a.pit?.outs ?? 0)))[0];
  const games = main ? Math.max(main.bat?.G ?? 0, main.pit?.G ?? 0) : 0;
  const e = 1 - Math.pow(1 - t, 3);
  const cnt = (v: number) => Math.round(v * e);
  const cells: [string, string][] = [];
  if (main?.bat && main.bat.PA > 0) {
    const b = main.bat;
    const ab = cnt(b.AB);
    const h = cnt(b.H);
    cells.push(['타율', ab ? (h / ab).toFixed(3).replace(/^0/, '') : '.000'], ['홈런', String(cnt(b.HR))], ['타점', String(cnt(b.RBI))]);
  }
  if (main?.pit && main.pit.outs > 0) {
    const p = main.pit;
    cells.push(['승', String(cnt(p.W))], [p.SV ? '세이브' : '탈삼진', String(cnt(p.SV || p.SO))], ['이닝', String(Math.floor(cnt(p.outs) / 3))]);
  }
  if (!cells.length) cells.push(['상태', rec.military ?? '휴식']);
  return (
    <div className="modal-bg" onClick={onDone} role="dialog" aria-modal="true" aria-label={`${rec.year} 시즌 진행 중`}>
      <div className="scoreboard" onClick={(ev) => ev.stopPropagation()}>
        <div className="sb-top">
          <PlayerAvatar c={c} size={64} />
          <div>
            <div className="sb-year">{rec.year} SEASON</div>
            <div className="sb-team">{TEAM_MAP[main?.teamId ?? c.teamId ?? '']?.name ?? '-'}</div>
          </div>
        </div>
        <div className="sb-progress">
          <div style={{ width: `${t * 100}%` }} />
          <svg viewBox="0 0 20 20" className="sb-ball" style={{ left: `calc(${t * 100}% - 10px)` }} aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="#fff" />
            <path d="M5 4 Q9 10 5 16 M15 4 Q11 10 15 16" fill="none" stroke="#c8102e" strokeWidth="1.2" />
          </svg>
        </div>
        <div className="sb-games">
          {games ? `${cnt(games)} / ${games} 경기` : '시즌 진행 중'}
          {t >= 1 && rec.awards.length > 0 && <span className="sb-flash"> · 수상 {rec.awards.length}개!</span>}
        </div>
        <div className="sb-cells">
          {cells.map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
        <button className="btn block" onClick={onDone}>
          결과 바로 보기
        </button>
      </div>
    </div>
  );
}

export function HallPlaque({ c, grade, lines }: { c: Career; grade: string; lines: string[] }) {
  return (
    <div className="plaque">
      <PlayerAvatar c={c} size={92} ring="#f3e2bf" />
      <div>
        <div className="plaque-grade">{grade}</div>
        <div className="plaque-name">{c.name}</div>
        {lines.map((l) => (
          <div key={l} className="plaque-line">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
