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


test("every recorded completed publication is finalized while dependency-blocked approvals stay pending", () => {
  const ledger = parse(readFileSync("content/registry/article-approval-log.yml", "utf8"));
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const byId = new Map<string, {status: string; slug: string}>(
    registry.nodes.map((node: {id: string; status: string; slug: string}) => [node.id, node] as const)
  );
  for (const approval of ledger.approvals) {
    const node = byId.get(approval.id);
    assert.ok(node, "Unknown approval: " + approval.id);
    assert.equal(approval.slug, node.slug, "Approval slug mismatch: " + approval.id);
    if (node.status === "published") {
      assert.equal(approval.decision, "published", "Not finalized: " + approval.id);
      assert.match(approval.publishedOn, /^\d{4}-\d{2}-\d{2}$/, "Missing publication date: " + approval.id);
      assert.ok(approval.approvedOn <= approval.publishedOn);
    } else {
      assert.equal(approval.decision, "approved-for-publication", "Unpublished approval should remain pending");
      assert.equal(approval.publishedOn, undefined, "Unpublished article cannot have a publication date");
    }
  }
  const pending = ledger.approvals.find((item: {id: string}) => item.id === "BAS-0033");
  assert.equal(pending.decision, "approved-for-publication");
  assert.equal(byId.get("BAS-0032")?.status, "review");
  const approvedTransformer = ledger.approvals.find((item: {id: string}) => item.id === "BAS-0017");
  assert.equal(approvedTransformer.sourceArticleBlob, "48d7f9a1e0c3158d4c9326585852436e2ca6d934");
  assert.equal(approvedTransformer.illustrations, 7);
});
