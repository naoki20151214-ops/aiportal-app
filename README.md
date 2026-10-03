# AI Portal

AIについて体系的に学べる情報サイト。Next.js App Router / React / TypeScript / Tailwind CSSを使用しています。

## 記事を1本追加する

1. `content/article-template.md`をコピーし、`content/articles/ai-basics.md`などの名前で保存します。
2. 先頭の`---`で囲んだfrontmatterを記入します。
3. その下にMarkdownで本文を書きます。見出し、箇条書き、リンク、画像、表、コードブロックを利用できます。
4. ローカルで表示を確認し、buildを実行します。本番サイトへの反映には再ビルド・デプロイが必要です。

```markdown
---
title: "AIとは？ 初心者向けの基礎知識"
slug: "ai-basics"
description: "AIの基本的な考え方と学習のポイントを紹介します。"
category: "AI入門"
publishedAt: "2026-10-02"
updatedAt: "2026-10-02"
author: "AI Portal編集部"
thumbnail: "/images/article-placeholder.svg"
tags: ["AI", "入門"]
---

導入文を書きます。

## AIの基本

本文を書きます。
```

- 9項目はすべて必須です。日付は引用符で囲んだ実在する`YYYY-MM-DD`形式、更新日は公開日以降にします。
- `slug`は重複しない半角英小文字・数字・ハイフン。URLは`/articles/ai-basics`になります。公開後は変更しない運用を推奨します。
- `thumbnail`は`public/`内の画像パス（`public/images/ai-basics.jpg` → `/images/ai-basics.jpg`）またはHTTP(S)の画像URLです。画像未用意の場合はテンプレートの`/images/article-placeholder.svg`をそのまま使えます。読み込みに失敗した一覧画像にもこの代替画像を表示します。
- `tags`は文字列配列。タグ不要の場合は`[]`を指定できます。
- 新しい`category`は自動でフィルターに追加されます。「最新」は全記事を表示する特別なタブです。
- `content/articles/`直下の`.md`はすべて公開対象です。下書きはこのフォルダの外で管理してください。MDXや本文内のHTML/JavaScriptには対応していません。
- 一覧は公開日の新しい順。同日の記事はslug順。最初に20件を表示し、「もっと見る」で追加表示します。
- 入力漏れ、日付の誤り、slugの重複はファイル名付きのエラーになり、誤った記事の公開を防ぎます。

既存8件はサンプル記事として移行しました。公開日・更新日は旧画面の日付に合わせた仮の日付（2026-04-14）です。本文は短い仮の文章で、見出し・紹介文の内容は最新情報として検証していません。

## ローカル開発

```bash
npm ci
npm run dev -- --hostname 127.0.0.1
```

`http://127.0.0.1:3000`を開きます。記事ファイルを編集・追加した場合はページを再読み込みしてください。

```bash
npm test
npm run build
npm start -- --hostname 127.0.0.1
```

`npm test`は記事の入力検証と自動読み込みを確認します。`npm run build`では全記事詳細、トップ、サイトマップ、robots.txtを静的生成します。

## SEOと公開URL

各記事のfrontmatterからtitle、meta description、canonical、OGP、著者・タグを生成します。HTML言語は`ja`、サイトマップには全記事と更新日が自動で入ります。

**本番の`SITE_URL`は`https://aiportal.blog`です。** デプロイ環境にも同じ値を設定してからビルドしてください。本番ビルドでは未設定の場合も`https://aiportal.blog`を使います。ローカル開発では未設定の場合に`http://127.0.0.1:3000`を使います。`.env.example`を参考に`.env.local`へ設定できます。秘密情報を含む`.env.local`はGitへ含めません。

```dotenv
SITE_URL=https://aiportal.blog
```

確認先は`/sitemap.xml`、`/robots.txt`、各記事のHTML内のmetaタグです。

## 構成

| 場所 | 役割 |
| --- | --- |
| `content/articles/*.md` | 記事のメタ情報とMarkdown本文 |
| `content/article-template.md` | 記事追加用テンプレート（一覧には出ません） |
| `src/lib/article-content.ts` | frontmatterの検証、読み込み、並び替え |
| `src/lib/articles.ts` | サーバー側の一覧・詳細データ取得 |
| `src/components/article-portal.tsx` | 既存デザインの一覧、カテゴリー切り替え |
| `src/app/articles/[slug]/page.tsx` | 記事詳細と記事ごとのSEO |
| `src/app/sitemap.ts`, `src/app/robots.ts` | クローラー向けファイル |
| `prisma/`, `src/generated/prisma/`, `dev.db` | 将来用に保持。今回の画面・記事管理では未使用 |

ランキング・おすすめツール・フッターの仮リンクは既存デザインを維持して残しています。記事一覧の見出しと画像には詳細ページへのリンクを設定しています。

## 広告・アフィリエイトの基盤

初期状態はOFFです。実際の広告タグ、Publisher ID、案件URLは登録していません。ONでも設定・表示内容が揃わなければ、枠・余白・「広告」ラベル・外部スクリプトは出ません。トップの従来の`ADVERTISEMENT`ダミー枠も非表示にしました。

設定は`src/config/monetization.ts`、共通コンポーネントは`src/components/monetization/`です。ディスプレイ広告の`AdSlot`と、案件紹介の`AffiliateSlot`／`AffiliateCard`は独立しています。

### 表示位置と記事の長さ

記事本文を一度だけMarkdownとして解析し、最上位の見出し（`##`）の境界で広告枠を挿入します。本文を文字列で分割しないため、コード・表・リスト・引用の途中や参照リンクの定義を壊しません。タイトル直下、導入文の前、追従・オーバーレイ広告はありません。

| 読者が読む本文の文字数 | 配置 |
| --- | --- |
| 800文字未満 | 記事広告なし（アフィリエイトもなし） |
| 800〜1399文字 | `article-end`のみ |
| 1400〜2799文字 | 導入文の後の`article-after-intro`＋記事末 |
| 2800文字以上 | 上記＋節の境界の`article-middle` |

空白やコードブロック・インラインコードは文字数に含めません。導入文後の枠は80文字以上の導入文と、その後に700文字以上の本文がある場合だけです。中盤は前後700文字以上の間隔を確保できる見出しがなければ省略します。数値は`articleRules`で変更できます。記事末ではテーマに合うアフィリエイト案件を優先し、ディスプレイ広告と重ねて表示しません。関連記事は記事末枠の後に最大3件表示します。

記事frontmatterの任意項目として`adPolicy: "reduced"`（記事末のみ）または`adPolicy: "off"`（その記事の広告・アフィリエイトを非表示）を指定できます。省略時は`auto`です。既存の必須9項目と記事本文は変更不要です。

`sidebar`はトップの既存サイドバーに配置します。未設定時は枠を作りません。記事詳細に新しいサイドバーは追加していません。

### ON/OFF

`.env.local`またはデプロイ環境に設定します。

```dotenv
ADS_ENABLED=false
AFFILIATES_ENABLED=false
```

`ADS_ENABLED=true`が全体スイッチです。アフィリエイトにはさらに`AFFILIATES_ENABLED=true`が必要です。各広告・案件の`enabled`でも個別に停止できます。環境変数・設定・記事メタ情報を変更したら、本番では再ビルド・再デプロイしてください。静的生成のため、環境変数を変えるだけでは配信済みHTMLは切り替わりません。

### ディスプレイ広告・AdSenseを追加する場合

1. `displayAds`に位置ごとの`DisplayAdUnit`（ID、enabled、type、provider、width、height）を登録します。`type`は`banner`／`rectangle`、`provider`は`custom`／`adsense`を想定しています。
2. `ad-providers.tsx`の`displayAdRenderers`へ実際のプロバイダー用レンダラーを実装します。AdSenseでは審査済みのPublisher ID・広告ユニットIDを使い、スクリプトをページで一度だけ遅延読み込みし、ユニットを一度だけ初期化する実装が必要です。今回はそのコードを含めていません。
3. `ADS_ENABLED=true`でビルドし、プレビューで広告の寸法、PR表記、スマートフォン表示、読み込み性能を確認してから公開します。

設定済みの広告にはサーバー生成HTMLで幅上限と固定の高さを確保します。プロバイダーは小さい画面でもその領域内に収め、ロード後に領域を拡大・縮小しない実装にしてください。未設定・未実装のプロバイダーには高さを確保しません。実広告導入後のCLSや速度は、実タグを使った計測が必要です。

### A8.net案件を追加する場合

`affiliateCampaigns`へ1案件1設定で、`id`、`enabled`、`provider: "a8"`、紹介文（`title`／`description`）、管理画面で発行されたHTTPSの`href`、CTA文、`positions`（`article-end`／`sidebar`）、対象`categories`／`tags`、必要なら`priority`を追加します。画像広告タグや計測ピクセルをMarkdownへ貼り付ける方式にはしません。現在のカードはテキストリンク対応です。バナーや追加計測が必要なら、公式の素材・仕様に基づく専用レンダラーを別途追加します。

カテゴリー・タグの両方を設定すると両条件に合う記事だけが対象になり、それぞれの配列内はどれか1つの一致で対象です。対象指定がない案件は自動配信しません。記事ごとの明示指定が必要ならfrontmatterに`affiliateCampaign: "登録した案件ID"`を追加します。この場合はカテゴリー・タグ条件よりそのIDを優先し、存在しないIDや停止中の案件は出しません。複数一致時は優先度順で1件だけ表示します。

リンクには`sponsored nofollow noopener noreferrer`、カードには`PR・アフィリエイト`と報酬に関する説明が自動で付きます。設定・案件の確認は運営者が行い、読者に有用なテーマのものだけを登録してください。

### 広告掲載ポリシー

`CommercialDisclosure`を共通化しました。表示する広告・案件だけにPR表記が付きます。広告掲載ポリシーのページを用意したら、`disclosure.policyUrl`にそのサイト内パスを設定すると各枠からリンクできます。未完成のポリシーページや仮リンクは作成していません。

### 開発用依存の更新メモ

2026-10-03確認：`braces`の[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)がESLintの開発用依存経路に波及し、`npm audit`でHigh 5件を報告します。本番依存の監査は0件で、修正版は未公開です。修正版公開後に互換性のあるpatch・minor更新を確認し、audit・build・test・lintを再実行してください。`--force`やESLint設定の14系への変更は行いません。
