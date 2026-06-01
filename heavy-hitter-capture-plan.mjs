import fs from 'node:fs';
const file = 'data/demo.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = '2026-05-30T11:20:00+02:00';
const people = data.people ||= [];
const roster = data.roster ||= [];
const appearances = data.appearances ||= [];
const encounters = data.encounters ||= [];
const calls = data.calls ||= [];
const telephoneCalls = data.telephoneCalls ||= calls;
const eventAgendas = data.eventAgendas ||= [];
const byPerson = new Map(people.map(p => [p.id, p]));
const byName = new Map(people.map(p => [norm(p.canonicalName), p]));
const rosterByName = new Map(roster.map(r => [norm(r.name || r.canonicalName), r]));
const existingApp = new Set(appearances.map(a => a.id));
const existingEnc = new Set(encounters.map(e => e.id));
const existingCall = new Set(calls.map(c => c.id));
const existingAgenda = new Set(eventAgendas.map(e => e.id));
const colors = ['#9ecbff','#ffc247','#8ddcff','#ff9b7c','#b6a7ff','#59d9c2','#f6a6c8','#a8e38b'];
function norm(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function slug(s){return norm(s).replace(/ /g,'-');}
function wiki(name){return String(name).replace(/ /g,'_');}
function urlSearch(name, org){return `https://www.google.com/search?q=${encodeURIComponent(`${name} official social media ${org||''}`)}`;}
function profileLines(p){
  return [
    {icon:'👤',label:'Role',text:`${p.canonicalName} is tracked because the office, institution or network represented by this profile regularly produces public meetings, speeches or summit records.`},
    {icon:'🏛',label:'Institution',text:`Primary public institution: ${p.organization}. Records are tied to the public role, not private life.`},
    {icon:'🧭',label:'Why follow',text:`This profile is valuable for the attendee graph: repeated public meetings show which diplomatic, monetary, security and capital networks are becoming active.`},
    {icon:'📍',label:'Map use',text:`Trips use city-level public-event anchors. Hotels, residences, live locations and leaked schedules stay out of the product.`},
    {icon:'🤝',label:'Network signal',text:`Counters are built from official readouts, summit participant pages, host programmes, speeches and public ministerial schedules.`},
    {icon:'🗣',label:'Good records',text:`The best records are dated visits, speeches, joint statements, meeting readouts, communiqués and host pages that identify attendees.`},
    {icon:'🔭',label:'Watch next',text:`Future appearances only publish when a government, public institution or event organizer has already named the event, city and date.`},
    {icon:'📰',label:'Sources',text:`Official and host-public sources are preferred. Media links are useful context, but do not overrule the publication boundary.`},
    {icon:'🔗',label:'Links',text:`Official-site, Wikipedia, LinkedIn-search and social-search links are separated from verified source packs to avoid false account claims.`},
    {icon:'✓',label:'Safety',text:`The profile belongs to a public-interest map of appearances and meetings. It is not a live tracker.`}
  ];
}
function addPerson(opts){
  if (byPerson.has(opts.id)) return byPerson.get(opts.id);
  const p = {
    id: opts.id,
    slug: opts.slug || slug(opts.name),
    canonicalName: opts.name,
    category: opts.category || 'FOREIGN_MINISTER',
    roleTitle: opts.roleTitle,
    organization: opts.organization,
    orgType: opts.orgType || 'National government',
    sector: opts.sector || 'Government / diplomacy',
    industry: opts.industry || opts.sector || 'Government / diplomacy',
    homeRegion: opts.homeRegion || opts.region || 'Global',
    prominenceScore: opts.prominenceScore || 74,
    riskTier: opts.riskTier || 3,
    color: opts.color || colors[people.length % colors.length],
    shortBio: opts.shortBio || `${opts.name} is tracked through public appearances, official meetings, speeches and summit records only.`,
    officialUrl: opts.officialUrl || opts.profileUrl || `https://en.wikipedia.org/wiki/${wiki(opts.name)}`,
    sourceReliability: opts.sourceReliability || 'official office pages, ministerial travel pages, summit host pages and public readouts',
    orgIcon: opts.orgIcon || '✈',
    countryFocus: opts.countryFocus || opts.countryCode,
    countryFocusCode: opts.countryFocus || opts.countryCode,
    countryName: opts.countryName || opts.country,
    wikiTitle: opts.wikiTitle || wiki(opts.name),
    imageUrl: opts.imageUrl || '',
    imageProvider: opts.imageUrl ? 'Wikimedia/Wikipedia thumbnail candidate' : 'runtime portrait hydration',
    visualAuditStatus: 'candidate portrait; production should cache source URL, author, licence and attribution text',
    visualStatus: 'portrait requires licence and attribution capture',
    locationStatus: 'mapped records added where source-backed',
    birthDate: opts.birthDate || '',
    birthdayAuditStatus: opts.birthDate ? 'birth date field should be verified against Wikidata or an official bio' : 'birth date pending official/Wikidata check',
    homeBases: opts.homeBases || [{ city: opts.homeCity || 'Public institutional anchor', countryCode: opts.countryFocus || opts.countryCode || 'UN', countryName: opts.countryName || opts.country || 'Global', lat: opts.homeLat || 0, lng: opts.homeLng || 0, label: 'public institutional base', precision: 'city' }],
    socialLinks: {
      official: opts.officialUrl || opts.profileUrl || `https://en.wikipedia.org/wiki/${wiki(opts.name)}`,
      wikipedia: `https://en.wikipedia.org/wiki/${wiki(opts.name)}`,
      wikidata: opts.wikidata ? `https://www.wikidata.org/wiki/${opts.wikidata}` : '',
      linkedinSearch: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(`${opts.name} ${opts.organization}`)}`,
      socialSearch: urlSearch(opts.name, opts.organization),
      notes: 'Exact social handles should be verified only from an official site or a platform-verified account.'
    },
    profileLine: `${opts.name} is in the active traveller set because public travel, readouts and summit attendance can change the relationship graph.`,
    profileLines: [],
    imageAudit: { status: opts.imageUrl ? 'photo-candidate' : 'runtime-candidate', reasons: [], instruction: 'Use only if the cached file matches the person and licence/attribution are stored.'},
    flagAudit: { code: opts.countryFocus || opts.countryCode || 'UN', status: 'country or institution mark', label: opts.countryName || opts.country || 'Global'}
  };
  p.profileLines = profileLines(p);
  people.push(p); byPerson.set(p.id,p); byName.set(norm(p.canonicalName),p); return p;
}
function addPersonFromRoster(name, extra={}){
  const r = rosterByName.get(norm(name));
  if (!r) return addPerson({id:`p-${slug(name)}`, name, ...extra});
  return addPerson({
    id: `p-${slug(name)}`,
    name: r.name,
    category: r.category || extra.category,
    roleTitle: extra.roleTitle || r.roleTitle || r.bucket,
    organization: extra.organization || r.organization,
    orgType: extra.orgType || 'Public institution',
    sector: extra.sector || r.sector,
    industry: extra.industry || r.industry || r.sector,
    homeRegion: extra.homeRegion || r.region,
    prominenceScore: extra.prominenceScore || r.prominenceScore,
    countryFocus: extra.countryFocus || r.countryFocus,
    countryName: extra.countryName || r.countryName || r.country,
    wikiTitle: extra.wikiTitle || r.wikiTitle,
    imageUrl: extra.imageUrl || r.imageUrl,
    officialUrl: extra.officialUrl || r.profileUrl,
    birthDate: extra.birthDate || r.birthDate,
    orgIcon: extra.orgIcon || r.orgIcon || '◎',
    homeBases: extra.homeBases
  });
}
function replaceRoster(rank, opts){
  const idx = roster.findIndex(r => Number(r.rank) === Number(rank));
  const base = idx>=0 ? roster[idx] : {};
  const item = {
    rank,
    id: `r-${String(rank).padStart(3,'0')}-${slug(opts.name)}`,
    name: opts.name,
    slug: slug(opts.name),
    wikiTitle: opts.wikiTitle || wiki(opts.name),
    wikidataId: opts.wikidata || '',
    profileUrl: opts.profileUrl || `https://en.wikipedia.org/wiki/${wiki(opts.name)}`,
    region: opts.region || opts.homeRegion || 'Global',
    country: opts.countryName || opts.country || 'Global',
    bucket: opts.bucket || opts.roleTitle || 'Public influence principal',
    sector: opts.sector || 'Government / diplomacy',
    organization: opts.organization || 'Public institution',
    prominenceScore: opts.prominenceScore || base.prominenceScore || 70,
    imageUrl: opts.imageUrl || '',
    imageProvider: opts.imageUrl ? 'Wikimedia/Wikipedia thumbnail candidate' : 'runtime portrait hydration',
    visualAuditStatus: 'candidate portrait; production should cache source URL, author, license and attribution text',
    trackingStatus: 'profile ready; dated public records are added after verification',
    sourcePriority: 'official office, institution or event host source before secondary media',
    canonicalName: opts.name,
    roleTitle: opts.roleTitle || opts.bucket || 'Public influence principal',
    homeRegion: opts.region || opts.homeRegion || 'Global',
    countryFocus: opts.countryFocus || opts.countryCode || 'UN',
    industry: opts.industry || opts.sector || 'Government / diplomacy',
    shortBio: `${opts.name} is included because the public role produces frequent meetings, speeches or event-attendee records.`,
    category: opts.category || 'FOREIGN_MINISTER',
    orgIcon: opts.orgIcon || '✈',
    visualStatus: 'portrait requires license and attribution capture',
    locationStatus: 'profile ready; dated public records are added after verification',
    birthDate: opts.birthDate || '',
    birthdayAuditStatus: opts.birthDate ? 'birth date field should be verified against Wikidata or an official bio' : 'birth date pending official/Wikidata check',
    countryName: opts.countryName || opts.country || 'Global',
    countryFocusCode: opts.countryFocus || opts.countryCode || 'UN',
    profileLine: `${opts.name} is in the active traveller layer because repeated public appearances can reshape diplomatic, monetary or capital networks.`,
    socialLinks: {
      official: opts.profileUrl || `https://en.wikipedia.org/wiki/${wiki(opts.name)}`,
      wikipedia: `https://en.wikipedia.org/wiki/${wiki(opts.name)}`,
      wikidata: opts.wikidata ? `https://www.wikidata.org/wiki/${opts.wikidata}` : '',
      linkedinSearch: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(`${opts.name} ${opts.organization || ''}`)}`,
      socialSearch: urlSearch(opts.name, opts.organization),
      notes: 'Exact social handles should be treated as verified only after official-site or platform verification.'
    },
    profileLines: [],
    imageAudit: { status: opts.imageUrl ? 'photo-candidate' : 'runtime-candidate', reasons: opts.imageUrl ? [] : ['image cache pending'], instruction: 'Use only if the cached file matches the person and licence/attribution are stored.'},
    flagAudit: { code: opts.countryFocus || opts.countryCode || 'UN', status: 'country or institution mark', label: opts.countryName || opts.country || 'Global'}
  };
  item.profileLines = profileLines(item);
  if (idx>=0) roster[idx] = item; else roster.push(item);
  rosterByName.set(norm(item.name), item);
}
function source(label,url,type='official_or_host'){return {label,url,type,license:'public web source; rights remain with publisher',checkedAt:now,reliability:type==='official_or_host'?'primary_or_host':'secondary'};}
const locs = {
  washington:{city:'Washington',countryCode:'US',countryName:'United States',lat:38.9072,lng:-77.0369},
  newyork:{city:'New York',countryCode:'US',countryName:'United States',lat:40.7128,lng:-74.0060},
  riyadh:{city:'Riyadh',countryCode:'SA',countryName:'Saudi Arabia',lat:24.7136,lng:46.6753},
  jeddah:{city:'Jeddah',countryCode:'SA',countryName:'Saudi Arabia',lat:21.4858,lng:39.1925},
  charlevoix:{city:'Charlevoix',countryCode:'CA',countryName:'Canada',lat:47.6277,lng:-70.1498},
  cernay:{city:'Cernay-la-Ville',countryCode:'FR',countryName:'France',lat:48.6760,lng:1.9430},
  kualalumpur:{city:'Kuala Lumpur',countryCode:'MY',countryName:'Malaysia',lat:3.1390,lng:101.6869},
  newdelhi:{city:'New Delhi',countryCode:'IN',countryName:'India',lat:28.6139,lng:77.2090},
  nizhny:{city:'Nizhny Novgorod',countryCode:'RU',countryName:'Russia',lat:56.2965,lng:43.9361},
  rio:{city:'Rio de Janeiro',countryCode:'BR',countryName:'Brazil',lat:-22.9068,lng:-43.1729},
  munich:{city:'Munich',countryCode:'DE',countryName:'Germany',lat:48.1351,lng:11.5820},
  jerusalem:{city:'Jerusalem',countryCode:'IL',countryName:'Israel',lat:31.7683,lng:35.2137},
  brussels:{city:'Brussels',countryCode:'BE',countryName:'Belgium',lat:50.8503,lng:4.3517},
  moscow:{city:'Moscow',countryCode:'RU',countryName:'Russia',lat:55.7558,lng:37.6173},
  toronto:{city:'Toronto',countryCode:'CA',countryName:'Canada',lat:43.6532,lng:-79.3832},
  singapore:{city:'Singapore',countryCode:'SG',countryName:'Singapore',lat:1.3521,lng:103.8198},
  beijing:{city:'Beijing',countryCode:'CN',countryName:'China',lat:39.9042,lng:116.4074},
  paris:{city:'Paris',countryCode:'FR',countryName:'France',lat:48.8566,lng:2.3522},
  antalya:{city:'Antalya',countryCode:'TR',countryName:'Türkiye',lat:36.8969,lng:30.7133},
  doha:{city:'Doha',countryCode:'QA',countryName:'Qatar',lat:25.2854,lng:51.5310},
  abuDhabi:{city:'Abu Dhabi',countryCode:'AE',countryName:'United Arab Emirates',lat:24.4539,lng:54.3773},
  basel:{city:'Basel',countryCode:'CH',countryName:'Switzerland',lat:47.5596,lng:7.5886},
  stockholm:{city:'Stockholm',countryCode:'SE',countryName:'Sweden',lat:59.3293,lng:18.0686},
  losangeles:{city:'Los Angeles',countryCode:'US',countryName:'United States',lat:34.0522,lng:-118.2437},
  houston:{city:'Houston',countryCode:'US',countryName:'United States',lat:29.7604,lng:-95.3698},
  davos:{city:'Davos',countryCode:'CH',countryName:'Switzerland',lat:46.8027,lng:9.8359},
  geneva:{city:'Geneva',countryCode:'CH',countryName:'Switzerland',lat:46.2044,lng:6.1432},
  london:{city:'London',countryCode:'GB',countryName:'United Kingdom',lat:51.5072,lng:-0.1276},
  jamaica:{city:'Kingston',countryCode:'JM',countryName:'Jamaica',lat:17.9712,lng:-76.7936},
  suriname:{city:'Paramaribo',countryCode:'SR',countryName:'Suriname',lat:5.8520,lng:-55.2038},
  trinidad:{city:'Port of Spain',countryCode:'TT',countryName:'Trinidad and Tobago',lat:10.6549,lng:-61.5019},
  mauritius:{city:'Port Louis',countryCode:'MU',countryName:'Mauritius',lat:-20.1609,lng:57.5012},
  uk:{city:'London',countryCode:'GB',countryName:'United Kingdom',lat:51.5072,lng:-0.1276}
};
function loc(key,label){return {...locs[key], label: label || `${locs[key].city} public-event anchor`, precision:'city'};}
function addApp(opts){
  if (existingApp.has(opts.id)) return;
  const a = {
    id: opts.id,
    personId: opts.personId,
    startsAt: opts.startsAt,
    endsAt: opts.endsAt || null,
    status: opts.status || (new Date(opts.startsAt) > new Date('2026-05-30') ? 'ANNOUNCED_FUTURE':'VERIFIED_PAST'),
    confidence: opts.confidence ?? 0.86,
    confidenceLabel: opts.confidenceLabel || 'official or host-public source identifies the public event, trip or meeting window',
    eventType: opts.eventType || 'PUBLIC_APPEARANCE',
    title: opts.title,
    summary: opts.summary,
    significance: opts.significance || 'Useful for the attendee graph because it links a public figure to a dated public event, meeting or speech location.',
    decisions: opts.decisions || 'Check the source pack and any joint statement/readout for concrete outcomes; no private meetings are inferred.',
    location: opts.location,
    venuePublic: true,
    securityPrecision: 'city-level public appearance only; no private stops, hotels, residences, leaked routes or live proximity',
    publicInterestScore: opts.publicInterestScore || 78,
    eventGroupId: opts.eventGroupId || `eg-${slug(opts.location.city)}-${opts.startsAt.slice(0,10)}`,
    topics: opts.topics || [],
    counterpartIds: opts.counterpartIds || [],
    sourcePack: opts.sourcePack || [],
    visual: {status:'public-source card',policy:'Use only audited public media with attribution.'},
    lastCheckedAt: now,
    importanceScore: opts.importanceScore || opts.publicInterestScore || 78,
    verificationLevel: opts.verificationLevel || 'Verified',
    marketImpact: opts.marketImpact || {sectors:(opts.topics||[]).slice(0,4),companies:[],countries:[opts.location.countryName],confidence:'medium'}
  };
  appearances.push(a); existingApp.add(a.id);
}
function addEncounter(e){ if(existingEnc.has(e.id)) return; encounters.push(e); existingEnc.add(e.id); }
function addCall(c){ if(existingCall.has(c.id)) return; calls.push(c); existingCall.add(c.id); if(telephoneCalls!==calls) telephoneCalls.push(c); }
function addAgenda(e){ if(existingAgenda.has(e.id)) return; eventAgendas.push(e); existingAgenda.add(e.id); }
// Roster: replace lower static rows with active traveller / network figures.
[
  [156,{name:'Sergey Lavrov',roleTitle:'Foreign Minister of the Russian Federation',organization:'Russian Ministry of Foreign Affairs',countryFocus:'RU',countryName:'Russia',region:'Europe / Eurasia',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:88,wikidata:'Q20669',birthDate:'1950-03-21'}],
  [157,{name:'David Lammy',roleTitle:'Former UK Foreign Secretary / senior political figure',organization:'UK Government',countryFocus:'GB',countryName:'United Kingdom',region:'Europe',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:76,wikidata:'Q524099',birthDate:'1972-07-19'}],
  [158,{name:'Jean-Noël Barrot',roleTitle:'Minister for Europe and Foreign Affairs of France',organization:'Ministry for Europe and Foreign Affairs',countryFocus:'FR',countryName:'France',region:'Europe',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:78,wikidata:'Q62031696',birthDate:'1983-05-13'}],
  [159,{name:'Antonio Tajani',roleTitle:'Deputy Prime Minister and Minister of Foreign Affairs of Italy',organization:'Italian Ministry of Foreign Affairs',countryFocus:'IT',countryName:'Italy',region:'Europe',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:80,wikidata:'Q305277',birthDate:'1953-08-04'}],
  [160,{name:'Anita Anand',roleTitle:'Minister of Foreign Affairs of Canada',organization:'Global Affairs Canada',countryFocus:'CA',countryName:'Canada',region:'North America',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:75,wikidata:'Q97404106',birthDate:'1967-05-20'}],
  [161,{name:'Mélanie Joly',roleTitle:'Former Canadian Foreign Minister / senior political figure',organization:'Government of Canada',countryFocus:'CA',countryName:'Canada',region:'North America',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:74,wikidata:'Q20656630',birthDate:'1979-01-16'}],
  [162,{name:'Mauro Vieira',roleTitle:'Minister of Foreign Affairs of Brazil',organization:'Ministry of Foreign Affairs of Brazil',countryFocus:'BR',countryName:'Brazil',region:'Latin America',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:78,wikidata:'Q10369631',birthDate:'1951-02-15'}],
  [163,{name:'Ronald Lamola',roleTitle:'Minister of International Relations and Cooperation of South Africa',organization:'South African Government',countryFocus:'ZA',countryName:'South Africa',region:'Africa',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:74,wikidata:'Q56208803',birthDate:'1983-11-21'}],
  [164,{name:'Abbas Araghchi',roleTitle:'Minister of Foreign Affairs of Iran',organization:'Iranian Ministry of Foreign Affairs',countryFocus:'IR',countryName:'Iran',region:'Middle East',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:78,wikidata:'Q4663996',birthDate:'1962-12-05'}],
  [165,{name:'Faisal bin Farhan Al Saud',roleTitle:'Foreign Minister of Saudi Arabia',organization:'Saudi Ministry of Foreign Affairs',countryFocus:'SA',countryName:'Saudi Arabia',region:'Middle East',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:78,wikidata:'Q78924313',birthDate:'1974-11-01'}],
  [166,{name:'Hakan Fidan',roleTitle:'Minister of Foreign Affairs of Türkiye',organization:'Turkish Ministry of Foreign Affairs',countryFocus:'TR',countryName:'Türkiye',region:'Middle East / Europe',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:79,wikidata:'Q5632557',birthDate:'1968-07-17'}],
  [167,{name:'Penny Wong',roleTitle:'Foreign Minister of Australia',organization:'Australian Government',countryFocus:'AU',countryName:'Australia',region:'Asia-Pacific',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:77,wikidata:'Q452424',birthDate:'1968-11-05'}],
  [168,{name:'Toshimitsu Motegi',roleTitle:'Minister for Foreign Affairs of Japan',organization:'Japanese Ministry of Foreign Affairs',countryFocus:'JP',countryName:'Japan',region:'Asia-Pacific',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:76,wikidata:'Q331947',birthDate:'1955-10-07'}],
  [169,{name:'Takeshi Iwaya',roleTitle:'Former Japanese Foreign Minister / senior political figure',organization:'Japanese Government',countryFocus:'JP',countryName:'Japan',region:'Asia-Pacific',category:'FOREIGN_MINISTER',sector:'Government / diplomacy',prominenceScore:72,wikidata:'Q1135354',birthDate:'1957-08-24'}],
  [170,{name:'Rahim Aga Khan V',roleTitle:'Aga Khan / Chair of the Aga Khan Development Network',organization:'Aga Khan Development Network',countryFocus:'CH',countryName:'Switzerland',region:'Global / civil society',category:'PHILANTHROPY',sector:'Philanthropy / development',prominenceScore:78,wikidata:'Q7284413',birthDate:'1971-10-12'}],
  [184,{name:'Henri de Castries',roleTitle:'Chair, Bilderberg Meetings / President, Institut Montaigne',organization:'Institut Montaigne / Bilderberg Meetings',countryFocus:'FR',countryName:'France',region:'Europe',category:'BUSINESS_LEADER',sector:'Convening / finance / policy',prominenceScore:75,wikidata:'Q571288',birthDate:'1954-08-15'}],
  [185,{name:'Marie-Josée Kravis',roleTitle:'Bilderberg co-chair / MoMA chair',organization:'Bilderberg Meetings / MoMA',countryFocus:'US',countryName:'United States',region:'North America',category:'PHILANTHROPY',sector:'Philanthropy / convening / finance',prominenceScore:73,wikidata:'Q6760738',birthDate:'1949-09-11'}],
  [186,{name:'Ariane de Rothschild',roleTitle:'CEO, Edmond de Rothschild Group',organization:'Edmond de Rothschild Group',countryFocus:'CH',countryName:'Switzerland',region:'Europe',category:'BUSINESS_LEADER',sector:'Finance / philanthropy',prominenceScore:73,wikidata:'Q4791421',birthDate:'1965-11-14'}],
  [188,{name:'Alexandre de Rothschild',roleTitle:'Executive Chairman, Rothschild & Co',organization:'Rothschild & Co',countryFocus:'FR',countryName:'France',region:'Europe',category:'BUSINESS_LEADER',sector:'Finance',prominenceScore:72,wikidata:'Q28393883',birthDate:'1980-11-25'}]
].forEach(([rank, opts]) => replaceRoster(rank, opts));
roster.sort((a,b)=>a.rank-b.rank);
// Add people from roster and requested active traveller groups.
['Mohammed bin Salman','JD Vance','Wang Yi'].forEach(name=>addPersonFromRoster(name));
[
  {id:'p-sergey-lavrov',name:'Sergey Lavrov',roleTitle:'Foreign Minister of the Russian Federation',organization:'Russian Ministry of Foreign Affairs',countryFocus:'RU',countryName:'Russia',region:'Europe / Eurasia',category:'FOREIGN_MINISTER',prominenceScore:88,birthDate:'1950-03-21',homeBases:[{city:'Moscow',countryCode:'RU',countryName:'Russia',lat:55.7558,lng:37.6173,label:'Moscow public institutional base',precision:'city'}]},
  {id:'p-david-lammy',name:'David Lammy',roleTitle:'Former UK Foreign Secretary / senior political figure',organization:'UK Government',countryFocus:'GB',countryName:'United Kingdom',region:'Europe',category:'FOREIGN_MINISTER',prominenceScore:76,birthDate:'1972-07-19',homeBases:[{city:'London',countryCode:'GB',countryName:'United Kingdom',lat:51.5072,lng:-0.1276,label:'London public institutional base',precision:'city'}]},
  {id:'p-jean-noel-barrot',name:'Jean-Noël Barrot',roleTitle:'Minister for Europe and Foreign Affairs of France',organization:'Ministry for Europe and Foreign Affairs',countryFocus:'FR',countryName:'France',region:'Europe',category:'FOREIGN_MINISTER',prominenceScore:78,birthDate:'1983-05-13',homeBases:[{city:'Paris',countryCode:'FR',countryName:'France',lat:48.8566,lng:2.3522,label:'Paris public institutional base',precision:'city'}]},
  {id:'p-antonio-tajani',name:'Antonio Tajani',roleTitle:'Deputy Prime Minister and Minister of Foreign Affairs of Italy',organization:'Italian Ministry of Foreign Affairs',countryFocus:'IT',countryName:'Italy',region:'Europe',category:'FOREIGN_MINISTER',prominenceScore:80,birthDate:'1953-08-04',homeBases:[{city:'Rome',countryCode:'IT',countryName:'Italy',lat:41.9028,lng:12.4964,label:'Rome public institutional base',precision:'city'}]},
  {id:'p-anita-anand',name:'Anita Anand',roleTitle:'Minister of Foreign Affairs of Canada',organization:'Global Affairs Canada',countryFocus:'CA',countryName:'Canada',region:'North America',category:'FOREIGN_MINISTER',prominenceScore:75,birthDate:'1967-05-20',homeBases:[{city:'Ottawa',countryCode:'CA',countryName:'Canada',lat:45.4215,lng:-75.6972,label:'Ottawa public institutional base',precision:'city'}]},
  {id:'p-melanie-joly',name:'Mélanie Joly',roleTitle:'Former Canadian Foreign Minister / senior political figure',organization:'Government of Canada',countryFocus:'CA',countryName:'Canada',region:'North America',category:'FOREIGN_MINISTER',prominenceScore:74,birthDate:'1979-01-16',homeBases:[{city:'Ottawa',countryCode:'CA',countryName:'Canada',lat:45.4215,lng:-75.6972,label:'Ottawa public institutional base',precision:'city'}]},
  {id:'p-mauro-vieira',name:'Mauro Vieira',roleTitle:'Minister of Foreign Affairs of Brazil',organization:'Ministry of Foreign Affairs of Brazil',countryFocus:'BR',countryName:'Brazil',region:'Latin America',category:'FOREIGN_MINISTER',prominenceScore:78,birthDate:'1951-02-15',homeBases:[{city:'Brasília',countryCode:'BR',countryName:'Brazil',lat:-15.7975,lng:-47.8919,label:'Brasília public institutional base',precision:'city'}]},
  {id:'p-ronald-lamola',name:'Ronald Lamola',roleTitle:'Minister of International Relations and Cooperation of South Africa',organization:'South African Government',countryFocus:'ZA',countryName:'South Africa',region:'Africa',category:'FOREIGN_MINISTER',prominenceScore:74,birthDate:'1983-11-21',homeBases:[{city:'Pretoria',countryCode:'ZA',countryName:'South Africa',lat:-25.7479,lng:28.2293,label:'Pretoria public institutional base',precision:'city'}]},
  {id:'p-abbas-araghchi',name:'Abbas Araghchi',roleTitle:'Minister of Foreign Affairs of Iran',organization:'Iranian Ministry of Foreign Affairs',countryFocus:'IR',countryName:'Iran',region:'Middle East',category:'FOREIGN_MINISTER',prominenceScore:78,birthDate:'1962-12-05',homeBases:[{city:'Tehran',countryCode:'IR',countryName:'Iran',lat:35.6892,lng:51.3890,label:'Tehran public institutional base',precision:'city'}]},
  {id:'p-faisal-bin-farhan',name:'Faisal bin Farhan Al Saud',roleTitle:'Foreign Minister of Saudi Arabia',organization:'Saudi Ministry of Foreign Affairs',countryFocus:'SA',countryName:'Saudi Arabia',region:'Middle East',category:'FOREIGN_MINISTER',prominenceScore:78,birthDate:'1974-11-01',homeBases:[{city:'Riyadh',countryCode:'SA',countryName:'Saudi Arabia',lat:24.7136,lng:46.6753,label:'Riyadh public institutional base',precision:'city'}]},
  {id:'p-hakan-fidan',name:'Hakan Fidan',roleTitle:'Minister of Foreign Affairs of Türkiye',organization:'Turkish Ministry of Foreign Affairs',countryFocus:'TR',countryName:'Türkiye',region:'Middle East / Europe',category:'FOREIGN_MINISTER',prominenceScore:79,birthDate:'1968-07-17',homeBases:[{city:'Ankara',countryCode:'TR',countryName:'Türkiye',lat:39.9334,lng:32.8597,label:'Ankara public institutional base',precision:'city'}]},
  {id:'p-penny-wong',name:'Penny Wong',roleTitle:'Foreign Minister of Australia',organization:'Australian Government',countryFocus:'AU',countryName:'Australia',region:'Asia-Pacific',category:'FOREIGN_MINISTER',prominenceScore:77,birthDate:'1968-11-05',homeBases:[{city:'Canberra',countryCode:'AU',countryName:'Australia',lat:-35.2809,lng:149.13,label:'Canberra public institutional base',precision:'city'}]},
  {id:'p-toshimitsu-motegi',name:'Toshimitsu Motegi',roleTitle:'Minister for Foreign Affairs of Japan',organization:'Japanese Ministry of Foreign Affairs',countryFocus:'JP',countryName:'Japan',region:'Asia-Pacific',category:'FOREIGN_MINISTER',prominenceScore:76,birthDate:'1955-10-07',homeBases:[{city:'Tokyo',countryCode:'JP',countryName:'Japan',lat:35.6762,lng:139.6503,label:'Tokyo public institutional base',precision:'city'}]},
  {id:'p-takeshi-iwaya',name:'Takeshi Iwaya',roleTitle:'Former Japanese Foreign Minister / senior political figure',organization:'Japanese Government',countryFocus:'JP',countryName:'Japan',region:'Asia-Pacific',category:'FOREIGN_MINISTER',prominenceScore:72,birthDate:'1957-08-24',homeBases:[{city:'Tokyo',countryCode:'JP',countryName:'Japan',lat:35.6762,lng:139.6503,label:'Tokyo public institutional base',precision:'city'}]},
  {id:'p-rahim-aga-khan',name:'Rahim Aga Khan V',roleTitle:'Aga Khan / Chair of the Aga Khan Development Network',organization:'Aga Khan Development Network',orgType:'Civil society / development network',countryFocus:'CH',countryName:'Switzerland',region:'Global / civil society',category:'PHILANTHROPY',sector:'Philanthropy / development',prominenceScore:78,birthDate:'1971-10-12',homeBases:[{city:'Geneva',countryCode:'CH',countryName:'Switzerland',lat:46.2044,lng:6.1432,label:'Geneva public institutional base',precision:'city'}]},
  {id:'p-henri-de-castries',name:'Henri de Castries',roleTitle:'Chair, Bilderberg Meetings / President, Institut Montaigne',organization:'Institut Montaigne / Bilderberg Meetings',orgType:'Forum / policy network',countryFocus:'FR',countryName:'France',region:'Europe',category:'BUSINESS_LEADER',sector:'Convening / finance / policy',prominenceScore:75,birthDate:'1954-08-15',homeBases:[{city:'Paris',countryCode:'FR',countryName:'France',lat:48.8566,lng:2.3522,label:'Paris public institutional base',precision:'city'}]},
  {id:'p-marie-josee-kravis',name:'Marie-Josée Kravis',roleTitle:'Bilderberg co-chair / MoMA chair',organization:'Bilderberg Meetings / MoMA',orgType:'Forum / philanthropy',countryFocus:'US',countryName:'United States',region:'North America',category:'PHILANTHROPY',sector:'Philanthropy / convening / finance',prominenceScore:73,birthDate:'1949-09-11',homeBases:[{city:'New York',countryCode:'US',countryName:'United States',lat:40.7128,lng:-74.0060,label:'New York public institutional base',precision:'city'}]},
  {id:'p-ariane-de-rothschild',name:'Ariane de Rothschild',roleTitle:'CEO, Edmond de Rothschild Group',organization:'Edmond de Rothschild Group',orgType:'Financial institution',countryFocus:'CH',countryName:'Switzerland',region:'Europe',category:'BUSINESS_LEADER',sector:'Finance / philanthropy',prominenceScore:73,birthDate:'1965-11-14',homeBases:[{city:'Geneva',countryCode:'CH',countryName:'Switzerland',lat:46.2044,lng:6.1432,label:'Geneva public institutional base',precision:'city'}]},
  {id:'p-alexandre-de-rothschild',name:'Alexandre de Rothschild',roleTitle:'Executive Chairman, Rothschild & Co',organization:'Rothschild & Co',orgType:'Financial institution',countryFocus:'FR',countryName:'France',region:'Europe',category:'BUSINESS_LEADER',sector:'Finance',prominenceScore:72,birthDate:'1980-11-25',homeBases:[{city:'Paris',countryCode:'FR',countryName:'France',lat:48.8566,lng:2.3522,label:'Paris public institutional base',precision:'city'}]}
].forEach(addPerson);
// Source bundles.
const S = {
  rubioMiles: source('State Department: Secretary Rubio countries visited and mileage','https://www.state.gov/secretary-rubios-countries-visited-and-mileage/'),
  rubioCharlevoix: source('State Department public schedule: G7 Charlevoix','https://www.state.gov/public-schedule-march-13-2025/'),
  rubioMalaysia: source('State Department: Secretary Rubio travel to Malaysia','https://www.state.gov/releases/office-of-the-spokesperson/2025/07/secretary-rubios-travel-to-malaysia/'),
  rubioQuad: source('State Department: 2026 Quad Foreign Ministers Meeting in New Delhi','https://www.state.gov/releases/office-of-the-spokesperson/2026/05/2026-quad-foreign-ministers-meeting-in-new-delhi/'),
  rubioFrance: source('State Department: Secretary Rubio travel to France','https://www.state.gov/releases/office-of-the-spokesperson/2026/03/secretary-rubios-travel-to-france/'),
  netanyahuFeb: source('Israel PMO: Netanyahu meets President Trump at the White House','https://www.gov.il/en/pages/pm-netanyahu-meets-with-president-trump-at-the-white-house-4-feb-2025'),
  netanyahuApr: source('Israel PMO: Netanyahu to meet President Trump','https://www.gov.il/en/pages/pm-netanyahu-to-meet-with-us-president-donald-trump-5-apr-2025'),
  whitehouseApr: source('White House video: Netanyahu second White House meeting','https://www.whitehouse.gov/videos/president-trump-welcomes-netanyahu-for-2nd-white-house-meeting-of-this-term/'),
  netanyahuJul: source('Israel PMO: Netanyahu departure to Washington','https://www.gov.il/en/pages/statement-by-pm-netanyahu-upon-his-departure-to-washington-6-jul-2025'),
  whitehouseDinner: source('White House video: dinner with Israeli prime minister','https://www.whitehouse.gov/videos/president-trump-participates-in-a-dinner-with-the-prime-minister-of-the-state-of-israel/'),
  lavrovRiyadh: source('Russian MFA: Lavrov statement after Riyadh talks','https://www.mid.ru/en/foreign_policy/news/1998294/'),
  stateLavrovRiyadh: source('State Department: Rubio meeting with Lavrov','https://www.state.gov/secretary-rubios-meeting-with-russian-foreign-minister-lavrov/'),
  lavrovAsean: source('Russian MFA: Lavrov at Russia-ASEAN ministerial meeting','https://www.mid.ru/en/press_service/vizity-ministra/2035069/'),
  lavrovRubioKL: source('Russian MFA: Lavrov meeting with Rubio in Kuala Lumpur','https://www.mid.ru/en/foreign_policy/news/2035296/'),
  lavrovUnga2024: source('Russian MFA: Lavrov at 79th UN General Assembly','https://www.mid.ru/en/press_service/minister_speeches/1972774/'),
  lavrovUnga2025: source('Russian MFA: Lavrov at 80th UN General Assembly','https://www.mid.ru/en/foreign_policy/news/2049686/'),
  lavrovG20Unga: source('Russian MFA: Lavrov at G20 FMM on UNGA sidelines','https://www.mid.ru/en/foreign_policy/news/2048887/'),
  bricsNizhny: source('Russian MFA: BRICS foreign ministers Nizhny Novgorod joint statement','https://www.mid.ru/en/foreign_policy/news/1955719/'),
  bricsRio: source('BRICS Brazil: 2025 BRICS foreign ministers chair statement','https://brics.br/en/documents/2025-04-29_brics-mfa-chairs-statement.pdf/%40%40download/file'),
  wangNizhny: source('China MFA: Wang Yi attends BRICS foreign ministers meeting','https://www.mfa.gov.cn/eng/xw/zyxw/202406/t20240613_11435372.html'),
  wangRio: source('China MFA: Wang Yi attends BRICS ministerial session in Rio','https://www.mfa.gov.cn/eng/wjbzhd/202505/t20250501_11614800.html'),
  meaEam: source('India MEA: EAM visits index','https://www.mea.gov.in/eam-visits.htm'),
  meaVisits: source('India MEA: outgoing visits index','https://www.mea.gov.in/visits.htm'),
  meaTravel: source('India MEA: travel page of External Affairs Minister','https://www.mea.gov.in/travel-page-evm.htm'),
  g7Charlevoix: source('GOV.UK: G7 Foreign Ministers meeting in Charlevoix joint statement','https://www.gov.uk/government/news/joint-statement-of-the-g7-foreign-ministers-meeting-in-charlevoix'),
  g7Vaux: source('Élysée: G7 Foreign Ministers meeting at Vaux-de-Cernay','https://www.elysee.fr/en/G7evian/2026/03/30/foreign-ministers-meeting-of-g7-member-states-at-the-abbaye-des-vaux-de-cernay-26-and-27-march-2026'),
  bilderberg2026: source('Bilderberg: 2026 Washington participant list','https://www.bilderbergmeetings.org/meetings/meeting-2026/participants-2026'),
  group30: source('Group of Thirty current members','https://group30.org/members'),
  bisAgm: source('BIS Annual General Meetings','https://www.bis.org/agm/index.htm'),
  bisCarstens: source('BIS: Carstens at 2025 AGM','https://www.bis.org/speeches/sp250629.htm'),
  agaBrussels: source('AKDN: Aga Khan statement at Brussels IX Syria conference','https://the.akdn/en/resources-media/resources/speeches/statement-by-his-highness-the-aga-khan-at-brussels-ix-standing-with-syria'),
  agaCanada: source('The Ismaili: Aga Khan inaugural visit to Canada','https://the.ismaili/au/en/news/his-highness-the-aga-khan-s-inaugural-visit-to-canada'),
  vanceMunich: source('White House: Vice President Vance at Munich Security Conference','https://www.whitehouse.gov/videos/vice-president-jd-vance-delivers-remarks-at-the-munich-security-conference/')
};
// Event appearance packs.
addApp({id:'a-2025-02-04-netanyahu-white-house-trump',personId:'p-benjamin-netanyahu',startsAt:'2025-02-04T15:00:00-05:00',eventType:'BILATERAL_MEETING',title:'Netanyahu meets Trump at the White House',summary:'Israel’s Prime Minister’s Office records Netanyahu meeting President Trump in Washington and describing himself as the first foreign leader invited to the White House in Trump’s second term.',significance:'A high-signal U.S.–Israel bilateral at the start of the new administration.',location:loc('washington','White House public event anchor'),eventGroupId:'eg-whitehouse-netanyahu-trump-2025-02-04',topics:['US-Israel','Gaza','Middle East','bilateral'],counterpartIds:['p-donald-trump'],sourcePack:[S.netanyahuFeb],publicInterestScore:93});
addApp({id:'a-2025-04-07-netanyahu-second-white-house-meeting',personId:'p-benjamin-netanyahu',startsAt:'2025-04-07T15:00:00-04:00',eventType:'BILATERAL_MEETING',title:'Second Trump-Netanyahu White House meeting of the term',summary:'White House video material labels the April 2025 meeting as Netanyahu’s second White House meeting with President Trump this term.',significance:'Shows repeat high-level U.S.–Israel contact within the first months of the administration.',location:loc('washington','White House public event anchor'),eventGroupId:'eg-whitehouse-netanyahu-trump-2025-04-07',topics:['US-Israel','Middle East','bilateral'],counterpartIds:['p-donald-trump'],sourcePack:[S.whitehouseApr,S.netanyahuApr],publicInterestScore:92});
addApp({id:'a-2025-07-07-netanyahu-washington-trump-visit',personId:'p-benjamin-netanyahu',startsAt:'2025-07-07T18:00:00-04:00',eventType:'BILATERAL_MEETING',title:'Netanyahu Washington visit and Trump dinner window',summary:'Israel’s PMO describes Netanyahu departing for Washington to meet President Trump; White House video records a dinner with the Israeli prime minister during the visit window.',significance:'Another public Washington contact in the U.S.–Israel relationship graph.',location:loc('washington','Washington public visit anchor'),eventGroupId:'eg-whitehouse-netanyahu-trump-2025-07-07',topics:['US-Israel','Middle East','hostages','Iran'],counterpartIds:['p-donald-trump'],sourcePack:[S.netanyahuJul,S.whitehouseDinner],publicInterestScore:91});
// Rubio high-frequency official travel rollup.
[
  ['a-2025-02-14-rubio-munich-security','2025-02-14T12:00:00+01:00','p-marco-rubio','Munich Security Conference travel window','State Department travel history places Rubio in Munich during the February 2025 Germany travel window.','munich','MSC','eg-msc-2025',['security','NATO','Ukraine'],['p-jd-vance'],[S.rubioMiles]],
  ['a-2025-02-17-rubio-jerusalem','2025-02-16T12:00:00+02:00','p-marco-rubio','Rubio Jerusalem travel window','State Department travel history lists Jerusalem during Rubio’s February 2025 travel to Germany, Israel, Saudi Arabia and the UAE.','jerusalem','Jerusalem public diplomatic anchor','eg-rubio-feb-2025-middle-east',['Middle East','Israel','diplomacy'],['p-benjamin-netanyahu'],[S.rubioMiles]],
  ['a-2025-02-18-rubio-riyadh-lavrov','2025-02-18T12:00:00+03:00','p-marco-rubio','Rubio meets Lavrov in Riyadh','State Department and Russian MFA readouts place Rubio and Lavrov in Riyadh for U.S.–Russia talks following the Trump-Putin call.','riyadh','Riyadh public talks anchor','eg-us-russia-riyadh-2025-02-18',['Russia','Ukraine','peace talks','diplomacy'],['p-sergey-lavrov'],[S.stateLavrovRiyadh,S.lavrovRiyadh]],
  ['a-2025-03-11-rubio-jeddah-ukraine-talks','2025-03-11T12:00:00+03:00','p-marco-rubio','Rubio Jeddah Ukraine talks window','State Department travel summary places Rubio in Jeddah for talks with Ukrainian counterparts and a meeting with Crown Prince Mohammed bin Salman.','jeddah','Jeddah public talks anchor','eg-rubio-jeddah-2025-03-11',['Ukraine','Saudi Arabia','peace talks'],['p-mohammed-bin-salman'],[S.rubioMiles]],
  ['a-2025-03-13-rubio-g7-charlevoix','2025-03-13T09:00:00-04:00','p-marco-rubio','G7 foreign ministers in Charlevoix','The State Department public schedule places Rubio at the G7 foreign ministers meeting in Charlevoix.','charlevoix','Charlevoix G7 public-event anchor','eg-g7-fm-charlevoix-2025-03-13',['G7','foreign ministers','Ukraine','Indo-Pacific'],['p-melanie-joly','p-david-lammy','p-jean-noel-barrot','p-antonio-tajani','p-kaja-kallas'],[S.rubioCharlevoix,S.g7Charlevoix]],
  ['a-2025-07-10-rubio-asean-kuala-lumpur','2025-07-10T12:00:00+08:00','p-marco-rubio','Rubio ASEAN ministerial week in Kuala Lumpur','State Department travel material places Rubio in Kuala Lumpur for ASEAN, East Asia Summit and ASEAN Regional Forum foreign-minister meetings.','kualalumpur','Kuala Lumpur ASEAN ministerial anchor','eg-asean-kuala-lumpur-2025-07-10',['ASEAN','Indo-Pacific','foreign ministers'],['p-sergey-lavrov'],[S.rubioMalaysia,S.lavrovRubioKL]],
  ['a-2026-03-27-rubio-g7-vaux','2026-03-27T12:00:00+01:00','p-marco-rubio','Rubio at G7 Foreign Affairs Ministerial in France','State Department announced Rubio’s travel to Cernay-la-Ville for the G7 Foreign Affairs Ministerial.','cernay','Vaux-de-Cernay G7 public-event anchor','eg-g7-vaux-2026-03-27',['G7','foreign ministers','Middle East','Ukraine'],['p-jean-noel-barrot','p-s-jaishankar'],[S.rubioFrance,S.g7Vaux]],
  ['a-2026-05-26-rubio-quad-new-delhi-extra','2026-05-26T10:00:00+05:30','p-marco-rubio','Quad foreign ministers in New Delhi','The State Department records the Quad foreign ministers meeting in New Delhi with Rubio, Jaishankar, Penny Wong and Toshimitsu Motegi.','newdelhi','New Delhi Quad public-event anchor','eg-quad-new-delhi-2026-05-26',['Quad','Indo-Pacific','critical minerals'],['p-s-jaishankar','p-penny-wong','p-toshimitsu-motegi'],[S.rubioQuad]]
].forEach(([id,startsAt,personId,title,summary,locKey,label,eventGroupId,topics,counterpartIds,sourcePack])=>addApp({id,startsAt,personId,title,summary,location:loc(locKey,label),eventGroupId,topics,counterpartIds,sourcePack,publicInterestScore:84,eventType:title.includes('Quad')?'MULTILATERAL_MEETING':title.includes('G7')?'FOREIGN_MINISTERS_MEETING':'PUBLIC_TRAVEL'}));
addApp({id:'a-2025-02-14-jd-vance-munich-security',personId:'p-jd-vance',startsAt:'2025-02-14T12:00:00+01:00',eventType:'SECURITY_FORUM_ADDRESS',title:'Vance remarks at Munich Security Conference',summary:'White House video records Vice President JD Vance delivering remarks at the Munich Security Conference.',significance:'A vice-presidential security-policy appearance that shaped the transatlantic debate at MSC 2025.',location:loc('munich','Munich Security Conference public-event anchor'),eventGroupId:'eg-msc-2025',topics:['security','Europe','Ukraine','speech'],counterpartIds:['p-marco-rubio','p-volodymyr-zelenskyy'],sourcePack:[S.vanceMunich],publicInterestScore:86});
// Jaishankar official MEA travel index expansion.
[
  ['a-2025-07-01-jaishankar-usa-visit','2025-07-01T12:00:00-04:00','Visit of EAM to the United States','India’s MEA travel index lists the External Affairs Minister’s visit to the USA from June 30 to July 2, 2025.','washington','Washington EAM public-visit anchor',['India-US','diplomacy'],[],[S.meaTravel]],
  ['a-2025-07-13-jaishankar-singapore','2025-07-13T12:00:00+08:00','EAM Singapore and China visit begins','MEA travel index lists the External Affairs Minister’s visit to Singapore and China from July 13 to 15, 2025.','singapore','Singapore EAM public-visit anchor',['Singapore','China','diplomacy'],[],[S.meaTravel]],
  ['a-2025-07-15-jaishankar-china','2025-07-15T12:00:00+08:00','EAM China leg of Singapore-China visit','The MEA travel index lists China in the July 2025 Singapore and China visit window.','beijing','Beijing EAM public-visit anchor',['China','diplomacy'],['p-wang-yi'],[S.meaTravel]],
  ['a-2025-08-19-jaishankar-russia','2025-08-19T12:00:00+03:00','EAM visit to Russia','MEA travel index lists the External Affairs Minister’s visit to Russia from August 19 to 21, 2025.','moscow','Moscow EAM public-visit anchor',['Russia','diplomacy'],['p-sergey-lavrov'],[S.meaTravel]],
  ['a-2025-11-11-jaishankar-ontario','2025-11-11T12:00:00-05:00','EAM visit to Ontario, Canada','MEA visits index lists the External Affairs Minister’s visit to Ontario from November 11 to 13, 2025.','toronto','Ontario / Toronto EAM public-visit anchor',['Canada','diplomacy'],['p-anita-anand'],[S.meaEam]],
  ['a-2025-11-17-jaishankar-moscow','2025-11-17T12:00:00+03:00','EAM Moscow visit','MEA visits index lists the External Affairs Minister’s visit to Moscow, Russia on November 17–18, 2025.','moscow','Moscow EAM public-visit anchor',['Russia','diplomacy'],['p-sergey-lavrov'],[S.meaEam]],
  ['a-2026-03-26-jaishankar-g7-france','2026-03-26T12:00:00+01:00','Jaishankar at G7 Foreign Ministers Meeting in France','India’s MEA visits index lists Jaishankar’s trip to France for the G7 Foreign Ministers’ Meeting from March 26 to 27, 2026.','cernay','Vaux-de-Cernay G7 public-event anchor',['G7','India','foreign ministers'],['p-marco-rubio','p-jean-noel-barrot'],[S.meaVisits,S.g7Vaux]],
  ['a-2026-04-09-jaishankar-mauritius-uae','2026-04-09T12:00:00+04:00','EAM Mauritius and UAE visit window','MEA visits index lists the External Affairs Minister’s visit to Mauritius and the UAE from April 9 to 12, 2026.','mauritius','Mauritius public-visit anchor',['Mauritius','UAE','diplomacy'],[],[S.meaVisits]],
  ['a-2026-05-02-jaishankar-caribbean','2026-05-02T12:00:00-05:00','EAM Jamaica, Suriname and Trinidad & Tobago visit','MEA visits index lists Jaishankar’s May 2–10, 2026 visit to Jamaica, Suriname and Trinidad & Tobago.','jamaica','Kingston EAM public-visit anchor',['Caribbean','diplomacy'],[],[S.meaVisits]],
  ['a-2026-05-06-jaishankar-suriname','2026-05-06T12:00:00-03:00','EAM Suriname visit leg','MEA visits index lists Suriname within the External Affairs Minister’s May 2026 Caribbean visit window.','suriname','Paramaribo EAM public-visit anchor',['Caribbean','diplomacy'],[],[S.meaVisits]],
  ['a-2026-05-09-jaishankar-trinidad','2026-05-09T12:00:00-04:00','EAM Trinidad and Tobago visit leg','MEA visits index lists Trinidad & Tobago within the External Affairs Minister’s May 2026 Caribbean visit window.','trinidad','Port of Spain EAM public-visit anchor',['Caribbean','diplomacy'],[],[S.meaVisits]]
].forEach(([id,startsAt,title,summary,locKey,label,topics,counterpartIds,sourcePack])=>addApp({id,personId:'p-s-jaishankar',startsAt,eventType:title.includes('G7')?'FOREIGN_MINISTERS_MEETING':'PUBLIC_VISIT',title,summary,location:loc(locKey,label),eventGroupId:`eg-${slug(locKey)}-${startsAt.slice(0,10)}`,topics,counterpartIds,sourcePack,publicInterestScore:82}));
// Lavrov and Wang Yi expansion.
[
  ['a-2024-06-10-lavrov-brics-nizhny','p-sergey-lavrov','2024-06-10T12:00:00+03:00','Lavrov at BRICS foreign ministers in Nizhny Novgorod','Russian MFA joint statement places the BRICS foreign ministers meeting in Nizhny Novgorod on 10 June 2024.','nizhny','Nizhny Novgorod BRICS public-event anchor','eg-brics-nizhny-2024-06-10',['BRICS','foreign ministers','Global South'],['p-wang-yi'],[S.bricsNizhny]],
  ['a-2024-09-28-lavrov-unga-79','p-sergey-lavrov','2024-09-28T12:00:00-04:00','Lavrov addresses UN General Assembly 79','Russian MFA records Lavrov’s statement at the UN General Assembly in New York on 28 September 2024.','newyork','UNGA New York public-event anchor','eg-unga-new-york-2024-09-28',['UNGA','security','Russia'],['p-antonio-guterres'],[S.lavrovUnga2024]],
  ['a-2025-02-18-lavrov-riyadh-rubio','p-sergey-lavrov','2025-02-18T12:00:00+03:00','Lavrov meets Rubio in Riyadh','Russian MFA and State Department readouts place Lavrov and Rubio in Riyadh for U.S.–Russia talks.','riyadh','Riyadh public talks anchor','eg-us-russia-riyadh-2025-02-18',['Russia','United States','Ukraine','peace talks'],['p-marco-rubio'],[S.lavrovRiyadh,S.stateLavrovRiyadh]],
  ['a-2025-04-29-lavrov-brics-rio','p-sergey-lavrov','2025-04-29T12:00:00-03:00','Lavrov at BRICS foreign ministers in Rio','Russian MFA records Lavrov’s remarks after the BRICS foreign ministers council in Rio de Janeiro.','rio','Rio BRICS foreign-ministers anchor','eg-brics-rio-2025-04-29',['BRICS','foreign ministers','Global South'],['p-wang-yi','p-mauro-vieira'],[S.lavrovRiyadh,S.bricsRio]],
  ['a-2025-07-10-lavrov-asean-kuala-lumpur','p-sergey-lavrov','2025-07-10T12:00:00+08:00','Lavrov at Russia-ASEAN ministerial meeting','Russian MFA records Lavrov’s remarks at the Russia-ASEAN ministerial meeting in Kuala Lumpur.','kualalumpur','Kuala Lumpur ASEAN ministerial anchor','eg-asean-kuala-lumpur-2025-07-10',['ASEAN','Russia','foreign ministers'],['p-marco-rubio'],[S.lavrovAsean,S.lavrovRubioKL]],
  ['a-2025-09-25-lavrov-g20-fmm-unga','p-sergey-lavrov','2025-09-25T12:00:00-04:00','Lavrov at G20 foreign ministers meeting on UNGA sidelines','Russian MFA records Lavrov’s statement at the G20 foreign ministers meeting on the sidelines of UNGA in New York.','newyork','UNGA/G20 New York public-event anchor','eg-g20-fmm-new-york-2025-09-25',['G20','UNGA','foreign ministers'],['p-antonio-guterres'],[S.lavrovG20Unga]],
  ['a-2025-09-27-lavrov-unga-80','p-sergey-lavrov','2025-09-27T12:00:00-04:00','Lavrov addresses UN General Assembly 80','Russian MFA records Lavrov’s address at the 80th UN General Assembly in New York.','newyork','UNGA New York public-event anchor','eg-unga-new-york-2025-09-27',['UNGA','security','Russia'],['p-antonio-guterres'],[S.lavrovUnga2025]],
  ['a-2024-06-10-wang-yi-brics-nizhny','p-wang-yi','2024-06-10T12:00:00+03:00','Wang Yi at BRICS foreign ministers in Nizhny Novgorod','China’s MFA records Wang Yi attending the BRICS foreign ministers meeting in Nizhny Novgorod.','nizhny','Nizhny Novgorod BRICS public-event anchor','eg-brics-nizhny-2024-06-10',['BRICS','China','foreign ministers'],['p-sergey-lavrov'],[S.wangNizhny,S.bricsNizhny]],
  ['a-2025-04-29-wang-yi-brics-rio','p-wang-yi','2025-04-29T12:00:00-03:00','Wang Yi at BRICS ministerial session in Rio','China’s MFA records Wang Yi attending the BRICS ministerial session in Rio de Janeiro.','rio','Rio BRICS foreign-ministers anchor','eg-brics-rio-2025-04-29',['BRICS','China','foreign ministers'],['p-sergey-lavrov','p-mauro-vieira'],[S.wangRio,S.bricsRio]]
].forEach(([id,personId,startsAt,title,summary,locKey,label,eventGroupId,topics,counterpartIds,sourcePack])=>addApp({id,personId,startsAt,eventType:title.includes('BRICS')?'FOREIGN_MINISTERS_MEETING':title.includes('UN')?'UN_ADDRESS':'PUBLIC_MEETING',title,summary,location:loc(locKey,label),eventGroupId,topics,counterpartIds,sourcePack,publicInterestScore:86}));
// G7 / BRICS minister attendee graph people.
const g7CharlevoixPeople = ['p-david-lammy','p-jean-noel-barrot','p-antonio-tajani','p-melanie-joly','p-kaja-kallas','p-takeshi-iwaya'];
g7CharlevoixPeople.forEach(pid=>addApp({id:`a-2025-03-13-${pid.replace('p-','')}-g7-charlevoix`,personId:pid,startsAt:'2025-03-13T12:00:00-04:00',eventType:'FOREIGN_MINISTERS_MEETING',title:'G7 foreign ministers in Charlevoix',summary:'The G7 foreign ministers of Canada, France, Germany, Italy, Japan, the United Kingdom, the United States and the EU High Representative met in Charlevoix from March 12 to 14, 2025.',significance:'Foreign-minister clusters are high-signal because they often precede leader-level decisions and summit communiqués.',location:loc('charlevoix','Charlevoix G7 public-event anchor'),eventGroupId:'eg-g7-fm-charlevoix-2025-03-13',topics:['G7','foreign ministers','Ukraine','Indo-Pacific'],counterpartIds:['p-marco-rubio',...g7CharlevoixPeople.filter(x=>x!==pid)].slice(0,7),sourcePack:[S.g7Charlevoix,S.rubioCharlevoix],publicInterestScore:80}));
['p-jean-noel-barrot','p-s-jaishankar'].forEach(pid=>addApp({id:`a-2026-03-27-${pid.replace('p-','')}-g7-vaux`,personId:pid,startsAt:'2026-03-27T12:00:00+01:00',eventType:'FOREIGN_MINISTERS_MEETING',title:'G7 Foreign Ministers Meeting at Vaux-de-Cernay',summary:'French G7 material places the first formal 2026 G7 Foreign Ministers Meeting at the Abbaye des Vaux-de-Cernay on March 26–27, 2026.',significance:'A preparatory G7 diplomacy hub ahead of the leaders’ summit in Évian.',location:loc('cernay','Vaux-de-Cernay G7 public-event anchor'),eventGroupId:'eg-g7-vaux-2026-03-27',topics:['G7','foreign ministers','security','Middle East'],counterpartIds:['p-marco-rubio','p-s-jaishankar','p-jean-noel-barrot'].filter(x=>x!==pid),sourcePack:[S.g7Vaux,S.rubioFrance,S.meaVisits],publicInterestScore:82}));
['p-mauro-vieira','p-abbas-araghchi','p-ronald-lamola'].forEach(pid=>addApp({id:`a-2025-04-29-${pid.replace('p-','')}-brics-rio`,personId:pid,startsAt:'2025-04-29T12:00:00-03:00',eventType:'FOREIGN_MINISTERS_MEETING',title:'BRICS foreign ministers in Rio de Janeiro',summary:'The BRICS chair statement records the foreign ministers meeting in Rio de Janeiro on April 28–29, 2025.',significance:'BRICS ministerial meetings help map the alternate multilateral network around trade, development finance and Global South coordination.',location:loc('rio','Rio BRICS foreign-ministers anchor'),eventGroupId:'eg-brics-rio-2025-04-29',topics:['BRICS','foreign ministers','Global South'],counterpartIds:['p-sergey-lavrov','p-wang-yi','p-mauro-vieira','p-abbas-araghchi','p-ronald-lamola'].filter(x=>x!==pid),sourcePack:[S.bricsRio],publicInterestScore:78}));
// Key convening / central bank / elite network additions.
addApp({id:'a-2026-04-09-henri-de-castries-bilderberg-washington',personId:'p-henri-de-castries',startsAt:'2026-04-09T12:00:00-04:00',eventType:'ELITE_FORUM',title:'Bilderberg Washington participant list',summary:'Bilderberg’s 2026 participant list names Henri de Castries at the Washington meeting.',significance:'Bilderberg is valuable as an attendee graph: the meeting has no formal decisions, but the named participant list links finance, policy, technology, media and security circles.',location:loc('washington','Bilderberg 2026 Washington public-event anchor'),eventGroupId:'eg-bilderberg-washington-2026-04-09',topics:['Bilderberg','finance','policy network'],counterpartIds:['p-jose-manuel-barroso','p-fatih-birol','p-alex-karp','p-marie-josee-kravis'],sourcePack:[S.bilderberg2026],publicInterestScore:78});
addApp({id:'a-2026-04-09-marie-josee-kravis-bilderberg-washington',personId:'p-marie-josee-kravis',startsAt:'2026-04-09T12:00:00-04:00',eventType:'ELITE_FORUM',title:'Bilderberg Washington participant list',summary:'Bilderberg’s 2026 participant list names Marie-Josée Kravis among the Washington participants/chairs.',significance:'A convening-network record linking philanthropy, finance, culture and transatlantic policy circles.',location:loc('washington','Bilderberg 2026 Washington public-event anchor'),eventGroupId:'eg-bilderberg-washington-2026-04-09',topics:['Bilderberg','philanthropy','policy network'],counterpartIds:['p-henri-de-castries','p-jose-manuel-barroso','p-fatih-birol'],sourcePack:[S.bilderberg2026],publicInterestScore:75});
addApp({id:'a-2025-03-17-rahim-aga-khan-brussels-syria',personId:'p-rahim-aga-khan',startsAt:'2025-03-17T12:00:00+01:00',eventType:'DEVELOPMENT_FORUM_ADDRESS',title:'Aga Khan at Brussels IX Syria conference',summary:'AKDN records Prince Rahim Aga Khan V addressing the European Commission’s Brussels IX conference on Syria.',significance:'A high-signal civil-society/development stop linking Syria reconstruction, EU diplomacy and the Aga Khan Development Network.',location:loc('brussels','Brussels IX Syria conference public-event anchor'),eventGroupId:'eg-brussels-syria-2025-03-17',topics:['Syria','development','EU','humanitarian'],counterpartIds:['p-ursula-von-der-leyen'],sourcePack:[S.agaBrussels],publicInterestScore:80});
addApp({id:'a-2026-03-30-rahim-aga-khan-toronto',personId:'p-rahim-aga-khan',startsAt:'2026-03-30T12:00:00-04:00',eventType:'PUBLIC_VISIT',title:'Aga Khan inaugural visit to Canada',summary:'The Ismaili records the Aga Khan’s inaugural Canada visit and Toronto public honours around the Aga Khan Museum / Ismaili Centre.',significance:'A public civil-society/royal-development network record linking Canada, philanthropy, faith leadership and cultural institutions.',location:loc('toronto','Toronto Aga Khan public-visit anchor'),eventGroupId:'eg-aga-khan-canada-2026-03-30',topics:['Canada','philanthropy','development','culture'],counterpartIds:[],sourcePack:[S.agaCanada],publicInterestScore:76});
addApp({id:'a-2025-06-29-carstens-bis-agm-basel',personId:'p-agustin-carstens',startsAt:'2025-06-29T12:00:00+02:00',eventType:'CENTRAL_BANK_ADDRESS',title:'Carstens at BIS Annual General Meeting',summary:'BIS records Agustín Carstens speaking at the 2025 Annual General Meeting in Basel.',significance:'BIS AGM records are core monetary-network signals because they gather central-bank leadership around financial stability and policy coordination.',location:loc('basel','BIS AGM Basel public-event anchor'),eventGroupId:'eg-bis-agm-2025-06-29',topics:['BIS','central banking','financial stability'],counterpartIds:['p-pablo-hernandez-de-cos','p-christine-lagarde','p-jerome-powell'],sourcePack:[S.bisCarstens,S.bisAgm],publicInterestScore:84});
// Calls: add readout edges so the call network grows alongside physical travel.
addCall({id:'call-rubio-lavrov-2025-02-15',participantIds:['p-marco-rubio','p-sergey-lavrov'],startsAt:'2025-02-15T15:00:00Z',title:'Rubio call with Lavrov before Riyadh talks',summary:'Russian MFA says Lavrov and Rubio spoke by phone before the Riyadh contact channel opened.',source:{label:'Russian MFA call readout',url:'https://www.mid.ru/en/foreign_policy/news/1997596/'},topics:['Russia','United States','Ukraine','diplomacy']});
addCall({id:'call-rubio-lavrov-2025-03-15',participantIds:['p-marco-rubio','p-sergey-lavrov'],startsAt:'2025-03-15T15:00:00Z',title:'Rubio-Lavrov follow-up call after Riyadh',summary:'Russian MFA describes a Lavrov-Rubio telephone conversation on issues following the Riyadh meeting.',source:{label:'Russian MFA follow-up call readout',url:'https://www.mid.ru/en/foreign_policy/news/2003486/'},topics:['Russia','United States','Ukraine','diplomacy']});
// Encounters.
function encounter(id, title, participantIds, appearanceIds, date, locKey, type, summary, topics=[], score=84){
  addEncounter({id,title,participantIds,appearanceIds:appearanceIds.filter(id=>existingApp.has(id)),startsAt:date,location:loc(locKey),type,importanceScore:score,verificationLevel:'Verified',summary,whyItMatters:summary,sourcePack:[],topics});
}
encounter('enc-us-israel-whitehouse-feb-2025','Trump-Netanyahu White House meeting',['p-donald-trump','p-benjamin-netanyahu'],['a-2025-02-04-netanyahu-white-house-trump'],'2025-02-04T15:00:00-05:00','washington','Bilateral meeting','Public U.S.–Israel leader-level meeting early in the Trump term.',['US-Israel','Middle East'],94);
encounter('enc-us-russia-riyadh-2025','Rubio-Lavrov Riyadh talks',['p-marco-rubio','p-sergey-lavrov'],['a-2025-02-18-rubio-riyadh-lavrov','a-2025-02-18-lavrov-riyadh-rubio'],'2025-02-18T12:00:00+03:00','riyadh','Peace/diplomacy talks','U.S. and Russian foreign ministers met publicly in Riyadh during the Ukraine diplomacy cycle.',['Ukraine','Russia','peace talks'],92);
encounter('enc-g7-charlevoix-2025','G7 foreign ministers Charlevoix',['p-marco-rubio','p-david-lammy','p-jean-noel-barrot','p-antonio-tajani','p-melanie-joly','p-kaja-kallas','p-takeshi-iwaya'],['a-2025-03-13-rubio-g7-charlevoix',...g7CharlevoixPeople.map(pid=>`a-2025-03-13-${pid.replace('p-','')}-g7-charlevoix`)],'2025-03-13T12:00:00-04:00','charlevoix','Foreign ministers meeting','G7 foreign ministers and the EU high representative gathered in Charlevoix for Ukraine, Indo-Pacific and global security coordination.',['G7','foreign ministers'],88);
encounter('enc-brics-nizhny-2024','BRICS foreign ministers Nizhny Novgorod',['p-sergey-lavrov','p-wang-yi'],['a-2024-06-10-lavrov-brics-nizhny','a-2024-06-10-wang-yi-brics-nizhny'],'2024-06-10T12:00:00+03:00','nizhny','Foreign ministers meeting','BRICS foreign ministers met in Nizhny Novgorod, a core Global South / alternate multilateral node.',['BRICS'],86);
encounter('enc-brics-rio-2025','BRICS foreign ministers Rio',['p-sergey-lavrov','p-wang-yi','p-mauro-vieira','p-abbas-araghchi','p-ronald-lamola'],['a-2025-04-29-lavrov-brics-rio','a-2025-04-29-wang-yi-brics-rio','a-2025-04-29-mauro-vieira-brics-rio','a-2025-04-29-abbas-araghchi-brics-rio','a-2025-04-29-ronald-lamola-brics-rio'],'2025-04-29T12:00:00-03:00','rio','Foreign ministers meeting','BRICS foreign ministers met in Rio de Janeiro for Global South and multilateral coordination.',['BRICS','trade','development'],87);
encounter('enc-asean-kuala-lumpur-2025','ASEAN ministerial week Kuala Lumpur',['p-marco-rubio','p-sergey-lavrov'],['a-2025-07-10-rubio-asean-kuala-lumpur','a-2025-07-10-lavrov-asean-kuala-lumpur'],'2025-07-10T12:00:00+08:00','kualalumpur','Ministerial forum','ASEAN ministerial week put U.S. and Russian foreign ministers into the same public diplomatic week in Kuala Lumpur.',['ASEAN','Indo-Pacific'],84);
encounter('enc-g7-vaux-2026','G7 Foreign Ministers Vaux-de-Cernay',['p-marco-rubio','p-jean-noel-barrot','p-s-jaishankar'],['a-2026-03-27-rubio-g7-vaux','a-2026-03-27-jean-noel-barrot-g7-vaux','a-2026-03-26-jaishankar-g7-france'],'2026-03-27T12:00:00+01:00','cernay','Foreign ministers meeting','The 2026 G7 foreign-minister meeting in France acts as a preparation node for the Évian leaders’ summit.',['G7','security'],86);
encounter('enc-quad-new-delhi-2026','Quad foreign ministers New Delhi',['p-marco-rubio','p-s-jaishankar','p-penny-wong','p-toshimitsu-motegi'],['a-2026-05-26-rubio-quad-new-delhi-extra'],'2026-05-26T10:00:00+05:30','newdelhi','Foreign ministers meeting','Quad foreign ministers met in New Delhi around Indo-Pacific energy, critical minerals and supply-chain cooperation.',['Quad','critical minerals','Indo-Pacific'],87);
encounter('enc-bilderberg-washington-2026','Bilderberg Washington named participants',['p-henri-de-castries','p-marie-josee-kravis','p-jose-manuel-barroso','p-fatih-birol','p-alex-karp'],['a-2026-04-09-henri-de-castries-bilderberg-washington','a-2026-04-09-marie-josee-kravis-bilderberg-washington'],'2026-04-09T12:00:00-04:00','washington','Invitation-only forum','Bilderberg’s public participant list creates a useful named attendee graph across finance, policy, energy, technology and media.',['Bilderberg','finance','technology'],82);
// Agenda cards for active traveller capture.
addAgenda({id:'agenda-g7-foreign-ministers-vaux-2026',title:'G7 Foreign Ministers Meeting 2026',type:'Foreign ministers meeting',startsAt:'2026-03-26T09:00:00+01:00',endsAt:'2026-03-27T18:00:00+01:00',location:loc('cernay','Vaux-de-Cernay G7 public-event anchor'),status:'completed',whyItMatters:'Foreign-minister meetings often set the language and negotiation lines before leaders meet.',sectors:['Security','Sanctions','Energy','Trade'],participantNames:['Marco Rubio','Jean-Noël Barrot','Subrahmanyam Jaishankar'],sourcePack:[S.g7Vaux,S.rubioFrance,S.meaVisits],topics:['G7','foreign ministers'],attendeeMode:'partial_source_named'});
addAgenda({id:'agenda-asean-kuala-lumpur-2025',title:'ASEAN ministerial week 2025',type:'Foreign ministers week',startsAt:'2025-07-08T09:00:00+08:00',endsAt:'2025-07-12T18:00:00+08:00',location:loc('kualalumpur','Kuala Lumpur ASEAN ministerial anchor'),status:'completed',whyItMatters:'ASEAN ministerial week is a dense Indo-Pacific diplomacy hub where U.S., Russian, Chinese and regional foreign ministers can overlap.',sectors:['Security','Trade','Indo-Pacific'],participantNames:['Marco Rubio','Sergey Lavrov'],sourcePack:[S.rubioMalaysia,S.lavrovAsean],topics:['ASEAN','foreign ministers'],attendeeMode:'source_named'});
addAgenda({id:'agenda-brics-fm-rio-2025',title:'BRICS Foreign Ministers 2025',type:'Foreign ministers meeting',startsAt:'2025-04-28T09:00:00-03:00',endsAt:'2025-04-29T18:00:00-03:00',location:loc('rio','Rio BRICS foreign-ministers anchor'),status:'completed',whyItMatters:'The BRICS ministerial is a key signal for Global South coordination, sanctions alternatives, development finance and trade narratives.',sectors:['Trade','Development finance','Energy','Geopolitics'],participantNames:['Sergey Lavrov','Wang Yi','Mauro Vieira','Abbas Araghchi','Ronald Lamola'],sourcePack:[S.bricsRio,S.wangRio],topics:['BRICS','foreign ministers'],attendeeMode:'source_named'});
// Metadata and coverage counters.
data.meta.iteration = 'v3.7.0';
data.meta.version = '3.7.0';
data.meta.generatedAt = now;
data.meta.lastDataUpdate = now;
data.meta.status = 'anchored v3.6 layout with active-traveller expansion for foreign ministers, second-in-line figures, Bilderberg/BIS/G30 and high-frequency public diplomacy records';
data.meta.versionNotes = 'v3.7.0: expands frequent-traveller coverage with official foreign-minister travel pages, State Department mileage/history, Russia MFA readouts, China MFA BRICS records, MEA visit indexes, Bilderberg named participants, BIS/G30 watcher sources and Aga Khan development-network public stops.';
data.meta.launchCoverage = `Top-10 default opening face map, full top-200 roster, ${people.length} mapped public figures, ${appearances.length}+ public appearance records, foreign-minister and event-attendee expansion packs, summit/event graph and below-map intelligence rankings.`;
data.meta.importStatus = 'active-traveller expansion pack added; nightly crawler priority shifted toward office travel pages, foreign-minister readouts and event attendee lists';
data.meta.uiIteration = 'v3.7 anchored layout: map first, profile right rail, intelligence below map, with richer public travel records for frequent movers.';
// profile audit counters
for (const p of people) {
  if (!Array.isArray(p.profileLines) || p.profileLines.length < 8) p.profileLines = profileLines(p);
}
fs.writeFileSync(file, JSON.stringify(data,null,2));
console.log(`Patched v3.7 data: ${people.length} people, ${appearances.length} appearances, ${encounters.length} encounters, ${eventAgendas.length} agendas, ${roster.length} roster.`);
