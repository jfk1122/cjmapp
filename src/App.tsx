import { useCallback, useEffect, useRef, useState } from 'react';
import type { Journey } from './types';
import { loadAll, normalize, saveAll } from './lib/storage';
import { decodeJourney } from './lib/share';
import { importJson } from './lib/exporters';
import { buildJourney, TEMPLATES } from './data/templates';
import { uid } from './lib/id';
import { Home } from './components/Home';
import { Editor } from './components/Editor';

type Route =
  | { name: 'home' }
  | { name: 'map'; id: string }
  | { name: 'view'; payload: string };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (path.startsWith('map/')) return { name: 'map', id: decodeURIComponent(path.slice(4)) };
  if (path.startsWith('view/')) return { name: 'view', payload: path.slice(5) };
  return { name: 'home' };
}

const navigate = (to: string) => {
  window.location.hash = to;
};

const MAX_HISTORY = 80;

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [maps, setMaps] = useState<Journey[]>(() => loadAll());

  // 元に戻す用のスナップショット（開いているマップ単位で保持する）
  const history = useRef<{ mapId: string; stack: Journey[] }>({ mapId: '', stack: [] });
  const [undoDepth, setUndoDepth] = useState(0);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    saveAll(maps);
  }, [maps]);

  // setMaps の更新関数は StrictMode で 2 回呼ばれうるため、履歴の積み方はその外で行う
  const mapsRef = useRef(maps);
  useEffect(() => {
    mapsRef.current = maps;
  }, [maps]);

  const updateJourney = useCallback((next: Journey) => {
    const current = mapsRef.current.find((m) => m.id === next.id);
    if (current) {
      if (history.current.mapId !== next.id) history.current = { mapId: next.id, stack: [] };
      const stack = history.current.stack;
      stack.push(current);
      if (stack.length > MAX_HISTORY) stack.shift();
      setUndoDepth(stack.length);
    }
    setMaps((prev) => prev.map((m) => (m.id === next.id ? next : m)));
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.stack.pop();
    setUndoDepth(history.current.stack.length);
    if (!previous) return;
    setMaps((prev) => prev.map((m) => (m.id === previous.id ? previous : m)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA)$/.test(target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !typing) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo]);

  /** マップを登録して編集画面へ遷移する */
  const adopt = useCallback((journey: Journey) => {
    setMaps((prev) => [...prev, journey]);
    history.current = { mapId: journey.id, stack: [] };
    setUndoDepth(0);
    navigate(`/map/${journey.id}`);
  }, []);

  const createFromTemplate = (templateId: string) => {
    const spec = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
    adopt(buildJourney(spec));
  };

  const duplicateMap = (id: string) => {
    const source = maps.find((m) => m.id === id);
    if (!source) return;
    const now = Date.now();
    adopt({ ...source, id: uid('m'), title: `${source.title} のコピー`, createdAt: now, updatedAt: now });
  };

  const deleteMap = (id: string) => setMaps((prev) => prev.filter((m) => m.id !== id));

  const handleImport = async (file: File) => {
    try {
      const parsed = normalize(await importJson(file));
      const now = Date.now();
      adopt({ ...parsed, id: uid('m'), createdAt: parsed.createdAt ?? now, updatedAt: now });
    } catch (e) {
      alert(e instanceof Error ? e.message : '読み込みに失敗しました');
    }
  };

  useEffect(() => {
    const current = route.name === 'map' ? maps.find((m) => m.id === route.id) : null;
    document.title = current ? `${current.title} — CJM Studio` : 'CJM Studio — カスタマージャーニーマップ';
  }, [route, maps]);

  if (route.name === 'view') {
    return <SharedView payload={route.payload} onAdopt={adopt} />;
  }

  if (route.name === 'map') {
    const journey = maps.find((m) => m.id === route.id);
    if (!journey) {
      return (
        <div className="notice">
          <p>マップが見つかりませんでした。</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
            一覧へ戻る
          </button>
        </div>
      );
    }
    return (
      <Editor
        journey={journey}
        readOnly={false}
        onChange={updateJourney}
        onBack={() => navigate('/')}
        onUndo={undo}
        canUndo={undoDepth > 0 && history.current.mapId === journey.id}
        savedLabel="保存済み"
      />
    );
  }

  return (
    <Home
      maps={maps}
      onOpen={(id) => navigate(`/map/${id}`)}
      onCreate={createFromTemplate}
      onDuplicate={duplicateMap}
      onDelete={deleteMap}
      onImport={handleImport}
    />
  );
}

interface SharedViewProps {
  payload: string;
  onAdopt: (journey: Journey) => void;
}

function SharedView({ payload, onAdopt }: SharedViewProps) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setJourney(null);
    setError('');
    decodeJourney(payload)
      .then((j) => active && setJourney(j))
      .catch(() => active && setError('共有リンクを読み取れませんでした。リンクが途中で切れている可能性があります。'));
    return () => {
      active = false;
    };
  }, [payload]);

  if (error) {
    return (
      <div className="notice">
        <p>{error}</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
          CJM Studio を開く
        </button>
      </div>
    );
  }

  if (!journey) return <div className="notice">読み込み中…</div>;

  return (
    <Editor
      journey={journey}
      readOnly
      onChange={() => {}}
      onBack={() => navigate('/')}
      onDuplicate={() => {
        const now = Date.now();
        onAdopt({ ...journey, id: uid('m'), createdAt: now, updatedAt: now });
      }}
    />
  );
}
