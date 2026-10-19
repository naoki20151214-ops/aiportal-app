// An auditable, cost-free provenance bridge between hourly RSS collection
// and any future AI journalism. This is NOT a claim verifier or an approval.
import {createHash} from "node:crypto";
import {safeUrl} from "./news-candidate-core.mjs";
import {assertShadowEditorialPolicy} from "./news-autonomous-shadow-core.mjs";

const ID=/^[a-f0-9]{24}$/;
const DATE_WINDOW_MS=48*3600*1000;
const MAX_TEXT=320;
function dateMs(value){
  if(typeof value!=="string"||value.length>45||!/^\d{4}-\d{2}-\d{2}T/.test(value))
    return NaN;
  return Date.parse(value);
}
function clean(value,max=MAX_TEXT){
  if(typeof value!=="string")return "";
  // Fetched HTML is untrusted. Do not promote page text to instructions or
  // reproduce full external articles. A brief excerpt is retained for review.
  return value.normalize("NFKC").replace(/[\u0000-\u001f\u007f<>]/g," ")
    .replace(/\s+/g," ").trim().slice(0,max);
}
function evidenceFingerprint(value){
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function sourceMap(sources){
  if(!Array.isArray(sources)||sources.length<1||sources.length>50)throw Error("Invalid RSS registry");
  const map=new Map();
  for(const source of sources){
    if(!source?.id || map.has(source.id) || !Array.isArray(source.allowedHosts) ||
       !source.allowedHosts.length)throw Error("Invalid official source record");
    map.set(source.id,source);
  }
  return map;
}
export function buildFreeResearchDossiers(shadow,evidence,sources,policy){
  assertShadowEditorialPolicy(policy);
  if(shadow?.schemaVersion!==1||shadow?.stage!=="private-autonomous-research-shortlist"||
     shadow.mode!=="shadow"||shadow.automaticDraftingEnabled!==false||
     shadow.automaticPublicationEnabled!==false||shadow.approvedNewsCount!==0||
     !Array.isArray(shadow.researchQueue) ||
     shadow.researchQueue.length>policy.maxResearchCandidatesPerRun||
     !Array.isArray(shadow.held) || shadow.held.length>100 ||
     evidence?.schemaVersion!==1 || evidence.status!=="editorial-evidence-only"||
     evidence.publishingEnabled!==false||evidence.editorialApprovals!==0 ||
     evidence.primaryClaimVerification!=="not-performed"||
     !Array.isArray(evidence.results)||evidence.results.length>100)
    throw Error("Invalid unapproved source dossier inputs");
  const registry=sourceMap(sources);
  const evidenceMap=new Map();
  for(const item of evidence.results){
    if(!ID.test(item?.candidateId??"")||evidenceMap.has(item.candidateId)||
       !registry.has(item.sourceId) || item.publicationEligible!==false ||
       !["retrieved-for-editorial-review","fetch-failed"].includes(item.status))
      throw Error("Untrusted or duplicate primary source evidence");
    evidenceMap.set(item.candidateId,item);
  }
  const visited=new Set(),dossiers=[],blocked=[];
  for(const row of shadow.researchQueue){
    if(!ID.test(row?.candidateId??"")||visited.has(row.candidateId) ||
       !registry.has(row.sourceId) ||
       row.researchStatus!=="needs-independent-source-research" ||
       row.publicationEligible!==false||row.claimVerification!=="not-performed" ||
       row.semanticFactCheck!=="not-performed"||
       !Array.isArray(row.holdReasons)||row.holdReasons.length!==0)
      throw Error("Research queue contains invalid or already-approved candidate");
    visited.add(row.candidateId);
    const src=registry.get(row.sourceId),e=evidenceMap.get(row.candidateId);
    const rssUrl=safeUrl(row.originalUrl,src.allowedHosts);
    if(!rssUrl || rssUrl!==row.originalUrl || !Number.isFinite(dateMs(row.rssPublishedAt)))
      throw Error("Source shortlist contains unsafe URL or date");
    if(!e){
      blocked.push({candidateId:row.candidateId,sourceId:row.sourceId,
        reason:"missing-primary-evidence",publicationEligible:false});
      continue;
    }
    if(e.sourceId!==row.sourceId||e.originalUrl!==row.originalUrl ||
       dateMs(e.rssPublishedAt)!==dateMs(row.rssPublishedAt)||
       e.rssTitle?.length>240)
      throw Error("Source citation does not match the RSS candidate identity");
    const reasons=[];
    if(e.status!=="retrieved-for-editorial-review"||
       e.claimVerification!=="not-performed" || e.editorialStatus!=="unreviewed")
      reasons.push("primary-html-not-retrieved-or-unreviewed");
    if(e.pageCoverage === "bounded-prefix-only")
      reasons.push("partial-primary-html-requires-full-human-reading");
    const redirectHosts=[...src.allowedHosts,...(src.redirectHosts||[])];
    const target=typeof e.finalUrl==="string"?safeUrl(e.finalUrl,redirectHosts):null;
    if(!target) reasons.push("untrusted-final-official-url");
    if(e.httpStatus!==200) reasons.push("primary-http-not-200");
    const pageTime=dateMs(e.pagePublishedAt),rssTime=dateMs(e.rssPublishedAt);
    if(!Number.isFinite(pageTime) || Math.abs(pageTime-rssTime)>DATE_WINDOW_MS)
      reasons.push("publisher-date-missing-or-mismatched");
    const excerpt=clean(e.leadExcerpt,MAX_TEXT);
    if(excerpt.length<40) reasons.push("insufficient-short-quote-for-claims");
    const headline=clean(e.headline,240);
    if(headline.length<10)reasons.push("missing-official-page-headline");
    const basis={
      candidateId:row.candidateId,sourceId:row.sourceId,
      originalUrl:row.originalUrl,finalOfficialUrl:target,
      rssPublishedAt:row.rssPublishedAt,pagePublishedAt:e.pagePublishedAt,
      headline,shortSourceExcerpt:excerpt,
    };
    if(reasons.length){
      blocked.push({candidateId:row.candidateId,sourceId:row.sourceId,
        reason:reasons,publicationEligible:false});
      continue;
    }
    dossiers.push({
      schemaVersion:1,kind:"official-html-metadata-evidence-not-verified-claims",
      ...basis,
      sourceSnapshotSha256:evidenceFingerprint(basis),
      quoteSourceUrl:target,
      quoteLimitCharacters:MAX_TEXT,
      quoteIsPublisherProvidedData:true,
      verifiedClaimIds:[],claimsVerified:false,independentFactCheck:"not-performed",
      humanReviewRequired:true,aiDraftEligible:false,publicationEligible:false,
      nextAction:"Independent original-source reading and claim-to-quote support checks",
    });
  }
  return {
    schemaVersion:1,stage:"private-free-source-dossiers",mode:"shadow",
    generatedAt:shadow.generatedAt,externalApiCalls:0,
    paidAiCalls:0,automaticDraftingEnabled:false,
    automaticPublicationEnabled:false,approvedNewsCount:0,
    disclaimer:"Publisher metadata/excerpts are NOT proof of any story claim. Human-reviewed claims are not created by this step.",
    summary:{evaluated:shadow.researchQueue.length,
      sourceDossiers:dossiers.length,blocked:blocked.length},
    dossiers,blocked,
  };
}
