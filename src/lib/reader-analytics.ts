"use client";

import { readerNextEvent, readerSurveyEvent, type ReaderContext, type ReaderStage } from "./reader-research";

const CONSENT_KEY="aiportal:analytics-consent:v1";
type GtagBrowser = Window & { gtag?: (...args:unknown[])=>void };

// Existing AnalyticsConsent loads Google Analytics only after explicit consent.
// This extra check ensures survey/link events do not escape that choice.
export function consentedReaderEvent(payload:ReturnType<typeof readerSurveyEvent>|ReturnType<typeof readerNextEvent>):boolean {
  if(!payload || typeof window==="undefined")return false;
  try {
    if(window.localStorage.getItem(CONSENT_KEY)!=="granted")return false;
    const gtag=(window as GtagBrowser).gtag;
    if(typeof gtag!=="function")return false;
    gtag("event",payload.eventName,payload.params);
    return true;
  }catch {return false;}
}
export function recordReaderSurvey(stage:ReaderStage,choice:string,slug:string,context:ReaderContext) {
  return consentedReaderEvent(readerSurveyEvent(stage,choice,slug,context));
}
export function recordReaderNext(sourceSlug:string,targetSlug:string,context:ReaderContext,placement:string) {
  return consentedReaderEvent(readerNextEvent(sourceSlug,targetSlug,context,placement));
}
