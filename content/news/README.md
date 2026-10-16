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

## Official redirect host policy (2026-10-16)

RSS candidate URLs remain restricted to each publisher's `allowedHosts`.
`redirectHosts` is a separate, optional, explicitly vetted list used **only**
when fetching the original page and following an HTTP redirect. It does not
expand the RSS feed's trusted incoming URL domain. Each redirect remains HTTPS,
credential-free, port-free and domain-checked, with at most three hops.

Observed official example: DeepMind's `deepmind.google/blog/introducing-gemini-4-argon`
redirects to Google's official `blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/`.
DeepMind therefore allows only `blog.google` as an extra redirect target.
Never whitelist an arbitrary Google-associated third-party site or wildcard.
A successful fetch is **not** a verified news claim or proof of availability.

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

## Private editorial queue and quality gate (drafting only)

The intake now writes `artifacts/news-editorial-triage.json` as another private
GitHub Actions artifact. Its topic labels and lexical similarity hints help an
editor decide what to investigate; they are NOT semantic verification or final
importance rankings. Suggested duplicates are **not removed**. Missing page dates
and major RSS/page date discrepancies are flagged for manual review, not repaired
automatically.

The pure function `validateNewsEditorialReview` in
`scripts/news-editorial-gate.mjs` checks that an explicitly identified human
reviewer documented:

- The original official source was read, and publication date, key claims,
  availability/limitations and possible overlap were checked.
- Independent context was considered, including noting where no independent
  evidence could be found.
- A reader-focused explanation of why the story matters and what changes.
- Each proposed factual claim mapped to an HTTPS source URL and a short
  supporting passage, with at least one claim-to-source record.
- An explicit `draft-ready` decision. Claims must actually be checked by the
  human reviewer; the validator cannot verify that the quotation proves the
  claim.

Even when the mechanical checklist succeeds, it returns
`draftEligible: true` and **`publicationEligible: false`**.
No workflow consumes human approvals to draft or publish news yet. The next
stage must implement a separately audited news-writing and release mechanism.
The learning-article publication ledger and 20:00 JST quota remain unchanged.

## Drafting groundwork: human importance + Japanese source-bound packet

The manual-only contract in `scripts/news-draft-contract.mjs` is described in
[`JAPANESE-DRAFT-PIPELINE.md`](./JAPANESE-DRAFT-PIPELINE.md).
Named reviewers can add grounded 0–10 point editorial priority (impact,
audience breadth, novelty and practical value) with a written rationale
for every dimension. Priority is advisory; it is not automated acceptance.

After the existing human primary-source review gate passes, an optional
**manual** command `node scripts/prepare-news-draft-packets.mjs` creates
`artifacts/news-draft-packets.json` from private human review data.
It packages only the human-reviewed claim-to-source mappings and restrictive
Japanese writing instructions for a future language model. It does **not**
invoke a language model and does **not** produce Japanese articles today.

`validateGeneratedJapaneseDraft` provides a fail-closed structural
contract for a future model response, requiring citations to reviewed
claim IDs for the lead and every section. It cannot establish that the
generated Japanese is factually correct. Every generated draft will require
a separate human fact check and new independent release design.
Nothing in this stage modifies the daily RSS cron or the 20:00 JST
learning-article publication workflow.
