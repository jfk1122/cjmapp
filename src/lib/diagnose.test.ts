import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnose';
import * as A from './actions';
import { buildJourney, TEMPLATES } from '../data/templates';
import { cellKey, type Journey, type Tone } from '../types';

const blank = () => buildJourney(TEMPLATES[0]);
const ec = () => buildJourney(TEMPLATES.find((t) => t.id === 'ec')!);

/** 指定の行 × フェーズにカードを 1 枚置く */
function put(j: Journey, rowKey: string, stageIndex: number, text: string, tone: Tone = 'neutral'): Journey {
  const id = cellKey(rowKey, j.stages[stageIndex].id);
  const { journey, cardId } = A.addCard(j, id);
  return A.updateCard(journey, id, cardId, { text, tone });
}

const ids = (j: Journey) => diagnose(j).findings.map((f) => f.id);

describe('diagnose', () => {
  it('空のマップは全フェーズを「何も書かれていない」1 件ずつで指摘する', () => {
    const d = diagnose(blank());

    // 5 フェーズぶん + ペルソナ未設定
    expect(d.findings.filter((f) => f.id.startsWith('empty:'))).toHaveLength(5);
    expect(d.findings.some((f) => f.id === 'persona')).toBe(true);
    // 空フェーズはグループ別の 4 件に分解しない
    expect(d.findings.filter((f) => f.id.startsWith('user:'))).toHaveLength(0);
    expect(d.score).toBe(0);
  });

  it('埋まっているテンプレートは高いスコアになる', () => {
    const d = diagnose(ec());

    expect(d.score).toBeGreaterThanOrEqual(90);
    expect(d.findings.some((f) => f.id === 'persona')).toBe(false);
  });

  it('接点だけが空のフェーズを名指しで指摘する', () => {
    let j = blank();
    j = put(j, 'userflow', 0, '広告に接触');
    j = put(j, 'media', 0, 'Instagram');
    j = put(j, 'kpi', 0, 'リーチ 100万');
    // triple（ペイド・オウンド・アーンド）だけ空

    const d = diagnose(j);
    const finding = d.findings.find((f) => f.id === `triple:${j.stages[0].id}`);

    expect(finding).toBeDefined();
    expect(finding!.title).toContain('接点');
    expect(finding!.stageName).toBe('認知');
    // クリックで飛ぶ先は、そのグループの先頭行のセル
    expect(finding!.cellId).toBe(cellKey('paid', j.stages[0].id));
  });

  it('KPI だけが空のフェーズを指摘する', () => {
    let j = blank();
    j = put(j, 'userflow', 1, '記事を読む');
    j = put(j, 'paid', 1, 'リターゲティング');
    j = put(j, 'creative', 1, '成分訴求');

    expect(ids(j)).toContain(`result:${j.stages[1].id}`);
    expect(ids(j)).not.toContain(`triple:${j.stages[1].id}`);
  });

  it('懸念として色づけされたカードに打ち手が無ければ指摘する', () => {
    let j = blank();
    j = put(j, 'userflow', 0, '比較サイトを見る');
    j = put(j, 'insight', 0, '定期縛りが怖い', 'red');
    j = put(j, 'paid', 0, '検索広告');
    j = put(j, 'kpi', 0, 'CVR 3%');
    // execution（メディア・クリエイティブ）が空

    const d = diagnose(j);
    const finding = d.findings.find((f) => f.id === `concern-without-action:${j.stages[0].id}`);

    expect(finding).toBeDefined();
    expect(finding!.detail).toContain('定期縛りが怖い');
    expect(finding!.severity).toBe('warn');
  });

  it('懸念に打ち手があれば指摘しない', () => {
    let j = blank();
    j = put(j, 'insight', 0, '解約が面倒そう', 'red');
    j = put(j, 'creative', 0, '解約のしやすさを明示');

    expect(ids(j)).not.toContain(`concern-without-action:${j.stages[0].id}`);
  });

  it('接点があるのに施策が無いフェーズを指摘する', () => {
    let j = blank();
    j = put(j, 'owned', 2, 'ブランドサイト');

    const d = diagnose(j);
    const finding = d.findings.find((f) => f.id === `triple-without-execution:${j.stages[2].id}`);

    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('info');
  });

  it('行を削除したグループは問わない', () => {
    let j = blank();
    j = A.removeRow(j, 'kpi'); // result グループの行が無くなる

    const d = diagnose(j);
    expect(d.findings.some((f) => f.id.startsWith('result:'))).toBe(false);
  });

  it('ペルソナを入れるとその指摘が消える', () => {
    const j = blank();
    const withPersona = { ...j, persona: { ...j.persona, name: '佐藤 みなみ' } };

    expect(ids(j)).toContain('persona');
    expect(ids(withPersona)).not.toContain('persona');
  });

  it('スコアは満たしたチェックの割合で、0〜100 に収まる', () => {
    for (const j of [blank(), ec()]) {
      const d = diagnose(j);
      expect(d.score).toBe(Math.round((d.passed / d.total) * 100));
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(d.passed).toBeLessThanOrEqual(d.total);
    }
  });

  it('埋めるほどスコアが上がる', () => {
    let j = blank();
    const before = diagnose(j).score;
    j = put(j, 'userflow', 0, '広告に接触');
    j = put(j, 'paid', 0, '動画広告');
    j = put(j, 'media', 0, 'Instagram');
    j = put(j, 'kpi', 0, 'リーチ 100万');

    expect(diagnose(j).score).toBeGreaterThan(before);
  });
});
