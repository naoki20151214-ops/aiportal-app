import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const slugs = ["ai-history","symbolic-ai","expert-systems","what-is-machine-learning","statistical-machine-learning","train-validation-test-split","hyperparameters","probability-for-ai","what-is-deep-learning"];

test("Day 1残り9記事はアイキャッチ1枚＋本文図5枚を持つ", () => {
  for (const slug of slugs) {
    const article = readFileSync(path.join(process.cwd(), "content/articles", `${slug}.md`), "utf8");
    assert.match(article, /status: "review"/);
    assert.match(article, new RegExp(`thumbnail: "/images/articles/${slug}/hero\\.svg"`));
    for (const name of ["hero.svg", "fig-1.svg", "fig-2.svg", "fig-3.svg", "fig-4.svg", "fig-5.svg"]) {
      const asset = path.join(process.cwd(), "public/images/articles", slug, name);
      assert.ok(existsSync(asset), `missing visual: ${slug}/${name}`);
      assert.match(article, new RegExp(`/images/articles/${slug}/${name.replace(".", "\\.")}`));
    }
  }
});
