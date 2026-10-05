import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("読者向け本文へ内部IDやLEVEL管理表記を露出しない", () => {
  const dir = path.join(process.cwd(), "content/articles");
  const files = readdirSync(dir).filter((name) => name.endsWith(".md"));

  for (const filename of files) {
    const source = readFileSync(path.join(dir, filename), "utf8");
    const body = source.replace(/^---[\s\S]*?---\s*/, "");

    assert.doesNotMatch(
      body,
      /\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/,
      `internal registry id leaked into reader-facing copy: ${filename}`,
    );
    assert.doesNotMatch(
      body,
      /\b(?:LEVEL|Level)\s*[0-5]\b/,
      `internal level label leaked into reader-facing copy: ${filename}`,
    );
  }
});
