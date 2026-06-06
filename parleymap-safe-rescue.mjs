import fs from "node:fs";
import { execSync } from "node:child_process";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const REGISTRY_PATH = "data/parleymap-anchor-registry.json";
const REPORT_PATH = "data/diagnostics/final-rescue-report.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const GUARD_START = "<!-- PARLEYMAP_ANCHOR_RUNTIME_GUARD_START -->";
const GUARD_END = "<!-- PARLEYMAP_ANCHOR_RUNTIME_GUARD_END -->";

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

function ensureDir(path) {
  fs.mkdirSync(path, { recursive: true });
}

function parseHtml(html) {
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  const jsonText = html.slice(jsonStart, jsonEnd).trim();
  const data = JSON.parse(jsonText);
  return { html, jsonStart, jsonEnd, data };
}

function readCurrent() {
  return parseHtml(fs.readFileSync(INDEX_PATH, "utf8"));
}

function writeHtml(payload, data, htmlOverride = null) {
  const baseHtml = htmlOverride || payload.html;
  const parsed = htmlOverride ? parseHtml(htmlOverride) : payload;
  const nextHtml =
    baseHtml.slice(0, parsed.jsonStart) +
    "\n" +
    JSON.stringify(data, null, 2) +
    "\n" +
    baseHtml.slice(parsed.jsonEnd);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  ensureDir("data");
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + "\n");
  return nextHtml;
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

function validateCoreShape(data, label = "dataset") {
  for (const key of ["meta", "people", "roster", "topRoster", "expansionRoster", "appearances", "categories"]) {
    if (!(key in data)) throw new Error(`${label}: missing ${key}`);
  }
  for (const key of ["people", "roster", "topRoster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  }
  if (data.people.length < 90 || data.people.length > 115) throw new Error(`${label}: people count outside safe range: ${data.people.length}`);
  if (data.roster.length < 190 || data.roster.length > 210) throw new Error(`${label}: roster count outside safe range: ${data.roster.length}`);
  if (data.expansionRoster.length < 100 || data.expansionRoster.length > 130) throw new Error(`${label}: expansionRoster count outside safe range: ${data.expansionRoster.length}`);
  if (data.appearances.length < 500) throw new Error(`${label}: appearances count too low: ${data.appearances.length}`);
  if (data.categories.length < 10) throw new Error(`${label}: categories count too low: ${data.categories.length}`);
}

function isSafeDataset(data) {
  const c = counts(data);
  if (c.people === null || c.roster === null || c.expansionRoster === null || c.appearances === null || c.categories === null) return false;
  if (c.people < 90 || c.people > 115) return false;
  if (c.roster < 190 || c.roster > 210) return false;
  if (c.expansionRoster < 100 || c.expansionRoster > 130) return false;
  if (c.appearances < 500) return false;
  if (c.categories < 10) return false;
  const badIds = new Set([
    "miguel-de-la-madrid",
    "jose-lopez-portillo",
    "gustavo-diaz-ordaz",
    "manuel-avila-camacho",
    "abelardo-l-rodriguez",
    "pascual-ortiz-rubio"
  ]);
  if (Array.isArray(data.people) && data.people.some((row) => badIds.has(String(row.id || "")))) return false;
  return true;
}

function findSafeHtmlFromHistory() {
  let commits = [];
  try {
    commits = execSync("git rev-list --max-count=120 HEAD -- index.html", { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return null;
  }

  const candidates = [];
  for (const sha of commits) {
    try {
      const html = execSync(`git show ${sha}:index.html`, { encoding: "utf8", maxBuffer: 80 * 1024 * 1024 });
      const parsed = parseHtml(html);
      const c = counts(parsed.data);
      if (isSafeDataset(parsed.data)) {
        candidates.push({ sha, html, counts: c });
        if (c.people === 94 && c.roster === 200 && c.expansionRoster === 114 && c.appearances >= 500) {
          return { sha, html, counts: c, reason: "exact_safe_baseline" };
        }
      }
    } catch {
      // Ignore commits that do not have parseable embedded data.
    }
  }
  if (candidates.length) return { ...candidates[0], reason: "nearest_safe_history_baseline" };
  return null;
}

async function fetchWikidataImage(qid) {
  if (!qid || typeof fetch !== "function") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      signal: controller.signal,
      headers: { "user-agent": "ParleyMap final rescue image lookup" }
    });
    if (!response.ok) return null;
    const json = await response.json();
    const file = json.entities?.[qid]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!file) return null;
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function rowBlob(row) {
  return norm([
    row?.id,
    row?.slug,
    row?.name,
    row?.canonicalName,
    row?.personName,
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

function targetMatchesRow(row, target, knownIdsByTarget) {
  if (!row || typeof row !== "object") return false;
  const text = rowBlob(row);
  const ids = new Set([...(target.personIds || []), ...(knownIdsByTarget.get(target.key) || [])].map(String));
  const directIds = [row.id, row.slug, row.personId, row.wikidataId].filter(Boolean).map(String);
  if (directIds.some((id) => ids.has(id))) return true;
  if (target.wikidataId && directIds.includes(target.wikidataId)) return true;
  const mustOk = !target.matchAll || target.matchAll.every((term) => text.includes(norm(term)));
  const anyOk = !target.matchAny || target.matchAny.some((term) => text.includes(norm(term)));
  return mustOk && anyOk;
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
    lon: a.lng,
    longitude: a.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function snapshot(row) {
  const loc = row.location || row.mapAnchor || row.homeBase || (Array.isArray(row.homeBases) ? row.homeBases[0] : null) || row;
  return {
    id: row.id || null,
    slug: row.slug || null,
    personId: row.personId || null,
    name: row.canonicalName || row.name || row.personName || null,
    title: row.title || null,
    countryFocus: row.countryFocus || null,
    countryFocusCode: row.countryFocusCode || null,
    countryCode: row.countryCode || null,
    countryName: row.countryName || row.country || null,
    city: loc?.city || null,
    lat: loc?.lat ?? loc?.latitude ?? row.lat ?? row.latitude ?? row.mapLat ?? null,
    lng: loc?.lng ?? loc?.lon ?? loc?.longitude ?? row.lng ?? row.lon ?? row.longitude ?? row.mapLng ?? null,
    imageUrl: row.imageUrl || null
  };
}

function applyTarget(row, target, imageUrl) {
  const a = target.anchor;
  const anchor = anchorObject(target);

  if (row.canonicalName || row.name || row.profileLine || row.roleTitle || row.organization) {
    row.countryFocus = a.countryCode;
    row.countryFocusCode = a.countryCode;
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
    row.flagAudit = {
      ...(row.flagAudit || {}),
      code: a.countryCode,
      countryCode: a.countryCode,
      countryName: a.countryName,
      label: a.countryName,
      status: "country flag"
    };
    row.flagCode = a.countryCode;
    row.countryFlagCode = a.countryCode;
  }

  row.location = anchor;
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
  row.position = { lat: a.lat, lng: a.lng, lon: a.lng };
  row.geo = { lat: a.lat, lng: a.lng, lon: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  row.leafletLatLng = [a.lat, a.lng];
  row.geoJsonCoordinates = [a.lng, a.lat];

  if (imageUrl) {
    row.imageUrl = imageUrl;
    row.imageProvider = row.imageProvider || "Wikimedia Commons via Wikidata";
    row.visualAuditStatus = "public-image-fallback-audited";
    row.visualStatus = row.visualStatus || "public portrait available";
    row.imageAudit = {
      ...(row.imageAudit || {}),
      status: "public-image-fallback-audited",
      provider: "Wikidata P18 / Wikimedia Commons",
      checkedAt: new Date().toISOString()
    };
  }
}

function walk(value, path, callback, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) walk(value[i], `${path}[${i}]`, callback, seen);
    return;
  }
  callback(value, path);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") walk(child, `${path}.${key}`, callback, seen);
  }
}

function collectKnownIds(data, targets) {
  const known = new Map(targets.map((t) => [t.key, new Set(t.personIds || [])]));
  for (const collection of ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples"]) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    for (const row of rows) {
      for (const target of targets) {
        if (targetMatchesRow(row, target, known)) {
          for (const id of [row.id, row.slug, row.personId, row.wikidataId]) {
            if (id) known.get(target.key).add(String(id));
          }
        }
      }
    }
  }
  return known;
}

async function buildImageMap(targets) {
  const out = new Map();
  const fallbacks = {
    claudia_sheinbaum: "https://commons.wikimedia.org/wiki/Special:FilePath/Claudia_Sheinbaum_(cropped,_centered).jpg",
    prabowo_subianto: "https://commons.wikimedia.org/wiki/Special:FilePath/Prabowo_Subianto_2024_official_portrait.jpg",
    rafael_grossi: "https://commons.wikimedia.org/wiki/Special:FilePath/Rafael_Mariano_Grossi_2022.jpg",
    mark_rutte: "https://commons.wikimedia.org/wiki/Special:FilePath/Mark_Rutte,_2023.jpg"
  };
  for (const target of targets) {
    let url = await fetchWikidataImage(target.wikidataId);
    if (!url) url = fallbacks[target.key] || null;
    if (url) out.set(target.key, url);
  }
  return out;
}

function removeExistingRuntimeGuard(html) {
  let out = html;
  while (out.includes(GUARD_START) && out.includes(GUARD_END)) {
    const start = out.indexOf(GUARD_START);
    const end = out.indexOf(GUARD_END, start);
    if (start === -1 || end === -1) break;
    out = out.slice(0, start) + out.slice(end + GUARD_END.length);
  }
  return out;
}

function runtimeGuardScript(targets) {
  const compact = targets.map((target) => ({
    key: target.key,
    name: target.displayName,
    matchAll: target.matchAll || null,
    matchAny: target.matchAny || null,
    personIds: target.personIds || [],
    wikidataId: target.wikidataId || null,
    anchor: target.anchor
  }));
  return `${GUARD_START}\n<script>\n(function(){\n  var targets = ${JSON.stringify(compact)};\n  function norm(value){return String(value||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function keyFromText(text){text=norm(text); for(var i=0;i<targets.length;i++){var t=targets[i];var must=!t.matchAll||t.matchAll.every(function(x){return text.indexOf(norm(x))!==-1;});var any=!t.matchAny||t.matchAny.some(function(x){return text.indexOf(norm(x))!==-1;});var ids=(t.personIds||[]).some(function(x){return text.indexOf(norm(x))!==-1;});if((must&&any)||ids){return t.key;}} return null;}\n  function targetByKey(key){return targets.filter(function(t){return t.key===key;})[0]||null;}\n  function anchorArray(t){return [Number(t.anchor.lat), Number(t.anchor.lng)];}\n  function patchObject(o){if(!o||typeof o!=='object')return;var text=norm([o.id,o.slug,o.personId,o.name,o.canonicalName,o.personName,o.title,o.summary,o.roleTitle,o.organization].join(' '));var key=keyFromText(text);if(!key)return;var t=targetByKey(key);if(!t)return;var a=t.anchor;var anchor={label:a.label,city:a.city,countryCode:a.countryCode,countryName:a.countryName,lat:a.lat,lng:a.lng,lon:a.lng,longitude:a.lng,precision:'city',type:'institutional_base',privacy:'city-level public institutional base only'};o.location=anchor;o.homeBase=anchor;o.mapAnchor=anchor;o.anchorLocation=anchor;o.baseLocation=anchor;o.institutionalBase=anchor;o.publicLocation=anchor;o.homeBases=[anchor];o.lat=a.lat;o.lng=a.lng;o.lon=a.lng;o.long=a.lng;o.latitude=a.lat;o.longitude=a.lng;o.homeLat=a.lat;o.homeLng=a.lng;o.mapLat=a.lat;o.mapLng=a.lng;o.anchorLat=a.lat;o.anchorLng=a.lng;o.coordinates={lat:a.lat,lng:a.lng,lon:a.lng};o.position={lat:a.lat,lng:a.lng,lon:a.lng};o.geo={lat:a.lat,lng:a.lng,city:a.city,countryCode:a.countryCode,countryName:a.countryName};if(o.countryFocus!==undefined||o.roleTitle!==undefined||o.canonicalName!==undefined){o.countryFocus=a.countryCode;o.countryFocusCode=a.countryCode;o.countryCode=a.countryCode;o.countryName=a.countryName;o.country=a.countryName;}}\n  function walk(v,seen){if(!v||typeof v!=='object')return;if(seen.indexOf(v)!==-1)return;seen.push(v);if(Array.isArray(v)){for(var i=0;i<v.length;i++)walk(v[i],seen);return;}patchObject(v);Object.keys(v).forEach(function(k){if(v[k]&&typeof v[k]==='object')walk(v[k],seen);});}\n  function patchEmbedded(){try{var el=document.getElementById('demo-data');if(!el)return;var data=JSON.parse(el.textContent||el.innerText||'{}');walk(data,[]);el.textContent=JSON.stringify(data);window.__PARLEYMAP_DEMO_DATA_PATCHED__=data;}catch(e){console.warn('ParleyMap anchor embedded patch failed',e);}}\n  function textFromOptions(options){var bits=[];function pull(v){if(!v)return;if(typeof v==='string')bits.push(v);else if(typeof v==='object'){Object.keys(v).forEach(function(k){if(k.length<40)pull(v[k]);});}} pull(options);return bits.join(' ');}\n  function patchLayer(layer,key){if(!layer)return layer;function force(k){var t=targetByKey(k);if(t&&layer.setLatLng){try{layer.setLatLng(anchorArray(t));}catch(e){}}} if(key)force(key);['bindTooltip','bindPopup'].forEach(function(method){if(typeof layer[method]==='function'&&!layer['__pm_'+method]){var orig=layer[method];layer['__pm_'+method]=true;layer[method]=function(content,opts){var k=keyFromText(String(content&&content.outerHTML?content.outerHTML:content||''));var res=orig.call(this,content,opts);if(k)force(k);return res;};}});return layer;}\n  function installLeafletGuard(){if(!window.L||window.L.__parleyMapAnchorGuardFinal)return false;window.L.__parleyMapAnchorGuardFinal=true;['marker','circleMarker','circle'].forEach(function(factory){if(typeof L[factory]!=='function')return;var orig=L[factory];L[factory]=function(latlng,options){var key=keyFromText(textFromOptions(options));var t=targetByKey(key);var nextLatLng=t?anchorArray(t):latlng;var layer=orig.call(this,nextLatLng,options);return patchLayer(layer,key);};});return true;}\n  patchEmbedded();var tries=0;var timer=setInterval(function(){tries++;if(installLeafletGuard()||tries>400)clearInterval(timer);},50);\n})();\n</script>\n${GUARD_END}`;
}

function installRuntimeGuard(html, targets) {
  const clean = removeExistingRuntimeGuard(html);
  const guard = runtimeGuardScript(targets);
  const parsed = parseHtml(clean);
  const insertAt = clean.indexOf(CLOSE_TAG, parsed.jsonStart) + CLOSE_TAG.length;
  return clean.slice(0, insertAt) + "\n" + guard + clean.slice(insertAt);
}

function auditAnchors(data, targets, knownIdsByTarget) {
  const failures = [];
  const passCounts = {};
  for (const target of targets) passCounts[target.key] = 0;
  walk(data, "data", (row, path) => {
    for (const target of targets) {
      if (!targetMatchesRow(row, target, knownIdsByTarget)) continue;
      const a = target.anchor;
      const snap = snapshot(row);
      const lat = Number(snap.lat);
      const lng = Number(snap.lng);
      const close = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat - a.lat) < 0.5 && Math.abs(lng - a.lng) < 0.5;
      if (close) passCounts[target.key] += 1;
      else failures.push({ target: target.key, path, expected: { lat: a.lat, lng: a.lng, city: a.city }, actual: snap });
    }
  });
  for (const required of ["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi"]) {
    if ((passCounts[required] || 0) === 0) failures.push({ target: required, path: null, reason: "required target not patched or not found" });
  }
  return { failures, passCounts };
}

function ensureWorkflowFilesAreMultiline() {
  const files = [
    ".github/workflows/nightly-refresh.yml",
    ".github/workflows/monthly-roster-review.yml",
    ".github/workflows/roster-auto-update-now.yml"
  ];
  const bad = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (text.split(/\r?\n/).length < 8) bad.push(file);
  }
  return bad;
}

async function main() {
  ensureDir("data/diagnostics");
  ensureDir("data");
  if (!fs.existsSync(REGISTRY_PATH)) throw new Error(`${REGISTRY_PATH} missing`);
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const targets = registry.targets || [];
  if (targets.length < 10) throw new Error("anchor registry too small");

  const currentPayload = readCurrent();
  const currentCounts = counts(currentPayload.data);
  const currentSafe = isSafeDataset(currentPayload.data);
  let htmlForRepair = currentPayload.html;
  let dataForRepair = currentPayload.data;
  let restoredFromHistory = false;
  let safeHistory = null;

  if (!currentSafe) {
    safeHistory = findSafeHtmlFromHistory();
    if (!safeHistory) throw new Error("Current dataset is unsafe and no safe historical index.html was found");
    htmlForRepair = safeHistory.html;
    dataForRepair = parseHtml(safeHistory.html).data;
    restoredFromHistory = true;
  }

  validateCoreShape(dataForRepair, restoredFromHistory ? "restored baseline" : "current baseline");

  const imageMap = await buildImageMap(targets);
  const knownIdsByTarget = collectKnownIds(dataForRepair, targets);
  const patches = [];

  walk(dataForRepair, "data", (row, path) => {
    for (const target of targets) {
      if (!targetMatchesRow(row, target, knownIdsByTarget)) continue;
      const before = snapshot(row);
      applyTarget(row, target, imageMap.get(target.key));
      const after = snapshot(row);
      patches.push({ target: target.key, path, before, after });
      for (const id of [row.id, row.slug, row.personId, row.wikidataId]) {
        if (id) knownIdsByTarget.get(target.key).add(String(id));
      }
      break;
    }
  });

  dataForRepair.meta = {
    ...(dataForRepair.meta || {}),
    lastDataUpdate: new Date().toISOString(),
    lastFinalRescue: new Date().toISOString(),
    finalRescueStatus: `restored=${restoredFromHistory}; patches=${patches.length}`
  };

  validateCoreShape(dataForRepair, "after rescue patch");

  const audit = auditAnchors(dataForRepair, targets, knownIdsByTarget);
  if (audit.failures.length) {
    fs.writeFileSync("data/diagnostics/final-audit-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), status: "audit_failed", failures: audit.failures, passCounts: audit.passCounts }, null, 2) + "\n");
    throw new Error(`Anchor audit failed with ${audit.failures.length} failure(s)`);
  }

  let nextHtml = writeHtml({ ...parseHtml(htmlForRepair), html: htmlForRepair }, dataForRepair, htmlForRepair);
  nextHtml = installRuntimeGuard(nextHtml, targets);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  fs.writeFileSync(DEMO_PATH, JSON.stringify(dataForRepair, null, 2) + "\n");

  const report = {
    generatedAt: new Date().toISOString(),
    status: "final_rescue_applied",
    restoredFromHistory,
    restoredCommit: safeHistory?.sha || null,
    restoreReason: safeHistory?.reason || null,
    before: currentCounts,
    after: counts(dataForRepair),
    patchCount: patches.length,
    patchCountsByTarget: patches.reduce((acc, row) => { acc[row.target] = (acc[row.target] || 0) + 1; return acc; }, {}),
    auditPassCounts: audit.passCounts,
    malformedWorkflowFilesBeforePackage: ensureWorkflowFilesAreMultiline()
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync("data/diagnostics/final-audit-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), status: "audit_passed", passCounts: audit.passCounts, failures: [] }, null, 2) + "\n");

  const lines = [
    "# ParleyMap final rescue",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Restored from git history: ${report.restoredFromHistory}`,
    `Restored commit: ${report.restoredCommit || "n/a"}`,
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
    `| categories | ${report.before.categories} | ${report.after.categories} |`,
    "",
    "## Anchor patch counts",
    "",
    ...Object.entries(report.patchCountsByTarget).map(([key, count]) => `- ${key}: ${count}`),
    "",
    "## Audit",
    "",
    "Audit status: audit_passed"
  ];
  fs.writeFileSync(SUMMARY_PATH, lines.join("\n") + "\n");

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
