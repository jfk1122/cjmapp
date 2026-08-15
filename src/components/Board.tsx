import { Fragment } from 'react';
import { GROUPS, cellKey, type Card, type Journey, type RowDef, type Stage } from '../types';
import * as A from '../lib/actions';
import { Cell, type DragPayload } from './Cell';
import { Menu } from './Menu';
import { IconDots } from './Icons';

interface Props {
  journey: Journey;
  readOnly: boolean;
  onChange: (next: Journey) => void;
}

const groupLabel = (key: string) => GROUPS.find((g) => g.key === key)?.label ?? 'その他';

export function Board({ journey, readOnly, onChange }: Props) {
  const { stages, rows } = journey;

  const changeCard = (cellId: string, cardId: string, patch: Partial<Card>) =>
    onChange(A.updateCard(journey, cellId, cardId, patch));

  const handleMove = (payload: DragPayload, toKey: string, beforeCardId: string | null) =>
    onChange(A.moveCard(journey, payload.fromKey, payload.cardId, toKey, beforeCardId));

  return (
    <div className="board-scroll">
      <div
        className="board"
        style={{ gridTemplateColumns: `var(--head-w) repeat(${stages.length}, var(--col-w))` }}
      >
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

        {rows.map((row, i) => (
          <Fragment key={row.key}>
            {(i === 0 || rows[i - 1].group !== row.group) && (
              <div className={`group-band group-band--${row.group}`}>{groupLabel(row.group)}</div>
            )}
            <RowHead
              row={row}
              index={i}
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
                  onAdd={() => {
                    const { journey: next, cardId } = A.addCard(journey, id);
                    onChange(next);
                    return cardId;
                  }}
                  onChangeCard={(cardId, patch) => changeCard(id, cardId, patch)}
                  onDeleteCard={(cardId) => onChange(A.deleteCard(journey, id, cardId))}
                  onMoveCard={handleMove}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
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
