import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {options,commentMigrationStatements,run} from "../scripts/provision-cloudflare-reader-comments.mjs";

test("Reader-comments setup is scoped to the existing Cloudflare Pages project",()=>{
  const o=options();
  assert.equal(o.dbName,"aiportal-feedback-preview");
  assert.equal(o.widgetName,"AI Portal feedback preview");
  assert.equal(o.hostname,"aiportal-app.pages.dev");
});

test("Reader-comments D1 migration only creates an isolated table and index",()=>{
  const sql=readFileSync("migrations/0002_reader_comments.sql","utf8");
  const statements=commentMigrationStatements(sql);
  assert.equal(statements.length,2);
  assert.match(statements[0],/^CREATE TABLE IF NOT EXISTS reader_comments/);
  assert.match(statements[1],/^CREATE INDEX IF NOT EXISTS idx_reader_comments_article_date/);
  assert.throws(()=>commentMigrationStatements(
    "DROP TABLE article_feedback;CREATE INDEX IF NOT EXISTS idx_reader_comments_article_date ON reader_comments(slug);"
  ),/migration/);
  assert.throws(()=>commentMigrationStatements(
    "CREATE TABLE IF NOT EXISTS reader_comments (id TEXT);DELETE FROM article_feedback;"+
    "CREATE INDEX IF NOT EXISTS idx_reader_comments_article_date ON reader_comments(slug);"
  ),/migration/);
});

test("Read-only local planning does not require Cloudflare account credentials",async()=>{
  const before=process.env.CLOUDFLARE_FEEDBACK_API_TOKEN;
  delete process.env.CLOUDFLARE_FEEDBACK_API_TOKEN;
  try{assert.deepEqual(await run(),{status:"plan"});}
  finally{if(before!==undefined)process.env.CLOUDFLARE_FEEDBACK_API_TOKEN=before;}
});

test("Provisioning is manually dispatched, owner-limited and never turns on reader collection",()=>{
  const w=parse(readFileSync(".github/workflows/provision-reader-comments.yml","utf8")) as {
    on:Record<string,unknown>,permissions:{contents:string},
    jobs:{prepare:{if:string,steps:{run?:string,env?:Record<string,string>}[]}};
  };
  assert.ok(w.on.workflow_dispatch);
  assert.ok(w.on.issue_comment);
  assert.equal(w.on.push,undefined);
  assert.equal(w.on.schedule,undefined);
  assert.equal(w.permissions.contents,"read");
  assert.match(w.jobs.prepare.if,/github.actor == 'naoki20151214-ops'/);
  assert.match(w.jobs.prepare.if,/github.event.issue.number == 144/);
  assert.match(w.jobs.prepare.if,/\/reader-comment-stage-preview/);
  const setup=w.jobs.prepare.steps.find(step=>step.run?.includes("provision-cloudflare-reader-comments.mjs"));
  assert.ok(setup);
  assert.ok(setup.run?.includes("provision-cloudflare-feedback.mjs"));
  assert.match(setup.env?.CLOUDFLARE_FEEDBACK_API_TOKEN||"",/secrets.CLOUDFLARE_FEEDBACK_API_TOKEN/);
  assert.doesNotMatch(setup.run||"",/AI_PORTAL_READER_COMMENTS_ENABLED=1|git push|npm publish/);
  const code=readFileSync("scripts/provision-cloudflare-reader-comments.mjs","utf8");
  assert.match(code,/currentVars\.AI_PORTAL_READER_COMMENTS_ENABLED|vars\.AI_PORTAL_READER_COMMENTS_ENABLED/);
  assert.match(code,/WAF|wafRateLimitVerified/);
  assert.ok(code.includes("STAGED: reader_comments table/index verified"));
  assert.ok(!code.includes("AI_PORTAL_READER_COMMENTS_ENABLED: {type:"));
});
