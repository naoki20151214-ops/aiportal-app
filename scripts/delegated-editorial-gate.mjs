import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseDocument } from "yaml";

const ID_RE = /^(BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}$/;
const HASH_RE = /^[a-f0-9]{40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_CHECKS = [
  "centralQuestion", "beginnerClarity", "narrativeExamples", "sourceAccuracy",
  "imageAccuracyAndAlt", "internalLinks", "prerequisites", "riskAndSafety",
];

export function gitBlobSha(text) {
  // Approval ledgers store Git's canonical text blob hash; normalize Windows
  // checkout line endings before comparing the immutable evidence.
  const canonical = text.replace(/\r\n/g, "\n");
  return createHash("sha1")
    .update("blob " + Buffer.byteLength(canonical, "utf8") + "\0")
    .update(canonical, "utf8")
    .digest("hex");
}

function fail(id, reason) {
  throw new Error("Delegated editorial audit blocked " + id + ": " + reason);
}

function dateValid(date) {
  if (typeof date !== "string" || !DATE_RE.test(date)) return false;
  const parsed = new Date(date + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function textEvidence(value, minimum = 24) {
  return typeof value === "string" && value.trim().length >= minimum;
}

function safeHttps(value) {
  if (typeof value !== "string" || value.length > 1500) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname &&
      !url.username && !url.password && !url.port &&
      !/^(localhost|.*\.localhost|.*\.example|example\.com)$/i.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * The standing site-owner policy can delegate the **per-article decision**,
 * never waive a separate, traceable editorial audit. A syntactic report cannot
 * itself prove scientific accuracy: independent source verification remains a
 * required human/AI-editor responsibility. CI checks format and provenance.
 */
export function verifyDelegatedEditorialAudit(root, row, source, node) {
  const id = row?.id || "unknown";
  if (!ID_RE.test(id)) fail(id, "invalid article ID");
  if (row.approvedBy !== "editorial-qa") fail(id, "invalid delegated approving actor");
  if (row.delegation !== "site-owner-standing-policy-2026-10-13")
    fail(id, "missing site-owner standing delegation");
  if (node.type === "news" || node.category === "AIニュース")
    fail(id, "news requires exceptional editorial approval");
  const expectedPath = "content/editorial-audits/" + id + ".yml";
  if (row.editorialAuditPath !== expectedPath)
    fail(id, "invalid editorial report path");
  if (!HASH_RE.test(row.editorialAuditBlob || ""))
    fail(id, "missing immutable editorial report blob");
  const fullPath = path.join(root, expectedPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile())
    fail(id, "audit report missing");
  const auditSource = fs.readFileSync(fullPath, "utf8");
  if (gitBlobSha(auditSource) !== row.editorialAuditBlob)
    fail(id, "immutable editorial report mismatch");
  const document = parseDocument(auditSource, { uniqueKeys: true });
  if (document.errors.length) fail(id, "malformed or duplicate-key editorial report");
  const report = document.toJS({ maxAliasCount: 8 });
  if (!report || typeof report !== "object" || Array.isArray(report))
    fail(id, "invalid audit report structure");
  if (report.schemaVersion !== 1 || report.id !== id || report.slug !== row.slug)
    fail(id, "audit article identity mismatch");
  if (!dateValid(report.auditedOn) || report.auditedOn !== row.approvedOn)
    fail(id, "audit date does not match approval");
  if (report.readyArticleBlob !== gitBlobSha(source) ||
      report.readyArticleBlob !== row.sourceArticleBlob)
    fail(id, "audit not bound to exact approved ready article");
  if (report.scope !== "standard-evergreen" || report.decision !== "pass" ||
      report.humanEscalationRequired !== false)
    fail(id, "audit is not a passing standard-evergreen review");
  if (!Array.isArray(report.blockingFindings) || report.blockingFindings.length)
    fail(id, "unresolved blocking findings");
  const who = report.reviewProcess;
  if (!who || !textEvidence(who.writerId, 3) ||
      !textEvidence(who.verifierId, 3) ||
      who.writerId === who.verifierId ||
      who.separateVerificationPass !== true)
    fail(id, "separate verifier attestation missing");

  const checks = report.checks;
  if (!checks || typeof checks !== "object" || Array.isArray(checks))
    fail(id, "quality checks missing");
  for (const check of REQUIRED_CHECKS) {
    const item = checks[check];
    if (item?.passed !== true || !textEvidence(item.evidence))
      fail(id, "quality criterion not supported: " + check);
  }

  const claims = report.criticalClaims;
  if (!Array.isArray(claims) || claims.length < 2)
    fail(id, "fewer than two independently cited claim checks");
  const sourceUrls = new Set();
  for (const claim of claims) {
    if (!textEvidence(claim?.claim, 15) ||
        !textEvidence(claim?.sourceEvidence, 35) ||
        !safeHttps(claim?.sourceUrl) ||
        claim?.verified !== true)
      fail(id, "unverifiable claim attestation");
    // The page must actually cite the source used in the audit. Inspecting
    // its factual relevance remains the editorial verifier's responsibility.
    if (!source.includes(claim.sourceUrl))
      fail(id, "audit source is not cited in the article");
    sourceUrls.add(claim.sourceUrl);
  }
  if (sourceUrls.size < 2) fail(id, "claim checks require two distinct source URLs");

  return { verified: true, id, reportPath: expectedPath, claimCount: claims.length };
}
