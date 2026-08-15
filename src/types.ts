/** カスタマージャーニーマップのデータモデル */

/** 行のグルーピング（左端の帯とカラーで表現する） */
export type GroupKey = 'user' | 'triple' | 'execution' | 'result' | 'custom';

export interface GroupDef {
  key: GroupKey;
  label: string;
}

/** 行（ユーザーフロー / ペイド / KPI …） */
export interface RowDef {
  key: string;
  label: string;
  /** セルが空のときに表示するガイド文 */
  hint: string;
  group: GroupKey;
  /** ユーザーが追加した行かどうか（削除・リネーム可否の判定に使う） */
  custom?: boolean;
}

/** 列（認知 → 興味・関心 → 比較検討 …） */
export interface Stage {
  id: string;
  name: string;
  /** 列の補足（そのフェーズでのユーザー状態など） */
  summary: string;
}

/** カードの色味。セル内での分類に使う */
export type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple';

export interface Card {
  id: string;
  text: string;
  tone: Tone;
}

export interface Persona {
  name: string;
  profile: string;
  goal: string;
}

export interface Journey {
  id: string;
  title: string;
  /** ブランド／商材名など */
  subtitle: string;
  persona: Persona;
  stages: Stage[];
  rows: RowDef[];
  /** `${rowKey}::${stageId}` をキーにしたカードの配列 */
  cells: Record<string, Card[]>;
  createdAt: number;
  updatedAt: number;
}

export const cellKey = (rowKey: string, stageId: string) => `${rowKey}::${stageId}`;

export const GROUPS: GroupDef[] = [
  { key: 'user', label: 'ユーザー理解' },
  { key: 'triple', label: 'トリプルメディア' },
  { key: 'execution', label: '施策・表現' },
  { key: 'result', label: '効果測定' },
  { key: 'custom', label: 'カスタム' },
];

/** 仕様で求められている 8 行。新規マップの初期構成になる */
export const DEFAULT_ROWS: RowDef[] = [
  {
    key: 'userflow',
    label: 'ユーザーフロー',
    hint: 'このフェーズでユーザーが取る行動・動線',
    group: 'user',
  },
  {
    key: 'insight',
    label: 'ユーザーインサイト',
    hint: '思考・感情・不安・期待（本音）',
    group: 'user',
  },
  { key: 'paid', label: 'ペイド', hint: '広告出稿・運用型／予約型メディア', group: 'triple' },
  { key: 'owned', label: 'オウンド', hint: '自社サイト・アプリ・LINE・メルマガ', group: 'triple' },
  { key: 'earned', label: 'アーンド', hint: 'SNS・UGC・PR・クチコミ・レビュー', group: 'triple' },
  { key: 'media', label: 'メディア', hint: '具体的な配信面・媒体・枠', group: 'execution' },
  { key: 'creative', label: 'クリエイティブ', hint: '訴求軸・コピー・フォーマット', group: 'execution' },
  { key: 'kpi', label: 'KPI', hint: '指標と目標値（例: CTR 0.8% / CVR 3%）', group: 'result' },
];

/** 「行を追加」から 1 クリックで足せるプリセット */
export const ROW_PRESETS: Omit<RowDef, 'custom'>[] = [
  { key: 'emotion', label: '感情', hint: 'ポジ／ネガの揺れ、感情の起伏', group: 'user' },
  { key: 'touchpoint', label: 'タッチポイント', hint: '接触するチャネル・場所・デバイス', group: 'user' },
  { key: 'pain', label: '課題・ボトルネック', hint: '離脱要因、つまずくポイント', group: 'user' },
  { key: 'opportunity', label: '打ち手アイデア', hint: '課題に対する改善・強化案', group: 'execution' },
  { key: 'owner', label: '担当・体制', hint: '実行主体、パートナー、必要リソース', group: 'execution' },
  { key: 'kgi', label: 'KGI / 目標', hint: 'フェーズのゴール、事業指標との接続', group: 'result' },
];

export const TONES: { key: Tone; label: string }[] = [
  { key: 'neutral', label: 'グレー' },
  { key: 'blue', label: 'ブルー' },
  { key: 'green', label: 'グリーン' },
  { key: 'amber', label: 'イエロー' },
  { key: 'red', label: 'レッド' },
  { key: 'purple', label: 'パープル' },
];
