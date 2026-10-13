import { parse } from "yaml";

const ID_RE = /^(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}$/;

export function approvalId(body) {
  const m = String(body ?? "").trim().match(/^\/publish-approved\s+((?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4})$/);
  if (!m) throw new Error("Require exactly: /publish-approved BAS-0001");
  return m[1];
}

export function frontmatter(source) {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) throw new Error("Missing YAML frontmatter");
  const fields = parse(m[1]);
  if (!fields || !ID_RE.test(fields.id ?? "") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug ?? "")) {
    throw new Error("Invalid article id or slug");
  }
  return fields;
}

export function publishArticle(source, date) {
  const fields = frontmatter(source);
  if (!["review", "ready"].includes(fields.status)) {
    throw new Error("Only review/ready can be approved for publication");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  const end = source.indexOf("\n---", 4);
  if (end < 0) throw new Error("Missing closing frontmatter");
  let header = source.slice(0, end);
  for (const [key, value] of [["status", "published"], ["publishedAt", date], ["updatedAt", date]]) {
    const re = new RegExp("^" + key + ': "[^"]+"$', "m");
    if (!re.test(header)) throw new Error("Missing frontmatter key " + key);
    header = header.replace(re, key + ': "' + value + '"');
  }
  return header + source.slice(end);
}

export function publishNode(registry, id) {
  if (!ID_RE.test(id)) throw new Error("Invalid article id");
  const start = registry.indexOf('\n  - id: "' + id + '"\n');
  if (start < 0) throw new Error("Missing node: " + id);
  const next = registry.indexOf("\n  - id:", start + 4);
  const end = next < 0 ? registry.length : next;
  const node = registry.slice(start, end);
  if (!/    status: "(planned|draft|review|ready|scheduled)"/.test(node)) {
    throw new Error("Node already published or invalid: " + id);
  }
  const parsed = parse(registry);
  const current = parsed.nodes.find(n => n.id === id);
  for (const dep of current.prerequisites ?? []) {
    if (parsed.nodes.find(n => n.id === dep)?.status !== "published") {
      throw new Error("Prerequisite not published: " + id + " -> " + dep);
    }
  }
  return registry.slice(0, start) +
    node.replace(/    status: "(planned|draft|review|ready|scheduled)"/, '    status: "published"') +
    registry.slice(end);
}

export function imagePaths(source) {
  const meta = frontmatter(source);
  const refs = [...source.matchAll(/!\[[^\]]*\]\((\/images\/[^)\s]+)\)/g)].map(m => m[1]);
  if (meta.thumbnail?.startsWith("/images/")) refs.push(meta.thumbnail);
  return [...new Set(refs.map(ref => "public" + ref))];
}

export function articleLinks(source) {
  return [...new Set([...source.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m => m[1]))];
}

export function updatePublicationTest(source, id, oldCount) {
  if (!ID_RE.test(id) || !Number.isSafeInteger(oldCount)) throw new Error("Invalid test input");
  const target = "  assert.equal(articles.length, " + oldCount + ");";
  if (source.split(target).length !== 2) throw new Error("Published count baseline not found");
  return source.replace(target,
    "  assert.equal(articles.length, " + (oldCount + 1) + ");\n" +
    '  assert.ok(articles.some(a => a.id === "' + id + '" && a.status === "published"), "Approved article not published: ' + id + '");');
}
