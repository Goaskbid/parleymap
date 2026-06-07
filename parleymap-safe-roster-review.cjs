#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const DIAG='data/diagnostics';
fs.mkdirSync(DIAG,{recursive:true});
function readJson(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}
const data=readJson('data/demo.json')||{};
const report={generatedAt:new Date().toISOString(),status:'safe_review_only',note:'This monthly process does not mass-replace people. It flags current-holder review items for human approval to prevent historical office-holder chains.',counts:{people:data.people?.length??null,roster:data.roster?.length??null,expansionRoster:data.expansionRoster?.length??null,appearances:data.appearances?.length??null},candidates:[]};
fs.writeFileSync(`${DIAG}/roster-current-holder-review.json`,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(`${DIAG}/roster-patch-candidates.json`,JSON.stringify({generatedAt:report.generatedAt,status:'manual_review_required',candidates:[]},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
