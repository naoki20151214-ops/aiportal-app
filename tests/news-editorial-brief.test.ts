import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {buildNewsEditorialBrief} from "../scripts/build-news-editorial-brief.mjs";

const candidate={
  candidateId:"0123456789abcdef01234567",
  sourceId:"deepmind",
  rssTitle:"New model <script>alert(1)</script> [malicious] | title",
  rssPublishedAt:"2026-10-18T00:00:00Z",
  originalUrl:"https://deepmind.google/blog/example",
  retrievalStatus:"retrieved-for-editorial-review",
  historicalMatchNeedsReview:true,
  historicalMatches:[{id:"NEWS-0093",status:"rejected"}],
  editorialDecision:"unreviewed",publicationEligible:false,
};
const triage={schemaVersion:1,stage:"private-editorial-triage",
  publishingEnabled:false,newsApprovedCount:0,items:[candidate]};

test("Editorial brief shows historical rejected-news flags, date and a clear nonapproval label",()=>{
  const text=buildNewsEditorialBrief(triage);
  assert.match(text,/NEWS-0093/);
  assert.match(text,/2026-10-18T00:00:00Z/);
  assert.match(text,/公開対象外/);
  assert.match(text,/人間が先に確認する項目/);
  assert.doesNotMatch(text,/<script|\[malicious\]|\| title/);
});

test("No candidate and untrusted status both fail safely",()=>{
  assert.match(buildNewsEditorialBrief({...triage,items:[]}),/候補なし/);
  assert.throws(()=>buildNewsEditorialBrief({...triage,newsApprovedCount:1}),/Untrusted/);
  assert.throws(()=>buildNewsEditorialBrief({...triage,items:[{...candidate,publicationEligible:true}]}),/Untrusted/);
  assert.throws(()=>buildNewsEditorialBrief({...triage,items:[{...candidate,editorialDecision:"approved"}]}),/Untrusted/);
});

test("Japanese brief is only a read-only artifact of twice-daily collection",()=>{
  const workflow=parse(readFileSync(".github/workflows/news-candidates.yml","utf8"));
  assert.equal(workflow.permissions.contents,"read");
  assert.deepEqual(workflow.on.schedule.map((x:{cron:string})=>x.cron),["0 22 * * *","0 7 * * *"]);
  const steps=workflow.jobs.collect.steps;
  assert.ok(steps.some((x:{run?:string})=>String(x.run).includes("build-news-editorial-brief.mjs")));
  assert.ok(steps.some((x:{with?:{path?:string}})=>x.with?.path==="artifacts/news-editorial-brief.md"));
  assert.ok(!steps.some((x:{run?:string})=>/git push|publish-news-queue.mjs --apply/.test(String(x.run||""))));
  const evergreen=readFileSync(".github/workflows/publish-approved.yml","utf8");
  assert.match(evergreen,/cron: '0 11 \* \* \*'/);
});

