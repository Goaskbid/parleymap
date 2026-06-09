import fs from 'node:fs';
import { execSync } from 'node:child_process';

const INDEX_PATH = 'index.html';
const DEMO_PATH = 'data/demo.json';
const DIAG_DIR = 'data/diagnostics';
const REPORT_PATH = `${DIAG_DIR}/canonical-maintenance-report.json`;
const AUDIT_PATH = `${DIAG_DIR}/canonical-hard-audit-report.json`;
const ADSENSE_PATH = `${DIAG_DIR}/adsense-preserve-audit-report.json`;
const SUMMARY_PATH = `${DIAG_DIR}/LATEST_RUN_SUMMARY.md`;

const OPEN_TAG_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["']\s*>/i;
const CLOSE_TAG = '</script>';

const FAKE_EVENT_PATTERNS = [
  /iaea\s+nuclear\s+diplomacy\s+watch/i,
  /city\s+of\s+london\s+finance\s+diplomacy\s+watch/i,
  /think[- ]?tank\s+leadership\s+events\s+watch/i,
  /royal\s+diaries?\s+and\s+state[- ]?visit\s+watch/i,
  /generic\s+source[- ]?watch/i,
  /source[- ]?watch\s+card/i
];

const NON_EVENT_PAGE_RE = /\b(faq|frequently asked|foire aux questions|homepage|home page|profile page|biography|fact sheet|programme|program|privacy|terms|cookie|sitemap)\b/i;

const ANCHORS = [
  { key: 'rafael_grossi', any: ['rafael grossi', 'grossi', 'q7283122'], anchor: { city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2082, lng: 16.3738, label: 'Vienna institutional base', orgMark: 'IAEA', organization: 'International Atomic Energy Agency', region: 'Europe' }, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rafael%20Grossi%20IAEA%202024.jpg' },
  { key: 'pope_leo_xiv', any: ['pope leo xiv', 'leo xiv', 'robert prevost', 'pope xiv'], anchor: { city: 'Vatican City', countryCode: 'VA', countryName: 'Vatican City', lat: 41.9029, lng: 12.4534, label: 'Vatican City institutional base', orgMark: 'Holy See', organization: 'Holy See', region: 'Europe' }, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pope%20Leo%20XIV%202025.jpg' },
  { key: 'claudia_sheinbaum', any: ['claudia sheinbaum', 'sheinbaum'], anchor: { city: 'Mexico City', countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, label: 'Mexico City institutional base', orgMark: 'MX', organization: 'Mexico', region: 'North America' }, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Claudia%20Sheinbaum%20Pardo%20%28cropped%2C%20centered%29.jpg' },
  { key: 'prabowo_subianto', any: ['prabowo subianto', 'subianto'], anchor: { city: 'Jakarta', countryCode: 'ID', countryName: 'Indonesia', lat: -6.2088, lng: 106.8456, label: 'Jakarta institutional base', orgMark: 'ID', organization: 'Indonesia', region: 'Asia' }, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Prabowo%20Subianto%202024%20official%20portrait.jpg' },
  { key: 'mohammed_bin_salman', any: ['mohammed bin salman', 'mohammad bin salman', 'muhammad bin salman', 'mbs'], anchor: { city: 'Riyadh', countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, label: 'Riyadh institutional base', orgMark: 'SA', organization: 'Saudi Arabia', region: 'Middle East' } },
  { key: 'king_charles', any: ['king charles iii', 'charles iii', 'king charles'], anchor: { city: 'London', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5074, lng: -0.1278, label: 'London institutional base', orgMark: 'GB', organization: 'British Royal Family', region: 'Europe' } },
  { key: 'mark_rutte', any: ['mark rutte'], anchor: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8798, lng: 4.4219, label: 'NATO Brussels institutional base', orgMark: 'NATO', organization: 'NATO', region: 'Europe' } },
  { key: 'antonio_guterres', any: ['antonio guterres', 'antónio guterres', 'guterres'], anchor: { city: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7499, lng: -73.968, label: 'UN New York institutional base', orgMark: 'UN', organization: 'United Nations', region: 'North America' } },
  { key: 'emmanuel_macron', any: ['emmanuel macron', 'macron'], anchor: { city: 'Paris', countryCode: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522, label: 'Paris institutional base', orgMark: 'FR', organization: 'France', region: 'Europe' } },
  { key: 'ursula_von_der_leyen', any: ['ursula von der leyen', 'von der leyen'], anchor: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, label: 'Brussels institutional base', orgMark: 'EU', organization: 'European Commission', region: 'Europe' } },
  { key: 'kaja_kallas', any: ['kaja kallas'], anchor: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, label: 'Brussels institutional base', orgMark: 'EU', organization: 'European Union', region: 'Europe' } }
];

const OFFICIAL_EVENTS = [
  {
    id: 'official-grossi-iaea-board-vienna-2026-03-02',
    personId: 'r-057-rafael-grossi',
    personName: 'Rafael Grossi',
    startsAt: '2026-03-02T09:00:00+01:00',
    endsAt: null,
    status: 'VERIFIED_PAST',
    confidence: 0.96,
    confidenceLabel: 'official source',
    eventType: 'PUBLIC_STATEMENT',
    title: 'IAEA Board of Governors statement, Vienna',
    summary: 'Rafael Grossi delivered an official IAEA Board of Governors statement in Vienna.',
    significance: 'Official public institutional event.',
    decisions: '',
    location: { label: 'IAEA Headquarters, Vienna', city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2333, lng: 16.4167, precision: 'city' },
    venuePublic: true,
    securityPrecision: 'public institutional venue; city-level display only',
    publicInterestScore: 72,
    eventGroupId: 'eg-iaea-board-vienna-2026-03-02',
    topics: ['nuclear diplomacy', 'IAEA'],
    counterpartIds: [],
    sourcePack: [{ type: 'official', reliability: 'primary', publisher: 'IAEA', url: 'https://www.iaea.org/newscenter/statements/iaea-director-generals-introductory-statement-to-the-board-of-governors-2-6-march-2026' }],
    visual: { status: 'public source', policy: 'official public event only' },
    lastCheckedAt: new Date().toISOString(),
    marketImpact: { sectors: ['energy'], companies: [], countries: ['Austria'], confidence: 'medium' },
    realEvent: true
  },
  {
    id: 'official-pope-leo-xiv-spain-journey-2026-06-06',
    personId: 'r-085-pope-leo-xiv',
    personName: 'Pope Leo XIV',
    startsAt: '2026-06-06T09:00:00+02:00',
    endsAt: '2026-06-12T18:00:00+02:00',
    status: 'ANNOUNCED_FUTURE',
    confidence: 0.95,
    confidenceLabel: 'official Vatican source',
    eventType: 'APOSTOLIC_JOURNEY',
    title: 'Apostolic journey to Spain',
    summary: 'Vatican-published public itinerary for Pope Leo XIV in Spain.',
    significance: 'Official public travel itinerary.',
    decisions: '',
    location: { label: 'Spain itinerary', city: 'Madrid', countryCode: 'ES', countryName: 'Spain', lat: 40.4168, lng: -3.7038, precision: 'city' },
    venuePublic: true,
    securityPrecision: 'public itinerary; city-level display only',
    publicInterestScore: 78,
    eventGroupId: 'eg-pope-spain-2026-06-06',
    topics: ['religion', 'diplomacy'],
    counterpartIds: [],
    sourcePack: [{ type: 'official', reliability: 'primary', publisher: 'Vatican', url: 'https://www.vatican.va/content/leo-xiv/en/travels/2026/documents/spagna-6-12giugno2026.html' }],
    visual: { status: 'public source', policy: 'official public itinerary only' },
    lastCheckedAt: new Date().toISOString(),
    marketImpact: { sectors: [], companies: [], countries: ['Spain'], confidence: 'low' },
    realEvent: true
  },
  {
    id: 'official-king-charles-washington-address-2026-04-28',
    personId: 'r-012-king-charles-iii',
    personName: 'King Charles III',
    startsAt: '2026-04-28T12:00:00-04:00',
    endsAt: null,
    status: 'VERIFIED_PAST',
    confidence: 0.94,
    confidenceLabel: 'official royal source',
    eventType: 'STATE_VISIT_PUBLIC_ADDRESS',
    title: 'Address to Congress in Washington',
    summary: 'Official Royal Family record of King Charles III address in Washington.',
    significance: 'Official public state-visit event.',
    decisions: '',
    location: { label: 'Washington', city: 'Washington', countryCode: 'US', countryName: 'United States', lat: 38.9072, lng: -77.0369, precision: 'city' },
    venuePublic: true,
    securityPrecision: 'public state event; city-level display only',
    publicInterestScore: 75,
    eventGroupId: 'eg-king-charles-washington-2026-04-28',
    topics: ['royal diplomacy', 'state visit'],
    counterpartIds: [],
    sourcePack: [{ type: 'official', reliability: 'primary', publisher: 'Royal Family', url: 'https://www.royal.uk/news-and-activity/2026-04-28/the-kings-address-to-the-joint-meeting-of-congress-in-washington' }],
    visual: { status: 'public source', policy: 'official public event only' },
    lastCheckedAt: new Date().toISOString(),
    marketImpact: { sectors: [], companies: [], countries: ['United States'], confidence: 'low' },
    realEvent: true
  }
];

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function textBlob(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return norm([
    obj.id, obj.slug, obj.name, obj.canonicalName, obj.wikiTitle, obj.wikidataId,
    obj.roleTitle, obj.organization, obj.countryName, obj.countryFocus, obj.countryFocusCode,
    obj.profileLine, Array.isArray(obj.profileLines) ? obj.profileLines.join(' ') : '',
    obj.title, obj.summary
  ].join(' '));
}

function readIndexData() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const openMatch = html.match(OPEN_TAG_RE);
  if (!openMatch || openMatch.index === undefined) throw new Error('demo-data opening tag not found in index.html');
  const openStart = openMatch.index;
  const jsonStart = openStart + openMatch[0].length;
  const closeIndex = html.indexOf(CLOSE_TAG, jsonStart);
  if (closeIndex === -1) throw new Error('demo-data closing tag not found in index.html');
  const jsonText = html.slice(jsonStart, closeIndex).trim();
  const data = JSON.parse(jsonText);
  return { html, openStart, jsonStart, closeIndex, data };
}

function writeIndexData(payload, data) {
  const nextJson = JSON.stringify(data, null, 2);
  const nextHtml = payload.html.slice(0, payload.jsonStart) + '\n' + nextJson + '\n' + payload.html.slice(payload.closeIndex);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(DEMO_PATH, nextJson + '\n');
}

function count(data, key) { return Array.isArray(data[key]) ? data[key].length : null; }
function validateCore(data, label='data') {
  for (const key of ['people','roster','expansionRoster','appearances','categories']) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  }
  if (data.people.length < 85) throw new Error(`${label}: people count too low`);
  if (data.roster.length < 180) throw new Error(`${label}: roster count too low`);
  if (data.expansionRoster.length < 95) throw new Error(`${label}: expansionRoster count too low`);
  if (data.appearances.length < 480) throw new Error(`${label}: appearances count too low`);
  if (data.categories.length < 8) throw new Error(`${label}: categories count too low`);
}

function isProfileLike(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Boolean(obj.id || obj.slug || obj.name || obj.canonicalName || obj.wikidataId || obj.roleTitle || obj.profileLine);
}

function targetFor(obj) {
  const blob = textBlob(obj);
  return ANCHORS.find(t => t.any.some(x => blob.includes(norm(x))));
}

function anchorObject(target) {
  const a = target.anchor;
  return { label: a.label, city: a.city, countryCode: a.countryCode, countryName: a.countryName, lat: a.lat, lng: a.lng, precision: 'city', type: 'institutional_base', privacy: 'city-level public institutional base only' };
}

function patchProfile(obj, target) {
  const a = target.anchor;
  const anchor = anchorObject(target);
  obj.countryFocus = a.countryCode;
  obj.countryFocusCode = a.countryCode;
  obj.countryCode = a.countryCode;
  obj.countryName = a.countryName;
  obj.country = a.countryName;
  obj.homeRegion = a.region || obj.homeRegion || null;
  obj.locationStatus = 'institutional_base_city_level';
  obj.homeBases = [anchor];
  obj.homeBase = anchor;
  obj.mapAnchor = anchor;
  obj.anchorLocation = anchor;
  obj.baseLocation = anchor;
  obj.institutionalBase = anchor;
  obj.lat = a.lat; obj.lng = a.lng; obj.latitude = a.lat; obj.longitude = a.lng;
  obj.homeLat = a.lat; obj.homeLng = a.lng; obj.mapLat = a.lat; obj.mapLng = a.lng;
  obj.anchorLat = a.lat; obj.anchorLng = a.lng;
  obj.coordinates = { lat: a.lat, lng: a.lng };
  obj.geo = { lat: a.lat, lng: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  obj.flagAudit = { ...(obj.flagAudit || {}), code: a.countryCode, countryCode: a.countryCode, label: a.countryName, countryName: a.countryName, status: 'country flag' };
  obj.flagCode = a.countryCode;
  obj.countryFlagCode = a.countryCode;
  if (target.key === 'rafael_grossi') {
    obj.organization = 'International Atomic Energy Agency';
    obj.orgMark = 'IAEA';
    obj.orgIcon = obj.orgIcon || 'IAEA';
    obj.countryFocus = 'AT';
    obj.countryFocusCode = 'AT';
    obj.countryName = 'Austria';
    obj.roleTitle = obj.roleTitle || 'Director General of the IAEA';
  }
  if ((!obj.imageUrl || String(obj.imageUrl).includes('placeholder') || String(obj.imageUrl).trim() === '') && target.image) {
    obj.imageUrl = target.image;
    obj.imageProvider = 'Wikimedia Commons fallback';
    obj.visualAuditStatus = 'fallback_image_set';
  }
}

function isFakeEvent(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const text = [obj.title, obj.summary, obj.status, obj.eventType, obj.kind, obj.type, obj.id].join(' ');
  if (FAKE_EVENT_PATTERNS.some(re => re.test(text))) return true;
  if (obj.startsAt && String(obj.status || '').toLowerCase().includes('source-watch')) return true;
  if (obj.startsAt && NON_EVENT_PAGE_RE.test(text) && !obj.realEvent) return true;
  return false;
}

function repairArray(arr, path, report) {
  if (!Array.isArray(arr)) return arr;
  const out = [];
  const visibleGrossiHelperCollections = /^(topRoster|priorityExpansion|watchlistExamples|openCatalogs|structuredSourceWatch|eventAgendas|summits)$/;
  const seenIds = new Set();
  for (const item of arr) {
    if (isFakeEvent(item)) {
      report.fakeEventsRemoved.push({ path, id: item?.id || null, title: item?.title || null });
      continue;
    }
    if (isProfileLike(item)) {
      const t = targetFor(item);
      if (t) {
        patchProfile(item, t);
        report.anchorRepairs.push({ target: t.key, path, id: item.id || null, name: item.canonicalName || item.name || item.title || null });
      }
      const itemId = String(item.id || '');
      if (itemId === 'r-057-rafael-grossi' && visibleGrossiHelperCollections.test(path)) {
        report.profileDuplicatesRemoved.push({ path, id: itemId, name: item.canonicalName || item.name || 'Rafael Grossi' });
        continue;
      }
      if (itemId && seenIds.has(itemId) && (path === 'people' || path === 'roster' || path === 'expansionRoster')) {
        report.profileDuplicatesRemoved.push({ path, id: itemId, name: item.canonicalName || item.name || null, reason: 'duplicate_id_same_collection' });
        continue;
      }
      if (itemId) seenIds.add(itemId);
    }
    out.push(item);
  }
  return out;
}

function walkAndRepair(value, path, report) {
  if (Array.isArray(value)) {
    const repaired = repairArray(value, path, report);
    for (const item of repaired) {
      if (item && typeof item === 'object') walkAndRepair(item, path + '[]', report);
    }
    return repaired;
  }
  if (!value || typeof value !== 'object') return value;
  if (isProfileLike(value)) {
    const t = targetFor(value);
    if (t) {
      patchProfile(value, t);
      report.anchorRepairs.push({ target: t.key, path, id: value.id || null, name: value.canonicalName || value.name || value.title || null });
    }
  }
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (child && typeof child === 'object') value[key] = walkAndRepair(child, path ? `${path}.${key}` : key, report);
  }
  return value;
}

function seedOfficialEvents(data, report) {
  if (!Array.isArray(data.appearances)) data.appearances = [];
  const byId = new Map(data.appearances.map(x => [String(x.id || ''), x]));
  for (const event of OFFICIAL_EVENTS) {
    if (!byId.has(event.id)) {
      data.appearances.push(event);
      report.officialEventsAdded.push({ id: event.id, personName: event.personName, title: event.title });
    }
  }
  data.appearances.sort((a, b) => String(b.startsAt || '').localeCompare(String(a.startsAt || '')));
}

function installRuntimeGuard(html) {
  if (html.includes('PARLEYMAP_CANONICAL_RUNTIME_GUARD')) return html;
  const guard = `\n<script id="parleymap-canonical-runtime-guard">\n(function(){\n  window.PARLEYMAP_CANONICAL_RUNTIME_GUARD = true;\n  var anchors = {\n    'rafael grossi': [48.2082,16.3738],\n    'pope leo xiv': [41.9029,12.4534],\n    'pope xiv': [41.9029,12.4534],\n    'claudia sheinbaum': [19.4326,-99.1332],\n    'prabowo subianto': [-6.2088,106.8456],\n    'mohammed bin salman': [24.7136,46.6753]\n  };\n  var seen = {};\n  function norm(s){ return String(s||'').toLowerCase().replace(/<[^>]*>/g,' ').replace(/[^a-z0-9]+/g,' ').trim(); }\n  function keyFor(s){ var t = norm(s); return Object.keys(anchors).find(function(k){ return t.indexOf(k) !== -1; }); }\n  function patchLayer(layer, content){ var k = keyFor(content); if(!k || !layer) return; var ll = anchors[k]; try { if(layer.setLatLng) layer.setLatLng(ll); } catch(e) {} if(seen[k] && seen[k] !== layer){ setTimeout(function(){ try { if(layer.remove) layer.remove(); else if(layer._map) layer._map.removeLayer(layer); } catch(e) {} },0); } else { seen[k] = layer; } }\n  function patchLeaflet(){ if(!window.L || !L.Marker || L.Marker.__parleyPatched) return false; L.Marker.__parleyPatched = true; ['bindTooltip','bindPopup'].forEach(function(m){ var old = L.Marker.prototype[m]; if(!old) return; L.Marker.prototype[m] = function(content){ patchLayer(this, content); return old.apply(this, arguments); }; }); if(L.CircleMarker){ ['bindTooltip','bindPopup'].forEach(function(m){ var old = L.CircleMarker.prototype[m]; if(!old) return; L.CircleMarker.prototype[m] = function(content){ patchLayer(this, content); return old.apply(this, arguments); }; }); } return true; }\n  var timer = setInterval(function(){ if(patchLeaflet()) clearInterval(timer); },50); setTimeout(function(){ clearInterval(timer); patchLeaflet(); },10000);\n})();\n</script>\n`;
  const match = html.match(OPEN_TAG_RE);
  if (match && match.index !== undefined) {
    const close = html.indexOf(CLOSE_TAG, match.index + match[0].length);
    if (close !== -1) return html.slice(0, close + CLOSE_TAG.length) + guard + html.slice(close + CLOSE_TAG.length);
  }
  return html.replace('</head>', guard + '\n</head>');
}

function recoverAdsense(html, report) {
  const clientMatch = html.match(/ca-pub-[0-9]{10,24}/);
  const pubMatch = html.match(/pub-[0-9]{10,24}/);
  const client = clientMatch ? clientMatch[0] : (pubMatch ? 'ca-' + pubMatch[0] : null);
  const publisherId = client ? client.replace(/^ca-/, '') : null;
  const slots = [...new Set([...html.matchAll(/data-ad-slot=["']([0-9]{4,})["']/g)].map(m => m[1]))];
  report.client = client;
  report.publisherId = publisherId;
  report.headerSlot = slots[0] || null;
  report.sidebarSlot = slots[1] || null;
  if (publisherId) fs.writeFileSync('ads.txt', `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`);
  let next = html;
  if (client && !next.includes('google-adsense-account')) {
    next = next.replace(/<head[^>]*>/i, m => `${m}\n<meta name="google-adsense-account" content="${client}">`);
  }
  if (client && !next.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')) {
    next = next.replace(/<head[^>]*>/i, m => `${m}\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`);
  }
  fs.writeFileSync(ADSENSE_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), status: client && slots.length >= 2 ? 'adsense_preserved_and_audited' : 'adsense_ids_not_found_or_incomplete_no_fake_ids_injected', client, publisherId, headerSlot: slots[0] || null, sidebarSlot: slots[1] || null }, null, 2) + '\n');
  return next;
}

function writeLegalPages() {
  const commonStyle = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;line-height:1.55;color:#111}a{color:#0645ad}</style>';
  fs.writeFileSync('privacy.html', `<!doctype html><html><head>${commonStyle}<title>Privacy Policy | ParleyMap</title></head><body><h1>Privacy Policy</h1><p>ParleyMap provides public-source presence intelligence. We do not publish private addresses, leaked itineraries, hotel stays, hospitals, residences or live route tracking.</p><p>The site may use essential cookies for preferences. Advertising and analytics cookies are only used when enabled and accepted where required.</p><p>Advertising, if active, may be served by Google AdSense and is subject to Google policies and consent requirements.</p><p>Contact: contact@parleymap.com</p></body></html>\n`);
  fs.writeFileSync('impressum.html', `<!doctype html><html><head>${commonStyle}<title>Impressum | ParleyMap</title></head><body><h1>Impressum</h1><p>ParleyMap is a public-source intelligence demo site for mapped public appearances, meetings and institutional events.</p><p>Responsible contact: contact@parleymap.com</p><p>No private tracking is provided. Data is limited to public-source records and city-level institutional or event locations.</p></body></html>\n`);
  fs.writeFileSync('about.html', `<!doctype html><html><head>${commonStyle}<title>About | ParleyMap</title></head><body><h1>About ParleyMap</h1><p>ParleyMap maps public appearances, official meetings, summits and institutionally relevant public events.</p></body></html>\n`);
  fs.writeFileSync('contact.html', `<!doctype html><html><head>${commonStyle}<title>Contact | ParleyMap</title></head><body><h1>Contact</h1><p>Email: contact@parleymap.com</p></body></html>\n`);
  fs.writeFileSync('methodology.html', `<!doctype html><html><head>${commonStyle}<title>Methodology | ParleyMap</title></head><body><h1>Methodology</h1><p>ParleyMap uses official and public host sources where possible. Generic watch lists are not treated as events unless a person, date, place and primary source are present.</p></body></html>\n`);
  fs.writeFileSync('data-sources.html', `<!doctype html><html><head>${commonStyle}<title>Data Sources | ParleyMap</title></head><body><h1>Data Sources</h1><p>Sources include public government, multilateral institution, summit host and official organizational websites.</p></body></html>\n`);
}

function audit(data) {
  const visible = ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples'];
  const flat = [];
  for (const key of visible) {
    const arr = Array.isArray(data[key]) ? data[key] : [];
    for (const obj of arr) if (isProfileLike(obj)) flat.push({ key, obj });
  }
  const grossiVisible = flat.filter(x => textBlob(x.obj).includes('rafael grossi') || String(x.obj.id || '') === 'r-057-rafael-grossi');
  const grossiBad = grossiVisible.filter(x => String(x.obj.countryFocusCode || '').toUpperCase() === 'IA' || String(x.obj.flagAudit?.code || '').toUpperCase() === 'BI');
  const grossiCanon = grossiVisible.filter(x => String(x.obj.countryFocusCode || '').toUpperCase() === 'AT');
  const allRows = [];
  walkCollect(data, '', allRows);
  const fakeRows = allRows.filter(x => isFakeEvent(x.obj));
  const problems = [];
  if (grossiCanon.length < 1) problems.push('no Grossi canonical AT/Vienna profile found');
  if (grossiBad.length > 0) problems.push('Grossi still has IA/BI contamination in visible profile collections');
  if (grossiVisible.length > 2) problems.push(`too many visible Grossi profile rows: ${grossiVisible.length}`);
  if (fakeRows.length > 0) problems.push(`fake dated/source-watch rows remain: ${fakeRows.length}`);
  const required = [
    ['pope leo xiv', 'VA'], ['claudia sheinbaum','MX'], ['prabowo subianto','ID']
  ];
  for (const [name, code] of required) {
    const matches = flat.filter(x => textBlob(x.obj).includes(name));
    if (!matches.some(x => String(x.obj.countryFocusCode || '').toUpperCase() === code)) problems.push(`${name} missing ${code} anchor`);
  }
  return { status: problems.length ? 'audit_failed' : 'audit_passed', generatedAt: new Date().toISOString(), problems, grossiVisibleCount: grossiVisible.length, grossiCanonicalCount: grossiCanon.length, fakeRowsRemaining: fakeRows.length };
}

function walkCollect(value, path, out) {
  if (Array.isArray(value)) { value.forEach((v, i) => walkCollect(v, `${path}[${i}]`, out)); return; }
  if (!value || typeof value !== 'object') return;
  out.push({ path, obj: value });
  for (const [k, v] of Object.entries(value)) if (v && typeof v === 'object') walkCollect(v, path ? `${path}.${k}` : k, out);
}

function gitCommitIfPossible() {
  if (!process.env.GITHUB_ACTIONS) return;
  try {
    execSync('git config user.name "github-actions[bot]"');
    execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
    execSync('git add index.html ads.txt privacy.html impressum.html about.html contact.html methodology.html data-sources.html data/demo.json data/diagnostics/*.json data/diagnostics/*.md', { stdio: 'inherit' });
    try { execSync('git diff --cached --quiet'); console.log('No self-commit changes.'); return; } catch {}
    execSync('git commit -m "Canonical repair ParleyMap data and AdSense surface"', { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Self-commit failed; workflow auto-commit may still commit indexed files:', error.message);
  }
}

fs.mkdirSync(DIAG_DIR, { recursive: true });
const payload = readIndexData();
validateCore(payload.data, 'before');
const before = { people: count(payload.data,'people'), roster: count(payload.data,'roster'), expansionRoster: count(payload.data,'expansionRoster'), appearances: count(payload.data,'appearances'), categories: count(payload.data,'categories') };
const report = { generatedAt: new Date().toISOString(), before, anchorRepairs: [], fakeEventsRemoved: [], profileDuplicatesRemoved: [], officialEventsAdded: [] };
const repaired = walkAndRepair(payload.data, '', report);
seedOfficialEvents(repaired, report);
repaired.meta = { ...(repaired.meta || {}), lastCanonicalMaintenance: new Date().toISOString(), canonicalMaintenanceStatus: 'institutional anchors, fake events, official events and AdSense surface repaired' };
validateCore(repaired, 'after');
const after = { people: count(repaired,'people'), roster: count(repaired,'roster'), expansionRoster: count(repaired,'expansionRoster'), appearances: count(repaired,'appearances'), categories: count(repaired,'categories') };
if (after.roster < before.roster - 5) throw new Error('roster count dropped too much');
if (after.appearances < 480) throw new Error('appearances count below safety floor');
writeIndexData(payload, repaired);
let html = fs.readFileSync(INDEX_PATH, 'utf8');
html = installRuntimeGuard(html);
fs.writeFileSync(INDEX_PATH, html);
html = recoverAdsense(html, {});
fs.writeFileSync(INDEX_PATH, html);
writeLegalPages();
const verifyPayload = readIndexData();
const auditResult = audit(verifyPayload.data);
fs.writeFileSync(AUDIT_PATH, JSON.stringify(auditResult, null, 2) + '\n');
report.after = after;
report.status = auditResult.status === 'audit_passed' ? 'canonical_maintenance_repaired' : 'canonical_maintenance_repaired_with_audit_failures';
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
const summary = [
  '# ParleyMap canonical maintenance repair', '',
  `Generated: ${new Date().toISOString()}`, '',
  `Audit status: ${auditResult.status}`, '',
  '## Counts', '',
  '| Dataset | Before | After |', '|---|---:|---:|',
  `| people | ${before.people} | ${after.people} |`,
  `| roster | ${before.roster} | ${after.roster} |`,
  `| expansionRoster | ${before.expansionRoster} | ${after.expansionRoster} |`,
  `| appearances | ${before.appearances} | ${after.appearances} |`,
  `| categories | ${before.categories} | ${after.categories} |`, '',
  '## Repairs', '',
  `- Anchor repairs: ${report.anchorRepairs.length}`,
  `- Fake events removed: ${report.fakeEventsRemoved.length}`,
  `- Profile duplicate rows removed: ${report.profileDuplicatesRemoved.length}`,
  `- Official events added: ${report.officialEventsAdded.length}`,
  `- Grossi visible count: ${auditResult.grossiVisibleCount}`,
  `- Fake rows remaining: ${auditResult.fakeRowsRemaining}`,
  '',
  '## Audit problems', '',
  ...(auditResult.problems.length ? auditResult.problems.map(p => `- ${p}`) : ['- none'])
].join('\n') + '\n';
fs.writeFileSync(SUMMARY_PATH, summary);
console.log(summary);
if (auditResult.status !== 'audit_passed') {
  throw new Error('Canonical hard audit failed: ' + auditResult.problems.join('; '));
}
gitCommitIfPossible();
