#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const INDEX_PATH = 'index.html';
const DEMO_PATH = 'data/demo.json';
const REPORT_DIR = 'data/diagnostics';
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = '</' + 'script>';
const REQUIRE_ADSENSE = String(process.env.REQUIRE_ADSENSE_READY || 'false').toLowerCase() === 'true';
const MODE = process.env.PARLEYMAP_FIX_MODE || 'manual';

const FAKE_TITLE_RE = /\b(city of london finance diplomacy watch|iaea nuclear diplomacy watch|think[- ]?tank leadership events watch|royal diaries|royal diary|state[- ]?visit watch|generic watch|event page watch|source watch|homepage|profile page|fact sheet|faq|frequently asked|programme|program|sitemap|cookie|privacy|terms)\b/i;
const FAKE_ID_RE = /(^|[-_])(watch|source-watch)[-_]/i;
const HISTORICAL_ACTIVE_RE = /\bvincent\s+auriol\b/i;

function mkdirs(){ fs.mkdirSync(REPORT_DIR, {recursive:true}); fs.mkdirSync('data', {recursive:true}); }
function readFileSafe(p){ try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function writeJson(p, obj){ fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); }
function norm(v){ return String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
function slug(v){ return norm(v).replace(/ /g,'-').replace(/^-+|-+$/g,'').slice(0,80); }
function arr(v){ return Array.isArray(v) ? v : []; }
function count(v){ return Array.isArray(v) ? v.length : null; }
function shallowClone(x){ return JSON.parse(JSON.stringify(x)); }
function getHtmlAndData(html){
  const start = html.indexOf(OPEN);
  if (start < 0) throw new Error('demo-data opening tag not found');
  const jsonStart = start + OPEN.length;
  const jsonEnd = html.indexOf(CLOSE, jsonStart);
  if (jsonEnd < 0) throw new Error('demo-data closing tag not found');
  const text = html.slice(jsonStart, jsonEnd).trim();
  return {html, jsonStart, jsonEnd, data: JSON.parse(text)};
}
function setData(payload, data){
  return payload.html.slice(0, payload.jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + payload.html.slice(payload.jsonEnd);
}
function coreCounts(data){ return {people:count(data.people), roster:count(data.roster), topRoster:count(data.topRoster), expansionRoster:count(data.expansionRoster), appearances:count(data.appearances), categories:count(data.categories)}; }
function validateCore(data, label){
  for (const k of ['meta','people','roster','expansionRoster','appearances','categories']) if (!(k in data)) throw new Error(`${label}: missing ${k}`);
  for (const k of ['people','roster','expansionRoster','appearances','categories']) if (!Array.isArray(data[k])) throw new Error(`${label}: ${k} must be an array`);
  if (data.people.length < 90 || data.people.length > 115) throw new Error(`${label}: people count unsafe ${data.people.length}`);
  if (data.roster.length < 190 || data.roster.length > 230) throw new Error(`${label}: roster count unsafe ${data.roster.length}`);
  if (data.expansionRoster.length < 100 || data.expansionRoster.length > 140) throw new Error(`${label}: expansionRoster count unsafe ${data.expansionRoster.length}`);
  if (data.appearances.length < 450) throw new Error(`${label}: appearances count unsafe ${data.appearances.length}`);
  if (data.categories.length < 10) throw new Error(`${label}: categories count unsafe ${data.categories.length}`);
}
function isThinHtml(html){
  const t = String(html || '').trim();
  if (t === 'parleymap.com') return true;
  if (t.length < 10000) return true;
  if (!t.includes(OPEN)) return true;
  return false;
}
function hasHistoricalPollution(data){
  const s = JSON.stringify({people:data.people, roster:data.roster, topRoster:data.topRoster}).slice(0, 6000000);
  if (!HISTORICAL_ACTIVE_RE.test(s)) return false;
  return /president of france|head of state|current office holder|president/i.test(s);
}
function isSafeData(data){
  try { validateCore(data, 'candidate'); } catch { return false; }
  if (hasHistoricalPollution(data)) return false;
  return true;
}
function candidateFromHtml(html){
  try { const payload = getHtmlAndData(html); return {html, data: payload.data}; } catch { return null; }
}
function gitShow(spec){ try { return cp.execSync(`git show ${spec}`, {encoding:'utf8', stdio:['ignore','pipe','ignore'], maxBuffer: 80*1024*1024}); } catch { return ''; } }
function latestSafeIndexFromHistory(){
  let commits = [];
  try { commits = cp.execSync('git rev-list --all -- index.html', {encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim().split(/\s+/).filter(Boolean); } catch { commits = []; }
  for (const commit of commits) {
    const html = gitShow(`${commit}:index.html`);
    if (!html || isThinHtml(html)) continue;
    const cand = candidateFromHtml(html);
    if (cand && isSafeData(cand.data)) return {html, commit};
  }
  return null;
}
function loadPayload(){
  const current = readFileSafe(INDEX_PATH);
  let source = 'current';
  let html = current;
  if (isThinHtml(current)) {
    const hist = latestSafeIndexFromHistory();
    if (!hist) throw new Error('current index.html is thin and no safe historical full index.html was found');
    html = hist.html;
    source = `git:${hist.commit}`;
  }
  let payload;
  try { payload = getHtmlAndData(html); } catch (e) {
    const hist = latestSafeIndexFromHistory();
    if (!hist) throw e;
    html = hist.html;
    source = `git:${hist.commit}`;
    payload = getHtmlAndData(html);
  }
  if (!isSafeData(payload.data)) {
    const hist = latestSafeIndexFromHistory();
    if (!hist) throw new Error('current embedded dataset unsafe and no safe historical index found');
    html = hist.html;
    source = `git:${hist.commit}`;
    payload = getHtmlAndData(html);
  }
  return {...payload, source};
}
function profileBlob(item){
  return norm([item && item.id, item && item.slug, item && item.name, item && item.canonicalName, item && item.roleTitle, item && item.organization, item && item.country, item && item.countryName, item && item.countryFocus, item && item.countryFocusCode, item && item.profileLine, Array.isArray(item && item.profileLines) ? item.profileLines.map(x=>x && x.text || JSON.stringify(x)).join(' ') : ''].join(' '));
}
function matchesTarget(item, target){
  const text = profileBlob(item);
  const allOk = !target.matchAll || target.matchAll.every(t => text.includes(norm(t)));
  const anyOk = !target.matchAny || target.matchAny.some(t => text.includes(norm(t)));
  return allOk && anyOk;
}
function anchorObj(a){ return {label:a.label, city:a.city, countryCode:a.countryCode, countryName:a.countryName, lat:a.lat, lng:a.lng, precision:'city', type:'institutional_base', privacy:'city-level public institutional base only'}; }
function isBadImage(v){ return !v || /no image|placeholder|missing|default|transparent|blank/i.test(String(v)); }
function applyTarget(item, target){
  const a = target.anchor; const anchor = anchorObj(a);
  item.countryFocus = a.countryCode;
  item.countryFocusCode = a.countryCode;
  item.countryCode = a.countryCode;
  item.countryName = a.countryName;
  item.country = a.countryName;
  item.homeRegion = a.region;
  item.region = item.region || a.region;
  item.locationStatus = 'institutional_base_city_level';
  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;
  item.baseLocation = anchor;
  item.institutionalBase = anchor;
  item.lat = a.lat; item.lng = a.lng; item.lon = a.lng; item.long = a.lng;
  item.latitude = a.lat; item.longitude = a.lng;
  item.homeLat = a.lat; item.homeLng = a.lng; item.homeLon = a.lng; item.homeLongitude = a.lng;
  item.mapLat = a.lat; item.mapLng = a.lng; item.mapLon = a.lng; item.mapLongitude = a.lng;
  item.anchorLat = a.lat; item.anchorLng = a.lng; item.anchorLon = a.lng; item.anchorLongitude = a.lng;
  item.coordinates = {lat:a.lat, lng:a.lng};
  item.geo = {lat:a.lat, lng:a.lng, city:a.city, countryCode:a.countryCode, countryName:a.countryName};
  item.position = {lat:a.lat, lng:a.lng};
  item.flagAudit = {...(item.flagAudit || {}), code:a.countryCode, countryCode:a.countryCode, countryName:a.countryName, label:a.countryName, status:'country flag'};
  item.flagCode = a.countryCode; item.countryFlagCode = a.countryCode;
  if (target.organization) item.organization = target.organization;
  if (target.orgMark) item.orgMark = target.orgMark;
  if (target.imageUrl && isBadImage(item.imageUrl)) { item.imageUrl = target.imageUrl; item.imageProvider = 'curated public image fallback'; }
  if (item.imageAudit && target.imageUrl && isBadImage(item.imageAudit.status)) item.imageAudit.status = 'curated-fallback';
}
function walk(value, path, cb){
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((x,i)=>walk(x, `${path}[${i}]`, cb)); return; }
  cb(value, path);
  for (const [k,v] of Object.entries(value)) if (v && typeof v === 'object') walk(v, `${path}.${k}`, cb);
}
function isProfileLike(obj){ return obj && typeof obj === 'object' && !Array.isArray(obj) && (obj.id || obj.slug || obj.name || obj.canonicalName || obj.roleTitle || obj.profileLine || obj.wikidataId); }
function repairAnchors(data, targets){
  const fixes = [];
  walk(data, 'data', (obj, p) => {
    if (!isProfileLike(obj)) return;
    for (const t of targets) {
      if (!matchesTarget(obj, t)) continue;
      const before = {name:obj.canonicalName || obj.name || null, countryFocusCode:obj.countryFocusCode || obj.countryFocus || null, city:obj.homeBases && obj.homeBases[0] && obj.homeBases[0].city || obj.location && obj.location.city || null, imageUrl:obj.imageUrl || null};
      applyTarget(obj, t);
      fixes.push({target:t.key, path:p, before, after:{countryFocusCode:t.anchor.countryCode, city:t.anchor.city, imageUrl:obj.imageUrl || null}});
      break;
    }
  });
  return fixes;
}
function isFakeEventObject(obj){
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const title = String(obj.title || obj.name || obj.label || '');
  const id = String(obj.id || '');
  const status = String(obj.status || '');
  const attendee = String(obj.attendeeMode || '');
  const eventish = ('startsAt' in obj) || ('endsAt' in obj) || ('location' in obj) || /event|watch|agenda|diary|visit/i.test(title + ' ' + id + ' ' + status + ' ' + attendee);
  if (!eventish) return false;
  const hay = [id,title,status,attendee,obj.type,obj.summary,obj.whyItMatters].join(' ');
  if (FAKE_ID_RE.test(id)) return true;
  if (/source-watch/i.test(status) || /source-watch/i.test(attendee)) return true;
  if (FAKE_TITLE_RE.test(hay)) return true;
  return false;
}
function filterDeep(value, removed, path='data'){
  if (Array.isArray(value)) {
    const out = [];
    for (let i=0;i<value.length;i++) {
      const item = value[i];
      if (isFakeEventObject(item)) { removed.push({path:`${path}[${i}]`, id:item.id || null, title:item.title || item.name || null}); continue; }
      out.push(filterDeep(item, removed, `${path}[${i}]`));
    }
    return out;
  }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = filterDeep(value[k], removed, `${path}.${k}`);
  }
  return value;
}
function rowKey(row){ return String(row && (row.id || row.slug || row.wikidataId || row.canonicalName || row.name) || '').toLowerCase(); }
function dedupeArrayByKey(rows, keyFn){
  const out = []; const seen = new Set(); const removed = [];
  for (const row of arr(rows)) {
    const key = keyFn(row);
    if (!key) { out.push(row); continue; }
    if (seen.has(key)) { removed.push({id:row.id || null, name:row.canonicalName || row.name || null}); continue; }
    seen.add(key); out.push(row);
  }
  return {out, removed};
}
function normalizeCollections(data){
  const removed = {};
  for (const k of ['people','roster','expansionRoster','priorityExpansion','watchlistExamples']) {
    if (!Array.isArray(data[k])) continue;
    const r = dedupeArrayByKey(data[k], rowKey);
    data[k] = r.out; removed[k] = r.removed;
  }
  if (Array.isArray(data.topRoster)) {
    let top = data.topRoster.filter(r => Number(r.rank || 9999) <= 20 && !/rafael\s+(mariano\s+)?grossi/i.test([r && r.id, r && r.slug, r && r.name, r && r.canonicalName].join(' ')));
    const r = dedupeArrayByKey(top, rowKey);
    data.topRoster = r.out.slice(0,20);
    removed.topRoster = r.removed;
  }
  return removed;
}
async function enrichImagesFromWikidata(data, limit=120){
  const rows = [];
  for (const k of ['people','roster','topRoster','expansionRoster']) for (const row of arr(data[k])) if (row && /^Q\d+$/.test(String(row.wikidataId || '')) && isBadImage(row.imageUrl)) rows.push(row);
  let fixed = 0;
  const unique = [];
  const seen = new Set();
  for (const row of rows) { if (seen.has(row.wikidataId)) continue; seen.add(row.wikidataId); unique.push(row); }
  for (const row of unique.slice(0, limit)) {
    try {
      const controller = new AbortController(); const t = setTimeout(()=>controller.abort(), 3000);
      const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${row.wikidataId}.json`, {signal: controller.signal, headers:{'user-agent':'ParleyMap image hygiene'}});
      clearTimeout(t);
      if (!res.ok) continue;
      const j = await res.json();
      const file = j.entities && j.entities[row.wikidataId] && j.entities[row.wikidataId].claims && j.entities[row.wikidataId].claims.P18 && j.entities[row.wikidataId].claims.P18[0] && j.entities[row.wikidataId].claims.P18[0].mainsnak && j.entities[row.wikidataId].claims.P18[0].mainsnak.datavalue && j.entities[row.wikidataId].claims.P18[0].mainsnak.datavalue.value;
      if (!file) continue;
      const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
      const qid = row.wikidataId;
      walk(data, 'data', (obj) => { if (obj && obj.wikidataId === qid && isBadImage(obj.imageUrl)) { obj.imageUrl = url; obj.imageProvider = 'Wikimedia Commons via Wikidata P18'; fixed++; } });
    } catch {}
  }
  return fixed;
}
function collectTextCandidates(){
  const candidates = [];
  for (const p of ['index.html','index.template.html','privacy.html','impressum.html','contact.html','about.html','data/demo.json']) candidates.push(readFileSafe(p));
  try {
    const commits = cp.execSync('git rev-list --all', {encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim().split(/\s+/).filter(Boolean).slice(0,300);
    for (const c of commits) {
      for (const p of ['index.html','index.template.html','privacy.html','impressum.html','ads.txt']) {
        const txt = gitShow(`${c}:${p}`);
        if (txt) candidates.push(txt);
      }
    }
  } catch {}
  return candidates.join('\n');
}
function discoverAdsense(inputs){
  const all = collectTextCandidates();
  const inputPub = String(inputs.publisher || '').trim();
  const inputHeader = String(inputs.headerSlot || '').trim();
  const inputSidebar = String(inputs.sidebarSlot || '').trim();
  const pubs = new Set();
  if (inputPub) pubs.add(inputPub);
  for (const m of all.matchAll(/ca-pub-\d{10,30}/g)) pubs.add(m[0]);
  for (const m of all.matchAll(/\bpub-\d{10,30}\b/g)) pubs.add('ca-' + m[0]);
  const slots = [];
  if (inputHeader) slots.push(inputHeader);
  if (inputSidebar) slots.push(inputSidebar);
  for (const m of all.matchAll(/data-ad-slot=["']([^"']+)["']/g)) slots.push(m[1]);
  const cleanSlots = [...new Set(slots.map(s=>String(s).trim()).filter(s=>/^\d{4,30}$/.test(s)))];
  const client = [...pubs].find(x=>/^ca-pub-\d{10,30}$/.test(x)) || '';
  const pub = client ? client.replace(/^ca-/, '') : '';
  return {client, pub, headerSlot: cleanSlots[0] || '', sidebarSlot: cleanSlots[1] || '', slots: cleanSlots};
}
function ensureHeadTag(html, tagPattern, tag){
  if (tagPattern.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + '\n' + tag);
  return tag + '\n' + html;
}
function ensureAdsense(html, ads){
  if (!ads.client || !ads.headerSlot || !ads.sidebarSlot) return html;
  html = ensureHeadTag(html, /google-adsense-account/i, `<meta name="google-adsense-account" content="${ads.client}">`);
  html = ensureHeadTag(html, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i, `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>`);
  const unitBlock = `
<!-- ParleyMap AdSense units: preserved IDs -->
<div id="parleymap-adsense-header" class="parleymap-adsense-unit parleymap-adsense-header" style="display:block;min-height:90px;margin:8px auto;text-align:center;max-width:1200px;">
  <ins class="adsbygoogle" style="display:block" data-ad-client="${ads.client}" data-ad-slot="${ads.headerSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>
<div id="parleymap-adsense-sidebar" class="parleymap-adsense-unit parleymap-adsense-sidebar" style="display:block;min-height:250px;margin:8px auto;text-align:center;max-width:360px;">
  <ins class="adsbygoogle" style="display:block" data-ad-client="${ads.client}" data-ad-slot="${ads.sidebarSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>
<script>
(function(){
  function pushAds(){ try { (window.adsbygoogle = window.adsbygoogle || []).push({}); (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pushAds); else pushAds();
})();
</script>
<!-- /ParleyMap AdSense units -->`;
  const hasHeaderSlot = html.includes(`data-ad-slot="${ads.headerSlot}"`) || html.includes(`data-ad-slot='${ads.headerSlot}'`);
  const hasSidebarSlot = html.includes(`data-ad-slot="${ads.sidebarSlot}"`) || html.includes(`data-ad-slot='${ads.sidebarSlot}'`);
  if (!hasHeaderSlot || !hasSidebarSlot) {
    if (/<body[^>]*>/i.test(html)) html = html.replace(/<body[^>]*>/i, m => m + unitBlock);
    else html += unitBlock;
  }
  return html;
}
function cleanLegalPages(ads){
  const nav = '<p><a href="/">ParleyMap</a> · <a href="/privacy.html">Privacy</a> · <a href="/impressum.html">Impressum</a> · <a href="/contact.html">Contact</a> · <a href="/methodology.html">Methodology</a> · <a href="/data-sources.html">Data sources</a></p>';
  const baseHead = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${ads.client ? `\n<meta name="google-adsense-account" content="${ads.client}">` : ''}</head><body><main style="max-width:840px;margin:40px auto;font-family:system-ui,Arial,sans-serif;line-height:1.55;padding:0 20px;">${nav}`;
  const foot = '</main></body></html>\n';
  fs.writeFileSync('privacy.html', baseHead('Privacy - ParleyMap') + '<h1>Privacy</h1><p>ParleyMap uses public-source information to show public appearances and institutional presence. The site does not publish private addresses, hotels, residences, hospitals, leaked itineraries, or live proximity tracking.</p><p>The site may use analytics, hosting logs, and advertising technology after consent where required. Advertising partners may use cookies or similar technologies for ad delivery and measurement.</p><p>Contact: contact@parleymap.com</p>' + foot);
  fs.writeFileSync('impressum.html', baseHead('Impressum - ParleyMap') + '<h1>Impressum</h1><p>ParleyMap is a public-source presence intelligence demo. It maps official, host-public, and clearly source-backed public appearances.</p><p>Responsible contact: contact@parleymap.com</p><p>No private movement tracking is published.</p>' + foot);
  fs.writeFileSync('contact.html', baseHead('Contact - ParleyMap') + '<h1>Contact</h1><p>For corrections, source questions, privacy requests, or advertising questions, contact: contact@parleymap.com</p>' + foot);
  fs.writeFileSync('about.html', baseHead('About - ParleyMap') + '<h1>About ParleyMap</h1><p>ParleyMap maps where public influence is forming using official and host-public source records. It focuses on public appearances, official meetings, summits, speeches, and public events.</p>' + foot);
  fs.writeFileSync('methodology.html', baseHead('Methodology - ParleyMap') + '<h1>Methodology</h1><p>Records require a public source and a specific person, date, city, event title, and source pack. Generic watch cards, homepages, profile pages, and unsourced predictions are not treated as dated appearances.</p>' + foot);
  fs.writeFileSync('data-sources.html', baseHead('Data sources - ParleyMap') + '<h1>Data sources</h1><p>Preferred sources are official diaries, official press rooms, host event pages, public summit records, speeches, readouts, and public institutional records. Secondary sources can provide context, but they do not replace official or host-public source packs for future records.</p>' + foot);
}
function installRuntimeGuard(html, targets){
  const marker = 'PARLEYMAP_TRUE_FINAL_RUNTIME_GUARD';
  if (html.includes(marker)) return html;
  const slimTargets = targets.map(t => ({key:t.key, matchAll:t.matchAll, matchAny:t.matchAny, anchor:t.anchor, imageUrl:t.imageUrl || '', organization:t.organization || '', orgMark:t.orgMark || null}));
  const guard = `<script id="parleymap-true-final-runtime-guard">
(function(){
  var MARKER = '${marker}';
  if (window[MARKER]) return; window[MARKER] = true;
  var targets = ${JSON.stringify(slimTargets)};
  function norm(v){ return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function blob(o){ return norm([o&&o.id,o&&o.slug,o&&o.name,o&&o.canonicalName,o&&o.roleTitle,o&&o.organization,o&&o.country,o&&o.countryName,o&&o.countryFocus,o&&o.countryFocusCode,o&&o.profileLine].join(' ')); }
  function match(o,t){ var b=blob(o); return (!t.matchAll || t.matchAll.every(function(x){return b.indexOf(norm(x))>=0;})) && (!t.matchAny || t.matchAny.some(function(x){return b.indexOf(norm(x))>=0;})); }
  function anchor(a){ return {label:a.label,city:a.city,countryCode:a.countryCode,countryName:a.countryName,lat:a.lat,lng:a.lng,precision:'city',type:'institutional_base',privacy:'city-level public institutional base only'}; }
  function apply(o,t){ var a=t.anchor, an=anchor(a); o.countryFocus=a.countryCode;o.countryFocusCode=a.countryCode;o.countryCode=a.countryCode;o.countryName=a.countryName;o.country=a.countryName;o.homeRegion=a.region;o.locationStatus='institutional_base_city_level';o.homeBases=[an];o.homeBase=an;o.mapAnchor=an;o.anchorLocation=an;o.baseLocation=an;o.institutionalBase=an;o.lat=a.lat;o.lng=a.lng;o.lon=a.lng;o.latitude=a.lat;o.longitude=a.lng;o.mapLat=a.lat;o.mapLng=a.lng;o.homeLat=a.lat;o.homeLng=a.lng;o.anchorLat=a.lat;o.anchorLng=a.lng;o.coordinates={lat:a.lat,lng:a.lng};o.geo={lat:a.lat,lng:a.lng,city:a.city,countryCode:a.countryCode,countryName:a.countryName};o.flagAudit=Object.assign({},o.flagAudit||{},{code:a.countryCode,countryCode:a.countryCode,countryName:a.countryName,label:a.countryName,status:'country flag'}); if(t.imageUrl && !o.imageUrl) o.imageUrl=t.imageUrl; if(t.organization) o.organization=t.organization; if(t.orgMark) o.orgMark=t.orgMark; }
  function fake(o){ var s=[o&&o.id,o&&o.title,o&&o.name,o&&o.status,o&&o.attendeeMode,o&&o.type].join(' '); return /(source-watch|city of london finance diplomacy watch|iaea nuclear diplomacy watch|think[- ]?tank leadership events watch|royal diaries|state[- ]?visit watch|generic watch|homepage|profile page|fact sheet|faq|programme|sitemap|cookie|privacy|terms)/i.test(s) && ('startsAt' in (o||{}) || 'location' in (o||{}) || /watch/i.test(s)); }
  function walk(v){ if(!v||typeof v!=='object') return v; if(Array.isArray(v)){ var out=[]; v.forEach(function(x){ if(!fake(x)) out.push(walk(x)); }); return out; } targets.forEach(function(t){ if(match(v,t)) apply(v,t); }); Object.keys(v).forEach(function(k){ if(v[k]&&typeof v[k]==='object') v[k]=walk(v[k]); }); return v; }
  try { var el=document.getElementById('demo-data'); if(el){ var d=JSON.parse(el.textContent); d=walk(d); if(Array.isArray(d.topRoster)) d.topRoster=d.topRoster.filter(function(r){return Number(r.rank||9999)<=20;}).slice(0,20); el.textContent=JSON.stringify(d); } } catch(e) { console.warn('ParleyMap runtime guard skipped', e); }
})();
</script>`;
  const closeIdx = html.indexOf(CLOSE);
  if (closeIdx >= 0) {
    const after = closeIdx + CLOSE.length;
    return html.slice(0, after) + '\n' + guard + html.slice(after);
  }
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + '\n' + guard);
  return guard + '\n' + html;
}
function finalAudit(data, html, ads, requireAds){
  const problems = [];
  const targets = JSON.parse(readFileSafe('data/curated-anchors.json')).targets;
  const critical = ['claudia_sheinbaum','pope_leo_xiv','prabowo_subianto','rafael_grossi'];
  for (const key of critical) {
    const t = targets.find(x=>x.key===key); let found = false; let ok = false;
    walk(data, 'data', (obj) => { if (!isProfileLike(obj) || !matchesTarget(obj,t)) return; found=true; const code = String(obj.countryFocusCode || obj.countryFocus || obj.countryCode || obj.flagAudit && obj.flagAudit.code || '').toUpperCase(); const hb = arr(obj.homeBases)[0] || obj.mapAnchor || obj.homeBase || {}; const city = norm(hb.city || obj.city || obj.location && obj.location.city); if (code === t.anchor.countryCode && city === norm(t.anchor.city)) ok = true; });
    if (!found) problems.push(`${key}: not found`); else if (!ok) problems.push(`${key}: wrong anchor`);
  }
  const allText = JSON.stringify(data);
  for (const p of ['City of London finance diplomacy watch','IAEA nuclear diplomacy watch','Think-tank leadership events watch','Royal diaries and state-visit watch']) if (allText.includes(p)) problems.push(`fake row remains: ${p}`);
  const grossiTop = arr(data.topRoster).filter(r => /rafael\s+(mariano\s+)?grossi/i.test([r.name,r.canonicalName,r.slug,r.id].join(' '))).length;
  if (grossiTop > 0) problems.push(`Rafael Grossi remains in topRoster ${grossiTop} time(s)`);
  if (!html.includes('PARLEYMAP_TRUE_FINAL_RUNTIME_GUARD')) problems.push('runtime guard missing');
  if (requireAds) {
    if (!ads.client || !ads.headerSlot || !ads.sidebarSlot) problems.push('AdSense IDs missing');
    if (!/google-adsense-account/i.test(html)) problems.push('google-adsense-account meta missing');
    if (!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html)) problems.push('AdSense loader missing');
    if (!/adsbygoogle/i.test(html)) problems.push('adsbygoogle unit missing');
    if (!fs.existsSync('ads.txt')) problems.push('ads.txt missing');
  }
  return problems;
}
async function main(){
  mkdirs();
  const inputs = {publisher:process.env.ADSENSE_PUBLISHER_ID || '', headerSlot:process.env.ADSENSE_HEADER_SLOT_ID || '', sidebarSlot:process.env.ADSENSE_SIDEBAR_SLOT_ID || ''};
  const anchors = JSON.parse(readFileSafe('data/curated-anchors.json')).targets;
  const payload = loadPayload();
  const before = coreCounts(payload.data);
  let data = shallowClone(payload.data);
  validateCore(data, 'before');
  const removedFake = [];
  data = filterDeep(data, removedFake);
  const deduped = normalizeCollections(data);
  const anchorFixes = repairAnchors(data, anchors);
  const imageFixes = await enrichImagesFromWikidata(data);
  data.meta = {...(data.meta || {}), lastTrueFinalFix: new Date().toISOString(), trueFinalFixStatus: `removed ${removedFake.length} fake rows; applied ${anchorFixes.length} anchor patches`};
  validateCore(data, 'after-data');
  let html = setData(payload, data);
  const ads = discoverAdsense(inputs);
  if (ads.client && ads.headerSlot && ads.sidebarSlot) {
    html = ensureAdsense(html, ads);
    fs.writeFileSync('ads.txt', `google.com, ${ads.pub}, DIRECT, f08c47fec0942fa0\n`);
  }
  html = installRuntimeGuard(html, anchors);
  cleanLegalPages(ads);
  const problems = finalAudit(data, html, ads, REQUIRE_ADSENSE);
  const after = coreCounts(data);
  const report = {generatedAt:new Date().toISOString(), mode:MODE, restoredFrom:payload.source, before, after, removedFake, deduped, anchorFixesCount:anchorFixes.length, imageFixes, adsense:{client:ads.client || null, publisherId:ads.pub || null, headerSlot:ads.headerSlot || null, sidebarSlot:ads.sidebarSlot || null, slotsFound:ads.slots}, auditProblems:problems, status: problems.length ? 'failed_audit_no_write' : 'true_final_fix_applied'};
  writeJson(`${REPORT_DIR}/true-final-fix-report.json`, report);
  writeJson(`${REPORT_DIR}/adsense-preserve-audit-report.json`, {generatedAt:report.generatedAt, status: ads.client && ads.headerSlot && ads.sidebarSlot ? 'adsense_preserved_and_audited' : 'adsense_ids_not_found_no_fake_ids_injected', client:ads.client || null, publisherId:ads.pub || null, headerSlot:ads.headerSlot || null, sidebarSlot:ads.sidebarSlot || null, slotsFound:ads.slots});
  writeJson(`${REPORT_DIR}/final-hard-audit-report.json`, {generatedAt:report.generatedAt, status: problems.length ? 'audit_failed' : 'audit_passed', problems});
  const summary = ['# ParleyMap true final fix','',`Generated: ${report.generatedAt}`,`Status: ${report.status}`,`Restored from: ${payload.source}`,'','## Counts','',`people: ${before.people} -> ${after.people}`,`roster: ${before.roster} -> ${after.roster}`,`expansionRoster: ${before.expansionRoster} -> ${after.expansionRoster}`,`appearances: ${before.appearances} -> ${after.appearances}`,`categories: ${before.categories} -> ${after.categories}`,'','## Cleanup','',`Fake rows removed: ${removedFake.length}`,`Anchor patches: ${anchorFixes.length}`,`Image fixes from Wikidata: ${imageFixes}`,'','## AdSense','',`Client: ${ads.client || 'not found'}`,`Publisher ID: ${ads.pub || 'not found'}`,`Header slot: ${ads.headerSlot || 'not found'}`,`Sidebar slot: ${ads.sidebarSlot || 'not found'}`,'','## Audit','',problems.length ? problems.map(p=>`- ${p}`).join('\n') : 'audit_passed'].join('\n') + '\n';
  fs.writeFileSync(`${REPORT_DIR}/LATEST_RUN_SUMMARY.md`, summary);
  if (problems.length) { console.error(summary); process.exit(1); }
  fs.writeFileSync(INDEX_PATH, html);
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(summary);
}
main().catch(err => { mkdirs(); writeJson(`${REPORT_DIR}/true-final-fix-error.json`, {generatedAt:new Date().toISOString(), error:String(err.stack || err.message || err)}); console.error(err); process.exit(1); });
