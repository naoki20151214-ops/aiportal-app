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
