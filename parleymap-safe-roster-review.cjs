#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const DIAG_DIR = 'data/diagnostics';
const REVIEW_PATH = `${DIAG_DIR}/roster-current-holder-review.json`;
const PATCH_PATH = `${DIAG_DIR}/roster-patch-candidates.json`;

function norm(v) {
  return String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function readDataset() {
  const html = fs.readFileSync('index.html', 'utf8');
  const m = html.match(/<script\b[^>]*\bid=["']demo-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) throw new Error('demo-data block not found in index.html');
  return JSON.parse(m[1].trim());
}

function validate(data) {
  for (const key of ['people', 'roster', 'expansionRoster', 'appearances', 'categories']) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length > 115) throw new Error(`unsafe people count ${data.people.length}. Review required before roster mutation.`);
}

async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      signal: controller.signal,
      headers: { 'user-agent': 'ParleyMap safe roster review diagnostics' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.entities && json.entities[qid];
  } finally {
    clearTimeout(timer);
  }
}

function label(entity) {
  return entity?.labels?.en?.value || entity?.labels?.mul?.value || '';
}

function activeClaimTargets(entity, prop) {
  const claims = entity?.claims?.[prop] || [];
  return claims
    .filter((claim) => {
      const qualifiers = claim.qualifiers || {};
      if (qualifiers.P582 && qualifiers.P582.length) return false;
      if (claim.rank === 'deprecated') return false;
      return true;
    })
    .map((claim) => claim?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

const countries = [
  ['US', 'United States', 'Q30'],
  ['MX', 'Mexico', 'Q96'],
  ['ID', 'Indonesia', 'Q252'],
  ['FR', 'France', 'Q142'],
  ['DE', 'Germany', 'Q183'],
  ['GB', 'United Kingdom', 'Q145'],
  ['CA', 'Canada', 'Q16'],
  ['BR', 'Brazil', 'Q155'],
  ['IN', 'India', 'Q668'],
  ['JP', 'Japan', 'Q17'],
  ['AU', 'Australia', 'Q408'],
  ['IT', 'Italy', 'Q38'],
  ['ES', 'Spain', 'Q29'],
  ['UA', 'Ukraine', 'Q212'],
  ['TR', 'Turkey', 'Q43'],
  ['SA', 'Saudi Arabia', 'Q851'],
  ['AE', 'United Arab Emirates', 'Q878'],
  ['QA', 'Qatar', 'Q846'],
  ['IL', 'Israel', 'Q801']
];

function rows(data) {
  return [...(data.people || []), ...(data.roster || []), ...(data.topRoster || []), ...(data.expansionRoster || [])];
}

function findRosterMatch(allRows, code, holderName) {
  const h = norm(holderName);
  return allRows.find((row) => {
    const rowCountry = String(row.countryFocusCode || row.countryFocus || row.countryCode || '').toUpperCase();
    const text = norm([row.name, row.canonicalName, row.slug, row.roleTitle, row.organization, row.countryName].join(' '));
    return rowCountry === code && (text.includes(h) || h.includes(norm(row.canonicalName || row.name || '')));
  });
}

(async function main() {
  fs.mkdirSync(DIAG_DIR, { recursive: true });
  const data = readDataset();
  validate(data);
  const allRows = rows(data);
  const review = {
    generatedAt: new Date().toISOString(),
    status: 'safe_roster_review_complete',
    mode: 'review_only_no_people_mutation',
    counts: {
      people: data.people.length,
      roster: data.roster.length,
      topRoster: data.topRoster?.length || null,
      expansionRoster: data.expansionRoster.length
    },
    checkedCountries: [],
    missingCurrentHolderCandidates: [],
    possibleStaleRows: [],
    errors: []
  };

  for (const [code, country, qid] of countries) {
    try {
      const entity = await fetchEntity(qid);
      const holderIds = [...new Set([...activeClaimTargets(entity, 'P35'), ...activeClaimTargets(entity, 'P6')])];
      const holders = [];
      for (const holderId of holderIds) {
        try {
          const holderEntity = await fetchEntity(holderId);
          holders.push({ qid: holderId, name: label(holderEntity) });
        } catch (error) {
          review.errors.push({ countryCode: code, holderId, error: String(error.message || error) });
        }
      }
      review.checkedCountries.push({ countryCode: code, country, qid, activeHolders: holders });
      for (const holder of holders) {
        if (!findRosterMatch(allRows, code, holder.name)) {
          review.missingCurrentHolderCandidates.push({ countryCode: code, country, holderName: holder.name, holderQid: holder.qid, action: 'manual_review_add_or_promote' });
        }
      }
    } catch (error) {
      review.errors.push({ countryCode: code, country, qid, error: String(error.message || error) });
    }
  }

  const patch = {
    generatedAt: review.generatedAt,
    status: 'manual_review_required',
    note: 'This workflow is diagnostic. It does not mass-replace people. It prevents historical-holder chains and unsafe roster mutation.',
    additionsOrPromotions: review.missingCurrentHolderCandidates,
    possibleStaleRows: review.possibleStaleRows
  };
  fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2) + '\n');
  fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + '\n');
  console.log(JSON.stringify({ status: review.status, checkedCountries: review.checkedCountries.length, candidates: review.missingCurrentHolderCandidates.length, errors: review.errors.length }, null, 2));
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
