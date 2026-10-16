// Private, deterministic editorial importance assessment and AI writing contract.
// There is no news publication path in this module.
import {validateNewsEditorialReview} from "./news-editorial-gate.mjs";

const DIMENSIONS = Object.freeze({
  readerImpact: 3,      // How important is the development to actual readers?
  audienceBreadth: 3,   // How broadly relevant is it beyond a niche announcement?
  genuineNovelty: 2,    // Is there a meaningful change, not only promotion?
  practicalValue: 2,    // Is there a concrete reader action or learning value?
});
const JAPANESE_TEXT = /[\u3040-\u30ff\u3400-\u9fff]/u;

export function assessNewsImportance(assessment) {
  const reasons = [];
  const scores = {};
  for (const [name, max] of Object.entries(DIMENSIONS)) {
    const answer = assessment?.[name];
    if (!answer || !Number.isInteger(answer.score) || answer.score < 0 ||
        answer.score > max || typeof answer.reason !== "string" ||
        answer.reason.trim().length < 20 || answer.reason.length > 600)
      reasons.push("Missing grounded human assessment: " + name);
    else scores[name] = answer.score;
  }
  if (reasons.length) return {valid: false, reasons, publicationEligible: false};
  const total = Object.values(scores).reduce((sum, n) => sum + n, 0);
  const suggestedQueue = total >= 8 ? "review-soon" :
    total >= 5 ? "review-when-capacity" : "low-priority-review";
  return {
    valid: true, reasons: [], dimensions: scores, score: total,
    maximum: 10, suggestedQueue,
    basis: "human-rated-editorial-criteria-not-a-measured-fact",
    articleApproved: false, publicationEligible: false,
  };
}

const WRITING_INSTRUCTIONS = [
  "AI Portalの日本語AIニュースの非公開下書き用入力です。記事の公開を許可するものではありません。",
  "主張として使える事実はclaimsの範囲だけです。RSSのタイトルやpageの見出しは未確認なので、事実の根拠に使わないでください。",
  "claimsに書かれていない数値・発表日・対応地域・価格・利用資格・性能比較・人物の発言を新しく作らないでください。",
  "不確かな点や利用条件はlimitationsに明示し、企業の主張は『発表元によると』など帰属を明らかにしてください。",
  "各節は『何が起きたか』『なぜ重要か』『何が変わるか』『確認できていないこと』の順。専門用語より読者の疑問を優先してください。",
  "必ずJSONを返し、各節のclaimIdsに根拠として使ったclaimsのIDを指定してください。根拠のない節は書かず、人間の追加調査が必要だと伝えてください。",
  "外部リンク、広告、アフィリエイト、商品推奨、内部リンク、画像、HTMLを作らないでください。",
  "生成した文章は事実確認済みではありません。必ず編集者の日本語原稿レビューを必要とします。",
].join("\n");

export function prepareJapaneseDraftPacket(review, triageItem) {
  const gate = validateNewsEditorialReview(review, triageItem);
  if (!gate.valid) throw new Error("Human evidence review incomplete: " + gate.reasons.join("; "));
  const importance = assessNewsImportance(review.priorityAssessment);
  if (!importance.valid) throw new Error("Importance assessment incomplete: " + importance.reasons.join("; "));
  const claims = review.claims.map((claim, index) => ({
    id: "C" + (index + 1),
    reviewedStatement: claim.statement,
    evidence: claim.evidence.map(item => ({
      url: item.url, supportingExcerpt: item.supportingExcerpt,
    })),
  }));
  return {
    schemaVersion: 1, type: "ai-news-private-japanese-draft-input",
    candidateId: review.candidateId,
    originalOfficialUrl: review.originalUrl,
    reviewedAt: review.reviewedAt,
    reviewer: review.reviewer,
    importance,
    context: {
      whyItMatters: review.whyItMatters,
      whatChanges: review.whatChanges,
      limitations: review.limitations,
    },
    claims,
    writingInstructions: WRITING_INSTRUCTIONS,
    draftStatus: "input-awaiting-model",
    newsPublished: false,
    humanJapaneseReviewRequired: true,
    publicationEligible: false,
  };
}

function validJapanese(value, min, max) {
  return typeof value === "string" && value.length >= min &&
    value.length <= max && JAPANESE_TEXT.test(value) &&
    !/[\u0000-\u001f\u007f]/u.test(value) &&
    !/[<>]/.test(value) && !/https?:\/\//i.test(value) &&
    !/\]\s*\(/.test(value);
}

function checkSection(section, claimIds, label, reasons) {
  if (!section || !validJapanese(section.text, 35, 1800) ||
      !Array.isArray(section.claimIds) || section.claimIds.length < 1 ||
      section.claimIds.length > 12 ||
      new Set(section.claimIds).size !== section.claimIds.length ||
      section.claimIds.some(id => typeof id !== "string" || !claimIds.has(id)))
    reasons.push("Section needs Japanese prose and approved claim IDs: " + label);
}

export function validateGeneratedJapaneseDraft(draft, packet) {
  const fail = reasons => ({
    valid: false, reasons, editorialStatus: "blocked",
    humanReviewRequired: true, publicationEligible: false,
  });
  const reasons = [];
  if (!packet || packet.type !== "ai-news-private-japanese-draft-input" ||
      packet.publicationEligible !== false || packet.newsPublished !== false ||
      packet.humanJapaneseReviewRequired !== true ||
      !Array.isArray(packet.claims) || !packet.claims.length)
    return fail(["Invalid private drafting packet"]);
  const allowed = new Set(packet.claims.map(item => item.id));
  if (allowed.size !== packet.claims.length || [...allowed].some(x => !/^C[1-9]\d*$/.test(x)))
    return fail(["Invalid approved claim identifiers"]);
  if (draft?.schemaVersion !== 1 || draft?.candidateId !== packet.candidateId ||
      draft?.status !== "unreviewed-japanese-draft" ||
      draft?.publicationEligible !== false)
    reasons.push("Untrusted generated draft status or identity");
  if (!validJapanese(draft?.title, 8, 110))
    reasons.push("Invalid Japanese title");
  if (!validJapanese(draft?.lead?.text, 35, 350))
    reasons.push("Invalid Japanese lead");
  if (!Array.isArray(draft?.lead?.claimIds) || !draft.lead.claimIds.length ||
      draft.lead.claimIds.some(id => !allowed.has(id)))
    reasons.push("Lead lacks known claim IDs");
  for (const key of ["whatHappened", "whyImportant", "whatChanges", "limitations"])
    checkSection(draft?.sections?.[key], allowed, key, reasons);
  if (draft?.sections && Object.keys(draft.sections).some(
    k => !["whatHappened", "whyImportant", "whatChanges", "limitations"].includes(k)))
    reasons.push("Unexpected draft section");
  if (draft?.links !== undefined || draft?.affiliate !== undefined ||
      draft?.html !== undefined || draft?.publishAt !== undefined)
    reasons.push("Generated draft attempted unsupported external or publication fields");
  if (reasons.length) return fail(reasons);
  return {
    valid: true, reasons: [],
    editorialStatus: "awaiting-human-japanese-review",
    humanReviewRequired: true,
    publicationEligible: false,
    // Structural references do not prove semantic accuracy.
    semanticFactCheck: "not-performed",
  };
}
