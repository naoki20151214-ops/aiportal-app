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

**2026-10-13変更：ユーザーの「合格」は編集合格と本番公開承認の両方を意味します。追加の「公開していいですか？」は禁止です。** 合格した同じ作業で、承認済み記事を安全にmainへ `ready` として反映し、`article-approval-log.yml` に `decision: "approved-for-publication"` と合格根拠を記録します。GitHub Actions `publish-approved.yml` がこれを検出し、前提記事・リンク・画像を確認してTest/Lint/Build成功後に自動で `published` として反映します。

**未承認の `ready` と `review` は自動公開しません。** 前提が未公開なら合格記録を維持して保留し、依存解消後に同じ合格を再利用します。未承認の本文修正・画像差替えは自動処理の対象外です。

## 情報の正確性

- `knowledge-nodes.yml`：ノードの定義・本番ステータス（mainの正本）
- `core-curriculum.yml`：優先100記事と学習順（正本）
- **自動生成の管理表**：mainと保持ブランチ・PRの実体を照合した、日時付きスナップショット
- GitHub PRおよび原稿：制作中の原稿・編集履歴の根拠

管理表は存在する原稿・画像を示しますが、ユーザーの合格を自動推定しません。合格を受けた担当者が**同じ作業で**合格記録を追加し、それを起点に本番公開まで進めます。実装と保留条件は [approved-publication.md](approved-publication.md) を参照してください。
