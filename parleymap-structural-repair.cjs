#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');

const INDEX_PATH = 'index.html';
const REPORT = 'data/diagnostics/structural-repair-report.json';
const HARD_AUDIT = 'data/diagnostics/structural-hard-audit-report.json';
const ADS_REPORT = 'data/diagnostics/adsense-preserve-audit-report.json';
const SUMMARY = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const CURATED_PATH = 'data/curated-anchors.json';
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = '</' + 'script>';

function sh(cmd, opts={}) {
  return cp.execSync(cmd, {encoding:'utf8', stdio:['ignore','pipe','pipe'], ...opts});
}
function safeSh(cmd) { try { return sh(cmd); } catch { return ''; } }
function norm(v) { return String(v ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
function slug(v) { return norm(v).replace(/ /g,'-').replace(/^-+|-+$/g,'').slice(0,100); }
function ensureDir(p){ fs.mkdirSync(p, {recursive:true}); }
function readFile(p){ try{return fs.readFileSync(p,'utf8')}catch{return ''} }
function parseHtml(html) {
  const start = html.indexOf(OPEN);
  if (start < 0) throw new Error('demo-data opening tag not found');
  const jsonStart = start + OPEN.length;
  const jsonEnd = html.indexOf(CLOSE, jsonStart);
  if (jsonEnd < 0) throw new Error('demo-data closing tag not found');
  const jsonText = html.slice(jsonStart, jsonEnd).trim();
  return {html, jsonStart, jsonEnd, data: JSON.parse(jsonText)};
}
function writeHtml(payload, data){
  const out = payload.html.slice(0,payload.jsonStart)+'\n'+JSON.stringify(data,null,2)+'\n'+payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH,out);
}
function counts(d){return {people:d.people?.length??null,roster:d.roster?.length??null,topRoster:d.topRoster?.length??null,expansionRoster:d.expansionRoster?.length??null,appearances:d.appearances?.length??null,eventAgendas:d.eventAgendas?.length??null,categories:d.categories?.length??null};}
function isSafeData(d){
  return Array.isArray(d.people)&&d.people.length>=90&&d.people.length<=115&&
    Array.isArray(d.roster)&&d.roster.length>=190&&d.roster.length<=220&&
    Array.isArray(d.expansionRoster)&&d.expansionRoster.length>=100&&d.expansionRoster.length<=130&&
    Array.isArray(d.appearances)&&d.appearances.length>=450&&Array.isArray(d.categories)&&d.categories.length>=10;
}
function hasHistoricalPollution(d){
  const text = JSON.stringify([d.people,d.roster,d.topRoster]).toLowerCase();
  return /vincent auriol/.test(text) || /francois mitterrand/.test(text) || /charles de gaulle/.test(text);
}
function validateCore(d,label){
  if (!isSafeData(d)) throw new Error(`${label}: core counts unsafe ${JSON.stringify(counts(d))}`);
  if (hasHistoricalPollution(d)) throw new Error(`${label}: historical active-holder pollution detected`);
}
function currentPayloadOrNull(){ try { const h=readFile(INDEX_PATH); return parseHtml(h); } catch { return null; } }
function findSafeIndexFromHistory(){
  const commits = safeSh('git log --format=%H -- index.html').split('\n').map(s=>s.trim()).filter(Boolean);
  for (const hash of commits) {
    const html = safeSh(`git show ${hash}:index.html`);
    if (!html || html.length < 100000 || !html.includes(OPEN)) continue;
    try {
      const payload = parseHtml(html);
      if (isSafeData(payload.data) && !hasHistoricalPollution(payload.data)) return {hash, payload};
    } catch {}
  }
  throw new Error('No safe full index.html found in git history. Refusing to synthesize an app shell.');
}
function chooseBaseIndex(){
  const current = currentPayloadOrNull();
  if (current && readFile(INDEX_PATH).length > 100000 && isSafeData(current.data) && !hasHistoricalPollution(current.data)) return {source:'current', hash:null, payload:current};
  const found = findSafeIndexFromHistory();
  fs.writeFileSync(INDEX_PATH, found.payload.html);
  return {source:'git-history', hash:found.hash, payload:parseHtml(found.payload.html)};
}
function scanAdsInText(text){
  const clients = [...new Set((text.match(/ca-pub-[0-9]{10,}/g)||[]))];
  const pubs = [...new Set((text.match(/(?<!ca-)pub-[0-9]{10,}/g)||[]))];
  const slots = [...new Set([...text.matchAll(/data-ad-slot=["']([0-9]{3,})["']/g)].map(m=>m[1]))];
  return {clients,pubs,slots};
}
function mergeAds(a,b){ return {clients:[...new Set([...a.clients,...b.clients])], pubs:[...new Set([...a.pubs,...b.pubs])], slots:[...new Set([...a.slots,...b.slots])]}; }
function scanRecoverableAds(){
  let acc = {clients:[], pubs:[], slots:[]};
  const files = ['index.html','templates/index.template.html','privacy.html','impressum.html','ads.txt'];
  for (const f of files) acc = mergeAds(acc, scanAdsInText(readFile(f)));
  const commits = safeSh('git log --format=%H -- index.html templates/index.template.html privacy.html impressum.html ads.txt').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,250);
  for (const hash of commits) {
    for (const f of files) {
      const txt = safeSh(`git show ${hash}:${f}`);
      if (txt) acc = mergeAds(acc, scanAdsInText(txt));
    }
    if ((acc.clients.length || acc.pubs.length) && acc.slots.length >= 2) break;
  }
  const envPub = process.env.ADSENSE_PUBLISHER_ID || process.env.INPUT_PUBLISHER_ID || '';
  const envHeader = process.env.ADSENSE_HEADER_SLOT_ID || process.env.INPUT_HEADER_SLOT_ID || '';
  const envSidebar = process.env.ADSENSE_SIDEBAR_SLOT_ID || process.env.INPUT_SIDEBAR_SLOT_ID || '';
  if (/^(ca-)?pub-[0-9]{10,}$/.test(envPub)) {
    const ca = envPub.startsWith('ca-') ? envPub : `ca-${envPub}`;
    acc.clients.unshift(ca); acc.pubs.unshift(ca.replace(/^ca-/,''));
  }
  if (/^[0-9]{3,}$/.test(envHeader)) acc.slots.unshift(envHeader);
  if (/^[0-9]{3,}$/.test(envSidebar)) acc.slots.push(envSidebar);
  acc.clients = [...new Set(acc.clients)]; acc.pubs=[...new Set(acc.pubs)]; acc.slots=[...new Set(acc.slots)];
  return acc;
}
function makeAnchor(t){ const a=t.anchor; return {label:a.label,city:a.city,countryCode:a.countryCode,countryName:a.countryName,lat:a.lat,lng:a.lng,precision:'city',type:'institutional_base',privacy:'city-level public institutional base only'}; }
function isProfileLike(o){
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  if (o.canonicalName || o.name || o.personName || o.roleTitle || o.wikiTitle || o.wikidataId || o.homeBases || o.mapAnchor) return true;
  return false;
}
function objectText(o){ return norm([o.id,o.slug,o.name,o.canonicalName,o.personName,o.roleTitle,o.organization,o.country,o.countryName,o.countryFocus,o.countryFocusCode,o.profileLine, Array.isArray(o.profileLines)?JSON.stringify(o.profileLines):''].join(' ')); }
function matchTarget(o,t){ if(!isProfileLike(o)) return false; const txt=objectText(o); return (t.matchAny||[]).some(s=>txt.includes(norm(s))); }
function applyTarget(o,t,where,fixes){
  const before = {id:o.id||null, name:o.canonicalName||o.name||o.personName||null, countryFocus:o.countryFocus||null, countryFocusCode:o.countryFocusCode||null, lat:o.lat??o.mapLat??o.location?.lat??null, lng:o.lng??o.mapLng??o.location?.lng??null, imageUrl:o.imageUrl||null};
  const a=t.anchor; const anchor=makeAnchor(t);
  if (t.canonicalName && (o.name || o.canonicalName || o.personName)) { o.name=t.canonicalName; o.canonicalName=t.canonicalName; if (o.personName) o.personName=t.canonicalName; }
  if (t.roleTitle && o.roleTitle !== undefined) o.roleTitle=t.roleTitle;
  if (t.organization && o.organization !== undefined) o.organization=t.organization;
  if (t.category && o.category !== undefined) o.category=t.category;
  if (t.officialUrl && o.officialUrl !== undefined) o.officialUrl=t.officialUrl;
  if (t.wikidataId && o.wikidataId !== undefined) o.wikidataId=t.wikidataId;
  o.countryFocus=a.countryCode; o.countryFocusCode=a.countryCode; o.countryCode=a.countryCode; o.countryName=a.countryName; o.country=a.countryName; o.homeRegion=a.region; o.locationStatus='institutional_base_city_level';
  o.homeBases=[anchor]; o.homeBase=anchor; o.mapAnchor=anchor; o.anchorLocation=anchor; o.baseLocation=anchor; o.institutionalBase=anchor;
  o.lat=a.lat; o.lng=a.lng; o.lon=a.lng; o.long=a.lng; o.latitude=a.lat; o.longitude=a.lng; o.mapLat=a.lat; o.mapLng=a.lng; o.homeLat=a.lat; o.homeLng=a.lng; o.anchorLat=a.lat; o.anchorLng=a.lng;
  o.coordinates={lat:a.lat,lng:a.lng}; o.geo={lat:a.lat,lng:a.lng,city:a.city,countryCode:a.countryCode,countryName:a.countryName};
  o.flagAudit={...(o.flagAudit||{}), code:a.countryCode, countryCode:a.countryCode, countryName:a.countryName, label:a.countryName, status:'country flag'};
  o.flagCode=a.countryCode; o.countryFlagCode=a.countryCode;
  if (t.imageUrl && (!o.imageUrl || /missing|placeholder|no image/i.test(String(o.imageUrl)+' '+String(o.imageProvider)))) { o.imageUrl=t.imageUrl; o.imageProvider='Curated public image fallback'; o.visualAuditStatus='curated portrait fallback; verify license before commercial reuse'; o.imageAudit={status:'curated-fallback', source:t.imageUrl}; }
  fixes.push({target:t.key, where, before, after:{countryFocus:o.countryFocus,countryFocusCode:o.countryFocusCode,lat:o.lat,lng:o.lng,imageUrl:o.imageUrl||null}});
}
function walk(value,path,cb,seen=new Set()){
  if (!value || typeof value !== 'object' || seen.has(value)) return; seen.add(value);
  if (Array.isArray(value)) { for (let i=0;i<value.length;i++) walk(value[i],`${path}[${i}]`,cb,seen); return; }
  cb(value,path);
  for (const [k,v] of Object.entries(value)) if (v && typeof v==='object') walk(v,`${path}.${k}`,cb,seen);
}
function isFakeEvent(o){
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  const title = norm(o.title || ''); const id=norm(o.id||''); const type=norm(o.type||''); const status=norm(o.status||''); const attendee=norm(o.attendeeMode||'');
  const hasDate = !!(o.startsAt || o.endsAt || o.date);
  if (!hasDate) return false;
  if (status.includes('source watch') || attendee.includes('source watch')) return true;
  if (id.startsWith('watch ') || id.startsWith('watch-')) return true;
  if (title.includes(' watch')) return true;
  if (/think tank leadership events|royal diaries|state visit watch|city of london finance diplomacy|iaea nuclear diplomacy|group of thirty member and event watch|bilderberg decade participant watch/.test(title)) return true;
  if (/homepage|profile|faq|frequently asked|fact sheet|programme|program|index page|membership and events/.test(title+' '+type)) return true;
  return false;
}
function filterArrays(value,path,removed){
  if (!value || typeof value !== 'object') return;
  for (const [k,v] of Object.entries(value)) {
    if (Array.isArray(v)) {
      const before=v.length;
      value[k]=v.filter(item=>{ if (isFakeEvent(item)) {removed.push({path:`${path}.${k}`, id:item.id||null,title:item.title||null,status:item.status||null}); return false;} return true; });
      for (let i=0;i<value[k].length;i++) filterArrays(value[k][i],`${path}.${k}[${i}]`,removed);
    } else if (v && typeof v==='object') filterArrays(v,`${path}.${k}`,removed);
  }
}
function findPersonId(data,target){
  const pools=[...(data.people||[]),...(data.roster||[]),...(data.topRoster||[]),...(data.expansionRoster||[])];
  const hit=pools.find(o=>matchTarget(o,target)); return hit?.id || hit?.personId || slug(target.canonicalName || target.matchAny[0]);
}
function normalizeAppearanceSeed(seed,target,personId){
  const now=new Date().toISOString();
  return {id:seed.id, personId, startsAt:seed.startsAt, endsAt:seed.endsAt||null, status:new Date(seed.startsAt)>new Date()? 'ANNOUNCED_FUTURE':'VERIFIED_PAST', confidence:0.94, confidenceLabel:'official or host public source', eventType:seed.eventType||'PUBLIC_APPEARANCE', title:seed.title, summary:seed.summary, significance:'Official source-backed public appearance. Added to replace non-event watch cards.', decisions:'', location:seed.location, venuePublic:true, securityPrecision:'city-level public event only; no private stops, hotels, residences, leaked routes or live proximity', publicInterestScore:70, eventGroupId:`real-${slug(seed.location.city)}-${String(seed.startsAt).slice(0,10)}`, topics:seed.topics||[], counterpartIds:[], sourcePack:seed.sourcePack, visual:{status:'runtime portrait',policy:'Use only audited public media with attribution.'}, lastCheckedAt:now, marketImpact:{sectors:[],companies:[],countries:[seed.location.countryName],confidence:'medium'}, crawler:{rule:'curated official-source seed',detectedAt:now}};
}
function seedRealEvents(data,curated){
  const added=[];
  if (!Array.isArray(data.appearances)) data.appearances=[];
  if (!Array.isArray(data.eventAgendas)) data.eventAgendas=[];
  for (const seed of curated.realEventSeeds||[]) {
    const target=curated.targets.find(t=>t.key===seed.personKey); if (!target) continue;
    const personId=findPersonId(data,target);
    const app=normalizeAppearanceSeed(seed,target,personId);
    if (!data.appearances.some(a=>a.id===app.id)) { data.appearances.push(app); added.push({collection:'appearances',id:app.id,title:app.title}); }
    const agenda={id:`agenda-${seed.id}`, title:seed.title, type:seed.eventType, startsAt:seed.startsAt, endsAt:seed.endsAt, location:seed.location, status:new Date(seed.startsAt)>new Date()? 'scheduled':'completed', whyItMatters:seed.summary, sectors:seed.topics||[], participantNames:[target.canonicalName||seed.personKey], sourcePack:seed.sourcePack, topics:seed.topics||[], attendeeMode:'official-source-backed'};
    if (!data.eventAgendas.some(a=>a.id===agenda.id)) { data.eventAgendas.push(agenda); added.push({collection:'eventAgendas',id:agenda.id,title:agenda.title}); }
  }
  return added;
}
function suppressDuplicateVisibleRows(data){
  const removed=[];
  // Keep all people and main roster counts stable. Suppress duplicate display only in helper/top arrays.
  for (const key of ['topRoster','watchlistExamples','priorityExpansion','openCatalogs']) {
    if (!Array.isArray(data[key])) continue;
    const seen=new Set();
    const out=[];
    for (const row of data[key]) {
      const id=String(row?.id || row?.personId || slug(row?.canonicalName || row?.name || row?.title || ''));
      if (id && seen.has(id)) { removed.push({collection:key,id,title:row?.title||row?.canonicalName||row?.name||null, reason:'duplicate visible helper row'}); continue; }
      seen.add(id); out.push(row);
    }
    data[key]=out;
  }
  // Specifically remove Grossi from topRoster-like helper rows if roster contains same id. Keeps main roster intact.
  if (Array.isArray(data.topRoster) && Array.isArray(data.roster)) {
    const rosterIds=new Set(data.roster.map(r=>r&&r.id));
    data.topRoster=data.topRoster.filter(r=>{
      if (r && /rafael.*grossi/i.test(`${r.name||''} ${r.canonicalName||''}`) && rosterIds.has(r.id)) { removed.push({collection:'topRoster',id:r.id,title:r.name||r.canonicalName, reason:'suppress Grossi duplicate visible marker source'}); return false; }
      return true;
    });
  }
  return removed;
}
function installRuntimeGuard(html,curated){
  const marker='PARLEYMAP_STRUCTURAL_RUNTIME_GUARD_V1';
  if (html.includes(marker)) return {html,installed:false};
  const targetData={};
  for (const t of curated.targets) targetData[t.key]={matchAny:t.matchAny, anchor:t.anchor};
  const js=`\n<script id="parleymap-structural-runtime-guard">\n// ${marker}\n(function(){\n  const TARGETS=${JSON.stringify(targetData)};\n  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function keyForText(txt){txt=norm(txt); for(const [k,t] of Object.entries(TARGETS)){if((t.matchAny||[]).some(s=>txt.includes(norm(s)))) return k;} return null;}\n  function latlngFor(k){const a=TARGETS[k].anchor; return [a.lat,a.lng];}\n  function scanText(v){try{return JSON.stringify(v||'').slice(0,5000)}catch{return ''}}\n  function guardLeaflet(){\n    if(!window.L || window.__parleyMapStructuralGuardInstalled) return false; window.__parleyMapStructuralGuardInstalled=true;\n    const seen={};\n    const origMarker=window.L.marker;\n    if(origMarker){window.L.marker=function(latlng,opts){const txt=scanText(opts); const k=keyForText(txt); if(k) latlng=latlngFor(k); const m=origMarker.call(this,latlng,opts); if(k){m.__pmKey=k; const origAdd=m.addTo; m.addTo=function(map){seen[k]=seen[k]||0; if(seen[k]++>0) return this; return origAdd.call(this,map);};} return m;};}\n    const origCircle=window.L.circleMarker;\n    if(origCircle){window.L.circleMarker=function(latlng,opts){const txt=scanText(opts); const k=keyForText(txt); if(k) latlng=latlngFor(k); return origCircle.call(this,latlng,opts);};}\n    const proto=window.L.Marker&&window.L.Marker.prototype;\n    if(proto){['bindTooltip','bindPopup'].forEach(fn=>{const old=proto[fn]; if(!old)return; proto[fn]=function(content,opts){const k=keyForText(scanText(content)); if(k && !this.__pmKey){this.__pmKey=k; try{this.setLatLng(latlngFor(k));}catch(e){}} return old.call(this,content,opts);};});}\n    return true;\n  }\n  const timer=setInterval(()=>{if(guardLeaflet()) clearInterval(timer);},50); setTimeout(()=>clearInterval(timer),15000);\n})();\n</script>\n`;
  const idx=html.indexOf(CLOSE, html.indexOf(OPEN));
  if (idx>=0) return {html:html.slice(0,idx+CLOSE.length)+js+html.slice(idx+CLOSE.length),installed:true};
  return {html:html.replace('</head>',js+'</head>'),installed:true};
}
function installAdsense(html, ads){
  const client=ads.client; const header=ads.headerSlot; const sidebar=ads.sidebarSlot;
  if (!client || !header || !sidebar) return {html,ready:false, reason:'adsense ids not found'};
  let out=html;
  const meta=`<meta name="google-adsense-account" content="${client}">`;
  if (!out.includes('google-adsense-account')) out=out.replace('</head>',`  ${meta}\n</head>`);
  const loader=`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`;
  if (!out.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')) out=out.replace('</head>',`  ${loader}\n</head>`);
  const guard='PARLEYMAP_ADSENSE_SLOT_GUARD_V1';
  if (!out.includes(guard)) {
    const js=`\n<script id="parleymap-adsense-slot-guard">\n// ${guard}\n(function(){\n  const client=${JSON.stringify(client)}, header=${JSON.stringify(header)}, sidebar=${JSON.stringify(sidebar)};\n  function make(slot){const ins=document.createElement('ins'); ins.className='adsbygoogle'; ins.style.display='block'; ins.setAttribute('data-ad-client',client); ins.setAttribute('data-ad-slot',slot); ins.setAttribute('data-ad-format','auto'); ins.setAttribute('data-full-width-responsive','true'); return ins;}\n  function install(){\n    const textEls=[...document.querySelectorAll('div,aside,section')];\n    const headerBox=textEls.find(e=>/header ad slot/i.test(e.textContent||''));\n    const sideBox=textEls.find(e=>/sidebar ad slot/i.test(e.textContent||''));\n    [[headerBox,header],[sideBox,sidebar]].forEach(([box,slot])=>{if(!box||box.querySelector('ins.adsbygoogle')) return; box.innerHTML=''; box.appendChild(make(slot)); try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){} });\n  }\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install(); setTimeout(install,1500);\n})();\n</script>\n`;
    out=out.replace('</body>',js+'</body>');
  }
  return {html:out,ready:true};
}
function writeLegalPages(){
  const now=new Date().toISOString().slice(0,10);
  const base=(title,body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | ParleyMap</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;line-height:1.55;color:#111}a{color:#0b57d0}</style></head><body><h1>${title}</h1>${body}<p><a href="/">Back to ParleyMap</a></p><p><small>Last updated ${now}</small></p></body></html>\n`;
  fs.writeFileSync('privacy.html',base('Privacy Policy','<p>ParleyMap uses essential storage for site preferences and may use analytics and advertising technologies after user consent where required. Public-appearance data is limited to public events, official meetings, public ceremonies, official summit records, or clearly labelled public-source leads.</p><p>No private addresses, private homes, hotels, hospitals, leaked itineraries, or inferred live routes are published.</p><p>For privacy questions, contact the site operator through the contact page.</p>'));
  fs.writeFileSync('impressum.html',base('Impressum','<p>ParleyMap is a public-source presence intelligence demo. It maps public appearances, official meetings, public ceremonies, and source-backed public events.</p><p>Responsible operator: Goaskbid / ParleyMap project. Contact: see contact page.</p>'));
  fs.writeFileSync('about.html',base('About ParleyMap','<p>ParleyMap tracks where public influence is forming by mapping source-backed public appearances and institutional events. It avoids private tracking.</p>'));
  fs.writeFileSync('methodology.html',base('Methodology','<p>Records require a public date, public city or venue-level information, a named person or institution, and an official, host, or clearly reliable public source. Generic watchlists, homepages, FAQ pages, and profile pages are not treated as dated events.</p>'));
  fs.writeFileSync('data-sources.html',base('Data Sources','<p>Preferred sources are official calendars, official statements, host pages, public event programmes, and official institutional records. Secondary media is context and not the foundation for future events.</p>'));
  fs.writeFileSync('contact.html',base('Contact','<p>For corrections, source questions, or data removal requests, contact the ParleyMap operator through the repository owner.</p>'));
}
function hardAudit(data,curated,removedFake){
  const failures=[];
  for (const key of ['people','roster','expansionRoster','appearances','categories']) if (!Array.isArray(data[key])) failures.push(`${key} missing`);
  if (!isSafeData(data)) failures.push(`unsafe counts ${JSON.stringify(counts(data))}`);
  const text=JSON.stringify(data).toLowerCase();
  for (const phrase of ['city of london finance diplomacy watch','iaea nuclear diplomacy watch','think-tank leadership events watch','royal diaries and state-visit watch']) if (text.includes(phrase)) failures.push(`fake event remains: ${phrase}`);
  for (const t of curated.targets.filter(x=>['rafael_grossi','pope_leo_xiv','claudia_sheinbaum','prabowo_subianto'].includes(x.key))) {
    let hits=[]; walk(data,'data',(o,path)=>{if(matchTarget(o,t))hits.push({o,path});});
    if (!hits.length) { failures.push(`${t.key} not found`); continue; }
    for (const h of hits) {
      const o=h.o; const a=t.anchor;
      const lat=Number(o.lat ?? o.mapLat ?? o.homeBases?.[0]?.lat ?? o.location?.lat);
      const lng=Number(o.lng ?? o.mapLng ?? o.homeBases?.[0]?.lng ?? o.location?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        if (Math.abs(lat-a.lat)>1.5 || Math.abs(lng-a.lng)>1.5) failures.push(`${t.key} wrong coordinate at ${h.path}: ${lat},${lng}`);
      }
      if (o.countryFocusCode && String(o.countryFocusCode).toUpperCase() !== a.countryCode) failures.push(`${t.key} wrong code at ${h.path}: ${o.countryFocusCode}`);
    }
  }
  return failures;
}
function main(){
  ensureDir('data/diagnostics');
  const curated=JSON.parse(readFile(CURATED_PATH));
  const chosen=chooseBaseIndex();
  let payload=parseHtml(readFile(INDEX_PATH));
  let data=payload.data;
  const before=counts(data);
  const adsFound=scanRecoverableAds();
  const client=adsFound.clients[0] || (adsFound.pubs[0] ? `ca-${adsFound.pubs[0]}` : '');
  const publisherId=client ? client.replace(/^ca-/,'') : (adsFound.pubs[0]||'');
  const headerSlot=adsFound.slots[0]||''; const sidebarSlot=adsFound.slots.find(s=>s!==headerSlot)||'';
  const ads={client,publisherId,headerSlot,sidebarSlot};

  const fakeRemoved=[]; filterArrays(data,'data',fakeRemoved);
  const anchorFixes=[]; walk(data,'data',(o,path)=>{if(!isProfileLike(o)) return; for(const t of curated.targets){ if(matchTarget(o,t)) { applyTarget(o,t,path,anchorFixes); break; } }});
  const duplicateSuppressions=suppressDuplicateVisibleRows(data);
  const seededEvents=seedRealEvents(data,curated);
  data.meta={...(data.meta||{}), lastStructuralRepair:new Date().toISOString(), structuralRepairStatus:`removed ${fakeRemoved.length} fake rows, applied ${anchorFixes.length} anchor patches, seeded ${seededEvents.length} real-event rows`};
  validateCore(data,'after repair');
  writeHtml(payload,data);

  let html=readFile(INDEX_PATH);
  const guard=installRuntimeGuard(html,curated); html=guard.html;
  const adRes=installAdsense(html,ads); html=adRes.html;
  fs.writeFileSync(INDEX_PATH,html);
  if (ads.publisherId) fs.writeFileSync('ads.txt',`google.com, ${ads.publisherId}, DIRECT, f08c47fec0942fa0\n`);
  writeLegalPages();
  fs.writeFileSync('data/demo.json',JSON.stringify(data,null,2)+'\n');

  const finalPayload=parseHtml(readFile(INDEX_PATH));
  const failures=hardAudit(finalPayload.data,curated,fakeRemoved);
  const adsStatus=(ads.client && ads.headerSlot && ads.sidebarSlot && fs.existsSync('ads.txt'))?'adsense_preserved_and_audited':'adsense_ids_not_found_no_fake_ids_injected';
  if (failures.length) {
    fs.writeFileSync(HARD_AUDIT,JSON.stringify({generatedAt:new Date().toISOString(),status:'audit_failed',failures,counts:counts(finalPayload.data)},null,2)+'\n');
    throw new Error('Hard audit failed: '+failures.join('; '));
  }
  const report={generatedAt:new Date().toISOString(),status:'structural_repair_applied',source:chosen.source,sourceCommit:chosen.hash,before,after:counts(finalPayload.data),fakeRemoved,anchorFixes,duplicateSuppressions,seededEvents,runtimeGuardInstalled:guard.installed,adsense:adsStatus};
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(HARD_AUDIT,JSON.stringify({generatedAt:new Date().toISOString(),status:'audit_passed',counts:counts(finalPayload.data),criticalTargets:['claudia_sheinbaum','pope_leo_xiv','prabowo_subianto','rafael_grossi']},null,2)+'\n');
  fs.writeFileSync(ADS_REPORT,JSON.stringify({generatedAt:new Date().toISOString(),status:adsStatus,client:ads.client||null,publisherId:ads.publisherId||null,headerSlot:ads.headerSlot||null,sidebarSlot:ads.sidebarSlot||null,adsTxt:fs.existsSync('ads.txt')?readFile('ads.txt').trim():null},null,2)+'\n');
  const lines=['# ParleyMap structural repair', '', `Generated: ${new Date().toISOString()}`, '', `Status: ${report.status}`, `Source: ${chosen.source}${chosen.hash?' '+chosen.hash:''}`, `Fake rows removed: ${fakeRemoved.length}`, `Anchor patches: ${anchorFixes.length}`, `Duplicate suppressions: ${duplicateSuppressions.length}`, `Real event rows seeded: ${seededEvents.length}`, `AdSense status: ${adsStatus}`, '', '## Counts', '', '| Dataset | Before | After |','|---|---:|---:|', ...Object.keys(before).map(k=>`| ${k} | ${before[k]} | ${report.after[k]} |`), '', '## AdSense IDs', '', `- client: ${ads.client || 'not found'}`, `- publisherId: ${ads.publisherId || 'not found'}`, `- headerSlot: ${ads.headerSlot || 'not found'}`, `- sidebarSlot: ${ads.sidebarSlot || 'not found'}`];
  fs.writeFileSync(SUMMARY,lines.join('\n')+'\n');
  console.log(JSON.stringify(report,null,2));
}
try { main(); } catch (e) { console.error(e.stack||e.message); process.exit(1); }
