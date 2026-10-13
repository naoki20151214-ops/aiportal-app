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
  if (!["plan", "audit", "stage"].includes(operation) ||
      !["preview", "production"].includes(target))
    throw Error("Invalid setup mode or target environment.");
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
  if (parts.length < 3 || parts.length > 8 ||
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
    console.log("Plan: scoped D1 " + config.dbName + ", migration, Invisible Turnstile for " +
      config.hostname + ", Pages binding; collection remains disabled.");
    return "plan";
  }
  const base = "/accounts/" + accountId;
  const projectPath = base + "/pages/projects/" + projectName;
  const project = await api("GET", projectPath);
  if (!project || project.name !== projectName)
    throw Error("Unexpected Cloudflare Pages project; no changes made.");
  const current = project.deployment_configs?.[target] || {};
  const currentVars = current.env_vars || {};
  if (currentVars.AI_PORTAL_FEEDBACK_ENABLED?.value === "1" ||
      currentVars.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value === "1")
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
    const status = {
      database: !!existingDb[0]?.uuid,
      widget: !!existingWidget[0]?.sitekey,
      binding: !!existingDb[0]?.uuid && current.d1_databases?.[binding]?.id === existingDb[0].uuid,
      serverFlag: currentVars.AI_PORTAL_FEEDBACK_ENABLED?.value === "1" ? "on" : "off",
      publicFlag: currentVars.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value === "1" ? "on" : "off",
    };
    console.log("Read-only audit: " + JSON.stringify(status));
    return status;
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

  const sql = fs.readFileSync("migrations/0001_article_feedback.sql", "utf8");
  for (const statement of statements(sql)) {
    const response = await api("POST", base + "/d1/database/" + db.uuid + "/query", {sql:statement});
    if (!Array.isArray(response) || !response.every(row => row.success === true))
      throw Error("D1 schema migration failed.");
  }
  const verify = await api("POST", base + "/d1/database/" + db.uuid + "/query", {
    sql: "SELECT name FROM sqlite_master WHERE type IN ('table','index') AND name IN ('article_feedback','idx_article_feedback_article_date','idx_article_feedback_kind_date') ORDER BY name",
  });
  if (!Array.isArray(verify) || verify.length !== 1 ||
      new Set((verify[0]?.results || []).map(x => x.name)).size !== 3)
    throw Error("D1 table and two indexes could not be verified.");
  console.log("D1 schema and indexes verified.");

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
      },
    },
  }});
  const verified = (await api("GET", projectPath)).deployment_configs?.[target];
  if (verified?.d1_databases?.[binding]?.id !== db.uuid ||
      verified.env_vars?.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.value !== widget.sitekey ||
      verified.env_vars?.AI_PORTAL_FEEDBACK_ENABLED?.value !== "0" ||
      verified.env_vars?.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value !== "0" ||
      !verified.env_vars?.TURNSTILE_SECRET_KEY)
    throw Error("Pages binding verification failed; DO NOT enable feedback.");

  console.log("STAGED, NOT ACTIVE: Cloudflare D1 and Turnstile are configured, both voting flags OFF.");
  console.log("Next: WAF rate limiting, preview redeploy and real POST/PATCH smoke tests.");
  return "staged";
}

if (process.argv[1]?.endsWith("/provision-cloudflare-feedback.mjs")) {
  stageCloudflare().catch(e => {
    console.error("FEEDBACK SETUP BLOCKED: " + (e instanceof Error ? e.message : "unknown error"));
    process.exitCode = 1;
  });
}
