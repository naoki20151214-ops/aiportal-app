import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

test("BAS-0023 editorial approval has a source and published Registry state", () => {
  const ledger = parse(readFileSync("content/registry/article-approval-log.yml", "utf8"));
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const entry = ledger.approvals.find((x: {id: string}) => x.id === "BAS-0023");
  assert.ok(entry);
  assert.equal(entry.approvedOn, "2026-10-13");
  assert.equal(entry.sourceArticleBlob, "6fbc815e7288d23d20bcd60e226245d5e87601ba");
  assert.equal(entry.illustrations, 5);
  assert.equal(entry.sourceRef, "draft/bas-0023-context-window-20261010");
  assert.equal(registry.nodes.find((x: {id: string}) => x.id === "BAS-0023")?.status, "published");
});
