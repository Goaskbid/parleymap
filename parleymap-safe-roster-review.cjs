#!/usr/bin/env node
const fs = require('fs');
function mkdirp(p){fs.mkdirSync(p,{recursive:true});}
function read(p){return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';}
const OPEN='<script id="demo-data" type="application/json">'; const CLOSE='</'+'script>';
function extract(){const html=read('index.html'); const s=html.indexOf(OPEN); if(s<0) throw new Error('demo-data missing'); const js=s+OPEN.length; const e=html.indexOf(CLOSE,js); if(e<0) throw new Error('demo-data close missing'); return JSON.parse(html.slice(js,e).trim());}
mkdirp('data/diagnostics');
const data=extract();
const rows=[...(data.people||[]),...(data.roster||[]),...(data.expansionRoster||[])];
const warnings=[];
for(const r of rows){
  const text=[r.id,r.slug,r.name,r.canonicalName,r.roleTitle,r.countryName,r.countryFocusCode].join(' ').toLowerCase();
  if(/vincent auriol/.test(text)) warnings.push({type:'historical_active_holder_pollution',id:r.id||null,name:r.canonicalName||r.name||null,action:'manual review required'});
  if(/rafael.*grossi/.test(text) && String(r.countryFocusCode||r.countryFocus||'').toUpperCase()!=='AT') warnings.push({type:'bad_institutional_anchor',id:r.id||null,name:r.canonicalName||r.name||null,expected:'AT/Vienna'});
}
const review={generatedAt:new Date().toISOString(),status:'safe_review_only',counts:{people:data.people?.length??null,roster:data.roster?.length??null,expansionRoster:data.expansionRoster?.length??null,appearances:data.appearances?.length??null},warnings,note:'This workflow does not auto-replace people. It prevents historical-chain mass edits.'};
fs.writeFileSync('data/diagnostics/roster-current-holder-review.json',JSON.stringify(review,null,2)+'\n');
fs.writeFileSync('data/diagnostics/roster-patch-candidates.json',JSON.stringify({generatedAt:review.generatedAt,status:'manual_review_required',candidates:warnings},null,2)+'\n');
console.log(JSON.stringify(review,null,2));
