#!/usr/bin/env node
// Deterministically materialize an approved raster image stored as base64 text.
// The public image is generated before test/build; never fetch external URLs.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";

const root=process.cwd();
const assets=[
  ["content/news/assets/gpt-rosalind-academic-plan.webp.base64",
   "public/images/news/gpt-rosalind-academic-plan.webp"],
];
for(const [source,dest] of assets){
  const input=fs.readFileSync(path.join(root,source),"utf8").replace(/\s+/g,"");
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(input) || input.length%4!==0)throw Error("Invalid news media base64: "+source);
  const media=Buffer.from(input,"base64");
  if(media.subarray(0,4).toString("ascii")!=="RIFF" || media.subarray(8,12).toString("ascii")!=="WEBP")throw Error("Invalid WebP news media: "+source);
  if(media.byteLength>500000)throw Error("Oversized news media: "+source);
  const output=path.join(root,dest);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  if(fs.existsSync(output) && createHash("sha256").update(fs.readFileSync(output)).digest("hex")===createHash("sha256").update(media).digest("hex"))continue;
  fs.writeFileSync(output,media,{flag:"w"});
  console.log("News media prepared:",dest);
}
