#!/usr/bin/env node
'use strict';

const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const INDEX_PATH = 'index.html';
const DEMO_PATH = 'data/demo.json';
const ANCHOR_PATH = 'data/curated-anchors.json';
const SEED_PATH = 'data/official-event-seeds.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const REPORT_PATH = 'data/diagnostics/canonical-governor-report.json';
const AUDIT_PATH = 'data/diagnostics/canonical-hard-audit-report.json';
const ADSENSE_REPORT_PATH = 'data/diagnostics/adsense-preserve-audit-report.json';

const DEMO_SCRIPT_RE = /<script\b(?=[^>]*\bid=["']demo-data["'])(?=[^>]*\btype=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/i;

const BANNED_EVENT_PATTERNS = [
  /IAEA\s+nuclear\s+diplomacy\s+watch/i,
  /City\s+of\s+London\s+finance\s+diplomacy\s+watch/i,
  /Think-?tank\s+leadership\s+events\s+watch/i,
  /Royal\s+diaries\s+and\s+state-visit\s+watch/i,
  /\bsource[-\s]?watch\b/i,
  /\bgeneric\s+watch\b/i,
  /\bhomepage\b/i,
  /\bFAQ\b/i,
  /\bfact\s+sheet\b/i,
  /\bprogramme\b/i,
  /\bprogram\b/i
];

const REQUIRED_COUNTS = {
  peopleMin: 90,
  peopleMaxSafe: 115,
  rosterMin: 190,
  expansionMin: 100,
  appearancesMin: 450,
  categoriesMin: 10
};

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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
  return norm(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractDemoFromHtml(html) {
  const match = html.match(DEMO_SCRIPT_RE);
  if (!match) return null;
  const start = match.index + match[0].indexOf(match[1]);
  const end = start + match[1].length;
  return {
    jsonText: match[1].trim(),
    jsonStart: start,
    jsonEnd: end,
    data: JSON.parse(match[1].trim())
  };
}

function replaceDemoJson(html, payload, data) {
  const nextJson = JSON.stringify(data, null, 2);
  return html.slice(0, payload.jsonStart) + '\n' + nextJson + '\n' + html.slice(payload.jsonEnd);
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

function isSafeDataShape(data, { allowPollutedPeople = false } = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!Array.isArray(data.people) || data.people.length < REQUIRED_COUNTS.peopleMin) return false;
  if (!allowPollutedPeople && data.people.length > REQUIRED_COUNTS.peopleMaxSafe) return false;
  if (!Array.isArray(data.roster) || data.roster.length < REQUIRED_COUNTS.rosterMin) return false;
  if (!Array.isArray(data.expansionRoster) || data.expansionRoster.length < REQUIRED_COUNTS.expansionMin) return false;
  if (!Array.isArray(data.appearances) || data.appearances.length < REQUIRED_COUNTS.appearancesMin) return false;
  if (!Array.isArray(data.categories) || data.categories.length < REQUIRED_COUNTS.categoriesMin) return false;
  return true;
}

function hasHistoricalPollution(data) {
  const text = JSON.stringify(data).slice(0, 20_000_000);
  return /Vincent\s+Auriol/i.test(text) || (Array.isArray(data.people) && data.people.length > REQUIRED_COUNTS.peopleMaxSafe);
}

function readCurrentIndexPayload() {
  const html = fs.existsSync(INDEX_PATH) ? fs.readFileSync(INDEX_PATH, 'utf8') : '';
  const extracted = extractDemoFromHtml(html);
  if (extracted) {
    return { html, extracted, source: 'current_index' };
  }
  return { html, extracted: null, source: 'missing_demo_data' };
}

function git(command) {
  return cp.execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function recoverSafeIndexFromHistory() {
  let shas = [];
  try {
    shas = git('git rev-list --max-count=200 HEAD -- index.html').split('\n').filter(Boolean);
  } catch {
    return null;
  }
  for (const sha of shas) {
    let html = '';
    try {
      html = git(`git show ${sha}:index.html`);
    } catch {
      continue;
    }
    const extracted = extractDemoFromHtml(html);
    if (!extracted) continue;
    if (!isSafeDataShape(extracted.data)) continue;
    if (hasHistoricalPollution(extracted.data)) continue;
    return { html, extracted, source: `git_history:${sha}` };
  }
  return null;
}

function chooseWorkingPayload() {
  const current = readCurrentIndexPayload();
  if (current.extracted && isSafeDataShape(current.extracted.data) && !hasHistoricalPollution(current.extracted.data)) {
    return current;
  }
  const recovered = recoverSafeIndexFromHistory();
  if (recovered) return recovered;
  if (current.extracted && isSafeDataShape(current.extracted.data, { allowPollutedPeople: true })) return current;
  throw new Error('No usable index.html demo-data found in current file or git history. Repair refused.');
}

function objectText(item) {
  return norm([
    item.id,
    item.slug,
    item.name,
    item.canonicalName,
    item.wikiTitle,
    item.wikidataId,
    item.roleTitle,
    item.organization,
    item.orgMark,
    item.countryName,
    item.countryFocus,
    item.countryFocusCode,
    item.profileLine,
    Array.isArray(item.profileLines) ? item.profileLines.join(' ') : ''
  ].join(' '));
}

function isEventLike(item) {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item) && (item.startsAt || item.eventType || item.sourcePack || item.venuePublic));
}

function isProfileLike(item) {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item) && !isEventLike(item) && (
    item.id || item.slug || item.name || item.canonicalName || item.wikiTitle || item.wikidataId || item.roleTitle || item.profileLine
  ));
}

function matchesTarget(item, target) {
  const text = objectText(item);
  if (Array.isArray(target.allowedIds) && target.allowedIds.some((id) => String(item.id || '') === id)) return true;
  if (Array.isArray(target.matchAll) && !target.matchAll.every((token) => text.includes(norm(token)))) return false;
  if (Array.isArray(target.matchAny) && !target.matchAny.some((token) => text.includes(norm(token)))) return false;
  return Boolean(target.matchAll || target.matchAny || target.allowedIds);
}

function anchorObject(base) {
  return {
    label: base.label,
    city: base.city,
    countryCode: base.countryCode,
    countryName: base.countryName,
    lat: base.lat,
    lng: base.lng,
    precision: 'city',
    type: 'institutional_base',
    privacy: 'city-level public institutional base only'
  };
}

function needsImageRepair(item) {
  const current = String(item.imageUrl || '').trim();
  if (!current) return true;
  return /placeholder|transparent|blank|missing|needs-review|needs_review/i.test(current);
}

function applyAnchorToProfile(item, target, changes, pathLabel) {
  const base = target.base;
  const anchor = anchorObject(base);
  const before = {
    countryFocus: item.countryFocus || null,
    countryFocusCode: item.countryFocusCode || null,
    countryName: item.countryName || item.country || null,
    flagAudit: item.flagAudit || null,
    homeBases: item.homeBases || null,
    lat: item.lat ?? item.latitude ?? item.mapLat ?? null,
    lng: item.lng ?? item.longitude ?? item.mapLng ?? null
  };

  item.countryFocus = base.countryCode;
  item.countryFocusCode = base.countryCode;
  item.countryCode = base.countryCode;
  item.countryName = base.countryName;
  item.country = base.countryName;
  item.homeRegion = base.region;
  item.locationStatus = 'institutional_base_city_level';
  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;
  item.baseLocation = anchor;
  item.institutionalBase = anchor;
  item.lat = base.lat;
  item.lng = base.lng;
  item.latitude = base.lat;
  item.longitude = base.lng;
  item.mapLat = base.lat;
  item.mapLng = base.lng;
  item.homeLat = base.lat;
  item.homeLng = base.lng;
  item.anchorLat = base.lat;
  item.anchorLng = base.lng;
  item.flagAudit = {
    ...(item.flagAudit || {}),
    code: base.countryCode,
    countryCode: base.countryCode,
    countryName: base.countryName,
    label: base.countryName,
    status: 'country flag'
  };
  item.flagCode = base.countryCode;
  item.countryFlagCode = base.countryCode;

  if (target.canonicalName) {
    item.canonicalName = item.canonicalName || target.canonicalName;
    item.name = item.name || target.canonicalName;
  }
  if (target.organization) item.organization = target.organization;
  if (target.orgMark) item.orgMark = target.orgMark;
  item.profileDedupKey = target.key;
  item.anchorAuditStatus = 'canonical_anchor_repaired';

  if (target.imageUrl && needsImageRepair(item)) {
    item.imageUrl = target.imageUrl;
    item.imageProvider = 'Wikimedia Commons Special:FilePath curated fallback';
    item.visualAuditStatus = 'curated_public_image_fallback';
    item.imageAudit = {
      ...(item.imageAudit || {}),
      status: 'curated_public_image_fallback',
      repairedAt: new Date().toISOString()
    };
  }

  changes.anchorRepairs.push({
    path: pathLabel,
    key: target.key,
    id: item.id || null,
    name: item.canonicalName || item.name || null,
    from: before,
    to: {
      city: base.city,
      countryCode: base.countryCode,
      countryName: base.countryName,
      lat: base.lat,
      lng: base.lng
    }
  });
}

function walk(value, visitor, pathLabel = 'data') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, visitor, `${pathLabel}[${index}]`));
    return;
  }
  visitor(value, pathLabel);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') walk(child, visitor, `${pathLabel}.${key}`);
  }
}

function rowTitleText(item) {
  return [item.title, item.summary, item.name, item.label, item.description, item.status, item.eventType].filter(Boolean).join(' ');
}

function isFakeEventRow(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const text = rowTitleText(item);
  const hasDate = Boolean(item.startsAt || item.date || item.eventDate || item.startDate);
  const isEventShape = hasDate || item.eventType || item.sourcePack || item.location;
  if (!isEventShape) return false;
  if (BANNED_EVENT_PATTERNS.some((re) => re.test(text))) return true;
  if (/watch/i.test(text) && hasDate) return true;
  if (/source[-\s]?watch/i.test(String(item.status || '')) && hasDate) return true;
  return false;
}

function filterArraysDeep(value, changes, pathLabel = 'data') {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const out = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (isFakeEventRow(item)) {
        changes.fakeEventsRemoved.push({ path: `${pathLabel}[${i}]`, id: item.id || null, title: item.title || item.name || item.label || null });
        continue;
      }
      out.push(filterArraysDeep(item, changes, `${pathLabel}[${i}]`));
    }
    return out;
  }
  for (const key of Object.keys(value)) {
    if (value[key] && typeof value[key] === 'object') {
      value[key] = filterArraysDeep(value[key], changes, `${pathLabel}.${key}`);
    }
  }
  return value;
}

function removeDuplicateIdsWithinCollections(data, changes) {
  const collections = ['people', 'roster', 'topRoster', 'expansionRoster', 'priorityExpansion', 'watchlistExamples'];
  for (const collection of collections) {
    if (!Array.isArray(data[collection])) continue;
    const seen = new Set();
    const next = [];
    data[collection].forEach((item, index) => {
      const id = item && item.id ? String(item.id) : '';
      if (id && seen.has(id)) {
        changes.profileDuplicatesRemoved.push({ collection, index, id, name: item.canonicalName || item.name || null, reason: 'duplicate_id_within_collection' });
        return;
      }
      if (id) seen.add(id);
      next.push(item);
    });
    data[collection] = next;
  }
}

function suppressGrossiHelperRows(data, changes) {
  const helperCollections = ['topRoster', 'watchlistExamples', 'priorityExpansion', 'openCatalogs'];
  const grossiRe = /rafael\s+grossi/i;
  for (const collection of helperCollections) {
    if (!Array.isArray(data[collection])) continue;
    const beforeLength = data[collection].length;
    data[collection] = data[collection].filter((item, index) => {
      const text = [item?.id, item?.slug, item?.name, item?.canonicalName, item?.wikiTitle].join(' ');
      if (grossiRe.test(text)) {
        changes.profileDuplicatesRemoved.push({ collection, index, id: item.id || null, name: item.canonicalName || item.name || null, reason: 'grossi_helper_row_suppressed' });
        return false;
      }
      return true;
    });
    if (beforeLength !== data[collection].length) {
      // Do not pad helper collections. They are not core count-gated collections.
    }
  }
}

function targetPersonId(data, target) {
  const rows = [];
  for (const collection of ['people', 'roster', 'topRoster', 'expansionRoster']) {
    if (Array.isArray(data[collection])) rows.push(...data[collection]);
  }
  const found = rows.find((item) => isProfileLike(item) && matchesTarget(item, target));
  return found?.id || found?.personId || null;
}

function normalizeAppearance(seed, personId, nowIso) {
  return {
    id: seed.id,
    personId,
    startsAt: seed.startsAt,
    endsAt: seed.endsAt ?? null,
    status: seed.status || 'VERIFIED_PAST',
    confidence: 0.94,
    confidenceLabel: 'official public source',
    eventType: seed.eventType || 'OFFICIAL_PUBLIC_EVENT',
    title: seed.title,
    summary: seed.summary,
    significance: seed.significance || 'Official public event.',
    decisions: seed.decisions || '',
    location: seed.location,
    venuePublic: true,
    securityPrecision: 'city-level public event only; no private stops, hotels, residences, leaked routes or live proximity',
    publicInterestScore: 70,
    eventGroupId: seed.eventGroupId || `eg-${slug(seed.location.city)}-${String(seed.startsAt).slice(0, 10)}`,
    topics: Array.isArray(seed.topics) ? seed.topics : [],
    counterpartIds: Array.isArray(seed.counterpartIds) ? seed.counterpartIds : [],
    sourcePack: seed.sourcePack,
    visual: seed.visual || { status: 'official-source event', policy: 'Use audited public media only.' },
    lastCheckedAt: nowIso,
    marketImpact: seed.marketImpact || { sectors: [], companies: [], countries: [seed.location.countryName], confidence: 'low' },
    realEvent: true,
    crawler: { rule: 'official-event-seed', detectedAt: nowIso }
  };
}

function addOfficialEvents(data, anchors, changes) {
  const seeds = readJsonIfExists(SEED_PATH, { events: [] }).events || [];
  if (!Array.isArray(data.appearances)) data.appearances = [];
  const existingIds = new Set(data.appearances.map((a) => String(a.id || '')));
  const nowIso = new Date().toISOString();
  for (const seed of seeds) {
    const target = anchors.targets.find((t) => t.key === seed.personKey);
    if (!target) continue;
    const personId = targetPersonId(data, target);
    if (!personId) {
      changes.officialEventsSkipped.push({ id: seed.id, reason: 'person_not_found', personKey: seed.personKey });
      continue;
    }
    if (existingIds.has(seed.id)) continue;
    const appearance = normalizeAppearance(seed, personId, nowIso);
    data.appearances.push(appearance);
    existingIds.add(seed.id);
    changes.officialEventsAdded.push({ id: seed.id, personId, title: seed.title, city: seed.location.city });
  }
  data.appearances.sort((a, b) => String(b.startsAt || '').localeCompare(String(a.startsAt || '')));
}

function repairDataset(data) {
  const anchors = readJsonIfExists(ANCHOR_PATH, { targets: [] });
  const changes = {
    anchorRepairs: [],
    fakeEventsRemoved: [],
    profileDuplicatesRemoved: [],
    officialEventsAdded: [],
    officialEventsSkipped: [],
    adsense: null
  };
  const before = counts(data);

  filterArraysDeep(data, changes, 'data');
  removeDuplicateIdsWithinCollections(data, changes);

  walk(data, (item, pathLabel) => {
    if (!isProfileLike(item)) return;
    const target = anchors.targets.find((t) => matchesTarget(item, t));
    if (!target) return;
    applyAnchorToProfile(item, target, changes, pathLabel);
  });

  suppressGrossiHelperRows(data, changes);
  addOfficialEvents(data, anchors, changes);

  data.meta = {
    ...(data.meta || {}),
    lastCanonicalGovernorRun: new Date().toISOString(),
    canonicalGovernorStatus: `anchors repaired ${changes.anchorRepairs.length}, fake events removed ${changes.fakeEventsRemoved.length}, official events added ${changes.officialEventsAdded.length}`,
    lastDataUpdate: new Date().toISOString()
  };

  const after = counts(data);
  return { changes, before, after };
}

function findAdsenseInText(text) {
  const clients = [...String(text).matchAll(/ca-pub-\d{10,25}/g)].map((m) => m[0]);
  const pubs = [...String(text).matchAll(/\bpub-\d{10,25}\b/g)].map((m) => m[0]);
  const slots = [...String(text).matchAll(/data-ad-slot=["']([^"']+)["']/g)].map((m) => m[1]).filter(Boolean);
  return { clients, pubs, slots };
}

function recoverAdsenseIds(currentHtml, inputs = {}) {
  const found = { clients: [], pubs: [], slots: [] };
  const collect = (text) => {
    const res = findAdsenseInText(text || '');
    found.clients.push(...res.clients);
    found.pubs.push(...res.pubs);
    found.slots.push(...res.slots);
  };
  collect(currentHtml);
  for (const file of ['ads.txt', 'index.template.html', 'privacy.html', 'impressum.html']) {
    if (fs.existsSync(file)) collect(fs.readFileSync(file, 'utf8'));
  }
  try {
    const shas = git('git rev-list --max-count=100 HEAD').split('\n').filter(Boolean);
    for (const sha of shas) {
      for (const file of ['index.html', 'ads.txt', 'index.template.html']) {
        try { collect(git(`git show ${sha}:${file}`)); } catch {}
      }
      if (found.clients.length && found.slots.length >= 2) break;
    }
  } catch {}

  let client = String(inputs.publisher_id || process.env.PARLEYMAP_ADSENSE_CLIENT || '').trim();
  if (client && /^pub-\d+$/.test(client)) client = `ca-${client}`;
  if (!client) client = [...new Set(found.clients)][0] || '';
  let publisherId = client ? client.replace(/^ca-/, '') : '';
  if (!publisherId) publisherId = String(inputs.publisher_id || '').replace(/^ca-/, '');
  if (!publisherId) publisherId = [...new Set(found.pubs)][0] || '';
  if (!client && publisherId) client = `ca-${publisherId}`;

  const headerSlot = String(inputs.header_slot_id || process.env.PARLEYMAP_ADSENSE_HEADER_SLOT || '').trim() || [...new Set(found.slots)][0] || '';
  const sidebarSlot = String(inputs.sidebar_slot_id || process.env.PARLEYMAP_ADSENSE_SIDEBAR_SLOT || '').trim() || [...new Set(found.slots)].filter((s) => s !== headerSlot)[0] || '';

  return { client, publisherId, headerSlot, sidebarSlot, recovered: found };
}

function installAdsense(html, ads, requireReady) {
  const report = {
    status: 'adsense_not_required',
    client: ads.client || null,
    publisherId: ads.publisherId || null,
    headerSlot: ads.headerSlot || null,
    sidebarSlot: ads.sidebarSlot || null,
    adsTxtWritten: false,
    metaInserted: false,
    loaderInserted: false,
    unitGuardInserted: false
  };
  if (!ads.client || !ads.publisherId || !ads.headerSlot || !ads.sidebarSlot) {
    report.status = 'adsense_ids_not_found_no_fake_ids_injected';
    ensureDir(ADSENSE_REPORT_PATH);
    fs.writeFileSync(ADSENSE_REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
    if (requireReady) throw new Error('AdSense IDs not recoverable. Refusing to inject fake IDs. Rerun with publisher_id, header_slot_id and sidebar_slot_id inputs.');
    return { html, report };
  }

  if (!/google-adsense-account/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<meta name="google-adsense-account" content="${ads.client}">`);
    report.metaInserted = true;
  }
  if (!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>`);
    report.loaderInserted = true;
  }
  if (!/PARLEYMAP_ADSENSE_UNIT_GUARD/.test(html)) {
    const guard = `\n<script id="parleymap-adsense-unit-guard">\n(function(){\n  window.PARLEYMAP_ADSENSE_UNIT_GUARD = true;\n  var client = ${JSON.stringify(ads.client)};\n  var headerSlot = ${JSON.stringify(ads.headerSlot)};\n  var sidebarSlot = ${JSON.stringify(ads.sidebarSlot)};\n  function makeUnit(slot, label){\n    var ins = document.createElement('ins');\n    ins.className = 'adsbygoogle parleymap-adsense-unit';\n    ins.style.display = 'block';\n    ins.setAttribute('data-ad-client', client);\n    ins.setAttribute('data-ad-slot', slot);\n    ins.setAttribute('data-ad-format', 'auto');\n    ins.setAttribute('data-full-width-responsive', 'true');\n    ins.setAttribute('aria-label', label);\n    return ins;\n  }\n  function mount(selector, slot, label){\n    var target = document.querySelector(selector);\n    if (!target) return false;\n    if (target.querySelector('ins.adsbygoogle[data-ad-slot="' + slot + '"]')) return true;\n    target.innerHTML = '';\n    target.appendChild(makeUnit(slot, label));\n    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}\n    return true;\n  }\n  function run(){\n    mount('[data-ad-zone="header"], #ad-header, .ad-header, .pm-ad-header, .ad-slot-header', headerSlot, 'ParleyMap Header ad');\n    mount('[data-ad-zone="sidebar"], #ad-sidebar, .ad-sidebar, .pm-ad-sidebar, .ad-slot-sidebar', sidebarSlot, 'ParleyMap Sidebar ad');\n  }\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();\n  setTimeout(run, 1000);\n  setTimeout(run, 3000);\n})();\n</script>\n`;
    html = html.replace(/<\/body>/i, `${guard}\n</body>`);
    report.unitGuardInserted = true;
  }
  fs.writeFileSync('ads.txt', `google.com, ${ads.publisherId}, DIRECT, f08c47fec0942fa0\n`);
  report.adsTxtWritten = true;
  report.status = 'adsense_preserved_and_audited';
  ensureDir(ADSENSE_REPORT_PATH);
  fs.writeFileSync(ADSENSE_REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
  return { html, report };
}

function writeLegalPages() {
  const pages = {
    'privacy.html': `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy | ParleyMap</title></head><body><main><h1>Privacy Policy</h1><p>ParleyMap publishes public-source relationship, travel and event intelligence. The service does not publish private addresses, private residences, hotels, hospitals, leaked itineraries or live routes.</p><h2>Advertising</h2><p>ParleyMap may use Google AdSense. Google and its partners may use cookies or similar technologies to serve and measure ads. Users can manage ad personalization through Google advertising settings.</p><h2>Analytics and logs</h2><p>Basic server and analytics logs may be used to operate and improve the service.</p><h2>Contact</h2><p>For privacy questions, contact the site operator through the contact page.</p></main></body></html>\n`,
    'impressum.html': `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Impressum | ParleyMap</title></head><body><main><h1>Impressum</h1><p>ParleyMap is an editorial and analytical public-source web application.</p><p>For legal notices, editorial corrections, and contact requests, use the contact page.</p><p>No private tracking, leaked itineraries, private residences, hotels, hospitals, or live routes are published.</p></main></body></html>\n`,
    'about.html': `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About | ParleyMap</title></head><body><main><h1>About ParleyMap</h1><p>ParleyMap maps public appearances, official meetings, summits and source-backed public events for global public figures and institutions.</p></main></body></html>\n`,
    'methodology.html': `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Methodology | ParleyMap</title></head><body><main><h1>Methodology</h1><p>Events require a person, date, city-level location, public event title and official or host-public source. Generic watch cards, homepages, biographies, FAQs and topic pages are not treated as events.</p></main></body></html>\n`,
    'data-sources.html': `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Data Sources | ParleyMap</title></head><body><main><h1>Data Sources</h1><p>ParleyMap uses official public sources including institutional press releases, summit agendas, official travel pages, government schedules, host-public event pages and public statements.</p></main></body></html>\n`,
    'contact.html': `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact | ParleyMap</title></head><body><main><h1>Contact</h1><p>For corrections or inquiries, contact the site operator through the repository or listed project contact channel.</p></main></body></html>\n`
  };
  for (const [file, html] of Object.entries(pages)) fs.writeFileSync(file, html);
}

function installRuntimeDataGuard(html) {
  if (/PARLEYMAP_CANONICAL_RUNTIME_GUARD/.test(html)) return html;
  const script = `\n<script id="parleymap-canonical-runtime-guard">\n(function(){\n  window.PARLEYMAP_CANONICAL_RUNTIME_GUARD = true;\n  var anchors = {\n    'rafael grossi': {city:'Vienna', countryCode:'AT', countryName:'Austria', lat:48.2082, lng:16.3738},\n    'pope leo xiv': {city:'Vatican City', countryCode:'VA', countryName:'Vatican City', lat:41.9029, lng:12.4534},\n    'claudia sheinbaum': {city:'Mexico City', countryCode:'MX', countryName:'Mexico', lat:19.4326, lng:-99.1332},\n    'prabowo subianto': {city:'Jakarta', countryCode:'ID', countryName:'Indonesia', lat:-6.2088, lng:106.8456}\n  };\n  function norm(x){ return String(x||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }\n  function keyFor(o){ var t=norm([o && o.id,o && o.slug,o && o.name,o && o.canonicalName,o && o.title,o && o.personName].join(' ')); return Object.keys(anchors).find(function(k){ return t.indexOf(k)>-1 || (k==='pope leo xiv' && /pope|leo xiv|prevost/.test(t)); }); }\n  function patch(o){ var k=keyFor(o); if(!k) return o; var a=anchors[k]; o.location=o.location||{}; if(!o.startsAt){ o.countryFocusCode=a.countryCode; o.countryFocus=a.countryCode; o.countryName=a.countryName; o.homeBases=[{label:a.city+' institutional base',city:a.city,countryCode:a.countryCode,countryName:a.countryName,lat:a.lat,lng:a.lng,precision:'city',type:'institutional_base'}]; } o.mapAnchor={city:a.city,countryCode:a.countryCode,countryName:a.countryName,lat:a.lat,lng:a.lng}; if(!o.startsAt){ o.lat=a.lat; o.lng=a.lng; o.mapLat=a.lat; o.mapLng=a.lng; } return o; }\n  try {\n    var tag=document.getElementById('demo-data');\n    if(tag && tag.textContent){ var data=JSON.parse(tag.textContent); var seen={}; function walk(v){ if(!v||typeof v!=='object') return; if(Array.isArray(v)){ for(var i=v.length-1;i>=0;i--){ var it=v[i]; patch(it); var k=keyFor(it); if(k && !it.startsAt){ var id=k+'|'+(it.id||it.slug||it.canonicalName||it.name||''); if(seen[id]){ v.splice(i,1); continue; } seen[id]=true; } walk(it); } } else { patch(v); Object.keys(v).forEach(function(x){ walk(v[x]); }); } } walk(data); tag.textContent=JSON.stringify(data); }\n  } catch(e) { console.warn('ParleyMap runtime canonical guard failed', e); }\n})();\n</script>\n`;
  if (/<script\b(?=[^>]*\bid=["']demo-data["'])/i.test(html)) {
    return html.replace(/(<script\b(?=[^>]*\bid=["']demo-data["'])(?=[^>]*\btype=["']application\/json["'])[^>]*>[\s\S]*?<\/script>)/i, `$1\n${script}`);
  }
  return html.replace(/<\/body>/i, `${script}\n</body>`);
}

function auditDataset(data) {
  const anchors = readJsonIfExists(ANCHOR_PATH, { targets: [] });
  const failures = [];
  if (!isSafeDataShape(data, { allowPollutedPeople: true })) failures.push('core_count_or_shape_failure');
  if (Array.isArray(data.people) && data.people.length > REQUIRED_COUNTS.peopleMaxSafe) failures.push(`people_count_polluted:${data.people.length}`);
  if (hasHistoricalPollution(data)) failures.push('historical_active_holder_pollution');

  const matchingProfiles = (target) => {
    const rows = [];
    walk(data, (item, pathLabel) => {
      if (isProfileLike(item) && matchesTarget(item, target)) rows.push({ item, path: pathLabel });
    });
    return rows;
  };

  for (const key of ['rafael_grossi', 'pope_leo_xiv', 'claudia_sheinbaum', 'prabowo_subianto']) {
    const target = anchors.targets.find((t) => t.key === key);
    if (!target) { failures.push(`missing_anchor_target:${key}`); continue; }
    const rows = matchingProfiles(target);
    if (!rows.length) { failures.push(`no_profile_match:${key}`); continue; }
    for (const { item, path } of rows) {
      const code = String(item.countryFocusCode || item.countryFocus || item.countryCode || '').toUpperCase();
      const base = target.base;
      const lat = Number(item.mapAnchor?.lat ?? item.homeBases?.[0]?.lat ?? item.lat ?? item.latitude);
      const lng = Number(item.mapAnchor?.lng ?? item.homeBases?.[0]?.lng ?? item.lng ?? item.longitude);
      const isClose = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat - base.lat) < 0.3 && Math.abs(lng - base.lng) < 0.3;
      if (code !== base.countryCode) failures.push(`bad_code:${key}:${path}:${code}`);
      if (!isClose) failures.push(`bad_anchor:${key}:${path}:${lat},${lng}`);
      if (key === 'rafael_grossi') {
        const text = JSON.stringify(item);
        if (/"countryFocusCode"\s*:\s*"IA"|"countryFocus"\s*:\s*"IA"|"code"\s*:\s*"BI"|"label"\s*:\s*"BIS"/i.test(text)) failures.push(`grossi_ia_bi_contamination:${path}`);
      }
    }
  }

  const grossiHelpers = [];
  for (const collection of ['topRoster', 'watchlistExamples', 'priorityExpansion', 'openCatalogs']) {
    if (!Array.isArray(data[collection])) continue;
    data[collection].forEach((item, index) => {
      if (/rafael\s+grossi/i.test([item?.id, item?.slug, item?.name, item?.canonicalName, item?.title].join(' '))) grossiHelpers.push(`${collection}[${index}]`);
    });
  }
  if (grossiHelpers.length) failures.push(`grossi_visible_helper_rows:${grossiHelpers.join(',')}`);

  walk(data, (item, pathLabel) => {
    if (isFakeEventRow(item)) failures.push(`fake_event_row:${pathLabel}:${item.title || item.name || item.label || item.id || 'unknown'}`);
  });

  return { status: failures.length ? 'audit_failed' : 'audit_passed', failures, counts: counts(data), generatedAt: new Date().toISOString() };
}

function runRepair(options) {
  ensureDir(REPORT_PATH);
  const chosen = chooseWorkingPayload();
  let html = chosen.html;
  let extracted = chosen.extracted;
  const data = extracted.data;
  const repair = repairDataset(data);
  const audit = auditDataset(data);
  if (audit.status !== 'audit_passed') {
    ensureDir(AUDIT_PATH);
    fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n');
    throw new Error(`Hard audit failed: ${audit.failures.join('; ')}`);
  }

  html = replaceDemoJson(html, extracted, data);
  html = installRuntimeDataGuard(html);
  const ads = recoverAdsenseIds(html, options);
  const adsense = installAdsense(html, ads, Boolean(options.require_adsense_ready));
  html = adsense.html;
  repair.changes.adsense = adsense.report;
  writeLegalPages();

  fs.writeFileSync(INDEX_PATH, html);
  ensureDir(DEMO_PATH);
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + '\n');

  // Re-extract after write and audit again.
  const postHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const postExtracted = extractDemoFromHtml(postHtml);
  if (!postExtracted) throw new Error('Post-write index.html no longer contains demo-data. Refusing commit.');
  const postAudit = auditDataset(postExtracted.data);
  ensureDir(AUDIT_PATH);
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(postAudit, null, 2) + '\n');
  if (postAudit.status !== 'audit_passed') throw new Error(`Post-write hard audit failed: ${postAudit.failures.join('; ')}`);

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'canonical_governor_repair_applied',
    indexSource: chosen.source,
    before: repair.before,
    after: repair.after,
    changes: repair.changes,
    audit: postAudit,
    adsense: adsense.report
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
  buildSummary(report);
  return report;
}

function buildSummary(report) {
  const lines = [];
  lines.push('# ParleyMap canonical governor');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status}`);
  lines.push(`Index source: ${report.indexSource}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Dataset | Before | After |');
  lines.push('|---|---:|---:|');
  for (const key of ['people', 'roster', 'topRoster', 'expansionRoster', 'appearances', 'categories']) {
    lines.push(`| ${key} | ${report.before[key] ?? 'n/a'} | ${report.after[key] ?? 'n/a'} |`);
  }
  lines.push('');
  lines.push('## Repairs');
  lines.push('');
  lines.push(`- Anchor repairs: ${report.changes.anchorRepairs.length}`);
  lines.push(`- Fake event rows removed: ${report.changes.fakeEventsRemoved.length}`);
  lines.push(`- Profile duplicates removed: ${report.changes.profileDuplicatesRemoved.length}`);
  lines.push(`- Official events added: ${report.changes.officialEventsAdded.length}`);
  lines.push(`- AdSense status: ${report.adsense.status}`);
  if (report.adsense.client) lines.push(`- AdSense client: ${report.adsense.client}`);
  if (report.adsense.headerSlot) lines.push(`- Header slot: ${report.adsense.headerSlot}`);
  if (report.adsense.sidebarSlot) lines.push(`- Sidebar slot: ${report.adsense.sidebarSlot}`);
  lines.push('');
  lines.push('## Audit');
  lines.push('');
  lines.push(`- Hard audit: ${report.audit.status}`);
  if (report.audit.failures.length) report.audit.failures.forEach((f) => lines.push(`- ${f}`));
  ensureDir(SUMMARY_PATH);
  fs.writeFileSync(SUMMARY_PATH, lines.join('\n') + '\n');
}

function runAuditOnly() {
  const chosen = chooseWorkingPayload();
  const audit = auditDataset(chosen.extracted.data);
  ensureDir(AUDIT_PATH);
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n');
  console.log(JSON.stringify(audit, null, 2));
  if (audit.status !== 'audit_passed') process.exit(1);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-/g, '_');
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      options[key] = value === 'true' ? true : value === 'false' ? false : value;
    }
  }
  return options;
}

const mode = process.argv[2] || 'repair';
const options = parseArgs(process.argv.slice(3));
try {
  if (mode === 'repair') {
    const report = runRepair(options);
    console.log(JSON.stringify({ status: report.status, audit: report.audit.status, adsense: report.adsense.status }, null, 2));
  } else if (mode === 'audit') {
    runAuditOnly();
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
} catch (error) {
  console.error(error.stack || error.message || error);
  process.exit(1);
}
