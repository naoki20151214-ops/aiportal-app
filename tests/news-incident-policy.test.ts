import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";

test("The real 2026-10-18 RSS intake incident records symptom, direct and systemic causes, regression, and live proof requirements",()=>{
  const record=JSON.parse(readFileSync("content/news/news-incident-register.json","utf8"));
  assert.equal(record.schemaVersion,1);
  assert.ok(Array.isArray(record.incidents) && record.incidents.length>0);
  const ids=new Set<string>();
  for(const item of record.incidents){
    assert.match(item.id,/^AI-NEWS-INC-\d{8}-\d{3}$/);
    assert.ok(!ids.has(item.id));ids.add(item.id);
    for(const field of ["discoveredAtJst","severity","area","status","rootCauseStatus",
      "symptom","observedError","triggerRunUrl","failedCommand","directCause",
      "systemicCause","impact","prUrl","repeatSignature"]){
      assert.ok(typeof item[field]==="string"&&item[field].length>3,`${item.id}: ${field}`);
    }
    assert.match(item.triggerRunUrl,/^https:\/\/github\.com\/naoki20151214-ops\/aiportal-app\/actions\/runs\/\d+$/);
    assert.ok(Array.isArray(item.correctiveActions)&&item.correctiveActions.length>=2);
    assert.ok(Array.isArray(item.regressionTests)&&item.regressionTests.length>0);
    assert.ok(item.regressionTests.every((x:string)=>x.startsWith("tests/")&&x.endsWith(".test.ts")));
    assert.ok(item.validation && ["pending","success","failure"].includes(item.validation.ci));
    assert.ok(["pending","success","failure"].includes(item.validation.productionRepeat));
    assert.ok(["pending","confirmed"].includes(item.rootCauseStatus));
    if(item.status==="resolved"){
      assert.equal(item.rootCauseStatus,"confirmed");
      assert.equal(item.validation.ci,"success");
      assert.equal(item.validation.productionRepeat,"success");
      assert.ok(item.validation.productionEvidenceUrl?.startsWith("https://github.com/"));
    }
  }
  const failure=record.incidents.find((x:{id:string})=>x.id==="AI-NEWS-INC-20261018-001");
  assert.ok(failure);
  assert.equal(failure.rootCauseStatus,"confirmed");
  assert.equal(failure.status,"fix-in-review");
  assert.equal(failure.validation.productionRepeat,"pending");
  assert.match(failure.observedError,/bySource/);
  assert.match(failure.directCause,/twice/);
  assert.match(failure.systemicCause,/not parsed or executed/);
});

test("Read-only scheduled collector checks executable news CLI syntax before any RSS network requests",()=>{
  const workflow=parse(readFileSync(".github/workflows/news-candidates.yml","utf8"));
  assert.equal(workflow.permissions.contents,"read");
  const steps=workflow.jobs.collect.steps as Array<{name:string;run?:string}>;
  const syntaxIndex=steps.findIndex(x=>x.name==="Check production news CLI syntax before external requests");
  const intakeIndex=steps.findIndex(x=>x.name==="Collect only unverified official RSS metadata");
  assert.ok(syntaxIndex>=0 && syntaxIndex<intakeIndex);
  const step=steps[syntaxIndex];
  for(const filename of ["collect-news-candidates.mjs","check-news-primary-pages.mjs",
    "triage-news-evidence.mjs","build-news-editorial-brief.mjs","publish-news-queue.mjs"]){
    assert.ok(String(step.run).includes("node --check scripts/"+filename));
  }
  assert.ok(!steps.some(x=>/git push|publish-news-queue\.mjs --apply/.test(String(x.run||""))));
});
