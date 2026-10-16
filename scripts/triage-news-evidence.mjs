#!/usr/bin/env node
// Private candidate triage only; editorial review and publication are separate.
import fs from "node:fs";
import path from "node:path";
import {triageNewsEvidence} from "./news-editorial-gate.mjs";

const args = process.argv.slice(2);
if (args.some(arg => !arg.startsWith("--in=") && !arg.startsWith("--out=")))
  throw new Error("Unknown triage argument");
const input = args.find(arg => arg.startsWith("--in="))?.slice(5) ||
  "artifacts/news-primary-evidence.json";
const output = args.find(arg => arg.startsWith("--out="))?.slice(6) ||
  "artifacts/news-editorial-triage.json";
if (![input, output].every(value => /^artifacts\/[a-z0-9-]+\.json$/.test(value)) || input === output)
  throw new Error("Input and output must be distinct private artifacts/*.json files");
const report = JSON.parse(fs.readFileSync(input, "utf8"));
const triage = triageNewsEvidence(report);
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(triage, null, 2) + "\n", "utf8");
console.log("AI news private editorial queue: " + triage.items.length +
  " candidates; verified=0; approved=0; publishing disabled");
