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
- Keep `ready` separate from `published`; request explicit production approval before publication and preserve previously approved content.
