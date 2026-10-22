import { useRef } from 'react';
import { clearHistory, exportCareer, importCareer, type Career } from '../engine';

export function SettingsPage({ career, setCareer, notify }: { career: Career | null; setCareer: (c: Career | null) => void; notify: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    if (!career) return;
    const blob = new Blob([exportCareer(career)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baseball-life-${career.name}-${career.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('저장 파일을 내보냈습니다.');
  };

  const doImport = async (f: File) => {
    try {
      const c = importCareer(await f.text());
      if (career && !window.confirm('현재 커리어를 덮어쓰고 불러올까요?')) return;
      setCareer(c);
      notify(`${c.name} 선수의 커리어를 불러왔습니다.`);
    } catch (e) {
      notify((e as Error).message || '파일을 읽을 수 없습니다.');
    }
  };

  return (
    <div className="grid">
      <h1>설정</h1>
      <section className="card">
        <h2>저장 파일</h2>
        <p className="muted">진행 내용은 이 브라우저에 자동 저장됩니다. 서버에 커리어가 백업되지 않으니, 기기를 바꾸기 전에 저장 파일을 내보내세요.</p>
        <div className="row">
          <button className="btn primary" disabled={!career} onClick={doExport}>
            저장 파일 내보내기
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            저장 파일 가져오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>
      <section className="card">
        <h2>데이터 삭제</h2>
        <div className="row">
          <button
            className="btn danger"
            disabled={!career}
            onClick={() => {
              if (window.confirm('현재 커리어를 삭제할까요? 되돌릴 수 없습니다.')) {
                setCareer(null);
                notify('커리어를 삭제했습니다.');
              }
            }}
          >
            현재 커리어 삭제
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm('이 기기에 저장된 은퇴 선수 기록을 모두 지울까요?')) {
                clearHistory();
                notify('은퇴 선수 기록을 지웠습니다.');
              }
            }}
          >
            은퇴 선수 기록 삭제
          </button>
        </div>
      </section>
    </div>
  );
}
