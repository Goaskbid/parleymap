{
  "version": "3.7.0",
  "policy": "Official and host-public sources first. v3.7 prioritises frequent-traveller roles: foreign ministers, deputies, central bankers, Bilderberg/G30/BIS/OECD/OPEC figures and public-event attendee lists.",
  "defaultLookbackDays": 730,
  "defaultFutureDays": 120,
  "sources": [
    {
      "id": "eu-commission-calendar",
      "name": "European Commission calendar items",
      "url": "https://commission.europa.eu/about/organisation/college-commissioners/calendar-items-president-and-commissioners_en",
      "kind": "official_calendar",
      "reliability": "primary",
      "autoPublish": true,
      "peopleHints": [
        "Ursula von der Leyen",
        "Kaja Kallas"
      ],
      "cadence": "nightly",
      "notes": "Commission President and Commissioners; contains public meetings and locations."
    },
    {
      "id": "eu-individual-calendars",
      "name": "European Commission individual calendars",
      "url": "https://commission.europa.eu/about/organisation/college-commissioners/individual-calendars-president-and-commissioners_en",
      "kind": "official_calendar_index",
      "reliability": "primary",
      "autoPublish": false,
      "peopleHints": [
        "Ursula von der Leyen",
        "Kaja Kallas"
      ],
      "cadence": "weekly"
    },
    {
      "id": "royal-diary-future",
      "name": "UK Royal Diary future engagements",
      "url": "https://www.royal.uk/media-centre/future-engagements",
      "kind": "official_diary",
      "reliability": "primary",
      "autoPublish": true,
      "peopleHints": [
        "King Charles III",
        "Prince William",
        "Princess Anne"
      ],
      "cadence": "nightly"
    },
    {
      "id": "royal-court-circular",
      "name": "UK Court Circular past engagements",
      "url": "https://www.royal.uk/media-centre/court-circulars",
      "kind": "official_record",
      "reliability": "primary",
      "autoPublish": true,
      "peopleHints": [
        "King Charles III",
        "Prince William",
        "Princess Anne"
      ],
      "cadence": "nightly"
    },
    {
      "id": "us-state-public-schedule",
      "name": "U.S. State Department public schedule",
      "url": "https://www.state.gov/public-schedule/",
      "kind": "official_schedule",
      "reliability": "primary",
      "autoPublish": true,
      "peopleHints": [
        "Marco Rubio",
        "JD Vance",
        "Donald Trump"
      ],
      "cadence": "nightly"
    },
    {
      "id": "white-house-news",
      "name": "White House official news and videos",
      "url": "https://www.whitehouse.gov/",
      "kind": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "peopleHints": [
        "Donald Trump"
      ],
      "cadence": "nightly"
    },
    {
      "id": "pm-india-news",
      "name": "Prime Minister of India official news updates",
      "url": "https://www.pmindia.gov.in/en/news_updates/",
      "kind": "official_press_room",
      "reliability": "primary",
      "autoPublish": true,
      "peopleHints": [
        "Narendra Modi"
      ],
      "cadence": "nightly"
    },
    {
      "id": "kremlin-events",
      "name": "Kremlin official events",
      "url": "http://en.kremlin.ru/events/president/news",
      "kind": "official_press_room",
      "reliability": "primary",
      "autoPublish": true,
      "peopleHints": [
        "Vladimir Putin"
      ],
      "cadence": "nightly"
    },
    {
      "id": "china-mfa-news",
      "name": "China MFA top news",
      "url": "https://www.mfa.gov.cn/eng/xw/zyxw/",
      "kind": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "peopleHints": [
        "Xi Jinping",
        "Wang Yi"
      ],
      "cadence": "nightly"
    },
    {
      "id": "nato-news-events",
      "name": "NATO news and summit pages",
      "url": "https://www.nato.int/cps/en/natohq/news.htm",
      "kind": "multilateral_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "peopleHints": [
        "Mark Rutte"
      ],
      "cadence": "nightly"
    },
    {
      "id": "un-secretary-general",
      "name": "UN Secretary-General press releases",
      "url": "https://www.un.org/sg/en/latest/sg/press-release",
      "kind": "multilateral_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "peopleHints": [
        "António Guterres"
      ],
      "cadence": "nightly"
    },
    {
      "id": "wef-events",
      "name": "World Economic Forum events and press material",
      "url": "https://www.weforum.org/events/",
      "kind": "host_event_page",
      "reliability": "host_public",
      "autoPublish": false,
      "peopleHints": [
        "Elon Musk",
        "Bill Gates",
        "Larry Fink",
        "Jensen Huang",
        "Satya Nadella"
      ],
      "cadence": "weekly"
    },
    {
      "id": "gdelt-discovery",
      "name": "GDELT discovery layer",
      "url": "https://api.gdeltproject.org/api/v2/doc/doc",
      "kind": "secondary_discovery",
      "reliability": "lead_only",
      "autoPublish": false,
      "peopleHints": [],
      "cadence": "nightly",
      "notes": "Creates leads for official-source confirmation; never publishes alone."
    },
    {
      "id": "official-leader-call-readouts",
      "name": "Official leader call readouts",
      "url": "multiple official government press-room search feeds",
      "kind": "official_readout_search",
      "reliability": "primary",
      "autoPublish": false,
      "peopleHints": [
        "Donald Trump",
        "Vladimir Putin",
        "Xi Jinping",
        "Emmanuel Macron",
        "Keir Starmer",
        "Narendra Modi"
      ],
      "cadence": "nightly",
      "notes": "Searches official domains for calls, spoke with, telephone conversation, readout, discussed. Publishes only with source-pack verification."
    },
    {
      "id": "summit-host-watch",
      "name": "Summit host pages and delegate programmes",
      "url": "G7, G20, NATO, UN, WEF, IMF, World Bank, regional summit host pages",
      "kind": "host_event_calendar",
      "reliability": "host_public",
      "autoPublish": false,
      "peopleHints": [],
      "cadence": "nightly within 90 days of event; weekly otherwise",
      "notes": "Finds future windows, public participant lists, agenda pages and communiques."
    },
    {
      "id": "corporate-event-watch",
      "name": "Major corporate and investor event pages",
      "url": "public event pages from major listed companies, exchanges, investor days and technology conferences",
      "kind": "corporate_public_event",
      "reliability": "host_public",
      "autoPublish": false,
      "peopleHints": [
        "Elon Musk",
        "Jensen Huang",
        "Tim Cook",
        "Satya Nadella",
        "Jamie Dimon",
        "Larry Fink"
      ],
      "cadence": "weekly; daily during major conference weeks",
      "notes": "Adds public executive appearances without inferring private travel."
    },
    {
      "id": "regional-government-calendars",
      "name": "Regional government and foreign-ministry calendars",
      "url": "official presidency, prime-minister, foreign-ministry and royal-household pages by country",
      "kind": "official_calendar_network",
      "reliability": "primary",
      "autoPublish": false,
      "peopleHints": [],
      "cadence": "nightly",
      "notes": "Expands coverage for less-covered figures through public government calendars and press releases."
    },
    {
      "id": "g20-us-2026",
      "name": "G20 2026 U.S. host-year page",
      "url": "https://www.state.gov/releases/2025/12/united-states-hosts-first-g20-sherpa-meeting",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "wef-am-2026",
      "name": "World Economic Forum Annual Meeting 2026",
      "url": "https://www.weforum.org/meetings/world-economic-forum-annual-meeting-2026/",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "msc-2026",
      "name": "Munich Security Conference 2026",
      "url": "https://securityconference.org/en/news/full/one-month-to-go-munich-security-conference-2026/",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "unfccc-cop31",
      "name": "UNFCCC COP31",
      "url": "https://unfccc.int/cop31",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "apec-china-2026",
      "name": "APEC China 2026",
      "url": "https://www.apec2026.cn/",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "brics-india-2026",
      "name": "BRICS 2026 India Presidency",
      "url": "https://brics2026.gov.in/",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "iiss-shangri-la-2026",
      "name": "IISS Shangri-La Dialogue 2026",
      "url": "https://www.iiss.org/events/shangri-la-dialogue/shangri-la-dialogue-2026/",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "raisina-2026",
      "name": "Raisina Dialogue 2026",
      "url": "https://raisinadialogue.org/raisina-2026/",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "milken-global-2026",
      "name": "Milken Global Conference 2026",
      "url": "https://milkeninstitute.org/events/global-conference-2026",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "ceraweek-2026",
      "name": "CERAWeek 2026",
      "url": "https://www.ceraweek.com/en",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "adipec-2026",
      "name": "ADIPEC 2026",
      "url": "https://www.adipec.com/",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "boao-forum",
      "name": "Boao Forum for Asia",
      "url": "https://english.boaoforum.org/",
      "kind": "host_event",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "notes": "Event-attendee graph target; publish person edge only after source names the person."
    },
    {
      "id": "uk-fcdo-news",
      "name": "UK FCDO news and Foreign Secretary travel",
      "url": "https://www.gov.uk/search/news-and-communications?organisations%5B%5D=foreign-commonwealth-development-office",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "David Lammy",
        "Yvette Cooper",
        "UK foreign secretary",
        "G7 foreign ministers"
      ],
      "notes": "Official GOV.UK release stream for FCDO travel, speeches, G7 statements and readouts."
    },
    {
      "id": "france-diplomatie-minister-news",
      "name": "France Diplomatie minister news",
      "url": "https://www.diplomatie.gouv.fr/en/french-foreign-policy/news/",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Jean-Noel Barrot",
        "Jean-Noël Barrot",
        "France foreign minister",
        "G7 foreign ministers"
      ],
      "notes": "French MFA source for ministerial travel, G7 host pages and statements."
    },
    {
      "id": "germany-foreign-office-news",
      "name": "German Federal Foreign Office news",
      "url": "https://www.auswaertiges-amt.de/en/newsroom/news",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Johann Wadephul",
        "Germany foreign minister",
        "G7 foreign ministers"
      ],
      "notes": "German Foreign Office release stream for minister travel and meetings."
    },
    {
      "id": "italy-mfa-news",
      "name": "Italy MFA news and minister calendar",
      "url": "https://www.esteri.it/en/sala_stampa/archivionotizie/",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Antonio Tajani",
        "Italy foreign minister",
        "G7 foreign ministers"
      ],
      "notes": "Italian MFA official releases for travel, meetings and G7 work."
    },
    {
      "id": "japan-mofa-news",
      "name": "Japan MOFA news and minister meetings",
      "url": "https://www.mofa.go.jp/press/release/index.html",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Toshimitsu Motegi",
        "Takeshi Iwaya",
        "Japan foreign minister",
        "Quad foreign ministers"
      ],
      "notes": "Japan MOFA releases for foreign minister meetings and trips."
    },
    {
      "id": "australia-dfat-minister-news",
      "name": "Australia DFAT minister news",
      "url": "https://www.foreignminister.gov.au/minister/penny-wong/media-release",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Penny Wong",
        "Australia foreign minister",
        "Quad foreign ministers"
      ],
      "notes": "Official Australian foreign minister statements and travel records."
    },
    {
      "id": "canada-global-affairs-minister-news",
      "name": "Global Affairs Canada minister news",
      "url": "https://www.canada.ca/en/global-affairs/news.html",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Anita Anand",
        "Melanie Joly",
        "G7 foreign ministers"
      ],
      "notes": "Canadian foreign-minister travel, statements and G7 host records."
    },
    {
      "id": "brazil-mre-news",
      "name": "Brazil MRE news",
      "url": "https://www.gov.br/mre/en/contact-us/press-area/news",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Mauro Vieira",
        "BRICS foreign ministers",
        "G20 foreign ministers"
      ],
      "notes": "Brazil foreign-ministry records for BRICS, G20 and ministerial diplomacy."
    },
    {
      "id": "iran-mfa-news",
      "name": "Iran MFA news",
      "url": "https://en.mfa.ir/portal/newsarchive/0",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Abbas Araghchi",
        "BRICS foreign ministers"
      ],
      "notes": "Iranian foreign-ministry records for minister meetings and travel."
    },
    {
      "id": "turkey-mfa-news",
      "name": "Turkey MFA news",
      "url": "https://www.mfa.gov.tr/sub.en.mfa?c4d1d47c-e5bd-45cf-90aa-35641d4ef82b",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Hakan Fidan",
        "Turkey foreign minister",
        "NATO foreign ministers"
      ],
      "notes": "Turkish MFA records for ministerial travel and meetings."
    },
    {
      "id": "south-africa-dirco-news",
      "name": "South Africa DIRCO news",
      "url": "https://dirco.gov.za/newsroom/",
      "type": "official_press_room",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "nightly",
      "peopleHints": [
        "Ronald Lamola",
        "BRICS foreign ministers",
        "G20 foreign ministers"
      ],
      "notes": "South African foreign-ministry news for BRICS/G20 ministerial activity."
    },
    {
      "id": "fii-institute-events",
      "name": "Future Investment Initiative events",
      "url": "https://fii-institute.org/events",
      "type": "host_event_index",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "weekly",
      "peopleHints": [
        "Yasir Al-Rumayyan",
        "Larry Fink",
        "Stephen Schwarzman",
        "Mohammed bin Salman"
      ],
      "notes": "High-yield Saudi/gulf capital event layer; participant edges require source naming the person."
    },
    {
      "id": "milken-events-speakers",
      "name": "Milken Institute event speakers",
      "url": "https://milkeninstitute.org/events",
      "type": "host_event_participant_lists",
      "reliability": "primary",
      "autoPublish": false,
      "cadence": "weekly",
      "peopleHints": [
        "Larry Fink",
        "Stephen Schwarzman",
        "Jamie Dimon",
        "Bill Ackman",
        "Marc Rowan"
      ],
      "notes": "Public event/speaker pages for capital-market connector graph."
    },
    {
      "id": "sun-valley-watch",
      "name": "Sun Valley conference public-source watch",
      "url": "https://www.alleninvest.com/",
      "type": "secondary_discovery",
      "reliability": "lead_only",
      "autoPublish": false,
      "cadence": "weekly",
      "peopleHints": [
        "Tim Cook",
        "Satya Nadella",
        "Sundar Pichai",
        "Jeff Bezos",
        "Sam Altman"
      ],
      "notes": "Use as discovery only; publish attendee edges only from durable public/credible records."
    }
  ]
}