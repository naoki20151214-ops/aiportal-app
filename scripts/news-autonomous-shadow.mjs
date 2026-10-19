#!/usr/bin/env node
// Read-only scheduled research priority triage; no network, LLM, Git or public writes.
import fs from "node:fs";
import path from "node:path";
import {validateSourceConfig} from "./news-candidate-core.mjs";
import {buildAutonomousResearchQueue} from "./news-autonomous-shadow-core.mjs";

const args=process.argv.slice(2);
if(args.length>1||args.some(x=>!/^--out=artifacts\/[a-z0-9-]+\.json$/.test(x)))
  throw Error("Usage: node scripts/news-autonomous-shadow.mjs [--out=artifacts/<name>.json]");
const output=args[0]?.slice(6)||"artifacts/news-autonomous-research-shadow.json";
const input="artifacts/news-editorial-triage.json";
if(fs.statSync(input).size>200000)throw Error("Untrusted triage exceeds file limit");
const triage=JSON.parse(fs.readFileSync(input,"utf8"));
const policy=JSON.parse(fs.readFileSync("content/news/autonomous-editorial-policy.json","utf8"));
const sources=validateSourceConfig(JSON.parse(fs.readFileSync("content/news/sources.json","utf8")));
const report=buildAutonomousResearchQueue(triage,sources,policy);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n",{encoding:"utf8",flag:"w"});
console.log("Shadow research: "+report.summary.researchCandidates+
  " candidates to independently investigate, "+report.summary.held+
  " held; model calls=0, verified=0, published=0");
