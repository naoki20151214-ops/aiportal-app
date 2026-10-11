import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath = path.join(process.cwd(), "content/articles/what-is-prompt.md");
const figures = [
  "hero.svg", "fig-01-missing.svg", "fig-02-four.svg", "fig-03-revise.svg",
];

test("プロンプト記事とRegistryはreviewを維持し、既存記事を公開しない", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const reg = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const byId = new Map(reg.nodes.map((node: {id:string})=>[node.id,node]));
  const article = articles.find(a=>a.id==="GEN-0003");
  const node = byId.get("GEN-0003") as {status:string; slug:string; prerequisites:string[]; nextReading:{id:string}[]}|undefined;
  assert.ok(article);
  assert.ok(node);
  assert.equal(article.status, "review");
  assert.equal(node.status, "review");
  assert.equal(article.category, "生成AI");
  assert.equal(article.type, "concept");
  assert.equal(article.level, 1);
  assert.equal(article.slug, "what-is-prompt");
  assert.equal(node.slug, article.slug);
  assert.deepEqual(node.prerequisites, ["GEN-0001"]);
  assert.ok(node.nextReading.some(n=>n.id==="GEN-0024"));
  assert.equal(articles.find(a=>a.id==="GEN-0001")?.status, "ready");
  assert.equal(articles.find(a=>a.id==="BAS-0030")?.status, "ready");
  assert.equal(articles.find(a=>a.id==="BAS-0020")?.status, "review");
});

test("同じ町内会の例を貫き、復習リンクと『今回のまとめ』を持つ", () => {
  const full = readFileSync(articlePath,"utf8");
  const body = full.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length >= 3500 && body.length <= 6000);
  assert.match(body.slice(0,700),/町内会/);
  for (const phrase of ["お知らせを書いて","日曜日の午前9時","公園","軍手","飲み物","小学生の保護者","仕事","材料","読み手","仕上がり","推測","一度で","長いほど","確認"]) {
    assert.ok(body.includes(phrase), "missing beginner concept: "+phrase);
  }
  assert.match(body,/^## ここで迷ったら$/m);
  assert.match(body,/^## 今回のまとめ$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/^## 最後に一本でつなぐ$/m);
  assert.doesNotMatch(body,/^## 次に読む$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  for (const link of ["/articles/what-is-generative-ai","/articles/what-is-ai","/articles/context-window","/articles/what-is-multimodal"]) {
    assert.ok(body.includes(link), "missing rewind link: "+link);
  }
  for (const title of [...body.matchAll(/^## (.+)$/gm)].map(x=>x[1])) {
    assert.ok(title.length<=18,"long mobile heading: "+title);
  }
  const refs = [...body.matchAll(/\/images\/articles\/prompt\/([a-z0-9-]+\.svg)/g)].map(x=>x[1]);
  assert.deepEqual(refs,figures);
  for (const name of figures) {
    const p = path.join(process.cwd(),"public/images/articles/prompt",name);
    assert.ok(existsSync(p),"missing figure: "+name);
    const svg = readFileSync(p,"utf8");
    assert.ok(svg.length>1800);
    assert.match(svg,/<svg/);
    assert.match(svg,/<title id="title">/);
  }
});
