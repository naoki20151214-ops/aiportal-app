import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
const visuals=["hero.svg","fig-01-relations.svg","fig-02-compare.svg","fig-03-attention.svg","fig-04-position.svg","fig-05-parallel.svg","fig-06-flow.svg"];
test("Transformer beginner article explains relationships without prematurely teaching Attention math",()=>{
 const article=readFileSync(path.join(process.cwd(),"content/articles/what-is-transformer.md"),"utf8");
 const body=article.replace(/^---[\s\S]*?---\s*/,"");
 assert.match(article,/level: 1/);
 assert.match(article,/status: "review"/);
 assert.ok(body.length>=3200&&body.length<=5000);
 for(const phrase of ["RNN","Attention","位置情報","並列","Token","Embedding","LLM"])assert.ok(body.includes(phrase));
 for(const url of ["/articles/what-is-embedding","/articles/what-is-token"])assert.ok(body.includes(url));
 const headings=[...body.matchAll(/^## (.+)$/gm)].map(m=>m[1]);
 for(const heading of headings)assert.ok(heading.length<=18,heading);
 assert.doesNotMatch(body,/^## 次に読む$/m);
 for(const filename of visuals){const p=path.join(process.cwd(),"public/images/articles/transformer",filename);assert.ok(existsSync(p));assert.ok(readFileSync(p,"utf8").length>1000);assert.ok(body.includes(`/images/articles/transformer/${filename}`));}
});