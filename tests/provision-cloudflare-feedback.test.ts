import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseOptions, statements, stageCloudflare } from "../scripts/provision-cloudflare-feedback.mjs";

test("Cloudflare setup defaults to preview planning and validates trusted project", () => {
  const options = parseOptions();
  assert.equal(options.dbName, "aiportal-feedback-preview");
  assert.equal(options.widgetName, "AI Portal feedback preview");
  assert.equal(options.hostname, "aiportal-app.pages.dev");
});

test("feedback migration contains only non-destructive CREATE statements", () => {
  const text = readFileSync("migrations/0001_article_feedback.sql", "utf8");
  const sql = statements(text);
  assert.equal(sql.length, 3);
  assert.match(sql[0], /^CREATE TABLE IF NOT EXISTS article_feedback/);
  assert.ok(sql.slice(1).every((s: string) => s.startsWith("CREATE INDEX IF NOT EXISTS")));
  assert.throws(() => statements("DROP TABLE article_feedback;"), /migration/);
  assert.throws(() => statements(
    "CREATE TABLE IF NOT EXISTS a(id INTEGER);UPDATE a SET id=1;CREATE INDEX IF NOT EXISTS idx_a ON a(id);"
  ), /migration/);
});

test("planning without a Cloudflare secret performs no remote writes", async () => {
  const original = process.env.CLOUDFLARE_FEEDBACK_API_TOKEN;
  delete process.env.CLOUDFLARE_FEEDBACK_API_TOKEN;
  try {
    assert.equal(await stageCloudflare(), "plan");
  } finally {
    if (original !== undefined) process.env.CLOUDFLARE_FEEDBACK_API_TOKEN = original;
  }
});

test("staging workflow is manual and never turns the feedback switch on", () => {
  const workflow = readFileSync(".github/workflows/provision-feedback-cloudflare.yml", "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^(  push:|  schedule:|  pull_request:)/m);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /issue_comment:/);
  assert.match(workflow, /github.actor == 'naoki20151214-ops'/);
  assert.match(workflow, /github.event.issue.number == 144/);
  assert.match(workflow, /github.event.comment.body == '\/feedback-stage-preview'/);

  assert.match(workflow, /secrets.CLOUDFLARE_FEEDBACK_API_TOKEN/);
  const provisioner = readFileSync("scripts/provision-cloudflare-feedback.mjs", "utf8");
  assert.match(provisioner, /type: "secret_text", value: details.secret/);
  assert.match(provisioner, /AI_PORTAL_FEEDBACK_ENABLED: \{type: "plain_text", value: "0"\}/);
  assert.match(provisioner, /NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED: \{type: "plain_text", value: "0"\}/);
  assert.match(provisioner, /current.d1_databases\[binding\].id !== db.uuid/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_FEEDBACK_API_TOKEN: [a-zA-Z0-9]{25}/);
});
