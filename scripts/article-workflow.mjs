#!/usr/bin/env node
/**
 * Production Start Gate: reconcile the 500-node registry against main, retained
 * GitHub branches and PR history. Never infer "not written" from planned.
 * Read-only with respect to GitHub: writes reports to local disk only.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {parse} from 'yaml';
import {
  articleFields, imagePaths, flattenCurriculum, inventoryForNodes,
  markdownTable, decideStart, checkReuseProvenance
} from './article-inventory-core.mjs';

const ROOT = process.cwd();
const DEFAULT_REPO = 'naoki20151214-ops/aiportal-app';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const REPOSITORY = process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
const GITHUB_API = `https://api.github.com/repos/${REPOSITORY}`;
const argv = process.argv.slice(2);
const command = argv[0];

function fail(message) { console.error(`ARTICLE GATE BLOCKED: ${message}`); process.exitCode=1; }
function getFlag(name) {
  const pref=`--${name}=`;
  const val=argv.find(s=>s.startsWith(pref));
  return val?.slice(pref.length);
}
function assertToken() {
  if (!TOKEN) throw new Error('GITHUB_TOKEN or GH_TOKEN is mandatory: the gate refuses to infer absence from offline data.');
  if (!/^[\w.-]+\/[\w.-]+$/.test(REPOSITORY)) throw new Error('Invalid GITHUB_REPOSITORY');
}

async function gh(endpoint) {
  const url=endpoint.startsWith('https:')?endpoint:`${GITHUB_API}${endpoint}`;
  // Retry transient GitHub network failures without permitting partial inventory.
  for(let attempt=1; attempt<=4; attempt++){
    try{
      const response=await fetch(url,{
        headers:{Authorization:`Bearer ${TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
        signal:AbortSignal.timeout(45000)
      });
      if(!response.ok){
        if(attempt<4 && [429,500,502,503,504].includes(response.status)){
          await new Promise(resolve=>setTimeout(resolve,1000*attempt));
          continue;
        }
        throw new Error(`GitHub API ${response.status} (${new URL(url).pathname}). Scan incomplete; do not draft.`);
      }
      return {data:await response.json(), headers:response.headers};
    }catch(error){
      if(attempt>=4)throw new Error(`GitHub audit failed after 4 attempts: ${error.message}. Fail closed.`);
      await new Promise(resolve=>setTimeout(resolve,1000*attempt));
    }
  }
  throw new Error('GitHub audit incomplete');
}

async function allPages(endpoint, maxPages=10) {
  const out=[];
  let next=`${endpoint}${endpoint.includes('?')?'&':'?'}per_page=100`;
  let pages=0;
  while(next){
    if(++pages>maxPages) throw new Error('GitHub pagination exceeded safety limit; scan incomplete.');
    const {data,headers}=await gh(next);
    if(!Array.isArray(data)) throw new Error('Expected GitHub array from paginated endpoint');
    out.push(...data);
    const links=headers.get('link')||'';
    const found=links.match(/<([^>]+)>;\s*rel="next"/);
    next=found?.[1]??null;
    if(!links && data.length===100){
      // Some proxies omit Link headers: fail closed rather than silently truncate.
      throw new Error('GitHub returned a full page with no pagination metadata. Refusing incomplete scan.');
    }
  }
  return out;
}

async function mapLimit(inputs, limit, fn) {
  const result=new Array(inputs.length);
  let i=0;
  await Promise.all(Array.from({length:Math.min(limit,inputs.length)},async()=>{
    while(i<inputs.length){ const ix=i++; result[ix]=await fn(inputs[ix],ix); }
  }));
  return result;
}

async function mainFromGitHub() {
  // Important: the PR checkout is not main. A new article on the PR must NOT be
  // mistaken for a pre-existing article in production.
  const {data:tree} = await gh('/git/trees/main?recursive=1');
  if (tree.truncated || !Array.isArray(tree.tree)) {
    throw new Error('Main tree is truncated or missing; cannot audit published source of truth');
  }
  const pathMap = new Map(tree.tree.filter(x=>x.type==='blob').map(x=>[x.path,x]));
  async function blobText(sha) {
    const {data} = await gh(`/git/blobs/${sha}`);
    if(data.encoding!=='base64'||typeof data.content!=='string') {
      throw new Error('Cannot decode GitHub file blob; scan is incomplete');
    }
    return Buffer.from(data.content.replaceAll('\n',''),'base64').toString('utf8');
  }
  async function yamlFile(file) {
    const item=pathMap.get(file);
    if(!item)throw new Error(`Main is missing required ${file}`);
    return parse(await blobText(item.sha));
  }
  const [registry,curriculum]=await Promise.all([
    yamlFile('content/registry/knowledge-nodes.yml'),
    yamlFile('content/registry/core-curriculum.yml')
  ]);
  const files=tree.tree.filter(f=>f.type==='blob'&&/^content\/articles\/[^/]+\.md$/.test(f.path));
  const testFiles=tree.tree.filter(f=>f.type==='blob'&&/^tests\/.*\.test\.ts$/.test(f.path)).map(f=>f.path);
  const paths=new Set(tree.tree.map(f=>f.path));
  const mainFiles=await mapLimit(files,5,async f=>{
    const markdown=await blobText(f.sha);
    const values=articleFields(markdown,{allowLegacy:true});
    const images=imagePaths(markdown);
    const tokens=values.slug.split('-').filter(x=>x.length>=4&& !['what','is','with','from','for'].includes(x));
    return {...values,filename:path.basename(f.path),images,
      imageMissing:images.filter(img=>!paths.has(img)),
      test:testFiles.some(t=>t.includes(values.slug)||tokens.some(token=>t.includes(token)))};
  });
  return {registry,curriculum,mainFiles,mainSha:tree.sha};
}

async function liveSnapshot() {
  assertToken();
  const {registry,curriculum,mainFiles,mainSha} = await mainFromGitHub();
  const allNodes=registry.nodes;
  const coreNodes=flattenCurriculum(curriculum,registry);
  const [branches,prs]=await Promise.all([
    allPages('/branches',15),
    allPages('/pulls?state=all',15)
  ]);
  if (!branches.some(b=>b.name==='main')) throw new Error('Main branch not returned by GitHub. Incomplete scan.');
  const remotes=branches.filter(b=>b.name!=='main');
  if(remotes.length>1000) throw new Error('Branch count exceeds audit limit; refusing partial scan');
  console.error(`Scanning ${remotes.length} retained non-main branches for article paths…`);
  const remoteTrees=await mapLimit(remotes,4,async(branch)=>{
    const sha=branch.commit?.sha;
    if(!/^[0-9a-f]{40}$/.test(sha??'')) throw new Error(`Missing commit SHA for ${branch.name}`);
    const {data}=await gh(`/git/trees/${sha}?recursive=1`);
    if(data.truncated||!Array.isArray(data.tree))throw new Error(`Truncated tree for ${branch.name}; do not start new work`);
    return {name:branch.name, sha, tree:data.tree.filter(t=>
      t.type==='blob' && (t.path.startsWith('content/articles/')||t.path.startsWith('public/images/articles/')||t.path.startsWith('tests/'))
    )};
  });
  const rows=inventoryForNodes({nodes:allNodes,mainArticles:mainFiles,remoteBranches:remoteTrees,pullRequests:prs});
  const branchByName=new Map(remoteTrees.map(b=>[b.name,b]));
  // Drill into one source file for each unpublished node with a retained draft.
  const drill=rows.filter(row=>!row.mainArticleStatus && row.branches.length);
  await mapLimit(drill,4,async row=>{
    const source=row.branches[0];
    const repoTree=branchByName.get(source.branch).tree;
    const {data}=await gh(`/git/blobs/${source.sha}`);
    if(data.encoding!=='base64'||typeof data.content!=='string')throw new Error(`Unsupported GitHub blob for ${row.id}`);
    const markdown=Buffer.from(data.content.replaceAll('\n',''),'base64').toString('utf8');
    let fields;
    try{fields=articleFields(markdown);}catch{fields={id:'invalid',slug:'invalid',status:'invalid'};}
    const references=imagePaths(markdown);
    const pathSet=new Set(repoTree.map(x=>x.path));
    const missing=references.filter(p=>!pathSet.has(p));
    const tokens=row.slug.split('-').filter(x=>x.length>3 && !['what','with','from'].includes(x));
    const tests=repoTree.filter(x=>x.path.startsWith('tests/')&&x.path.endsWith('.test.ts'));
    row.representative={branch:source.branch,status:fields.id===row.id&&fields.slug===row.slug?fields.status:'frontmatter mismatch',
      imageCount:references.length,missingImages:missing,testHint:tests.some(x=>x.path.includes(row.slug)||tokens.some(t=>x.path.includes(t))),
      fileSha:source.sha};
  });
  return {coreNodes,rows,remoteTrees,prs,scannedAt:new Date().toISOString(),mainFiles,mainSha};
}

function writeReports(snapshot) {
  const output=getFlag('output')||'artifacts/article-inventory';
  const full=path.resolve(ROOT,output);
  fs.mkdirSync(path.dirname(full),{recursive:true});
  const coreSet=new Set(snapshot.coreNodes.map(n=>n.id));
  const coreRows=snapshot.rows.filter(r=>coreSet.has(r.id))
    .sort((a,b)=>snapshot.coreNodes.findIndex(n=>n.id===a.id)-snapshot.coreNodes.findIndex(n=>n.id===b.id));
  const compact={schemaVersion:1,scannedAt:snapshot.scannedAt,repository:REPOSITORY,
    mainSha:snapshot.mainSha,totalRegistryNodes:snapshot.rows.length,coreArticleCount:coreRows.length,
    scannedBranches:snapshot.remoteTrees.length+1,scannedPullRequests:snapshot.prs.length,
    rows:coreRows.map(r=>({...r,branches:r.branches.map(({branch,sha})=>({branch,sha}))}))};
  fs.writeFileSync(`${full}.json`,JSON.stringify(compact,null,2)+'\n');
  const report=markdownTable(coreRows,{repository:REPOSITORY,scannedAt:snapshot.scannedAt,branchCount:snapshot.remoteTrees.length+1,prCount:snapshot.prs.length});
  fs.writeFileSync(`${full}.md`,report);
  console.log(`Inventory saved: ${full}.md + ${full}.json`);
  const summary=process.env.GITHUB_STEP_SUMMARY;
  if(summary)fs.appendFileSync(summary,report);
  return compact;
}

async function gatePullRequest(snapshot) {
  const prNum=getFlag('pr') || process.env.GITHUB_EVENT_PATH && JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')).pull_request?.number;
  if(!prNum || !/^\d+$/.test(String(prNum)))throw new Error('PR number required for article:gate');
  const changed=await allPages(`/pulls/${prNum}/files?`,20);
  const added=changed.filter(f=>(f.status==='added'||f.status==='renamed')&&/^content\/articles\/[^/]+\.md$/.test(f.filename));
  const branch=(await gh(`/pulls/${prNum}`)).data.head?.ref;
  if(!branch)throw new Error('Cannot identify PR head branch');
  const errors=[];
  const rowsById=new Map(snapshot.rows.map(r=>[r.id,r]));
  for(const file of added){
    const local=path.join(ROOT,file.filename);
    if(!fs.existsSync(local)){errors.push(`${file.filename}: PR file absent from checkout`);continue;}
    try{
      const front=articleFields(fs.readFileSync(local,'utf8'));
      let row=rowsById.get(front.id);
      if(!row){
        // Legitimate expansion nodes must exist in this PR's updated Registry,
        // and must be corroborated by original article evidence on remote refs.
        const localRegistry=parse(fs.readFileSync(path.join(ROOT,'content/registry/knowledge-nodes.yml'),'utf8'));
        if(localRegistry.nodeCount!==localRegistry.nodes.length)throw new Error('PR Registry nodeCount mismatch');
        const node=localRegistry.nodes.find(n=>n.id===front.id);
        if(!node||node.slug!==front.slug||snapshot.rows.some(n=>n.slug===front.slug))
          throw new Error('New node ID/slug missing or conflicts with existing Registry');
        row=inventoryForNodes({nodes:[node],mainArticles:snapshot.mainFiles,remoteBranches:snapshot.remoteTrees,pullRequests:snapshot.prs})[0];
      }
      if(!row||row.slug!==front.slug)throw new Error('ID/slug are missing or inconsistent with Master Registry');
      const claim=path.join(ROOT,`.github/article-reuse/${front.id}.yml`);
      const provenance=fs.existsSync(claim)?parse(fs.readFileSync(claim,'utf8')):null;
      if(provenance && (provenance.id!==front.id||!provenance.sourceRef))throw new Error('Malformed reuse provenance');
      const result=checkReuseProvenance({row,sourceRef:provenance?.sourceRef,incomingBranch:branch});
      console.log(`${front.id}: ${result}`);
    }catch(e){errors.push(`${file.filename}: ${e.message}`);}
  }
  if(errors.length)throw new Error('Duplicate drafting blocked:\n'+errors.join('\n'));
  console.log(`Production Start Gate passed: ${added.length} new article file(s) checked.`);
}

async function main() {
  if(!['inventory','preflight','gate','ci'].includes(command))throw new Error('Use inventory | preflight ID | gate --pr=N | ci --pr=N');
  const snapshot=await liveSnapshot();
  if(command==='inventory'||command==='ci')writeReports(snapshot);
  if(command==='preflight'){
    const id=argv[1];
    if(!/^(BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}$/.test(id??''))throw new Error('Pass a Registry article ID, e.g. BAS-0023');
    const row=snapshot.rows.find(r=>r.id===id);
    const result=decideStart(row);
    console.log(JSON.stringify({id,plannedStatus:row?.status,mainArticleStatus:row?.mainArticleStatus,
      branches:row?.branches.map(b=>b.branch),prReferences:row?.prs.map(p=>p.number),decision:result},null,2));
    if(!result.allowed)process.exitCode=2;
  }
  if(command==='gate'||command==='ci')await gatePullRequest(snapshot);
}
main().catch(e=>fail(e.message));