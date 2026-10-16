# AI Portal フィードバック受付：Cloudflare 初期設定ランブック

更新日：2026-10-16。対象：aiportal-app (Cloudflare Pages) / aiportal.blog。

この作業では **GitHubまたはCloudflareの秘密鍵をチャットやIssue本文、PRに貼らない**。キーデータの表示や送信をユーザーへ依頼しない。

## 現時点の監査結果

- GitHub main: 読者の動機・読後の変化に関するGA4計測の実装済み。
- 自由記述フォーム/API・D1 migration `migrations/0002_reader_comments.sql` をmainへマージ済み。
- 読者コメントは受信日時から180日で期限切れとなり、Production D1 IDを固定した毎日のGitHub Actions処理で削除する。Privacy Policyにも同じ保持期間・早期削除を記載済み。
- 2026-10-16のGitHub Actions `Prepare AI Portal Feedback Cloudflare Resources` staging試行（Run ID `38828127851`）は `Missing CLOUDFLARE_FEEDBACK_API_TOKEN GitHub Actions secret.` で停止。Cloudflare API呼び出しより前のエラーで、stageのCloudflare変更は行われていない。
- 初期状態では `AI_PORTAL_READER_COMMENTS_ENABLED=1` の存在を確認していないため **自由記述は受け付けない**。

## 1. Cloudflareの限定的なAPIトークン（所有者が操作）

Cloudflare Dashboard > Profile > API Tokens > Create Token。Custom token を作成し、対象を **該当する1つのCloudflareアカウント**に限定。必要なAccount Permissionsは、Cloudflare Pages Edit / D1 Edit / Turnstile Edit（サービスごとの読み取り/編集権限を含む）。不要な DNS・Billing・全アカウント管理権限を付けない。Cloudflare側の最新表記は必ず確認する。

Cloudflare docs:
- https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- https://developers.cloudflare.com/turnstile/get-started/widget-management/api/

## 2. GitHub Secretsへの登録（所有者が操作）

Repository `naoki20151214-ops/aiportal-app` → Settings → Secrets and variables → Actions → New repository secret。

Secret name: `CLOUDFLARE_FEEDBACK_API_TOKEN`
Secret value: **Cloudflareで生成した実際のAPI Token**（GitHub上のSecret入力欄にのみ貼る）。
トークン本文はチャットやIssue/コメントには絶対に貼らない。

## 3. Previewだけをステージングする（自動投稿・公開の有効化はしない）

GitHub Actions > `Prepare AI Portal Feedback Cloudflare Resources` > Run workflow
- Branch: main
- environment: preview
- operation: stage

または管理者の `#144` issue コメントとして **完全一致**の `/feedback-stage-preview` を投稿する。どちらも同じステージングスクリプトが実行される。繰り返し実行しても、`CREATE ... IF NOT EXISTS` の非破壊マイグレーションのみを適用する設計。ただし、事前設定と一致しないD1 bindingがあれば中止する。

ステージング対象は **元の `article_feedback` + 新設 `reader_comments` の両方**。Cloudflare D1、Turnstile、Pages binding、公開鍵・秘密鍵を設定し、3つの受付フラグを `0` のままにする。

`AI_PORTAL_FEEDBACK_ENABLED=0`
`NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED=0`
`AI_PORTAL_READER_COMMENTS_ENABLED=0`

ワークフローで `STAGED, NOT ACTIVE` のメッセージとschema検証結果を確認する。環境変数やsecretをログへ出さない。

## 4. Preview のエンドツーエンドテスト

次のガードを設定/確認する：Cloudflare WAF / Rate Limiting、最新デプロイへ公開鍵を反映させる再デプロイ、Cloudflare Turnstile のWidget hostname、正しいPages D1 binding。

- GET `/api/reader-comment` は初期は503。
- Previewのホストに適合したTurnstileが通り、Origin一致・公開済み記事slug・ランダムUUIDを持つPOSTで、D1へ保存されることを確認する。
- 不正Origin、未公開slug、過大入力、無効なTurnstile token、重複UUIDで不正変更ができないことを確認する。
- **実際にD1で該当の受付レコードが1件だけあることを確認するまで、送信成功と判定しない。**
- Previewホスト名がTurnstile設定の許可ドメインに含まれるか確認する。ランダムhash付きのPreview URLは許可されない場合があるため、実ドメイン・設定を照合すること。

自動化されたCloudflare challengeは本番用Turnstileで完了できない場合がある。Cloudflare公式のテストキーを使う場合は、既存の `Prepare AI Portal Feedback Cloudflare Resources` ワークフローで `environment=preview`, `operation=preview-test` を選び、対象Preview deploymentの完全なcommit SHAを指定する。専用処理はPreview D1の空状態とProductionのOFF/D1分離を先に確認し、テスト用の成功・失敗キーでSiteverify→API→D1を検証する。成功時の合成行だけをIDと本文の完全一致で削除し、最後にPreviewの実widgetとOFF設定を戻して503を確認する。Production設定は読み取りだけで変更しない。

Cloudflareの公式テストキーは本番用と異なる検証メタデータを返す（`action=test`、またはテストsecretの応答例では `hostname=example.com` かつactionなし）。その値を受け入れるサーバー分岐は、Preview環境フラグと完全一致する1つのPreview hostnameが両方指定されたときだけ有効にし、Productionや別ホストでは従来どおり実hostnameと `reader_comment` actionを要求する。テストキーでの成功は実訪問者が本番Turnstileを通過できる証明ではない。

## 5. Productionの段階的準備

Previewが通った場合に限り、Productionを `operation=stage` でセットアップ（ステージング時点でフラグは0）。本番D1はPreviewと別のDBを使い、間違ったDBとの紐付けがないことを検証する。料金・使用量・権限・ログ設定も確認する。

Cloudflare側の管理画面でWAFと運用者権限を確認。公開時だけ `AI_PORTAL_READER_COMMENTS_ENABLED=1` に変更し、環境変数を反映する本番デプロイを実施する。**元の評価フォームのフラグは、検証せずに1へ変更しない。** `GET /api/reader-comment` が200を返すこと、Turnstile通過、1件だけD1へ保存、GA4へ自由記述の文章が送られないことを確認して「本番受付中」と報告する。

## 6. 管理者が回答を見る（公開APIを作らない）

Cloudflare Dashboard → D1 → 対象のDB → Console。以下を運営者アカウントで実行する。

```sql
SELECT received_at, slug, prompt_code, note
FROM reader_comments
ORDER BY received_at DESC
LIMIT 25;
```

個人情報が含まれた投稿はそのままAIや外部分析へ送らない。必要に応じて早期削除する。受信後180日を超えたレコードは `.github/workflows/expire-reader-comments.yml` が毎日削除する。手動実行も同じ固定Production D1だけを対象とする。

## 絶対に避けること

- API token / Turnstile secret を原稿、コード、GitHub Issue、チャット本文へ書かない。
- 受付の本番フラグだけ先にONにしない。
- D1が存在するだけで読者へ送信成功を表示しない。
- 学習記事予約10本、公開承認台帳、mainの学習記事公開workflowを変更しない。
