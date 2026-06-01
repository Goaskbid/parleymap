import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'data', 'demo.json');
const registryPath = path.join(root, 'data', 'source-registry.json');
const top200Path = path.join(root, 'data', 'top200-roster.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const now = '2026-05-30T10:15:00+02:00';

const countryNames = {
  US:'United States', RU:'Russia', CN:'China', IN:'India', GB:'United Kingdom', FR:'France', DE:'Germany', IT:'Italy', CA:'Canada', JP:'Japan', BR:'Brazil', TR:'Turkey', UA:'Ukraine', SA:'Saudi Arabia', AE:'United Arab Emirates', QA:'Qatar', IL:'Israel', BE:'Belgium', CH:'Switzerland', MY:'Malaysia', ID:'Indonesia', SG:'Singapore', MX:'Mexico', PA:'Panama', SV:'El Salvador', CR:'Costa Rica', GT:'Guatemala', DO:'Dominican Republic', JM:'Jamaica', GY:'Guyana', SR:'Suriname', EC:'Ecuador', KR:'South Korea', SK:'Slovakia', HU:'Hungary', KN:'Saint Kitts and Nevis', VA:'Holy See', CY:'Cyprus', MU:'Mauritius', TT:'Trinidad and Tobago', TT2:'Trinidad and Tobago', PT:'Portugal', KE:'Kenya', EG:'Egypt', NL:'Netherlands', AU:'Australia', SE:'Sweden', ES:'Spain', ZA:'South Africa'
};
const city = {
  Washington:['Washington','US','United States',38.8977,-77.0365],
  PalmBeach:['Palm Beach','US','United States',26.7056,-80.0364],
  PanamaCity:['Panama City','PA','Panama',8.9824,-79.5199],
  SanSalvador:['San Salvador','SV','El Salvador',13.6929,-89.2182],
  SanJose:['San José','CR','Costa Rica',9.9281,-84.0907],
  GuatemalaCity:['Guatemala City','GT','Guatemala',14.6349,-90.5069],
  SantoDomingo:['Santo Domingo','DO','Dominican Republic',18.4861,-69.9312],
  Munich:['Munich','DE','Germany',48.1351,11.5820],
  Jerusalem:['Jerusalem','IL','Israel',31.7683,35.2137],
  Riyadh:['Riyadh','SA','Saudi Arabia',24.7136,46.6753],
  AbuDhabi:['Abu Dhabi','AE','United Arab Emirates',24.4539,54.3773],
  Jeddah:['Jeddah','SA','Saudi Arabia',21.4858,39.1925],
  Charlevoix:['Charlevoix','CA','Canada',47.6575,-70.1526],
  QuebecCity:['Quebec City','CA','Canada',46.8139,-71.2080],
  Kingston:['Kingston','JM','Jamaica',17.9712,-76.7936],
  Georgetown:['Georgetown','GY','Guyana',6.8013,-58.1551],
  Paramaribo:['Paramaribo','SR','Suriname',5.8520,-55.2038],
  Brussels:['Brussels','BE','Belgium',50.8503,4.3517],
  Paris:['Paris','FR','France',48.8566,2.3522],
  Doha:['Doha','QA','Qatar',25.2854,51.5310],
  Antalya:['Antalya','TR','Turkey',36.8969,30.7133],
  Istanbul:['Istanbul','TR','Turkey',41.0082,28.9784],
  Rome:['Rome','IT','Italy',41.9028,12.4964],
  Vatican:['Vatican City','VA','Holy See',41.9029,12.4534],
  KualaLumpur:['Kuala Lumpur','MY','Malaysia',3.1390,101.6869],
  MexicoCity:['Mexico City','MX','Mexico',19.4326,-99.1332],
  Quito:['Quito','EC','Ecuador',-0.1807,-78.4678],
  London:['London','GB','United Kingdom',51.5074,-0.1278],
  NewYork:['New York','US','United States',40.7128,-74.0060],
  Tokyo:['Tokyo','JP','Japan',35.6762,139.6503],
  Gyeongju:['Gyeongju','KR','South Korea',35.8562,129.2247],
  Hamilton:['Hamilton','CA','Canada',43.2557,-79.8711],
  Geneva:['Geneva','CH','Switzerland',46.2044,6.1432],
  Milan:['Milan','IT','Italy',45.4642,9.1900],
  Bratislava:['Bratislava','SK','Slovakia',48.1486,17.1077],
  Budapest:['Budapest','HU','Hungary',47.4979,19.0402],
  Basseterre:['Basseterre','KN','Saint Kitts and Nevis',17.3026,-62.7177],
  Moscow:['Moscow','RU','Russia',55.7558,37.6173],
  Rio:['Rio de Janeiro','BR','Brazil',-22.9068,-43.1729],
  Beijing:['Beijing','CN','China',39.9042,116.4074],
  Vaux:['Vaux-de-Cernay','FR','France',48.6819,1.9366],
  Niagara:['Niagara Region','CA','Canada',43.0896,-79.0849],
  NewDelhi:['New Delhi','IN','India',28.6139,77.2090],
  Limassol:['Limassol','CY','Cyprus',34.7071,33.0226],
  PortLouis:['Port Louis','MU','Mauritius',-20.1609,57.5012],
  PortOfSpain:['Port of Spain','TT','Trinidad and Tobago',10.6549,-61.5019],
  Oslo:['Oslo','NO','Norway',59.9139,10.7522],
  Houston:['Houston','US','United States',29.7604,-95.3698],
  Chicago:['Chicago','US','United States',41.8781,-87.6298],
  Nice:['Nice','FR','France',43.7102,7.2620],
  Bishkek:['Bishkek','KG','Kyrgyzstan',42.8746,74.5698],
  Cairo:['Cairo','EG','Egypt',30.0444,31.2357],
  Lisbon:['Lisbon','PT','Portugal',38.7223,-9.1393],
  Maputo:['Maputo','MZ','Mozambique',-25.9692,32.5732],
  Dallas:['Dallas','US','United States',32.7767,-96.7970],
  LasVegas:['Las Vegas','US','United States',36.1699,-115.1398],
  ColoradoSprings:['Colorado Springs','US','United States',38.8339,-104.8214],
  Anchorage:['Anchorage','US','United States',61.2181,-149.9003]
};
function loc(key, label) {
  const [c, code, name, lat, lng] = city[key];
  return { label: label || `${c} public-event anchor`, city: c, countryCode: code, countryName: name, lat, lng, precision: 'city' };
}
function slug(s) { return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90); }
function source(label, url, rel='primary') { return { label, url, type:'official_or_host', license:'public web source; rights remain with publisher', checkedAt: now, reliability: rel }; }
function findPersonByName(name) { return data.people.find(p => p.canonicalName.toLowerCase() === name.toLowerCase()); }
function findRosterByName(name) { return data.roster.find(r => r.name.toLowerCase() === name.toLowerCase()); }
function ensurePerson(p) {
  let existing = data.people.find(x => x.id === p.id || x.canonicalName.toLowerCase() === p.canonicalName.toLowerCase());
  if (existing) { Object.assign(existing, p, { profileLines: p.profileLines || existing.profileLines }); return existing; }
  data.people.push(p);
  return p;
}
function profileLines(name, role, org, base, why, network) {
  return [
    { icon:'👤', label:'Role', text:`${name} is tracked here through ${role} records, public speeches, official visits and host-event pages.` },
    { icon:'🏛', label:'Institution', text:`Primary institution: ${org}. The map uses public professional activity, not private movement.` },
    { icon:'🗺', label:'Public base', text:`Public anchor used for map context: ${base}. This is an institutional city-level anchor.` },
    { icon:'🧭', label:'Why follow', text: why },
    { icon:'🤝', label:'Network', text: network || 'Relationship signals come from bilateral readouts, summit lists, joint statements and repeated event overlap.' },
    { icon:'🗣', label:'Record types', text:'High-value records include public visits, foreign-minister meetings, speeches, summits, calls and official communiques.' },
    { icon:'🌐', label:'Forums', text:'Priority forums: G7, G20, BRICS, UNGA, NATO, ASEAN, SCO, Davos, Bilderberg, Munich Security, Jackson Hole and regional ministerials.' },
    { icon:'🔎', label:'Source rule', text:'Official office pages and host-event pages publish first. Media fills context only after a primary source is attached.' },
    { icon:'📍', label:'Map rule', text:'No hotels, residences, live proximity, private aircraft tracking or leaked itineraries. Public dates and public cities only.' },
    { icon:'🔔', label:'Watch next', text:'Nightly refresh checks official calendars, readouts, speech pages and event attendee lists for new public records.' }
  ];
}
function makePerson({id, name, category='FOREIGN_MINISTER', role, org, sector='Government', industry='Diplomacy', code, homeCity, homeKey, wikiTitle, wikidataId='', profileUrl, birthDate='', imageUrl='', score=82, orgIcon='✦', shortBio}) {
  const home = loc(homeKey, `${homeCity} official public anchor`);
  return {
    id, slug: slug(name), canonicalName:name, category, roleTitle:role, organization:org, orgType: category === 'INTERNATIONAL_ORG' ? 'International organization' : 'National government', sector, industry, homeRegion: regionFor(code), prominenceScore:score, riskTier:3, color:'#9ecbff', shortBio: shortBio || `${role}; public records are limited to official and host-public appearances.`, officialUrl: profileUrl || '', sourceReliability:'official office page, speech index, public schedule, host-event programme, then corroborated media', orgIcon, countryFocus:code, countryFocusCode:code, countryName:countryNames[code] || code, wikiTitle, wikidataId, profileUrl: profileUrl || `https://en.wikipedia.org/wiki/${wikiTitle}`, imageUrl, imageProvider:'Wikimedia/Wikipedia thumbnail candidate or runtime hydration', visualAuditStatus:'candidate portrait; production should cache source URL, author, license and attribution text', homeBases:[home], birthDate, birthdayAuditStatus:'birth date field should be verified against Wikidata or official biography', profileLine:`${name} is tracked because frequent official travel, summits, readouts or speeches can shape diplomacy, markets or sector attention.`, socialLinks:{ official: profileUrl || '', wikipedia:`https://en.wikipedia.org/wiki/${wikiTitle}`, wikidata: wikidataId ? `https://www.wikidata.org/wiki/${wikidataId}` : '', linkedinSearch:`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(name + ' ' + org)}`, socialSearch:`https://www.google.com/search?q=${encodeURIComponent(name + ' official social media')}`, notes:'Search-style links are not verified accounts until confirmed by an official site or verified platform profile.' }, profileLines: profileLines(name, role, org, home.city, `${name} sits in a high-frequency public-diplomacy network where travel often signals the state of alliances, negotiations, sanctions, security, energy or trade policy.`, `${name}'s strongest edges are built from official bilateral readouts, summit participation and recurring ministerial forums.`), imageAudit:{ status:'photo-candidate', reasons:[], instruction:'Use only if the cached file matches the person and licence/attribution are stored.' }, flagAudit:{ code, status:'country flag', label:countryNames[code] || code }
  };
}
function regionFor(code) {
  if (['US','CA','MX'].includes(code)) return 'North America';
  if (['GB','FR','DE','IT','EU','BE','CH','RU','UA','PL','TR','VA'].includes(code)) return 'Europe';
  if (['CN','IN','JP','KR','SG','ID','SA','AE','QA','IL'].includes(code)) return 'Asia / Middle East';
  if (['BR','AR'].includes(code)) return 'Latin America';
  if (['ZA','EG','KE'].includes(code)) return 'Africa';
  return 'Global';
}
function ensureRoster(name, rank, fields) {
  let r = data.roster.find(x => x.rank === rank);
  if (!r) r = data.roster.find(x => x.name === name);
  const base = r || { rank, id:`r-${String(rank).padStart(3,'0')}-${slug(name)}` };
  Object.assign(base, fields, { rank, name, canonicalName:name, id: base.id || `r-${String(rank).padStart(3,'0')}-${slug(name)}` });
  if (!data.roster.includes(base)) data.roster.push(base);
  return base;
}
function sourcePack(list) { return list.map(s => typeof s === 'string' ? source(s, s) : s); }
function addAppearance(personName, key, date, title, summary, opts={}) {
  const p = findPersonByName(personName);
  if (!p) throw new Error(`Missing person ${personName}`);
  const sourceList = opts.sources || [];
  const id = opts.id || `a-${date.slice(0,10)}-${slug(personName)}-${slug(city[key][0])}-${slug(title)}`;
  const exists = data.appearances.find(a => a.id === id);
  const a = { id, personId:p.id, startsAt:date, endsAt:opts.endsAt || null, status: opts.status || (new Date(date) > new Date('2026-05-30T00:00:00Z') ? 'ANNOUNCED_FUTURE':'VERIFIED_PAST'), confidence: opts.confidence || 0.86, confidenceLabel: opts.confidenceLabel || 'official or host-public source identifies the public event or official travel', eventType:opts.eventType || 'Official public appearance', title, summary, significance: opts.significance || `${title} is useful for the influence graph because it places ${personName} in a public, source-backed diplomatic or strategic setting.`, decisions: opts.decisions || 'Use the source pack for communiques, statements or signing details. No private meetings are inferred.', location: loc(key, opts.label), venuePublic:true, securityPrecision:'city/public-event level only; no private stops, hotels, residences, leaked routes or live proximity', publicInterestScore: opts.score || p.prominenceScore || 75, eventGroupId: opts.group || `eg-${date.slice(0,10)}-${slug(title)}`, topics: opts.topics || ['diplomacy'], counterpartIds: opts.counterparts || [], sourcePack: sourcePack(sourceList), visual:{ status:'runtime-or-audited-portrait', policy:'Use only self-created, public-domain, official-use, or license-audited media with attribution captured.', license:'not bundled; portraits require license and attribution capture' }, lastCheckedAt:now, marketImpact: opts.marketImpact || { sectors:opts.sectors || ['diplomacy'], countries:[city[key][1], p.countryFocus].filter(Boolean), companies:[], confidence:'medium' } };
  if (opts.transport) a.transport = opts.transport;
  if (opts.sourceNote) a.sourceNote = opts.sourceNote;
  if (exists) Object.assign(exists, a); else data.appearances.push(a);
  return a;
}
function addEncounter(id, title, date, key, participants, appearanceIds, opts={}) {
  const ids = participants.map(name => findPersonByName(name)?.id).filter(Boolean);
  const locObj = loc(key);
  const existing = data.encounters.find(e => e.id === id);
  const e = { id, eventGroupId:opts.group || id, title, date:date.slice(0,10), location:locObj, participantIds:ids, appearanceIds:appearanceIds.filter(Boolean), summary:opts.summary || `${participants.join(', ')} appear in the same public-source event cluster.`, outcome:opts.outcome || 'Only public statements, communiques and host pages are used for outcome language.', score:opts.score || 92, startsAt:date, type:opts.type || 'Public meeting cluster', importanceScore:opts.score || 92, peaceProcess:!!opts.peace, whyThisMatters:opts.why || 'This cluster links several high-level public schedules to one forum, making it valuable for relationship and event-attendee analysis.', sourcePack:sourcePack(opts.sources || []) };
  if (existing) Object.assign(existing, e); else data.encounters.push(e);
}
function addCall(id, participants, date, title, summary, sourceObj, topics=['diplomacy']) {
  const ids = participants.map(name => findPersonByName(name)?.id).filter(Boolean);
  if (ids.length < 2) return;
  const call = { id, participantIds:ids, startsAt:date, title, summary, source:sourceObj, topics };
  const exists = data.calls?.find(c => c.id === id) || data.telephoneCalls?.find(c => c.id === id);
  data.calls = data.calls || [];
  data.telephoneCalls = data.telephoneCalls || [];
  if (exists) Object.assign(exists, call); else { data.calls.push(call); data.telephoneCalls.push(call); }
}

const newPeople = [
  makePerson({ id:'p-sergey-lavrov', name:'Sergey Lavrov', role:'Foreign Minister of the Russian Federation', org:'Ministry of Foreign Affairs of Russia', code:'RU', homeCity:'Moscow', homeKey:'Moscow', wikiTitle:'Sergey_Lavrov', wikidataId:'Q181746', birthDate:'1950-03-21', score:91, shortBio:'Russian foreign minister; frequent BRICS, UN, SCO and regional diplomacy traveller.' }),
  makePerson({ id:'p-wang-yi', name:'Wang Yi', role:'Foreign Minister of China', org:'Ministry of Foreign Affairs of the People’s Republic of China', code:'CN', homeCity:'Beijing', homeKey:'Beijing', wikiTitle:'Wang_Yi_(politician)', wikidataId:'Q702303', birthDate:'1953-10-19', score:94, shortBio:'Chinese foreign minister and senior party diplomat; frequent BRICS, SCO and bilateral-meeting actor.' }),
  makePerson({ id:'p-yvette-cooper', name:'Yvette Cooper', role:'UK Foreign Secretary', org:'Foreign, Commonwealth & Development Office', code:'GB', homeCity:'London', homeKey:'London', wikiTitle:'Yvette_Cooper', wikidataId:'Q235675', birthDate:'1969-03-20', score:82 }),
  makePerson({ id:'p-jean-noel-barrot', name:'Jean-Noël Barrot', role:'Minister for Europe and Foreign Affairs of France', org:'France Diplomatie', code:'FR', homeCity:'Paris', homeKey:'Paris', wikiTitle:'Jean-Noël_Barrot', wikidataId:'Q28413627', birthDate:'1983-05-13', score:82 }),
  makePerson({ id:'p-johann-wadephul', name:'Johann Wadephul', role:'Federal Foreign Minister of Germany', org:'Federal Foreign Office', code:'DE', homeCity:'Berlin', homeKey:'Brussels', wikiTitle:'Johann_Wadephul', wikidataId:'Q1681190', birthDate:'1963-02-10', score:82 }),
  makePerson({ id:'p-antonio-tajani', name:'Antonio Tajani', role:'Minister of Foreign Affairs of Italy', org:'Italian Ministry of Foreign Affairs', code:'IT', homeCity:'Rome', homeKey:'Rome', wikiTitle:'Antonio_Tajani', wikidataId:'Q310779', birthDate:'1953-08-04', score:82 }),
  makePerson({ id:'p-anita-anand', name:'Anita Anand', role:'Minister of Foreign Affairs of Canada', org:'Global Affairs Canada', code:'CA', homeCity:'Ottawa', homeKey:'QuebecCity', wikiTitle:'Anita_Anand', wikidataId:'Q67284378', birthDate:'1967-05-20', score:80 }),
  makePerson({ id:'p-toshimitsu-motegi', name:'Toshimitsu Motegi', role:'Minister for Foreign Affairs of Japan', org:'Ministry of Foreign Affairs of Japan', code:'JP', homeCity:'Tokyo', homeKey:'Tokyo', wikiTitle:'Toshimitsu_Motegi', wikidataId:'Q946265', birthDate:'1955-10-07', score:80 }),
  makePerson({ id:'p-takeshi-iwaya', name:'Takeshi Iwaya', role:'Former Minister for Foreign Affairs of Japan', org:'Ministry of Foreign Affairs of Japan', code:'JP', homeCity:'Tokyo', homeKey:'Tokyo', wikiTitle:'Takeshi_Iwaya', wikidataId:'Q3510239', birthDate:'1957-08-24', score:77 }),
  makePerson({ id:'p-mauro-vieira', name:'Mauro Vieira', role:'Minister of Foreign Affairs of Brazil', org:'Ministry of Foreign Affairs of Brazil', code:'BR', homeCity:'Brasília', homeKey:'Rio', wikiTitle:'Mauro_Vieira', wikidataId:'Q18455069', birthDate:'1951-02-15', score:80 }),
  makePerson({ id:'p-hakan-fidan', name:'Hakan Fidan', role:'Minister of Foreign Affairs of Türkiye', org:'Ministry of Foreign Affairs of Türkiye', code:'TR', homeCity:'Ankara', homeKey:'Antalya', wikiTitle:'Hakan_Fidan', wikidataId:'Q5643422', birthDate:'1968-07-17', score:80 }),
  makePerson({ id:'p-andrii-sybiha', name:'Andrii Sybiha', role:'Minister of Foreign Affairs of Ukraine', org:'Ministry of Foreign Affairs of Ukraine', code:'UA', homeCity:'Kyiv', homeKey:'Moscow', wikiTitle:'Andrii_Sybiha', wikidataId:'Q12221523', birthDate:'1975-01-01', score:78 }),
  makePerson({ id:'p-jd-vance', name:'JD Vance', category:'HEAD_OF_GOVERNMENT', role:'Vice President of the United States', org:'The White House', code:'US', homeCity:'Washington', homeKey:'Washington', wikiTitle:'JD_Vance', wikidataId:'Q16231168', birthDate:'1984-08-02', score:90, orgIcon:'◈' }),
  makePerson({ id:'p-melanie-joly', name:'Mélanie Joly', role:'Former Foreign Minister of Canada', org:'Global Affairs Canada', code:'CA', homeCity:'Ottawa', homeKey:'QuebecCity', wikiTitle:'Mélanie_Joly', wikidataId:'Q16227239', birthDate:'1979-01-16', score:74 }),
  makePerson({ id:'p-prince-rahim-aga-khan', name:'Aga Khan V', category:'PHILANTHROPY', role:'Imam of the Nizari Ismaili Muslims and AKDN chair', org:'Aga Khan Development Network', sector:'Philanthropy', industry:'Development / philanthropy', code:'INT', homeCity:'Geneva', homeKey:'Geneva', wikiTitle:'Aga_Khan_V', wikidataId:'Q46879264', birthDate:'1971-10-12', score:79, orgIcon:'✚' }),
  makePerson({ id:'p-ariane-de-rothschild', name:'Ariane de Rothschild', category:'BUSINESS_LEADER', role:'CEO of Edmond de Rothschild', org:'Edmond de Rothschild Group', sector:'Finance', industry:'Private banking / family capital', code:'CH', homeCity:'Geneva', homeKey:'Geneva', wikiTitle:'Ariane_de_Rothschild', wikidataId:'Q3076488', birthDate:'1965-11-14', score:76, orgIcon:'▣' })
];
newPeople.forEach(ensurePerson);

// Replace a small number of less-travel-heavy roster slots with frequent-traveller and connector profiles while keeping exactly 200 rows.
const rosterReplacements = [
  [45, 'Sergey Lavrov', newPeople[0]], [84, 'Yvette Cooper', newPeople[2]], [126, 'Jean-Noël Barrot', newPeople[3]], [137, 'Johann Wadephul', newPeople[4]], [140, 'Antonio Tajani', newPeople[5]], [148, 'Anita Anand', newPeople[6]], [184, 'Toshimitsu Motegi', newPeople[7]], [188, 'Mauro Vieira', newPeople[9]], [193, 'Hakan Fidan', newPeople[10]], [195, 'Andrii Sybiha', newPeople[11]], [198, 'Aga Khan V', newPeople[14]], [199, 'Ariane de Rothschild', newPeople[15]]
];
for (const [rank, name, p] of rosterReplacements) {
  ensureRoster(name, rank, { id:`r-${String(rank).padStart(3,'0')}-${slug(name)}`, slug:slug(name), wikiTitle:p.wikiTitle, wikidataId:p.wikidataId || `Q-${slug(name)}`, profileUrl:p.profileUrl, region:p.homeRegion, country:p.countryName || p.countryFocus, bucket:p.roleTitle, sector:p.sector, organization:p.organization, prominenceScore:p.prominenceScore, imageUrl:p.imageUrl || '', imageProvider:p.imageProvider, visualAuditStatus:p.visualAuditStatus, trackingStatus:'profile ready; dated public records are added after verification', sourcePriority:'official office page, public schedule, host-event programme, speech page or attendee list', roleTitle:p.roleTitle, homeRegion:p.homeRegion, countryFocus:p.countryFocus, industry:p.industry, shortBio:p.shortBio, category:p.category, orgIcon:p.orgIcon, visualStatus:'portrait requires license and attribution capture', locationStatus:'frequent-traveller priority profile', birthDate:p.birthDate, birthdayAuditStatus:p.birthdayAuditStatus, countryName:p.countryName, countryFocusCode:p.countryFocus, profileLine:p.profileLine, profileLines:p.profileLines, socialLinks:p.socialLinks, imageAudit:p.imageAudit, flagAudit:p.flagAudit });
}
data.roster.sort((a,b)=>a.rank-b.rank);

const S = {
  stateMileage: source('State Department: Secretary Rubio countries visited and mileage', 'https://www.state.gov/secretary-rubios-countries-visited-and-mileage/'),
  stateJeddahCanada: source('State Department: Rubio travel to Saudi Arabia and Canada', 'https://www.state.gov/secretary-rubios-travel-to-saudi-arabia-and-canada/'),
  stateMarch13: source('State Department public schedule: March 13, 2025', 'https://www.state.gov/public-schedule-march-13-2025/'),
  stateGulf: source('State Department: Rubio travel to Saudi Arabia, Qatar, Türkiye, Italy, Holy See', 'https://www.state.gov/releases/office-of-the-spokesperson/2025/05/secretary-rubios-travel-to-saudi-arabia-qatar-and-turkiye/'),
  stateG7Charlevoix: source('State Department: G7 Foreign Ministers statement Charlevoix', 'https://www.state.gov/statement-of-the-g7-foreign-ministers-meeting-in-charlevoix/'),
  stateCallFMs: source('State Department: Rubio call with foreign ministers', 'https://www.state.gov/releases/office-of-the-spokesperson/2025/05/secretary-rubios-call-with-foreign-ministers/'),
  netFebGov: source('Israel PMO: Netanyahu meets Trump at the White House, Feb. 2025', 'https://www.gov.il/en/pages/pm-netanyahu-meets-with-president-trump-at-the-white-house-4-feb-2025'),
  netAprGov: source('Israel PMO: Netanyahu remarks with Trump, Apr. 2025', 'https://www.gov.il/en/pages/pm-netanyahu-s-remarks-at-the-start-of-his-meeting-with-us-president-donald-trump-7-apr-2025'),
  whNetJul: source('White House video: Trump dinner with Netanyahu', 'https://www.whitehouse.gov/videos/president-trump-participates-in-a-dinner-with-the-prime-minister-of-the-state-of-israel/'),
  net2026Emb: source('Israel MFA mission: Netanyahu meets Trump at the White House, Feb. 2026', 'https://embassies.gov.il/ungeneva/en/news/pm-netanyahu-meets-us-president-donald-trump-white-house-11-feb-2026'),
  midAntalya: source('Russian MFA: Lavrov at Antalya Diplomacy Forum', 'https://www.mid.ru/en/press_service/video/view/2008763/'),
  midRio: source('Russian MFA: Lavrov meets Wang Yi in Rio de Janeiro', 'https://www.mid.ru/en/foreign_policy/brics/2012239/'),
  chinaRio: source('China MFA: Wang Yi meets Sergey Lavrov in Rio de Janeiro', 'https://www.mfa.gov.cn/eng/wjbzhd/202504/t20250429_11609213.html'),
  midKL: source('Russian MFA: Lavrov after Russia-ASEAN and EAS meetings in Kuala Lumpur', 'https://www.mid.ru/en/press_service/minister_speeches/2035561/'),
  chinaBeijing: source('China MFA: Wang Yi meets Sergey Lavrov in Beijing', 'https://www.mfa.gov.cn/eng/wjbzhd/202507/t20250714_11670396.html'),
  midUNGA: source('Russian MFA: Lavrov UN General Assembly remarks', 'https://www.mid.ru/en/foreign_policy/news/2049686/'),
  unLavrov: source('UN Web TV: Russia general debate, 80th session', 'https://webtv.un.org/en/asset/k1y/k1yhyj5wv0'),
  canadaCharlevoix: source('Global Affairs Canada: G7 Foreign Ministers Charlevoix statement', 'https://www.canada.ca/en/global-affairs/news/2025/03/joint-statement-of-the-g7-foreign-ministers-meeting-in-charlevoix.html'),
  canadaNiagara: source('Global Affairs Canada: G7 Foreign Ministers Niagara participants', 'https://www.canada.ca/en/global-affairs/news/2025/11/minister-anand-announces-participants-for-g7-foreign-ministers-meeting-in-niagara.html'),
  franceG7Vaux: source('France Diplomatie: G7 Foreign Ministers meeting Vaux-de-Cernay', 'https://www.diplomatie.gouv.fr/en/presse-et-ressources/decouvrir-et-informer/actualites/g7-reunion-des-ministres-des-affaires-etrangeres-des-pays-membres-du-g7-a-l-abbaye-des-vaux-de'),
  meaVisits: source('India MEA: EAM visits index', 'https://www.mea.gov.in/eam-visits.htm'),
  meaVisitsAll: source('India MEA: visits index', 'https://www.mea.gov.in/visits.htm'),
  meaNews: source('India MEA news: Quad and recent EAM items', 'https://www.mea.gov.in/news.htm'),
  mofaIwaya: source('Japan MOFA: Foreign Minister IWAYA trips', 'https://www.mofa.go.jp/about/hq/fm_corner/iwaya/index.html'),
  mofaHome: source('Japan MOFA: Foreign Minister MOTEGI news', 'https://www.mofa.go.jp/'),
  bricsMauro: source('BRICS Brazil: Mauro Vieira opens BRICS Foreign Ministers meeting', 'https://brics.br/en/news/speeches/address-by-minister-mauro-vieira-at-the-opening-of-the-brics-foreign-ministers-meeting-rio-de-janeiro-abril-28-2025'),
  govBrMauro: source('Brazil MFA: Mauro Vieira speeches and ministerial records', 'https://www.gov.br/mre/en/content-centers/speeches-articles-and-interviews/minister-of-foreign-affairs/speeches/mauro-vieira-2023'),
  whVanceMunich: source('White House: VP Vance remarks at Munich Security Conference', 'https://www.whitehouse.gov/videos/vice-president-jd-vance-delivers-remarks-at-the-munich-security-conference/'),
  whVancePope: source('White House: Pope Leo XIV greets VP Vance and Secretary Rubio', 'https://www.whitehouse.gov/videos/pope-leo-xiv-greets-vp-jd-vance-sec-marco-rubio-after-his-inaugural-mass-at-the-vatican/'),
  whVanceBitcoin: source('White House: VP Vance at Bitcoin 2025 Conference', 'https://www.whitehouse.gov/videos/vp-jd-vance-at-the-bitcoin-2025-conference/'),
  whVanceAFA: source('White House live: VP Vance Air Force Academy commencement', 'https://www.whitehouse.gov/live/'),
  bilder2025: source('Bilderberg: participant list 2025', 'https://www.bilderbergmeetings.org/meetings/meeting-2025/participants-2025'),
  bilder2026: source('Bilderberg: participant list 2026', 'https://www.bilderbergmeetings.org/meetings/meeting-2026/participants-2026'),
  edR: source('Edmond de Rothschild: Ariane de Rothschild profile', 'https://www.edmond-de-rothschild.com/en/governance/ariane-de-rothschild'),
  akdn: source('Aga Khan Development Network orientation', 'https://orientation.akdn.org/')
};

// Marco Rubio travel spine from official State Department mileage/travel pages.
const rubioRecords = [
  ['PanamaCity','2025-02-01T12:00:00-05:00','Central America opening trip','Public travel stop in Panama at the start of Secretary Rubio’s first regional swing.', ['Central America','diplomacy']],
  ['SanSalvador','2025-02-03T12:00:00-06:00','El Salvador diplomatic stop','Public trip leg tied to regional migration, security and bilateral meetings.', ['Central America','security']],
  ['SanJose','2025-02-04T12:00:00-06:00','Costa Rica diplomatic stop','Public stop in Costa Rica during the Central America and Caribbean travel swing.', ['Central America','diplomacy']],
  ['GuatemalaCity','2025-02-04T18:00:00-06:00','Guatemala diplomatic stop','Public regional diplomacy stop in Guatemala City.', ['Central America','diplomacy']],
  ['SantoDomingo','2025-02-05T12:00:00-04:00','Dominican Republic diplomatic stop','Public stop in Santo Domingo during the February regional travel swing.', ['Caribbean','diplomacy']],
  ['Munich','2025-02-14T12:00:00+01:00','Munich Security and G7 foreign-ministers week','Secretary Rubio’s travel page places him in Munich for G7 foreign-minister activity and allied security discussions.', ['security','G7']],
  ['Jerusalem','2025-02-16T12:00:00+02:00','Israel diplomatic stop','Public stop in Jerusalem during the February Middle East travel sequence.', ['Middle East','diplomacy']],
  ['Riyadh','2025-02-18T12:00:00+03:00','Saudi Arabia diplomatic stop','Public stop in Riyadh during the February Middle East travel sequence.', ['Middle East','security']],
  ['AbuDhabi','2025-02-19T12:00:00+04:00','United Arab Emirates diplomatic stop','Public stop in Abu Dhabi during the February regional travel sequence.', ['Gulf','investment']],
  ['Jeddah','2025-03-10T12:00:00+03:00','Jeddah Ukraine talks','State Department said Rubio travelled to Jeddah for talks with Ukrainian counterparts and a meeting with Saudi Crown Prince Mohammed bin Salman.', ['peace','Ukraine','Saudi Arabia']],
  ['Charlevoix','2025-03-13T09:00:00-04:00','G7 foreign ministers in Charlevoix','Public schedule places Rubio in G7 sessions and bilateral meetings in Charlevoix.', ['G7','foreign ministers']],
  ['Kingston','2025-03-26T12:00:00-05:00','Jamaica public schedule stop','Public schedule lists meetings in Kingston with Jamaican leadership.', ['Caribbean','security']],
  ['Georgetown','2025-03-27T12:00:00-04:00','Guyana public schedule stop','Public schedule lists meetings and a security-cooperation signing in Georgetown.', ['Caribbean','security']],
  ['Paramaribo','2025-03-27T18:00:00-03:00','Suriname public schedule stop','State Department travel record includes Paramaribo on the same regional swing.', ['Caribbean','diplomacy']],
  ['Brussels','2025-04-03T12:00:00+02:00','Brussels NATO and diplomacy stop','Official travel listing places Rubio in Brussels in early April.', ['NATO','security']],
  ['Paris','2025-04-17T12:00:00+02:00','Paris foreign-policy stop','Official travel listing places Rubio in Paris in mid-April.', ['diplomacy']],
  ['Riyadh','2025-05-12T12:00:00+03:00','Gulf visit with presidential travel','State Department announced Rubio would accompany the President to Saudi Arabia and Qatar.', ['Gulf','investment']],
  ['Doha','2025-05-14T12:00:00+03:00','Qatar visit with presidential travel','Public travel record places Rubio in Qatar during the May Gulf sequence.', ['Gulf','diplomacy']],
  ['Antalya','2025-05-15T12:00:00+03:00','NATO informal foreign ministers in Antalya','State Department announced Rubio’s travel to Antalya for the NATO informal foreign ministers meeting.', ['NATO','foreign ministers']],
  ['Rome','2025-05-17T12:00:00+02:00','Rome and Holy See travel window','Official travel record places Rubio in Italy and the Holy See after Türkiye.', ['Vatican','diplomacy']],
  ['KualaLumpur','2025-07-10T12:00:00+08:00','Malaysia ASEAN diplomacy week','Official travel listing places Rubio in Kuala Lumpur in July.', ['ASEAN','foreign ministers']],
  ['MexicoCity','2025-09-02T12:00:00-06:00','Mexico City diplomatic stop','Official travel listing places Rubio in Mexico City during a September regional swing.', ['Mexico','diplomacy']],
  ['Quito','2025-09-03T12:00:00-05:00','Quito diplomatic stop','Official travel listing places Rubio in Quito during the same regional swing.', ['Ecuador','security']],
  ['Jerusalem','2025-09-14T12:00:00+02:00','Israel diplomatic visit','Official travel listing places Rubio in Jerusalem in mid-September.', ['Middle East','security']],
  ['Doha','2025-09-16T12:00:00+03:00','Doha stop during Middle East and UK travel','Official travel listing places Rubio in Doha during the September sequence.', ['Qatar','diplomacy']],
  ['London','2025-09-17T12:00:00+01:00','London diplomatic stop','Official travel listing places Rubio in London during the September sequence.', ['UK','diplomacy']],
  ['NewYork','2025-09-23T12:00:00-04:00','UN General Assembly high-level week','Official travel listing places Rubio at the UNGA high-level week in New York.', ['UNGA','diplomacy']],
  ['KualaLumpur','2025-10-25T12:00:00+08:00','Malaysia return stop','Official travel listing places Rubio in Kuala Lumpur during the October Asia sequence.', ['ASEAN','Asia']],
  ['Tokyo','2025-10-27T12:00:00+09:00','Tokyo Asia diplomacy stop','Official travel listing places Rubio in Tokyo.', ['Japan','Asia']],
  ['Gyeongju','2025-10-29T12:00:00+09:00','Gyeongju diplomacy stop','Official travel listing places Rubio in Gyeongju, Republic of Korea.', ['Korea','Asia']],
  ['Hamilton','2025-11-11T12:00:00-05:00','G7 foreign ministers in Niagara region','Official travel listing places Rubio in Canada for the G7 foreign ministers meeting.', ['G7','foreign ministers']],
  ['Geneva','2025-11-22T12:00:00+01:00','Geneva public diplomacy stop','Official travel listing places Rubio in Geneva in November.', ['Geneva','diplomacy']],
  ['Milan','2026-02-05T12:00:00+01:00','Milan public diplomacy stop','Official travel listing places Rubio in Milan in February 2026.', ['Italy','diplomacy']],
  ['Munich','2026-02-13T12:00:00+01:00','Munich Security Conference return','Official travel listing places Rubio in Munich in February 2026.', ['Munich Security','security']],
  ['Bratislava','2026-02-15T12:00:00+01:00','Bratislava diplomatic stop','Official travel listing places Rubio in Slovakia.', ['Slovakia','diplomacy']],
  ['Budapest','2026-02-16T12:00:00+01:00','Budapest diplomatic stop','Official travel listing places Rubio in Hungary.', ['Hungary','diplomacy']],
  ['Basseterre','2026-02-25T12:00:00-04:00','Saint Kitts and Nevis visit','Official travel listing places Rubio in Basseterre.', ['Caribbean','diplomacy']],
  ['Paris','2026-03-27T12:00:00+01:00','G7 foreign ministers in France','Official travel listing places Rubio in France on the G7 foreign-ministers date.', ['G7','foreign ministers']],
  ['Vatican','2026-05-07T12:00:00+02:00','Holy See public visit','Official travel listing places Rubio in Vatican City in May 2026.', ['Vatican','diplomacy']]
];
rubioRecords.forEach(([key,date,title,summary,topics]) => addAppearance('Marco Rubio', key, date, title, summary, { sources:[S.stateMileage, S.stateJeddahCanada, S.stateMarch13, S.stateGulf], group:`eg-rubio-travel-${date.slice(0,7)}`, topics, eventType:'Official travel / public schedule', score:88 }));

// Netanyahu Washington visits after Trump returned to office.
addAppearance('Benjamin Netanyahu','Washington','2025-02-04T15:00:00-05:00','Netanyahu at the White House','Israel PMO published Netanyahu’s White House press-conference remarks with President Trump during the first foreign-leader visit of the term.',{sources:[S.netFebGov], group:'eg-netanyahu-wh-2025-02', topics:['Israel','United States','Gaza'], counterparts:['p-donald-trump'], score:96});
addAppearance('Benjamin Netanyahu','Washington','2025-04-07T15:00:00-04:00','Netanyahu second-term White House meeting','Israel PMO published remarks at the start of Netanyahu’s April meeting with President Trump, focused on Iran and regional security.',{sources:[S.netAprGov], group:'eg-netanyahu-wh-2025-04', topics:['Israel','Iran','United States'], counterparts:['p-donald-trump'], score:95});
addAppearance('Benjamin Netanyahu','Washington','2025-07-08T19:00:00-04:00','Netanyahu White House dinner','The White House video record shows President Trump participating in a dinner with Israel’s prime minister.',{sources:[S.whNetJul], group:'eg-netanyahu-wh-2025-07', topics:['Israel','United States','Middle East'], counterparts:['p-donald-trump'], score:94});
addAppearance('Benjamin Netanyahu','Washington','2026-02-11T14:00:00-05:00','Netanyahu White House meeting','An official Israeli mission page says Netanyahu met President Trump and his team at the White House to discuss Iran, Gaza and regional developments.',{sources:[S.net2026Emb], group:'eg-netanyahu-wh-2026-02', topics:['Israel','Iran','Gaza'], counterparts:['p-donald-trump'], score:95});

// Lavrov / Wang / BRICS / SCO / UNGA spine.
addAppearance('Sergey Lavrov','Antalya','2025-04-12T16:00:00+03:00','Antalya Diplomacy Forum appearance','Russian MFA published Lavrov’s media remarks from the Antalya Diplomacy Forum.',{sources:[S.midAntalya], group:'eg-antalya-diplomacy-2025', topics:['diplomacy','security'], counterparts:['p-hakan-fidan'], score:88});
addAppearance('Hakan Fidan','Antalya','2025-04-12T14:00:00+03:00','Antalya Diplomacy Forum host diplomacy','Türkiye’s diplomacy forum created a high-density foreign-minister week in Antalya, including meetings involving Hakan Fidan and Sergey Lavrov.',{sources:[S.midAntalya], group:'eg-antalya-diplomacy-2025', topics:['diplomacy','security'], counterparts:['p-sergey-lavrov'], score:82});
addAppearance('Sergey Lavrov','Rio','2025-04-28T13:00:00-03:00','BRICS foreign ministers in Rio','Russian MFA and China MFA records place Lavrov and Wang Yi together at the BRICS Council of Foreign Ministers in Rio de Janeiro.',{sources:[S.midRio,S.chinaRio], group:'eg-brics-fm-rio-2025', topics:['BRICS','foreign ministers','global governance'], counterparts:['p-wang-yi','p-mauro-vieira'], score:94});
addAppearance('Wang Yi','Rio','2025-04-28T13:00:00-03:00','Wang Yi meets Lavrov in Rio','China MFA says Wang Yi met Sergey Lavrov in Rio de Janeiro on the sidelines of the BRICS foreign-ministers meeting.',{sources:[S.chinaRio], group:'eg-brics-fm-rio-2025', topics:['BRICS','China','Russia'], counterparts:['p-sergey-lavrov','p-mauro-vieira'], score:94});
addAppearance('Mauro Vieira','Rio','2025-04-28T10:00:00-03:00','BRICS foreign ministers hosted by Brazil','Brazil’s BRICS presidency published Mauro Vieira’s opening address welcoming ministers to Rio for the BRICS foreign-ministers meeting.',{sources:[S.bricsMauro,S.govBrMauro], group:'eg-brics-fm-rio-2025', topics:['BRICS','global governance'], counterparts:['p-sergey-lavrov','p-wang-yi'], score:90});
addAppearance('Sergey Lavrov','Rio','2025-07-06T12:00:00-03:00','BRICS leaders summit delegation in Rio','Public reporting and Russian-linked records placed Lavrov at the Rio BRICS leaders summit while Putin participated remotely.',{sources:[S.midRio,S.bricsMauro], group:'eg-brics-summit-rio-2025', topics:['BRICS','summit'], score:92});
addAppearance('Sergey Lavrov','KualaLumpur','2025-07-11T12:00:00+08:00','Russia-ASEAN and East Asia Summit meetings','Russian MFA published Lavrov’s remarks after the Russia-ASEAN and East Asia Summit ministerial meetings in Kuala Lumpur.',{sources:[S.midKL], group:'eg-asean-kl-2025', topics:['ASEAN','East Asia Summit','security'], counterparts:['p-marco-rubio'], score:92});
addAppearance('Sergey Lavrov','Beijing','2025-07-13T18:00:00+08:00','SCO foreign-ministers week in Beijing','China MFA says Wang Yi met Lavrov in Beijing when Lavrov came for the SCO Foreign Ministers Council Meeting.',{sources:[S.chinaBeijing], group:'eg-sco-fm-beijing-2025', topics:['SCO','China','Russia'], counterparts:['p-wang-yi'], score:94});
addAppearance('Wang Yi','Beijing','2025-07-13T18:00:00+08:00','Wang Yi meets Lavrov during SCO ministerial week','China MFA’s record links Wang Yi and Sergey Lavrov to the SCO foreign-ministers week in Beijing.',{sources:[S.chinaBeijing], group:'eg-sco-fm-beijing-2025', topics:['SCO','China','Russia'], counterparts:['p-sergey-lavrov'], score:93});
addAppearance('Sergey Lavrov','NewYork','2025-09-25T15:00:00-04:00','G20 foreign ministers on the UNGA sidelines','Russian MFA records Lavrov’s statement at the G20 Foreign Ministers’ Meeting held on the sidelines of UNGA.',{sources:[S.midUNGA], group:'eg-unga-g20-fm-2025', topics:['G20','UNGA','foreign ministers'], score:92});
addAppearance('Sergey Lavrov','NewYork','2025-09-27T12:00:00-04:00','UN General Assembly address','Russian MFA and UN Web TV both place Sergey Lavrov at the General Debate of the 80th UN General Assembly in New York.',{sources:[S.midUNGA,S.unLavrov], group:'eg-unga-80-2025', topics:['UNGA','Russia','security'], score:92});

// Jaishankar travel expansion from official MEA visit index and news pages.
const jaishankar = [
  ['Moscow','2025-08-20T12:00:00+03:00','India-Russia intergovernmental commission in Moscow','MEA visit index lists Jaishankar’s August 2025 official visit to Russia.', ['India','Russia','trade']],
  ['Niagara','2025-11-12T12:00:00-05:00','G7 foreign ministers outreach in Ontario','MEA visit index lists Jaishankar’s November 2025 visit to Ontario, Canada; Canadian sources place the G7 foreign-ministers meeting in Niagara on those dates.', ['G7','India','Canada']],
  ['Moscow','2025-11-18T12:00:00+03:00','Moscow foreign-policy visit','MEA visit index lists a November 2025 visit by Jaishankar to Moscow.', ['India','Russia']],
  ['Washington','2026-02-03T12:00:00-05:00','United States visit','MEA visits index lists Jaishankar’s February 2026 visit to the United States.', ['India','United States']],
  ['Brussels','2026-03-16T12:00:00+01:00','Belgium and EU visit','MEA visits index lists Jaishankar’s March 2026 visit to Belgium.', ['India','EU']],
  ['Vaux','2026-03-27T12:00:00+01:00','G7 foreign ministers in France','MEA visits index lists Jaishankar’s visit to France for the G7 foreign-ministers meeting.', ['G7','India','France']],
  ['PortLouis','2026-04-10T12:00:00+04:00','Mauritius visit','MEA visits index lists Jaishankar’s April 2026 visit to Mauritius.', ['Indian Ocean','diplomacy']],
  ['AbuDhabi','2026-04-12T12:00:00+04:00','UAE visit','MEA visits index lists Jaishankar’s April 2026 UAE stop.', ['Gulf','India']],
  ['Kingston','2026-05-03T12:00:00-05:00','Jamaica visit','MEA visits index lists Jaishankar’s May 2026 Caribbean visit beginning in Jamaica.', ['Caribbean','India']],
  ['Paramaribo','2026-05-05T12:00:00-03:00','Suriname visit','MEA visits index lists Suriname within Jaishankar’s May 2026 Caribbean travel.', ['Caribbean','India']],
  ['PortOfSpain','2026-05-08T12:00:00-04:00','Trinidad and Tobago visit','MEA visits index lists Trinidad and Tobago within Jaishankar’s May 2026 Caribbean travel.', ['Caribbean','India']],
  ['Limassol','2026-05-28T12:00:00+03:00','EU Gymnich meeting in Cyprus','MEA’s front page listed Jaishankar attending the informal Gymnich meeting of EU foreign ministers in Limassol.', ['EU','India','foreign ministers']]
];
jaishankar.forEach(([key,date,title,summary,topics]) => addAppearance('Subrahmanyam Jaishankar', key, date, title, summary, { sources:[S.meaVisits,S.meaVisitsAll,S.meaNews], group:`eg-jaishankar-${date.slice(0,7)}`, topics, eventType:'Official travel / foreign-minister meeting', score:88 }));

// G7 foreign minister event edges: Charlevoix 2025, Niagara 2025, Vaux-de-Cernay 2026.
const charlevoixNames = ['Marco Rubio','Kaja Kallas','Jean-Noël Barrot','Antonio Tajani','Takeshi Iwaya','Mélanie Joly'];
const charA = [];
for (const name of charlevoixNames) charA.push(addAppearance(name,'Charlevoix','2025-03-13T10:00:00-04:00','G7 foreign ministers in Charlevoix','Official G7 statements place the foreign ministers of G7 members and the EU High Representative in Charlevoix from March 12 to 14, 2025.',{sources:[S.canadaCharlevoix,S.stateG7Charlevoix], group:'eg-g7-fm-charlevoix-2025', topics:['G7','foreign ministers','Ukraine'], counterparts:charlevoixNames.filter(x=>x!==name).map(n=>findPersonByName(n)?.id).filter(Boolean), score:88}).id);
addEncounter('enc-g7-fm-charlevoix-2025','G7 foreign ministers in Charlevoix','2025-03-13T10:00:00-04:00','Charlevoix', charlevoixNames, charA, { group:'eg-g7-fm-charlevoix-2025', sources:[S.canadaCharlevoix,S.stateG7Charlevoix], score:94, why:'A compact G7 foreign-minister cluster: Ukraine, Indo-Pacific, Iran, sanctions, maritime security and alliance management all flow through this table.' });
const niagaraNames = ['Marco Rubio','Anita Anand','Kaja Kallas','Jean-Noël Barrot','Antonio Tajani','Subrahmanyam Jaishankar'];
const niA = [];
for (const name of niagaraNames) niA.push(addAppearance(name,'Niagara','2025-11-12T10:00:00-05:00','G7 foreign ministers in Niagara','Canada announced the G7 foreign-ministers meeting in the Niagara Region and listed invited participants.',{sources:[S.canadaNiagara], group:'eg-g7-fm-niagara-2025', topics:['G7','foreign ministers'], counterparts:niagaraNames.filter(x=>x!==name).map(n=>findPersonByName(n)?.id).filter(Boolean), score:88}).id);
addEncounter('enc-g7-fm-niagara-2025','G7 foreign ministers in Niagara','2025-11-12T10:00:00-05:00','Niagara', niagaraNames, niA, { group:'eg-g7-fm-niagara-2025', sources:[S.canadaNiagara], score:93, why:'Niagara extends the G7 foreign-minister network into Canada’s presidency year and adds outreach partners to the graph.' });
const vauxNames = ['Marco Rubio','Yvette Cooper','Kaja Kallas','Jean-Noël Barrot','Johann Wadephul','Antonio Tajani','Anita Anand','Toshimitsu Motegi','Subrahmanyam Jaishankar'];
const vA = [];
for (const name of vauxNames) vA.push(addAppearance(name,'Vaux','2026-03-27T10:00:00+01:00','G7 foreign ministers at Vaux-de-Cernay','France Diplomatie places the formal G7 foreign-ministers meeting at the Abbaye des Vaux-de-Cernay on March 26 and 27, 2026.',{sources:[S.franceG7Vaux], group:'eg-g7-fm-vaux-2026', topics:['G7','foreign ministers','Iran','security'], counterparts:vauxNames.filter(x=>x!==name).map(n=>findPersonByName(n)?.id).filter(Boolean), score:90}).id);
addEncounter('enc-g7-fm-vaux-2026','G7 foreign ministers at Vaux-de-Cernay','2026-03-27T10:00:00+01:00','Vaux', vauxNames, vA, { group:'eg-g7-fm-vaux-2026', sources:[S.franceG7Vaux], score:95, why:'A French-presidency G7 ministerial cluster: useful for Iran, sanctions, Ukraine, maritime security and alliance-position tracking.' });

// Quad / BRICS and second-line officials.
addAppearance('Toshimitsu Motegi','NewDelhi','2026-05-26T10:00:00+05:30','Quad foreign ministers in New Delhi','Japan MOFA and India MEA records place Foreign Minister Motegi in New Delhi for the Quad foreign ministers’ meeting.',{sources:[S.mofaHome,S.meaNews], group:'eg-quad-new-delhi-2026', topics:['Quad','Indo-Pacific','critical minerals'], counterparts:['p-marco-rubio','p-s-jaishankar'], score:88});
addAppearance('Marco Rubio','NewDelhi','2026-05-26T10:00:00+05:30','Quad foreign ministers and critical-minerals framework','India MEA records Rubio and Jaishankar signing a critical-minerals and rare-earths supply-chain framework in New Delhi.',{sources:[S.meaNews,S.stateMileage], group:'eg-quad-new-delhi-2026', topics:['Quad','critical minerals','supply chains'], counterparts:['p-s-jaishankar','p-toshimitsu-motegi'], score:90});
addAppearance('Takeshi Iwaya','NewYork','2025-09-24T12:00:00-04:00','UNGA high-level week visit','Japan MOFA’s Iwaya page lists his September 2025 visit to New York for international meetings during the 80th UN General Assembly.',{sources:[S.mofaIwaya], group:'eg-unga-80-2025', topics:['UNGA','Japan'], score:78});
addAppearance('Takeshi Iwaya','Charlevoix','2025-03-13T12:00:00-04:00','G7 foreign ministers in Charlevoix','Japan MOFA published a Charlevoix G7 foreign-ministers session record for Iwaya.',{sources:[S.mofaIwaya,S.canadaCharlevoix], group:'eg-g7-fm-charlevoix-2025', topics:['G7','foreign ministers'], counterparts:['p-marco-rubio','p-kaja-kallas'], score:80});
addAppearance('Mauro Vieira','Johannesburg','2025-02-20T12:00:00+02:00','G20 foreign ministers in Johannesburg','Brazil MFA’s speech index lists Mauro Vieira at the G20 foreign ministers’ meeting in Johannesburg.',{sources:[S.govBrMauro], group:'eg-g20-fm-johannesburg-2025', topics:['G20','foreign ministers'], score:84});
addAppearance('Mauro Vieira','Paris','2025-06-03T12:00:00+02:00','OECD and WTO ministerial week in Paris','Brazil MFA’s speech index lists Mauro Vieira at OECD and WTO ministerial events in Paris in early June 2025.',{sources:[S.govBrMauro], group:'eg-oecd-wto-paris-2025', topics:['OECD','WTO','trade'], score:84});

// JD Vance as second-line / vice-president travel layer.
addAppearance('JD Vance','Munich','2025-02-14T12:00:00+01:00','Vice President Vance at Munich Security Conference','The White House published VP Vance’s Munich Security Conference remarks.',{sources:[S.whVanceMunich], group:'eg-munich-security-2025', topics:['security','Europe','United States'], counterparts:['p-marco-rubio'], score:92});
addAppearance('JD Vance','Vatican','2025-05-18T12:00:00+02:00','VP Vance and Rubio at Pope Leo XIV inaugural Mass','The White House video record shows Pope Leo XIV greeting VP Vance and Secretary Rubio after the inaugural Mass.',{sources:[S.whVancePope], group:'eg-vatican-pope-leo-inaugural-2025', topics:['Holy See','diplomacy'], counterparts:['p-marco-rubio'], score:87});
addAppearance('JD Vance','LasVegas','2025-05-28T12:00:00-07:00','Vice President Vance at Bitcoin 2025','The White House published VP Vance’s remarks at the Bitcoin 2025 Conference.',{sources:[S.whVanceBitcoin], group:'eg-bitcoin-2025', topics:['crypto','technology','markets'], score:82});
addAppearance('JD Vance','ColoradoSprings','2026-05-28T12:00:00-06:00','Air Force Academy commencement address','The White House live page lists VP Vance delivering a commencement address at the United States Air Force Academy.',{sources:[S.whVanceAFA], group:'eg-air-force-academy-2026', topics:['defense','military','education'], score:82});

// Aga Khan / Rothschild connector profiles: cautious mapping only where public organization pages or event pages support the record.
addAppearance('Ariane de Rothschild','Geneva','2026-05-12T12:00:00+02:00','Edmond de Rothschild strategic distribution announcement','Edmond de Rothschild’s press page records a 2026 strategic-distribution announcement; mapped as a Geneva corporate public anchor, not travel.',{sources:[S.edR], group:'eg-edmond-de-rothschild-2026', topics:['finance','family capital'], score:72});
addAppearance('Aga Khan V','Geneva','2025-02-10T12:00:00+01:00','Aga Khan Development Network public transition anchor','AKDN orientation material provides an institutional anchor for the Aga Khan Development Network; individual travel claims require separate official event records.',{sources:[S.akdn], group:'eg-akdn-transition-2025', topics:['philanthropy','development'], score:76});

// Phone call readout with ministerial network.
addCall('call-rubio-europe-fms-2025-05-12', ['Marco Rubio','Jean-Noël Barrot','Johann Wadephul','Radosław Sikorski','Yvette Cooper','Andrii Sybiha','Kaja Kallas'], '2025-05-12T15:00:00Z', 'Rubio call with European foreign ministers and Kallas', 'State Department said Rubio spoke with foreign ministers from France, Germany, Poland, the UK, Ukraine and EU High Representative Kaja Kallas about the way forward on Ukraine.', { label:'State Department readout: Rubio call with foreign ministers', url:'https://www.state.gov/releases/office-of-the-spokesperson/2025/05/secretary-rubios-call-with-foreign-ministers/' }, ['Ukraine','foreign ministers','call']);

// Encounters for Lavrov/Wang and JD/Rubio.
addEncounter('enc-brics-fm-rio-2025','BRICS foreign ministers in Rio','2025-04-28T13:00:00-03:00','Rio',['Sergey Lavrov','Wang Yi','Mauro Vieira'],data.appearances.filter(a=>a.eventGroupId==='eg-brics-fm-rio-2025').map(a=>a.id),{group:'eg-brics-fm-rio-2025',sources:[S.midRio,S.chinaRio,S.bricsMauro],score:94,why:'BRICS foreign-minister meetings are high-value because they turn the emerging-power bloc into a person-to-event graph, not just a summit label.'});
addEncounter('enc-sco-fm-beijing-2025','SCO foreign-ministers week in Beijing','2025-07-13T18:00:00+08:00','Beijing',['Sergey Lavrov','Wang Yi'],data.appearances.filter(a=>a.eventGroupId==='eg-sco-fm-beijing-2025').map(a=>a.id),{group:'eg-sco-fm-beijing-2025',sources:[S.chinaBeijing],score:91,why:'The SCO foreign-ministers week links China-Russia coordination to broader Eurasian security diplomacy.'});
addEncounter('enc-vance-rubio-vatican-2025','U.S. vice-president and secretary at Vatican inaugural Mass','2025-05-18T12:00:00+02:00','Vatican',['JD Vance','Marco Rubio'],data.appearances.filter(a=>a.eventGroupId==='eg-vatican-pope-leo-inaugural-2025').map(a=>a.id),{group:'eg-vatican-pope-leo-inaugural-2025',sources:[S.whVancePope],score:86,why:'Second-line leaders and foreign ministers matter when they travel together; this builds the administration-to-institution edge.'});

// Add event-watch cards that make the crawler focus on frequent travellers rather than static fame.
data.eventAgendas = data.eventAgendas || [];
function upsertAgenda(item) { const i = data.eventAgendas.findIndex(a=>a.id===item.id); if (i>=0) data.eventAgendas[i]=item; else data.eventAgendas.push(item); }
upsertAgenda({ id:'agenda-g7-foreign-ministers-rolling', title:'G7 foreign ministers rolling watch', type:'Recurring ministerial', startsAt:'2026-06-01T09:00:00Z', endsAt:'2026-12-31T18:00:00Z', location:loc('Vaux'), status:'watchlist', whyItMatters:'Foreign ministers often travel more than heads of government. G7 ministerials generate readouts, calls, joint statements and side meetings that reveal the live state of alliances.', sectors:['Security','Diplomacy','Sanctions','Trade'], participantNames:vauxNames, sourcePack:[S.canadaCharlevoix,S.canadaNiagara,S.franceG7Vaux], topics:['G7','foreign ministers','high-frequency travellers'], attendeeMode:'watchlist' });
upsertAgenda({ id:'agenda-brics-foreign-ministers-rolling', title:'BRICS foreign ministers and Sherpa track', type:'Recurring ministerial', startsAt:'2026-01-01T09:00:00Z', endsAt:'2026-12-31T18:00:00Z', location:loc('Rio'), status:'watchlist', whyItMatters:'BRICS ministerials identify who is active in the alternative-power-bloc network before leaders meet.', sectors:['Trade','Development','Finance','Geopolitics'], participantNames:['Sergey Lavrov','Wang Yi','Mauro Vieira','Subrahmanyam Jaishankar'], sourcePack:[S.bricsMauro,S.midRio,S.chinaRio], topics:['BRICS','foreign ministers','global south'], attendeeMode:'watchlist' });
upsertAgenda({ id:'agenda-us-secretary-travel-mileage', title:'U.S. Secretary of State travel ledger', type:'Official travel ledger', startsAt:'2025-01-20T09:00:00Z', endsAt:'2026-12-31T18:00:00Z', location:loc('Washington'), status:'watchlist', whyItMatters:'The State Department travel ledger is a clean backbone for high-frequency official travel because it gives dates, countries, cities and trip mileage.', sectors:['Diplomacy','Security','Trade'], participantNames:['Marco Rubio'], sourcePack:[S.stateMileage], topics:['official travel','public schedule'], attendeeMode:'verified ledger' });

// Source registry expansion for frequent traveller capture.
registry.officialDomains = Array.from(new Set([...(registry.officialDomains || []), 'state.gov','mea.gov.in','mid.ru','mfa.gov.cn','mofa.go.jp','canada.ca','diplomatie.gouv.fr','gov.br','gov.uk','auswaertiges-amt.de','esteri.it','mfa.gov.tr','mfa.gov.ua','brics.br','bilderbergmeetings.org','weforum.org','bis.org','group30.org','oecd.org','imf.org','worldbank.org','un.org','unfccc.int','kansascityfed.org','federalreserve.gov','ecb.europa.eu']]));
registry.sources = registry.sources || [];
function addRegSource(s) { if (!registry.sources.some(x=>x.id===s.id)) registry.sources.push(s); }
addRegSource({ id:'us-secretary-countries-visited-mileage', label:'U.S. Secretary of State countries visited and mileage', name:'U.S. Secretary of State countries visited and mileage', url:'https://www.state.gov/secretary-rubios-countries-visited-and-mileage/', type:'official_travel_ledger', reliability:'primary', autoPublish:true, cadence:'nightly', peopleHints:['Marco Rubio'], notes:'High-value structured travel ledger for frequent traveller rankings.' });
addRegSource({ id:'india-eam-visits', label:'India MEA External Affairs Minister visits', name:'India MEA External Affairs Minister visits', url:'https://www.mea.gov.in/eam-visits.htm', type:'official_travel_index', reliability:'primary', autoPublish:true, cadence:'nightly', peopleHints:['Subrahmanyam Jaishankar'], notes:'Outgoing EAM visit index, speeches and recent news.' });
addRegSource({ id:'russia-mfa-minister-speeches', label:'Russian MFA minister speeches and news', name:'Russian MFA minister speeches and news', url:'https://www.mid.ru/en/press_service/minister_speeches/', type:'official_speech_index', reliability:'primary', autoPublish:false, cadence:'nightly-candidate', peopleHints:['Sergey Lavrov'], notes:'Official Lavrov speeches, remarks and meeting records; publish only when city/date are explicit.' });
addRegSource({ id:'china-mfa-minister-activities', label:'China MFA minister activities', name:'China MFA minister activities', url:'https://www.mfa.gov.cn/eng/wjbzhd/', type:'official_activity_index', reliability:'primary', autoPublish:false, cadence:'nightly-candidate', peopleHints:['Wang Yi'], notes:'Chinese foreign-minister meeting records and official bilateral notes.' });
addRegSource({ id:'g7-foreign-minister-host-pages', label:'G7 foreign minister host pages', name:'G7 foreign minister host pages', url:'https://www.canada.ca/en/global-affairs/news.html', type:'host_event_index', reliability:'primary', autoPublish:false, cadence:'nightly-candidate', peopleHints:['Marco Rubio','Kaja Kallas','Jean-Noël Barrot','Johann Wadephul','Yvette Cooper','Anita Anand','Antonio Tajani','Toshimitsu Motegi'], notes:'Track G7 foreign-minister meeting pages, participant notices and joint statements.' });
addRegSource({ id:'brics-foreign-minister-host-pages', label:'BRICS foreign minister and summit host pages', name:'BRICS foreign minister and summit host pages', url:'https://brics.br/en/news', type:'host_event_index', reliability:'primary', autoPublish:false, cadence:'nightly-candidate', peopleHints:['Mauro Vieira','Sergey Lavrov','Wang Yi','Subrahmanyam Jaishankar'], notes:'Track BRICS ministerial, Sherpa and leaders events.' });
registry.eventKeywords = Array.from(new Set([...(registry.eventKeywords || []), 'countries visited', 'public schedule', 'foreign ministers', 'ministerial meeting', 'readout', 'call with', 'met with', 'travel to', 'visit of foreign minister', 'secretary travel', 'official visit', 'summit', 'G7', 'BRICS', 'SCO', 'ASEAN', 'UNGA', 'Quad', 'Bilderberg', 'Davos', 'Group of Thirty', 'BIS', 'Jackson Hole']));
registry.frequentTravellerPriority = { generatedAt: now, note:'v3.7 prioritises frequent travellers over static fame: foreign ministers, vice presidents, special envoys, central bankers, Bilderberg/Davos/G30/BIS/OECD/OPEC connectors and official travel ledgers.', priorityPeople:['Marco Rubio','Subrahmanyam Jaishankar','Sergey Lavrov','Wang Yi','Kaja Kallas','Yvette Cooper','Jean-Noël Barrot','Johann Wadephul','Antonio Tajani','Anita Anand','Toshimitsu Motegi','Mauro Vieira','Hakan Fidan','Andrii Sybiha','JD Vance','Benjamin Netanyahu','Jerome Powell','Christine Lagarde','Agustín Carstens','Larry Fink','Jamie Dimon','Børge Brende'], priorityEventFamilies:['G7 foreign ministers','BRICS foreign ministers','UNGA high-level week','G20 foreign ministers','SCO ministerial','ASEAN ministerial','Quad foreign ministers','Bilderberg','Davos','Group of Thirty','BIS','Jackson Hole','OECD MCM','OPEC','CERAWeek','Milken','Sun Valley'] };
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

// Update meta and top roster cache.
data.meta.iteration = 'v3.7.0';
data.meta.version = '3.7.0';
data.meta.generatedAt = now;
data.meta.lastDataUpdate = now;
data.meta.status = 'v3.7 keeps the anchored v3.6 interface and adds a frequent-traveller expansion layer for foreign ministers, vice presidents, BRICS/G7 actors, Netanyahu US visits, Lavrov/Wang public records and official travel ledgers.';
data.meta.versionNotes = 'v3.7.0: adds source-backed high-frequency travel records, G7/BRICS/Quad foreign-minister clusters, Netanyahu White House visits, Lavrov/Wang ministerial records, Rubio travel ledger expansion, Jaishankar official visits and crawler priority rules for heavy travellers.';
data.meta.launchCoverage = `${data.people.length} mapped public figures, ${data.appearances.length} public records, ${data.encounters.length} encounter clusters, ${data.eventAgendas.length} event-agenda watch cards, full top-200 roster.`;
data.meta.importStatus = 'frequent-traveller expansion pack + nightly official-ledger watch';
data.meta.uiIteration = 'v3.6 anchored layout retained; v3.7 expands the underlying event-attendee and frequent-traveller record base.';

// Deduplicate appearances and calls by ID.
for (const key of ['appearances','encounters','calls','telephoneCalls','eventAgendas']) {
  if (!Array.isArray(data[key])) continue;
  const seen = new Set();
  data[key] = data[key].filter(item => { const id = item.id || JSON.stringify(item); if (seen.has(id)) return false; seen.add(id); return true; });
}
// Ensure roster length remains exactly 200 and sorted.
data.roster.sort((a,b)=>a.rank-b.rank);
if (data.roster.length !== 200) throw new Error(`Roster length changed: ${data.roster.length}`);
// Update topRoster first 24 from current roster.
data.topRoster = data.roster.slice(0,24);
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
fs.writeFileSync(top200Path, JSON.stringify(data.roster, null, 2));
console.log(`v3.7 expansion applied: ${data.people.length} people, ${data.appearances.length} appearances, ${data.encounters.length} encounters, ${data.eventAgendas.length} agendas.`);
