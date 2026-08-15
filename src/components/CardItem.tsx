import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TONES, type Card } from '../types';
import { IconTrash } from './Icons';

interface Props {
  card: Card;
  readOnly: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onChange: (patch: Partial<Card>) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropIndicator: boolean;
}

export function CardItem({
  card,
  readOnly,
  editing,
  onStartEdit,
  onEndEdit,
  onChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  dropIndicator,
}: Props) {
  const [draft, setDraft] = useState(card.text);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) setDraft(card.text);
  }, [editing, card.text]);

  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  useEffect(() => {
    if (editing) textarea.current?.focus();
  }, [editing]);

  const commit = () => {
    const text = draft.trim();
    if (!text) {
      onDelete();
      return;
    }
    if (text !== card.text) onChange({ text });
    onEndEdit();
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
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(card.text);
              if (!card.text) onDelete();
              else onEndEdit();
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
              // onMouseDown で処理して textarea の blur による確定より先に色を反映させる
              onMouseDown={(e) => {
                e.preventDefault();
                onChange({ tone: t.key });
              }}
            />
          ))}
          <button
            type="button"
            className="icon-btn icon-btn--sm card-delete"
            aria-label="カードを削除"
            onMouseDown={(e) => {
              e.preventDefault();
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
