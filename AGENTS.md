<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## AI Portal article production: mandatory no-duplicate gate
- Before writing ANY article, read `content/registry/knowledge-nodes.yml`, `content/registry/core-curriculum.yml` and `content/registry/article-production-workflow.md`.
- Obtain live GitHub inventory: `GITHUB_TOKEN=... npm run article:preflight -- BAS-0023` (substitute the real ID). Never interpret main `planned` as proof that no prior draft exists.
- If the command blocks for an article found in main, a retained draft/feat/preview branch or PR, STOP new drafting and reuse existing article, images and tests.
- For a PR importing a prior artifact, add `.github/article-reuse/<ID>.yml` with the exact original `sourceRef`. Never merge a preview-only PR.
- If GitHub cannot be scanned (no token, HTTP error, truncated tree), STOP; do not create an article on guesswork.
- **Editorial approval (合格) is ALSO authorization for production publication.** Never ask for another approval after an article is accepted. Maintain the technical `ready` → `published` transition, but perform it automatically after acceptance and tests.
- In the same turn as explicit article acceptance, safely put the approved article and its assets on main as `ready` and add `decision: "approved-for-publication"` with the article ID, slug, date, and trustworthy acceptance evidence to `content/registry/article-approval-log.yml`. The trusted `.github/workflows/publish-approved.yml` then promotes it to `published`, verifies Test/Lint/Build and pushes to main for Cloudflare Production.
- Existing `ready` **without a new explicit approval record** is NOT permission to publish; `review` is never approval. If a prerequisite, broken link or missing figure blocks the approved article, report that blocker and keep approval pending; do not request the same editorial approval again.
- Never merge `preview/*` PRs or unapproved release branches. After publication, check main SHA, deployment, and daily article inventory; preserve original text and images.
