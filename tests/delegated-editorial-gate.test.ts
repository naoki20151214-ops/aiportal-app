import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { stringify, parse } from "yaml";
import { gitBlobSha, verifyDelegatedEditorialAudit } from "../scripts/delegated-editorial-gate.mjs";
import { publishApproved } from "../scripts/auto-publish-approved.mjs";

const ID = "BAS-0099";
const SLUG = "example";
const URL_ONE = "https://www.nist.gov/artificial-intelligence";
const URL_TWO = "https://developers.google.com/machine-learning/crash-course";

function source() {
  return [
    "---",
    'id: "BAS-0099"',
    'slug: "example"',
    'status: "ready"',
    'publishedAt: "2026-10-13"',
    'updatedAt: "2026-10-13"',
    'thumbnail: "/images/articles/example/hero.svg"',
    "---",
    "",
    "Artificial intelligence encompasses a wide range of problems and approaches.",
    "The textbook explains the difference between defining rules and learning patterns.",
    "![Visual explanation](/images/articles/example/hero.svg)",
    "",
    "## 参考資料",
    "- [Official NIST source](" + URL_ONE + ")",
    "- [Machine Learning Crash Course](" + URL_TWO + ")",
  ].join("\n") + "\n";
}

const CHECK_NAMES = [
  "centralQuestion", "beginnerClarity", "narrativeExamples", "sourceAccuracy",
  "imageAccuracyAndAlt", "internalLinks", "prerequisites", "riskAndSafety",
];

function auditFor(ready: string) {
  return {
    schemaVersion: 1,
    id: ID,
    slug: SLUG,
    auditedOn: "2026-10-13",
    readyArticleBlob: gitBlobSha(ready),
    scope: "standard-evergreen",
    decision: "pass",
    humanEscalationRequired: false,
    blockingFindings: [] as string[],
    reviewProcess: {
      writerId: "draft-editor-pass",
      verifierId: "independent-source-check-pass",
      separateVerificationPass: true,
    },
    checks: Object.fromEntries(CHECK_NAMES.map(name => [name, {
      passed: true,
      evidence: "Verified by separate reading of the draft, figures, links and primary documents: " + name,
    }])),
    criticalClaims: [
      {
        claim: "Artificial intelligence is an umbrella term used for several types of algorithms.",
        sourceUrl: URL_ONE,
        sourceEvidence: "Reviewer inspected the original official document for terminology and confirmed the general definition in context.",
        verified: true,
      },
      {
        claim: "Machine learning can derive useful patterns from example training data.",
        sourceUrl: URL_TWO,
        sourceEvidence: "Reviewer compared the published technical primer's discussion of training against the article explanation.",
        verified: true,
      },
    ],
  };
}

function createFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "aiportal-delegated-"));
  mkdirSync(path.join(root, "content/registry"), { recursive: true });
  mkdirSync(path.join(root, "content/articles"), { recursive: true });
  mkdirSync(path.join(root, "content/editorial-audits"), { recursive: true });
  mkdirSync(path.join(root, "public/images/articles/example"), { recursive: true });
  const ready = source();
  const audit = auditFor(ready);
  const auditText = stringify(audit);
  const node = { id: ID, slug: SLUG, status: "ready", type: "concept",
    category: "AI基礎・技術", prerequisites: ["BAS-0001"] };
  const registry = { schemaVersion: 1, nodeCount: 2, nodes: [
    { id: "BAS-0001", slug: "what-is-ai", status: "published",
      type: "concept", category: "AI基礎・技術", prerequisites: [] },
    node,
  ] };
  const approval = {
    id: ID, slug: SLUG, approvedOn: "2026-10-13",
    decision: "approved-for-publication",
    approvedBy: "editorial-qa",
    delegation: "site-owner-standing-policy-2026-10-13",
    sourceArticleBlob: gitBlobSha(ready),
    editorialAuditPath: "content/editorial-audits/BAS-0099.yml",
    editorialAuditBlob: gitBlobSha(auditText),
    evidence: "Reader-focused article passed the separately documented editorial audit.",
  };
  const ap = path.join(root, "content/articles/example.md");
  const rp = path.join(root, "content/registry/knowledge-nodes.yml");
  const lp = path.join(root, "content/registry/article-approval-log.yml");
  const ep = path.join(root, "content/editorial-audits/BAS-0099.yml");
  writeFileSync(ap, ready);
  writeFileSync(rp, stringify(registry));
  writeFileSync(lp, stringify({ schemaVersion: 1, approvals: [approval] }));
  writeFileSync(ep, auditText);
  writeFileSync(path.join(root, "public/images/articles/example/hero.svg"), "<svg/>");
  return { root, node, ready, approval, audit, ap, rp, lp, ep };
}

function overwriteReport(f: ReturnType<typeof createFixture>, report: unknown) {
  const content = stringify(report);
  writeFileSync(f.ep, content);
  f.approval.editorialAuditBlob = gitBlobSha(content);
  writeFileSync(f.lp, stringify({ schemaVersion: 1, approvals: [f.approval] }));
}

test("site-owner delegation publishes only when separately recorded immutable editorial audit passes", () => {
  const f = createFixture();
  try {
    const checked = verifyDelegatedEditorialAudit(f.root, f.approval, f.ready, f.node);
    assert.equal(checked.verified, true);
    assert.equal(checked.claimCount, 2);
    const result = publishApproved(f.root, { apply: true, date: "2026-10-13" });
    assert.deepEqual(result.published, [ID]);
    const published = readFileSync(f.ap, "utf8");
    assert.match(published, /status: "published"/);
    assert.equal(published.split("---\n").slice(-1)[0], f.ready.split("---\n").slice(-1)[0]);
    const registry = parse(readFileSync(f.rp, "utf8"));
    const ledger = parse(readFileSync(f.lp, "utf8"));
    assert.equal(registry.nodes[1].status, "published");
    assert.equal(ledger.approvals[0].decision, "published");
    assert.equal(ledger.approvals[0].publishedOn, "2026-10-13");
    assert.deepEqual(publishApproved(f.root, { apply: true, date: "2026-10-13" }).published, []);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("ready status without a signed audit-bound editorial approval is never consent", () => {
  const f = createFixture();
  try {
    writeFileSync(f.lp, stringify({ schemaVersion: 1, approvals: [] }));
    assert.deepEqual(publishApproved(f.root, { apply: true }).published, []);
    assert.match(readFileSync(f.ap, "utf8"), /status: "ready"/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("missing, altered, unverifiable or contradictory editorial audit stops auto-publication", () => {
  const mutators: Array<{name: string; mutate: (f: ReturnType<typeof createFixture>) => void; error: RegExp}> = [
    {
      name: "missing",
      mutate: f => { unlinkSync(f.ep); },
      error: /audit report missing/,
    },
    {
      name: "tampered",
      mutate: f => { writeFileSync(f.ep, readFileSync(f.ep, "utf8") + "\n# modified after approval\n"); },
      error: /immutable editorial report mismatch/,
    },
    {
      name: "self-check only",
      mutate: f => { const report = { ...f.audit,
        reviewProcess: { writerId: "same-pass", verifierId: "same-pass", separateVerificationPass: true } };
        overwriteReport(f, report);
      },
      error: /separate verifier attestation/,
    },
    {
      name: "quality checklist failure",
      mutate: f => { const report = structuredClone(f.audit);
        report.checks.sourceAccuracy.passed = false;
        overwriteReport(f, report);
      },
      error: /quality criterion not supported/,
    },
    {
      name: "uncited invented reference",
      mutate: f => { const report = structuredClone(f.audit);
        report.criticalClaims[0].sourceUrl = "https://www.noaa.gov/climate";
        overwriteReport(f, report);
      },
      error: /audit source is not cited/,
    },
    {
      name: "same citation reused",
      mutate: f => { const report = structuredClone(f.audit);
        report.criticalClaims[1].sourceUrl = URL_ONE;
        overwriteReport(f, report);
      },
      error: /two distinct source URLs/,
    },
    {
      name: "unsafe news type",
      mutate: f => { const rg = parse(readFileSync(f.rp, "utf8"));
        rg.nodes[1].type = "news";
        writeFileSync(f.rp, stringify(rg));
      },
      error: /news requires exceptional editorial approval/,
    },
    {
      name: "blocking risk",
      mutate: f => { const report = structuredClone(f.audit);
        report.blockingFindings = ["Primary evidence contradicts the article claim"];
        overwriteReport(f, report);
      },
      error: /unresolved blocking findings/,
    },
    {
      name: "modified article after audit",
      mutate: f => { writeFileSync(f.ap, f.ready + "\nMaterial change after approval"); },
      error: /Approved source blob mismatch/,
    },
    {
      name: "fake standing delegation",
      mutate: f => { f.approval.delegation = "other-policy";
        writeFileSync(f.lp, stringify({ schemaVersion: 1, approvals: [f.approval] }));
      },
      error: /missing site-owner standing delegation/,
    },
  ];
  for (const entry of mutators) {
    const f = createFixture();
    try {
      entry.mutate(f);
      assert.throws(() => publishApproved(f.root, { apply: true, date: "2026-10-13" }), entry.error, entry.name);
      assert.match(readFileSync(f.ap, "utf8"), /status: "ready"/);
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  }
});

test("unpublished prerequisite remains a hard blocker even with complete editorial audit", () => {
  const f = createFixture();
  try {
    const rg = parse(readFileSync(f.rp, "utf8"));
    rg.nodes[0].status = "review";
    writeFileSync(f.rp, stringify(rg));
    const result = publishApproved(f.root, { apply: true, date: "2026-10-13" });
    assert.deepEqual(result.published, []);
    assert.deepEqual(result.deferred, [ID]);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
