import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { contentCategories } from "../src/lib/categories";
import { readArticles } from "../src/lib/article-content";

type Taxonomy = {
  categories: string[];
  levels: Record<string, string>;
  types: string[];
  statuses: string[];
  priorities: string[];
};

type KnowledgeNode = {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: number;
  type: string;
  status: string;
  centerQuestion: string;
  prerequisites: string[];
  children: string[];
  related: string[];
  priority: string;
  publishAt?: string;
};

type KnowledgeRegistry = {
  schemaVersion: number;
  nodeCount: number;
  nodes: KnowledgeNode[];
};

type LearningPath = {
  id: string;
  title: string;
  audience: string;
  nodes: string[];
};

const registryDir = path.join(process.cwd(), "content/registry");
const load = <T>(name: string): T => parse(readFileSync(path.join(registryDir, name), "utf8")) as T;

test("Registryのカテゴリ定義はアプリの固定7カテゴリと一致する", () => {
  const taxonomy = load<Taxonomy>("taxonomy.yml");
  assert.deepEqual(taxonomy.categories, [...contentCategories]);
  assert.deepEqual(Object.keys(taxonomy.levels), ["0", "1", "2", "3", "4", "5"]);
  assert.ok(taxonomy.types.length > 0);
  assert.ok(taxonomy.statuses.includes("published"));
  assert.ok(taxonomy.statuses.includes("scheduled"));
});

test("Knowledge NodeのID・slugは一意で、固定語彙だけを使う", () => {
  const taxonomy = load<Taxonomy>("taxonomy.yml");
  const registry = load<KnowledgeRegistry>("knowledge-nodes.yml");
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.nodeCount, registry.nodes.length);
  assert.ok(registry.nodes.length >= 100);

  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const node of registry.nodes) {
    assert.match(node.id, /^(BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}$/);
    assert.ok(!ids.has(node.id), `duplicate id: ${node.id}`);
    ids.add(node.id);

    assert.match(node.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!slugs.has(node.slug), `duplicate slug: ${node.slug}`);
    slugs.add(node.slug);

    assert.ok(taxonomy.categories.includes(node.category), `invalid category: ${node.id}`);
    assert.ok(Number.isInteger(node.level) && node.level >= 0 && node.level <= 5, `invalid level: ${node.id}`);
    assert.ok(taxonomy.types.includes(node.type), `invalid type: ${node.id}`);
    assert.ok(taxonomy.statuses.includes(node.status), `invalid status: ${node.id}`);
    assert.ok(taxonomy.priorities.includes(node.priority), `invalid priority: ${node.id}`);
    assert.ok(typeof node.title === "string" && node.title.trim(), `missing title: ${node.id}`);
    assert.ok(typeof node.centerQuestion === "string" && node.centerQuestion.trim(), `missing centerQuestion: ${node.id}`);

    for (const key of ["prerequisites", "children", "related"] as const) {
      assert.ok(Array.isArray(node[key]), `${key} must be array: ${node.id}`);
      assert.equal(new Set(node[key]).size, node[key].length, `duplicate ${key}: ${node.id}`);
      assert.ok(!node[key].includes(node.id), `self reference in ${key}: ${node.id}`);
    }

    if (node.status === "scheduled") {
      assert.ok(node.publishAt, `scheduled node requires publishAt: ${node.id}`);
      assert.ok(!Number.isNaN(Date.parse(node.publishAt!)), `invalid publishAt: ${node.id}`);
    }
  }
});

test("Knowledge Graphの内部参照はすべて存在する", () => {
  const registry = load<KnowledgeRegistry>("knowledge-nodes.yml");
  const ids = new Set(registry.nodes.map((node) => node.id));

  for (const node of registry.nodes) {
    for (const key of ["prerequisites", "children", "related"] as const) {
      for (const target of node[key]) {
        assert.ok(ids.has(target), `${node.id} -> ${target} in ${key} does not exist`);
      }
    }
  }
});

test("Learning Pathは存在するKnowledge Nodeだけを参照する", () => {
  const registry = load<KnowledgeRegistry>("knowledge-nodes.yml");
  const ids = new Set(registry.nodes.map((node) => node.id));
  const data = load<{ schemaVersion: number; paths: LearningPath[] }>("learning-paths.yml");
  const pathIds = new Set<string>();

  for (const learningPath of data.paths) {
    assert.ok(!pathIds.has(learningPath.id), `duplicate path id: ${learningPath.id}`);
    pathIds.add(learningPath.id);
    assert.ok(learningPath.nodes.length > 0, `empty learning path: ${learningPath.id}`);
    assert.equal(new Set(learningPath.nodes).size, learningPath.nodes.length, `duplicate node in path: ${learningPath.id}`);
    for (const id of learningPath.nodes) {
      assert.ok(ids.has(id), `${learningPath.id} references missing node ${id}`);
    }
  }
});

test("公開済み記事とpublished Knowledge Nodeはslug・categoryが1対1で一致する", () => {
  const registry = load<KnowledgeRegistry>("knowledge-nodes.yml");
  const published = registry.nodes.filter((node) => node.status === "published");
  const articles = readArticles(path.join(process.cwd(), "content/articles"));

  const publishedBySlug = new Map(published.map((node) => [node.slug, node]));
  const articleBySlug = new Map(articles.map((article) => [article.slug, article]));

  assert.equal(published.length, articles.length);

  for (const article of articles) {
    const node = publishedBySlug.get(article.slug);
    assert.ok(node, `published registry node missing for article: ${article.slug}`);
    assert.equal(node.category, article.category, `category mismatch: ${article.slug}`);
  }

  for (const node of published) {
    assert.ok(articleBySlug.has(node.slug), `article file missing for published node: ${node.id}`);
  }
});

test("公開計画はタイムゾーンと段階公開ルールを保持する", () => {
  const plan = load<{
    timezone: string;
    automation: { enabled: boolean; strategy: string };
    candidateCadence: { maxPerDay: number; spacingMinutes: number; localTimes: string[] };
    qualityGate: { required: string[]; wordCountRule: string };
  }>("publishing-plan.yml");

  assert.equal(plan.timezone, "Asia/Tokyo");
  assert.equal(plan.automation.enabled, false);
  assert.equal(plan.automation.strategy, "staged");
  assert.equal(plan.candidateCadence.maxPerDay, 10);
  assert.equal(plan.candidateCadence.spacingMinutes, 60);
  assert.equal(new Set(plan.candidateCadence.localTimes).size, plan.candidateCadence.localTimes.length);
  assert.ok(plan.qualityGate.required.length > 0);
  assert.equal(plan.qualityGate.wordCountRule, "固定しない");
});
