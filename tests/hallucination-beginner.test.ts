import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath = path.join(process.cwd(), "content/articles/ai-hallucination.md");
const figures = [
  "hero.webp", "fig-01-mixed.webp", "fig-02-two-tasks.webp", "fig-03-check.webp",
];

test("GEN-0004の公開状態・図版・前提関係を確認", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const reg = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const node = reg.nodes.find((n: {id:string}) => n.id === "GEN-0004");
  const article = articles.find(a=>a.id==="GEN-0004");
  assert.ok(node);
  assert.ok(article);
  assert.equal(article.status,"published");
  assert.equal(node.status,"published");
  assert.equal(article.slug,"ai-hallucination");
  assert.equal(article.category,"生成AI");
  assert.equal(article.level,1);
  assert.equal(article.type,"concept");
  assert.deepEqual(node.prerequisites,["GEN-0002"]);
  assert.ok(node.prerequisites.includes("GEN-0002"));
  assert.equal(articles.find(a=>a.id==="BAS-0017")?.status,"review");
});

test("架空の清掃案内を一貫して使い、ハルシネーションとチェックの方法を説明", () => {
  const text = readFileSync(articlePath,"utf8").replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(text.length>=4100&&text.length<=6700);
  assert.match(text.slice(0,900),/町内会/);
  for(const phrase of [
    "無料のお弁当","午前9時","公園","軍手","飲み物",
    "ハルシネーション","もっともらしい","LLM","事実確認",
    "元の情報","検索","NIST","Grounding","2025年",
    "お弁当","書かれていない"
  ]) assert.ok(text.includes(phrase),"missing: "+phrase);
  assert.match(text,/^## 今回のまとめ$/m);
  assert.match(text,/^## ここで迷ったら$/m);
  assert.match(text,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(text,/^## 最後に一本でつなぐ$/m);
  assert.doesNotMatch(text,/^## 次に読む$/m);
  assert.doesNotMatch(text,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  for(const url of [
    "/articles/what-is-llm",
    "/articles/what-is-generative-ai",
    "/articles/what-is-prompt"
  ]) assert.ok(text.includes(url),"missing rewind: "+url);
  const headings = [...text.matchAll(/^## (.+)$/gm)].map(x=>x[1]);
  for(const heading of headings)assert.ok(heading.length<=18,"long H2: "+heading);
  const imageRefs=[...text.matchAll(/\/images\/articles\/hallucination\/([a-z0-9-]+\.webp)/g)].map(x=>x[1]);
  assert.deepEqual(imageRefs,figures);
  for(const img of figures){
    const filename=path.join(process.cwd(),"public/images/articles/hallucination",img);
    assert.ok(existsSync(filename),"missing WebP: "+img);
    const image=readFileSync(filename);
    assert.ok(image.length>50000, "image is too small: "+img);
    assert.equal(image.toString("ascii",0,4),"RIFF");
    assert.equal(image.toString("ascii",8,12),"WEBP");
  }
});
