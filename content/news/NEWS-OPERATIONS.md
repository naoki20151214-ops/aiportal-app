# 2026-10-19｜ニュースは承認後すぐ公開・投稿数上限なし（最新方針）

**本節は、それ以前の予約投稿・1日2本・2→6→17段階制の説明に優先する現行方針です。**
日本時間2026-10-19、サイトオーナーの明示指示：「ニュースだったらできるだけ早く記事にするべき」「出来上がった記事は予約せずに投稿してください」「特にニュース配信については予約投稿ではなく、すぐに良い記事を投稿してほしい」。

- **公開の起点は時間枠ではなく原稿の承認**。承認済み`ready`記事と承認キューがGitHub mainへ反映されたことをトリガーに、`publish-reviewed-news.yml`が書き込み直後に実行を試みる（GitHub runnerのキューやCloudflareビルドによる数分単位の遅れはありうる）。
- **ニュースには1日あたりの件数制限や予約時刻は設定しない**。本数目標を無理に埋めず、価値ある記事だけ公開する。現行`news-cadence.yml`の`pilot-2`/`growth-6`/`hourly-17`は以前の予約方式の*回帰テスト用定義*であり、`publicationMode: immediate`の実公開制約ではない。
- 既存の`scheduledAtJst`は昔の承認判断の履歴として保存し、**公開時刻の拘束には使わない**。新しい承認には代わりに日本時間`approvedAtJst: "YYYY-MM-DDTHH:MM:SS+09:00"`を記録し、未来の承認時刻は拒否する。
- **安全ゲートは不変**：公開記事への移行は承認記録`approvedBy: site-owner`、`decision: approved-for-publication`、監査`auditPath`、文章Git Blob SHA、WebP SHA-256、一次情報URL、拒否履歴・重複、Registry記事ID/slug、公開済み前提/内部リンク、原文の変更禁止、Test/Lint/Buildが揃った場合のみ。未確認RSS情報から記事・承認・画像を自動生成しない。
- 1実行で複数承認原稿があれば、すべてを同じ安全チェックで順番に検証し、**一回のCI・Git commitで反映**する。旧時刻を理由に特定記事を延期したり、昨日の承認があっても当日の別記事を止めたりしない。
- main書き込みは従来どおり20:00の教材公開との共通concurrencyで直列化。GitHub Actionsの`GITHUB_TOKEN`で書き込んだpushから別のGitHub Actionsが再起動しないため、承認済みの残件を一度の実行で処理する。
- GitHub cron（07:00〜23:00）はあくまで**pushイベント欠落時の再試行監視**。予約枠でも投稿上限でもない。品質に必要なチェックが欠けていれば何も公開しない。
- **2026-10-19移行時の既承認在庫**：NEWS-0094（元10/19 18:00予約）、NEWS-0100（元10/20 09:00予約）は、改定前からオーナー承認記録と固定原稿・画像SHAを保持。新方針により旧予約に拘束されず、ゲート検証成功後すぐ公開する。NEWS-0096の既公開歴史記録は変更しない。
- 公開「成功」の報告には、mainの状態・ActionsのCI・Cloudflare Pages Productionと記事/画像/CTAの実HTTP配信をそれぞれ確認し、確認できないものを未確認と区別する。

---

# 2026-10-19｜段階式 07:00〜23:00 JST 毎時ニュース公開（現在は2本/日）

> 本節は2026-10-18の「2枠」運用記述を上書きします。以降の過去ログは経緯として保存し、古い枠・上限説明を現在の仕様とは解釈しないこと。

## 現在の設定
- 正本：`content/news/news-cadence.yml`。スキーマ2、`activePhase: pilot-2` を維持。
- **毎時情報収集**：07,08,...,23時（日本時間）の計17回のGitHub Actions実行機会。RSSメタデータ・一次ページ取得補助・日本語編集ブリーフをprivate artifactとして記録。公開承認には変換しない。
- **毎時公開チェック**：同じ17時刻に定時チェック、各時刻の17分後にリトライ機会。ただし現在の許可された実際の公開枠は **09:00と18:00 JSTのみ、最大2本/日**。
- GitHub Actionsのスケジュールは遅延・欠落することがあり、毎時の実行・公開を保証しない。定時公開の成功は別途実際の本番と記事/画像/リンクのHTTP応答で確認する。
- 同じ時間に空き枠があっても原稿が未承認・未検証・重複・依存不備なら**0本**。RSS取得だけで本文や画像を公開しない。
- 20:00 JSTの学習記事公開は今までどおり別枠かつ同じGitHub main書込ロック。

## 段階切替（手動PR審査、無条件昇格なし）

| phase | JSTの有効枠 | 上限 | 移行前の判断証拠 |
| --- | --- | ---: | --- |
| `pilot-2`（有効） | 09,18 | 2 | 現行承認・SHA・一次資料確認を維持 |
| `growth-6`（未有効） | 07,09,12,15,18,21 | 6 | 3日以上の定時収集の正常実行、主要な一次資料の到達失敗の解決または明示的な人手検証、6本/日の独立した事実確認と画像制作体制、投稿後監査 |
| `hourly-17`（未有効） | 07〜23の毎正時 | 17 | 少なくとも7日間の6枠運用で記事・画像・CTA・重複・遅延・本番配信の重大事故ゼロ、17本/日の編集確認体制と在庫、費用・負荷の見積りとオーナー判断 |

- フェーズ変更には `activePhase` と `targetApprovedPostsPerDay` の同時変更が必要。GitHub PRのTest/Lint/Build及び実際のProduction検証が必須。コード側の固定フェーズ表と一致しなければブロック。
- 17本/日は**毎時公開できる上限**であり、記事生成や新ニュースの供給を約束するものではない。承認済みの独立した記事在庫がないと公開されない。
- **重要：** 2026-10-19 18:00 JSTに待機中の NEWS-0094 は元の承認時刻のまま。09:00はNEWS-0096の履歴に計上されており、上限を回避しない。公開済み履歴の日付も書き換えない。

## 不変の安全ゲート
1. 公式一次ページで発表日・適用範囲・主張・差分・注意点を確認し、未確認は未確認と明記。
2. 重複防止台帳と過去の不採用判断を照合、編集判断を記録。
3. オーナーの承認が結び付いた`ready`原稿、完全一致のGit Blob SHA、承認済みWebP SHA-256、`auditPath`、適切なCTAと公開済み依存関係を必須にする。
4. 承認日の当日の当該時刻以外に公開しない。過去の時間や昨日の失敗記事は自動補填せず保留にする。同じ日本時間の1時間枠は1本まで。
5. GitHubの共通排他制御、Test/Lint/Build、ニュースアーカイブの決定的再生成、本番HTTP検証を維持する。
6. エラーは`content/news/news-incident-register.json`へ直接原因・構造的原因・実際のログ・回帰試験・本番再確認を記録し、繰り返しに対処する。

---

# AI Portal News | 2 daily slots and Git history

**News publication capacity:** 09:00 and 18:00 JST, maximum 2 approved news posts per Japan calendar day. GitHub Actions scheduling can be delayed. Slots are opportunities, not a commitment to publish an unworthy story.

## Canonical records

| File | Role |
| --- | --- |
| `content/articles/<slug>.md` | Canonical editorial article, frontmatter status and internal links |
| `public/images/news` (generated from `content/news/assets/*.base64`) | Approved news artwork |
| `content/registry/knowledge-nodes.yml` | Unique IDs, categories and publication status |
| `content/news/sources.json` | Allowlisted official feeds (intake candidates only) |
| `content/news/news-approval-queue.yml` | Future owner-accepted immutable news and timestamps |
| `content/news/news-publication-log.yml` | Historical manual release (NEWS-0092); do not rewrite |
| `content/news/news-editorial-decisions.yml` | Rejected stories (e.g. NEWS-0093), including why they failed |
| `content/news/news-archive.json` | Searchable materialized index of all news on main and editorial rejections |
| `content/news/news-archive.csv` | Human-readable export / future Google Drive mirror |
| `scripts/build-news-archive.mjs` | Deterministic archive compiler and exact source/title duplicate helper |

The **source of truth is GitHub**, not Drive or an independent database. The CSV can be copied to a Google Sheet for convenience, but edits must be made in GitHub and regenerated into the index; do not use two writable copies.

## Editorial workflow

1. Search the JSON/CSV archive for matching original URLs, title, topic, and rejected decisions **before drafting**. Reuse accepted assets where appropriate, never recreate a rejected story without new genuine news value.
2. Collect candidate official sources (RSS intake stays private, read-only, and never creates news).
3. Editorial verification of original release date, regional availability, factual claims, and impact. News must give more value than the headline and be about 1-minute long.
4. Author original Japanese article, approved illustrative hero and exactly relevant CTA. Stage as `review`, then `ready` after editorial sign-off.
5. Only following the site owner's explicit approval, add to `news-approval-queue.yml` with verified `sourceReadyBlob`, `heroSha256`, verified `originalUrl`, `auditPath`, `approvedOn`, `evidence`, and `scheduledAtJst`.
6. Date- and SHA-gated `publish-reviewed-news.yml` makes **at most one publication per run and two per day**, preserves the body, runs Test/Lint/Build before pushing, and serializes main push with the evergreen publisher.
7. Run `npm run news:archive` to regenerate the JSON and CSV in the publication PR. CI checks no stale archive.
8. Confirm actual GitHub main, Cloudflare Production and page/thumbnail/CTA before reporting a successful real-world delivery.

## Adding an approved story to the queue

```yaml
  - id: "NEWS-0094"
    slug: "verified-slug"
    approvedOn: "YYYY-MM-DD"
    approvedBy: "site-owner"
    evidence: "The documented explicit acceptance of this exact news and image"
    decision: "approved-for-publication"
    scheduledAtJst: "YYYY-MM-DDT09:00:00+09:00"
    sourceReadyBlob: "<exact git blob SHA of immutable ready Markdown>"
    heroSha256: "<SHA-256 of immutable approved WebP bytes>"
    originalUrl: "https://official.publisher.example/verified-article"
    auditPath: "content/news/editorial-audits/NEWS-0094.md"
```

This is documentation only, **not an actual approval**. Never insert a candidate into the queue based on a feed headline or AI assessment. The queue starts empty. Daily times and maximum can be revised in a reviewed code change only after reader engagement and editorial throughput are measured.

## Note on legacy news

NEWS-0090/0091 were published before this news release ledger; NEWS-0092 has its historical manual release log. The index labels unrecorded approvals as unknown, rather than fabricating sign-off provenance. A rejected NEWS-0093 is indexed through its final closed PR. The evergreen 20:00 JST article automation has not been modified.

## 2026-10-18: source discovery and value-gate extension

- The seven publisher pages in `content/news/editorial-source-watchlist.json` are manual-only discovery leads. No additional source is registered in `sources.json` without verified direct official feed, permissions and date checks.
- `triage-news-evidence.mjs` compares candidate original URLs and exact normalized headlines against the Git-backed archive, including rejected material. Historical matches are editorial warning flags; they never suppress, approve or publish an item automatically.
- A reviewer must now write `headlineBeyond` (verified new learning beyond the headline, 40+ characters) and `readerPayoff` (what someone concretely gains from a one-minute reading, 40+ characters). Both are required for private draft packet generation. Mechanical text completeness is not proof of editorial quality.
- Scheduled collectors remain read-only; 09:00/18:00 reviewed-news publication, 20:00 evergreen publication, and approval queue semantics are unchanged.

## 2026-10-18: human-readable daily editorial brief

- The 07:00 / 16:00 JST read-only candidate workflow now produces `artifacts/news-editorial-brief.md` in addition to existing JSON artifacts.
- The Japanese brief displays unverified RSS titles, source IDs, publisher dates, primary-page retrieval status, and exact-source/title historical overlap IDs.
- It is a reading queue, not a recommendation, verified report, drafted article, owner approval, or public site content. It scores no unverified claims.
- The scheduled workflow remains `contents: read` and never writes to main, article registry or approved publication queue.

## 2026-10-18: live ingestion incident and guarded fix

Morning scheduled collection: run [39079617267](https://github.com/naoki20151214-ops/aiportal-app/actions/runs/39079617267), RSS feeds successful 6/6, 16 unverified candidates, 5/16 primary HTML pages retrieved; 5 redirect-limit failures (AWS 4 / DeepMind 1), 6 non-200 failures (OpenAI 6). These are **historical pre-fix figures**, not a post-fix success claim.

- Root-cause evidence for redirect cases: the original RSS URL normalizer strips trailing slashes; before this patch it was also used on publisher `Location` headers, causing repeated redirects to a mandatory `/` path. The primary-page fetcher now preserves a safe redirected trailing slash while keeping HTTPS, no credentials, and allowed publisher host constraints. Redirect cycles are explicitly detected.
- Non-200 OpenAI pages remain unverified and blocked. The importer records bounded `http-NNN` response categories rather than bypassing source controls or treating RSS metadata as proof.
- Both raw JSON evidence and the Japanese editor brief include retrieval failure information to prioritize manual research without leaking page bodies.
- RSS's `/index/<slug>` and OpenAI's localized `/ja-JP/index/<slug>` are now treated as a *possible duplicate* hint only. The 2026-10-18 intake missed English RSS NEWS-0092 even though a Japanese localized version was already published. No automated suppression or publication is performed.
- The morning 09:00 publication workflow [39088339450](https://github.com/naoki20151214-ops/aiportal-app/actions/runs/39088339450) ran after 10:57 JST due to GitHub schedule delay and correctly did nothing because the approval queue was empty. This is **not** a successful release test.
- After merge, a new scheduled collection is needed to verify the real primary-page success rate and failure reasons. Test/Lint/Build passing alone does not establish production intake success.

## 2026-10-18: safe staggered fallback for unreliable GitHub cron

GitHub documents that scheduled workflow starts near minute `:00` may be delayed or dropped during high load. The repository observed no created 16:00 intake run or 18:00 publication run as of 18:53 JST on 2026-10-18 (not proof that they will never appear). The successful 09:00 release-control run started at about 10:57 JST and correctly published nothing because no owner approvals existed.

- Keep original 07:00 and 16:00 JST **read-only candidate intake** and add 07:17 / 16:17 opportunities. Intake permissions remain `contents: read`, all items remain unverified and cannot be published.
- Keep original 09:00 and 18:00 JST **publication opportunities** and add 09:17 / 18:17 catch-up triggers. These are *not* additional news slots: all triggers invoke the same immutable owner-approval and time/quota gates, serialized with the 20:00 evergreen publisher.
- `assertUniqueNewsSlots` rejects multiple approvals reserved for the same date/time slot, including an already-published row plus a still-approved row. Delayed retries cannot release two stories assigned to one slot.
- GitHub Actions `schedule` is still **best effort**, not a guaranteed time service. The extra triggers reduce single-event dependence, but do not establish an exact 09:00/18:00 SLA or production publication evidence.
- Do not add an outside scheduler with GitHub write credentials or move the existing 20:00 evergreen workflow without separate security review.


## 2026-10-18: missed-slot and stale-news publication boundary

For every scheduled or delayed manual recovery run, `publish-news-queue.mjs` now
selects an approval only if its immutable `scheduledAtJst` matches the **current
Japan calendar day and active clock slot**: 09:00 between 09:00 and 17:59 JST,
18:00 from 18:00 until 23:59 JST. An 18:xx retry does not publish a missed
09:00 article; a next-day retry does not backfill yesterday's approval.
The missed row remains explicitly owner-approved but **unpublished**, requiring
a separate human decision and new immutable schedule if its newsworthiness
persists. This is especially important for time-sensitive AI news.

The two-per-day quota, one per originally approved slot, source/artwork SHA
checks and manual owner approval remain mandatory. Passing a synthetic integration
test does not establish a live Production publication. Do not change historical
approval dates to force a backfill.
