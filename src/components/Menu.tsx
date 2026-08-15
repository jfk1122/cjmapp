import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface Props {
  items: MenuItem[];
  label: string;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

const GAP = 6;
const EDGE = 8;

/**
 * クリックで開く小さなドロップダウン。
 *
 * パネルは body へポータルして position: fixed で置く。ボード内の見出しは
 * sticky + z-index を持つため、その場に描くと隣の見出しの下に潜り込み、
 * スクロール領域の overflow でも切られてしまう。
 */
export function Menu({ items, label, children, align = 'right', className }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // 描画直後・ペイント前に位置を決める（ちらつきを避ける）
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const t = trigger.current?.getBoundingClientRect();
    const p = panel.current?.getBoundingClientRect();
    if (!t || !p) return;

    // 下に入らなければ上に出す
    let top = t.bottom + GAP;
    if (top + p.height > window.innerHeight - EDGE) {
      top = Math.max(EDGE, t.top - p.height - GAP);
    }

    let left = align === 'right' ? t.right - p.width : t.left;
    left = Math.min(Math.max(EDGE, left), window.innerWidth - p.width - EDGE);

    setPos({ top, left });
  }, [open, align, items.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (trigger.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // スクロールやリサイズで位置がずれるので、追従させずに閉じる
    const close = () => setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <div className="menu">
      <button
        type="button"
        ref={trigger}
        className={className ?? 'icon-btn'}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>

      {open &&
        createPortal(
          <div
            ref={panel}
            className="menu-panel"
            role="menu"
            // 位置が決まるまでは見えない状態で置いて寸法だけ測る
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`menu-item${item.danger ? ' menu-item--danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
