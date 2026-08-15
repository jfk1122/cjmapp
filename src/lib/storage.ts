import type { Journey } from '../types';
import { migrate } from './migrate';

const KEY = 'cjm.maps.v1';

/** 壊れたデータで画面全体が落ちないよう、読み込みは常に防御的に行う */
export function loadAll(): Journey[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(migrate)
      .filter((j): j is Journey => j !== null);
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
