import fs from 'node:fs';

const demoPath = 'data/demo.json';
const rosterPath = 'data/top200-roster.json';
const demo = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
const top200 = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));

const ORG_CODES = new Map([
  ['EU','EU'], ['UN','UN'], ['NATO','NATO'], ['OC','OECD'], ['OECD','OECD'], ['BI','BIS'], ['BIS','BIS'], ['IM','IMF'], ['IMF','IMF'], ['WB','WORLD BANK'], ['WBG','WORLD BANK'], ['WH','WHO'], ['WHO','WHO'], ['WT','WTO'], ['WTO','WTO'], ['IA','IAEA'], ['IAEA','IAEA'], ['IO','IOC'], ['IOC','IOC'], ['FI','FIFA'], ['GAVI','GAVI']
]);

const countryAlias = {
  'United States':'US','United Kingdom':'GB','China':'CN','Russia':'RU','India':'IN','France':'FR','Germany':'DE','Italy':'IT','Canada':'CA','Brazil':'BR','Turkey':'TR','Saudi Arabia':'SA','United Arab Emirates':'AE','Israel':'IL','Iran':'IR','Japan':'JP','South Korea':'KR','Indonesia':'ID','Mexico':'MX','South Africa':'ZA','Australia':'AU','Spain':'ES','Netherlands':'NL','Belgium':'BE','Switzerland':'CH','Sweden':'SE','Norway':'NO','Denmark':'DK','Finland':'FI','Poland':'PL','Ukraine':'UA','Qatar':'QA','Singapore':'SG','Taiwan':'TW','Greece':'GR','Hungary':'HU','Pakistan':'PK','Bangladesh':'BD','Malaysia':'MY','Cambodia':'KH','Morocco':'MA','Nigeria':'NG','Kenya':'KE','Ethiopia':'ET','Ghana':'GH','Rwanda':'RW','Tanzania':'TZ','Uganda':'UG','Zambia':'ZM','Angola':'AO','DR Congo':'CD',"Cote d'Ivoire":'CI','Côte d’Ivoire':'CI','Senegal':'SN','Jordan':'JO','Egypt':'EG','Argentina':'AR','Chile':'CL','Colombia':'CO','Ecuador':'EC','Venezuela':'VE','Barbados':'BB','Panama':'PA','El Salvador':'SV','Holy See':'VA','Portugal':'PT','Kuwait':'KW'
};

const orgAlias = [
  [/european union|european commission|eeas/i, ['EU','EU']],
  [/united nations|unicef|undp|unhcr|wfp|unga/i, ['UN','UN']],
  [/nato/i, ['NATO','NATO']],
  [/oecd/i, ['OC','OECD']],
  [/bis|bank for international settlements/i, ['BI','BIS']],
  [/imf|international monetary fund/i, ['IM','IMF']],
  [/world bank|world bank group/i, ['WB','World Bank']],
  [/world health|\bwho\b/i, ['WH','WHO']],
  [/world trade|\bwto\b/i, ['WT','WTO']],
  [/iaea|atomic energy/i, ['IA','IAEA']],
  [/opec/i, ['OP','OPEC']],
  [/fifa/i, ['FI','FIFA']],
  [/ioc|olympic/i, ['IO','IOC']],
  [/gavi/i, ['GV','Gavi']],
  [/group of thirty|\bg30\b/i, ['G30','G30']],
  [/bilderberg/i, ['BBG','Bilderberg']],
  [/world economic forum|\bwef\b/i, ['WEF','WEF']]
];

const url = (s) => encodeURI(String(s || '').trim()).replace(/#/g, '%23');
const key = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function findRosterMatch(person) {
  return demo.roster.find(r => key(r.name) === key(person.canonicalName) || key(r.name).includes(key(person.canonicalName)) || key(person.canonicalName).includes(key(r.name))) || top200.find(r => key(r.name) === key(person.canonicalName));
}

function countryCode(item) {
  const c = String(item.countryFocus || item.countryFocusCode || item.countryCode || '').toUpperCase();
  if (c && c.length <= 4) return c;
  const name = item.countryName || item.country || '';
  if (countryAlias[name]) return countryAlias[name];
  return c || 'UN';
}

function orgMark(item) {
  const hay = [item.organization, item.bucket, item.sector, item.countryName, item.roleTitle, item.name, item.canonicalName].filter(Boolean).join(' ');
  for (const [rx, pair] of orgAlias) if (rx.test(hay)) return { code: pair[0], label: pair[1] };
  const c = countryCode(item);
  if (ORG_CODES.has(c)) return { code: c, label: ORG_CODES.get(c) };
  return null;
}

function isSuspectImage(urlValue) {
  const u = String(urlValue || '');
  const reasons = [];
  if (!u) reasons.push('missing image');
  if (/\.svg($|\?)/i.test(u)) reasons.push('svg file');
  if (/logo|seal|coat|arms|flag|emblem|signature|map|icon/i.test(u)) reasons.push('looks like logo/seal/flag rather than portrait');
  if (/drawing|caricature|cartoon|painting|portrait_painting|statue/i.test(u)) reasons.push('may be drawing, painting or statue');
  return reasons;
}

function sectorNote(item) {
  const s = String(item.sector || item.industry || item.bucket || '').toLowerCase();
  if (/central bank|monetary|finance|bank/i.test(s)) return 'Markets care about the public speech trail: rates, liquidity, banking rules and financial-stability language can move expectations.';
  if (/energy|oil|opec/i.test(s)) return 'Energy users watch the public calendar for production signals, investment deals, security issues and supply language.';
  if (/technology|ai|semiconductor|software|business/i.test(s)) return 'Technology watchers follow these stops for policy access, chips, AI, cloud, industrial policy and capital-allocation clues.';
  if (/royal/i.test(s)) return 'Royal engagements matter for state diplomacy, patronage networks, soft power and public ceremonies.';
  if (/health|philanthropy|foundation/i.test(s)) return 'The public trail can show where funding, health policy and institutional partnerships are being formed.';
  if (/sport/i.test(s)) return 'Sports-governance stops can reveal host-city politics, broadcasting interests and federation relationships.';
  return 'The public trail is useful because meetings, speeches and summits show where influence is concentrating.';
}

function relationshipNote(item) {
  const bucket = String(item.bucket || item.roleTitle || '').toLowerCase();
  if (/head of state|head of government|president|prime minister|chancellor|king|crown prince/.test(bucket)) return 'Relationship signals come from bilateral meetings, summit seating, joint statements, readouts and repeated host-city overlap.';
  if (/central bank|governor|ecb|federal reserve/.test(bucket)) return 'Relationship signals come from speeches, panels, central-bank conferences and repeated appearances with finance ministries or BIS figures.';
  if (/ceo|founder|chair|investor|capital|wealth/.test(bucket)) return 'Relationship signals come from public investor events, government meetings, university appearances and policy-facing technology forums.';
  return 'Relationship signals come from documented meetings, panels, host events and repeated public co-presence.';
}

function crawlerNote(item) {
  const org = item.organization || item.countryName || item.bucket || 'public-source feeds';
  return `Crawler priority: official diary, host-event page, speech page and public readout first; media links only add context after a source trail exists for ${org}.`;
}

function profileLines(item, records = []) {
  const org = item.organization || item.bucket || 'public institution';
  const name = item.canonicalName || item.name;
  const role = item.roleTitle || item.bucket || 'public figure';
  const country = item.countryName || item.country || 'international';
  const latest = records.filter(r => r && r.startsAt).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt)).at(-1);
  const future = records.find(r => r && (r.status === 'ANNOUNCED_FUTURE' || new Date(r.startsAt) > new Date(demo.meta?.currentDateForDemo || Date.now())));
  const cities = [...new Set(records.map(r => r.location?.city).filter(Boolean))].slice(0,5);
  const lines = [
    { icon:'👤', label:'Role', text:`${name} is listed as ${role}${country ? ` with a public anchor in ${country}` : ''}.` },
    { icon:'🏛', label:'Institution', text:`Primary institution: ${org}. Public movements are interpreted through that role, not through private life.` },
    { icon:'🗺', label:'Map use', text: records.length ? `This profile currently has ${records.length} dated public cards in the static preview.` : 'This profile is ready for the crawler; dated cards appear after source review.' },
    { icon:'📍', label:'Cities', text: cities.length ? `Visible public stops include ${cities.join(', ')}.` : 'The starting anchor is institutional; no private residences or hotel locations are used.' },
    { icon:'🧭', label:'Why follow', text: sectorNote(item) },
    { icon:'🤝', label:'Network', text: relationshipNote(item) },
    { icon:'🗣', label:'Public record', text: latest ? `Latest visible record: ${latest.location?.city || 'public event'} on ${new Date(latest.startsAt).toISOString().slice(0,10)}.` : 'The profile remains searchable until the crawler promotes source-backed records.' },
    { icon:'🔭', label:'Watch next', text: future ? `Next public window in the dataset: ${future.location?.city || 'public event'} on ${new Date(future.startsAt).toISOString().slice(0,10)}.` : 'Future cards appear only when a government, organizer, institution or company has made the event public.' },
    { icon:'📰', label:'Sources', text:'Official diaries, speeches, host pages and public readouts carry the record. News links are context, not the foundation.' },
    { icon:'🔗', label:'Social', text:'Official profile, social search and LinkedIn search links are separated from verified source packs to avoid mistaking fan pages for official accounts.' },
    { icon:'🛡', label:'Boundary', text:'No live tracking, no private addresses, no hotels, no leaked itineraries and no unsourced sightings.' },
    { icon:'⚙', label:'Refresh', text:crawlerNote(item) }
  ];
  if (/former/i.test(item.bucket || item.roleTitle || '')) lines.splice(2,0,{icon:'📚', label:'Context', text:'Former leaders are tracked for public diplomacy, speaking circuits, foundations and institutional advisory work.'});
  return lines.slice(0, 13);
}

function socialLinks(item) {
  const name = item.canonicalName || item.name || '';
  const encoded = encodeURIComponent(name);
  const org = encodeURIComponent(item.organization || item.countryName || '');
  return {
    official: item.officialUrl || item.profileUrl || '',
    wikipedia: item.profileUrl || (item.wikiTitle ? `https://en.wikipedia.org/wiki/${item.wikiTitle}` : ''),
    wikidata: item.wikidataId ? `https://www.wikidata.org/wiki/${item.wikidataId}` : '',
    linkedinSearch: `https://www.linkedin.com/search/results/all/?keywords=${encoded}%20${org}`,
    socialSearch: `https://www.google.com/search?q=${encoded}+official+social+media`,
    notes: 'Exact social handles should be treated as verified only after official-site or platform verification.'
  };
}

const recordsByPerson = new Map();
for (const a of demo.appearances || []) {
  if (!recordsByPerson.has(a.personId)) recordsByPerson.set(a.personId, []);
  recordsByPerson.get(a.personId).push(a);
}

const peopleByName = new Map((demo.people || []).map(p => [key(p.canonicalName), p]));

function enrich(item, records=[]) {
  const code = countryCode(item);
  item.countryFocus = code;
  item.countryFocusCode = code;
  item.countryName = item.countryName || item.country || countryAlias[code] || item.region || 'Global';
  const mark = orgMark(item);
  if (mark) item.orgMark = mark;
  item.socialLinks = { ...(item.socialLinks || {}), ...socialLinks(item) };
  item.profileLines = profileLines(item, records);
  const reasons = isSuspectImage(item.imageUrl);
  item.imageAudit = {
    status: reasons.length ? (item.imageUrl ? 'review' : 'missing') : 'photo-candidate',
    reasons,
    instruction: 'Use only if the cached file matches the person and licence/attribution are stored.'
  };
  item.flagAudit = {
    code,
    status: mark ? 'institution badge' : (countryAlias[item.countryName] || item.countryName ? 'country flag' : 'review'),
    label: mark?.label || item.countryName || code
  };
  return item;
}

for (const p of demo.people || []) {
  const r = findRosterMatch(p);
  const merged = { ...r, ...p, name: p.canonicalName };
  const enriched = enrich(merged, recordsByPerson.get(p.id) || []);
  Object.assign(p, {
    countryFocus: enriched.countryFocus,
    countryFocusCode: enriched.countryFocusCode,
    countryName: enriched.countryName,
    orgMark: enriched.orgMark,
    socialLinks: enriched.socialLinks,
    profileLines: enriched.profileLines,
    imageAudit: enriched.imageAudit,
    flagAudit: enriched.flagAudit
  });
}

for (const r of demo.roster || []) {
  const p = peopleByName.get(key(r.name));
  enrich(r, p ? (recordsByPerson.get(p.id) || []) : []);
}
for (const r of top200) enrich(r, []);

demo.meta = demo.meta || {};
demo.meta.version = '3.5.0';
demo.meta.profileAudit = {
  generatedAt: new Date().toISOString(),
  note: 'Each top-200 profile now has profileLines, social search links, flag audit and image audit fields.'
};

demo.profileAuditSummary = {
  rosterProfiles: demo.roster.length,
  mappedPeople: demo.people.length,
  exactSocialPolicy: 'Show exact profile links only when verified. Otherwise use clearly labelled search links.',
  portraitPolicy: 'Display candidate portraits, but production cache must store source, author, licence, attribution and takedown path.',
  flagPolicy: 'Country figures use inline flag badges; international-body profiles use institution badges.'
};

const audit = demo.roster.map(r => ({ rank:r.rank, id:r.id, name:r.name, flagAudit:r.flagAudit, imageAudit:r.imageAudit, socialLinks:r.socialLinks }));
fs.writeFileSync(demoPath, JSON.stringify(demo, null, 2));
fs.writeFileSync(rosterPath, JSON.stringify(top200, null, 2));
fs.writeFileSync('data/profile-link-and-visual-audit.json', JSON.stringify(audit, null, 2));
console.log(`Enriched ${demo.roster.length} roster profiles and ${demo.people.length} mapped people.`);
