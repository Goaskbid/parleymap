import fs from 'node:fs';
import { execSync } from 'node:child_process';

const INDEX_PATH = 'index.html';
const DEMO_PATH = 'data/demo.json';
const REPORT_PATH = 'data/diagnostics/integrity-rescue-report.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';
const GUARD_ID = 'parleymap-runtime-anchor-guard';

const PROFILE_COLLECTIONS = new Set(['people', 'roster', 'topRoster', 'expansionRoster', 'priorityExpansion', 'watchlistExamples', 'organizationProfiles']);
const CORE_ARRAYS = ['people', 'roster', 'expansionRoster', 'appearances', 'categories'];

const ANCHORS = [
  {
    key: 'claudia_sheinbaum',
    matchAll: ['claudia', 'sheinbaum'],
    canonicalName: 'Claudia Sheinbaum',
    id: 'claudia-sheinbaum',
    roleHint: 'President of Mexico',
    base: { label: 'Mexico City institutional base', city: 'Mexico City', countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Claudia%20Sheinbaum%20%28cropped%2C%20centered%29.jpg'
  },
  {
    key: 'pope_leo_xiv',
    matchAny: ['pope leo xiv', 'leo xiv', 'robert prevost', 'robert francis prevost', 'pope xiv', 'pope'],
    canonicalName: 'Pope Leo XIV',
    id: 'pope-leo-xiv',
    roleHint: 'Pope of the Catholic Church',
    base: { label: 'Vatican City institutional base', city: 'Vatican City', countryCode: 'VA', countryName: 'Vatican City', lat: 41.9029, lng: 12.4534, region: 'Europe' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pope%20Leo%20XIV%202025.jpg'
  },
  {
    key: 'prabowo_subianto',
    matchAll: ['prabowo', 'subianto'],
    canonicalName: 'Prabowo Subianto',
    id: 'prabowo-subianto',
    roleHint: 'President of Indonesia',
    base: { label: 'Jakarta institutional base', city: 'Jakarta', countryCode: 'ID', countryName: 'Indonesia', lat: -6.2088, lng: 106.8456, region: 'Asia' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Prabowo%20Subianto%202024%20official%20portrait.jpg'
  },
  {
    key: 'rafael_grossi',
    matchAll: ['rafael', 'grossi'],
    canonicalName: 'Rafael Grossi',
    id: 'rafael-grossi',
    roleHint: 'IAEA Director General',
    base: { label: 'Vienna IAEA institutional base', city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2345, lng: 16.4166, region: 'Europe' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rafael%20Grossi%202022.jpg'
  },
  {
    key: 'emmanuel_macron',
    matchAll: ['emmanuel', 'macron'],
    canonicalName: 'Emmanuel Macron',
    id: 'emmanuel-macron',
    roleHint: 'President of France',
    base: { label: 'Paris institutional base', city: 'Paris', countryCode: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522, region: 'Europe' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Emmanuel%20Macron%20in%202019.jpg'
  },
  {
    key: 'mohammed_bin_salman',
    matchAll: ['salman'],
    matchAny: ['mohammed', 'mohammad', 'muhammad', 'mbs'],
    canonicalName: 'Mohammed bin Salman',
    id: 'mohammed-bin-salman',
    roleHint: 'Crown Prince and Prime Minister of Saudi Arabia',
    base: { label: 'Riyadh institutional base', city: 'Riyadh', countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, region: 'Middle East' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mohammad%20bin%20Salman%202018.jpg'
  },
  {
    key: 'king_charles_iii',
    matchAny: ['king charles iii', 'king charles', 'charles iii'],
    canonicalName: 'King Charles III',
    id: 'king-charles-iii',
    roleHint: 'King of the United Kingdom',
    base: { label: 'London institutional base', city: 'London', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5074, lng: -0.1278, region: 'Europe' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/King%20Charles%20III%20%28July%202023%29.jpg'
  },
  {
    key: 'antonio_guterres',
    matchAny: ['antonio guterres', 'antónio guterres', 'guterres'],
    canonicalName: 'António Guterres',
    id: 'antonio-guterres',
    roleHint: 'UN Secretary-General',
    base: { label: 'UN New York institutional base', city: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7499, lng: -73.968, region: 'North America' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ant%C3%B3nio%20Guterres%202021.jpg'
  },
  {
    key: 'mark_rutte',
    matchAll: ['mark', 'rutte'],
    canonicalName: 'Mark Rutte',
    id: 'mark-rutte',
    roleHint: 'NATO Secretary General',
    base: { label: 'NATO Brussels institutional base', city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8798, lng: 4.4219, region: 'Europe' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mark%20Rutte%202023.jpg'
  },
  {
    key: 'ursula_von_der_leyen',
    matchAll: ['ursula', 'leyen'],
    canonicalName: 'Ursula von der Leyen',
    id: 'ursula-von-der-leyen',
    roleHint: 'European Commission President',
    base: { label: 'Brussels institutional base', city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, region: 'Europe' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ursula%20von%20der%20Leyen%202024.jpg'
  },
  {
    key: 'kaja_kallas',
    matchAll: ['kaja', 'kallas'],
    canonicalName: 'Kaja Kallas',
    id: 'kaja-kallas',
    roleHint: 'EU High Representative',
    base: { label: 'Brussels institutional base', city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, region: 'Europe' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kaja%20Kallas%202024.jpg'
  },
  {
    key: 'kristalina_georgieva',
    matchAll: ['kristalina', 'georgieva'],
    canonicalName: 'Kristalina Georgieva',
    id: 'kristalina-georgieva',
    roleHint: 'IMF Managing Director',
    base: { label: 'Washington institutional base', city: 'Washington', countryCode: 'US', countryName: 'United States', lat: 38.8995, lng: -77.0436, region: 'North America' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kristalina%20Georgieva%20%28cropped%29.jpg'
  },
  {
    key: 'ajay_banga',
    matchAll: ['ajay', 'banga'],
    canonicalName: 'Ajay Banga',
    id: 'ajay-banga',
    roleHint: 'World Bank President',
    base: { label: 'Washington institutional base', city: 'Washington', countryCode: 'US', countryName: 'United States', lat: 38.8993, lng: -77.0427, region: 'North America' },
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ajay%20Banga%202023.jpg'
  }
];

const FAKE_TITLE_RE = /\b(city of london finance diplomacy watch|iaea nuclear diplomacy watch|think[-\s]?tank leadership events watch|royal diaries|royal diary|state[-\s]?visit watch|generic watch|watch card|event watch|homepage|profile page|faq|frequently asked|foire aux questions|programme|programming|fact sheet|index card)\b/i;
const ACTIVE_HISTORICAL_RE = /\b(vincent auriol|rene coty|francois hollande|nicolas sarkozy|jacques chirac|georges pompidou|valery giscard|francois mitterrand|enrique pena nieto|felipe calderon|lopez obrador|andres manuel lopez obrador)\b/i;

function ensureDir(path) { fs.mkdirSync(path, { recursive: true }); }
function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function slug(value) { return norm(value).replace(/ /g, '-').replace(/^-+|-+$/g, '').slice(0, 90); }
function readEmbeddedFromHtml(html) {
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error('demo-data opening tag not found');
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error('demo-data closing tag not found');
  return { jsonStart, jsonEnd, data: JSON.parse(html.slice(jsonStart, jsonEnd).trim()) };
}
function readIndex() { return fs.existsSync(INDEX_PATH) ? fs.readFileSync(INDEX_PATH, 'utf8') : ''; }
function writeIndex(html, jsonStart, jsonEnd, data) {
  const next = html.slice(0, jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + html.slice(jsonEnd);
  fs.writeFileSync(INDEX_PATH, next);
  ensureDir('data');
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + '\n');
}
function counts(data) {
  const out = {};
  for (const key of CORE_ARRAYS) out[key] = Array.isArray(data[key]) ? data[key].length : null;
  out.topRoster = Array.isArray(data.topRoster) ? data.topRoster.length : null;
  return out;
}
function validShape(data) {
  return data && Array.isArray(data.people) && data.people.length >= 90 && data.people.length <= 115 &&
    Array.isArray(data.roster) && data.roster.length >= 190 &&
    Array.isArray(data.expansionRoster) && data.expansionRoster.length >= 100 &&
    Array.isArray(data.appearances) && data.appearances.length >= 450 &&
    Array.isArray(data.categories) && data.categories.length >= 10;
}
function pollutionScore(data) {
  let score = 0;
  if (!validShape(data)) score += 1000;
  const text = JSON.stringify({ people: data.people, roster: data.roster, topRoster: data.topRoster }).slice(0, 2000000);
  if (data.people?.length > 115) score += 100;
  if (ACTIVE_HISTORICAL_RE.test(text)) score += 20;
  return score;
}
function findSafeIndexFromHistory() {
  let commits = [];
  try {
    commits = execSync('git log --format=%H -- index.html', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
  } catch {
    commits = [];
  }
  for (const commit of commits) {
    let html = '';
    try { html = execSync(`git show ${commit}:index.html`, { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 }); } catch { continue; }
    if (!html.includes(OPEN_TAG) || html.length < 100000) continue;
    try {
      const parsed = readEmbeddedFromHtml(html);
      if (!validShape(parsed.data)) continue;
      if (pollutionScore(parsed.data) > 50) continue;
      return { commit, html, parsed };
    } catch { continue; }
  }
  return null;
}
function extractAdsenseBlocks(html) {
  const blocks = [];
  const meta = html.match(/<meta[^>]+name=["']google-adsense-account["'][^>]*>/i)?.[0];
  if (meta) blocks.push({ type: 'meta', html: meta });
  const loader = html.match(/<script[^>]+pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/i)?.[0] || html.match(/<script[^>]+pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*>/i)?.[0];
  if (loader) blocks.push({ type: 'loader', html: loader });
  const insRe = /<ins\b[\s\S]*?class=["'][^"']*adsbygoogle[^"']*["'][\s\S]*?<\/ins>\s*<script>[\s\S]*?adsbygoogle[\s\S]*?push\s*\(\s*\{\s*\}\s*\)[\s\S]*?<\/script>/gi;
  let m;
  while ((m = insRe.exec(html))) blocks.push({ type: 'unit', html: m[0] });
  return blocks;
}
function preserveAdsenseWhenRestoring(currentHtml, restoredHtml) {
  const currentBlocks = extractAdsenseBlocks(currentHtml);
  if (!currentBlocks.length) return restoredHtml;
  let out = restoredHtml;
  const meta = currentBlocks.find((b) => b.type === 'meta')?.html;
  if (meta && !/google-adsense-account/i.test(out)) out = out.replace(/<head[^>]*>/i, (h) => `${h}\n${meta}`);
  const loader = currentBlocks.find((b) => b.type === 'loader')?.html;
  if (loader && !/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(out)) out = out.replace(/<\/head>/i, `${loader}\n</head>`);
  return out;
}
function objectText(item) {
  return norm([
    item?.id, item?.slug, item?.name, item?.canonicalName, item?.personName, item?.roleTitle,
    item?.organization, item?.country, item?.countryName, item?.countryFocus, item?.countryFocusCode,
    item?.title, item?.summary, item?.profileLine, Array.isArray(item?.profileLines) ? item.profileLines.join(' ') : ''
  ].join(' '));
}
function matchAnchor(item) {
  const text = objectText(item);
  if (!text) return null;
  return ANCHORS.find((a) => {
    const allOk = !a.matchAll || a.matchAll.every((part) => text.includes(norm(part)));
    const anyOk = !a.matchAny || a.matchAny.some((part) => text.includes(norm(part)));
    return allOk && anyOk;
  }) || null;
}
function makeAnchor(base) {
  return { label: base.label, city: base.city, countryCode: base.countryCode, countryName: base.countryName, lat: base.lat, lng: base.lng, precision: 'city', type: 'institutional_base', privacy: 'city-level public institutional base only' };
}
function looksPlaceholderImage(url) {
  const s = String(url || '').toLowerCase();
  return !s || s.includes('placeholder') || s.includes('avatar') || s.includes('blank') || s === 'null' || s === 'undefined';
}
function isAppearanceLike(item) {
  return Boolean(item && typeof item === 'object' && (item.startsAt || item.endsAt || item.date || item.eventDate) && (item.title || item.summary || item.location));
}
function isProfileLike(item) {
  return Boolean(item && typeof item === 'object' && (item.canonicalName || item.name || item.roleTitle || item.profileLine || item.homeBases || item.mapAnchor || item.wikidataId) && !isAppearanceLike(item));
}
function applyProfileAnchor(item, anchor) {
  const base = anchor.base;
  const location = makeAnchor(base);
  if (!item.id || /grossi|sheinbaum|prabowo|pope|macron|salman|charles/i.test(objectText(item))) item.id = anchor.id;
  item.slug = item.slug || anchor.id;
  if (anchor.canonicalName && (!item.canonicalName || item.canonicalName.length < 4 || objectText(item).includes(anchor.key.replace(/_/g, ' ')))) item.canonicalName = anchor.canonicalName;
  item.name = item.name || item.canonicalName || anchor.canonicalName;
  item.roleTitle = item.roleTitle || anchor.roleHint;
  item.countryFocus = base.countryCode;
  item.countryFocusCode = base.countryCode;
  item.countryCode = base.countryCode;
  item.countryName = base.countryName;
  item.country = base.countryName;
  item.homeRegion = base.region;
  item.locationStatus = 'institutional_base_city_level';
  item.homeBases = [location];
  item.homeBase = location;
  item.mapAnchor = location;
  item.anchorLocation = location;
  item.baseLocation = location;
  item.institutionalBase = location;
  item.lat = base.lat; item.lng = base.lng; item.lon = base.lng; item.long = base.lng;
  item.latitude = base.lat; item.longitude = base.lng;
  item.homeLat = base.lat; item.homeLng = base.lng; item.homeLon = base.lng;
  item.mapLat = base.lat; item.mapLng = base.lng; item.mapLon = base.lng;
  item.anchorLat = base.lat; item.anchorLng = base.lng; item.anchorLon = base.lng;
  item.coordinates = { lat: base.lat, lng: base.lng };
  item.geo = { lat: base.lat, lng: base.lng, city: base.city, countryCode: base.countryCode, countryName: base.countryName };
  item.flagAudit = { ...(item.flagAudit || {}), code: base.countryCode, countryCode: base.countryCode, countryName: base.countryName, label: base.countryName, status: 'country flag' };
  item.flagCode = base.countryCode;
  item.countryFlagCode = base.countryCode;
  if (looksPlaceholderImage(item.imageUrl) && anchor.imageUrl) {
    item.imageUrl = anchor.imageUrl;
    item.imageProvider = 'curated public fallback';
    item.visualAuditStatus = 'curated_public_image_fallback';
  }
}
function fakeEventReason(item) {
  if (!item || typeof item !== 'object') return '';
  const text = [item.title, item.name, item.label, item.summary, item.eventType].filter(Boolean).join(' ');
  const title = norm(text);
  if (!title) return '';
  if (FAKE_TITLE_RE.test(text)) return 'generic_watch_or_non_event_title';
  if (/\bwatch\b/.test(title) && /\b(city|diplomacy|royal|think tank|iaea|nuclear|finance|leadership|diary|diaries)\b/.test(title)) return 'watch_card_not_event';
  const hasDate = Boolean(item.startsAt || item.date || item.eventDate || item.endsAt);
  const hasSourcePack = Array.isArray(item.sourcePack) && item.sourcePack.length > 0;
  if (hasDate && /\b(homepage|profile|faq|fact sheet|index)\b/.test(title) && !hasSourcePack) return 'dated_generic_page_without_source_pack';
  return '';
}
function walkContainers(value, path, cb) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    cb(value, path);
    for (let i = 0; i < value.length; i++) walkContainers(value[i], `${path}[${i}]`, cb);
    return;
  }
  for (const [k, v] of Object.entries(value)) walkContainers(v, `${path}.${k}`, cb);
}
function cleanFakeEvents(data, changes) {
  walkContainers(data, 'data', (arr, path) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const item = arr[i];
      const reason = fakeEventReason(item);
      if (!reason) continue;
      changes.removedFakeEvents.push({ path: `${path}[${i}]`, id: item?.id || null, title: item?.title || item?.name || item?.label || null, reason });
      arr.splice(i, 1);
    }
  });
}
function repairAnchors(data, changes) {
  const seenProfileKeys = new Map();
  function recurse(value, path) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        const item = value[i];
        if (!item || typeof item !== 'object') { continue; }
        const anchor = matchAnchor(item);
        if (anchor && isProfileLike(item)) {
          const before = { id: item.id, name: item.canonicalName || item.name, lat: item.lat ?? item.mapLat, lng: item.lng ?? item.mapLng, countryCode: item.countryFocusCode || item.countryFocus };
          applyProfileAnchor(item, anchor);
          changes.anchorFixes.push({ target: anchor.key, path: `${path}[${i}]`, before, after: { id: item.id, name: item.canonicalName || item.name, lat: item.lat, lng: item.lng, countryCode: item.countryFocusCode } });
          if (anchor.key === 'rafael_grossi') {
            const collection = path.split('.').pop();
            const dedupeKey = `${collection}:${anchor.key}:${item.id}`;
            if (seenProfileKeys.has(dedupeKey)) {
              item.trackingStatus = 'duplicate_profile_hidden';
              item.hiddenFromOpeningMap = true;
              item.prominenceScore = Math.min(Number(item.prominenceScore || 0), 1);
              changes.hiddenDuplicates.push({ target: anchor.key, path: `${path}[${i}]`, reason: 'duplicate profile identity' });
            } else {
              seenProfileKeys.set(dedupeKey, true);
            }
          }
        }
        recurse(item, `${path}[${i}]`);
      }
      return;
    }
    const anchor = matchAnchor(value);
    if (anchor && isProfileLike(value)) {
      const before = { id: value.id, name: value.canonicalName || value.name, lat: value.lat ?? value.mapLat, lng: value.lng ?? value.mapLng, countryCode: value.countryFocusCode || value.countryFocus };
      applyProfileAnchor(value, anchor);
      changes.anchorFixes.push({ target: anchor.key, path, before, after: { id: value.id, name: value.canonicalName || value.name, lat: value.lat, lng: value.lng, countryCode: value.countryFocusCode } });
    }
    for (const [k, v] of Object.entries(value)) recurse(v, `${path}.${k}`);
  }
  recurse(data, 'data');
}
function demoteHistoricalActive(data, changes) {
  const macron = [...(data.people || []), ...(data.roster || [])].find((row) => matchAnchor(row)?.key === 'emmanuel_macron');
  for (const collection of ['people', 'roster', 'topRoster', 'expansionRoster', 'priorityExpansion']) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== 'object') continue;
      const text = objectText(row);
      if (!ACTIVE_HISTORICAL_RE.test(text)) continue;
      if (/vincent auriol|rene coty|francois hollande|nicolas sarkozy|jacques chirac|georges pompidou|valery giscard|francois mitterrand/i.test(text) && macron && ['roster', 'topRoster'].includes(collection)) {
        const rank = row.rank;
        const previous = row.canonicalName || row.name || row.id;
        rows[i] = { ...structuredClone(macron), rank, prominenceScore: Math.max(Number(macron.prominenceScore || 0), Number(row.prominenceScore || 0) || 0) };
        changes.replacedHistoricalActive.push({ collection, index: i, previous, replacement: rows[i].canonicalName || rows[i].name });
      } else {
        row.roleTitle = String(row.roleTitle || 'Former office holder').startsWith('Former') ? row.roleTitle : `Former ${row.roleTitle || 'office holder'}`;
        row.currentOfficeStatus = 'former_or_historical';
        row.trackingStatus = 'historical_profile_not_current_slot';
        row.hiddenFromOpeningMap = true;
        row.prominenceScore = Math.min(Number(row.prominenceScore || 0), 1);
        changes.demotedHistorical.push({ collection, index: i, name: row.canonicalName || row.name || row.id });
      }
    }
  }
}
function installRuntimeGuard(html) {
  if (html.includes(`id="${GUARD_ID}"`)) return html;
  const guardData = ANCHORS.map((a) => ({ key: a.key, canonicalName: a.canonicalName, lat: a.base.lat, lng: a.base.lng, city: a.base.city, countryCode: a.base.countryCode, terms: [...(a.matchAll || []), ...(a.matchAny || [])] }));
  const script = `<script id="${GUARD_ID}">
(function(){
  const anchors = ${JSON.stringify(guardData)};
  const norm = (v) => String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const seen = new Map();
  function findTarget(text){ const t=norm(text); return anchors.find(a => (a.terms||[]).some(x => t.includes(norm(x))) || t.includes(norm(a.canonicalName))); }
  function far(ll,a){ try{ const lat=Array.isArray(ll)?ll[0]:(ll.lat||ll.latitude); const lng=Array.isArray(ll)?(ll[1]??ll.lng):((ll.lng??ll.lon??ll.longitude)); return Math.abs(Number(lat)-a.lat)+Math.abs(Number(lng)-a.lng)>3; }catch(e){ return true; } }
  function patchMarker(marker, text){ const a=findTarget(text); if(!a || !marker || !marker.setLatLng) return; const current=marker.getLatLng ? marker.getLatLng() : null; if(far(current,a)) marker.setLatLng([a.lat,a.lng]); if(a.key==='rafael_grossi'){ const count=seen.get(a.key)||0; seen.set(a.key,count+1); if(count>0 && marker.remove) setTimeout(()=>{ try{ marker.remove(); }catch(e){} },0); } }
  function patchLeaflet(L){ if(!L || L.__parleymapGuardPatched) return; L.__parleymapGuardPatched=true; if(L.Marker && L.Marker.prototype){ const oldTooltip=L.Marker.prototype.bindTooltip; L.Marker.prototype.bindTooltip=function(content,opts){ const r=oldTooltip?oldTooltip.call(this,content,opts):this; patchMarker(this, typeof content==='string'?content:(content && content.textContent)||''); return r; }; const oldPopup=L.Marker.prototype.bindPopup; L.Marker.prototype.bindPopup=function(content,opts){ const r=oldPopup?oldPopup.call(this,content,opts):this; patchMarker(this, typeof content==='string'?content:(content && content.textContent)||''); return r; }; } }
  if(window.L) patchLeaflet(window.L); else { let _L; Object.defineProperty(window,'L',{ configurable:true, get(){ return _L; }, set(v){ _L=v; patchLeaflet(v); } }); }
  window.__PARLEYMAP_ANCHOR_GUARD__ = { anchors, installedAt: new Date().toISOString() };
})();
</script>`;
  const parsed = readEmbeddedFromHtml(html);
  const insertAt = html.indexOf(CLOSE_TAG, parsed.jsonEnd) + CLOSE_TAG.length;
  return html.slice(0, insertAt) + '\n' + script + html.slice(insertAt);
}
function validateAndSave(data, beforeCounts) {
  if (!validShape(data)) throw new Error(`Dataset shape invalid after rescue: ${JSON.stringify(counts(data))}`);
  const after = counts(data);
  for (const key of ['roster', 'expansionRoster', 'categories']) {
    if (beforeCounts[key] !== null && after[key] !== beforeCounts[key]) throw new Error(`${key} count changed unexpectedly from ${beforeCounts[key]} to ${after[key]}`);
  }
  if (after.people > 115) throw new Error(`people count still unsafe after rescue: ${after.people}`);
  if (after.appearances < 450) throw new Error(`appearances count too low after cleanup: ${after.appearances}`);
}

ensureDir('data/diagnostics');
let html = readIndex();
const initialHtml = html;
let parsed;
let restoredFromHistory = null;
let beforeCounts = {};
try { parsed = readEmbeddedFromHtml(html); beforeCounts = counts(parsed.data); } catch { parsed = null; }

if (!parsed || html.length < 100000 || pollutionScore(parsed.data) > 50) {
  const safe = findSafeIndexFromHistory();
  if (!safe) throw new Error('Could not find a safe historical index.html with valid demo-data. No changes written.');
  html = preserveAdsenseWhenRestoring(initialHtml, safe.html);
  restoredFromHistory = safe.commit;
  parsed = readEmbeddedFromHtml(html);
  beforeCounts = counts(parsed.data);
}

const data = parsed.data;
const changes = { restoredFromHistory, removedFakeEvents: [], anchorFixes: [], hiddenDuplicates: [], demotedHistorical: [], replacedHistoricalActive: [] };
cleanFakeEvents(data, changes);
demoteHistoricalActive(data, changes);
repairAnchors(data, changes);
data.meta = { ...(data.meta || {}), lastIntegrityRescue: new Date().toISOString(), integrityRescueStatus: `removed ${changes.removedFakeEvents.length} fake event rows; applied ${changes.anchorFixes.length} anchor fixes` };
validateAndSave(data, beforeCounts);
writeIndex(html, parsed.jsonStart, parsed.jsonEnd, data);
html = readIndex();
html = installRuntimeGuard(html);
fs.writeFileSync(INDEX_PATH, html);

const report = { generatedAt: new Date().toISOString(), status: 'integrity_rescue_applied', before: beforeCounts, after: counts(data), changes };
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(SUMMARY_PATH, `# ParleyMap integrity rescue\n\nGenerated: ${report.generatedAt}\n\nStatus: ${report.status}\n\nRestored from history: ${restoredFromHistory || 'no'}\n\nRemoved fake event rows: ${changes.removedFakeEvents.length}\n\nAnchor fixes: ${changes.anchorFixes.length}\n\nHidden duplicates: ${changes.hiddenDuplicates.length}\n\nReplaced historical active rows: ${changes.replacedHistoricalActive.length}\n\n`);
console.log(JSON.stringify(report, null, 2));
