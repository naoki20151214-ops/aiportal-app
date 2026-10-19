# AI Portal｜追加費用ゼロで始める Workers AI ニュース下書き実験

更新日：2026-10-19

## 守る約束

- **追加費用0円を最優先。オーナーから事前に明示的に許可されない限り有料API・Paidプラン・有料AI Gatewayクレジットを使わない。**
- RSS取得、記事候補選別、既存即時公開フローはそのまま。**モデル試験を定時実行に組み込まず、自動公開・自動承認を有効化しない。**
- モデル出力を「正しい記事」と判定することは禁止。主張は事前の人間確認済みパケットに限定し、生成した原稿も独立した校閲が必要。
- モデルの実利用と、無料の模擬試験を厳密に区別して報告する。

## Cloudflare公式無料枠の確認

- Workers AIのWorkers **Freeプランには合計10,000 Neurons/日**の無料枠があり、超過するとリクエストが失敗する。Freeでは自動的に従量課金へ移行しない。**Paidプランの場合、同じ無料枠超過後の利用は有料になり得るため、自動実行を禁止する。**
- 基準はCloudflare公式ドキュメントの [Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)（2026-10-01）と [Freeで使用できる対応モデルについての2026-07-28告知](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/)。利用モデルは`@cf/google/gemma-4-26b-a4b-it`に固定する。
- 公式: [Gemma 4 26B A4B モデル情報](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/)；[REST API](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)。
- **無料枠があることと、AI PortalのCloudflareアカウントがFreeプランであることは別**。後者はまだ確認できていない。実APIトークン・アカウントIDもこの開発作業では取得・使用していない。

## 今回の無料実装

- `scripts/news-free-workers-ai-core.mjs`: 登録済みモデルへの制限付きJSON形式の下書きリクエストを組み立てる。独立して確認済みのFree契約がない限り、本番通信を拒否する設計。長すぎるパケット・巨大なレスポンス・403/429・タイムアウト・指示混入・未知のClaim ID・無断の公開フィールドを不合格とする。
- `scripts/news-free-workers-ai-preview.mjs`: **ネット接続・APIキー・課金を一切必要としない**入力審査とリクエストプレビュー。実行オプション（`--execute`）はない。
- `tests/news-free-workers-ai.test.ts`: 無料プロトタイプの下書き、変造原稿、不正な引用、外部リンク、認証不備、Paidアカウント拒否、429などを**モック通信で再現**する。偽のテスト用トークンであり、外部リクエストは発生しない。
- 既存の `scripts/generate-private-news-draft.mjs` はOpenAI従量課金APIへの**手動実行専用**コードとして残すが、これを自動実行に利用しない。いかなる公開記事も生成・変更しない。

### 非公開レビュー済みパケットでのネット接続なしプレビュー

```bash
node scripts/news-free-workers-ai-preview.mjs \
  --candidate=<24文字の候補ID> \
  --in=artifacts/news-draft-packets.json
```

この`news-draft-packets.json`は、既存の**人間による原文照合済み**入力から作る。RSS見出しだけを根拠として「human-reviewed」を偽造しない。CLIの返り値は`apiCalls: 0`、`externalChargesIncurredByPreview: 0`、`publicationEligible: false`である。

## さらに無料で実AIモデルを試すための前提

1. Cloudflareの現在の契約が **Workers Free** であることを公式ダッシュボードで確認（当該アカウントに複数用途のWorkers AIがあるなら消費Neuronsも確認）。
2. 認可された最小権限のWorkers AI実行用トークンを秘密管理へ設定。公開のGitHubファイル、ログ、チャットへトークンを貼らない。
3. 最初は公開済み一次資料から作成した**本物の人間確認済み主張パケット1件**のみで少量実行。Neurons利用量がFree内かをダッシュボードで再確認。回数・入力長・出力長・日単位消費を制限。
4. 無料枠内で日本語の下書きが許容品質か、過去の記事と比較して試験。外部APIが使えない、Free契約が検証できない場合は**無理に呼び出さず保留**。
5. 独立の事実照合と元記事の意味上の重複検査は未実装なので、最終目標の自動公開へ進む前に新しい校閲用の品質ゲートと検証データを設計する。

## 現在の事実として言えること

無料モデル`gemma-4-26b-a4b-it`の**接続準備と外部通信なしの実装試験**までは可能。Cloudflare APIを実際に呼んだ成功例、Neurons消費量、AIの実原稿品質、所有者アカウントのFree契約を「確認済み」とは表現しない。
