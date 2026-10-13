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

`article-inventory.yml` は記事ファイルを追加するPull Requestで全保持ブランチ・PR履歴を確認します。既存原稿があれば、引き継ぎ元を正しく指定しない限り**PRチェックは失敗**します。API取得失敗・権限不足・結果の一部欠落時も判定を続行せず失敗します。

その他、公開操作は別プロセスです。**`ready`は`published`ではありません。公開にはユーザー明示承認とPublication Gateが必要**です。公開状態変更、既存記事の修正、画像差替えを本ゲートが自動承認することはありません。

## 情報の正確性

- `knowledge-nodes.yml`：ノードの定義・本番ステータス（mainの正本）
- `core-curriculum.yml`：優先100記事と学習順（正本）
- **自動生成の管理表**：mainと保持ブランチ・PRの実体を照合した、日時付きスナップショット
- GitHub PRおよび原稿：制作中の原稿・編集履歴の根拠

管理表には見つかった原稿・画像を示しますが、ユーザーの「記事合格」を自動推定しません。合格の判断と本番公開は別操作です。
