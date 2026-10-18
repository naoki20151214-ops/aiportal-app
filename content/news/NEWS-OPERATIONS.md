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
