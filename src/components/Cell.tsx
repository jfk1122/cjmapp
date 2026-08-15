import { useState } from 'react';
import type { Card } from '../types';
import { CardItem } from './CardItem';
import { IconPlus } from './Icons';

export interface DragPayload {
  fromKey: string;
  cardId: string;
}

const MIME = 'application/x-cjm-card';

interface Props {
  cellId: string;
  cards: Card[];
  hint: string;
  readOnly: boolean;
  onAdd: () => string;
  onChangeCard: (cardId: string, patch: Partial<Card>) => void;
  onDeleteCard: (cardId: string) => void;
  onMoveCard: (payload: DragPayload, toKey: string, beforeCardId: string | null) => void;
}

export function Cell({
  cellId,
  cards,
  hint,
  readOnly,
  onAdd,
  onChangeCard,
  onDeleteCard,
  onMoveCard,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
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
          editing={editingId === card.id}
          dropIndicator={dropTarget === card.id}
          onStartEdit={() => setEditingId(card.id)}
          onEndEdit={() => setEditingId(null)}
          onChange={(patch) => onChangeCard(card.id, patch)}
          onDelete={() => {
            setEditingId(null);
            onDeleteCard(card.id);
          }}
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
          onClick={() => setEditingId(onAdd())}
        >
          <IconPlus size={14} />
          <span>{cards.length === 0 ? hint : '追加'}</span>
        </button>
      )}
    </div>
  );
}
