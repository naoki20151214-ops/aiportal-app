import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files=["hero-photo.svg","fig-01-next.svg","fig-02-repeat.svg","fig-03-training-inference.svg"];

test("言語モデル記事は次の予測から文章生成までを初心者向けに説明する",()=>{
 const article=readFileSync(path.join(process.cwd(),"content/articles/what-is-language-model.md"),"utf8");
 const body=article.replace(/^---[\s\S]*?---\s*/,"");
 assert.match(article,/level: 1/);
 assert.match(article,/status: "(review|ready|published)"/);
 assert.match(article,/thumbnail: "\/images\/articles\/language-model\/hero-photo\.svg"/);
 assert.match(body,/\[AIの推論・Inferenceとは？\]\(\/articles\/ai-inference\)/);
 assert.ok(body.length>=3000);
 assert.ok(body.length<=4300);
 const headings=[...body.matchAll(/^## (.+)$/gm)].map(m=>m[1]);
 assert.deepEqual(headings.slice(0,8),["続きは何だろう？","次を予測する","一つ出したらまた予測","なぜ自然な文章になる？","学んだものを使っている","同じ続きとは限らない","言語ModelとLLM","最後に一本でつなぐ"]);
 for(const h of headings) assert.ok(h.length<=18,`heading too long: ${h}`);
 assert.match(body,/文章の続きを予測する仕組みを繰り返すことで、文章を作っていく/);
 assert.match(body,/Token（トークン）/);
 assert.doesNotMatch(body,/^## 次に読む$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
 assert.doesNotMatch(body,/\b(?:LEVEL|Level)\s*[0-5]\b/);
 for(const filename of files){
  const asset=path.join(process.cwd(),"public/images/articles/language-model",filename);
  assert.ok(existsSync(asset),`missing visual: ${filename}`);
  assert.ok(statSync(asset).size>1000,`visual too small: ${filename}`);
  assert.match(readFileSync(asset,"utf8"),/<svg/);
  assert.match(article,new RegExp(`/images/articles/language-model/${filename.replace(".","\\.")}`));
 }
});