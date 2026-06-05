import fs from "node:fs";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const REPORT_PATH = "data/diagnostics/anchor-face-repair-report.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const GUARD_ID = "pm-final-anchor-guard";

const ANCHORS = [
  {
    key: "claudia_sheinbaum",
    displayName: "Claudia Sheinbaum",
    all: ["claudia", "sheinbaum"],
    setCountry: true,
    countryLeader: true,
    anchor: {
      label: "Mexico City institutional base",
      city: "Mexico City",
      countryCode: "MX",
      countryName: "Mexico",
      lat: 19.4326,
      lng: -99.1332,
      region: "North America"
    },
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Claudia%20Sheinbaum%20(cropped%2C%20centered).jpg",
    imageProvider: "Wikimedia Commons"
  },
  {
    key: "pope_leo_xiv",
    displayName: "Pope Leo XIV",
    any: ["pope leo xiv", "leo xiv", "robert prevost", "robert francis prevost", "prevost", "pope", "pontiff", "bishop of rome"],
    setCountry: true,
    countryLeader: true,
    anchor: {
      label: "Vatican City institutional base",
      city: "Vatican City",
      countryCode: "VA",
      countryName: "Vatican City",
      lat: 41.9029,
      lng: 12.4534,
      region: "Europe"
    },
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Portrait%20of%20Pope%20Leo%20XIV%201%20(20150512).png",
    imageProvider: "Wikimedia Commons"
  },
  {
    key: "prabowo_subianto",
    displayName: "Prabowo Subianto",
    all: ["prabowo", "subianto"],
    setCountry: true,
    countryLeader: true,
    anchor: {
      label: "Jakarta institutional base",
      city: "Jakarta",
      countryCode: "ID",
      countryName: "Indonesia",
      lat: -6.2088,
      lng: 106.8456,
      region: "Asia"
    },
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Prabowo%20Subianto%202024%20official%20portrait.jpg",
    imageProvider: "Wikimedia Commons"
  },
  {
    key: "mohammed_bin_salman",
    displayName: "Mohammed bin Salman",
    all: ["salman"],
    any: ["mohammed", "mohammad", "muhammad", "mbs"],
    setCountry: true,
    countryLeader: true,
    anchor: {
      label: "Riyadh institutional base",
      city: "Riyadh",
      countryCode: "SA",
      countryName: "Saudi Arabia",
      lat: 24.7136,
      lng: 46.6753,
      region: "Middle East"
    }
  },
  {
    key: "rafael_grossi",
    displayName: "Rafael Grossi",
    any: ["rafael grossi", "rafael mariano grossi", "grossi"],
    roleAny: ["iaea", "international atomic energy", "nuclear"],
    setCountry: false,
    institutionCode: "IAEA",
    anchor: {
      label: "IAEA Vienna institutional base",
      city: "Vienna",
      countryCode: "AT",
      countryName: "Austria",
      lat: 48.2345,
      lng: 16.4166,
      region: "Europe"
    },
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Rafael%20Mariano%20Grossi%20-%202020%20(cropped).jpg",
    imageProvider: "Wikimedia Commons"
  },
  {
    key: "antonio_guterres",
    displayName: "Antonio Guterres",
    all: ["guterres"],
    any: ["antonio", "antónio", "un", "united nations"],
    setCountry: false,
    institutionCode: "UN",
    anchor: {
      label: "UN New York institutional base",
      city: "New York",
      countryCode: "US",
      countryName: "United States",
      lat: 40.7499,
      lng: -73.968,
      region: "North America"
    }
  },
  {
    key: "mark_rutte",
    displayName: "Mark Rutte",
    all: ["mark", "rutte"],
    roleAny: ["nato", "secretary general", "secretary-general"],
    setCountry: false,
    institutionCode: "NATO",
    anchor: {
      label: "NATO Brussels institutional base",
      city: "Brussels",
      countryCode: "BE",
      countryName: "Belgium",
      lat: 50.8798,
      lng: 4.4219,
      region: "Europe"
    }
  },
  {
    key: "ursula_von_der_leyen",
    displayName: "Ursula von der Leyen",
    all: ["ursula", "leyen"],
    setCountry: false,
    institutionCode: "EU",
    anchor: {
      label: "European Commission Brussels institutional base",
      city: "Brussels",
      countryCode: "BE",
      countryName: "Belgium",
      lat: 50.8503,
      lng: 4.3517,
      region: "Europe"
    }
  },
  {
    key: "kaja_kallas",
    displayName: "Kaja Kallas",
    all: ["kaja", "kallas"],
    setCountry: false,
    institutionCode: "EU",
    anchor: {
      label: "EU Brussels institutional base",
      city: "Brussels",
      countryCode: "BE",
      countryName: "Belgium",
      lat: 50.8503,
      lng: 4.3517,
      region: "Europe"
    }
  },
  {
    key: "kristalina_georgieva",
    displayName: "Kristalina Georgieva",
    all: ["kristalina", "georgieva"],
    setCountry: false,
    institutionCode: "IMF",
    anchor: {
      label: "IMF Washington institutional base",
      city: "Washington",
      countryCode: "US",
      countryName: "United States",
      lat: 38.8995,
      lng: -77.0436,
      region: "North America"
    }
  },
  {
    key: "ajay_banga",
    displayName: "Ajay Banga",
    all: ["ajay", "banga"],
    setCountry: false,
    institutionCode: "World Bank",
    anchor: {
      label: "World Bank Washington institutional base",
      city: "Washington",
      countryCode: "US",
      countryName: "United States",
      lat: 38.8993,
      lng: -77.0427,
      region: "North America"
    }
  },
  {
    key: "tedros_ghebreyesus",
    displayName: "Tedros Adhanom Ghebreyesus",
    any: ["tedros", "ghebreyesus", "who director general", "world health organization"],
    setCountry: false,
    institutionCode: "WHO",
    anchor: {
      label: "WHO Geneva institutional base",
      city: "Geneva",
      countryCode: "CH",
      countryName: "Switzerland",
      lat: 46.2327,
      lng: 6.1341,
      region: "Europe"
    }
  }
];

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { html, jsonStart, jsonEnd, data };
}

function writeEmbedded(payload, data, htmlOverride = null) {
  const html = htmlOverride || payload.html;
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag missing during write");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag missing during write");
  const next = html.slice(0, jsonStart) + "\n" + JSON.stringify(data, null, 2) + "\n" + html.slice(jsonEnd);
  fs.writeFileSync(INDEX_PATH, next);
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

function validateCore(data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length < 80) throw new Error("people count too low");
  if (data.roster.length < 180) throw new Error("roster count too low");
  if (data.expansionRoster.length < 90) throw new Error("expansionRoster count too low");
  if (data.appearances.length < 480) throw new Error("appearances count too low");
  if (data.categories.length < 8) throw new Error("categories count too low");
}

function rowBlob(row) {
  return norm([
    row.id,
    row.slug,
    row.name,
    row.canonicalName,
    row.roleTitle,
    row.organization,
    row.category,
    row.country,
    row.countryName,
    row.countryFocus,
    row.countryFocusCode,
    row.profileLine,
    Array.isArray(row.profileLines) ? row.profileLines.join(" ") : ""
  ].join(" "));
}

function targetMatches(row, target) {
  const text = rowBlob(row);
  const allOk = !target.all || target.all.every((part) => text.includes(norm(part)));
  const anyOk = !target.any || target.any.some((part) => text.includes(norm(part)));
  const roleOk = !target.roleAny || target.roleAny.some((part) => text.includes(norm(part)));
  return allOk && anyOk && roleOk;
}

function likelyPersonObject(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  const keys = ["id", "slug", "name", "canonicalName", "roleTitle", "organization", "profileLine", "imageUrl", "homeBases", "countryFocus", "countryFocusCode"];
  return keys.some((key) => key in row);
}

function likelyAppearanceObject(row) {
  return Boolean(row && typeof row === "object" && !Array.isArray(row) && row.personId && row.startsAt && row.title && row.location);
}

function snapshot(row) {
  return {
    id: row.id || null,
    slug: row.slug || null,
    name: row.canonicalName || row.name || null,
    countryFocus: row.countryFocus || null,
    countryFocusCode: row.countryFocusCode || null,
    countryCode: row.countryCode || null,
    countryName: row.countryName || row.country || null,
    lat: row.lat ?? row.latitude ?? row.mapLat ?? row.homeLat ?? row.anchorLat ?? null,
    lng: row.lng ?? row.lon ?? row.longitude ?? row.mapLng ?? row.homeLng ?? row.anchorLng ?? null,
    imageUrl: row.imageUrl || null,
    homeBases: Array.isArray(row.homeBases) ? row.homeBases : null,
    mapAnchor: row.mapAnchor || null,
    location: row.location || null
  };
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

function ensureImage(row, target, imageMap) {
  const nameKeys = [row.id, row.slug, row.canonicalName, row.name].map(norm).filter(Boolean);
  const current = String(row.imageUrl || "").trim();
  if (current && !/placeholder|needs[-_ ]?review|missing/i.test(current)) return false;

  for (const key of nameKeys) {
    if (imageMap.has(key)) {
      row.imageUrl = imageMap.get(key);
      row.imageProvider = row.imageProvider || "preserved from existing dataset";
      return true;
    }
  }

  if (target.imageUrl) {
    row.imageUrl = target.imageUrl;
    row.imageProvider = target.imageProvider || "curated fallback";
    row.visualAuditStatus = row.visualAuditStatus || "curated fallback image";
    return true;
  }

  return false;
}

function applyAnchor(row, target, imageMap) {
  const a = target.anchor;
  const anchor = anchorObject(target);

  row.homeBases = [anchor];
  row.homeBase = anchor;
  row.mapAnchor = anchor;
  row.anchorLocation = anchor;
  row.baseLocation = anchor;
  row.institutionalBase = anchor;
  row.publicLocation = anchor;
  row.locationAnchor = anchor;

  if (!likelyAppearanceObject(row)) {
    row.location = anchor;
  }

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

  row.coordinates = { lat: a.lat, lng: a.lng };
  row.position = { lat: a.lat, lng: a.lng };
  row.geo = { lat: a.lat, lng: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  row.leafletLatLng = [a.lat, a.lng];
  row.geoJsonCoordinates = [a.lng, a.lat];

  row.locationStatus = "institutional_base_city_level";
  row.homeRegion = a.region || row.homeRegion || null;

  if (target.setCountry) {
    row.countryFocus = a.countryCode;
    row.countryFocusCode = a.countryCode;
    row.countryCode = a.countryCode;
    row.countryName = a.countryName;
    row.country = a.countryName;
    row.flagCode = a.countryCode;
    row.countryFlagCode = a.countryCode;
    row.flagAudit = {
      ...(row.flagAudit || {}),
      code: a.countryCode,
      countryCode: a.countryCode,
      countryName: a.countryName,
      label: a.countryName,
      status: "country flag"
    };
  } else {
    row.institutionalAnchorCode = target.institutionCode || target.key;
    row.institutionalAnchorCountryCode = a.countryCode;
    if (!row.orgIcon && target.institutionCode) row.orgIcon = target.institutionCode;
  }

  const imageFixed = ensureImage(row, target, imageMap);
  row.anchorAuditStatus = "curated_institutional_anchor";
  row.lastAnchorFaceRepair = new Date().toISOString();

  return { imageFixed };
}

function walk(value, path, callback, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${path}[${index}]`, callback, seen));
    return;
  }

  callback(value, path);

  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") {
      walk(child, `${path}.${key}`, callback, seen);
    }
  }
}

function buildImageMap(data) {
  const map = new Map();
  walk(data, "data", (row) => {
    if (!likelyPersonObject(row)) return;
    const imageUrl = String(row.imageUrl || "").trim();
    if (!imageUrl || /placeholder|needs[-_ ]?review|missing/i.test(imageUrl)) return;
    for (const key of [row.id, row.slug, row.canonicalName, row.name]) {
      const normalized = norm(key);
      if (normalized && !map.has(normalized)) map.set(normalized, imageUrl);
    }
  });
  return map;
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function runtimeGuardScript() {
  const runtimeTargets = ANCHORS.map((target) => ({
    key: target.key,
    displayName: target.displayName,
    all: target.all || null,
    any: target.any || null,
    roleAny: target.roleAny || null,
    anchor: target.anchor
  }));

  return `<script id="${GUARD_ID}">
(function(){
  if (window.__PM_FINAL_ANCHOR_GUARD__) return;
  window.__PM_FINAL_ANCHOR_GUARD__ = true;
  var TARGETS = ${escapeScriptJson(runtimeTargets)};
  function norm(v){ return String(v || '').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function htmlText(v){
    if (v == null) return '';
    if (typeof v === 'string') return v.replace(/<[^>]+>/g, ' ');
    if (typeof Element !== 'undefined' && v instanceof Element) return v.textContent || '';
    if (typeof v === 'function') return '';
    try { return JSON.stringify(v); } catch(e) { return String(v); }
  }
  function optionText(options){
    try { return JSON.stringify(options || {}); } catch(e) { return ''; }
  }
  function matchTarget(text){
    var t = norm(text);
    if (!t) return null;
    for (var i=0;i<TARGETS.length;i++){
      var target = TARGETS[i];
      var allOk = !target.all || target.all.every(function(x){ return t.indexOf(norm(x)) >= 0; });
      var anyOk = !target.any || target.any.some(function(x){ return t.indexOf(norm(x)) >= 0; });
      var roleOk = !target.roleAny || target.roleAny.some(function(x){ return t.indexOf(norm(x)) >= 0; });
      if (allOk && anyOk && roleOk) return target;
    }
    return null;
  }
  function setLayerAnchor(layer, target){
    if (!layer || !target || !target.anchor) return;
    var a = target.anchor;
    try { layer.__pmAnchorTarget = target.key; } catch(e) {}
    try { if (layer.setLatLng) layer.setLatLng([a.lat, a.lng]); } catch(e) {}
    try { if (layer.options) { layer.options.pmAnchorTarget = target.key; layer.options.lat = a.lat; layer.options.lng = a.lng; layer.options.lon = a.lng; } } catch(e) {}
  }
  var seenByMap = {};
  function dedupeOnAdd(layer, map){
    try {
      var key = layer && layer.__pmAnchorTarget;
      if (!key || !map) return;
      var mapId = map._leaflet_id || 'map';
      var seenKey = mapId + ':' + key;
      if (seenByMap[seenKey] && seenByMap[seenKey] !== layer) {
        if (layer.setOpacity) layer.setOpacity(0);
        if (layer.setStyle) layer.setStyle({ opacity: 0, fillOpacity: 0 });
        layer.__pmHiddenDuplicate = true;
      } else {
        seenByMap[seenKey] = layer;
      }
    } catch(e) {}
  }
  function install(){
    var L = window.L;
    if (!L || L.__pmFinalAnchorGuardPatched) return Boolean(L && L.__pmFinalAnchorGuardPatched);
    L.__pmFinalAnchorGuardPatched = true;
    if (L.marker) {
      var oldMarker = L.marker;
      L.marker = function(latlng, options){
        var target = matchTarget(optionText(options));
        if (target) latlng = [target.anchor.lat, target.anchor.lng];
        var layer = oldMarker.call(this, latlng, options);
        if (target) setLayerAnchor(layer, target);
        return layer;
      };
    }
    if (L.circleMarker) {
      var oldCircleMarker = L.circleMarker;
      L.circleMarker = function(latlng, options){
        var target = matchTarget(optionText(options));
        if (target) latlng = [target.anchor.lat, target.anchor.lng];
        var layer = oldCircleMarker.call(this, latlng, options);
        if (target) setLayerAnchor(layer, target);
        return layer;
      };
    }
    function patchProto(proto){
      if (!proto || proto.__pmFinalAnchorGuardProtoPatched) return;
      proto.__pmFinalAnchorGuardProtoPatched = true;
      if (proto.bindTooltip) {
        var oldBindTooltip = proto.bindTooltip;
        proto.bindTooltip = function(content, options){
          var target = matchTarget(htmlText(content) + ' ' + optionText(options));
          if (target) setLayerAnchor(this, target);
          return oldBindTooltip.apply(this, arguments);
        };
      }
      if (proto.bindPopup) {
        var oldBindPopup = proto.bindPopup;
        proto.bindPopup = function(content, options){
          var target = matchTarget(htmlText(content) + ' ' + optionText(options));
          if (target) setLayerAnchor(this, target);
          return oldBindPopup.apply(this, arguments);
        };
      }
      if (proto.onAdd) {
        var oldOnAdd = proto.onAdd;
        proto.onAdd = function(map){
          var result = oldOnAdd.apply(this, arguments);
          dedupeOnAdd(this, map);
          return result;
        };
      }
    }
    patchProto(L.Marker && L.Marker.prototype);
    patchProto(L.CircleMarker && L.CircleMarker.prototype);
    patchProto(L.Layer && L.Layer.prototype);
    return true;
  }
  var tries = 0;
  var timer = setInterval(function(){
    tries += 1;
    if (install() || tries > 400) clearInterval(timer);
  }, 25);
})();
</script>`;
}

function removeOldGuardScripts(html) {
  const ids = [
    GUARD_ID,
    "parleymap-anchor-guard",
    "parleymap-runtime-anchor-guard",
    "pm-anchor-guard",
    "final-runtime-anchor-guard"
  ];
  let out = html;
  for (const id of ids) {
    const re = new RegExp(`<script\\s+id=["']${id}["'][\\s\\S]*?<\\/script>\\s*`, "gi");
    out = out.replace(re, "");
  }
  return out;
}

function installRuntimeGuard(html) {
  const clean = removeOldGuardScripts(html);
  const script = runtimeGuardScript() + "\n";
  if (/<head[^>]*>/i.test(clean)) {
    return clean.replace(/<head([^>]*)>/i, `<head$1>\n${script}`);
  }
  if (/<body[^>]*>/i.test(clean)) {
    return clean.replace(/<body([^>]*)>/i, `<body$1>\n${script}`);
  }
  return script + clean;
}

function isBadCountryTarget(row, target) {
  if (!target.setCountry) return false;
  const code = String(row.countryFocusCode || row.countryFocus || row.countryCode || "").toUpperCase();
  return code && code !== target.anchor.countryCode;
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const payload = readEmbedded();
const data = payload.data;
validateCore(data);
const before = counts(data);
const imageMap = buildImageMap(data);
const patches = [];
const imageFixes = [];

for (const collection of ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples"]) {
  if (!data[collection]) continue;
  walk(data[collection], collection, (row, path) => {
    if (!likelyPersonObject(row)) return;
    const target = ANCHORS.find((candidate) => targetMatches(row, candidate));
    if (!target) return;

    const beforeSnapshot = snapshot(row);
    const { imageFixed } = applyAnchor(row, target, imageMap);
    const afterSnapshot = snapshot(row);
    patches.push({ target: target.key, path, before: beforeSnapshot, after: afterSnapshot, forcedBecauseCountryWasWrong: isBadCountryTarget(row, target) });
    if (imageFixed) imageFixes.push({ target: target.key, path, imageUrl: row.imageUrl });
  });
}

// Add non-destructive institutional anchor metadata to matching appearance rows.
if (Array.isArray(data.appearances)) {
  for (const item of data.appearances) {
    if (!likelyAppearanceObject(item)) continue;
    const target = ANCHORS.find((candidate) => targetMatches(item, candidate));
    if (!target) continue;
    item.institutionalAnchor = anchorObject(target);
    item.anchorAuditStatus = "appearance_kept_at_event_location_with_institutional_anchor_metadata";
  }
}

data.meta = {
  ...(data.meta || {}),
  lastDataUpdate: new Date().toISOString(),
  lastAnchorFaceRepair: new Date().toISOString(),
  anchorFaceRepairStatus: `applied ${patches.length} profile anchor patches and ${imageFixes.length} image repairs`,
  runtimeAnchorGuard: GUARD_ID
};

validateCore(data);
const after = counts(data);

for (const key of ["roster", "expansionRoster", "appearances", "categories"]) {
  if (before[key] !== after[key]) {
    throw new Error(`${key} count changed from ${before[key]} to ${after[key]}`);
  }
}

let nextHtml = installRuntimeGuard(payload.html);
writeEmbedded({ ...payload, html: nextHtml }, data, nextHtml);

const report = {
  generatedAt: new Date().toISOString(),
  status: "anchor_face_repair_applied",
  before,
  after,
  runtimeGuardInstalled: true,
  guardId: GUARD_ID,
  patchesByTarget: Object.fromEntries(ANCHORS.map((target) => [target.key, patches.filter((patch) => patch.target === target.key).length])),
  imageFixesByTarget: Object.fromEntries(ANCHORS.map((target) => [target.key, imageFixes.filter((patch) => patch.target === target.key).length])),
  patches,
  imageFixes
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

const lines = [
  "# ParleyMap anchor and face repair",
  "",
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Runtime guard installed: ${report.runtimeGuardInstalled}`,
  "",
  "## Patches by target",
  "",
  ...Object.entries(report.patchesByTarget).map(([key, value]) => `- ${key}: ${value}`),
  "",
  "## Image fixes by target",
  "",
  ...Object.entries(report.imageFixesByTarget).map(([key, value]) => `- ${key}: ${value}`)
];
fs.writeFileSync(SUMMARY_PATH, lines.join("\n") + "\n");
console.log(JSON.stringify({ status: report.status, patchesByTarget: report.patchesByTarget, imageFixesByTarget: report.imageFixesByTarget }, null, 2));
