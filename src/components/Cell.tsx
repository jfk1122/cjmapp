import { useState } from 'react';
import type { Card, Tone } from '../types';
import { CardItem } from './CardItem';
import { IconPlus } from './Icons';

export interface DragPayload {
  fromKey: string;
  cardId: string;
}

/** カードの編集を抜けたあと、次にどこへ進むか */
export type Advance = 'close' | 'next-card' | 'next-cell' | 'prev-cell';

const MIME = 'application/x-cjm-card';

interface Props {
  cellId: string;
  cards: Card[];
  hint: string;
  readOnly: boolean;
  /** このセルで編集中のカード。Board が全セルを横断して 1 つだけ持つ */
  editingCardId: string | null;
  onAdd: () => void;
  onStartEdit: (cardId: string) => void;
  onResolve: (cardId: string, text: string | null, intent: Advance) => void;
  onPasteLines: (cardId: string, lines: string[]) => void;
  onChangeCard: (cardId: string, patch: Partial<Card>) => void;
  onDeleteCard: (cardId: string) => void;
  onMoveCard: (payload: DragPayload, toKey: string, beforeCardId: string | null) => void;
}

export function Cell({
  cellId,
  cards,
  hint,
  readOnly,
  editingCardId,
  onAdd,
  onStartEdit,
  onResolve,
  onPasteLines,
  onChangeCard,
  onDeleteCard,
  onMoveCard,
}: Props) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const readPayload = (e: React.DragEvent): DragPayload | null => {
    try {
      const raw = e.dataTransfer.getData(MIME);
      return raw ? (JSON.parse(raw) as DragPayload) : null;
    } catch {
      return null;
    }
  };

  const handleDrop = (e: React.DragEvent, beforeCardId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    const payload = readPayload(e);
    if (payload) onMoveCard(payload, cellId, beforeCardId);
  };

  return (
    <div
      className={`cell${dropTarget === 'end' ? ' cell--drop' : ''}`}
      onDragOver={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setDropTarget('end');
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
      }}
      onDrop={(e) => handleDrop(e, null)}
    >
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          readOnly={readOnly}
          editing={editingCardId === card.id}
          dropIndicator={dropTarget === card.id}
          onStartEdit={() => onStartEdit(card.id)}
          onResolve={(text, intent) => onResolve(card.id, text, intent)}
          onPasteLines={(lines) => onPasteLines(card.id, lines)}
          onChangeTone={(tone: Tone) => onChangeCard(card.id, { tone })}
          onDelete={() => onDeleteCard(card.id)}
          onDragStart={(e) => {
            e.dataTransfer.setData(MIME, JSON.stringify({ fromKey: cellId, cardId: card.id }));
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            if (readOnly) return;
            e.preventDefault();
            e.stopPropagation();
            setDropTarget(card.id);
          }}
          onDrop={(e) => handleDrop(e, card.id)}
        />
      ))}

      {readOnly ? (
        cards.length === 0 && <span className="cell-empty">—</span>
      ) : (
        <button
          type="button"
          className={`cell-add${cards.length === 0 ? ' cell-add--empty' : ''}`}
          onClick={onAdd}
        >
          <IconPlus size={14} />
          <span>{cards.length === 0 ? hint : '追加'}</span>
        </button>
      )}
    </div>
  );
}
