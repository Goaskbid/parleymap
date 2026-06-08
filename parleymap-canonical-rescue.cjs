#!/usr/bin/env node
/*
  ParleyMap canonical rescue.

  Design rule:
  - index.html demo-data is the live source when present.
  - data/demo.json is a mirror and fallback, never blindly injected.
  - if index.html is thin, use full git history to recover the newest safe full app shell.
  - repair all profile-like and event-like collections, then hard-audit before commit.
*/
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');
const DEMO_PATH = path.join(ROOT, 'data', 'demo.json');
const DIAG_DIR = path.join(ROOT, 'data', 'diagnostics');
const REPORT_PATH = path.join(DIAG_DIR, 'canonical-rescue-report.json');
const AUDIT_PATH = path.join(DIAG_DIR, 'canonical-hard-audit-report.json');
const ADSENSE_REPORT_PATH = path.join(DIAG_DIR, 'adsense-preserve-audit-report.json');
const SUMMARY_PATH = path.join(DIAG_DIR, 'LATEST_RUN_SUMMARY.md');

const ANCHORS_PATH = path.join(ROOT, 'data', 'curated-anchors.json');
const SEEDS_PATH = path.join(ROOT, 'data', 'official-event-seeds.json');

const DEMO_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i;
const BAD_EVENT_RE = /(iaea\s+nuclear\s+diplomacy\s+watch|city\s+of\s+london\s+finance\s+diplomacy\s+watch|think[-\s]?tank\s+leadership\s+events\s+watch|royal\s+diaries\s+and\s+state[-\s]?visit\s+watch|source[-\s]?watch|events\s+watch|generic\s+watch|homepage|faq|fact\s*sheet|programme|program|profile\s+page)/i;
const PROFILE_COLLECTIONS = ['people', 'roster', 'topRoster', 'expansionRoster', 'priorityExpansion', 'watchlistExamples', 'organizationProfiles', 'openCatalogs'];
const VISIBLE_PROFILE_COLLECTIONS = ['roster', 'topRoster', 'expansionRoster', 'priorityExpansion', 'watchlistExamples'];

function ensureDirs() {
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.mkdirSync(DIAG_DIR, { recursive: true });
}

function sh(cmd, options = {}) {
  try {
    return cp.execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 200 * 1024 * 1024, ...options });
  } catch (err) {
    if (options.optional) return '';
    throw err;
  }
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
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
  return norm(value).replace(/ /g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

function extractDemo(html) {
  const match = DEMO_RE.exec(html);
  if (!match) return null;
  const raw = match[1].trim();
  try {
    return { data: JSON.parse(raw), raw, match };
  } catch (err) {
    return null;
  }
}

function replaceDemo(html, data) {
  if (!DEMO_RE.test(html)) throw new Error('Cannot write demo-data: script block not found');
  const json = JSON.stringify(data, null, 2);
  return html.replace(DEMO_RE, `<script id="demo-data" type="application/json">\n${json}\n</script>`);
}

function coreCounts(data) {
  return {
    people: Array.isArray(data.people) ? data.people.length : null,
    roster: Array.isArray(data.roster) ? data.roster.length : null,
    topRoster: Array.isArray(data.topRoster) ? data.topRoster.length : null,
    expansionRoster: Array.isArray(data.expansionRoster) ? data.expansionRoster.length : null,
    appearances: Array.isArray(data.appearances) ? data.appearances.length : null,
    categories: Array.isArray(data.categories) ? data.categories.length : null
  };
}

function validateCore(data, label = 'dataset') {
  for (const key of ['people', 'roster', 'expansionRoster', 'appearances', 'categories']) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  }
  if (data.people.length < 80 || data.people.length > 130) throw new Error(`${label}: people count unsafe: ${data.people.length}`);
  if (data.roster.length < 180 || data.roster.length > 230) throw new Error(`${label}: roster count unsafe: ${data.roster.length}`);
  if (data.expansionRoster.length < 90 || data.expansionRoster.length > 150) throw new Error(`${label}: expansionRoster count unsafe: ${data.expansionRoster.length}`);
  if (data.appearances.length < 450) throw new Error(`${label}: appearances count too low: ${data.appearances.length}`);
  if (data.categories.length < 8) throw new Error(`${label}: categories count too low: ${data.categories.length}`);
}

function isThinHtml(html) {
  return !html || html.length < 5000 || !DEMO_RE.test(html);
}

function isSafeHistoricalData(data) {
  try { validateCore(data, 'candidate history'); } catch { return false; }
  const text = JSON.stringify(data).toLowerCase();
  if (data.people.length > 115) return false;
  if (/vincent\s+auriol/.test(text) && /president\s+of\s+france/.test(text) && !/former\s+president\s+of\s+france/.test(text)) return false;
  return true;
}

function historyCandidates() {
  const refs = [];
  const commits = sh('git rev-list --all -- index.html index.template.html download', { optional: true })
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 500);
  for (const rev of commits) {
    for (const file of ['index.html', 'index.template.html', 'download']) {
      refs.push({ rev, file });
    }
  }
  return refs;
}

function showFile(ref) {
  return sh(`git show ${ref.rev}:${ref.file}`, { optional: true });
}

function findSafeShellFromHistory() {
  for (const ref of historyCandidates()) {
    const html = showFile(ref);
    if (!html || !DEMO_RE.test(html) || html.length < 100000) continue;
    const extracted = extractDemo(html);
    if (!extracted) continue;
    if (!isSafeHistoricalData(extracted.data)) continue;
    return { html, data: extracted.data, source: `${ref.rev}:${ref.file}` };
  }
  return null;
}

function loadDataAndShell() {
  const currentHtml = readText(INDEX_PATH);
  const currentExtracted = extractDemo(currentHtml);

  if (currentExtracted && !isThinHtml(currentHtml)) {
    validateCore(currentExtracted.data, 'current index.html');
    return { html: currentHtml, data: currentExtracted.data, source: 'current index.html', restoredFromHistory: false };
  }

  const historical = findSafeShellFromHistory();
  if (historical) {
    return { html: historical.html, data: historical.data, source: historical.source, restoredFromHistory: true };
  }

  if (fs.existsSync(DEMO_PATH)) {
    const data = JSON.parse(readText(DEMO_PATH));
    validateCore(data, 'data/demo.json fallback');
    if (currentExtracted) {
      return { html: currentHtml, data, source: 'data/demo.json plus current shell', restoredFromHistory: false };
    }
  }

  throw new Error('No safe full index.html with demo-data was found in current file or git history. Refusing to invent an app shell.');
}

function objectText(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return norm([
    obj.id, obj.slug, obj.name, obj.canonicalName, obj.wikiTitle, obj.roleTitle, obj.organization,
    obj.country, obj.countryName, obj.countryFocus, obj.countryFocusCode, obj.profileLine,
    Array.isArray(obj.profileLines) ? obj.profileLines.map(x => x && (x.text || x.label)).join(' ') : ''
  ].join(' '));
}

function targetMatches(obj, target) {
  const text = objectText(obj);
  if (!text) return false;
  if (Array.isArray(target.matchAll) && !target.matchAll.every(x => text.includes(norm(x)))) return false;
  if (Array.isArray(target.matchAny) && !target.matchAny.some(x => text.includes(norm(x)))) return false;
  if (Array.isArray(target.roleAny) && !target.roleAny.some(x => text.includes(norm(x)))) return false;
  return Boolean(target.matchAll || target.matchAny || target.roleAny);
}

function profileLike(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if ('startsAt' in obj || 'sourcePack' in obj && 'location' in obj && 'title' in obj) return false;
  return Boolean(obj.id || obj.slug || obj.name || obj.canonicalName || obj.roleTitle || obj.homeBases || obj.flagAudit || obj.profileLine || obj.imageUrl);
}

function makeAnchor(anchor) {
  return {
    label: anchor.label || `${anchor.city} institutional base`,
    city: anchor.city,
    countryCode: anchor.countryCode,
    countryName: anchor.countryName,
    lat: anchor.lat,
    lng: anchor.lng,
    precision: 'city',
    type: 'institutional_base',
    privacy: 'city-level public institutional base only'
  };
}

function hasBadImage(value) {
  const s = String(value || '').trim();
  if (!s) return true;
  return /placeholder|needs[-_\s]?review|data:image|transparent|blank|avatar/i.test(s);
}

function applyAnchorAndFace(obj, target) {
  const a = target.anchor;
  const anchor = makeAnchor(a);

  obj.canonicalName = obj.canonicalName || obj.name || target.canonicalName;
  if (target.canonicalName && /grossi|pope|sheinbaum|subianto|salman|charles|guterres|rutte|macron|leyen|kallas/i.test(objectText(obj))) {
    obj.canonicalName = target.canonicalName;
    if ('name' in obj) obj.name = target.canonicalName;
  }
  if (target.roleTitle) obj.roleTitle = target.roleTitle;
  if (target.institution) obj.organization = target.institution;

  obj.countryFocus = a.countryCode;
  obj.countryFocusCode = a.countryCode;
  obj.countryCode = a.countryCode;
  obj.countryName = a.countryName;
  obj.country = a.countryName;
  obj.homeRegion = a.region || obj.homeRegion;
  obj.region = obj.region || a.region;
  obj.locationStatus = 'institutional_base_city_level';

  obj.homeBases = [anchor];
  obj.homeBase = anchor;
  obj.mapAnchor = anchor;
  obj.anchorLocation = anchor;
  obj.baseLocation = anchor;
  obj.institutionalBase = anchor;
  obj.institutionalAnchor = anchor;

  obj.lat = a.lat; obj.lng = a.lng;
  obj.lon = a.lng; obj.long = a.lng;
  obj.latitude = a.lat; obj.longitude = a.lng;
  obj.homeLat = a.lat; obj.homeLng = a.lng;
  obj.mapLat = a.lat; obj.mapLng = a.lng;
  obj.anchorLat = a.lat; obj.anchorLng = a.lng;

  obj.coordinates = { lat: a.lat, lng: a.lng };
  obj.geo = { lat: a.lat, lng: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };

  obj.flagAudit = {
    ...(obj.flagAudit || {}),
    code: a.countryCode,
    countryCode: a.countryCode,
    countryName: a.countryName,
    label: a.countryName,
    status: 'country flag'
  };
  obj.flagCode = a.countryCode;
  obj.countryFlagCode = a.countryCode;

  if (target.imageUrl && hasBadImage(obj.imageUrl)) {
    obj.imageUrl = target.imageUrl;
    obj.imageProvider = 'Curated Wikimedia Commons fallback';
    obj.visualAuditStatus = 'curated portrait fallback applied';
  }

  return obj;
}

function walk(value, pathName, cb) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((child, idx) => walk(child, `${pathName}[${idx}]`, cb));
    return;
  }
  cb(value, pathName);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') walk(child, `${pathName}.${key}`, cb);
  }
}

function titleText(obj) {
  return norm([obj && obj.title, obj && obj.summary, obj && obj.label, obj && obj.name, obj && obj.status, obj && obj.eventType].join(' '));
}

function isEventLike(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Boolean(obj.startsAt || obj.endsAt || obj.eventType || obj.sourcePack || obj.location && (obj.title || obj.summary));
}

function isFakeEvent(obj) {
  if (!isEventLike(obj)) return false;
  const text = titleText(obj);
  const status = norm(obj.status || '');
  if (BAD_EVENT_RE.test(text)) return true;
  if (/source\s*watch|watch/.test(status) && /watch/.test(text)) return true;
  if (/watch/.test(text) && !Array.isArray(obj.sourcePack)) return true;
  return false;
}

function cleanseFakeEvents(data, changes) {
  function cleanseContainer(container, containerPath) {
    if (!container || typeof container !== 'object') return;
    for (const [key, value] of Object.entries(container)) {
      const currentPath = `${containerPath}.${key}`;
      if (Array.isArray(value)) {
        const kept = [];
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (isFakeEvent(item)) {
            changes.fakeEventsRemoved.push({ path: `${currentPath}[${i}]`, id: item.id || null, title: item.title || item.name || item.label || null, status: item.status || null });
          } else {
            kept.push(item);
            if (item && typeof item === 'object') cleanseContainer(item, `${currentPath}[${kept.length - 1}]`);
          }
        }
        container[key] = kept;
      } else if (value && typeof value === 'object') {
        cleanseContainer(value, currentPath);
      }
    }
  }
  cleanseContainer(data, 'data');
}

function keyForProfile(obj) {
  const id = String(obj.id || '').trim();
  if (id) return `id:${id}`;
  const name = norm(obj.canonicalName || obj.name || obj.slug || obj.wikiTitle || '');
  return name ? `name:${name}` : '';
}

function completenessScore(obj) {
  let score = 0;
  for (const key of ['imageUrl', 'homeBases', 'mapAnchor', 'canonicalName', 'roleTitle', 'organization', 'flagAudit', 'countryFocusCode']) {
    if (obj[key]) score += 1;
  }
  if (Array.isArray(obj.homeBases) && obj.homeBases.length) score += 2;
  if (!hasBadImage(obj.imageUrl)) score += 3;
  return score;
}

function dedupeWithinCollection(data, changes) {
  for (const name of PROFILE_COLLECTIONS) {
    const arr = data[name];
    if (!Array.isArray(arr)) continue;
    const seen = new Map();
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!profileLike(item)) { out.push(item); continue; }
      const key = keyForProfile(item);
      if (!key) { out.push(item); continue; }
      if (!seen.has(key)) {
        seen.set(key, out.length);
        out.push(item);
        continue;
      }
      const prevIndex = seen.get(key);
      const prev = out[prevIndex];
      const keepNew = completenessScore(item) > completenessScore(prev);
      if (keepNew) {
        out[prevIndex] = { ...prev, ...item };
      }
      changes.profileDuplicatesRemoved.push({ collection: name, index: i, key, removedName: item.canonicalName || item.name || item.slug || item.id || null });
    }
    data[name] = out;
  }
}

function suppressGrossiVisibleHelpers(data, changes) {
  for (const name of ['topRoster', 'priorityExpansion', 'watchlistExamples']) {
    const arr = data[name];
    if (!Array.isArray(arr)) continue;
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (profileLike(item) && /rafael.*grossi|grossi/.test(objectText(item))) {
        changes.grossiHelperRowsRemoved.push({ collection: name, index: i, id: item.id || null, name: item.canonicalName || item.name || null });
        continue;
      }
      out.push(item);
    }
    data[name] = out;
  }
}

function repairAnchors(data, anchors, changes) {
  walk(data, 'data', (obj, p) => {
    if (!profileLike(obj)) return;
    for (const target of anchors.targets) {
      if (!targetMatches(obj, target)) continue;
      const before = {
        countryFocusCode: obj.countryFocusCode || null,
        flagAudit: obj.flagAudit || null,
        city: obj.homeBases && obj.homeBases[0] ? obj.homeBases[0].city : null,
        imageUrl: obj.imageUrl || null
      };
      applyAnchorAndFace(obj, target);
      changes.anchorRepairs.push({ target: target.key, path: p, before, after: { countryFocusCode: obj.countryFocusCode, city: obj.homeBases[0].city, flagAudit: obj.flagAudit, imageUrl: obj.imageUrl || null } });
      break;
    }
  });
}

function syncFacesById(data, changes) {
  const images = new Map();
  for (const name of PROFILE_COLLECTIONS) {
    const arr = data[name];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (profileLike(item) && item.id && !hasBadImage(item.imageUrl)) images.set(item.id, item.imageUrl);
    }
  }
  for (const name of PROFILE_COLLECTIONS) {
    const arr = data[name];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (profileLike(item) && item.id && hasBadImage(item.imageUrl) && images.has(item.id)) {
        item.imageUrl = images.get(item.id);
        item.imageProvider = item.imageProvider || 'copied from canonical profile row';
        changes.faceRepairs.push({ collection: name, id: item.id, name: item.canonicalName || item.name || null });
      }
    }
  }
}

function repairHistoricalPollution(data, changes) {
  const macron = [...(data.people || []), ...(data.roster || [])].find(x => profileLike(x) && /emmanuel.*macron/.test(objectText(x)));
  for (const name of VISIBLE_PROFILE_COLLECTIONS) {
    const arr = data[name];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!profileLike(item)) continue;
      if (!/vincent\s+auriol/.test(objectText(item))) continue;
      if (macron && name !== 'people') {
        arr[i] = { ...item, ...JSON.parse(JSON.stringify(macron)), rank: item.rank || macron.rank, prominenceScore: item.prominenceScore || macron.prominenceScore };
        changes.historicalPollutionFixed.push({ collection: name, index: i, action: 'replaced_with_macron', oldName: item.canonicalName || item.name || 'Vincent Auriol' });
      } else {
        item.roleTitle = item.roleTitle && !/^former/i.test(item.roleTitle) ? `Former ${item.roleTitle}` : (item.roleTitle || 'Former President of France');
        item.category = item.category || 'FORMER_LEADER';
        item.trackingStatus = 'former_historical_profile';
        item.currentOfficeStatus = 'former';
        changes.historicalPollutionFixed.push({ collection: name, index: i, action: 'marked_former', oldName: item.canonicalName || item.name || 'Vincent Auriol' });
      }
    }
  }
}

function personIdForTarget(data, target) {
  const rows = [];
  for (const name of ['people', 'roster', 'topRoster', 'expansionRoster']) {
    if (Array.isArray(data[name])) rows.push(...data[name]);
  }
  const row = rows.find(x => profileLike(x) && targetMatches(x, target));
  return row && (row.id || row.slug) ? String(row.id || row.slug) : null;
}

function ensureEventShape(seed, personId, nowIso) {
  const loc = seed.location || {};
  return {
    id: seed.id,
    personId,
    startsAt: seed.startsAt,
    endsAt: seed.endsAt || null,
    status: seed.status || 'VERIFIED_PAST',
    confidence: 0.94,
    confidenceLabel: 'official source',
    eventType: seed.eventType || 'PUBLIC_APPEARANCE',
    title: seed.title,
    summary: seed.summary || seed.title,
    significance: seed.significance || 'Official-source public appearance added by ParleyMap canonical repair.',
    decisions: seed.decisions || '',
    location: {
      label: loc.label || `${loc.city}, ${loc.countryName}`,
      city: loc.city,
      countryCode: loc.countryCode,
      countryName: loc.countryName,
      lat: loc.lat,
      lng: loc.lng,
      precision: loc.precision || 'city'
    },
    venuePublic: true,
    securityPrecision: 'city-level official public event only; no private stops, hotels, residences, leaked routes or live proximity',
    publicInterestScore: seed.publicInterestScore || 72,
    eventGroupId: seed.eventGroupId || `eg-${slug(seed.title)}-${String(seed.startsAt).slice(0, 10)}`,
    topics: Array.isArray(seed.topics) ? seed.topics : [],
    counterpartIds: Array.isArray(seed.counterpartIds) ? seed.counterpartIds : [],
    sourcePack: seed.sourcePack,
    visual: seed.visual || { status: 'runtime portrait', policy: 'Use only audited public media with attribution.' },
    lastCheckedAt: nowIso,
    marketImpact: seed.marketImpact || { sectors: [], companies: [], countries: loc.countryName ? [loc.countryName] : [], confidence: 'low' },
    sourceQuality: 'official_primary_source',
    generatedBy: 'parleymap-canonical-rescue'
  };
}

function addOfficialEvents(data, anchors, seeds, changes) {
  if (!Array.isArray(data.appearances)) data.appearances = [];
  const nowIso = new Date().toISOString();
  const existing = new Set(data.appearances.map(x => x && x.id).filter(Boolean));
  for (const seed of seeds.events || []) {
    if (existing.has(seed.id)) continue;
    const target = anchors.targets.find(x => x.key === seed.personKey);
    if (!target) continue;
    const personId = personIdForTarget(data, target);
    if (!personId) {
      changes.officialEventsSkipped.push({ id: seed.id, reason: 'person_not_found', personKey: seed.personKey });
      continue;
    }
    const event = ensureEventShape(seed, personId, nowIso);
    data.appearances.push(event);
    existing.add(seed.id);
    changes.officialEventsAdded.push({ id: seed.id, personId, title: seed.title, city: seed.location && seed.location.city });
  }
  data.appearances.sort((a, b) => String(b.startsAt || '').localeCompare(String(a.startsAt || '')));
}

function installRuntimeGuard(html, anchors) {
  const start = '<!-- PARLEYMAP CANONICAL RUNTIME GUARD START -->';
  const end = '<!-- PARLEYMAP CANONICAL RUNTIME GUARD END -->';
  html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`, 'g'), '');
  const compactTargets = anchors.targets.map(t => ({
    key: t.key,
    matchAll: t.matchAll || null,
    matchAny: t.matchAny || null,
    city: t.anchor.city,
    countryCode: t.anchor.countryCode,
    countryName: t.anchor.countryName,
    lat: t.anchor.lat,
    lng: t.anchor.lng
  }));
  const script = `${start}\n<script>\n(function(){\n  var targets=${JSON.stringify(compactTargets)};\n  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function text(o){try{return norm([o.id,o.slug,o.name,o.canonicalName,o.title,o.roleTitle,o.organization,o.countryFocusCode,o.countryName].join(' '));}catch(e){return ''}}\n  function match(o,t){var s=text(o); if(!s)return false; if(t.matchAll&& !t.matchAll.every(function(x){return s.indexOf(norm(x))>=0}))return false; if(t.matchAny&& !t.matchAny.some(function(x){return s.indexOf(norm(x))>=0}))return false; return true;}\n  function anchor(o,t){if(!o||typeof o!=='object')return o; var a={label:t.city+' institutional base',city:t.city,countryCode:t.countryCode,countryName:t.countryName,lat:t.lat,lng:t.lng,precision:'city',type:'institutional_base',privacy:'city-level public institutional base only'}; o.countryFocus=t.countryCode;o.countryFocusCode=t.countryCode;o.countryCode=t.countryCode;o.countryName=t.countryName;o.homeBases=[a];o.homeBase=a;o.mapAnchor=a;o.anchorLocation=a;o.lat=t.lat;o.lng=t.lng;o.latitude=t.lat;o.longitude=t.lng;o.flagAudit=Object.assign({},o.flagAudit||{},{code:t.countryCode,countryCode:t.countryCode,countryName:t.countryName,label:t.countryName,status:'country flag'});return o;}\n  function walk(v){if(!v||typeof v!=='object')return; if(Array.isArray(v)){v.forEach(walk);return;} targets.forEach(function(t){if(match(v,t))anchor(v,t)}); Object.keys(v).forEach(function(k){walk(v[k])});}\n  try{var el=document.getElementById('demo-data'); if(el){var d=JSON.parse(el.textContent); walk(d); el.textContent=JSON.stringify(d); window.__PARLEYMAP_CANONICAL_GUARD__=true;}}catch(e){console.warn('ParleyMap runtime guard skipped',e);}\n  if(window.L&&L.marker){var orig=L.marker; L.marker=function(latlng,opts){try{var o=(opts&&opts.person)||(opts&&opts.record)||(opts&&opts.data)||{}; targets.forEach(function(t){if(match(o,t))latlng=[t.lat,t.lng];});}catch(e){} return orig.call(this,latlng,opts);};}\n})();\n</script>\n${end}`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, script + '\n</body>');
  return html + '\n' + script;
}

function searchGitForPatterns(patterns) {
  const found = { clients: [], pubs: [], slots: [] };
  const currentFiles = ['index.html', 'index.template.html', 'download', 'privacy.html', 'impressum.html', '404.html'];
  function scanText(text) {
    if (!text) return;
    for (const m of text.matchAll(/ca-pub-[0-9]{8,30}/g)) found.clients.push(m[0]);
    for (const m of text.matchAll(/(?<!ca-)pub-[0-9]{8,30}/g)) found.pubs.push(m[0]);
    for (const m of text.matchAll(/data-ad-slot\s*=\s*["']([0-9]{4,30})["']/g)) found.slots.push(m[1]);
  }
  for (const file of currentFiles) scanText(readText(path.join(ROOT, file)));
  const commits = sh('git rev-list --all -- index.html index.template.html download privacy.html impressum.html 404.html', { optional: true })
    .split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 350);
  for (const rev of commits) {
    for (const file of currentFiles) scanText(sh(`git show ${rev}:${file}`, { optional: true }));
  }
  const uniq = arr => [...new Set(arr.filter(Boolean))];
  found.clients = uniq(found.clients);
  found.pubs = uniq(found.pubs);
  found.slots = uniq(found.slots);
  return found;
}

function normalizeClient(value) {
  const s = String(value || '').trim();
  if (/^ca-pub-[0-9]{8,30}$/.test(s)) return s;
  if (/^pub-[0-9]{8,30}$/.test(s)) return 'ca-' + s;
  if (/^[0-9]{8,30}$/.test(s)) return 'ca-pub-' + s;
  return '';
}

function normalizePub(value) {
  const client = normalizeClient(value);
  return client ? client.replace(/^ca-/, '') : '';
}

function ensureAdSense(html, ids) {
  const start = '<!-- PARLEYMAP ADSENSE PRESERVE START -->';
  const end = '<!-- PARLEYMAP ADSENSE PRESERVE END -->';
  html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`, 'g'), '');
  const block = `${start}\n<meta name="google-adsense-account" content="${ids.client}">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ids.client}" crossorigin="anonymous"></script>\n<script>window.PARLEYMAP_ADSENSE={client:"${ids.client}",headerSlot:"${ids.headerSlot}",sidebarSlot:"${ids.sidebarSlot}"};</script>\n${end}`;
  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, block + '\n</head>');
  else html = block + '\n' + html;

  const rtStart = '<!-- PARLEYMAP ADSENSE RUNTIME START -->';
  const rtEnd = '<!-- PARLEYMAP ADSENSE RUNTIME END -->';
  html = html.replace(new RegExp(`${rtStart}[\\s\\S]*?${rtEnd}`, 'g'), '');
  const runtime = `${rtStart}\n<script>\n(function(){\n  var cfg=window.PARLEYMAP_ADSENSE||{}; if(!cfg.client||!cfg.headerSlot||!cfg.sidebarSlot)return;\n  function unit(slot,label){var ins=document.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';ins.setAttribute('data-ad-client',cfg.client);ins.setAttribute('data-ad-slot',slot);ins.setAttribute('data-ad-format','auto');ins.setAttribute('data-full-width-responsive','true');ins.setAttribute('aria-label',label);ins.setAttribute('data-pm-adsense','1');return ins;}\n  function candidates(){return Array.prototype.slice.call(document.querySelectorAll('[class*=ad],[id*=ad],[data-ad-region],[data-ad-zone],[data-ad-slot-name]')).filter(function(el){return !el.querySelector('ins.adsbygoogle') && el.offsetParent!==null;});}\n  function mount(){var cs=candidates(); var h=cs[0], s=cs[1]; if(h){h.innerHTML='';h.appendChild(unit(cfg.headerSlot,'ParleyMap header advertising'));} if(s){s.innerHTML='';s.appendChild(unit(cfg.sidebarSlot,'ParleyMap sidebar advertising'));} try{(adsbygoogle=window.adsbygoogle||[]).push({}); if(s)(adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}}\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();\n})();\n</script>\n${rtEnd}`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, runtime + '\n</body>');
  return html + '\n' + runtime;
}

function repairAdSense(html, changes) {
  const discovered = searchGitForPatterns();
  const inputClient = normalizeClient(process.env.ADSENSE_PUBLISHER_ID || process.env.PUBLISHER_ID || '');
  const inputHeader = String(process.env.ADSENSE_HEADER_SLOT_ID || process.env.HEADER_SLOT_ID || '').trim();
  const inputSidebar = String(process.env.ADSENSE_SIDEBAR_SLOT_ID || process.env.SIDEBAR_SLOT_ID || '').trim();
  const requireReady = String(process.env.REQUIRE_ADSENSE_READY || 'false').toLowerCase() === 'true';
  const client = inputClient || discovered.clients[0] || (discovered.pubs[0] ? 'ca-' + discovered.pubs[0] : '');
  const slots = [inputHeader, inputSidebar, ...discovered.slots].filter(Boolean);
  const uniqueSlots = [...new Set(slots)];

  const report = {
    generatedAt: new Date().toISOString(),
    discoveredClients: discovered.clients,
    discoveredPublisherIds: discovered.pubs,
    discoveredSlots: discovered.slots,
    client: client || null,
    publisherId: client ? normalizePub(client) : null,
    headerSlot: uniqueSlots[0] || null,
    sidebarSlot: uniqueSlots[1] || null,
    requireReady
  };

  if (!client || uniqueSlots.length < 2) {
    report.status = 'adsense_ids_not_found_no_fake_ids_injected';
    writeJson(ADSENSE_REPORT_PATH, report);
    if (requireReady) throw new Error('AdSense IDs not recoverable. Rerun workflow with publisher_id, header_slot_id and sidebar_slot_id. No fake IDs were injected.');
    return { html, report };
  }

  const ids = { client, publisherId: normalizePub(client), headerSlot: uniqueSlots[0], sidebarSlot: uniqueSlots[1] };
  html = ensureAdSense(html, ids);
  fs.writeFileSync(path.join(ROOT, 'ads.txt'), `google.com, ${ids.publisherId}, DIRECT, f08c47fec0942fa0\n`);
  report.status = 'adsense_preserved_and_audited';
  report.client = ids.client;
  report.publisherId = ids.publisherId;
  report.headerSlot = ids.headerSlot;
  report.sidebarSlot = ids.sidebarSlot;
  changes.adsense = report;
  writeJson(ADSENSE_REPORT_PATH, report);
  return { html, report };
}

function writeLegalPages() {
  const privacy = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy | ParleyMap</title></head>\n<body><main style="max-width:820px;margin:40px auto;font-family:system-ui,Arial,sans-serif;line-height:1.55;padding:0 20px"><p><a href="/">Back to ParleyMap</a></p><h1>Privacy Policy</h1><p>ParleyMap publishes public-source records about public appearances, official meetings, public speeches, summits and public institutional events. It does not publish private addresses, live private movement, hotels, residences, medical locations, leaked itineraries or aircraft tracking.</p><h2>Analytics and advertising</h2><p>The site may use privacy-conscious analytics and Google AdSense advertising. Advertising partners may use cookies or similar technologies to deliver, limit and measure ads according to their own policies.</p><h2>Corrections and removals</h2><p>Send privacy, safety, image-rights or correction requests to torsten.sauter@icloud.com. Include the affected URL and the reason for review.</p><h2>Contact</h2><p>Email: torsten.sauter@icloud.com</p></main></body></html>\n`;
  const impressum = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Impressum | ParleyMap</title></head>\n<body><main style="max-width:820px;margin:40px auto;font-family:system-ui,Arial,sans-serif;line-height:1.55;padding:0 20px"><p><a href="/">Back to ParleyMap</a></p><h1>Impressum / Legal notice</h1><h2>Publisher and operator</h2><p>Operator: Torsten Sauter<br>Address: Alte Landstr. 77, 8706 Meilen, Switzerland<br>Email: torsten.sauter@icloud.com<br>Website: parleymap.com</p><h2>Editorial boundary</h2><p>ParleyMap maps public appearances, meetings, speeches, summits, public calls and publicly announced event windows. It does not publish live private location, private homes, hotel guesses, family locations, medical locations, leaked itineraries, aircraft tracking, security routes or private travel guesses.</p><h2>Advertising disclosure</h2><p>Advertising placements are labelled and separated from editorial data. Advertising relationships do not change source review or ranking logic.</p></main></body></html>\n`;
  const about = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About ParleyMap</title></head><body><main style="max-width:820px;margin:40px auto;font-family:system-ui,Arial,sans-serif;line-height:1.55;padding:0 20px"><p><a href="/">Back to ParleyMap</a></p><h1>About ParleyMap</h1><p>ParleyMap maps where public influence is forming by organizing official and host-public records of public appearances, official meetings, speeches, summits and institutional events.</p></main></body></html>\n`;
  const methodology = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Methodology | ParleyMap</title></head><body><main style="max-width:820px;margin:40px auto;font-family:system-ui,Arial,sans-serif;line-height:1.55;padding:0 20px"><p><a href="/">Back to ParleyMap</a></p><h1>Methodology</h1><p>Records require a public person, date, city, event title and official or host-public source. Generic watch pages, homepages, FAQ pages, profile pages and unsourced forecasts are excluded from dated event records.</p></main></body></html>\n`;
  const sources = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Data Sources | ParleyMap</title></head><body><main style="max-width:820px;margin:40px auto;font-family:system-ui,Arial,sans-serif;line-height:1.55;padding:0 20px"><p><a href="/">Back to ParleyMap</a></p><h1>Data sources</h1><p>Primary sources include official government calendars and readouts, multilateral institution pages, host-event pages, Vatican travel pages, IAEA official statements and Royal Family official engagements. Secondary sources are context only unless they lead to public-source confirmation.</p></main></body></html>\n`;
  const contact = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact | ParleyMap</title></head><body><main style="max-width:820px;margin:40px auto;font-family:system-ui,Arial,sans-serif;line-height:1.55;padding:0 20px"><p><a href="/">Back to ParleyMap</a></p><h1>Contact</h1><p>Corrections, privacy, image-rights and advertising requests: torsten.sauter@icloud.com</p></main></body></html>\n`;
  fs.writeFileSync(path.join(ROOT, 'privacy.html'), privacy);
  fs.writeFileSync(path.join(ROOT, 'impressum.html'), impressum);
  fs.writeFileSync(path.join(ROOT, 'about.html'), about);
  fs.writeFileSync(path.join(ROOT, 'methodology.html'), methodology);
  fs.writeFileSync(path.join(ROOT, 'data-sources.html'), sources);
  fs.writeFileSync(path.join(ROOT, 'contact.html'), contact);
}

function auditProfileAnchor(data, anchors, key) {
  const target = anchors.targets.find(t => t.key === key);
  if (!target) throw new Error(`Audit target missing: ${key}`);
  const rows = [];
  for (const name of PROFILE_COLLECTIONS) {
    if (Array.isArray(data[name])) data[name].forEach((item, index) => { if (profileLike(item) && targetMatches(item, target)) rows.push({ item, collection: name, index }); });
  }
  if (!rows.length) throw new Error(`Audit failed: ${key} not found in profile collections`);
  for (const { item, collection, index } of rows) {
    const code = String(item.countryFocusCode || item.countryFocus || item.countryCode || item.flagAudit && item.flagAudit.code || '').toUpperCase();
    const base = Array.isArray(item.homeBases) ? item.homeBases[0] : item.mapAnchor || item.homeBase || {};
    if (code !== target.anchor.countryCode) throw new Error(`Audit failed: ${key} ${collection}[${index}] code ${code}, expected ${target.anchor.countryCode}`);
    if (norm(base.city) !== norm(target.anchor.city)) throw new Error(`Audit failed: ${key} ${collection}[${index}] city ${base.city}, expected ${target.anchor.city}`);
    if (Math.abs(Number(base.lat) - target.anchor.lat) > 0.4 || Math.abs(Number(base.lng) - target.anchor.lng) > 0.4) throw new Error(`Audit failed: ${key} ${collection}[${index}] coordinates wrong`);
    if (target.imageUrl && hasBadImage(item.imageUrl)) throw new Error(`Audit failed: ${key} ${collection}[${index}] image still missing`);
  }
  return rows.length;
}

function countGrossiVisible(data) {
  let count = 0;
  const rows = [];
  for (const name of VISIBLE_PROFILE_COLLECTIONS) {
    const arr = Array.isArray(data[name]) ? data[name] : [];
    arr.forEach((item, index) => {
      if (profileLike(item) && /grossi/.test(objectText(item))) { count++; rows.push({ collection: name, index, id: item.id || null }); }
    });
  }
  return { count, rows };
}

function scanFakeEvents(data) {
  const bad = [];
  walk(data, 'data', (obj, p) => { if (isFakeEvent(obj)) bad.push({ path: p, id: obj.id || null, title: obj.title || obj.name || null }); });
  return bad;
}

function hardAudit(data, anchors) {
  validateCore(data, 'final data');
  const results = {};
  for (const key of ['claudia_sheinbaum', 'pope_leo_xiv', 'prabowo_subianto', 'rafael_grossi']) {
    results[key] = auditProfileAnchor(data, anchors, key);
  }
  const fakeEvents = scanFakeEvents(data);
  if (fakeEvents.length) throw new Error(`Audit failed: fake events remain: ${fakeEvents.slice(0, 5).map(x => x.title).join(', ')}`);
  const grossiVisible = countGrossiVisible(data);
  if (grossiVisible.count > 1) throw new Error(`Audit failed: Grossi visible rows still > 1: ${JSON.stringify(grossiVisible.rows)}`);
  const text = JSON.stringify(data).toLowerCase();
  if (/vincent\s+auriol/.test(text) && /president\s+of\s+france/.test(text) && !/former\s+president\s+of\s+france/.test(text)) {
    throw new Error('Audit failed: active Vincent Auriol pollution remains');
  }
  return { status: 'audit_passed', generatedAt: new Date().toISOString(), results, grossiVisible, counts: coreCounts(data) };
}

function buildSummary(report, audit, adsense) {
  const lines = [];
  lines.push('# ParleyMap canonical rescue');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`Status: ${report.status}`);
  lines.push(`Source used: ${report.source}`);
  lines.push(`Restored from history: ${report.restoredFromHistory}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Dataset | Before | After |');
  lines.push('|---|---:|---:|');
  for (const key of ['people', 'roster', 'topRoster', 'expansionRoster', 'appearances', 'categories']) {
    lines.push(`| ${key} | ${report.before[key]} | ${report.after[key]} |`);
  }
  lines.push('');
  lines.push('## Repairs');
  lines.push('');
  lines.push(`- Fake events removed: ${report.changes.fakeEventsRemoved.length}`);
  lines.push(`- Profile duplicates removed: ${report.changes.profileDuplicatesRemoved.length}`);
  lines.push(`- Grossi helper rows removed: ${report.changes.grossiHelperRowsRemoved.length}`);
  lines.push(`- Anchor repairs: ${report.changes.anchorRepairs.length}`);
  lines.push(`- Face repairs: ${report.changes.faceRepairs.length}`);
  lines.push(`- Official events added: ${report.changes.officialEventsAdded.length}`);
  lines.push(`- Historical pollution fixes: ${report.changes.historicalPollutionFixed.length}`);
  lines.push('');
  lines.push('## AdSense');
  lines.push('');
  lines.push(`- Status: ${adsense && adsense.status ? adsense.status : 'not run'}`);
  lines.push(`- Client: ${adsense && adsense.client ? adsense.client : 'not recovered'}`);
  lines.push(`- Header slot: ${adsense && adsense.headerSlot ? adsense.headerSlot : 'not recovered'}`);
  lines.push(`- Sidebar slot: ${adsense && adsense.sidebarSlot ? adsense.sidebarSlot : 'not recovered'}`);
  lines.push('');
  lines.push('## Audit');
  lines.push('');
  lines.push(`- ${audit.status}`);
  fs.writeFileSync(SUMMARY_PATH, lines.join('\n') + '\n');
}

function main() {
  ensureDirs();
  const anchors = JSON.parse(readText(ANCHORS_PATH));
  const seeds = JSON.parse(readText(SEEDS_PATH));

  const loaded = loadDataAndShell();
  const data = loaded.data;
  const before = coreCounts(data);
  const changes = {
    fakeEventsRemoved: [],
    profileDuplicatesRemoved: [],
    grossiHelperRowsRemoved: [],
    anchorRepairs: [],
    faceRepairs: [],
    historicalPollutionFixed: [],
    officialEventsAdded: [],
    officialEventsSkipped: [],
    adsense: null
  };

  cleanseFakeEvents(data, changes);
  dedupeWithinCollection(data, changes);
  repairAnchors(data, anchors, changes);
  suppressGrossiVisibleHelpers(data, changes);
  syncFacesById(data, changes);
  repairHistoricalPollution(data, changes);
  addOfficialEvents(data, anchors, seeds, changes);

  data.meta = {
    ...(data.meta || {}),
    lastDataUpdate: new Date().toISOString(),
    lastCanonicalRescue: new Date().toISOString(),
    canonicalRescueStatus: 'canonical source-of-truth repair applied; data/demo.json mirrored from repaired index dataset'
  };

  validateCore(data, 'repaired data');

  let html = replaceDemo(loaded.html, data);
  html = installRuntimeGuard(html, anchors);
  const adsense = repairAdSense(html, changes);
  html = adsense.html;

  const audit = hardAudit(data, anchors);

  fs.writeFileSync(INDEX_PATH, html);
  writeJson(DEMO_PATH, data);
  writeJson(AUDIT_PATH, audit);
  writeLegalPages();

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'canonical_rescue_applied',
    source: loaded.source,
    restoredFromHistory: loaded.restoredFromHistory,
    before,
    after: coreCounts(data),
    changes
  };
  writeJson(REPORT_PATH, report);
  buildSummary(report, audit, adsense.report);

  console.log(JSON.stringify({ status: report.status, source: report.source, before: report.before, after: report.after, audit: audit.status, adsense: adsense.report.status }, null, 2));
}

try {
  main();
} catch (err) {
  fs.mkdirSync(DIAG_DIR, { recursive: true });
  fs.writeFileSync(path.join(DIAG_DIR, 'canonical-rescue-error.txt'), String(err && err.stack || err) + '\n');
  console.error(err && err.stack || err);
  process.exit(1);
}
