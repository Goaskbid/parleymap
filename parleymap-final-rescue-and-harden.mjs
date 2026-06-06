import fs from 'node:fs';
import { execSync } from 'node:child_process';

const INDEX_PATH = 'index.html';
const DEMO_PATH = 'data/demo.json';
const ANCHORS_PATH = 'data/curated-anchors.json';
const REPORT_PATH = 'data/diagnostics/final-rescue-report.json';
const AUDIT_PATH = 'data/diagnostics/final-audit-report.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';

const DEMO_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i;
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';
const RUNTIME_GUARD_ID = 'parleymap-anchor-runtime-guard';
const MAX_SAFE_PEOPLE = 115;

function ensureDirs() {
  fs.mkdirSync('data', { recursive: true });
  fs.mkdirSync('data/diagnostics', { recursive: true });
  fs.mkdirSync('.github/workflows', { recursive: true });
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
  return norm(value).replace(/ /g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown';
}

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function tryRun(command) {
  try {
    return run(command);
  } catch {
    return '';
  }
}

function extract(html) {
  const match = html.match(DEMO_RE);
  if (!match) return null;
  const full = match[0];
  const start = match.index;
  const jsonStart = start + full.indexOf(match[1]);
  const jsonEnd = jsonStart + match[1].length;
  try {
    const data = JSON.parse(match[1].trim());
    return { html, start, jsonStart, jsonEnd, data };
  } catch (error) {
    return { html, start, jsonStart, jsonEnd, data: null, error };
  }
}

function counts(data) {
  return {
    people: Array.isArray(data?.people) ? data.people.length : null,
    roster: Array.isArray(data?.roster) ? data.roster.length : null,
    topRoster: Array.isArray(data?.topRoster) ? data.topRoster.length : null,
    expansionRoster: Array.isArray(data?.expansionRoster) ? data.expansionRoster.length : null,
    appearances: Array.isArray(data?.appearances) ? data.appearances.length : null,
    categories: Array.isArray(data?.categories) ? data.categories.length : null
  };
}

function isCoreShape(data) {
  return Boolean(
    data &&
    Array.isArray(data.people) && data.people.length >= 90 && data.people.length <= MAX_SAFE_PEOPLE &&
    Array.isArray(data.roster) && data.roster.length >= 190 &&
    Array.isArray(data.expansionRoster) && data.expansionRoster.length >= 100 &&
    Array.isArray(data.appearances) && data.appearances.length >= 500 &&
    Array.isArray(data.categories) && data.categories.length >= 10
  );
}

function profileText(item) {
  return norm([
    item?.id,
    item?.slug,
    item?.name,
    item?.canonicalName,
    item?.roleTitle,
    item?.organization,
    item?.category,
    item?.country,
    item?.countryName,
    item?.countryFocus,
    item?.countryFocusCode,
    item?.profileLine,
    Array.isArray(item?.profileLines) ? item.profileLines.join(' ') : ''
  ].join(' '));
}

function isProfileLike(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  return Boolean(
    item.id || item.slug || item.name || item.canonicalName || item.roleTitle || item.profileLine || item.organization || item.wikidataId
  );
}

function isAppearanceLike(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  return Boolean(item.personId || item.startsAt || item.sourcePack || item.eventType || item.title);
}

function isPolluted(data, registry) {
  if (!data) return true;
  if (!isCoreShape(data)) return true;
  const allText = norm([
    ...(data.roster || []),
    ...(data.topRoster || []),
    ...(data.people || [])
  ].map(profileText).join(' '));
  const hasHistoricalActive = (registry.historicalActiveBlocklist || []).some((name) => allText.includes(norm(name)));
  return Boolean(hasHistoricalActive && (data.people?.length || 0) > 100);
}

function readCurrentPayload() {
  if (!fs.existsSync(INDEX_PATH)) return null;
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  return extract(html);
}

function gitShowIndex(hash) {
  try {
    return run(`git show ${hash}:index.html`);
  } catch {
    return '';
  }
}

function findSafeHistoryPayload(registry) {
  const hashes = tryRun('git log --format=%H -- index.html').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 120);
  for (const hash of hashes) {
    const html = gitShowIndex(hash);
    if (!html || !html.includes('demo-data')) continue;
    const payload = extract(html);
    if (!payload?.data) continue;
    if (isCoreShape(payload.data) && !isPolluted(payload.data, registry)) {
      return { ...payload, sourceCommit: hash };
    }
  }
  return null;
}

function writePayload(payload, data, htmlOverride = null) {
  let html;
  if (htmlOverride) {
    html = htmlOverride;
  } else {
    html = payload.html.slice(0, payload.jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + payload.html.slice(payload.jsonEnd);
  }
  fs.writeFileSync(INDEX_PATH, html);
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + '\n');
}

function shouldReplaceImage(value) {
  const text = String(value || '');
  return !text || /placeholder|default|avatar|silhouette|missing|data:image/i.test(text);
}

function anchorObject(target) {
  return {
    label: `${target.city} institutional base`,
    city: target.city,
    countryCode: target.countryCode,
    countryName: target.countryName,
    lat: target.lat,
    lng: target.lng,
    precision: 'city',
    type: 'institutional_base',
    privacy: 'city-level public institutional base only'
  };
}

function applyAnchor(item, target, options = {}) {
  const anchor = anchorObject(target);
  const patchLocation = options.patchLocation === true;

  item.parleyMapAnchorKey = target.key;
  item.countryFocus = target.countryCode;
  item.countryFocusCode = target.countryCode;
  item.countryCode = target.countryCode;
  item.countryName = target.countryName;
  item.country = target.countryName;
  item.homeRegion = target.region || item.homeRegion || null;
  item.region = item.region || target.region || null;
  item.locationStatus = 'institutional_base_city_level';

  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;
  item.baseLocation = anchor;
  item.institutionalBase = anchor;
  item.publicAnchor = anchor;

  if (patchLocation) {
    item.location = anchor;
    item.publicLocation = anchor;
  }

  item.lat = target.lat;
  item.lng = target.lng;
  item.lon = target.lng;
  item.long = target.lng;
  item.latitude = target.lat;
  item.longitude = target.lng;
  item.homeLat = target.lat;
  item.homeLng = target.lng;
  item.homeLon = target.lng;
  item.homeLongitude = target.lng;
  item.mapLat = target.lat;
  item.mapLng = target.lng;
  item.mapLon = target.lng;
  item.mapLongitude = target.lng;
  item.anchorLat = target.lat;
  item.anchorLng = target.lng;
  item.anchorLon = target.lng;
  item.anchorLongitude = target.lng;
  item.baseLat = target.lat;
  item.baseLng = target.lng;
  item.baseLon = target.lng;
  item.baseLongitude = target.lng;

  item.coordinates = { lat: target.lat, lng: target.lng, lon: target.lng };
  item.geo = {
    lat: target.lat,
    lng: target.lng,
    lon: target.lng,
    city: target.city,
    countryCode: target.countryCode,
    countryName: target.countryName
  };
  item.position = { lat: target.lat, lng: target.lng };
  item.leafletLatLng = [target.lat, target.lng];
  item.geoJsonCoordinates = [target.lng, target.lat];

  item.flagAudit = {
    ...(item.flagAudit || {}),
    code: target.countryCode,
    countryCode: target.countryCode,
    countryName: target.countryName,
    label: target.countryName,
    status: 'country flag'
  };
  item.flagCode = target.countryCode;
  item.countryFlagCode = target.countryCode;

  if (target.imageUrl && shouldReplaceImage(item.imageUrl)) {
    item.imageUrl = target.imageUrl;
    item.imageProvider = 'curated public image fallback';
    item.visualAuditStatus = 'curated fallback image';
    item.visualStatus = 'image available';
  }

  if (target.roleTitle && (!item.roleTitle || /former|head of/i.test(String(item.roleTitle)))) {
    item.roleTitle = target.roleTitle;
  }
  if (target.organization && !item.organization) item.organization = target.organization;
}

function targetMatches(item, target) {
  const text = profileText(item);
  const matchAllOk = !target.matchAll || target.matchAll.every((term) => text.includes(norm(term)));
  const matchAnyOk = !target.matchAny || target.matchAny.some((term) => text.includes(norm(term)));
  const roleAnyOk = !target.roleAny || target.roleAny.some((term) => text.includes(norm(term)));
  return Boolean(matchAllOk && matchAnyOk && roleAnyOk);
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

function repairAnchorsAndFaces(data, registry) {
  const fixes = [];
  const targetCounts = Object.fromEntries(registry.targets.map((target) => [target.key, 0]));

  walk(data, 'data', (item, path) => {
    if (!isProfileLike(item) && !isAppearanceLike(item)) return;
    for (const target of registry.targets) {
      if (!targetMatches(item, target)) continue;
      const before = {
        lat: item.lat ?? item.latitude ?? item.mapLat ?? item.homeLat ?? item.location?.lat ?? null,
        lng: item.lng ?? item.longitude ?? item.mapLng ?? item.homeLng ?? item.location?.lng ?? null,
        countryFocusCode: item.countryFocusCode || null,
        imageUrl: item.imageUrl || null
      };
      applyAnchor(item, target, { patchLocation: isAppearanceLike(item) && !Array.isArray(item.sourcePack) });
      fixes.push({ target: target.key, path, before, after: { lat: target.lat, lng: target.lng, countryFocusCode: target.countryCode } });
      targetCounts[target.key] += 1;
      break;
    }
  });

  return { fixes, targetCounts };
}

function findTarget(registry, key) {
  const target = registry.targets.find((row) => row.key === key);
  if (!target) throw new Error(`missing curated target ${key}`);
  return target;
}

function canonicalPerson(target) {
  const id = slug(target.displayName);
  const row = {
    id,
    slug: id,
    name: target.displayName,
    canonicalName: target.displayName,
    roleTitle: target.roleTitle || 'Current office holder',
    organization: target.organization || target.countryName,
    category: 'political_leader',
    countryFocus: target.countryCode,
    countryFocusCode: target.countryCode,
    countryCode: target.countryCode,
    countryName: target.countryName,
    imageUrl: target.imageUrl || '',
    imageProvider: target.imageUrl ? 'curated public image fallback' : 'needs review',
    trackingStatus: 'current_curated_rescue_profile',
    sourcePriority: 'curated rescue anchor',
    profileLine: target.roleTitle || `${target.displayName}, ${target.countryName}`,
    shortBio: `${target.displayName}, current public figure anchored to ${target.city}.`
  };
  applyAnchor(row, target);
  return row;
}

function countryRoleHit(row, countryCode, terms) {
  const text = profileText(row);
  const code = String(row.countryFocusCode || row.countryFocus || row.countryCode || '').toUpperCase();
  return code === countryCode && terms.some((term) => text.includes(term));
}

function replaceHistoricalActiveSlots(data, registry) {
  const operations = [];
  const macron = findTarget(registry, 'emmanuel_macron');
  const sheinbaum = findTarget(registry, 'claudia_sheinbaum');
  const blocklist = new Set((registry.historicalActiveBlocklist || []).map(norm));

  const replacements = [
    { countryCode: 'FR', target: macron, terms: ['president', 'head of state'] },
    { countryCode: 'MX', target: sheinbaum, terms: ['president', 'head of state'] }
  ];

  for (const collection of ['roster', 'topRoster', 'expansionRoster', 'priorityExpansion']) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object') return;
      const text = profileText(row);
      const historicalHit = [...blocklist].some((name) => name && text.includes(name));
      if (!historicalHit) return;
      const replacement = replacements.find((candidate) => countryRoleHit(row, candidate.countryCode, candidate.terms));
      if (!replacement) return;
      const previous = structuredClone(row);
      const next = { ...row, ...canonicalPerson(replacement.target), rank: row.rank, prominenceScore: row.prominenceScore };
      applyAnchor(next, replacement.target);
      rows[index] = next;
      operations.push({ type: 'replace_historical_active_slot', collection, index, oldName: previous.canonicalName || previous.name || previous.slug || null, newName: next.canonicalName, countryCode: replacement.countryCode });
    });
  }

  // Keep historical people for history, but mark them as former so they cannot look current.
  for (const collection of ['people', 'roster', 'topRoster', 'expansionRoster']) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const text = profileText(row);
      const historicalHit = [...blocklist].some((name) => name && text.includes(name));
      if (!historicalHit) continue;
      row.currentOfficeStatus = 'former_or_historical_not_current';
      if (row.roleTitle && !/^former/i.test(row.roleTitle)) row.roleTitle = `Former ${row.roleTitle}`;
      row.trackingStatus = 'historical_profile_not_current_roster_anchor';
      operations.push({ type: 'mark_historical_profile_former', collection, id: row.id || null, name: row.canonicalName || row.name || null });
    }
  }

  return operations;
}

function makeRuntimeGuard(registry) {
  const targets = registry.targets.map((target) => ({
    key: target.key,
    names: [target.displayName, ...(target.matchAll || []), ...(target.matchAny || [])].filter(Boolean),
    lat: target.lat,
    lng: target.lng,
    city: target.city,
    countryCode: target.countryCode,
    countryName: target.countryName
  }));

  const scriptPayload = JSON.stringify(targets);

  return `<script id="${RUNTIME_GUARD_ID}">\n(function(){\n  var TARGETS = ${scriptPayload};\n  var seen = Object.create(null);\n  function norm(v){ return String(v || '').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }\n  function targetFromText(text){ var n = norm(text); if(!n) return null; for(var i=0;i<TARGETS.length;i++){ var t = TARGETS[i]; for(var j=0;j<t.names.length;j++){ var name = norm(t.names[j]); if(name && n.indexOf(name) !== -1) return t; } } return null; }\n  function contentText(value){ if(value == null) return ''; if(typeof value === 'string') return value; if(value.outerHTML) return value.outerHTML; try { return JSON.stringify(value); } catch(e){ return String(value); } }\n  function setMarker(marker, target){\n    if(!marker || !target || marker.__parleyMapAnchorFixed === target.key) return marker;\n    marker.__parleyMapAnchorFixed = target.key;\n    try { if(marker.setLatLng) marker.setLatLng([target.lat, target.lng]); } catch(e){}\n    try { marker.options = marker.options || {}; marker.options.title = target.names[0]; marker.options.alt = target.names[0]; marker.options.parleyMapAnchorKey = target.key; } catch(e){}\n    if(seen[target.key] && seen[target.key] !== marker){\n      marker.__parleyMapDuplicateHidden = true;\n      setTimeout(function(){ try { if(marker.remove) marker.remove(); } catch(e){} }, 0);\n    } else {\n      seen[target.key] = marker;\n    }\n    return marker;\n  }\n  function patchLeaflet(){\n    if(!window.L || window.__parleyMapAnchorRuntimeGuardInstalled) return Boolean(window.L);\n    window.__parleyMapAnchorRuntimeGuardInstalled = true;\n    try {\n      ['Marker','CircleMarker','Circle'].forEach(function(cls){\n        var proto = window.L[cls] && window.L[cls].prototype;\n        if(!proto) return;\n        ['bindTooltip','bindPopup'].forEach(function(method){\n          if(!proto[method] || proto[method].__parleyMapPatched) return;\n          var original = proto[method];\n          proto[method] = function(content){\n            var result = original.apply(this, arguments);\n            var target = targetFromText(contentText(content));\n            if(target) setMarker(this, target);\n            return result;\n          };\n          proto[method].__parleyMapPatched = true;\n        });\n        if(proto.addTo && !proto.addTo.__parleyMapPatched){\n          var originalAddTo = proto.addTo;\n          proto.addTo = function(map){\n            var target = targetFromText((this.options && (this.options.title || this.options.alt || this.options.name)) || '');\n            if(target) setMarker(this, target);\n            return originalAddTo.apply(this, arguments);\n          };\n          proto.addTo.__parleyMapPatched = true;\n        }\n      });\n      [['marker','Marker'], ['circleMarker','CircleMarker'], ['circle','Circle']].forEach(function(pair){\n        var fn = pair[0];\n        if(!window.L[fn] || window.L[fn].__parleyMapPatched) return;\n        var originalFactory = window.L[fn];\n        window.L[fn] = function(latlng, options){\n          var marker = originalFactory.apply(this, arguments);\n          var target = targetFromText(options && (options.title || options.alt || options.name || options.parleyMapName));\n          if(target) setMarker(marker, target);\n          return marker;\n        };\n        window.L[fn].__parleyMapPatched = true;\n      });\n    } catch(e) { console.warn('ParleyMap anchor guard failed', e); }\n    return true;\n  }\n  var attempts = 0;\n  var timer = setInterval(function(){ attempts++; if(patchLeaflet() || attempts > 240) clearInterval(timer); }, 25);\n  patchLeaflet();\n})();\n</script>`;
}

function removeOldGuards(html) {
  return html
    .replace(/<script\s+id=["']parleymap-anchor-runtime-guard["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script\s+id=["']parleymap-final-runtime-anchor-guard["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script\s+id=["']parleymap-hard-anchor-guard["'][\s\S]*?<\/script>\s*/gi, '');
}

function installRuntimeGuard(html, registry) {
  const cleaned = removeOldGuards(html);
  const match = cleaned.match(DEMO_RE);
  if (!match) throw new Error('cannot install runtime guard because demo-data block is missing');
  const insertAt = match.index + match[0].length;
  return cleaned.slice(0, insertAt) + '\n' + makeRuntimeGuard(registry) + '\n' + cleaned.slice(insertAt);
}

function currentLatLng(item) {
  const candidate = item?.mapAnchor || item?.homeBase || item?.homeBases?.[0] || item?.anchorLocation || item?.baseLocation || item?.location || item;
  const lat = Number(candidate?.lat ?? candidate?.latitude ?? item?.lat ?? item?.latitude ?? item?.mapLat ?? item?.homeLat);
  const lng = Number(candidate?.lng ?? candidate?.lon ?? candidate?.longitude ?? item?.lng ?? item?.lon ?? item?.longitude ?? item?.mapLng ?? item?.homeLng);
  return { lat, lng };
}

function closeEnough(item, target) {
  const p = currentLatLng(item);
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat - target.lat) < 0.5 && Math.abs(p.lng - target.lng) < 0.5;
}

function collectMatchingObjects(data, target) {
  const matches = [];
  walk(data, 'data', (item, path) => {
    if (!isProfileLike(item) && !isAppearanceLike(item)) return;
    if (targetMatches(item, target)) matches.push({ item, path });
  });
  return matches;
}

function runFinalAudit(html, data, registry) {
  const failures = [];
  const criticalKeys = ['claudia_sheinbaum', 'pope_leo_xiv', 'prabowo_subianto', 'rafael_grossi'];
  const rows = [];
  for (const key of criticalKeys) {
    const target = findTarget(registry, key);
    const matches = collectMatchingObjects(data, target).filter(({ item }) => isProfileLike(item));
    if (!matches.length) {
      failures.push(`${key}: no matching profile-like object found`);
      continue;
    }
    const bad = matches.filter(({ item }) => !closeEnough(item, target));
    rows.push({ key, matches: matches.length, bad: bad.length, expected: { lat: target.lat, lng: target.lng, city: target.city } });
    if (bad.length) failures.push(`${key}: ${bad.length} profile-like objects still have bad anchor`);
  }

  const activeText = norm([...(data.roster || []), ...(data.topRoster || [])].map(profileText).join(' '));
  for (const historical of ['vincent auriol', 'rene coty', 'rené coty', 'jacques chirac', 'francois hollande', 'enrique pena nieto']) {
    if (activeText.includes(norm(historical))) failures.push(`historical active roster pollution remains: ${historical}`);
  }
  if ((data.people?.length || 0) > MAX_SAFE_PEOPLE) failures.push(`people count unsafe: ${data.people.length}`);
  if (!html.includes(`id="${RUNTIME_GUARD_ID}"`)) failures.push('runtime guard missing from index.html');

  return { status: failures.length ? 'audit_failed' : 'audit_passed', failures, rows };
}

function workflowFinalRescue() {
  return `name: ParleyMap final rescue now

on:
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: parleymap-final-rescue
  cancel-in-progress: false

jobs:
  rescue:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Run final rescue and hardening
        run: node scripts/parleymap-final-rescue-and-harden.mjs

      - name: Validate embedded dataset when validator exists
        run: |
          if [ -f scripts/validate-demo-data.mjs ]; then
            node scripts/validate-demo-data.mjs
          else
            echo "No validator found. Rescue audit already passed."
          fi

      - name: Show latest summary
        if: always()
        run: |
          if [ -f data/diagnostics/LATEST_RUN_SUMMARY.md ]; then
            cat data/diagnostics/LATEST_RUN_SUMMARY.md >> "$GITHUB_STEP_SUMMARY"
            cat data/diagnostics/LATEST_RUN_SUMMARY.md
          fi

      - name: Upload final rescue files
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: parleymap-final-rescue-files
          path: |
            index.html
            data/demo.json
            data/diagnostics/final-rescue-report.json
            data/diagnostics/final-audit-report.json
            data/diagnostics/LATEST_RUN_SUMMARY.md
            .github/workflows/*.yml

      - name: Commit final rescue
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Apply ParleyMap final rescue and hardening"
          file_pattern: "index.html data/demo.json data/diagnostics/*.json data/diagnostics/*.md .github/workflows/*.yml scripts/*.mjs data/curated-anchors.json"
`;
}

function workflowNightly() {
  return `name: ParleyMap nightly refresh

on:
  workflow_dispatch:
  schedule:
    - cron: "19 3 * * *"

permissions:
  contents: write

concurrency:
  group: parleymap-nightly-refresh
  cancel-in-progress: false

jobs:
  refresh:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Pre-refresh rescue and audit
        run: node scripts/parleymap-final-rescue-and-harden.mjs

      - name: Sync crawler input from current index.html
        run: |
          node - <<'NODE'
          const fs = require('fs');
          const html = fs.readFileSync('index.html', 'utf8');
          const m = html.match(/<script\\s+id=["']demo-data["']\\s+type=["']application\\/json["'][^>]*>([\\s\\S]*?)<\\/script>/i);
          if (!m) throw new Error('demo-data block not found');
          fs.mkdirSync('data', { recursive: true });
          fs.writeFileSync('data/demo.json', JSON.stringify(JSON.parse(m[1]), null, 2) + '\\n');
          NODE

      - name: Run bounded crawler when available
        continue-on-error: true
        run: |
          if [ -f nightly-refresh.mjs ]; then
            timeout 12m node nightly-refresh.mjs --max-roster 60 --max-per-person 2 --max-pages-per-source 8 --lookback-days 21
          else
            echo "No nightly-refresh.mjs found. Skipping crawler."
          fi
        env:
          PARLEYMAP_FETCH_TIMEOUT_MS: "3000"

      - name: Guard-publish crawler output when available
        continue-on-error: true
        run: |
          if [ -f scripts/guarded-publish-from-crawler.mjs ]; then
            node scripts/guarded-publish-from-crawler.mjs
          else
            echo "No guarded crawler publisher found. Skipping publication."
          fi

      - name: Post-refresh rescue and audit
        run: node scripts/parleymap-final-rescue-and-harden.mjs

      - name: Validate embedded dataset when validator exists
        run: |
          if [ -f scripts/validate-demo-data.mjs ]; then
            node scripts/validate-demo-data.mjs
          fi

      - name: Show latest summary
        if: always()
        run: |
          if [ -f data/diagnostics/LATEST_RUN_SUMMARY.md ]; then
            cat data/diagnostics/LATEST_RUN_SUMMARY.md >> "$GITHUB_STEP_SUMMARY"
            cat data/diagnostics/LATEST_RUN_SUMMARY.md
          fi

      - name: Upload nightly files
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: parleymap-nightly-run-files
          path: |
            index.html
            data/demo.json
            data/crawler/*.json
            data/diagnostics/*.json
            data/diagnostics/*.md
            .github/workflows/*.yml

      - name: Commit nightly refresh
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Refresh ParleyMap nightly data with rescue audit"
          file_pattern: "index.html data/demo.json data/crawler/*.json data/diagnostics/*.json data/diagnostics/*.md .github/workflows/*.yml scripts/*.mjs data/curated-anchors.json"
`;
}

function workflowMonthly() {
  return `name: ParleyMap monthly roster review

on:
  workflow_dispatch:
  schedule:
    - cron: "31 4 1 * *"

permissions:
  contents: write

concurrency:
  group: parleymap-monthly-roster-review
  cancel-in-progress: false

jobs:
  roster-review:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Rescue before roster review
        run: node scripts/parleymap-final-rescue-and-harden.mjs

      - name: Run guarded current-holder review
        run: node scripts/parleymap-current-holder-safe-update.mjs --apply

      - name: Rescue after roster review
        run: node scripts/parleymap-final-rescue-and-harden.mjs

      - name: Validate embedded dataset when validator exists
        run: |
          if [ -f scripts/validate-demo-data.mjs ]; then
            node scripts/validate-demo-data.mjs
          fi

      - name: Show latest summary
        if: always()
        run: |
          if [ -f data/diagnostics/LATEST_RUN_SUMMARY.md ]; then
            cat data/diagnostics/LATEST_RUN_SUMMARY.md >> "$GITHUB_STEP_SUMMARY"
            cat data/diagnostics/LATEST_RUN_SUMMARY.md
          fi

      - name: Upload monthly roster files
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: parleymap-monthly-roster-files
          path: |
            index.html
            data/demo.json
            data/diagnostics/*.json
            data/diagnostics/*.md
            .github/workflows/*.yml

      - name: Commit monthly roster review
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Review ParleyMap roster with rescue audit"
          file_pattern: "index.html data/demo.json data/diagnostics/*.json data/diagnostics/*.md .github/workflows/*.yml scripts/*.mjs data/curated-anchors.json"
`;
}

function workflowRosterNow() {
  return `name: ParleyMap roster auto update now

on:
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: parleymap-roster-auto-update-now
  cancel-in-progress: false

jobs:
  roster-update:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Rescue before roster update
        run: node scripts/parleymap-final-rescue-and-harden.mjs

      - name: Run guarded roster update
        run: node scripts/parleymap-current-holder-safe-update.mjs --apply

      - name: Rescue after roster update
        run: node scripts/parleymap-final-rescue-and-harden.mjs

      - name: Validate embedded dataset when validator exists
        run: |
          if [ -f scripts/validate-demo-data.mjs ]; then
            node scripts/validate-demo-data.mjs
          fi

      - name: Show latest summary
        if: always()
        run: |
          if [ -f data/diagnostics/LATEST_RUN_SUMMARY.md ]; then
            cat data/diagnostics/LATEST_RUN_SUMMARY.md >> "$GITHUB_STEP_SUMMARY"
            cat data/diagnostics/LATEST_RUN_SUMMARY.md
          fi

      - name: Upload roster update files
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: parleymap-roster-update-files
          path: |
            index.html
            data/demo.json
            data/diagnostics/*.json
            data/diagnostics/*.md
            .github/workflows/*.yml

      - name: Commit guarded roster update
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Guarded ParleyMap roster update with rescue audit"
          file_pattern: "index.html data/demo.json data/diagnostics/*.json data/diagnostics/*.md .github/workflows/*.yml scripts/*.mjs data/curated-anchors.json"
`;
}

function writeSafeWorkflowFiles() {
  const files = {
    '.github/workflows/parleymap-final-rescue-now.yml': workflowFinalRescue(),
    '.github/workflows/nightly-refresh.yml': workflowNightly(),
    '.github/workflows/monthly-roster-review.yml': workflowMonthly(),
    '.github/workflows/roster-auto-update-now.yml': workflowRosterNow()
  };
  for (const [path, content] of Object.entries(files)) {
    fs.mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
    fs.writeFileSync(path, content.replace(/\r\n/g, '\n'));
  }
  return Object.keys(files);
}

function rescueHtmlPayload(registry) {
  const current = readCurrentPayload();
  const currentCounts = current?.data ? counts(current.data) : null;
  let payload = current;
  let restoredFromHistory = false;
  let restoredCommit = null;

  if (!current?.data || isPolluted(current.data, registry)) {
    const safe = findSafeHistoryPayload(registry);
    if (!safe) {
      throw new Error('No safe historical index.html found. Refusing to patch an unsafe or invalid dataset.');
    }
    payload = safe;
    restoredFromHistory = true;
    restoredCommit = safe.sourceCommit;
  }

  if (!payload?.data) throw new Error('No valid embedded dataset after rescue selection');
  return { payload, restoredFromHistory, restoredCommit, currentCounts };
}

function buildSummary(report, audit) {
  const lines = [];
  lines.push('# ParleyMap final rescue and hardening');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${audit.status}`);
  lines.push('');
  lines.push('## Dataset counts');
  lines.push('');
  lines.push('| Dataset | Before | After |');
  lines.push('|---|---:|---:|');
  for (const key of ['people', 'roster', 'topRoster', 'expansionRoster', 'appearances', 'categories']) {
    lines.push(`| ${key} | ${report.before?.[key] ?? 'n/a'} | ${report.after?.[key] ?? 'n/a'} |`);
  }
  lines.push('');
  lines.push('## Actions');
  lines.push('');
  lines.push(`- Restored from history: ${report.restoredFromHistory ? 'yes' : 'no'}`);
  lines.push(`- Restored commit: ${report.restoredCommit || 'n/a'}`);
  lines.push(`- Anchor and face patches: ${report.anchorFixCount}`);
  lines.push(`- Historical active-slot operations: ${report.historicalOperationCount}`);
  lines.push(`- Runtime guard installed: ${report.runtimeGuardInstalled ? 'yes' : 'no'}`);
  lines.push(`- Workflow files repaired: ${report.workflowFilesWritten.length}`);
  lines.push('');
  lines.push('## Critical audit');
  lines.push('');
  for (const row of audit.rows) {
    lines.push(`- ${row.key}: ${row.matches} matched, ${row.bad} bad after repair, expected ${row.expected.city}`);
  }
  if (audit.failures.length) {
    lines.push('');
    lines.push('## Failures');
    for (const failure of audit.failures) lines.push(`- ${failure}`);
  }
  return lines.join('\n') + '\n';
}

function main() {
  ensureDirs();
  const registry = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));
  const selected = rescueHtmlPayload(registry);
  const data = selected.payload.data;
  const before = counts(data);

  const anchorResult = repairAnchorsAndFaces(data, registry);
  const historicalOps = replaceHistoricalActiveSlots(data, registry);

  data.meta = {
    ...(data.meta || {}),
    lastDataUpdate: new Date().toISOString(),
    lastFinalRescue: new Date().toISOString(),
    finalRescueStatus: `patched ${anchorResult.fixes.length} anchor or face records and ${historicalOps.length} historical roster records`
  };

  if (!isCoreShape(data)) {
    throw new Error(`Core dataset shape invalid after rescue: ${JSON.stringify(counts(data))}`);
  }

  const nextJson = JSON.stringify(data, null, 2);
  let html = selected.payload.html.slice(0, selected.payload.jsonStart) + '\n' + nextJson + '\n' + selected.payload.html.slice(selected.payload.jsonEnd);
  html = installRuntimeGuard(html, registry);

  const audit = runFinalAudit(html, data, registry);
  if (audit.status !== 'audit_passed') {
    fs.writeFileSync(AUDIT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), ...audit }, null, 2) + '\n');
    throw new Error(`Final audit failed: ${audit.failures.join('; ')}`);
  }

  writePayload(selected.payload, data, html);
  const workflowFilesWritten = writeSafeWorkflowFiles();
  const after = counts(data);

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'final_rescue_applied',
    restoredFromHistory: selected.restoredFromHistory,
    restoredCommit: selected.restoredCommit,
    currentCountsBeforeHistoryRestore: selected.currentCounts,
    before,
    after,
    anchorFixCount: anchorResult.fixes.length,
    targetPatchCounts: anchorResult.targetCounts,
    historicalOperationCount: historicalOps.length,
    historicalOperations: historicalOps,
    runtimeGuardInstalled: html.includes(`id="${RUNTIME_GUARD_ID}"`),
    workflowFilesWritten,
    note: 'This rescue restores polluted datasets from safe git history, repairs curated anchors/faces, installs a runtime Leaflet guard, repairs malformed workflows, and refuses to commit if critical anchors fail.'
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(AUDIT_PATH, JSON.stringify({ generatedAt: report.generatedAt, ...audit }, null, 2) + '\n');
  fs.writeFileSync(SUMMARY_PATH, buildSummary(report, audit));

  console.log(JSON.stringify({ status: report.status, audit: audit.status, after, anchorFixCount: report.anchorFixCount, restoredFromHistory: report.restoredFromHistory }, null, 2));
}

main();
