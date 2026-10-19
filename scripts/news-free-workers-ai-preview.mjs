#!/usr/bin/env node
// Explicit no-network preview for a human-reviewed private news packet.
// There is intentionally NO --execute option. No Cloudflare/paid API calls.
import fs from "node:fs";
import {freeDraftPreview} from "./news-free-workers-ai-core.mjs";

const args=process.argv.slice(2);
if(args.length!==2 ||
   !args.some(x=>/^--candidate=[a-f0-9]{24}$/.test(x)) ||
   !args.some(x=>/^--in=artifacts\/[a-z0-9-]+\.json$/.test(x)))
  throw Error("Usage: node scripts/news-free-workers-ai-preview.mjs --candidate=<24hex> --in=artifacts/<file>.json");
const candidateId=args.find(x=>x.startsWith("--candidate=")).slice(12);
const input=args.find(x=>x.startsWith("--in=")).slice(5);
const stat=fs.statSync(input);
if(stat.size>180000)throw Error("Untrusted draft packet file too large");
const packetFile=JSON.parse(fs.readFileSync(input,"utf8"));
if(packetFile?.schemaVersion!==1 ||
   packetFile?.type!=="private-japanese-news-draft-packets"||
   packetFile.publishingEnabled!==false ||
   packetFile.articlesPublished!==0 ||
   !Array.isArray(packetFile.packets) ||
   packetFile.packets.length>10)
  throw Error("Invalid human-reviewed private draft packets container");
const matches=packetFile.packets.filter(x=>x.candidateId===candidateId);
if(matches.length!==1)throw Error("Unknown/duplicate candidate");
const preview=freeDraftPreview(matches[0]);
console.log(JSON.stringify(preview,null,2));
console.log("No network requests sent; external AI cost 0; no article approval or publication.");
