import { useEffect, useState } from 'react';
import type { Journey } from '../types';
import { buildShareUrl } from '../lib/share';
import { IconCheck, IconClose, IconCopy } from './Icons';

interface Props {
  journey: Journey;
  onClose: () => void;
}

/** URL が長くなりすぎると一部のツールで切れるため、目安として警告を出す */
const URL_WARN_LENGTH = 8000;

export function ShareDialog({ journey, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    buildShareUrl(journey)
      .then((u) => active && setUrl(u))
      .catch(() => active && setError('共有リンクの生成に失敗しました'));
    return () => {
      active = false;
    };
  }, [journey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // クリップボード API が使えない環境では選択状態にして手動コピーを促す
      const input = document.getElementById('share-url') as HTMLInputElement | null;
      input?.select();
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="share-title">共有リンク</h2>
          <button type="button" className="icon-btn" aria-label="閉じる" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <p className="modal-desc">
          マップの内容はリンク自体に埋め込まれます。サーバーには保存されないため、リンクを知っている人だけが閲覧できます。
          共有先では<strong>閲覧専用</strong>で開き、必要に応じて自分のマップとして複製できます。
        </p>

        {error ? (
          <p className="modal-error">{error}</p>
        ) : (
          <>
            <div className="share-row">
              <input id="share-url" className="share-input" readOnly value={url} placeholder="生成中…" />
              <button type="button" className="btn btn--primary" onClick={copy} disabled={!url}>
                {copied ? <IconCheck /> : <IconCopy />}
                {copied ? 'コピーしました' : 'コピー'}
              </button>
            </div>
            {url.length > URL_WARN_LENGTH && (
              <p className="modal-note">
                リンクが長いため（約 {url.length.toLocaleString()} 文字）、サービスによっては途中で切れることがあります。
                その場合は JSON でエクスポートして共有してください。
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
