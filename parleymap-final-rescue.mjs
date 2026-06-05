import fs from 'node:fs';
import { execSync } from 'node:child_process';

const INDEX_PATH = 'index.html';
const DEMO_PATH = 'data/demo.json';
const REPORT_PATH = 'data/diagnostics/final-rescue-report.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';
const GUARD_START = '<!-- PARLEYMAP_ANCHOR_RUNTIME_GUARD_START -->';
const GUARD_END = '<!-- PARLEYMAP_ANCHOR_RUNTIME_GUARD_END -->';

const TARGETS = [
  {
    key: 'claudia_sheinbaum',
    displayName: 'Claudia Sheinbaum',
    must: ['claudia', 'sheinbaum'],
    idHints: ['claudia-sheinbaum', 'sheinbaum'],
    anchor: { city: 'Mexico City', countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America', organization: 'Mexico' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Claudia%20Sheinbaum%20%28cropped%2C%20centered%29.jpg'
  },
  {
    key: 'pope_leo_xiv',
    displayName: 'Pope Leo XIV',
    any: ['pope leo xiv', 'leo xiv', 'robert prevost', 'robert francis prevost'],
    roleAny: ['pope', 'pontiff', 'bishop of rome'],
    idHints: ['pope', 'leo-xiv', 'leo_xiv', 'prevost'],
    anchor: { city: 'Vatican City', countryCode: 'VA', countryName: 'Vatican City', lat: 41.9029, lng: 12.4534, region: 'Europe', organization: 'Holy See' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pope%20Leo%20XIV%202025.jpg'
  },
  {
    key: 'prabowo_subianto',
    displayName: 'Prabowo Subianto',
    must: ['prabowo', 'subianto'],
    idHints: ['prabowo', 'subianto'],
    anchor: { city: 'Jakarta', countryCode: 'ID', countryName: 'Indonesia', lat: -6.2088, lng: 106.8456, region: 'Asia', organization: 'Indonesia' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Prabowo%20Subianto%20official%20portrait.jpg'
  },
  {
    key: 'rafael_grossi',
    displayName: 'Rafael Grossi',
    must: ['rafael', 'grossi'],
    idHints: ['grossi', 'rafael-grossi'],
    anchor: { city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2345, lng: 16.4166, region: 'Europe', organization: 'IAEA' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rafael%20Grossi%202023.jpg'
  },
  {
    key: 'mohammed_bin_salman',
    displayName: 'Mohammed bin Salman',
    must: ['salman'],
    any: ['mohammed', 'mohammad', 'muhammad', 'mbs'],
    idHints: ['mohammed-bin-salman', 'mohammad-bin-salman', 'salman', 'mbs'],
    anchor: { city: 'Riyadh', countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, region: 'Middle East', organization: 'Saudi Arabia' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mohammed%20bin%20Salman%20Al%20Saud%20-%202023.jpg'
  },
  {
    key: 'antonio_guterres',
    displayName: 'Antonio Guterres',
    must: ['antonio'],
    any: ['guterres', 'gutierres'],
    idHints: ['guterres'],
    anchor: { city: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7499, lng: -73.9680, region: 'North America', organization: 'United Nations' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ant%C3%B3nio%20Guterres%20UN%20Secretary-General.jpg'
  },
  {
    key: 'mark_rutte',
    displayName: 'Mark Rutte',
    must: ['mark', 'rutte'],
    idHints: ['mark-rutte', 'rutte'],
    anchor: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8798, lng: 4.4219, region: 'Europe', organization: 'NATO' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mark%20Rutte%202024.jpg'
  },
  {
    key: 'ursula_von_der_leyen',
    displayName: 'Ursula von der Leyen',
    must: ['ursula'],
    any: ['leyen', 'von der leyen'],
    idHints: ['von-der-leyen', 'ursula'],
    anchor: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, region: 'Europe', organization: 'European Commission' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ursula%20von%20der%20Leyen%202024.jpg'
  },
  {
    key: 'kaja_kallas',
    displayName: 'Kaja Kallas',
    must: ['kaja', 'kallas'],
    idHints: ['kaja-kallas', 'kallas'],
    anchor: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, region: 'Europe', organization: 'European Union' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kaja%20Kallas%202024.jpg'
  },
  {
    key: 'kristalina_georgieva',
    displayName: 'Kristalina Georgieva',
    must: ['kristalina', 'georgieva'],
    idHints: ['georgieva', 'kristalina'],
    anchor: { city: 'Washington', countryCode: 'US', countryName: 'United States', lat: 38.8995, lng: -77.0436, region: 'North America', organization: 'IMF' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kristalina%20Georgieva%202023.jpg'
  },
  {
    key: 'ajay_banga',
    displayName: 'Ajay Banga',
    must: ['ajay', 'banga'],
    idHints: ['ajay-banga', 'banga'],
    anchor: { city: 'Washington', countryCode: 'US', countryName: 'United States', lat: 38.8993, lng: -77.0427, region: 'North America', organization: 'World Bank' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ajay%20Banga.jpg'
  },
  {
    key: 'tedros_ghebreyesus',
    displayName: 'Tedros Ghebreyesus',
    must: ['tedros'],
    any: ['ghebreyesus', 'adhanom'],
    idHints: ['tedros'],
    anchor: { city: 'Geneva', countryCode: 'CH', countryName: 'Switzerland', lat: 46.2327, lng: 6.1341, region: 'Europe', organization: 'WHO' },
    imageFallback: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tedros%20Adhanom%20Ghebreyesus%202023.jpg'
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

function slug(value) {
  return norm(value).replace(/ /g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function readEmbeddedFromHtml(html, label = 'index.html') {
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error(`${label}: demo-data opening tag not found`);
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error(`${label}: demo-data closing tag not found`);
  const jsonText = html.slice(jsonStart, jsonEnd).trim();
  const data = JSON.parse(jsonText);
  return { html, jsonStart, jsonEnd, data };
}

function writeEmbedded(payload, data) {
  const nextHtml = payload.html.slice(0, payload.jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + '\n');
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

function validateCore(data, label) {
  for (const key of ['meta', 'people', 'roster', 'expansionRoster', 'appearances', 'categories']) {
    if (!(key in data)) throw new Error(`${label}: missing ${key}`);
  }
  for (const key of ['people', 'roster', 'expansionRoster', 'appearances', 'categories']) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  }
  if (data.people.length < 90 || data.people.length > 115) throw new Error(`${label}: people count outside safe range: ${data.people.length}`);
  if (data.roster.length < 190 || data.roster.length > 205) throw new Error(`${label}: roster count outside safe range: ${data.roster.length}`);
  if (data.expansionRoster.length < 100 || data.expansionRoster.length > 130) throw new Error(`${label}: expansionRoster count outside safe range: ${data.expansionRoster.length}`);
  if (data.appearances.length < 500) throw new Error(`${label}: appearances count too low: ${data.appearances.length}`);
  if (data.categories.length < 10) throw new Error(`${label}: categories count too low: ${data.categories.length}`);
}

function pollutedReason(data) {
  const c = counts(data);
  if (c.people !== null && c.people > 115) return `people_count_${c.people}`;
  const text = JSON.stringify(data).slice(0, 5000000);
  if (/miguel-de-la-madrid|lazaro-cardenas|pascual-ortiz-rubio|gustavo-diaz-ordaz/i.test(text)) return 'historical_mexico_president_pollution';
  return '';
}

function candidateIsGood(data) {
  try {
    validateCore(data, 'candidate');
  } catch {
    return false;
  }
  return !pollutedReason(data);
}

function findLastGoodHtml(currentPayload) {
  if (candidateIsGood(currentPayload.data)) {
    return { source: 'current_index', html: currentPayload.html, data: currentPayload.data, commit: 'HEAD' };
  }

  let commits = [];
  try {
    commits = execSync('git rev-list --max-count=120 HEAD -- index.html', { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error(`Unable to inspect git history for index.html: ${error.message}`);
  }

  for (const commit of commits) {
    let html = '';
    try {
      html = execSync(`git show ${commit}:index.html`, { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 });
    } catch {
      continue;
    }
    try {
      const payload = readEmbeddedFromHtml(html, commit);
      if (candidateIsGood(payload.data)) {
        return { source: 'git_history', html, data: payload.data, commit };
      }
    } catch {
      continue;
    }
  }

  throw new Error('No safe historical index.html found. Refusing to repair from polluted data.');
}

function profileText(obj) {
  return norm([
    obj?.id,
    obj?.slug,
    obj?.name,
    obj?.canonicalName,
    obj?.personName,
    obj?.roleTitle,
    obj?.organization,
    obj?.category,
    obj?.country,
    obj?.countryName,
    obj?.countryFocus,
    obj?.countryFocusCode,
    obj?.profileLine,
    Array.isArray(obj?.profileLines) ? obj.profileLines.join(' ') : ''
  ].join(' '));
}

function targetMatchesObject(obj, target, idMap) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const text = profileText(obj);
  const id = String(obj.id || obj.slug || obj.personId || '').toLowerCase();
  const personId = String(obj.personId || '').toLowerCase();
  const idHit = [...(idMap.get(target.key) || [])].some((candidateId) => {
    const clean = String(candidateId || '').toLowerCase();
    return clean && (id === clean || personId === clean || id.includes(clean));
  });
  const hintHit = (target.idHints || []).some((hint) => id.includes(String(hint).toLowerCase()) || personId.includes(String(hint).toLowerCase()));
  const mustOk = !target.must || target.must.every((part) => text.includes(norm(part)));
  const anyOk = !target.any || target.any.some((part) => text.includes(norm(part)));
  const roleOk = !target.roleAny || target.roleAny.some((part) => text.includes(norm(part)));
  return idHit || hintHit || (mustOk && anyOk && roleOk);
}

function makeAnchor(target) {
  const a = target.anchor;
  return {
    label: `${a.city} institutional base`,
    city: a.city,
    countryCode: a.countryCode,
    countryName: a.countryName,
    lat: a.lat,
    lng: a.lng,
    lon: a.lng,
    latitude: a.lat,
    longitude: a.lng,
    precision: 'city',
    type: 'institutional_base',
    privacy: 'city-level public institutional base only',
    source: 'curated ParleyMap anchor registry'
  };
}

function hasBadOrMissingImage(obj) {
  const value = String(obj.imageUrl || obj.image || obj.portraitUrl || obj.avatarUrl || '').trim();
  return !value || /placeholder|needs-review|undefined|null/i.test(value);
}

function patchObject(obj, target, options = {}) {
  const anchor = makeAnchor(target);
  const a = target.anchor;
  const before = snapshot(obj);

  obj.countryFocus = a.countryCode;
  obj.countryFocusCode = a.countryCode;
  obj.countryCode = a.countryCode;
  obj.countryName = a.countryName;
  obj.country = a.countryName;
  obj.homeRegion = a.region;
  obj.region = obj.region || a.region;
  obj.organization = obj.organization || a.organization || a.countryName;
  obj.locationStatus = 'institutional_base_city_level';

  obj.homeBases = [anchor];
  obj.homeBase = anchor;
  obj.mapAnchor = anchor;
  obj.anchorLocation = anchor;
  obj.baseLocation = anchor;
  obj.institutionalBase = anchor;
  obj.publicLocation = anchor;
  obj.location = anchor;
  obj.venuePublic = true;
  obj.securityPrecision = obj.securityPrecision || 'city-level public/institutional location only';

  obj.lat = a.lat;
  obj.lng = a.lng;
  obj.lon = a.lng;
  obj.long = a.lng;
  obj.latitude = a.lat;
  obj.longitude = a.lng;
  obj.homeLat = a.lat;
  obj.homeLng = a.lng;
  obj.homeLon = a.lng;
  obj.homeLongitude = a.lng;
  obj.mapLat = a.lat;
  obj.mapLng = a.lng;
  obj.mapLon = a.lng;
  obj.mapLongitude = a.lng;
  obj.anchorLat = a.lat;
  obj.anchorLng = a.lng;
  obj.anchorLon = a.lng;
  obj.anchorLongitude = a.lng;
  obj.baseLat = a.lat;
  obj.baseLng = a.lng;
  obj.baseLon = a.lng;
  obj.baseLongitude = a.lng;

  obj.coordinates = { lat: a.lat, lng: a.lng, lon: a.lng };
  obj.position = { lat: a.lat, lng: a.lng, lon: a.lng };
  obj.geo = { lat: a.lat, lng: a.lng, lon: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  obj.leafletLatLng = [a.lat, a.lng];
  obj.geoJsonCoordinates = [a.lng, a.lat];

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

  if (target.imageFallback && hasBadOrMissingImage(obj)) {
    obj.imageUrl = target.imageFallback;
    obj.portraitUrl = obj.portraitUrl || target.imageFallback;
    obj.avatarUrl = obj.avatarUrl || target.imageFallback;
    obj.imageProvider = 'Wikimedia Commons fallback';
    obj.visualAuditStatus = 'curated_fallback_image';
    obj.visualStatus = 'curated_fallback_image';
  }

  obj.anchorAudit = {
    status: 'curated_anchor_applied',
    target: target.key,
    city: a.city,
    countryCode: a.countryCode,
    generatedAt: new Date().toISOString()
  };
  obj.lastAnchorRepair = new Date().toISOString();

  return { before, after: snapshot(obj) };
}

function snapshot(obj) {
  return {
    id: obj.id || null,
    slug: obj.slug || null,
    personId: obj.personId || null,
    name: obj.canonicalName || obj.name || obj.personName || null,
    title: obj.title || null,
    countryFocusCode: obj.countryFocusCode || null,
    countryName: obj.countryName || obj.country || null,
    lat: obj.lat ?? obj.latitude ?? obj.mapLat ?? obj.homeLat ?? obj.location?.lat ?? null,
    lng: obj.lng ?? obj.lon ?? obj.longitude ?? obj.mapLng ?? obj.homeLng ?? obj.location?.lng ?? obj.location?.lon ?? null,
    imageUrl: obj.imageUrl || obj.portraitUrl || obj.avatarUrl || null
  };
}

function walk(value, path, callback, seen = new Set()) {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${path}[${index}]`, callback, seen));
    return;
  }
  callback(value, path);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') walk(child, `${path}.${key}`, callback, seen);
  }
}

function collectTargetIds(data) {
  const idMap = new Map(TARGETS.map((target) => [target.key, new Set()]));
  const likelyCollections = ['people', 'roster', 'topRoster', 'expansionRoster', 'priorityExpansion', 'watchlistExamples'];
  for (const collection of likelyCollections) {
    const rows = data[collection];
    if (!rows) continue;
    walk(rows, collection, (obj) => {
      for (const target of TARGETS) {
        const text = profileText(obj);
        const mustOk = !target.must || target.must.every((part) => text.includes(norm(part)));
        const anyOk = !target.any || target.any.some((part) => text.includes(norm(part)));
        const roleOk = !target.roleAny || target.roleAny.some((part) => text.includes(norm(part)));
        const hintOk = (target.idHints || []).some((hint) => String(obj.id || obj.slug || '').toLowerCase().includes(String(hint).toLowerCase()));
        if (hintOk || (mustOk && anyOk && roleOk)) {
          for (const key of ['id', 'slug', 'personId', 'wikidataId']) {
            if (obj[key]) idMap.get(target.key).add(String(obj[key]));
          }
        }
      }
    });
  }
  return idMap;
}

function applyRepairs(data) {
  const idMap = collectTargetIds(data);
  const patches = [];
  walk(data, 'data', (obj, path) => {
    const profileish = obj.id || obj.slug || obj.personId || obj.name || obj.canonicalName || obj.personName || obj.roleTitle || obj.title;
    if (!profileish) return;
    for (const target of TARGETS) {
      if (!targetMatchesObject(obj, target, idMap)) continue;
      const patch = patchObject(obj, target);
      patches.push({ target: target.key, path, ...patch });
      break;
    }
  });
  return { patches, idMap: Object.fromEntries([...idMap.entries()].map(([k, v]) => [k, [...v]])) };
}

function runtimeGuardScript() {
  const registry = Object.fromEntries(TARGETS.map((target) => [target.key, {
    name: target.displayName,
    aliases: [...(target.must || []), ...(target.any || []), ...(target.idHints || []), target.displayName].filter(Boolean),
    lat: target.anchor.lat,
    lng: target.anchor.lng,
    city: target.anchor.city,
    countryCode: target.anchor.countryCode,
    countryName: target.anchor.countryName
  }]));
  return `${GUARD_START}\n<script>\n(function(){\n  var REGISTRY = ${JSON.stringify(registry)};\n  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function textOf(v){\n    try {\n      if (!v) return '';\n      if (typeof v === 'string') return v;\n      if (v instanceof Element) return v.textContent || v.innerText || '';\n      if (Array.isArray(v)) return v.map(textOf).join(' ');\n      if (typeof v === 'object') return JSON.stringify(v).slice(0,3000);\n      return String(v);\n    } catch(e){ return ''; }\n  }\n  function targetForText(v){\n    var t = norm(textOf(v));\n    if (!t) return null;\n    var keys = Object.keys(REGISTRY);\n    for (var i=0;i<keys.length;i++){\n      var r = REGISTRY[keys[i]];\n      var aliases = r.aliases || [];\n      for (var j=0;j<aliases.length;j++){\n        var a = norm(aliases[j]);\n        if (a && t.indexOf(a) !== -1) return r;\n      }\n    }\n    return null;\n  }\n  function latlng(r){ return [Number(r.lat), Number(r.lng)]; }\n  function forceLayer(layer, target){\n    try {\n      if (!layer || !target || !Number.isFinite(Number(target.lat)) || !Number.isFinite(Number(target.lng))) return;\n      layer.__parleymapForcedAnchor = target;\n      if (typeof layer.setLatLng === 'function') layer.setLatLng(latlng(target));\n      if (layer.options) {\n        layer.options.lat = target.lat; layer.options.lng = target.lng; layer.options.lon = target.lng;\n      }\n    } catch(e) {}\n  }\n  function patchLeaflet(L){\n    if (!L || L.__parleymapAnchorGuardPatched) return;\n    L.__parleymapAnchorGuardPatched = true;\n    window.__parleymapLeafletMaps = window.__parleymapLeafletMaps || [];\n    var oldMap = L.map;\n    if (typeof oldMap === 'function') {\n      L.map = function(){ var m = oldMap.apply(this, arguments); try { window.__parleymapLeafletMaps.push(m); } catch(e){} return m; };\n    }\n    ['marker','circleMarker'].forEach(function(name){\n      var old = L[name];\n      if (typeof old !== 'function') return;\n      L[name] = function(latlngArg, opts){\n        var target = targetForText(opts) || targetForText(latlngArg);\n        if (target) latlngArg = latlng(target);\n        var layer = old.call(this, latlngArg, opts);\n        if (target) forceLayer(layer, target);\n        return layer;\n      };\n    });\n    function patchProto(proto){\n      if (!proto || proto.__parleymapAnchorGuardProtoPatched) return;\n      proto.__parleymapAnchorGuardProtoPatched = true;\n      ['bindTooltip','bindPopup'].forEach(function(method){\n        var old = proto[method];\n        if (typeof old !== 'function') return;\n        proto[method] = function(content, options){\n          var result = old.apply(this, arguments);\n          var target = targetForText(content) || targetForText(options) || targetForText(this.options);\n          if (target) forceLayer(this, target);\n          return result;\n        };\n      });\n      var oldOnAdd = proto.onAdd;\n      if (typeof oldOnAdd === 'function') {\n        proto.onAdd = function(map){\n          var result = oldOnAdd.apply(this, arguments);\n          var self = this;\n          setTimeout(function(){\n            var target = targetForText(self.options) || targetForText(self._tooltip && self._tooltip._content) || targetForText(self._popup && self._popup._content) || targetForText(self._icon);\n            if (target) forceLayer(self, target);\n          }, 0);\n          return result;\n        };\n      }\n    }\n    patchProto(L.Marker && L.Marker.prototype);\n    patchProto(L.CircleMarker && L.CircleMarker.prototype);\n  }\n  function install(){ try { if (window.L) patchLeaflet(window.L); } catch(e){} }\n  try {\n    var currentL = window.L;\n    Object.defineProperty(window, 'L', { configurable: true, get: function(){ return currentL; }, set: function(v){ currentL = v; setTimeout(function(){ patchLeaflet(v); },0); } });\n    if (currentL) setTimeout(function(){ patchLeaflet(currentL); },0);\n  } catch(e) { install(); }\n  document.addEventListener('DOMContentLoaded', install);\n  window.addEventListener('load', install);\n  var tries = 0;\n  var timer = setInterval(function(){ install(); if (++tries > 80) clearInterval(timer); }, 250);\n  window.__PARLEYMAP_ANCHOR_RUNTIME_GUARD = { installed: true, registry: REGISTRY, installedAt: new Date().toISOString() };\n})();\n</script>\n${GUARD_END}`;
}

function removeOldGuards(html) {
  return html
    .replace(new RegExp(`${GUARD_START}[\\s\\S]*?${GUARD_END}`, 'g'), '')
    .replace(/<!-- PARLEYMAP_FINAL_ANCHOR_GUARD_START -->[\s\S]*?<!-- PARLEYMAP_FINAL_ANCHOR_GUARD_END -->/g, '')
    .replace(/<!-- PARLEYMAP_RUNTIME_ANCHOR_GUARD_START -->[\s\S]*?<!-- PARLEYMAP_RUNTIME_ANCHOR_GUARD_END -->/g, '');
}

function installRuntimeGuard(html) {
  const clean = removeOldGuards(html);
  const payload = readEmbeddedFromHtml(clean, 'guard-install-html');
  const insertAt = clean.indexOf(CLOSE_TAG, payload.jsonStart) + CLOSE_TAG.length;
  return clean.slice(0, insertAt) + '\n' + runtimeGuardScript() + '\n' + clean.slice(insertAt);
}

function targetPatchCounts(patches) {
  const out = Object.fromEntries(TARGETS.map((target) => [target.key, 0]));
  for (const patch of patches) out[patch.target] = (out[patch.target] || 0) + 1;
  return out;
}

function writeSummary(report) {
  const lines = [
    '# ParleyMap final rescue',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Result',
    '',
    `Status: ${report.status}`,
    `Restored from: ${report.restore.source} ${report.restore.commit}`,
    `Pollution before rescue: ${report.pollutionBefore || 'none'}`,
    `Runtime guard installed: ${report.runtimeGuardInstalled}`,
    '',
    '## Counts',
    '',
    '| Dataset | Before | Restored base | Final |',
    '|---|---:|---:|---:|'
  ];
  for (const key of ['people','roster','topRoster','expansionRoster','appearances','categories']) {
    lines.push(`| ${key} | ${report.beforeCounts[key] ?? 'n/a'} | ${report.baseCounts[key] ?? 'n/a'} | ${report.finalCounts[key] ?? 'n/a'} |`);
  }
  lines.push('', '## Anchor patches', '');
  for (const [key, value] of Object.entries(report.patchesByTarget)) lines.push(`- ${key}: ${value}`);
  fs.writeFileSync(SUMMARY_PATH, lines.join('\n') + '\n');
}

fs.mkdirSync('data/diagnostics', { recursive: true });

const currentHtml = fs.readFileSync(INDEX_PATH, 'utf8');
const currentPayload = readEmbeddedFromHtml(currentHtml, 'current index.html');
const beforeCounts = counts(currentPayload.data);
const pollutionBefore = pollutedReason(currentPayload.data);

const base = findLastGoodHtml(currentPayload);
let html = base.html;
html = installRuntimeGuard(html);
let payload = readEmbeddedFromHtml(html, 'post-guard index');
const baseCounts = counts(payload.data);
validateCore(payload.data, 'base after restore');

const { patches, idMap } = applyRepairs(payload.data);

payload.data.meta = {
  ...(payload.data.meta || {}),
  lastDataUpdate: new Date().toISOString(),
  lastFinalRescueRun: new Date().toISOString(),
  finalRescueStatus: `restored=${base.source}; anchor patches=${patches.length}; runtime guard installed`
};

writeEmbedded(payload, payload.data);

// Re-read written HTML to make sure the guard and JSON survived together.
const finalPayload = readEmbeddedFromHtml(fs.readFileSync(INDEX_PATH, 'utf8'), 'final index.html');
validateCore(finalPayload.data, 'final index.html');
const finalCounts = counts(finalPayload.data);

const report = {
  generatedAt: new Date().toISOString(),
  status: 'final_rescue_applied',
  pollutionBefore,
  beforeCounts,
  baseCounts,
  finalCounts,
  restore: { source: base.source, commit: base.commit },
  runtimeGuardInstalled: fs.readFileSync(INDEX_PATH, 'utf8').includes('PARLEYMAP_ANCHOR_RUNTIME_GUARD_START'),
  targetIds: idMap,
  patchCount: patches.length,
  patchesByTarget: targetPatchCounts(patches),
  samplePatches: patches.slice(0, 80)
};

for (const required of ['claudia_sheinbaum', 'pope_leo_xiv', 'prabowo_subianto', 'rafael_grossi']) {
  if ((report.patchesByTarget[required] || 0) < 1) {
    throw new Error(`Required target not patched: ${required}`);
  }
}
if (!report.runtimeGuardInstalled) throw new Error('Runtime guard was not installed');

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
writeSummary(report);
console.log(JSON.stringify(report, null, 2));
