import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.webp",
  "chapter-01.webp",
  "chapter-02.webp",
  "chapter-03.webp",
  "chapter-04.webp",
  "chapter-05.webp",
];

test("AIの歴史は採用済み6画像を持ち、reviewのまま公開されない", () => {
  const article = readFileSync(path.join(process.cwd(), "content/articles/ai-history.md"), "utf8");

  assert.match(article, /status: "review"/);
  assert.match(article, /thumbnail: "\/images\/articles\/ai-history\/hero\.webp"/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/ai-history", filename);
    assert.ok(existsSync(asset), `missing AI history visual: ${filename}`);
    assert.ok(statSync(asset).size > 200_000, `AI history visual unexpectedly small: ${filename}`);
    assert.match(
      article,
      new RegExp(`/images/articles/ai-history/${filename.replace(".", "\\.")}`),
    );
  }
});
