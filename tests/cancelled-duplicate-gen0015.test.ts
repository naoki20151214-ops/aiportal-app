import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

const registry = () => parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
const ledger = () => parse(readFileSync("content/registry/article-approval-log.yml","utf8"));

test("Cancelled duplicate GEN-0015 cannot be scheduled or rendered, and the withdrawal is recorded", () => {
  const r=registry(),l=ledger();
  const records=parse(readFileSync("content/registry/retired-article-nodes.yml","utf8"));
  const retired=records.retirements.find((n:{id:string})=>n.id==="GEN-0015");
  assert.ok(retired);
  assert.equal(retired.canonicalArticleId,"BAS-0030");
  assert.equal(retired.cancelledPublishOn,"2026-10-16");
  assert.equal(retired.originalQueuedPR,161);
  assert.equal(r.nodeCount,500);
  assert.equal(r.nodes.some((x:{id:string})=>x.id==="GEN-0015"),false);
  assert.equal(l.approvals.some((x:{id:string})=>x.id==="GEN-0015"),false);
  assert.ok(!existsSync("content/articles/multimodal-ai.md"));
  assert.ok(!existsSync("content/editorial-audits/GEN-0015.yml"));
  assert.ok(!existsSync("public/images/articles/multimodal-ai/hero.svg"));
  assert.equal(r.nodes.find((x:{id:string})=>x.id==="BAS-0030")?.status,"published");
  assert.ok(existsSync("content/articles/what-is-multimodal.md"));
});

test("Cancelled node has no dangling prerequisite, related, curriculum or learning path references",()=>{
  const r=registry();
  for(const n of r.nodes) {
    for(const key of ["prerequisites","children","related"]) {
      assert.ok(!n[key].includes("GEN-0015"),`${n.id}.${key} refers to retired article`);
    }
    assert.ok(!(n.nextReading||[]).some((x:{id:string})=>x.id==="GEN-0015"));
  }
  for(const id of ["GEN-0016","GEN-0017","GEN-0018","GEN-0057","GEN-0058"]) {
    const n=r.nodes.find((x:{id:string})=>x.id===id);
    assert.ok(n);
    assert.ok(n.prerequisites.includes("BAS-0030"));
  }
  const core=parse(readFileSync("content/registry/core-curriculum.yml","utf8"));
  assert.equal(core.targetArticleCount,100);
  assert.equal(core.days[3].nodes.includes("GEN-0015"),false);
  assert.equal(core.days[3].nodes.includes("GEN-0018"),true);
  for(const day of core.days)assert.equal(day.nodes.length,10);
  const paths=parse(readFileSync("content/registry/learning-paths.yml","utf8"));
  assert.ok(paths.paths.every((p:{nodes:string[]})=>!p.nodes.includes("GEN-0015")));
});

test("GEN-0013 and GEN-0016 dates, source SHA and 20:00 scheduler remain unchanged",()=>{
  const r=registry(),l=ledger();
  assert.equal(r.nodes.filter((n:{status:string})=>n.status==="published").length,48);
  const ready=r.nodes.filter((n:{status:string})=>n.status==="ready");
  assert.deepEqual(ready.map((n:{id:string})=>n.id),["GEN-0013","GEN-0016"]);
  const queued=l.approvals.filter((a:{decision:string})=>a.decision==="approved-for-publication");
  assert.deepEqual(queued.map((a:{id:string})=>a.id),["GEN-0013","GEN-0016"]);
  assert.equal(queued[0].publishOn,"2026-10-15");
  assert.equal(queued[1].publishOn,"2026-10-17");
  assert.equal(queued[1].sourceArticleBlob,"2a66370de26499381a8b4ffe9acf451207a5419e");
  assert.match(readFileSync(".github/workflows/publish-approved.yml","utf8"),/cron: '0 11 \* \* \*'/);
});
