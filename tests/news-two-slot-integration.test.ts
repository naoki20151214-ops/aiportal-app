import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {test} from "node:test";
import {parse, stringify} from "yaml";
import {chooseNewsRelease, publishNews} from "../scripts/publish-news-queue.mjs";

const FIXTURES = [
  {id:"NEWS-8001", slug:"test-reviewed-morning-news",
    slot:"2026-10-19T09:00:00+09:00",
    originalUrl:"https://openai.com/index/synthetic-morning-story"},
  {id:"NEWS-8002", slug:"test-reviewed-evening-news",
    slot:"2026-10-19T18:00:00+09:00",
    originalUrl:"https://openai.com/index/synthetic-evening-story"},
];
const read = (root:string,p:string)=>readFileSync(path.join(root,p),"utf8");
const write = (root:string,p:string,s:string|Buffer)=>{
  const dest=path.join(root,p);
  mkdirSync(path.dirname(dest),{recursive:true});
  writeFileSync(dest,s);
};
function gitBlobSha(s:string){
  const bytes=Buffer.from(s.replace(/\r\n/g,"\n"),"utf8");
  return createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
}
const mdBody = (url:string)=>[
  "",
  "これは機能を安全に確認するための架空のテスト記事です。現実の製品発表ではなく、AI Portalの記事として公開されることもありません。",
  "公開処理のテストでは、承認のない記事が誤って本番へ表示されないこと、正しい時刻まで公開しないこと、編集済みの本文を公開の際に改変しないことを確かめます。",
  "記事の実在する発表日、提供対象、性能、価格について、このテスト文面から現実のニュースを推測することはできません。記載されるURLも架空の実験用資料です。",
  "端末上のダミー記事とダミー画像を使用し、テストのたびに一時ディレクトリへ作成し、検証後に削除します。実際のコンテンツ台帳や公開承認履歴に書き込みません。",
  "公開前の確認では、出典の完全性だけでなく、人物による承認と公開予定時刻、依存する教材が公開済みかを検査することが重要です。",
  "",
  "[公開済みの機械学習教材](/articles/what-is-machine-learning)",
  "[テスト用の架空一次資料]("+url+")",
  "",
].join("\n");
function fixture(){
  const root=mkdtempSync(path.join(tmpdir(),"aiportal-news-two-slot-"));
  for(const p of [
    "content/news/news-cadence.yml","content/news/news-publication-log.yml",
    "content/news/news-editorial-decisions.yml","content/news/sources.json",
    "content/registry/knowledge-nodes.yml",
  ]) write(root,p,readFileSync(p,"utf8"));
  // Append two isolated synthetic nodes to the canonical registry snapshot.
  let registry=read(root,"content/registry/knowledge-nodes.yml");
  const match=registry.match(/^nodeCount: (\d+)$/m);
  assert.ok(match,"Canonical Registry count missing");
  registry=registry.replace(/^nodeCount: \d+$/m,"nodeCount: "+(Number(match[1])+2));
  for(const f of FIXTURES){
    assert.ok(!registry.includes('id: "'+f.id+'"'),"Synthetic test ID must be unique");
    registry+=[
      '  - id: "'+f.id+'"',
      '    title: "テスト専用の架空ニュース"',
      '    slug: "'+f.slug+'"',
      '    category: "AIニュース"',
      '    level: 0',
      '    type: "news"',
      '    status: "ready"',
      '    centerQuestion: "公開枠の安全性テスト"',
      '    prerequisites: ["BAS-0002"]',
      '    children: []',
      '    related: []',
      '    priority: "A"',
      "",
    ].join("\n");
  }
  write(root,"content/registry/knowledge-nodes.yml",registry);
  const approvals=[];
  const originals=new Map<string,string>();
  for(const f of FIXTURES){
    const md=[
      "---",
      'id: "'+f.id+'"',
      'title: "テスト専用ニュース '+f.id+'"',
      'slug: "'+f.slug+'"',
      'description: "公開処理だけを試験する架空の短い記事"',
      'category: "AIニュース"',
      'level: 0',
      'type: "news"',
      'status: "ready"',
      'publishedAt: "2026-10-19"',
      'updatedAt: "2026-10-19"',
      'author: "QA fixture"',
      'thumbnail: "/images/news/'+f.slug+'.webp"',
      'adPolicy: "off"',
      "---",
      mdBody(f.originalUrl),
    ].join("\n");
    assert.ok(md.length>350 && md.length<1300);
    originals.set(f.slug,md);
    write(root,"content/articles/"+f.slug+".md",md);
    const image=Buffer.alloc(20032,12);
    image.write("RIFF",0,"ascii");
    image.writeUInt32LE(image.length-8,4);
    image.write("WEBP",8,"ascii");
    write(root,"public/images/news/"+f.slug+".webp",image);
    const audit="Synthetic audit for isolated test only. Never suitable for real editorial approval.\n";
    write(root,"content/news/editorial-audits/"+f.id+".md",audit);
    approvals.push({
      id:f.id,slug:f.slug,approvedOn:"2026-10-18",approvedBy:"site-owner",
      evidence:"SYNTHETIC FIXTURE ONLY: Test data, not a real approval or editorial review.",
      decision:"approved-for-publication",scheduledAtJst:f.slot,
      sourceReadyBlob:gitBlobSha(md),
      heroSha256:createHash("sha256").update(image).digest("hex"),
      originalUrl:f.originalUrl,
      auditPath:"content/news/editorial-audits/"+f.id+".md",
    });
  }
  write(root,"content/news/news-approval-queue.yml",stringify({schemaVersion:1,timezone:"Asia/Tokyo",approvals}));
  return {root,originals};
}

test("Isolated owner-signed simulations publish only at each immutable 09:00/18:00 slot",()=>{
  const {root,originals}=fixture();
  try{
    const at=(clock:string)=>new Date("2026-10-19T"+clock+"+09:00");
    const logOriginal=read(root,"content/news/news-publication-log.yml");
    const nope=publishNews(root,{apply:true,now:at("08:59:59")});
    assert.equal(nope.changed,false,"08:59 may not release the morning news");
    assert.equal(parse(read(root,"content/news/news-approval-queue.yml")).approvals[0].decision,"approved-for-publication");
    const morning=publishNews(root,{apply:true,now:at("09:17:00")});
    assert.equal(morning.changed,true);
    assert.equal(morning.id,"NEWS-8001");
    assert.equal(morning.publishedOn,"2026-10-19");
    assert.equal(morning.availableSlots,undefined);
    const morningPublished=read(root,"content/articles/"+FIXTURES[0].slug+".md");
    assert.ok(morningPublished.includes('status: "published"'));
    assert.equal(morningPublished.split("\n---\n").at(-1),originals.get(FIXTURES[0].slug)!.split("\n---\n").at(-1),"Manuscript body must be preserved byte for byte");
    assert.equal(publishNews(root,{apply:true,now:at("09:30:00")}).changed,false,"Repeated morning run must not consume evening story");
    assert.equal(publishNews(root,{apply:true,now:at("17:59:59")}).changed,false,"Evening story must stay ready before 18:00");
    const evening=publishNews(root,{apply:true,now:at("18:17:00")});
    assert.equal(evening.changed,true);
    assert.equal(evening.id,"NEWS-8002");
    assert.equal(evening.publishedOn,"2026-10-19");
    assert.equal(read(root,"content/news/news-publication-log.yml"),logOriginal,"Historical log must not be rewritten");
    const ledger=parse(read(root,"content/news/news-approval-queue.yml"));
    assert.deepEqual(ledger.approvals.map((a:{decision:string})=>a.decision),["published","published"]);
    assert.equal(publishNews(root,{apply:true,now:at("18:30:00")}).changed,false);
    const later=chooseNewsRelease(root,at("20:00:00"));
    assert.equal(later.availableSlots,0);
    assert.match(later.reason,/quota reached/);
    const archive=JSON.parse(read(root,"content/news/news-archive.json"));
    assert.equal(archive.entries.filter((e:{id:string})=>FIXTURES.some(f=>f.id===e.id)).length,2);
    for(const f of FIXTURES){
      const e=archive.entries.find((x:{id:string})=>x.id===f.id);
      assert.equal(e?.status,"published");
      assert.equal(e?.publishedAt,"2026-10-19");
      assert.ok(read(root,"content/articles/"+f.slug+".md").includes(f.originalUrl));
    }
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("An altered synthetic approved manuscript fails closed without promotion",()=>{
  const {root}=fixture();
  try{
    const p="content/articles/"+FIXTURES[0].slug+".md";
    write(root,p,read(root,p)+"\nThe approved document has been changed.\n");
    assert.throws(()=>publishNews(root,{apply:true,now:new Date("2026-10-19T09:17:00+09:00")}),/ready manuscript was altered/);
    assert.equal(parse(read(root,"content/news/news-approval-queue.yml")).approvals[0].decision,"approved-for-publication");
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("Synthetic ready stories with empty approval queue cannot be published",()=>{
  const {root}=fixture();
  try{
    write(root,"content/news/news-approval-queue.yml",stringify({schemaVersion:1,timezone:"Asia/Tokyo",approvals:[]}));
    const result=publishNews(root,{apply:true,now:new Date("2026-10-19T18:17:00+09:00")});
    assert.equal(result.changed,false);
    assert.match(result.reason,/No date-due/);
    assert.equal(read(root,"content/articles/"+FIXTURES[0].slug+".md").includes('status: "ready"'),true);
  }finally{rmSync(root,{recursive:true,force:true});}
});