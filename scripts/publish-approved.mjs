#!/usr/bin/env node
/**
 * Approval-to-production executor. GitHub Actions calls this only for an
 * owner-authored exact "/publish-approved ID" comment on a review PR.
 * It copies only that article and its local images; it never merges the PR.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parse } from "yaml";
import {
  approvalId, frontmatter, publishArticle, publishNode,
  imagePaths, articleLinks, updatePublicationTest
} from "./editorial-release-core.mjs";

const fail = message => { throw new Error("Publication blocked: " + message); };
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const eventPath = process.env.GITHUB_EVENT_PATH;
if (!token || !eventPath || !/^[\w.-]+\/[\w.-]+$/.test(repo ?? "")) fail("Missing Actions credentials or repository");
const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
if (!event.issue?.pull_request || event.comment?.user?.login !== repo.split("/")[0]) {
  fail("Only a repository-owner approval comment on a PR is authorized");
}
const id = approvalId(event.comment.body);
const prNumber = event.issue.number;
if (!Number.isSafeInteger(prNumber) || prNumber <= 0) fail("Invalid PR number");

async function api(endpoint, method = "GET", body) {
  const result = await fetch("https://api.github.com/repos/" + repo + endpoint, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? {"Content-Type": "application/json"} : {})
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
    signal: AbortSignal.timeout(45000)
  });
  if (!result.ok) fail("GitHub API " + result.status + " on " + endpoint);
  return result.json();
}
function git(...args) {
  return execFileSync("git", args, {encoding:"utf8",maxBuffer:8*1024*1024}).trim();
}
function gitBytes(...args) {
  return execFileSync("git", args, {maxBuffer:8*1024*1024});
}
function safeWrite(relative, bytes) {
  if (relative.includes("..") || path.isAbsolute(relative)) fail("Unsafe path " + relative);
  fs.mkdirSync(path.dirname(relative), {recursive:true});
  fs.writeFileSync(relative, bytes);
}
function note(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + "\n");
}
const mainHead = git("rev-parse", "HEAD");
const pr = await api("/pulls/" + prNumber);
if (pr.state !== "open" || pr.merged_at || pr.base?.ref !== "main" ||
    pr.head?.repo?.full_name !== repo || !/^review\/[a-z0-9/_-]+$/.test(pr.head.ref ?? "")) {
  fail("Approval must reference an open, same-repository review/ PR based on main (never a preview PR)");
}
const headSha = pr.head.sha;
if (!/^[0-9a-f]{40}$/.test(headSha)) fail("Invalid PR SHA");
const registryPath = "content/registry/knowledge-nodes.yml";
const current = fs.readFileSync(registryPath, "utf8");
const nodes = parse(current).nodes;
const node = nodes.find(n => n.id === id);
if (!node) fail("Unknown Registry ID " + id);
if (node.status === "published") {
  note(id + " is already published. No duplicate deployment.");
  process.exit(0);
}
const sourcePath = "content/articles/" + node.slug + ".md";
const changedFiles = await api("/pulls/" + prNumber + "/files?per_page=100");
if (!Array.isArray(changedFiles) || changedFiles.length === 100) fail("PR diff missing or incomplete");
if (!changedFiles.some(f => f.filename === sourcePath)) fail("Review PR does not contain this article");
const checks = await api("/commits/" + headSha + "/check-runs?per_page=100");
for (const name of ["verify", "Cloudflare Pages"]) {
  if (!checks.check_runs.some(c => c.name === name && c.status === "completed" && c.conclusion === "success")) {
    fail("Review PR check is not green: " + name);
  }
}
git("fetch", "origin", headSha);
const original = gitBytes("show", headSha + ":" + sourcePath).toString("utf8");
const meta = frontmatter(original);
if (meta.id !== id || meta.slug !== node.slug || !["ready","review"].includes(meta.status)) {
  fail("PR article identity or editorial state mismatch");
}
const mainArticleExists = fs.existsSync(sourcePath);
if (mainArticleExists) {
  const mainArticle = fs.readFileSync(sourcePath,"utf8");
  if (frontmatter(mainArticle).status !== "ready") fail("Main already has a non-ready article");
  const mainBody = mainArticle.replace(/^---[\s\S]*?---\s*/, "");
  const prBody = original.replace(/^---[\s\S]*?---\s*/, "");
  if (mainBody !== prBody) fail("Review PR unexpectedly rewrites an existing ready article");
}
const statusBySlug = new Map(nodes.map(n => [n.slug, n.status]));
const unpublished = articleLinks(original).filter(slug => statusBySlug.get(slug) !== "published");
if (unpublished.length) fail("Unpublished internal links: " + unpublished.join(", "));
const images = imagePaths(original);
for (const img of images) {
  if (!/^public\/images\/articles\/[a-z0-9-]+\/[a-z0-9-]+\.(?:svg|webp|png|jpg|jpeg)$/.test(img)) {
    fail("Unexpected article image path: " + img);
  }
  const content = gitBytes("show", headSha + ":" + img);
  if (content.length < 400) fail("Image appears broken: " + img);
  if (fs.existsSync(img) && !fs.readFileSync(img).equals(content)) {
    fail("Image asset collision: " + img);
  }
  safeWrite(img,content);
}
const day = new Date(Date.now() + 9*3600*1000).toISOString().slice(0,10);
const articleOut = publishArticle(original, day);
if (articleOut.replace(/^---[\s\S]*?---\s*/, "") !== original.replace(/^---[\s\S]*?---\s*/, "")) fail("Approved prose changed");
const registryNext = publishNode(current, id);
safeWrite(sourcePath,articleOut);
safeWrite(registryPath,registryNext);
const oldCount = nodes.filter(n=>n.status==="published").length;
const publicationTest="tests/publication-readiness.test.ts";
safeWrite(publicationTest,updatePublicationTest(fs.readFileSync(publicationTest,"utf8"),id,oldCount));
const logPath="content/registry/article-approval-log.yml";
let log = fs.readFileSync(logPath,"utf8");
if (parse(log).approvals.some(a=>a.id===id)) fail("Approval already exists in ledger for an unpublished article");
const bodySha=git("rev-parse",headSha+":"+sourcePath);
log=log.trimEnd()+"\n" +
  '  - id: "'+id+'"\n' +
  '    slug: "'+node.slug+'"\n' +
  '    approvedOn: "'+day+'"\n' +
  '    decision: "auto-publish-on-editorial-approval"\n' +
  '    sourceRef: "'+pr.head.ref+'"\n' +
  '    sourceArticleBlob: "'+bodySha+'"\n' +
  "    illustrations: "+images.length+"\n" +
  '    editorialChanges: "None; approved body preserved"\n' +
  '    evidence: "GitHub PR #'+prNumber+' owner approval comment #'+event.comment.id+'"\n';
safeWrite(logPath,log);
git("config","user.name","github-actions[bot]");
git("config","user.email","41898282+github-actions[bot]@users.noreply.github.com");
git("add","--",registryPath,sourcePath,publicationTest,logPath,...images);
git("commit","-m","Publish approved "+id+" without a second approval step");
const newSha = git("rev-parse","HEAD");
note("Approved "+id+". Running all production checks on commit "+newSha);
for (const args of [["test"],["run","lint"],["run","build"]]) {
  execFileSync("npm",args,{stdio:"inherit",timeout:10*60*1000});
}
git("fetch","origin","main");
const remoteSha=git("rev-parse","origin/main");
if (remoteSha!==mainHead) fail("Main moved during validation; do not overwrite it");
git("push","origin","HEAD:main"); // fast-forward only; never force push
note("Published "+id+" on main "+newSha+". Waiting for Cloudflare Production deployment.");
await api("/pulls/"+prNumber,"PATCH",{state:"closed"}); // Close original review PR unmerged.
let deployed=false;
for (let attempt=0;attempt<40;attempt++) {
  await new Promise(resolve=>setTimeout(resolve,10000));
  const result=await api("/commits/"+newSha+"/check-runs?per_page=100");
  const cf=result.check_runs.find(c=>c.name==="Cloudflare Pages");
  if (cf?.conclusion==="success") {deployed=true;break;}
  if (cf?.status==="completed"&&cf?.conclusion!=="success") fail("Cloudflare Production deployment failed");
}
if(!deployed)fail("Production push complete but Cloudflare deployment not confirmed in time");
note("Production deployment verified: "+id+" at /articles/"+node.slug);
