# ParleyMap v3.8.0 Heavy-Hitter Deep Search

This file anchors the next crawler expansion without changing the accepted v3.6/v3.7 interface. The goal is not a larger list of famous people. The goal is better coverage of people who actually move, speak, meet, chair, attend and influence decisions.

## What the crawler must build for each person

1. Presence timeline: dated public appearance records with city-level precision.
2. Travel timeline: public trip sequence, with onward legs only when dates make sense.
3. Meeting graph: who met whom, where, when, event context and evidence.
4. Event-attendee graph: Person ↔ Event ↔ Organization ↔ Role ↔ Year.
5. Recurring-event profile: Davos, Bilderberg, Munich, Jackson Hole, IMF, BIS, G20, G7, BRICS, UNGA, COP and similar.
6. Public-base profile: official seat, office, institutional home city and political/business base.
7. Future appearance model: public future agenda plus probability estimates that are never displayed as confirmed presence.

## Priority target groups

The v3.8 search plan prioritises frequent travellers and high-signal connectors:

- heads of state and government;
- vice presidents, deputy prime ministers and chancellery chiefs;
- foreign ministers, defence ministers and finance ministers;
- G7/G20/BRICS/Quad foreign-policy actors;
- central bankers, BIS, ECB, Fed, BoE, BoJ and G30 members;
- sovereign wealth fund leaders and Gulf investment figures;
- Bilderberg, Davos, Group of Thirty, Munich Security and Jackson Hole repeat attendees;
- major asset managers and private-capital leaders;
- technology and AI executives with public policy appearances;
- energy, aerospace and defence executives where public appearances are documented;
- international organisation heads at UN, OECD, IMF, World Bank, WTO, WHO, IEA, OPEC and related institutions;
- royalty with public diplomatic, institutional or charity roles.

## Source strategy

The crawler should never rely only on mainstream media. It should seek official and host-public material first, then use media/social/local material as leads.

### Auto-publish candidates, after safety checks

- official schedules;
- protocol office pages;
- foreign ministry readouts;
- government calendars;
- central-bank speech pages and calendars;
- summit attendance lists;
- organiser event pages;
- PDF agendas;
- conference speaker lists;
- embassy releases;
- corporate IR releases;
- SEC filings when they document a public appearance or formal role;
- official livestream descriptions and official YouTube metadata;
- university and think-tank event pages.

### Lead-only sources

These can start an investigation, but should not create public map points by themselves:

- local newspapers;
- regional television captions;
- Flickr galleries;
- X/Twitter and LinkedIn posts;
- airport notices;
- road closures;
- police advisories;
- temporary security zones;
- convoy mentions.

A lead-only item must be promoted only if a source pack later shows person, date, city and public context.

### Do not publish

- live movement;
- private addresses;
- hotel stays or hotel closures as person-location claims;
- hospitals, schools and sensitive private stops;
- leaked itineraries;
- aircraft tail numbers or flight-tracker inference without official public-event confirmation;
- property records, voting registrations or personal filings used to infer residence;
- private meetings unless a public official, organiser, participant or host source documents them.

## Search terms by language

Use native terms where relevant. The JSON config contains the live list. Core English patterns include:

- working visit;
- official visit;
- telephone conversation;
- held talks with;
- courtesy call;
- received by;
- participated in;
- on the sidelines of;
- attended;
- met with;
- roundtable;
- inspection visit;
- strategic dialogue;
- bilateral meeting;
- closed-door session.

The same idea is mirrored in Chinese, Russian, Arabic, French, German, Spanish, Portuguese, Japanese, Korean, Italian and Turkish.

## Confidence model

- 100: official direct confirmation.
- 90: organiser confirmation.
- 80: major media confirmation.
- 70: multiple local confirmations.
- 60: indirect public-event evidence.
- 50: expected recurring attendance.
- 30: predictive inference.

Only 90+ should normally publish automatically. 70–80 can publish after editorial/source review. 30–60 should stay in lead or probability mode.

## Event universe to crawl

### Political and economic

G7, G20, BRICS, APEC, Davos, UNGA, COP.

### Security

NATO Summit, Munich Security Conference, Shangri-La Dialogue, Raisina Dialogue.

### Central banking and finance

Jackson Hole, IMF / World Bank meetings, BIS meetings, ECB Sintra, FOMC, G30.

### Elite and invitation-only networks

Bilderberg, Boao Forum, Ambrosetti, Sun Valley, Milken, Future Investment Initiative.

### Trade and business

WTO Ministerial Conference, CES, Farnborough Airshow, Paris Air Show.

### Energy

OPEC meetings, CERAWeek, ADIPEC.

## Graph outputs

The highest-value output is the bipartite graph:

**Person ↔ Event**

From this, derive:

- cross-event attendance score;
- influence centrality;
- board interlocks;
- organisation interlocks;
- country interlocks;
- repeat-attendee rankings;
- emerging-attendee detection;
- first-time-attendee alerts;
- speaker-to-attendee transitions;
- side-meeting density;
- phone-call density;
- travel intensity.

## Deployment note

This iteration adds the deeper search plan and planner script. It does not change the accepted visual layout. The front end remains anchored while the data layer gets deeper.
