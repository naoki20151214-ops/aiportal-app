import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {
  readerIntentChoices,readerOutcomeChoices,readerSurveyEvent,
  readerNextEvent,validArticleSlug,validReaderChoice,
} from "../src/lib/reader-research";

test("Reader research options are fixed and do not accept arbitrary text or PII",()=>{
  assert.equal(readerIntentChoices.length,5);
  assert.equal(readerOutcomeChoices.length,4);
  assert.equal(new Set([...readerIntentChoices,...readerOutcomeChoices].map(x=>x.code)).size,9);
  for(const c of readerIntentChoices)assert.ok(validReaderChoice("intent",c.code));
  for(const c of readerOutcomeChoices)assert.ok(validReaderChoice("outcome",c.code));
  assert.equal(validReaderChoice("intent","my.email@example.com"),false);
  assert.equal(validReaderChoice("outcome","address"),false);
});

test("GA4 reader research events are small whitelisted enums with no personal content",()=>{
  const event=readerSurveyEvent("intent","curiosity","what-is-ai","learning");
  assert.deepEqual(event,{
    eventName:"reader_intent",
    params:{article_slug:"what-is-ai",article_context:"learning",response_code:"curiosity"},
  });
  assert.deepEqual(readerSurveyEvent("outcome","resolved","ai-hallucination","news"),{
    eventName:"reader_outcome",
    params:{article_slug:"ai-hallucination",article_context:"news",response_code:"resolved"},
  });
  assert.equal(readerSurveyEvent("intent","full name","what-is-ai","learning"),null);
  assert.equal(readerSurveyEvent("outcome","curiosity","what-is-ai","learning"),null);
  assert.equal(readerSurveyEvent("intent","curiosity","../admin","learning"),null);
  assert.equal(validArticleSlug("https://example.com?q=foo"),false);
  assert.equal(validArticleSlug("a".repeat(101)),false);
});

test("News and learning onward clicks use known placement and slugs only",()=>{
  assert.deepEqual(readerNextEvent("openai-gpt5-training","what-is-llm","news","news-learning"),{
    eventName:"reader_next_step",
    params:{
      article_slug:"openai-gpt5-training",
      article_context:"news",
      target_slug:"what-is-llm",
      link_placement:"news-learning",
    },
  });
  assert.equal(readerNextEvent("source","https://outside.example/","news","related"),null);
  assert.equal(readerNextEvent("source","target","news","ad-click"),null);
  assert.equal(readerNextEvent("source","target","news","news-index")?.params.target_slug,"target");
});

test("Surveys and next-link tracking are consent-only, passive, and published-page-only",()=>{
  const survey=readFileSync("src/components/reader-survey.tsx","utf8");
  const analytics=readFileSync("src/lib/reader-analytics.ts","utf8");
  const detail=readFileSync("src/app/articles/[slug]/page.tsx","utf8");
  const news=readFileSync("src/app/news/page.tsx","utf8");
  const related=readFileSync("src/components/related-articles.tsx","utf8");
  const privacy=readFileSync("src/app/privacy/page.tsx","utf8");
  assert.ok(analytics.includes('window.localStorage.getItem(CONSENT_KEY)!=="granted"'));
  assert.ok(analytics.includes('gtag("event",payload.eventName,payload.params)'));
  assert.ok(!analytics.includes("fetch("));
  assert.ok(!analytics.includes("dataLayer.push("));
  assert.ok(survey.includes("アクセス解析に同意した場合だけ選択肢を計測します"));
  assert.ok(survey.includes("閉じる"));
  assert.ok(survey.includes('stage==="intent"?readerIntentChoices:readerOutcomeChoices'));
  assert.ok(survey.includes('data-reader-survey-dock="true"'));
  assert.ok(survey.includes('className="fixed right-3'));
  assert.ok(survey.includes('style={{bottom:"calc(0.75rem + env(safe-area-inset-bottom))"}}'));
  assert.ok(survey.includes('aria-expanded={open}'));
  assert.ok(survey.includes('role="dialog" aria-modal="false"'));
  assert.ok(survey.includes('max-h-[min(68dvh,31rem)]'));
  assert.ok(survey.includes('onClick={()=>setOpen(value=>!value)}'));
  assert.ok(survey.includes("感想・アンケート"));
  assert.ok(survey.includes("読んだ理由"));
  assert.ok(survey.includes("読後の感想"));
  assert.ok(detail.includes('<ReaderSurvey slug={article.slug} context={readerContext} />'));
  assert.equal((detail.match(/<ReaderSurvey /g)||[]).length,1);
  assert.ok(detail.indexOf('<ReaderSurvey slug={article.slug}')>detail.indexOf('</main>'));
  assert.ok(!detail.includes('<ReaderSurvey stage="intent"'));
  assert.ok(!detail.includes('<ReaderSurvey stage="outcome"'));
  assert.ok(detail.includes('placement="news-learning"'));
  assert.ok(related.includes('placement="related"'));
  assert.ok(news.includes('placement="news-index"'));
  assert.ok(privacy.includes("読者の閲覧動機・読後の変化に関する任意アンケート"));
  assert.ok(privacy.includes("アクセス解析への同意がある場合に限り"));
});

test("Floating reader dock is opt-in and does not alter any article markdown",()=>{
  const survey=readFileSync("src/components/reader-survey.tsx","utf8");
  const detail=readFileSync("src/app/articles/[slug]/page.tsx","utf8");
  assert.ok(survey.includes("const [open,setOpen]=useState(false)"));
  assert.ok(survey.includes("if(event.key===\"Escape\")"));
  assert.ok(survey.includes('onClick={()=>setOpen(false);')===false);
  assert.ok(survey.includes("triggerRef.current?.focus()"));
  assert.ok(survey.includes("readerIntentChoices, readerOutcomeChoices"));
  assert.ok(detail.includes("<ArticleBody content={articleContent} article={article} />"));
  assert.ok(detail.includes("<ArticleFeedback articleId={article.id}"));
});

test("No change to original article approval gate or daily release scheduler",()=>{
  const publisher=readFileSync("scripts/auto-publish-approved.mjs","utf8");
  const workflow=readFileSync(".github/workflows/publish-approved.yml","utf8");
  assert.ok(publisher.includes("publishOn"));
  assert.ok(workflow.includes("0 11 * * *"));
  assert.ok(!workflow.includes("reader_intent"));
});
