#!/usr/bin/env node
// Deterministically materialize an approved raster image stored as base64 text.
// The public image is generated before test/build; never fetch external URLs.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import sharp from "sharp";

const root=process.cwd();
const assets=[
  ["content/news/assets/gpt-rosalind-academic-plan.webp.base64",
   "public/images/news/gpt-rosalind-academic-plan.webp"],
  ["content/news/assets/openai-prompt-to-voice.webp.base64",
   "public/images/news/openai-prompt-to-voice.webp"],
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


// NEWS-0094 artwork: immutable, repository-owned SVG source is converted to
// WebP locally. No remote image requests and no untrusted SVG URLs are allowed.
const news0094Source = "content/news/assets/on-device-scam-detection.svg";
const news0094Destination = "public/images/news/on-device-scam-detection.webp";
const rawSvg = fs.readFileSync(path.join(root,news0094Source),"utf8");
if (!rawSvg.includes('<svg xmlns="http://www.w3.org/2000/svg"') ||
    /<script\b|<foreignObject\b|\bonload\s*=|<image\b|\bhref\s*=/i.test(rawSvg))
  throw Error("Unsafe NEWS-0094 local vector source");
const news0094Media = await sharp(Buffer.from(rawSvg,"utf8"))
  .resize({width:960,height:540,fit:"fill"})
  .webp({quality:80,effort:6})
  .toBuffer();
if (news0094Media.length < 20000 || news0094Media.length > 500000 ||
    news0094Media.subarray(0,4).toString("ascii") !== "RIFF" ||
    news0094Media.subarray(8,12).toString("ascii") !== "WEBP")
  throw Error("Invalid NEWS-0094 generated WebP");
const news0094Sha = createHash("sha256").update(news0094Media).digest("hex");
const news0094Output = path.join(root,news0094Destination);
fs.mkdirSync(path.dirname(news0094Output),{recursive:true});
if (!fs.existsSync(news0094Output) ||
    createHash("sha256").update(fs.readFileSync(news0094Output)).digest("hex") !== news0094Sha)
  fs.writeFileSync(news0094Output,news0094Media,{flag:"w"});
console.log("NEWS-0094 local WebP SHA-256:",news0094Sha);
