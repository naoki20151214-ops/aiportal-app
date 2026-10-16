// Private editorial triage: topic hints and potential duplicates are review aids,
// not confirmations of news claims, editorial approvals, or publication permission.
const TOPIC_RULES = [
  ["model-or-release", /\b(model|release|released|introduc(?:e|ing)|launch|gemini|gpt|claude|llama)\b/i],
  ["research", /\b(research|paper|study|benchmark|reasoning|training|evaluation)\b/i],
  ["safety-or-policy", /\b(safety|security|regulation|policy|responsible|governance|risk)\b/i],
  ["developer-tools", /\b(api|developer|open.source|sdk|agent|coding|tool)\b/i],
  ["business-and-applications", /\b(enterprise|business|workplace|customer|copilot|productivity)\b/i],
];

function normalizedWords(title) {
  return new Set(String(title || "").normalize("NFKC").toLowerCase()
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .match(/[\p{L}\p{N}]{3,}/gu) || []);
}
function similarity(first, second) {
  const left = normalizedWords(first), right = normalizedWords(second);
  if (left.size < 3 || right.size < 3) return 0;
  let intersection = 0;
  for (const word of left) if (right.has(word)) intersection++;
  return (2 * intersection) / (left.size + right.size);
}
function validDate(date) {
  return typeof date === "string" && Number.isFinite(Date.parse(date)) &&
    !Number.isNaN(Date.parse(date));
}
function isHttpsLink(raw) {
  try {
    if (typeof raw !== "string" || raw.length > 2048) return false;
    const value = new URL(raw);
    return value.protocol === "https:" && !value.username && !value.password &&
      !value.port && !!value.hostname && !value.hash;
  } catch { return false; }
}
function limitedText(text, minimum, maximum) {
  return typeof text === "string" && text.trim().length >= minimum &&
    text.length <= maximum && !/[\u0000-\u001f\u007f]/.test(text);
}

export function triageNewsEvidence(report) {
  if (!report || report.schemaVersion !== 1 ||
      report.status !== "editorial-evidence-only" ||
      report.publishingEnabled !== false || report.editorialApprovals !== 0 ||
      !Array.isArray(report.results) || report.results.length > 100)
    throw new Error("Not a private unapproved evidence report");
  const ids = new Set();
  const items = report.results.map(item => {
    if (!/^[a-f0-9]{24}$/.test(item?.candidateId ?? "") ||
        ids.has(item.candidateId) || !validDate(item.rssPublishedAt))
      throw new Error("Untrusted editorial candidate");
    ids.add(item.candidateId);
    const text = [item.rssTitle, item.headline, item.documentTitle].filter(Boolean).join(" ");
    const topics = TOPIC_RULES.filter(([, rule]) => rule.test(text)).map(([name]) => name);
    const rssDate = Date.parse(item.rssPublishedAt);
    const pageDate = validDate(item.pagePublishedAt) ? Date.parse(item.pagePublishedAt) : null;
    return {
      candidateId: item.candidateId,
      sourceId: item.sourceId,
      rssTitle: item.rssTitle,
      originalUrl: item.originalUrl,
      retrievalStatus: item.status,
      topicHints: topics,
      dateNeedsReview: pageDate === null || Math.abs(pageDate - rssDate) > 48 * 3600 * 1000,
      relevanceNeedsReview: true,
      importanceNeedsReview: true,
      accuracyNeedsReview: true,
      possibleDuplicateIds: [],
      editorialDecision: "unreviewed",
      publicationEligible: false,
    };
  });
  // High lexical similarity is a nonbinding hint. Different publishers may
  // describe the same event differently; exact or heuristic matches do NOT
  // suppress either candidate or substitute for semantic editorial review.
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (similarity(items[i].rssTitle, items[j].rssTitle) >= 0.78) {
        items[i].possibleDuplicateIds.push(items[j].candidateId);
        items[j].possibleDuplicateIds.push(items[i].candidateId);
      }
    }
  }
  return {
    schemaVersion: 1,
    stage: "private-editorial-triage",
    publishingEnabled: false,
    newsApprovedCount: 0,
    note: "Topic and duplicate hints are heuristics. Every candidate needs original-source fact checking and a human editorial judgment.",
    items,
  };
}

// This is a mechanical completeness gate for an explicit human sign-off.
// It cannot check whether the claim truly follows from its quoted evidence,
// and cannot authorize publication. Human review is mandatory.
export function validateNewsEditorialReview(review, item) {
  const fail = reasons => ({valid: false, reasons, draftEligible: false, publicationEligible: false});
  const reasons = [];
  if (!item || item.editorialDecision !== "unreviewed" ||
      item.publicationEligible !== false || item.retrievalStatus !== "retrieved-for-editorial-review")
    reasons.push("No reviewed primary-page evidence");
  if (!review || review.schemaVersion !== 1 ||
      review.candidateId !== item?.candidateId ||
      review.originalUrl !== item?.originalUrl)
    reasons.push("Review does not match candidate evidence");
  if (review?.decision !== "draft-ready")
    reasons.push("Only explicitly draft-ready reviews can pass the completeness gate");
  if (!limitedText(review?.reviewer, 3, 100) || !validDate(review?.reviewedAt))
    reasons.push("Missing named reviewer or valid review timestamp");
  if (!limitedText(review?.whyItMatters, 40, 1200))
    reasons.push("Missing explained reader relevance");
  if (!limitedText(review?.limitations, 20, 1200))
    reasons.push("Missing limitations and availability details");
  if (!limitedText(review?.whatChanges, 30, 1200))
    reasons.push("Missing description of what changes");
  const checks = review?.checks;
  const requiredChecks = ["originalRead", "datesChecked", "claimsChecked",
    "limitationsChecked", "duplicationChecked", "independentContextConsidered"];
  if (!checks || requiredChecks.some(key => checks[key] !== true))
    reasons.push("Human editorial checklist incomplete");
  if (!Array.isArray(review?.claims) || review.claims.length < 1 ||
      review.claims.length > 12)
    reasons.push("Claim-source mapping missing or too large");
  else {
    for (const [index, claim] of review.claims.entries()) {
      if (!limitedText(claim?.statement, 12, 500) ||
          !Array.isArray(claim?.evidence) || !claim.evidence.length || claim.evidence.length > 5 ||
          claim.evidence.some(reference =>
            !isHttpsLink(reference?.url) || !limitedText(reference?.supportingExcerpt, 12, 500)))
        reasons.push("Claim " + (index + 1) + " lacks source URL and concise supporting passage");
    }
  }
  return reasons.length ? fail(reasons) :
    {valid: true, reasons: [], draftEligible: true, publicationEligible: false};
}
