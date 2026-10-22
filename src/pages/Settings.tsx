import { useRef, useState } from 'react';
import { clearHistory, exportCareer, importCareer, type Career } from '../engine';
import { capability, type Downloads } from '../platform';
import { ConfirmButton } from '../ui/components';

export function SettingsPage({ career, setCareer, notify }: { career: Career | null; setCareer: (c: Career | null) => void; notify: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [exportText, setExportText] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [staged, setStaged] = useState<Career | null>(null);

  const filename = career ? `baseball-life-${career.name}-${career.year}.json` : 'baseball-life.json';

  const doDownload = async () => {
    if (!career) return;
    const text = exportCareer(career);
    const downloads = await capability<Downloads>('downloads');
    if (downloads) {
      try {
        await downloads.save({ filename, data: text });
        notify('저장 파일을 내려받았습니다.');
      } catch {
        setExportText(text);
        notify('파일 저장이 취소됐습니다. 아래 텍스트를 복사해 보관할 수도 있습니다.');
      }
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    notify('저장 파일을 내려받았습니다.');
  };

  const doCopy = async () => {
    if (!career) return;
    const text = exportCareer(career);
    setExportText(text);
    try {
      await navigator.clipboard.writeText(text);
      notify('저장 데이터를 클립보드에 복사했습니다.');
    } catch {
      window.setTimeout(() => textRef.current?.select(), 0);
      notify('아래 텍스트를 직접 선택해 복사하세요.');
    }
  };

  const load = (text: string) => {
    try {
      const c = importCareer(text);
      if (career && career.phase !== 'retired') setStaged(c);
      else {
        setCareer(c);
        notify(`${c.name} 선수의 커리어를 불러왔습니다.`);
      }
    } catch (e) {
      notify((e as Error).message || '저장 데이터를 읽을 수 없습니다.');
    }
  };

  return (
    <div className="grid">
      <h1>저장</h1>
      <section className="card grid">
        <h2 style={{ margin: 0 }}>백업하기</h2>
        <p className="muted" style={{ margin: 0 }}>
          진행 내용은 이 브라우저에 자동 저장됩니다. 커리어는 서버에 백업되지 않으니, 기기를 바꾸기 전에 저장 파일을 받아 두거나 저장 데이터를 복사해 두세요.
        </p>
        <div className="row">
          <button className="btn primary" disabled={!career} onClick={doDownload}>
            저장 파일 받기
          </button>
          <button className="btn" disabled={!career} onClick={doCopy}>
            저장 데이터 복사
          </button>
        </div>
        {exportText && <textarea id="export-text" ref={textRef} className="savebox" readOnly value={exportText} onFocus={(e) => e.target.select()} />}
      </section>

      <section className="card grid">
        <h2 style={{ margin: 0 }}>불러오기</h2>
        <div className="row">
          <button className="btn" onClick={() => fileRef.current?.click()}>
            저장 파일 선택
          </button>
          <input
            ref={fileRef}
            id="import-file"
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) load(await f.text());
            }}
          />
        </div>
        <label className="field">
          또는 복사해 둔 저장 데이터를 붙여 넣으세요
          <textarea id="import-text" className="savebox" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='{"app":"baseball-life", ...}' />
        </label>
        <div>
          <button className="btn" disabled={!pasted.trim()} onClick={() => load(pasted)}>
            붙여 넣은 데이터 불러오기
          </button>
        </div>
        {staged && (
          <div className="confirm" role="alertdialog">
            <span>진행 중인 커리어를 {staged.name} 선수의 커리어로 바꿀까요? 지금 커리어는 사라집니다.</span>
            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  setCareer(staged);
                  notify(`${staged.name} 선수의 커리어를 불러왔습니다.`);
                  setStaged(null);
                  setPasted('');
                }}
              >
                바꾼다
              </button>
              <button className="btn" onClick={() => setStaged(null)}>
                취소
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card grid">
        <h2 style={{ margin: 0 }}>데이터 삭제</h2>
        <div className="row">
          <ConfirmButton
            className="btn danger"
            disabled={!career}
            label="현재 커리어 삭제"
            message="현재 커리어를 삭제할까요? 되돌릴 수 없습니다."
            confirmLabel="삭제"
            onConfirm={() => {
              setCareer(null);
              notify('커리어를 삭제했습니다.');
            }}
          />
          <ConfirmButton
            className="btn danger"
            label="은퇴 선수 기록 삭제"
            message="이 기기에 저장된 은퇴 선수 기록을 모두 지울까요? 공유 랭킹은 지워지지 않습니다."
            confirmLabel="삭제"
            onConfirm={() => {
              clearHistory();
              notify('은퇴 선수 기록을 지웠습니다.');
            }}
          />
        </div>
      </section>
    </div>
  );
}
