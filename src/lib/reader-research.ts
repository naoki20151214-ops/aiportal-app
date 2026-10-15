// Fixed-choice visitor research. Never send free text, identity or search terms to analytics.
export const readerIntentChoices = [
  {code:"curiosity",label:"面白そう・もっと知りたい"},
  {code:"question",label:"疑問を解決したい"},
  {code:"work_study",label:"仕事・勉強に役立てたい"},
  {code:"try_tool",label:"AIを実際に使ってみたい"},
  {code:"news_context",label:"ニュースの背景を理解したい"},
] as const;

export const readerOutcomeChoices = [
  {code:"learned",label:"新しいことが理解できた"},
  {code:"resolved",label:"疑問が解決した"},
  {code:"ready_to_try",label:"実際に試してみたくなった"},
  {code:"still_unclear",label:"まだ理解できなかった"},
] as const;

export type ReaderStage = "intent" | "outcome";
export type ReaderContext = "news" | "learning";
export type IntentCode = (typeof readerIntentChoices)[number]["code"];
export type OutcomeCode = (typeof readerOutcomeChoices)[number]["code"];
export type ReaderChoice = IntentCode | OutcomeCode;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const intentSet:ReadonlySet<string> = new Set(readerIntentChoices.map(x=>x.code));
const outcomeSet:ReadonlySet<string> = new Set(readerOutcomeChoices.map(x=>x.code));
const placementSet:ReadonlySet<string> = new Set(["related", "news-learning", "news-index"]);

export function validArticleSlug(slug:string): boolean {
  return typeof slug === "string" && slug.length<=100 && slugPattern.test(slug);
}
export function validReaderChoice(stage:ReaderStage,code:string):boolean {
  return stage==="intent"?intentSet.has(code):stage==="outcome"&&outcomeSet.has(code);
}
export function readerSurveyEvent(stage:ReaderStage,code:string,slug:string,context:ReaderContext) {
  if (!validArticleSlug(slug) || !validReaderChoice(stage,code) ||
     (context!=="news" && context!=="learning")) return null;
  return {
    eventName:stage==="intent"?"reader_intent":"reader_outcome",
    params:{
      article_slug:slug,
      article_context:context,
      response_code:code,
    },
  };
}
export function readerNextEvent(sourceSlug:string,targetSlug:string,context:ReaderContext,placement:string) {
  if(!validArticleSlug(sourceSlug)||!validArticleSlug(targetSlug)||
     (context!=="news"&&context!=="learning")||!placementSet.has(placement))return null;
  return {
    eventName:"reader_next_step",
    params:{article_slug:sourceSlug,article_context:context,target_slug:targetSlug,link_placement:placement},
  };
}
