import { useEffect, type RefObject } from 'react';

/**
 * モーダルダイアログのフォーカス管理。
 *
 * DADS のモーダルダイアログは「フォーカストラップ、Escape での閉じ、
 * 開いた元の要素へのフォーカス復帰」を仕様に含めることを求めている。
 * Escape の扱いは呼び出し側が既に持っているので、ここでは残り 2 つを担う。
 */

const FOCUSABLE = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** 表示されている（＝実際にフォーカスできる）ものだけを順に返す */
function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  );
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // 閉じたときに戻す先。開いた元のボタンにフォーカスを返す
    const opener = document.activeElement as HTMLElement | null;
    const first = focusableIn(root)[0];
    (first ?? root).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusableIn(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      // 端まで来たら反対側へ回して、ダイアログの外へ出さない
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };

    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [ref]);
}
