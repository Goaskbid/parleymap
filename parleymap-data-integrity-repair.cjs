#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');

const INDEX_PATH = 'index.html';
const DEMO_PATH = 'data/demo.json';
const REPORT_PATH = 'data/diagnostics/data-integrity-repair-report.json';
const AUDIT_PATH = 'data/diagnostics/final-hard-audit-report.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const ANCHORS_PATH = 'data/curated-anchors.json';
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = '</' + 'script>';

function mkdirp(p){ fs.mkdirSync(p,{recursive:true}); }
function norm(v){ return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
function blob(o){ return norm([o.id,o.slug,o.name,o.canonicalName,o.title,o.summary,o.roleTitle,o.organization,o.category,o.country,o.countryName,o.countryFocus,o.countryFocusCode,o.profileLine,Array.isArray(o.profileLines)?o.profileLines.join(' '):''].join(' ')); }
function readText(path){ return fs.existsSync(path) ? fs.readFileSync(path,'utf8') : ''; }
function extractPayload(html){
  const start = html.indexOf(OPEN);
  if(start < 0) return null;
  const jsonStart = start + OPEN.length;
  const jsonEnd = html.indexOf(CLOSE, jsonStart);
  if(jsonEnd < 0) return null;
  try { return { html, jsonStart, jsonEnd, data: JSON.parse(html.slice(jsonStart,jsonEnd).trim()) }; }
  catch(e){ return null; }
}
function counts(data){ return { people: data.people?.length ?? null, roster: data.roster?.length ?? null, topRoster: data.topRoster?.length ?? null, expansionRoster: data.expansionRoster?.length ?? null, appearances: data.appearances?.length ?? null, categories: data.categories?.length ?? null }; }
function coreValid(data){
  return data && Array.isArray(data.people) && data.people.length >= 90 && data.people.length <= 115 && Array.isArray(data.roster) && data.roster.length >= 190 && Array.isArray(data.expansionRoster) && data.expansionRoster.length >= 100 && Array.isArray(data.appearances) && data.appearances.length >= 450 && Array.isArray(data.categories) && data.categories.length >= 10;
}
function hasHistoricalPollution(data){
  const text = JSON.stringify(data).toLowerCase();
  return /vincent auriol/.test(text) || /r-0\d+-vincent-auriol/.test(text) || (data.people && data.people.length > 115);
}
function currentHtml(){ return readText(INDEX_PATH); }
function gitShow(ref,path){ try { return cp.execFileSync('git',['show',`${ref}:${path}`],{encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:60*1024*1024}); } catch { return ''; } }
function gitCommitsFor(path){ try { return cp.execFileSync('git',['rev-list','--all','--',path],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split(/\n+/).filter(Boolean).slice(0,500); } catch { return []; } }
function findSafeFullIndex(){
  const candidates = [];
  const cur = currentHtml();
  if(cur) candidates.push({source:'current:index.html', html:cur});
  for(const sha of gitCommitsFor(INDEX_PATH)){
    const html = gitShow(sha,INDEX_PATH);
    if(html) candidates.push({source:`git:${sha.slice(0,12)}:index.html`, html});
  }
  for(const c of candidates){
    if(!/<html[\s>]/i.test(c.html) || !c.html.includes(OPEN)) continue;
    const payload = extractPayload(c.html);
    if(!payload || !coreValid(payload.data)) continue;
    if(hasHistoricalPollution(payload.data)) continue;
    return c;
  }
  // Fallback: accept a full valid shell even if it has mild pollution. The repair pass will clean it.
  for(const c of candidates){
    if(!/<html[\s>]/i.test(c.html) || !c.html.includes(OPEN)) continue;
    const payload = extractPayload(c.html);
    if(!payload || !Array.isArray(payload.data.people) || payload.data.people.length < 90) continue;
    if(!Array.isArray(payload.data.roster) || payload.data.roster.length < 190) continue;
    if(!Array.isArray(payload.data.appearances) || payload.data.appearances.length < 450) continue;
    return c;
  }
  throw new Error('No safe full index.html with embedded demo-data found in current file or git history. Refusing to synthesize an app shell.');
}
function writePayload(payload,data){
  const next = payload.html.slice(0,payload.jsonStart) + '\n' + JSON.stringify(data,null,2) + '\n' + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH,next);
  mkdirp('data');
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data,null,2)+'\n');
}
function loadAnchors(){ return JSON.parse(fs.readFileSync(ANCHORS_PATH,'utf8')).targets; }
function matchesTarget(obj,t){
  const text = blob(obj);
  if(t.matchAll && !t.matchAll.every(x=>text.includes(norm(x)))) return false;
  if(t.matchAny && !t.matchAny.some(x=>text.includes(norm(x)))) return false;
  return true;
}
function anchorObj(t){ return { label:`${t.city} institutional base`, city:t.city, countryCode:t.countryCode, countryName:t.countryName, lat:t.lat, lng:t.lng, precision:'city', type:'institutional_base', privacy:'city-level public institutional base only' }; }
function isPlaceholderImage(url){ return !url || /placeholder|missing|needs-review|avatar|transparent|blank/i.test(String(url)); }
function applyProfileAnchor(row,t){
  const a = anchorObj(t);
  row.countryFocus = t.countryCode;
  row.countryFocusCode = t.countryCode;
  row.countryCode = t.countryCode;
  row.countryName = t.countryName;
  row.country = t.countryName;
  row.homeRegion = t.region || row.homeRegion || null;
  row.organization = t.organization || row.organization;
  row.locationStatus = 'institutional_base_city_level';
  row.homeBases = [a]; row.homeBase = a; row.mapAnchor = a; row.anchorLocation = a; row.baseLocation = a; row.institutionalBase = a;
  row.lat = t.lat; row.lng = t.lng; row.lon = t.lng; row.latitude = t.lat; row.longitude = t.lng;
  row.homeLat = t.lat; row.homeLng = t.lng; row.mapLat = t.lat; row.mapLng = t.lng; row.anchorLat = t.lat; row.anchorLng = t.lng;
  row.coordinates = { lat:t.lat, lng:t.lng };
  row.geo = { lat:t.lat, lng:t.lng, city:t.city, countryCode:t.countryCode, countryName:t.countryName };
  row.flagAudit = { ...(row.flagAudit||{}), code:t.countryCode, countryCode:t.countryCode, countryName:t.countryName, label:t.countryName, status:'country flag' };
  row.flagCode = t.countryCode; row.countryFlagCode = t.countryCode;
  if(t.imageUrl && isPlaceholderImage(row.imageUrl)) { row.imageUrl = t.imageUrl; row.imageProvider = 'curated public fallback'; row.visualAuditStatus = 'curated fallback'; }
}
function walk(value,path,fn){
  if(!value || typeof value !== 'object') return;
  if(Array.isArray(value)){ value.forEach((v,i)=>walk(v,`${path}[${i}]`,fn)); return; }
  fn(value,path);
  for(const [k,v] of Object.entries(value)) if(v && typeof v === 'object') walk(v,`${path}.${k}`,fn);
}
function isProfileLike(o){ return !!(o && typeof o==='object' && (o.canonicalName || o.name || o.roleTitle || o.profileLine || o.wikidataId || o.homeBases || o.mapAnchor || (o.slug && !o.startsAt))); }
function isEventLike(o){ return !!(o && typeof o==='object' && (o.startsAt || o.endsAt || o.eventDate || o.eventType || o.sourcePack)); }
const fakePatterns = [
  /city of london.*(watch|finance diplomacy)/i,
  /iaea.*(watch|nuclear diplomacy)/i,
  /think.?tank.*(watch|leadership events)/i,
  /royal diar(?:y|ies).*watch/i,
  /state.?visit watch/i,
  /\b(events?|diplomacy|leadership).*watch\b/i,
  /\bwatch card\b/i,
  /\bhomepage\b|\bprofile page\b|\bfaq\b|fact sheet|programme|programming|sitemap|cookie/i
];
function isFakeDatedRow(o){
  if(!o || typeof o !== 'object') return false;
  const text = [o.id,o.title,o.summary,o.name,o.label,o.eventType,o.sourceLabel,Array.isArray(o.sourcePack)?o.sourcePack.map(s=>s.url||s.title||'').join(' '):''].join(' ');
  const fake = fakePatterns.some(r=>r.test(text));
  const dateish = !!(o.startsAt || o.endsAt || o.eventDate || o.date || o.lastCheckedAt || o.eventType || /watch/i.test(text));
  return fake && dateish;
}
function cleanArrays(value,path,removed){
  if(!value || typeof value !== 'object') return value;
  if(Array.isArray(value)){
    const out=[];
    for(let i=0;i<value.length;i++){
      const row=value[i];
      if(isFakeDatedRow(row)) { removed.push({path:`${path}[${i}]`, id:row.id||null, title:row.title||row.name||row.label||null}); continue; }
      out.push(cleanArrays(row,`${path}[${i}]`,removed));
    }
    return out;
  }
  for(const [k,v] of Object.entries(value)) value[k]=cleanArrays(v,`${path}.${k}`,removed);
  return value;
}
function removeWithinArrayDuplicateIds(arr,path,removed){
  if(!Array.isArray(arr)) return arr;
  const seen=new Set(); const out=[];
  for(let i=0;i<arr.length;i++){
    const row=arr[i]; const id=row && row.id ? String(row.id) : '';
    if(id && seen.has(id)) { removed.push({path:`${path}[${i}]`, id, reason:'duplicate_id_inside_array'}); continue; }
    if(id) seen.add(id);
    out.push(row);
  }
  return out;
}
function suppressGrossiDuplicateVisibleLists(data,removed){
  // Keep people and roster as canonical. Remove duplicate helper rows from topRoster/priorityExpansion when they render a second visible marker.
  for(const key of ['topRoster','priorityExpansion','watchlistExamples']){
    if(!Array.isArray(data[key])) continue;
    const next=[];
    for(let i=0;i<data[key].length;i++){
      const row=data[key][i];
      if(row && matchesTarget(row,{matchAll:['rafael','grossi']})) { removed.push({path:`${key}[${i}]`, id:row.id||null, name:row.canonicalName||row.name||null, reason:'grossi_duplicate_visible_helper_row_removed'}); continue; }
      next.push(row);
    }
    data[key]=next;
  }
}
function installRuntimeGuard(html,anchors){
  const marker = 'id="parleymap-anchor-runtime-guard"';
  if(html.includes(marker)) return html;
  const publicAnchors = anchors.map(t=>({key:t.key, matchAll:t.matchAll||null, matchAny:t.matchAny||null, city:t.city, countryCode:t.countryCode, countryName:t.countryName, lat:t.lat, lng:t.lng}));
  const script = `\n<script ${marker}>\n(function(){\n  var anchors=${JSON.stringify(publicAnchors)};\n  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function match(text,a){text=norm(text); if(a.matchAll&& !a.matchAll.every(function(x){return text.indexOf(norm(x))>=0;})) return false; if(a.matchAny && !a.matchAny.some(function(x){return text.indexOf(norm(x))>=0;})) return false; return true;}\n  function find(text){for(var i=0;i<anchors.length;i++){ if(match(text,anchors[i])) return anchors[i]; } return null;}\n  window.__PARLEYMAP_ANCHOR_OVERRIDES__=anchors;\n  function patchData(){try{var el=document.getElementById('demo-data'); if(!el) return; var d=JSON.parse(el.textContent); function walk(o){ if(!o||typeof o!=='object') return; if(Array.isArray(o)){o.forEach(walk);return;} var text=[o.id,o.slug,o.name,o.canonicalName,o.roleTitle,o.organization,o.profileLine].join(' '); var a=find(text); if(a && !o.startsAt){ o.lat=a.lat; o.lng=a.lng; o.lon=a.lng; o.latitude=a.lat; o.longitude=a.lng; o.countryFocus=a.countryCode; o.countryFocusCode=a.countryCode; o.countryCode=a.countryCode; o.countryName=a.countryName; o.homeBases=[{label:a.city+' institutional base',city:a.city,countryCode:a.countryCode,countryName:a.countryName,lat:a.lat,lng:a.lng,precision:'city',type:'institutional_base'}]; } Object.keys(o).forEach(function(k){walk(o[k]);}); } walk(d); el.textContent=JSON.stringify(d); }catch(e){} }\n  patchData();\n  function installLeaflet(){ if(!window.L || !window.L.marker || window.L.__pmAnchorGuard) return false; var old=window.L.marker; window.L.marker=function(latlng,options){ var text=''; try{text=JSON.stringify(options||{});}catch(e){} var a=find(text); var m=old.call(this, a?[a.lat,a.lng]:latlng, options); ['bindTooltip','bindPopup'].forEach(function(fn){ if(!m[fn]) return; var prior=m[fn]; m[fn]=function(content,opts){ var t=(typeof content==='string')?content:(content&&content.textContent)||''; var hit=find(t); if(hit && m.setLatLng){ m.setLatLng([hit.lat,hit.lng]); } return prior.call(this,content,opts); }; }); return m; }; window.L.__pmAnchorGuard=true; return true; }\n  if(!installLeaflet()){ var tries=0; var timer=setInterval(function(){tries++; if(installLeaflet()||tries>60) clearInterval(timer);},250); }\n})();\n</script>\n`;
  const start = html.indexOf(OPEN);
  if(start >= 0){
    const jsonStart = start + OPEN.length;
    const jsonEnd = html.indexOf(CLOSE, jsonStart);
    if(jsonEnd >= 0){
      const insertAt = jsonEnd + CLOSE.length;
      return html.slice(0, insertAt) + script + html.slice(insertAt);
    }
  }
  if(/<\/body>/i.test(html)) return html.replace(/<\/body>/i, script + '\n</body>');
  return html + script;
}
function audit(data){
  const errors=[];
  const anchors=loadAnchors();
  const must=['claudia_sheinbaum','pope_leo_xiv','prabowo_subianto','rafael_grossi'];
  function rowsFor(t){ const rows=[]; for(const key of ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples']){ if(Array.isArray(data[key])) for(const r of data[key]) if(r&&matchesTarget(r,t)) rows.push({key,row:r}); } return rows; }
  for(const key of must){
    const t=anchors.find(a=>a.key===key); const rows=rowsFor(t);
    if(rows.length===0) { errors.push(`${key}: no matching profile row found`); continue; }
    const ok=rows.some(({row})=>String(row.countryFocusCode||row.countryFocus||row.countryCode||'').toUpperCase()===t.countryCode && Math.abs(Number(row.lat??row.homeBases?.[0]?.lat)-t.lat)<0.5 && Math.abs(Number(row.lng??row.lon??row.homeBases?.[0]?.lng)-t.lng)<0.5);
    if(!ok) errors.push(`${key}: no correctly anchored profile row`);
  }
  const all=JSON.stringify(data);
  for(const pat of [/City of London finance diplomacy watch/i,/IAEA nuclear diplomacy watch/i,/Think-tank leadership events watch/i,/Royal diaries and state-visit watch/i]) if(pat.test(all)) errors.push(`fake watch row still present: ${pat}`);
  if(/vincent auriol/i.test(all)) errors.push('Vincent Auriol historical active-holder pollution still present');
  if(!coreValid(data)) errors.push('core data count gate failed');
  return errors;
}

mkdirp('data/diagnostics');
const report={generatedAt:new Date().toISOString(), status:'started', restoredFrom:null, before:null, after:null, removedRows:[], anchorFixes:[], runtimeGuardInstalled:false};
const safe = findSafeFullIndex();
let payload = extractPayload(safe.html);
if(!payload) throw new Error('Selected full index has no parseable demo-data payload.');
report.restoredFrom = safe.source;
report.before = counts(payload.data);
let data = payload.data;
// If selected history has pollution, try to clean but hard audit will catch remaining problems.
data = cleanArrays(data,'data',report.removedRows);
for(const key of ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples']) data[key]=removeWithinArrayDuplicateIds(data[key],key,report.removedRows);
suppressGrossiDuplicateVisibleLists(data,report.removedRows);
const anchors=loadAnchors();
for(const key of ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples','organizationProfiles']){
  if(!data[key]) continue;
  walk(data[key],key,(row,path)=>{
    if(!isProfileLike(row) || isEventLike(row)) return;
    for(const t of anchors){ if(matchesTarget(row,t)){ const before={countryFocusCode:row.countryFocusCode||row.countryFocus||row.countryCode||null,lat:row.lat??row.homeBases?.[0]?.lat??null,lng:row.lng??row.lon??row.homeBases?.[0]?.lng??null,imageUrl:row.imageUrl||null}; applyProfileAnchor(row,t); report.anchorFixes.push({target:t.key,path,before,after:{countryFocusCode:row.countryFocusCode,lat:row.lat,lng:row.lng,imageUrl:row.imageUrl||null}}); break; } }
  });
}
data.meta={...(data.meta||{}), lastDataIntegrityRepair:new Date().toISOString(), dataIntegrityRepairStatus:`removed ${report.removedRows.length} fake/duplicate rows and applied ${report.anchorFixes.length} profile anchor repairs`};
if(!coreValid(data)) throw new Error(`Core data validation failed after repair: ${JSON.stringify(counts(data))}`);
const errors=audit(data);
if(errors.length){ fs.writeFileSync(AUDIT_PATH,JSON.stringify({generatedAt:new Date().toISOString(),status:'audit_failed',errors,counts:counts(data)},null,2)+'\n'); throw new Error('Final hard audit failed: '+errors.join('; ')); }
report.after=counts(data);
writePayload(payload,data);
let repairedHtml = fs.readFileSync(INDEX_PATH,'utf8');
repairedHtml = installRuntimeGuard(repairedHtml, anchors);
fs.writeFileSync(INDEX_PATH, repairedHtml);
report.runtimeGuardInstalled = repairedHtml.includes('parleymap-anchor-runtime-guard');
report.status='data_integrity_repair_applied';
fs.writeFileSync(REPORT_PATH,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(AUDIT_PATH,JSON.stringify({generatedAt:new Date().toISOString(),status:'audit_passed',counts:counts(data),criticalAnchors:['claudia_sheinbaum','pope_leo_xiv','prabowo_subianto','rafael_grossi'],fakeWatchRowsRemoved:true,runtimeGuardInstalled:report.runtimeGuardInstalled},null,2)+'\n');
fs.writeFileSync(SUMMARY_PATH,`# ParleyMap repair summary\n\nGenerated: ${report.generatedAt}\n\n## Data integrity\n\n- Status: ${report.status}\n- Restored from: ${report.restoredFrom}\n- Removed fake/duplicate rows: ${report.removedRows.length}\n- Anchor repairs: ${report.anchorFixes.length}\n- Runtime guard installed: ${report.runtimeGuardInstalled}\n\n## Counts\n\n| Dataset | Before | After |\n|---|---:|---:|\n| people | ${report.before.people} | ${report.after.people} |\n| roster | ${report.before.roster} | ${report.after.roster} |\n| expansionRoster | ${report.before.expansionRoster} | ${report.after.expansionRoster} |\n| appearances | ${report.before.appearances} | ${report.after.appearances} |\n| categories | ${report.before.categories} | ${report.after.categories} |\n`);
console.log(JSON.stringify(report,null,2));
