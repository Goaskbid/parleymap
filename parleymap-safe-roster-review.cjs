const fs = require('fs');
const REPORT = 'data/diagnostics/roster-current-holder-review.json';
const PATCH = 'data/diagnostics/roster-patch-candidates.json';
const SUMMARY = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = '</' + 'script>';
function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function parseData(){const html=fs.readFileSync('index.html','utf8'); const s=html.indexOf(OPEN); if(s<0) throw new Error('demo-data block missing'); const js=s+OPEN.length; const e=html.indexOf(CLOSE,js); if(e<0) throw new Error('demo-data block closing tag missing'); return JSON.parse(html.slice(js,e).trim());}
function counts(data){return Object.fromEntries(['people','roster','topRoster','expansionRoster','appearances','categories'].map(k=>[k,Array.isArray(data[k])?data[k].length:null]));}
function validate(data){for(const [k,min] of Object.entries({people:90,roster:190,expansionRoster:100,appearances:450,categories:10})){if(!Array.isArray(data[k])) throw new Error(`${k} missing`); if(data[k].length<min) throw new Error(`${k} below floor`);}}
function rowText(r){return norm([r.id,r.slug,r.name,r.canonicalName,r.roleTitle,r.organization,r.countryName,r.countryFocus,r.countryFocusCode].join(' '));}
const reviewTargets = [
  {countryCode:'FR', countryName:'France', current:['emmanuel macron'], stale:['vincent auriol','charles de gaulle','francois hollande','nicolas sarkozy','jacques chirac']},
  {countryCode:'MX', countryName:'Mexico', current:['claudia sheinbaum'], stale:['andres manuel lopez obrador','enrique pena nieto','felipe calderon','vicente fox']},
  {countryCode:'ID', countryName:'Indonesia', current:['prabowo subianto'], stale:['joko widodo','susilo bambang yudhoyono']},
  {countryCode:'US', countryName:'United States', current:['donald trump'], stale:['joe biden','barack obama','george w bush']}
];
fs.mkdirSync('data/diagnostics',{recursive:true});
const data = parseData(); validate(data);
const rows = [...(data.people||[]),...(data.roster||[]),...(data.topRoster||[]),...(data.expansionRoster||[])];
const findings=[]; const candidates=[];
for(const t of reviewTargets){
  const matchingCountryRows = rows.filter(r => String(r.countryFocusCode||r.countryFocus||'').toUpperCase()===t.countryCode || norm(r.countryName||r.country)===norm(t.countryName));
  const currentFound = t.current.some(name => matchingCountryRows.some(r => rowText(r).includes(norm(name))));
  const staleRows = matchingCountryRows.filter(r => t.stale.some(name => rowText(r).includes(norm(name))) && /(president|prime minister|head of state|head of government|king|queen|chancellor)/.test(rowText(r)) && !/former|historical|deceased/.test(rowText(r)));
  findings.push({countryCode:t.countryCode,countryName:t.countryName,currentExpected:t.current,currentFound,staleActiveRows:staleRows.map(r=>({id:r.id||null,name:r.canonicalName||r.name||null,roleTitle:r.roleTitle||null}))});
  if(!currentFound || staleRows.length){candidates.push({countryCode:t.countryCode,countryName:t.countryName,action:'manual_review_required',currentExpected:t.current,reason:!currentFound?'current holder not found':'stale active holder found',staleRows:staleRows.map(r=>({id:r.id||null,name:r.canonicalName||r.name||null,roleTitle:r.roleTitle||null}))});}
}
const report={generatedAt:new Date().toISOString(),status:'safe_roster_review_complete_review_only',counts:counts(data),findings,candidatesCount:candidates.length,note:'Review-only. This script does not change index.html or mass-replace people.'};
fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(PATCH,JSON.stringify({generatedAt:report.generatedAt,status:'manual_review_required',candidates,note:'No automatic live roster changes were applied.'},null,2)+'\n');
fs.writeFileSync(SUMMARY,`# ParleyMap roster review\n\nGenerated: ${report.generatedAt}\n\nStatus: ${report.status}\nCandidates: ${candidates.length}\n\n`);
console.log(JSON.stringify(report,null,2));
