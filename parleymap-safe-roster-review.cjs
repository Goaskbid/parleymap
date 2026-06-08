#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');
const REVIEW_PATH = path.join(ROOT, 'data/diagnostics/roster-current-holder-review.json');
const PATCH_PATH = path.join(ROOT, 'data/diagnostics/roster-patch-candidates.json');
const SUMMARY_PATH = path.join(ROOT, 'data/diagnostics/LATEST_RUN_SUMMARY.md');
const DEMO_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i;
function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function readData(){const html=fs.readFileSync(INDEX_PATH,'utf8');const m=DEMO_RE.exec(html);if(!m)throw new Error('demo-data not found in index.html');return JSON.parse(m[1]);}
function rows(data){return ['people','roster','topRoster','expansionRoster'].flatMap(k=>Array.isArray(data[k])?data[k].map((x,i)=>({...x,__collection:k,__index:i})):[]);}
function safeAnchor(row){const b=Array.isArray(row.homeBases)?row.homeBases[0]:row.mapAnchor||row.homeBase||{};return {city:b.city||null,countryCode:b.countryCode||row.countryFocusCode||row.countryFocus||null,lat:b.lat??row.lat??null,lng:b.lng??row.lng??null};}
fs.mkdirSync(path.join(ROOT,'data/diagnostics'),{recursive:true});
const data=readData();
const all=rows(data);
const warnings=[];
const candidates=[];
const visibleDuplicateIds={};
for(const r of all){if(!r.id)continue;const key=r.id;visibleDuplicateIds[key]=visibleDuplicateIds[key]||[];visibleDuplicateIds[key].push({collection:r.__collection,index:r.__index,name:r.canonicalName||r.name||null});}
for(const [id,list] of Object.entries(visibleDuplicateIds)){
  const visible=list.filter(x=>['roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples'].includes(x.collection));
  const problemName=norm(visible.map(x=>x.name).join(' '));
  const sameCollectionDuplicate=new Map();
  for(const item of visible){sameCollectionDuplicate.set(item.collection,(sameCollectionDuplicate.get(item.collection)||0)+1);}
  const duplicateWithinCollection=[...sameCollectionDuplicate.values()].some(v=>v>1);
  const critical=/grossi|pope|leo xiv|sheinbaum|prabowo|subianto/.test(problemName);
  if((duplicateWithinCollection || critical) && visible.length>1){warnings.push({type:'visible_duplicate_id',id,locations:visible});}
}
for(const r of all){const text=norm([r.canonicalName,r.name,r.roleTitle,r.organization,r.countryName,r.countryFocusCode].join(' '));if(/vincent auriol/.test(text)&&!/former/.test(text)){warnings.push({type:'historical_active_holder_pollution',id:r.id||null,name:r.canonicalName||r.name||null,collection:r.__collection,index:r.__index});}
const a=safeAnchor(r);if(/grossi/.test(text)&& (a.countryCode!=='AT'||norm(a.city)!=='vienna')) warnings.push({type:'bad_anchor_grossi',id:r.id||null,anchor:a});
if(/pope|leo xiv|prevost/.test(text)&& (a.countryCode!=='VA'||norm(a.city)!=='vatican city')) warnings.push({type:'bad_anchor_pope',id:r.id||null,anchor:a});
if(/claudia sheinbaum/.test(text)&& (a.countryCode!=='MX'||norm(a.city)!=='mexico city')) warnings.push({type:'bad_anchor_sheinbaum',id:r.id||null,anchor:a});
if(/prabowo subianto/.test(text)&& (a.countryCode!=='ID'||norm(a.city)!=='jakarta')) warnings.push({type:'bad_anchor_subianto',id:r.id||null,anchor:a});}
const review={generatedAt:new Date().toISOString(),status:'safe_roster_review_complete',counts:{people:data.people?.length,roster:data.roster?.length,topRoster:data.topRoster?.length,expansionRoster:data.expansionRoster?.length},warnings,candidates,note:'Safe review only. This workflow does not mass-replace people. Use explicit reviewed patches only.'};
fs.writeFileSync(REVIEW_PATH,JSON.stringify(review,null,2)+'\n');
fs.writeFileSync(PATCH_PATH,JSON.stringify({generatedAt:review.generatedAt,status:'manual_review_required',warnings,candidates},null,2)+'\n');
fs.appendFileSync(SUMMARY_PATH,`\n## Safe roster review\n\nWarnings: ${warnings.length}\nCandidates: ${candidates.length}\n`);
console.log(JSON.stringify({status:review.status,warnings:warnings.length,candidates:candidates.length},null,2));
