import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath=path.join(process.cwd(),"content/articles/what-is-llm.md");
const figures=["hero.svg","fig-01-large.svg","fig-02-training-chat.svg","fig-03-model-service.svg"];

test("LLM合格済みreadyと前提依存を維持し、公開はしない",()=>{
  const articles=readAllArticles(path.join(process.cwd(),"content/articles"));
  const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const node=reg.nodes.find((n:{id:string})=>n.id==="GEN-0002");
  const article=articles.find(x=>x.id==="GEN-0002");
  assert.ok(node);
  assert.ok(article);
  assert.equal(article.status,"ready");
  assert.equal(node.status,"ready");
  assert.equal(article.slug,"what-is-llm");
  assert.equal(article.level,1);
  assert.equal(article.type,"concept");
  assert.equal(article.category,"生成AI");
  assert.deepEqual(node.prerequisites,["BAS-0012","BAS-0017"]);
  assert.ok(node.nextReading.some((n:{id:string})=>n.id==="BAS-0012"));
  assert.equal(articles.find(x=>x.id==="BAS-0017")?.status,"ready");
  assert.equal(articles.find(x=>x.id==="GEN-0036")?.status,"ready");
  assert.equal(articles.find(x=>x.id==="GEN-0001")?.status,"ready");
});

test("一つの案内文の言い換えを軸にLLMの意味・限界・復習リンクを説明",()=>{
  const source=readFileSync(articlePath,"utf8");
  const body=source.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>=4200 && body.length<=6500);
  assert.match(body.slice(0,900),/町内会/);
  for(const phrase of [
    "小学3年生","大規模言語モデル","Large Language Model",
    "言語モデル","Token","パラメータ","学習データ",
    "対話向け","事前学習","再学習","ChatGPT","検索",
    "Transformer","Q・K・V","午前9時","午前10時"
  ]) assert.ok(body.includes(phrase),"missing topic: "+phrase);
  assert.match(body,/^## ここで迷ったら$/m);
  assert.match(body,/^## 今回のまとめ$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/^## 最後に一本でつなぐ$/m);
  assert.doesNotMatch(body,/^## 次に読む$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  for(const link of [
    "/articles/what-is-language-model",
    "/articles/what-is-generative-ai",
    "/articles/what-is-token",
    "/articles/what-is-machine-learning",
    "/articles/what-is-prompt",
    "/articles/what-is-transformer",
    "/articles/what-is-attention",
  ]) assert.ok(body.includes(link),"missing study/rewind "+link);
  const headings=[...body.matchAll(/^## (.+)$/gm)].map(m=>m[1]);
  for(const h of headings)assert.ok(h.length<=18,"mobile heading too long: "+h);
  const images=[...body.matchAll(/\/images\/articles\/llm\/([a-z0-9-]+\.svg)/g)].map(m=>m[1]);
  assert.deepEqual(images,figures);
  for(const name of figures){
    const f=path.join(process.cwd(),"public/images/articles/llm",name);
    assert.ok(existsSync(f),"missing SVG "+name);
    const svg=readFileSync(f,"utf8");
    assert.ok(svg.length>1600);
    assert.match(svg,/<svg/);
    assert.match(svg,/<title id="title">/);
  }
});
