import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { contentCategories } from "../src/lib/categories";
import { readAllArticles, readArticles } from "../src/lib/article-content";

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
  assert.ok(registry.nodes.length >= 500);

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

type CoreCurriculum = {
  targetArticleCount: number;
  bridgeNodes: string[];
  days: Array<{ day: number; nodes: string[] }>;
};

test("Core Curriculumは100記事で、前提依存順とPriorityルールを満たす", () => {
  const registry = load<KnowledgeRegistry>("knowledge-nodes.yml");
  const core = load<CoreCurriculum>("core-curriculum.yml");
  const byId = new Map(registry.nodes.map((node) => [node.id, node]));

  assert.equal(core.targetArticleCount, 100);
  assert.equal(core.days.length, 10);
  assert.deepEqual(core.days.map((day) => day.day), [1,2,3,4,5,6,7,8,9,10]);
  for (const day of core.days) assert.equal(day.nodes.length, 10, `day ${day.day} must contain 10 nodes`);

  const ordered = core.days.flatMap((day) => day.nodes);
  assert.equal(ordered.length, 100);
  assert.equal(new Set(ordered).size, 100);

  const bridge = new Set(core.bridgeNodes);
  const seen = new Set<string>();

  for (const id of ordered) {
    const node = byId.get(id);
    assert.ok(node, `core node does not exist: ${id}`);
    assert.notEqual(node.category, "AIニュース", `news must not enter evergreen core: ${id}`);
    assert.ok(node.priority === "A" || bridge.has(id), `core node must be Priority A or bridge: ${id}`);

    for (const prerequisiteId of node.prerequisites) {
      const prerequisite = byId.get(prerequisiteId);
      assert.ok(prerequisite, `missing prerequisite: ${id} -> ${prerequisiteId}`);
      assert.ok(
        prerequisite.status === "published" || seen.has(prerequisiteId),
        `prerequisite must be published or earlier in core: ${id} -> ${prerequisiteId}`,
      );
    }
    seen.add(id);
  }

  for (const bridgeId of bridge) assert.ok(ordered.includes(bridgeId), `unused bridge node: ${bridgeId}`);
});

test("公開計画はCore Curriculumを自動公開せずQuality Gate後に出す", () => {
  const plan = load<{
    coreCurriculum: {
      file: string;
      targetArticleCount: number;
      batchCount: number;
      articlesPerBatch: number;
      ordering: string;
      autoSchedule: boolean;
      releaseGate: string;
    };
  }>("publishing-plan.yml");

  assert.equal(plan.coreCurriculum.file, "core-curriculum.yml");
  assert.equal(plan.coreCurriculum.targetArticleCount, 100);
  assert.equal(plan.coreCurriculum.batchCount, 10);
  assert.equal(plan.coreCurriculum.articlesPerBatch, 10);
  assert.equal(plan.coreCurriculum.ordering, "dependency-first");
  assert.equal(plan.coreCurriculum.autoSchedule, false);
  assert.match(plan.coreCurriculum.releaseGate, /ready|scheduled/);
});


test("status付き記事はRegistryのid・slug・category・level・type・statusと一致する", () => {
  const registry = load<KnowledgeRegistry>("knowledge-nodes.yml");
  const byId = new Map(registry.nodes.map((node) => [node.id, node]));
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));

  for (const article of articles) {
    if (!article.id) continue;
    const node = byId.get(article.id);
    assert.ok(node, `Registry node missing for article id: ${article.id}`);
    assert.equal(node.slug, article.slug, `slug mismatch: ${article.id}`);
    assert.equal(node.category, article.category, `category mismatch: ${article.id}`);
    assert.equal(node.level, article.level, `level mismatch: ${article.id}`);
    assert.equal(node.type, article.type, `type mismatch: ${article.id}`);
    assert.equal(node.status, article.status, `status mismatch: ${article.id}`);
  }
});
