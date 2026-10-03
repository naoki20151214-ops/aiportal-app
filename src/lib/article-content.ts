import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import type { Article, ArticleMetadata } from "../types/article";

const requiredTextFields = [
  "title", "slug", "description", "category", "publishedAt",
  "updatedAt", "author", "thumbnail",
] as const;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseArticle(source: string, filename: string): Article {
  const fail = (message: string): never => {
    throw new Error(`記事 ${filename}: ${message}`);
  };
  const match = source.replace(/^\uFEFF/, "").match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/,
  );
  if (!match) return fail("ファイル先頭に --- で囲んだfrontmatterが必要です。");

  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) return fail(document.errors[0].message);
  const data: unknown = document.toJS({ maxAliasCount: 10 });
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("frontmatterはキーと値の形式で記入してください。");
  }
  const fields = data as Record<string, unknown>;
  for (const field of requiredTextFields) {
    if (typeof fields[field] !== "string" || !fields[field].trim()) {
      return fail(`${field}は空でない文字列で指定してください。日付も引用符で囲んでください。`);
    }
  }
  if (!Array.isArray(fields.tags) || fields.tags.some(
    (tag) => typeof tag !== "string" || !tag.trim(),
  )) return fail("tagsは文字列の配列で指定してください（例: [\"AI\", \"入門\"]）。");

  const metadata = Object.fromEntries(
    requiredTextFields.map((field) => [field, (fields[field] as string).trim()]),
  ) as Omit<ArticleMetadata, "tags">;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug)) {
    return fail("slugは半角英小文字・数字・ハイフンで指定してください。");
  }
  if (!validDate(metadata.publishedAt) || !validDate(metadata.updatedAt)) {
    return fail("publishedAtとupdatedAtは実在する日付をYYYY-MM-DD形式で指定してください。");
  }
  if (metadata.updatedAt < metadata.publishedAt) {
    return fail("updatedAtはpublishedAt以降の日付にしてください。");
  }
  if (metadata.thumbnail.includes("\\")) return fail("thumbnailにはバックスラッシュを使用できません。");
  if (!/^\/(?!\/)/.test(metadata.thumbnail)) {
    let thumbnail: URL;
    try { thumbnail = new URL(metadata.thumbnail); }
    catch { return fail("thumbnailは / から始まる画像パスかHTTP(S) URLにしてください。"); }
    if (!["http:", "https:"].includes(thumbnail.protocol) || thumbnail.username || thumbnail.password) {
      return fail("thumbnailは / から始まる画像パスかHTTP(S) URLにしてください。");
    }
  }
  if (!match[2].trim()) return fail("frontmatterの下にMarkdown本文が必要です。");
  return {
    ...metadata,
    tags: [...new Set((fields.tags as string[]).map((tag) => tag.trim()))],
    content: match[2].trim(),
  };
}

export function readArticles(directory: string): Article[] {
  const slugs = new Set<string>();
  const articles = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const article = parseArticle(readFileSync(path.join(directory, entry.name), "utf8"), entry.name);
      if (slugs.has(article.slug)) throw new Error(`記事 ${entry.name}: slug「${article.slug}」が重複しています。`);
      slugs.add(article.slug);
      return article;
    });
  return articles.sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug),
  );
}
