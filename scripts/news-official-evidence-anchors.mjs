// Private citation *anchors* from first-party HTML already fetched by the
// bounded RSS evidence collector. Never use these as verified factual claims,
// LLM prompts, publication permissions, or a copy of a complete source page.
import {createHash} from "node:crypto";

export const MAX_PRIVATE_EXCERPTS=3;
export const MAX_EXCERPT_CHARS=170;
export const MAX_PARA_SCAN=80;
const sha=value=>createHash("sha256").update(value,"utf8").digest("hex");

const decode=value=>String(value).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(whole,item)=>{
  const key=item.toLowerCase();
  const known={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "};
  if(Object.hasOwn(known,key))return known[key];
  const radix=key.startsWith("#x")?16:10;
  const digits=key.startsWith("#x")?key.slice(2):key.slice(1);
  const number=Number.parseInt(digits,radix);
  return Number.isInteger(number)&&number>0&&number<=0x10ffff&&
    !(number>=0xd800&&number<=0xdfff)?String.fromCodePoint(number):" ";
});
const normalized=value=>decode(value)
  .replace(/[\u0000-\u001f\u007f\u200b-\u200d\ufeff]/g," ")
  .normalize("NFKC").replace(/\s+/g," ").trim();

export function extractOfficialTextAnchors(html){
  if(typeof html!=="string"||html.length>800000)
    throw Error("Untrusted official HTML input size");
  // Fail closed unless the publisher provides an article/main semantic region.
  // Matching the FIRST region is intentionally conservative (not an HTML DOM).
  const article=html.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i);
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i);
  const raw=article?.[1]??main?.[1];
  const empty=reason=>({
    status:"insufficient-bounded-source-text",reason,
    paragraphExcerpts:[],factsVerified:false,
    canAuthorizePublication:false,canGenerateClaimsAutomatically:false
  });
  if(!raw)return empty("missing-article-or-main-region");
  const clean=raw
    .replace(/<!--[\s\S]*?-->/g," ")
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi," ")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi,"$1");
  const paras=[...clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
    .slice(0,MAX_PARA_SCAN);
  const excerpts=[];
  const seen=new Set();
  for(const match of paras){
    const text=normalized(match[1].replace(/<[^>]+>/g," "));
    if(text.length<55||text.length>7000)continue;
    const excerpt=text.slice(0,MAX_EXCERPT_CHARS);
    if(seen.has(excerpt))continue;
    seen.add(excerpt);
    excerpts.push({
      excerpt,
      excerptSha256:sha(excerpt),
      fullParagraphSha256:sha(text),
      truncated:text.length>MAX_EXCERPT_CHARS,
      evidenceKind:"literal-official-paragraph-prefix",
      semanticClaimSupport:"unverified"
    });
    if(excerpts.length>=MAX_PRIVATE_EXCERPTS)break;
  }
  return excerpts.length?{
    status:"private-source-paragraphs-extracted",reason:null,
    paragraphExcerpts:excerpts,factsVerified:false,
    canAuthorizePublication:false,canGenerateClaimsAutomatically:false
  }:empty("no-paragraph-long-enough");
}

export function checkLiteralCitationAnchors(articleEvidence,anchors) {
  const deny=reason=>({
    status:"held-for-independent-fact-check",reason,
    textAnchorsMatch:false,semanticClaimsVerified:false,
    publicationEligible:false,automaticApproval:false
  });
  if(articleEvidence?.status!=="retrieved-for-editorial-review" ||
     !articleEvidence?.sourceEvidence ||
     articleEvidence.sourceEvidence.status!=="private-source-paragraphs-extracted" ||
     typeof articleEvidence.finalUrl!=="string" ||
     !articleEvidence.finalUrl.startsWith("https://") ||
     typeof articleEvidence.originalUrl!=="string")
    return deny("source-evidence-not-retrieved");
  const found=articleEvidence.sourceEvidence.paragraphExcerpts;
  if(!Array.isArray(found)||found.length<1||found.length>MAX_PRIVATE_EXCERPTS||
     found.some(e=>typeof e.excerpt!=="string"||e.excerpt.length>MAX_EXCERPT_CHARS||
       sha(e.excerpt)!==e.excerptSha256))
    return deny("invalid-source-anchors");
  if(!Array.isArray(anchors)||anchors.length<1||anchors.length>8)
    return deny("no-limited-claim-citations");
  for(const anchor of anchors){
    if(typeof anchor?.sourceUrl!=="string"||
       (anchor.sourceUrl!==articleEvidence.finalUrl &&
        anchor.sourceUrl!==articleEvidence.originalUrl) ||
       typeof anchor?.supportingExcerpt!=="string"||
       anchor.supportingExcerpt.length<30||anchor.supportingExcerpt.length>MAX_EXCERPT_CHARS||
       typeof anchor?.excerptSha256!=="string" ||
       !found.some(e=>e.excerptSha256===anchor.excerptSha256 &&
         e.excerpt.includes(normalized(anchor.supportingExcerpt))))
      return deny("citation-not-literal-in-official-page");
  }
  return {
    status:"literal-anchors-matched-for-review",reason:null,
    textAnchorsMatch:true,
    semanticClaimsVerified:false,publicationEligible:false,
    automaticApproval:false,
    warning:"Verbatim matching cannot establish that prose or numerical claims follow from these quotes."
  };
}
