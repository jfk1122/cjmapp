import { useRef } from 'react';
import type { Journey } from '../types';
import { TEMPLATES } from '../data/templates';
import { Menu } from './Menu';
import { IconDots, IconMap, IconPlus, IconDownload } from './Icons';

interface Props {
  maps: Journey[];
  onOpen: (id: string) => void;
  onCreate: (templateId: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (file: File) => void;
}

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function Home({ maps, onOpen, onCreate, onDuplicate, onDelete, onImport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const sorted = [...maps].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="home">
      <header className="home-hero">
        <div className="brand">
          <span className="brand-mark">
            <IconMap size={20} />
          </span>
          <div>
            <h1>CJM Studio</h1>
            <p className="brand-sub">カスタマージャーニーマップを作って、リンクで共有する</p>
          </div>
        </div>
        <p className="home-lead">
          ユーザーフロー・インサイトから、ペイド／オウンド／アーンドのトリプルメディア、メディア、
          クリエイティブ、KPI までをひとつのマトリクスで一覧化します。
          作成したマップはブラウザに保存され、URL ひとつで共有できます。
        </p>
      </header>

      <section className="home-section">
        <h2 className="section-title">新しく作る</h2>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="template-card" onClick={() => onCreate(t.id)}>
              <span className="template-badge">
                <IconPlus size={14} />
              </span>
              <span className="template-name">{t.name}</span>
              <span className="template-desc">{t.description}</span>
            </button>
          ))}
          <button type="button" className="template-card template-card--import" onClick={() => fileInput.current?.click()}>
            <span className="template-badge">
              <IconDownload size={14} />
            </span>
            <span className="template-name">JSON を読み込む</span>
            <span className="template-desc">書き出したファイルからマップを復元します。</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="home-section">
        <h2 className="section-title">
          保存済みのマップ <span className="count">{sorted.length}</span>
        </h2>

        {sorted.length === 0 ? (
          <p className="empty-state">
            まだマップがありません。上のテンプレートから作成してください。
          </p>
        ) : (
          <ul className="map-list">
            {sorted.map((m) => (
              <li key={m.id} className="map-card">
                <button type="button" className="map-card-main" onClick={() => onOpen(m.id)}>
                  <span className="map-card-title">{m.title || '無題のマップ'}</span>
                  {m.subtitle && <span className="map-card-sub">{m.subtitle}</span>}
                  <span className="map-card-meta">
                    {m.stages.length} フェーズ / {m.rows.length} 行 ・ 更新 {formatDate(m.updatedAt)}
                  </span>
                </button>
                <Menu
                  label={`「${m.title}」の操作`}
                  items={[
                    { label: '開く', onSelect: () => onOpen(m.id) },
                    { label: '複製', onSelect: () => onDuplicate(m.id) },
                    {
                      label: '削除',
                      danger: true,
                      onSelect: () => {
                        if (confirm(`「${m.title}」を削除します。元に戻せません。`)) onDelete(m.id);
                      },
                    },
                  ]}
                >
                  <IconDots />
                </Menu>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="home-foot">
        データはお使いのブラウザ（localStorage）にのみ保存されます。バックアップは JSON
        の書き出しをご利用ください。
      </footer>
    </div>
  );
}
