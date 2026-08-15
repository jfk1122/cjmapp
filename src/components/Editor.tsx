import { useState } from 'react';
import { ROW_PRESETS, type Journey } from '../types';
import * as A from '../lib/actions';
import { exportCsv, exportJson } from '../lib/exporters';
import { Board } from './Board';
import { PersonaPanel } from './PersonaPanel';
import { ShareDialog } from './ShareDialog';
import { Menu } from './Menu';
import { IconBack, IconCopy, IconDownload, IconPlus, IconPrint, IconShare, IconUndo } from './Icons';

interface Props {
  journey: Journey;
  readOnly: boolean;
  onChange: (next: Journey) => void;
  onBack: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onDuplicate?: () => void;
  savedLabel?: string;
}

export function Editor({
  journey,
  readOnly,
  onChange,
  onBack,
  onUndo,
  canUndo,
  onDuplicate,
  savedLabel,
}: Props) {
  const [sharing, setSharing] = useState(false);

  const usedRowKeys = new Set(journey.rows.map((r) => r.key));
  const presetItems = ROW_PRESETS.filter((p) => !usedRowKeys.has(p.key)).map((p) => ({
    label: `${p.label}`,
    onSelect: () => onChange(A.addRow(journey, p)),
  }));

  return (
    <div className="editor">
      <header className="app-bar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <IconBack />
          <span className="hide-sm">{readOnly ? 'CJM Studio を開く' : '一覧へ'}</span>
        </button>

        <div className="app-bar-title">
          {readOnly ? (
            <h1 className="doc-title doc-title--static">{journey.title}</h1>
          ) : (
            <input
              className="doc-title"
              value={journey.title}
              placeholder="マップのタイトル"
              aria-label="マップのタイトル"
              onChange={(e) => onChange({ ...journey, title: e.target.value, updatedAt: Date.now() })}
            />
          )}
          {readOnly ? (
            journey.subtitle && <span className="doc-sub doc-sub--static">{journey.subtitle}</span>
          ) : (
            <input
              className="doc-sub"
              value={journey.subtitle}
              placeholder="ブランド・商材・案件名"
              aria-label="サブタイトル"
              onChange={(e) => onChange({ ...journey, subtitle: e.target.value, updatedAt: Date.now() })}
            />
          )}
        </div>

        <div className="app-bar-actions">
          {savedLabel && <span className="saved-label">{savedLabel}</span>}
          {readOnly && <span className="badge badge--view">閲覧専用</span>}

          {!readOnly && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onUndo}
              disabled={!canUndo}
              title="元に戻す (Ctrl/⌘ + Z)"
            >
              <IconUndo />
              <span className="hide-sm">元に戻す</span>
            </button>
          )}

          {onDuplicate && (
            <button type="button" className="btn btn--primary" onClick={onDuplicate}>
              <IconCopy />
              自分のマップとして複製
            </button>
          )}

          <Menu
            className="btn btn--ghost"
            label="エクスポート"
            items={[
              { label: 'JSON で書き出す', onSelect: () => exportJson(journey) },
              { label: 'CSV で書き出す（Excel）', onSelect: () => exportCsv(journey) },
              { label: '印刷 / PDF 保存', onSelect: () => window.print() },
            ]}
          >
            <IconDownload />
            <span className="hide-sm">書き出し</span>
          </Menu>

          {!readOnly && (
            <>
              <button type="button" className="btn btn--ghost hide-sm" onClick={() => window.print()}>
                <IconPrint />
                印刷
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setSharing(true)}>
                <IconShare />
                共有
              </button>
            </>
          )}
        </div>
      </header>

      <PersonaPanel journey={journey} readOnly={readOnly} onChange={onChange} />

      {!readOnly && (
        <div className="board-tools">
          <button
            type="button"
            className="btn btn--soft"
            onClick={() => onChange(A.addStage(journey, journey.stages.length))}
          >
            <IconPlus />
            フェーズ（列）を追加
          </button>

          <Menu
            className="btn btn--soft"
            label="行を追加"
            align="left"
            items={[
              ...presetItems,
              {
                label: '＋ 空の行を追加',
                onSelect: () =>
                  onChange(A.addRow(journey, { key: 'custom', label: '新しい行', hint: '', group: 'custom' })),
              },
            ]}
          >
            <IconPlus />
            行を追加
          </Menu>

          <span className="tools-hint">
            カードはドラッグで移動できます／Enter で確定・Shift + Enter で改行
          </span>
        </div>
      )}

      <Board journey={journey} readOnly={readOnly} onChange={onChange} />

      {sharing && <ShareDialog journey={journey} onClose={() => setSharing(false)} />}
    </div>
  );
}
