#!/usr/bin/env node
/**
 * One-time Cloudflare feedback staging helper.
 * This NEVER enables live votes. Requires a scoped token from a GitHub Actions
 * secret. No credentials, Turnstile private keys or customer data in logs.
 */
import fs from "node:fs";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "fd4fe7df0d653a3c4c5969244430f6e2";
const projectName = process.env.CLOUDFLARE_PAGES_PROJECT || "aiportal-app";
const operation = process.argv.find(x => x.startsWith("--mode="))?.slice(7) || "plan";
const target = process.argv.find(x => x.startsWith("--environment="))?.slice(14) || "preview";
const binding = "AI_PORTAL_FEEDBACK_DB";

export function parseOptions() {
  if (!["plan", "audit", "stage", "restore-off", "production-test-on"].includes(operation) ||
      !["preview", "production"].includes(target))
    throw Error("Invalid setup mode or target environment.");
  if (["restore-off", "production-test-on"].includes(operation) && target !== "production")
    throw Error("Production smoke-test operations are restricted to Production.");
  if (!/^[0-9a-f]{32}$/i.test(accountId) || projectName !== "aiportal-app")
    throw Error("Cloudflare account/project scope not verified.");
  return {
    dbName: "aiportal-feedback-" + target,
    widgetName: "AI Portal feedback " + target,
    hostname: target === "production" ? "aiportal.blog" : "aiportal-app.pages.dev",
  };
}

export function statements(sql) {
  const withoutComments = sql.split("\n").filter(line => !/^\s*--/.test(line)).join("\n");
  const parts = withoutComments.split(";").map(x => x.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 8 ||
      parts.some(x => !/^CREATE\s+(TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s+/i.test(x) ||
          /\b(DROP|ALTER|INSERT|UPDATE|DELETE|REPLACE|ATTACH|PRAGMA)\b/i.test(x)))
    throw Error("Unexpected D1 migration; refusing to modify existing data.");
  return parts;
}

async function api(method, pathname, body) {
  const key = process.env.CLOUDFLARE_FEEDBACK_API_TOKEN;
  if (!key || key.length < 12)
    throw Error("Missing CLOUDFLARE_FEEDBACK_API_TOKEN GitHub Actions secret.");
  const response = await fetch("https://api.cloudflare.com/client/v4" + pathname, {
    method,
    headers: {
      Authorization: "Bearer " + key,
      Accept: "application/json",
      ...(body === undefined ? {} : {"Content-Type": "application/json"}),
    },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    signal: AbortSignal.timeout(15000),
  });
  let data;
  try { data = await response.json(); } catch {
    throw Error("Cloudflare returned an invalid response (HTTP " + response.status + ").");
  }
  if (!response.ok || data.success !== true) {
    // Never log arbitrary API response JSON: it may contain credentials.
    const codes = (data.errors || []).map(e => Number(e.code) || 0).join(",");
    throw Error("Cloudflare request " + method + " failed: HTTP " +
      response.status + ", codes " + codes);
  }
  return data.result;
}

export async function stageCloudflare() {
  const config = parseOptions();
  console.log("AI Portal feedback: " + operation + " " + target);
  if (operation === "plan") {
    console.log("Plan: scoped D1 " + config.dbName + ", both migrations, Invisible Turnstile for " +
      config.hostname + ", Pages binding; all feedback and reader comments remain disabled.");
    return "plan";
  }
  const base = "/accounts/" + accountId;
  const projectPath = base + "/pages/projects/" + projectName;
  const project = await api("GET", projectPath);
  if (!project || project.name !== projectName)
    throw Error("Unexpected Cloudflare Pages project; no changes made.");
  const current = project.deployment_configs?.[target] || {};
  const currentVars = current.env_vars || {};
  const productionDbId = "83018ded-a41d-4418-b4b5-57adb951242a";
  const expectedSha = process.env.PRODUCTION_EXPECTED_MAIN_SHA || process.env.GITHUB_SHA || "";
  const findTrustedProductionDeployment = async () => {
    if (!/^[0-9a-f]{40}$/i.test(expectedSha))
      throw Error("Trusted main SHA is unavailable; no Production deployment was retried.");
    const deployments = await api("GET", base + "/pages/projects/" + projectName +
      "/deployments?env=production&per_page=25");
    const deployment = Array.isArray(deployments) ? deployments.find(item =>
      item?.environment === "production" && item?.latest_stage?.status === "success" &&
      item?.deployment_trigger?.metadata?.branch === "main" &&
      item?.deployment_trigger?.metadata?.commit_hash === expectedSha) : undefined;
    if (!deployment || typeof deployment.id !== "string")
      throw Error("No successful Production deployment matched trusted main SHA.");
    return deployment;
  };
  const retryProductionDeployment = async deployment => {
    await api("POST", base + "/pages/projects/" + projectName + "/deployments/" + deployment.id + "/retry");
  };
  const waitForReaderCommentStatus = async expectedStatus => {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      const response = await fetch("https://aiportal.blog/api/reader-comment", {
        headers: {Accept: "application/json", "Cache-Control": "no-cache"},
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json().catch(() => null);
      if (expectedStatus === 503 && response.status === 503 &&
          body?.ok === false && body?.error === "comments_unavailable") return;
      if (expectedStatus === 200 && response.status === 200 &&
          body?.ok === true && body?.available === true) return;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    throw Error("Production reader-comment API did not return the expected HTTP " + expectedStatus + ".");
  };
  const restoreProductionFlagsOff = async () => {
    await api("PATCH", projectPath, {deployment_configs: {production: {
      d1_databases: {[binding]: {id: productionDbId}},
      env_vars: {
        AI_PORTAL_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
        NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
        AI_PORTAL_READER_COMMENTS_ENABLED: {type: "plain_text", value: "0"},
      },
    }}});
    const verified = (await api("GET", projectPath)).deployment_configs?.production;
    if (verified?.d1_databases?.[binding]?.id !== productionDbId ||
        verified.env_vars?.AI_PORTAL_FEEDBACK_ENABLED?.value !== "0" ||
        verified.env_vars?.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value !== "0" ||
        verified.env_vars?.AI_PORTAL_READER_COMMENTS_ENABLED?.value !== "0")
      throw Error("Production restore-off verification failed.");
    const deployment = await findTrustedProductionDeployment();
    await retryProductionDeployment(deployment);
    await waitForReaderCommentStatus(503);
  };
  if (operation === "restore-off") {
    if (target !== "production" ||
        current.d1_databases?.[binding]?.id !== productionDbId)
      throw Error("Production D1 binding did not match the verified database; no changes made.");
    await api("PATCH", projectPath, {deployment_configs: {
      production: {
        d1_databases: {[binding]: {id: productionDbId}},
        env_vars: {
          AI_PORTAL_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
          NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
          AI_PORTAL_READER_COMMENTS_ENABLED: {type: "plain_text", value: "0"},
        },
      },
    }});
    const verified = (await api("GET", projectPath)).deployment_configs?.production;
    if (verified?.d1_databases?.[binding]?.id !== productionDbId ||
        verified.env_vars?.AI_PORTAL_FEEDBACK_ENABLED?.value !== "0" ||
        verified.env_vars?.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value !== "0" ||
        verified.env_vars?.AI_PORTAL_READER_COMMENTS_ENABLED?.value !== "0")
      throw Error("Production restore-off verification failed.");
    // Pages deployments snapshot environment configuration. Re-deploy the
    // successful Production deployment for this workflow's trusted main SHA,
    // never a stale hard-coded commit from an earlier smoke test.
    const smokeDeployment = await findTrustedProductionDeployment();
    await retryProductionDeployment(smokeDeployment);
    console.log("Trusted main Production deployment retry requested after intake flags were verified OFF.");
    await waitForReaderCommentStatus(503);
    console.log("Production reader-comment API verified HTTP 503 after the OFF deployment.");
    // Confirm the database cleanup only after the public endpoint is safely OFF.
    const queryPath = base + "/d1/database/" + productionDbId + "/query";
    const testMarker = process.env.PRODUCTION_TEST_NOTE ||
      "Synthetic Production E2E reference: 41ff066f-2394-4def-9524-e979ddf8bccc";
    const found = await api("POST", queryPath, {
      sql: "SELECT id, slug, prompt_code FROM reader_comments WHERE note = ?",
      params: [testMarker],
    });
    const matches = found?.[0]?.results;
    if (!Array.isArray(matches) || matches.length > 1 ||
        (matches.length === 1 && (typeof matches[0]?.id !== "string" ||
          matches[0]?.slug !== "hybrid-search" || matches[0]?.prompt_code !== "helpful_part")))
      throw Error("Synthetic test-row lookup was ambiguous; no row was deleted.");
    if (matches.length === 1) {
      const deleted = await api("POST", queryPath, {
        sql: "DELETE FROM reader_comments WHERE id = ? AND note = ?",
        params: [matches[0].id, testMarker],
      });
      if (deleted?.[0]?.success !== true || deleted[0]?.meta?.changes !== 1)
        throw Error("Exact synthetic test-row deletion was not confirmed.");
    }
    const remaining = await api("POST", queryPath, {
      sql: "SELECT COUNT(*) AS matches FROM reader_comments WHERE note = ?",
      params: [testMarker],
    });
    if (remaining?.[0]?.results?.[0]?.matches !== 0)
      throw Error("Synthetic test-row cleanup verification failed.");
    const total = await api("POST", queryPath, {
      sql: "SELECT COUNT(*) AS total FROM reader_comments",
    });
    const totalRows = total?.[0]?.results?.[0]?.total;
    if (!Number.isSafeInteger(totalRows) || totalRows < 0)
      throw Error("Production reader-comment count verification failed.");
    const baselineRowsText = process.env.PRODUCTION_BASELINE_ROWS;
    if (baselineRowsText !== undefined && baselineRowsText !== "") {
      const baselineRows = Number(baselineRowsText);
      if (!Number.isSafeInteger(baselineRows) || baselineRows < 0 || totalRows !== baselineRows)
        throw Error("Production reader-comment row count did not return to the recorded baseline.");
    }
    console.log("Production intake flags verified OFF; Production D1 binding preserved.");
    console.log("Synthetic test-row matches after cleanup: 0; Production reader_comments rows: " + totalRows + ".");
    return "restored-off";
  }
  if (currentVars.AI_PORTAL_FEEDBACK_ENABLED?.value === "1" ||
      currentVars.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value === "1" ||
      currentVars.AI_PORTAL_READER_COMMENTS_ENABLED?.value === "1")
    throw Error("Feedback is already enabled. Stage must not change an active environment.");

  const databases = await api("GET", base + "/d1/database?name=" +
    encodeURIComponent(config.dbName) + "&per_page=100");
  if (!Array.isArray(databases)) throw Error("Unexpected D1 database list.");
  const existingDb = databases.filter(d => d.name === config.dbName);
  if (existingDb.length > 1) throw Error("Duplicate feedback D1 database names.");
  const widgets = await api("GET", base + "/challenges/widgets?per_page=100");
  if (!Array.isArray(widgets)) throw Error("Unexpected Turnstile widget list.");
  const existingWidget = widgets.filter(w => w.name === config.widgetName);
  if (existingWidget.length > 1) throw Error("Duplicate feedback Turnstile widgets.");

  if (operation === "audit") {
    const productionDbId = target === "production" ?
      "83018ded-a41d-4418-b4b5-57adb951242a" : existingDb[0]?.uuid;
    const widgetDetails = existingWidget[0]?.sitekey ?
      await api("GET", base + "/challenges/widgets/" + encodeURIComponent(existingWidget[0].sitekey)) : undefined;
    const rowCountResult = productionDbId ? await api("POST",
      base + "/d1/database/" + productionDbId + "/query",
      {sql: "SELECT COUNT(*) AS total FROM reader_comments"}) : undefined;
    const readerCommentsRows = rowCountResult?.[0]?.results?.[0]?.total;
    if (!Number.isSafeInteger(readerCommentsRows) || readerCommentsRows < 0)
      throw Error("Production reader-comment baseline count could not be verified.");
    const expectedSha = process.env.PRODUCTION_EXPECTED_MAIN_SHA || process.env.GITHUB_SHA || "";
    const deploymentList = await api("GET", projectPath + "/deployments?env=" + target + "&per_page=25");
    const currentDeployment = Array.isArray(deploymentList) ? deploymentList.find(deployment =>
      deployment?.environment === target && deployment?.latest_stage?.status === "success" &&
      deployment?.deployment_trigger?.metadata?.branch === "main" &&
      deployment?.deployment_trigger?.metadata?.commit_hash === expectedSha) : undefined;
    const status = {
      database: !!existingDb[0]?.uuid,
      widget: !!existingWidget[0]?.sitekey,
      binding: !!productionDbId && current.d1_databases?.[binding]?.id === productionDbId,
      turnstileHostname: widgetDetails?.domains?.includes(config.hostname) === true,
      turnstileInvisible: widgetDetails?.mode === "invisible",
      turnstileSecretConfigured: typeof widgetDetails?.secret === "string" && widgetDetails.secret.length >= 12,
      serverFlag: currentVars.AI_PORTAL_FEEDBACK_ENABLED?.value ?? "missing",
      publicFlag: currentVars.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value ?? "missing",
      readerCommentsFlag: currentVars.AI_PORTAL_READER_COMMENTS_ENABLED?.value ?? "missing",
      readerCommentsRows,
      productionDeploymentId: currentDeployment?.id ?? null,
      productionDeploymentSha: currentDeployment?.deployment_trigger?.metadata?.commit_hash ?? null,
      productionDeploymentStatus: currentDeployment?.latest_stage?.status ?? null,
      expectedMainSha: expectedSha || null,
      deploymentMatchesMain: typeof currentDeployment?.deployment_trigger?.metadata?.commit_hash === "string" &&
        currentDeployment.deployment_trigger.metadata.commit_hash === expectedSha,
    };
    console.log("Read-only audit: " + JSON.stringify(status));
    return status;
  }
  if (operation === "production-test-on") {
    if (current.d1_databases?.[binding]?.id !== productionDbId ||
        currentVars.AI_PORTAL_FEEDBACK_ENABLED?.value !== "0" ||
        currentVars.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value !== "0" ||
        currentVars.AI_PORTAL_READER_COMMENTS_ENABLED?.value !== "0")
      throw Error("Production preflight failed: the expected binding and all-OFF flags are required.");
    const deployments = await findTrustedProductionDeployment();
    const dbCheck = await api("POST", base + "/d1/database/" + productionDbId + "/query",
      {sql: "SELECT COUNT(*) AS total FROM reader_comments"});
    const baselineRows = dbCheck?.[0]?.results?.[0]?.total;
    if (!Number.isSafeInteger(baselineRows) || baselineRows < 0)
      throw Error("Production D1 baseline count could not be verified.");
    const expectedBaselineText = process.env.PRODUCTION_BASELINE_ROWS;
    if (expectedBaselineText === undefined || expectedBaselineText === "" ||
        !/^\d+$/.test(expectedBaselineText) || Number(expectedBaselineText) !== baselineRows)
      throw Error("Production D1 baseline did not match the preflight audit; no flags were changed.");
    const widgetsForTest = await api("GET", base + "/challenges/widgets?per_page=100");
    const widget = Array.isArray(widgetsForTest) ? widgetsForTest.find(item =>
      item?.name === "AI Portal feedback production") : undefined;
    const details = widget?.sitekey ? await api("GET", base + "/challenges/widgets/" +
      encodeURIComponent(widget.sitekey)) : undefined;
    if (details?.mode !== "invisible" || !details.domains?.includes("aiportal.blog") ||
        typeof details.secret !== "string" || details.secret.length < 12)
      throw Error("Production Turnstile preflight failed; no flags were changed.");
    try {
      await api("PATCH", projectPath, {deployment_configs: {production: {
        d1_databases: {[binding]: {id: productionDbId}},
        env_vars: {
          AI_PORTAL_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
          NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
          AI_PORTAL_READER_COMMENTS_ENABLED: {type: "plain_text", value: "1"},
        },
      }}});
      const enabled = (await api("GET", projectPath)).deployment_configs?.production;
      if (enabled?.d1_databases?.[binding]?.id !== productionDbId ||
          enabled.env_vars?.AI_PORTAL_FEEDBACK_ENABLED?.value !== "0" ||
          enabled.env_vars?.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value !== "0" ||
          enabled.env_vars?.AI_PORTAL_READER_COMMENTS_ENABLED?.value !== "1")
        throw Error("Production comments-only flag verification failed.");
      await retryProductionDeployment(deployments);
      await waitForReaderCommentStatus(200);
      console.log("Production comments-only test flag is ON; article feedback remains OFF.");
      console.log("Production reader-comment API verified HTTP 200; D1 baseline rows: " + baselineRows + ".");
      return "production-test-on";
    } catch (error) {
      try {
        await restoreProductionFlagsOff();
        console.log("Production test activation failed; flags restored OFF and HTTP 503 verified.");
      } catch {
        console.log("Production test activation failed; OFF restoration was attempted and requires urgent verification.");
      }
      throw error;
    }
  }
  let db = existingDb[0];
  if (!db) {
    db = await api("POST", base + "/d1/database", {name: config.dbName});
    console.log("Created D1 database for " + target + ".");
  }
  if (!/^[0-9a-f-]{36}$/i.test(db?.uuid || ""))
    throw Error("D1 API did not supply a valid database identifier.");
  if (current.d1_databases?.[binding]?.id &&
      current.d1_databases[binding].id !== db.uuid)
    throw Error("Existing Pages D1 binding differs; refusing to overwrite it.");

  // Both original article feedback and the separate optional reader-comment
  // schema are staged without enabling either submission endpoint.
  for (const migration of [
    "migrations/0001_article_feedback.sql",
    "migrations/0002_reader_comments.sql",
    "migrations/0003_reader_comments_retention_index.sql",
  ]) {
    const sql = fs.readFileSync(migration, "utf8");
    for (const statement of statements(sql)) {
      const response = await api("POST", base + "/d1/database/" + db.uuid + "/query", {sql:statement});
      if (!Array.isArray(response) || !response.every(row => row.success === true))
        throw Error("D1 schema migration failed for " + migration + ".");
    }
  }
  const verify = await api("POST", base + "/d1/database/" + db.uuid + "/query", {
    sql: "SELECT name FROM sqlite_master WHERE type IN ('table','index') AND name IN ('article_feedback','idx_article_feedback_article_date','idx_article_feedback_kind_date','reader_comments','idx_reader_comments_article_date','idx_reader_comments_received_at') ORDER BY name",
  });
  if (!Array.isArray(verify) || verify.length !== 1 ||
      new Set((verify[0]?.results || []).map(x => x.name)).size !== 6)
    throw Error("D1 article feedback and reader-comment schema could not be verified.");
  console.log("D1 article feedback and reader-comment tables and indexes verified.");

  let widget = existingWidget[0];
  if (!widget) {
    widget = await api("POST", base + "/challenges/widgets", {
      name: config.widgetName, mode: "invisible", domains: [config.hostname],
    });
    console.log("Created scoped Invisible Turnstile widget.");
  }
  if (!widget?.sitekey) throw Error("Turnstile public key missing.");
  const details = await api("GET", base + "/challenges/widgets/" + encodeURIComponent(widget.sitekey));
  if (details?.mode !== "invisible" || !details.domains?.includes(config.hostname) ||
      !details.secret || details.secret.length < 12)
    throw Error("Turnstile widget details failed hostname/mode/secret verification.");
  if (currentVars.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.value &&
      currentVars.NEXT_PUBLIC_TURNSTILE_SITE_KEY.value !== widget.sitekey)
    throw Error("Existing Pages Turnstile key differs; refusing to overwrite it.");

  await api("PATCH", projectPath, {deployment_configs: {
    [target]: {
      d1_databases: {[binding]: {id: db.uuid}},
      env_vars: {
        TURNSTILE_SECRET_KEY: {type: "secret_text", value: details.secret},
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: {type: "plain_text", value: widget.sitekey},
        AI_PORTAL_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
        NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
        AI_PORTAL_READER_COMMENTS_ENABLED: {type: "plain_text", value: "0"},
      },
    },
  }});
  const verified = (await api("GET", projectPath)).deployment_configs?.[target];
  if (verified?.d1_databases?.[binding]?.id !== db.uuid ||
      verified.env_vars?.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.value !== widget.sitekey ||
      verified.env_vars?.AI_PORTAL_FEEDBACK_ENABLED?.value !== "0" ||
      verified.env_vars?.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value !== "0" ||
      verified.env_vars?.AI_PORTAL_READER_COMMENTS_ENABLED?.value !== "0" ||
      !verified.env_vars?.TURNSTILE_SECRET_KEY)
    throw Error("Pages binding verification failed; DO NOT enable feedback.");

  console.log("STAGED, NOT ACTIVE: Cloudflare D1, reader comments and Turnstile configured; all submission flags OFF.");
  console.log("Next: WAF rate limiting, preview redeploy and real POST/PATCH and reader-comment smoke tests.");
  return "staged";
}

if (process.argv[1]?.endsWith("/provision-cloudflare-feedback.mjs")) {
  stageCloudflare().catch(e => {
    console.error("FEEDBACK SETUP BLOCKED: " + (e instanceof Error ? e.message : "unknown error"));
    process.exitCode = 1;
  });
}
