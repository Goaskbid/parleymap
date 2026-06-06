import fs from "node:fs";
import { execFileSync } from "node:child_process";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const ANCHORS_PATH = "data/curated-anchors.json";
const REPORT_PATH = "data/diagnostics/final-rescue-report.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = "</" + "script>";
const GUARD_ID = "parleymap-final-anchor-guard";

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readConfig() {
  return JSON.parse(fs.readFileSync(ANCHORS_PATH, "utf8"));
}

function extractEmbedded(html) {
  const start = html.indexOf(OPEN);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN.length;
  const jsonEnd = html.indexOf(CLOSE, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { html, jsonStart, jsonEnd, data };
}

function readIndex() {
  return extractEmbedded(fs.readFileSync(INDEX_PATH, "utf8"));
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

function validateMinimumShape(data, label = "data") {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  }
  if (data.people.length < 90) throw new Error(`${label}: people count too low`);
  if (data.roster.length < 190) throw new Error(`${label}: roster count too low`);
  if (data.expansionRoster.length < 100) throw new Error(`${label}: expansionRoster count too low`);
  if (data.appearances.length < 500) throw new Error(`${label}: appearances count too low`);
  if (data.categories.length < 10) throw new Error(`${label}: categories count too low`);
}

function textOfRow(row) {
  return norm([
    row?.id,
    row?.slug,
    row?.name,
    row?.canonicalName,
    row?.roleTitle,
    row?.organization,
    row?.category,
    row?.country,
    row?.countryName,
    row?.countryFocus,
    row?.countryFocusCode,
    row?.profileLine,
    Array.isArray(row?.profileLines) ? row.profileLines.join(" ") : "",
    row?.title,
    row?.summary
  ].join(" "));
}

function isActiveHistoricalPollution(data, config) {
  const badNames = config.historicalActiveBlocklist || [];
  const activeCollections = ["roster", "topRoster", "expansionRoster", "priorityExpansion"];
  for (const collection of activeCollections) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    for (const row of rows) {
      const text = textOfRow(row);
      const role = norm(row?.roleTitle || "");
      const inactive = /former|deceased|historical|archival/.test(role + " " + norm(row?.trackingStatus));
      if (inactive) continue;
      if (badNames.some((name) => text.includes(norm(name)))) return true;
    }
  }
  return false;
}

function isSafeHistoricalCandidate(data, config) {
  try {
    validateMinimumShape(data, "candidate");
  } catch {
    return false;
  }
  const c = counts(data);
  if (c.people > 115) return false;
  if (c.roster !== 200) return false;
  if (c.expansionRoster < 100 || c.expansionRoster > 130) return false;
  if (isActiveHistoricalPollution(data, config)) return false;
  return true;
}

function restoreSafeIndexIfNeeded(current, config) {
  const before = counts(current.data);
  const polluted = before.people > 115 || isActiveHistoricalPollution(current.data, config);
  if (!polluted) return { payload: current, restored: false, restoredFrom: null, before };

  let commits = [];
  try {
    commits = execFileSync("git", ["log", "--format=%H", "--", INDEX_PATH], { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error(`failed to inspect git history: ${error.message}`);
  }

  for (const sha of commits) {
    let html;
    try {
      html = execFileSync("git", ["show", `${sha}:${INDEX_PATH}`], { encoding: "utf8", maxBuffer: 80 * 1024 * 1024 });
    } catch {
      continue;
    }
    let candidate;
    try {
      candidate = extractEmbedded(html);
    } catch {
      continue;
    }
    if (!isSafeHistoricalCandidate(candidate.data, config)) continue;
    fs.writeFileSync(INDEX_PATH, html);
    return { payload: extractEmbedded(html), restored: true, restoredFrom: sha, before };
  }

  throw new Error("dataset is polluted and no safe index.html was found in git history");
}

function targetMatches(row, target) {
  const text = textOfRow(row);
  const allOk = !target.matchAll || target.matchAll.every((term) => text.includes(norm(term)));
  const anyOk = !target.matchAny || target.matchAny.some((term) => text.includes(norm(term)));
  const roleOk = !target.roleAny || target.roleAny.some((term) => text.includes(norm(term)));
  return allOk && anyOk && roleOk;
}

function anchorObject(target) {
  const a = target.anchor;
  return {
    label: a.label,
    city: a.city,
    countryCode: a.countryCode,
    countryName: a.countryName,
    lat: a.lat,
    lng: a.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function snapshot(row) {
  return {
    id: row?.id || null,
    slug: row?.slug || null,
    name: row?.canonicalName || row?.name || null,
    title: row?.title || null,
    personId: row?.personId || null,
    countryFocus: row?.countryFocus || null,
    countryFocusCode: row?.countryFocusCode || null,
    countryCode: row?.countryCode || null,
    countryName: row?.countryName || row?.country || null,
    lat: row?.lat ?? row?.latitude ?? row?.mapLat ?? row?.homeLat ?? row?.location?.lat ?? null,
    lng: row?.lng ?? row?.lon ?? row?.longitude ?? row?.mapLng ?? row?.homeLng ?? row?.location?.lng ?? row?.location?.lon ?? null,
    imageUrl: row?.imageUrl || null,
    homeBases: Array.isArray(row?.homeBases) ? row.homeBases : null,
    location: row?.location || null
  };
}

function applyAnchorToRow(row, target, options = {}) {
  const a = target.anchor;
  const anchor = anchorObject(target);

  row.countryFocus = options.orgCode || target.orgIcon || a.countryCode;
  row.countryFocusCode = options.orgCode || target.orgIcon || a.countryCode;
  row.countryCode = a.countryCode;
  row.countryName = a.countryName;
  row.country = a.countryName;
  row.homeRegion = a.region;
  row.region = row.region || a.region;
  row.locationStatus = "institutional_base_city_level";

  row.homeBases = [anchor];
  row.homeBase = anchor;
  row.mapAnchor = anchor;
  row.anchorLocation = anchor;
  row.baseLocation = anchor;
  row.institutionalBase = anchor;
  row.publicLocation = anchor;

  row.lat = a.lat;
  row.lng = a.lng;
  row.lon = a.lng;
  row.long = a.lng;
  row.latitude = a.lat;
  row.longitude = a.lng;
  row.homeLat = a.lat;
  row.homeLng = a.lng;
  row.homeLon = a.lng;
  row.homeLongitude = a.lng;
  row.mapLat = a.lat;
  row.mapLng = a.lng;
  row.mapLon = a.lng;
  row.mapLongitude = a.lng;
  row.anchorLat = a.lat;
  row.anchorLng = a.lng;
  row.anchorLon = a.lng;
  row.anchorLongitude = a.lng;
  row.baseLat = a.lat;
  row.baseLng = a.lng;
  row.baseLon = a.lng;
  row.baseLongitude = a.lng;

  row.coordinates = { lat: a.lat, lng: a.lng, lon: a.lng };
  row.geo = { lat: a.lat, lng: a.lng, lon: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  row.position = { lat: a.lat, lng: a.lng };
  row.leafletLatLng = [a.lat, a.lng];
  row.geoJsonCoordinates = [a.lng, a.lat];

  row.flagAudit = {
    ...(row.flagAudit || {}),
    code: target.orgIcon || a.countryCode,
    countryCode: a.countryCode,
    countryName: a.countryName,
    label: target.orgIcon || a.countryName,
    status: target.orgIcon ? "institutional icon with city anchor" : "country flag"
  };

  row.flagCode = target.orgIcon || a.countryCode;
  row.countryFlagCode = target.orgIcon || a.countryCode;
  if (target.orgIcon) row.orgIcon = target.orgIcon;

  if (target.imageUrl && (!row.imageUrl || /placeholder|transparent|blank|missing|data:image/i.test(String(row.imageUrl)))) {
    row.imageUrl = target.imageUrl;
    row.imageProvider = "curated public image fallback";
    row.visualAuditStatus = "curated fallback image";
    row.visualStatus = "curated fallback image";
    row.imageAudit = { ...(row.imageAudit || {}), status: "curated fallback image", source: target.imageUrl };
  }
}

function applyAnchorToAppearance(row, target) {
  const a = target.anchor;
  const anchor = anchorObject(target);
  row.location = anchor;
  row.venuePublic = true;
  row.securityPrecision = "city-level public institutional or public-source appearance only; no private stops, hotels, residences, leaked routes or live proximity";
  row.lat = a.lat;
  row.lng = a.lng;
  row.lon = a.lng;
  row.latitude = a.lat;
  row.longitude = a.lng;
  row.mapLat = a.lat;
  row.mapLng = a.lng;
  row.coordinates = { lat: a.lat, lng: a.lng, lon: a.lng };
  row.geo = { lat: a.lat, lng: a.lng, lon: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
}

function walk(value, path, callback) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${path}[${index}]`, callback));
    return;
  }
  callback(value, path);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") walk(child, `${path}.${key}`, callback);
  }
}

function collectTargetIds(data, targets) {
  const ids = new Map(targets.map((target) => [target.key, new Set()]));
  const collections = ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples"];
  for (const collection of collections) {
    const rows = data[collection];
    if (!rows) continue;
    walk(rows, collection, (row) => {
      if (!row || typeof row !== "object") return;
      for (const target of targets) {
        if (targetMatches(row, target) && row.id) ids.get(target.key).add(String(row.id));
      }
    });
  }
  return ids;
}

function repairAnchorsAndFaces(data, config) {
  const targets = config.targets || [];
  const targetIds = collectTargetIds(data, targets);
  const fixes = [];
  const collections = ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples", "organizationProfiles"];

  for (const collection of collections) {
    const rows = data[collection];
    if (!rows) continue;
    walk(rows, collection, (row, path) => {
      if (!row || typeof row !== "object") return;
      for (const target of targets) {
        if (!targetMatches(row, target)) continue;
        const before = snapshot(row);
        applyAnchorToRow(row, target);
        fixes.push({ target: target.key, type: "profile_or_roster", path, before, after: snapshot(row) });
        break;
      }
    });
  }

  const appearanceFixes = [];
  const appearanceRows = Array.isArray(data.appearances) ? data.appearances : [];
  for (let i = 0; i < appearanceRows.length; i++) {
    const row = appearanceRows[i];
    if (!row || typeof row !== "object") continue;
    for (const target of targets) {
      const ids = targetIds.get(target.key) || new Set();
      const idHit = row.personId && ids.has(String(row.personId));
      const textHit = targetMatches(row, target);
      if (!target.forceAppearanceAnchor || (!idHit && !textHit)) continue;
      const before = snapshot(row);
      applyAnchorToAppearance(row, target);
      appearanceFixes.push({ target: target.key, type: "appearance", path: `appearances[${i}]`, before, after: snapshot(row) });
      break;
    }
  }

  return { fixes, appearanceFixes, targetIds: Object.fromEntries([...targetIds.entries()].map(([key, set]) => [key, [...set]])) };
}

function purgeBadHistoricalActiveRows(data, config) {
  const badNames = (config.historicalActiveBlocklist || []).map(norm);
  const collections = ["roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples"];
  const removals = [];
  for (const collection of collections) {
    const rows = Array.isArray(data[collection]) ? data[collection] : null;
    if (!rows) continue;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== "object") continue;
      const text = textOfRow(row);
      const bad = badNames.find((name) => text.includes(name));
      if (!bad) continue;
      row.trackingStatus = "historical_profile_removed_from_active_slot";
      row.currentOfficeStatus = "historical_not_current";
      row.roleTitle = /^former/i.test(row.roleTitle || "") ? row.roleTitle : `Former ${row.roleTitle || "office holder"}`;
      row.excludeFromOpeningMap = true;
      row.hiddenFromOpeningAnchors = true;
      row.mapVisibility = "hidden_historical_profile";
      removals.push({ collection, index: i, name: row.canonicalName || row.name || null, reason: bad });
    }
  }
  return removals;
}

function buildRuntimeGuard(config) {
  const publicTargets = (config.targets || []).map((target) => ({
    key: target.key,
    matchAll: target.matchAll || null,
    matchAny: target.matchAny || null,
    roleAny: target.roleAny || null,
    anchor: target.anchor,
    imageUrl: target.imageUrl || null,
    orgIcon: target.orgIcon || null,
    forceAppearanceAnchor: Boolean(target.forceAppearanceAnchor)
  }));

  return `<script id="${GUARD_ID}">\n(() => {\n  const TARGETS = ${JSON.stringify(publicTargets)};\n  const OPENING_DEDUP = Object.create(null);\n  function norm(value) {\n    return String(value || '').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();\n  }\n  function textOf(value) {\n    if (value == null) return '';\n    if (typeof value === 'string') return value;\n    if (typeof value === 'number') return String(value);\n    if (Array.isArray(value)) return value.map(textOf).join(' ');\n    if (typeof value === 'object') {\n      const bits = [];\n      for (const key of ['id','slug','name','canonicalName','personName','title','summary','roleTitle','organization','countryName','countryFocus','countryFocusCode']) {\n        if (value[key]) bits.push(value[key]);\n      }\n      if (value.options) bits.push(textOf(value.options));\n      if (value._tooltip) bits.push(textOf(value._tooltip._content));\n      if (value._popup) bits.push(textOf(value._popup._content));\n      return bits.join(' ');\n    }\n    return '';\n  }\n  function matchesTarget(value, target) {\n    const text = norm(textOf(value));\n    const allOk = !target.matchAll || target.matchAll.every((term) => text.includes(norm(term)));\n    const anyOk = !target.matchAny || target.matchAny.some((term) => text.includes(norm(term)));\n    const roleOk = !target.roleAny || target.roleAny.some((term) => text.includes(norm(term)));\n    return allOk && anyOk && roleOk;\n  }\n  function findTarget(value) {\n    return TARGETS.find((target) => matchesTarget(value, target)) || null;\n  }\n  function patchObject(row, target) {\n    if (!row || typeof row !== 'object') return;\n    const a = target.anchor;\n    const anchor = { label: a.label, city: a.city, countryCode: a.countryCode, countryName: a.countryName, lat: a.lat, lng: a.lng, precision: 'city', type: 'institutional_base', privacy: 'city-level public institutional base only' };\n    row.countryFocus = target.orgIcon || a.countryCode;\n    row.countryFocusCode = target.orgIcon || a.countryCode;\n    row.countryCode = a.countryCode;\n    row.countryName = a.countryName;\n    row.country = a.countryName;\n    row.homeRegion = a.region;\n    row.locationStatus = 'institutional_base_city_level';\n    row.homeBases = [anchor];\n    row.homeBase = anchor;\n    row.mapAnchor = anchor;\n    row.anchorLocation = anchor;\n    row.baseLocation = anchor;\n    row.institutionalBase = anchor;\n    row.lat = a.lat; row.lng = a.lng; row.lon = a.lng; row.latitude = a.lat; row.longitude = a.lng;\n    row.homeLat = a.lat; row.homeLng = a.lng; row.mapLat = a.lat; row.mapLng = a.lng; row.anchorLat = a.lat; row.anchorLng = a.lng;\n    row.coordinates = { lat: a.lat, lng: a.lng, lon: a.lng };\n    row.geo = { lat: a.lat, lng: a.lng, lon: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };\n    row.position = { lat: a.lat, lng: a.lng };\n    row.leafletLatLng = [a.lat, a.lng];\n    row.geoJsonCoordinates = [a.lng, a.lat];\n    if (target.imageUrl && (!row.imageUrl || /placeholder|blank|missing|transparent|data:image/i.test(String(row.imageUrl)))) {\n      row.imageUrl = target.imageUrl;\n      row.imageProvider = 'curated public image fallback';\n    }\n    row.flagAudit = Object.assign({}, row.flagAudit || {}, { code: target.orgIcon || a.countryCode, countryCode: a.countryCode, countryName: a.countryName, label: target.orgIcon || a.countryName, status: target.orgIcon ? 'institutional icon with city anchor' : 'country flag' });\n    row.flagCode = target.orgIcon || a.countryCode;\n    row.countryFlagCode = target.orgIcon || a.countryCode;\n    if (target.orgIcon) row.orgIcon = target.orgIcon;\n  }\n  function walk(value, callback) {\n    if (!value || typeof value !== 'object') return;\n    if (Array.isArray(value)) { value.forEach((item) => walk(item, callback)); return; }\n    callback(value);\n    Object.keys(value).forEach((key) => walk(value[key], callback));\n  }\n  function patchDemoData() {\n    const block = document.getElementById('demo-data');\n    if (!block || block.__pmFinalAnchorPatched) return;\n    try {\n      const data = JSON.parse(block.textContent || '{}');\n      walk(data, (row) => {\n        const target = findTarget(row);\n        if (!target) return;\n        patchObject(row, target);\n        if (target.forceAppearanceAnchor && row.personId && row.location) {\n          row.location = { label: target.anchor.label, city: target.anchor.city, countryCode: target.anchor.countryCode, countryName: target.anchor.countryName, lat: target.anchor.lat, lng: target.anchor.lng, precision: 'city', type: 'institutional_base', privacy: 'city-level public institutional base only' };\n        }\n      });\n      block.textContent = JSON.stringify(data);\n      block.__pmFinalAnchorPatched = true;\n      window.__PARLEYMAP_FINAL_ANCHOR_DATA_PATCHED__ = true;\n    } catch (error) {\n      console.warn('ParleyMap final anchor data patch failed', error);\n    }\n  }\n  function enforceMarker(marker, target) {\n    if (!marker || !target || !target.anchor) return marker;\n    const a = target.anchor;\n    try { if (typeof marker.setLatLng === 'function') marker.setLatLng([a.lat, a.lng]); } catch {}\n    marker.__parleyMapFinalTargetKey = target.key;\n    if (OPENING_DEDUP[target.key] && OPENING_DEDUP[target.key] !== marker) {\n      try { if (typeof marker.remove === 'function') marker.remove(); } catch {}\n      try { if (typeof marker.setOpacity === 'function') marker.setOpacity(0); } catch {}\n      marker.__parleyMapFinalDuplicateHidden = true;\n    } else {\n      OPENING_DEDUP[target.key] = marker;\n    }\n    return marker;\n  }\n  function installLeafletGuard() {\n    if (window.__PARLEYMAP_FINAL_LEAFLET_GUARD__) return;\n    if (!window.L || !window.L.Marker) { setTimeout(installLeafletGuard, 50); return; }\n    window.__PARLEYMAP_FINAL_LEAFLET_GUARD__ = true;\n    const originalMarker = window.L.marker;\n    if (typeof originalMarker === 'function') {\n      window.L.marker = function patchedMarker(latlng, options) {\n        const marker = originalMarker.call(this, latlng, options);\n        const target = findTarget(options);\n        if (target) enforceMarker(marker, target);\n        return marker;\n      };\n    }\n    const proto = window.L.Marker && window.L.Marker.prototype;\n    if (proto && !proto.__pmFinalAnchorGuardPatched) {\n      const oldTooltip = proto.bindTooltip;\n      if (typeof oldTooltip === 'function') {\n        proto.bindTooltip = function patchedTooltip(content, options) {\n          const result = oldTooltip.call(this, content, options);\n          const target = findTarget(content) || findTarget(options) || findTarget(this);\n          if (target) enforceMarker(this, target);\n          return result;\n        };\n      }\n      const oldPopup = proto.bindPopup;\n      if (typeof oldPopup === 'function') {\n        proto.bindPopup = function patchedPopup(content, options) {\n          const result = oldPopup.call(this, content, options);\n          const target = findTarget(content) || findTarget(options) || findTarget(this);\n          if (target) enforceMarker(this, target);\n          return result;\n        };\n      }\n      proto.__pmFinalAnchorGuardPatched = true;\n    }\n  }\n  patchDemoData();\n  installLeafletGuard();\n  document.addEventListener('DOMContentLoaded', () => { patchDemoData(); installLeafletGuard(); });\n  setTimeout(() => { patchDemoData(); installLeafletGuard(); }, 250);\n})();\n</script>`;
}

function installRuntimeGuard(html, config) {
  const re = new RegExp(`\\n?<script id="${GUARD_ID}">[\\s\\S]*?<\\/script>\\n?`, "g");
  let cleaned = html.replace(re, "\n");
  const payload = extractEmbedded(cleaned);
  const guard = buildRuntimeGuard(config);
  return cleaned.slice(0, payload.jsonEnd + CLOSE.length) + "\n" + guard + cleaned.slice(payload.jsonEnd + CLOSE.length);
}

function writeIndexWithData(payload, data, config) {
  const json = JSON.stringify(data, null, 2);
  const htmlWithData = payload.html.slice(0, payload.jsonStart) + "\n" + json + "\n" + payload.html.slice(payload.jsonEnd);
  const finalHtml = installRuntimeGuard(htmlWithData, config);
  fs.writeFileSync(INDEX_PATH, finalHtml);
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + "\n");
}

function writeSummary(report) {
  const lines = [
    "# ParleyMap final rescue",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Restored from git: ${report.restored ? "yes" : "no"}`,
    report.restoredFrom ? `Restored commit: ${report.restoredFrom}` : "",
    "",
    "## Counts",
    "",
    "| Dataset | Before | After |",
    "|---|---:|---:|",
    `| people | ${report.before.people} | ${report.after.people} |`,
    `| roster | ${report.before.roster} | ${report.after.roster} |`,
    `| topRoster | ${report.before.topRoster} | ${report.after.topRoster} |`,
    `| expansionRoster | ${report.before.expansionRoster} | ${report.after.expansionRoster} |`,
    `| appearances | ${report.before.appearances} | ${report.after.appearances} |`,
    "",
    "## Repairs",
    "",
    `Profile/roster fixes: ${report.profileFixCount}`,
    `Appearance fixes: ${report.appearanceFixCount}`,
    `Historical active rows hidden: ${report.historicalRowsHidden}`,
    `Runtime guard installed: ${report.runtimeGuardInstalled}`,
    "",
    "## Target patch counts",
    "",
    ...Object.entries(report.patchesByTarget).map(([key, value]) => `- ${key}: ${value}`)
  ].filter(Boolean);
  fs.writeFileSync(SUMMARY_PATH, lines.join("\n") + "\n");
}

fs.mkdirSync("data/diagnostics", { recursive: true });
const config = readConfig();
const current = readIndex();
validateMinimumShape(current.data, "current");
const restoredInfo = restoreSafeIndexIfNeeded(current, config);
const payload = restoredInfo.payload;
const data = payload.data;
validateMinimumShape(data, "working");
const repair = repairAnchorsAndFaces(data, config);
const hidden = purgeBadHistoricalActiveRows(data, config);
data.meta = {
  ...(data.meta || {}),
  lastDataUpdate: new Date().toISOString(),
  lastFinalRescueRun: new Date().toISOString(),
  finalRescueStatus: "anchors, faces, runtime guard and polluted roster rescue applied"
};
validateMinimumShape(data, "repaired");
writeIndexWithData(payload, data, config);

const afterPayload = readIndex();
const runtimeGuardInstalled = afterPayload.html.includes(`id="${GUARD_ID}"`);
const patchesByTarget = {};
for (const row of [...repair.fixes, ...repair.appearanceFixes]) patchesByTarget[row.target] = (patchesByTarget[row.target] || 0) + 1;
const report = {
  generatedAt: new Date().toISOString(),
  status: "final_rescue_applied",
  restored: restoredInfo.restored,
  restoredFrom: restoredInfo.restoredFrom,
  before: restoredInfo.before,
  after: counts(afterPayload.data),
  profileFixCount: repair.fixes.length,
  appearanceFixCount: repair.appearanceFixes.length,
  historicalRowsHidden: hidden.length,
  runtimeGuardInstalled,
  targetIds: repair.targetIds,
  patchesByTarget,
  historicalRows: hidden,
  sampleFixes: [...repair.fixes, ...repair.appearanceFixes].slice(0, 50)
};
if (!runtimeGuardInstalled) throw new Error("runtime guard was not installed");
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
writeSummary(report);
console.log(JSON.stringify(report, null, 2));
