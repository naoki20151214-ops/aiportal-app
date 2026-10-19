// AI Portal private autonomous-news RESEARCH shortlisting.
// This produces no facts, draft, owner approvals, registry writes or publication.
// RSS/page titles are UNTRUSTED DATA, never instructions or verified claims.
import {safeUrl} from "./news-candidate-core.mjs";

const ID_RE=/^[a-f0-9]{24}$/;
const TOPICS=new Set(["model-or-release","research","safety-or-policy","developer-tools","business-and-applications"]);
const MINUTE=60000;
const HOUR=60*MINUTE;

export function assertShadowEditorialPolicy(policy) {
  if(policy?.schemaVersion!==1 || policy?.mode!=="shadow" ||
     policy.automaticDraftingEnabled!==false ||
     policy.automaticPublicationEnabled!==false ||
     !Array.isArray(policy.mandatoryFutureGates) ||
     policy.mandatoryFutureGates.length<8 ||
     policy.maxResearchCandidatesPerRun!==6 ||
     policy.minResearchPriorityScore!==4 ||
     policy.lookbackHours!==72 ||
     policy.officialSourceRegistry!=="content/news/sources.json")
    throw Error("Autonomous news policy not in approved nonpublishing shadow state");
  return policy;
}
function cleanDate(s) {return typeof s==="string"&&Number.isFinite(Date.parse(s))?Date.parse(s):NaN;}
function sourceMap(sources) {
  if(!Array.isArray(sources)||sources.length===0||sources.length>50)throw Error("Invalid first-party RSS source list");
  const result=new Map();
  for(const s of sources){
    if(!s||typeof s.id!=="string"||result.has(s.id)||
       !Array.isArray(s.allowedHosts)||!s.allowedHosts.length||
       !/^(official-company|official-project|official-university)$/.test(s.kind||"")||
       ![1,2,3].includes(s.priority))throw Error("Untrusted official source");
    result.set(s.id,s);
  }
  return result;
}
export function buildAutonomousResearchQueue(triage,sources,policy,now=new Date()){
  assertShadowEditorialPolicy(policy);
  if(!(now instanceof Date)||!Number.isFinite(now.getTime())||
     triage?.schemaVersion!==1||triage?.stage!=="private-editorial-triage"||
     triage?.publishingEnabled!==false||triage?.newsApprovedCount!==0||
     !Array.isArray(triage.items)||triage.items.length>100)
    throw Error("Invalid nonpublic editorial triage");
  const bySource=sourceMap(sources);
  const uniqueIds=new Set(),items=[];
  for(const item of triage.items){
    if(!ID_RE.test(item?.candidateId??"")||uniqueIds.has(item.candidateId)||
       item.editorialDecision!=="unreviewed"||
       item.publicationEligible!==false||
       item.relevanceNeedsReview!==true||
       item.importanceNeedsReview!==true||item.accuracyNeedsReview!==true||
       !Array.isArray(item.topicHints) ||
       item.topicHints.some(t=>!TOPICS.has(t))||
       !Array.isArray(item.possibleDuplicateIds)||
       !Array.isArray(item.historicalMatches)||
       typeof item.originalUrl!=="string" ||
       typeof item.rssTitle!=="string" ||item.rssTitle.length>240||
       typeof item.sourceId!=="string" || !bySource.has(item.sourceId))
      throw Error("Untrusted or approved candidate in research queue");
    uniqueIds.add(item.candidateId);
    const src=bySource.get(item.sourceId);
    if(!safeUrl(item.originalUrl,src.allowedHosts))
      throw Error("Candidate URL outside official source");
    const when=cleanDate(item.rssPublishedAt);
    if(!Number.isFinite(when)) throw Error("Invalid RSS date for candidate");
    const age=now.getTime()-when;
    const reasons=[];
    if(age>policy.lookbackHours*HOUR||age < -5*MINUTE) reasons.push("outside-freshness-window");
    if(item.retrievalStatus!=="retrieved-for-editorial-review") reasons.push("primary-page-unavailable");
    if(item.dateNeedsReview!==false) reasons.push("official-date-needs-review");
    if(item.historicalMatchNeedsReview===true||item.historicalMatches.length>0)
      reasons.push("historical-or-rejected-topic-overlap");
    if(item.possibleDuplicateIds.length>0) reasons.push("possible-semantic-duplicate");
    if(!item.topicHints.length) reasons.push("unclassified-relevance");

    // Purely *work prioritization* based on source order, freshness and
    // coarse keyword classes. NEVER claim this score measures newsworthiness
    // or factual credibility: independent claim-by-claim review is missing.
    const freshness=age>=0 && age<=24*HOUR?3:age>=0 && age<=48*HOUR?2:1;
    const sourcePriority=src.priority===1?3:src.priority===2?2:1;
    const topics=item.topicHints.includes("model-or-release")?2:
      item.topicHints.includes("safety-or-policy")?2:
      item.topicHints.includes("research")?1:0;
    const score=Math.min(8,freshness+sourcePriority+topics);
    if(score<policy.minResearchPriorityScore)reasons.push("research-score-below-shortlist");
    items.push({
      candidateId:item.candidateId,sourceId:item.sourceId,
      originalUrl:item.originalUrl,rssPublishedAt:item.rssPublishedAt,
      sourcePriority:src.priority,
      workPriorityScore:score,
      workPriorityBasis:"source-order+freshness+topic-hints; not verified editorial importance",
      researchStatus:reasons.length?"hold-for-investigation":"needs-independent-source-research",
      holdReasons:reasons,claimVerification:"not-performed",
      semanticFactCheck:"not-performed",publicationEligible:false,
    });
  }
  const ready=items.filter(x=>x.holdReasons.length===0)
    .sort((a,b)=>b.workPriorityScore-a.workPriorityScore ||
      b.rssPublishedAt.localeCompare(a.rssPublishedAt) ||
      a.candidateId.localeCompare(b.candidateId));
  const researchQueue=ready.slice(0,policy.maxResearchCandidatesPerRun);
  const overflow=ready.slice(policy.maxResearchCandidatesPerRun).map(x=>({
    ...x,researchStatus:"deferred-research-capacity",
    holdReasons:["not-yet-investigated-capacity; NOT rejected"],
  }));
  const held=items.filter(x=>x.holdReasons.length).concat(overflow)
    .sort((a,b)=>a.candidateId.localeCompare(b.candidateId));
  return {
    schemaVersion:1,stage:"private-autonomous-research-shortlist",
    mode:"shadow",automaticDraftingEnabled:false,automaticPublicationEnabled:false,
    approvedNewsCount:0,generatedAt:now.toISOString(),
    disclaimer:"A retrieved page/headline cannot substantiate facts. Every candidate requires independent claim checks. No content or owner approval is generated.",
    summary:{candidates:items.length,researchCandidates:researchQueue.length,
      held:held.length,sourceCount:bySource.size},
    researchQueue,held,
  };
}
