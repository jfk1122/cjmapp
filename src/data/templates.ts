import {
  DEFAULT_ROWS,
  SCHEMA_VERSION,
  cellKey,
  type Card,
  type Journey,
  type Stage,
  type Tone,
} from '../types';
import { uid } from '../lib/id';

interface TemplateSpec {
  id: string;
  name: string;
  description: string;
  title: string;
  subtitle: string;
  persona: Journey['persona'];
  stages: { name: string; summary: string }[];
  /** 行キー → 列ごとのカード（文字列 or [文字列, トーン]） */
  cells: Record<string, (string | [string, Tone])[][]>;
}

const c = (v: string | [string, Tone]): Card =>
  Array.isArray(v)
    ? { id: uid('c'), text: v[0], tone: v[1] }
    : { id: uid('c'), text: v, tone: 'neutral' };

/** テンプレート定義から Journey を組み立てる */
export function buildJourney(spec: TemplateSpec): Journey {
  const stages: Stage[] = spec.stages.map((s) => ({ id: uid('s'), name: s.name, summary: s.summary }));
  const cells: Journey['cells'] = {};

  for (const row of DEFAULT_ROWS) {
    const columns = spec.cells[row.key] ?? [];
    stages.forEach((stage, i) => {
      const items = columns[i] ?? [];
      if (items.length > 0) cells[cellKey(row.key, stage.id)] = items.map(c);
    });
  }

  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid('m'),
    title: spec.title,
    subtitle: spec.subtitle,
    persona: spec.persona,
    stages,
    rows: DEFAULT_ROWS.map((r) => ({ ...r })),
    cells,
    groupLabels: {},
    createdAt: now,
    updatedAt: now,
  };
}

const BLANK: TemplateSpec = {
  id: 'blank',
  name: '空のマップ',
  description: '5 フェーズ × 8 行の枠だけを用意した状態から始めます。',
  title: '無題のカスタマージャーニーマップ',
  subtitle: '',
  persona: { name: '', profile: '', goal: '' },
  stages: [
    { name: '認知', summary: '' },
    { name: '興味・関心', summary: '' },
    { name: '比較・検討', summary: '' },
    { name: '購入・申込', summary: '' },
    { name: '継続・推奨', summary: '' },
  ],
  cells: {},
};

const EC: TemplateSpec = {
  id: 'ec',
  name: 'EC / D2C の購買ジャーニー',
  description: 'スキンケア D2C ブランドの新規獲得を想定したサンプル。',
  title: 'D2Cスキンケア 新規獲得ジャーニー',
  subtitle: 'Brand A / 定期便オファー',
  persona: {
    name: '佐藤 みなみ（32歳・会社員）',
    profile: '都内在住、共働き。Instagram とYouTube が主な情報源。肌荒れが気になり始めているが、高価な化粧品には慎重。',
    goal: '肌悩みを解決できて、続けやすい価格のスキンケアを見つけたい。',
  },
  stages: [
    { name: '認知', summary: '悩みは自覚しているがブランドを知らない' },
    { name: '興味・関心', summary: 'ブランドを知り、成分や口コミを調べ始める' },
    { name: '比較・検討', summary: '他ブランドと価格・効果を比較している' },
    { name: '購入・申込', summary: '初回オファーで定期便を申し込む' },
    { name: '継続・推奨', summary: '使用実感を得て継続、SNS で発信する' },
  ],
  cells: {
    userflow: [
      ['SNSのフィードで動画広告に接触', '友人の投稿でブランド名を目にする'],
      ['プロフィールリンクからLPへ', '成分・使用感の記事を読む'],
      ['「ブランド名 口コミ」で指名検索', '比較サイト・レビューを確認'],
      ['初回限定オファーからカートへ', '決済・定期便の条件を確認'],
      ['商品到着、2週間使用', 'レビュー投稿・友人に紹介'],
    ],
    insight: [
      [['なんとなく肌が不調。何を使えばいいか分からない', 'amber']],
      ['自分の肌悩みに合うのか知りたい', ['広告の言葉はどこまで本当？', 'red']],
      [['定期縛りがあると怖い', 'red'], '同価格帯なら実績のある方が安心'],
      ['初回価格なら試してみてもいい', ['解約が面倒ではないか不安', 'red']],
      [['肌の調子がいい。人に教えたい', 'green']],
    ],
    paid: [
      ['Instagram / TikTok 動画広告', 'YouTube インストリーム'],
      ['Meta リターゲティング', 'Discovery広告'],
      ['指名キーワード検索広告', 'アフィリエイト（比較メディア）'],
      ['カート離脱リタゲ', 'LINE広告（友だち追加）'],
      ['—'],
    ],
    owned: [
      ['ブランド公式アカウント'],
      ['ブランドサイト / 成分解説コンテンツ'],
      ['よくある質問・解約条件ページ', '比較表コンテンツ'],
      ['定期便LP / カート', 'LINE公式（初回クーポン）'],
      ['同梱ツール', 'マイページ / ステップメール'],
    ],
    earned: [
      ['インフルエンサーの使用投稿'],
      ['UGC（#ブランド名）', 'YouTube レビュー動画'],
      ['@cosme・口コミサイト', 'X（旧Twitter）の評判'],
      ['購入報告のUGC'],
      ['レビュー投稿', '紹介キャンペーンでの拡散'],
    ],
    media: [
      ['Instagram Reels / TikTok'],
      ['Meta / Google Discovery'],
      ['Google 検索 / 比較メディア'],
      ['自社カート / LINE'],
      ['同梱物 / メール / LINE'],
    ],
    creative: [
      ['15秒の悩み共感型フック', 'ビフォーアフター表現（薬機法チェック済）'],
      ['成分の科学的根拠訴求', '開発者インタビュー'],
      ['他社比較表', '解約のしやすさを明示'],
      ['初回◯％OFFの限定オファー', '返金保証の明示'],
      ['使い方ガイド', '紹介コード付きカード'],
    ],
    kpi: [
      [['リーチ 300万 / 動画再生率 25%', 'blue']],
      [['LP遷移率 2.0% / 滞在60秒以上', 'blue']],
      [['指名検索数 前月比 120%', 'blue']],
      [['CVR 3.0% / CPA 4,000円', 'green']],
      [['2回目継続率 70% / NPS +30', 'green']],
    ],
  },
};

const SAAS: TemplateSpec = {
  id: 'saas',
  name: 'BtoB SaaS のリード獲得',
  description: '検討期間が長い法人向けサービスのサンプル。',
  title: 'BtoB SaaS リード獲得ジャーニー',
  subtitle: '中堅企業向け業務効率化ツール',
  persona: {
    name: '田中 健一（41歳・情報システム部 課長）',
    profile: '従業員300名規模の製造業。属人化した業務の改善を役員から指示されている。導入検討には稟議が必要。',
    goal: '社内の合意を取れる、導入リスクの低いツールを選定したい。',
  },
  stages: [
    { name: '課題認識', summary: '課題はあるが解決手段が分からない' },
    { name: '情報収集', summary: 'カテゴリと相場を調べている' },
    { name: '比較・評価', summary: '3社程度に絞り、機能と価格を比較' },
    { name: '社内稟議', summary: '上長・役員向けに説明資料を作る' },
    { name: '導入・活用', summary: '導入後の定着とアップセル' },
  ],
  cells: {
    userflow: [
      ['役員から業務改善を指示される', '課題ワードで検索'],
      ['比較記事・ホワイトペーパーを読む', '資料をダウンロード'],
      ['複数社に問い合わせ', 'デモ・トライアルを実施'],
      ['稟議書を作成', '社内説明会で説明'],
      ['キックオフ・初期設定', '利用部門への展開'],
    ],
    insight: [
      [['何から手を付ければいいか分からない', 'amber']],
      ['自社と同規模の導入事例が知りたい'],
      [['乗り換えコストと失敗リスクが怖い', 'red'], 'セキュリティ要件を満たすか'],
      [['費用対効果を数字で示さないと通らない', 'red']],
      [['現場が使ってくれるか不安', 'amber']],
    ],
    paid: [
      ['課題キーワードの検索広告'],
      ['比較メディアへの純広告', 'Meta / X のリード獲得広告'],
      ['指名検索広告', 'リターゲティング（事例訴求）'],
      ['—'],
      ['—'],
    ],
    owned: [
      ['SEO記事（課題解決系）'],
      ['ホワイトペーパー / 導入事例集', 'ウェビナー'],
      ['料金ページ / 機能比較表', 'セキュリティチェックシート'],
      ['ROI試算シート', '稟議用テンプレート資料'],
      ['ヘルプセンター / 活用セミナー'],
    ],
    earned: [
      ['業界メディアの記事'],
      ['SNSでの言及・登壇レポート'],
      ['レビューサイト（ITreview等）'],
      ['既存顧客からのリファラル'],
      ['ユーザーコミュニティ / 事例掲載'],
    ],
    media: [
      ['Google 検索'],
      ['比較メディア / メールマガジン'],
      ['自社サイト / レビューサイト'],
      ['営業からの資料送付'],
      ['カスタマーサクセス / コミュニティ'],
    ],
    creative: [
      ['課題を言語化する記事タイトル'],
      ['同業・同規模の事例訴求', '無料ダウンロード導線'],
      ['他社比較表', '導入までのステップ提示'],
      ['ROIを数値で示す資料', '導入リスク低減（伴走支援）の明示'],
      ['活用Tips配信', 'アップセル提案'],
    ],
    kpi: [
      [['セッション数 / 自然検索流入', 'blue']],
      [['MQL 200件 / DL率 15%', 'blue']],
      [['商談化率 30%', 'green']],
      [['受注率 25% / 平均検討期間', 'green']],
      [['解約率 3%以下 / 利用率 80%', 'green']],
    ],
  },
};

export const TEMPLATES: TemplateSpec[] = [BLANK, EC, SAAS];

export const createBlankJourney = () => buildJourney(BLANK);
