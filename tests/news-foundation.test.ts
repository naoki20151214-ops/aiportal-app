import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import {
  safeUrl, normalizeTitle, duplicateTitleKey, validateSourceConfig,
  itemsFromFeed, deduplicateCandidates, shouldShowInNews, validJapanDate,
} from "../scripts/news-candidate-core.mjs";
import { newsLearningLinks } from "../src/lib/news-learning-links";
import { readArticles } from "../src/lib/article-content";

const config = JSON.parse(readFileSync("content/news/sources.json","utf8"));
const clock = new Date("2026-10-15T01:00:00.000Z");
const source = {id:"official-test",name:"Official Publisher",allowedHosts:["openai.com"]};

test("News feed registry lists only official, HTTPS, restricted publisher hosts",()=>{
  const sources=validateSourceConfig(config);
  assert.ok(sources.length>=4);
  assert.ok(sources.every(s=>s.kind.startsWith("official-")));
  assert.ok(!sources.some(s=>/reddit|hackernews|techcrunch/.test(s.feedUrl)));
  assert.throws(()=>validateSourceConfig({schemaVersion:1,sources:[
    {id:"bad",name:"Bad",allowedHosts:["example.com"],feedUrl:"http://example.com/rss"}
  ]}),/Unsafe/);
  assert.equal(safeUrl("https://evil.example/claim",["openai.com"]),null);
  assert.equal(safeUrl("http://openai.com/news",["openai.com"]),null);
  assert.equal(safeUrl("https://openai.com.evil.example/news",["openai.com"]),null);
  assert.equal(safeUrl("https://attacker@openai.com/news",["openai.com"]),null);
});

test("Article metadata is sanitized and links cannot escape the curated official origin",()=>{
  assert.equal(safeUrl("https://openai.com/news/item/?utm_source=foo#frag",["openai.com"]),
    "https://openai.com/news/item");
  assert.equal(normalizeTitle("  <b>New AI</b>   Tool  "), "New AI Tool");
  assert.equal(duplicateTitleKey("New AI—Tool"),duplicateTitleKey("NEW AI Tool!"));
  assert.equal(validJapanDate("2026-10-15"),true);
  assert.equal(validJapanDate("2026-02-30"),false);
});

test("Candidate intake rejects missing dates, old stories, future time and untrusted URLs",()=>{
  const candidates=itemsFromFeed(source,[
    {title:"Important official model update",link:"https://openai.com/index/new-model?utm_source=feed",isoDate:"2026-10-14T22:00:00.000Z"},
    {title:"Undated important update",link:"https://openai.com/news/unknown"},
    {title:"Old official update from years ago",link:"https://openai.com/news/old",isoDate:"2022-01-01T00:00:00Z"},
    {title:"Very future dated article",link:"https://openai.com/news/future",isoDate:"2026-10-15T18:00:00Z"},
    {title:"Spoofed source link",link:"https://openai.com.evil.com/x",isoDate:"2026-10-15T00:00:00Z"},
  ],clock,72);
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].originalUrl,"https://openai.com/index/new-model");
  assert.equal(candidates[0].verificationStatus,"pending-primary-source-review");
  assert.equal(candidates[0].publisher,"Official Publisher");
  assert.ok(!("articleBody" in candidates[0]),"RSS metadata must not copy full articles");
});

test("Exact URL or normalized-title duplicates are excluded, not asserted to be semantic review",()=>{
  const a=itemsFromFeed(source,[
    {title:"Official large model release",link:"https://openai.com/news/release?utm_source=rss",isoDate:"2026-10-15T00:00:00Z"},
    {title:"Official large model release!",link:"https://openai.com/news/duplicate",isoDate:"2026-10-14T23:00:00Z"},
    {title:"Another important model release",link:"https://openai.com/news/release#comments",isoDate:"2026-10-14T23:30:00Z"}
  ],clock);
  assert.equal(a.length,3);
  const distinct=deduplicateCandidates(a);
  assert.equal(distinct.length,1);
});

test("Pending feed candidates are never approved news and no release API exists",()=>{
  assert.equal(shouldShowInNews("pending-primary-source-review"),false);
  assert.equal(shouldShowInNews("review"),false);
  assert.equal(shouldShowInNews("approved-and-published"),true);
  const workflow = parse(readFileSync(".github/workflows/news-candidates.yml","utf8"));
  assert.equal(workflow.permissions.contents,"read");
  assert.equal(workflow.on.schedule[0].cron,"0 22 * * *");
  const job=workflow.jobs.collect;
  assert.ok(job.steps.some(s=>String(s.run||"").includes("collect-news-candidates.mjs")));
  assert.ok(!job.steps.some(s=>/git push|auto-publish-approved|publish-approved/.test(String(s.run||""))));
  const collector=readFileSync("scripts/collect-news-candidates.mjs","utf8");
  assert.ok(collector.includes("artifacts/news-candidates.json"));
  assert.ok(!collector.includes("git push"));
  assert.ok(!collector.includes("content/articles/"));
  assert.ok(!workflow.jobs.collect.permissions);
});

test("News-to-learning suggestions include only published real learning pages",()=>{
  const published=readArticles(path.join(process.cwd(),"content/articles"));
  const news=published.find(x=>x.slug==="apple-intelligence-update");
  assert.ok(news,"Existing published AI news available");
  const links=newsLearningLinks(news,published);
  assert.ok(links.length>=2);
  assert.ok(links.some(x=>x.slug==="what-is-multimodal"));
  assert.ok(links.every(x=>published.some(a=>a.slug===x.slug && a.status==="published")));
  const onlyReady=[{slug:"what-is-multimodal",title:"準備中",status:"ready" as const}];
  assert.equal(newsLearningLinks(news,onlyReady).length,0);
});

test("News landing, home, footer, sitemap and news article detail all route to learning",()=>{
  const home=readFileSync("src/components/article-portal.tsx","utf8");
  const news=readFileSync("src/app/news/page.tsx","utf8");
  const footer=readFileSync("src/components/site-footer.tsx","utf8");
  const sitemap=readFileSync("src/app/sitemap.ts","utf8");
  const article=readFileSync("src/app/articles/[slug]/page.tsx","utf8");
  assert.ok(home.includes('href="/news"'));
  assert.ok(news.includes('newsLearningLinks(item,published)'));
  assert.ok(news.includes('getAllArticles()'));
  assert.ok(news.includes('毎朝のAIニュースは準備中です'));
  assert.ok(footer.includes('href: "/news"'));
  assert.ok(sitemap.includes('absoluteUrl("/news")'));
  assert.ok(article.includes('newsLearningLinks(article, getAllArticles())'));
  assert.ok(article.includes("このニュースを理解するための基礎知識"));
  assert.ok(!news.includes("pending-primary-source-review"),"Unverified feed metadata must not be displayed");
});
