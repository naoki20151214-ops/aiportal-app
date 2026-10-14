# AI Portal — 2026-10-14の予約公開方針（最優先）

本人の「合格」や証拠付き編集監査の合格は**公開の承認**であり、**即時公開を意味しない**。審査合格後、`ready`と承認台帳の`approved-for-publication`をmainへ記録するとき、新たに`publishOn: YYYY-MM-DD`（日本時間）を必ず登録する。毎日20:00 JSTの`publish-approved.yml`が、予定日に到達し、前提・リンク・改ざん検査・安全条件を満たす記事から最大1本だけ公開する。同日の再実行や手動再実行でも2本目を公開しない。日付に到達しない、依存先が未公開、予定日未設定、監査未了の場合は公開しない。GitHub定期実行は遅れる場合があるため、20:00ちょうどの公開は保証しない。承認PRのmainマージを起点に即時公開しない。

---

# AI Portal — 合格と本番公開は同じ承認

2026-10-13以降、ユーザーの**「合格」＝本番公開承認**。追加の「公開していいですか？」という確認は禁止。合格時に記事原稿・図解・Registry・出典・リンクを検証し、合格記録を `content/registry/article-approval-log.yml` に登録して、**日付付き公開キューへ登録**する。

## 自動処理の起点
合格記事の原稿・図解とRegistryの `ready` をmainへ安全に取り込む同じ変更で、Approval Logに次の記録を置く。記録のない単なる `ready` を公開しない。ユーザーに再確認しない。**ただし即時公開ではなく予約日に公開する。**

```yaml
  - id: "GEN-0001"
    slug: "what-is-generative-ai"
    approvedOn: "2026-10-13"
    approvedBy: "site-owner"
    sourceArticleBlob: "<ready状態でmainに登録する記事ファイルのGit blob SHA>"
    decision: "approved-for-publication"
    publishOn: "2026-10-15" # 日本時間、例
    evidence: "ChatGPTでユーザーがこの記事を合格と明示"
```

**改ざん・差し替え防止:** `sourceArticleBlob`には、ユーザーが合格した本文を保持した`ready`状態の記事全体のGit Blob SHAを記録します（`git hash-object content/articles/<slug>.md`）。`review`から`ready`への変更は公開メタデータのみとし、元のreview記事SHAは別途`originalReviewArticleBlob`として保存できます。本番公開処理は`ready`記事の現在のBlob SHAが承認ログと一致しなければ失敗します。`approvedBy: site-owner`も必須です。原稿の内容が変わった場合は、**元の合格扱いのまま公開しない**でください。

`publish-approved.yml` が毎日20:00（JST）の予定実行で公開可能な承認記録を探し、`scripts/auto-publish-approved.mjs` を実行する。公開できるものは `published` へ切り替え、Test/Lint/Buildが成功した場合のみmainへコミットする。Cloudflare PagesはmainのコミットでProductionデプロイする。GitHub Actionsは独立ジョブであり、デプロイ成功はCloudflareで後から確認する。

## 重要な制約
- `review` の記事、未承認の `ready` は**絶対に自動公開しない**。
- `prerequisites` が未公開、リンク先が未公開、画像欠落の場合は**その記事だけ保留**し、ほかの合格済み記事は処理する。
- 古いプレビューPRのマージや、記事本文・画像の自動リライトはしない。
- 承認されている記事が本番で `published` になるまで、1件の制作タスクとして扱う。ユーザーに2回目の許可を求めない。
- GitHub branch保護でbot pushが拒否された場合はWorkflow失敗を報告し、無断で保護を迂回しない。
- 日付は日本時間、公開後はapproval logの `decision: published` と `publishedOn` を記録。
- user input「合格」は ChatGPT の会話からGitHubへ無断で伝播しない。**合格を受けた作業者が同じターンで承認記録をGitHubへ追加する**。GitHubの記録をトリガーに、それ以降は自動公開する。

## 定期監査
自動制作管理表（Core Curriculum 100）を毎朝確認し、`approved-for-publication` の保留記事、未検査のPR、Productionデプロイ失敗を示す。すでに公開された記事を新規執筆しない。

Registryの前提記事が公開された場合も、毎日20:00（日本時間）の予約実行で保留中の承認を再検査します。技術的な再検査は新しい合格を生成せず、未承認の`ready`・`review`を公開しません。

## 本人の毎回のレビューを不要にする委譲編集ルート

2026-10-13から、サイト運営者は通常のAI学習記事について毎回の本文レビューを必須にしない方針とした。**無審査で公開する方針ではない。** 起案担当とは別の検証パスが、出典・中心疑問・初心者向け説明・図解・リンク・前提条件・安全性を検証し、具体的な根拠と原稿・監査記録のGit SHAを `content/editorial-audits/<ID>.yml` に記録する。

この方式の承認ログでは、`approvedBy: editorial-qa`、`delegation: site-owner-standing-policy-2026-10-13`、`sourceArticleBlob`、`editorialAuditPath`、`editorialAuditBlob` を必須とする。従来の本人合格は `approvedBy: site-owner` として別管理する。

新しい `ready` 原稿と監査記録を最新mainからのrelease PRへ入れ、独立監査の形式・根拠・SHA確認、CI、Cloudflare Previewが合格した後にマージする。承認ログを起点として `publish-approved.yml` が依存関係・原稿・画像を再確認して公開する。ニュース・高リスク事項・出典不明の断定は自動委譲対象外。読者の「わかりにくい」「誤り」という投稿は改善の手掛かりであり、公開前の事実確認を省く根拠にはならない。

詳細：`delegated-editorial-policy.md`。AIだけでは出典の実質的な正しさや「別担当の独立性」を機械的には保証できないため、虚偽の検証記録は作らず、監査不能なら公開を保留する。
