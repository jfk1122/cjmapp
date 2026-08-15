import type { Journey } from '../types';

const KEY = 'cjm.maps.v1';

function isJourney(v: unknown): v is Journey {
  if (typeof v !== 'object' || v === null) return false;
  const j = v as Partial<Journey>;
  return (
    typeof j.id === 'string' &&
    typeof j.title === 'string' &&
    Array.isArray(j.stages) &&
    Array.isArray(j.rows) &&
    typeof j.cells === 'object' &&
    j.cells !== null
  );
}

/** 壊れたデータで画面全体が落ちないよう、読み込みは常に防御的に行う */
export function loadAll(): Journey[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isJourney).map(normalize);
  } catch {
    return [];
  }
}

export function saveAll(maps: Journey[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(maps));
  } catch (e) {
    console.warn('保存に失敗しました', e);
  }
}

/** 外部（共有URL・JSONインポート）由来のデータの欠損を埋める */
export function normalize(j: Journey): Journey {
  return {
    ...j,
    subtitle: j.subtitle ?? '',
    persona: {
      name: j.persona?.name ?? '',
      profile: j.persona?.profile ?? '',
      goal: j.persona?.goal ?? '',
    },
    stages: (j.stages ?? []).map((s) => ({ ...s, summary: s.summary ?? '' })),
    rows: j.rows ?? [],
    cells: Object.fromEntries(
      Object.entries(j.cells ?? {}).map(([k, cards]) => [
        k,
        (Array.isArray(cards) ? cards : []).map((c) => ({ ...c, tone: c.tone ?? 'neutral' })),
      ]),
    ),
    createdAt: j.createdAt ?? Date.now(),
    updatedAt: j.updatedAt ?? Date.now(),
  };
}
