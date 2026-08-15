import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { SCHEMA_VERSION } from '../types';
import { buildJourney, TEMPLATES } from '../data/templates';

/** 初期リリース（版数フィールドを持たない）形式のデータ */
const v0 = () => ({
  id: 'm-old',
  title: '旧データ',
  subtitle: '',
  persona: { name: '佐藤', profile: '', goal: '' },
  stages: [
    { id: 's1', name: '認知', summary: '' },
    { id: 's2', name: '検討', summary: '' },
  ],
  rows: [{ key: 'userflow', label: 'ユーザーフロー', hint: '', group: 'user' }],
  cells: { 'userflow::s1': [{ id: 'c1', text: '広告に接触', tone: 'blue' }] },
  createdAt: 1000,
  updatedAt: 2000,
});

describe('migrate', () => {
  it('版数の無いデータを現行版へ引き上げ、中身を保つ', () => {
    const j = migrate(v0());

    expect(j).not.toBeNull();
    expect(j!.schemaVersion).toBe(SCHEMA_VERSION);
    expect(j!.id).toBe('m-old');
    expect(j!.title).toBe('旧データ');
    expect(j!.stages.map((s) => s.name)).toEqual(['認知', '検討']);
    expect(j!.cells['userflow::s1'][0]).toMatchObject({ text: '広告に接触', tone: 'blue' });
    expect(j!.createdAt).toBe(1000);
  });

  it('v1 データに groupLabels を足して v2 にする', () => {
    const v1 = { ...v0(), schemaVersion: 1 };
    const j = migrate(v1)!;

    expect(j.schemaVersion).toBe(2);
    expect(j.groupLabels).toEqual({});
    // v1 の中身はそのまま残る
    expect(j.title).toBe('旧データ');
    expect(j.cells['userflow::s1'][0].text).toBe('広告に接触');
  });

  it('groupLabels の不正な値は落とす', () => {
    const j = migrate({
      ...v0(),
      schemaVersion: 1,
      groupLabels: { triple: '3つのメディア', unknown: 'x', user: 42 },
    })!;

    expect(j.groupLabels).toEqual({ triple: '3つのメディア' });
  });

  it('現行版のデータはそのまま通す', () => {
    const source = buildJourney(TEMPLATES[1]);
    const j = migrate(JSON.parse(JSON.stringify(source)));

    expect(j).not.toBeNull();
    expect(j).toEqual(source);
  });

  it('欠損フィールドを既定値で補う', () => {
    const j = migrate({ id: 'm1', rows: [{ key: 'userflow', label: 'フロー', group: 'user' }] });

    expect(j).not.toBeNull();
    expect(j!.title).toBe('');
    expect(j!.subtitle).toBe('');
    expect(j!.persona).toEqual({ name: '', profile: '', goal: '' });
    expect(j!.stages).toEqual([]);
    expect(j!.cells).toEqual({});
    expect(typeof j!.updatedAt).toBe('number');
  });

  it('不正な tone と group は既定値に落とす', () => {
    const data = v0();
    data.cells['userflow::s1'][0].tone = 'rainbow';
    data.rows[0].group = 'unknown-group';

    const j = migrate(data)!;

    expect(j.cells['userflow::s1'][0].tone).toBe('neutral');
    expect(j.rows[0].group).toBe('custom');
  });

  it('空になったセルはキーごと落とす', () => {
    const j = migrate({ ...v0(), cells: { 'userflow::s1': [], 'userflow::s2': 'こわれている' } })!;
    expect(j.cells).toEqual({});
  });

  it('読み込めないデータでは null を返す', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate('文字列')).toBeNull();
    expect(migrate([])).toBeNull();
    expect(migrate({})).toBeNull(); // id も rows も無い
    expect(migrate({ ...v0(), rows: [] })).toBeNull(); // 行が無いマップは編集できない
  });

  it('未来の版数のデータは読まない', () => {
    expect(migrate({ ...v0(), schemaVersion: SCHEMA_VERSION + 1 })).toBeNull();
  });
});
