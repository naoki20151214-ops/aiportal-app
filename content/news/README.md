# AI Portal AI News: Phase 1 + private Phase 2 review evidence

**News intake and private official-page evidence are not fact-checking, approval, article drafting or publishing.**

- Curated official feed allowlist: content/news/sources.json
- Safe URLs, time-window checks and URL/title exact duplicate filtering: scripts/news-candidate-core.mjs
- Read-only fetch/parse step: scripts/collect-news-candidates.mjs
- Private candidate JSON: artifacts/news-candidates.json (GitHub Actions artifact, no git commit)
- Bounded primary-page fetch: scripts/check-news-primary-pages.mjs, scripts/news-primary-source-core.mjs
- Private review evidence JSON: artifacts/news-primary-evidence.json (GitHub Actions artifact, no git commit)
- Independent daily candidate intake: .github/workflows/news-candidates.yml (22:00 UTC, around 07:00 Japan time)
- Public /news: links exclusively to previously published news articles; article pages show "このニュースを理解するための基礎知識" links to already published lessons.

## Non-publication guarantee

RSS feeds can contain unverified titles, dates and claims. Storing a publisher headline is not journalistic verification. The intake does **not** copy article bodies, call an LLM, create Markdown, modify a Registry or approval ledger, push Git commits, or execute the evening learning-article workflow.

Before any news publication:
1. Read the original official URLs and check claim/date, relevant conditions, availability and impact.
2. Mark preprints as non-peer-reviewed unless independently proven otherwise.
3. Compare stories semantically with previously covered topics (Phase 1 does only exact URL/title dedup).
4. Apply a separately reviewed, news-specific editorial audit; if uncertain or no news, do not publish.
5. Implement independent JST clock gate, daily news quota and serial Git main push rules that cannot interrupt the existing learning schedule.

## Private primary-source review evidence

The candidate workflow optionally fetches the original official page via HTTPS with host-validated redirects, a 12-second timeout and a 384 KB byte ceiling. It records the page title, first heading, page-provided publication date, and at most 320 characters of a lead excerpt. Unsupported content types, missing page content, unsafe redirects and oversize pages are logged as fetch failures. It never copies complete article bodies.

A successfully retrieved page means only that a page could be opened. It does **not** establish that the RSS headline is correct, that any numerical claims have supporting evidence, that the feature is generally available, or that the event date matches the feed date. `claimVerification` remains `not-performed`, `editorialStatus` remains `unreviewed`, and `publicationEligible` is always false. Editors must review the original page, cross-check conditions, dates and claims and record the evidence before any separate news-publication workflow can be considered.

Even a complete failure of this step does not modify site content or the learning-article publication workflow. All evidence is private and retained as GitHub Actions artifacts for 14 days.

## Failures and review

An unavailable source is recorded as an error, never fabricated. If all sources fail, collection exits nonzero but the artifact is still uploaded. No live pricing, partner endorsements, sponsor placements or advertisement identifiers are configured. AI news pages are editorial-only during Phase 1; any future sponsored placement requires a relevance reason, visible PR/広告 label and an approved partner relationship.
