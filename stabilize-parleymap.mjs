import fs from "node:fs";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const REPORT_PATH = "data/diagnostics/anchor-stabilizer-report.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";

const TARGETS = [
  {
    key: "claudia_sheinbaum",
    label: "Claudia Sheinbaum",
    ids: ["r-028-claudia-sheinbaum", "claudia-sheinbaum", "Q515229"],
    must: ["claudia", "sheinbaum"],
    anchor: {
      label: "Mexico City institutional base",
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
    label: "Pope Leo XIV",
    ids: ["r-085-pope-leo-xiv", "pope-leo-xiv", "Q134707349"],
    any: ["pope leo xiv", "leo xiv", "robert prevost", "robert francis prevost", "prevost", "pope"],
    anchor: {
      label: "Vatican City institutional base",
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
    label: "Prabowo Subianto",
    ids: ["r-021-prabowo-subianto", "prabowo-subianto", "Q57669"],
    must: ["prabowo", "subianto"],
    anchor: {
      label: "Jakarta institutional base",
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
    label: "Mohammed bin Salman",
    ids: ["p-mohammed-bin-salman", "mohammed-bin-salman", "r-016-mohammed-bin-salman", "Q923427"],
    must: ["salman"],
    any: ["mohammed", "mohammad", "muhammad", "mbs"],
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
    label: "Rafael Grossi",
    ids: ["rafael-grossi", "Q3624485"],
    must: ["rafael", "grossi"],
    anchor: {
      label: "IAEA Vienna institutional base",
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
    label: "Antonio Guterres",
    ids: ["antonio-guterres", "antonio-guterres-un", "Q57402"],
    must: ["antonio"],
    any: ["guterres", "gutierres"],
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
    label: "Mark Rutte",
    ids: ["mark-rutte", "Q57792"],
    must: ["mark", "rutte"],
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
    label: "Ursula von der Leyen",
    ids: ["ursula-von-der-leyen", "Q60772"],
    must: ["ursula", "leyen"],
    anchor: {
      label: "European Commission Brussels institutional base",
      city: "Brussels",
      countryCode: "BE",
      countryName: "Belgium",
      lat: 50.8446,
      lng: 4.3828,
      region: "Europe"
    }
  },
  {
    key: "kaja_kallas",
    label: "Kaja Kallas",
    ids: ["kaja-kallas", "Q1787500"],
    must: ["kaja", "kallas"],
    anchor: {
      label: "EU External Action Service Brussels institutional base",
      city: "Brussels",
      countryCode: "BE",
      countryName: "Belgium",
      lat: 50.8429,
      lng: 4.3845,
      region: "Europe"
    }
  },
  {
    key: "kristalina_georgieva",
    label: "Kristalina Georgieva",
    ids: ["kristalina-georgieva", "Q265467"],
    must: ["kristalina", "georgieva"],
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
    label: "Ajay Banga",
    ids: ["ajay-banga", "Q4693392"],
    must: ["ajay", "banga"],
    anchor: {
      label: "World Bank Washington institutional base",
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

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const re = /<script\s+id=["']demo-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
  const match = html.match(re);
  if (!match) throw new Error("demo-data JSON block not found in index.html");
  const data = JSON.parse(match[1]);
  return { html, match, data, re };
}

function counts(data) {
  return {
    people: Array.isArray(data.people) ? data.people.length : null,
    roster: Array.isArray(data.roster) ? data.roster.length : null,
    expansionRoster: Array.isArray(data.expansionRoster) ? data.expansionRoster.length : null,
    appearances: Array.isArray(data.appearances) ? data.appearances.length : null,
    categories: Array.isArray(data.categories) ? data.categories.length : null
  };
}

function assertCountsStable(before, after) {
  for (const key of Object.keys(before)) {
    if (before[key] !== after[key]) {
      throw new Error(`${key} count changed from ${before[key]} to ${after[key]}`);
    }
  }
}

function objectText(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return norm([
    value.id,
    value.slug,
    value.wikidataId,
    value.name,
    value.canonicalName,
    value.personName,
    value.title,
    value.roleTitle,
    value.organization,
    value.profileLine,
    value.country,
    value.countryName,
    value.countryFocus,
    value.countryFocusCode,
    Array.isArray(value.profileLines) ? value.profileLines.join(" ") : ""
  ].join(" "));
}

function targetForObject(value) {
  const text = objectText(value);
  const rawIds = [value?.id, value?.slug, value?.wikidataId, value?.personId].map((x) => String(x || "").trim()).filter(Boolean);

  for (const target of TARGETS) {
    if (target.ids && rawIds.some((id) => target.ids.includes(id))) return target;
    const mustOk = !target.must || target.must.every((term) => text.includes(norm(term)));
    const anyOk = !target.any || target.any.some((term) => text.includes(norm(term)));
    if (mustOk && anyOk) return target;
  }
  return null;
}

function isProfileLike(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.startsAt && value.personId && value.title) return false;
  return Boolean(value.id || value.slug || value.wikidataId || value.name || value.canonicalName || value.roleTitle || value.profileLine);
}

function anchorObject(anchor) {
  return {
    label: anchor.label,
    city: anchor.city,
    countryCode: anchor.countryCode,
    countryName: anchor.countryName,
    lat: anchor.lat,
    lng: anchor.lng,
    lon: anchor.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function beforeSnapshot(value) {
  return {
    id: value.id || null,
    slug: value.slug || null,
    name: value.canonicalName || value.name || null,
    countryFocus: value.countryFocus || null,
    countryFocusCode: value.countryFocusCode || null,
    countryCode: value.countryCode || null,
    countryName: value.countryName || value.country || null,
    lat: value.lat ?? value.latitude ?? value.mapLat ?? value.homeLat ?? value.anchorLat ?? null,
    lng: value.lng ?? value.lon ?? value.longitude ?? value.mapLng ?? value.homeLng ?? value.anchorLng ?? null,
    homeBases: Array.isArray(value.homeBases) ? value.homeBases.slice(0, 1) : null,
    mapAnchor: value.mapAnchor || null,
    flagAudit: value.flagAudit || null
  };
}

function applyProfileAnchor(value, target) {
  const a = target.anchor;
  const anchor = anchorObject(a);

  value.countryFocus = a.countryCode;
  value.countryFocusCode = a.countryCode;
  value.countryCode = a.countryCode;
  value.countryName = a.countryName;
  value.country = a.countryName;
  value.homeRegion = a.region;
  value.locationStatus = "institutional_base_city_level";

  value.homeBases = [anchor];
  value.homeBase = anchor;
  value.homeLocation = anchor;
  value.homeCoordinates = { lat: a.lat, lng: a.lng, lon: a.lng };
  value.mapAnchor = anchor;
  value.anchorLocation = anchor;
  value.anchorCoordinates = { lat: a.lat, lng: a.lng, lon: a.lng };
  value.baseLocation = anchor;
  value.institutionalBase = anchor;
  value.publicLocation = anchor;
  value.location = anchor;

  value.lat = a.lat;
  value.lng = a.lng;
  value.lon = a.lng;
  value.long = a.lng;
  value.latitude = a.lat;
  value.longitude = a.lng;
  value.homeLat = a.lat;
  value.homeLng = a.lng;
  value.homeLon = a.lng;
  value.homeLongitude = a.lng;
  value.mapLat = a.lat;
  value.mapLng = a.lng;
  value.mapLon = a.lng;
  value.mapLongitude = a.lng;
  value.anchorLat = a.lat;
  value.anchorLng = a.lng;
  value.anchorLon = a.lng;
  value.anchorLongitude = a.lng;
  value.baseLat = a.lat;
  value.baseLng = a.lng;
  value.baseLon = a.lng;
  value.baseLongitude = a.lng;

  value.coordinates = { lat: a.lat, lng: a.lng, lon: a.lng };
  value.position = { lat: a.lat, lng: a.lng, lon: a.lng };
  value.geo = {
    lat: a.lat,
    lng: a.lng,
    lon: a.lng,
    city: a.city,
    countryCode: a.countryCode,
    countryName: a.countryName
  };

  value.flagAudit = {
    ...(value.flagAudit || {}),
    code: a.countryCode,
    countryCode: a.countryCode,
    countryName: a.countryName,
    label: a.countryName,
    status: "country flag"
  };
  value.flagCode = a.countryCode;
  value.countryFlagCode = a.countryCode;
}

function walk(value, path, fixes) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${path}[${index}]`, fixes));
    return;
  }

  if (isProfileLike(value)) {
    const target = targetForObject(value);
    if (target) {
      const before = beforeSnapshot(value);
      applyProfileAnchor(value, target);
      fixes.push({ target: target.key, label: target.label, path, before, after: beforeSnapshot(value) });
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") walk(child, `${path}.${key}`, fixes);
  }
}

function makeRuntimeGuard() {
  const targets = TARGETS.map((target) => ({
    key: target.key,
    label: target.label,
    must: target.must || [],
    any: target.any || [],
    ids: target.ids || [],
    lat: target.anchor.lat,
    lng: target.anchor.lng,
    city: target.anchor.city,
    countryCode: target.anchor.countryCode,
    countryName: target.anchor.countryName
  }));

  return `<script id="parleymap-anchor-stabilizer-runtime">
(function () {
  if (window.__PARLEYMAP_ANCHOR_STABILIZER_RUNTIME__) return;
  window.__PARLEYMAP_ANCHOR_STABILIZER_RUNTIME__ = true;

  const TARGETS = ${JSON.stringify(targets)};
  const maps = window.__PARLEYMAP_CAPTURED_MAPS__ = window.__PARLEYMAP_CAPTURED_MAPS__ || [];

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function textFrom(value, depth = 0) {
    if (value == null || depth > 4) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map((item) => textFrom(item, depth + 1)).join(" ");
    if (typeof value === "object") {
      return Object.values(value).map((item) => textFrom(item, depth + 1)).join(" ");
    }
    return "";
  }

  function targetForText(value) {
    const text = norm(value);
    if (!text) return null;
    for (const target of TARGETS) {
      if (target.ids.some((id) => text.includes(norm(id)))) return target;
      const mustOk = !target.must.length || target.must.every((term) => text.includes(norm(term)));
      const anyOk = !target.any.length || target.any.some((term) => text.includes(norm(term)));
      if (mustOk && anyOk) return target;
    }
    return null;
  }

  function latLngFor(target) {
    return [target.lat, target.lng];
  }

  function captureMap(map) {
    if (!map || maps.includes(map)) return map;
    maps.push(map);
    try {
      map.on("move zoom moveend zoomend viewreset resize", scheduleDomRepair);
    } catch (_) {}
    scheduleDomRepair();
    return map;
  }

  function patchLeaflet() {
    const L = window.L;
    if (!L) return false;

    if (typeof L.map === "function" && !L.map.__pmAnchorStabilizerPatched) {
      const originalMap = L.map;
      L.map = function patchedMap(...args) {
        return captureMap(originalMap.apply(this, args));
      };
      Object.assign(L.map, originalMap);
      L.map.__pmAnchorStabilizerPatched = true;
    }

    if (typeof L.marker === "function" && !L.marker.__pmAnchorStabilizerPatched) {
      const originalMarker = L.marker;
      L.marker = function patchedMarker(latlng, options) {
        const target = targetForText(textFrom(options));
        const marker = originalMarker.call(this, target ? latLngFor(target) : latlng, options);
        if (target) marker.__pmAnchorTarget = target;
        return marker;
      };
      Object.assign(L.marker, originalMarker);
      L.marker.__pmAnchorStabilizerPatched = true;
    }

    if (typeof L.circleMarker === "function" && !L.circleMarker.__pmAnchorStabilizerPatched) {
      const originalCircleMarker = L.circleMarker;
      L.circleMarker = function patchedCircleMarker(latlng, options) {
        const target = targetForText(textFrom(options));
        const marker = originalCircleMarker.call(this, target ? latLngFor(target) : latlng, options);
        if (target) marker.__pmAnchorTarget = target;
        return marker;
      };
      Object.assign(L.circleMarker, originalCircleMarker);
      L.circleMarker.__pmAnchorStabilizerPatched = true;
    }

    if (L.Marker && L.Marker.prototype && !L.Marker.prototype.__pmAnchorStabilizerPatched) {
      const proto = L.Marker.prototype;
      const originalBindTooltip = proto.bindTooltip;
      const originalBindPopup = proto.bindPopup;
      const originalSetIcon = proto.setIcon;

      function setTargetFromContent(marker, content, options) {
        const target = marker.__pmAnchorTarget || targetForText(textFrom(content) + " " + textFrom(options) + " " + textFrom(marker.options));
        if (target && typeof marker.setLatLng === "function") {
          marker.__pmAnchorTarget = target;
          try { marker.setLatLng(latLngFor(target)); } catch (_) {}
        }
      }

      if (typeof originalBindTooltip === "function") {
        proto.bindTooltip = function patchedBindTooltip(content, options) {
          setTargetFromContent(this, content, options);
          return originalBindTooltip.call(this, content, options);
        };
      }

      if (typeof originalBindPopup === "function") {
        proto.bindPopup = function patchedBindPopup(content, options) {
          setTargetFromContent(this, content, options);
          return originalBindPopup.call(this, content, options);
        };
      }

      if (typeof originalSetIcon === "function") {
        proto.setIcon = function patchedSetIcon(icon) {
          setTargetFromContent(this, textFrom(icon), {});
          return originalSetIcon.call(this, icon);
        };
      }

      proto.__pmAnchorStabilizerPatched = true;
    }

    scheduleDomRepair();
    return true;
  }

  let repairTimer = null;
  function scheduleDomRepair() {
    if (repairTimer) return;
    repairTimer = setTimeout(() => {
      repairTimer = null;
      repairDomMarkers();
    }, 80);
  }

  function visibleMap() {
    return maps.find((map) => map && map._container && map._container.offsetParent !== null) || maps[0] || null;
  }

  function transformFor(map, target) {
    if (!map || typeof map.latLngToLayerPoint !== "function") return null;
    const point = map.latLngToLayerPoint([target.lat, target.lng]);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    return "translate3d(" + Math.round(point.x) + "px, " + Math.round(point.y) + "px, 0px)";
  }

  function repairDomMarkers() {
    const map = visibleMap();
    if (!map) return;
    const nodes = document.querySelectorAll(".leaflet-marker-icon, .leaflet-tooltip, .leaflet-popup, [class*='marker'], [class*='Marker']");
    for (const node of nodes) {
      const text = (node.textContent || "") + " " + (node.getAttribute("title") || "") + " " + (node.getAttribute("aria-label") || "") + " " + (node.innerHTML || "");
      const target = targetForText(text);
      if (!target) continue;
      const transform = transformFor(map, target);
      if (!transform) continue;
      node.style.transform = transform;
      node.dataset.parleymapAnchorStabilized = target.key;
      node.dataset.parleymapAnchorCity = target.city;
    }
  }

  const patchTimer = setInterval(() => {
    if (patchLeaflet()) clearInterval(patchTimer);
  }, 25);
  setTimeout(() => clearInterval(patchTimer), 10000);

  const observer = new MutationObserver(scheduleDomRepair);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener("load", scheduleDomRepair);
  window.addEventListener("resize", scheduleDomRepair);
  setInterval(scheduleDomRepair, 1500);
})();
</script>`;
}

function installRuntimeGuard(html, match) {
  const oldGuardRe = /\s*<script\s+id=["'](?:parleymap-anchor-stabilizer-runtime|parleymap-runtime-anchor-guard|parleymap-final-runtime-anchor-guard|parleymap-hard-anchor-fix)["'][\s\S]*?<\/script>\s*/g;
  let next = html.replace(oldGuardRe, "\n");
  const dataBlockRe = /(<script\s+id=["']demo-data["']\s+type=["']application\/json["']>[\s\S]*?<\/script>)/;
  if (!dataBlockRe.test(next)) throw new Error("demo-data block disappeared before runtime guard install");
  next = next.replace(dataBlockRe, `$1\n${makeRuntimeGuard()}`);
  return next;
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const embedded = readEmbedded();
const before = counts(embedded.data);

const fixes = [];
walk(embedded.data, "data", fixes);

const after = counts(embedded.data);
assertCountsStable(before, after);

const missing = ["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi"].filter((key) => {
  return !fixes.some((fix) => fix.target === key);
});

if (missing.length) {
  throw new Error(`Anchor stabilizer did not find required targets: ${missing.join(", ")}`);
}

embedded.data.meta = {
  ...(embedded.data.meta || {}),
  lastDataUpdate: new Date().toISOString(),
  lastAnchorStabilizerRun: new Date().toISOString(),
  anchorStabilizerStatus: `patched ${fixes.length} profile/map anchor objects and installed runtime marker guard`
};

let nextHtml = embedded.html.replace(embedded.re, `<script id="demo-data" type="application/json">\n${JSON.stringify(embedded.data, null, 2)}\n</script>`);
nextHtml = installRuntimeGuard(nextHtml, embedded.match);

fs.writeFileSync(INDEX_PATH, nextHtml);
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(DEMO_PATH, JSON.stringify(embedded.data, null, 2) + "\n");

const patchesByTarget = Object.fromEntries(TARGETS.map((target) => [target.key, fixes.filter((fix) => fix.target === target.key).length]));

const report = {
  generatedAt: new Date().toISOString(),
  status: "anchor_stabilizer_applied",
  before,
  after,
  patchesByTarget,
  runtimeGuardInstalled: nextHtml.includes('id="parleymap-anchor-stabilizer-runtime"'),
  requiredTargetsPresent: ["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi"].every((key) => patchesByTarget[key] > 0),
  fixes
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(SUMMARY_PATH, [
  "# ParleyMap anchor stabilizer",
  "",
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Runtime guard installed: ${report.runtimeGuardInstalled}`,
  "",
  "## Patches by target",
  "",
  ...Object.entries(patchesByTarget).map(([key, value]) => `- ${key}: ${value}`),
  "",
  "## Expected visible anchors",
  "",
  "- Claudia Sheinbaum: Mexico City",
  "- Pope Leo XIV: Vatican City",
  "- Prabowo Subianto: Jakarta",
  "- Rafael Grossi: Vienna",
  "- Mohammed bin Salman: Riyadh"
].join("\n") + "\n");

console.log(JSON.stringify({
  status: report.status,
  before,
  after,
  patchesByTarget,
  runtimeGuardInstalled: report.runtimeGuardInstalled
}, null, 2));
