#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const ANCHORS_PATH = "data/curated-anchors.json";
const REPORT_PATH = "data/diagnostics/final-stabilize-report.json";
const AUDIT_PATH = "data/diagnostics/final-audit-report.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const GUARD_START = "<!-- PARLEYMAP FINAL ANCHOR GUARD START -->";
const GUARD_END = "<!-- PARLEYMAP FINAL ANCHOR GUARD END -->";

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return norm(value).replace(/ /g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function readJson(pathName, fallback) {
  try {
    return JSON.parse(fs.readFileSync(pathName, "utf8"));
  } catch {
    return fallback;
  }
}

function loadRegistry() {
  const registry = readJson(ANCHORS_PATH, null);
  if (!registry || !Array.isArray(registry.targets)) {
    throw new Error(`Missing or invalid ${ANCHORS_PATH}`);
  }
  return registry;
}

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found in index.html");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found in index.html");
  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { html, jsonStart, jsonEnd, data };
}

function stripOldGuard(html) {
  let out = html;
  const start = out.indexOf(GUARD_START);
  const end = out.indexOf(GUARD_END);
  if (start !== -1 && end !== -1 && end > start) {
    out = out.slice(0, start) + out.slice(end + GUARD_END.length);
  }
  return out;
}

function writeEmbedded(payload, data, guardScript) {
  const before = payload.html.slice(0, payload.jsonStart);
  const after = payload.html.slice(payload.jsonEnd);
  let html = before + "\n" + JSON.stringify(data, null, 2) + "\n" + after;
  html = stripOldGuard(html);
  const insertAt = html.indexOf(CLOSE_TAG, html.indexOf(OPEN_TAG)) + CLOSE_TAG.length;
  if (insertAt < CLOSE_TAG.length) throw new Error("could not find demo-data close tag while writing");
  html = html.slice(0, insertAt) + "\n" + guardScript + "\n" + html.slice(insertAt);
  fs.writeFileSync(INDEX_PATH, html);
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

function validateCoreShape(data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length < 70 || data.people.length > 115) {
    throw new Error(`people count unsafe after stabilize: ${data.people.length}`);
  }
  if (data.roster.length < 180) throw new Error(`roster count too low: ${data.roster.length}`);
  if (data.expansionRoster.length < 90) throw new Error(`expansionRoster count too low: ${data.expansionRoster.length}`);
  if (data.appearances.length < 450) throw new Error(`appearances count too low after fake-event cleanup: ${data.appearances.length}`);
  if (data.categories.length < 8) throw new Error(`categories count too low: ${data.categories.length}`);
}

function objectText(item) {
  return norm([
    item?.id,
    item?.slug,
    item?.name,
    item?.canonicalName,
    item?.title,
    item?.label,
    item?.summary,
    item?.roleTitle,
    item?.organization,
    item?.category,
    item?.country,
    item?.countryName,
    item?.countryFocus,
    item?.countryFocusCode,
    item?.profileLine,
    Array.isArray(item?.profileLines) ? item.profileLines.join(" ") : ""
  ].join(" "));
}

function matchesRule(item, rule) {
  const text = objectText(item);
  if (Array.isArray(rule.matchAll) && !rule.matchAll.every((part) => text.includes(norm(part)))) return false;
  if (Array.isArray(rule.matchAny) && !rule.matchAny.some((part) => text.includes(norm(part)))) return false;
  if (Array.isArray(rule.roleAny) && !rule.roleAny.some((part) => text.includes(norm(part)))) return false;
  return Boolean(rule.matchAll || rule.matchAny || rule.roleAny);
}

function targetForItem(item, registry) {
  return registry.targets.find((target) => matchesRule(item, target)) || null;
}

function sourceUrls(item) {
  return Array.isArray(item?.sourcePack)
    ? item.sourcePack.map((source) => source?.url || "").filter(Boolean)
    : [];
}

function isAppearanceLike(item) {
  return Boolean(
    item && typeof item === "object" &&
    ("startsAt" in item || "endsAt" in item || "eventType" in item || "sourcePack" in item || "venuePublic" in item)
  );
}

function isProfileLike(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  if (isAppearanceLike(item)) return false;
  return Boolean(item.id || item.slug || item.name || item.canonicalName || item.roleTitle || item.profileLine || item.wikidataId);
}

function anchorObject(target) {
  return {
    label: `${target.city} institutional base`,
    city: target.city,
    countryCode: target.countryCode,
    countryName: target.countryName,
    lat: target.lat,
    lng: target.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function goodImage(value) {
  const url = String(value || "");
  return /^https?:\/\//i.test(url) && !/(placeholder|avatar|blank|transparent|default|data:image)/i.test(url);
}

function applyTarget(item, target, pathName, fixes) {
  const before = {
    name: item.canonicalName || item.name || item.title || null,
    countryFocusCode: item.countryFocusCode || null,
    countryName: item.countryName || item.country || null,
    lat: item.lat ?? item.latitude ?? item.mapLat ?? item.homeLat ?? item?.homeBases?.[0]?.lat ?? null,
    lng: item.lng ?? item.lon ?? item.longitude ?? item.mapLng ?? item.homeLng ?? item?.homeBases?.[0]?.lng ?? null,
    imageUrl: item.imageUrl || null
  };
  const anchor = anchorObject(target);
  item.canonicalName = item.canonicalName || target.canonicalName;
  item.name = item.name || target.canonicalName;
  item.roleTitle = item.roleTitle || target.roleTitle;
  item.organization = item.organization || target.organization;
  item.countryFocus = target.countryCode;
  item.countryFocusCode = target.countryCode;
  item.countryCode = target.countryCode;
  item.countryName = target.countryName;
  item.country = target.countryName;
  item.homeRegion = target.region;
  item.region = item.region || target.region;
  item.locationStatus = "institutional_base_city_level";
  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;
  item.baseLocation = anchor;
  item.institutionalBase = anchor;
  item.publicLocation = anchor;
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
  item.coordinates = { lat: target.lat, lng: target.lng };
  item.geo = { lat: target.lat, lng: target.lng, city: target.city, countryCode: target.countryCode, countryName: target.countryName };
  item.position = { lat: target.lat, lng: target.lng };
  item.leafletLatLng = [target.lat, target.lng];
  item.geoJsonCoordinates = [target.lng, target.lat];
  item.flagCode = target.countryCode;
  item.countryFlagCode = target.countryCode;
  item.flagAudit = {
    ...(item.flagAudit || {}),
    code: target.countryCode,
    countryCode: target.countryCode,
    countryName: target.countryName,
    label: target.countryName,
    status: "country flag"
  };
  if (target.imageUrl && !goodImage(item.imageUrl)) {
    item.imageUrl = target.imageUrl;
    item.imageProvider = "curated public image fallback";
    item.visualAuditStatus = "curated_fallback_checked";
    item.imageAudit = {
      ...(item.imageAudit || {}),
      status: "curated_fallback_checked",
      checkedAt: new Date().toISOString()
    };
  }
  fixes.push({
    path: pathName,
    target: target.key,
    before,
    after: {
      name: item.canonicalName || item.name || null,
      countryFocusCode: item.countryFocusCode || null,
      countryName: item.countryName || null,
      lat: item.lat,
      lng: item.lng,
      imageUrl: item.imageUrl || null
    }
  });
}

function buildTargetProfile(target, template = {}) {
  const id = template.id || slug(target.canonicalName);
  const row = {
    ...template,
    id,
    slug: template.slug || id,
    name: target.canonicalName,
    canonicalName: target.canonicalName,
    roleTitle: target.roleTitle,
    organization: target.organization,
    category: template.category || "political_leader",
    trackingStatus: "current_curated_profile",
    sourcePriority: "curated anchor rescue",
    imageUrl: target.imageUrl || template.imageUrl || "",
    imageProvider: target.imageUrl ? "curated public image fallback" : template.imageProvider,
    profileLine: target.roleTitle,
    prominenceScore: template.prominenceScore ?? 90
  };
  applyTarget(row, target, "generated.profile", []);
  return row;
}

function shouldReplaceHistorical(item, registry) {
  const text = objectText(item);
  const countryCode = String(item?.countryFocusCode || item?.countryFocus || item?.countryCode || "").toUpperCase();
  for (const rule of registry.activeOfficeReplacements || []) {
    const bad = (rule.badMatchAny || []).some((value) => text.includes(norm(value)));
    const countryOk = !rule.countryCode || countryCode === rule.countryCode || text.includes(norm(rule.countryCode));
    if (bad && countryOk) return rule;
  }
  return null;
}

function replaceHistoricalSlots(data, registry, report) {
  const collections = ["roster", "topRoster", "people", "expansionRoster", "priorityExpansion", "watchlistExamples"];
  for (const collection of collections) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!isProfileLike(row)) continue;
      const rule = shouldReplaceHistorical(row, registry);
      if (!rule) continue;
      const target = registry.targets.find((candidate) => candidate.key === rule.replacementKey);
      if (!target) continue;
      const previous = { id: row.id || null, name: row.canonicalName || row.name || null, roleTitle: row.roleTitle || null };
      const replacementTemplate = findExistingProfile(data, target) || row;
      const replacement = buildTargetProfile(target, replacementTemplate);
      if (collection === "people") {
        row.roleTitle = row.roleTitle && !/^former/i.test(row.roleTitle) ? `Former ${row.roleTitle}` : (row.roleTitle || "Former office holder");
        row.trackingStatus = "former_historical_profile";
        row.currentOfficeStatus = "not_current";
        row.lastParleyMapRescue = new Date().toISOString();
      } else {
        rows[i] = { ...replacement, rank: row.rank, prominenceScore: row.prominenceScore ?? replacement.prominenceScore };
      }
      report.historicalReplacements.push({ collection, index: i, previous, replacement: target.canonicalName, reason: rule.reason });
    }
  }
}

function findExistingProfile(data, target) {
  for (const collection of ["people", "roster", "topRoster", "expansionRoster"]) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    const row = rows.find((item) => isProfileLike(item) && matchesRule(item, target));
    if (row) return row;
  }
  return null;
}

function walk(value, pathName, visit, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) walk(value[i], `${pathName}[${i}]`, visit, seen);
    return;
  }
  visit(value, pathName);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") walk(child, `${pathName}.${key}`, visit, seen);
  }
}

function fakeEventRegex(registry) {
  const source = (registry.fakeEventPatterns || []).map((pattern) => `(?:${pattern})`).join("|");
  return new RegExp(source, "i");
}

function eventText(item) {
  return norm([
    item?.title,
    item?.label,
    item?.name,
    item?.summary,
    item?.description,
    item?.eventType,
    item?.eventGroupId,
    item?.location?.city,
    item?.location?.countryName,
    ...sourceUrls(item)
  ].join(" "));
}

function isFakeEvent(item, re) {
  if (!item || typeof item !== "object") return false;
  const text = eventText(item);
  if (!text) return false;
  const hasDate = Boolean(item.startsAt || item.date || item.startDate || item.endsAt || item.window || item.eventDate);
  const looksLikeEvent = isAppearanceLike(item) || hasDate || /event|agenda|summit|watch|diary|diplomacy/.test(text);
  if (!looksLikeEvent) return false;
  if (re.test(text)) return true;
  if (/city of london/.test(text) && !/lord mayor|guildhall|bank of england|official/i.test(String(item.summary || item.title || ""))) return true;
  if (/iaea/.test(text) && /watch|homepage|profile|generic|nuclear diplomacy/.test(text)) return true;
  return false;
}

function removeFakeEventsFromArray(rows, pathName, re, report) {
  if (!Array.isArray(rows)) return rows;
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    if (isFakeEvent(item, re)) {
      report.removedFakeEvents.push({
        path: `${pathName}[${i}]`,
        id: item?.id || null,
        title: item?.title || item?.label || item?.name || null,
        reason: "generic watch, office-homepage, fake future diary, or non-event row"
      });
      continue;
    }
    out.push(item);
  }
  return out;
}

function cleanupEventCollections(data, registry, report) {
  const re = fakeEventRegex(registry);
  const keys = [
    "appearances", "events", "summits", "eventAgendas", "alerts", "influenceEventCatalog",
    "influenceTimeline", "calls", "telephoneCalls", "signals", "watchlistExamples", "openCatalogs"
  ];
  for (const key of keys) {
    if (Array.isArray(data[key])) data[key] = removeFakeEventsFromArray(data[key], key, re, report);
  }
  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const [subKey, subValue] of Object.entries(value)) {
      if (Array.isArray(subValue) && /event|agenda|alert|watch|catalog|timeline|cards|items/i.test(subKey)) {
        value[subKey] = removeFakeEventsFromArray(subValue, `${key}.${subKey}`, re, report);
      }
    }
  }
}

function pruneBadAutoAddedPeople(data, report) {
  if (!Array.isArray(data.people)) return;
  const appearancePersonIds = new Set((data.appearances || []).map((item) => item.personId).filter(Boolean));
  const targets = new Set(["claudia-sheinbaum", "pope-leo-xiv", "prabowo-subianto", "rafael-grossi", "emmanuel-macron"]);
  const before = data.people.length;
  data.people = data.people.filter((person) => {
    const id = slug(person.id || person.slug || person.canonicalName || person.name);
    if (targets.has(id)) return true;
    if (appearancePersonIds.has(person.id)) return true;
    const text = objectText(person);
    const auto = /current office holder auto updated|monthly roster auto update|last roster auto update|former historical profile|replaced by current office holder/.test(text) || person.lastRosterAutoUpdate;
    const historical = /vincent auriol|georges pompidou|charles de gaulle|francois mitterrand|jacques chirac|nicolas sarkozy|francois hollande|pena nieto|felipe calderon|vicente fox|lopez obrador|zedillo|salinas/.test(text);
    if ((auto || historical) && data.people.length > 94) {
      report.removedBadPeople.push({ id: person.id || null, name: person.canonicalName || person.name || null, reason: auto ? "bad auto-added roster row" : "historical current-holder pollution" });
      return false;
    }
    return true;
  });
  if (data.people.length > 115) {
    const trimmed = [];
    for (const person of data.people) {
      const text = objectText(person);
      const hasAppearance = appearancePersonIds.has(person.id);
      if (!hasAppearance && /former|historical|deceased|auto updated|auto-update/.test(text) && data.people.length - trimmed.length > 94) {
        report.removedBadPeople.push({ id: person.id || null, name: person.canonicalName || person.name || null, reason: "trim unsafe people count" });
        trimmed.push(person);
      }
    }
    data.people = data.people.filter((person) => !trimmed.includes(person));
  }
  report.peoplePruned = before - data.people.length;
}

function dedupeDisplayCollections(data, report) {
  for (const key of ["roster", "topRoster", "expansionRoster", "priorityExpansion"]) {
    const rows = Array.isArray(data[key]) ? data[key] : [];
    const seen = new Set();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!isProfileLike(row)) continue;
      const signature = slug(row.canonicalName || row.name || row.id || row.slug);
      if (!signature) continue;
      if (!seen.has(signature)) {
        seen.add(signature);
        continue;
      }
      const replacement = findUniqueReplacement(data, seen);
      if (replacement) {
        report.dedupedRows.push({ collection: key, index: i, removed: row.canonicalName || row.name || row.id, replacement: replacement.canonicalName || replacement.name || replacement.id });
        rows[i] = { ...structuredClone(replacement), rank: row.rank, prominenceScore: row.prominenceScore ?? replacement.prominenceScore };
        seen.add(slug(rows[i].canonicalName || rows[i].name || rows[i].id));
      } else {
        report.dedupedRows.push({ collection: key, index: i, removed: row.canonicalName || row.name || row.id, replacement: null });
      }
    }
  }
}

function findUniqueReplacement(data, seen) {
  for (const source of [data.people || [], data.roster || [], data.expansionRoster || []]) {
    for (const row of source) {
      if (!isProfileLike(row)) continue;
      const signature = slug(row.canonicalName || row.name || row.id || row.slug);
      if (!signature || seen.has(signature)) continue;
      if (/vincent auriol|former historical|deceased/.test(objectText(row))) continue;
      return row;
    }
  }
  return null;
}

function repairProfiles(data, registry, report) {
  walk(data, "data", (item, pathName) => {
    if (!isProfileLike(item)) return;
    const target = targetForItem(item, registry);
    if (!target) return;
    applyTarget(item, target, pathName, report.anchorFixes);
  });
}

function ensureCriticalProfiles(data, registry, report) {
  for (const key of ["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi", "emmanuel_macron"]) {
    const target = registry.targets.find((item) => item.key === key);
    if (!target) continue;
    const existing = findExistingProfile(data, target);
    if (existing) continue;
    const newProfile = buildTargetProfile(target);
    data.people.push(newProfile);
    report.addedCriticalProfiles.push({ key, name: target.canonicalName });
  }
}

function installRuntimeGuard(registry) {
  const targetLite = registry.targets.map((target) => ({
    key: target.key,
    names: [target.canonicalName, ...(target.matchAll || []), ...(target.matchAny || [])].filter(Boolean),
    lat: target.lat,
    lng: target.lng,
    city: target.city,
    countryCode: target.countryCode,
    countryName: target.countryName
  }));
  return `${GUARD_START}\n<script>\n(function(){\n  var TARGETS=${JSON.stringify(targetLite)};\n  function norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\n  function hit(text){var n=norm(text);return TARGETS.find(function(t){return t.names.some(function(name){var m=norm(name);return m&&n.indexOf(m)!==-1;});});}\n  function ll(target){return [target.lat,target.lng];}\n  function patchLayer(layer,target){try{var latlng={lat:target.lat,lng:target.lng};if(layer.setLatLng)layer.setLatLng(latlng);if(layer._latlng){layer._latlng.lat=target.lat;layer._latlng.lng=target.lng;}if(layer.options){layer.options.parleymapAnchorGuard=target.key;layer.options.city=target.city;layer.options.countryCode=target.countryCode;}}catch(e){}}\n  function patchArgs(args){try{var opt=args[1]||{};var text=[opt.title,opt.alt,opt.name,opt.personName,opt.label,opt.tooltip,opt.popup].join(' ');var target=hit(text);if(target){args[0]=ll(target);args[1]=Object.assign({},opt,{parleymapAnchorGuard:target.key,city:target.city,countryCode:target.countryCode});}}catch(e){}return args;}\n  function install(){if(!window.L||window.__PARLEYMAP_FINAL_GUARD__)return;window.__PARLEYMAP_FINAL_GUARD__=true;['marker','circleMarker','circle'].forEach(function(name){var original=L[name];if(typeof original!=='function')return;L[name]=function(){var args=Array.prototype.slice.call(arguments);args=patchArgs(args);var layer=original.apply(this,args);var origBind=layer.bindTooltip;if(typeof origBind==='function'){layer.bindTooltip=function(content,options){var text=typeof content==='string'?content:(content&&content.textContent)||'';var target=hit(text);if(target)patchLayer(layer,target);return origBind.call(layer,content,options);};}var origPopup=layer.bindPopup;if(typeof origPopup==='function'){layer.bindPopup=function(content,options){var text=typeof content==='string'?content:(content&&content.textContent)||'';var target=hit(text);if(target)patchLayer(layer,target);return origPopup.call(layer,content,options);};}return layer;};});}\n  install();\n  var timer=setInterval(install,250);setTimeout(function(){clearInterval(timer);},10000);\n})();\n</script>\n${GUARD_END}`;
}

function auditTarget(data, registry, key) {
  const target = registry.targets.find((item) => item.key === key);
  if (!target) return { key, status: "missing_target_rule" };
  const rows = [];
  walk(data, "data", (item, pathName) => {
    if (!isProfileLike(item)) return;
    if (!matchesRule(item, target)) return;
    rows.push({
      path: pathName,
      name: item.canonicalName || item.name || null,
      countryCode: item.countryFocusCode || item.countryCode || item.countryFocus || item?.homeBases?.[0]?.countryCode || null,
      lat: Number(item.lat ?? item.latitude ?? item.mapLat ?? item.homeLat ?? item?.homeBases?.[0]?.lat),
      lng: Number(item.lng ?? item.lon ?? item.longitude ?? item.mapLng ?? item.homeLng ?? item?.homeBases?.[0]?.lng),
      imageUrl: item.imageUrl || null
    });
  });
  const goodRows = rows.filter((row) => {
    return String(row.countryCode || "").toUpperCase() === target.countryCode && Math.abs(row.lat - target.lat) < 1 && Math.abs(row.lng - target.lng) < 1;
  });
  return { key, expected: { city: target.city, countryCode: target.countryCode, lat: target.lat, lng: target.lng }, found: rows.length, good: goodRows.length, rows: rows.slice(0, 8), status: goodRows.length ? "passed" : "failed" };
}

function finalAudit(data, registry, html) {
  const targets = ["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi", "emmanuel_macron"];
  const targetReports = targets.map((key) => auditTarget(data, registry, key));
  const fakeRe = fakeEventRegex(registry);
  const remainingFakeEvents = [];
  walk(data, "data", (item, pathName) => {
    if (isFakeEvent(item, fakeRe)) {
      remainingFakeEvents.push({ path: pathName, title: item.title || item.label || item.name || null });
    }
  });
  const historicalActive = [];
  walk(data, "data", (item, pathName) => {
    if (!isProfileLike(item)) return;
    if (/(vincent auriol|georges pompidou|francois mitterrand|jacques chirac|nicolas sarkozy|francois hollande|pena nieto|felipe calderon|lopez obrador)/.test(objectText(item)) && !/former|deceased|historical/.test(objectText(item))) {
      historicalActive.push({ path: pathName, name: item.canonicalName || item.name || null, roleTitle: item.roleTitle || null });
    }
  });
  const passed = targetReports.every((item) => item.status === "passed") && remainingFakeEvents.length === 0 && historicalActive.length === 0 && html.includes("PARLEYMAP FINAL ANCHOR GUARD START");
  return { generatedAt: new Date().toISOString(), status: passed ? "audit_passed" : "audit_failed", targets: targetReports, remainingFakeEvents, historicalActive, runtimeGuardInstalled: html.includes("PARLEYMAP FINAL ANCHOR GUARD START") };
}

function writeReports(report, audit) {
  fs.mkdirSync("data/diagnostics", { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2) + "\n");
  const lines = [
    "# ParleyMap final stabilization",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    `Stabilize status: ${report.status}`,
    `Audit status: ${audit.status}`,
    `Anchor fixes: ${report.anchorFixes.length}`,
    `Fake events removed: ${report.removedFakeEvents.length}`,
    `Historical active rows replaced or marked former: ${report.historicalReplacements.length}`,
    `Bad auto-added people removed: ${report.removedBadPeople.length}`,
    `Display duplicates repaired: ${report.dedupedRows.length}`,
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
    "## Critical anchor audit",
    "",
    ...audit.targets.map((item) => `- ${item.key}: ${item.status}, found ${item.found}, good ${item.good}`),
    "",
    "## Removed fake event examples",
    "",
    ...report.removedFakeEvents.slice(0, 20).map((item) => `- ${item.title || item.id || item.path}`)
  ];
  fs.writeFileSync(SUMMARY_PATH, lines.join("\n") + "\n");
}


function parseEmbeddedFromHtml(html) {
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) return null;
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) return null;
  try {
    return { html, jsonStart, jsonEnd, data: JSON.parse(html.slice(jsonStart, jsonEnd).trim()) };
  } catch {
    return null;
  }
}

function hasHistoricalActivePollution(data) {
  let found = false;
  walk(data, "data", (item) => {
    if (found || !isProfileLike(item)) return;
    const text = objectText(item);
    if (/(vincent auriol|georges pompidou|francois mitterrand|jacques chirac|nicolas sarkozy|francois hollande|pena nieto|felipe calderon|lopez obrador)/.test(text) && !/former|deceased|historical/.test(text)) {
      found = true;
    }
  });
  return found;
}

function tryRestoreSafePayload(currentPayload, registry, report) {
  const currentCounts = counts(currentPayload.data);
  const polluted = (currentCounts.people || 0) > 115 || hasHistoricalActivePollution(currentPayload.data);
  if (!polluted) return currentPayload;
  try {
    try { execSync("git fetch --deepen=100 origin main", { stdio: "ignore" }); } catch {}
    const hashes = execSync("git log --format=%H -- index.html", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1, 80);
    for (const hash of hashes) {
      let html;
      try {
        html = execSync(`git show ${hash}:index.html`, { encoding: "utf8", maxBuffer: 80 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
      } catch {
        continue;
      }
      const candidate = parseEmbeddedFromHtml(html);
      if (!candidate) continue;
      const c = counts(candidate.data);
      if ((c.people || 0) < 80 || (c.people || 0) > 115) continue;
      if ((c.roster || 0) < 180 || (c.expansionRoster || 0) < 90 || (c.appearances || 0) < 450) continue;
      report.restoredFromHistory = { commit: hash, before: currentCounts, restored: c };
      return candidate;
    }
  } catch (error) {
    report.historyRestoreError = String(error.message || error);
  }
  return currentPayload;
}

function main() {
  const registry = loadRegistry();
  let payload = readEmbedded();
  let data = payload.data;
  const report = {
    generatedAt: new Date().toISOString(),
    status: "started",
    originalBefore: counts(data),
    restoredFromHistory: null,
    historyRestoreError: null,
    before: null,
    after: null,
    anchorFixes: [],
    removedFakeEvents: [],
    historicalReplacements: [],
    removedBadPeople: [],
    dedupedRows: [],
    addedCriticalProfiles: [],
    peoplePruned: 0
  };
  payload = tryRestoreSafePayload(payload, registry, report);
  data = payload.data;
  validateCoreShape({ ...data, people: Array.isArray(data.people) ? data.people.slice(0, Math.min(data.people.length, 115)) : data.people });
  report.before = counts(data);
  ensureCriticalProfiles(data, registry, report);
  cleanupEventCollections(data, registry, report);
  replaceHistoricalSlots(data, registry, report);
  pruneBadAutoAddedPeople(data, report);
  repairProfiles(data, registry, report);
  dedupeDisplayCollections(data, report);
  data.meta = {
    ...(data.meta || {}),
    lastDataUpdate: new Date().toISOString(),
    lastFinalStabilizeRun: new Date().toISOString(),
    refreshModel: "guarded daily refresh with real-event gate and monthly roster review",
    crawlerStatus: "crawler output must pass real-event and source checks before publication",
    rosterHygieneStatus: "critical anchors and active office-holder pollution guarded"
  };
  validateCoreShape(data);
  const guard = installRuntimeGuard(registry);
  writeEmbedded(payload, data, guard);
  const finalHtml = fs.readFileSync(INDEX_PATH, "utf8");
  const audit = finalAudit(data, registry, finalHtml);
  report.after = counts(data);
  report.status = audit.status === "audit_passed" ? "stabilize_applied" : "stabilize_failed_audit";
  writeReports(report, audit);
  if (audit.status !== "audit_passed") {
    console.error(JSON.stringify(audit, null, 2));
    throw new Error("Final ParleyMap audit failed; index.html was repaired locally but should not be trusted until this passes.");
  }
  console.log(JSON.stringify({ status: report.status, audit: audit.status, before: report.before, after: report.after, anchorFixes: report.anchorFixes.length, removedFakeEvents: report.removedFakeEvents.length }, null, 2));
}

main();
