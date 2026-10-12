import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { readArticles } from "../src/lib/article-content";

test("公開記事にサンプル表記や仮本文が残っていない", () => {
  const directory = path.join(process.cwd(), "content/articles");
  const articles = readArticles(directory);
  assert.equal(articles.length, 19);
  for (const article of articles) {
    const content = [article.title, article.description, article.content].join("\n");
    assert.doesNotMatch(content, /サンプル記事|本文は仮|正式な解説や具体的な活用例は今後追加/);
    assert.doesNotMatch(content, /["']サンプル["']/);
    assert.ok(article.content.length >= 1800, `${article.slug} の本文が短すぎます`);
  }
});

test("トップページにダミーリンクや旧ダミーランキングが残っていない", () => {
  const portal = readFileSync(path.join(process.cwd(), "src/components/article-portal.tsx"), "utf8");
  assert.doesNotMatch(portal, /href=["']#["']/);
  assert.doesNotMatch(portal, /アクセスランキング|Claude 3\.5 Sonnet|Googleの最強AIモデル/);
  assert.match(portal, /おすすめ記事/);
});

test("公開前に必要な案内ページが存在する", () => {
  for (const route of ["about", "privacy", "terms", "advertising", "contact"]) {
    assert.ok(existsSync(path.join(process.cwd(), "src/app", route, "page.tsx")), `/${route} がありません`);
  }
  const monetization = readFileSync(path.join(process.cwd(), "src/config/monetization.ts"), "utf8");
  assert.match(monetization, /policyUrl:\s*"\/advertising"/);
});
