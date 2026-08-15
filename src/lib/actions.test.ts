import { describe, expect, it } from 'vitest';
import * as A from './actions';
import { buildJourney, TEMPLATES } from '../data/templates';
import { cellKey, groupLabelOf, type Journey } from '../types';

const ec = () => buildJourney(TEMPLATES.find((t) => t.id === 'ec')!);
const blank = () => buildJourney(TEMPLATES[0]);

const cardsAt = (j: Journey, rowKey: string, stageId: string) => j.cells[cellKey(rowKey, stageId)] ?? [];

describe('列（フェーズ）', () => {
  it('addStage は指定位置に挿入する', () => {
    const j = blank();
    const next = A.addStage(j, 1);
    expect(next.stages).toHaveLength(j.stages.length + 1);
    expect(next.stages[1].name).toBe('新しいフェーズ');
    expect(next.stages[0].id).toBe(j.stages[0].id);
  });

  it('removeStage は列と、その列のセルをすべて消す', () => {
    const j = ec();
    const target = j.stages[0];
    expect(cardsAt(j, 'userflow', target.id).length).toBeGreaterThan(0);

    const next = A.removeStage(j, target.id);

    expect(next.stages.find((s) => s.id === target.id)).toBeUndefined();
    for (const row of j.rows) {
      expect(next.cells[cellKey(row.key, target.id)]).toBeUndefined();
    }
    // 他の列のセルは残る
    expect(cardsAt(next, 'userflow', j.stages[1].id)).toEqual(cardsAt(j, 'userflow', j.stages[1].id));
  });

  it('duplicateStage はカードを新しい ID で複製する', () => {
    const j = ec();
    const source = j.stages[0];
    const next = A.duplicateStage(j, source.id);

    const copy = next.stages[1];
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe(`${source.name} のコピー`);

    const original = cardsAt(j, 'userflow', source.id);
    const copied = cardsAt(next, 'userflow', copy.id);
    expect(copied.map((c) => c.text)).toEqual(original.map((c) => c.text));
    // ID が共有されているとドラッグや編集が両方に波及してしまう
    for (const card of copied) {
      expect(original.some((o) => o.id === card.id)).toBe(false);
    }
  });

  it('moveStage は端を越えない', () => {
    const j = blank();
    const first = j.stages[0].id;
    expect(A.moveStage(j, first, -1).stages[0].id).toBe(first);
    expect(A.moveStage(j, first, 1).stages[1].id).toBe(first);
  });
});

describe('行', () => {
  it('addRow は同じグループの直後に挿入する（グループ帯を分断しない）', () => {
    const j = blank();
    // insight は user グループの 2 行目。user グループの最後は insight
    const next = A.addRow(j, { key: 'emotion', label: '感情', hint: '', group: 'user' });

    const groups = next.rows.map((r) => r.group);
    const firstOther = groups.findIndex((g) => g !== 'user');
    // user グループが連続していること
    expect(groups.slice(0, firstOther).every((g) => g === 'user')).toBe(true);
    expect(groups.slice(firstOther).includes('user')).toBe(false);
    expect(next.rows[firstOther - 1].key).toBe('emotion');
  });

  it('addRow はキーが衝突しないよう連番を振る', () => {
    let j = blank();
    j = A.addRow(j, { key: 'custom', label: '新しい行', hint: '', group: 'custom' });
    j = A.addRow(j, { key: 'custom', label: '新しい行', hint: '', group: 'custom' });

    const keys = j.rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('custom');
    expect(keys).toContain('custom-2');
  });

  it('removeRow は行と、その行のセルをすべて消す', () => {
    const j = ec();
    const next = A.removeRow(j, 'paid');

    expect(next.rows.find((r) => r.key === 'paid')).toBeUndefined();
    for (const stage of j.stages) {
      expect(next.cells[cellKey('paid', stage.id)]).toBeUndefined();
    }
    expect(cardsAt(next, 'owned', j.stages[0].id)).toEqual(cardsAt(j, 'owned', j.stages[0].id));
  });

  it('moveRow は端を越えない', () => {
    const j = blank();
    const last = j.rows[j.rows.length - 1].key;
    expect(A.moveRow(j, last, 1).rows[j.rows.length - 1].key).toBe(last);
  });
});

describe('グループ', () => {
  it('updateGroupLabel はグループ名を差し替える', () => {
    const j = blank();
    const next = A.updateGroupLabel(j, 'triple', '3つのメディア');

    expect(groupLabelOf(next, 'triple')).toBe('3つのメディア');
    // 他のグループは既定名のまま
    expect(groupLabelOf(next, 'user')).toBe('ユーザー理解');
  });

  it('空文字にすると既定名に戻る', () => {
    const j = A.updateGroupLabel(blank(), 'user', '  ');
    expect(groupLabelOf(j, 'user')).toBe('ユーザー理解');
  });
});

describe('カード', () => {
  it('addCard は空のカードを追加して ID を返す', () => {
    const j = blank();
    const id = cellKey('userflow', j.stages[0].id);
    const { journey, cardId } = A.addCard(j, id);

    expect(journey.cells[id]).toHaveLength(1);
    expect(journey.cells[id][0].id).toBe(cardId);
    expect(journey.cells[id][0].text).toBe('');
  });

  it('deleteCard は空になったセルのキーごと消す', () => {
    const j = blank();
    const id = cellKey('userflow', j.stages[0].id);
    const { journey, cardId } = A.addCard(j, id);

    const next = A.deleteCard(journey, id, cardId);
    expect(next.cells[id]).toBeUndefined();
  });

  it('updateCard は対象のカードだけ変える', () => {
    const j = ec();
    const id = cellKey('userflow', j.stages[0].id);
    const target = j.cells[id][1];

    const next = A.updateCard(j, id, target.id, { text: '書き換え', tone: 'red' });

    expect(next.cells[id][1]).toMatchObject({ text: '書き換え', tone: 'red' });
    expect(next.cells[id][0]).toEqual(j.cells[id][0]);
  });

  describe('moveCard', () => {
    it('セルを跨いで末尾へ移動する', () => {
      const j = ec();
      const from = cellKey('userflow', j.stages[0].id);
      const to = cellKey('userflow', j.stages[1].id);
      const card = j.cells[from][0];

      const next = A.moveCard(j, from, card.id, to, null);

      expect(next.cells[from].some((c) => c.id === card.id)).toBe(false);
      expect(next.cells[to][next.cells[to].length - 1].id).toBe(card.id);
      expect(next.cells[to]).toHaveLength(j.cells[to].length + 1);
    });

    it('beforeCardId を指定するとその手前に入る', () => {
      const j = ec();
      const from = cellKey('userflow', j.stages[0].id);
      const to = cellKey('userflow', j.stages[1].id);
      const card = j.cells[from][0];
      const before = j.cells[to][0];

      const next = A.moveCard(j, from, card.id, to, before.id);

      expect(next.cells[to][0].id).toBe(card.id);
      expect(next.cells[to][1].id).toBe(before.id);
    });

    it('同じセル内で並べ替える', () => {
      const j = ec();
      const id = cellKey('userflow', j.stages[0].id);
      const [first, second] = j.cells[id];

      const next = A.moveCard(j, id, second.id, id, first.id);

      expect(next.cells[id].map((c) => c.id)).toEqual([second.id, first.id]);
      expect(next.cells[id]).toHaveLength(j.cells[id].length);
    });

    it('移動元が空になったらセルのキーごと消す', () => {
      const j = blank();
      const from = cellKey('userflow', j.stages[0].id);
      const to = cellKey('userflow', j.stages[1].id);
      const { journey, cardId } = A.addCard(j, from);

      const next = A.moveCard(journey, from, cardId, to, null);

      expect(next.cells[from]).toBeUndefined();
      expect(next.cells[to]).toHaveLength(1);
    });

    it('自分自身の手前へは動かさない', () => {
      const j = ec();
      const id = cellKey('userflow', j.stages[0].id);
      const card = j.cells[id][0];

      expect(A.moveCard(j, id, card.id, id, card.id)).toBe(j);
    });

    it('存在しないカードでは何もしない', () => {
      const j = ec();
      const id = cellKey('userflow', j.stages[0].id);
      expect(A.moveCard(j, id, 'missing', id, null)).toBe(j);
    });
  });
});
