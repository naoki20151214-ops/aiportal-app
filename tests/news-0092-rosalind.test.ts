import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {test} from "node:test";
import path from "node:path";
import {parse} from "yaml";
import {validateNewsRelease} from "../scripts/validate-news-release.mjs";
import {parseArticle,readArticles} from "../src/lib/article-content";

const slug="gpt-rosalind-academic-plan";
const articlePath=path.join("content","articles",slug+".md");
const asset="public/images/news/"+slug+".webp";
const news=readFileSync(articlePath,"utf8");
const metadata=parseArticle(news,slug+".md");
const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
test("One-minute Rosalind news is published only with news-specific immutable release proof",()=>{
  const node=registry.nodes.find((n:{id:string})=>n.id==="NEWS-0092");
  assert.ok(node);
  assert.equal(node.slug,slug);
  assert.equal(node.status,"published");
  assert.equal(metadata.status,"published");
  assert.equal(metadata.type,"news");
  assert.equal(metadata.category,"AIニュース");
  assert.equal(metadata.adPolicy,"off");
  assert.ok(readArticles("content/articles").some(a=>a.slug===slug));
  assert.equal(validateNewsRelease().checked,2);
});
test("News is concise, sourced, linked and explains eligibility accurately",()=>{
  const body=metadata.content;
  assert.ok(body.length>=350 && body.length<=1150,"one-minute news body length must remain short");
  for(const snippet of ["2026年10月15日","米国の大学研究室","最大30席","最長12か月","別途利用承認","/articles/ai-hallucination","openai.com/ja-JP/index/introducing-the-rosalind-academic-plan/"])assert.ok(body.includes(snippet),snippet);
  assert.ok(!/AIが薬を発明|GPT-Rosalindが初登場/.test(body));
});
test("Approved news hero image is materialized in the production public folder",()=>{
  assert.equal(metadata.thumbnail,"/images/news/"+slug+".webp");
  assert.ok(existsSync(asset),"pretest and prebuild must materialize approved image");
  const bytes=readFileSync(asset);
  assert.equal(bytes.subarray(0,4).toString(),"RIFF");
  assert.equal(bytes.subarray(8,12).toString(),"WEBP");
  assert.ok(bytes.length>25000 && bytes.length<500000);
});
