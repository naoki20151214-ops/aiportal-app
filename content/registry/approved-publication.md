# AI Portal — 合格と本番公開は同じ承認

2026-10-13以降、ユーザーの**「合格」＝本番公開承認**。追加の「公開していいですか？」という確認は禁止。合格時に記事原稿・図解・Registry・出典・リンクを検証し、合格記録を `content/registry/article-approval-log.yml` に登録して、**同じ承認の流れで本番公開**する。

## 自動処理の起点
合格記事の原稿・図解とRegistryの `ready` をmainへ安全に取り込む同じ変更で、Approval Logに次の記録を置く。記録のない単なる `ready` を公開しない。ユーザーに再確認しない。

```yaml
  - id: "GEN-0001"
    slug: "what-is-generative-ai"
    approvedOn: "2026-10-13"
    approvedBy: "site-owner"
    decision: "approved-for-publication"
    evidence: "ChatGPTでユーザーがこの記事を合格と明示"
```

`publish-approved.yml` がmain上の承認記録の追加を検出し、`scripts/auto-publish-approved.mjs` を実行する。公開できるものは `published` へ切り替え、Test/Lint/Buildが成功した場合のみmainへコミットする。Cloudflare PagesはmainのコミットでProductionデプロイする。GitHub Actionsは独立ジョブであり、デプロイ成功はCloudflareで後から確認する。

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