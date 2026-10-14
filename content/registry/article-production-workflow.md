## 2026-10-14以降：予約公開が優先

記事の起案と承認は前倒ししてよいが、承認PRマージによる即時公開はしない。承認台帳に `publishOn: YYYY-MM-DD` を必ず指定し、`ready`のまま待機させる。毎朝09:15 JSTのGitHub Actionsが各日最大1本だけ（前提・監査・ソースSHA・リンクが安全な場合）`published`へ進める。日付に達していない記事は非公開のまま。通常の「合格」が即時公開である旨の古い記述よりこの方針を優先する。

# AI Portal｜記事制作開始ゲート（重複防止）

**原則：既存記事がないことを確認するまで、新規執筆を始めない。** `planned` は未執筆の証拠ではありません。mainのRegistry・原稿、保持されている全GitHubブランチ（プレビューと過去のfeatureも含む）、PR履歴を照合します。

## 管理表の取得

[GitHub Actions「Article Production Inventory & Start Gate」](https://github.com/naoki20151214-ops/aiportal-app/actions/workflows/article-inventory.yml) で **Run workflow** を選択してください。毎日午前9時（日本時間）にも自動で実行されます。各実行の **Artifacts** から100記事の `article-inventory.md` と `article-inventory.json` を取得できます。GitHubのStep Summaryでも管理表を閲覧できます。

ターミナルでも取得できます（GitHubの読み取り権限を持つtokenが必要です）。

```bash
GITHUB_TOKEN=... npm run article:inventory
# artifacts/article-inventory.md と .json に出力される
```

表の「既存成果物あり」は**新規制作禁止**です。元原稿・図解・テストを読んでから引き継ぎます。テストの「候補あり」は名称から検出しただけで、実行成功を意味しません。画像枚数は実際に引用されているパスで計算します。

## 記事を書く前の必須手順

1. Core Curriculumで記事IDを選び、`npm run article:preflight -- BAS-0023` を実行します（毎回GitHubを再走査）。
2. **BLOCK** なら新規執筆しません。mainに原稿があればそちらを継続します。既存ブランチがあれば、本文と画像を確認し**その成果物を引き継ぎます**。
3. **新規制作候補**と出た場合だけ、Registry上のIDとslugを使って執筆を開始できます。この判定は、現存するブランチとPR履歴の走査時点のものです。削除済みブランチや外部保存先まで保証するものではありません。
4. 既存ブランチから復元した記事を**新しいPRで追加する場合**、同じPRに `.github/article-reuse/BAS-0023.yml` を含めます。中身は次の通りです。

```yaml
id: BAS-0023
sourceRef: draft/bas-0023-context-window-20261010
```

実在し、対象記事の原稿を含むsourceRef以外は受け付けません。既存プレビュー専用PRそのものをmainへマージしてはいけません。原稿だけ安全に切り出します。

## 自動ゲート

`verify.yml` の「Check live article inventory and block duplicate drafting」はPull Requestの通常Verifyに組み込まれ、全保持ブランチ・PR履歴を確認します。`article-inventory.yml` は毎朝9時と手動実行で管理表を生成します。既存原稿があれば、引き継ぎ元を正しく指定しない限り**PRチェックは失敗**します。API取得失敗・権限不足・結果の一部欠落時も判定を続行せず失敗します。

公開はユーザーの**「合格」＝本番公開の承認**を起点に予約キューへ登録します。`ready`は技術的な準備状態であり、それだけでは公開しません。合格を受けた作業者は同じ依頼の中で承認記録（`decision: approved-for-publication`）と記事・画像・Registryの安全な更新をmainへ登録し、`publish-approved.yml`に検証と公開を引き継ぎます。**公開許可をもう一度尋ねることは禁止**です。記事の本文・図解は承認なしで自動変更しません。前提記事などの安全条件が未成立なら保留理由を報告し、承認自体は維持します。

## 情報の正確性

- `knowledge-nodes.yml`：ノードの定義・本番ステータス（mainの正本）
- `core-curriculum.yml`：優先100記事と学習順（正本）
- **自動生成の管理表**：mainと保持ブランチ・PRの実体を照合した、日時付きスナップショット
- GitHub PRおよび原稿：制作中の原稿・編集履歴の根拠

管理表には見つかった原稿・画像を示しますが、ユーザーの「記事合格」を自動推定しません。**明示的な合格はそのまま予約公開承認**であり、承認を受けた後のGitHub検証・公開処理は機械的に自動実行します。詳しくは [`approved-publication.md`](approved-publication.md) を参照してください。

## 標準記事の編集承認委譲（2026-10-13〜）

ユーザーの毎記事レビューを通常の公開必須条件から外す。起案とは別の検証パスによる一次情報の確認、8つの品質項目、元記事SHAと監査ファイルSHAを `content/editorial-audits/<ID>.yml` に記録する。合格と確認できた通常のエバーグリーン教材だけ、監査に基づく承認 `approvedBy: editorial-qa` を登録して自動公開する。ニュース・高リスク・出典未確認・監査の独立性が確認できない場合は保留。読者フィードバックは公開後の改善に用い、事実確認を省く理由にしない。

公開チェックは `scripts/delegated-editorial-gate.mjs`、CIは `scripts/validate-delegated-editorial-audits.mjs` が担当。詳細は `delegated-editorial-policy.md`。編集承認はログと正確なGit Blob SHAを必要とし、単なる `ready` では公開されない。
