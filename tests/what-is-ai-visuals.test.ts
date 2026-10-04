import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const visualDir = path.join(process.cwd(), "public/images/articles/what-is-ai");
const expected = [
  "hero.jpg",
  "hierarchy.jpg",
  "program-vs-ml.jpg",
  "system-structure.jpg",
  "strengths-limitations.jpg",
  "ai-map.jpg",
];

test("AIとは何か？の採用ビジュアル6枚が存在し、記事から参照される", () => {
  const article = readFileSync(path.join(process.cwd(), "content/articles/what-is-ai.md"), "utf8");

  for (const filename of expected) {
    const file = path.join(visualDir, filename);
    assert.ok(existsSync(file), `missing visual: ${filename}`);
    assert.ok(statSync(file).size > 20_000, `visual too small: ${filename}`);
    assert.match(article, new RegExp(`/images/articles/what-is-ai/${filename.replace(".", "\\.")}`));
  }

  assert.match(article, /thumbnail: "\/images\/articles\/what-is-ai\/hero\.jpg"/);
});
