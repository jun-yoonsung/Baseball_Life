import {
  buyItem,
  equipmentBonus,
  formatKRW,
  ITEM_MAP,
  ITEMS,
  itemUsable,
  RATING_NAME,
  SLOT_NAME,
  type Career,
  type Item,
  type RatingKey,
  type Slot,
} from '../engine';

const TIER = ['', '보급형', '프로', '프리미엄', '시그니처'];

function bonusText(it: Item) {
  const parts = (Object.entries(it.bonus) as [RatingKey, number][]).map(([k, v]) => `${RATING_NAME[k]} +${v}`);
  if (it.injury && it.injury < 1) parts.push(`부상 위험 -${Math.round((1 - it.injury) * 100)}%`);
  if (it.injury && it.injury > 1) parts.push(`부상 위험 +${Math.round((it.injury - 1) * 100)}%`);
  if (it.condition) parts.push(`컨디션 +${it.condition}`);
  return parts.join(' · ');
}

export function ShopTab({ c, setCareer, notify }: { c: Career; setCareer: (c: Career) => void; notify: (m: string) => void }) {
  const owned = new Map((c.equipment ?? []).map((o) => [ITEM_MAP[o.id]?.slot, o]));
  const bonus = equipmentBonus(c);
  const slots = [...new Set(ITEMS.filter((it) => itemUsable(c, it)).map((it) => it.slot))] as Slot[];
  const retired = c.phase === 'retired';
  return (
    <section className="grid">
      <div className="card">
        <div className="spread">
          <h3 style={{ margin: 0 }}>장비 상점</h3>
          <span className="badge gold">보유 자산 {formatKRW(c.moneyKRW)}</span>
        </div>
        <p className="muted small" style={{ margin: '6px 0 10px' }}>
          장비는 사용 기간 동안 시즌 성적 계산에 보정을 줍니다. 배트·장갑·스파이크처럼 소모되는 장비는 매 시즌 새로 사야 합니다. 같은 부위의 장비를 사면 기존 장비를 바꿔 낍니다. 인기가 높아지면 용품 스폰서가 장비를 지원하기도 합니다.
        </p>
        <div className="row">
          <b className="small">현재 장비 보정</b>
          {Object.keys(bonus).length === 0 && <span className="muted small">없음</span>}
          {(Object.entries(bonus) as [RatingKey, number][]).map(([k, v]) => (
            <span key={k} className="badge green">
              {RATING_NAME[k]} +{Math.round(v * 10) / 10}
            </span>
          ))}
        </div>
      </div>
      {slots.map((slot) => {
        const cur = owned.get(slot);
        const curItem = cur ? ITEM_MAP[cur.id] : null;
        return (
          <div key={slot} className="card shop-slot">
            <div className="spread">
              <h3 style={{ margin: 0 }}>{SLOT_NAME[slot]}</h3>
              <span className="small muted">{curItem ? `착용 중: ${curItem.name} (${cur!.seasonsLeft}시즌 남음)` : '착용 장비 없음'}</span>
            </div>
            <div className="shop-items">
              {ITEMS.filter((it) => it.slot === slot && itemUsable(c, it)).map((it) => {
                const isOwned = cur?.id === it.id;
                const afford = c.moneyKRW >= it.price;
                return (
                  <div key={it.id} className={`shop-item ${isOwned ? 'owned' : ''}`}>
                    <div className="spread">
                      <b>{it.name}</b>
                      <span className="tier" style={{ color: it.tier >= 3 ? 'var(--gold)' : 'var(--muted)' }}>
                        {TIER[it.tier]}
                      </span>
                    </div>
                    <span className="small muted">{it.desc}</span>
                    <span className="small">{bonusText(it) || '효과 없음'}</span>
                    <div className="spread">
                      <span className="price">{formatKRW(it.price)}</span>
                      <span className="small muted">{it.seasons}시즌 사용</span>
                    </div>
                    <button
                      className={`btn ${isOwned ? '' : 'primary'}`}
                      disabled={retired || !afford}
                      onClick={() => {
                        setCareer(buyItem(c, it.id));
                        notify(`${it.name}을(를) 샀습니다.`);
                      }}
                    >
                      {retired ? '은퇴함' : !afford ? '자금 부족' : isOwned ? '새 것으로 교체' : '구입'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
