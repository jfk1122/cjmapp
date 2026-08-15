import { cellKey, type Card, type GroupKey, type Journey, type RowDef, type Stage } from '../types';
import { uid } from './id';

const touch = (j: Journey): Journey => ({ ...j, updatedAt: Date.now() });

const move = <T>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/* ---------------- 列（フェーズ） ---------------- */

export function addStage(j: Journey, atIndex: number): Journey {
  const stage: Stage = { id: uid('s'), name: '新しいフェーズ', summary: '' };
  const stages = [...j.stages];
  stages.splice(atIndex, 0, stage);
  return touch({ ...j, stages });
}

export function duplicateStage(j: Journey, stageId: string): Journey {
  const index = j.stages.findIndex((s) => s.id === stageId);
  if (index < 0) return j;
  const source = j.stages[index];
  const copy: Stage = { ...source, id: uid('s'), name: `${source.name} のコピー` };
  const stages = [...j.stages];
  stages.splice(index + 1, 0, copy);

  const cells = { ...j.cells };
  for (const row of j.rows) {
    const cards = j.cells[cellKey(row.key, stageId)];
    if (cards?.length) {
      cells[cellKey(row.key, copy.id)] = cards.map((c) => ({ ...c, id: uid('c') }));
    }
  }
  return touch({ ...j, stages, cells });
}

export function updateStage(j: Journey, stageId: string, patch: Partial<Stage>): Journey {
  return touch({ ...j, stages: j.stages.map((s) => (s.id === stageId ? { ...s, ...patch } : s)) });
}

export function removeStage(j: Journey, stageId: string): Journey {
  const cells = { ...j.cells };
  for (const row of j.rows) delete cells[cellKey(row.key, stageId)];
  return touch({ ...j, stages: j.stages.filter((s) => s.id !== stageId), cells });
}

export function moveStage(j: Journey, stageId: string, dir: -1 | 1): Journey {
  const index = j.stages.findIndex((s) => s.id === stageId);
  if (index < 0) return j;
  return touch({ ...j, stages: move(j.stages, index, index + dir) });
}

/* ---------------- 行（ユーザーフロー / KPI …） ---------------- */

/** 既存キーと衝突しない行キーを作る */
function uniqueRowKey(j: Journey, base: string): string {
  if (!j.rows.some((r) => r.key === base)) return base;
  let i = 2;
  while (j.rows.some((r) => r.key === `${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/** 同じグループの行がすでにある場合はその直後に挿入し、グループ帯が分断されないようにする */
function insertionIndex(j: Journey, group: RowDef['group'], atIndex?: number): number {
  if (atIndex !== undefined) return atIndex;
  const last = j.rows.map((r) => r.group).lastIndexOf(group);
  return last < 0 ? j.rows.length : last + 1;
}

export function addRow(j: Journey, def: Omit<RowDef, 'custom'>, atIndex?: number): Journey {
  const row: RowDef = { ...def, key: uniqueRowKey(j, def.key), custom: true };
  const rows = [...j.rows];
  rows.splice(insertionIndex(j, def.group, atIndex), 0, row);
  return touch({ ...j, rows });
}

export function updateRow(j: Journey, key: string, patch: Partial<RowDef>): Journey {
  return touch({ ...j, rows: j.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
}

export function removeRow(j: Journey, key: string): Journey {
  const cells = { ...j.cells };
  for (const stage of j.stages) delete cells[cellKey(key, stage.id)];
  return touch({ ...j, rows: j.rows.filter((r) => r.key !== key), cells });
}

export function moveRow(j: Journey, key: string, dir: -1 | 1): Journey {
  const index = j.rows.findIndex((r) => r.key === key);
  if (index < 0) return j;
  return touch({ ...j, rows: move(j.rows, index, index + dir) });
}

/* ---------------- グループ ---------------- */

export function updateGroupLabel(j: Journey, group: GroupKey, label: string): Journey {
  return touch({ ...j, groupLabels: { ...j.groupLabels, [group]: label } });
}

/* ---------------- カード ---------------- */

export function addCard(j: Journey, cellId: string): { journey: Journey; cardId: string } {
  const card: Card = { id: uid('c'), text: '', tone: 'neutral' };
  const cells = { ...j.cells, [cellId]: [...(j.cells[cellId] ?? []), card] };
  return { journey: touch({ ...j, cells }), cardId: card.id };
}

export function updateCard(j: Journey, cellId: string, cardId: string, patch: Partial<Card>): Journey {
  const cards = j.cells[cellId];
  if (!cards) return j;
  return touch({
    ...j,
    cells: { ...j.cells, [cellId]: cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) },
  });
}

export function deleteCard(j: Journey, cellId: string, cardId: string): Journey {
  const cards = j.cells[cellId];
  if (!cards) return j;
  const next = cards.filter((c) => c.id !== cardId);
  const cells = { ...j.cells };
  if (next.length) cells[cellId] = next;
  else delete cells[cellId];
  return touch({ ...j, cells });
}

export function moveCard(
  j: Journey,
  fromKey: string,
  cardId: string,
  toKey: string,
  beforeCardId: string | null,
): Journey {
  const source = j.cells[fromKey] ?? [];
  const card = source.find((c) => c.id === cardId);
  if (!card || cardId === beforeCardId) return j;

  const cells = { ...j.cells };
  const remaining = source.filter((c) => c.id !== cardId);
  if (remaining.length) cells[fromKey] = remaining;
  else delete cells[fromKey];

  const target = fromKey === toKey ? remaining : [...(cells[toKey] ?? [])];
  const at = beforeCardId ? target.findIndex((c) => c.id === beforeCardId) : -1;
  if (at >= 0) target.splice(at, 0, card);
  else target.push(card);
  cells[toKey] = target;

  return touch({ ...j, cells });
}
