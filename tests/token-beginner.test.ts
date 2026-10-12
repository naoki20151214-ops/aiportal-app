import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
const files=["hero.svg","fig-01-not-word.svg","fig-02-different.svg","fig-03-token-id.svg","fig-04-predict.svg","fig-05-roundtrip.svg"];
test("Token記事は単語との違いから実用上の意味まで誤解なく説明する",()=>{
 const article=readFileSync(path.join(process.cwd(),"content/articles/what-is-token.md"),"utf8");
 const body=article.replace(/^---[\s\S]*?---\s*/,"");
 assert.match(article,/level: 1/); assert.match(article,/status: "(review|ready|published)"/);
 assert.ok(body.length>=5500); assert.ok(body.length<=7500);
 assert.match(body,/\[言語モデルとは？\]\(\/articles\/what-is-language-model\)/);
 for(const phrase of ["1単語 = 1 Token","1文字 = 1 Token","実際の分割結果はModelやTokenizerによって違う","Token ID","次に来るTokenはどれか？","Context Window","Input Tokens","Token = 意味そのもの"]){assert.match(body,new RegExp(phrase.replace(/[?]/g,"\\?")));}
 assert.doesNotMatch(body,/^## 次に読む$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
 assert.doesNotMatch(body,/\b(?:LEVEL|Level)\s*[0-5]\b/);
 const headings=[...body.matchAll(/^## (.+)$/gm)].map(m=>m[1]);
 for(const h of headings) assert.ok(h.length<=18,`heading too long: ${h}`);
 for(const filename of files){const asset=path.join(process.cwd(),"public/images/articles/token",filename);assert.ok(existsSync(asset));assert.ok(statSync(asset).size>1000);assert.match(readFileSync(asset,"utf8"),/<svg/);assert.match(article,new RegExp(`/images/articles/token/${filename.replace(".","\\.")}`));}
});