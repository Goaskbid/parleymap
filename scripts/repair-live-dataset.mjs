import fs from 'node:fs';
import { execSync } from 'node:child_process';

const INDEX_PATH = 'index.html';
const DATA_PATH = 'data/demo.json';
const DIAG_DIR = 'data/diagnostics';
const REPORT_PATH = `${DIAG_DIR}/canonical-maintenance-report.json`;
const AUDIT_PATH = `${DIAG_DIR}/canonical-hard-audit-report.json`;
const ADSENSE_PATH = `${DIAG_DIR}/adsense-preserve-audit-report.json`;
const SUMMARY_PATH = `${DIAG_DIR}/LATEST_RUN_SUMMARY.md`;
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';

const BAD_EVENT_RE = /\b(iaea nuclear diplomacy watch|city of london finance diplomacy watch|think[- ]tank leadership events watch|royal diaries and state[- ]visit watch|generic source[- ]watch|homepage|faq|fact sheet|profile page|programme|program)\b/i;
const SOURCE_WATCH_RE = /source[-_ ]watch/i;

const ANCHORS = [
  { key: 'grossi', any: ['rafael grossi', 'rafael mariano grossi', 'r-057-rafael-grossi'], city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2082, lng: 16.3738, region: 'Europe', org: 'International Atomic Energy Agency', orgMark: { code: 'IAEA', label: 'IAEA' }, category: 'INTERNATIONAL_ORG', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Rafael_Mariano_Grossi_2024.jpg/330px-Rafael_Mariano_Grossi_2024.jpg' },
  { key: 'pope', any: ['pope leo xiv', 'leo xiv', 'robert prevost', 'pope'], city: 'Vatican City', countryCode: 'VA', countryName: 'Vatican City', lat: 41.9029, lng: 12.4534, region: 'Europe', org: 'Holy See', orgMark: { code: 'VA', label: 'Vatican City' } },
  { key: 'sheinbaum', all: ['claudia', 'sheinbaum'], city: 'Mexico City', countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America', org: 'Government of Mexico', orgMark: { code: 'MX', label: 'Mexico' } },
  { key: 'subianto', all: ['prabowo', 'subianto'], city: 'Jakarta', countryCode: 'ID', countryName: 'Indonesia', lat: -6.2088, lng: 106.8456, region: 'Asia', org: 'Government of Indonesia', orgMark: { code: 'ID', label: 'Indonesia' } },
  { key: 'mbs', all: ['salman'], any: ['mohammed', 'mohammad', 'muhammad', 'mbs'], city: 'Riyadh', countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, region: 'Middle East', org: 'Kingdom of Saudi Arabia', orgMark: { code: 'SA', label: 'Saudi Arabia' } },
  { key: 'charles', any: ['king charles iii', 'charles iii'], city: 'London', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5074, lng: -0.1278, region: 'Europe', org: 'Royal Household', orgMark: { code: 'GB', label: 'United Kingdom' } },
  { key: 'rutte', all: ['mark', 'rutte'], city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8798, lng: 4.4219, region: 'Europe', org: 'NATO', orgMark: { code: 'NATO', label: 'NATO' } },
  { key: 'guterres', any: ['antonio guterres', 'antónio guterres'], city: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7499, lng: -73.968, region: 'North America', org: 'United Nations', orgMark: { code: 'UN', label: 'UN' } }
];

const OFFICIAL_EVENTS = [
  { id: 'official-iaea-grossi-board-2026-03-02', personKey: 'grossi', personName: 'Rafael Grossi', title: 'Rafael Grossi, IAEA Board of Governors statement', type: 'Official statement', startsAt: '2026-03-02T09:00:00Z', endsAt: '2026-03-02T12:00:00Z', location: { label: 'IAEA headquarters, Vienna public record', city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2082, lng: 16.3738, precision: 'city' }, sourcePack: [{ label: 'IAEA Director General statement, Board of Governors', url: 'https://www.iaea.org/newscenter/statements/iaea-director-generals-introductory-statement-to-the-board-of-governors-2-6-march-2026', type: 'official_or_host', reliability: 'primary', checkedAt: new Date().toISOString() }], topics: ['IAEA', 'nuclear governance', 'Board of Governors'] },
  { id: 'official-vatican-pope-spain-2026-06-06', personKey: 'pope', personName: 'Pope Leo XIV', title: 'Pope Leo XIV apostolic journey to Spain', type: 'Official journey', startsAt: '2026-06-06T09:00:00Z', endsAt: '2026-06-12T18:00:00Z', location: { label: 'Spain apostolic journey public itinerary', city: 'Madrid', countryCode: 'ES', countryName: 'Spain', lat: 40.4168, lng: -3.7038, precision: 'city' }, sourcePack: [{ label: 'Vatican travel itinerary, Spain 2026', url: 'https://www.vatican.va/content/leo-xiv/en/travels/2026/documents/spagna-6-12giugno2026.html', type: 'official_or_host', reliability: 'primary', checkedAt: new Date().toISOString() }], topics: ['Vatican', 'apostolic journey', 'Spain'] },
  { id: 'official-royal-charles-washington-2026-04-28', personKey: 'charles', personName: 'King Charles III', title: 'King Charles III address to Congress in Washington', type: 'Official state visit record', startsAt: '2026-04-28T09:00:00Z', endsAt: '2026-04-28T18:00:00Z', location: { label: 'Washington public record', city: 'Washington', countryCode: 'US', countryName: 'United States', lat: 38.9072, lng: -77.0369, precision: 'city' }, sourcePack: [{ label: 'Royal Family, King address to Congress', url: 'https://www.royal.uk/news-and-activity/2026-04-28/the-kings-address-to-the-joint-meeting-of-congress-in-washington', type: 'official_or_host', reliability: 'primary', checkedAt: new Date().toISOString() }], topics: ['Royal Family', 'state visit', 'Washington'] }
];

function sh(cmd, opts = {}) { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }); }
function norm(v) { return String(v ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function textOf(o) { return norm([o?.id,o?.slug,o?.name,o?.canonicalName,o?.wikiTitle,o?.wikidataId,o?.roleTitle,o?.organization,o?.countryName,o?.countryFocus,o?.countryFocusCode,Array.isArray(o?.profileLines) ? JSON.stringify(o.profileLines) : ''].join(' ')); }
function targetFor(o) { const t = textOf(o); return ANCHORS.find(a => (!a.all || a.all.every(x => t.includes(norm(x)))) && (!a.any || a.any.some(x => t.includes(norm(x))))); }
function anchorObj(a) { return { label: `${a.city} institutional base`, city: a.city, countryCode: a.countryCode, countryName: a.countryName, lat: a.lat, lng: a.lng, precision: 'city', type: 'institutional_base', privacy: 'city-level public institutional base only' }; }
function applyAnchor(o, a) {
  const anchor = anchorObj(a);
  if (a.org) o.organization = a.org;
  o.countryFocus = a.countryCode; o.countryFocusCode = a.countryCode; o.countryCode = a.countryCode; o.countryName = a.countryName; o.country = a.countryName; o.homeRegion = a.region; o.region = o.region || a.region; o.locationStatus = 'institutional_base_city_level';
  o.homeBases = [anchor]; o.homeBase = anchor; o.mapAnchor = anchor; o.anchorLocation = anchor; o.baseLocation = anchor; o.institutionalBase = anchor;
  o.lat = a.lat; o.lng = a.lng; o.lon = a.lng; o.long = a.lng; o.latitude = a.lat; o.longitude = a.lng; o.homeLat = a.lat; o.homeLng = a.lng; o.mapLat = a.lat; o.mapLng = a.lng; o.anchorLat = a.lat; o.anchorLng = a.lng;
  o.coordinates = { lat: a.lat, lng: a.lng }; o.geo = { lat: a.lat, lng: a.lng, city: a.city, countryCode: a.countryCode, countryName: a.countryName };
  o.flagAudit = { ...(o.flagAudit || {}), code: a.countryCode, countryCode: a.countryCode, countryName: a.countryName, label: a.countryName, status: 'country flag' };
  o.flagCode = a.countryCode; o.countryFlagCode = a.countryCode;
  if (a.orgMark) o.orgMark = a.orgMark;
  if ((!o.imageUrl || /placeholder|no image|missing/i.test(String(o.imageUrl))) && a.image) { o.imageUrl = a.image; o.imageProvider = 'Wikimedia Commons candidate'; o.imageAudit = { status: 'photo-candidate', reasons: [], instruction: 'Verify license and cache attribution before production export.' }; }
}
function findDemoBlock(html) { const s = html.indexOf(OPEN_TAG); if (s < 0) return null; const js = s + OPEN_TAG.length; const e = html.indexOf(CLOSE_TAG, js); if (e < 0) return null; return { jsonStart: js, jsonEnd: e, jsonText: html.slice(js,e).trim() }; }
function parseDataFromHtml(html) { const b = findDemoBlock(html); if (!b) return null; return { block: b, data: JSON.parse(b.jsonText) }; }
function isSafeData(data) { return data && Array.isArray(data.people) && data.people.length >= 90 && Array.isArray(data.roster) && data.roster.length >= 190 && Array.isArray(data.expansionRoster) && data.expansionRoster.length >= 100 && Array.isArray(data.appearances) && data.appearances.length >= 500 && Array.isArray(data.categories) && data.categories.length >= 10; }
function getSafeIndexHtml() {
  const current = fs.existsSync(INDEX_PATH) ? fs.readFileSync(INDEX_PATH, 'utf8') : '';
  const parsed = parseDataFromHtml(current);
  if (parsed && isSafeData(parsed.data)) return current;
  const commits = sh('git log --format=%H -- index.html').trim().split(/\s+/).filter(Boolean);
  for (const sha of commits) {
    try {
      const html = sh(`git show ${sha}:index.html`, { maxBuffer: 80 * 1024 * 1024 });
      const p = parseDataFromHtml(html);
      if (p && isSafeData(p.data)) return html;
    } catch {}
  }
  throw new Error('No safe full index.html with demo-data found in git history');
}
function walkArrays(obj, visitor, path = '$') {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { visitor(obj, path); obj.forEach((v,i) => walkArrays(v, visitor, `${path}[${i}]`)); return; }
  for (const [k,v] of Object.entries(obj)) walkArrays(v, visitor, `${path}.${k}`);
}
function looksEventLike(o) { return o && typeof o === 'object' && !Array.isArray(o) && (o.startsAt || o.title || o.sourcePack || o.location); }
function isBadEvent(o) {
  const blob = [o?.id,o?.title,o?.summary,o?.whyItMatters,o?.type,o?.status,o?.attendeeMode].map(x => String(x || '')).join(' ');
  return looksEventLike(o) && (BAD_EVENT_RE.test(blob) || (SOURCE_WATCH_RE.test(blob) && o?.startsAt));
}
function eventExists(data, id) { let found = false; walkArrays(data, arr => { if (arr.some(x => x && x.id === id)) found = true; }); return found; }
function locatePersonId(data, key, fallbackName) {
  let result = null; const target = ANCHORS.find(a => a.key === key);
  for (const collection of ['people','roster','topRoster','expansionRoster']) {
    for (const item of Array.isArray(data[collection]) ? data[collection] : []) { if (targetFor(item)?.key === key) { result = item.id || item.slug || fallbackName; return result; } }
  }
  return fallbackName;
}
function asAppearance(seed, personId) {
  return { id: seed.id, personId, startsAt: seed.startsAt, endsAt: seed.endsAt, status: 'VERIFIED_PAST', confidence: 0.92, confidenceLabel: 'official source', eventType: seed.type, title: seed.title, summary: seed.title, significance: 'Official-source public appearance record.', decisions: '', location: seed.location, venuePublic: true, securityPrecision: 'city-level public appearance only; no private stops, hotels, residences, leaked routes or live proximity', publicInterestScore: 68, eventGroupId: `official-${seed.id}`, topics: seed.topics || [], counterpartIds: [], sourcePack: seed.sourcePack, visual: { status: 'source-backed record' }, lastCheckedAt: new Date().toISOString(), marketImpact: { sectors: [], companies: [], countries: [seed.location.countryName], confidence: 'low' } };
}
function repairData(data) {
  const report = { anchorFixes: 0, fakeEventsRemoved: [], duplicateProfilesRemoved: [], officialEventsAdded: [] };
  const profileCollections = ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples','organizationProfiles','openCatalogs'];
  for (const name of profileCollections) {
    const arr = Array.isArray(data[name]) ? data[name] : [];
    const seenProblem = new Set();
    data[name] = arr.filter((item) => {
      if (!item || typeof item !== 'object') return true;
      const t = targetFor(item);
      if (!t) return true;
      if (t.key === 'grossi' && name !== 'people' && name !== 'roster') { report.duplicateProfilesRemoved.push({ collection: name, id: item.id, name: item.canonicalName || item.name }); return false; }
      if (t.key === 'grossi' && name === 'roster') { if (seenProblem.has('grossi')) { report.duplicateProfilesRemoved.push({ collection: name, id: item.id, name: item.canonicalName || item.name }); return false; } seenProblem.add('grossi'); }
      applyAnchor(item, t); report.anchorFixes++; return true;
    });
  }
  // Patch any nested/profile-like copies still present.
  walkArrays(data, (arr) => { for (const item of arr) { const t = targetFor(item); if (t) { applyAnchor(item, t); report.anchorFixes++; } } });
  // Remove bad event-like rows from every array.
  walkArrays(data, (arr, path) => { for (let i = arr.length - 1; i >= 0; i--) { if (isBadEvent(arr[i])) { report.fakeEventsRemoved.push({ path, id: arr[i].id || null, title: arr[i].title || null }); arr.splice(i, 1); } } });
  // Add official road-map events into appearances.
  if (!Array.isArray(data.appearances)) data.appearances = [];
  for (const seed of OFFICIAL_EVENTS) {
    if (!eventExists(data, seed.id)) { data.appearances.push(asAppearance(seed, locatePersonId(data, seed.personKey, seed.personName))); report.officialEventsAdded.push(seed.id); }
  }
  data.meta = { ...(data.meta || {}), lastCanonicalMaintenanceRun: new Date().toISOString(), canonicalMaintenanceStatus: `anchors ${report.anchorFixes}, removed fake events ${report.fakeEventsRemoved.length}, added official events ${report.officialEventsAdded.length}` };
  return report;
}
function collectHistoryTexts() {
  const texts = [];
  const files = ['index.html','ads.txt','index.template.html','privacy.html','impressum.html'];
  for (const f of files) if (fs.existsSync(f)) texts.push(fs.readFileSync(f,'utf8'));
  try { const commits = sh('git log --format=%H --all -- index.html ads.txt index.template.html privacy.html impressum.html').trim().split(/\s+/).filter(Boolean).slice(0,120); for (const sha of commits) for (const f of files) { try { texts.push(sh(`git show ${sha}:${f}`, { maxBuffer: 80 * 1024 * 1024 })); } catch {} } } catch {}
  return texts;
}
function findAdSense() {
  const text = collectHistoryTexts().join('\n');
  const client = [...text.matchAll(/ca-pub-\d{10,24}/g)].map(m => m[0])[0] || null;
  const pub = client ? client.replace(/^ca-/, '') : ([...text.matchAll(/pub-\d{10,24}/g)].map(m => m[0])[0] || null);
  const slots = [...new Set([...text.matchAll(/data-ad-slot=["']?([0-9]+)["']?/g)].map(m => m[1]))];
  return { client, publisherId: pub, headerSlot: slots[0] || null, sidebarSlot: slots[1] || slots[0] || null };
}
function installAds(html, ads) {
  if (!ads.client || !ads.headerSlot || !ads.sidebarSlot) return html;
  let out = html;
  const meta = `<meta name="google-adsense-account" content="${ads.client}">`;
  const loader = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>`;
  if (!/google-adsense-account/.test(out)) out = out.replace(/<head([^>]*)>/i, `<head$1>\n  ${meta}`);
  if (!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/.test(out)) out = out.replace(/<head([^>]*)>/i, `<head$1>\n  ${loader}`);
  const runtime = `<script id="parleymap-adsense-runtime">(function(){var C='${ads.client}',H='${ads.headerSlot}',S='${ads.sidebarSlot}';function unit(slot){var ins=document.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';ins.setAttribute('data-ad-client',C);ins.setAttribute('data-ad-slot',slot);ins.setAttribute('data-ad-format','auto');ins.setAttribute('data-full-width-responsive','true');return ins;}function mount(){var boxes=Array.from(document.querySelectorAll('*')).filter(function(el){var t=(el.textContent||'').toLowerCase();return /header ad slot|sidebar ad slot|advertisement/.test(t);});var h=boxes[0],s=boxes[1]||boxes[0];[[h,H],[s,S]].forEach(function(pair){var el=pair[0],slot=pair[1];if(!el||el.querySelector('ins.adsbygoogle'))return;el.textContent='';el.appendChild(unit(slot));try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();})();</script>`;
  if (!/parleymap-adsense-runtime/.test(out)) out = out.replace(/<\/body>/i, `${runtime}\n</body>`);
  fs.writeFileSync('ads.txt', `google.com, ${ads.publisherId}, DIRECT, f08c47fec0942fa0\n`);
  return out;
}
function legalPages() {
  const baseHead = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>';
  const style = '</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.55;color:#111}a{color:#0645ad}</style></head><body>';
  const end = '</body></html>\n';
  fs.writeFileSync('privacy.html', `${baseHead}Privacy Policy | ParleyMap${style}<h1>Privacy Policy</h1><p>ParleyMap presents public-source appearance intelligence. We do not publish private addresses, leaked itineraries, hotels, residences, hospitals or live proximity data.</p><p>We may use essential cookies for site operation and, where approved, advertising and analytics services. Advertising partners may use cookies subject to consent and their own policies.</p><p>Contact: contact@parleymap.com</p>${end}`);
  fs.writeFileSync('impressum.html', `${baseHead}Impressum | ParleyMap${style}<h1>Impressum</h1><p>ParleyMap is an editorial public-source mapping project for public appearances, meetings and institutional events.</p><p>Responsible contact: contact@parleymap.com</p>${end}`);
  fs.writeFileSync('about.html', `${baseHead}About | ParleyMap${style}<h1>About ParleyMap</h1><p>ParleyMap maps public appearances and institutional presence using official and host-public sources.</p>${end}`);
  fs.writeFileSync('contact.html', `${baseHead}Contact | ParleyMap${style}<h1>Contact</h1><p>Email: contact@parleymap.com</p>${end}`);
  fs.writeFileSync('methodology.html', `${baseHead}Methodology | ParleyMap${style}<h1>Methodology</h1><p>Records require a public date, public city-level location, named person or institution, and a source pack. Source-watch pages are not treated as events.</p>${end}`);
  fs.writeFileSync('data-sources.html', `${baseHead}Data Sources | ParleyMap${style}<h1>Data Sources</h1><p>Preferred sources include official calendars, institutional press releases, host pages, and public event pages.</p>${end}`);
}
function audit(data, ads) {
  const problems = [];
  function assert(cond, msg) { if (!cond) problems.push(msg); }
  assert(isSafeData(data), 'core counts/schema failed');
  const grossiCopies = [];
  for (const name of ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples']) for (const item of Array.isArray(data[name]) ? data[name] : []) if (targetFor(item)?.key === 'grossi') grossiCopies.push({ collection: name, item });
  assert(grossiCopies.filter(x => ['roster','people'].includes(x.collection)).length <= 2, 'too many canonical grossi copies');
  assert(!grossiCopies.some(x => ['topRoster','expansionRoster','priorityExpansion','watchlistExamples'].includes(x.collection)), 'grossi remains in visible helper collections');
  const grossi = grossiCopies[0]?.item;
  if (grossi) { assert(grossi.countryFocusCode === 'AT', 'Grossi countryFocusCode not AT'); assert(grossi.flagAudit?.code === 'AT', 'Grossi flagAudit not AT'); assert(norm(grossi.homeBases?.[0]?.city) === 'vienna', 'Grossi not anchored to Vienna'); }
  for (const key of ['pope','sheinbaum','subianto']) {
    let found = null; walkArrays(data, arr => { for (const it of arr) if (targetFor(it)?.key === key) { found = it; return; } });
    assert(found, `${key} not found`);
    const anchor = ANCHORS.find(a => a.key === key);
    if (found) assert(found.countryFocusCode === anchor.countryCode, `${key} countryFocusCode not ${anchor.countryCode}`);
  }
  let badEvent = null; walkArrays(data, arr => { for (const it of arr) if (isBadEvent(it)) badEvent = it.title || it.id; });
  assert(!badEvent, `bad event remains: ${badEvent}`);
  if (ads.client || ads.headerSlot || ads.sidebarSlot) { assert(ads.client && ads.headerSlot && ads.sidebarSlot && fs.existsSync('ads.txt'), 'partial AdSense setup'); }
  return { status: problems.length ? 'audit_failed' : 'audit_passed', problems };
}
function writeCleanWorkflows() {
  fs.mkdirSync('.github/workflows', { recursive: true });
  fs.writeFileSync('.github/workflows/nightly-refresh.yml', `name: ParleyMap nightly refresh\non:\n  workflow_dispatch:\n  schedule:\n    - cron: "19 3 * * *"\npermissions:\n  contents: write\nconcurrency:\n  group: parleymap-nightly-refresh\n  cancel-in-progress: false\njobs:\n  refresh-and-publish:\n    runs-on: ubuntu-latest\n    timeout-minutes: 25\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: main\n          fetch-depth: 0\n      - uses: actions/setup-node@v4\n        with:\n          node-version: "20"\n      - name: Canonical maintenance repair\n        run: node scripts/repair-live-dataset.mjs\n      - name: Validate embedded dataset\n        run: node scripts/validate-demo-data.mjs\n      - name: Commit remaining changes\n        uses: stefanzweifel/git-auto-commit-action@v5\n        with:\n          commit_message: "Refresh ParleyMap canonical maintenance"\n          file_pattern: "index.html data/demo.json ads.txt privacy.html impressum.html about.html contact.html methodology.html data-sources.html data/diagnostics/*.json data/diagnostics/*.md .github/workflows/*.yml"\n`);
  fs.writeFileSync('.github/workflows/data-validate.yml', `name: ParleyMap data validation\non:\n  workflow_dispatch:\npermissions:\n  contents: write\njobs:\n  validate:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: main\n          fetch-depth: 0\n      - uses: actions/setup-node@v4\n        with:\n          node-version: "20"\n      - name: Canonical maintenance repair\n        run: node scripts/repair-live-dataset.mjs\n      - name: Validate embedded dataset\n        run: node scripts/validate-demo-data.mjs\n      - name: Commit changes\n        uses: stefanzweifel/git-auto-commit-action@v5\n        with:\n          commit_message: "Repair ParleyMap canonical data"\n          file_pattern: "index.html data/demo.json ads.txt privacy.html impressum.html about.html contact.html methodology.html data-sources.html data/diagnostics/*.json data/diagnostics/*.md .github/workflows/*.yml"\n`);
}
function maybeSelfCommit() {
  try {
    const changed = sh('git status --porcelain').trim();
    if (!changed) return;
    sh('git config user.name "github-actions[bot]"'); sh('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
    sh('git add index.html data/demo.json ads.txt privacy.html impressum.html about.html contact.html methodology.html data-sources.html data/diagnostics/*.json data/diagnostics/*.md .github/workflows/*.yml scripts/repair-live-dataset.mjs 2>/dev/null || true');
    sh('git commit -m "Repair ParleyMap canonical data and AdSense surface"');
    sh('git push');
  } catch (e) { console.warn('Self-commit skipped or failed:', e.message); }
}

fs.mkdirSync(DIAG_DIR, { recursive: true });
const startHtml = getSafeIndexHtml();
const parsed = parseDataFromHtml(startHtml);
if (!parsed || !isSafeData(parsed.data)) throw new Error('Could not extract safe demo-data from index.html');
const data = parsed.data;
const beforeCounts = { people: data.people.length, roster: data.roster.length, expansionRoster: data.expansionRoster.length, appearances: data.appearances.length, categories: data.categories.length };
const repairReport = repairData(data);
const ads = findAdSense();
let nextHtml = startHtml.slice(0, parsed.block.jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + startHtml.slice(parsed.block.jsonEnd);
nextHtml = installAds(nextHtml, ads);
legalPages();
writeCleanWorkflows();
fs.writeFileSync(INDEX_PATH, nextHtml);
fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
const finalParsed = parseDataFromHtml(fs.readFileSync(INDEX_PATH, 'utf8'));
if (!finalParsed) throw new Error('Post-write index.html has no demo-data');
const auditReport = audit(finalParsed.data, ads);
if (auditReport.status !== 'audit_passed') { fs.writeFileSync(AUDIT_PATH, JSON.stringify(auditReport, null, 2) + '\n'); throw new Error(`Hard audit failed: ${auditReport.problems.join('; ')}`); }
const afterCounts = { people: finalParsed.data.people.length, roster: finalParsed.data.roster.length, expansionRoster: finalParsed.data.expansionRoster.length, appearances: finalParsed.data.appearances.length, categories: finalParsed.data.categories.length };
const report = { generatedAt: new Date().toISOString(), status: 'canonical_maintenance_applied', before: beforeCounts, after: afterCounts, ...repairReport };
const adsReport = { generatedAt: new Date().toISOString(), status: ads.client && ads.headerSlot && ads.sidebarSlot ? 'adsense_preserved_and_audited' : 'adsense_ids_not_found_no_fake_ids_injected', client: ads.client, publisherId: ads.publisherId, headerSlot: ads.headerSlot, sidebarSlot: ads.sidebarSlot };
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(AUDIT_PATH, JSON.stringify(auditReport, null, 2) + '\n');
fs.writeFileSync(ADSENSE_PATH, JSON.stringify(adsReport, null, 2) + '\n');
fs.writeFileSync(SUMMARY_PATH, `# ParleyMap canonical maintenance\n\nStatus: ${report.status}\nAudit: ${auditReport.status}\n\n## Counts\n- people: ${beforeCounts.people} -> ${afterCounts.people}\n- roster: ${beforeCounts.roster} -> ${afterCounts.roster}\n- expansionRoster: ${beforeCounts.expansionRoster} -> ${afterCounts.expansionRoster}\n- appearances: ${beforeCounts.appearances} -> ${afterCounts.appearances}\n\n## Repairs\n- Anchor fixes: ${repairReport.anchorFixes}\n- Fake events removed: ${repairReport.fakeEventsRemoved.length}\n- Duplicate profiles removed: ${repairReport.duplicateProfilesRemoved.length}\n- Official events added: ${repairReport.officialEventsAdded.length}\n\n## AdSense\n- status: ${adsReport.status}\n- client: ${adsReport.client || 'not found'}\n- headerSlot: ${adsReport.headerSlot || 'not found'}\n- sidebarSlot: ${adsReport.sidebarSlot || 'not found'}\n`);
console.log(JSON.stringify({ report, auditReport, adsReport }, null, 2));
maybeSelfCommit();
