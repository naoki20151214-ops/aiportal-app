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
