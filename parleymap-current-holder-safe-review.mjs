import fs from 'node:fs';

const OUT = 'data/diagnostics/roster-current-holder-review.json';
const PATCH = 'data/diagnostics/roster-patch-candidates.json';
const SUMMARY = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const INDEX = 'index.html';
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = '</' + 'script>';
const TARGETS = [
  ['US', 'United States', 'Q30'], ['MX', 'Mexico', 'Q96'], ['ID', 'Indonesia', 'Q252'], ['FR', 'France', 'Q142'], ['DE', 'Germany', 'Q183'], ['GB', 'United Kingdom', 'Q145'], ['IN', 'India', 'Q668'], ['JP', 'Japan', 'Q17'], ['CA', 'Canada', 'Q16'], ['BR', 'Brazil', 'Q155'], ['AU', 'Australia', 'Q408']
];
function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function readData(){ const html=fs.readFileSync(INDEX,'utf8'); const s=html.indexOf(OPEN); if(s<0) throw new Error('demo-data not found'); const e=html.indexOf(CLOSE,s+OPEN.length); return JSON.parse(html.slice(s+OPEN.length,e).trim());}
async function fetchEntity(qid){ const c=new AbortController(); const t=setTimeout(()=>c.abort(),7000); try{ const r=await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,{signal:c.signal,headers:{'user-agent':'ParleyMap safe roster review'}}); if(!r.ok) throw new Error(`HTTP ${r.status}`); const j=await r.json(); return j.entities?.[qid]||null; } finally{ clearTimeout(t); } }
function label(e){ return e?.labels?.en?.value || e?.labels?.mul?.value || ''; }
function activeClaimIds(e, prop){ return (e?.claims?.[prop]||[]).filter((claim)=>{ const qs=claim.qualifiers||{}; return !qs.P582 && !qs.P576 && claim.rank !== 'deprecated'; }).map((claim)=>claim?.mainsnak?.datavalue?.value?.id).filter(Boolean); }
function rows(data){ return [...(data.people||[]),...(data.roster||[]),...(data.topRoster||[]),...(data.expansionRoster||[])]; }
function findName(data, code, name){ const n=norm(name); return rows(data).find((r)=> String(r.countryFocusCode||r.countryFocus||'').toUpperCase()===code && norm([r.canonicalName,r.name,r.slug].join(' ')).includes(n)); }
fs.mkdirSync('data/diagnostics',{recursive:true});
const data = readData();
const review = { generatedAt:new Date().toISOString(), status:'safe_review_only_no_auto_mutation', counts:{ people:data.people?.length, roster:data.roster?.length, expansionRoster:data.expansionRoster?.length, appearances:data.appearances?.length }, countries:[], additionCandidates:[], possibleStaleSlots:[], errors:[] };
for (const [code,name,qid] of TARGETS){
  try{
    const country=await fetchEntity(qid);
    const holderIds=[...new Set([...activeClaimIds(country,'P35'),...activeClaimIds(country,'P6')])];
    const holderNames=[];
    for (const hid of holderIds){ try{ const he=await fetchEntity(hid); holderNames.push({qid:hid,name:label(he)}); } catch(e){ review.errors.push({code,holder:hid,error:String(e.message||e)}); } }
    review.countries.push({code,name,qid,currentHolders:holderNames});
    for (const h of holderNames){ if(!h.name) continue; if(!findName(data,code,h.name)) review.additionCandidates.push({countryCode:code,countryName:name,holderName:h.name,wikidataId:h.qid,action:'review_add_or_promote_current_holder'}); }
  }catch(e){ review.errors.push({code,name,error:String(e.message||e)}); }
}
const patch = { generatedAt: review.generatedAt, status:'manual_review_required', reason:'Auto-changing people is disabled by design after the historical-office-holder incident. This file lists candidates only.', additionCandidates:review.additionCandidates, possibleStaleSlots:review.possibleStaleSlots };
fs.writeFileSync(OUT, JSON.stringify(review,null,2)+'\n');
fs.writeFileSync(PATCH, JSON.stringify(patch,null,2)+'\n');
fs.appendFileSync(SUMMARY, `\n## Monthly roster safe review\n\nCurrent-holder candidates: ${review.additionCandidates.length}\n\nErrors: ${review.errors.length}\n\nNo automatic roster mutation was performed.\n`);
console.log(JSON.stringify({status:review.status,additionCandidates:review.additionCandidates.length,errors:review.errors.length},null,2));
