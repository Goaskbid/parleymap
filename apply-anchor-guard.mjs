import fs from "node:fs";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const REPORT_PATH = "data/diagnostics/anchor-guard-report.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const GUARD_ID = "parleymap-anchor-runtime-guard";

const TARGETS = [
  {
    key: "claudia_sheinbaum",
    labels: ["Claudia Sheinbaum", "Sheinbaum", "r-028-claudia-sheinbaum", "claudia-sheinbaum", "Q515229"],
    must: ["claudia", "sheinbaum"],
    anchor: {
      city: "Mexico City",
      countryCode: "MX",
      countryName: "Mexico",
      lat: 19.4326,
      lng: -99.1332,
      region: "North America"
    }
  },
  {
    key: "pope_leo_xiv",
    labels: ["Pope Leo XIV", "Leo XIV", "Robert Prevost", "Prevost", "Pope", "r-085-pope-leo-xiv", "pope-leo-xiv", "Q134707349"],
    any: ["pope leo xiv", "leo xiv", "robert prevost", "prevost", "pope"],
    anchor: {
      city: "Vatican City",
      countryCode: "VA",
      countryName: "Vatican City",
      lat: 41.9029,
      lng: 12.4534,
      region: "Europe"
    }
  },
  {
    key: "prabowo_subianto",
    labels: ["Prabowo Subianto", "Subianto", "Prabowo", "r-021-prabowo-subianto", "prabowo-subianto", "Q57669"],
    must: ["prabowo", "subianto"],
    anchor: {
      city: "Jakarta",
      countryCode: "ID",
      countryName: "Indonesia",
      lat: -6.2088,
      lng: 106.8456,
      region: "Asia"
    }
  },
  {
    key: "mohammed_bin_salman",
    labels: ["Mohammed bin Salman", "Mohammad bin Salman", "Muhammad bin Salman", "MBS", "Salman", "p-mohammed-bin-salman", "r-016-mohammed-bin-salman", "mohammed-bin-salman", "Q923427"],
    must: ["salman"],
    any: ["mohammed", "mohammad", "muhammad", "mbs"],
    anchor: {
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
    labels: ["Rafael Grossi", "Grossi", "rafael-grossi", "rafael-mariano-grossi", "Q725200"],
    must: ["rafael", "grossi"],
    anchor: {
      city: "Vienna",
      countryCode: "AT",
      countryName: "Austria",
      lat: 48.2345,
      lng: 16.4166,
      region: "Europe"
    }
  },
  {
    key: "antonio_guterres",
    labels: ["Antonio Guterres", "António Guterres", "Guterres"],
    any: ["antonio guterres", "antónio guterres", "guterres"],
    anchor: {
      city: "New York",
      countryCode: "US",
      countryName: "United States",
      lat: 40.7499,
      lng: -73.968,
      region: "North America"
    }
  },
  {
    key: "mark_rutte_nato",
    labels: ["Mark Rutte", "Rutte"],
    must: ["mark", "rutte"],
    anchor: {
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
    labels: ["Ursula von der Leyen", "von der Leyen", "Leyen"],
    must: ["leyen"],
    any: ["ursula", "von der leyen"],
    anchor: {
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
    labels: ["Kaja Kallas", "Kallas"],
    must: ["kaja", "kallas"],
    anchor: {
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
    labels: ["Kristalina Georgieva", "Georgieva"],
    must: ["georgieva"],
    anchor: {
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
    labels: ["Ajay Banga", "Banga"],
    must: ["ajay", "banga"],
    anchor: {
      city: "Washington",
      countryCode: "US",
      countryName: "United States",
      lat: 38.8993,
      lng: -77.0427,
      region: "North America"
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

function textBlob(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return norm(value);
  if (Array.isArray(value)) return norm(value.map(textBlob).join(" "));
  if (typeof value === "object") {
    const fields = [
      value.id,
      value.slug,
      value.name,
      value.canonicalName,
      value.personName,
      value.personId,
      value.wikidataId,
      value.roleTitle,
      value.organization,
      value.category,
      value.country,
      value.countryName,
      value.countryFocus,
      value.countryFocusCode,
      value.profileLine,
      Array.isArray(value.profileLines) ? value.profileLines.join(" ") : ""
    ];
    return norm(fields.join(" "));
  }
  return "";
}

function matchTargetFromText(text) {
  const clean = norm(text);
  if (!clean) return null;

  for (const target of TARGETS) {
    const mustOk = !target.must || target.must.every((part) => clean.includes(norm(part)));
    const anyOk = !target.any || target.any.some((part) => clean.includes(norm(part)));
    const labelOk = (target.labels || []).some((label) => clean.includes(norm(label)));
    if ((mustOk && anyOk) || labelOk) return target;
  }

  return null;
}

function matchTarget(item) {
  return matchTargetFromText(textBlob(item));
}

function readIndex() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found in index.html");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found in index.html");
  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { html, jsonStart, jsonEnd, data };
}

function replaceDemoData(payload, data, html) {
  const nextHtml = html.slice(0, payload.jsonStart) + "\n" + JSON.stringify(data, null, 2) + "\n" + html.slice(payload.jsonEnd);
  return nextHtml;
}

function anchorObject(target) {
  const a = target.anchor;
  return {
    label: `${a.city} institutional base`,
    city: a.city,
    countryCode: a.countryCode,
    countryName: a.countryName,
    lat: a.lat,
    lng: a.lng,
    lon: a.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function snapshot(item) {
  return {
    id: item.id || null,
    slug: item.slug || null,
    name: item.canonicalName || item.name || item.personName || null,
    countryFocus: item.countryFocus || null,
    countryFocusCode: item.countryFocusCode || null,
    countryCode: item.countryCode || null,
    countryName: item.countryName || item.country || null,
    lat: item.lat ?? item.latitude ?? item.mapLat ?? item.homeLat ?? item.anchorLat ?? null,
    lng: item.lng ?? item.lon ?? item.longitude ?? item.mapLng ?? item.homeLng ?? item.anchorLng ?? null,
    flagAudit: item.flagAudit || null,
    homeBases: Array.isArray(item.homeBases) ? item.homeBases : null,
    location: item.location || null,
    mapAnchor: item.mapAnchor || null
  };
}

function applyAnchor(item, target) {
  const a = target.anchor;
  const anchor = anchorObject(target);

  item.countryFocus = a.countryCode;
  item.countryFocusCode = a.countryCode;
  item.countryCode = a.countryCode;
  item.flagCode = a.countryCode;
  item.countryFlagCode = a.countryCode;
  item.countryName = a.countryName;
  item.country = a.countryName;
  item.homeRegion = a.region;
  item.region = item.region || a.region;
  item.locationStatus = "institutional_base_city_level";

  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;
  item.baseLocation = anchor;
  item.institutionalBase = anchor;
  item.publicLocation = anchor;
  item.location = anchor;

  item.lat = a.lat;
  item.lng = a.lng;
  item.lon = a.lng;
  item.long = a.lng;
  item.latitude = a.lat;
  item.longitude = a.lng;
  item.homeLat = a.lat;
  item.homeLng = a.lng;
  item.homeLon = a.lng;
  item.homeLongitude = a.lng;
  item.mapLat = a.lat;
  item.mapLng = a.lng;
  item.mapLon = a.lng;
  item.mapLongitude = a.lng;
  item.anchorLat = a.lat;
  item.anchorLng = a.lng;
  item.anchorLon = a.lng;
  item.anchorLongitude = a.lng;
  item.baseLat = a.lat;
  item.baseLng = a.lng;
  item.baseLon = a.lng;
  item.baseLongitude = a.lng;

  item.coordinates = { lat: a.lat, lng: a.lng, lon: a.lng };
  item.position = { lat: a.lat, lng: a.lng, lon: a.lng };
  item.geo = { lat: a.lat, lng: a.lng, lon: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  item.leafletLatLng = [a.lat, a.lng];
  item.geoJsonCoordinates = [a.lng, a.lat];

  item.flagAudit = {
    ...(item.flagAudit || {}),
    code: a.countryCode,
    countryCode: a.countryCode,
    countryName: a.countryName,
    label: a.countryName,
    status: "country flag"
  };
}

function shouldPatchObject(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  return Boolean(item.id || item.slug || item.name || item.canonicalName || item.personName || item.roleTitle || item.profileLine || item.organization);
}

function walk(value, path, cb) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${path}[${index}]`, cb));
    return;
  }
  cb(value, path);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") walk(child, `${path}.${key}`, cb);
  }
}

function validateCounts(before, data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must remain an array`);
    if (before[key] !== data[key].length) {
      throw new Error(`${key} count changed from ${before[key]} to ${data[key].length}`);
    }
  }
}

function runtimeGuardScript() {
  const targets = TARGETS.map((target) => ({
    key: target.key,
    labels: target.labels,
    must: target.must || null,
    any: target.any || null,
    anchor: target.anchor
  }));

  return `<script id="${GUARD_ID}">
(function(){
  "use strict";
  var TARGETS = ${JSON.stringify(targets)};
  function norm(value){
    return String(value || "").toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function text(value, seen){
    if (!value) return "";
    if (!seen) seen = new WeakSet();
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return norm(value);
    if (Array.isArray(value)) return norm(value.map(function(v){ return text(v, seen); }).join(" "));
    if (typeof value === "object") {
      if (seen.has(value)) return "";
      seen.add(value);
      var fields = [];
      try {
        fields.push(value.id, value.slug, value.name, value.canonicalName, value.personName, value.title, value.roleTitle, value.organization, value.country, value.countryName, value.countryFocus, value.countryFocusCode, value.profileLine, value.className, value.html, value.alt, value.title);
        if (value.options) fields.push(text(value.options, seen));
        if (value.icon) fields.push(text(value.icon, seen));
      } catch(e) {}
      return norm(fields.join(" "));
    }
    return "";
  }
  function matchFromText(raw){
    var clean = norm(raw);
    if (!clean) return null;
    for (var i = 0; i < TARGETS.length; i++) {
      var target = TARGETS[i];
      var mustOk = !target.must || target.must.every(function(part){ return clean.indexOf(norm(part)) !== -1; });
      var anyOk = !target.any || target.any.some(function(part){ return clean.indexOf(norm(part)) !== -1; });
      var labelOk = (target.labels || []).some(function(label){ return clean.indexOf(norm(label)) !== -1; });
      if ((mustOk && anyOk) || labelOk) return target;
    }
    return null;
  }
  function matchFromAnything(value){
    return matchFromText(text(value));
  }
  function latLng(target){
    return [target.anchor.lat, target.anchor.lng];
  }
  function fixLayer(layer, extra){
    if (!layer || !layer.setLatLng) return layer;
    var target = layer.__parleymapAnchorTarget || matchFromAnything(extra) || matchFromAnything(layer.options) || matchFromAnything(layer._tooltip && layer._tooltip._content) || matchFromAnything(layer._popup && layer._popup._content);
    if (!target) return layer;
    layer.__parleymapAnchorTarget = target;
    try { layer.setLatLng(latLng(target)); } catch(e) {}
    return layer;
  }
  function patchLeaflet(){
    var L = window.L;
    if (!L || L.__parleymapAnchorGuardPatched) return false;
    L.__parleymapAnchorGuardPatched = true;

    if (L.Marker && L.Marker.prototype && L.Marker.prototype.initialize) {
      var oldMarkerInit = L.Marker.prototype.initialize;
      L.Marker.prototype.initialize = function(latlngValue, options){
        var target = matchFromAnything(options);
        if (target) {
          this.__parleymapAnchorTarget = target;
          latlngValue = latLng(target);
        }
        return oldMarkerInit.call(this, latlngValue, options);
      };
    }

    if (L.CircleMarker && L.CircleMarker.prototype && L.CircleMarker.prototype.initialize) {
      var oldCircleInit = L.CircleMarker.prototype.initialize;
      L.CircleMarker.prototype.initialize = function(latlngValue, options){
        var target = matchFromAnything(options);
        if (target) {
          this.__parleymapAnchorTarget = target;
          latlngValue = latLng(target);
        }
        return oldCircleInit.call(this, latlngValue, options);
      };
    }

    if (L.marker) {
      var oldMarker = L.marker;
      L.marker = function(latlngValue, options){
        var target = matchFromAnything(options);
        if (target) latlngValue = latLng(target);
        var marker = oldMarker.call(this, latlngValue, options);
        if (target) marker.__parleymapAnchorTarget = target;
        return fixLayer(marker, options);
      };
    }

    if (L.circleMarker) {
      var oldCircleMarker = L.circleMarker;
      L.circleMarker = function(latlngValue, options){
        var target = matchFromAnything(options);
        if (target) latlngValue = latLng(target);
        var marker = oldCircleMarker.call(this, latlngValue, options);
        if (target) marker.__parleymapAnchorTarget = target;
        return fixLayer(marker, options);
      };
    }

    var markerProto = L.Marker && L.Marker.prototype;
    if (markerProto) {
      if (markerProto.bindTooltip) {
        var oldBindTooltip = markerProto.bindTooltip;
        markerProto.bindTooltip = function(content, options){
          var result = oldBindTooltip.call(this, content, options);
          return fixLayer(result || this, [content, options]);
        };
      }
      if (markerProto.bindPopup) {
        var oldBindPopup = markerProto.bindPopup;
        markerProto.bindPopup = function(content, options){
          var result = oldBindPopup.call(this, content, options);
          return fixLayer(result || this, [content, options]);
        };
      }
      if (markerProto.setIcon) {
        var oldSetIcon = markerProto.setIcon;
        markerProto.setIcon = function(icon){
          var result = oldSetIcon.call(this, icon);
          return fixLayer(result || this, icon);
        };
      }
      if (markerProto.onAdd) {
        var oldOnAdd = markerProto.onAdd;
        markerProto.onAdd = function(map){
          fixLayer(this, this.options);
          return oldOnAdd.call(this, map);
        };
      }
      if (markerProto.addTo) {
        var oldAddTo = markerProto.addTo;
        markerProto.addTo = function(map){
          fixLayer(this, this.options);
          return oldAddTo.call(this, map);
        };
      }
    }
    window.__PARLEYMAP_ANCHOR_GUARD_ACTIVE = true;
    return true;
  }

  var internalL = window.L;
  if (!internalL) {
    try {
      Object.defineProperty(window, "L", {
        configurable: true,
        get: function(){ return internalL; },
        set: function(value){ internalL = value; setTimeout(patchLeaflet, 0); }
      });
    } catch(e) {}
  }

  patchLeaflet();
  var tries = 0;
  var timer = setInterval(function(){
    tries += 1;
    if (patchLeaflet() || tries > 400) clearInterval(timer);
  }, 25);
  document.addEventListener("DOMContentLoaded", patchLeaflet);
  window.addEventListener("load", patchLeaflet);
})();
</script>`;
}

function stripExistingGuard(html) {
  const escaped = GUARD_ID.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`<script id=["']${escaped}["'][\\s\\S]*?<\\/script>\\s*`, "g"), "");
}

function insertGuard(html) {
  const payload = { html, ...(() => {
    const start = html.indexOf(OPEN_TAG);
    if (start === -1) throw new Error("demo-data opening tag not found while inserting guard");
    const jsonStart = start + OPEN_TAG.length;
    const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
    if (jsonEnd === -1) throw new Error("demo-data closing tag not found while inserting guard");
    return { jsonStart, jsonEnd };
  })() };
  const insertionPoint = payload.jsonEnd + CLOSE_TAG.length;
  return html.slice(0, insertionPoint) + "\n" + runtimeGuardScript() + "\n" + html.slice(insertionPoint);
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const payload = readIndex();
const data = payload.data;
const beforeCounts = {
  people: Array.isArray(data.people) ? data.people.length : null,
  roster: Array.isArray(data.roster) ? data.roster.length : null,
  expansionRoster: Array.isArray(data.expansionRoster) ? data.expansionRoster.length : null,
  appearances: Array.isArray(data.appearances) ? data.appearances.length : null,
  categories: Array.isArray(data.categories) ? data.categories.length : null
};

validateCounts(beforeCounts, data);

const patches = [];
walk(data, "demoData", (item, path) => {
  if (!shouldPatchObject(item)) return;
  const target = matchTarget(item);
  if (!target) return;
  const before = snapshot(item);
  applyAnchor(item, target);
  const after = snapshot(item);
  patches.push({ target: target.key, path, before, after });
});

data.anchorOverrides = Object.fromEntries(TARGETS.map((target) => [target.key, { labels: target.labels, anchor: target.anchor }]));

data.meta = {
  ...(data.meta || {}),
  lastDataUpdate: new Date().toISOString(),
  lastAnchorGuardRun: new Date().toISOString(),
  anchorGuardStatus: `patched ${patches.length} embedded profile or roster objects and installed runtime marker guard`
};

validateCounts(beforeCounts, data);

let html = replaceDemoData(payload, data, payload.html);
html = stripExistingGuard(html);
html = insertGuard(html);

// Parse again after guard insertion. This proves the demo-data script is still valid JSON.
const postStart = html.indexOf(OPEN_TAG);
const postJsonStart = postStart + OPEN_TAG.length;
const postJsonEnd = html.indexOf(CLOSE_TAG, postJsonStart);
const postData = JSON.parse(html.slice(postJsonStart, postJsonEnd).trim());
validateCounts(beforeCounts, postData);

fs.writeFileSync(INDEX_PATH, html);
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + "\n");

const patchesByTarget = {};
for (const target of TARGETS) patchesByTarget[target.key] = 0;
for (const patch of patches) patchesByTarget[patch.target] = (patchesByTarget[patch.target] || 0) + 1;

for (const key of ["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi"]) {
  if (!patchesByTarget[key]) {
    throw new Error(`No embedded object patched for ${key}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: "anchor_guard_applied",
  runtimeGuardInstalled: html.includes(`id="${GUARD_ID}"`),
  before: beforeCounts,
  after: {
    people: postData.people.length,
    roster: postData.roster.length,
    expansionRoster: postData.expansionRoster.length,
    appearances: postData.appearances.length,
    categories: postData.categories.length
  },
  patchesByTarget,
  patches
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

const summary = [
  "# ParleyMap anchor guard run",
  "",
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Runtime guard installed: ${report.runtimeGuardInstalled}`,
  "",
  "## Targets patched",
  "",
  ...Object.entries(patchesByTarget).map(([key, count]) => `- ${key}: ${count}`),
  "",
  "## Dataset counts",
  "",
  "| Item | Before | After |",
  "|---|---:|---:|",
  ...Object.keys(report.before).map((key) => `| ${key} | ${report.before[key]} | ${report.after[key]} |`)
].join("\n") + "\n";

fs.writeFileSync(SUMMARY_PATH, summary);
console.log(JSON.stringify(report, null, 2));
