#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const INDEX_PATH = 'index.html';
const MIRROR_PATH = 'data/demo.json';
const ANCHORS_PATH = 'data/curated-anchors.json';
const SEEDS_PATH = 'data/official-event-seeds.json';
const DIAG_DIR = 'data/diagnostics';
const REPORT_PATH = `${DIAG_DIR}/canonical-rescue-report.json`;
const AUDIT_PATH = `${DIAG_DIR}/canonical-hard-audit-report.json`;
const ADSENSE_PATH = `${DIAG_DIR}/adsense-preserve-audit-report.json`;
const SUMMARY_PATH = `${DIAG_DIR}/LATEST_RUN_SUMMARY.md`;

const MIN_COUNTS = {
  people: 80,
  roster: 150,
  expansionRoster: 80,
  appearances: 450,
  categories: 8
};

const BAD_EVENT_RE = /\b(iaea nuclear diplomacy watch|city of london finance diplomacy watch|think[- ]tank leadership events watch|royal diaries? and state[- ]visit watch|generic source[- ]watch|source[- ]watch card|watch card)\b/i;
const GENERIC_NON_EVENT_RE = /\b(homepage|faq|frequently asked|fact sheet|privacy|terms|sitemap|programme|program|profile page)\b/i;
const WATCH_STATUS_RE = /source[-_ ]watch|watch[-_ ]only|discovery[-_ ]watch|lead[-_ ]only/i;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readFileIfExists(file) {
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  } catch {}
  return '';
}

function runGit(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...options });
}

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(value) {
  return norm(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
}

function findDemoScript(html) {
  const openRe = /<script\b[^>]*\bid=["']demo-data["'][^>]*>/i;
  const openMatch = openRe.exec(html);
  if (!openMatch) return null;
  const jsonStart = openMatch.index + openMatch[0].length;
  const closeIndex = html.indexOf('</script>', jsonStart);
  if (closeIndex === -1) return null;
  return {
    open: openMatch[0],
    jsonStart,
    jsonEnd: closeIndex,
    jsonText: html.slice(jsonStart, closeIndex).trim()
  };
}

function parseHtmlDataset(html, label) {
  const script = findDemoScript(html);
  if (!script) throw new Error(`${label}: demo-data script block not found`);
  const data = JSON.parse(script.jsonText);
  return { script, data };
}

function counts(data) {
  return {
    people: Array.isArray(data.people) ? data.people.length : null,
    roster: Array.isArray(data.roster) ? data.roster.length : null,
    topRoster: Array.isArray(data.topRoster) ? data.topRoster.length : null,
    expansionRoster: Array.isArray(data.expansionRoster) ? data.expansionRoster.length : null,
    appearances: Array.isArray(data.appearances) ? data.appearances.length : null,
    categories: Array.isArray(data.categories) ? data.categories.length : null
  };
}

function validateShape(data, label, relaxed = false) {
  for (const key of ['people', 'roster', 'expansionRoster', 'appearances', 'categories']) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
    const min = MIN_COUNTS[key];
    if (!relaxed && data[key].length < min) throw new Error(`${label}: ${key} count too low, got ${data[key].length}, expected >= ${min}`);
  }
  if (!data.meta || typeof data.meta !== 'object' || Array.isArray(data.meta)) {
    throw new Error(`${label}: meta must be an object`);
  }
}

function isSafeHtml(html) {
  try {
    const { data } = parseHtmlDataset(html, 'candidate');
    validateShape(data, 'candidate');
    return true;
  } catch {
    return false;
  }
}

function loadCurrentOrRecoveredHtml() {
  const currentHtml = readFileIfExists(INDEX_PATH);
  const currentHasDemo = Boolean(findDemoScript(currentHtml));
  const recovery = { usedHistory: false, historyCommit: null, reason: null };

  if (currentHasDemo) {
    try {
      const { data } = parseHtmlDataset(currentHtml, 'current index.html');
      validateShape(data, 'current index.html');
      return { html: currentHtml, recovery };
    } catch (error) {
      recovery.reason = `current index.html failed validation: ${error.message}`;
    }
  } else {
    recovery.reason = 'current index.html has no demo-data block';
  }

  let commits = [];
  try {
    commits = runGit(['log', '--format=%H', '--', INDEX_PATH]).split('\n').filter(Boolean);
  } catch {}

  for (const hash of commits) {
    try {
      const candidate = runGit(['show', `${hash}:${INDEX_PATH}`], { maxBuffer: 80 * 1024 * 1024 });
      if (!isSafeHtml(candidate)) continue;
      recovery.usedHistory = true;
      recovery.historyCommit = hash;
      return { html: candidate, recovery };
    } catch {}
  }

  if (fs.existsSync(MIRROR_PATH)) {
    const mirror = JSON.parse(fs.readFileSync(MIRROR_PATH, 'utf8'));
    validateShape(mirror, 'data/demo.json');
    const html = currentHtml && /<html/i.test(currentHtml)
      ? currentHtml.replace('</body>', `<script id="demo-data" type="application/json">\n${JSON.stringify(mirror, null, 2)}\n</script>\n</body>`)
      : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ParleyMap</title></head><body><div id="app">ParleyMap</div><script id="demo-data" type="application/json">\n${JSON.stringify(mirror, null, 2)}\n</script></body></html>`;
    recovery.usedHistory = false;
    recovery.historyCommit = null;
    recovery.reason = `${recovery.reason}; built emergency shell from data/demo.json`;
    return { html, recovery };
  }

  throw new Error(`Unable to load a safe index.html. Reason: ${recovery.reason}`);
}

function collectTextSources(primaryHtml) {
  const texts = [primaryHtml, readFileIfExists('ads.txt'), readFileIfExists('index.template.html'), readFileIfExists('privacy.html'), readFileIfExists('impressum.html')];

  for (const file of ['data/demo.json', 'README.md', 'README.txt']) {
    texts.push(readFileIfExists(file));
  }

  let commits = [];
  try {
    commits = runGit(['log', '--format=%H', '-n', '80']).split('\n').filter(Boolean);
  } catch {}
  for (const hash of commits) {
    for (const file of ['index.html', 'ads.txt', 'index.template.html']) {
      try {
        const text = runGit(['show', `${hash}:${file}`], { maxBuffer: 80 * 1024 * 1024 });
        texts.push(text);
      } catch {}
    }
  }
  return texts.join('\n');
}

function normalizePublisher(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const digits = raw.match(/(?:ca-)?pub-(\d{10,})/);
  return digits ? `pub-${digits[1]}` : '';
}

function normalizeClient(input) {
  const pub = normalizePublisher(input);
  return pub ? `ca-${pub}` : '';
}

function recoverAdsense(html, env) {
  const allText = collectTextSources(html);
  const envClient = normalizeClient(env.PUBLISHER_ID || env.publisher_id || '');
  const clients = [...new Set([...allText.matchAll(/ca-pub-\d{10,}/g)].map((m) => m[0]))];
  const pubs = [...new Set([...allText.matchAll(/(?<!ca-)pub-\d{10,}/g)].map((m) => m[0]))];
  const slots = [...new Set([...allText.matchAll(/data-ad-slot=["']([^"']+)["']/g)].map((m) => m[1]).filter((s) => /^\d{4,}$/.test(s)))];

  const client = envClient || clients[0] || normalizeClient(pubs[0] || '');
  const publisherId = normalizePublisher(client || pubs[0] || '');
  const inputHeader = String(env.HEADER_SLOT_ID || env.header_slot_id || '').trim();
  const inputSidebar = String(env.SIDEBAR_SLOT_ID || env.sidebar_slot_id || '').trim();
  const headerSlot = inputHeader || slots[0] || '';
  const sidebarSlot = inputSidebar || slots.find((s) => s !== headerSlot) || '';

  return {
    client,
    publisherId,
    headerSlot,
    sidebarSlot,
    recoveredClients: clients,
    recoveredSlots: slots,
    foundEnough: Boolean(client && publisherId && headerSlot && sidebarSlot && headerSlot !== sidebarSlot)
  };
}

function injectIntoHead(html, snippet, marker) {
  if (html.includes(marker)) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${snippet}\n</head>`);
  return `${snippet}\n${html}`;
}

function installAdsense(html, ads) {
  if (!ads.foundEnough) return html;
  const meta = `<meta name="google-adsense-account" content="${ads.client}">`;
  if (!/name=["']google-adsense-account["']/i.test(html)) {
    html = injectIntoHead(html, meta, 'google-adsense-account');
  }
  const loader = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>`;
  if (!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html)) {
    html = injectIntoHead(html, loader, 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
  }

  const runtime = `
<script id="parleymap-adsense-runtime">
(function(){
  var client = ${JSON.stringify(ads.client)};
  var units = [
    {name:'header', slot:${JSON.stringify(ads.headerSlot)}},
    {name:'sidebar', slot:${JSON.stringify(ads.sidebarSlot)}}
  ];
  window.parleymapAdsenseUnits = units.map(function(u){ return { client: client, slot: u.slot, name: u.name }; });
  function makeIns(unit){
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', unit.slot);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    return ins;
  }
  function adBoxes(){
    var selectors = ['[data-ad-window]', '[data-ad-placeholder]', '.ad-window', '.ad-slot', '.adsense-slot', '[id*=ad]', '[class*=ad]'];
    var seen = [];
    selectors.forEach(function(sel){
      try { Array.prototype.forEach.call(document.querySelectorAll(sel), function(el){ if (seen.indexOf(el) === -1) seen.push(el); }); } catch(e) {}
    });
    return seen.filter(function(el){ return el && el.tagName !== 'SCRIPT' && el.tagName !== 'META' && el.tagName !== 'LINK'; });
  }
  function install(){
    if (!window.adsbygoogle) window.adsbygoogle = [];
    var existing = document.querySelectorAll('ins.adsbygoogle[data-ad-slot]').length;
    if (existing >= 2) return;
    var boxes = adBoxes();
    units.forEach(function(unit, i){
      var selector = 'ins.adsbygoogle[data-ad-slot="' + unit.slot + '"]';
      if (document.querySelector(selector)) return;
      var target = boxes[i];
      if (!target) {
        target = document.createElement('div');
        target.setAttribute('data-parleymap-adsense-fallback', unit.name);
        target.style.display = 'block';
        target.style.minHeight = unit.name === 'header' ? '90px' : '250px';
        var host = document.querySelector('main') || document.body;
        host.appendChild(target);
      }
      target.innerHTML = '';
      target.appendChild(makeIns(unit));
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  setTimeout(install, 1000);
})();
</script>`;
  if (!/id=["']parleymap-adsense-runtime["']/.test(html)) {
    html = html.replace(/<\/body>/i, `${runtime}\n</body>`);
  }
  return html;
}

function writeLegalPages() {
  const commonHead = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>';
  fs.writeFileSync('privacy.html', `${commonHead}Privacy Policy | ParleyMap</title></head><body><main><h1>Privacy Policy</h1><p>ParleyMap provides public-source relationship and appearance intelligence. The service uses public data, analytics, hosting logs, and advertising technology where enabled.</p><h2>Data sources</h2><p>ParleyMap uses official, host-public, and clearly attributable public sources. It does not publish private addresses, private routes, leaked itineraries, hotel stays, residences, hospitals, or live proximity tracking.</p><h2>Advertising</h2><p>ParleyMap may use Google AdSense. Advertising partners may use cookies or similar technologies to serve and measure ads. Users can manage advertising cookies through their browser and Google advertising controls.</p><h2>Contact</h2><p>Contact: contact@parleymap.com</p></main></body></html>\n`);
  fs.writeFileSync('impressum.html', `${commonHead}Impressum | ParleyMap</title></head><body><main><h1>Impressum</h1><p>ParleyMap is a public-source influence and appearance intelligence project.</p><p>Responsible contact: contact@parleymap.com</p><p>Editorial policy: city-level public-source records only. No private tracking, leaked itinerary publication, or private-location disclosure.</p></main></body></html>\n`);
  fs.writeFileSync('about.html', `${commonHead}About | ParleyMap</title></head><body><main><h1>About ParleyMap</h1><p>ParleyMap maps public appearances, official meetings, summit participation, and institutional public events for high-impact public figures and organizations.</p></main></body></html>\n`);
  fs.writeFileSync('methodology.html', `${commonHead}Methodology | ParleyMap</title></head><body><main><h1>Methodology</h1><p>Events require a named person, date, public city-level location, specific event title, and official or host-public source. Generic watch cards, homepages, biographies, profile pages, and source indexes are not treated as dated events.</p></main></body></html>\n`);
  fs.writeFileSync('data-sources.html', `${commonHead}Data Sources | ParleyMap</title></head><body><main><h1>Data Sources</h1><p>Preferred sources include official government pages, international organizations, host institutions, summit organizers, Vatican travel bulletins, IAEA statements, Royal Family engagement pages, and comparable public primary sources.</p></main></body></html>\n`);
  fs.writeFileSync('contact.html', `${commonHead}Contact | ParleyMap</title></head><body><main><h1>Contact</h1><p>Email: contact@parleymap.com</p></main></body></html>\n`);
}

function objectText(item) {
  return norm([
    item && item.id,
    item && item.slug,
    item && item.name,
    item && item.canonicalName,
    item && item.wikiTitle,
    item && item.roleTitle,
    item && item.organization,
    item && item.countryName,
    item && item.countryFocus,
    item && item.countryFocusCode,
    item && item.profileLine,
    item && Array.isArray(item.profileLines) ? item.profileLines.map((p) => p && (p.text || p.label)).join(' ') : ''
  ].join(' '));
}

function matchesAnchor(item, rule) {
  const text = objectText(item);
  if (!text) return false;
  if (Array.isArray(rule.matchAll) && !rule.matchAll.every((t) => text.includes(norm(t)))) return false;
  if (Array.isArray(rule.matchAny) && !rule.matchAny.some((t) => text.includes(norm(t)))) return false;
  if (Array.isArray(rule.roleAny) && !rule.roleAny.some((t) => text.includes(norm(t)))) return false;
  return true;
}

function anchorObject(rule) {
  const a = rule.anchor;
  return {
    label: a.label,
    city: a.city,
    countryCode: a.countryCode,
    countryName: a.countryName,
    lat: a.lat,
    lng: a.lng,
    precision: 'city',
    type: 'institutional_base',
    privacy: 'city-level public institutional base only'
  };
}

function isPlaceholderImage(value) {
  const s = String(value || '').trim();
  return !s || /placeholder|avatar|no[-_ ]?image|missing|transparent|blank/i.test(s);
}

function collectImages(data) {
  const images = new Map();
  walk(data, '$', (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const text = objectText(value);
    const image = value.imageUrl || value.portraitUrl || value.photoUrl || value.image;
    if (isPlaceholderImage(image)) return;
    for (const rule of anchorRules()) {
      if (matchesAnchor(value, rule)) {
        images.set(rule.key, image);
      }
    }
    const key = value.id || value.slug || slug(value.canonicalName || value.name || '');
    if (key && !images.has(key)) images.set(key, image);
  });
  return images;
}

let ANCHOR_CACHE = null;
function anchorRules() {
  if (!ANCHOR_CACHE) {
    ANCHOR_CACHE = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8')).anchors || [];
  }
  return ANCHOR_CACHE;
}

function applyAnchorPatch(item, rule, imageMap, pathLabel) {
  const a = rule.anchor;
  const anchor = anchorObject(rule);

  item.canonicalName = rule.canonicalName || item.canonicalName || item.name;
  item.name = item.name || item.canonicalName;
  item.organization = rule.organization || item.organization;
  item.roleTitle = rule.roleTitle || item.roleTitle;
  item.countryFocus = rule.countryFocus || a.countryCode;
  item.countryFocusCode = rule.countryFocusCode || a.countryCode;
  item.countryCode = rule.countryFocusCode || a.countryCode;
  item.countryName = rule.countryName || a.countryName;
  item.country = rule.countryName || a.countryName;
  item.homeRegion = a.region;
  item.locationStatus = 'institutional_base_city_level';
  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;
  item.baseLocation = anchor;
  item.institutionalBase = anchor;
  item.lat = a.lat;
  item.lng = a.lng;
  item.lon = a.lng;
  item.longitude = a.lng;
  item.latitude = a.lat;
  item.homeLat = a.lat;
  item.homeLng = a.lng;
  item.mapLat = a.lat;
  item.mapLng = a.lng;
  item.anchorLat = a.lat;
  item.anchorLng = a.lng;
  item.coordinates = { lat: a.lat, lng: a.lng };
  item.geo = { lat: a.lat, lng: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  item.flagAudit = {
    ...(item.flagAudit || {}),
    code: a.countryCode,
    countryCode: a.countryCode,
    countryName: a.countryName,
    label: a.countryName,
    status: 'country flag'
  };
  item.flagCode = a.countryCode;
  item.countryFlagCode = a.countryCode;
  if (rule.institutionCode) {
    item.institutionCode = rule.institutionCode;
    item.institutionLabel = rule.institutionLabel || rule.institutionCode;
    item.orgMark = { code: rule.institutionCode, label: rule.institutionLabel || rule.institutionCode };
  }

  const image = imageMap.get(rule.key) || imageMap.get(item.id) || imageMap.get(item.slug);
  if (image && isPlaceholderImage(item.imageUrl)) {
    item.imageUrl = image;
    item.imageProvider = item.imageProvider || 'restored from matching profile copy';
    item.visualAuditStatus = 'restored from matching profile copy; verify license and attribution';
    item.imageAudit = { ...(item.imageAudit || {}), status: 'restored-from-existing-copy', instruction: 'Verify license and attribution before promotional reuse.' };
  }

  item.parleymapCanonicalAnchorKey = rule.key;
  item.parleymapAnchorAudit = { status: 'canonical_anchor_applied', path: pathLabel, at: new Date().toISOString() };
}

function walk(value, pathLabel, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value, pathLabel);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${pathLabel}[${index}]`, visit));
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object') walk(child, `${pathLabel}.${key}`, visit);
    }
  }
}

function isProfileLike(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (item.startsAt || item.endsAt || item.sourcePack || item.eventType) return false;
  return Boolean(item.id || item.slug || item.name || item.canonicalName || item.wikiTitle || item.roleTitle || item.profileLine);
}

function repairAnchors(data) {
  const imageMap = collectImages(data);
  const fixes = [];
  walk(data, '$', (item, pathLabel) => {
    if (!isProfileLike(item)) return;
    for (const rule of anchorRules()) {
      if (!matchesAnchor(item, rule)) continue;
      const before = { countryFocusCode: item.countryFocusCode || null, countryName: item.countryName || null, flagAudit: item.flagAudit || null, lat: item.lat ?? item.mapLat ?? item.homeBases?.[0]?.lat ?? null, lng: item.lng ?? item.mapLng ?? item.homeBases?.[0]?.lng ?? null };
      applyAnchorPatch(item, rule, imageMap, pathLabel);
      const after = { countryFocusCode: item.countryFocusCode || null, countryName: item.countryName || null, flagAudit: item.flagAudit || null, lat: item.lat, lng: item.lng };
      fixes.push({ key: rule.key, path: pathLabel, before, after });
      break;
    }
  });
  return fixes;
}

function shouldRemoveEvent(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const title = String(item.title || item.name || item.label || '');
  const summary = String(item.summary || item.description || item.text || '');
  const status = String(item.status || item.renderMode || item.kind || item.type || '');
  const eventish = Boolean(item.startsAt || item.date || item.eventType || item.location || item.sourcePack);
  if (!eventish) return false;
  const haystack = `${title} ${summary} ${status}`;
  if (BAD_EVENT_RE.test(haystack)) return true;
  if (WATCH_STATUS_RE.test(status) && (item.startsAt || item.date)) return true;
  if (WATCH_STATUS_RE.test(haystack) && (item.startsAt || item.date)) return true;
  if (GENERIC_NON_EVENT_RE.test(haystack) && (WATCH_STATUS_RE.test(status) || WATCH_STATUS_RE.test(haystack))) return true;
  return false;
}

function filterEventsDeep(value, pathLabel, removed) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const out = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (shouldRemoveEvent(item)) {
        removed.push({ path: `${pathLabel}[${i}]`, id: item.id || null, title: item.title || item.name || null, status: item.status || null });
        continue;
      }
      out.push(filterEventsDeep(item, `${pathLabel}[${i}]`, removed));
    }
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') value[key] = filterEventsDeep(child, `${pathLabel}.${key}`, removed);
  }
  return value;
}

function personIdForKey(data, key, fallback) {
  const rules = anchorRules();
  const rule = rules.find((r) => r.key === key);
  if (!rule) return fallback;
  const rows = [];
  for (const collection of ['people', 'roster', 'topRoster', 'expansionRoster']) {
    if (Array.isArray(data[collection])) rows.push(...data[collection]);
  }
  const match = rows.find((row) => matchesAnchor(row, rule));
  return match?.id || fallback;
}

function normalizeEvent(seed, data) {
  const location = seed.location;
  const startsAt = seed.startsAt;
  return {
    id: seed.id,
    personId: personIdForKey(data, seed.personKey, seed.personKey),
    personName: seed.personName,
    startsAt,
    endsAt: seed.endsAt || null,
    status: seed.status,
    confidence: seed.confidence,
    confidenceLabel: seed.confidenceLabel,
    eventType: seed.eventType,
    title: seed.title,
    summary: seed.summary,
    significance: 'Official-source public event added by canonical rescue workflow.',
    decisions: '',
    location: {
      label: `${location.city}, ${location.countryName}`,
      city: location.city,
      countryCode: location.countryCode,
      countryName: location.countryName,
      lat: location.lat,
      lng: location.lng,
      precision: 'city'
    },
    venuePublic: true,
    securityPrecision: 'city-level public appearance only; no private stops, hotels, residences, leaked routes or live proximity',
    publicInterestScore: 72,
    eventGroupId: `official-${slug(seed.personName)}-${startsAt.slice(0, 10)}`,
    topics: seed.topics || [],
    counterpartIds: [],
    sourcePack: seed.sourcePack,
    visual: { status: 'runtime portrait', policy: 'Use only audited public media with attribution.' },
    lastCheckedAt: new Date().toISOString(),
    marketImpact: { sectors: [], companies: [], countries: [location.countryName], confidence: 'low' },
    realEvent: true,
    sourcePolicy: 'official_source_seed'
  };
}

function addOfficialEvents(data) {
  const seedData = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf8'));
  if (!Array.isArray(data.appearances)) data.appearances = [];
  const existing = new Set(data.appearances.map((event) => String(event.id || '')));
  const added = [];
  for (const seed of seedData.events || []) {
    if (existing.has(seed.id)) continue;
    const event = normalizeEvent(seed, data);
    data.appearances.push(event);
    existing.add(event.id);
    added.push({ id: event.id, title: event.title, personId: event.personId, city: event.location.city });
  }
  data.appearances.sort((a, b) => String(b.startsAt || '').localeCompare(String(a.startsAt || '')));
  return added;
}

function visibleCollections(data) {
  return ['people', 'roster', 'topRoster', 'expansionRoster', 'priorityExpansion', 'watchlistExamples']
    .map((key) => [key, data[key]])
    .filter(([, value]) => Array.isArray(value));
}

function dedupeProfileCollections(data) {
  const removed = [];
  for (const [collection, rows] of visibleCollections(data)) {
    const seen = new Set();
    const next = [];
    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object') {
        next.push(row);
        return;
      }
      const idKey = String(row.id || row.slug || slug(row.canonicalName || row.name || '') || `idx-${index}`);
      const key = idKey.toLowerCase();
      if (seen.has(key)) {
        removed.push({ collection, index, id: row.id || null, name: row.canonicalName || row.name || null, reason: 'duplicate within collection' });
        return;
      }
      seen.add(key);
      next.push(row);
    });
    data[collection] = next;
  }

  // Grossi is kept as a canonical profile in people and roster. Helper/top collections are made non-renderable or removed.
  const grossiRule = anchorRules().find((r) => r.key === 'rafael-grossi');
  for (const [collection, rows] of visibleCollections(data)) {
    if (!grossiRule || !Array.isArray(rows)) continue;
    if (collection === 'people' || collection === 'roster') continue;
    const next = [];
    rows.forEach((row, index) => {
      if (matchesAnchor(row, grossiRule)) {
        removed.push({ collection, index, id: row.id || null, name: row.canonicalName || row.name || null, reason: 'Grossi duplicate visible helper removed' });
        return;
      }
      next.push(row);
    });
    data[collection] = next;
  }
  return removed;
}

function installRuntimeGuard(html) {
  if (/id=["']parleymap-canonical-runtime-guard["']/.test(html)) return { html, installed: false };
  const anchors = anchorRules().map((r) => ({ key: r.key, matchAll: r.matchAll, matchAny: r.matchAny, roleAny: r.roleAny, anchor: r.anchor }));
  const guard = `
<script id="parleymap-canonical-runtime-guard">
(function(){
  var anchors = ${JSON.stringify(anchors)};
  function norm(v){ return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function text(o){ try { return norm([o.id,o.slug,o.name,o.canonicalName,o.wikiTitle,o.roleTitle,o.organization,o.countryName,o.countryFocus,o.countryFocusCode].join(' ')); } catch(e) { return ''; } }
  function match(o, r){ var t=text(o); if(!t)return false; if(r.matchAll && !r.matchAll.every(function(x){return t.indexOf(norm(x))!==-1;})) return false; if(r.matchAny && !r.matchAny.some(function(x){return t.indexOf(norm(x))!==-1;})) return false; if(r.roleAny && !r.roleAny.some(function(x){return t.indexOf(norm(x))!==-1;})) return false; return true; }
  function anchorObj(a){ return { label:a.label, city:a.city, countryCode:a.countryCode, countryName:a.countryName, lat:a.lat, lng:a.lng, precision:'city', type:'institutional_base', privacy:'city-level public institutional base only' }; }
  function patch(o, r){ if(!o || typeof o!=='object') return o; var a=r.anchor, anchor=anchorObj(a); o.countryFocus=a.countryCode; o.countryFocusCode=a.countryCode; o.countryCode=a.countryCode; o.countryName=a.countryName; o.country=a.countryName; o.homeRegion=a.region; o.homeBases=[anchor]; o.homeBase=anchor; o.mapAnchor=anchor; o.anchorLocation=anchor; o.locationStatus='institutional_base_city_level'; o.lat=a.lat; o.lng=a.lng; o.latitude=a.lat; o.longitude=a.lng; o.mapLat=a.lat; o.mapLng=a.lng; o.homeLat=a.lat; o.homeLng=a.lng; o.flagAudit=Object.assign({}, o.flagAudit||{}, {code:a.countryCode,countryCode:a.countryCode,countryName:a.countryName,label:a.countryName,status:'country flag'}); return o; }
  function patchData(data){ if(!data || typeof data!=='object') return data; function walk(v){ if(!v || typeof v!=='object') return; if(Array.isArray(v)){ v.forEach(walk); return; } anchors.forEach(function(r){ if(match(v,r)) patch(v,r); }); Object.keys(v).forEach(function(k){ if(v[k] && typeof v[k]==='object') walk(v[k]); }); } walk(data); return data; }
  window.parleymapCanonicalPatch = patchData;
  try { if(window.__PARLEYMAP_DEMO_DATA__) patchData(window.__PARLEYMAP_DEMO_DATA__); } catch(e) {}
  var oldMarker = window.L && window.L.marker;
  function coerceLatLng(latlng, options){ var payload = options && (options.person || options.record || options.appearance || options.profile || options.data); if(payload){ for(var i=0;i<anchors.length;i++){ if(match(payload, anchors[i])) return [anchors[i].anchor.lat, anchors[i].anchor.lng]; } } return latlng; }
  function installLeaflet(){ if(!window.L || !window.L.marker || window.L.marker.__parleymapGuarded) return; var original = window.L.marker; window.L.marker = function(latlng, options){ return original.call(this, coerceLatLng(latlng, options), options); }; window.L.marker.__parleymapGuarded = true; }
  installLeaflet(); setInterval(installLeaflet, 1000);
})();
</script>`;
  if (/<\/body>/i.test(html)) return { html: html.replace(/<\/body>/i, `${guard}\n</body>`), installed: true };
  return { html: `${html}\n${guard}\n`, installed: true };
}

function writeDataBack(html, script, data) {
  return html.slice(0, script.jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + html.slice(script.jsonEnd);
}

function writeAdsTxt(ads) {
  if (!ads.foundEnough) return false;
  fs.writeFileSync('ads.txt', `google.com, ${ads.publisherId}, DIRECT, f08c47fec0942fa0\n`);
  return true;
}

function auditAnchors(data) {
  const failures = [];
  const required = ['rafael-grossi', 'pope-leo-xiv', 'claudia-sheinbaum', 'prabowo-subianto'];
  for (const key of required) {
    const rule = anchorRules().find((r) => r.key === key);
    const matched = [];
    walk(data, '$', (item, pathLabel) => {
      if (isProfileLike(item) && matchesAnchor(item, rule)) matched.push({ item, path: pathLabel });
    });
    if (matched.length === 0) failures.push(`${key}: no matching profile found`);
    for (const { item, path: p } of matched) {
      const a = rule.anchor;
      const code = String(item.countryFocusCode || item.countryFocus || item.countryCode || '').toUpperCase();
      const lat = Number(item.lat ?? item.mapLat ?? item.homeBases?.[0]?.lat);
      const lng = Number(item.lng ?? item.mapLng ?? item.homeBases?.[0]?.lng);
      if (code !== a.countryCode) failures.push(`${key}: ${p} country code ${code} != ${a.countryCode}`);
      if (!Number.isFinite(lat) || Math.abs(lat - a.lat) > 0.5) failures.push(`${key}: ${p} lat ${lat} != ${a.lat}`);
      if (!Number.isFinite(lng) || Math.abs(lng - a.lng) > 0.5) failures.push(`${key}: ${p} lng ${lng} != ${a.lng}`);
      if (key === 'rafael-grossi' && /\b(IA|BI)\b/i.test(String(item.countryFocusCode || item.countryFocus || item.flagAudit?.code || ''))) failures.push(`${key}: ${p} still has IA/BI location code`);
      if (key === 'pope-leo-xiv' && /\b(AU|US)\b/i.test(String(item.countryFocusCode || item.countryFocus || item.flagAudit?.code || ''))) failures.push(`${key}: ${p} still has AU/US location code`);
      if (key === 'claudia-sheinbaum' && /\b(CA)\b/i.test(String(item.flagAudit?.code || ''))) failures.push(`${key}: ${p} still has CA flag code`);
    }
  }
  return failures;
}

function auditFakeEvents(data) {
  const failures = [];
  walk(data, '$', (item, pathLabel) => {
    if (shouldRemoveEvent(item)) failures.push(`${pathLabel}: fake/watch event remains: ${item.title || item.name || item.label || item.id || 'untitled'}`);
  });
  return failures;
}

function auditGrossiVisible(data) {
  const rule = anchorRules().find((r) => r.key === 'rafael-grossi');
  const grossiVisible = [];
  for (const [collection, rows] of visibleCollections(data)) {
    rows.forEach((row, index) => {
      if (matchesAnchor(row, rule)) grossiVisible.push({ collection, index, id: row.id || null, name: row.canonicalName || row.name || null });
    });
  }
  const allowed = grossiVisible.filter((r) => r.collection === 'people' || r.collection === 'roster');
  const disallowed = grossiVisible.filter((r) => r.collection !== 'people' && r.collection !== 'roster');
  const failures = [];
  if (disallowed.length) failures.push(`Grossi remains in helper visible collections: ${JSON.stringify(disallowed)}`);
  if (allowed.length === 0) failures.push('Grossi missing from canonical visible collections');
  return { failures, grossiVisible };
}

function auditAdsense(html, ads, requireReady) {
  const failures = [];
  const source = html + '\n' + readFileIfExists('ads.txt');
  if (requireReady) {
    if (!ads.foundEnough) failures.push('AdSense IDs are not recoverable and no valid inputs were provided');
    if (!/google-adsense-account/.test(source)) failures.push('google-adsense-account meta missing');
    if (!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/.test(source)) failures.push('AdSense loader missing');
    if (!/data-ad-slot=/.test(source) && !/data-ad-slot/.test(source)) failures.push('data-ad-slot markers missing');
    if (!fs.existsSync('ads.txt')) failures.push('ads.txt missing');
    if (ads.publisherId && !readFileIfExists('ads.txt').includes(ads.publisherId)) failures.push('ads.txt does not contain recovered publisher ID');
  }
  return failures;
}

function writeSummary(report, audit, adsense) {
  const lines = [];
  lines.push('# ParleyMap canonical rescue');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`Status: ${audit.status}`);
  lines.push(`Recovered from history: ${report.recovery.usedHistory ? 'yes' : 'no'}`);
  lines.push(`Anchor repairs: ${report.anchorFixes.length}`);
  lines.push(`Fake events removed: ${report.fakeEventsRemoved.length}`);
  lines.push(`Duplicate profile rows removed: ${report.profileDuplicatesRemoved.length}`);
  lines.push(`Official events added: ${report.officialEventsAdded.length}`);
  lines.push(`Runtime guard installed: ${report.runtimeGuardInstalled}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Dataset | Before | After |');
  lines.push('|---|---:|---:|');
  for (const key of ['people', 'roster', 'topRoster', 'expansionRoster', 'appearances', 'categories']) {
    lines.push(`| ${key} | ${report.before[key]} | ${report.after[key]} |`);
  }
  lines.push('');
  lines.push('## AdSense');
  lines.push('');
  lines.push(`Status: ${adsense.status}`);
  lines.push(`Client: ${adsense.client || 'not found'}`);
  lines.push(`Publisher ID: ${adsense.publisherId || 'not found'}`);
  lines.push(`Header slot: ${adsense.headerSlot || 'not found'}`);
  lines.push(`Sidebar slot: ${adsense.sidebarSlot || 'not found'}`);
  lines.push('');
  if (audit.failures.length) {
    lines.push('## Audit failures');
    lines.push('');
    audit.failures.forEach((f) => lines.push(`- ${f}`));
  }
  fs.writeFileSync(SUMMARY_PATH, lines.join('\n') + '\n');
}

function main() {
  ensureDir(DIAG_DIR);
  const requireAdsenseReady = String(process.env.REQUIRE_ADSENSE_READY || process.env.require_adsense_ready || 'false').toLowerCase() === 'true';
  const { html: baseHtml, recovery } = loadCurrentOrRecoveredHtml();
  const { script, data } = parseHtmlDataset(baseHtml, 'working index.html');
  validateShape(data, 'before');
  const before = counts(data);

  const fakeEventsRemoved = [];
  filterEventsDeep(data, '$', fakeEventsRemoved);
  const anchorFixes = repairAnchors(data);
  const profileDuplicatesRemoved = dedupeProfileCollections(data);
  const officialEventsAdded = addOfficialEvents(data);

  data.meta = {
    ...(data.meta || {}),
    lastCanonicalRescueRun: new Date().toISOString(),
    canonicalRescueStatus: 'canonical index demo-data repaired, audited, and mirrored to data/demo.json',
    lastDataUpdate: new Date().toISOString()
  };

  validateShape(data, 'after');
  const after = counts(data);
  if (after.roster < before.roster - 5) throw new Error(`roster dropped unexpectedly from ${before.roster} to ${after.roster}`);
  if (after.people < before.people - 5) throw new Error(`people dropped unexpectedly from ${before.people} to ${after.people}`);
  if (after.appearances < MIN_COUNTS.appearances) throw new Error(`appearances dropped below floor: ${after.appearances}`);

  let nextHtml = writeDataBack(baseHtml, script, data);
  const ads = recoverAdsense(nextHtml, process.env);
  nextHtml = installAdsense(nextHtml, ads);
  const guard = installRuntimeGuard(nextHtml);
  nextHtml = guard.html;
  const adsTxtWritten = writeAdsTxt(ads);
  writeLegalPages();

  const post = parseHtmlDataset(nextHtml, 'post-write html');
  validateShape(post.data, 'post-write html');

  const failures = [];
  failures.push(...auditAnchors(post.data));
  failures.push(...auditFakeEvents(post.data));
  const grossiAudit = auditGrossiVisible(post.data);
  failures.push(...grossiAudit.failures);
  failures.push(...auditAdsense(nextHtml, ads, requireAdsenseReady));

  const audit = {
    generatedAt: new Date().toISOString(),
    status: failures.length ? 'audit_failed' : 'audit_passed',
    failures,
    grossiVisible: grossiAudit.grossiVisible,
    counts: counts(post.data),
    requiredAnchors: ['rafael-grossi', 'pope-leo-xiv', 'claudia-sheinbaum', 'prabowo-subianto']
  };
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n');

  const adsenseReport = {
    generatedAt: new Date().toISOString(),
    status: ads.foundEnough ? 'adsense_preserved_and_audited' : 'adsense_ids_not_found_no_fake_ids_injected',
    client: ads.client || null,
    publisherId: ads.publisherId || null,
    headerSlot: ads.headerSlot || null,
    sidebarSlot: ads.sidebarSlot || null,
    adsTxtWritten,
    recoveredClients: ads.recoveredClients,
    recoveredSlots: ads.recoveredSlots
  };
  fs.writeFileSync(ADSENSE_PATH, JSON.stringify(adsenseReport, null, 2) + '\n');

  if (failures.length) {
    writeSummary({ recovery, before, after, anchorFixes, fakeEventsRemoved, profileDuplicatesRemoved, officialEventsAdded, runtimeGuardInstalled: guard.installed }, audit, adsenseReport);
    throw new Error(`Hard audit failed: ${failures.join('; ')}`);
  }

  fs.writeFileSync(INDEX_PATH, nextHtml);
  ensureDir('data');
  fs.writeFileSync(MIRROR_PATH, JSON.stringify(post.data, null, 2) + '\n');

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'canonical_rescue_applied',
    recovery,
    before,
    after,
    anchorFixes,
    fakeEventsRemoved,
    profileDuplicatesRemoved,
    officialEventsAdded,
    runtimeGuardInstalled: guard.installed,
    adsense: adsenseReport
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
  writeSummary(report, audit, adsenseReport);
  console.log(JSON.stringify({ status: report.status, audit: audit.status, before, after, adsense: adsenseReport.status }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
