import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {
  assessNewsImportance, prepareJapaneseDraftPacket, validateGeneratedJapaneseDraft,
} from "../scripts/news-draft-contract.mjs";

const candidateId="0123456789abcdef01234567";
const originalUrl="https://openai.com/index/independent-news";
const triageItem={
  candidateId, originalUrl, sourceId:"openai",
  retrievalStatus:"retrieved-for-editorial-review",
  editorialDecision:"unreviewed", publicationEligible:false,
};
const dimensions={
  readerImpact: {score:3, reason:"Readers may need to understand whether the announcement changes what they can use."},
  audienceBreadth: {score:2, reason:"The change could matter to multiple kinds of AI users and researchers."},
  genuineNovelty: {score:2, reason:"The verified statement describes a real change rather than a marketing recap."},
  practicalValue: {score:1, reason:"Readers can compare the documented availability before considering adoption."},
};
const review={
  schemaVersion:1, candidateId, originalUrl,
  decision:"draft-ready", reviewer:"Editorial Reviewer",
  reviewedAt:"2026-10-16T05:00:00.000Z",
  whyItMatters:"This reviewed update can affect which AI features readers consider using.",
  whatChanges:"The reviewed claim describes a change in official product availability.",
  headlineBeyond:"The original source explains how the capability differs beyond the advertised product name.",
  readerPayoff:"The reader can identify which official usage limitations to check after reading for a minute.",
  limitations:"Check the relevant countries, dates and account limitations before relying on availability.",
  checks:{
    originalRead:true, datesChecked:true, claimsChecked:true,
    limitationsChecked:true, duplicationChecked:true, independentContextConsidered:true,
  },
  priorityAssessment:dimensions,
  claims:[{
    statement:"The publisher reports a new AI capability, with documented usage constraints.",
    evidence:[{url:originalUrl,
      supportingExcerpt:"Official source excerpt checked by the editorial reviewer."}],
  }],
};

function jpDraft(){
  return {
    schemaVersion:1, candidateId,
    status:"unreviewed-japanese-draft", publicationEligible:false,
    title:"公式発表から見る新しいAI機能と利用条件",
    lead:{text:"AIの新機能が発表されました。ただし、利用できる条件を確認してから判断することが大切です。",claimIds:["C1"]},
    sections:{
      whatHappened:{text:"発表元は、新しいAI機能について説明しています。公式発表に記載された利用条件も確認が必要です。",claimIds:["C1"]},
      whyImportant:{text:"読者にとって重要なのは、機能の名前よりも、実際に使える範囲や条件を理解することです。",claimIds:["C1"]},
      whatChanges:{text:"利用できる機能や条件に変化がある可能性があります。具体的な対象を公式情報から確認してください。",claimIds:["C1"]},
      limitations:{text:"利用できる地域や契約などの条件については、発表元の説明を確認し、未確認事項を断定しないでください。",claimIds:["C1"]},
    },
  };
}

test("Human importance scoring is transparent, bounded, and never publication approval",()=>{
  const importance=assessNewsImportance(dimensions);
  assert.equal(importance.valid,true);
  if(!("score" in importance))throw Error("Expected human score");
  assert.equal(importance.score,8);
  assert.equal(importance.maximum,10);
  assert.equal(importance.suggestedQueue,"review-soon");
  assert.equal(importance.publicationEligible,false);
  assert.equal(importance.articleApproved,false);
  const low=Object.fromEntries(Object.entries(dimensions).map(([name,part])=>[name,{...part,score:0}]));
  const lowScore=assessNewsImportance(low);
  assert.equal(lowScore.valid,true);
  if(!("suggestedQueue" in lowScore))throw Error("Expected queue");
  assert.equal(lowScore.suggestedQueue,"low-priority-review");
  const invalid=assessNewsImportance({...dimensions,readerImpact:{score:4,reason:"too many points"}});
  assert.equal(invalid.valid,false);
});

test("No news packet can be made from unchecked editorial review or missing human priority",()=>{
  assert.throws(()=>prepareJapaneseDraftPacket({...review,checks:{...review.checks,claimsChecked:false}},triageItem),
    /Human evidence review incomplete/);
  assert.throws(()=>prepareJapaneseDraftPacket({...review,priorityAssessment:null},triageItem),
    /Importance assessment incomplete/);
  assert.throws(()=>prepareJapaneseDraftPacket(review,{...triageItem,retrievalStatus:"fetch-failed"}),
    /Human evidence review incomplete/);
  assert.throws(()=>prepareJapaneseDraftPacket(review,{...triageItem,originalUrl:"https://example.com/mismatch"}),
    /Human evidence review incomplete/);
});

test("Draft packet contains only reviewed claims, citations and explicit Japanese instructions",()=>{
  const packet=prepareJapaneseDraftPacket(review,triageItem);
  assert.equal(packet.type,"ai-news-private-japanese-draft-input");
  assert.equal(packet.claims.length,1);
  assert.equal(packet.claims[0].id,"C1");
  assert.equal(packet.claims[0].evidence[0].url,originalUrl);
  assert.equal(packet.publicationEligible,false);
  assert.equal(packet.humanJapaneseReviewRequired,true);
  assert.equal(packet.newsPublished,false);
  assert.equal(packet.context.readerPayoff,review.readerPayoff);
  assert.equal(packet.context.headlineBeyond,review.headlineBeyond);
  assert.match(packet.writingInstructions,/数値/);
  assert.match(packet.writingInstructions,/JSON/);
  assert.ok(!("rssTitle" in packet), "Unreviewed RSS headline must not appear as grounded claim");
});

test("Structurally grounded Japanese draft must STILL be manually fact checked",()=>{
  const packet=prepareJapaneseDraftPacket(review,triageItem);
  const verdict=validateGeneratedJapaneseDraft(jpDraft(),packet);
  assert.equal(verdict.valid,true);
  assert.equal(verdict.publicationEligible,false);
  assert.equal(verdict.humanReviewRequired,true);
  if(!("semanticFactCheck" in verdict))throw Error("Missing semantic qualification");
  assert.equal(verdict.semanticFactCheck,"not-performed");
  assert.equal(verdict.editorialStatus,"awaiting-human-japanese-review");
});

test("Unknown claim IDs, injected HTML, links, missing sections and publication attempts fail closed",()=>{
  const packet=prepareJapaneseDraftPacket(review,triageItem);
  const badClaim=jpDraft(); badClaim.sections.whatChanges.claimIds=["C999"];
  assert.equal(validateGeneratedJapaneseDraft(badClaim,packet).valid,false);
  const badLink=jpDraft(); badLink.sections.limitations.text="公式資料は https://unsafe.example です。必要な説明を追加してください。";
  assert.equal(validateGeneratedJapaneseDraft(badLink,packet).valid,false);
  const badHTML=jpDraft(); badHTML.title="<img onerror=alert(1)>公開ニュース";
  assert.equal(validateGeneratedJapaneseDraft(badHTML,packet).valid,false);
  const missing=jpDraft(); delete (missing.sections as Record<string,unknown>).whyImportant;
  assert.equal(validateGeneratedJapaneseDraft(missing,packet).valid,false);
  const published=jpDraft(); published.publicationEligible=true;
  assert.equal(validateGeneratedJapaneseDraft(published,packet).valid,false);
  const withAd={...jpDraft(),affiliate:"https://affiliate.example"};
  assert.equal(validateGeneratedJapaneseDraft(withAd,packet).valid,false);
  const wrong={...jpDraft(),candidateId:"ffffffffffffffffffffffff"};
  assert.equal(validateGeneratedJapaneseDraft(wrong,packet).valid,false);
});

test("News draft packet CLI is manual only; hourly read-only intake and 20:00 evergreen publisher stay separate",()=>{
  const cli=readFileSync("scripts/prepare-news-draft-packets.mjs","utf8");
  assert.ok(cli.includes("private-japanese-news-draft-packets"));
  assert.ok(!/git push|content\/articles\/|publish-approved|article-approval-log/.test(cli));
  const intake=parse(readFileSync(".github/workflows/news-candidates.yml","utf8"));
  assert.equal(intake.permissions.contents,"read");
  assert.equal(intake.on.schedule[0].cron,"0 0-14,22-23 * * *");
  assert.ok(!intake.jobs.collect.steps.some((s:{run?:string})=>/prepare-news-draft-packets/.test(String(s.run||""))));
  const pub=parse(readFileSync(".github/workflows/publish-approved.yml","utf8"));
  assert.equal(pub.on.schedule[0].cron,"0 11 * * *");
});
