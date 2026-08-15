import { useState } from 'react';
import { applyTheme, loadTheme, THEMES, type ThemeSetting } from '../lib/theme';
import { Menu } from './Menu';
import { IconTheme } from './Icons';

export function ThemeToggle() {
  const [setting, setSetting] = useState<ThemeSetting>(loadTheme);

  const choose = (next: ThemeSetting) => {
    applyTheme(next);
    setSetting(next);
  };

  return (
    <Menu
      className="btn btn--ghost"
      label={`表示テーマ（現在: ${THEMES.find((t) => t.key === setting)?.label}）`}
      items={THEMES.map((t) => ({
        label: t.key === setting ? `✓ ${t.label}` : `　${t.label}`,
        onSelect: () => choose(t.key),
      }))}
    >
      <IconTheme />
      <span className="hide-sm">テーマ</span>
    </Menu>
  );
}
