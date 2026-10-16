# AI Portal AIニュース｜重要度評価・日本語原稿の準備（非公開・試験段階）

2026-10-16。**この記事生成基盤は公開機能ではありません。** 原稿の作成には
人間による一次資料の照合と編集判断が必要です。現状、AIモデルへの外部API接続・
日本語の自動生成・ニュースの公開ワークフローは未実装です。

## 処理の順序

1. 公式RSSから候補収集（毎朝約7時）：`artifacts/news-candidates.json`
2. 元ページを安全に取得し、短い証拠抜粋を保存：
   `artifacts/news-primary-evidence.json`
3. 編集候補の分野・近似重複・日付の要確認箇所を提示：
   `artifacts/news-editorial-triage.json`
4. **人間の編集者**が元資料を読み、日付、利用地域・対象ユーザー、
   技術的な制約、独立した評価の有無と、原稿に使用してよい主張・出典を記録する。
5. 編集者自身が読者の価値を4軸で評価（以下）。点数は**事実や品質の保証ではない**。
6. すべての審査項目が揃った場合に限り、非公開のAI入力パケットを生成。
7. 将来、AIが日本語原稿を作成したとしても、構造的な引用検証に加えて
   **別の編集者による事実確認と日本語レビューが必須**。自動公開は禁止。

## 編集者が記入する重要度（合計10点、暫定ルーブリック）

| 評価軸 | 範囲 | 判断する内容 |
| --- | --- | --- |
| `readerImpact` | 0〜3 | 読者の判断・理解に与える影響 |
| `audienceBreadth` | 0〜3 | 影響する読者の広さ |
| `genuineNovelty` | 0〜2 | 実質的な技術・製品・制度の変化 |
| `practicalValue` | 0〜2 | 実務・学習に役立つ具体性 |

各評価には編集者の理由（20〜600文字）を記録する。
8〜10点は `review-soon`、5〜7点は `review-when-capacity`、
0〜4点は `low-priority-review`。**どの点数でも記事の採用・公開は自動決定しない**。
企業や情報源の知名度だけでは加点しない。注目度の低い研究でも読者に
大きな価値がある場合を排除しない。定期的に読者行動の実測値で基準を見直す。

## 入力ファイル（手動で非公開の artifacts に作成）

`artifacts/news-editorial-reviews.json` に以下の形式で記録する。
`candidateId` と `originalUrl` は、同じ実行で出力した非公開
`news-editorial-triage.json` の項目と一致させる。下記は**架空の例**であり、
実在企業の発表・検証済みニュースではない。

```json
{
  "schemaVersion": 1,
  "publishingEnabled": false,
  "reviews": [
    {
      "schemaVersion": 1,
      "candidateId": "0123456789abcdef01234567",
      "originalUrl": "https://example.com/official-news",
      "decision": "draft-ready",
      "reviewer": "Human Editorial Reviewer",
      "reviewedAt": "2026-10-16T05:00:00Z",
      "whyItMatters": "Explain with at least 40 characters why this change matters to ordinary readers.",
      "whatChanges": "Explain the concrete practical impact and who it applies to, in at least 30 characters.",
      "limitations": "Describe the verified conditions and what remains unknown.",
      "checks": {
        "originalRead": true,
        "datesChecked": true,
        "claimsChecked": true,
        "limitationsChecked": true,
        "duplicationChecked": true,
        "independentContextConsidered": true
      },
      "claims": [
        {
          "statement": "Write only a claim actually checked by the reviewer.",
          "evidence": [{
            "url": "https://example.com/official-news",
            "supportingExcerpt": "A short supporting extract from the source, checked by the reviewer."
          }]
        }
      ],
      "priorityAssessment": {
        "readerImpact": {"score": 2, "reason": "Document the grounded reason for reader impact."},
        "audienceBreadth": {"score": 2, "reason": "Document why the audience is fairly broad."},
        "genuineNovelty": {"score": 1, "reason": "Document a meaningful rather than cosmetic change."},
        "practicalValue": {"score": 1, "reason": "Document the practical decision readers can make."}
      }
    }
  ]
}
```

**この例を本物の審査データに使わないこと。** 編集者が実際に本文と出典を
検証できない場合は `reviews: []` として何も下書きに進めない。

## 実行（ニュースの毎朝Cronには組み込まない）

```bash
node scripts/prepare-news-draft-packets.mjs
```

入力：上記のレビューJSONと非公開の候補トリアージJSON。
出力：`artifacts/news-draft-packets.json` のみ。
出典付きの確定入力パケットと日本語の執筆指示を保存する。
APIキー不要。**このコマンドはAIモデルを呼ばず、日本語記事を生成しない。**
GitHubの公開コミットにレビューの生データや出力パケットを追加しない。

将来の文章生成モデルが返す予定の構造：

```text
schemaVersion = 1
candidateId = 審査パケットと一致
status = unreviewed-japanese-draft
publicationEligible = false
title = 日本語見出し
lead = {text: 日本語の導入文, claimIds: ["C1", ...]}
sections = {
  whatHappened: {text, claimIds},
  whyImportant: {text, claimIds},
  whatChanges: {text, claimIds},
  limitations: {text, claimIds}
}
```

`validateGeneratedJapaneseDraft` はURL・HTML混入、未確認の主張ID、
必須節の欠落、公開フラグの変更を防ぐ**形式検査**である。
文章の意味・論拠との整合性・数字の正確さを保証できないため、
検査が通っても常に `semanticFactCheck: not-performed`、
`publicationEligible: false` とする。

## 今後の未実装

- モデルプロバイダーの選択・利用規約・API秘密情報の適切な管理
- 実際のAI生成呼び出し（非公開での費用・失敗制御、敵対的入力対策）
- 生成した日本語の独立した事実確認と訂正履歴
- 意味単位の重複判定、重要度ルーブリックの実測による校正
- ニュース専用の承認台帳・時刻ゲート・一日最大枠・本番公開の安全設計

学習記事の `publish-approved.yml` の20時JSTゲートとは完全に独立させる。

## オプション：モデルによる非公開草稿の試験生成

`scripts/news-model-draft-core.mjs` と
`scripts/generate-private-news-draft.mjs` に、出典確認済みの主張を
JSON Schemaの厳格な形式で日本語草稿に変換するモデル接続コードを追加。

**重要：何も設定しない状態ではモデルへのリクエストは実行されない。**
手動 `--execute` を明示した場合にだけ外部APIを呼ぶ。
これをRSS収集用のGitHub Actionsや20時の学習記事公開処理に接続しない。
APIの利用には別途、利用者による設定と料金管理が必要。

実際の編集者レビュー済みのプライベートな
`artifacts/news-draft-packets.json` を準備した後、まずは無料のドライラン：

```bash
node scripts/generate-private-news-draft.mjs --candidate=<24文字の候補ID>
```

このコマンドは候補ID・根拠付き主張の件数・入力SHA-256などを確認するだけ。
**モデルAPIは呼び出さない（費用も発生しない）。**

将来、担当者が費用と規約を確認しAPIキー・モデル名を自身の秘密情報管理で
設定した後だけ、以下の手動コマンドを使う：

```bash
node scripts/generate-private-news-draft.mjs --candidate=<24文字の候補ID> --execute
```

環境変数：`OPENAI_API_KEY`、`OPENAI_NEWS_DRAFT_MODEL`。
後者には、JSON Schema付きResponses APIに対応する実際のモデルを明示すること。
現時点でモデル・キーの既定値は存在しない。キーをGitHub Issue、
PR、チャット、シェルの実行ログ、リポジトリに貼らないこと。

1回の手動実行では1候補に対して1リクエストのみ（再試行なし）。
APIレスポンスはサイズ上限・タイムアウト・JSON Schema・元の出典IDの
照合で検査し、`artifacts/news-generated-draft.json` に非公開保存。
既存の同名ファイルは上書きしない。APIへの入力内容は
実際に外部のモデルサービスへ送信されるため、秘密情報・個人情報・
未公開の機密資料を含めないこと。

`store: false` 指定、外部ツール呼出無効、固定API宛先、
応答やキーのログ出力なし。モデルが拒否・失敗した場合は
**下書きを出力しない**。生のRSSは生成入力に渡さない。

この試験コードは日本語草稿の**形式を検査するだけ**。
出典IDが合っていても、文章内容が出典と一致しているとは限らない。
人間による事実・数値・条件の再検証後に別の承認作業が必要。
記事の自動承認・自動公開機能は依然として未実装・無効。
