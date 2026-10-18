import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";

const rel="content/news/owner-approved-copy/NEWS-0096.md";
const copy=readFileSync(rel,"utf8");
const sha=()=>{
  const data=Buffer.from(copy,"utf8");
  return createHash("sha1").update("blob "+data.length+"\0").update(data).digest("hex");
};

test("NEWS-0096 owner-accepted headline, rating and body remain immutable",()=>{
  assert.equal(sha(),"b75ec239e2fc957ab3816464779597fce4cbc559");
  assert.ok(copy.startsWith("**重要度：★★★☆☆（3/5）｜新規性：高｜主な対象：AIアプリ開発者**"));
  assert.ok(copy.includes("# AIの声は「選ぶ」から「作る」へ。OpenAIが音声生成の新機能を公開"));
  assert.ok(copy.includes("**OpenAIは10月16日、文章で声の特徴を指定するだけで"));
  assert.ok(copy.includes("**今回変わったのは、AIの声を「選ぶ」だけでなく、文章で「設計できる」ようになったことです。**"));
  assert.ok(copy.endsWith("作った声もGPT-Live専用です。"));
});

test("NEWS-0096 owner accepts article but image and Production publication remain separately gated",()=>{
  const audit=readFileSync("content/news/editorial-audits/NEWS-0096.md","utf8");
  assert.ok(audit.includes(sha()));
  assert.match(audit,/画像未承認/);
  assert.match(audit,/公開許可を兼ねる/);
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const queue=parse(readFileSync("content/news/news-approval-queue.yml","utf8"));
  const archive=JSON.parse(readFileSync("content/news/news-archive.json","utf8"));
  assert.equal(registry.nodes.some((node:{id:string})=>node.id==="NEWS-0096"),false);
  assert.equal(queue.approvals.some((a:{id:string})=>a.id==="NEWS-0096"),false);
  assert.equal(archive.entries.some((item:{id:string})=>item.id==="NEWS-0096"),false);
});
