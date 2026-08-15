import { useEffect, useState } from 'react';
import { GROUPS, cellKey, groupLabelOf, type Journey } from '../types';
import { IconClose } from './Icons';

interface Props {
  journey: Journey;
  onClose: () => void;
}

/** フェーズを 1 列ずつ全画面で送る。ワークショップや報告の場を想定 */
export function PresentMode({ journey, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const total = journey.stages.length;
  const stage = journey.stages[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === ' ') setIndex((i) => Math.min(total - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, total]);

  if (!stage) {
    return (
      <div className="present">
        <p className="present-empty">表示できるフェーズがありません。</p>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          閉じる
        </button>
      </div>
    );
  }

  // 行はグループ順にまとめ直して読ませる
  const sections = GROUPS.map((g) => ({
    label: groupLabelOf(journey, g.key),
    rows: journey.rows.filter((r) => r.group === g.key),
  })).filter((s) => s.rows.length > 0);

  return (
    <div className="present" role="dialog" aria-modal="true" aria-label="プレゼンモード">
      <header className="present-bar">
        <div className="present-doc">
          <span className="present-title">{journey.title}</span>
          {journey.persona.name && <span className="present-persona">{journey.persona.name}</span>}
        </div>
        <div className="present-nav">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            ← 前
          </button>
          <span className="present-count">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index === total - 1}
          >
            次 →
          </button>
          <button type="button" className="icon-btn" aria-label="プレゼンモードを終了" onClick={onClose}>
            <IconClose />
          </button>
        </div>
      </header>

      <div className="present-stage">
        <span className="present-index">{String(index + 1).padStart(2, '0')}</span>
        <h2 className="present-name">{stage.name}</h2>
        {stage.summary && <p className="present-summary">{stage.summary}</p>}
      </div>

      <div className="present-body">
        {sections.map((section) => (
          <section key={section.label} className="present-section">
            <h3 className="present-section-title">{section.label}</h3>
            {section.rows.map((row) => {
              const cards = journey.cells[cellKey(row.key, stage.id)] ?? [];
              return (
                <div key={row.key} className={`present-row present-row--${row.group}`}>
                  <span className="present-row-label">{row.label}</span>
                  {cards.length === 0 ? (
                    <span className="present-row-empty">—</span>
                  ) : (
                    <ul className="present-cards">
                      {cards.map((card) => (
                        <li key={card.id} className={`card card--${card.tone}`}>
                          <span className="card-text">{card.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <div className="present-dots">
        {journey.stages.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`present-dot${i === index ? ' is-active' : ''}`}
            aria-label={`${i + 1}. ${s.name}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
