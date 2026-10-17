import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {parseArticle,readArticles} from "../src/lib/article-content";

const slug="aws-agent-million-fold-error";
const source=readFileSync("content/articles/"+slug+".md","utf8");
const meta=parseArticle(source,slug+".md");
const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));

test("NEWS-0093 AWS news remains unpublished without explicit editorial approval",()=>{
  const node=registry.nodes.find((x:{id:string})=>x.id==="NEWS-0093");
  assert.ok(node);
  assert.equal(node.status,"review");
  assert.equal(node.type,"news");
  assert.equal(meta.id,"NEWS-0093");
  assert.equal(meta.status,"review");
  assert.equal(meta.adPolicy,"off");
  assert.ok(!readArticles("content/articles").some(x=>x.slug===slug));
});
test("AWS agent news retains a compelling but accurate original-source distinction",()=>{
  const body=meta.content;
  assert.ok(body.length>=350 && body.length<=1150,"short news should take about one minute");
  for(const phrase of ["2026年10月16日","410.08ドル","410.08 Million","100万倍","公開前","9段階","/articles/ai-hallucination","aws.amazon.com/blogs/machine-learning/building-trust-in-ai-agents"])assert.ok(body.includes(phrase),phrase);
  assert.ok(!/本番で事故|顧客に誤った売上を通知/.test(body));
});
test("Approved artwork is local and source-limited",()=>{
  assert.equal(meta.thumbnail,"/images/news/"+slug+".webp");
  const asset="public"+meta.thumbnail;
  assert.ok(existsSync(asset));
  const data=readFileSync(asset);
  assert.equal(data.subarray(0,4).toString(),"RIFF");
  assert.equal(data.subarray(8,12).toString(),"WEBP");
});
