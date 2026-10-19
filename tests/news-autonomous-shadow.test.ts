import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {buildAutonomousResearchQueue,assertShadowEditorialPolicy}
  from "../scripts/news-autonomous-shadow-core.mjs";

const registry=JSON.parse(readFileSync("content/news/sources.json","utf8")).sources;
const policy=JSON.parse(readFileSync("content/news/autonomous-editorial-policy.json","utf8"));
const now=new Date("2026-10-19T12:00:00.000Z");
const id=(n:number)=>n.toString(16).padStart(24,"0");
const good=(n=1)=>({
 candidateId:id(n),
 sourceId:"openai",
 originalUrl:"https://openai.com/index/official-model-release-"+n,
 rssTitle:"OpenAI announces latest model capability",
 rssPublishedAt:"2026-10-19T10:00:00.000Z",
 retrievalStatus:"retrieved-for-editorial-review",
 retrievalFailureReason:null,
 topicHints:["model-or-release"],
 dateNeedsReview:false,
 relevanceNeedsReview:true,importanceNeedsReview:true,accuracyNeedsReview:true,
 historicalMatches:[],historicalMatchNeedsReview:false,
 rejectedHistoricalMatchNeedsReview:false,possibleDuplicateIds:[],
 editorialDecision:"unreviewed",publicationEligible:false,
});
const triage=(items:ReturnType<typeof good>[])=>({
 schemaVersion:1,stage:"private-editorial-triage",
 publishingEnabled:false,newsApprovedCount:0,items,
});

test("Owner-directed goal remains SHADOW; no model-generated owner approval",()=>{
 assert.equal(assertShadowEditorialPolicy(policy).mode,"shadow");
 assert.equal(policy.automaticDraftingEnabled,false);
 assert.equal(policy.automaticPublicationEnabled,false);
 assert.match(policy.ownerDirection,/owner approves the goal/);
 assert.ok(policy.mandatoryFutureGates.some((x:string)=>x.includes("Multi-pass")));
 const altered={...policy,automaticPublicationEnabled:true};
 assert.throws(()=>assertShadowEditorialPolicy(altered),/shadow state/);
 assert.throws(()=>assertShadowEditorialPolicy({...policy,mode:"live"}),/shadow state/);
});

test("Official, dated and nonduplicate candidate can enter RESEARCH only, not publication",()=>{
 const result=buildAutonomousResearchQueue(triage([good()]),registry,policy,now);
 assert.equal(result.summary.sourceCount,10);
 assert.equal(result.summary.researchCandidates,1);
 assert.equal(result.summary.held,0);
 assert.equal(result.researchQueue[0].researchStatus,"needs-independent-source-research");
 assert.equal(result.researchQueue[0].claimVerification,"not-performed");
 assert.equal(result.researchQueue[0].semanticFactCheck,"not-performed");
 assert.equal(result.researchQueue[0].publicationEligible,false);
 assert.equal(result.approvedNewsCount,0);
 assert.equal(result.automaticPublicationEnabled,false);
 assert.ok(!("approvedBy" in result.researchQueue[0]));
 assert.ok(!("articleMarkdown" in result.researchQueue[0]));
});

test("403, ambiguous dates, old stories and historical/rejected duplicates are held",()=>{
 const blocked={...good(2),retrievalStatus:"fetch-failed",retrievalFailureReason:"http-403"};
 const undated={...good(3),dateNeedsReview:true};
 const old={...good(4),rssPublishedAt:"2026-10-14T11:00:00.000Z"};
 const rejected={...good(5),historicalMatchNeedsReview:true,
   historicalMatches:[{id:"NEWS-0093",status:"rejected"}],
   rejectedHistoricalMatchNeedsReview:true};
 const similar={...good(6),possibleDuplicateIds:[id(7)]};
 const result=buildAutonomousResearchQueue(triage([blocked,undated,old,rejected,similar]),registry,policy,now);
 assert.equal(result.summary.researchCandidates,0);
 assert.equal(result.summary.held,5);
 assert.deepEqual(result.held.find((x:{candidateId:string})=>x.candidateId===id(2))?.holdReasons,["primary-page-unavailable"]);
 assert.ok(result.held.find((x:{candidateId:string})=>x.candidateId===id(3))?.holdReasons.includes("official-date-needs-review"));
 assert.ok(result.held.find((x:{candidateId:string})=>x.candidateId===id(4))?.holdReasons.includes("outside-freshness-window"));
 assert.ok(result.held.find((x:{candidateId:string})=>x.candidateId===id(5))?.holdReasons.includes("historical-or-rejected-topic-overlap"));
 assert.ok(result.held.find((x:{candidateId:string})=>x.candidateId===id(6))?.holdReasons.includes("possible-semantic-duplicate"));
 assert.ok(result.held.every((x:{publicationEligible:boolean})=>x.publicationEligible===false));
});

test("Queue is limited for research cost only; 7 items => 6 research, 1 not lost",()=>{
 const report=buildAutonomousResearchQueue(triage(Array.from({length:7},(_,i)=>good(i+1))),registry,policy,now);
 assert.equal(report.summary.candidates,7);
 assert.equal(report.researchQueue.length,6);
 assert.equal(report.held.length,1);
 assert.equal(report.held[0].researchStatus,"deferred-research-capacity");
 assert.equal(report.held[0].publicationEligible,false);
 assert.equal(report.automaticPublicationEnabled,false);
 const empty=buildAutonomousResearchQueue(triage([]),registry,policy,now);
 assert.equal(empty.summary.researchCandidates,0);
});

test("Reject malformed or secretly preapproved input; never trust RSS links outside publisher",()=>{
 const x=good();
 for(const item of [
  {...x,publicationEligible:true},
  {...x,editorialDecision:"draft-ready"},
  {...x,accuracyNeedsReview:false},
  {...x,originalUrl:"https://openai.com.attacker.example/article"},
  {...x,sourceId:"unlisted"},
 ]){
  assert.throws(()=>buildAutonomousResearchQueue(triage([item]),registry,policy,now),
    /Untrusted|outside/);
 }
 assert.throws(()=>buildAutonomousResearchQueue(triage([good(),good()]),registry,policy,now),
   /Untrusted/);
 assert.throws(()=>buildAutonomousResearchQueue({...triage([good()]),publishingEnabled:true},registry,policy,now),
   /Invalid nonpublic/);
});

test("Live RSS workflow shortlists privately without model call or publication rights",()=>{
 const wf=parse(readFileSync(".github/workflows/news-candidates.yml","utf8"));
 const steps=wf.jobs.collect.steps as Array<{run?:string;with?:{path?:string}}>;
 assert.equal(wf.permissions.contents,"read");
 assert.ok(steps.some(x=>x.run==="node scripts/news-autonomous-shadow.mjs"));
 assert.ok(steps.some(x=>x.with?.path==="artifacts/news-autonomous-research-shadow.json"));
 assert.ok(!steps.some(x=>/generate-private-news-draft.mjs --execute|publish-news-queue.mjs --apply/.test(x.run||"")));
 const cli=readFileSync("scripts/news-autonomous-shadow.mjs","utf8");
 const core=readFileSync("scripts/news-autonomous-shadow-core.mjs","utf8");
 assert.ok(!/OPENAI_API_KEY|api.openai.com|git push|approvedBy:\s*"site-owner"/.test(cli+core));
 assert.ok(!/content\/articles\/|content\/news\/news-approval-queue\.yml/.test(cli));
});
