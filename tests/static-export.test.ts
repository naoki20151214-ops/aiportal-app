import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, type TestContext } from "node:test";
import { normalizeStaticExport } from "../scripts/normalize-static-export.mjs";

function fixture(t: TestContext) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "aiportal-static-export-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("aiportal-static-export-"));
    rmSync(directory, { recursive: true });
  });
  const write = (name: string, content: string) => {
    const filename = path.join(directory, name);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, content);
    return filename;
  };
  return { directory, write };
}

test("Windowsの階層化されたRSCを先読みURLと同じ名前に直し、内容と記事URLを保つ", (t) => {
  const { directory, write } = fixture(t);
  const nested = write("articles/apple-intelligence-update/__next.articles/$d$slug/__PAGE__.txt", "article payload");
  write("__next.foo/bar/__PAGE__.txt", "root payload");
  const html = write("articles/apple-intelligence-update.html", "article HTML");
  const image = write("images/article-placeholder.svg", "image");
  assert.equal(normalizeStaticExport(directory), 2);
  assert.equal(readFileSync(path.join(directory, "articles/apple-intelligence-update/__next.articles.$d$slug.__PAGE__.txt"), "utf8"), "article payload");
  assert.equal(readFileSync(path.join(directory, "__next.foo.bar.__PAGE__.txt"), "utf8"), "root payload");
  assert.equal(readFileSync(html, "utf8"), "article HTML");
  assert.equal(readFileSync(image, "utf8"), "image");
  assert.equal(existsSync(nested), false);
  assert.equal(normalizeStaticExport(directory), 0);
});

test("Linuxの正しいRSCファイル名と他の静的ファイルは変更しない", (t) => {
  const { directory, write } = fixture(t);
  const flat = write("articles/example/__next.articles.$d$slug.__PAGE__.txt", "flat payload");
  const unrelated = write("images/nested/notes.txt", "unrelated");
  assert.equal(normalizeStaticExport(directory), 0);
  assert.equal(readFileSync(flat, "utf8"), "flat payload");
  assert.equal(readFileSync(unrelated, "utf8"), "unrelated");
});

test("RSCファイル名が衝突した場合は既存ペイロードを上書きせず停止する", (t) => {
  const { directory, write } = fixture(t);
  const nested = write("example/__next.foo/bar/__PAGE__.txt", "nested payload");
  const flat = write("example/__next.foo.bar.__PAGE__.txt", "existing payload");
  assert.throws(() => normalizeStaticExport(directory), /collision/);
  assert.equal(readFileSync(nested, "utf8"), "nested payload");
  assert.equal(readFileSync(flat, "utf8"), "existing payload");
});
