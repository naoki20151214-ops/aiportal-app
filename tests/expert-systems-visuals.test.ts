import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.webp",
  "fig-01-architecture.webp",
  "fig-02-knowledge-base.webp",
  "fig-03-inference-engine.webp",
  "fig-04-applications.webp",
  "fig-05-knowledge-engineering.webp",
];

test("エキスパートシステムは教科書水準の本文と6画像を持ち、reviewのまま", () => {
  const articlePath = path.join(process.cwd(), "content/articles/expert-systems.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /status: "review"/);
  assert.match(article, /thumbnail: "\/images\/articles\/expert-systems\/hero\.webp"/);
  assert.ok(article.length >= 9000, "expert-systems article is too short");

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/expert-systems", filename);
    assert.ok(existsSync(asset), `missing expert systems visual: ${filename}`);
    assert.ok(statSync(asset).size > 30_000, `expert systems visual unexpectedly small: ${filename}`);
    assert.match(article, new RegExp(`/images/articles/expert-systems/${filename.replace(".", "\\.")}`));
  }
});
