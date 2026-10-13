# AI Portal — 読者フィードバックの運用手順

## 設計の目的
2026-10-13、サイト運営者は「毎記事の本人レビューをやめ、強い公開前品質監査と公開後の読者の改善要望を重視する」方針を提案した。これは「原稿が書けたから直ちに公開してよい」という意味ではない。独立監査・承認記録・出典・重複防止・リンク・画像・Test/Lint/Build・Productionチェックを省略しない。編集承認の新モード実装については GitHub Issue #143 を参照。

## 実装
- 各記事の末尾に理解度3段階・理由・任意コメント・誤り報告のUIを追加する。
- 統計用データは、Cloudflare Pages Function \`/api/feedback\` がTurnstileのSiteverifyを成功させてから D1 \`article_feedback\` に保存する。
- 記録: 記事ID、slug、記事更新日（revision）、評価、理由、任意コメント（最大500字）、受信時刻、ランダムUUID。氏名、メール、IP、Cookie ID、ユーザーエージェントをD1の列としては保存しない。利用者が自由記述欄に自身の情報を入れる可能性について、利用規約・プライバシーポリシーで通知する。
- 自由記述は**非公開**。投稿内容をそのまま記事へ反映せず、必ず編集監査を通す。
- \`public/_routes.json\` は \`/api/feedback\` のみFunctionsにルーティングし、静的記事配信にFunctions課金をかけない。
- 既存のGoogleお問い合わせフォームは常設の代替手段として維持する。

## このPRをマージした直後
**新しい保存フォームは意図的に無効**。CloudflareのD1、Turnstile、WAF Rate Limiting、プライバシー検証が準備できるまでProductionにもPreviewにも集計フォームは表示しない。既存お問い合わせフォームだけを案内する。

## Cloudflare管理画面で必要な設定
1. Workers & Pages の D1 でデータベース（例 \`aiportal-feedback\`）を作成。Cloudflare D1の実IDを別途保管する。
2. D1 のConsoleなどから \`migrations/0001_article_feedback.sql\` のDDLを本番DBへ実行し、テーブルとインデックスの存在を確認。
3. Pages > \`aiportal-app\` > Settings > Bindings でProductionにD1を \`AI_PORTAL_FEEDBACK_DB\` の名前でバインド。Previewは本番と隔離したD1でテストする。
4. Turnstileウィジェットを作成し、Productionでは \`aiportal.blog\`（必要に応じて正式なドメイン）を登録。Previewにはプレビュー用の別サイトキー/シークレットを使う。
5. Pages のサーバー環境変数・シークレットに \`TURNSTILE_SECRET_KEY\`（絶対にGitにコミットしない）を設定。Nextビルド時に \`NEXT_PUBLIC_TURNSTILE_SITE_KEY\` と \`NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED=1\` を設定する。サーバーには \`AI_PORTAL_FEEDBACK_ENABLED=1\` を設定。
6. Cloudflare WAF / Rate Limitingで \`POST /api/feedback\` を制限し、サイト全体ではなく投稿APIの不正利用を抑制する。Turnstileだけを連投防止の代わりにしない。最低限、ログ・無料枠・不要なデータ保存の監視体制が必要。
7. Privacyと運営者のフィードバック取り扱い・保持期間・削除方法を点検する。自由記述の個人情報は収集目的外利用しない。
8. レート制限、D1書き込み、Turnstile、失敗時のエラーメッセージ、前後の広告・GA4同意表示を検証したあと、**本番に再デプロイ**する。バインディングの変更後も再デプロイが必要。
9. \`/api/feedback\` への直接GETは405、未設定/停止時のPOSTは503とする（成功を装わない）。正しく保存されたPOSTだけ201とreceipt(UUID)を返す。

## 開発・CI
- \`npm test\` と \`npm run build\` の事前ステップで \`scripts/generate-feedback-article-map.mjs\` がRegistryのPublishedノードからAllowlistを生成。
- ブラウザからのarticle ID・slug組み合わせがPublished Allowlistと一致しない場合は422を返す。ready/reviewの投稿先は不可。
- GitHub自動公開ワークフローは、記事をPublishedにするたびに生成Allowlistもコミットして同期する（変更内容を検証する）。
- Cloudflare Preview / GitHub Test/Lint/Build / サイトマップ / CSP等に問題がないことを確認。

## 編集側の初期ワークフロー
- 日次: 誤り報告の一覧を確認。重要な事実の誤りは、1件でも出典確認・修正Issue化。
- 週次: 記事IDごとに理解度の3区分・回答数・指摘理由を比較し、難しい記事を再執筆候補として推薦。回答が少ない場合は結論を出さない。
- 改訂稿は元原稿SHAと修正理由を残し、独立した検証とリンク整合性を通して本番公開。
- 将来の管理画面/APIは認証機能ができるまで公開しない。読者の自由記述を公開側へ出さない。

## 一次情報
- https://developers.cloudflare.com/pages/functions/
- https://developers.cloudflare.com/pages/functions/routing/
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
