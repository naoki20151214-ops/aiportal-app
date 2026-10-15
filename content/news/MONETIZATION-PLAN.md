# AI Portal: AI News monetization plan (proposal, not live offers)

Goal: cultivate trust and repeat readers through reported official AI news and textbook-style evergreen content. Earn revenue from a reader's voluntary next action, **not from hiding editorial judgment behind sponsorship**.

## Priority 1: news → learning → practical independent selection (no commerce needed at launch)
1. News briefs introduce a timely problem and point to 2–3 **published** background lessons.
2. Relevant background lessons may eventually point to clearly labeled applied tutorials, comparisons and legitimate approved partner offers.
3. Distinguish free/product-paid capabilities and include effective dates and original pricing/terms sources. Do not fabricate discount, earnings, benefit or product-availability claims.
4. No automatic affiliate links, indiscriminate banner placement, or third-party ad snippets at launch.

## Priority 2: approved-partner affiliate opportunities
Potential future categories: coding assistants, AI training courses, productivity tools for business, cloud/API education. Only *actually approved programs for AI Portal* may supply links. Never infer Semicon Campus approvals automatically transfer to a different publisher/site. Review commissions and cancellation terms regularly and disclose prominently in Japanese ("広告", "PR", "アフィリエイト"). No recommendation ranking based solely on payout.

## Priority 3: direct sponsorship after audience quality is demonstrated
Potential offerings: weekly newsletter sponsorship or clearly labeled themed education series. Keep sponsor creative outside factual news and give editorial editors an unconditional right to refuse or correct claims. Do not disguise sponsorship as independent reporting.

## Priority 4: privacy-respecting owned audience
A free weekly AI learning digest could collect opted-in subscribers via a separately reviewed signup workflow. Never auto-email, build mailing lists without opt-in or connect third-party marketing SDKs in Phase 1. Paid guides or courses should only be considered after recurring readership and willingness-to-pay signals exist.

## KPIs (no invented targets)
- Search Console: impressions, organic clicks and queries by /news and /articles.
- GA4: news page views, returning reader rate, news-to-learning click-through, learning-to-practice click-through.
- Revenue: approved-partner outbound clicks, qualified conversions, net revenue and user complaints.
- Editorial trust: corrections, source errors, unverifiable-story rejection rate and ad disclosure coverage.
Only evaluate actual measured numbers; no RPM or earning forecasts without traffic, offer conditions and conversion inputs.

## Technical advertising policy
Existing src/config/monetization.ts declares empty displayAds and affiliateCampaigns, and getMonetizationFlags blocks ads unless opted in. Do not change those defaults.
No indiscriminate advertising: every future placement needs a relevance rationale and must preserve the readability and correctness of the learning site.
