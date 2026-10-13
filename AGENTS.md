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
- `ready` is a technical preparation state, **not** user acceptance. Once the site owner says `合格`, treat that as production publication authorization **in the same request**: stage the unchanged approved article/assets, record `decision: approved-for-publication` in `content/registry/article-approval-log.yml` on main, and let `publish-approved.yml` automatically validate and publish. **Never ask for a separate publication approval.**
- Confirm the article is `published` on main and that Cloudflare Production deployment succeeded. If prerequisites or safety checks block publication, report the blocked article and reason without re-requesting permission.
