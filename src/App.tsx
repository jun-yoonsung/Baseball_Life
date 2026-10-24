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

export type Route = 'home' | 'new' | 'career' | 'rankings' | 'guide' | 'about' | 'save';

const ROUTES: Route[] = ['new', 'career', 'rankings', 'guide', 'about', 'save'];

function toRoute(hash: string): Route {
  const r = hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ROUTES.includes(r) ? r : 'home';
}

// 화면 전환은 앱 상태로 처리하고, 주소의 #토큰은 가능한 환경에서만 맞춰 둔다.
const listeners = new Set<(r: Route) => void>();
export function go(r: Route) {
  listeners.forEach((fn) => fn(r));
  try {
    history.replaceState(null, '', `#${r}`);
  } catch {
    /* 샌드박스에서는 주소를 바꿀 수 없다 */
  }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => toRoute(window.location.hash));
  const [career, setCareerState] = useState<Career | null>(() => loadCareer());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const set = (r: Route) => {
      setRoute(r);
      window.scrollTo(0, 0);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      go(toRoute(a.getAttribute('href') ?? ''));
    };
    const onHash = () => set(toRoute(window.location.hash));
    listeners.add(set);
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', onHash);
    return () => {
      listeners.delete(set);
      document.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', onHash);
    };
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
    submitEntry(entry).then((ok) => notify(ok ? '오늘의 랭킹에 등록됐습니다!' : '공유 랭킹에 저장하지 못해 이 기기의 기록에만 남겼습니다.'));
  }, [career, setCareer, notify]);

  const links: [Route, string][] = [
    ['career', '내 커리어'],
    ['rankings', '랭킹'],
    ['guide', '게임 가이드'],
    ['save', '저장'],
  ];

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#home">
          <BallIcon className="ball" />
          <span>
            베이스볼 라이프
            <small>육성선수에서 명예의 전당까지</small>
          </span>
        </a>
        <nav className="nav">
          {links.map(([r, label]) => (
            <a key={r} href={`#${r}`} className={route === r ? 'active' : ''}>
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
        {route === 'save' && <SettingsPage career={career} setCareer={setCareer} notify={notify} />}
      </main>
      <footer className="footer">
        <span>© 베이스볼 라이프 · 야구 커리어 시뮬레이션 (개인 플레이용)</span>
        <span>
          <a href="#about">서비스 소개</a> · <a href="#guide">게임 가이드</a> · <a href="#rankings">랭킹</a>
        </span>
        <span>KBO·NPB·MLB 구단 명칭은 각 권리자에게 있으며, 경기 결과와 선수 기록은 시뮬레이션입니다.</span>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
