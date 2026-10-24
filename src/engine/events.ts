// 오프시즌 랜덤 이벤트. 각 선택지는 커리어를 직접 바꾸고 결과 문장을 돌려준다.
import { countryOfTeam, moveTeam } from './contracts';
import { grantItem } from './equipment';
import { teamName, teamsOf } from './data';
import { addRating, batOvr, overall, pitOvr, velocityKmh } from './ratings';
import { clamp, type Rng } from './rng';
import type { Career } from './types';

export interface EventOption {
  id: string;
  label: string;
  desc?: string;
  apply: (c: Career, rng: Rng) => string;
  enabled?: (c: Career) => boolean;
}

export interface GameEvent {
  id: string;
  title: string;
  weight: number;
  cond: (c: Career) => boolean;
  body: (c: Career) => string;
  options: EventOption[];
}

const isBat = (c: Career) => c.role !== 'pitcher';
const isPit = (c: Career) => c.role !== 'batter';
const pro = (c: Career) => c.level !== 'AMA' && c.level !== 'COL' && c.level !== 'MIL' && !!c.teamId;

export function adjust(c: Career, key: 'condition' | 'morale' | 'trust' | 'fame', d: number) {
  c[key] = clamp(Math.round(c[key] + d), 0, 100);
}

export function pay(c: Career, krw: number) {
  c.moneyKRW += krw;
  if (krw > 0) c.earningsKRW += krw;
}

const MAN = 10_000;

export const EVENTS: GameEvent[] = [
  {
    id: 'trainer',
    title: '개인 트레이너 제안',
    weight: 1,
    cond: (c) => c.moneyKRW >= 5000 * MAN,
    body: () => '유명 개인 트레이너가 비시즌 맞춤 훈련을 제안했습니다. 비용은 5,000만원입니다.',
    options: [
      {
        id: 'hire',
        label: '고용한다 (-5,000만원)',
        apply: (c, rng) => {
          pay(c, -5000 * MAN);
          c.flags.growthBoost = 1.25;
          adjust(c, 'condition', 5);
          return rng.chance(0.85) ? '체계적인 훈련으로 몸이 확실히 좋아졌습니다. 다음 성장에 보너스가 붙습니다.' : '훈련 방식이 잘 맞지 않았지만 체력은 좋아졌습니다.';
        },
      },
      { id: 'skip', label: '혼자 훈련한다', apply: () => '익숙한 루틴대로 비시즌을 보냈습니다.' },
    ],
  },
  {
    id: 'mentor',
    title: '베테랑 선배의 조언',
    weight: 1.2,
    cond: (c) => pro(c) && c.age <= 27,
    body: () => '팀의 베테랑 선배가 따로 시간을 내서 노하우를 전수해 주겠다고 합니다.',
    options: [
      {
        id: 'learn',
        label: '배운다',
        apply: (c) => {
          if (isBat(c)) addRating(c, 'eye', 2);
          if (isPit(c)) addRating(c, 'composure', 2);
          adjust(c, 'morale', 4);
          return isBat(c) ? '공을 보는 눈이 한층 좋아졌습니다. (선구안 +2)' : '마운드 위에서의 여유가 생겼습니다. (멘탈 +2)';
        },
      },
      {
        id: 'own',
        label: '내 스타일을 고집한다',
        apply: (c) => {
          adjust(c, 'trust', -3);
          return '선배는 서운한 눈치였습니다. (감독 신뢰 -3)';
        },
      },
    ],
  },
  {
    id: 'tv',
    title: '예능 프로그램 섭외',
    weight: 0.8,
    cond: (c) => c.fame >= 25,
    body: () => '인기 예능 프로그램에서 출연 제의가 들어왔습니다. 비시즌 훈련 시간이 줄어들 수 있습니다.',
    options: [
      {
        id: 'go',
        label: '출연한다',
        apply: (c, rng) => {
          adjust(c, 'fame', 10);
          pay(c, 3000 * MAN);
          adjust(c, 'condition', -6);
          if (rng.chance(0.25)) {
            adjust(c, 'trust', -5);
            return '방송은 화제가 됐지만 "야구에 집중하라"는 쓴소리도 들었습니다. (인기 +10, 신뢰 -5)';
          }
          return '방송이 큰 화제가 됐습니다! (인기 +10, 출연료 3,000만원)';
        },
      },
      { id: 'no', label: '훈련에 집중한다', apply: (c) => (adjust(c, 'trust', 3), '조용히 훈련에 집중했습니다. (감독 신뢰 +3)') },
    ],
  },
  {
    id: 'swing',
    title: '타격폼 수정 제안',
    weight: 1,
    cond: (c) => isBat(c) && pro(c),
    body: () => '타격 코치가 스윙 궤도를 바꿔 보자고 제안합니다. 성공하면 장타가 늘지만, 실패하면 정확도가 떨어질 수 있습니다.',
    options: [
      {
        id: 'change',
        label: '폼을 바꾼다',
        apply: (c, rng) => {
          if (rng.chance(0.55)) {
            addRating(c, 'power', 4);
            addRating(c, 'contact', 1);
            return '새 폼이 몸에 맞았습니다! (파워 +4, 컨택 +1)';
          }
          addRating(c, 'contact', -3);
          addRating(c, 'power', 1);
          return '새 폼에 적응하지 못했습니다. (컨택 -3, 파워 +1)';
        },
      },
      { id: 'keep', label: '지금 폼을 유지한다', apply: () => '익숙한 폼을 유지하기로 했습니다.' },
    ],
  },
  {
    id: 'pitch',
    title: '신구종 장착',
    weight: 1,
    cond: (c) => isPit(c) && pro(c),
    body: () => '투수 코치가 새로운 구종(스플리터)을 연마해 보자고 합니다.',
    options: [
      {
        id: 'learn',
        label: '새 구종을 배운다',
        apply: (c, rng) => {
          if (rng.chance(0.6)) {
            addRating(c, 'breaking', 4);
            return '스플리터가 완성됐습니다! (변화구 +4)';
          }
          addRating(c, 'breaking', 1);
          addRating(c, 'control', -2);
          return '아직 손에 익지 않아 제구가 흔들렸습니다. (변화구 +1, 제구 -2)';
        },
      },
      {
        id: 'refine',
        label: '기존 구종을 다듬는다',
        apply: (c) => {
          addRating(c, 'control', 2);
          return '기존 구종의 완성도를 높였습니다. (제구 +2)';
        },
      },
    ],
  },
  {
    id: 'bulk',
    title: '벌크업 vs 감량',
    weight: 0.9,
    cond: (c) => isBat(c),
    body: () => '비시즌 몸 만들기 방향을 정해야 합니다.',
    options: [
      {
        id: 'bulk',
        label: '벌크업 (파워 ↑, 주루 ↓)',
        apply: (c) => {
          addRating(c, 'power', 3);
          addRating(c, 'speed', -2);
          return '체중을 늘려 타구에 힘이 실립니다. (파워 +3, 주루 -2)';
        },
      },
      {
        id: 'slim',
        label: '감량 (주루·수비 ↑, 파워 ↓)',
        apply: (c) => {
          addRating(c, 'speed', 3);
          addRating(c, 'fielding', 1);
          addRating(c, 'power', -2);
          return '몸이 가벼워졌습니다. (주루 +3, 수비 +1, 파워 -2)';
        },
      },
      { id: 'keep', label: '현재 체중 유지', apply: () => '지금 몸 상태를 유지하기로 했습니다.' },
    ],
  },
  {
    id: 'velo',
    title: '구속 향상 프로그램',
    weight: 0.9,
    cond: (c) => isPit(c) && c.age <= 30,
    body: (c) => `현재 최고 구속은 ${velocityKmh(c.pit.velocity)}km/h. 미국의 구속 향상 아카데미에서 초청이 왔습니다. (비용 3,000만원)`,
    options: [
      {
        id: 'go',
        label: '참가한다 (-3,000만원)',
        enabled: (c) => c.moneyKRW >= 3000 * MAN,
        apply: (c, rng) => {
          pay(c, -3000 * MAN);
          if (rng.chance(0.12 * c.hidden.injuryProne)) {
            addRating(c, 'velocity', 1);
            c.injury = { name: '어깨 염증', remaining: 0.3 };
            return '무리한 훈련으로 어깨에 염증이 생겼습니다. 시즌 초반 결장합니다.';
          }
          addRating(c, 'velocity', 3);
          return `구속이 늘었습니다! 최고 ${velocityKmh(c.pit.velocity)}km/h (구속 +3)`;
        },
      },
      { id: 'no', label: '국내에서 훈련한다', apply: () => '국내에서 차분히 시즌을 준비했습니다.' },
    ],
  },
  {
    id: 'conflict',
    title: '감독과의 갈등',
    weight: 0.8,
    cond: (c) => pro(c) && c.trust <= 55,
    body: () => '기용 문제로 감독과 언쟁이 있었다는 기사가 났습니다.',
    options: [
      {
        id: 'apologize',
        label: '먼저 찾아가 사과한다',
        apply: (c) => {
          adjust(c, 'trust', 10);
          adjust(c, 'morale', -3);
          return '감독과 오해를 풀었습니다. (신뢰 +10)';
        },
      },
      {
        id: 'trade',
        label: '트레이드를 요청한다',
        apply: (c, rng) => {
          const country = countryOfTeam(c.teamId);
          if (!country || c.contract?.type === 'fa' || !rng.chance(0.6)) {
            adjust(c, 'trust', -10);
            return '구단은 트레이드 요청을 거절했습니다. 분위기가 더 나빠졌습니다. (신뢰 -10)';
          }
          const to = rng.pick(teamsOf(country).filter((t) => t.id !== c.teamId));
          if (c.contract) c.contract.teamId = to.id;
          moveTeam(c, to.id, rng);
          return `${to.name}(으)로 트레이드됐습니다. 새 출발입니다!`;
        },
      },
      {
        id: 'ignore',
        label: '실력으로 보여준다',
        apply: (c) => {
          adjust(c, 'morale', 3);
          c.flags.motivated = 1;
          return '이를 악물고 훈련했습니다. (다음 시즌 동기 부여)';
        },
      },
    ],
  },
  {
    id: 'positionChange',
    title: '포지션 전향 제안',
    weight: 0.7,
    cond: (c) => c.role === 'batter' && ['SS', 'C', 'CF', '3B', '2B'].includes(c.batPos) && c.age >= 23,
    body: (c) => {
      const to = posChangeTarget(c);
      return `코칭스태프가 ${to.label}(으)로의 전향을 제안했습니다. 수비 부담을 덜 수 있습니다.`;
    },
    options: [
      {
        id: 'accept',
        label: '받아들인다',
        apply: (c) => {
          const to = posChangeTarget(c);
          const before = overall(c);
          c.batPos = to.pos;
          adjust(c, 'trust', 5);
          return `${to.label}(으)로 전향했습니다. 오버롤 ${before} → ${overall(c)}`;
        },
      },
      { id: 'decline', label: '지금 포지션을 지킨다', apply: (c) => (adjust(c, 'trust', -4), '현재 포지션에서 경쟁하기로 했습니다. (신뢰 -4)') },
    ],
  },
  {
    id: 'roleChange',
    title: '보직 변경 제안',
    weight: 0.7,
    cond: (c) => c.role === 'pitcher' && pro(c),
    body: (c) =>
      c.pitPos === 'SP'
        ? '구단이 불펜 필승조로의 전환을 제안했습니다. 짧은 이닝에 전력투구할 수 있습니다.'
        : '구단이 선발 전환을 제안했습니다. 체력이 관건입니다.',
    options: [
      {
        id: 'accept',
        label: '받아들인다',
        apply: (c) => {
          const before = overall(c);
          c.pitPos = c.pitPos === 'SP' ? (c.pit.composure >= 60 ? 'CL' : 'RP') : 'SP';
          return `보직이 바뀌었습니다. 오버롤 ${before} → ${overall(c)}`;
        },
      },
      { id: 'decline', label: '지금 보직을 유지한다', apply: () => '현재 보직을 유지합니다.' },
    ],
  },
  {
    id: 'twoWayOffer',
    title: '이도류 도전?',
    weight: 0.4,
    cond: (c) =>
      c.role !== 'twoWay' &&
      c.age <= 25 &&
      overall(c) >= 60 &&
      ((c.role === 'batter' && c.bat.arm >= 65) || (c.role === 'pitcher' && c.pit.velocity >= 65)),
    body: () => '감독이 투타 겸업을 시도해 보자고 제안했습니다. 체력 부담과 부상 위험이 커지지만 성공하면 전설이 됩니다.',
    options: [
      {
        id: 'accept',
        label: '도전한다',
        apply: (c) => {
          const base = overall(c) - 12;
          if (c.role === 'batter') {
            c.pit = { velocity: c.bat.arm + 2, control: base - 3, stuff: base + 2, breaking: base - 2, stamina: base, composure: base };
            c.pitPos = 'SP';
          } else {
            c.bat = { contact: base, power: Math.max(base, c.pit.velocity - 6), eye: base - 3, speed: base, fielding: base - 4, arm: c.pit.velocity };
            c.batPos = 'DH';
          }
          c.role = 'twoWay';
          c.hidden.injuryProne = Math.round(c.hidden.injuryProne * 115) / 100;
          adjust(c, 'fame', 10);
          return `이도류 도전을 시작합니다! (타자 ${batOvr(c.bat, c.batPos)} / 투수 ${pitOvr(c.pit, c.pitPos)})`;
        },
      },
      { id: 'decline', label: '한 우물만 판다', apply: () => '지금 포지션에 집중하기로 했습니다.' },
    ],
  },
  {
    id: 'fanmeet',
    title: '팬 사인회',
    weight: 1,
    cond: (c) => pro(c),
    body: () => '구단이 팬 사인회를 열자고 합니다.',
    options: [
      { id: 'go', label: '참여한다', apply: (c) => (adjust(c, 'fame', 4), adjust(c, 'morale', 5), '팬들의 응원에 힘이 났습니다. (인기 +4, 멘탈 +5)') },
      { id: 'no', label: '정중히 거절한다', apply: (c) => (adjust(c, 'condition', 3), '휴식을 택했습니다. (컨디션 +3)') },
    ],
  },
  {
    id: 'sns',
    title: 'SNS 논란',
    weight: 0.5,
    cond: (c) => c.fame >= 20,
    body: () => '예전에 올린 SNS 게시물이 뒤늦게 논란이 됐습니다.',
    options: [
      { id: 'sorry', label: '즉시 사과문을 올린다', apply: (c) => (adjust(c, 'fame', -3), adjust(c, 'morale', -4), '빠른 사과로 논란이 가라앉았습니다. (인기 -3)') },
      {
        id: 'silent',
        label: '무대응한다',
        apply: (c, rng) => {
          if (rng.chance(0.5)) return '논란은 금세 잊혔습니다.';
          adjust(c, 'fame', -10);
          adjust(c, 'morale', -10);
          return '논란이 커졌습니다. (인기 -10, 멘탈 -10)';
        },
      },
    ],
  },
  {
    id: 'marriage',
    title: '결혼',
    weight: 0.5,
    cond: (c) => c.age >= 26 && c.age <= 34 && !c.flags.married,
    body: () => '오래 만난 연인과 결혼을 고민하고 있습니다.',
    options: [
      {
        id: 'marry',
        label: '결혼한다',
        apply: (c) => {
          c.flags.married = true;
          adjust(c, 'morale', 15);
          pay(c, -5000 * MAN);
          return '행복한 가정을 꾸렸습니다! (멘탈 +15)';
        },
      },
      { id: 'later', label: '조금 더 미룬다', apply: () => '야구에 조금 더 집중하기로 했습니다.' },
    ],
  },
  {
    id: 'ad',
    title: '광고 모델 제안',
    weight: 0.8,
    cond: (c) => c.fame >= 45,
    body: () => '스포츠 브랜드에서 광고 모델 계약을 제안했습니다.',
    options: [
      {
        id: 'sign',
        label: '계약한다',
        apply: (c) => {
          const krw = Math.round((c.fame * 400 + 2000) / 100) * 100 * MAN;
          pay(c, krw);
          adjust(c, 'fame', 3);
          return `광고 계약을 맺었습니다. (+${Math.round(krw / MAN).toLocaleString()}만원)`;
        },
      },
      { id: 'no', label: '거절한다', apply: () => '야구에만 집중하기로 했습니다.' },
    ],
  },
  {
    id: 'charity',
    title: '봉사 활동',
    weight: 0.7,
    cond: () => true,
    body: () => '유소년 야구 교실에서 재능 기부 요청이 왔습니다.',
    options: [
      { id: 'yes', label: '참여한다', apply: (c) => (adjust(c, 'fame', 5), adjust(c, 'morale', 6), '아이들의 눈빛에서 초심을 찾았습니다. (인기 +5, 멘탈 +6)') },
      { id: 'no', label: '훈련에 집중한다', apply: () => '훈련에 집중했습니다.' },
    ],
  },
  {
    id: 'data',
    title: '데이터 분석팀 협업',
    weight: 1,
    cond: (c) => pro(c),
    body: () => '구단 데이터 분석팀이 트래킹 데이터 기반 맞춤 리포트를 제공하겠다고 합니다.',
    options: [
      {
        id: 'yes',
        label: '적극 활용한다',
        apply: (c, rng) => {
          if (isPit(c) && (!isBat(c) || rng.chance(0.5))) {
            addRating(c, 'stuff', 2);
            return '회전수와 무브먼트를 최적화했습니다. (구위 +2)';
          }
          addRating(c, 'contact', 2);
          return '약점 코스를 보완했습니다. (컨택 +2)';
        },
      },
      { id: 'no', label: '감을 믿는다', apply: () => '자신의 감각을 믿기로 했습니다.' },
    ],
  },
  {
    id: 'rival',
    title: '라이벌 등장',
    weight: 0.8,
    cond: (c) => pro(c) && c.age <= 30,
    body: () => '같은 포지션에 거물급 신인이 입단했습니다. 주전 경쟁이 치열해질 전망입니다.',
    options: [
      {
        id: 'work',
        label: '훈련량을 늘린다',
        apply: (c) => {
          c.flags.growthBoost = Math.max(Number(c.flags.growthBoost ?? 1), 1.15);
          adjust(c, 'condition', -8);
          return '독하게 훈련했습니다. (성장 보너스, 컨디션 -8)';
        },
      },
      { id: 'calm', label: '평정심을 유지한다', apply: (c) => (adjust(c, 'morale', 3), '내 페이스를 지키기로 했습니다.') },
    ],
  },
  {
    id: 'camp',
    title: '해외 전지훈련 합류',
    weight: 0.7,
    cond: (c) => pro(c),
    body: () => '구단 1군 스프링캠프 명단에 포함될 기회가 생겼습니다. 대신 휴식이 줄어듭니다.',
    options: [
      {
        id: 'go',
        label: '합류한다',
        apply: (c) => {
          adjust(c, 'trust', 6);
          adjust(c, 'condition', -4);
          return '캠프에서 눈도장을 찍었습니다. (신뢰 +6)';
        },
      },
      { id: 'rest', label: '충분히 쉰다', apply: (c) => (adjust(c, 'condition', 10), '충분히 휴식했습니다. (컨디션 +10)') },
    ],
  },
  {
    id: 'pain',
    title: '몸 상태 이상',
    weight: 0.7,
    cond: (c) => c.age >= 28,
    body: () => '비시즌 훈련 중 허리에 통증이 느껴집니다.',
    options: [
      {
        id: 'rest',
        label: '정밀 검진 후 재활',
        apply: (c) => {
          adjust(c, 'condition', 8);
          c.flags.growthBoost = 0.9;
          return '일찍 발견해 큰 부상을 막았습니다. 다만 훈련량은 줄었습니다.';
        },
      },
      {
        id: 'push',
        label: '참고 훈련한다',
        apply: (c, rng) => {
          if (rng.chance(0.35 * c.hidden.injuryProne)) {
            c.injury = { name: '허리 디스크', remaining: 0.6 };
            return '통증이 심해져 허리 디스크 진단을 받았습니다. 시즌 초반 결장합니다.';
          }
          return '다행히 통증이 사라졌습니다.';
        },
      },
    ],
  },
  {
    id: 'agent',
    title: '에이전트 교체',
    weight: 0.4,
    cond: (c) => pro(c) && c.age >= 24,
    body: () => '대형 에이전시가 영입을 제안했습니다. 향후 계약 협상에 유리할 수 있습니다.',
    options: [
      { id: 'yes', label: '대형 에이전시로 옮긴다', apply: (c) => ((c.flags.agent = 1.08), '협상력이 좋아졌습니다. (향후 계약 금액 +8%)') },
      { id: 'no', label: '지금 에이전트와 의리를 지킨다', apply: (c) => (adjust(c, 'morale', 3), '의리를 지켰습니다.') },
    ],
  },
  {
    id: 'routine',
    title: '멘탈 코치 상담',
    weight: 0.8,
    cond: (c) => c.morale <= 50,
    body: () => '최근 마음이 무겁습니다. 멘탈 코치와 상담을 해 볼까요?',
    options: [
      {
        id: 'yes',
        label: '상담받는다',
        apply: (c) => {
          adjust(c, 'morale', 15);
          if (isPit(c)) addRating(c, 'composure', 1);
          return '마음이 한결 가벼워졌습니다. (멘탈 +15)';
        },
      },
      { id: 'no', label: '혼자 이겨낸다', apply: (c) => (adjust(c, 'morale', 3), '스스로 이겨내기로 했습니다.') },
    ],
  },
  {
    id: 'hometown',
    title: '고향 팀의 러브콜',
    weight: 0.3,
    cond: (c) => pro(c) && c.age >= 30 && countryOfTeam(c.teamId) === 'KR',
    body: () => '고향 연고 구단이 트레이드로 데려오고 싶다는 소식이 들립니다.',
    options: [
      {
        id: 'yes',
        label: '고향 팀으로 가고 싶다고 밝힌다',
        apply: (c, rng) => {
          if (!rng.chance(0.5)) return '양 구단의 이견으로 트레이드는 무산됐습니다.';
          const to = rng.pick(teamsOf('KR').filter((t) => t.id !== c.teamId));
          if (c.contract) c.contract.teamId = to.id;
          moveTeam(c, to.id, rng);
          adjust(c, 'morale', 10);
          return `${to.name}(으)로 이적했습니다! 고향 팬들이 열광합니다.`;
        },
      },
      { id: 'no', label: '지금 팀에 남는다', apply: (c) => (adjust(c, 'trust', 5), `${teamName(c.teamId)}에 대한 충성심을 보였습니다. (신뢰 +5)`) },
    ],
  },
];

EVENTS.push({
  id: 'sponsor',
  title: '용품 스폰서 제안',
  weight: 1.2,
  cond: (c) => pro(c) && c.fame >= 50,
  body: (c) => `야구용품 브랜드가 후원 계약을 제안했습니다. 시즌 장비 일체와 후원금 ${Math.round((c.fame * 60) / 100) * 100}만원을 줍니다.`,
  options: [
    {
      id: 'sign',
      label: '후원 계약을 맺는다',
      apply: (c) => {
        const krw = Math.round((c.fame * 60) / 100) * 100 * MAN;
        pay(c, krw);
        if (isBat(c)) {
          grantItem(c, 'bat-custom');
          grantItem(c, 'bg-custom');
        }
        if (isPit(c)) grantItem(c, 'pl-track');
        grantItem(c, 'sp-custom');
        return `후원 계약 체결! 맞춤 장비를 지원받고 ${Math.round(krw / MAN).toLocaleString()}만원을 받았습니다.`;
      },
    },
    { id: 'no', label: '지금 쓰는 장비를 고집한다', apply: () => '익숙한 장비를 계속 쓰기로 했습니다.' },
  ],
});

function posChangeTarget(c: Career): { pos: Career['batPos']; label: string } {
  switch (c.batPos) {
    case 'SS':
      return { pos: '3B', label: '3루수' };
    case 'C':
      return { pos: '1B', label: '1루수' };
    case 'CF':
      return { pos: 'RF', label: '우익수' };
    case '3B':
      return { pos: '1B', label: '1루수' };
    default:
      return { pos: 'LF', label: '좌익수' };
  }
}

export const EVENT_MAP: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export function pickEvents(c: Career, rng: Rng, count: number): GameEvent[] {
  const recent = String(c.flags.recentEvents ?? '').split(',');
  const pool = EVENTS.filter((e) => e.cond(c) && !recent.includes(e.id));
  const out: GameEvent[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const e = rng.weighted(pool.map((p) => [p, p.weight] as const));
    out.push(e);
    pool.splice(pool.indexOf(e), 1);
  }
  c.flags.recentEvents = [...out.map((e) => e.id), ...recent.slice(0, 4)].join(',');
  return out;
}
