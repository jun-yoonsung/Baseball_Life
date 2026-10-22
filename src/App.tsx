import { useCallback, useEffect, useState } from 'react';
import { addHistory, buildEntry, loadCareer, saveCareer, type Career } from './engine';
import { submitEntry } from './api';
import { BallIcon } from './ui/components';
import { Home } from './pages/Home';
import { CreatePage } from './pages/Create';
import { CareerPage } from './pages/CareerPage';
import { RankingsPage } from './pages/Rankings';
import { GuidePage } from './pages/Guide';
import { AboutPage } from './pages/About';
import { SettingsPage } from './pages/Settings';

export type Route = 'home' | 'new' | 'career' | 'rankings' | 'guide' | 'about' | 'settings';

function parseRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const r = h.split('?')[0] as Route;
  return ['new', 'career', 'rankings', 'guide', 'about', 'settings'].includes(r) ? r : 'home';
}

export function go(r: Route) {
  window.location.hash = r === 'home' ? '/' : `/${r}`;
}

export function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const [career, setCareerState] = useState<Career | null>(() => loadCareer());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const on = () => {
      setRoute(parseRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const setCareer = useCallback((c: Career | null) => {
    setCareerState(c);
    saveCareer(c);
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // 은퇴하면 랭킹에 자동 등록
  useEffect(() => {
    if (!career || career.phase !== 'retired' || career.submitted) return;
    const entry = buildEntry(career);
    const done = { ...career, submitted: true };
    setCareer(done);
    if (!entry) return;
    addHistory(entry);
    submitEntry(entry).then((ok) => notify(ok ? '오늘의 랭킹에 등록됐습니다!' : '서버에 연결할 수 없어 이 기기의 기록에만 저장했습니다.'));
  }, [career, setCareer, notify]);

  const links: [Route, string][] = [
    ['career', '내 커리어'],
    ['rankings', '랭킹'],
    ['guide', '게임 가이드'],
    ['settings', '설정'],
  ];

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          <BallIcon className="ball" />
          <span>
            베이스볼 라이프
            <small>육성선수에서 명예의 전당까지</small>
          </span>
        </a>
        <nav className="nav">
          {links.map(([r, label]) => (
            <a key={r} href={`#/${r}`} className={route === r ? 'active' : ''}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main>
        {route === 'home' && <Home career={career} />}
        {route === 'new' && <CreatePage hasCareer={!!career && career.phase !== 'retired'} onCreate={(c) => (setCareer(c), go('career'))} />}
        {route === 'career' && <CareerPage career={career} setCareer={setCareer} notify={notify} />}
        {route === 'rankings' && <RankingsPage />}
        {route === 'guide' && <GuidePage />}
        {route === 'about' && <AboutPage />}
        {route === 'settings' && <SettingsPage career={career} setCareer={setCareer} notify={notify} />}
      </main>
      <footer className="footer">
        <span>© 베이스볼 라이프 · 가상의 야구 커리어 시뮬레이션</span>
        <span>
          <a href="#/about">서비스 소개</a> · <a href="#/guide">게임 가이드</a> · <a href="#/rankings">랭킹</a>
        </span>
        <span>등장하는 구단·리그·선수는 모두 가상이며 실존 단체와 무관합니다.</span>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
