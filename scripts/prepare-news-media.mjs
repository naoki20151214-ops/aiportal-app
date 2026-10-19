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


// NEWS-0100 illustration: reproducible vector-to-WebP conversion with no
// external image rights, remote fetch, scripts, embedded images or external hrefs.
const news0100SvgPath = "content/news/assets/mit-3d-crystal-materials-ai.svg";
const news0100OutPath = "public/images/news/mit-3d-crystal-materials-ai.webp";
const news0100Svg = fs.readFileSync(path.join(root,news0100SvgPath),"utf8");
if (!news0100Svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') ||
    /<script\b|<foreignObject\b|\bonload\s*=|<image\b|\bhref\s*=/i.test(news0100Svg))
  throw Error("Unsafe MIT NEWS-0100 source illustration");
const news0100Pixels = Buffer.from(news0100Svg,"utf8");
let news0100Webp = await sharp(news0100Pixels)
  .resize({width:960,height:540,fit:"fill"})
  .webp({quality:90,effort:6})
  .toBuffer();
// Some vector artwork compresses below the conservative 20KB media minimum.
// Use deterministic lossless WebP of the SAME original SVG rather than
// lowering media validation or introducing outside artwork.
if(news0100Webp.length<20000){
  console.log("NEWS-0100 WebP lossless fallback; first encode bytes:",news0100Webp.length);
  news0100Webp = await sharp(news0100Pixels)
    .resize({width:960,height:540,fit:"fill"})
    .webp({lossless:true,effort:6})
    .toBuffer();
}
console.log("NEWS-0100 WebP final bytes:",news0100Webp.length);
if (news0100Webp.length < 20000 || news0100Webp.length > 500000 ||
    news0100Webp.subarray(0,4).toString("ascii")!=="RIFF" ||
    news0100Webp.subarray(8,12).toString("ascii")!=="WEBP")
  throw Error("NEWS-0100 image fails local immutable media standards");
const news0100Sha = createHash("sha256").update(news0100Webp).digest("hex");
const news0100Out = path.join(root,news0100OutPath);
fs.mkdirSync(path.dirname(news0100Out),{recursive:true});
if (!fs.existsSync(news0100Out) ||
    createHash("sha256").update(fs.readFileSync(news0100Out)).digest("hex")!==news0100Sha)
  fs.writeFileSync(news0100Out,news0100Webp,{flag:"w"});
console.log("NEWS-0100 local WebP SHA-256:",news0100Sha);
