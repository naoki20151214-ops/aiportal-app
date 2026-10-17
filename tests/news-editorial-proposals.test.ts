import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";

const stories = [
  {id: "NEWS-0094", path: "content/news/drafts/NEWS-0094-on-device-scam-detection.md",
    source: "https://deepmind.google/blog/on-device-ai-scam-detection-mddi/", cta:"what-is-machine-learning"},
  {id: "NEWS-0095", path: "content/news/drafts/NEWS-0095-anthropic-metr-independent-audits.md",
    source: "https://www.anthropic.com/news/an-update-on-independent-evaluators", cta:"ai-hallucination"},
];
const read = (p:string)=>readFileSync(p,"utf8");

test("Proposed one-minute news is source-backed, bounded and not publication approval",()=>{
  const queue = parse(read("content/news/news-approval-queue.yml"));
  const registry = parse(read("content/registry/knowledge-nodes.yml"));
  const archive = JSON.parse(read("content/news/news-archive.json"));
  const urls = new Set<string>();
  for(const story of stories) {
    const source = read(story.path);
    assert.ok(source.includes("サイト未公開の編集提案"));
    assert.ok(source.includes("候補ID: "+story.id));
    assert.ok(source.includes("配信承認: なし"));
    assert.ok(source.includes(story.source));
    const headerEnd = source.indexOf("\n\n",source.indexOf("> 公式発表日:"));
    const bodyEnd = source.indexOf("\n\n## 元資料");
    assert.ok(headerEnd>0 && bodyEnd>headerEnd);
    const body=source.slice(headerEnd+2,bodyEnd);
    assert.ok([...body].length>=350 && [...body].length<=500,`${story.id}: ${[...body].length} characters`);
    assert.ok(source.includes("(/articles/"+story.cta+")"));
    assert.ok(read("content/articles/"+story.cta+".md").includes('status: "published"'));
    assert.ok(!queue.approvals.some((x:{id:string})=>x.id===story.id));
    assert.ok(!registry.nodes.some((x:{id:string})=>x.id===story.id));
    assert.ok(!archive.entries.some((x:{id:string})=>x.id===story.id));
    assert.ok(!urls.has(story.source));
    urls.add(story.source);
    const audit=read(`content/news/editorial-audits/${story.id}-proposal.md`);
    assert.ok(audit.includes(story.source));
    assert.ok(audit.includes("保留"));
  }
});

test("News proposal staging cannot edit the approved 09:00, 18:00 and 20:00 publishers",()=>{
  const news=read(".github/workflows/publish-reviewed-news.yml");
  const evergreen=read(".github/workflows/publish-approved.yml");
  assert.match(news,/cron: '0 0 \* \* \*'/);
  assert.match(news,/cron: '0 9 \* \* \*'/);
  assert.match(evergreen,/cron: '0 11 \* \* \*'/);
  assert.match(news,/group: aiportal-approved-publication-main/);
  assert.match(evergreen,/group: aiportal-approved-publication-main/);
});
