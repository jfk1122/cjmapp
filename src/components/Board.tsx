import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  cellKey,
  groupLabelOf,
  parseCellKey,
  type GroupKey,
  type Journey,
  type RowDef,
  type Stage,
} from '../types';
import * as A from '../lib/actions';
import { Cell, type Advance, type DragPayload } from './Cell';
import { Menu } from './Menu';
import { IconDots, IconFit, IconPlus, IconZoomOut } from './Icons';

interface Props {
  journey: Journey;
  readOnly: boolean;
  onChange: (next: Journey) => void;
}

/** 編集中のカード。セルを跨いだ連続入力のため Board が持つ */
interface Cursor {
  cellId: string;
  cardId: string;
}

/** 連続する同じグループの行をひとまとめにする（左端の縦ラベル 1 つ分） */
interface GroupRun {
  group: GroupKey;
  rows: RowDef[];
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1;
const ZOOM_STEP = 0.1;

const clampZoom = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));

function toGroupRuns(rows: RowDef[]): GroupRun[] {
  const runs: GroupRun[] = [];
  for (const row of rows) {
    const last = runs[runs.length - 1];
    if (last && last.group === row.group) last.rows.push(row);
    else runs.push({ group: row.group, rows: [row] });
  }
  return runs;
}

export function Board({ journey, readOnly, onChange }: Props) {
  const { stages, rows } = journey;
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  /** 現在のズームに関係なく、ボード本来の幅を返す */
  const naturalWidth = useCallback(() => {
    const board = boardRef.current;
    return board ? board.getBoundingClientRect().width / zoom : 0;
  }, [zoom]);

  const fitToWidth = useCallback(() => {
    const scroller = scrollRef.current;
    const natural = naturalWidth();
    if (!scroller || natural === 0) return;
    // 左右のパディング分を差し引く
    setZoom(clampZoom((scroller.clientWidth - 32) / natural));
  }, [naturalWidth]);

  // Ctrl / ⌘ + ホイールでズーム。React の onWheel は passive なので直接登録する
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z - Math.sign(e.deltaY) * 0.05));
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, []);

  /**
   * カードの編集を終える。テキストの確定と次のカードの用意を 1 回の更新でまとめる。
   * 別々に onChange すると、2 回目が 1 回目より前の journey を元にしてしまう。
   */
  const resolve = (cellId: string, cardId: string, text: string | null, intent: Advance) => {
    let next = journey;
    const card = (journey.cells[cellId] ?? []).find((c) => c.id === cardId);

    if (text === null) {
      // Esc: 書きかけの空カードだけ片付ける
      if (card && card.text === '') next = A.deleteCard(journey, cellId, cardId);
    } else if (text.trim() === '') {
      if (card) next = A.deleteCard(journey, cellId, cardId);
    } else if (card && card.text !== text.trim()) {
      next = A.updateCard(journey, cellId, cardId, { text: text.trim() });
    }

    const target = intent === 'close' ? null : nextCellId(cellId, intent);
    if (!target) {
      if (next !== journey) onChange(next);
      setCursor(null);
      return;
    }

    const added = A.addCard(next, target);
    onChange(added.journey);
    setCursor({ cellId: target, cardId: added.cardId });
  };

  /** Tab / Shift+Tab で同じ行の隣のフェーズへ。端では止まる */
  const nextCellId = (cellId: string, intent: Advance): string | null => {
    if (intent === 'next-card') return cellId;
    const parsed = parseCellKey(cellId);
    if (!parsed) return null;
    const index = stages.findIndex((s) => s.id === parsed.stageId);
    const to = index + (intent === 'next-cell' ? 1 : -1);
    if (index < 0 || to < 0 || to >= stages.length) return null;
    return cellKey(parsed.rowKey, stages[to].id);
  };

  /** 複数行のペーストを 1 行 1 カードに展開する */
  const pasteLines = (cellId: string, cardId: string, lines: string[]) => {
    const [first, ...rest] = lines;
    let next = A.updateCard(journey, cellId, cardId, { text: first });
    for (const line of rest) {
      const added = A.addCard(next, cellId);
      next = A.updateCard(added.journey, cellId, added.cardId, { text: line });
    }
    onChange(next);
    setCursor(null);
  };

  const handleMove = (payload: DragPayload, toKey: string, beforeCardId: string | null) =>
    onChange(A.moveCard(journey, payload.fromKey, payload.cardId, toKey, beforeCardId));

  const runs = toGroupRuns(rows);
  const columns =
    stages.length > 0
      ? `var(--rail-w) var(--head-w) repeat(${stages.length}, var(--col-w))`
      : 'var(--rail-w) var(--head-w)';

  return (
    <div className="board-scroll" ref={scrollRef}>
      <div className="board" ref={boardRef} style={{ gridTemplateColumns: columns, zoom }}>
        <div className="board-corner">
          <span className="corner-label">フェーズ →</span>
        </div>
        {stages.map((stage, i) => (
          <StageHeader
            key={stage.id}
            stage={stage}
            index={i}
            total={stages.length}
            readOnly={readOnly}
            journey={journey}
            onChange={onChange}
          />
        ))}

        {runs.map((run, runIndex) => (
          <Fragment key={`${run.group}-${runIndex}`}>
            {runIndex > 0 && <div className="group-divider" />}
            <GroupRail
              group={run.group}
              span={run.rows.length}
              readOnly={readOnly}
              journey={journey}
              onChange={onChange}
            />
            {run.rows.map((row) => (
              <Fragment key={row.key}>
                <RowHead
                  row={row}
                  index={rows.indexOf(row)}
                  total={rows.length}
                  readOnly={readOnly}
                  journey={journey}
                  onChange={onChange}
                />
                {stages.map((stage) => {
                  const id = cellKey(row.key, stage.id);
                  return (
                    <Cell
                      key={id}
                      cellId={id}
                      cards={journey.cells[id] ?? []}
                      hint={row.hint}
                      readOnly={readOnly}
                      editingCardId={cursor?.cellId === id ? cursor.cardId : null}
                      onAdd={() => {
                        const added = A.addCard(journey, id);
                        onChange(added.journey);
                        setCursor({ cellId: id, cardId: added.cardId });
                      }}
                      onStartEdit={(cardId) => setCursor({ cellId: id, cardId })}
                      onResolve={(cardId, text, intent) => resolve(id, cardId, text, intent)}
                      onPasteLines={(cardId, lines) => pasteLines(id, cardId, lines)}
                      onChangeCard={(cardId, patch) => onChange(A.updateCard(journey, id, cardId, patch))}
                      onDeleteCard={(cardId) => {
                        setCursor(null);
                        onChange(A.deleteCard(journey, id, cardId));
                      }}
                      onMoveCard={handleMove}
                    />
                  );
                })}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>

      <div className="zoom-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label="縮小"
          onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
          disabled={zoom <= MIN_ZOOM}
        >
          <IconZoomOut size={15} />
        </button>
        <button
          type="button"
          className="zoom-value"
          aria-label="ズームを 100% に戻す"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="拡大"
          onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
          disabled={zoom >= MAX_ZOOM}
        >
          <IconPlus size={15} />
        </button>
        <button type="button" className="icon-btn" aria-label="全体を表示" onClick={fitToWidth}>
          <IconFit size={15} />
        </button>
      </div>
    </div>
  );
}

interface GroupRailProps {
  group: GroupKey;
  span: number;
  readOnly: boolean;
  journey: Journey;
  onChange: (next: Journey) => void;
}

/** 左端の縦ラベル。グループ名はマップごとに変更できる */
function GroupRail({ group, span, readOnly, journey, onChange }: GroupRailProps) {
  const label = groupLabelOf(journey, group);
  return (
    <div className={`group-rail group-rail--${group}`} style={{ gridRow: `span ${span}` }}>
      {readOnly ? (
        <span className="group-rail-label">{label}</span>
      ) : (
        <input
          className="group-rail-label group-rail-input"
          value={journey.groupLabels?.[group] ?? label}
          placeholder="グループ名"
          aria-label={`グループ名（${label}）`}
          // 回転しているため、入力欄の幅が見た目の高さになる
          style={{ width: `${Math.max(label.length + 3, 7)}em` }}
          onChange={(e) => onChange(A.updateGroupLabel(journey, group, e.target.value))}
        />
      )}
    </div>
  );
}

interface StageHeaderProps {
  stage: Stage;
  index: number;
  total: number;
  readOnly: boolean;
  journey: Journey;
  onChange: (next: Journey) => void;
}

function StageHeader({ stage, index, total, readOnly, journey, onChange }: StageHeaderProps) {
  return (
    <div className="stage-head">
      <div className="stage-head-top">
        <span className="stage-index">{String(index + 1).padStart(2, '0')}</span>
        {readOnly ? (
          <span className="stage-name">{stage.name}</span>
        ) : (
          <input
            className="stage-name-input"
            value={stage.name}
            placeholder="フェーズ名"
            aria-label={`フェーズ ${index + 1} の名前`}
            onChange={(e) => onChange(A.updateStage(journey, stage.id, { name: e.target.value }))}
          />
        )}
        {!readOnly && (
          <Menu
            label={`フェーズ「${stage.name}」の操作`}
            items={[
              { label: '← 左に列を追加', onSelect: () => onChange(A.addStage(journey, index)) },
              { label: '→ 右に列を追加', onSelect: () => onChange(A.addStage(journey, index + 1)) },
              { label: '列を複製', onSelect: () => onChange(A.duplicateStage(journey, stage.id)) },
              {
                label: '左へ移動',
                disabled: index === 0,
                onSelect: () => onChange(A.moveStage(journey, stage.id, -1)),
              },
              {
                label: '右へ移動',
                disabled: index === total - 1,
                onSelect: () => onChange(A.moveStage(journey, stage.id, 1)),
              },
              {
                label: 'この列を削除',
                danger: true,
                disabled: total <= 1,
                onSelect: () => {
                  if (confirm(`フェーズ「${stage.name}」と入力内容を削除します。よろしいですか？`)) {
                    onChange(A.removeStage(journey, stage.id));
                  }
                },
              },
            ]}
          >
            <IconDots size={15} />
          </Menu>
        )}
      </div>
      {readOnly ? (
        stage.summary && <p className="stage-summary">{stage.summary}</p>
      ) : (
        <input
          className="stage-summary-input"
          value={stage.summary}
          placeholder="このフェーズのユーザー状態"
          aria-label={`フェーズ ${index + 1} の概要`}
          onChange={(e) => onChange(A.updateStage(journey, stage.id, { summary: e.target.value }))}
        />
      )}
    </div>
  );
}

interface RowHeadProps {
  row: RowDef;
  index: number;
  total: number;
  readOnly: boolean;
  journey: Journey;
  onChange: (next: Journey) => void;
}

function RowHead({ row, index, total, readOnly, journey, onChange }: RowHeadProps) {
  return (
    <div className={`row-head row-head--${row.group}`}>
      <div className="row-head-inner">
        {readOnly ? (
          <span className="row-label">{row.label}</span>
        ) : (
          <input
            className="row-label-input"
            value={row.label}
            placeholder="行名"
            aria-label="行名"
            onChange={(e) => onChange(A.updateRow(journey, row.key, { label: e.target.value }))}
          />
        )}
        {!readOnly && (
          <Menu
            label={`行「${row.label}」の操作`}
            items={[
              {
                label: '上へ移動',
                disabled: index === 0,
                onSelect: () => onChange(A.moveRow(journey, row.key, -1)),
              },
              {
                label: '下へ移動',
                disabled: index === total - 1,
                onSelect: () => onChange(A.moveRow(journey, row.key, 1)),
              },
              {
                label: 'この行を削除',
                danger: true,
                disabled: total <= 1,
                onSelect: () => {
                  if (confirm(`行「${row.label}」と入力内容を削除します。よろしいですか？`)) {
                    onChange(A.removeRow(journey, row.key));
                  }
                },
              },
            ]}
          >
            <IconDots size={15} />
          </Menu>
        )}
      </div>
      <p className="row-hint">{row.hint}</p>
    </div>
  );
}
