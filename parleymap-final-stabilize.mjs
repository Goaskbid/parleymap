import fs from "node:fs";
import { execFileSync } from "node:child_process";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const ANCHORS_PATH = "data/curated-anchors.json";
const REPORT_PATH = "data/diagnostics/final-stabilize-report.json";
const AUDIT_PATH = "data/diagnostics/final-audit-report.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const GUARD_ID = "parleymap-runtime-anchor-guard-v3";

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return norm(value).replace(/ /g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function readEmbeddedFromHtml(html) {
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { html, jsonStart, jsonEnd, data };
}

function readCurrent() {
  return readEmbeddedFromHtml(fs.readFileSync(INDEX_PATH, "utf8"));
}

function writeCurrent(payload, data) {
  const nextHtml = payload.html.slice(0, payload.jsonStart) + "\n" + JSON.stringify(data, null, 2) + "\n" + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + "\n");
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

function validateCore(data, label = "dataset") {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  }
  if (data.people.length < 90 || data.people.length > 115) throw new Error(`${label}: people count outside safe range: ${data.people.length}`);
  if (data.roster.length !== 200) throw new Error(`${label}: roster must be exactly 200, got ${data.roster.length}`);
  if (data.expansionRoster.length < 100 || data.expansionRoster.length > 130) throw new Error(`${label}: expansionRoster outside safe range: ${data.expansionRoster.length}`);
  if (data.appearances.length < 500) throw new Error(`${label}: appearances too low: ${data.appearances.length}`);
  if (data.categories.length < 10) throw new Error(`${label}: categories too low: ${data.categories.length}`);
}

function textOfObject(item) {
  if (!item || typeof item !== "object") return "";
  return norm([
    item.id, item.slug, item.name, item.canonicalName, item.personName, item.title,
    item.roleTitle, item.organization, item.category, item.country, item.countryName,
    item.countryFocus, item.countryFocusCode, item.profileLine,
    Array.isArray(item.profileLines) ? item.profileLines.join(" ") : ""
  ].join(" "));
}

function sourceUrls(item) {
  return Array.isArray(item?.sourcePack) ? item.sourcePack.map(s => s?.url || "").filter(Boolean) : [];
}

function eventText(item) {
  return norm([item?.title, item?.summary, item?.description, item?.personName, ...(sourceUrls(item))].join(" "));
}

function targetMatches(item, target) {
  const text = textOfObject(item);
  if (!text) return false;
  if (Array.isArray(target.rejectIf) && target.rejectIf.some(t => text.includes(norm(t)))) return false;
  if (Array.isArray(target.matchAll) && !target.matchAll.every(t => text.includes(norm(t)))) return false;
  if (Array.isArray(target.matchAny) && !target.matchAny.some(t => text.includes(norm(t)))) return false;
  if (Array.isArray(target.roleAny) && !target.roleAny.some(t => text.includes(norm(t)))) {
    // Role hints are allowed to be absent if the primary name match is strong.
    const strongNameMatch = Array.isArray(target.matchAll) && target.matchAll.length >= 2 && target.matchAll.every(t => text.includes(norm(t)));
    if (!strongNameMatch) return false;
  }
  return true;
}

function findTarget(item, registry) {
  return (registry.targets || []).find(t => targetMatches(item, t)) || null;
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

function isPlaceholderImage(url) {
  return !url || /placeholder|silhouette|default|data:image\/svg|blank|avatar/i.test(String(url));
}

function applyAnchorAndFace(item, target, options = {}) {
  const a = target.anchor;
  const anchor = anchorObject(target);
  const before = {
    id: item.id || null,
    name: item.canonicalName || item.name || item.title || null,
    lat: item.lat ?? item.latitude ?? item.mapLat ?? item.location?.lat ?? null,
    lng: item.lng ?? item.longitude ?? item.mapLng ?? item.location?.lng ?? item.location?.lon ?? null,
    countryFocus: item.countryFocus || null,
    countryFocusCode: item.countryFocusCode || null,
    countryName: item.countryName || item.country || null,
    imageUrl: item.imageUrl || null
  };

  if (options.profileLike !== false) {
    item.countryFocus = a.countryCode;
    item.countryFocusCode = a.countryCode;
    item.countryCode = a.countryCode;
    item.countryName = a.countryName;
    item.country = a.countryName;
    item.homeRegion = a.region || item.homeRegion || null;
    item.region = item.region || a.region || null;
    item.locationStatus = "institutional_base_city_level";
    item.homeBases = [anchor];
    item.homeBase = anchor;
    item.mapAnchor = anchor;
    item.anchorLocation = anchor;
    item.baseLocation = anchor;
    item.institutionalBase = anchor;
    item.publicLocation = anchor;
  }

  for (const key of ["lat", "latitude", "homeLat", "mapLat", "anchorLat", "baseLat"]) item[key] = a.lat;
  for (const key of ["lng", "lon", "long", "longitude", "homeLng", "homeLon", "homeLongitude", "mapLng", "mapLon", "mapLongitude", "anchorLng", "anchorLon", "anchorLongitude", "baseLng", "baseLon", "baseLongitude"]) item[key] = a.lng;
  item.coordinates = { lat: a.lat, lng: a.lng };
  item.position = { lat: a.lat, lng: a.lng };
  item.geo = { lat: a.lat, lng: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  item.leafletLatLng = [a.lat, a.lng];
  item.geoJsonCoordinates = [a.lng, a.lat];

  if (item.location && typeof item.location === "object" && !Array.isArray(item.location)) {
    item.location = { ...item.location, ...anchor, lon: a.lng, longitude: a.lng, latitude: a.lat };
  }

  item.flagAudit = {
    ...(item.flagAudit || {}),
    code: a.countryCode,
    countryCode: a.countryCode,
    countryName: a.countryName,
    label: a.countryName,
    status: "country flag"
  };
  item.flagCode = a.countryCode;
  item.countryFlagCode = a.countryCode;

  if (target.role && (!item.roleTitle || /former|unknown|institutional/i.test(String(item.roleTitle)))) {
    item.roleTitle = target.role;
  }

  if (target.imageUrl && isPlaceholderImage(item.imageUrl)) {
    item.imageUrl = target.imageUrl;
    item.imageProvider = "curated public image fallback";
    item.visualAuditStatus = "curated_fallback_applied";
  }

  return before;
}

function walk(value, path, callback, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${path}[${index}]`, callback, seen));
    return;
  }
  callback(value, path);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") walk(child, `${path}.${key}`, callback, seen);
  }
}

function hasHistoricalPollution(data, registry) {
  const block = (registry.historicalActiveBlocklist || []).map(norm);
  const rows = [...(data.roster || []), ...(data.topRoster || [])];
  return rows.some(row => {
    const text = textOfObject(row);
    const active = !/\bformer\b|deceased|historical/.test(text);
    const leaderRole = /president|prime minister|chancellor|head of state|head of government/.test(text);
    return active && leaderRole && block.some(name => text.includes(name));
  });
}

function isSafeCandidate(data, registry) {
  try {
    validateCore(data, "candidate");
  } catch {
    return false;
  }
  if (hasHistoricalPollution(data, registry)) return false;
  return true;
}

function showIndexAtCommit(hash) {
  try {
    return execFileSync("git", ["show", `${hash}:index.html`], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  } catch {
    return "";
  }
}

function latestSafeFromHistory(registry) {
  let hashes = [];
  try {
    const raw = execFileSync("git", ["log", "--format=%H", "--", INDEX_PATH], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    hashes = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  } catch {
    return null;
  }

  for (const hash of hashes) {
    const html = showIndexAtCommit(hash);
    if (!html) continue;
    try {
      const payload = readEmbeddedFromHtml(html);
      if (isSafeCandidate(payload.data, registry)) return { hash, html, data: payload.data };
    } catch {
      continue;
    }
  }
  return null;
}

function shouldRestore(data, registry) {
  if (!Array.isArray(data.people) || data.people.length > 115) return true;
  if (hasHistoricalPollution(data, registry)) return true;
  return false;
}

function personNameById(data, personId) {
  const rows = [...(data.people || []), ...(data.roster || []), ...(data.topRoster || []), ...(data.expansionRoster || [])];
  const hit = rows.find(r => r && r.id === personId);
  return hit?.canonicalName || hit?.name || "";
}

function appearanceTarget(data, item, registry) {
  const text = norm([eventText(item), personNameById(data, item.personId)].join(" "));
  return (registry.targets || []).find(target => {
    const fake = { title: text, personName: text, roleTitle: text };
    return targetMatches(fake, target);
  }) || null;
}

function hasEventTerm(text, registry) {
  const terms = registry.eventQuality?.requiredEventTerms || [];
  return terms.some(term => text.includes(norm(term)));
}

function hasGenericReject(text, registry) {
  const terms = registry.eventQuality?.genericRejectTerms || [];
  return terms.some(term => text.includes(norm(term)));
}

function locationEvidence(item) {
  const text = eventText(item);
  const city = norm(item.location?.city || item.city || "");
  const country = norm(item.location?.countryName || item.countryName || item.country || "");
  return Boolean((city && text.includes(city)) || (country && text.includes(country)));
}

function isOfficialSource(item) {
  if (!Array.isArray(item.sourcePack)) return false;
  return item.sourcePack.some(source => {
    const text = norm([source.type, source.reliability, source.label, source.url].join(" "));
    return /official|host|primary|government|gov|un org|iaea|nato|vatican|presidency|president/.test(text);
  });
}

function realEvent(item, registry) {
  const text = eventText(item);
  if (!text) return false;
  if (hasGenericReject(text, registry)) return false;
  return hasEventTerm(text, registry) && isOfficialSource(item) && locationEvidence(item);
}

function cleanAppearances(data, registry, fixes) {
  const removed = [];
  const seen = new Set();
  const strictKeys = new Set(registry.eventQuality?.strictPeople || []);
  const cleaned = [];

  for (const item of data.appearances || []) {
    if (!item || typeof item !== "object") continue;
    const target = appearanceTarget(data, item, registry);
    const text = eventText(item);
    const generic = hasGenericReject(text, registry);
    const strict = target && strictKeys.has(target.key);
    const crawlLoose = String(item.id || "").startsWith("crawl-") && !realEvent(item, registry);
    const fakeInstitutional = target && !realEvent(item, registry) && (strict || generic || /institutional|city of london|grossi|iaea|pope|sheinbaum|prabowo/.test(text));

    if (crawlLoose || fakeInstitutional) {
      removed.push({ id: item.id || null, personId: item.personId || null, target: target?.key || null, title: item.title || null, reason: crawlLoose ? "loose_crawler_or_non_event" : "non_real_or_generic_event" });
      continue;
    }

    if (target || String(item.id || "").startsWith("crawl-")) {
      const dedupeKey = [item.personId, norm(item.title), String(item.startsAt || "").slice(0, 10), norm(item.location?.city || "")].join("|");
      if (seen.has(dedupeKey)) {
        removed.push({ id: item.id || null, personId: item.personId || null, target: target?.key || null, title: item.title || null, reason: "duplicate_event_key" });
        continue;
      }
      seen.add(dedupeKey);
    }

    // For target appearances that are real events but lack coherent coordinates, keep event semantics and patch only coordinate aliases from location.
    if (target && item.location && typeof item.location === "object") {
      const loc = item.location;
      if (Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng ?? loc.lon))) {
        for (const key of ["lat", "latitude", "mapLat"]) item[key] = Number(loc.lat);
        for (const key of ["lng", "lon", "longitude", "mapLng"]) item[key] = Number(loc.lng ?? loc.lon);
      }
    }

    cleaned.push(item);
  }

  data.appearances = cleaned;
  fixes.removedAppearances = removed;
}

function patchAnchors(data, registry, fixes) {
  const profileRoots = ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples", "organizationProfiles"];
  for (const root of profileRoots) {
    const value = data[root];
    if (!value) continue;
    walk(value, root, (item, path) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;
      const shape = item.id || item.slug || item.name || item.canonicalName || item.roleTitle || item.profileLine || item.organization;
      if (!shape) return;
      const target = findTarget(item, registry);
      if (!target) return;
      const before = applyAnchorAndFace(item, target, { profileLike: true });
      fixes.anchorPatches.push({ target: target.key, path, before, after: { name: item.canonicalName || item.name || null, lat: item.lat, lng: item.lng, countryCode: item.countryFocusCode || item.countryCode || null, imageUrl: item.imageUrl || null } });
    });
  }
}

function installRuntimeGuard(html, registry) {
  const guardStart = `<!-- ${GUARD_ID} start -->`;
  const guardEnd = `<!-- ${GUARD_ID} end -->`;
  const guardRegex = new RegExp(`${guardStart}[\\s\\S]*?${guardEnd}\\n?`, "g");
  html = html.replace(guardRegex, "");

  const anchors = (registry.targets || []).map(t => ({
    key: t.key,
    terms: [...(t.matchAll || []), ...(t.matchAny || [])].map(norm).filter(Boolean),
    lat: t.anchor.lat,
    lng: t.anchor.lng,
    city: t.anchor.city,
    countryCode: t.anchor.countryCode,
    countryName: t.anchor.countryName
  })).filter(t => t.terms.length);

  const script = `${guardStart}\n<script id="${GUARD_ID}">\n(function(){\n  var anchors = ${JSON.stringify(anchors)};\n  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function pick(text){var n=norm(text); for(var i=0;i<anchors.length;i++){var a=anchors[i]; for(var j=0;j<a.terms.length;j++){ if(a.terms[j] && n.indexOf(a.terms[j])>=0) return a; }} return null;}\n  function latlng(a){return [a.lat,a.lng];}\n  function moveMarker(marker, a){try{ if(marker && typeof marker.setLatLng==='function') marker.setLatLng(latlng(a)); if(marker && marker.options){marker.options.parleymapAnchorGuard=a.key;} }catch(e){}}\n  function patch(){\n    if(!window.L || window.__PARLEYMAP_ANCHOR_GUARD_INSTALLED__) return;\n    window.__PARLEYMAP_ANCHOR_GUARD_INSTALLED__ = true;\n    var L = window.L;\n    if(L.Marker && L.Marker.prototype){\n      var oldTooltip = L.Marker.prototype.bindTooltip;\n      if(oldTooltip){L.Marker.prototype.bindTooltip=function(content, opts){var a=pick(typeof content==='string'?content:(content&&content.textContent)||''); if(a) moveMarker(this,a); return oldTooltip.call(this,content,opts);};}\n      var oldPopup = L.Marker.prototype.bindPopup;\n      if(oldPopup){L.Marker.prototype.bindPopup=function(content, opts){var a=pick(typeof content==='string'?content:(content&&content.textContent)||''); if(a) moveMarker(this,a); return oldPopup.call(this,content,opts);};}\n    }\n    var oldMarker = L.marker;\n    if(oldMarker){L.marker=function(ll, opts){var a=pick((opts&&JSON.stringify(opts))||''); var m=oldMarker.call(this, a?latlng(a):ll, opts); return m;};}\n    var oldCircle = L.circleMarker;\n    if(oldCircle){L.circleMarker=function(ll, opts){var a=pick((opts&&JSON.stringify(opts))||''); return oldCircle.call(this, a?latlng(a):ll, opts);};}\n  }\n  patch();\n  var tries=0; var timer=setInterval(function(){patch(); if(++tries>120 || window.__PARLEYMAP_ANCHOR_GUARD_INSTALLED__) clearInterval(timer);},250);\n})();\n</script>\n${guardEnd}\n`;

  const payload = readEmbeddedFromHtml(html);
  const insertAt = payload.jsonEnd + CLOSE_TAG.length;
  return html.slice(0, insertAt) + "\n" + script + html.slice(insertAt);
}

function currentCoordinates(item) {
  const candidates = [
    [item.lat, item.lng ?? item.lon ?? item.longitude],
    [item.mapLat, item.mapLng ?? item.mapLon],
    [item.homeLat, item.homeLng ?? item.homeLon],
    [item.anchorLat, item.anchorLng ?? item.anchorLon],
    [item.homeBases?.[0]?.lat, item.homeBases?.[0]?.lng ?? item.homeBases?.[0]?.lon],
    [item.mapAnchor?.lat, item.mapAnchor?.lng ?? item.mapAnchor?.lon],
    [item.location?.lat, item.location?.lng ?? item.location?.lon]
  ];
  for (const [lat, lng] of candidates) {
    const a = Number(lat); const b = Number(lng);
    if (Number.isFinite(a) && Number.isFinite(b)) return { lat: a, lng: b };
  }
  return { lat: NaN, lng: NaN };
}

function closeTo(item, target) {
  const c = currentCoordinates(item);
  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return false;
  return Math.abs(c.lat - target.anchor.lat) < 1 && Math.abs(c.lng - target.anchor.lng) < 1;
}

function auditData(data, registry) {
  validateCore(data, "audit");
  if (hasHistoricalPollution(data, registry)) throw new Error("active historical office-holder pollution remains");
  const must = new Set(["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi"]);
  const audited = {};
  for (const key of must) audited[key] = { matches: 0, bad: [] };

  for (const root of ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples", "organizationProfiles"]) {
    const value = data[root];
    if (!value) continue;
    walk(value, root, (item, path) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;
      const target = findTarget(item, registry);
      if (!target || !must.has(target.key)) return;
      audited[target.key].matches++;
      if (!closeTo(item, target)) audited[target.key].bad.push({ path, name: item.canonicalName || item.name || item.title || null, coords: currentCoordinates(item) });
    });
  }

  for (const key of must) {
    if (audited[key].matches === 0) throw new Error(`audit failed: ${key} was not found`);
    if (audited[key].bad.length) throw new Error(`audit failed: ${key} has bad anchors: ${JSON.stringify(audited[key].bad.slice(0,3))}`);
  }

  const badAppearances = (data.appearances || []).filter(item => {
    const text = eventText(item);
    return /city of london|institutional base|foire aux questions|faq|fact sheet|homepage|profile/.test(text);
  });
  if (badAppearances.length) throw new Error(`audit failed: non-real/generic event records remain: ${badAppearances.slice(0,3).map(x => x.title).join("; ")}`);

  return audited;
}

function buildSummary(report, auditReport) {
  return [
    "# ParleyMap final stabilization",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Status",
    "",
    `- Restore used: ${report.restore.used}`,
    `- Restore commit: ${report.restore.hash || "n/a"}`,
    `- Anchor patches: ${report.fixes.anchorPatches.length}`,
    `- Removed non-real or duplicate appearances: ${report.fixes.removedAppearances.length}`,
    `- Runtime guard installed: ${report.runtimeGuardInstalled}`,
    `- Audit status: ${auditReport.status}`,
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
    `| categories | ${report.before.categories} | ${report.after.categories} |`
  ].join("\n") + "\n";
}

function main() {
  fs.mkdirSync("data/diagnostics", { recursive: true });
  const registry = JSON.parse(fs.readFileSync(ANCHORS_PATH, "utf8"));
  let payload = readCurrent();
  const before = counts(payload.data);
  const restore = { used: false, hash: null, reason: null };

  if (shouldRestore(payload.data, registry)) {
    const safe = latestSafeFromHistory(registry);
    if (!safe) throw new Error("current data is polluted and no safe historical index.html was found");
    restore.used = true;
    restore.hash = safe.hash;
    restore.reason = payload.data.people?.length > 115 ? "people_count_polluted" : "historical_active_slots";
    payload = readEmbeddedFromHtml(safe.html);
  }

  validateCore(payload.data, "post-restore");

  const fixes = { anchorPatches: [], removedAppearances: [] };
  patchAnchors(payload.data, registry, fixes);
  cleanAppearances(payload.data, registry, fixes);
  payload.data.meta = {
    ...(payload.data.meta || {}),
    lastDataUpdate: new Date().toISOString(),
    finalStabilizeStatus: `anchors=${fixes.anchorPatches.length}; removedAppearances=${fixes.removedAppearances.length}; restored=${restore.used}`
  };

  validateCore(payload.data, "post-fix");

  let nextHtml = payload.html.slice(0, payload.jsonStart) + "\n" + JSON.stringify(payload.data, null, 2) + "\n" + payload.html.slice(payload.jsonEnd);
  nextHtml = installRuntimeGuard(nextHtml, registry);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(DEMO_PATH, JSON.stringify(payload.data, null, 2) + "\n");

  const finalPayload = readCurrent();
  const audited = auditData(finalPayload.data, registry);
  const after = counts(finalPayload.data);
  const runtimeGuardInstalled = fs.readFileSync(INDEX_PATH, "utf8").includes(GUARD_ID);
  if (!runtimeGuardInstalled) throw new Error("runtime guard was not installed");

  const report = {
    generatedAt: new Date().toISOString(),
    status: "final_stabilize_applied",
    before,
    after,
    restore,
    runtimeGuardInstalled,
    fixes
  };
  const auditReport = {
    generatedAt: report.generatedAt,
    status: "audit_passed",
    auditedTargets: audited,
    counts: after,
    runtimeGuardInstalled
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(auditReport, null, 2) + "\n");
  fs.writeFileSync(SUMMARY_PATH, buildSummary(report, auditReport));
  console.log(JSON.stringify({ status: report.status, audit: auditReport.status, before, after, restore, anchorPatches: fixes.anchorPatches.length, removedAppearances: fixes.removedAppearances.length }, null, 2));
}

main();
