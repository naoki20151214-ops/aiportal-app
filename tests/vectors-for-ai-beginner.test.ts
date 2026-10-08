import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
const files=["hero.svg","fig-01-coordinate.svg","fig-02-arrow.svg","fig-03-dimensions.svg","fig-04-distance.svg","fig-05-direction.svg","fig-06-matrix.svg","fig-07-map.svg","fig-08-cat-dog.svg","fig-09-compare.svg","fig-10-learning.svg"];
test("Vector記事は座標・向き・距離・Embeddingを初心者向けに説明する",()=>{
 const article=readFileSync(path.join(process.cwd(),"content/articles/vectors-for-ai.md"),"utf8");
 const body=article.replace(/^---[\s\S]*?---\s*/,"");
 assert.match(article,/level: 1/);assert.match(article,/status: "(review|ready|published)"/);
 assert.ok(body.length>=3000);assert.ok(body.length<=4500);
 for(const link of ["/articles/what-is-embedding","/articles/matrix-multiplication-ai"]) assert.ok(body.includes(link));
 for(const phrase of ["保存されたParameter","新しい写真","座標は場所。ベクトルは移動量。","ベクトル","距離","向き","Cosine Similarity","4次元","意味が近いことは同じではない"]) assert.ok(body.includes(phrase));
 assert.doesNotMatch(body,/^## 次に読む$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
 const headings=[...body.matchAll(/^## (.+)$/gm)].map(m=>m[1]);for(const h of headings)assert.ok(h.length<=18,`heading too long: ${h}`);
 for(const filename of files){const asset=path.join(process.cwd(),"public/images/articles/vectors",filename);assert.ok(existsSync(asset));assert.ok(statSync(asset).size>1000);assert.match(readFileSync(asset,"utf8"),/<svg/);assert.ok(body.includes(`/images/articles/vectors/${filename}`));}
});