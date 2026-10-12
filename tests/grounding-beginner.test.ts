import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const filename = "content/articles/ai-grounding.md";
const figures = ["hero.webp", "fig-01-compare.webp", "fig-02-steps.webp", "fig-03-pitfalls.webp"];

test("GEN-0046 stays review with approved/published prerequisite", () => {
  const articles = readAllArticles("content/articles");
  const reg = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const article = articles.find(a => a.id === "GEN-0046");
  const node = reg.nodes.find((n: {id:string}) => n.id === "GEN-0046");
  assert.ok(article);
  assert.ok(node);
  assert.equal(article.status, "review");
  assert.equal(node.status, "review");
  assert.equal(article.slug, "ai-grounding");
  assert.equal(article.category, "生成AI");
  assert.equal(article.level, 1);
  assert.deepEqual(node.prerequisites, ["GEN-0004"]);
  assert.ok(node.nextReading.some((n: {id:string}) => n.id === "GEN-0047"));
  const hallucination = articles.find(a => a.id === "GEN-0004");
  assert.ok(hallucination);
  assert.ok(["ready","published"].includes(hallucination.status ?? ""));
});

test("Grounding article uses one cleanup story with cautious claims and correct WebP figures", () => {
  const raw = readFileSync(filename,"utf8");
  const content=raw.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(content.length>=3800&&content.length<=7000, "article length="+content.length);
  for(const phrase of ["町内会","日曜日","午前9時","公園","軍手","飲み物","無料のお弁当","Grounding","RAG","検索","資料","根拠","古い","今年","昨年","Citation","今回のまとめ"]){
    assert.ok(content.includes(phrase),"missing: "+phrase);
  }
  assert.match(content,/^## 今回のまとめ$/m);
  assert.match(content,/^## ここで迷ったら$/m);
  assert.match(content,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(content,/^## 最後に一本でつなぐ$/m);
  assert.doesNotMatch(content,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  for (const h of [...content.matchAll(/^## (.+)$/gm)].map(x=>x[1])) assert.ok(h.length<=18,"long H2: "+h);
  for (const url of ["/articles/ai-hallucination","/articles/what-is-llm","/articles/what-is-prompt"]) assert.ok(content.includes(url),"missing link: "+url);
  const refs=[...raw.matchAll(/\/images\/articles\/grounding\/([a-z0-9-]+\.webp)/g)].map(m=>m[1]);
  assert.deepEqual(refs,[...figures.slice(0,1),...figures]);
  for(const img of figures){
    const p=path.join(process.cwd(),"public/images/articles/grounding",img);
    assert.ok(existsSync(p), "missing: "+img);
    const b=readFileSync(p);
    assert.ok(b.length>30000,"small WebP: "+img);
    assert.equal(b.toString("ascii",0,4),"RIFF");
    assert.equal(b.toString("ascii",8,12),"WEBP");
  }
});