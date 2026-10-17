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
