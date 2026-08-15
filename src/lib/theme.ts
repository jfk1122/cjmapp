export type ThemeSetting = 'light' | 'dark' | 'system';

const KEY = 'cjm.theme';

export const THEMES: { key: ThemeSetting; label: string }[] = [
  { key: 'light', label: 'ライト' },
  { key: 'dark', label: 'ダーク' },
  { key: 'system', label: 'OS に合わせる' },
];

/** 既定はライト。OS がダークでも、明示的に選ぶまでは白で開く */
export function loadTheme(): ThemeSetting {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* localStorage が使えない環境では既定値で動かす */
  }
  return 'light';
}

/**
 * `light` / `dark` は data-theme 属性で明示し、
 * `system` は属性を外して CSS の prefers-color-scheme に委ねる。
 */
export function applyTheme(setting: ThemeSetting): void {
  const root = document.documentElement;
  if (setting === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', setting);

  try {
    localStorage.setItem(KEY, setting);
  } catch {
    /* 保存できなくても表示は切り替える */
  }
}
