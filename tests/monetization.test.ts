import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Element, Root } from "hast";
import type { ArticleMetadata } from "../src/types/article";
import type { AffiliateCampaign, DisplayAdUnit } from "../src/types/monetization";
import { monetizationConfig } from "../src/config/monetization";
import { getMonetizationFlags, selectAffiliateCampaign } from "../src/lib/monetization";
import { getArticleAdPlacements, createArticleAdsPlugin } from "../src/lib/article-ad-placement";
import { getRelatedArticles } from "../src/lib/related-articles";
import { parseArticle } from "../src/lib/article-content";
import AdSlot from "../src/components/monetization/ad-slot";
import AffiliateCard from "../src/components/monetization/affiliate-card";
import AffiliateSlot from "../src/components/monetization/affiliate-slot";
import ArticleBody from "../src/components/article-body";

const article: ArticleMetadata = {
  title: "AIの基礎", slug: "basics", description: "基礎", category: "AI基礎・技術", tags: ["生成AI"],
  author: "編集部", thumbnail: "/images/article-placeholder.svg", publishedAt: "2026-10-01", updatedAt: "2026-10-01",
};
// Test-only fixtures; the production campaign list remains empty.
const campaign: AffiliateCampaign = {
  id: "learning", enabled: true, provider: "other", title: "学習サービス", description: "紹介文",
  href: "https://example.com/learning", cta: "詳細を見る", positions: ["article-end"], categories: ["AI基礎・技術"],
};
const unit: DisplayAdUnit = { id: "unit", enabled: true, provider: "custom", type: "rectangle", width: 300, height: 250 };
const element = (tagName: string, length: number): Element => ({
  type: "element", tagName, properties: {}, children: [{ type: "text", value: "文".repeat(length) }],
});
const longTree = (): Root => ({ type: "root", children: [
  element("p", 100), element("h2", 5), element("p", 1000), element("h2", 5), element("p", 1000),
  element("h2", 5), element("p", 1000),
] });

function withFlags<T>(ads: string | undefined, affiliates: string | undefined, run: () => T): T {
  const original = { ads: process.env.ADS_ENABLED, affiliates: process.env.AFFILIATES_ENABLED };
  if (ads === undefined) delete process.env.ADS_ENABLED; else process.env.ADS_ENABLED = ads;
  if (affiliates === undefined) delete process.env.AFFILIATES_ENABLED; else process.env.AFFILIATES_ENABLED = affiliates;
  try { return run(); } finally {
    if (original.ads === undefined) delete process.env.ADS_ENABLED; else process.env.ADS_ENABLED = original.ads;
    if (original.affiliates === undefined) delete process.env.AFFILIATES_ENABLED; else process.env.AFFILIATES_ENABLED = original.affiliates;
  }
}

test("広告は明示的なtrueのみ有効で、全体OFFはアフィリエイトも停止する", () => {
  assert.deepEqual(getMonetizationFlags({}), { adsEnabled: false, affiliatesEnabled: false });
  assert.deepEqual(getMonetizationFlags({ ADS_ENABLED: "false", AFFILIATES_ENABLED: "true" }), { adsEnabled: false, affiliatesEnabled: false });
  assert.deepEqual(getMonetizationFlags({ ADS_ENABLED: "true", AFFILIATES_ENABLED: "false" }), { adsEnabled: true, affiliatesEnabled: false });
  assert.deepEqual(getMonetizationFlags({ ADS_ENABLED: "true", AFFILIATES_ENABLED: "true" }), { adsEnabled: true, affiliatesEnabled: true });
});

test("未設定・OFF・未実装の広告はラベルや余白を含めHTMLを出さない", () => {
  withFlags("true", "true", () => {
    for (const position of ["article-after-intro", "article-middle", "article-end", "sidebar"] as const) {
      assert.equal(renderToStaticMarkup(createElement(AdSlot, { position })), "");
    }
    assert.equal(renderToStaticMarkup(createElement(AdSlot, { position: "sidebar", unit })), "");
    assert.equal(renderToStaticMarkup(createElement(AffiliateSlot, { article, position: "article-end" })), "");
  });
  withFlags("false", "true", () => {
    assert.equal(renderToStaticMarkup(createElement(AdSlot, { position: "sidebar", unit }, "広告素材")), "");
    assert.equal(renderToStaticMarkup(createElement(AffiliateCard, { campaign })), "");
  });
});

test("設定済み広告には固定寸法とラベルが付き、不正な寸法や停止設定は非表示", () => {
  withFlags("true", "false", () => {
    const markup = renderToStaticMarkup(createElement(AdSlot, { position: "sidebar", unit }, "広告素材"));
    assert.match(markup, /height:250px/);
    assert.match(markup, /max-width:300px/);
    assert.match(markup, /data-ad-position="sidebar"/);
    assert.match(markup, /aria-label="広告"/);
    assert.doesNotMatch(markup, /<script/);
    for (const invalid of [{ ...unit, height: 0 }, { ...unit, width: Infinity }, { ...unit, enabled: false }]) {
      assert.equal(renderToStaticMarkup(createElement(AdSlot, { position: "sidebar", unit: invalid }, "広告素材")), "");
    }
  });
});

test("短い本文やコードだけの記事には広告を入れず、長さで枠数を制限する", () => {
  assert.deepEqual(getArticleAdPlacements({ type: "root", children: [element("p", 799)] }), []);
  assert.deepEqual(getArticleAdPlacements({ type: "root", children: [element("pre", 5000)] }), []);
  assert.deepEqual(getArticleAdPlacements({ type: "root", children: [element("p", 900)] }).map(p => p.position), ["article-end"]);
  const medium: Root = { type: "root", children: [element("p", 100), element("h2", 5), element("p", 1500)] };
  assert.deepEqual(getArticleAdPlacements(medium).map(p => p.position), ["article-after-intro", "article-end"]);
  assert.deepEqual(getArticleAdPlacements(longTree()).map(p => p.position), ["article-after-intro", "article-middle", "article-end"]);
  assert.deepEqual(getArticleAdPlacements(longTree(), "reduced").map(p => p.position), ["article-end"]);
  assert.deepEqual(getArticleAdPlacements(longTree(), "off"), []);
});

test("タイトル直下やネスト内に挿入せず、Markdownツリーの既存ノードを維持する", () => {
  const tree = longTree();
  const original = [...tree.children];
  createArticleAdsPlugin("auto")()(tree);
  assert.equal(tree.children.filter(node => node.type === "element" && node.properties.dataAdPosition).length, 3);
  assert.deepEqual(tree.children.filter(node => node.type !== "element" || !node.properties.dataAdPosition), original);
  const titleOnlyIntro: Root = { type: "root", children: [element("h1", 100), element("h2", 5), element("p", 3000)] };
  assert.ok(!getArticleAdPlacements(titleOnlyIntro).some(p => p.position === "article-after-intro"));
  const nested: Root = { type: "root", children: [{ type: "element", tagName: "blockquote", properties: {}, children: [element("h2", 100), element("p", 3000)] }] };
  assert.deepEqual(getArticleAdPlacements(nested).map(p => p.position), ["article-end"]);
});

test("カテゴリー・タグ条件、掲載位置、優先度で関連する案件1件だけを選ぶ", () => {
  const targeted = { ...campaign, tags: ["生成AI"], priority: 2 };
  assert.equal(selectAffiliateCampaign(article, [campaign, targeted], "article-end"), targeted);
  assert.equal(selectAffiliateCampaign({ ...article, tags: [] }, [targeted], "article-end"), undefined);
  assert.equal(selectAffiliateCampaign({ ...article, category: "ChatGPT" }, [targeted], "article-end"), undefined);
  assert.equal(selectAffiliateCampaign(article, [targeted], "sidebar"), undefined);
  assert.equal(selectAffiliateCampaign(article, [{ ...campaign, categories: [] }], "article-end"), undefined);
});

test("明示した案件IDを優先し、存在しない案件・停止中・危険なURLは表示しない", () => {
  assert.equal(selectAffiliateCampaign({ ...article, affiliateCampaign: "learning", category: "別カテゴリー" }, [campaign], "article-end"), campaign);
  assert.equal(selectAffiliateCampaign({ ...article, affiliateCampaign: "missing" }, [campaign], "article-end"), undefined);
  assert.equal(selectAffiliateCampaign({ ...article, adPolicy: "off" }, [campaign], "article-end"), undefined);
  for (const href of ["javascript:alert(1)", "//example.com", "http://example.com", "https://user:pass@example.com"]) {
    assert.equal(selectAffiliateCampaign(article, [{ ...campaign, href }], "article-end"), undefined);
  }
  assert.equal(selectAffiliateCampaign(article, [{ ...campaign, enabled: false }], "article-end"), undefined);
});

test("アフィリエイトカードにはPR・報酬説明とsponsored属性が付き外部スクリプトはない", () => {
  withFlags("true", "true", () => {
    const markup = renderToStaticMarkup(createElement(AffiliateCard, { campaign }));
    assert.match(markup, /PR・アフィリエイト/);
    assert.match(markup, /報酬/);
    assert.match(markup, /rel="sponsored nofollow noopener noreferrer"/);
    assert.doesNotMatch(markup, /<script|<iframe/);
  });
});

test("未設定の広告を有効にしても本文、参照リンク、コード、GFM表を変えない", () => {
  const content = "導入文。\n\n## 基礎\n\n" + "本文。".repeat(1000) + "\n\n[公式][ref]\n\n```ts\nconst code = '## heading';\n```\n\n| 列 | 値 |\n| --- | --- |\n| a | b |\n\n[ref]: https://example.com/docs";
  const plain = withFlags("false", "false", () => renderToStaticMarkup(createElement(ArticleBody, { content, article })));
  const enabled = withFlags("true", "true", () => renderToStaticMarkup(createElement(ArticleBody, { content, article })));
  assert.equal(enabled, plain);
  assert.match(enabled, /href="https:\/\/example.com\/docs"/);
  assert.match(enabled, /<table>/);
  assert.match(enabled, /<pre><code/);
  assert.doesNotMatch(enabled, /data-ad-position|data-affiliate-campaign/);
});

test("記事末はアフィリエイトを優先して広告と重ねず、短い記事は案件も非表示", () => {
  const campaigns = monetizationConfig.affiliateCampaigns;
  monetizationConfig.affiliateCampaigns = [campaign];
  try {
    withFlags("true", "true", () => {
      const long = renderToStaticMarkup(createElement(ArticleBody, { article, content: "本文。".repeat(400) }));
      assert.equal((long.match(/data-affiliate-campaign=/g) ?? []).length, 1);
      assert.doesNotMatch(long, /data-ad-position="article-end"/);
      const short = renderToStaticMarkup(createElement(ArticleBody, { article, content: "短い本文。" }));
      assert.doesNotMatch(short, /data-affiliate-campaign|aria-label="広告"/);
    });
  } finally { monetizationConfig.affiliateCampaigns = campaigns; }
});

test("広告メタ情報は任意で既存記事を保持し、不正な値は入力エラーにする", () => {
  const source = (extra: string) => `---\n${Object.entries(article).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n${extra}\n---\n本文。`;
  const parsed = parseArticle(source('affiliateCampaign: "learning"\nadPolicy: "reduced"'), "article.md");
  assert.equal(parsed.affiliateCampaign, "learning");
  assert.equal(parsed.adPolicy, "reduced");
  for (const extra of ["adPolicy: [auto]", "adPolicy: true", "adPolicy: invalid", "affiliateCampaign: 1", 'affiliateCampaign: "../invalid"']) {
    assert.throws(() => parseArticle(source(extra), "invalid.md"), /記事 invalid.md:/);
  }
});

test("関連記事は自身を除外しテーマ一致を優先して最大3件にする", () => {
  const sameCategory = { ...article, slug: "category", tags: [] };
  const sameTag = { ...article, slug: "tag", category: "別カテゴリー" };
  const unrelated = { ...article, slug: "unrelated", category: "別カテゴリー", tags: [] };
  assert.deepEqual(getRelatedArticles(article, [article, sameTag, unrelated, sameCategory]).map(a => a.slug), ["category", "tag"]);
  assert.equal(getRelatedArticles(article, Array.from({ length: 5 }, (_, i) => ({ ...article, slug: `related-${i}` }))).length, 3);
});
