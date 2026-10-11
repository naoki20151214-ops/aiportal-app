import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath = path.join(process.cwd(), "content/articles/zero-shot-prompting.md");
const figures = ["hero.svg", "fig-01-zero.svg", "fig-02-compare.svg"];

test("Zero-shot合格済みreadyを維持し、先行記事も公開しない", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const byId = new Map(registry.nodes.map((node: {id:string})=>[node.id,node]));
  const article = articles.find(a=>a.id==="GEN-0035");
  const node = byId.get("GEN-0035") as {status:string;slug:string;prerequisites:string[];nextReading:{id:string}[]}|undefined;
  assert.ok(article);
  assert.ok(node);
  assert.equal(article.status, "ready");
  assert.equal(node.status, "ready");
  assert.equal(article.slug, "zero-shot-prompting");
  assert.equal(article.level, 1);
  assert.equal(article.type, "practice");
  assert.equal(article.category, "生成AI");
  assert.deepEqual(node.prerequisites, ["GEN-0003"]);
  assert.ok(node.nextReading.some(n=>n.id==="GEN-0036"));
  assert.equal(articles.find(a=>a.id==="GEN-0003")?.status, "ready");
  assert.equal(articles.find(a=>a.id==="GEN-0001")?.status, "ready");
  assert.equal(articles.find(a=>a.id==="BAS-0020")?.status, "review");
  const prev = byId.get("GEN-0003") as {nextReading:{id:string}[]};
  assert.ok(prev.nextReading.some(n=>n.id==="GEN-0035"));
});

test("ゼロショットが例ゼロであることを誤解なく説明し、復習導線を備える", () => {
  const body = readFileSync(articlePath, "utf8").replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 3800 && body.length <= 6100);
  assert.match(body.slice(0, 800), /町内会/);
  for (const phrase of [
    "Zero-shot", "One-shot", "Few-shot", "お手本", "0 件",
    "事前学習", "ゼロショット", "日曜日の午前9時",
    "仕事", "材料", "読み手", "仕上がり", "事実確認"
  ]) {
    assert.ok(body.includes(phrase) || (phrase === "0 件" && body.includes("お手本ゼロ件")), "missing: "+phrase);
  }
  assert.match(body, /指示が短いか長いか/);
  assert.match(body, /事前学習がゼロ/);
  assert.match(body, /^## ここで迷ったら$/m);
  assert.match(body, /^## 今回のまとめ$/m);
  assert.match(body, /^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body, /^## 最後に一本でつなぐ$/m);
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  for (const link of [
    "/articles/what-is-prompt",
    "/articles/what-is-generative-ai",
    "/articles/what-is-machine-learning"
  ]) assert.ok(body.includes(link), "missing rewind link: "+link);
  const headings = [...body.matchAll(/^## (.+)$/gm)].map(x=>x[1]);
  for (const h of headings) assert.ok(h.length <= 18,"long mobile H2: "+h);

  const refs = [...body.matchAll(/\/images\/articles\/zero-shot\/([a-z0-9-]+\.svg)/g)].map(x=>x[1]);
  assert.deepEqual(refs, figures);
  for (const filename of figures) {
    const p=path.join(process.cwd(),"public/images/articles/zero-shot",filename);
    assert.ok(existsSync(p),"missing figure "+filename);
    const svg=readFileSync(p,"utf8");
    assert.ok(svg.length>1500);
    assert.match(svg, /<svg/);
    assert.match(svg, /<title id="title">/);
  }
});
