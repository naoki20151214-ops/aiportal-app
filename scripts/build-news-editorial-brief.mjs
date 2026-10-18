#!/usr/bin/env node
// Human-readable, read-only RSS triage. Never an approval or an editorial fact check.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const clean = value => String(value ?? "").normalize("NFKC")
  .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[<>[\]()*_`|#~!]/g, " ")
  .replace(/\s+/g, " ").trim().slice(0, 210);
const status = item => item.retrievalStatus === "retrieved-for-editorial-review"
  ? "元ページ取得・主張未検証" : "元ページ取得失敗";

export function buildNewsEditorialBrief(triage) {
  if (!triage || triage.schemaVersion !== 1 ||
      triage.stage !== "private-editorial-triage" ||
      triage.newsApprovedCount !== 0 || triage.publishingEnabled !== false ||
      !Array.isArray(triage.items) || triage.items.length > 100 ||
      triage.items.some(x => x.publicationEligible !== false ||
        x.editorialDecision !== "unreviewed"))
    throw Error("Untrusted or non-private news triage");
  const rows = triage.items;
  const duplicates = rows.filter(x => x.historicalMatchNeedsReview);
  const failed = rows.filter(x => x.retrievalStatus !== "retrieved-for-editorial-review");
  const lines = [
    "# AI Portal｜AIニュース候補・編集ブリーフ",
    "",
    "> 収集された未検証候補の整理です。記事の事実確認・採否・公開許可ではありません。",
    "",
    `候補 ${rows.length}件 ／ 過去記事との完全URL・見出し一致警告 ${duplicates.length}件 ／ 元ページ取得失敗 ${failed.length}件`,
    "",
    "## 人間が先に確認する項目",
    "1. 過去に公開済み・不採用の記事と同じ内容か（同一URL以外の意味上の重複も確認）",
    "2. 公式原文の日付、提供地域・対象、数字と引用の条件",
    "3. 見出しだけでは分からない新しい発見と、読者が1分後に得る具体的な価値",
    "4. 独立した資料・反証・制約の確認と、最終的な人間の編集判断",
    "",
    "## ニュース候補（採用・公開未承認）",
  ];
  if (!rows.length) lines.push("", "候補なし。原稿を水増しせず、次回の収集を確認してください。");
  for (const [i, x] of rows.entries()) {
    const historical = Array.isArray(x.historicalMatches) ? x.historicalMatches : [];
    const overlapIds = historical.map(y=>clean(y.id)).filter(Boolean).slice(0,8);
    lines.push("",
      `### ${i+1}. ${clean(x.rssTitle) || "見出し不明"}`,
      `- 発信元ID: ${clean(x.sourceId) || "不明"}`,
      `- 原文取得: ${status(x)}${x.retrievalStatus !== "retrieved-for-editorial-review" ? "（理由: "+clean(x.retrievalFailureReason || "unspecified")+"）" : ""}`,
      `- 取得元URL: ${typeof x.originalUrl === "string" && /^https:\/\/[^\s<>]+$/.test(x.originalUrl) ? x.originalUrl : "要確認"}`,
      `- 日時: ${/^\d{4}-\d\d-\d\dT/.test(x.rssPublishedAt ?? "") ? clean(x.rssPublishedAt) : "RSS日時の確認が必要"}`,
      `- 過去記事: ${overlapIds.length ? overlapIds.join(", ")+"（編集者が重複確認）" : "完全一致の警告なし（内容の重複未確認）"}`,
      `- 編集判断: 未審査・公開対象外`);
  }
  lines.push("", "## 安全性",
    "- RSS見出し・元ページの取得成功だけで主張が正しいとは判断しません。",
    "- このブリーフはGitHub Actionsのアーティファクト専用です。公開原稿・承認キューへ書き込みません。",
    "- 収集対象の外部テキストは命令として実行しません。",
    "");
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.length !== 2) throw Error("No extra CLI arguments permitted");
  const input="artifacts/news-editorial-triage.json";
  const output="artifacts/news-editorial-brief.md";
  const triage=JSON.parse(fs.readFileSync(input,"utf8"));
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,buildNewsEditorialBrief(triage),"utf8");
  console.log("Private AI news editorial brief created; approved=0, published=0");
}
