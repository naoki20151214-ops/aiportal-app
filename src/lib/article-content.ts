import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import type { Article, ArticleMetadata, ArticleStatus, ArticleType } from "../types/article";
import { isContentCategory } from "./categories";

const requiredTextFields = [
  "title", "slug", "description", "category", "publishedAt",
  "updatedAt", "author", "thumbnail",
] as const;

const articleStatuses: ArticleStatus[] = ["draft", "review", "ready", "scheduled", "published"];
const articleTypes: ArticleType[] = ["concept", "mechanism", "practice", "comparison", "news", "reference"];

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

  const status: ArticleStatus = fields.status === undefined
    ? "published"
    : typeof fields.status === "string" && articleStatuses.includes(fields.status as ArticleStatus)
      ? fields.status as ArticleStatus
      : fail("statusはdraft、review、ready、scheduled、publishedのいずれかで指定してください。");

  if (fields.status !== undefined) {
    if (typeof fields.id !== "string" || !/^(BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}$/.test(fields.id)) {
      return fail("statusを指定する記事はRegistry形式のidが必要です。");
    }
    if (!Number.isInteger(fields.level) || (fields.level as number) < 0 || (fields.level as number) > 5) {
      return fail("statusを指定する記事は0〜5のlevelが必要です。");
    }
    if (typeof fields.type !== "string" || !articleTypes.includes(fields.type as ArticleType)) {
      return fail("statusを指定する記事は有効なtypeが必要です。");
    }
  }

  if (fields.publishAt !== undefined) {
    if (typeof fields.publishAt !== "string" || Number.isNaN(Date.parse(fields.publishAt))) {
      return fail("publishAtはタイムゾーンを含むISO 8601日時で指定してください。");
    }
    if (status !== "scheduled") return fail("publishAtはstatusがscheduledのときだけ指定できます。");
  }
  if (status === "scheduled" && fields.publishAt === undefined) {
    return fail("scheduled記事にはpublishAtが必要です。");
  }

  if (fields.affiliateCampaign !== undefined &&
      (typeof fields.affiliateCampaign !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.affiliateCampaign))) {
    return fail("affiliateCampaignは案件IDを半角英小文字・数字・ハイフンで指定してください。");
  }
  if (fields.adPolicy !== undefined && (typeof fields.adPolicy !== "string" || !["auto", "reduced", "off"].includes(fields.adPolicy))) {
    return fail("adPolicyはauto、reduced、offのいずれかで指定してください。");
  }

  const metadata = Object.fromEntries(
    requiredTextFields.map((field) => [field, (fields[field] as string).trim()]),
  ) as unknown as Omit<ArticleMetadata, "tags" | "status">;
  if (!isContentCategory(metadata.category)) {
    return fail("categoryはAIニュース、AI基礎・技術、生成AI、AIエージェント、フィジカルAI・ロボティクス、AI開発・インフラ、AI活用・社会のいずれかで指定してください。");
  }
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
    status,
    tags: [...new Set((fields.tags as string[]).map((tag) => tag.trim()))],
    ...(fields.id !== undefined ? { id: fields.id as string } : {}),
    ...(fields.level !== undefined ? { level: fields.level as number } : {}),
    ...(fields.type !== undefined ? { type: fields.type as ArticleType } : {}),
    ...(fields.publishAt !== undefined ? { publishAt: fields.publishAt as string } : {}),
    ...(fields.affiliateCampaign !== undefined ? { affiliateCampaign: fields.affiliateCampaign as string } : {}),
    ...(fields.adPolicy !== undefined ? { adPolicy: fields.adPolicy as ArticleMetadata["adPolicy"] } : {}),
    content: match[2].trim(),
  };
}

export function readAllArticles(directory: string): Article[] {
  const slugs = new Set<string>();
  const ids = new Set<string>();
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const article = parseArticle(readFileSync(path.join(directory, entry.name), "utf8"), entry.name);
      if (slugs.has(article.slug)) throw new Error(`記事 ${entry.name}: slug「${article.slug}」が重複しています。`);
      slugs.add(article.slug);
      if (article.id) {
        if (ids.has(article.id)) throw new Error(`記事 ${entry.name}: id「${article.id}」が重複しています。`);
        ids.add(article.id);
      }
      return article;
    });
}

export function readArticles(directory: string): Article[] {
  const includeReview = process.env.CF_PAGES_BRANCH?.startsWith("preview/") ?? false;
  return readAllArticles(directory)
    .filter(
      (article) =>
        article.status === "published" ||
        (includeReview && (article.status === "review" || article.status === "ready")),
    )
    .sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug),
    );
}
