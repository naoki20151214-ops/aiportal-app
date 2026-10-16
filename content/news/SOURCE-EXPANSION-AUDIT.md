# AI News: source expansion screening (2026-10-16)

Scope: candidates for future official news intake; NOT activated RSS feeds and
NOT approval to reproduce or publish third-party material.

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
