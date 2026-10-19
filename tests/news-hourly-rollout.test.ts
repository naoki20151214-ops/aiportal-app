import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {test} from "node:test";
import {parse,stringify} from "yaml";
import {activeNewsCadence,assertUniqueNewsSlots,publishNews} from "../scripts/publish-news-queue.mjs";

const hours=Array.from({length:17},(_,i)=>String(i+7).padStart(2,"0")+":00");
const read=(root:string,p:string)=>readFileSync(path.join(root,p),"utf8");
const write=(root:string,p:string,s:string|Buffer)=>{
  const f=path.join(root,p);mkdirSync(path.dirname(f),{recursive:true});writeFileSync(f,s);
};
const sha=(s:string)=>{
  const b=Buffer.from(s,"utf8");
  return createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
};
function fixture(phase:"pilot-2"|"growth-6"|"hourly-17"){
  const root=mkdtempSync(path.join(tmpdir(),"aiportal-news-hourly-"));
  for(const p of [
    "content/news/news-cadence.yml","content/news/news-publication-log.yml",
    "content/news/news-editorial-decisions.yml","content/news/sources.json",
    "content/registry/knowledge-nodes.yml",
  ])write(root,p,readFileSync(p,"utf8"));
  const cadence=parse(read(root,"content/news/news-cadence.yml"));
  cadence.activePhase=phase;
  cadence.targetApprovedPostsPerDay=cadence.phases[phase].maximumPostsPerDay;
  write(root,"content/news/news-cadence.yml",stringify(cadence));
  const registry=parse(read(root,"content/registry/knowledge-nodes.yml"));
  const approvals=[];
  for(let i=0;i<hours.length;i++){
    const h=hours[i],hh=h.slice(0,2);
    const id="NEWS-"+String(8300+i),slug="synthetic-verified-"+hh;
    const originalUrl="https://openai.com/index/fictional-hourly-"+hh;
    registry.nodes.push({
      id,title:"架空の時間別記事 "+id,slug,category:"AIニュース",
      level:0,type:"news",status:"ready",
      centerQuestion:"同じ時間枠に二本公開しないための検証はできるか？",
      prerequisites:["BAS-0002"],children:[],related:[],priority:"A",
    });
    const body=("これはニュース公開枠の時間と検証の仕組みだけを確かめるための架空のテストです。"+
      "ニュースの真偽や性能を証明する実際の発表ではありません。"+
      "承認、画像SHA、依存教材と記事本文の一致を全て確認してから公開処理します。").repeat(5)+
      "\n\n[公式URLの合成テスト]("+originalUrl+")\n"+
      "[公開済み教材](/articles/what-is-machine-learning)\n";
    const article=[
      "---",'id: "'+id+'"','title: "架空の時間別記事 '+id+'"',
      'slug: "'+slug+'"','category: "AIニュース"','type: "news"',
      'status: "ready"','publishedAt: "2026-10-22"','updatedAt: "2026-10-22"',
      'adPolicy: "off"','thumbnail: "/images/news/'+slug+'.webp"',
      "---",body
    ].join("\n");
    assert.ok(body.length>350 && body.length<1300);
    write(root,"content/articles/"+slug+".md",article);
    const img=Buffer.alloc(20100,i+1);
    img.write("RIFF",0,"ascii");img.write("WEBP",8,"ascii");
    write(root,"public/images/news/"+slug+".webp",img);
    write(root,"content/news/editorial-audits/"+id+".md",
      "Synthetic isolated test. Never a real owner approval or story.\n");
    approvals.push({
      id,slug,approvedOn:"2026-10-21",approvedBy:"site-owner",
      evidence:"SYNTHETIC TEST ONLY: No actual news or owner approval. Never push these fixtures.",
      decision:"approved-for-publication",scheduledAtJst:"2026-10-22T"+h+":00+09:00",
      sourceReadyBlob:sha(article),
      heroSha256:createHash("sha256").update(img).digest("hex"),
      originalUrl,auditPath:"content/news/editorial-audits/"+id+".md",
    });
  }
  // Keep the canonical quoted ID layout: the real publisher locates a
  // Registry block using the exact YAML '  - id: "NEWS-xxxx"' syntax.
  const originalRegistry=read(root,"content/registry/knowledge-nodes.yml");
  const countMatch=originalRegistry.match(/^nodeCount: (\d+)$/m);
  assert.ok(countMatch);
  const appended=registry.nodes.slice(-hours.length).map((node:{
    id:string;title:string;slug:string;centerQuestion:string
  })=>[
    '  - id: "'+node.id+'"',
    '    title: "'+node.title+'"',
    '    slug: "'+node.slug+'"',
    '    category: "AIニュース"',
    '    level: 0',
    '    type: "news"',
    '    status: "ready"',
    '    centerQuestion: "'+node.centerQuestion+'"',
    '    prerequisites: ["BAS-0002"]',
    '    children: []',
    '    related: []',
    '    priority: "A"',
    '',
  ].join("\n")).join("\n");
  const newRegistry=originalRegistry.replace(/^nodeCount: \d+$/m,
    "nodeCount: "+(Number(countMatch[1])+hours.length)).trimEnd()+"\n"+appended+"\n";
  write(root,"content/registry/knowledge-nodes.yml",newRegistry);
  write(root,"content/news/news-approval-queue.yml",
    stringify({schemaVersion:1,timezone:"Asia/Tokyo",approvals}));
  return {root,approvals};
}

test("All 17 JST hours are valid; neither 06 nor 00 nor :17 is publishable",()=>{
  const slots=hours.map(h=>({scheduledAtJst:"2026-10-22T"+h+":00+09:00"}));
  assert.doesNotThrow(()=>assertUniqueNewsSlots(slots));
  assert.throws(()=>assertUniqueNewsSlots([slots[0],slots[0]]),/multiple news approvals/);
  for(const invalid of ["2026-10-22T06:00:00+09:00","2026-10-23T00:00:00+09:00",
    "2026-10-22T23:17:00+09:00","2026-10-22T09:00:00Z","2026-02-30T09:00:00+09:00"]){
    assert.throws(()=>assertUniqueNewsSlots([{scheduledAtJst:invalid}]),/invalid scheduled news slot/);
  }
});

test("Only the three explicitly reviewed phases can set caps and hours",()=>{
  const c=parse(readFileSync("content/news/news-cadence.yml","utf8"));
  assert.deepEqual(Object.keys(c.phases).sort(),["growth-6","hourly-17","pilot-2"]);
  for(const [phase,cap] of [["pilot-2",2],["growth-6",6],["hourly-17",17]] as const){
    const cfg=structuredClone(c);cfg.activePhase=phase;cfg.targetApprovedPostsPerDay=cap;
    assert.equal(activeNewsCadence(cfg).maximumPostsPerDay,cap);
  }
  const tampered=structuredClone(c);tampered.phases["growth-6"].maximumPostsPerDay=17;
  assert.throws(()=>activeNewsCadence(tampered),/unsafe or unreviewed/);
  const mismatch=structuredClone(c);mismatch.activePhase="hourly-17";
  assert.throws(()=>activeNewsCadence(mismatch),/active target mismatches/);
  const surprise=structuredClone(c);surprise.activePhase="unlimited";
  assert.throws(()=>activeNewsCadence(surprise),/malformed staged/);
});

test("Pilot/growth/hourly phases release exactly 2/6/17 and never backfill",()=>{
  for(const [phase,expected] of [
    ["pilot-2",["09:00","18:00"]],
    ["growth-6",["07:00","09:00","12:00","15:00","18:00","21:00"]],
    ["hourly-17",hours],
  ] as const){
    const {root}=fixture(phase);
    try{
      const actual:string[]=[];
      assert.equal(publishNews(root,{apply:true,now:new Date("2026-10-22T06:59:59+09:00")}).changed,false);
      for(const h of hours){
        const published=publishNews(root,{apply:true,now:new Date("2026-10-22T"+h+":00+09:00")});
        if(published.changed)actual.push(h);
        assert.equal(publishNews(root,{apply:true,now:new Date("2026-10-22T"+h.slice(0,2)+":17:00+09:00")}).changed,false);
      }
      assert.deepEqual(actual,expected);
      const q=parse(read(root,"content/news/news-approval-queue.yml"));
      assert.equal(q.approvals.filter((x:{decision:string})=>x.decision==="published").length,expected.length);
      assert.equal(q.approvals.filter((x:{decision:string})=>x.decision==="approved-for-publication").length,17-expected.length);
      const archive=JSON.parse(read(root,"content/news/news-archive.json"));
      assert.equal(archive.entries.filter((x:{status:string})=>x.status==="published").length,expected.length);
      assert.equal(archive.entries.filter((x:{status:string})=>x.status==="ready").length,17-expected.length);
      assert.equal(publishNews(root,{apply:true,now:new Date("2026-10-23T07:17:00+09:00")}).changed,false);
    }finally{rmSync(root,{recursive:true,force:true});}
  }
});

test("Altered approved bytes fail closed even in a valid hourly slot",()=>{
  const {root,approvals}=fixture("hourly-17");
  try{
    const slug=approvals[0].slug;
    write(root,"content/articles/"+slug+".md",read(root,"content/articles/"+slug+".md")+"\nUnauthorized!");
    assert.throws(()=>publishNews(root,{apply:true,now:new Date("2026-10-22T07:00:00+09:00")}),
      /ready manuscript was altered/);
    assert.equal(parse(read(root,"content/news/news-approval-queue.yml")).approvals[0].decision,
      "approved-for-publication");
  }finally{rmSync(root,{recursive:true,force:true});}
});
