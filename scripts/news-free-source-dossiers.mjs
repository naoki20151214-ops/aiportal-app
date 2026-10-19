#!/usr/bin/env node
// Free read-only source metadata dossier after hourly candidate shortlist.
// No AI API, no network, no owner approval, no public markdown or git writes.
import fs from "node:fs";
import path from "node:path";
import {validateSourceConfig} from "./news-candidate-core.mjs";
import {buildFreeResearchDossiers} from "./news-free-source-dossiers-core.mjs";
const args=process.argv.slice(2);
if(args.length>1 || args.some(x=>!/^--out=artifacts\/[a-z0-9-]+\.json$/.test(x)))
  throw Error("Usage: node scripts/news-free-source-dossiers.mjs [--out=artifacts/<name>.json]");
const output=args[0]?.slice(6)||"artifacts/news-free-source-dossiers.json";
const files=["artifacts/news-primary-evidence.json","artifacts/news-autonomous-research-shadow.json"];
for(const file of files)if(fs.statSync(file).size>300000)throw Error("Oversized untrusted source evidence");
const evidence=JSON.parse(fs.readFileSync(files[0],"utf8"));
const shadow=JSON.parse(fs.readFileSync(files[1],"utf8"));
const policy=JSON.parse(fs.readFileSync("content/news/autonomous-editorial-policy.json","utf8"));
const sources=validateSourceConfig(JSON.parse(fs.readFileSync("content/news/sources.json","utf8")));
const result=buildFreeResearchDossiers(shadow,evidence,sources,policy);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n",{encoding:"utf8",flag:"w"});
console.log("Free official news dossiers: "+result.summary.sourceDossiers+
  " short source snapshots, "+result.summary.blocked+
  " missing/insufficient evidence; claim verification=0, model calls=0, published=0");
