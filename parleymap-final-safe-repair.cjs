const fs = require('fs');
const cp = require('child_process');

const INDEX_PATH = 'index.html';
const DATA_PATH = 'data/demo.json';
const REPORT_PATH = 'data/diagnostics/final-safe-repair-report.json';
const AUDIT_PATH = 'data/diagnostics/final-hard-audit-report.json';
const ADSENSE_REPORT_PATH = 'data/diagnostics/adsense-preserve-audit-report.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const ANCHORS_PATH = 'data/curated-anchors.json';

const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = '</' + 'script>';
const MIN_COUNTS = { people: 90, roster: 190, expansionRoster: 100, appearances: 450, categories: 10 };
const CRITICAL_KEYS = ['claudia_sheinbaum', 'pope_leo_xiv', 'prabowo_subianto', 'rafael_grossi'];

function sh(cmd, opts = {}) {
  try { return cp.execSync(cmd, { encoding: 'utf8', stdio: ['ignore','pipe','pipe'], ...opts }); }
  catch { return ''; }
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function norm(v) { return String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function compact(v) { return norm(v).replace(/ /g, '-'); }
function readFile(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }
function isThinIndex(html) { return !html || html.trim() === 'parleymap.com' || (!html.includes(OPEN) && html.length < 50000) || /^\.nojekyll\s+0\s+/m.test(html.trim()); }
function getDemoRange(html) { const s = html.indexOf(OPEN); if (s < 0) return null; const js = s + OPEN.length; const e = html.indexOf(CLOSE, js); if (e < 0) return null; return { jsonStart: js, jsonEnd: e, jsonText: html.slice(js, e).trim() }; }
function parseEmbedded(html) { const r = getDemoRange(html); if (!r) return null; return JSON.parse(r.jsonText); }
function counts(data) { return Object.fromEntries(['people','roster','topRoster','expansionRoster','appearances','categories'].map(k => [k, Array.isArray(data?.[k]) ? data[k].length : null])); }
function validateShape(data, label) {
  if (!data || typeof data !== 'object') throw new Error(`${label}: data missing`);
  for (const [k, min] of Object.entries(MIN_COUNTS)) {
    if (!Array.isArray(data[k])) throw new Error(`${label}: ${k} is not an array`);
    if (data[k].length < min) throw new Error(`${label}: ${k} count too low ${data[k].length} < ${min}`);
  }
  if (!data.meta || typeof data.meta !== 'object' || Array.isArray(data.meta)) throw new Error(`${label}: meta missing`);
}
function isPolluted(data) {
  const c = counts(data);
  const json = JSON.stringify(data).toLowerCase();
  return c.people > 115 || json.includes('vincent auriol') || json.includes('paul deschanel') || json.includes('gaston doumergue');
}
function isSafeFullIndex(html) {
  if (isThinIndex(html) || html.length < 100000) return false;
  const data = parseEmbedded(html);
  if (!data) return false;
  try { validateShape(data, 'candidate'); } catch { return false; }
  return !isPolluted(data);
}
function gitShow(pathspec) { return sh(`git show ${pathspec}`); }
function historyShas(path) { return sh(`git log --format=%H -- ${path}`).split(/\n/).map(s => s.trim()).filter(Boolean); }
function findSafeIndex() {
  const current = readFile(INDEX_PATH);
  if (isSafeFullIndex(current)) return { html: current, source: 'current index.html' };
  const shas = historyShas(INDEX_PATH);
  for (const sha of shas) {
    const html = gitShow(`${sha}:${INDEX_PATH}`);
    if (isSafeFullIndex(html)) return { html, source: `git history ${sha.slice(0, 12)}` };
  }
  throw new Error('No safe full index.html found in git history. Refusing to write a thin or partial index.html.');
}
function extractAds(text) {
  const clients = [...new Set((text.match(/ca-pub-[0-9]{10,}/g) || []).map(s => s.trim()))];
  const pubs = [...new Set((text.match(/pub-[0-9]{10,}/g) || []).map(s => s.trim()).filter(s => !clients.includes('ca-' + s)))];
  const slots = [...new Set([...text.matchAll(/data-ad-slot\s*=\s*["']([^"']{3,})["']/gi)].map(m => m[1]).filter(s => !/slot|your|xxxx/i.test(s)))];
  return { clients, pubs, slots };
}
function findAdsense() {
  const seen = [];
  const add = (source, text) => { if (text) seen.push({ source, ...extractAds(text) }); };
  add('current index.html', readFile(INDEX_PATH));
  add('current index.template.html', readFile('index.template.html'));
  add('current ads.txt', readFile('ads.txt'));
  for (const p of ['index.html','index.template.html','ads.txt']) {
    for (const sha of historyShas(p).slice(0, 80)) add(`${sha.slice(0,12)}:${p}`, gitShow(`${sha}:${p}`));
  }
  const clients = [...new Set(seen.flatMap(x => x.clients || []))];
  const pubs = [...new Set(seen.flatMap(x => x.pubs || []))];
  const slots = [...new Set(seen.flatMap(x => x.slots || []))];
  const client = clients[0] || (pubs[0] ? 'ca-' + pubs[0] : '');
  const pub = client ? client.replace(/^ca-/, '') : (pubs[0] || '');
  return { client, pub, slots: slots.slice(0, 2), sources: seen.filter(x => (x.clients?.length || x.pubs?.length || x.slots?.length)) };
}
function profileBlob(o) { return norm([o.id,o.slug,o.name,o.canonicalName,o.personName,o.roleTitle,o.organization,o.country,o.countryName,o.countryFocus,o.countryFocusCode,o.profileLine,Array.isArray(o.profileLines)?o.profileLines.map(x=>x.text||x).join(' '):''].join(' ')); }
function matchAnchor(obj, anchor) {
  const text = profileBlob(obj);
  if (anchor.matchAll && !anchor.matchAll.every(t => text.includes(norm(t)))) return false;
  if (anchor.matchAny && !anchor.matchAny.some(t => text.includes(norm(t)))) return false;
  if (anchor.roleAny && !anchor.roleAny.some(t => text.includes(norm(t)))) return false;
  return Boolean(anchor.matchAll || anchor.matchAny || anchor.roleAny);
}
function makeAnchor(a) {
  return { label: `${a.city} institutional base`, city: a.city, countryCode: a.countryCode, countryName: a.countryName, lat: a.lat, lng: a.lng, precision: 'city', type: 'institutional_base', privacy: 'city-level public institutional base only' };
}
function hasPlaceholderImage(o) { return !o.imageUrl || /placeholder|missing|no image|transparent|avatar/i.test(String(o.imageUrl)); }
function applyAnchor(o, a, collection) {
  const base = makeAnchor(a);
  o.homeBases = [base]; o.homeBase = base; o.mapAnchor = base; o.anchorLocation = base; o.baseLocation = base; o.institutionalBase = base;
  o.lat = a.lat; o.lng = a.lng; o.lon = a.lng; o.long = a.lng; o.latitude = a.lat; o.longitude = a.lng; o.homeLat = a.lat; o.homeLng = a.lng; o.mapLat = a.lat; o.mapLng = a.lng; o.anchorLat = a.lat; o.anchorLng = a.lng; o.coordinates = { lat: a.lat, lng: a.lng }; o.geo = { lat: a.lat, lng: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  o.countryFocus = a.countryCode; o.countryFocusCode = a.countryCode; o.countryCode = a.countryCode; o.countryName = a.countryName; o.country = a.countryName; o.homeRegion = a.region; o.locationStatus = 'institutional_base_city_level';
  o.flagAudit = { ...(o.flagAudit || {}), code: a.countryCode, countryCode: a.countryCode, countryName: a.countryName, label: a.countryName, status: 'country flag' };
  o.flagCode = a.countryCode; o.countryFlagCode = a.countryCode;
  if (a.organization) { o.organization = o.organization || a.organization; o.orgMark = { ...(o.orgMark || {}), label: a.organization }; }
  if (a.imageUrl && hasPlaceholderImage(o)) { o.imageUrl = a.imageUrl; o.imageProvider = 'curated public image fallback'; o.visualAuditStatus = 'curated fallback; verify license before redistribution'; o.imageAudit = { status: 'curated-fallback', source: a.imageUrl }; }
  o.lastAnchorAudit = new Date().toISOString();
  o.anchorAuditStatus = `forced_${a.key || compact(a.city)}`;
}
function traverse(obj, cb, path='data') { if (!obj || typeof obj !== 'object') return; if (Array.isArray(obj)) { obj.forEach((x,i)=>traverse(x, cb, `${path}[${i}]`)); return; } cb(obj, path); for (const [k,v] of Object.entries(obj)) if (v && typeof v === 'object') traverse(v, cb, `${path}.${k}`); }
function isProfileLike(o) { return o && typeof o === 'object' && !Array.isArray(o) && (o.canonicalName || o.name || o.slug || o.roleTitle || o.profileLine || o.wikidataId); }
function cleanFakeEvents(data, fakePatterns) {
  const removed = [];
  const arraysToClean = [];
  traverse(data, (o, path) => { for (const [k,v] of Object.entries(o)) if (Array.isArray(v) && /appearances|events|agendas|catalog|alerts|signals|watch|timeline|records/i.test(k)) arraysToClean.push({ arr:v, path:`${path}.${k}` }); });
  const fakeRe = new RegExp(fakePatterns.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '|\\bwatch\\b|source-watch|not attendance claim|homepage|faq|fact sheet|programme|program', 'i');
  for (const {arr,path} of arraysToClean) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const row = arr[i]; if (!row || typeof row !== 'object') continue;
      const text = [row.id,row.title,row.type,row.status,row.attendeeMode,row.summary,row.whyItMatters,Array.isArray(row.sourcePack)?row.sourcePack.map(s=>s.label+' '+s.url+' '+s.type).join(' '):''].join(' ');
      const dated = row.startsAt || row.date || row.endsAt;
      const explicitlyFake = fakeRe.test(text) && (/watch|source-watch|not attendance|homepage|faq|fact sheet|programme|program/i.test(text) || String(row.id||'').startsWith('watch-'));
      if (dated && explicitlyFake) { removed.push({ path, id: row.id || null, title: row.title || null, status: row.status || null }); arr.splice(i,1); }
    }
  }
  return removed;
}
function dedupeGrossi(data) {
  const actions = [];
  const targetRe = /rafael.*grossi|grossi/i;
  for (const listName of ['topRoster','priorityExpansion','watchlistExamples']) {
    const arr = data[listName]; if (!Array.isArray(arr)) continue;
    for (let i = arr.length - 1; i >= 0; i--) {
      const row = arr[i];
      if (row && targetRe.test([row.id,row.name,row.canonicalName,row.slug].join(' '))) { actions.push({ action:'removed_duplicate_visible_grossi', collection:listName, index:i, id:row.id||null, name:row.canonicalName||row.name||null }); arr.splice(i,1); }
    }
  }
  for (const listName of ['roster','expansionRoster','people']) {
    const arr = data[listName]; if (!Array.isArray(arr)) continue;
    const seen = new Set();
    for (let i = arr.length - 1; i >= 0; i--) {
      const row = arr[i]; if (!row) continue;
      const id = String(row.id || row.slug || row.wikidataId || '').toLowerCase();
      if (!id) continue;
      if (seen.has(id)) { actions.push({ action:'removed_intra_collection_duplicate', collection:listName, index:i, id }); arr.splice(i,1); } else seen.add(id);
    }
  }
  return actions;
}
function installAnchorGuard(html, anchors) {
  const scriptId = 'parleymap-runtime-anchor-guard';
  const overrides = anchors.map(a => ({ key:a.key, matchAll:a.matchAll||null, matchAny:a.matchAny||null, roleAny:a.roleAny||null, lat:a.lat, lng:a.lng, city:a.city, countryName:a.countryName }));
  const script = `\n<script id="${scriptId}">\n(function(){\n  if (window.__PARLEYMAP_RUNTIME_ANCHOR_GUARD__) return;\n  window.__PARLEYMAP_RUNTIME_ANCHOR_GUARD__ = true;\n  var anchors = ${JSON.stringify(overrides)};\n  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function hit(text,a){text=norm(text); if(a.matchAll && !a.matchAll.every(function(t){return text.indexOf(norm(t))>=0;})) return false; if(a.matchAny && !a.matchAny.some(function(t){return text.indexOf(norm(t))>=0;})) return false; if(a.roleAny && !a.roleAny.some(function(t){return text.indexOf(norm(t))>=0;})) return false; return !!(a.matchAll||a.matchAny||a.roleAny);}\n  function find(text){for(var i=0;i<anchors.length;i++){if(hit(text,anchors[i])) return anchors[i];} return null;}\n  function patchLeaflet(){ if(!window.L || !L.marker || L.marker.__parleyPatched) return; var old=L.marker; L.marker=function(latlng,opts){ var text=(opts&&JSON.stringify(opts))||''; var a=find(text); var m=old.call(this,a?[a.lat,a.lng]:latlng,opts); ['bindTooltip','bindPopup'].forEach(function(fn){ if(typeof m[fn] !== 'function') return; var prev=m[fn]; m[fn]=function(content){ var s= typeof content === 'string' ? content : (content && (content.textContent || content.innerText || content.outerHTML)) || ''; var aa=find(s); if(aa && typeof m.setLatLng==='function') m.setLatLng([aa.lat,aa.lng]); return prev.apply(m,arguments); }; }); return m; }; L.marker.__parleyPatched=true; }\n  patchLeaflet(); var t=setInterval(patchLeaflet,250); setTimeout(function(){clearInterval(t);},15000);\n})();\n</script>\n`;
  html = html.replace(new RegExp(`<script id="${scriptId}"[\\s\\S]*?<\\/script>\\n?`, 'g'), '');
  const r = getDemoRange(html);
  if (r) return html.slice(0, r.jsonEnd + CLOSE.length) + script + html.slice(r.jsonEnd + CLOSE.length);
  return html.replace(/<\/body>/i, script + '</body>');
}
function installAdsense(html, ads) {
  if (!ads.client || ads.slots.length < 2) return { html, installed: false, reason: 'missing client or two slots' };
  const meta = `<meta name="google-adsense-account" content="${ads.client}">`;
  if (!/google-adsense-account/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + '\n  ' + meta);
  const loader = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>`;
  if (!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html)) html = html.replace(/<\/head>/i, '  ' + loader + '\n</head>');
  const guardId = 'parleymap-adsense-slot-guard';
  const guard = `\n<script id="${guardId}">\n(function(){\n  var client=${JSON.stringify(ads.client)}, slots=${JSON.stringify(ads.slots.slice(0,2))};\n  function findBox(kind){var qs=kind==='header'?['[data-ad-zone="header"]','#ad-header','.ad-header','.header-ad','[id*="ad"][id*="header"]','[class*="ad"][class*="header"]']:['[data-ad-zone="sidebar"]','#ad-sidebar','.ad-sidebar','.sidebar-ad','aside [class*="ad"]','[id*="ad"][id*="side"]','[class*="ad"][class*="side"]']; for(var i=0;i<qs.length;i++){var el=document.querySelector(qs[i]); if(el) return el;} return null;}\n  function fill(el,slot){ if(!el || el.querySelector('ins.adsbygoogle')) return; var ins=document.createElement('ins'); ins.className='adsbygoogle'; ins.style.display='block'; ins.setAttribute('data-ad-client',client); ins.setAttribute('data-ad-slot',slot); ins.setAttribute('data-ad-format','auto'); ins.setAttribute('data-full-width-responsive','true'); el.innerHTML=''; el.appendChild(ins); try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){} }\n  function run(){fill(findBox('header'),slots[0]); fill(findBox('sidebar'),slots[1]);}\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run(); setTimeout(run,1500);\n})();\n</script>\n`;
  html = html.replace(new RegExp(`<script id="${guardId}"[\\s\\S]*?<\\/script>\\n?`, 'g'), '');
  html = html.replace(/<\/body>/i, guard + '</body>');
  return { html, installed: true, reason: 'adsense preserved guard installed' };
}
function replaceEmbedded(html, data) {
  const r = getDemoRange(html); if (!r) throw new Error('safe index has no demo-data block');
  return html.slice(0, r.jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + html.slice(r.jsonEnd);
}
function loadBestData(baseHtml) {
  let data = null, source = '';
  if (fs.existsSync(DATA_PATH)) { try { data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); source = DATA_PATH; } catch {} }
  if (!data) { data = parseEmbedded(baseHtml); source = 'safe index embedded data'; }
  validateShape(data, source);
  if (isPolluted(data)) { data = parseEmbedded(baseHtml); source = 'safe history embedded data because current data was polluted'; validateShape(data, source); }
  return { data, source };
}
function audit(data, html, ads, removedFake, dedupeActions, anchorFixes) {
  validateShape(data, 'final');
  const allJson = JSON.stringify(data).toLowerCase();
  const forbidden = ['vincent auriol','city of london finance diplomacy watch','iaea nuclear diplomacy watch','think-tank leadership events watch','royal diaries and state-visit watch'];
  const forbiddenHits = forbidden.filter(x => allJson.includes(x));
  if (forbiddenHits.length) throw new Error('forbidden polluted/fake rows still present: ' + forbiddenHits.join(', '));
  const profileRows = [];
  for (const k of ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples']) if (Array.isArray(data[k])) data[k].forEach((r,i)=>profileRows.push({k,i,r}));
  const anchors = JSON.parse(fs.readFileSync(ANCHORS_PATH,'utf8')).anchors;
  const critical = {};
  for (const key of CRITICAL_KEYS) critical[key] = { found: 0, bad: [] };
  for (const {k,i,r} of profileRows) {
    for (const a of anchors.filter(x=>CRITICAL_KEYS.includes(x.key))) {
      if (!matchAnchor(r,a)) continue;
      critical[a.key].found++;
      const hb = Array.isArray(r.homeBases) ? r.homeBases[0] : r.mapAnchor || r.homeBase || r;
      const d = Math.abs(Number(hb?.lat ?? r.lat) - a.lat) + Math.abs(Number(hb?.lng ?? hb?.lon ?? r.lng ?? r.lon) - a.lng);
      if (!Number.isFinite(d) || d > 1) critical[a.key].bad.push(`${k}[${i}]`);
    }
  }
  for (const [key,v] of Object.entries(critical)) if (!v.found || v.bad.length) throw new Error(`anchor audit failed for ${key}: found ${v.found}, bad ${v.bad.join(',')}`);
  const grossiVisible = profileRows.filter(x => /rafael.*grossi|grossi/i.test([x.r.id,x.r.slug,x.r.name,x.r.canonicalName].join(' ')) && ['roster','topRoster','priorityExpansion','watchlistExamples'].includes(x.k));
  if (grossiVisible.filter(x=>x.k==='topRoster'||x.k==='priorityExpansion'||x.k==='watchlistExamples').length) throw new Error('Rafael Grossi still present in duplicate-prone visible lists outside roster');
  if (!html.includes('id="parleymap-runtime-anchor-guard"')) throw new Error('runtime anchor guard missing');
  const adsOk = ads.client && ads.slots.length >= 2 && fs.existsSync('ads.txt') && /google\.com, pub-[0-9]+, DIRECT, f08c47fec0942fa0/.test(fs.readFileSync('ads.txt','utf8')) && html.includes('google-adsense-account') && html.includes('adsbygoogle') && html.includes(ads.slots[0]) && html.includes(ads.slots[1]);
  return { status: 'audit_passed', counts: counts(data), critical, grossiVisible: grossiVisible.map(x=>`${x.k}[${x.i}]`), adsOk, adsWarning: adsOk ? null : 'AdSense IDs were not found in current files or git history, so fake IDs were not injected.', removedFakeCount: removedFake.length, dedupeActionCount: dedupeActions.length, anchorFixCount: anchorFixes.length };
}

function main() {
  ensureDir('data/diagnostics');
  const started = new Date().toISOString();
  const base = findSafeIndex();
  const { data, source: dataSource } = loadBestData(base.html);
  const before = counts(data);
  const registry = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));
  const removedFake = cleanFakeEvents(data, registry.fakeEventTitlePatterns || []);
  const dedupeActions = dedupeGrossi(data);
  const anchorFixes = [];
  for (const k of ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples','organizationProfiles']) {
    const rows = Array.isArray(data[k]) ? data[k] : [];
    for (let i=0;i<rows.length;i++) {
      const row = rows[i]; if (!isProfileLike(row)) continue;
      for (const a of registry.anchors) {
        if (matchAnchor(row,a)) { const beforeRow = { countryFocusCode: row.countryFocusCode, flagAudit: row.flagAudit, homeBases: row.homeBases, imageUrl: row.imageUrl }; applyAnchor(row,a,k); anchorFixes.push({ key:a.key, collection:k, index:i, id:row.id||null, name:row.canonicalName||row.name||null, before: beforeRow, after: { countryFocusCode: row.countryFocusCode, homeBases: row.homeBases, imageUrl: row.imageUrl } }); break; }
      }
    }
  }
  data.meta = { ...(data.meta || {}), lastDataUpdate: started, lastSafeRepair: started, safeRepairStatus: `removed ${removedFake.length} fake dated watch rows; repaired ${anchorFixes.length} anchors` };
  const ads = findAdsense();
  let html = replaceEmbedded(base.html, data);
  html = installAnchorGuard(html, registry.anchors);
  const adResult = installAdsense(html, ads); html = adResult.html;
  if (ads.client && ads.slots.length >= 2) fs.writeFileSync('ads.txt', `google.com, ${ads.pub}, DIRECT, f08c47fec0942fa0\n`);
  const auditResult = audit(data, html, ads, removedFake, dedupeActions, anchorFixes);
  fs.writeFileSync(INDEX_PATH, html);
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  const after = counts(data);
  const report = { generatedAt: started, status: 'final_safe_repair_applied', baseIndexSource: base.source, dataSource, before, after, removedFake, dedupeActions, anchorFixes, adsense: { clientFound: Boolean(ads.client), client: ads.client || null, slots: ads.slots, sources: ads.sources.slice(0,10).map(s=>s.source), installed: adResult.installed, reason: adResult.reason } };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(auditResult,null,2)+'\n');
  fs.writeFileSync(ADSENSE_REPORT_PATH, JSON.stringify({ generatedAt: started, status: auditResult.adsOk ? 'adsense_preserved_and_audited' : 'adsense_ids_not_found_no_fake_ids_injected', client: ads.client || null, adsTxtWritten: fs.existsSync('ads.txt'), slots: ads.slots, sources: ads.sources.slice(0,20).map(s=>s.source), note: auditResult.adsWarning },null,2)+'\n');
  const lines = ['# ParleyMap final safe repair','',`Generated: ${started}`,'',`Status: ${report.status}`,`Base index source: ${base.source}`,`Data source: ${dataSource}`,'','## Counts','',`people: ${before.people} -> ${after.people}`,`roster: ${before.roster} -> ${after.roster}`,`topRoster: ${before.topRoster} -> ${after.topRoster}`,`expansionRoster: ${before.expansionRoster} -> ${after.expansionRoster}`,`appearances: ${before.appearances} -> ${after.appearances}`,`categories: ${before.categories} -> ${after.categories}`,'','## Repairs','',`Fake dated watch rows removed: ${removedFake.length}`,`Grossi duplicate-prone rows removed: ${dedupeActions.length}`,`Anchor fixes applied: ${anchorFixes.length}`,`AdSense client preserved: ${ads.client || 'not found'}`,`AdSense slots preserved: ${ads.slots.join(', ') || 'not found'}`,`ads.txt written: ${fs.existsSync('ads.txt')}`,'','## Audit','',`Final audit: ${auditResult.status}`,`AdSense crawler-ready from available IDs: ${auditResult.adsOk}`];
  fs.writeFileSync(SUMMARY_PATH, lines.join('\n')+'\n');
  console.log(JSON.stringify(report,null,2));
}
main();
