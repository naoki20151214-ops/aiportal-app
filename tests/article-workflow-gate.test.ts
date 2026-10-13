import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  articleFields, imagePaths, flattenCurriculum, inventoryForNodes,
  decideStart, checkReuseProvenance, markdownTable
} from '../scripts/article-inventory-core.mjs';

const nodes = [
  {id:'BAS-0017',title:'Transformer',slug:'what-is-transformer',status:'published',day:3},
  {id:'BAS-0023',title:'Context Window',slug:'context-window',status:'planned',day:3},
  {id:'GEN-0002',title:'LLM',slug:'what-is-llm',status:'planned',day:3},
  {id:'GEN-0008',title:'RAG',slug:'what-is-rag',status:'planned',day:4}
];
const mainArticles=[{id:'BAS-0017',slug:'what-is-transformer',status:'published',images:[],imageMissing:[],test:true}];
const branches=[
 {name:'draft/bas-0023-context-window',tree:[{type:'blob',path:'content/articles/context-window.md',sha:'111'}]},
 {name:'preview/llm-beginner',tree:[{type:'blob',path:'content/articles/what-is-llm.md',sha:'222'}]},
 {name:'main',tree:[{type:'blob',path:'content/articles/what-is-transformer.md',sha:'333'}]},
];
function inventory() {return inventoryForNodes({nodes,mainArticles,remoteBranches:branches});}

test('a planned Registry node is blocked when a draft exists elsewhere',()=>{
 const r=inventory().find((x: {id:string})=>x.id==='BAS-0023');
 assert.equal(r.verdict,'reuse-remote');
 assert.equal(decideStart(r).allowed,false);
 assert.match(decideStart(r).why,/draft\/bas-0023/);
});
test('a prior preview is treated as existing work, not a new article',()=>{
 const r=inventory().find((x: {id:string})=>x.id==='GEN-0002');
 assert.equal(r.verdict,'reuse-remote');
 assert.equal(decideStart(r).allowed,false);
});
test('published articles cannot be drafted again',()=>{
 const r=inventory().find((x: {id:string})=>x.id==='BAS-0017');
 assert.equal(r.verdict,'published');
 assert.equal(decideStart(r).allowed,false);
});
test('new candidates are allowed only with no evidence and planned state',()=>{
 const r=inventory().find((x: {id:string})=>x.id==='GEN-0008');
 assert.equal(r.verdict,'new-candidate');
 assert.equal(decideStart(r).allowed,true);
});
test('PR gate blocks an inherited article unless a verified source ref is declared',()=>{
 const r=inventory().find((x: {id:string})=>x.id==='BAS-0023');
 assert.throws(()=>checkReuseProvenance({row:r,incomingBranch:'new/bas-0023',sourceRef:undefined}),/already exists/);
 assert.throws(()=>checkReuseProvenance({row:r,incomingBranch:'new/bas-0023',sourceRef:'draft/wrong'}),/already exists/);
 assert.match(checkReuseProvenance({row:r,incomingBranch:'new/bas-0023',sourceRef:'draft/bas-0023-context-window'}),/REUSE/);
});
test('a claimed source absent from existing branches is never accepted',()=>{
 const r=inventory().find((x: {id:string})=>x.id==='GEN-0008');
 assert.throws(()=>checkReuseProvenance({row:r,incomingBranch:'new/rag',sourceRef:'draft/not-found'}),/no verified article/);
});
test('reports clearly distinguish registry status and retained draft evidence',()=>{
 const report=markdownTable(inventory(),{repository:'org/repo',scannedAt:'2026-10-13T00:00:00Z',branchCount:4,prCount:2});
 assert.match(report,/Core Curriculum 100/);
 assert.match(report,/BAS-0023\|Context Window\|planned\|既存成果物あり/);
 assert.match(report,/GEN-0008\|RAG\|planned\|既存原稿未検出/);
});
test('frontmatter and referenced assets can be checked without inventing statuses',()=>{
 const article='---\nid: "BAS-0023"\nslug: "context-window"\nstatus: "ready"\n---\n![x](/images/articles/context-window/hero.svg)';
 assert.deepEqual(articleFields(article),{id:'BAS-0023',slug:'context-window',status:'ready'});
 assert.deepEqual(articleFields('---\nslug: \"legacy-news\"\n---\nbody',{allowLegacy:true}),{id:null,slug:'legacy-news',status:'published'});
 assert.deepEqual(imagePaths(article),['public/images/articles/context-window/hero.svg']);
});
test('Core Curriculum is the canonical ordered list; missing nodes fail closed',()=>{
 const core={targetArticleCount:2,days:[{day:1,nodes:['BAS-0017','BAS-0023']}]};
 assert.deepEqual(flattenCurriculum(core,{nodes}).map((x: {id:string})=>x.id),['BAS-0017','BAS-0023']);
 assert.throws(()=>flattenCurriculum({targetArticleCount:1,days:[{day:1,nodes:['BAD-001']}]},{nodes}),/unknown Registry/);
});
