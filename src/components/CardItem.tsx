import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TONES, type Card, type Tone } from '../types';
import type { Advance } from './Cell';
import { IconTrash } from './Icons';

interface Props {
  card: Card;
  readOnly: boolean;
  editing: boolean;
  onStartEdit: () => void;
  /** text が null なら取り消し。確定と次の移動先を 1 回で親に伝える */
  onResolve: (text: string | null, intent: Advance) => void;
  onPasteLines: (lines: string[]) => void;
  onChangeTone: (tone: Tone) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropIndicator: boolean;
}

/** 箇条書き記号を落として 1 行 1 カードにする */
function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[・\-*•]\s*/, '').trim())
    .filter(Boolean);
}

export function CardItem({
  card,
  readOnly,
  editing,
  onStartEdit,
  onResolve,
  onPasteLines,
  onChangeTone,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  dropIndicator,
}: Props) {
  const [draft, setDraft] = useState(card.text);
  const textarea = useRef<HTMLTextAreaElement>(null);
  // キー操作と blur が続けて発火しても、確定は 1 回だけにする
  const resolved = useRef(false);

  useEffect(() => {
    if (editing) {
      setDraft(card.text);
      resolved.current = false;
      textarea.current?.focus();
    }
  }, [editing, card.text]);

  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  const resolve = (text: string | null, intent: Advance) => {
    if (resolved.current) return;
    resolved.current = true;
    onResolve(text, intent);
  };

  if (editing) {
    return (
      <div className={`card card--${card.tone} card--editing`}>
        <textarea
          ref={textarea}
          className="card-input"
          value={draft}
          rows={1}
          placeholder="内容を入力"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => resolve(draft, 'close')}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text/plain');
            const lines = splitLines(text);
            if (lines.length < 2) return;
            e.preventDefault();
            resolved.current = true;
            onPasteLines(lines);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              // 空のまま Enter なら連続入力を終える
              resolve(draft, draft.trim() === '' ? 'close' : 'next-card');
            } else if (e.key === 'Tab') {
              e.preventDefault();
              resolve(draft, e.shiftKey ? 'prev-cell' : 'next-cell');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              resolve(null, 'close');
            }
          }}
        />
        <div className="tone-row">
          {TONES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tone-dot tone-dot--${t.key}${card.tone === t.key ? ' is-active' : ''}`}
              aria-label={`色: ${t.label}`}
              // onMouseDown で処理して、textarea の blur による確定より先に色を反映させる
              onMouseDown={(e) => {
                e.preventDefault();
                onChangeTone(t.key);
              }}
            />
          ))}
          <button
            type="button"
            className="icon-btn icon-btn--sm card-delete"
            aria-label="カードを削除"
            onMouseDown={(e) => {
              e.preventDefault();
              resolved.current = true;
              onDelete();
            }}
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card card--${card.tone}${readOnly ? '' : ' card--editable'}${
        dropIndicator ? ' card--drop-before' : ''
      }`}
      draggable={!readOnly}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      tabIndex={readOnly ? -1 : 0}
      role={readOnly ? undefined : 'button'}
      onClick={() => !readOnly && onStartEdit()}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStartEdit();
        }
      }}
    >
      <span className="card-text">{card.text}</span>
    </div>
  );
}
