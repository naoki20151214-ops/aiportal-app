import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const homepagePath = path.join(process.cwd(), "src/components/article-portal.tsx");
const homepage = readFileSync(homepagePath, "utf8");
const icons: Record<string, string> = {
  "archive-books.svg": "2f878ea928ef3d8a6496037e67111ae8db54dc08",
  "icon-search.svg": "21f4f0a2d8216ebf21ea25495cffc33d2efd2061",
  "icon-category.svg": "e52481a0679881c69fe375129e38164c833385a3",
  "icon-stars.svg": "a5fce35276b5f77136ae9fa5f2c7a0f00cdd116b",
};
const gitBlob = (data: Buffer) => createHash("sha1")
  .update("blob " + data.length + "\0").update(data).digest("hex");

test("latest five articles appear before the compact historical archive card", () => {
  assert.match(homepage, /const \[visibleCount, setVisibleCount\] = useState\(5\)/);
  const listStart = homepage.indexOf("filteredArticles.slice(0, visibleCount).map");
  const archiveStart = homepage.indexOf('<section aria-labelledby="archive-guide-title"');
  const sidebarStart = homepage.indexOf('<aside className=');
  assert.ok(listStart >= 0 && archiveStart > listStart, "Archive must be below latest article list");
  assert.ok(sidebarStart > archiveStart, "Archive is in the main content column");
  assert.match(homepage, /過去の記事から探す/);
  assert.match(homepage, /記事一覧を見る/);
  assert.match(homepage, /setVisibleCount\(\(count\) => count \+ 10\)/);
  assert.doesNotMatch(homepage, /これまでの記事を、まとめて探せます/);
});

test("archive illustration and three icons are original SVGs with accessible text alternatives", () => {
  for (const [name, expected] of Object.entries(icons)) {
    const content = readFileSync(path.join(process.cwd(), "public/images/ui", name));
    const text = content.toString("utf8");
    assert.equal(gitBlob(content), expected, "Unapproved alteration: " + name);
    assert.match(text, /viewBox="0 0 /);
    assert.match(text, /<title id="(?:t|title)">/);
    assert.match(text, /<\/svg>$/);
    assert.ok(homepage.includes("/images/ui/" + name), "Unreferenced icon: " + name);
  }
  assert.match(homepage, /alt=""/);
  assert.match(homepage, /aria-hidden="true"/);
  assert.match(homepage, /style=\{\{ color: "#fff" \}\}/);
});

test("quick category shortcuts still reach the filtered published archive", () => {
  assert.match(homepage, /encodeURIComponent\(name\)/);
  assert.match(homepage, /\/articles\?category=/);
  assert.match(homepage, /categoryCounts\.slice\(0, 3\)/);
  assert.match(homepage, /記事の多いカテゴリから探す/);
});
