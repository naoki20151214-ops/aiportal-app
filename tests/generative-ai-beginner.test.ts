import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath = path.join(process.cwd(), "content/articles/what-is-generative-ai.md");
const images = ["hero.svg", "fig-01-compare.svg", "fig-02-next.svg", "fig-03-text-image.svg"];

test("生成AIの合格済み記事はreadyで、Registryと一致する", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const node = registry.nodes.find((x: { id: string }) => x.id === "GEN-0001");
  const article = articles.find(a => a.id === "GEN-0001");
  assert.ok(article);
  assert.ok(node);
  assert.equal(article.status, "ready");
  assert.equal(node.status, "ready");
  assert.equal(article.level, 0);
  assert.equal(article.type, "concept");
  assert.equal(article.slug, "what-is-generative-ai");
  assert.equal(article.category, "生成AI");
  assert.equal(node.category, article.category);
  assert.deepEqual(node.prerequisites, ["BAS-0001"]);
  assert.ok(node.nextReading.some((item: {id:string})=>item.id==="GEN-0003"));
  assert.equal(articles.find(a=>a.id==="BAS-0030")?.status, "ready");
  assert.equal(articles.find(a=>a.id==="BAS-0020")?.status, "review");
  assert.equal(articles.find(a=>a.id==="BAS-0101")?.status, "ready");
});

test("町内会の物語から分類と生成を区別し、復習導線と図解4枚を備える", () => {
  const source = readFileSync(articlePath, "utf8");
  const body = source.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 3900 && body.length <= 6000, "beginner article length outside target");
  assert.match(body.slice(0, 700), /町内会/);
  for (const phrase of ["迷惑メール", "案内文", "生成AI", "分類", "予測", "画像", "音声", "動画", "Token", "ハルシネーション", "確認", "GAN", "Transformer"]) {
    assert.ok(body.includes(phrase), "missing concept: "+phrase);
  }
  assert.match(body, /^## ここで迷ったら$/m);
  assert.match(body, /^## 今回のまとめ$/m);
  assert.doesNotMatch(body, /^## 最後に一本でつなぐ$/m);
  assert.match(body, /^## 分からなければ戻ろう$/m);
  for (const href of [
    "/articles/what-is-ai",
    "/articles/what-is-language-model",
    "/articles/what-is-token",
    "/articles/what-is-multimodal",
  ]) {
    assert.ok(body.includes(href), "missing rewind link: "+href);
  }
  assert.doesNotMatch(body, /\]\(\/articles\/what-is-prompt\)/, "planned article must not be linked directly");
  const headings = [...body.matchAll(/^## (.+)$/gm)].map(x=>x[1]);
  for (const heading of headings) assert.ok(heading.length <= 18, "long H2: "+heading);
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);

  const shown = [...body.matchAll(/\/images\/articles\/generative-ai\/([a-z0-9-]+\.svg)/g)].map(x=>x[1]);
  assert.deepEqual(shown, images);
  for (const image of images) {
    const file = path.join(process.cwd(), "public/images/articles/generative-ai", image);
    assert.ok(existsSync(file), "missing image "+image);
    const svg = readFileSync(file, "utf8");
    assert.ok(svg.length > 1500);
    assert.match(svg, /<svg/);
    assert.match(svg, /<title id="title">/);
  }
});
