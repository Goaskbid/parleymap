import fs from 'node:fs';

const root = process.cwd();
const dataPath = `${root}/data/demo.json`;
const topPath = `${root}/data/top100-roster.json`;
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const dob = {
  'Donald Trump':'1946-06-14','Xi Jinping':'1953-06-15','Vladimir Putin':'1952-10-07','Elon Musk':'1971-06-28','Narendra Modi':'1950-09-17','Ursula von der Leyen':'1958-10-08','Kaja Kallas':'1977-06-18','Friedrich Merz':'1955-11-11','Emmanuel Macron':'1977-12-21','Keir Starmer':'1962-09-02','Giorgia Meloni':'1977-01-15','Volodymyr Zelenskyy':'1978-01-25','Recep Tayyip Erdogan':'1954-02-26','Recep Tayyip Erdoğan':'1954-02-26','Mark Rutte':'1967-02-14','Antonio Guterres':'1949-04-30','António Guterres':'1949-04-30','Mohammed bin Salman':'1985-08-31','Mohamed bin Zayed Al Nahyan':'1961-03-11','Benjamin Netanyahu':'1949-10-21','Ali Khamenei':'1939-04-19','Masoud Pezeshkian':'1954-09-29','Prabowo Subianto':'1951-10-17','Li Qiang':'1959-07-23','Wang Yi':'1953-10-19','S. Jaishankar':'1955-01-09','Shigeru Ishiba':'1957-02-04','Anthony Albanese':'1963-03-02','Mark Carney':'1965-03-16','Claudia Sheinbaum':'1962-06-24','Luiz Inácio Lula da Silva':'1945-10-27','Javier Milei':'1970-10-22','Cyril Ramaphosa':'1952-11-17','Bola Tinubu':'1952-03-29','William Ruto':'1966-12-21','Abdel Fattah el-Sisi':'1954-11-19','Abiy Ahmed':'1976-08-15','Paul Kagame':'1957-10-23','Tony Blair':'1953-05-06','Angela Merkel':'1954-07-17','Barack Obama':'1961-08-04','Joe Biden':'1942-11-20','George W. Bush':'1946-07-06','Bill Clinton':'1946-08-19','King Charles III':'1948-11-14','Prince William':'1982-06-21','Queen Camilla':'1947-07-17','Mohammed bin Abdulrahman Al Thani':'1980-11-01','Tamim bin Hamad Al Thani':'1980-06-03','Kristalina Georgieva':'1953-08-13','Ajay Banga':'1959-11-10','Christine Lagarde':'1956-01-01','Jerome Powell':'1953-02-04','Ngozi Okonjo-Iweala':'1954-06-13','Tedros Adhanom Ghebreyesus':'1965-03-03','Sania Nishtar':'1963-02-16','Mathias Cormann':'1970-09-20','Agustín Carstens':'1958-06-09','Rafael Grossi':'1961-03-12','Cindy McCain':'1954-05-20','Filippo Grandi':'1957-03-30','Achim Steiner':'1961-05-17','Catherine Russell':'1961-03-04','Gianni Infantino':'1970-03-23','Kirsty Coventry':'1983-09-16','Thomas Bach':'1953-12-29','Bill Gates':'1955-10-28','Warren Buffett':'1930-08-30','Jeff Bezos':'1964-01-12','Mark Zuckerberg':'1984-05-14','Sundar Pichai':'1972-06-10','Satya Nadella':'1967-08-19','Tim Cook':'1960-11-01','Jensen Huang':'1963-02-17','Sam Altman':'1985-04-22','Larry Fink':'1952-11-02','Jamie Dimon':'1956-03-13','Jane Fraser':'1967-07-13','Bernard Arnault':'1949-03-05','Mukesh Ambani':'1957-04-19','Gautam Adani':'1962-06-24','Jack Ma':'1964-09-10','Pony Ma':'1971-10-29','Masayoshi Son':'1957-08-11','Lisa Su':'1969-11-07','Brian Chesky':'1981-08-29','Pope Leo XIV':'1955-09-14','Patriarch Kirill':'1946-11-20','Donald Tusk':'1957-04-22','Pedro Sánchez':'1972-02-29','Viktor Orbán':'1963-05-31','Roberta Metsola':'1979-01-18','Olaf Scholz':'1958-06-14','Rishi Sunak':'1980-05-12','Boris Johnson':'1964-06-19','Nancy Pelosi':'1940-03-26','JD Vance':'1984-08-02','Marco Rubio':'1971-05-28','Scott Bessent':'1962-08-21','Sergio Mattarella':'1941-07-23','Gustavo Petro':'1960-04-19','Gabriel Boric':'1986-02-11',
  'Sheikh Mansour bin Zayed Al Nahyan':'1970-11-20','Yasir Al-Rumayyan':'1970-02-20','Sultan Ahmed Al Jaber':'1973-08-31','Amin H. Nasser':'1958-01-01','Darren Woods':'1964-12-20','Mary Barra':'1961-12-24','Ana Botín':'1960-10-04','Ken Griffin':'1968-10-15','Ray Dalio':'1949-08-08','Stephen Schwarzman':'1947-02-14','David Solomon':'1962-01-01','Brian Moynihan':'1959-10-09','Sergio Ermotti':'1960-05-11','Abigail Johnson':'1961-12-19','Michael Bloomberg':'1942-02-14','Carlos Slim':'1940-01-28','Amancio Ortega':'1936-03-28','Françoise Bettencourt Meyers':'1953-07-10','MacKenzie Scott':'1970-04-07','Melinda French Gates':'1964-08-15','Laurene Powell Jobs':'1963-11-06','George Soros':'1930-08-12','Peter Thiel':'1967-10-11','Alex Karp':'1967-10-02','Andy Jassy':'1968-01-13','Safra Catz':'1961-12-01','Shou Zi Chew':'1983-01-01','Demis Hassabis':'1976-07-27','Ren Zhengfei':'1944-10-25','Li Ka-shing':'1928-07-29','Zhang Yiming':'1983-04-01','Robin Zeng':'1968-03-01','Lei Jun':'1969-12-16','Wang Chuanfu':'1966-04-08','Marc Benioff':'1964-09-25','Michael Dell':'1965-02-23','Reed Hastings':'1960-10-08','Bob Iger':'1951-02-10','Rupert Murdoch':'1931-03-11','Anna Wintour':'1949-11-03','Børge Brende':'1965-09-25','Klaus Schwab':'1938-03-30','Janet Yellen':'1946-08-13','Mario Draghi':'1947-09-03','Hillary Clinton':'1947-10-26','Al Gore':'1948-03-31','King Felipe VI':'1968-01-30','Queen Letizia':'1972-09-15','King Abdullah II':'1962-01-30','Queen Rania':'1970-08-31','Mohammed VI':'1963-08-21','King Willem-Alexander':'1967-04-27','King Philippe':'1960-04-15','Sheikha Moza bint Nasser':'1959-08-08','Cardinal Pietro Parolin':'1955-01-17','Mette Frederiksen':'1977-11-19','Jonas Gahr Støre':'1960-08-25','Ulf Kristersson':'1963-12-29','Petteri Orpo':'1969-11-03','Kyriakos Mitsotakis':'1968-03-04','Dick Schoof':'1957-03-08','Lawrence Wong':'1972-12-18','Anwar Ibrahim':'1947-08-10','Hun Manet':'1977-10-20','Joko Widodo':'1961-06-21','Muhammad Yunus':'1940-06-28','Shehbaz Sharif':'1951-09-23','Lai Ching-te':'1959-10-06','Lee Jae-myung':'1964-12-22','Tsai Ing-wen':'1956-08-31','Bassirou Diomaye Faye':'1980-03-25','John Mahama':'1958-11-29','Hakainde Hichilema':'1962-06-04','Yoweri Museveni':'1944-09-15','Félix Tshisekedi':'1963-06-13','João Lourenço':'1954-03-05','Samia Suluhu Hassan':'1960-01-27','Akinwumi Adesina':'1960-02-06','Nicolás Maduro':'1962-11-23','Nayib Bukele':'1981-07-24','Daniel Noboa':'1987-11-30','José Raúl Mulino':'1959-06-13','Dina Boluarte':'1962-05-31','Santiago Peña':'1978-11-16','Luis Arce':'1963-09-28','Luis Abinader':'1967-07-12','Mia Mottley':'1965-10-01','Irfaan Ali':'1980-04-25','Alexander Stubb':'1968-04-01','Bart De Wever':'1970-12-21','Sanna Marin':'1985-11-16','Gavin Newsom':'1967-10-10','Ron DeSantis':'1978-09-14','Gretchen Whitmer':'1971-08-23','Mike Johnson':'1972-01-30','Hakeem Jeffries':'1970-08-04','Sheryl Sandberg':'1969-08-28','Ariane de Rothschild':'1965-11-14','Michael Miebach':'1968-01-01','Chuck Robbins':'1965-01-01'
};

const cc = {
  'United States':'US','China':'CN','Russia':'RU','India':'IN','European Union':'EU','NATO':'BE','United Nations':'UN','Saudi Arabia':'SA','United Arab Emirates':'AE','Israel':'IL','Iran':'IR','Indonesia':'ID','Japan':'JP','Australia':'AU','Canada':'CA','Mexico':'MX','Brazil':'BR','Argentina':'AR','South Africa':'ZA','Nigeria':'NG','Kenya':'KE','Egypt':'EG','Ethiopia':'ET','Rwanda':'RW','Qatar':'QA','IMF':'US','World Bank':'US','European Central Bank':'DE','WTO':'CH','WHO':'CH','Gavi':'CH','OECD':'FR','BIS':'CH','IAEA':'AT','WFP':'IT','UNHCR':'CH','UNDP':'US','UNICEF':'US','FIFA':'CH','IOC':'CH','Holy See':'VA','Poland':'PL','Spain':'ES','Hungary':'HU','Colombia':'CO','Chile':'CL','Switzerland':'CH','Norway':'NO','Sweden':'SE','Finland':'FI','Greece':'GR','Netherlands':'NL','Singapore':'SG','Malaysia':'MY','Cambodia':'KH','Bangladesh':'BD','Pakistan':'PK','Taiwan':'TW','South Korea':'KR','Senegal':'SN','Ghana':'GH','Zambia':'ZM','Uganda':'UG','Democratic Republic of the Congo':'CD','Angola':'AO','Tanzania':'TZ','African Development Bank':'CI','Venezuela':'VE','El Salvador':'SV','Ecuador':'EC','Panama':'PA','Peru':'PE','Paraguay':'PY','Bolivia':'BO','Dominican Republic':'DO','Barbados':'BB','Guyana':'GY','Belgium':'BE','Denmark':'DK','Jordan':'JO','Morocco':'MA'
};

function slugify(name){return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function wikiTitle(name){return name.replace(/ /g,'_');}
function categoryFor(bucket, sector){
  const t = `${bucket} ${sector}`.toLowerCase();
  if(t.includes('royal')) return 'ROYALTY';
  if(t.includes('former')) return 'FORMER_LEADER';
  if(t.includes('bank') || t.includes('finance') || t.includes('investor')) return 'FINANCE_ECONOMY';
  if(t.includes('business') || t.includes('technology') || t.includes('energy') || t.includes('media')) return 'BUSINESS_LEADER';
  if(t.includes('health') || t.includes('humanitarian') || t.includes('international') || t.includes('multilateral')) return 'INTERNATIONAL_ORG';
  if(t.includes('diplomacy')) return 'FOREIGN_MINISTER';
  if(t.includes('head of government')) return 'HEAD_OF_GOVERNMENT';
  if(t.includes('head of state')) return 'HEAD_OF_STATE';
  return 'BUSINESS_LEADER';
}
function orgIconFor(sector){
  const t=String(sector).toLowerCase();
  if(t.includes('government')) return '◆';
  if(t.includes('royalty')) return '♛';
  if(t.includes('technology')) return '▣';
  if(t.includes('finance')) return '◍';
  if(t.includes('energy')) return '◈';
  if(t.includes('media')) return '✦';
  if(t.includes('philanthropy')) return '✚';
  return '◎';
}
function makeItem(rank, name, country, region, bucket, sector, organization, score){
  const code=cc[country] || (country && country.length===2 ? country : 'UN');
  return {
    rank, id:`r-${String(rank).padStart(3,'0')}-${slugify(name)}`, name, slug:slugify(name), wikiTitle:wikiTitle(name), wikidataId:`Q_PENDING_${rank}`, profileUrl:`https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle(name))}`, region, country, countryName: country, bucket, sector, organization, prominenceScore: score || Math.max(61, 90 - Math.floor(rank/6)), imageUrl:'', imageProvider:'Wikimedia/Wikipedia runtime thumbnail candidate', visualAuditStatus:'candidate only until Commons extmetadata license, author, and attribution are captured', trackingStatus:'roster-ready; public trails publish only after public-source verification', sourcePriority:'official calendar, official press room, host-event page, exchange filing, or verified organizer page before publication', canonicalName:name, roleTitle:bucket, homeRegion:region, countryFocus:code, countryFocusCode:code, industry:sector, shortBio:`${name} is on the source-gated ParleyMap roster because their public appearances can signal policy, capital, diplomacy, or sector movement.`, category:categoryFor(bucket, sector), orgIcon:orgIconFor(sector), visualStatus:'candidate only until Commons extmetadata license, author, and attribution are captured', locationStatus:'source-gated public anchor baseline until approved appearance records are added', birthDate:dob[name] || null, birthdayAuditStatus:dob[name] ? 'candidate birth date; production should verify against Wikidata/official bio' : 'birth date pending verification'
  };
}

const next = [
 ['Sheikh Mansour bin Zayed Al Nahyan','United Arab Emirates','Middle East','Royal / sovereign wealth principal','Government / royalty / finance','UAE leadership / Mubadala-linked influence',95],
 ['Yasir Al-Rumayyan','Saudi Arabia','Middle East','Sovereign wealth principal','Finance','Public Investment Fund',94],
 ['Sultan Ahmed Al Jaber','United Arab Emirates','Middle East','Energy / climate principal','Energy / diplomacy','ADNOC / UAE climate diplomacy',93],
 ['Amin H. Nasser','Saudi Arabia','Middle East','Energy executive principal','Energy','Saudi Aramco',92],
 ['Darren Woods','United States','North America','Energy executive principal','Energy','ExxonMobil',88],
 ['Mary Barra','United States','North America','Industrial executive principal','Business','General Motors',88],
 ['Ana Botín','Spain','Europe','Banking principal','Finance','Banco Santander',88],
 ['Ken Griffin','United States','North America','Hedge fund principal','Finance','Citadel',91],
 ['Ray Dalio','United States','North America','Investor principal','Finance','Bridgewater Associates',87],
 ['Stephen Schwarzman','United States','North America','Private equity principal','Finance','Blackstone',90],
 ['David Solomon','United States','North America','Banking principal','Finance','Goldman Sachs',86],
 ['Brian Moynihan','United States','North America','Banking principal','Finance','Bank of America',86],
 ['Sergio Ermotti','Switzerland','Europe','Banking principal','Finance','UBS',86],
 ['Abigail Johnson','United States','North America','Asset management principal','Finance','Fidelity Investments',86],
 ['Michael Bloomberg','United States','North America','Media / data / political principal','Media / finance','Bloomberg LP',89],
 ['Carlos Slim','Mexico','Latin America','Telecom investor principal','Business','Grupo Carso / América Móvil',86],
 ['Amancio Ortega','Spain','Europe','Retail investor principal','Business','Inditex',85],
 ['Françoise Bettencourt Meyers','France','Europe','Family office / consumer principal','Business','L’Oréal family holdings',85],
 ['MacKenzie Scott','United States','North America','Philanthropy principal','Philanthropy','Yield Giving',84],
 ['Melinda French Gates','United States','North America','Philanthropy principal','Philanthropy','Pivotal Ventures',86],
 ['Laurene Powell Jobs','United States','North America','Philanthropy / media principal','Philanthropy / media','Emerson Collective',84],
 ['George Soros','United States','North America','Philanthropy / investor principal','Philanthropy / finance','Open Society Foundations',86],
 ['Peter Thiel','United States','North America','Technology investor principal','Technology / finance','Founders Fund / Palantir-linked network',86],
 ['Alex Karp','United States','North America','Defense technology principal','Technology / defense','Palantir',86],
 ['Andy Jassy','United States','North America','Cloud technology principal','Technology','Amazon',87],
 ['Safra Catz','United States','North America','Enterprise software principal','Technology','Oracle',84],
 ['Shou Zi Chew','Singapore','Asia','Platform technology principal','Technology','TikTok',84],
 ['Demis Hassabis','United Kingdom','Europe','AI research principal','Technology','Google DeepMind',85],
 ['Ren Zhengfei','China','Asia','Telecom technology principal','Technology','Huawei',87],
 ['Li Ka-shing','Hong Kong','Asia','Investor principal','Business / finance','CK Hutchison Holdings',86],
 ['Zhang Yiming','China','Asia','Technology founder principal','Technology','ByteDance',86],
 ['Robin Zeng','China','Asia','Battery technology principal','Technology / energy','CATL',85],
 ['Lei Jun','China','Asia','Consumer technology principal','Technology','Xiaomi',84],
 ['Wang Chuanfu','China','Asia','EV / battery principal','Technology / industrial','BYD',86],
 ['Marc Benioff','United States','North America','Enterprise software principal','Technology','Salesforce',83],
 ['Michael Dell','United States','North America','Computing technology principal','Technology','Dell Technologies',83],
 ['Reed Hastings','United States','North America','Media technology principal','Media / technology','Netflix',82],
 ['Bob Iger','United States','North America','Media principal','Media','The Walt Disney Company',84],
 ['Rupert Murdoch','United States','North America','Media principal','Media','News Corp / Fox-linked media',85],
 ['Anna Wintour','United States','North America','Media / culture principal','Media / culture','Condé Nast',80],
 ['Børge Brende','World Economic Forum','Europe','Forum / convening principal','International organization','World Economic Forum',84],
 ['Klaus Schwab','World Economic Forum','Europe','Forum founder / former principal','International organization','World Economic Forum',83],
 ['Janet Yellen','United States','North America','Former finance principal','Government / finance','United States economic policy network',83],
 ['Mario Draghi','Italy','Europe','Former government / central bank principal','Former political leader / finance','Italy / ECB network',85],
 ['Hillary Clinton','United States','North America','Former diplomacy / political principal','Former political leader','United States political network',83],
 ['Al Gore','United States','North America','Climate / former political principal','Climate / former political leader','Climate finance and policy network',81],
 ['King Felipe VI','Spain','Europe','Royal principal','Royalty','Spanish Royal Household',82],
 ['Queen Letizia','Spain','Europe','Royal principal','Royalty','Spanish Royal Household',77],
 ['King Abdullah II','Jordan','Middle East','Head of state / royal principal','Government / royalty','Hashemite Kingdom of Jordan',86],
 ['Queen Rania','Jordan','Middle East','Royal / philanthropy principal','Royalty / philanthropy','Jordanian Royal Court',78],
 ['Mohammed VI','Morocco','Africa','Head of state / royal principal','Government / royalty','Kingdom of Morocco',84],
 ['King Willem-Alexander','Netherlands','Europe','Royal principal','Royalty','Dutch Royal House',78],
 ['King Philippe','Belgium','Europe','Royal principal','Royalty','Belgian Royal Palace',77],
 ['Sheikha Moza bint Nasser','Qatar','Middle East','Royal / philanthropy principal','Royalty / philanthropy','Qatar Foundation',79],
 ['Cardinal Pietro Parolin','Holy See','Europe','Diplomacy principal','Religion / diplomacy','Holy See Secretariat of State',82],
 ['Mette Frederiksen','Denmark','Europe','Head of government','Government','Denmark',81],
 ['Jonas Gahr Støre','Norway','Europe','Head of government','Government','Norway',79],
 ['Ulf Kristersson','Sweden','Europe','Head of government','Government','Sweden',79],
 ['Petteri Orpo','Finland','Europe','Head of government','Government','Finland',78],
 ['Kyriakos Mitsotakis','Greece','Europe','Head of government','Government','Greece',80],
 ['Dick Schoof','Netherlands','Europe','Head of government','Government','Netherlands',78],
 ['Lawrence Wong','Singapore','Asia','Head of government','Government','Singapore',82],
 ['Anwar Ibrahim','Malaysia','Asia','Head of government','Government','Malaysia',81],
 ['Hun Manet','Cambodia','Asia','Head of government','Government','Cambodia',77],
 ['Joko Widodo','Indonesia','Asia','Former head of state/government','Former political leader','Indonesia',80],
 ['Muhammad Yunus','Bangladesh','Asia','Government / civil society principal','Government / development','Bangladesh interim government / Grameen network',83],
 ['Shehbaz Sharif','Pakistan','Asia','Head of government','Government','Pakistan',81],
 ['Lai Ching-te','Taiwan','Asia','Head of state/government','Government','Taiwan',82],
 ['Lee Jae-myung','South Korea','Asia','Head of state/government roster candidate','Government','South Korea',81],
 ['Tsai Ing-wen','Taiwan','Asia','Former head of state/government','Former political leader','Taiwan',77],
 ['Bassirou Diomaye Faye','Senegal','Africa','Head of state/government','Government','Senegal',80],
 ['John Mahama','Ghana','Africa','Head of state/government','Government','Ghana',78],
 ['Hakainde Hichilema','Zambia','Africa','Head of state/government','Government','Zambia',78],
 ['Yoweri Museveni','Uganda','Africa','Head of state/government','Government','Uganda',77],
 ['Félix Tshisekedi','Democratic Republic of the Congo','Africa','Head of state/government','Government','Democratic Republic of the Congo',79],
 ['João Lourenço','Angola','Africa','Head of state/government','Government','Angola',77],
 ['Samia Suluhu Hassan','Tanzania','Africa','Head of state/government','Government','Tanzania',78],
 ['Akinwumi Adesina','African Development Bank','Africa','Development finance principal','International organization / finance','African Development Bank',80],
 ['Nicolás Maduro','Venezuela','Latin America','Head of state/government','Government','Venezuela',78],
 ['Nayib Bukele','El Salvador','Latin America','Head of state/government','Government','El Salvador',80],
 ['Daniel Noboa','Ecuador','Latin America','Head of state/government','Government','Ecuador',77],
 ['José Raúl Mulino','Panama','Latin America','Head of state/government','Government','Panama',76],
 ['Dina Boluarte','Peru','Latin America','Head of state/government','Government','Peru',75],
 ['Santiago Peña','Paraguay','Latin America','Head of state/government','Government','Paraguay',75],
 ['Luis Arce','Bolivia','Latin America','Head of state/government','Government','Bolivia',75],
 ['Luis Abinader','Dominican Republic','Latin America','Head of state/government','Government','Dominican Republic',75],
 ['Mia Mottley','Barbados','Latin America','Head of government','Government','Barbados',78],
 ['Irfaan Ali','Guyana','Latin America','Head of state/government','Government','Guyana',76],
 ['Alexander Stubb','Finland','Europe','Head of state/government','Government','Finland',79],
 ['Bart De Wever','Belgium','Europe','Head of government roster candidate','Government','Belgium',77],
 ['Sanna Marin','Finland','Europe','Former head of government','Former political leader','Finland',77],
 ['Gavin Newsom','United States','North America','State executive / national political principal','Government','California / United States politics',77],
 ['Ron DeSantis','United States','North America','State executive / national political principal','Government','Florida / United States politics',77],
 ['Gretchen Whitmer','United States','North America','State executive / national political principal','Government','Michigan / United States politics',76],
 ['Mike Johnson','United States','North America','Legislative principal','Government','United States Congress',78],
 ['Hakeem Jeffries','United States','North America','Legislative principal','Government','United States Congress',78],
 ['Sheryl Sandberg','United States','North America','Technology / philanthropy principal','Technology / philanthropy','Lean In / former Meta network',78],
 ['Ariane de Rothschild','Switzerland','Europe','Private bank / family office principal','Finance','Edmond de Rothschild Group',78],
 ['Michael Miebach','United States','North America','Payments technology principal','Finance / technology','Mastercard',78],
 ['Chuck Robbins','United States','North America','Networking technology principal','Technology','Cisco',77]
];

const existing = (data.roster || []).map(item => ({...item}));
for (const item of existing) {
  const name = item.canonicalName || item.name;
  item.birthDate = item.birthDate || dob[name] || null;
  item.birthdayAuditStatus = item.birthDate ? 'candidate birth date; production should verify against Wikidata/official bio' : 'birth date pending verification';
  item.countryName = item.countryName || item.country || item.homeRegion || 'Global';
  item.countryFocusCode = item.countryFocusCode || item.countryFocus || cc[item.countryName] || 'UN';
  item.countryFocus = item.countryFocus || item.countryFocusCode;
  item.profileLine = item.profileLine || `${name} is on the launch roster because public appearances, official meetings, or summit participation can materially shape policy, capital, diplomacy, or sector attention.`;
}
const added = next.map((row, idx) => makeItem(101 + idx, ...row));
const roster = existing.concat(added).sort((a,b)=>a.rank-b.rank);

for (const person of data.people || []) {
  const r = roster.find(item => (item.canonicalName || item.name).toLowerCase() === String(person.canonicalName || person.name).toLowerCase());
  if (r) {
    person.birthDate = person.birthDate || r.birthDate || null;
    person.birthdayAuditStatus = r.birthdayAuditStatus;
    person.countryName = person.countryName || r.countryName;
    person.countryFocusCode = person.countryFocusCode || r.countryFocusCode;
    person.profileLine = person.profileLine || r.profileLine;
  }
}

data.roster = roster;
data.topRoster = roster.slice(0, 24);
data.meta.version = '2.2.0';
data.meta.iterationDate = '2026-05-29';
data.meta.lastDataUpdate = '2026-05-29T18:15:00+02:00';
data.meta.lastTop100Review = '2026-05-29';
data.meta.nextTop100Review = '2026-06-29';
data.meta.status = 'real-source pilot mapped records plus top-200 source-gated roster queue';
data.meta.iterationNote = 'v2.2.0 makes the start map a top-200 face-anchor view, moves the partner ad into the header, adds stronger legal/impressum panels, adds date-ordered animated public-history builds with a moving face marker, and expands profile bios with birthday/age fields where available.';
data.meta.pilotCoverage = 'Top-200 public-anchor layer, 19 real/public-source-mapped figures, 81 public appearance cards, summit watch, peace-process cards, top-200 pull-down roster, leader bios with birthday/age fields, and homebase-to-destination analytical arcs.';

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
fs.writeFileSync(topPath, JSON.stringify(roster, null, 2));
console.log(`Updated roster to ${roster.length} entries`);
