import assert from "node:assert/strict";
import { test } from "node:test";
import { approvalId, frontmatter, publishArticle, publishNode,
  imagePaths, articleLinks, updatePublicationTest } from "../scripts/editorial-release-core.mjs";

const source = [
  "---",
  'id: "BAS-9999"',
  'slug: "test-story"',
  'status: "ready"',
  'publishedAt: "2026-10-01"',
  'updatedAt: "2026-10-02"',
  'thumbnail: "/images/articles/test/hero.webp"',
  "---",
  "Story and ![figure](/images/articles/test/fig.svg).",
  "[Source](/articles/what-is-ai)",
  ""
].join("\n");
const registry = [
  "schemaVersion: 1",
  "nodes:",
  '  - id: "BAS-0001"',
  '    status: "published"',
  "    prerequisites: []",
  '  - id: "BAS-9999"',
  '    status: "ready"',
  '    prerequisites: ["BAS-0001"]',
  '  - id: "BAS-8888"',
  '    status: "ready"',
  '    prerequisites: ["BAS-9999"]',
  ""
].join("\n");

test("Approval must be explicit and scoped to exactly one article", () => {
  assert.equal(approvalId("/publish-approved BAS-9999"), "BAS-9999");
  for (const value of ["publish all", "/publish-approved BAS-9999 and others", "/publish-approved wrong"]) {
    assert.throws(() => approvalId(value));
  }
});
test("Publication preserves every byte of the accepted Markdown body", () => {
  assert.equal(frontmatter(source).status, "ready");
  const out = publishArticle(source, "2026-10-13");
  assert.equal(frontmatter(out).status, "published");
  assert.ok(out.endsWith(source.slice(source.indexOf("\n---", 4) + 4)));
  assert.deepEqual(imagePaths(source), ["public/images/articles/test/fig.svg","public/images/articles/test/hero.webp"]);
  assert.deepEqual(articleLinks(source), ["what-is-ai"]);
  assert.throws(() => publishArticle(out, "2026-10-13"), /Only review\/ready/);
});
test("Registry cannot publish before its prerequisites", () => {
  assert.match(publishNode(registry,"BAS-9999"), /id: "BAS-9999"\n    status: "published"/);
  assert.throws(() => publishNode(registry,"BAS-8888"), /Prerequisite not published/);
  assert.throws(() => publishNode(registry,"BAS-0001"), /already published/);
});
test("Published count advances exactly once", () => {
  const old = "  assert.equal(articles.length, 39);";
  const next = updatePublicationTest(old,"BAS-9999",39);
  assert.match(next,/articles.length, 40/);
  assert.throws(() => updatePublicationTest(next,"BAS-9999",39));
});
