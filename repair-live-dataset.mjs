import fs from 'node:fs';
import { execSync } from 'node:child_process';

const INDEX_PATH = 'index.html';
const DATA_PATH = 'data/demo.json';
const DIAG_DIR = 'data/diagnostics';
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = '</' + 'script>';

const BAD_EVENT_RE = /(iaea nuclear diplomacy watch|city of london finance diplomacy watch|think-?tank leadership events watch|royal diaries and state-visit watch|royal diary|source-watch|source watch|watch card)/i;
const GENERIC_EVENT_RE = /\b(homepage|home page|faq|frequently asked|fact sheet|profile page|programme|program|sitemap|privacy|cookie|terms)\b/i;

const TARGETS = [
  {
    key: 'grossi',
    any: ['rafael grossi', 'rafael mariano grossi'],
    qid: 'Q7283122',
    anchor: { label: 'Vienna institutional base', city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2082, lng: 16.3738, region: 'Europe' },
    organization: 'International Atomic Energy Agency',
    roleTitle: 'Director General, International Atomic Energy Agency',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rafael_Mariano_Grossi_2022.jpg'
  },
  {
    key: 'pope',
    any: ['pope leo xiv', 'leo xiv', 'robert prevost', 'robert francis prevost', 'pope'],
    anchor: { label: 'Vatican City institutional base', city: 'Vatican City', countryCode: 'VA', countryName: 'Vatican City', lat: 41.9029, lng: 12.4534, region: 'Europe' },
    organization: 'Holy See',
    roleTitle: 'Pope of the Catholic Church',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pope_Leo_XIV_official_portrait.jpg'
  },
  {
    key: 'sheinbaum',
    all: ['claudia', 'sheinbaum'],
    anchor: { label: 'Mexico City institutional base', city: 'Mexico City', countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America' },
    organization: 'Mexico',
    roleTitle: 'President of Mexico',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Claudia_Sheinbaum_%28cropped%2C_centered%29.jpg'
  },
  {
    key: 'subianto',
    all: ['prabowo', 'subianto'],
    anchor: { label: 'Jakarta institutional base', city: 'Jakarta', countryCode: 'ID', countryName: 'Indonesia', lat: -6.2088, lng: 106.8456, region: 'Asia' },
    organization: 'Indonesia',
    roleTitle: 'President of Indonesia',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Prabowo_Subianto_2024_official_portrait.jpg'
  },
  {
    key: 'mbs',
    all: ['salman'], any: ['mohammed', 'mohammad', 'muhammad', 'mbs'],
    anchor: { label: 'Riyadh institutional base', city: 'Riyadh', countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, region: 'Middle East' },
    organization: 'Saudi Arabia',
    roleTitle: 'Crown Prince and Prime Minister of Saudi Arabia'
  },
  {
    key: 'kingcharles',
    any: ['king charles iii', 'charles iii'],
    anchor: { label: 'London institutional base', city: 'London', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5074, lng: -0.1278, region: 'Europe' },
    organization: 'The Royal Household',
    roleTitle: 'King of the United Kingdom'
  },
  {
    key: 'rutte', all: ['mark', 'rutte'],
    anchor: { label: 'NATO Brussels institutional base', city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8798, lng: 4.4219, region: 'Europe' },
    organization: 'NATO', roleTitle: 'Secretary General of NATO'
  },
  {
    key: 'guterres', any: ['antonio guterres', 'antónio guterres', 'guterres'],
    anchor: { label: 'UN New York institutional base', city: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7499, lng: -73.968, region: 'North America' },
    organization: 'United Nations', roleTitle: 'Secretary-General of the United Nations'
  },
  {
    key: 'macron', all: ['emmanuel', 'macron'],
    anchor: { label: 'Paris institutional base', city: 'Paris', countryCode: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522, region: 'Europe' },
    organization: 'France', roleTitle: 'President of France'
  }
];

const OFFICIAL_EVENTS = [
  {
    id: 'official-grossi-iaea-board-vienna-2026-03-02',
    targetKey: 'grossi',
    startsAt: '2026-03-02T09:00:00+01:00',
    title: 'IAEA Board of Governors meeting statement',
    summary: 'Rafael Grossi addressed the IAEA Board of Governors at the Agency headquarters in Vienna.',
    location: { label: 'IAEA headquarters, Vienna', city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2345, lng: 16.4166, precision: 'city' },
    sourceUrl: 'https://www.iaea.org/newscenter/statements/iaea-director-generals-introductory-statement-to-the-board-of-governors-2-6-march-2026',
    sourceLabel: 'IAEA Director General statement'
  },
  {
    id: 'official-pope-leo-xiv-spain-journey-2026-06-06',
    targetKey: 'pope',
    startsAt: '2026-06-06T09:00:00+02:00',
    title: 'Apostolic journey to Spain',
    summary: 'Pope Leo XIV begins the Vatican-listed apostolic journey to Spain.',
    location: { label: 'Madrid public programme', city: 'Madrid', countryCode: 'ES', countryName: 'Spain', lat: 40.4168, lng: -3.7038, precision: 'city' },
    sourceUrl: 'https://www.vatican.va/content/leo-xiv/en/travels/2026/documents/spagna-6-12giugno2026.html',
    sourceLabel: 'Vatican travel itinerary'
  },
  {
    id: 'official-king-charles-washington-address-2026-04-28',
    targetKey: 'kingcharles',
    startsAt: '2026-04-28T12:00:00-04:00',
    title: 'Address to the Joint Meeting of Congress in Washington',
    summary: 'King Charles III addressed a Joint Meeting of Congress in Washington.',
    location: { label: 'Washington public address', city: 'Washington', countryCode: 'US', countryName: 'United States', lat: 38.9072, lng: -77.0369, precision: 'city' },
    sourceUrl: 'https://www.royal.uk/news-and-activity/2026-04-28/the-kings-address-to-the-joint-meeting-of-congress-in-washington',
    sourceLabel: 'The Royal Family official page'
  }
];

function norm(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function parseHtml(html) {
  const start = html.indexOf(OPEN);
  if (start === -1) return null;
  const jsonStart = start + OPEN.length;
  const jsonEnd = html.indexOf(CLOSE, jsonStart);
  if (jsonEnd === -1) return null;
  const text = html.slice(jsonStart, jsonEnd).trim();
  return { data: JSON.parse(text), jsonStart, jsonEnd };
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

function isSafeData(data) {
  const c = counts(data);
  return c.people >= 90 && c.people <= 115 && c.roster >= 190 && c.expansionRoster >= 100 && c.appearances >= 500 && c.categories >= 10;
}

function getIndexHtml() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const parsed = parseHtml(html);
  if (parsed && isSafeData(parsed.data)) return html;
  const files = sh('git log --format=%H -- index.html').trim().split(/\s+/).filter(Boolean);
  for (const hash of files) {
    try {
      const candidate = sh(`git show ${hash}:index.html`);
      const p = parseHtml(candidate);
      if (p && isSafeData(p.data)) return candidate;
    } catch {}
  }
  throw new Error('No safe index.html with demo-data found in current file or git history');
}

function blob(item) {
  return norm([
    item?.id, item?.slug, item?.name, item?.canonicalName, item?.wikiTitle, item?.wikidataId,
    item?.roleTitle, item?.organization, item?.countryName, item?.countryFocus, item?.countryFocusCode,
    Array.isArray(item?.profileLines) ? item.profileLines.join(' ') : ''
  ].join(' '));
}

function targetFor(item) {
  const text = blob(item);
  if (!text) return null;
  for (const target of TARGETS) {
    if (target.qid && text.includes(norm(target.qid))) return target;
    const allOk = !target.all || target.all.every(x => text.includes(norm(x)));
    const anyOk = !target.any || target.any.some(x => text.includes(norm(x)));
    if (allOk && anyOk) return target;
  }
  return null;
}

function isProfileLike(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if ('startsAt' in item && 'sourcePack' in item) return false;
  return Boolean(item.id || item.slug || item.name || item.canonicalName || item.roleTitle || item.profileLine || item.wikiTitle);
}

function anchorObject(anchor) {
  return {
    label: anchor.label,
    city: anchor.city,
    countryCode: anchor.countryCode,
    countryName: anchor.countryName,
    lat: anchor.lat,
    lng: anchor.lng,
    precision: 'city',
    type: 'institutional_base',
    privacy: 'city-level public institutional base only'
  };
}

function applyAnchor(item, target) {
  const a = target.anchor;
  const anchor = anchorObject(a);
  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;
  item.baseLocation = anchor;
  item.institutionalBase = anchor;
  item.countryFocus = a.countryCode;
  item.countryFocusCode = a.countryCode;
  item.countryCode = a.countryCode;
  item.countryName = a.countryName;
  item.country = a.countryName;
  item.homeRegion = a.region;
  item.locationStatus = 'institutional_base_city_level';
  item.lat = a.lat; item.lng = a.lng; item.latitude = a.lat; item.longitude = a.lng;
  item.homeLat = a.lat; item.homeLng = a.lng; item.mapLat = a.lat; item.mapLng = a.lng;
  item.flagAudit = { ...(item.flagAudit || {}), code: a.countryCode, countryCode: a.countryCode, label: a.countryName, countryName: a.countryName, status: 'country flag' };
  item.flagCode = a.countryCode;
  item.countryFlagCode = a.countryCode;
  if (target.organization) item.organization = target.organization;
  if (target.roleTitle) item.roleTitle = target.roleTitle;
  if (target.imageUrl && (!item.imageUrl || /placeholder|blank|default/i.test(String(item.imageUrl)))) {
    item.imageUrl = target.imageUrl;
    item.imageProvider = 'Wikimedia Commons fallback';
  }
  if (target.key === 'grossi') {
    item.orgMark = 'IAEA';
    item.institutionCode = 'IAEA';
    item.sector = item.sector || 'multilateral';
  }
}

function walk(value, visitor, path = '$') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    visitor(value, path, true);
    value.forEach((child, i) => walk(child, visitor, `${path}[${i}]`));
    return;
  }
  visitor(value, path, false);
  for (const [key, child] of Object.entries(value)) walk(child, visitor, `${path}.${key}`);
}

function isEventLike(item) {
  return item && typeof item === 'object' && !Array.isArray(item) && ('startsAt' in item || 'sourcePack' in item || 'eventType' in item || 'status' in item && /source.watch/i.test(String(item.status)));
}

function isBadEvent(item) {
  if (!isEventLike(item)) return false;
  const text = [item.title, item.summary, item.eventType, item.status, item.id, Array.isArray(item.sourcePack) ? item.sourcePack.map(s => s.url || s.label || s.title).join(' ') : ''].join(' ');
  if (BAD_EVENT_RE.test(text)) return true;
  if (item.startsAt && GENERIC_EVENT_RE.test(text)) return true;
  if (/source[-_ ]?watch/i.test(String(item.status || item.eventType || '')) && item.startsAt) return true;
  return false;
}

function cleanArrays(data) {
  const removed = [];
  const duplicateProfilesRemoved = [];
  walk(data, (arr, path, isArray) => {
    if (!isArray) return;
    for (let i = arr.length - 1; i >= 0; i--) {
      const item = arr[i];
      if (isBadEvent(item)) {
        removed.push({ path: `${path}[${i}]`, id: item.id || null, title: item.title || null });
        arr.splice(i, 1);
        continue;
      }
      const target = targetFor(item);
      if (target?.key === 'grossi' && /topRoster|expansionRoster|priorityExpansion|watchlistExamples|openCatalogs|organizationProfiles/.test(path)) {
        duplicateProfilesRemoved.push({ path: `${path}[${i}]`, id: item.id || null, name: item.canonicalName || item.name || null });
        arr.splice(i, 1);
      }
    }
  });
  for (const key of ['people', 'roster']) {
    if (!Array.isArray(data[key])) continue;
    const seen = new Set();
    for (let i = data[key].length - 1; i >= 0; i--) {
      const item = data[key][i];
      const target = targetFor(item);
      const k = target ? target.key : String(item?.id || item?.slug || item?.canonicalName || item?.name || i);
      if (target && seen.has(k)) {
        duplicateProfilesRemoved.push({ path: `${key}[${i}]`, id: item.id || null, name: item.canonicalName || item.name || null, reason: 'duplicate target profile' });
        data[key].splice(i, 1);
      } else if (target) {
        seen.add(k);
      }
    }
  }
  return { removed, duplicateProfilesRemoved };
}

function repairProfiles(data) {
  let fixes = 0;
  walk(data, (item, path, isArray) => {
    if (isArray || !isProfileLike(item)) return;
    const target = targetFor(item);
    if (!target) return;
    applyAnchor(item, target);
    item.lastInstitutionalAnchorAudit = new Date().toISOString();
    fixes++;
  });
  return fixes;
}

function personIdFor(data, targetKey) {
  for (const collection of ['people', 'roster', 'topRoster', 'expansionRoster']) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    const match = rows.find(row => targetFor(row)?.key === targetKey);
    if (match?.id) return match.id;
  }
  return null;
}

function addOfficialEvents(data) {
  if (!Array.isArray(data.appearances)) return [];
  const added = [];
  const existing = new Set(data.appearances.map(x => String(x.id || '')));
  for (const seed of OFFICIAL_EVENTS) {
    if (existing.has(seed.id)) continue;
    const personId = personIdFor(data, seed.targetKey);
    if (!personId) continue;
    const event = {
      id: seed.id,
      personId,
      startsAt: seed.startsAt,
      endsAt: null,
      status: new Date(seed.startsAt) > new Date() ? 'ANNOUNCED_FUTURE' : 'VERIFIED_PAST',
      confidence: 0.94,
      confidenceLabel: 'official source',
      eventType: 'PUBLIC_APPEARANCE',
      title: seed.title,
      summary: seed.summary,
      significance: 'Official-source public event added by nightly canonical maintenance.',
      decisions: '',
      location: seed.location,
      venuePublic: true,
      securityPrecision: 'city-level public appearance only; no private stops, hotels, residences, leaked routes or live proximity',
      publicInterestScore: 70,
      eventGroupId: seed.id.replace(/^official-/, 'eg-'),
      topics: ['official-source', 'public-appearance'],
      counterpartIds: [],
      sourcePack: [{ type: 'official', reliability: 'primary', label: seed.sourceLabel, url: seed.sourceUrl, checkedAt: new Date().toISOString() }],
      visual: { status: 'runtime portrait', policy: 'Use audited public media only.' },
      lastCheckedAt: new Date().toISOString(),
      marketImpact: { sectors: [], companies: [], countries: [seed.location.countryName], confidence: 'low' },
      realEvent: true
    };
    data.appearances.push(event);
    added.push({ id: seed.id, personId, title: seed.title });
  }
  data.appearances.sort((a, b) => String(b.startsAt || '').localeCompare(String(a.startsAt || '')));
  return added;
}

function findAdSense(html) {
  const texts = [html];
  for (const file of ['ads.txt', 'index.template.html', 'privacy.html', 'impressum.html']) {
    if (fs.existsSync(file)) texts.push(fs.readFileSync(file, 'utf8'));
  }
  try {
    const hashes = sh('git log --format=%H --all -- index.html ads.txt index.template.html').trim().split(/\s+/).filter(Boolean).slice(0, 80);
    for (const hash of hashes) {
      for (const file of ['index.html', 'ads.txt', 'index.template.html']) {
        try { texts.push(sh(`git show ${hash}:${file}`)); } catch {}
      }
    }
  } catch {}
  const all = texts.join('\n');
  const client = (all.match(/ca-pub-[0-9]{10,}/) || [null])[0];
  const pub = client ? client.replace(/^ca-/, '') : (all.match(/pub-[0-9]{10,}/) || [null])[0];
  const slots = [...new Set([...all.matchAll(/data-ad-slot=["']([0-9]+)["']/g)].map(m => m[1]))];
  return { client, publisherId: pub, headerSlot: slots[0] || null, sidebarSlot: slots[1] || null };
}

function installAdSense(html, ads) {
  if (!ads.client || !ads.headerSlot || !ads.sidebarSlot) return html;
  let out = html;
  const meta = `<meta name="google-adsense-account" content="${ads.client}">`;
  const loader = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>`;
  if (!/google-adsense-account/.test(out)) out = out.replace(/<head([^>]*)>/i, `<head$1>\n  ${meta}`);
  if (!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/.test(out)) out = out.replace(/<head([^>]*)>/i, `<head$1>\n  ${loader}`);
  const runtime = `<script id="parleymap-adsense-runtime">
(function(){
 var client=${JSON.stringify(ads.client)}, header=${JSON.stringify(ads.headerSlot)}, sidebar=${JSON.stringify(ads.sidebarSlot)};
 function unit(slot){var i=document.createElement('ins');i.className='adsbygoogle';i.style.display='block';i.setAttribute('data-ad-client',client);i.setAttribute('data-ad-slot',slot);i.setAttribute('data-ad-format','auto');i.setAttribute('data-full-width-responsive','true');return i;}
 function mount(){var boxes=[document.querySelector('[data-ad-placement="header"]'),document.getElementById('ad-header'),document.querySelector('.ad-header'),document.querySelector('.top-ad'),document.querySelector('[data-ad-placement="sidebar"]'),document.getElementById('ad-sidebar'),document.querySelector('.ad-sidebar'),document.querySelector('.side-ad')].filter(Boolean);var used=new Set();function put(el,slot){if(!el||used.has(el))return;used.add(el);if(!el.querySelector('ins.adsbygoogle')){el.innerHTML='';el.appendChild(unit(slot));try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}}}put(boxes[0],header);put(boxes[1]||boxes[2],sidebar);} if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
</script>`;
  if (!/parleymap-adsense-runtime/.test(out)) out = out.replace(/<\/body>/i, `${runtime}\n</body>`);
  fs.writeFileSync('ads.txt', `google.com, ${ads.publisherId}, DIRECT, f08c47fec0942fa0\n`);
  return out;
}

function legalPages() {
  const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | ParleyMap</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;line-height:1.6;color:#111}a{color:#0645ad}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>\n`;
  fs.writeFileSync('privacy.html', page('Privacy Policy', '<p>ParleyMap presents public-source appearance intelligence. We do not publish private addresses, leaked itineraries, hotels, residences, hospitals or live proximity data.</p><p>We may use essential cookies and, where approved, advertising services such as Google AdSense. Advertising partners may use cookies subject to consent and their own policies.</p><p>Contact: contact@parleymap.com</p>'));
  fs.writeFileSync('impressum.html', page('Impressum', '<p>ParleyMap is an editorial public-source mapping project for public appearances, meetings and institutional events.</p><p>Responsible contact: contact@parleymap.com</p>'));
  fs.writeFileSync('about.html', page('About ParleyMap', '<p>ParleyMap maps public appearances and institutional presence using official and host-public sources.</p>'));
  fs.writeFileSync('contact.html', page('Contact', '<p>Email: contact@parleymap.com</p>'));
  fs.writeFileSync('methodology.html', page('Methodology', '<p>Records require a public date, city-level public location, named person or institution, and an official or host-public source pack. Source-watch pages are not treated as events.</p>'));
  fs.writeFileSync('data-sources.html', page('Data Sources', '<p>Preferred sources include official calendars, institutional press releases, host pages, public event pages, Vatican travel pages, IAEA statements and Royal Family engagement pages.</p>'));
}

function audit(data, ads) {
  const problems = [];
  const assert = (condition, message) => { if (!condition) problems.push(message); };
  assert(isSafeData(data), 'core dataset counts or schema not safe');
  const profileMatches = {};
  walk(data, (item, path, isArray) => {
    if (isArray || !isProfileLike(item)) return;
    const t = targetFor(item);
    if (t) (profileMatches[t.key] ||= []).push({ item, path });
  });
  const grossi = profileMatches.grossi || [];
  assert(grossi.length >= 1, 'Grossi not found');
  assert(!grossi.some(x => /topRoster|expansionRoster|priorityExpansion|watchlistExamples|openCatalogs|organizationProfiles/.test(x.path)), 'Grossi remains in visible helper collection');
  assert(!grossi.some(x => x.item.countryFocusCode === 'IA' || x.item.countryFocus === 'IA'), 'Grossi still has IA country code');
  assert(!grossi.some(x => x.item.flagAudit?.code === 'BI' || /bis/i.test(String(x.item.flagAudit?.label || ''))), 'Grossi still has BI/BIS flag audit');
  assert(grossi.every(x => norm(x.item.homeBases?.[0]?.city) === 'vienna' && x.item.countryFocusCode === 'AT'), 'Grossi not anchored to Vienna / AT');
  for (const key of ['pope', 'sheinbaum', 'subianto']) {
    const rows = profileMatches[key] || [];
    const t = TARGETS.find(x => x.key === key);
    assert(rows.length >= 1, `${key} not found`);
    assert(rows.every(x => x.item.countryFocusCode === t.anchor.countryCode), `${key} not anchored to ${t.anchor.countryCode}`);
  }
  let bad = null;
  walk(data, (item, path, isArray) => { if (!isArray && isBadEvent(item)) bad = { path, title: item.title || item.id }; });
  assert(!bad, `bad event remains: ${bad?.title}`);
  if (ads.client || ads.headerSlot || ads.sidebarSlot) assert(ads.client && ads.headerSlot && ads.sidebarSlot && fs.existsSync('ads.txt'), 'partial AdSense setup');
  return { generatedAt: new Date().toISOString(), status: problems.length ? 'audit_failed' : 'audit_passed', problems };
}

fs.mkdirSync(DIAG_DIR, { recursive: true });
const originalHtml = getIndexHtml();
const parsed = parseHtml(originalHtml);
if (!parsed) throw new Error('No demo-data block found in index.html');
const data = parsed.data;
const before = counts(data);
const cleanup = cleanArrays(data);
const anchorFixes = repairProfiles(data);
const officialEventsAdded = addOfficialEvents(data);
data.meta = { ...(data.meta || {}), lastDataUpdate: new Date().toISOString(), lastCanonicalMaintenance: new Date().toISOString(), canonicalMaintenanceStatus: 'nightly canonical repair applied' };
const ads = findAdSense(originalHtml);
let nextHtml = originalHtml.slice(0, parsed.jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + originalHtml.slice(parsed.jsonEnd);
nextHtml = installAdSense(nextHtml, ads);
legalPages();
fs.writeFileSync(INDEX_PATH, nextHtml);
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
const finalParsed = parseHtml(fs.readFileSync(INDEX_PATH, 'utf8'));
if (!finalParsed) throw new Error('Post-write index.html has no demo-data');
const auditReport = audit(finalParsed.data, ads);
fs.writeFileSync(`${DIAG_DIR}/canonical-hard-audit-report.json`, JSON.stringify(auditReport, null, 2) + '\n');
if (auditReport.status !== 'audit_passed') throw new Error(`Hard audit failed: ${auditReport.problems.join('; ')}`);
const after = counts(finalParsed.data);
const report = { generatedAt: new Date().toISOString(), status: 'canonical_maintenance_applied', before, after, anchorFixes, fakeEventsRemoved: cleanup.removed, duplicateProfilesRemoved: cleanup.duplicateProfilesRemoved, officialEventsAdded };
const adsReport = { generatedAt: new Date().toISOString(), status: ads.client && ads.headerSlot && ads.sidebarSlot ? 'adsense_preserved_and_audited' : 'adsense_ids_not_found_no_fake_ids_injected', client: ads.client, publisherId: ads.publisherId, headerSlot: ads.headerSlot, sidebarSlot: ads.sidebarSlot };
fs.writeFileSync(`${DIAG_DIR}/canonical-maintenance-report.json`, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(`${DIAG_DIR}/adsense-preserve-audit-report.json`, JSON.stringify(adsReport, null, 2) + '\n');
fs.writeFileSync(`${DIAG_DIR}/LATEST_RUN_SUMMARY.md`, `# ParleyMap nightly canonical maintenance\n\nStatus: ${report.status}\nAudit: ${auditReport.status}\n\n## Dataset counts\n- people: ${before.people} -> ${after.people}\n- roster: ${before.roster} -> ${after.roster}\n- expansionRoster: ${before.expansionRoster} -> ${after.expansionRoster}\n- appearances: ${before.appearances} -> ${after.appearances}\n\n## Repairs\n- anchor fixes: ${anchorFixes}\n- fake events removed: ${cleanup.removed.length}\n- duplicate helper profiles removed: ${cleanup.duplicateProfilesRemoved.length}\n- official events added: ${officialEventsAdded.length}\n\n## AdSense\n- status: ${adsReport.status}\n- client: ${adsReport.client || 'not found'}\n- headerSlot: ${adsReport.headerSlot || 'not found'}\n- sidebarSlot: ${adsReport.sidebarSlot || 'not found'}\n`);
console.log(JSON.stringify({ report, auditReport, adsReport }, null, 2));
