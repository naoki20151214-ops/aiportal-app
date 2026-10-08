import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
const files=["hero.svg","fig-01-id-to-vector.svg","fig-02-learning.svg","fig-03-space.svg","fig-04-context.svg","fig-05-table.svg"];
test("Embedding記事はToken IDと学習された表現を混同しない",()=>{
 const article=readFileSync(path.join(process.cwd(),"content/articles/what-is-embedding.md"),"utf8");
 const body=article.replace(/^---[\s\S]*?---\s*/,"");
 assert.match(article,/level: 1/);assert.match(article,/status: "(review|ready|published)"/);
 assert.ok(body.length>=3800);assert.ok(body.length<=5300);
 for(const link of ["/articles/what-is-token","/articles/ai-training","/articles/matrix-multiplication-ai","/articles/tensor-ai"]) assert.ok(body.includes(link));
 for(const phrase of ["Token ID","Embedding Table","Cosine Similarity","文脈","学習の目的"]) assert.ok(body.includes(phrase));
 assert.doesNotMatch(body,/^## 次に読む$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
 const headings=[...body.matchAll(/^## (.+)$/gm)].map(m=>m[1]);
 for(const h of headings) assert.ok(h.length<=18,`heading too long: ${h}`);
 for(const filename of files){const asset=path.join(process.cwd(),"public/images/articles/embedding",filename);assert.ok(existsSync(asset));assert.ok(statSync(asset).size>1000);assert.match(readFileSync(asset,"utf8"),/<svg/);assert.ok(body.includes(`/images/articles/embedding/${filename}`));}
});