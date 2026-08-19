import { cellKey, type GroupKey, type Journey, type RowDef, type Tone } from '../types';

/**
 * ジャーニーの構造を診断する。
 *
 * 各行が「何を意味するか」（接点なのか、指標なのか）を知っているからこそ
 * できる指摘に絞る。文章の良し悪しは判定しない。
 */

export type Severity = 'warn' | 'info';

export interface Finding {
  /** React の key と、指摘の重複判定に使う */
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /** 指摘の対象フェーズ。マップ全体の指摘では未設定 */
  stageId?: string;
  stageName?: string;
  /** クリックで飛ぶ先のセル */
  cellId?: string;
}

export interface Diagnosis {
  /** 0〜100。満たしたチェック数の割合 */
  score: number;
  passed: number;
  total: number;
  findings: Finding[];
}

/** 懸念・課題として色づけされたカードとみなすトーン */
const CONCERN_TONES = new Set<Tone>(['red', 'amber']);

const rowsOfGroup = (journey: Journey, group: GroupKey): RowDef[] =>
  journey.rows.filter((r) => r.group === group);

const cardsIn = (journey: Journey, row: RowDef, stageId: string) =>
  journey.cells[cellKey(row.key, stageId)] ?? [];

const hasAnyCard = (journey: Journey, rows: RowDef[], stageId: string) =>
  rows.some((r) => cardsIn(journey, r, stageId).length > 0);

/** グループ単位のチェック内容。行が 1 つも無いグループは対象外にする */
const GROUP_CHECKS: { group: GroupKey; title: string; detail: string }[] = [
  {
    group: 'user',
    title: 'ユーザーの行動・心理が書かれていません',
    detail: 'このフェーズでユーザーが何をして何を感じるかが空欄です。ここが無いと施策の根拠が立ちません。',
  },
  {
    group: 'triple',
    title: 'ユーザーとの接点が設計されていません',
    detail: 'ペイド・オウンド・アーンドのいずれにもカードがありません。このフェーズはユーザーに何も届いていない状態です。',
  },
  {
    group: 'execution',
    title: '具体的な施策が決まっていません',
    detail: 'メディアやクリエイティブが空欄です。接点があっても、何を出すかが決まっていません。',
  },
  {
    group: 'result',
    title: '効果を測る指標がありません',
    detail: 'KPI が空欄です。このフェーズがうまくいったかどうかを判断できません。',
  },
];

export function diagnose(journey: Journey): Diagnosis {
  const findings: Finding[] = [];
  let passed = 0;
  let total = 0;

  /** チェックを 1 件記録する。落ちたときだけ finding を積む */
  const check = (ok: boolean, finding: () => Finding | null) => {
    total++;
    if (ok) {
      passed++;
      return;
    }
    const f = finding();
    if (f) findings.push(f);
  };

  // --- マップ全体 ---
  check(journey.persona.name.trim() !== '', () => ({
    id: 'persona',
    severity: 'info',
    title: 'ペルソナが未設定です',
    detail: '誰のジャーニーなのかが決まっていないと、インサイトの妥当性を判断できません。',
  }));

  // --- フェーズごと ---
  for (const stage of journey.stages) {
    const stageName = stage.name.trim() || '無題のフェーズ';
    const filled = GROUP_CHECKS.map(({ group }) => {
      const rows = rowsOfGroup(journey, group);
      return { group, rows, ok: rows.length === 0 || hasAnyCard(journey, rows, stage.id) };
    });

    // すべて空のフェーズは、4 件に分けず 1 件にまとめて伝える
    const allEmpty = filled.every((f) => f.rows.length === 0 || !f.ok);
    const someRows = filled.some((f) => f.rows.length > 0);

    if (allEmpty && someRows) {
      findings.push({
        id: `empty:${stage.id}`,
        severity: 'warn',
        title: 'このフェーズは何も書かれていません',
        detail: 'ジャーニーの途中が空白のままだと、前後のつながりを検討できません。',
        stageId: stage.id,
        stageName,
        cellId: journey.rows[0] ? cellKey(journey.rows[0].key, stage.id) : undefined,
      });
    }

    for (const { group, rows, ok } of filled) {
      if (rows.length === 0) continue; // その行自体が無いなら問わない
      const spec = GROUP_CHECKS.find((c) => c.group === group)!;
      check(ok, () =>
        allEmpty
          ? null // まとめて指摘済み
          : {
              id: `${group}:${stage.id}`,
              severity: 'warn',
              title: spec.title,
              detail: spec.detail,
              stageId: stage.id,
              stageName,
              cellId: cellKey(rows[0].key, stage.id),
            },
      );
    }

    // 接点はあるのに施策が無い、という噛み合わせの指摘
    const triple = rowsOfGroup(journey, 'triple');
    const execution = rowsOfGroup(journey, 'execution');
    if (triple.length > 0 && execution.length > 0 && hasAnyCard(journey, triple, stage.id)) {
      check(hasAnyCard(journey, execution, stage.id), () => ({
        id: `triple-without-execution:${stage.id}`,
        severity: 'info',
        title: '接点はありますが、出すものが決まっていません',
        detail: 'メディアは押さえられていますが、クリエイティブや配信面が空欄です。',
        stageId: stage.id,
        stageName,
        cellId: cellKey(execution[0].key, stage.id),
      }));
    }

    // 懸念として色づけされたカードに、対応する打ち手があるか
    const userRows = rowsOfGroup(journey, 'user');
    const concerns = userRows.flatMap((r) =>
      cardsIn(journey, r, stage.id).filter((c) => CONCERN_TONES.has(c.tone)),
    );
    if (concerns.length > 0 && execution.length > 0) {
      check(hasAnyCard(journey, execution, stage.id), () => ({
        id: `concern-without-action:${stage.id}`,
        severity: 'warn',
        title: '挙がっている懸念に打ち手がありません',
        detail: `「${concerns[0].text}」など ${concerns.length} 件が課題として色づけされていますが、対応する施策が空欄です。`,
        stageId: stage.id,
        stageName,
        cellId: cellKey(execution[0].key, stage.id),
      }));
    }
  }

  return {
    score: total === 0 ? 100 : Math.round((passed / total) * 100),
    passed,
    total,
    findings,
  };
}
