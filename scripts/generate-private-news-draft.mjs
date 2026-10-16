#!/usr/bin/env node
// Manual-only and explicitly opted-in private model generation, one reviewed packet.
// This file is NEVER run by the daily RSS intake or any publication workflow.
// Without --execute, NO external network request or API charge can occur.
import fs from "node:fs";
import path from "node:path";
import {draftRequest, generatePrivateJapaneseDraft, packetDigest} from "./news-model-draft-core.mjs";

const args=process.argv.slice(2);
if (args.some(x=>!x.startsWith("--in=") && !x.startsWith("--out=") &&
  !x.startsWith("--candidate=") && x!=="--execute"))
  throw Error("Unknown news generation option");
const option=(name, fallback) => {
  const matches=args.filter(x=>x.startsWith("--"+name+"="));
  if (matches.length>1) throw Error("Duplicate option: "+name);
  return matches[0]?.slice(name.length+3) ?? fallback;
};
const input=option("in","artifacts/news-draft-packets.json");
const output=option("out","artifacts/news-generated-draft.json");
if (![input,output].every(x=>/^artifacts\/[a-z0-9-]+\.json$/.test(x)) || input===output)
  throw Error("Only distinct private artifacts/*.json paths supported");
const candidateId=option("candidate","");
if (!/^[a-f0-9]{24}$/.test(candidateId)) throw Error("Explicit --candidate=<24 hex> required");
if (fs.statSync(input).size>180000) throw Error("Input packet file too large");
const data=JSON.parse(fs.readFileSync(input,"utf8"));
if (data.schemaVersion!==1 || data.type!=="private-japanese-news-draft-packets" ||
    data.publishingEnabled!==false || data.articlesPublished!==0 ||
    !Array.isArray(data.packets) || data.packets.length>10)
  throw Error("Untrusted private packets report");
const matching=data.packets.filter(x=>x.candidateId===candidateId);
if (matching.length!==1) throw Error("Candidate missing or duplicate");
const packet=matching[0];
const model=process.env.OPENAI_NEWS_DRAFT_MODEL;
if (args.includes("--execute")) {
  if (!process.env.OPENAI_API_KEY || !model)
    throw Error("Explicit API key and OPENAI_NEWS_DRAFT_MODEL required for execution");
  // Exactly one HTTP request for this one candidate. No retries.
  const result=await generatePrivateJapaneseDraft(packet,{
    apiKey:process.env.OPENAI_API_KEY, model,
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n",{encoding:"utf8",flag:"wx"});
  console.log("Private AI news draft generated: candidate="+candidateId+
    "; requires human fact-check; publication=false; output="+output);
} else {
  // Validate packet and optional model without executing: no API key required.
  const preview=draftRequest(packet,model || "model-placeholder");
  console.log(JSON.stringify({
    mode:"dry-run", candidateId, sourcePacketSha256:packetDigest(packet),
    reviewedClaims:packet.claims.length, requiresExplicitExecute:true,
    modelConfigured:!!model, apiCallMade:false,
    publicationEligible:false, proposedMaxOutputTokens:preview.max_output_tokens,
  },null,2));
}
