import {
  GROUPS,
  SCHEMA_VERSION,
  TONES,
  type Card,
  type GroupKey,
  type Journey,
  type RowDef,
  type Stage,
  type Tone,
} from '../types';
import { uid } from './id';

/**
 * 保存済みデータを現行スキーマへ変換する。
 *
 * localStorage・共有リンク・JSON インポートはいずれも外部由来で、
 * 古い版数や壊れた値が混ざりうる。読み込み経路はすべてここを通す。
 */

/** 配列の i 番目が v(i) → v(i+1) の変換を担当する */
type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

const TONE_KEYS = new Set<string>(TONES.map((t) => t.key));
const GROUP_KEYS = new Set<string>(GROUPS.map((g) => g.key));

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

function toCards(v: unknown): Card[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isObject).map((c) => ({
    id: str(c.id) || uid('c'),
    text: str(c.text),
    tone: (TONE_KEYS.has(str(c.tone)) ? c.tone : 'neutral') as Tone,
  }));
}

function toStages(v: unknown): Stage[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isObject).map((s) => ({
    id: str(s.id) || uid('s'),
    name: str(s.name),
    summary: str(s.summary),
  }));
}

function toRows(v: unknown): RowDef[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isObject)
    .filter((r) => str(r.key) !== '')
    .map((r) => ({
      key: str(r.key),
      label: str(r.label),
      hint: str(r.hint),
      group: (GROUP_KEYS.has(str(r.group)) ? r.group : 'custom') as GroupKey,
      ...(r.custom === true ? { custom: true } : {}),
    }));
}

function toCells(v: unknown): Record<string, Card[]> {
  if (!isObject(v)) return {};
  const cells: Record<string, Card[]> = {};
  for (const [key, value] of Object.entries(v)) {
    const cards = toCards(value);
    if (cards.length > 0) cells[key] = cards;
  }
  return cells;
}

function toGroupLabels(v: unknown): Partial<Record<GroupKey, string>> {
  if (!isObject(v)) return {};
  const labels: Partial<Record<GroupKey, string>> = {};
  for (const [key, value] of Object.entries(v)) {
    if (GROUP_KEYS.has(key) && typeof value === 'string') labels[key as GroupKey] = value;
  }
  return labels;
}

/** v0（版数フィールドを持たない初期リリース）→ v1: 欠損フィールドを補完する */
const v0ToV1: Migration = (d) => {
  const now = Date.now();
  const persona = isObject(d.persona) ? d.persona : {};
  return {
    schemaVersion: 1,
    id: str(d.id) || uid('m'),
    title: str(d.title),
    subtitle: str(d.subtitle),
    persona: {
      name: str(persona.name),
      profile: str(persona.profile),
      goal: str(persona.goal),
    },
    stages: toStages(d.stages),
    rows: toRows(d.rows),
    cells: toCells(d.cells),
    createdAt: num(d.createdAt, now),
    updatedAt: num(d.updatedAt, now),
  };
};

/** v1 → v2: グループ名の変更を保持できるようにする */
const v1ToV2: Migration = (d) => ({
  ...d,
  schemaVersion: 2,
  groupLabels: toGroupLabels(d.groupLabels),
});

const MIGRATIONS: Migration[] = [v0ToV1, v1ToV2];

/**
 * 変換後の形を検証する。
 * 行が 1 つも無いマップは編集不能なので読み込みを諦める。
 */
function isJourney(d: Record<string, unknown>): d is Journey & Record<string, unknown> {
  return (
    typeof d.id === 'string' &&
    d.id !== '' &&
    Array.isArray(d.stages) &&
    Array.isArray(d.rows) &&
    d.rows.length > 0 &&
    isObject(d.cells)
  );
}

/** 読み込めないデータでは null を返す。呼び出し側で除外すること */
export function migrate(raw: unknown): Journey | null {
  if (!isObject(raw)) return null;

  const from = num(raw.schemaVersion, 0);
  // 未来の版数で保存されたデータは、この版のコードでは正しく解釈できない
  if (from > SCHEMA_VERSION || from < 0) return null;

  let data: Record<string, unknown> = { ...raw };
  for (let v = from; v < SCHEMA_VERSION; v++) {
    data = MIGRATIONS[v](data);
  }

  return isJourney(data) ? (data as unknown as Journey) : null;
}
