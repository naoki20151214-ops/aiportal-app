import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const file = "content/articles/ai-web-grounding.md";
const figures = ["hero.webp", "fig-01-this-year.webp", "fig-02-flow.webp", "fig-03-checks.webp"];

test("GEN-0048 stays review and follows the published Grounding and Citation", () => {
 const articles = readAllArticles("content/articles");
 const registry = parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const a = articles.find(x=>x.id==="GEN-0048");
 const n = registry.nodes.find((x:{id:string})=>x.id==="GEN-0048");
 assert.ok(a);
 assert.ok(n);
 assert.equal(a.status,"review");
 assert.equal(n.status,"review");
 assert.equal(a.slug,"web-grounding");
 assert.equal(a.level,2);
 assert.equal(a.type,"mechanism");
 assert.deepEqual(n.prerequisites,["GEN-0046"]);
 assert.equal(articles.find(x=>x.id==="GEN-0046")?.status,"published");
 assert.equal(articles.find(x=>x.id==="GEN-0047")?.status,"published");
 assert.ok(n.nextReading.some((x:{id:string})=>x.id==="GEN-0049"));
});

test("Web Grounding is a single cleanup story with reviewed WebP images",() => {
 const raw=readFileSync(file,"utf8");
 const body=raw.replace(/^---[\s\S]*?---\s*/,"");
 assert.ok(body.length >= 4000 && body.length <= 6500, "article length: "+body.length);
 for(const s of ["今年","去年","日曜日","午前9時","公園","軍手","飲み物","Web Grounding","検索","公式","古い","出典","見つから","ハルシネーション","今回のまとめ","Citation","Grounding"]){
   assert.ok(body.includes(s),"missing: "+s);
 }
 assert.match(body,/^## 今回のまとめ$/m);
 assert.match(body,/^## ここで迷ったら$/m);
 assert.match(body,/^## 分からなければ戻ろう$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
 for(const heading of [...body.matchAll(/^## (.+)$/gm)].map(x=>x[1])){
   assert.ok(heading.length<=18,"too long heading: "+heading);
 }
 for(const url of ["/articles/ai-grounding","/articles/ai-citations","/articles/ai-hallucination"]){
   assert.ok(body.includes(url),"missing internal link: "+url);
 }
 const refs=[...raw.matchAll(/\/images\/articles\/web-grounding\/([a-z0-9-]+\.webp)/g)].map(x=>x[1]);
 assert.deepEqual(refs,[figures[0],...figures]);
 for(const fn of figures){
   const p=path.join("public/images/articles/web-grounding",fn);
   assert.ok(existsSync(p),"missing image: "+fn);
   const bytes=readFileSync(p);
   assert.ok(bytes.length>30000,"small image: "+fn);
   assert.equal(bytes.toString("ascii",0,4),"RIFF");
   assert.equal(bytes.toString("ascii",8,12),"WEBP");
 }
});