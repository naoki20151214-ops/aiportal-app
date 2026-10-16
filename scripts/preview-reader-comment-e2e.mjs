#!/usr/bin/env node

// Short-lived, Preview-only end-to-end check using Cloudflare's documented
// Turnstile test keys. It always restores Preview intake OFF and removes only
// the unique synthetic rows created by this run. Production is read-only.
import {randomUUID} from "node:crypto";

const accountId = "fd4fe7df0d653a3c4c5969244430f6e2";
const projectName = "aiportal-app";
const productionDbId = "83018ded-a41d-4418-b4b5-57adb951242a";
const previewDbName = "aiportal-feedback-preview";
const binding = "AI_PORTAL_FEEDBACK_DB";
const passSitekey = "1x00000000000000000000BB";
const failSitekey = "2x00000000000000000000BB";
const passSecret = "1x0000000000000000000000000000000AA";
const failSecret = "2x0000000000000000000000000000000AA";
const dummyToken = "XXXX.DUMMY.TOKEN.XXXX";
const commitSha = process.env.PREVIEW_COMMIT_SHA || "";

async function cloudflare(method, path, body) {
  const token = process.env.CLOUDFLARE_FEEDBACK_API_TOKEN;
  if (typeof token !== "string" || token.length < 12)
    throw new Error("Cloudflare credential is unavailable.");
  let response;
  try {
    response = await fetch("https://api.cloudflare.com/client/v4" + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body === undefined ? {} : {"Content-Type": "application/json"}),
      },
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Cloudflare API request failed.");
  }
  let payload;
  try { payload = await response.json(); } catch {
    throw new Error(`Cloudflare API returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!response.ok || payload?.success !== true) {
    const codes = (payload?.errors || []).map(error => Number(error.code) || 0).join(",");
    throw new Error(`Cloudflare API ${method} ${path} failed (HTTP ${response.status}; codes ${codes}).`);
  }
  return payload.result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function syntheticReference() {
  return randomUUID().replaceAll("-", "").replace(/[0-9]/g, digit =>
    String.fromCharCode(97 + Number(digit)));
}

async function d1Query(dbId, sql, params = []) {
  const body = params.length ? {sql, params} : {sql};
  return cloudflare("POST", `/accounts/${accountId}/d1/database/${dbId}/query`, body);
}

async function commentRows(dbId, note) {
  const result = await d1Query(dbId,
    "SELECT id, slug, prompt_code, note FROM reader_comments WHERE note = ?", [note]);
  assert(Array.isArray(result) && result.length === 1 && Array.isArray(result[0]?.results),
    "Preview D1 marker query failed.");
  return result[0].results;
}

async function countRows(dbId) {
  const result = await d1Query(dbId, "SELECT COUNT(*) AS total FROM reader_comments");
  const total = result?.[0]?.results?.[0]?.total;
  assert(Number.isSafeInteger(total) && total >= 0, "Preview D1 count readback failed.");
  return total;
}

async function deleteMarkerRows(dbId, marker) {
  const matches = await commentRows(dbId, marker);
  assert(matches.length <= 1, "Preview synthetic marker is ambiguous; no deletion was made.");
  if (matches.length === 1) {
    const row = matches[0];
    assert(typeof row.id === "string", "Preview synthetic row ID is invalid.");
    const deleted = await d1Query(dbId,
      "DELETE FROM reader_comments WHERE id = ? AND note = ?", [row.id, marker]);
    assert(deleted?.[0]?.success === true && deleted[0]?.meta?.changes === 1,
      "Exact Preview synthetic row deletion was not confirmed.");
  }
  assert((await commentRows(dbId, marker)).length === 0,
    "Preview synthetic marker remained after cleanup.");
}

async function waitForAvailability(url, expectedStatus, expectedBody) {
  const deadline = Date.now() + 10 * 60 * 1000;
  let lastObserved = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        headers: {Accept: "application/json", "Cache-Control": "no-cache"},
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json().catch(() => null);
      lastObserved = `HTTP ${response.status}${typeof body?.error === "string" ? ` (${body.error})` : ""}`;
      if (response.status === expectedStatus &&
          body?.ok === expectedBody.ok && body?.available === expectedBody.available &&
          body?.error === expectedBody.error) return;
    } catch { /* Retry transient deploy propagation or network errors. */ }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error(`Preview API did not reach expected HTTP ${expectedStatus}; last response ${lastObserved}.`);
}

async function retryPreviewDeployment(base, deploymentId) {
  const result = await cloudflare("POST",
    `${base}/pages/projects/${projectName}/deployments/${deploymentId}/retry`);
  assert(result && typeof result === "object", "Preview deployment retry was not acknowledged.");
  return typeof result.id === "string" ? result.id : deploymentId;
}

async function waitForDeployment(base, deploymentId) {
  const path = `${base}/pages/projects/${projectName}/deployments/${deploymentId}`;
  const deadline = Date.now() + 10 * 60 * 1000;
  let lastStatus = "unknown";
  while (Date.now() < deadline) {
    const deployment = await cloudflare("GET", path);
    lastStatus = `${deployment?.environment || "unknown"}/${deployment?.latest_stage?.status || "unknown"}`;
    if (deployment?.environment === "preview" && deployment.latest_stage?.status === "success")
      return;
    if (["failure", "canceled", "skipped"].includes(deployment?.latest_stage?.status))
      throw new Error(`Preview deployment ended in ${lastStatus}.`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error(`Preview deployment did not finish; last state ${lastStatus}.`);
}

async function postComment(apiUrl, origin, requestId, note) {
  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {Origin: origin, "Content-Type": "application/json", Accept: "application/json"},
      body: JSON.stringify({
        requestId, slug: "hybrid-search", promptCode: "helpful_part", note, turnstileToken: dummyToken,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Preview comment request failed before an HTTP response.");
  }
  const body = await response.json().catch(() => null);
  return {status: response.status, ok: body?.ok, receipt: body?.receipt, error: body?.error};
}

async function main() {
  assert(/^[0-9a-f]{40}$/i.test(commitSha),
    "PREVIEW_COMMIT_SHA must be the full commit SHA for the target Preview deployment.");
  const base = `/accounts/${accountId}`;
  const projectPath = `${base}/pages/projects/${projectName}`;
  const project = await cloudflare("GET", projectPath);
  assert(project?.name === projectName, "Cloudflare Pages project identity did not match.");

  const production = project.deployment_configs?.production || {};
  assert(production.d1_databases?.[binding]?.id === productionDbId,
    "Production D1 binding changed; Preview test is blocked.");
  for (const name of ["AI_PORTAL_FEEDBACK_ENABLED", "NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED", "AI_PORTAL_READER_COMMENTS_ENABLED"])
    assert(production.env_vars?.[name]?.value === "0",
      "A Production intake flag is not OFF; Preview test is blocked.");

  const preview = project.deployment_configs?.preview || {};
  const previewDb = preview.d1_databases?.[binding]?.id;
  assert(typeof previewDb === "string" && previewDb !== productionDbId,
    "Preview D1 binding is absent or not separated from Production.");
  const databases = await cloudflare("GET",
    `${base}/d1/database?name=${encodeURIComponent(previewDbName)}&per_page=100`);
  const matches = Array.isArray(databases) ? databases.filter(database => database.name === previewDbName) : [];
  assert(matches.length === 1 && matches[0].uuid === previewDb,
    "Preview D1 name and Pages binding did not match exactly.");
  const schema = await d1Query(previewDb, "SELECT COUNT(*) AS total FROM reader_comments");
  assert(schema?.[0]?.success === true, "Preview reader_comments table is unavailable.");
  const initialRows = await countRows(previewDb);
  assert(initialRows === 0, "Preview D1 is not empty; refusing to mix this test with existing comments.");

  const realSitekey = preview.env_vars?.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.value;
  assert(typeof realSitekey === "string" && /^[A-Za-z0-9_-]{10,}$/.test(realSitekey),
    "Preview's original Turnstile public key is not available for restoration.");
  const widget = await cloudflare("GET",
    `${base}/challenges/widgets/${encodeURIComponent(realSitekey)}`);
  assert(widget?.mode === "invisible" && Array.isArray(widget.domains) &&
    widget.domains.length > 0 && typeof widget.secret === "string" && widget.secret.length >= 12,
  "Preview's original Turnstile widget could not be verified for restoration.");

  const deployments = await cloudflare("GET",
    `${projectPath}/deployments?env=preview&per_page=25`);
  const selected = Array.isArray(deployments) ? deployments
    .filter(item => item.environment === "preview" &&
      item.deployment_trigger?.metadata?.commit_hash === commitSha &&
      item.latest_stage?.status === "success" && item.is_skipped !== true)
    .sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on))[0] : undefined;
  assert(selected?.id && typeof selected.url === "string",
    "A successful Preview deployment for the requested source commit was not found.");
  const deploymentHosts = [selected.url, ...(Array.isArray(selected.aliases) ? selected.aliases : [])]
    .filter(value => typeof value === "string")
    .map(value => { try { return new URL(value); } catch { return null; } })
    .filter(value => value && value.protocol === "https:" &&
      value.hostname.endsWith(".aiportal-app.pages.dev") && value.hostname !== "aiportal-app.pages.dev");
  const stableAlias = deploymentHosts.find(value => value.hostname !== new URL(selected.url).hostname);
  const target = stableAlias || new URL(selected.url);
  assert(target.protocol === "https:" && target.hostname.endsWith(".aiportal-app.pages.dev") &&
    target.hostname !== "aiportal-app.pages.dev",
  "Selected deployment is not a valid Pages Preview hostname.");
  assert(widget.domains.some(domain => target.hostname === domain || target.hostname.endsWith("." + domain)),
    "Preview's original Turnstile widget does not allow the selected deployment hostname.");
  const apiUrl = new URL("/api/reader-comment", target).toString();
  const productionApi = "https://aiportal.blog/api/reader-comment";
  console.log("Preview target selected by exact SHA: " + target.hostname + ".");
  const testCases = [
    {id: randomUUID(), marker: `Synthetic Preview reference: ${syntheticReference()}`},
    {id: randomUUID(), marker: `Synthetic Preview negative: ${syntheticReference()}`},
  ];
  let configurationChanged = false;
  let activeDeploymentId = selected.id;
  let primaryError;
  const errors = [];

  const setPreview = async ({sitekey, secret, testMode, enabled}) => {
    await cloudflare("PATCH", projectPath, {deployment_configs: {preview: {
      d1_databases: {[binding]: {id: previewDb}},
      env_vars: {
        TURNSTILE_SECRET_KEY: {type: "secret_text", value: secret},
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: {type: "plain_text", value: sitekey},
        AI_PORTAL_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
        NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED: {type: "plain_text", value: "0"},
        AI_PORTAL_READER_COMMENTS_ENABLED: {type: "plain_text", value: enabled ? "1" : "0"},
        AI_PORTAL_TURNSTILE_TEST_MODE: {type: "plain_text", value: testMode ? "1" : "0"},
        AI_PORTAL_TURNSTILE_TEST_HOSTNAME: {type: "plain_text", value: testMode ? target.hostname : ""},
      },
    }}});
    configurationChanged = true;
    const verified = (await cloudflare("GET", projectPath)).deployment_configs?.preview;
    assert(verified?.d1_databases?.[binding]?.id === previewDb &&
      verified.env_vars?.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.value === sitekey &&
      verified.env_vars?.AI_PORTAL_FEEDBACK_ENABLED?.value === "0" &&
      verified.env_vars?.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED?.value === "0" &&
      verified.env_vars?.AI_PORTAL_READER_COMMENTS_ENABLED?.value === (enabled ? "1" : "0") &&
      verified.env_vars?.AI_PORTAL_TURNSTILE_TEST_MODE?.value === (testMode ? "1" : "0") &&
      !!verified.env_vars?.TURNSTILE_SECRET_KEY,
    "Preview test configuration readback failed.");
    assert(!verified.env_vars?.AI_PORTAL_TURNSTILE_TEST_HOSTNAME ||
      verified.env_vars.AI_PORTAL_TURNSTILE_TEST_HOSTNAME.value === (testMode ? target.hostname : ""),
    "Preview test hostname readback failed.");
  };

  try {
    assert((await fetch(productionApi, {signal: AbortSignal.timeout(10000)})).status === 503,
      "Production API is not disabled before the Preview test.");

    await setPreview({sitekey: passSitekey, secret: passSecret, testMode: true, enabled: true});
    activeDeploymentId = await retryPreviewDeployment(base, activeDeploymentId);
    await waitForDeployment(base, activeDeploymentId);
    await waitForAvailability(apiUrl, 200, {ok: true, available: true});

    const positive = testCases[0];
    const accepted = await postComment(apiUrl, target.origin, positive.id, positive.marker);
    assert(accepted.status === 201 && accepted.ok === true && accepted.receipt === positive.id,
      `Preview pass-key submission was not acknowledged (HTTP ${accepted.status}; ${accepted.error || "no app error"}).`);
    const stored = await commentRows(previewDb, positive.marker);
    assert(stored.length === 1 && stored[0].id === positive.id &&
      stored[0].slug === "hybrid-search" && stored[0].prompt_code === "helpful_part",
    "Preview D1 did not contain exactly one expected synthetic record.");
    assert(await countRows(previewDb) === 1, "Preview D1 contained an unexpected extra record.");
    console.log("Preview test-key success: HTTP 201; exactly one expected D1 row verified.");
    await deleteMarkerRows(previewDb, positive.marker);
    assert(await countRows(previewDb) === 0, "Preview D1 was not empty after exact-row cleanup.");
    console.log("Preview successful-test row deleted by exact ID and marker; D1 count is zero.");

    await setPreview({sitekey: failSitekey, secret: failSecret, testMode: true, enabled: true});
    activeDeploymentId = await retryPreviewDeployment(base, activeDeploymentId);
    await waitForDeployment(base, activeDeploymentId);
    await waitForAvailability(apiUrl, 200, {ok: true, available: true});
    const negative = testCases[1];
    const rejected = await postComment(apiUrl, target.origin, negative.id, negative.marker);
    assert(rejected.status === 403 && rejected.ok === false && rejected.error === "verification_rejected",
      `Preview fail-key submission did not reject safely (HTTP ${rejected.status}; ${rejected.error || "no app error"}).`);
    assert((await commentRows(previewDb, negative.marker)).length === 0 && await countRows(previewDb) === 0,
      "Preview fail-key negative test wrote data to D1.");
    console.log("Preview test-key negative case: Siteverify rejection returned HTTP 403; no D1 row written.");
  } catch (error) {
    primaryError = error instanceof Error ? error.message : "Preview end-to-end test failed.";
  } finally {
    if (configurationChanged) {
      try {
        // Disable intake and restore real Preview credentials before cleanup/redeploy.
        await setPreview({sitekey: realSitekey, secret: widget.secret, testMode: false, enabled: false});
      } catch {
        errors.push("Preview OFF/real-key configuration readback failed.");
      }
      for (const item of testCases) {
        try { await deleteMarkerRows(previewDb, item.marker); }
        catch { errors.push("An exact synthetic Preview marker could not be verified/removed."); }
      }
      try {
        activeDeploymentId = await retryPreviewDeployment(base, activeDeploymentId);
        await waitForDeployment(base, activeDeploymentId);
        await waitForAvailability(apiUrl, 503, {ok: false, error: "comments_unavailable"});
        console.log("Preview restore verified: test mode OFF, intake OFF, real widget restored, GET returns HTTP 503.");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Preview redeploy or disabled-API readback failed.");
      }
    }
    try {
      const latest = await cloudflare("GET", projectPath);
      const prod = latest?.deployment_configs?.production;
      assert(prod?.d1_databases?.[binding]?.id === productionDbId &&
        ["AI_PORTAL_FEEDBACK_ENABLED", "NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED", "AI_PORTAL_READER_COMMENTS_ENABLED"]
          .every(name => prod.env_vars?.[name]?.value === "0"),
      "Production flag or D1 isolation readback failed after Preview test.");
      const response = await fetch(productionApi, {signal: AbortSignal.timeout(10000)});
      const body = await response.json().catch(() => null);
      assert(response.status === 503 && body?.ok === false && body?.error === "comments_unavailable",
        "Production API did not remain disabled after Preview test.");
      console.log("Production isolation verified: fixed D1 binding, all intake flags OFF, GET returns HTTP 503.");
    } catch {
      errors.push("Production OFF/isolation readback failed after the Preview test.");
    }
  }

  if (primaryError || errors.length)
    throw new Error([primaryError, ...errors].filter(Boolean).join("; "));
  assert(await countRows(previewDb) === 0, "Preview D1 final count is not zero.");
  console.log("PREVIEW E2E PASS: success/failure paths, exact D1 cleanup, Preview restored OFF, Production unchanged.");
}

main().catch(error => {
  console.error("PREVIEW E2E FAILED: " + (error instanceof Error ? error.message : "unknown error"));
  process.exitCode = 1;
});
