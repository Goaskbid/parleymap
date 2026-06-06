import fs from "node:fs";
import { execSync } from "node:child_process";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const REPORT_PATH = "data/diagnostics/final-safe-repair-report.json";
const AUDIT_PATH = "data/diagnostics/final-hard-audit-report.json";
const ADSENSE_REPORT_PATH = "data/diagnostics/adsense-preserve-audit-report.json";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const RUNTIME_GUARD_ID = "parleymap-final-integrity-runtime-guard";
const ADSENSE_RUNTIME_ID = "parleymap-adsense-preserve-runtime";

const CORE_COUNTS = {
  peopleMin: 90,
  peopleMax: 115,
  rosterMin: 190,
  expansionRosterMin: 100,
  appearancesMin: 480,
  categoriesMin: 10
};

const BLOCKED_EVENT_PATTERNS = [
  /city of london finance diplomacy watch/i,
  /iaea nuclear diplomacy watch/i,
  /think[- ]tank leadership events watch/i,
  /royal diaries and state[- ]visit watch/i,
  /group of thirty member and event watch/i,
  /bilderberg decade participant watch/i,
  /source[- ]watch/i,
  /\bwatch card\b/i,
  /\bhomepage\b/i,
  /\bprofile page\b/i,
  /\bfact sheet\b/i,
  /\bfaq\b/i,
  /foire aux questions/i,
  /\bprogramme\b/i,
  /\bprogramming\b/i
];

const GENERIC_EVENT_TITLE_RE = /\b(watch|source[- ]watch|event[- ]page watch|official diary watch|membership and events|participant list|civic finance diplomacy)\b/i;
const REAL_EVENT_REQUIRED_SOURCE_RE = /(official_or_host|primary|primary_or_host|official)/i;

const ANCHORS = [
  {
    key: "claudia_sheinbaum",
    tokens: ["claudia", "sheinbaum"],
    anchor: { city: "Mexico City", countryCode: "MX", countryName: "Mexico", lat: 19.4326, lng: -99.1332, region: "North America", label: "Mexico City institutional base" },
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Claudia_Sheinbaum_2024.jpg/330px-Claudia_Sheinbaum_2024.jpg"
  },
  {
    key: "pope_leo_xiv",
    any: ["pope leo xiv", "leo xiv", "robert francis prevost", "robert prevost", "prevost"],
    roleAny: ["pope", "pontiff", "bishop of rome"],
    anchor: { city: "Vatican City", countryCode: "VA", countryName: "Vatican City", lat: 41.9029, lng: 12.4534, region: "Europe", label: "Vatican City institutional base" },
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Pope_Leo_XIV_2025.jpg/330px-Pope_Leo_XIV_2025.jpg"
  },
  {
    key: "prabowo_subianto",
    tokens: ["prabowo", "subianto"],
    anchor: { city: "Jakarta", countryCode: "ID", countryName: "Indonesia", lat: -6.2088, lng: 106.8456, region: "Asia", label: "Jakarta institutional base" },
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Prabowo_Subianto_2024_official_portrait.jpg/330px-Prabowo_Subianto_2024_official_portrait.jpg"
  },
  {
    key: "rafael_grossi",
    any: ["rafael grossi", "rafael mariano grossi"],
    anchor: { city: "Vienna", countryCode: "AT", countryName: "Austria", lat: 48.2082, lng: 16.3738, region: "Europe", label: "Vienna IAEA institutional base" },
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Rafael_Mariano_Grossi_IAEA_2023.jpg/330px-Rafael_Mariano_Grossi_IAEA_2023.jpg"
  },
  {
    key: "mohammed_bin_salman",
    tokens: ["salman"],
    any: ["mohammed", "mohammad", "muhammad", "mbs"],
    anchor: { city: "Riyadh", countryCode: "SA", countryName: "Saudi Arabia", lat: 24.7136, lng: 46.6753, region: "Middle East", label: "Riyadh institutional base" }
  },
  {
    key: "emmanuel_macron",
    tokens: ["emmanuel", "macron"],
    anchor: { city: "Paris", countryCode: "FR", countryName: "France", lat: 48.8566, lng: 2.3522, region: "Europe", label: "Paris institutional base" }
  },
  {
    key: "king_charles_iii",
    any: ["king charles iii", "charles iii"],
    anchor: { city: "London", countryCode: "GB", countryName: "United Kingdom", lat: 51.5074, lng: -0.1278, region: "Europe", label: "London royal institutional base" }
  },
  {
    key: "antonio_guterres",
    any: ["antonio guterres", "antónio guterres"],
    anchor: { city: "New York", countryCode: "US", countryName: "United States", lat: 40.7499, lng: -73.968, region: "North America", label: "UN New York institutional base" }
  },
  {
    key: "mark_rutte",
    tokens: ["mark", "rutte"],
    anchor: { city: "Brussels", countryCode: "BE", countryName: "Belgium", lat: 50.8798, lng: 4.4219, region: "Europe", label: "NATO Brussels institutional base" }
  },
  {
    key: "ursula_von_der_leyen",
    any: ["ursula von der leyen", "von der leyen"],
    anchor: { city: "Brussels", countryCode: "BE", countryName: "Belgium", lat: 50.8503, lng: 4.3517, region: "Europe", label: "European Commission Brussels institutional base" }
  },
  {
    key: "kaja_kallas",
    tokens: ["kaja", "kallas"],
    anchor: { city: "Brussels", countryCode: "BE", countryName: "Belgium", lat: 50.8503, lng: 4.3517, region: "Europe", label: "EU Brussels institutional base" }
  },
  {
    key: "kristalina_georgieva",
    any: ["kristalina georgieva", "georgieva"],
    anchor: { city: "Washington", countryCode: "US", countryName: "United States", lat: 38.8995, lng: -77.0436, region: "North America", label: "IMF Washington institutional base" }
  },
  {
    key: "ajay_banga",
    tokens: ["ajay", "banga"],
    anchor: { city: "Washington", countryCode: "US", countryName: "United States", lat: 38.8993, lng: -77.0427, region: "North America", label: "World Bank Washington institutional base" }
  },
  {
    key: "tedros_ghebreyesus",
    any: ["tedros adhanom ghebreyesus", "tedros ghebreyesus", "tedros adhanom"],
    anchor: { city: "Geneva", countryCode: "CH", countryName: "Switzerland", lat: 46.2327, lng: 6.1341, region: "Europe", label: "WHO Geneva institutional base" }
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

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
}

function write(path, text) {
  fs.mkdirSync(path.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  fs.writeFileSync(path, text);
}

function sh(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function extractEmbedded(html) {
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) return null;
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) return null;
  const json = html.slice(jsonStart, jsonEnd).trim();
  try {
    return { jsonStart, jsonEnd, data: JSON.parse(json) };
  } catch {
    return null;
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

function validateDatasetShape(data, label, options = {}) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data?.[key])) throw new Error(`${label}: ${key} must be an array`);
  }
  if (data.people.length < CORE_COUNTS.peopleMin) throw new Error(`${label}: people count too low`);
  if (!options.allowPollutedPeople && data.people.length > CORE_COUNTS.peopleMax) throw new Error(`${label}: people count polluted ${data.people.length}`);
  if (data.roster.length < CORE_COUNTS.rosterMin) throw new Error(`${label}: roster count too low`);
  if (data.expansionRoster.length < CORE_COUNTS.expansionRosterMin) throw new Error(`${label}: expansionRoster count too low`);
  if (data.appearances.length < CORE_COUNTS.appearancesMin) throw new Error(`${label}: appearances count too low`);
  if (data.categories.length < CORE_COUNTS.categoriesMin) throw new Error(`${label}: categories count too low`);
}

function looksThin(html) {
  const stripped = html.replace(/\s+/g, "").trim();
  return stripped.length < 1000 || stripped === "parleymap.com" || !html.includes(OPEN_TAG);
}

function profileBlob(item) {
  return norm([
    item?.id,
    item?.slug,
    item?.name,
    item?.canonicalName,
    item?.personName,
    item?.roleTitle,
    item?.organization,
    item?.category,
    item?.country,
    item?.countryName,
    item?.countryFocus,
    item?.countryFocusCode,
    item?.profileLine,
    Array.isArray(item?.profileLines) ? item.profileLines.map((x) => x?.text || x).join(" ") : ""
  ].join(" "));
}

function titleBlob(item) {
  return norm([
    item?.id,
    item?.title,
    item?.summary,
    item?.whyItMatters,
    item?.status,
    item?.type,
    item?.eventType,
    Array.isArray(item?.participantNames) ? item.participantNames.join(" ") : "",
    Array.isArray(item?.sourcePack) ? item.sourcePack.map((s) => `${s?.label || ""} ${s?.url || ""} ${s?.type || ""}`).join(" ") : ""
  ].join(" "));
}

function matchesAnchor(item, anchor) {
  const text = profileBlob(item);
  const roleText = norm(item?.roleTitle || "");
  const tokensOk = !anchor.tokens || anchor.tokens.every((t) => text.includes(norm(t)));
  const anyOk = !anchor.any || anchor.any.some((t) => text.includes(norm(t)));
  const roleOk = !anchor.roleAny || anchor.roleAny.some((t) => roleText.includes(norm(t)) || text.includes(norm(t)));
  return tokensOk && anyOk && roleOk;
}

function isProfileLike(item) {
  return Boolean(item && typeof item === "object" && !Array.isArray(item) && (item.id || item.slug || item.name || item.canonicalName || item.roleTitle || item.profileLine || item.wikidataId));
}

function makeAnchorObject(anchor) {
  return {
    label: anchor.label,
    city: anchor.city,
    countryCode: anchor.countryCode,
    countryName: anchor.countryName,
    lat: anchor.lat,
    lng: anchor.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function shouldTreatAsPlaceholderImage(url) {
  return !url || /placeholder|avatar|silhouette|no image|missing/i.test(String(url));
}

function applyAnchor(item, entry, options = {}) {
  const a = entry.anchor;
  const anchorObj = makeAnchorObject(a);

  item.countryFocus = a.countryCode;
  item.countryFocusCode = a.countryCode;
  item.countryCode = a.countryCode;
  item.countryName = a.countryName;
  item.country = a.countryName;
  item.homeRegion = a.region;
  item.locationStatus = "institutional_base_city_level";

  item.homeBases = [anchorObj];
  item.homeBase = anchorObj;
  item.mapAnchor = anchorObj;
  item.anchorLocation = anchorObj;
  item.baseLocation = anchorObj;
  item.institutionalBase = anchorObj;

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
  item.coordinates = { lat: a.lat, lng: a.lng };
  item.geo = { lat: a.lat, lng: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };

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

  if (entry.imageUrl && shouldTreatAsPlaceholderImage(item.imageUrl)) {
    item.imageUrl = entry.imageUrl;
    item.imageProvider = "curated public portrait fallback";
    item.visualAuditStatus = "curated portrait fallback; verify license before production cache";
    item.imageAudit = { ...(item.imageAudit || {}), status: "curated-fallback", checkedAt: new Date().toISOString() };
  }

  if (options.suppressDuplicate) {
    item.suppressMapMarker = true;
    item.hideOnMap = true;
    item.mapVisibility = "hidden_duplicate";
    item.trackingStatus = "duplicate profile suppressed from map marker generation";
  }
}

function isFakeEventRow(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const text = [item.title, item.summary, item.whyItMatters, item.id, item.status, item.type, item.eventType].join(" ");
  if (BLOCKED_EVENT_PATTERNS.some((re) => re.test(text))) return true;
  if (String(item.id || "").startsWith("watch-")) return true;
  if (String(item.status || "").toLowerCase().includes("source-watch")) return true;
  if (GENERIC_EVENT_TITLE_RE.test(text) && item.startsAt) return true;

  const sourceText = Array.isArray(item.sourcePack)
    ? item.sourcePack.map((s) => `${s?.type || ""} ${s?.reliability || ""} ${s?.label || ""}`).join(" ")
    : "";
  if (item.startsAt && GENERIC_EVENT_TITLE_RE.test(text) && !REAL_EVENT_REQUIRED_SOURCE_RE.test(sourceText)) return true;

  return false;
}

function recursivelyFilterFakeRows(value, removals, path = "data") {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const kept = [];
    for (let i = 0; i < value.length; i++) {
      const row = value[i];
      if (isFakeEventRow(row)) {
        removals.push({ path: `${path}[${i}]`, id: row?.id || null, title: row?.title || null, status: row?.status || null });
        continue;
      }
      kept.push(recursivelyFilterFakeRows(row, removals, `${path}[${i}]`));
    }
    return kept;
  }
  for (const key of Object.keys(value)) {
    if (value[key] && typeof value[key] === "object") value[key] = recursivelyFilterFakeRows(value[key], removals, `${path}.${key}`);
  }
  return value;
}

function walk(value, path, cb) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((child, i) => walk(child, `${path}[${i}]`, cb));
    return;
  }
  cb(value, path);
  for (const [k, v] of Object.entries(value)) {
    if (v && typeof v === "object") walk(v, `${path}.${k}`, cb);
  }
}

function repairAnchorsAndDuplicates(data) {
  const fixes = [];
  const seenTargets = new Set();

  walk(data, "data", (item, path) => {
    if (!isProfileLike(item)) return;
    for (const entry of ANCHORS) {
      if (!matchesAnchor(item, entry)) continue;
      const suppressDuplicate = seenTargets.has(entry.key) && entry.key === "rafael_grossi";
      applyAnchor(item, entry, { suppressDuplicate });
      seenTargets.add(entry.key);
      fixes.push({ path, target: entry.key, suppressedDuplicate: suppressDuplicate });
      break;
    }
  });

  // Also tag exact duplicate IDs inside any one array as hidden duplicates rather than deleting rows.
  walk(data, "data", (obj, path) => {
    for (const [key, value] of Object.entries(obj)) {
      if (!Array.isArray(value)) continue;
      const seen = new Set();
      value.forEach((row, index) => {
        if (!isProfileLike(row)) return;
        const id = row.id || row.slug || row.wikidataId || row.canonicalName || row.name;
        if (!id) return;
        if (seen.has(id)) {
          row.suppressMapMarker = true;
          row.hideOnMap = true;
          row.mapVisibility = "hidden_duplicate";
          fixes.push({ path: `${path}.${key}[${index}]`, target: "duplicate_id_suppressed", id });
        } else {
          seen.add(id);
        }
      });
    }
  });

  return fixes;
}

function hasHistoricalLeaderPollution(data) {
  let found = false;
  const historicalNames = [/vincent auriol/i, /rene coty/i, /francois mitterrand/i, /georges pompidou/i];
  for (const collection of ["people", "roster", "topRoster", "expansionRoster"]) {
    const rows = Array.isArray(data?.[collection]) ? data[collection] : [];
    for (const row of rows) {
      const text = `${row?.canonicalName || row?.name || ""} ${row?.roleTitle || ""} ${row?.trackingStatus || ""}`;
      if (historicalNames.some((re) => re.test(text)) && /president of france|current|head of state/i.test(text) && !/former|deceased/i.test(text)) found = true;
    }
  }
  return found;
}

function isSafeHistoricalHtml(html) {
  const extracted = extractEmbedded(html);
  if (!extracted) return false;
  try {
    validateDatasetShape(extracted.data, "candidate", { allowPollutedPeople: false });
  } catch {
    return false;
  }
  if (hasHistoricalLeaderPollution(extracted.data)) return false;
  return html.length > 100000;
}

function collectHistoryHtml() {
  const candidates = [];
  const current = read(INDEX_PATH);
  if (current) candidates.push({ source: "current:index.html", html: current });
  const template = read("index.template.html");
  if (template) candidates.push({ source: "current:index.template.html", html: template });

  let shas = [];
  try {
    shas = sh("git rev-list --max-count=300 HEAD -- index.html index.template.html").trim().split("\n").filter(Boolean);
  } catch {
    shas = [];
  }
  for (const sha of shas) {
    for (const file of ["index.html", "index.template.html"]) {
      try {
        const html = sh(`git show ${sha}:${file}`);
        if (html) candidates.push({ source: `${sha}:${file}`, html });
      } catch {
        // ignore
      }
    }
  }
  return candidates;
}

function selectBaseHtml(history) {
  const current = history.find((x) => x.source === "current:index.html")?.html || "";
  const currentExtracted = extractEmbedded(current);
  if (currentExtracted) {
    try {
      validateDatasetShape(currentExtracted.data, "current", { allowPollutedPeople: false });
      if (!hasHistoricalLeaderPollution(currentExtracted.data) && !looksThin(current)) {
        return { html: current, source: "current:index.html", restoredFromHistory: false };
      }
    } catch {
      // continue to history
    }
  }

  for (const candidate of history) {
    if (candidate.source.startsWith("current:")) continue;
    if (isSafeHistoricalHtml(candidate.html)) {
      return { html: candidate.html, source: candidate.source, restoredFromHistory: true };
    }
  }

  throw new Error("No safe full index.html found in git history. Refusing to generate a synthetic app shell.");
}

function collectAdsenseValues(history) {
  const clients = [];
  const pubs = [];
  const slots = [];
  const seen = new Set();

  function add(kind, value, source) {
    if (!value) return;
    const key = `${kind}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (kind === "client") clients.push({ value, source });
    if (kind === "pub") pubs.push({ value, source });
    if (kind === "slot") slots.push({ value, source });
  }

  const files = ["ads.txt", "privacy.html", "impressum.html", "index.html", "index.template.html"];
  for (const file of files) {
    const text = read(file);
    if (text) history.push({ source: `current:${file}`, html: text });
  }

  for (const item of history) {
    const text = item.html || "";
    for (const m of text.matchAll(/ca-pub-([0-9]{10,})/g)) add("client", `ca-pub-${m[1]}`, item.source);
    for (const m of text.matchAll(/\bpub-([0-9]{10,})\b/g)) add("pub", `pub-${m[1]}`, item.source);
    for (const m of text.matchAll(/data-ad-slot=["']([0-9]{4,})["']/g)) add("slot", m[1], item.source);
  }

  const client = clients[0]?.value || (pubs[0]?.value ? `ca-${pubs[0].value}` : null);
  const pub = client ? client.replace(/^ca-/, "") : pubs[0]?.value || null;
  const uniqueSlots = slots.map((x) => x.value).filter((v, i, a) => a.indexOf(v) === i);
  return { client, pub, slots: uniqueSlots, clients, pubs, slotsDetailed: slots };
}

function ensureHead(html, addition) {
  if (html.includes(addition.id || addition.text)) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${addition.text}\n</head>`);
  return `${addition.text}\n${html}`;
}

function installAdsense(html, ads, report) {
  if (!ads.client || !ads.pub) {
    report.status = "adsense_ids_not_found_no_dummy_inserted";
    report.message = "No existing AdSense publisher ID was found in current files or git history. The script did not invent or overwrite ad IDs.";
    return html;
  }

  write("ads.txt", `google.com, ${ads.pub}, DIRECT, f08c47fec0942fa0\n`);
  report.adsTxtWritten = true;
  report.publisherClient = ads.client;
  report.publisherId = ads.pub;
  report.slots = ads.slots;

  if (!html.includes("google-adsense-account")) {
    html = ensureHead(html, { text: `  <meta name="google-adsense-account" content="${ads.client}">`, id: "google-adsense-account" });
    report.metaInserted = true;
  }

  if (!html.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js")) {
    html = ensureHead(html, {
      text: `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>`,
      id: "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
    });
    report.loaderInserted = true;
  }

  if (ads.slots.length >= 2 && !html.includes(ADSENSE_RUNTIME_ID)) {
    const [headerSlot, sidebarSlot] = ads.slots;
    const runtime = `\n<script id="${ADSENSE_RUNTIME_ID}">\n(function(){\n  var client=${JSON.stringify(ads.client)};\n  var units=[{name:'header',slot:${JSON.stringify(headerSlot)}},{name:'sidebar',slot:${JSON.stringify(sidebarSlot)}}];\n  function byText(root, words){\n    var nodes=Array.prototype.slice.call(root.querySelectorAll('aside,section,div,header'));\n    return nodes.find(function(n){var t=(n.getAttribute('aria-label')||n.className||n.id||n.textContent||'').toLowerCase();return words.some(function(w){return t.indexOf(w)>-1;});});\n  }\n  function mount(){\n    if(!window.adsbygoogle) window.adsbygoogle=[];\n    var header=document.querySelector('[data-ad-zone="header"],#ad-header,.ad-header,.header-ad,.top-ad')||byText(document,['header ad','advertisement','sponsored']);\n    var sidebar=document.querySelector('[data-ad-zone="sidebar"],#ad-sidebar,.ad-sidebar,.sidebar-ad,.side-ad')||byText(document,['sidebar ad','side ad','advertisement','sponsored']);\n    [[header,units[0]],[sidebar,units[1]]].forEach(function(pair){\n      var host=pair[0],unit=pair[1];\n      if(!host||host.querySelector('ins.adsbygoogle')) return;\n      var ins=document.createElement('ins');\n      ins.className='adsbygoogle';\n      ins.style.display='block';\n      ins.setAttribute('data-ad-client',client);\n      ins.setAttribute('data-ad-slot',unit.slot);\n      ins.setAttribute('data-ad-format','auto');\n      ins.setAttribute('data-full-width-responsive','true');\n      ins.setAttribute('data-parleymap-ad-unit',unit.name);\n      host.innerHTML='';\n      host.appendChild(ins);\n      try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}\n    });\n  }\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount); else mount();\n  setTimeout(mount,1000);\n})();\n</script>\n`;
    html = html.replace(/<\/body>/i, `${runtime}\n</body>`);
    report.runtimeInserted = true;
  }

  report.status = ads.slots.length >= 2 ? "adsense_preserved_and_ready" : "adsense_publisher_preserved_but_two_slots_not_found";
  return html;
}

function runtimeGuardSource() {
  const anchorMap = Object.fromEntries(ANCHORS.map((a) => [a.key, a.anchor]));
  const matcher = ANCHORS.map((a) => ({ key: a.key, tokens: a.tokens || null, any: a.any || null }));
  return `\n<script id="${RUNTIME_GUARD_ID}">\n(function(){\n  var anchors=${JSON.stringify(anchorMap)};\n  var matchers=${JSON.stringify(matcher)};\n  var fakeRe=/city of london finance diplomacy watch|iaea nuclear diplomacy watch|think[- ]tank leadership events watch|royal diaries and state[- ]visit watch|source[- ]watch|watch card|profile page|homepage|fact sheet|faq/i;\n  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function keyFor(text){var s=norm(text);for(var i=0;i<matchers.length;i++){var m=matchers[i];var ok=true;if(m.tokens) ok=m.tokens.every(function(t){return s.indexOf(norm(t))>-1;});if(ok&&m.any) ok=m.any.some(function(t){return s.indexOf(norm(t))>-1;});if(ok) return m.key;}return null;}\n  function anchorObj(a){return {label:a.label,city:a.city,countryCode:a.countryCode,countryName:a.countryName,lat:a.lat,lng:a.lng,precision:'city',type:'institutional_base',privacy:'city-level public institutional base only'};}\n  function patchItem(item){if(!item||typeof item!=='object')return item;var text=[item.id,item.slug,item.name,item.canonicalName,item.personName,item.roleTitle,item.organization,item.title,item.summary].join(' ');var key=keyFor(text);if(key&&anchors[key]){var a=anchors[key],o=anchorObj(a);if(!item.startsAt||fakeRe.test(text)){item.countryFocus=a.countryCode;item.countryFocusCode=a.countryCode;item.countryCode=a.countryCode;item.countryName=a.countryName;item.country=a.countryName;item.homeRegion=a.region;item.homeBases=[o];item.homeBase=o;item.mapAnchor=o;item.anchorLocation=o;item.baseLocation=o;item.institutionalBase=o;item.lat=a.lat;item.lng=a.lng;item.lon=a.lng;item.latitude=a.lat;item.longitude=a.lng;item.mapLat=a.lat;item.mapLng=a.lng;item.homeLat=a.lat;item.homeLng=a.lng;item.coordinates={lat:a.lat,lng:a.lng};item.geo={lat:a.lat,lng:a.lng,city:a.city,countryCode:a.countryCode,countryName:a.countryName};}}return item;}\n  function filterArray(arr){return arr.filter(function(x){var t=[x&&x.id,x&&x.title,x&&x.summary,x&&x.status,x&&x.type].join(' ');return !fakeRe.test(t)&&!(x&&String(x.id||'').indexOf('watch-')===0);});}\n  function walk(v){if(!v||typeof v!=='object')return;if(Array.isArray(v)){var keep=filterArray(v);v.length=0;keep.forEach(function(x){v.push(x);walk(x);});return;}patchItem(v);Object.keys(v).forEach(function(k){walk(v[k]);});}\n  function patchDemoData(){var el=document.getElementById('demo-data');if(!el)return;try{var data=JSON.parse(el.textContent);walk(data);el.textContent=JSON.stringify(data,null,2);}catch(e){}}\n  patchDemoData();\n  var seen={};\n  function patchMarker(marker){if(!marker||marker.__pmGuard)return marker;marker.__pmGuard=true;['bindPopup','bindTooltip'].forEach(function(method){if(typeof marker[method]!=='function')return;var orig=marker[method];marker[method]=function(content){var text=typeof content==='string'?content:(content&&content.textContent)||'';if(fakeRe.test(text)){setTimeout(function(){try{marker.remove();}catch(e){}},0);return marker;}var key=keyFor(text);if(key&&anchors[key]){var a=anchors[key];try{marker.setLatLng([a.lat,a.lng]);}catch(e){}if(key==='rafael_grossi'){if(seen[key]&&seen[key]!==marker){setTimeout(function(){try{marker.remove();}catch(e){}},0);return marker;}seen[key]=marker;}}return orig.apply(this,arguments);};});return marker;}\n  function patchLeaflet(){if(!window.L||window.L.__pmFinalGuard)return;window.L.__pmFinalGuard=true;['marker','circleMarker'].forEach(function(fn){if(typeof window.L[fn]!=='function')return;var orig=window.L[fn];window.L[fn]=function(latlng,opts){return patchMarker(orig.call(this,latlng,opts));};});}\n  patchLeaflet();var timer=setInterval(function(){patchLeaflet();},250);setTimeout(function(){clearInterval(timer);},10000);\n})();\n</script>\n`;
}

function installRuntimeGuard(html) {
  if (html.includes(RUNTIME_GUARD_ID)) return { html, inserted: false };
  const extracted = extractEmbedded(html);
  const script = runtimeGuardSource();
  if (extracted) {
    const insertPos = html.indexOf(CLOSE_TAG, extracted.jsonEnd) + CLOSE_TAG.length;
    return { html: html.slice(0, insertPos) + script + html.slice(insertPos), inserted: true };
  }
  if (/<\/head>/i.test(html)) return { html: html.replace(/<\/head>/i, `${script}\n</head>`), inserted: true };
  return { html: script + html, inserted: true };
}

function writeEmbedded(html, extracted, data) {
  const nextJson = JSON.stringify(data, null, 2);
  return html.slice(0, extracted.jsonStart) + "\n" + nextJson + "\n" + html.slice(extracted.jsonEnd);
}

function finalAudit(data, adsenseReport) {
  const problems = [];
  const allText = JSON.stringify(data).toLowerCase();
  for (const phrase of ["city of london finance diplomacy watch", "iaea nuclear diplomacy watch", "think-tank leadership events watch", "royal diaries and state-visit watch"]) {
    if (allText.includes(phrase)) problems.push(`fake event remains: ${phrase}`);
  }
  if (hasHistoricalLeaderPollution(data)) problems.push("historical active leader pollution remains");

  const anchorProblems = [];
  for (const entry of ["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi"]) {
    const target = ANCHORS.find((x) => x.key === entry);
    let matched = 0;
    let good = 0;
    walk(data, "data", (item) => {
      if (!isProfileLike(item) || !matchesAnchor(item, target)) return;
      matched++;
      const lat = Number(item.lat ?? item.homeBases?.[0]?.lat ?? item.mapAnchor?.lat);
      const lng = Number(item.lng ?? item.homeBases?.[0]?.lng ?? item.mapAnchor?.lng);
      if (Math.abs(lat - target.anchor.lat) < 0.5 && Math.abs(lng - target.anchor.lng) < 0.5) good++;
    });
    if (!matched) anchorProblems.push(`${entry} not found`);
    if (matched && !good) anchorProblems.push(`${entry} found but not correctly anchored`);
  }
  problems.push(...anchorProblems);

  let grossiVisible = 0;
  walk(data, "data", (item) => {
    if (!isProfileLike(item)) return;
    if (!/rafael\s+(mariano\s+)?grossi/i.test(`${item.canonicalName || ""} ${item.name || ""}`)) return;
    if (!item.suppressMapMarker && !item.hideOnMap && item.mapVisibility !== "hidden_duplicate") grossiVisible++;
  });
  if (grossiVisible > 1) problems.push(`more than one visible Rafael Grossi profile-like row remains: ${grossiVisible}`);

  const report = {
    generatedAt: new Date().toISOString(),
    status: problems.length ? "audit_failed" : "audit_passed",
    problems,
    counts: counts(data),
    adsenseStatus: adsenseReport.status || null
  };
  write(AUDIT_PATH, JSON.stringify(report, null, 2) + "\n");
  if (problems.length) throw new Error(`Final audit failed: ${problems.join("; ")}`);
  return report;
}

function main() {
  fs.mkdirSync("data/diagnostics", { recursive: true });

  const history = collectHistoryHtml();
  const ads = collectAdsenseValues([...history]);
  const baseSelection = selectBaseHtml(history);
  let html = baseSelection.html;
  let extracted = extractEmbedded(html);
  if (!extracted) throw new Error("Selected base HTML does not contain demo-data");

  const beforeCounts = counts(extracted.data);
  let data = extracted.data;
  const removals = [];
  data = recursivelyFilterFakeRows(data, removals);
  const anchorFixes = repairAnchorsAndDuplicates(data);
  data.meta = {
    ...(data.meta || {}),
    lastFinalSafeRepair: new Date().toISOString(),
    finalSafeRepairStatus: `removed ${removals.length} fake rows and applied ${anchorFixes.length} anchor/profile fixes`
  };

  validateDatasetShape(data, "after-repair", { allowPollutedPeople: false });
  html = writeEmbedded(html, extracted, data);

  const adsenseReport = {
    generatedAt: new Date().toISOString(),
    foundClients: ads.clients,
    foundSlots: ads.slotsDetailed,
    adsTxtWritten: false,
    metaInserted: false,
    loaderInserted: false,
    runtimeInserted: false
  };
  html = installAdsense(html, ads, adsenseReport);
  write(ADSENSE_REPORT_PATH, JSON.stringify(adsenseReport, null, 2) + "\n");

  const runtime = installRuntimeGuard(html);
  html = runtime.html;

  const audit = finalAudit(data, adsenseReport);
  write(INDEX_PATH, html);
  write(DEMO_PATH, JSON.stringify(data, null, 2) + "\n");

  const report = {
    generatedAt: new Date().toISOString(),
    status: "final_safe_repair_applied",
    baseHtmlSource: baseSelection.source,
    restoredFromHistory: baseSelection.restoredFromHistory,
    before: beforeCounts,
    after: counts(data),
    fakeRowsRemoved: removals,
    anchorFixes,
    runtimeGuardInserted: runtime.inserted,
    adsense: adsenseReport,
    auditStatus: audit.status
  };
  write(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

  const summary = [
    "# ParleyMap final safe repair",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Base HTML source: ${report.baseHtmlSource}`,
    `Restored from history: ${report.restoredFromHistory}`,
    "",
    "## Counts",
    "",
    "| Dataset | Before | After |",
    "|---|---:|---:|",
    `| people | ${report.before.people} | ${report.after.people} |`,
    `| roster | ${report.before.roster} | ${report.after.roster} |`,
    `| expansionRoster | ${report.before.expansionRoster} | ${report.after.expansionRoster} |`,
    `| appearances | ${report.before.appearances} | ${report.after.appearances} |`,
    `| categories | ${report.before.categories} | ${report.after.categories} |`,
    "",
    "## Repairs",
    "",
    `Fake event/watch rows removed: ${removals.length}`,
    `Anchor/profile fixes applied: ${anchorFixes.length}`,
    `Runtime marker guard inserted: ${runtime.inserted}`,
    "",
    "## AdSense",
    "",
    `Status: ${adsenseReport.status}`,
    `Publisher client: ${adsenseReport.publisherClient || "not found"}`,
    `Slots found: ${(adsenseReport.slots || []).join(", ") || "none"}`,
    `ads.txt written: ${adsenseReport.adsTxtWritten}`,
    "",
    "## Audit",
    "",
    `Final audit: ${audit.status}`
  ].join("\n") + "\n";
  write(SUMMARY_PATH, summary);
  console.log(summary);
}

main();
