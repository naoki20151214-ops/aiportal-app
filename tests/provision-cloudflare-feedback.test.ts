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

test("reader-comment migration is non-destructive and will be staged alongside original feedback", () => {
  const text = readFileSync("migrations/0002_reader_comments.sql", "utf8");
  const sql = statements(text);
  assert.equal(sql.length, 2);
  assert.match(sql[0], /^CREATE TABLE IF NOT EXISTS reader_comments/);
  assert.match(sql[1], /^CREATE INDEX IF NOT EXISTS idx_reader_comments_article_date/);

  const retentionText = readFileSync("migrations/0003_reader_comments_retention_index.sql", "utf8");
  const retentionSql = statements(retentionText);
  assert.equal(retentionSql.length, 1);
  assert.match(retentionSql[0], /^CREATE INDEX IF NOT EXISTS idx_reader_comments_received_at ON reader_comments\(received_at\)$/);

  const provisioner = readFileSync("scripts/provision-cloudflare-feedback.mjs", "utf8");
  assert.match(provisioner, /"migrations\/0001_article_feedback\.sql"/);
  assert.match(provisioner, /"migrations\/0002_reader_comments\.sql"/);
  assert.match(provisioner, /"migrations\/0003_reader_comments_retention_index\.sql"/);
  assert.match(provisioner, /AI_PORTAL_READER_COMMENTS_ENABLED: \{type: "plain_text", value: "0"\}/);
  assert.match(provisioner, /currentVars\.AI_PORTAL_READER_COMMENTS_ENABLED\?\.value === "1"/);
  assert.match(provisioner, /verified\.env_vars\?\.AI_PORTAL_READER_COMMENTS_ENABLED\?\.value !== "0"/);
  assert.match(provisioner, /\.size !== 6/);
  assert.doesNotMatch(provisioner, /AI_PORTAL_READER_COMMENTS_ENABLED: \{type: "plain_text", value: "1"\}/);
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
  assert.match(workflow, /- restore-off/);
  assert.match(provisioner, /if \(operation === "restore-off"\)/);
  assert.match(provisioner, /Restore-off is restricted to Production/);
  assert.match(provisioner, /Production D1 binding did not match the verified database/);
  assert.match(provisioner, /DELETE FROM reader_comments WHERE id = \? AND note = \?/);
  assert.match(provisioner, /Synthetic Production E2E reference: 41ff066f-2394-4def-9524-e979ddf8bccc/);
  assert.match(provisioner, /Production intake flags verified OFF; Production D1 binding preserved/);
  assert.match(provisioner, /Synthetic test-row matches after cleanup: 0/);
  assert.match(provisioner, /83018ded-a41d-4418-b4b5-57adb951242a/);
  assert.match(provisioner, /1638204a-38f2-44a7-aef9-aae99b658d77/);
  assert.match(provisioner, /Temporary Production deployment retry requested after intake flags were verified OFF/);
  assert.match(provisioner, /Production reader-comment API verified HTTP 503/);
  assert.match(provisioner, /Production reader-comment API did not return the expected 503/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_FEEDBACK_API_TOKEN: [a-zA-Z0-9]{25}/);
});

test("Preview Turnstile E2E is isolated, fail-safe, and cleans only its synthetic row", () => {
  const workflow = readFileSync(".github/workflows/provision-feedback-cloudflare.yml", "utf8");
  const e2e = readFileSync("scripts/preview-reader-comment-e2e.mjs", "utf8");
  const endpoint = readFileSync("functions/api/reader-comment.ts", "utf8");
  assert.match(workflow, /- preview-test/);
  assert.match(workflow, /inputs\.environment == 'preview'/);
  assert.match(workflow, /Full source commit SHA for the successful Cloudflare Pages Preview deployment/);
  assert.match(e2e, /const productionDbId = "83018ded-a41d-4418-b4b5-57adb951242a"/);
  assert.match(e2e, /Preview D1 binding is absent or not separated from Production/);
  assert.match(e2e, /A Production intake flag is not OFF/);
  assert.match(e2e, /const passSitekey = "1x00000000000000000000BB"/);
  assert.match(e2e, /const failSecret = "2x0000000000000000000000000000000AA"/);
  assert.match(e2e, /XXXX\.DUMMY\.TOKEN\.XXXX/);
  assert.match(e2e, /DELETE FROM reader_comments WHERE id = \? AND note = \?/);
  assert.match(e2e, /const body = params\.length \? \{sql, params\} : \{sql\}/);
  assert.match(e2e, /Cloudflare API \$\{method\} \$\{path\} failed/);
  assert.match(e2e, /Preview fail-key negative test wrote data to D1/);
  assert.match(e2e, /Preview restore verified: test mode OFF, intake OFF, real widget restored, GET returns HTTP 503/);
  assert.match(endpoint, /env\.AI_PORTAL_TURNSTILE_TEST_HOSTNAME===pageUrl\.hostname/);
  assert.match(endpoint, /const expectedAction=previewTestHost\?"test":"reader_comment"/);
  assert.doesNotMatch(e2e, /console\.log\([^\n]*(positive|negative)\.marker/);
  assert.doesNotMatch(e2e, /console\.log\([^\n]*row\.note/);
});
