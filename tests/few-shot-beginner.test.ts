import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath=path.join(process.cwd(),"content/articles/few-shot-prompting.md");
const figures=["hero.svg","fig-01-pairs.svg","fig-02-compare.svg","fig-03-consistency.svg"];

test("Few-shotは合格済みreadyで、Zero-shotもreadyを維持する",()=>{
  const articles=readAllArticles(path.join(process.cwd(),"content/articles"));
  const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const node=reg.nodes.find((x:{id:string})=>x.id==="GEN-0036");
  const article=articles.find(a=>a.id==="GEN-0036");
  assert.ok(node);
  assert.ok(article);
  assert.equal(article.status,"ready");
  assert.equal(node.status,"ready");
  assert.equal(article.slug,"few-shot-prompting");
  assert.equal(article.level,1);
  assert.equal(article.type,"practice");
  assert.equal(article.category,"生成AI");
  assert.deepEqual(node.prerequisites,["GEN-0003"]);
  assert.ok(node.nextReading.some((n:{id:string})=>n.id==="GEN-0035"));
  assert.equal(articles.find(a=>a.id==="GEN-0035")?.status,"ready");
  assert.equal(articles.find(a=>a.id==="GEN-0003")?.status,"ready");
  assert.equal(articles.find(a=>a.id==="BAS-0020")?.status,"review");
});

test("二組の入力出力から同じ書式を考える説明に復習導線と図解がある",()=>{
  const source=readFileSync(articlePath,"utf8");
  const body=source.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>=3900 && body.length<=6200);
  assert.match(body.slice(0,900),/町内会/);
  for(const keyword of [
    "防災訓練","花壇の手入れ","清掃活動","月曜日の午前10時",
    "土曜日の午前8時","日曜日の午前9時","持ち物",
    "入力","出力","Zero-shot","Few-shot","One-shot",
    "学習済みパラメータ","再学習","コンテキストウィンドウ","事実確認"
  ]) assert.ok(body.includes(keyword),"missing "+keyword);
  assert.match(body,/^## ここで迷ったら$/m);
  assert.match(body,/^## 今回のまとめ$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/^## 最後に一本でつなぐ$/m);
  assert.doesNotMatch(body,/^## 次に読む$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  for(const link of [
    "/articles/zero-shot-prompting","/articles/what-is-prompt",
    "/articles/context-window","/articles/what-is-generative-ai"
  ]) assert.ok(body.includes(link),"missing rewind "+link);
  for(const h of [...body.matchAll(/^## (.+)$/gm)].map(x=>x[1])){
    assert.ok(h.length<=18,"long H2 "+h);
  }
  const refs=[...body.matchAll(/\/images\/articles\/few-shot\/([a-z0-9-]+\.svg)/g)].map(x=>x[1]);
  assert.deepEqual(refs,figures);
  for(const name of figures){
    const p=path.join(process.cwd(),"public/images/articles/few-shot",name);
    assert.ok(existsSync(p),"missing diagram "+name);
    const svg=readFileSync(p,"utf8");
    assert.ok(svg.length>1650);
    assert.match(svg,/<svg/);
    assert.match(svg,/<title id="title">/);
  }
});
