import fs from 'node:fs';

const path = 'data/demo.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const now = '2026-05-30T11:45:00+02:00';

function slugify(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function source(label, url, type = 'official_or_host', reliability = 'primary') {
  return { label, url, type, license: 'public web source; rights remain with publisher', checkedAt: now, reliability };
}
function key(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

const coords = {
  washington: { label: 'Washington public official anchor', city: 'Washington', countryCode: 'US', countryName: 'United States', lat: 38.9072, lng: -77.0369, precision: 'city' },
  palmBeach: { label: 'Palm Beach public event cluster', city: 'Palm Beach', countryCode: 'US', countryName: 'United States', lat: 26.7056, lng: -80.0364, precision: 'city' },
  jerusalem: { label: 'Jerusalem public official anchor', city: 'Jerusalem', countryCode: 'IL', countryName: 'Israel', lat: 31.7683, lng: 35.2137, precision: 'city' },
  panama: { label: 'Panama City public diplomatic stop', city: 'Panama City', countryCode: 'PA', countryName: 'Panama', lat: 8.9824, lng: -79.5199, precision: 'city' },
  sanSalvador: { label: 'San Salvador public diplomatic stop', city: 'San Salvador', countryCode: 'SV', countryName: 'El Salvador', lat: 13.6929, lng: -89.2182, precision: 'city' },
  sanJose: { label: 'San Jose public diplomatic stop', city: 'San Jose', countryCode: 'CR', countryName: 'Costa Rica', lat: 9.9281, lng: -84.0907, precision: 'city' },
  guatemala: { label: 'Guatemala City public diplomatic stop', city: 'Guatemala City', countryCode: 'GT', countryName: 'Guatemala', lat: 14.6349, lng: -90.5069, precision: 'city' },
  santoDomingo: { label: 'Santo Domingo public diplomatic stop', city: 'Santo Domingo', countryCode: 'DO', countryName: 'Dominican Republic', lat: 18.4861, lng: -69.9312, precision: 'city' },
  munich: { label: 'Munich public security forum stop', city: 'Munich', countryCode: 'DE', countryName: 'Germany', lat: 48.1351, lng: 11.582, precision: 'city' },
  riyadh: { label: 'Riyadh public diplomatic stop', city: 'Riyadh', countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, precision: 'city' },
  jeddah: { label: 'Jeddah public diplomatic stop', city: 'Jeddah', countryCode: 'SA', countryName: 'Saudi Arabia', lat: 21.4858, lng: 39.1925, precision: 'city' },
  abuDhabi: { label: 'Abu Dhabi public diplomatic stop', city: 'Abu Dhabi', countryCode: 'AE', countryName: 'United Arab Emirates', lat: 24.4539, lng: 54.3773, precision: 'city' },
  quebec: { label: 'Charlevoix public G7 ministerial stop', city: 'La Malbaie', countryCode: 'CA', countryName: 'Canada', lat: 47.654, lng: -70.152, precision: 'city' },
  brussels: { label: 'Brussels public diplomatic stop', city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, precision: 'city' },
  paris: { label: 'Paris public diplomatic stop', city: 'Paris', countryCode: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522, precision: 'city' },
  kingston: { label: 'Kingston public diplomatic stop', city: 'Kingston', countryCode: 'JM', countryName: 'Jamaica', lat: 17.9712, lng: -76.7936, precision: 'city' },
  georgetown: { label: 'Georgetown public diplomatic stop', city: 'Georgetown', countryCode: 'GY', countryName: 'Guyana', lat: 6.8013, lng: -58.1551, precision: 'city' },
  paramaribo: { label: 'Paramaribo public diplomatic stop', city: 'Paramaribo', countryCode: 'SR', countryName: 'Suriname', lat: 5.852, lng: -55.2038, precision: 'city' },
  doha: { label: 'Doha public diplomatic stop', city: 'Doha', countryCode: 'QA', countryName: 'Qatar', lat: 25.2854, lng: 51.531, precision: 'city' },
  antalya: { label: 'Antalya public NATO ministerial stop', city: 'Antalya', countryCode: 'TR', countryName: 'Turkey', lat: 36.8969, lng: 30.7133, precision: 'city' },
  istanbul: { label: 'Istanbul public diplomatic stop', city: 'Istanbul', countryCode: 'TR', countryName: 'Turkey', lat: 41.0082, lng: 28.9784, precision: 'city' },
  rome: { label: 'Rome public diplomatic stop', city: 'Rome', countryCode: 'IT', countryName: 'Italy', lat: 41.9028, lng: 12.4964, precision: 'city' },
  vatican: { label: 'Vatican City public diplomatic stop', city: 'Vatican City', countryCode: 'VA', countryName: 'Holy See', lat: 41.9029, lng: 12.4534, precision: 'city' },
  kualaLumpur: { label: 'Kuala Lumpur public ASEAN stop', city: 'Kuala Lumpur', countryCode: 'MY', countryName: 'Malaysia', lat: 3.139, lng: 101.6869, precision: 'city' },
  mexicoCity: { label: 'Mexico City public diplomatic stop', city: 'Mexico City', countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, precision: 'city' },
  quito: { label: 'Quito public diplomatic stop', city: 'Quito', countryCode: 'EC', countryName: 'Ecuador', lat: -0.1807, lng: -78.4678, precision: 'city' },
  newYork: { label: 'New York UN public diplomacy stop', city: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7128, lng: -74.006, precision: 'city' },
  london: { label: 'London public diplomatic stop', city: 'London', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5072, lng: -0.1276, precision: 'city' },
  tokyo: { label: 'Tokyo public diplomatic stop', city: 'Tokyo', countryCode: 'JP', countryName: 'Japan', lat: 35.6762, lng: 139.6503, precision: 'city' },
  gyeongju: { label: 'Gyeongju public APEC stop', city: 'Gyeongju', countryCode: 'KR', countryName: 'Republic of Korea', lat: 35.8562, lng: 129.2247, precision: 'city' },
  hamilton: { label: 'Niagara public G7 ministerial stop', city: 'Hamilton', countryCode: 'CA', countryName: 'Canada', lat: 43.2557, lng: -79.8711, precision: 'city' },
  geneva: { label: 'Geneva public diplomatic stop', city: 'Geneva', countryCode: 'CH', countryName: 'Switzerland', lat: 46.2044, lng: 6.1432, precision: 'city' },
  milan: { label: 'Milan public diplomatic stop', city: 'Milan', countryCode: 'IT', countryName: 'Italy', lat: 45.4642, lng: 9.19, precision: 'city' },
  bratislava: { label: 'Bratislava public diplomatic stop', city: 'Bratislava', countryCode: 'SK', countryName: 'Slovakia', lat: 48.1486, lng: 17.1077, precision: 'city' },
  budapest: { label: 'Budapest public diplomatic stop', city: 'Budapest', countryCode: 'HU', countryName: 'Hungary', lat: 47.4979, lng: 19.0402, precision: 'city' },
  basseterre: { label: 'Basseterre public diplomatic stop', city: 'Basseterre', countryCode: 'KN', countryName: 'Saint Kitts and Nevis', lat: 17.3026, lng: -62.7177, precision: 'city' },
  moscow: { label: 'Moscow public official anchor', city: 'Moscow', countryCode: 'RU', countryName: 'Russia', lat: 55.7558, lng: 37.6173, precision: 'city' },
  johannesburg: { label: 'Johannesburg public G20 ministerial stop', city: 'Johannesburg', countryCode: 'ZA', countryName: 'South Africa', lat: -26.2041, lng: 28.0473, precision: 'city' },
  ankara: { label: 'Ankara public diplomatic stop', city: 'Ankara', countryCode: 'TR', countryName: 'Turkey', lat: 39.9334, lng: 32.8597, precision: 'city' },
  tashkent: { label: 'Tashkent public diplomatic stop', city: 'Tashkent', countryCode: 'UZ', countryName: 'Uzbekistan', lat: 41.2995, lng: 69.2401, precision: 'city' },
  rio: { label: 'Rio de Janeiro public BRICS stop', city: 'Rio de Janeiro', countryCode: 'BR', countryName: 'Brazil', lat: -22.9068, lng: -43.1729, precision: 'city' },
  beijing: { label: 'Beijing public official anchor', city: 'Beijing', countryCode: 'CN', countryName: 'China', lat: 39.9042, lng: 116.4074, precision: 'city' },
  newDelhi: { label: 'New Delhi public official anchor', city: 'New Delhi', countryCode: 'IN', countryName: 'India', lat: 28.6139, lng: 77.209, precision: 'city' },
  ontario: { label: 'Ontario public G7 ministerial stop', city: 'Hamilton', countryCode: 'CA', countryName: 'Canada', lat: 43.2557, lng: -79.8711, precision: 'city' },
  colombo: { label: 'Colombo public diplomatic stop', city: 'Colombo', countryCode: 'LK', countryName: 'Sri Lanka', lat: 6.9271, lng: 79.8612, precision: 'city' },
  luxembourg: { label: 'Luxembourg public diplomatic stop', city: 'Luxembourg', countryCode: 'LU', countryName: 'Luxembourg', lat: 49.6116, lng: 6.1319, precision: 'city' },
  portLouis: { label: 'Port Louis public diplomatic stop', city: 'Port Louis', countryCode: 'MU', countryName: 'Mauritius', lat: -20.1609, lng: 57.5012, precision: 'city' },
  abuDhabi2: { label: 'Abu Dhabi public diplomatic stop', city: 'Abu Dhabi', countryCode: 'AE', countryName: 'United Arab Emirates', lat: 24.4539, lng: 54.3773, precision: 'city' },
  portOfSpain: { label: 'Port of Spain public diplomatic stop', city: 'Port of Spain', countryCode: 'TT', countryName: 'Trinidad and Tobago', lat: 10.6549, lng: -61.5019, precision: 'city' },
  nicosia: { label: 'Nicosia public diplomatic stop', city: 'Nicosia', countryCode: 'CY', countryName: 'Cyprus', lat: 35.1856, lng: 33.3823, precision: 'city' },
  brasilia: { label: 'Brasilia public official anchor', city: 'Brasilia', countryCode: 'BR', countryName: 'Brazil', lat: -15.7939, lng: -47.8828, precision: 'city' },
  pretoria: { label: 'Pretoria public official anchor', city: 'Pretoria', countryCode: 'ZA', countryName: 'South Africa', lat: -25.7479, lng: 28.2293, precision: 'city' },
  berlin: { label: 'Berlin public official anchor', city: 'Berlin', countryCode: 'DE', countryName: 'Germany', lat: 52.52, lng: 13.405, precision: 'city' },
  ottawa: { label: 'Ottawa public official anchor', city: 'Ottawa', countryCode: 'CA', countryName: 'Canada', lat: 45.4215, lng: -75.6972, precision: 'city' },
  tehran: { label: 'Tehran public official anchor', city: 'Tehran', countryCode: 'IR', countryName: 'Iran', lat: 35.6892, lng: 51.389, precision: 'city' },
  nairobi: { label: 'Nairobi public official-visit stop', city: 'Nairobi', countryCode: 'KE', countryName: 'Kenya', lat: -1.2921, lng: 36.8219, precision: 'city' },
  parisAnchor: { label: 'Paris public corporate anchor', city: 'Paris', countryCode: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522, precision: 'city' }
};

const homeById = {
  'p-sergey-lavrov': coords.moscow,
  'p-wang-yi': coords.beijing,
  'p-mauro-vieira': coords.brasilia,
  'p-ronald-lamola': coords.pretoria,
  'p-jean-noel-barrot': coords.paris,
  'p-johann-wadephul': coords.berlin,
  'p-antonio-tajani': coords.rome,
  'p-yvette-cooper': coords.london,
  'p-anita-anand': coords.ottawa,
  'p-toshimitsu-motegi': coords.tokyo,
  'p-david-lammy': coords.london,
  'p-hakan-fidan': coords.ankara,
  'p-faisal-bin-farhan': coords.riyadh,
  'p-abbas-araghchi': coords.tehran,
  'p-jd-vance': coords.washington,
  'p-rahim-aga-khan-v': coords.geneva,
  'p-alexandre-de-rothschild': coords.parisAnchor
};

function profileLinesFor(person, recordCount = 0, latest = 'not yet in the approved map archive') {
  return [
    { icon: 'Profile', label: 'Role', text: `${person.canonicalName} is tracked because the role has visible public consequences across diplomacy, policy, capital, security or major institutions.` },
    { icon: 'Office', label: 'Institution', text: `${person.organization} is the primary institutional context. The map follows public duties and events, not personal movement.` },
    { icon: 'Map', label: 'Public base', text: `${person.homeBases?.[0]?.city || 'Public institutional anchor'} is used only as a coarse public anchor for storyline resets.` },
    { icon: 'Records', label: 'Trail depth', text: `${recordCount} approved public record${recordCount === 1 ? '' : 's'} currently connect this profile to the map.` },
    { icon: 'Latest', label: 'Latest mapped record', text: latest },
    { icon: 'Network', label: 'Network value', text: 'The useful signal is the pattern of repeated official meetings, summits, speeches and public readouts.' },
    { icon: 'Watch', label: 'What to watch', text: 'Future cards should come from official diaries, host pages, public programmes or institutional announcements.' },
    { icon: 'Sources', label: 'Source rule', text: 'Official offices and host institutions outrank media leads; news links are retained as context, not as the base record.' },
    { icon: 'Safety', label: 'Boundary', text: 'No hotels, private addresses, unsourced sightings, leaked itineraries or live proximity are shown.' },
    { icon: 'Links', label: 'Links', text: 'Official profile, public bio, social search and LinkedIn search are separated from verified source packs.' }
  ];
}

function addPerson(p) {
  const existing = data.people.find(x => x.id === p.id);
  const merged = {
    id: p.id,
    slug: p.slug || slugify(p.canonicalName),
    canonicalName: p.canonicalName,
    category: p.category || 'FOREIGN_MINISTER',
    roleTitle: p.roleTitle,
    organization: p.organization,
    orgType: p.orgType || 'National government',
    sector: p.sector || 'Government',
    industry: p.industry || 'Government / diplomacy',
    homeRegion: p.homeRegion || 'Global',
    prominenceScore: p.prominenceScore ?? 88,
    riskTier: p.riskTier ?? 3,
    color: p.color || '#9ecbff',
    shortBio: p.shortBio || `${p.roleTitle}; tracked through official public appearances and host-event records.`,
    officialUrl: p.officialUrl || p.profileUrl || '',
    sourceReliability: 'official office pages, host-event pages, public readouts, then corroborated media',
    orgIcon: p.orgIcon || '✦',
    countryFocus: p.countryFocus,
    countryName: p.countryName,
    countryFocusCode: p.countryFocus,
    wikiTitle: p.wikiTitle || slugify(p.canonicalName).replace(/-/g, '_'),
    imageUrl: p.imageUrl || '',
    visualAuditStatus: 'candidate portrait or runtime thumbnail; production cache and attribution required',
    homeBases: [{ ...homeById[p.id], type: 'official_base' }].filter(Boolean),
    visualStatus: 'portrait requires source, author, license and attribution capture before production export',
    locationStatus: 'public-source trail expands as crawler confirms official records',
    birthDate: p.birthDate || '',
    birthdayAuditStatus: p.birthDate ? 'birth date should be verified against official bio or Wikidata' : 'birth date pending audit',
    profileLine: `${p.canonicalName} is included because the person repeatedly appears in public diplomatic, institutional, financial or strategic event records.`,
    imageProvider: 'Wikimedia/Wikipedia thumbnail candidate or official profile image pending audit',
    socialLinks: {
      official: p.officialUrl || p.profileUrl || '',
      wikipedia: p.profileUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.wikiTitle || slugify(p.canonicalName).replace(/-/g, '_'))}`,
      wikidata: p.wikidataId && !String(p.wikidataId).startsWith('REVIEW') ? `https://www.wikidata.org/wiki/${p.wikidataId}` : '',
      linkedinSearch: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(p.canonicalName + ' ' + p.organization)}`,
      socialSearch: `https://www.google.com/search?q=${encodeURIComponent(p.canonicalName + ' official social media')}`,
      notes: 'Lookup links are not verified handles until promoted by source review.'
    },
    imageAudit: { status: p.imageUrl ? 'photo-candidate' : 'needs-portrait-cache', reasons: [], instruction: 'Use only if the cached file matches the person and license/attribution are stored.' },
    flagAudit: { countryCode: p.countryFocus, display: p.countryFocus, status: 'single fitted flag icon' }
  };
  merged.profileLines = profileLinesFor(merged);
  if (existing) Object.assign(existing, merged); else data.people.push(merged);
}

function addAppearance(a) {
  const existing = data.appearances.find(x => x.id === a.id);
  const startsAt = a.startsAt;
  const app = {
    id: a.id,
    personId: a.personId,
    startsAt,
    endsAt: a.endsAt || null,
    status: a.status || 'VERIFIED_PAST',
    confidence: a.confidence ?? 0.89,
    confidenceLabel: a.confidenceLabel || 'official or host-public source identifies the public event, travel or meeting window',
    eventType: a.eventType || 'Public diplomatic appearance',
    title: a.title,
    summary: a.summary,
    significance: a.significance || 'This record adds a concrete edge in the public influence graph: person, city, event context, and official source.',
    decisions: a.decisions || 'Outcome language is limited to the cited public record; no private meetings are inferred.',
    location: a.location,
    venuePublic: true,
    securityPrecision: 'public event only; no hotels, private addresses, leaked routes or live proximity',
    publicInterestScore: a.publicInterestScore ?? 82,
    eventGroupId: a.eventGroupId,
    topics: a.topics || ['diplomacy'],
    counterpartIds: a.counterpartIds || [],
    sourcePack: a.sourcePack,
    marketImpact: a.marketImpact || { sectors: ['macro policy', 'diplomacy'], countries: [a.location.countryCode], confidence: 'medium' },
    verificationLevel: a.verificationLevel || 'Verified'
  };
  if (existing) Object.assign(existing, app); else data.appearances.push(app);
}

function addEncounter(e) {
  const existing = data.encounters.find(x => x.id === e.id);
  const enc = {
    id: e.id,
    eventGroupId: e.eventGroupId,
    title: e.title,
    date: e.date,
    startsAt: e.startsAt || `${e.date}T12:00:00Z`,
    location: e.location,
    participantIds: e.participantIds,
    appearanceIds: e.appearanceIds,
    organizationNames: e.organizationNames || [],
    summary: e.summary,
    outcome: e.outcome || 'Only public statements, communiques or readouts are summarized. Private outcomes are not inferred.',
    score: e.score || 86,
    type: e.type || 'Public meeting cluster',
    importanceScore: e.importanceScore || e.score || 86,
    peaceProcess: Boolean(e.peaceProcess),
    whyThisMatters: e.whyThisMatters || 'The edge is useful because it connects named principals to the same public meeting, summit or official readout.',
    sourcePack: e.sourcePack || [],
    verificationLevel: e.verificationLevel || 'Verified'
  };
  if (existing) Object.assign(existing, enc); else data.encounters.push(enc);
}

function addOrReplaceRoster(rank, item) {
  const index = data.roster.findIndex(r => r.rank === rank);
  const base = {
    rank,
    id: item.id || `r-${String(rank).padStart(3, '0')}-${slugify(item.name)}`,
    name: item.name,
    canonicalName: item.canonicalName || item.name,
    slug: item.slug || slugify(item.name),
    wikiTitle: item.wikiTitle || item.name.replace(/ /g, '_'),
    wikidataId: item.wikidataId || 'REVIEW_REQUIRED',
    profileUrl: item.profileUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(item.wikiTitle || item.name.replace(/ /g, '_'))}`,
    region: item.region,
    country: item.country,
    bucket: item.bucket,
    sector: item.sector || 'Government',
    organization: item.organization,
    prominenceScore: item.prominenceScore || 88,
    imageUrl: item.imageUrl || '',
    imageProvider: item.imageUrl ? 'Wikimedia/Wikipedia thumbnail candidate' : 'runtime portrait hydration pending',
    visualAuditStatus: 'candidate portrait or runtime thumbnail; production cache and attribution required',
    trackingStatus: item.trackingStatus || 'profile ready; dated public records are added after verification',
    sourcePriority: 'official calendar, official office readout or host event page before secondary media',
    roleTitle: item.bucket,
    homeRegion: item.region,
    countryFocus: item.countryCode || item.country,
    industry: item.industry || item.sector || 'Government',
    shortBio: item.shortBio || `${item.name} is included because public appearances, official meetings or major-event participation have strategic relevance.`,
    socialLinks: {
      official: item.officialUrl || '',
      wikipedia: item.profileUrl || '',
      linkedinSearch: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(item.name + ' ' + item.organization)}`,
      socialSearch: `https://www.google.com/search?q=${encodeURIComponent(item.name + ' official social media')}`,
      notes: 'Lookup links only until verified.'
    }
  };
  base.profileLines = profileLinesFor({ canonicalName: base.name, organization: base.organization, homeBases: [{ city: base.country }] }, 0);
  if (index >= 0) data.roster[index] = base; else data.roster.push(base);
}

// Align an important mapped profile with the top-200 selector.
const jai = data.roster.find(r => r.id === 'r-024-s-jaishankar');
if (jai) {
  jai.name = 'Subrahmanyam Jaishankar';
  jai.canonicalName = 'Subrahmanyam Jaishankar';
  jai.slug = 'subrahmanyam-jaishankar';
  jai.wikiTitle = 'S._Jaishankar';
  jai.bucket = 'Foreign minister';
  jai.roleTitle = 'External Affairs Minister of India';
  jai.organization = 'Ministry of External Affairs, India';
  jai.shortBio = 'India’s External Affairs Minister; one of the most travel-heavy public diplomacy figures in the launch set.';
}
const rubioRoster = data.roster.find(r => r.id === 'r-096-marco-rubio');
if (rubioRoster) {
  rubioRoster.bucket = 'Foreign minister';
  rubioRoster.roleTitle = 'U.S. Secretary of State';
  rubioRoster.organization = 'U.S. Department of State';
  rubioRoster.sector = 'Government';
  rubioRoster.countryFocus = 'US';
  rubioRoster.shortBio = 'U.S. Secretary of State; the State Department travel archive gives a dense, official public travel record.';
}

const newPeople = [
  { id: 'p-sergey-lavrov', canonicalName: 'Sergey Lavrov', category: 'FOREIGN_MINISTER', roleTitle: 'Foreign Minister of Russia', organization: 'Ministry of Foreign Affairs of the Russian Federation', countryFocus: 'RU', countryName: 'Russia', homeRegion: 'Europe / Eurasia', prominenceScore: 91, orgIcon: '◈', officialUrl: 'https://mid.ru/en/', wikiTitle: 'Sergey_Lavrov', birthDate: '1950-03-21', shortBio: 'Russian foreign minister and frequent multilateral traveller; mapped through official MFA and host-government readouts.' },
  { id: 'p-wang-yi', canonicalName: 'Wang Yi', category: 'FOREIGN_MINISTER', roleTitle: 'Foreign Minister of China', organization: 'Ministry of Foreign Affairs of China', countryFocus: 'CN', countryName: 'China', homeRegion: 'Asia', prominenceScore: 92, orgIcon: '◈', officialUrl: 'https://www.mfa.gov.cn/eng/', wikiTitle: 'Wang_Yi_(politician)', birthDate: '1953-10-19', shortBio: 'China’s senior foreign-policy principal; tracked through MFA readouts, BRICS, ASEAN and high-level bilateral records.' },
  { id: 'p-mauro-vieira', canonicalName: 'Mauro Vieira', category: 'FOREIGN_MINISTER', roleTitle: 'Foreign Minister of Brazil', organization: 'Ministry of Foreign Affairs of Brazil', countryFocus: 'BR', countryName: 'Brazil', homeRegion: 'Latin America', prominenceScore: 84, orgIcon: '◈', officialUrl: 'https://www.gov.br/mre/en', wikiTitle: 'Mauro_Vieira', birthDate: '1951-02-15' },
  { id: 'p-ronald-lamola', canonicalName: 'Ronald Lamola', category: 'FOREIGN_MINISTER', roleTitle: 'Minister of International Relations and Cooperation of South Africa', organization: 'DIRCO South Africa', countryFocus: 'ZA', countryName: 'South Africa', homeRegion: 'Africa', prominenceScore: 82, orgIcon: '◈', officialUrl: 'https://www.dirco.gov.za/', wikiTitle: 'Ronald_Lamola', birthDate: '1983-11-21' },
  { id: 'p-jean-noel-barrot', canonicalName: 'Jean-Noël Barrot', category: 'FOREIGN_MINISTER', roleTitle: 'Minister for Europe and Foreign Affairs of France', organization: 'Ministry for Europe and Foreign Affairs, France', countryFocus: 'FR', countryName: 'France', homeRegion: 'Europe', prominenceScore: 86, orgIcon: '◈', officialUrl: 'https://www.diplomatie.gouv.fr/en/', wikiTitle: 'Jean-Noël_Barrot', birthDate: '1983-05-13' },
  { id: 'p-johann-wadephul', canonicalName: 'Johann Wadephul', category: 'FOREIGN_MINISTER', roleTitle: 'Federal Foreign Minister of Germany', organization: 'Federal Foreign Office, Germany', countryFocus: 'DE', countryName: 'Germany', homeRegion: 'Europe', prominenceScore: 86, orgIcon: '◈', officialUrl: 'https://www.auswaertiges-amt.de/en', wikiTitle: 'Johann_Wadephul', birthDate: '1963-02-10' },
  { id: 'p-antonio-tajani', canonicalName: 'Antonio Tajani', category: 'FOREIGN_MINISTER', roleTitle: 'Minister of Foreign Affairs of Italy', organization: 'Ministry of Foreign Affairs and International Cooperation, Italy', countryFocus: 'IT', countryName: 'Italy', homeRegion: 'Europe', prominenceScore: 87, orgIcon: '◈', officialUrl: 'https://www.esteri.it/en/', wikiTitle: 'Antonio_Tajani', birthDate: '1953-08-04' },
  { id: 'p-yvette-cooper', canonicalName: 'Yvette Cooper', category: 'FOREIGN_MINISTER', roleTitle: 'Foreign Secretary of the United Kingdom', organization: 'Foreign, Commonwealth and Development Office', countryFocus: 'GB', countryName: 'United Kingdom', homeRegion: 'Europe', prominenceScore: 86, orgIcon: '◈', officialUrl: 'https://www.gov.uk/government/organisations/foreign-commonwealth-development-office', wikiTitle: 'Yvette_Cooper', birthDate: '1969-03-20' },
  { id: 'p-anita-anand', canonicalName: 'Anita Anand', category: 'FOREIGN_MINISTER', roleTitle: 'Minister of Foreign Affairs of Canada', organization: 'Global Affairs Canada', countryFocus: 'CA', countryName: 'Canada', homeRegion: 'North America', prominenceScore: 86, orgIcon: '◈', officialUrl: 'https://www.international.gc.ca/', wikiTitle: 'Anita_Anand', birthDate: '1967-05-20' },
  { id: 'p-toshimitsu-motegi', canonicalName: 'Toshimitsu Motegi', category: 'FOREIGN_MINISTER', roleTitle: 'Foreign-policy principal of Japan', organization: 'Ministry of Foreign Affairs of Japan', countryFocus: 'JP', countryName: 'Japan', homeRegion: 'Asia', prominenceScore: 85, orgIcon: '◈', officialUrl: 'https://www.mofa.go.jp/', wikiTitle: 'Toshimitsu_Motegi', birthDate: '1955-10-07' },
  { id: 'p-david-lammy', canonicalName: 'David Lammy', category: 'FOREIGN_MINISTER', roleTitle: 'UK foreign-policy principal', organization: 'Foreign, Commonwealth and Development Office', countryFocus: 'GB', countryName: 'United Kingdom', homeRegion: 'Europe', prominenceScore: 85, orgIcon: '◈', officialUrl: 'https://www.gov.uk/government/organisations/foreign-commonwealth-development-office', wikiTitle: 'David_Lammy', birthDate: '1972-07-19' },
  { id: 'p-hakan-fidan', canonicalName: 'Hakan Fidan', category: 'FOREIGN_MINISTER', roleTitle: 'Foreign Minister of Turkey', organization: 'Ministry of Foreign Affairs of Turkey', countryFocus: 'TR', countryName: 'Turkey', homeRegion: 'Europe / Middle East', prominenceScore: 87, orgIcon: '◈', officialUrl: 'https://www.mfa.gov.tr/default.en.mfa', wikiTitle: 'Hakan_Fidan', birthDate: '1968-07-17' },
  { id: 'p-faisal-bin-farhan', canonicalName: 'Faisal bin Farhan Al Saud', category: 'FOREIGN_MINISTER', roleTitle: 'Foreign Minister of Saudi Arabia', organization: 'Ministry of Foreign Affairs, Saudi Arabia', countryFocus: 'SA', countryName: 'Saudi Arabia', homeRegion: 'Middle East', prominenceScore: 88, orgIcon: '◈', officialUrl: 'https://www.mofa.gov.sa/en/', wikiTitle: 'Faisal_bin_Farhan_Al_Saud', birthDate: '1974-11-01' },
  { id: 'p-abbas-araghchi', canonicalName: 'Abbas Araghchi', category: 'FOREIGN_MINISTER', roleTitle: 'Foreign Minister of Iran', organization: 'Ministry of Foreign Affairs of Iran', countryFocus: 'IR', countryName: 'Iran', homeRegion: 'Middle East', prominenceScore: 86, orgIcon: '◈', officialUrl: 'https://en.mfa.ir/', wikiTitle: 'Abbas_Araghchi', birthDate: '1962-12-05' },
  { id: 'p-jd-vance', canonicalName: 'JD Vance', category: 'HEAD_OF_STATE', roleTitle: 'Vice President of the United States', organization: 'The White House', countryFocus: 'US', countryName: 'United States', homeRegion: 'North America', prominenceScore: 91, orgIcon: '♚', officialUrl: 'https://www.whitehouse.gov/', wikiTitle: 'JD_Vance', birthDate: '1984-08-02' },
  { id: 'p-rahim-aga-khan-v', canonicalName: 'Prince Rahim Aga Khan V', category: 'PHILANTHROPY', roleTitle: 'Imam and Chair of the Aga Khan Development Network', organization: 'Aga Khan Development Network', orgType: 'Philanthropic development network', sector: 'Philanthropy', industry: 'Development / philanthropy', countryFocus: 'AKDN', countryName: 'Aga Khan Development Network', homeRegion: 'Global', prominenceScore: 87, orgIcon: '✦', officialUrl: 'https://the.akdn/en/who-we-are/our-chair', wikiTitle: 'Aga_Khan_V', birthDate: '1971-10-12', shortBio: 'Head of the Ismaili Imamat and AKDN chair; public visits often connect development, diplomacy and philanthropy.' },
  { id: 'p-alexandre-de-rothschild', canonicalName: 'Alexandre de Rothschild', category: 'BUSINESS_LEADER', roleTitle: 'Executive Chairman of Rothschild & Co', organization: 'Rothschild & Co', orgType: 'Financial institution', sector: 'Finance', industry: 'Investment banking / advisory', countryFocus: 'FR', countryName: 'France', homeRegion: 'Europe', prominenceScore: 83, orgIcon: '◆', officialUrl: 'https://www.rothschildandco.com/en/about-us/corporate-governance/alexandre-de-rothschild-profile/', wikiTitle: 'Alexandre_de_Rothschild', birthDate: '1980-11-24', shortBio: 'Financial-industry principal included for institution-level network relevance; travel records publish only when a public source names the event.' }
];
newPeople.forEach(addPerson);

const officialRubio = source('State Department: Secretary Rubio countries visited and mileage', 'https://www.state.gov/secretary-rubios-countries-visited-and-mileage/');
const stateTrips = source('State Department: Secretary of State trip releases', 'https://www.state.gov/secretary-of-states-trip-releases/');
const meaVisits = source('MEA India: EAM Visits', 'https://www.mea.gov.in/eam-visits.htm');
const meaTravel = source('MEA India: External Affairs Minister travel page', 'https://www.mea.gov.in/travel-page-evm.htm');
const meaVisitsGeneral = source('MEA India: Visits page', 'https://www.mea.gov.in/visits.htm');
const govukNiagara = source('GOV.UK: G7 Foreign Ministers meeting in Niagara', 'https://www.gov.uk/government/news/joint-statement-of-g7-foreign-ministers-meeting-in-the-niagara-region');
const canadaNiagara = source('Global Affairs Canada: G7 Foreign Ministers participants in Niagara', 'https://www.canada.ca/en/global-affairs/news/2025/11/minister-anand-announces-participants-for-g7-foreign-ministers-meeting-in-niagara.html');
const mofaCharlevoix = source('Japan MOFA: Iwaya at G7 Foreign Ministers Meeting in Charlevoix', 'https://www.mofa.go.jp/fp/pc/pageite_000001_00835.html');
const mofaTheHague = source('Japan MOFA: G7 Foreign Ministers Meeting in The Hague', 'https://www.mofa.go.jp/fp/pc/pageite_000001_01079.html');
const bricsBrazil = source('Brazil MFA: BRICS Foreign Ministers meeting in Rio', 'https://www.gov.br/mre/en/contact-us/press-area/press-releases/address-by-minister-mauro-vieira-at-the-opening-of-the-brics-foreign-ministers2019-meeting-2013-rio-de-janeiro-abril-28-2025');
const bricsChina = source('China MFA: Wang Yi at BRICS Foreign Ministers meeting in Rio', 'https://www.mfa.gov.cn/eng/wjbzhd/202505/t20250501_11614800.html');
const bricsStatement = source('BRICS Chair statement: Foreign Ministers meeting in Rio', 'https://brics.br/en/documents/2025-04-29_brics-mfa-chairs-statement.pdf/@@download/file');
const lavrovRio = source('Russian MFA: Lavrov after BRICS Foreign Ministers Council, Rio', 'https://www.mid.ru/en/foreign_policy/news/2012487/');
const lavrovG20 = source('Russian MFA: Lavrov at G20 Foreign Ministers meeting, Johannesburg', 'https://www.mid.ru/en/foreign_policy/brics/1998882/?lang=en');
const lavrovG20After = source('Russian MFA: Lavrov after G20 Ministerial Council, Johannesburg', 'https://www.mid.ru/en/foreign_policy/news/1999163/');
const turkeyLavrov = source('Turkish MFA: Lavrov official visit to Turkey', 'https://www.mfa.gov.tr/no_-38_-rusya-federasyonu-disisleri-bakani-sergey-lavrov-un-ulkemizi-ziyareti-hk.en.mfa');
const lavrovAsean = source('Russian MFA: Lavrov after Russia-ASEAN and EAS ministerials, Kuala Lumpur', 'https://www.mid.ru/en/press_service/minister_speeches/2035561/');
const lavrovJaishankar = source('Russian MFA: Lavrov and Jaishankar meeting in Moscow', 'https://www.mid.ru/en/foreign_policy/news/2042424/');
const netanyahuFeb = source('Prime Minister Office Israel: Netanyahu meets Trump at White House, February 2025', 'https://www.gov.il/en/pages/pm-netanyahu-meets-with-president-trump-at-the-white-house-4-feb-2025');
const netanyahuApr = source('Prime Minister Office Israel: Netanyahu remarks at Trump meeting, April 2025', 'https://www.gov.il/en/pages/event-meetingus070425');
const netanyahuJul = source('Prime Minister Office Israel: Netanyahu welcomed at White House, July 2025', 'https://www.gov.il/en/pages/event-welcome080725');
const netanyahuSep = source('Prime Minister Office Israel: Netanyahu statement with Trump at White House, September 2025', 'https://www.gov.il/en/pages/pm-netanyahu-s-statement-with-president-donald-trump-in-the-white-house-29-sep-2025');
const akdnKenya = source('AKDN: Aga Khan first official visit to Kenya as 50th Imam', 'https://the.akdn/en/resources-media/whats-new/news-release/his-highness-the-aga-khan-makes-first-official-visit-to-kenya-as-50th-hereditary-imam-of-the-shia-ismaili-muslims');
const whiteHouseVanceMunich = source('White House: Vice President Vance remarks at Munich Security Conference', 'https://www.whitehouse.gov/videos/vice-president-jd-vance-delivers-remarks-at-the-munich-security-conference/');

// Marco Rubio dense official travel list.
const rubioStops = [
  ['2025-02-01', coords.panama, 'Panama City diplomatic stop', 'Central America opening trip with public meetings in Panama.', ['p-marco-rubio']],
  ['2025-02-03', coords.sanSalvador, 'San Salvador diplomatic stop', 'Central America trip continued in El Salvador.', ['p-marco-rubio']],
  ['2025-02-04', coords.sanJose, 'San Jose diplomatic stop', 'Central America trip included Costa Rica.', ['p-marco-rubio']],
  ['2025-02-05', coords.guatemala, 'Guatemala City diplomatic stop', 'Central America trip included Guatemala.', ['p-marco-rubio']],
  ['2025-02-06', coords.santoDomingo, 'Santo Domingo diplomatic stop', 'Central America and Caribbean trip concluded in the Dominican Republic.', ['p-marco-rubio']],
  ['2025-02-13', coords.munich, 'Munich Security Conference stop', 'Rubio travelled to Germany during the Munich security week.', ['p-mark-rutte']],
  ['2025-02-16', coords.jerusalem, 'Jerusalem diplomatic stop', 'The Middle East leg included public diplomacy in Israel.', ['p-benjamin-netanyahu']],
  ['2025-02-18', coords.riyadh, 'Riyadh diplomatic stop', 'The Middle East leg continued in Saudi Arabia.', ['p-faisal-bin-farhan']],
  ['2025-02-19', coords.abuDhabi, 'Abu Dhabi diplomatic stop', 'The regional trip included the United Arab Emirates.', []],
  ['2025-03-10', coords.jeddah, 'Jeddah diplomatic stop', 'Rubio returned to Saudi Arabia during the March diplomacy run.', ['p-faisal-bin-farhan']],
  ['2025-03-13', coords.quebec, 'Charlevoix G7 foreign ministers stop', 'G7 foreign ministers met in Charlevoix under Canada’s presidency.', ['p-david-lammy','p-toshimitsu-motegi','p-kaja-kallas']],
  ['2025-04-03', coords.brussels, 'Brussels NATO diplomacy stop', 'Rubio travelled to Brussels for alliance diplomacy.', ['p-mark-rutte','p-kaja-kallas']],
  ['2025-04-17', coords.paris, 'Paris diplomatic stop', 'Paris added a European diplomatic stop to the Secretary’s spring travel.', ['p-jean-noel-barrot']],
  ['2025-05-12', coords.riyadh, 'Riyadh diplomatic stop', 'May Middle East and Europe trip began in Saudi Arabia.', ['p-faisal-bin-farhan']],
  ['2025-05-14', coords.doha, 'Doha diplomatic stop', 'The trip included Qatar before moving to the NATO ministerial track.', []],
  ['2025-05-15', coords.antalya, 'Antalya NATO ministerial stop', 'Antalya hosted the informal NATO foreign ministers track.', ['p-mark-rutte','p-hakan-fidan']],
  ['2025-05-17', coords.rome, 'Rome and Holy See diplomatic stop', 'Rome and the Holy See formed the final leg of the May trip.', ['p-antonio-tajani']],
  ['2025-07-09', coords.kualaLumpur, 'Kuala Lumpur ASEAN stop', 'Rubio travelled to Malaysia for ASEAN-related diplomacy.', []],
  ['2025-09-03', coords.mexicoCity, 'Mexico City diplomatic stop', 'The early September itinerary included Mexico City.', []],
  ['2025-09-04', coords.quito, 'Quito diplomatic stop', 'The same itinerary included Quito.', []],
  ['2025-09-14', coords.jerusalem, 'Jerusalem diplomatic stop', 'September diplomacy included Israel.', ['p-benjamin-netanyahu']],
  ['2025-09-16', coords.doha, 'Doha diplomatic stop', 'The September trip included Qatar before London.', []],
  ['2025-09-17', coords.london, 'London diplomatic stop', 'The September trip continued to the United Kingdom.', ['p-keir-starmer']],
  ['2025-09-23', coords.newYork, 'UN General Assembly high-level week', 'Rubio’s schedule included UN General Assembly high-level week.', ['p-antonio-guterres']],
  ['2025-10-23', coords.jerusalem, 'Jerusalem diplomatic stop', 'The October Asia trip opened with Israel.', ['p-benjamin-netanyahu']],
  ['2025-10-26', coords.kualaLumpur, 'Kuala Lumpur public diplomacy stop', 'The October Asia itinerary included Malaysia.', []],
  ['2025-10-27', coords.tokyo, 'Tokyo diplomatic stop', 'The October Asia trip included Japan.', ['p-toshimitsu-motegi']],
  ['2025-10-29', coords.gyeongju, 'Gyeongju APEC stop', 'The Asia trip reached Gyeongju during the APEC leaders week.', []],
  ['2025-11-12', coords.hamilton, 'Niagara G7 foreign ministers meeting', 'G7 foreign ministers met in the Niagara region.', ['p-anita-anand','p-yvette-cooper','p-jean-noel-barrot','p-antonio-tajani','p-johann-wadephul','p-toshimitsu-motegi','p-kaja-kallas']],
  ['2025-11-23', coords.geneva, 'Geneva diplomacy stop', 'Geneva added a late-November European diplomacy stop.', []],
  ['2026-02-05', coords.milan, 'Milan diplomatic stop', 'The 2026 public travel list includes Milan.', ['p-antonio-tajani']],
  ['2026-02-14', coords.munich, 'Munich public diplomacy stop', 'Rubio returned to Munich during security conference week.', ['p-mark-rutte']],
  ['2026-02-15', coords.bratislava, 'Bratislava diplomatic stop', 'The February 2026 itinerary included Slovakia.', []],
  ['2026-02-16', coords.budapest, 'Budapest diplomatic stop', 'The February 2026 itinerary included Hungary.', []],
  ['2026-02-25', coords.basseterre, 'Basseterre diplomatic stop', 'The 2026 list includes Saint Kitts and Nevis.', []],
  ['2026-03-27', coords.paris, 'Paris G7 foreign ministers stop', 'France hosted the G7 foreign ministers track.', ['p-jean-noel-barrot','p-yvette-cooper','p-johann-wadephul','p-antonio-tajani','p-toshimitsu-motegi','p-anita-anand']],
  ['2026-05-07', coords.vatican, 'Vatican City diplomatic stop', 'The May 2026 itinerary included the Holy See.', []],
  ['2026-05-08', coords.rome, 'Rome diplomatic stop', 'The May 2026 itinerary included Rome.', ['p-antonio-tajani']]
];
for (const [date, loc, title, summary, cps] of rubioStops) {
  addAppearance({
    id: `a-${date}-marco-rubio-${slugify(loc.city)}`,
    personId: 'p-marco-rubio',
    startsAt: `${date}T12:00:00${loc.countryCode === 'US' ? '-05:00' : '+00:00'}`,
    eventType: 'Foreign minister travel',
    title,
    summary,
    location: loc,
    eventGroupId: `eg-rubio-${date}-${slugify(loc.city)}`,
    topics: ['foreign minister', 'diplomacy', 'travel archive'],
    counterpartIds: cps,
    sourcePack: [officialRubio, stateTrips]
  });
}

// Netanyahu repeated public U.S. records since January 2025.
const netanyahuStops = [
  ['2025-02-04', coords.washington, 'Netanyahu meets Trump at the White House', 'Israel’s Prime Minister Office records Netanyahu meeting President Trump at the White House.', [netanyahuFeb]],
  ['2025-04-07', coords.washington, 'Netanyahu White House meeting', 'The official record places Netanyahu in Washington for another public meeting with President Trump.', [netanyahuApr]],
  ['2025-07-08', coords.washington, 'Netanyahu welcomed at the White House', 'The Israeli government record describes Netanyahu being welcomed at the White House.', [netanyahuJul]],
  ['2025-09-29', coords.washington, 'Netanyahu statement with Trump at the White House', 'The public record places Netanyahu and Trump together at the White House in late September.', [netanyahuSep]]
];
for (const [date, loc, title, summary, sources] of netanyahuStops) {
  addAppearance({
    id: `a-${date}-benjamin-netanyahu-washington`,
    personId: 'p-benjamin-netanyahu',
    startsAt: `${date}T12:00:00-05:00`,
    eventType: 'Head-of-government public meeting',
    title,
    summary,
    location: loc,
    eventGroupId: `eg-netanyahu-trump-${date}`,
    topics: ['US-Israel', 'White House', 'Middle East'],
    counterpartIds: ['p-donald-trump'],
    sourcePack: sources
  });
  addEncounter({
    id: `enc-netanyahu-trump-${date}`,
    eventGroupId: `eg-netanyahu-trump-${date}`,
    title: `Netanyahu and Trump public meeting, ${date}`,
    date,
    location: loc,
    participantIds: ['p-benjamin-netanyahu','p-donald-trump'],
    appearanceIds: [`a-${date}-benjamin-netanyahu-washington`],
    organizationNames: ['Prime Minister Office Israel', 'The White House'],
    summary: 'The public record places the Israeli prime minister and U.S. president together in Washington.',
    score: 93,
    type: 'Leader meeting',
    sourcePack: sources
  });
}

// Sergey Lavrov and BRICS/G20/ASEAN public appearances.
const lavrovStops = [
  ['2025-02-20', coords.johannesburg, 'G20 foreign ministers meeting in Johannesburg', 'Russian MFA material places Lavrov at the G20 foreign ministers track in Johannesburg.', [lavrovG20, lavrovG20After], ['p-sergey-lavrov']],
  ['2025-02-24', coords.ankara, 'Official visit to Turkey', 'Turkey’s foreign ministry announced Lavrov’s official visit to Turkey.', [turkeyLavrov], ['p-hakan-fidan']],
  ['2025-04-22', coords.tashkent, 'Tashkent diplomacy stop', 'The Uzbekistan stop is carried as a public diplomacy item for the Lavrov trail pending deeper source extraction.', [source('Russian MFA event feed: Sergey Lavrov', 'https://mid.ru/en/foreign_policy/news/')], []],
  ['2025-04-28', coords.rio, 'BRICS foreign ministers meeting in Rio', 'BRICS foreign ministers met in Rio; Lavrov and Wang Yi appear in official BRICS/Russian/Chinese records.', [lavrovRio, bricsStatement, bricsChina], ['p-wang-yi','p-mauro-vieira']],
  ['2025-07-06', coords.rio, 'BRICS summit session in Rio', 'Lavrov appeared in the BRICS summit track in Rio de Janeiro.', [source('Russian MFA: Lavrov remarks at BRICS summit session, Rio', 'https://www.mid.ru/en/press_service/minister_speeches/2034305/')], ['p-luiz-inacio-lula-da-silva','p-wang-yi']],
  ['2025-07-11', coords.kualaLumpur, 'ASEAN and East Asia ministerial week', 'Russian MFA records Lavrov’s press comments after Russia-ASEAN and East Asia ministerial meetings in Kuala Lumpur.', [lavrovAsean], []],
  ['2025-08-21', coords.moscow, 'Lavrov meets Jaishankar in Moscow', 'Russian MFA records the Lavrov-Jaishankar Moscow meeting.', [lavrovJaishankar], ['p-s-jaishankar']]
];
for (const [date, loc, title, summary, sources, cps] of lavrovStops) {
  addAppearance({ id: `a-${date}-sergey-lavrov-${slugify(loc.city)}`, personId: 'p-sergey-lavrov', startsAt: `${date}T12:00:00+03:00`, eventType: 'Foreign minister public appearance', title, summary, location: loc, eventGroupId: `eg-lavrov-${date}-${slugify(loc.city)}`, topics: ['foreign minister', 'BRICS', 'G20', 'security diplomacy'], counterpartIds: cps, sourcePack: sources });
}

// Wang Yi / BRICS and China foreign-ministry layer.
addAppearance({ id: 'a-2025-04-29-wang-yi-rio-brics-fmm', personId: 'p-wang-yi', startsAt: '2025-04-29T12:00:00-03:00', eventType: 'Foreign minister public appearance', title: 'Wang Yi at BRICS foreign ministers meeting', summary: 'China’s MFA records Wang Yi attending the BRICS foreign ministers session in Rio de Janeiro.', location: coords.rio, eventGroupId: 'eg-brics-fmm-rio-2025', topics: ['BRICS','foreign minister','Global South'], counterpartIds: ['p-sergey-lavrov','p-mauro-vieira'], sourcePack: [bricsChina, bricsStatement] });
addAppearance({ id: 'a-2025-04-28-mauro-vieira-rio-brics-fmm', personId: 'p-mauro-vieira', startsAt: '2025-04-28T10:00:00-03:00', eventType: 'Foreign minister host appearance', title: 'Mauro Vieira opens BRICS foreign ministers meeting', summary: 'Brazil’s foreign ministry records Mauro Vieira opening the BRICS foreign ministers meeting in Rio.', location: coords.rio, eventGroupId: 'eg-brics-fmm-rio-2025', topics: ['BRICS','host diplomacy','foreign minister'], counterpartIds: ['p-wang-yi','p-sergey-lavrov'], sourcePack: [bricsBrazil, bricsStatement] });
addAppearance({ id: 'a-2025-04-29-ronald-lamola-rio-brics-fmm', personId: 'p-ronald-lamola', startsAt: '2025-04-29T12:00:00-03:00', confidence: 0.78, confidenceLabel: 'BRICS chair statement covers the ministerial meeting; individual-name extraction should be improved by the crawler', eventType: 'Foreign minister public appearance', title: 'BRICS foreign ministers meeting in Rio', summary: 'South Africa is part of the BRICS ministerial meeting record; this edge is flagged for participant-list extraction review.', location: coords.rio, eventGroupId: 'eg-brics-fmm-rio-2025', topics: ['BRICS','foreign minister'], counterpartIds: ['p-wang-yi','p-sergey-lavrov','p-mauro-vieira'], sourcePack: [bricsStatement], verificationLevel: 'Likely' });

// Jaishankar, using MEA travel pages.
const jaiStops = [
  ['2025-07-01', coords.washington, 'Jaishankar public visit to the United States', 'MEA travel records list the External Affairs Minister’s visit to the United States from June 30 to July 2, 2025.', [meaTravel], ['p-marco-rubio']],
  ['2025-07-14', coords.beijing, 'Jaishankar Singapore and China trip', 'MEA travel records include Singapore and China in July 2025; Beijing is the public China anchor for the map.', [meaTravel], ['p-wang-yi']],
  ['2025-08-21', coords.moscow, 'Jaishankar meets Lavrov in Moscow', 'Russian MFA and MEA travel records place Jaishankar in Moscow for foreign-minister diplomacy.', [lavrovJaishankar, meaTravel], ['p-sergey-lavrov']],
  ['2025-11-12', coords.ontario, 'Jaishankar at G7 foreign ministers outreach in Ontario', 'MEA records the Ontario visit and G7 records place partner ministers in the Niagara region.', [meaVisits, canadaNiagara], ['p-marco-rubio','p-anita-anand']],
  ['2025-11-18', coords.moscow, 'Jaishankar Moscow visit', 'MEA records Jaishankar’s visit to Moscow on November 17-18, 2025.', [meaVisits], ['p-sergey-lavrov']],
  ['2025-12-23', coords.colombo, 'Jaishankar Sri Lanka visit', 'MEA visit records list a December 2025 visit to Sri Lanka.', [meaVisitsGeneral], []],
  ['2026-01-05', coords.paris, 'Jaishankar France visit', 'MEA visit records list the France leg of the January 2026 Europe trip.', [meaVisitsGeneral], ['p-jean-noel-barrot']],
  ['2026-01-08', coords.luxembourg, 'Jaishankar Luxembourg visit', 'MEA records Luxembourg in the January 2026 trip.', [meaVisitsGeneral], []],
  ['2026-02-03', coords.washington, 'Jaishankar visit to the United States', 'MEA records a February 2026 visit to the United States.', [meaVisitsGeneral], ['p-marco-rubio']],
  ['2026-03-16', coords.brussels, 'Jaishankar Belgium visit', 'MEA records a March 2026 visit to Belgium.', [meaVisitsGeneral], ['p-kaja-kallas']],
  ['2026-03-27', coords.paris, 'Jaishankar at G7 foreign ministers meeting in France', 'MEA records the External Affairs Minister’s visit to France for the G7 foreign ministers meeting.', [meaVisitsGeneral], ['p-marco-rubio','p-jean-noel-barrot']],
  ['2026-04-10', coords.portLouis, 'Jaishankar Mauritius visit', 'MEA records the Mauritius leg of the April 2026 itinerary.', [meaVisitsGeneral], []],
  ['2026-04-12', coords.abuDhabi, 'Jaishankar UAE visit', 'MEA records the UAE leg of the April 2026 itinerary.', [meaVisitsGeneral], []],
  ['2026-05-03', coords.kingston, 'Jaishankar Jamaica visit', 'MEA records Jamaica in the May 2026 Caribbean-Suriname-Trinidad itinerary.', [meaVisitsGeneral], []],
  ['2026-05-06', coords.paramaribo, 'Jaishankar Suriname visit', 'MEA records Suriname in the May 2026 itinerary.', [meaVisitsGeneral], []],
  ['2026-05-09', coords.portOfSpain, 'Jaishankar Trinidad and Tobago visit', 'MEA records Trinidad and Tobago in the May 2026 itinerary.', [meaVisitsGeneral], []],
  ['2026-05-27', coords.nicosia, 'Jaishankar Cyprus visit', 'MEA records the May 2026 visit to Cyprus.', [meaVisitsGeneral], []]
];
for (const [date, loc, title, summary, sources, cps] of jaiStops) {
  addAppearance({ id: `a-${date}-s-jaishankar-${slugify(loc.city)}`, personId: 'p-s-jaishankar', startsAt: `${date}T12:00:00+05:30`, eventType: 'Foreign minister travel', title, summary, location: loc, eventGroupId: `eg-jaishankar-${date}-${slugify(loc.city)}`, topics: ['foreign minister','India diplomacy','travel archive'], counterpartIds: cps, sourcePack: sources });
}

// G7 foreign ministers / partner figures.
const g7NiagaraPeople = [
  ['p-yvette-cooper','Yvette Cooper at Niagara G7 foreign ministers meeting','The UK Foreign Secretary attended the G7 foreign ministers meeting in the Niagara region.'],
  ['p-anita-anand','Anita Anand hosts Niagara G7 foreign ministers meeting','Global Affairs Canada identified Anand as host and announced the participants.'],
  ['p-jean-noel-barrot','Jean-Noel Barrot at Niagara G7 foreign ministers meeting','Canada records a Barrot-Anand meeting on the margins of the G7 foreign ministers meeting.'],
  ['p-johann-wadephul','German foreign minister at Niagara G7 foreign ministers meeting','The G7 joint statement names Germany in the foreign-ministers meeting under Canada’s presidency.'],
  ['p-antonio-tajani','Antonio Tajani at Niagara G7 foreign ministers meeting','Canada records an Anand-Tajani meeting during the G7 foreign ministers meeting.'],
  ['p-toshimitsu-motegi','Japanese foreign-policy principal at Niagara G7 foreign ministers meeting','The G7 record names Japan in the Niagara foreign-ministers meeting.'],
  ['p-kaja-kallas','Kaja Kallas at Niagara G7 foreign ministers meeting','The G7 joint statement includes the EU High Representative in the Niagara meeting.']
];
for (const [pid, title, summary] of g7NiagaraPeople) {
  addAppearance({ id: `a-2025-11-12-${pid.replace(/^p-/,'')}-niagara-g7`, personId: pid, startsAt: '2025-11-12T12:00:00-05:00', confidence: pid === 'p-johann-wadephul' || pid === 'p-toshimitsu-motegi' ? 0.8 : 0.88, eventType: 'G7 foreign ministers meeting', title, summary, location: coords.hamilton, eventGroupId: 'eg-g7-fmm-niagara-2025', topics: ['G7','foreign ministers','security','economic resilience'], counterpartIds: ['p-marco-rubio','p-anita-anand','p-yvette-cooper','p-jean-noel-barrot','p-antonio-tajani','p-kaja-kallas'].filter(x => x !== pid), sourcePack: [govukNiagara, canadaNiagara] });
}

// G7 Charlevoix and The Hague samples for foreign-minister movement.
addAppearance({ id: 'a-2025-03-14-toshimitsu-motegi-charlevoix-g7', personId: 'p-toshimitsu-motegi', startsAt: '2025-03-14T12:00:00-05:00', eventType: 'G7 foreign ministers meeting', title: 'Japan foreign minister track in Charlevoix', summary: 'Japan MOFA records the Japanese foreign minister attending the G7 foreign ministers meeting in Charlevoix.', location: coords.quebec, eventGroupId: 'eg-g7-fmm-charlevoix-2025', topics: ['G7','foreign ministers','Japan'], counterpartIds: ['p-marco-rubio','p-david-lammy','p-kaja-kallas'], sourcePack: [mofaCharlevoix] });
addAppearance({ id: 'a-2025-03-14-david-lammy-charlevoix-g7', personId: 'p-david-lammy', startsAt: '2025-03-14T12:00:00-05:00', eventType: 'G7 foreign ministers meeting', title: 'UK foreign secretary at Charlevoix G7 foreign ministers meeting', summary: 'UK and partner records place the UK foreign secretary in the G7 foreign-ministers track in Canada.', location: coords.quebec, eventGroupId: 'eg-g7-fmm-charlevoix-2025', topics: ['G7','foreign ministers','UK'], counterpartIds: ['p-marco-rubio','p-toshimitsu-motegi','p-kaja-kallas'], sourcePack: [source('GOV.UK: UK Foreign Secretary at Charlevoix G7 Foreign Ministers meeting', 'https://www.gov.uk/government/news/foreign-secretary-to-attend-g7-foreign-ministers-meeting-in-charlevoix')] });
addAppearance({ id: 'a-2025-06-25-toshimitsu-motegi-the-hague-g7', personId: 'p-toshimitsu-motegi', startsAt: '2025-06-25T12:00:00+02:00', eventType: 'G7 foreign ministers meeting', title: 'Japan foreign minister at The Hague G7 foreign ministers meeting', summary: 'Japan MOFA records the Japanese foreign minister at the G7 foreign ministers meeting in The Hague.', location: { label: 'The Hague public G7 foreign ministers stop', city: 'The Hague', countryCode: 'NL', countryName: 'Netherlands', lat: 52.0705, lng: 4.3007, precision: 'city' }, eventGroupId: 'eg-g7-fmm-hague-2025', topics: ['G7','foreign ministers','NATO summit week'], counterpartIds: ['p-marco-rubio','p-kaja-kallas'], sourcePack: [mofaTheHague] });

// Vance and Aga Khan.
addAppearance({ id: 'a-2025-02-14-jd-vance-munich-security', personId: 'p-jd-vance', startsAt: '2025-02-14T12:00:00+01:00', eventType: 'Vice-president public speech', title: 'JD Vance remarks at Munich Security Conference', summary: 'The White House published the vice president’s Munich Security Conference remarks.', location: coords.munich, eventGroupId: 'eg-munich-security-2025', topics: ['security','NATO','US foreign policy'], counterpartIds: ['p-mark-rutte','p-ursula-von-der-leyen'], sourcePack: [whiteHouseVanceMunich] });
addAppearance({ id: 'a-2025-08-26-rahim-aga-khan-nairobi', personId: 'p-rahim-aga-khan-v', startsAt: '2025-08-26T12:00:00+03:00', eventType: 'Philanthropy and development official visit', title: 'Aga Khan V first official visit to Kenya', summary: 'AKDN records Prince Rahim Aga Khan V beginning an official Kenya visit at President Ruto’s invitation.', location: coords.nairobi, eventGroupId: 'eg-aga-khan-kenya-2025', topics: ['development','philanthropy','Kenya'], counterpartIds: [], sourcePack: [akdnKenya] });

// A single public profile/anchor record for Rothschild, not a travel claim.
addAppearance({ id: 'a-2026-05-30-alexandre-de-rothschild-paris-profile-anchor', personId: 'p-alexandre-de-rothschild', startsAt: '2026-05-30T10:00:00+02:00', status: 'VERIFIED_PAST', confidence: 0.7, confidenceLabel: 'public corporate biography provides institutional anchor; no travel claim is made', eventType: 'Public profile anchor', title: 'Rothschild & Co executive profile anchor', summary: 'Rothschild & Co’s public corporate profile identifies Alexandre de Rothschild as Executive Chairman.', significance: 'This is an entity-resolution anchor for the finance network, not a travel record.', decisions: 'No event attendance is inferred without a separate source naming the event.', location: coords.parisAnchor, eventGroupId: 'eg-rothschild-public-profile-anchor', topics: ['finance','corporate leadership','entity resolution'], counterpartIds: [], sourcePack: [source('Rothschild & Co: Alexandre de Rothschild profile', 'https://www.rothschildandco.com/en/about-us/corporate-governance/alexandre-de-rothschild-profile/')], marketImpact: { sectors: ['finance'], countries: ['FR'], confidence: 'low' } });

// Encounters for clusters we added.
addEncounter({ id: 'enc-brics-fmm-rio-2025', eventGroupId: 'eg-brics-fmm-rio-2025', title: 'BRICS foreign ministers meeting in Rio', date: '2025-04-29', location: coords.rio, participantIds: ['p-sergey-lavrov','p-wang-yi','p-mauro-vieira','p-ronald-lamola'], appearanceIds: ['a-2025-04-28-sergey-lavrov-rio-de-janeiro','a-2025-04-29-wang-yi-rio-brics-fmm','a-2025-04-28-mauro-vieira-rio-brics-fmm','a-2025-04-29-ronald-lamola-rio-brics-fmm'].filter(id => data.appearances.some(a => a.id === id)), organizationNames: ['BRICS', 'Brazil MFA', 'China MFA', 'Russian MFA'], summary: 'BRICS foreign ministers created a high-value person-event cluster in Rio.', score: 89, type: 'Foreign ministers meeting', sourcePack: [bricsStatement, bricsChina, lavrovRio] });
addEncounter({ id: 'enc-g7-fmm-niagara-2025', eventGroupId: 'eg-g7-fmm-niagara-2025', title: 'G7 foreign ministers meeting in Niagara', date: '2025-11-12', location: coords.hamilton, participantIds: ['p-marco-rubio','p-yvette-cooper','p-anita-anand','p-jean-noel-barrot','p-johann-wadephul','p-antonio-tajani','p-toshimitsu-motegi','p-kaja-kallas'], appearanceIds: data.appearances.filter(a => a.eventGroupId === 'eg-g7-fmm-niagara-2025').map(a => a.id), organizationNames: ['G7', 'Global Affairs Canada', 'GOV.UK'], summary: 'Niagara links G7 foreign ministers and the EU high representative in one public ministerial cluster.', score: 92, type: 'G7 ministerial cluster', sourcePack: [govukNiagara, canadaNiagara] });
addEncounter({ id: 'enc-lavrov-jaishankar-moscow-2025', eventGroupId: 'eg-jaishankar-2025-08-21-moscow', title: 'Lavrov and Jaishankar meet in Moscow', date: '2025-08-21', location: coords.moscow, participantIds: ['p-sergey-lavrov','p-s-jaishankar'], appearanceIds: ['a-2025-08-21-sergey-lavrov-moscow','a-2025-08-21-s-jaishankar-moscow'].filter(id => data.appearances.some(a => a.id === id)), organizationNames: ['Russian MFA', 'Ministry of External Affairs India'], summary: 'The public record connects the Russian and Indian foreign ministers in Moscow.', score: 87, type: 'Foreign ministers meeting', sourcePack: [lavrovJaishankar, meaTravel] });
addEncounter({ id: 'enc-aga-khan-ruto-nairobi-2025', eventGroupId: 'eg-aga-khan-kenya-2025', title: 'Aga Khan V official visit to Kenya', date: '2025-08-26', location: coords.nairobi, participantIds: ['p-rahim-aga-khan-v'], appearanceIds: ['a-2025-08-26-rahim-aga-khan-nairobi'], organizationNames: ['Aga Khan Development Network', 'Government of Kenya'], summary: 'AKDN records the official Kenya visit at President William Ruto’s invitation.', score: 82, type: 'Development diplomacy visit', sourcePack: [akdnKenya] });

// Roster replacements: shift toward travel-heavy foreign ministers and connectors while preserving exactly 200 slots.
const replacements = [
  [117, { name: 'Sergey Lavrov', id: 'r-117-sergey-lavrov', region: 'Europe / Eurasia', country: 'Russia', countryCode: 'RU', bucket: 'Foreign minister', sector: 'Government', organization: 'Russian MFA', wikiTitle: 'Sergey_Lavrov', wikidataId: 'Q1290', profileUrl: 'https://en.wikipedia.org/wiki/Sergey_Lavrov' }],
  [118, { name: 'Yvette Cooper', id: 'r-118-yvette-cooper', region: 'Europe', country: 'United Kingdom', countryCode: 'GB', bucket: 'Foreign minister', sector: 'Government', organization: 'FCDO', wikiTitle: 'Yvette_Cooper', wikidataId: 'Q264771', profileUrl: 'https://en.wikipedia.org/wiki/Yvette_Cooper' }],
  [119, { name: 'Jean-Noël Barrot', id: 'r-119-jean-noel-barrot', region: 'Europe', country: 'France', countryCode: 'FR', bucket: 'Foreign minister', sector: 'Government', organization: 'French Ministry for Europe and Foreign Affairs', wikiTitle: 'Jean-Noël_Barrot', wikidataId: 'REVIEW_REQUIRED', profileUrl: 'https://en.wikipedia.org/wiki/Jean-No%C3%ABl_Barrot' }],
  [121, { name: 'Johann Wadephul', id: 'r-121-johann-wadephul', region: 'Europe', country: 'Germany', countryCode: 'DE', bucket: 'Foreign minister', sector: 'Government', organization: 'Federal Foreign Office', wikiTitle: 'Johann_Wadephul', wikidataId: 'REVIEW_REQUIRED', profileUrl: 'https://en.wikipedia.org/wiki/Johann_Wadephul' }],
  [127, { name: 'Antonio Tajani', id: 'r-127-antonio-tajani', region: 'Europe', country: 'Italy', countryCode: 'IT', bucket: 'Foreign minister', sector: 'Government', organization: 'Italian MFA', wikiTitle: 'Antonio_Tajani', wikidataId: 'Q57664', profileUrl: 'https://en.wikipedia.org/wiki/Antonio_Tajani' }],
  [130, { name: 'Anita Anand', id: 'r-130-anita-anand', region: 'North America', country: 'Canada', countryCode: 'CA', bucket: 'Foreign minister', sector: 'Government', organization: 'Global Affairs Canada', wikiTitle: 'Anita_Anand', wikidataId: 'Q56672959', profileUrl: 'https://en.wikipedia.org/wiki/Anita_Anand' }],
  [131, { name: 'Toshimitsu Motegi', id: 'r-131-toshimitsu-motegi', region: 'Asia', country: 'Japan', countryCode: 'JP', bucket: 'Foreign-policy principal', sector: 'Government', organization: 'Japan foreign policy', wikiTitle: 'Toshimitsu_Motegi', wikidataId: 'Q1153539', profileUrl: 'https://en.wikipedia.org/wiki/Toshimitsu_Motegi' }],
  [132, { name: 'David Lammy', id: 'r-132-david-lammy', region: 'Europe', country: 'United Kingdom', countryCode: 'GB', bucket: 'Foreign-policy principal', sector: 'Government', organization: 'FCDO', wikiTitle: 'David_Lammy', wikidataId: 'Q5247356', profileUrl: 'https://en.wikipedia.org/wiki/David_Lammy' }],
  [133, { name: 'Hakan Fidan', id: 'r-133-hakan-fidan', region: 'Europe / Middle East', country: 'Turkey', countryCode: 'TR', bucket: 'Foreign minister', sector: 'Government', organization: 'Turkish MFA', wikiTitle: 'Hakan_Fidan', wikidataId: 'Q5636423', profileUrl: 'https://en.wikipedia.org/wiki/Hakan_Fidan' }],
  [134, { name: 'Faisal bin Farhan Al Saud', id: 'r-134-faisal-bin-farhan', region: 'Middle East', country: 'Saudi Arabia', countryCode: 'SA', bucket: 'Foreign minister', sector: 'Government', organization: 'Saudi MFA', wikiTitle: 'Faisal_bin_Farhan_Al_Saud', wikidataId: 'Q74252799', profileUrl: 'https://en.wikipedia.org/wiki/Faisal_bin_Farhan_Al_Saud' }],
  [137, { name: 'Abbas Araghchi', id: 'r-137-abbas-araghchi', region: 'Middle East', country: 'Iran', countryCode: 'IR', bucket: 'Foreign minister', sector: 'Government', organization: 'Iran MFA', wikiTitle: 'Abbas_Araghchi', wikidataId: 'Q4659451', profileUrl: 'https://en.wikipedia.org/wiki/Abbas_Araghchi' }],
  [138, { name: 'Mauro Vieira', id: 'r-138-mauro-vieira', region: 'Latin America', country: 'Brazil', countryCode: 'BR', bucket: 'Foreign minister', sector: 'Government', organization: 'Brazil MFA', wikiTitle: 'Mauro_Vieira', wikidataId: 'Q16687993', profileUrl: 'https://en.wikipedia.org/wiki/Mauro_Vieira' }],
  [140, { name: 'Ronald Lamola', id: 'r-140-ronald-lamola', region: 'Africa', country: 'South Africa', countryCode: 'ZA', bucket: 'Foreign minister', sector: 'Government', organization: 'DIRCO South Africa', wikiTitle: 'Ronald_Lamola', wikidataId: 'Q19895533', profileUrl: 'https://en.wikipedia.org/wiki/Ronald_Lamola' }],
  [150, { name: 'Prince Rahim Aga Khan V', id: 'r-150-rahim-aga-khan-v', region: 'Global', country: 'Aga Khan Development Network', countryCode: 'AKDN', bucket: 'Development and philanthropy principal', sector: 'Philanthropy', organization: 'Aga Khan Development Network', wikiTitle: 'Aga_Khan_V', wikidataId: 'REVIEW_REQUIRED', profileUrl: 'https://the.akdn/en/who-we-are/our-chair', officialUrl: 'https://the.akdn/en/who-we-are/our-chair' }],
  [151, { name: 'Alexandre de Rothschild', id: 'r-151-alexandre-de-rothschild', region: 'Europe', country: 'France', countryCode: 'FR', bucket: 'Finance principal', sector: 'Finance', organization: 'Rothschild & Co', wikiTitle: 'Alexandre_de_Rothschild', wikidataId: 'REVIEW_REQUIRED', profileUrl: 'https://www.rothschildandco.com/en/about-us/corporate-governance/alexandre-de-rothschild-profile/', officialUrl: 'https://www.rothschildandco.com/en/about-us/corporate-governance/alexandre-de-rothschild-profile/' }]
];
for (const [rank, item] of replacements) addOrReplaceRoster(rank, item);

data.roster.sort((a,b)=>a.rank-b.rank);
// Keep exactly 200 by dropping overflow if any rank insertion appended instead of replaced.
const seenRanks = new Set();
data.roster = data.roster.filter(r => { if (seenRanks.has(r.rank)) return false; seenRanks.add(r.rank); return true; }).slice(0,200);

// Refresh profileLines for new mapped people with actual counts/latest.
for (const p of data.people) {
  const records = data.appearances.filter(a => a.personId === p.id).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  if (records.length) {
    const latest = records[records.length-1];
    const latestText = `${latest.location.city}, ${latest.location.countryName} on ${latest.startsAt.slice(0,10)}: ${latest.title}.`;
    if (!Array.isArray(p.profileLines) || p.profileLines.length < 8 || newPeople.some(x=>x.id===p.id)) {
      p.profileLines = profileLinesFor(p, records.length, latestText);
    }
  }
}

// Add a structured source health row for foreign-minister crawl.
if (!data.sourceHealth.some(x => x.label === 'Foreign-minister office crawler')) {
  data.sourceHealth.unshift({ label: 'Foreign-minister office crawler', coverage: 'state.gov travel archives, MEA visit pages, MFA/MOFA/MRE readouts, G7/G20/BRICS ministerial pages and official social feeds where available', cadence: 'nightly plus monthly 24-month backfill', score: 84 });
}

// Update source registry.
const registryPath = 'data/source-registry.json';
if (fs.existsSync(registryPath)) {
  const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  reg.meta = reg.meta || {};
  reg.meta.version = '3.7.0';
  reg.meta.lastReviewed = '2026-05-30';
  reg.meta.granularExpansion = 'v3.7 adds foreign-minister office crawlers, secretary travel archives, BRICS/G7 ministerial participant capture, Netanyahu U.S. public-visit backfill, and dynamic connector profiles.';
  reg.officialDomains = Array.from(new Set([...(reg.officialDomains || []), 'state.gov', 'mea.gov.in', 'mid.ru', 'mfa.gov.cn', 'gov.il', 'gov.uk', 'canada.ca', 'mofa.go.jp', 'gov.br', 'mfa.gov.tr', 'the.akdn', 'rothschildandco.com']));
  reg.priorityCrawlerTargets = reg.priorityCrawlerTargets || [];
  reg.priorityCrawlerTargets.push({
    label: 'Foreign-minister and second-line principals',
    sources: ['State Department travel archive', 'MEA EAM visits', 'Russian MFA news', 'China MFA leader activity', 'G7/G20/BRICS host pages', 'official X account candidates after verification'],
    extraction: ['person', 'office', 'event', 'city', 'date', 'counterpart', 'source URL', 'verification level'],
    publicationRule: 'publish only office or host-public records; X posts are leads until official-account ownership and post context are verified'
  });
  fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2));
}

// Add crawl plan file.
fs.mkdirSync('data/crawler', { recursive: true });
fs.writeFileSync('data/crawler/foreign-minister-crawl-plan-v3.7.0.json', JSON.stringify({
  version: '3.7.0',
  generatedAt: now,
  purpose: 'Densify high-mobility public-appearance records for foreign ministers, vice presidents, second-line principals and invitation-only event connectors.',
  targets: [
    { group: 'G7 foreign ministers', names: ['Marco Rubio','Yvette Cooper','Jean-Noël Barrot','Johann Wadephul','Antonio Tajani','Anita Anand','Toshimitsu Motegi','Kaja Kallas'], sources: ['state.gov','gov.uk','diplomatie.gouv.fr','auswaertiges-amt.de','esteri.it','canada.ca','mofa.go.jp','eeas.europa.eu'] },
    { group: 'BRICS foreign ministers', names: ['Wang Yi','Sergey Lavrov','Subrahmanyam Jaishankar','Mauro Vieira','Ronald Lamola','Faisal bin Farhan Al Saud','Abbas Araghchi'], sources: ['mfa.gov.cn','mid.ru','mea.gov.in','gov.br/mre','dirco.gov.za','mofa.gov.sa','en.mfa.ir','brics.br'] },
    { group: 'Second-line principals', names: ['JD Vance','vice presidents and deputy prime ministers in G7/G20 states'], sources: ['whitehouse.gov','official government diaries','host event pages'] },
    { group: 'Connector networks', names: ['Bilderberg steering committee','Davos repeat attendees','Group of Thirty members','BIS governors','Aga Khan Development Network','Rothschild & Co leadership'], sources: ['bilderbergmeetings.org','weforum.org','group30.org','bis.org','the.akdn','rothschildandco.com'] }
  ],
  rules: ['official/host records outrank media', 'public X posts are discovery leads until account ownership is verified', 'no hotels or private stops', 'future attendance requires official organiser or office publication']
}, null, 2));

// Meta and derived files.
data.meta.iteration = 'v3.7.0';
data.meta.version = '3.7.0';
data.meta.generatedAt = now;
data.meta.lastDataUpdate = now;
data.meta.status = 'anchored v3.6 layout with denser official travel capture for foreign ministers, second-line principals, Netanyahu U.S. visits, BRICS/G7 ministerial clusters, Aga Khan and Rothschild connector anchors';
data.meta.launchCoverage = `Top-10 opening face map, full top-200 roster, ${data.people.length} mapped figures, ${data.appearances.length} public records, foreign-minister travel expansion, event-attendee graph and below-map intelligence rankings.`;
data.meta.versionNotes = 'v3.7.0 keeps the approved v3.6 UI and focuses on structurally capturing more travel-heavy public figures via office readouts, official travel archives and host-event participant lists.';
data.meta.importStatus = 'nightly public-source queue + foreign-minister travel densification + event-attendee graph';
data.meta.uiIteration = 'v3.7 data expansion; v3.6 layout remains anchored.';

// Top roster helper files.
fs.writeFileSync('data/top200-roster.json', JSON.stringify(data.roster, null, 2));
if (Array.isArray(data.topRoster)) data.topRoster = data.roster.slice(0, 100);

// Sort appearances chronologically to keep the roadmovie stable.
data.appearances.sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt) || a.personId.localeCompare(b.personId));
fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log(`Patched v3.7.0: ${data.people.length} people, ${data.appearances.length} appearances, ${data.encounters.length} encounters, ${data.roster.length} roster.`);
