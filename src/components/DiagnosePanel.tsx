import type { Stage } from '../types';
import type { Diagnosis, Finding } from '../lib/diagnose';
import { IconCheck, IconClose } from './Icons';

interface Props {
  result: Diagnosis;
  stages: Stage[];
  onClose: () => void;
  /** 指摘のセルへ移動する */
  onFocusCell: (cellId: string) => void;
}

/** スコアの見え方。数字だけだと良し悪しが伝わらないので言葉も添える */
function scoreTone(score: number): { key: string; label: string } {
  if (score >= 85) return { key: 'good', label: '十分に検討されています' };
  if (score >= 60) return { key: 'mid', label: '主要な要素は揃っています' };
  if (score >= 30) return { key: 'low', label: '空白が目立ちます' };
  return { key: 'empty', label: 'これから作り込む段階です' };
}

export function DiagnosePanel({ result, stages, onClose, onFocusCell }: Props) {
  const tone = scoreTone(result.score);

  // フェーズ順に並べ、マップ全体の指摘を先頭に置く
  const order = new Map(stages.map((s, i) => [s.id, i]));
  const sorted = [...result.findings].sort((a, b) => {
    const ai = a.stageId === undefined ? -1 : (order.get(a.stageId) ?? 999);
    const bi = b.stageId === undefined ? -1 : (order.get(b.stageId) ?? 999);
    if (ai !== bi) return ai - bi;
    // 同じフェーズ内では warn を先に
    return a.severity === b.severity ? 0 : a.severity === 'warn' ? -1 : 1;
  });

  const warnings = sorted.filter((f) => f.severity === 'warn').length;

  return (
    <aside className="diagnose" aria-label="ジャーニー診断">
      <header className="diagnose-head">
        <h2 className="diagnose-title">ジャーニー診断</h2>
        <button type="button" className="icon-btn" aria-label="診断を閉じる" onClick={onClose}>
          <IconClose />
        </button>
      </header>

      <div className={`diagnose-score diagnose-score--${tone.key}`}>
        <div className="diagnose-score-value">
          <span className="diagnose-score-number">{result.score}</span>
          <span className="diagnose-score-unit">点</span>
        </div>
        <div className="diagnose-score-side">
          <p className="diagnose-score-label">{tone.label}</p>
          <p className="diagnose-score-detail">
            {result.total} 項目中 {result.passed} 項目を満たしています
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="diagnose-clear">
          <IconCheck size={20} />
          <p>指摘はありません。フェーズごとに、ユーザー理解・接点・施策・指標が揃っています。</p>
        </div>
      ) : (
        <>
          <p className="diagnose-summary">
            {warnings > 0 && <strong>{warnings} 件の要確認</strong>}
            {warnings > 0 && sorted.length - warnings > 0 && ' / '}
            {sorted.length - warnings > 0 && `${sorted.length - warnings} 件の提案`}
          </p>
          <ul className="diagnose-list">
            {sorted.map((finding) => (
              <FindingItem key={finding.id} finding={finding} onFocusCell={onFocusCell} />
            ))}
          </ul>
        </>
      )}

      <p className="diagnose-note">
        書かれている内容の良し悪しではなく、<strong>構造の空白と噛み合わせ</strong>だけを見ています。
      </p>
    </aside>
  );
}

function FindingItem({
  finding,
  onFocusCell,
}: {
  finding: Finding;
  onFocusCell: (cellId: string) => void;
}) {
  const jumpable = finding.cellId !== undefined;

  const content = (
    <>
      <span className="finding-top">
        <span className={`finding-badge finding-badge--${finding.severity}`}>
          {finding.severity === 'warn' ? '要確認' : '提案'}
        </span>
        {finding.stageName && <span className="finding-stage">{finding.stageName}</span>}
      </span>
      <span className="finding-title">{finding.title}</span>
      <span className="finding-detail">{finding.detail}</span>
    </>
  );

  if (!jumpable) {
    return <li className="finding finding--static">{content}</li>;
  }

  return (
    <li className="finding">
      <button type="button" className="finding-button" onClick={() => onFocusCell(finding.cellId!)}>
        {content}
      </button>
    </li>
  );
}
