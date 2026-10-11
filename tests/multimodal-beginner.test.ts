import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath = path.join(process.cwd(), "content/articles/what-is-multimodal.md");
const figures = [
  "hero.svg",
  "fig-01-modalities.svg",
  "fig-02-flow.svg",
  "fig-03-architectures.svg",
  "fig-04-time.svg",
];

test("BAS-0030はreviewで、合格済み教材とMulti-Headの状態は維持", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const byId = new Map(registry.nodes.map((n: {id:string})=>[n.id,n]));
  const multi = articles.find(a=>a.id==="BAS-0030");
  assert.ok(multi);
  assert.equal(multi.status, "review");
  assert.equal(multi.slug, "what-is-multimodal");
  assert.equal(multi.level, 1);
  assert.equal(multi.type, "concept");
  assert.equal((byId.get("BAS-0030") as {status:string}).status, "review");
  assert.equal(articles.find(a=>a.id==="BAS-0020")?.status, "review");
  assert.equal(articles.find(a=>a.id==="BAS-0101")?.status, "ready");
  assert.equal(articles.find(a=>a.id==="BAS-0023")?.status, "ready");
  assert.ok((byId.get("BAS-0030") as {nextReading: {id:string}[]}).nextReading.some(n=>n.id==="GEN-0015"));
});

test("初心者向けにモダリティとサービス構成を区別し、復習導線と図解を持つ", () => {
  const full = readFileSync(articlePath,"utf8");
  const content = full.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(content.length>=3900 && content.length<=6000);
  assert.match(content.slice(0,850), /ポスター/);
  for(const phrase of ["写真","音声","文字","動画","数値","一つのモデル","複数の仕組み","時間の流れ","間違える","研究者"]){
    assert.ok(content.includes(phrase), "missing: "+phrase);
  }
  assert.match(content,/^## ここで迷ったら$/m);
  assert.match(content,/^## 分からなければ戻ろう$/m);
  for(const link of ["/articles/what-is-ai","/articles/what-is-token","/articles/what-is-embedding"]){
    assert.ok(content.includes(link), "missing rewind: "+link);
  }
  const headings = [...content.matchAll(/^## (.+)$/gm)].map(x=>x[1]);
  assert.ok(headings.length>=9);
  for(const heading of headings) assert.ok(heading.length<=18,"heading too long: "+heading);
  assert.doesNotMatch(content,/^## 次に読む$/m);
  assert.doesNotMatch(content,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  const used=[...content.matchAll(/\/images\/articles\/multimodal\/([a-z0-9-]+\.svg)/g)].map(x=>x[1]);
  assert.deepEqual(used,figures);
  for(const f of figures){
    const file=path.join(process.cwd(),"public/images/articles/multimodal",f);
    assert.ok(existsSync(file),"missing image: "+f);
    const svg=readFileSync(file,"utf8");
    assert.ok(svg.length>900);
    assert.match(svg,/<svg/);
    assert.match(svg,/<title id="title">/);
  }
});
