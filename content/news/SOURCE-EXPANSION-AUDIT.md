# AI News: source expansion screening (2026-10-16)

Scope: candidates for future official news intake; NOT activated RSS feeds and
NOT approval to reproduce or publish third-party material.

## New source admission: AWS Artificial Intelligence Blog (2026-10-17)

- Owner: Amazon Web Services (AWS), publisher's own blog, not an RSS mirror.
- Official index: https://aws.amazon.com/blogs/machine-learning/
- Publisher-operated feed: https://aws.amazon.com/blogs/machine-learning/feed/
- Feed was reachable on 2026-10-17 as `application/rss+xml`; the publishing framework's crawler cannot render RSS XML and has **not** verified ingestion end-to-end. GitHub candidate workflow is the acceptance test.
- Actual publisher article checked: 2026-10-16, "Building trust in AI agents: A production-ready evaluation framework with Amazon Bedrock AgentCore", https://aws.amazon.com/blogs/machine-learning/building-trust-in-ai-agents-a-production-ready-evaluation-framework-with-amazon-bedrock-agentcore/
- Approved original URL host: `aws.amazon.com` only. No third-party host, wildcard, redirect exception, or feed converter.
- Editorial relevance: AI agents and their production reliability. The broad official AWS blog includes sales material and tutorials; inclusion in feed is **not** newsworthiness and does **not** approve publication.
- Rights: ingest only headline, canonical URL, timestamps, and bounded editorial excerpts. Do not republish AWS article prose, proprietary diagrams, screenshots, or AWS marks without a valid permission. Write an original Japanese summary with source attribution and an original illustration.
- Review gate: dates, facts, scope of case studies, and independent corroboration must be checked individually. Intake remains private and read-only; any item is `pending-primary-source-review`, never automatically released.
- Current scope: Exactly one new feed is activated; Anthropic, Meta, NVIDIA remain on HOLD pending feed/rights review.

## Source admission checks

Before adding a source to `content/news/sources.json`:

1. Confirm a stable official feed endpoint or an explicitly permitted alternative
   directly on the publisher's domain. Do not substitute an unaffiliated RSS mirror.
2. Record source owner, feed URL, allowed source hosts, vetted redirect-only hosts,
   feed type, update dates, and relevant terms of use.
3. Inspect an actual sample for date accuracy, freshness, useful AI relevance,
   marketing/customer-story noise, stable canonical URLs, and cross-domain redirects.
4. Verify retrieval succeeds with the strict existing URL policy; test redirect
   spoofing and response failure cases before merging.
5. Confirm rights for the intended use, especially if AI Portal later monetizes.
   Existence of an RSS feed does not imply unlimited reuse rights.
6. Keep candidate intake private and read-only; a feed does NOT replace editorial
   fact checking, human review or an independent news publication gate.

## Expansion backlog (pending; not part of active intake)

| Publisher | Official source page | Assessment as of 2026-10-16 | Decision |
| --- | --- | --- | --- |
| Anthropic | https://www.anthropic.com/news | Official newsroom confirmed; an official publisher-operated RSS endpoint has not been validated | HOLD: verify official feed and terms before enabling |
| Meta AI | https://ai.meta.com/blog/ | Official AI blog confirmed; an official stable publisher RSS endpoint has not been validated | HOLD: verify permitted syndication path and terms |
| NVIDIA | https://www.nvidia.com/en-us/about-nvidia/rss/ | Official RSS directory explicitly states its RSS use is restricted to non-commercial purposes | HOLD: do not configure feed for a potentially monetized site without clarifying permissions |

Do not add external RSS converters or unofficial third-party mirrors merely
to meet a source-count target. If no permitted feed exists, evaluate a separately
approved source-discovery approach that does not copy full articles or bypass site
terms. Recheck source policy when licensing and monetization circumstances change.

## Observed real-world redirect regression

The archived GitHub Actions run #38826645018 collected 18 **unverified**
candidates from five working sources (OpenAI 8, DeepMind 5,
Hugging Face 5) after one exact duplicate was removed. A DeepMind RSS item at
`https://deepmind.google/blog/introducing-gemini-4-argon`
redirects to Google's official `blog.google` domain. This is why the
source-specific `redirectHosts` distinction was introduced.

No existing or prospective headline is treated as a confirmed news report
merely because the source site returned HTML.

## 2026-10-18: China-model and AI-security official-page watchlist (manual only)

`content/news/editorial-source-watchlist.json` lists seven verified publisher pages.
These are manual discovery leads only: NOT active RSS feeds, permissions to crawl, or editorial approvals.

| Scope | Publisher | Official primary page | Intake decision |
| --- | --- | --- | --- |
| China models | DeepSeek | https://www.deepseek.com/en/news/ | Manual; RSS and rights unverified |
| China models | Qwen | https://qwen.ai/research | Manual; RSS and rights unverified. The old qwenlm.github.io blog states it is no longer updated |
| China models | Kimi | https://www.kimi.com/en/blog/ | Manual; RSS and rights unverified |
| China models | GLM / Z.ai | https://z.ai/blog/glm-5.2 | Manual primary article; official feed and index unverified |
| AI safety | Anthropic | https://www.anthropic.com/news | Manual; RSS and rights unverified |
| AI + cyber | Google Threat Intelligence | https://cloud.google.com/blog/topics/threat-intelligence | Official page links to a FeedBurner feed; not admitted to direct-host RSS allowlist |
| AI + cyber | Microsoft Security | https://www.microsoft.com/en-us/security/blog/ | Manual; RSS and rights unverified |

Editorial review must distinguish publisher claims from independent measurements. In cybersecurity, distinguish observed attacks, demonstrations, hypothetical risks and defensive advice. No text copying or automatic approval. The existing six RSS sources remain unchanged.

## 2026-10-19: Microsoft Security official RSS onboarding (PR review)

- **Goal**: broaden coverage of AI-enabled cyberattack, AI-agent risk and AI defense; not simply inflate irrelevant RSS counts.
- **Official publisher**: Microsoft Security Blog, https://www.microsoft.com/en-us/security/blog/
- **Publisher's feed**: https://www.microsoft.com/en-us/security/blog/feed/ (first-party URL under `www.microsoft.com`). Direct retrieval by a text-only browser yielded the `application/rss+xml` MIME type, but the browser could not render RSS as text; this alone is **not** end-to-end proof.
- **Editorial links**: only `www.microsoft.com` and `microsoft.com` (HTTPS, no auth, no arbitrary redirect host). Any RSS item pointing elsewhere is rejected by the existing URL gate.
- **Admission proof**: `scripts/probe-news-rss-source.mjs microsoft-security` in dedicated `verify-new-news-rss.yml` pull-request workflow, run in GitHub Actions with outbound network. Must pass HTTP status, RSS/Atom content type, bounded 2MB XML, nonempty parser items, trusted publisher article URLs and parseable item timestamps before main activation.
- **Relevance and rights**: do not automatically regard general malware/security stories as AI news. Intake collects publisher titles/URLs/dates only; no commercial republishing of Microsoft's text, images or marks. News claims, affected products/regions, observed vs hypothetical threats and original sources require independent editorial review and original summaries.
- **Quantity diagnosis**: `sourceResults[].feedEntries` is every item provided by that feed, `windowCandidates` is the subset eligible within 72 hours, and `excludedByReason` counts invalid URLs, short titles, undated/invalid dates, old items and future dates. Post-aggregation exact URL/title dedupe is separate. More feeds do not imply more **unique or verified** news.
- **Existing downstream ceiling**: `check-news-primary-pages.mjs` refuses more than 100 candidates per run; the feed importer itself does not limit individual feed item count except the 2MB XML response limit. When growth approaches 100, design an explicit bounded backlog or pagination with no silent dropping rather than disabling safeguards.
- **Live GitHub onboarding test**: [GitHub Actions #39203692042](https://github.com/naoki20151214-ops/aiportal-app/actions/runs/39203692042) completed **success** at 2026-10-19 14:17 JST. Verified `application/rss+xml`, 286190 bytes, 10 parsed entries, all 10 with allowed first-party article links and publication dates, 2 candidates within 168 hours. This is test-branch evidence, not a scheduled Production collection or proof of verified news.
- **Onboarding status**: PR onboarding probe passed. Full Verify Test/Lint/Build and first post-merge scheduled collection are distinct requirements. Do not report Production 7/7 or increased confirmed content until observed.

**Still on HOLD**: DeepSeek, Qwen, Kimi, GLM/Z.ai and Anthropic newsroom pages without verified publisher-operated RSS. The Google Threat Intelligence link points to FeedBurner rather than its first-party domain. NVIDIA's published RSS terms restrict non-commercial use, so do not add NVIDIA without rights clearance. arXiv operates official daily category feeds, but these are high volume research submissions rather than independently corroborated corporate AI news and could overflow the existing 100-candidate next-stage ceiling.

## 2026-10-19 | Three official-feed candidates for 7→10 expansion

This entry is **proposal evidence**, not proof of sustained delivery or article quality. Admit only after every source-specific live GitHub Actions probe and standard Verify Test/Lint/Build passes; then observe at least one scheduled intake from main.

| ID | Official publisher | First-party RSS endpoint | Editorial limit |
| --- | --- | --- | --- |
| `mit-ai` | MIT News, Artificial Intelligence topic | https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml | AI research announcements; verify institutional claims and avoid publishing full MIT text |
| `meta-engineering` | Engineering at Meta | https://engineering.fb.com/feed/ | Relevant ML/AI engineering only; infrastructure and advertising items are not automatically relevant |
| `cloudflare-blog` | Cloudflare Blog | https://blog.cloudflare.com/rss/ | Workers AI, AI agent security, inference and model infrastructure only; reject unrelated networking/security posts |

- MIT officially links the selected topic feed in https://news.mit.edu/rss . MIT's terms at https://news.mit.edu/terms-of-use discuss attribution and restrict image use. **Do not reprint its article copy or original images**; link to originals and write independent summaries with original graphics.
- Meta Engineering's official site links to RSS; Cloudflare's publisher-hosted RSS endpoint returns RSS XML. The XML was not yet ingested and validated by the GitHub runtime at the time of proposing these URLs.
- All three source domains are exact HTTPS allowlists. No third-party mirror, wildcard or unsafe redirect introduced. The existing per-feed 2MB limit, 72-hour default, deduplication and downstream 100-candidate ceiling are unchanged.
- All collected metadata stays `pending-primary-source-review`, non-public and never an article approval. The existing 2-news/day safety phase is unchanged. First-party feeds **do not authorize commercial copying or bypass editorial or copyright checks**.
- **Validation procedure:** `verify-new-news-rss.yml` probes each new source independently for HTTP/XML/size bounds, at least one parsed item, first-party article URL and publication timestamp; source-specific pass/fail evidence is retained in 14-day private artifacts. GitHub Verify must pass Test/Lint/Build on the final PR SHA. After merge, a scheduled intake must demonstrate actual run behavior; success of PR probes alone is not sustained reliability.
