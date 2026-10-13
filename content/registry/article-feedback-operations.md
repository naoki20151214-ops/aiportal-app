# AI Portal｜1タップ読者フィードバック運用（2026-10-13）

## UX方針
記事の最後に「この記事の説明、分かりやすかった？」と2つのボタンだけを置く。
- 「😊 わかった」：1回のタップで投票を送信。保存成功後にお礼を出す
- 「🤔 まだ難しい」：1回のタップで投票を送信。**成功してから**「言葉が難しい」「具体例がほしい」「図が分かりにくい」「説明が飛ぶ」を任意表示
- 理由のタップは**既存の投票をUPDATE**。再送信ボタン、ログイン、氏名、メールアドレス、文章入力はいらない
- 読者が回答を変更した場合も同じ受付番号のレコードを更新し、分母を増やさない
- 「内容の誤りを報告する」は別リンクからその場で入力欄を開く。文章入力と「誤りを送信する」はこのケースだけ必要
- 通信・Cloudflare認証・DB保存が失敗したときは、成功を装わず「再試行」を出す。報告が実際に保存できた後にしかお礼を表示しない
- 記事の配信やアクセス解析への同意・拒否を妨げない。閲覧途中でモーダルやアンケートを出さない

## 本番反映直後の安全状態
**D1保存機能は未設定なので、ネイティブ2ボタンは無効**。実装をマージしても、`NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED=1`と正しいTurnstileサイトキーがなければ、記事下部に既存Googleお問い合わせフォームの案内だけを表示する。

フロント側のビルドフラグが有効になっても、記事末尾に近づいたときに同一オリジンの `GET /api/feedback` を使ってD1テーブルの存在とバックエンドの設定を確認。200と`available:true`が返った場合だけ、2ボタンを表示する。サーバーが503を返した場合は引き続きGoogleフォームを案内する。GETはDBの中身を返さない。

## Cloudflare管理画面で稼働前に必要な手順
1. Cloudflare D1にProduction用DB（例：`aiportal-feedback`）を作り、`migrations/0001_article_feedback.sql`を適用する。テーブル・インデックスを検証。Previewは**本番とは別のD1**を使う
2. Cloudflare Pagesプロジェクト `aiportal-app` のSettings > Bindingsで、D1を正確に `AI_PORTAL_FEEDBACK_DB` として登録する
3. Turnstileのサイトキーを作り、Productionの`aiportal.blog`を許可する。完全に目立たない動作を優先するなら**Invisible**モード。Managedの場合はリスクがあるアクセスで操作を求められる可能性がある（ブラウザー環境により常に1タップとは限らない）
4. サーバーのSecret `TURNSTILE_SECRET_KEY` を設定する。GitHubへシークレットをコミットしない。Previewは別のTurnstileウィジェット/鍵を用いる
5. Cloudflare WAF/Rate Limitingで`POST /api/feedback`と`PATCH /api/feedback`の連続投稿を制限する（必要に応じて`GET`の異常な連打も制限）。Turnstileだけでスパム対策を完結させない
6. コメントの保持期間、削除手順と運営者の閲覧権限を決める。自由記述に個人情報が含まれた場合の削除手順も確認し、プライバシー記載と一致させる
7. 上記が検証できたらサーバーの環境変数 `AI_PORTAL_FEEDBACK_ENABLED=1`、**静的ビルド時**の環境変数 `NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED=1`、`NEXT_PUBLIC_TURNSTILE_SITE_KEY=<公開サイトキー>` を設定し、Cloudflare Pagesを**再ビルド・再デプロイ**する（後から設定値だけを追加してもStatic Exportのクライアントバンドルは変わらない）
8. iPhone/Android/PCで保存確認：GET 200、POST 201、理由・回答変更のPATCH 200、訂正POST 201。D1の記録が本当に更新され、再試行しても重複せず、未設定やエラーでは成功を表示しないことを確認する。Preview環境で先に検証する

**重要：** この作業に利用するGitHubコネクタだけではCloudflare管理画面にあるD1の作成、バインディング、Turnstileの鍵、WAF設定を操作できない。これらは設定実施と本番保存実証が完了するまで「未稼働」として扱う。

## 実装の技術仕様
- `functions/api/feedback.ts` には`GET`（安全な利用可能状態検査）、`POST`（新規投票・訂正）、`PATCH`（投票の変更・理由の追加）の3操作を実装
- 原稿を公開した時点のRegistryから生成したpublished ID/slugの組み合わせだけを受付。未公開原稿は対象外
- JSONの各項目・文字数を検証し、`Origin`不一致・無効な記事ID・不正なTurnstile・元の投稿と一致しない受付番号を拒否
- Turnstileは記事末尾に近づくまでロードしない。認証トークンは毎回Cloudflare Siteverifyで検証（使い回し不可）。ボタンを押してから認証が完了するまで要求を保留し、**再タップは求めない**。受信と確認が完了してからお礼を表示
- 受付番号はブラウザーで`crypto.randomUUID()`から生成した強いランダム値。ブラウザのLocalStorage/Cookieに保存せず、そのページを開いている間のメモリ上でのみ保持。サーバー側の主キーにも同じ値を使用し、同じPOSTを安全に再試行できる。これにより**同じページ閲覧中**の重複計上は抑制できるが、再訪問・別端末・意図的な不正な回答を完全に検知する識別子は集めない
- DBの`ON CONFLICT(id)`でタイムアウト後のPOST再試行を冪等化し、同じ記事・rev・kindの行に限って上書き。PATCHは元の受付番号と記事ID・slug・revが一致しない場合は404。書き込みが成功しても`meta.changes`が0の場合は成功を返さない
- 評価の投稿には自由記述を含めない。誤り報告は明示的に送信された最大500字のみD1に保存。コメントは非公開で、評価をGA4の個人データ等に送らない
- 過去のD1 CHECKに`partly`が残っている場合も、新しい画面/APIは`understood`か`difficult`の2択だけを受付（データ移行は必要ない）
- `public/_routes.json`によりPages Functionsが対象とするのは`/api/feedback`のみで、記事本体はStatic Exportのまま

## 計測と改善の優先順位
定期的にD1を直接クエリして、記事ID・更新日ごとの票数、理解できた割合、難しかった理由を集計する。**公開の未認証APIから個別コメントを取得できる機能は作らない**。

```sql
SELECT article_id, slug, revision,
       COUNT(*) AS responses,
       SUM(CASE WHEN rating = 'understood' THEN 1 ELSE 0 END) AS understood,
       SUM(CASE WHEN rating = 'difficult' THEN 1 ELSE 0 END) AS difficult
FROM article_feedback
WHERE kind = 'rating'
GROUP BY article_id, slug, revision
ORDER BY responses DESC;
```

最優先：事実誤認の報告（1件でも出典調査）
次：複数人から同じ説明・図について報告がある記事
その次：十分な票数のある記事で理解率が低いもの

回答が1～2件しかない記事の割合を根拠に安易な記事改稿をしない。週次にまとめて改善候補を出し、修正後は編集監査と公開ゲートを再通過させる。

## 根拠
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/concepts/widget/
- https://www.cloudflare.com/turnstile-privacy-policy/
- https://developers.cloudflare.com/d1/worker-api/prepared-statements/
