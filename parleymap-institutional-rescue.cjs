#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const INDEX_PATH = 'index.html';
const DEMO_PATH = 'data/demo.json';
const ANCHORS_PATH = 'data/curated-anchors.json';
const SEEDS_PATH = 'data/official-event-seeds.json';
const DIAG_DIR = 'data/diagnostics';
const REPORT_PATH = `${DIAG_DIR}/institutional-rescue-report.json`;
const AUDIT_PATH = `${DIAG_DIR}/institutional-hard-audit-report.json`;
const ADSENSE_PATH = `${DIAG_DIR}/adsense-preserve-audit-report.json`;
const SUMMARY_PATH = `${DIAG_DIR}/LATEST_RUN_SUMMARY.md`;
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';

const BAD_EVENT_RE = /\b(city of london finance diplomacy watch|iaea nuclear diplomacy watch|think[- ]tank leadership events watch|royal diaries? and state[- ]visit|royal diary|generic watch|events watch|diplomacy watch|nuclear diplomacy watch|source watch|homepage|profile page|faq|frequently asked|foire aux questions|programme|program|fact sheet|sitemap|cookie)\b/i;
const BAD_TITLE_RE = /\b(watch|homepage|profile page|faq|frequently asked|programme|program|fact sheet|sitemap|cookie)\b/i;
const PROFILE_COLLECTIONS = ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples','frequentTravellerExpansion'];
const EVENT_COLLECTIONS = ['appearances','events','meetings','eventAgendas','summits','signals','alerts','influenceTimeline','openCatalogs','structuredSourceWatch','calls','telephoneCalls'];

function mkdirs() { fs.mkdirSync(DIAG_DIR, { recursive: true }); fs.mkdirSync('data/crawler', { recursive: true }); }
function exec(cmd) { try { return cp.execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 200 * 1024 * 1024 }); } catch { return ''; } }
function norm(v) { return String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function slug(v) { return norm(v).replace(/ /g, '-').replace(/^-+|-+$/g, '').slice(0, 90); }
function readJson(p, fallback = null) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
function writeJson(p, obj) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); }

function hasDemoData(html) { return typeof html === 'string' && html.includes(OPEN_TAG) && html.includes(CLOSE_TAG); }
function extractDataFromHtml(html) {
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error('demo-data opening tag not found');
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error('demo-data closing tag not found');
  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { data, jsonStart, jsonEnd };
}
function embedData(html, jsonStart, jsonEnd, data) {
  return html.slice(0, jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + html.slice(jsonEnd);
}
function counts(data) {
  const out = {};
  for (const k of ['people','roster','topRoster','expansionRoster','appearances','categories']) out[k] = Array.isArray(data?.[k]) ? data[k].length : null;
  return out;
}
function validCounts(data) {
  const c = counts(data);
  return c.people >= 90 && c.roster >= 190 && c.expansionRoster >= 100 && c.appearances >= 500 && c.categories >= 10;
}
function polluted(data) {
  const c = counts(data);
  const txt = JSON.stringify(data).toLowerCase();
  if (c.people && c.people > 115) return true;
  if (txt.includes('vincent auriol') && /president of france|head of state\/government|current/i.test(txt)) return true;
  return false;
}
function findSafeIndexInHistory() {
  const hashes = exec('git rev-list --all -- index.html').split('\n').filter(Boolean);
  for (const h of hashes) {
    const html = exec(`git show ${h}:index.html`);
    if (!hasDemoData(html)) continue;
    try {
      const { data } = extractDataFromHtml(html);
      if (validCounts(data) && !polluted(data)) return { hash: h, html };
    } catch {}
  }
  return null;
}
function loadIndexAndData() {
  let html = fs.existsSync(INDEX_PATH) ? fs.readFileSync(INDEX_PATH, 'utf8') : '';
  let restoredFrom = null;
  let data, jsonStart, jsonEnd;
  if (hasDemoData(html)) {
    ({ data, jsonStart, jsonEnd } = extractDataFromHtml(html));
  }
  if (!hasDemoData(html) || !validCounts(data) || polluted(data)) {
    const safe = findSafeIndexInHistory();
    if (safe) {
      html = safe.html;
      restoredFrom = safe.hash;
      ({ data, jsonStart, jsonEnd } = extractDataFromHtml(html));
    } else if (fs.existsSync(DEMO_PATH)) {
      data = readJson(DEMO_PATH);
      if (!validCounts(data)) throw new Error('current index is not usable and data/demo.json does not pass count gates');
      html = buildMinimalShell(data);
      ({ data, jsonStart, jsonEnd } = extractDataFromHtml(html));
      restoredFrom = 'generated-minimal-shell-from-data-demo-json';
    } else {
      throw new Error('could not find safe full index.html in git history');
    }
  }
  return { html, data, jsonStart, jsonEnd, restoredFrom };
}
function buildMinimalShell(data) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ParleyMap</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>body{margin:0;background:#08111f;color:#eef5ff;font:14px Arial,sans-serif}.ad-slot{border:1px solid #374761;min-height:90px;margin:8px;padding:8px}.layout{display:grid;grid-template-columns:1fr 320px;gap:8px}.toolbar{padding:10px;background:#0d1728}.card{display:inline-block;background:#101a2c;border:1px solid #f4bf32;margin:4px;padding:6px}#map{height:70vh}</style>
</head>
<body>
<header class="toolbar"><h1>ParleyMap</h1><div id="pm-header-ad" class="ad-slot">HEADER AD SLOT</div></header>
<div class="layout"><main><input id="pm-search" placeholder="Search roster" oninput="pmRender()"><div id="chips"></div><div id="map"></div></main><aside><div id="pm-sidebar-ad" class="ad-slot">SIDEBAR AD SLOT</div></aside></div>
<script id="demo-data" type="application/json">${JSON.stringify(data, null, 2)}</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>window.pmData=JSON.parse(document.getElementById('demo-data').textContent);const map=L.map('map').setView([20,0],2);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);let markers=[];function label(o){return o.canonicalName||o.name||''}function pos(o){const b=(o.homeBases&&o.homeBases[0])||o.mapAnchor||o.homeBase||o;return [Number(b.lat||o.lat||o.latitude),Number(b.lng||b.lon||o.lng||o.longitude)]}function pmRender(){markers.forEach(m=>map.removeLayer(m));markers=[];const q=(document.getElementById('pm-search').value||'').toLowerCase();const rows=[...(pmData.roster||[]),...(pmData.people||[])].filter((v,i,a)=>a.findIndex(x=>(x.id||label(x))===(v.id||label(v)))===i).filter(r=>!q||label(r).toLowerCase().includes(q));document.getElementById('chips').innerHTML=rows.slice(0,20).map(r=>'<span class=card>'+label(r)+'</span>').join('');for(const r of rows){const p=pos(r);if(!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;markers.push(L.marker(p).addTo(map).bindTooltip(label(r)));}}pmRender();</script>
</body>
</html>`;
}

function personBlob(o) { return norm([o?.id,o?.slug,o?.name,o?.canonicalName,o?.roleTitle,o?.organization,o?.country,o?.countryName,o?.countryFocus,o?.countryFocusCode,o?.profileLine].join(' ')); }
function targetFor(o, targets) {
  const blob = personBlob(o);
  for (const t of targets) {
    const anyOk = !t.matchAny || t.matchAny.some(x => blob.includes(norm(x)));
    const allOk = !t.matchAll || t.matchAll.every(x => blob.includes(norm(x)));
    if (anyOk && allOk) return t;
  }
  return null;
}
function makeAnchor(a) {
  return { label:a.label, city:a.city, countryCode:a.countryCode, countryName:a.countryName, lat:a.lat, lng:a.lng, precision:a.precision || 'city', type:a.type || 'institutional_base', privacy:a.privacy || 'city-level public institutional base only' };
}
function applyAnchorAndFace(o, t) {
  const a = makeAnchor(t.anchor);
  if (t.canonicalName && (o.canonicalName || o.name)) { o.canonicalName = t.canonicalName; o.name = t.canonicalName; }
  if (t.roleTitle) o.roleTitle = t.roleTitle;
  if (t.organization) o.organization = t.organization;
  if (t.category) o.category = t.category;
  if (t.countryFocus) o.countryFocus = t.countryFocus;
  if (t.countryFocusCode) o.countryFocusCode = t.countryFocusCode;
  if (t.countryName) o.countryName = t.countryName;
  if (t.country) o.country = t.country;
  if (t.homeRegion) o.homeRegion = t.homeRegion;
  if (t.orgMark) o.orgMark = t.orgMark;
  if (t.flagAudit) o.flagAudit = t.flagAudit;
  if (t.officialUrl) o.officialUrl = t.officialUrl;
  if (t.imageUrl && (!o.imageUrl || /no image|placeholder|avatar|logo|missing/i.test(String(o.imageProvider||o.imageUrl||'')))) {
    o.imageUrl = t.imageUrl;
    o.imageProvider = 'curated public image fallback';
    o.visualAuditStatus = 'curated image fallback; verify licence/attribution before production cache';
    o.imageAudit = { status:'photo-candidate', reasons:[], instruction:'Curated public image fallback added by institutional audit.' };
  }
  o.homeBases = [a]; o.homeBase = a; o.mapAnchor = a; o.anchorLocation = a; o.baseLocation = a; o.institutionalBase = a;
  o.lat = a.lat; o.lng = a.lng; o.lon = a.lng; o.latitude = a.lat; o.longitude = a.lng; o.homeLat = a.lat; o.homeLng = a.lng; o.mapLat = a.lat; o.mapLng = a.lng; o.anchorLat = a.lat; o.anchorLng = a.lng;
  o.coordinates = { lat:a.lat, lng:a.lng };
  o.geo = { lat:a.lat, lng:a.lng, city:a.city, countryCode:a.countryCode, countryName:a.countryName };
  o.locationStatus = 'institutional_base_city_level';
  return a;
}
function patchProfiles(data, targets) {
  const fixes = [];
  for (const collection of PROFILE_COLLECTIONS) {
    const arr = Array.isArray(data[collection]) ? data[collection] : [];
    for (let i=0; i<arr.length; i++) {
      const o = arr[i];
      if (!o || typeof o !== 'object') continue;
      const t = targetFor(o, targets);
      if (t) { const before = { id:o.id, name:o.canonicalName||o.name, countryFocusCode:o.countryFocusCode, flagAudit:o.flagAudit, lat:o.lat, lng:o.lng }; applyAnchorAndFace(o,t); fixes.push({collection,index:i,target:t.key,before,after:{id:o.id,name:o.canonicalName||o.name,countryFocusCode:o.countryFocusCode,city:t.anchor.city,lat:t.anchor.lat,lng:t.anchor.lng}}); }
    }
  }
  return fixes;
}
function dedupeVisibleProfiles(data, targets) {
  const removed = [];
  // Remove roster duplicates from expansion-like collections when the same id/name already exists in roster.
  const rosterKeys = new Set((data.roster||[]).map(o => (o.id || slug(o.canonicalName||o.name||'')).toLowerCase()));
  const rosterNames = new Set((data.roster||[]).map(o => slug(o.canonicalName||o.name||'')));
  for (const collection of ['expansionRoster','priorityExpansion','watchlistExamples','frequentTravellerExpansion','topRoster']) {
    if (!Array.isArray(data[collection])) continue;
    const keep = [];
    const seen = new Set();
    for (const item of data[collection]) {
      const key = String(item?.id || slug(item?.canonicalName || item?.name || '')).toLowerCase();
      const name = slug(item?.canonicalName || item?.name || '');
      const tgt = targetFor(item, targets);
      const duplicateInRoster = rosterKeys.has(key) || (name && rosterNames.has(name));
      const badGrossiDup = tgt && tgt.key === 'rafael_grossi' && collection !== 'roster';
      if ((duplicateInRoster && collection !== 'topRoster') || badGrossiDup || seen.has(key)) {
        removed.push({ collection, id:item?.id||null, name:item?.canonicalName||item?.name||null, reason: badGrossiDup ? 'suppress_visible_grossi_duplicate' : 'duplicate_visible_profile' });
      } else {
        keep.push(item); seen.add(key);
      }
    }
    data[collection] = keep;
  }
  // Dedupe within roster by id/name, preserving first occurrence.
  for (const collection of ['roster','people']) {
    if (!Array.isArray(data[collection])) continue;
    const keep = []; const seen = new Set();
    for (const item of data[collection]) {
      const key = String(item?.id || slug(item?.canonicalName || item?.name || '')).toLowerCase();
      if (seen.has(key)) removed.push({ collection, id:item?.id||null, name:item?.canonicalName||item?.name||null, reason:'duplicate_within_collection' });
      else { keep.push(item); seen.add(key); }
    }
    data[collection] = keep;
  }
  return removed;
}
function badEventText(o) { return [o?.title,o?.name,o?.label,o?.summary,o?.id,o?.eventType,o?.bucket,o?.sourceCategory].join(' '); }
function hasDateLike(o) { return Boolean(o && (o.startsAt || o.date || o.startDate || o.endsAt || /\b20\d{2}-\d{2}-\d{2}\b/.test(JSON.stringify(o).slice(0,400)))); }
function removeFakeEvents(data) {
  const removed = [];
  function shouldRemove(o, collection) {
    if (!o || typeof o !== 'object') return false;
    const txt = badEventText(o);
    if (BAD_EVENT_RE.test(txt)) return true;
    if (collection && /appearance|event|agenda|summit|signal|alert|timeline|watch|catalog/i.test(collection) && BAD_TITLE_RE.test(txt) && hasDateLike(o)) return true;
    if (/watch/i.test(txt) && hasDateLike(o) && !Array.isArray(o.profileLines)) return true;
    return false;
  }
  function filterArray(arr, collection) {
    const out = [];
    for (const item of arr) {
      if (shouldRemove(item, collection)) removed.push({ collection, id:item?.id||null, title:item?.title||item?.name||item?.label||null });
      else out.push(item);
    }
    return out;
  }
  for (const collection of Object.keys(data)) {
    if (Array.isArray(data[collection])) data[collection] = filterArray(data[collection], collection);
  }
  return removed;
}
function normalizeAppearance(seed, personId) {
  return {
    id: seed.id,
    personId,
    startsAt: seed.startsAt,
    endsAt: seed.endsAt || null,
    status: seed.status || (new Date(seed.startsAt) > new Date() ? 'ANNOUNCED_FUTURE' : 'VERIFIED_PAST'),
    confidence: seed.confidence || 0.9,
    confidenceLabel: seed.confidenceLabel || 'official source',
    eventType: seed.eventType || 'PUBLIC_APPEARANCE',
    title: seed.title,
    summary: seed.summary || seed.title,
    significance: seed.significance || 'Official-source public appearance.',
    decisions: '',
    location: seed.location,
    venuePublic: true,
    securityPrecision: 'city-level public event only; no private locations, hotels, residences, leaked itineraries or live routes',
    publicInterestScore: 72,
    eventGroupId: `eg-${slug(seed.location.city)}-${String(seed.startsAt).slice(0,10)}`,
    topics: Array.isArray(seed.topics) ? seed.topics : [],
    counterpartIds: [],
    sourcePack: seed.sourcePack,
    visual: { status:'runtime portrait', policy:'Use audited public media only.' },
    lastCheckedAt: new Date().toISOString(),
    marketImpact: { sectors: [], companies: [], countries: [seed.location.countryName], confidence: 'medium' }
  };
}
function findPersonId(data, matchList) {
  const hay = [...(data.people||[]),...(data.roster||[]),...(data.expansionRoster||[])];
  for (const needle of matchList) {
    const n = norm(needle);
    const row = hay.find(o => personBlob(o).includes(n));
    if (row) return row.id || slug(row.canonicalName || row.name || needle);
  }
  return null;
}
function seedOfficialEvents(data, seeds) {
  if (!Array.isArray(data.appearances)) data.appearances = [];
  const added = [];
  const ids = new Set(data.appearances.map(a => a.id));
  for (const seed of seeds.events || []) {
    if (ids.has(seed.id)) continue;
    const personId = findPersonId(data, seed.personMatch || []);
    if (!personId) continue;
    data.appearances.push(normalizeAppearance(seed, personId));
    ids.add(seed.id); added.push({ id: seed.id, title: seed.title, personId });
  }
  data.appearances.sort((a,b) => String(b.startsAt||'').localeCompare(String(a.startsAt||'')));
  return added;
}
function installRuntimeGuard(html, targets) {
  const marker = 'parleymap-institutional-runtime-guard';
  const re = new RegExp(`\\n?<script id=["']${marker}["'][\\s\\S]*?<\\/script>`, 'g');
  html = html.replace(re, '');
  const payload = targets.map(t => ({ key:t.key, names:[...(t.matchAny||[]), t.canonicalName].filter(Boolean), lat:t.anchor.lat, lng:t.anchor.lng, city:t.anchor.city, countryCode:t.anchor.countryCode, countryName:t.anchor.countryName }));
  const script = `
<script id="${marker}">
(function(){
  var targets=${JSON.stringify(payload)};
  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  function hit(txt){txt=norm(txt); for(var i=0;i<targets.length;i++){var t=targets[i]; for(var j=0;j<t.names.length;j++){var n=norm(t.names[j]); if(n && txt.indexOf(n)>=0) return t;}} return null;}
  function patchMarker(marker,t){try{ if(marker && marker.setLatLng) marker.setLatLng([t.lat,t.lng]); marker.__pmIdentity=t.key; }catch(e){} }
  function install(L){ if(!L || L.__pmInstitutionalGuard) return; L.__pmInstitutionalGuard=true; window.__pmLeafletMarkers=window.__pmLeafletMarkers||[]; var oldMarker=L.marker; if(oldMarker){ L.marker=function(latlng,opts){ var m=oldMarker.call(this,latlng,opts); window.__pmLeafletMarkers.push(m); return m; }; }
    var oldMap=L.map; if(oldMap){ L.map=function(){ var map=oldMap.apply(this,arguments); window.__pmLeafletMaps=window.__pmLeafletMaps||[]; window.__pmLeafletMaps.push(map); return map; }; }
    var proto=L.Marker&&L.Marker.prototype; if(proto){ ['bindTooltip','bindPopup'].forEach(function(fn){ var old=proto[fn]; if(!old) return; proto[fn]=function(content){ var txt=typeof content==='string'?content:(content&&content.textContent)||''; var t=hit(txt); var out=old.apply(this,arguments); if(t) patchMarker(this,t); return out; }; }); }
  }
  var _L=window.L; Object.defineProperty(window,'L',{configurable:true,get:function(){return _L;},set:function(v){_L=v; try{install(v);}catch(e){} }}); if(_L) install(_L);
  function sweep(){ try{ var seen={}; (window.__pmLeafletMarkers||[]).forEach(function(m){ var txt=''; try{txt=(m.getTooltip&&m.getTooltip()&&m.getTooltip().getContent&&m.getTooltip().getContent())||(m.getPopup&&m.getPopup()&&m.getPopup().getContent&&m.getPopup().getContent())||'';}catch(e){} var t=hit(txt); if(!t)return; patchMarker(m,t); if(seen[t.key]&&m.remove) m.remove(); else seen[t.key]=true; }); }catch(e){} }
  setInterval(sweep, 1000); setTimeout(sweep, 250); setTimeout(sweep, 2500); setTimeout(sweep, 6000);
})();
</script>`;
  const demoClose = html.indexOf(CLOSE_TAG);
  if (demoClose !== -1) return html.slice(0, demoClose + CLOSE_TAG.length) + script + html.slice(demoClose + CLOSE_TAG.length);
  if (html.includes('</head>')) return html.replace('</head>', script + '\n</head>');
  return script + html;
}
function scanAdSenseValues(repoTextFiles) {
  const clientRe = /ca-pub-\d{8,24}/g;
  const pubRe = /(?<!ca-)pub-\d{8,24}/g;
  const slotRe = /data-ad-slot=["']([^"']+)["']/g;
  const clients = new Set(); const pubs = new Set(); const slots = [];
  const scan = (txt) => { if(!txt)return; for(const m of txt.matchAll(clientRe)) clients.add(m[0]); for(const m of txt.matchAll(pubRe)) pubs.add(m[0]); for(const m of txt.matchAll(slotRe)) if(!slots.includes(m[1])) slots.push(m[1]); };
  repoTextFiles.forEach(scan);
  const envClient = process.env.PUBLISHER_ID || process.env.ADSENSE_PUBLISHER_ID || '';
  const envHeader = process.env.HEADER_SLOT_ID || '';
  const envSide = process.env.SIDEBAR_SLOT_ID || '';
  if (/^ca-pub-\d+$/i.test(envClient)) clients.add(envClient);
  if (/^pub-\d+$/i.test(envClient)) pubs.add(envClient);
  if (envHeader) slots.unshift(envHeader);
  if (envSide) slots.splice(1,0,envSide);
  let client = [...clients][0] || '';
  let publisherId = client ? client.replace(/^ca-/, '') : ([...pubs][0] || '');
  if (!client && publisherId) client = 'ca-' + publisherId;
  const uniqSlots = [...new Set(slots)].filter(Boolean);
  return { client, publisherId, headerSlot: uniqSlots[0] || '', sidebarSlot: uniqSlots[1] || '' };
}
function readRecoverableTextFiles() {
  const files = [];
  const candidates = ['index.html','index.template.html','privacy.html','impressum.html','ads.txt','README.md'];
  for (const p of candidates) { try { files.push(fs.readFileSync(p,'utf8')); } catch {} }
  const hashes = exec('git rev-list --all -- index.html index.template.html privacy.html impressum.html ads.txt README.md').split('\n').filter(Boolean).slice(0,200);
  for (const h of hashes) for (const p of candidates) { const txt = exec(`git show ${h}:${p}`); if (txt) files.push(txt); }
  return files;
}
function installAdSense(html, ads) {
  const report = { status:'adsense_ids_not_found_no_fake_ids_injected', ...ads, changed:false };
  if (!ads.client || !ads.headerSlot || !ads.sidebarSlot) return { html, report };
  const meta = `<meta name="google-adsense-account" content="${ads.client}">`;
  if (!html.includes('google-adsense-account')) html = html.replace('</head>', `${meta}\n</head>`);
  const loader = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>`;
  if (!html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')) html = html.replace('</head>', `${loader}\n</head>`);
  const marker = 'parleymap-adsense-runtime-installer';
  html = html.replace(new RegExp(`\\n?<script id=["']${marker}["'][\\s\\S]*?<\\/script>`, 'g'), '');
  const insHeader = `<ins class="adsbygoogle" style="display:block" data-ad-client="${ads.client}" data-ad-slot="${ads.headerSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  const insSide = `<ins class="adsbygoogle" style="display:block" data-ad-client="${ads.client}" data-ad-slot="${ads.sidebarSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  const runtime = `
<script id="${marker}">
(function(){function install(){var boxes=[].slice.call(document.querySelectorAll('div,section,aside,header'));var header=boxes.find(function(e){return /HEADER AD SLOT/i.test(e.textContent||'')||/header.*ad/i.test(e.id||e.className||'')});var side=boxes.find(function(e){return /SIDEBAR AD SLOT/i.test(e.textContent||'')||/side.*ad/i.test(e.id||e.className||'')});function put(el,html){if(el&&!el.querySelector('.adsbygoogle')){el.innerHTML=html;try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}}}put(header,${JSON.stringify(insHeader)});put(side,${JSON.stringify(insSide)});} if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install(); setTimeout(install,1000); setTimeout(install,4000);})();
</script>`;
  html = html.replace('</body>', runtime + '\n</body>');
  fs.writeFileSync('ads.txt', `google.com, ${ads.publisherId}, DIRECT, f08c47fec0942fa0\n`);
  report.status = 'adsense_preserved_and_audited'; report.changed = true;
  return { html, report };
}
function cleanLegalPages(ads) {
  const now = new Date().toISOString().slice(0,10);
  fs.writeFileSync('privacy.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy - ParleyMap</title></head><body><main><h1>Privacy Policy</h1><p>Last updated: ${now}</p><p>ParleyMap is a public-appearance and relationship-intelligence map. It uses public sources and avoids private addresses, hotels, residences, hospitals, leaked itineraries and live tracking.</p><h2>Analytics and advertising</h2><p>The site may use analytics and Google AdSense after cookie consent where required. Advertising identifiers are managed by Google and browser controls.</p><h2>Contact</h2><p>For privacy or correction requests, contact the site operator through the public contact page.</p></main></body></html>\n`);
  fs.writeFileSync('impressum.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Impressum - ParleyMap</title></head><body><main><h1>Impressum</h1><p>ParleyMap is operated as a public-source information product. It maps public appearances and official public engagements only.</p><p>Contact: see <a href="/contact.html">contact page</a>.</p></main></body></html>\n`);
  fs.writeFileSync('contact.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact - ParleyMap</title></head><body><main><h1>Contact</h1><p>For corrections, source questions or privacy requests, contact the ParleyMap operator.</p><p>Email: contact@parleymap.com</p></main></body></html>\n`);
  fs.writeFileSync('about.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About - ParleyMap</title></head><body><main><h1>About ParleyMap</h1><p>ParleyMap maps documented public appearances, meetings, summits and official public engagements. It does not track private movement.</p></main></body></html>\n`);
  fs.writeFileSync('methodology.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Methodology - ParleyMap</title></head><body><main><h1>Methodology</h1><p>Published records require a person, date, city, title and official or host-public source. Generic watch pages, homepages, programme indexes and unsourced leads are not treated as dated appearances.</p></main></body></html>\n`);
  fs.writeFileSync('data-sources.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Data Sources - ParleyMap</title></head><body><main><h1>Data Sources</h1><p>Preferred sources include official government calendars, royal diaries, IAEA statements and news, Vatican travel pages, host event pages, official summit pages and public readouts.</p></main></body></html>\n`);
}
function ensureSourceRegistry() {
  const registry = {
    officialDomains: ['iaea.org','vatican.va','royal.uk','gov.uk','whitehouse.gov','gob.mx','presidenri.go.id','elysee.fr','nato.int','un.org','consilium.europa.eu','commission.europa.eu'],
    sitemaps: [
      { label:'IAEA Director General', url:'https://www.iaea.org/about/rafael-mariano-grossi', type:'official_profile' },
      { label:'IAEA Statements', url:'https://www.iaea.org/newscenter/statements', type:'official_statements' },
      { label:'Vatican Leo XIV travels', url:'https://www.vatican.va/content/leo-xiv/en/travels.html', type:'official_travels' },
      { label:'Royal Family future engagements', url:'https://www.royal.uk/media-centre/future-engagements', type:'official_diary' },
      { label:'Royal Family news', url:'https://www.royal.uk/news-and-activity', type:'official_news' }
    ],
    publicationRule: 'Publish only records with person, date, city, event title and official or host-public sourcePack. Never publish generic watch cards.'
  };
  writeJson('data/source-registry.json', registry);
}
function hardAudit(data) {
  const allProfiles = [...(data.people||[]),...(data.roster||[])];
  function find(name) { const n=norm(name); return allProfiles.find(o => personBlob(o).includes(n)); }
  const issues = [];
  const checks = [
    ['Rafael Grossi','AT','Vienna'],['Pope Leo XIV','VA','Vatican City'],['Claudia Sheinbaum','MX','Mexico City'],['Prabowo Subianto','ID','Jakarta']
  ];
  for (const [name,code,city] of checks) {
    const row = find(name);
    if (!row) { issues.push(`${name} missing from profile sources`); continue; }
    const hb = row.homeBases && row.homeBases[0];
    const ok = String(row.countryFocusCode||row.countryFocus||'').toUpperCase()===code && hb && norm(hb.city)===norm(city) && Number.isFinite(Number(hb.lat)) && Number.isFinite(Number(hb.lng));
    if (!ok) issues.push(`${name} anchor failed`);
  }
  const txt = JSON.stringify(data).toLowerCase();
  for (const bad of ['city of london finance diplomacy watch','iaea nuclear diplomacy watch','think-tank leadership events watch','royal diaries and state-visit']) if (txt.includes(bad)) issues.push(`fake event still present: ${bad}`);
  const grossiVisible = [];
  for (const col of PROFILE_COLLECTIONS) if (Array.isArray(data[col])) for (const r of data[col]) if (norm(r?.canonicalName||r?.name).includes('rafael grossi')) grossiVisible.push(col);
  if (grossiVisible.some(x=>['topRoster','expansionRoster','priorityExpansion','watchlistExamples','frequentTravellerExpansion'].includes(x))) issues.push(`Rafael Grossi remains in duplicate visible helper collections: ${grossiVisible.join(',')}`);
  if (polluted(data)) issues.push('historical or people-count pollution remains');
  return issues;
}
function findAndPatchAppearanceTargets(data, targets) {
  const patches = [];
  for (const col of EVENT_COLLECTIONS) {
    if (!Array.isArray(data[col])) continue;
    for (const o of data[col]) {
      if (!o || typeof o !== 'object') continue;
      const personRow = [...(data.people||[]),...(data.roster||[])].find(p => p.id && p.id === o.personId);
      const t = targetFor(personRow || o, targets);
      if (!t) continue;
      const eventText = norm([o.title,o.summary,o.eventType,o.sourcePack && JSON.stringify(o.sourcePack)].join(' '));
      const generic = BAD_TITLE_RE.test(eventText) || !Array.isArray(o.sourcePack) || o.sourcePack.length === 0;
      if (generic) {
        applyAnchorAndFace(o, t);
        if (o.location && typeof o.location === 'object') Object.assign(o.location, makeAnchor(t.anchor));
        patches.push({collection:col,id:o.id||null,target:t.key,reason:'generic_or_unsourced_event_anchor_repaired'});
      }
    }
  }
  return patches;
}
function main() {
  mkdirs();
  const anchors = readJson(ANCHORS_PATH, {targets:[]});
  const seeds = readJson(SEEDS_PATH, {events:[]});
  const beforeIndex = fs.existsSync(INDEX_PATH) ? fs.readFileSync(INDEX_PATH,'utf8') : '';
  const loaded = loadIndexAndData();
  let { html, data, jsonStart, jsonEnd, restoredFrom } = loaded;
  const before = counts(data);
  const profileFixes = patchProfiles(data, anchors.targets);
  const fakeEventsRemoved = removeFakeEvents(data);
  const duplicateProfilesRemoved = dedupeVisibleProfiles(data, anchors.targets);
  const eventAnchorPatches = findAndPatchAppearanceTargets(data, anchors.targets);
  const seededEvents = seedOfficialEvents(data, seeds);
  patchProfiles(data, anchors.targets);
  const afterRepairCounts = counts(data);
  if (afterRepairCounts.roster < 190) throw new Error(`roster count below safety floor after repair: ${afterRepairCounts.roster}`);
  if (afterRepairCounts.expansionRoster < 100) throw new Error(`expansionRoster count below safety floor after repair: ${afterRepairCounts.expansionRoster}`);
  if (afterRepairCounts.appearances < 500) throw new Error(`appearances count below safety floor after repair: ${afterRepairCounts.appearances}`);
  if (afterRepairCounts.categories < 10) throw new Error(`categories count below safety floor after repair: ${afterRepairCounts.categories}`);
  const issues = hardAudit(data);
  if (issues.length) throw new Error('hard audit failed before write: ' + issues.join('; '));
  data.meta = { ...(data.meta||{}), lastDataUpdate:new Date().toISOString(), institutionalRescueStatus:'applied anchors, duplicate suppression, fake-event cleanup, and official-source event seeding', lastInstitutionalRescue:new Date().toISOString() };
  html = embedData(html, jsonStart, jsonEnd, data);
  html = installRuntimeGuard(html, anchors.targets);
  const ads = scanAdSenseValues(readRecoverableTextFiles());
  const adsenseInstall = installAdSense(html, ads);
  html = adsenseInstall.html;
  cleanLegalPages(ads);
  ensureSourceRegistry();
  fs.writeFileSync(INDEX_PATH, html);
  writeJson(DEMO_PATH, data);
  writeJson(REPORT_PATH, { generatedAt:new Date().toISOString(), status:'institutional_rescue_applied', restoredFrom, before, after:counts(data), profileFixes, fakeEventsRemoved, duplicateProfilesRemoved, eventAnchorPatches, seededEvents });
  const finalIssues = hardAudit(data);
  writeJson(AUDIT_PATH, { generatedAt:new Date().toISOString(), status: finalIssues.length ? 'audit_failed' : 'audit_passed', issues: finalIssues, counts: counts(data) });
  writeJson(ADSENSE_PATH, { generatedAt:new Date().toISOString(), ...adsenseInstall.report });
  const summary = [
    '# ParleyMap institutional rescue', '',
    `Generated: ${new Date().toISOString()}`,
    `Status: ${finalIssues.length ? 'audit_failed' : 'audit_passed'}`,
    `Restored index from: ${restoredFrom || 'current index.html'}`,
    '', '## Counts', '', '| Dataset | Before | After |','|---|---:|---:|',
    ...Object.keys(counts(data)).map(k=>`| ${k} | ${before[k] ?? 'n/a'} | ${counts(data)[k] ?? 'n/a'} |`),
    '', '## Changes', '',
    `- Profile/anchor fixes: ${profileFixes.length}`,
    `- Fake event/watch rows removed: ${fakeEventsRemoved.length}`,
    `- Duplicate visible profile rows removed: ${duplicateProfilesRemoved.length}`,
    `- Generic event anchor patches: ${eventAnchorPatches.length}`,
    `- Official-source events seeded: ${seededEvents.length}`,
    '', '## AdSense', '',
    `- Status: ${adsenseInstall.report.status}`,
    `- Client: ${adsenseInstall.report.client || 'not recovered'}`,
    `- Publisher ID: ${adsenseInstall.report.publisherId || 'not recovered'}`,
    `- Header slot: ${adsenseInstall.report.headerSlot || 'not recovered'}`,
    `- Sidebar slot: ${adsenseInstall.report.sidebarSlot || 'not recovered'}`,
    '', '## Audit issues', '', finalIssues.length ? finalIssues.map(x=>`- ${x}`).join('\n') : '- none'
  ].join('\n') + '\n';
  fs.writeFileSync(SUMMARY_PATH, summary);
  if (finalIssues.length) throw new Error('final hard audit failed: ' + finalIssues.join('; '));
  console.log(summary);
}
main();
