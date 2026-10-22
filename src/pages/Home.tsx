import { currentLevelLabel, loadHistory, overall, roleLabel, type Career } from '../engine';
import { TeamLine } from '../ui/components';
import { PlayerAvatar, StadiumScene } from '../ui/graphics';

const FEATURES = [
  ['⚾', '타석 단위 시뮬레이션', '능력치와 리그 수준에 따라 한 타석, 한 타자씩 결과를 계산합니다. 타율·OPS·평균자책점·WAR까지 그럴듯하게 쌓입니다.'],
  ['📋', '드래프트부터 은퇴까지', '고졸 드래프트, 대학 진학, 미국 직행, 육성선수, 1·2군 오가기, 연봉 협상, FA, 포스팅까지.'],
  ['🎖', '병역과 국제대회', '국군체육부대·현역 입대, 아시안게임 금메달·올림픽 메달 병역 특례, 월드 베이스볼 클래식과 프리미어12.'],
  ['🧢', '타자·투수·이도류', '9개 수비 포지션, 선발·중계·마무리. 마운드와 타석을 모두 지배하는 이도류에 도전할 수도 있습니다.'],
  ['🌏', '한국 · 일본 · 미국', '한국 프로리그에서 시작해 일본 무대나 미국 빅리그에 진출하고, 다시 고향으로 돌아올 수도 있습니다.'],
  ['🏆', '일일 랭킹과 베스트 나인', '은퇴하면 자동으로 오늘의 랭킹에 등록됩니다. MVP 횟수로 겨루고, 포지션별 오늘의 베스트 나인을 뽑습니다.'],
];

export function Home({ career }: { career: Career | null }) {
  const history = loadHistory().slice(0, 5);
  const active = career && career.phase !== 'retired';
  return (
    <div className="grid">
      <section className="hero">
        <StadiumScene />
        <div className="hero-body">
        <h1>나만의 야구 인생</h1>
        <p>
          고교 졸업반 유망주 한 명을 골라 드래프트, 2군, 1군 주전, FA 대박, 빅리그 도전, 명예의 전당까지. 선택과 운이 만드는 단 하나뿐인 야구 커리어를 키워 보세요.
        </p>
        <div className="row">
          {active ? (
            <>
              <a className="btn primary big" href="#career">
                이어서 하기
              </a>
              <a className="btn big" href="#new">
                새 커리어
              </a>
            </>
          ) : (
            <a className="btn primary big" href="#new">
              선수 만들기
            </a>
          )}
          <a className="btn big" href="#rankings">
            오늘의 랭킹
          </a>
        </div>
        </div>
      </section>

      {active && career && (
        <section className="card">
          <div className="spread">
            <PlayerAvatar c={career} size={72} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="muted small">진행 중인 커리어</div>
              <h2 style={{ margin: '2px 0' }}>{career.name}</h2>
              <TeamLine teamId={career.teamId} sub={<span className="badge">{currentLevelLabel(career)}</span>} />
              <div className="muted small">
                {career.year}시즌 · 만 {career.age}세 · {roleLabel(career)}
              </div>
            </div>
            <div className="ovr">
              <b>{overall(career)}</b>
              <span>OVR</span>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-3">
        {FEATURES.map(([ico, title, desc]) => (
          <div key={title} className="card feature">
            <div className="ico">{ico}</div>
            <div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {history.length > 0 && (
        <section className="card">
          <h2>이 기기에서 은퇴한 선수</h2>
          <div className="table-wrap">
            <table className="stats">
              <thead>
                <tr>
                  <th>이름</th>
                  <th className="l">등급</th>
                  <th>MVP</th>
                  <th>최고 OVR</th>
                  <th>개인상</th>
                  <th>WAR</th>
                  <th className="l">통산</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      {h.nationality} {h.name}
                    </td>
                    <td className="l">{h.grade}</td>
                    <td>{h.mvp}</td>
                    <td>{h.peakOvr}</td>
                    <td>{h.awards}</td>
                    <td>{h.war.toFixed(1)}</td>
                    <td className="l">{h.line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
