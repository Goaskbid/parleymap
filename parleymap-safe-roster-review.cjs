#!/usr/bin/env node
'use strict';

const fs = require('fs');

const INDEX_PATH = 'index.html';
const REVIEW_PATH = 'data/diagnostics/roster-safe-review.json';
const PATCH_PATH = 'data/diagnostics/roster-patch-candidates.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const DEMO_SCRIPT_RE = /<script\b(?=[^>]*\bid=["']demo-data["'])(?=[^>]*\btype=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/i;

const TARGETS = [
  { code: 'US', name: 'United States', qid: 'Q30' },
  { code: 'MX', name: 'Mexico', qid: 'Q96' },
  { code: 'ID', name: 'Indonesia', qid: 'Q252' },
  { code: 'FR', name: 'France', qid: 'Q142' },
  { code: 'GB', name: 'United Kingdom', qid: 'Q145' },
  { code: 'DE', name: 'Germany', qid: 'Q183' },
  { code: 'IT', name: 'Italy', qid: 'Q38' },
  { code: 'ES', name: 'Spain', qid: 'Q29' },
  { code: 'CA', name: 'Canada', qid: 'Q16' },
  { code: 'BR', name: 'Brazil', qid: 'Q155' },
  { code: 'IN', name: 'India', qid: 'Q668' },
  { code: 'JP', name: 'Japan', qid: 'Q17' },
  { code: 'AU', name: 'Australia', qid: 'Q408' },
  { code: 'SA', name: 'Saudi Arabia', qid: 'Q851' },
  { code: 'AE', name: 'United Arab Emirates', qid: 'Q878' },
  { code: 'QA', name: 'Qatar', qid: 'Q846' },
  { code: 'TR', name: 'Turkey', qid: 'Q43' }
];

function ensureDir(filePath) { fs.mkdirSync(require('path').dirname(filePath), { recursive: true }); }
function norm(value) { return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

function extractData() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const match = html.match(DEMO_SCRIPT_RE);
  if (!match) throw new Error('demo-data not found in index.html');
  return JSON.parse(match[1]);
}

function allRows(data) {
  return ['people', 'roster', 'topRoster', 'expansionRoster'].flatMap((key) => Array.isArray(data[key]) ? data[key].map((row) => ({ collection: key, row })) : []);
}

function countryCode(row) { return String(row.countryFocusCode || row.countryFocus || row.countryCode || '').toUpperCase(); }
function rowName(row) { return row.canonicalName || row.name || row.wikiTitle || ''; }
function roleText(row) { return norm([row.roleTitle, row.organization, row.profileLine, row.category].join(' ')); }
function leaderLike(row) { return /president|prime minister|chancellor|king|queen|monarch|emir|pope|head of state|head of government/.test(roleText(row)); }

async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { signal: controller.signal, headers: { 'user-agent': 'ParleyMap safe roster review' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.entities?.[qid] || null;
  } finally { clearTimeout(timer); }
}

function label(entity) { return entity?.labels?.en?.value || entity?.labels?.mul?.value || ''; }
function activeClaimTargets(entity, property) {
  const claims = entity?.claims?.[property] || [];
  return claims.filter((claim) => {
    const rank = claim.rank || 'normal';
    if (rank === 'deprecated') return false;
    const qualifiers = claim.qualifiers || {};
    if (qualifiers.P582 && qualifiers.P582.length) return false; // end date present
    return true;
  }).map((claim) => claim?.mainsnak?.datavalue?.value?.id).filter(Boolean);
}

async function main() {
  ensureDir(REVIEW_PATH);
  const data = extractData();
  const rows = allRows(data);
  const review = {
    generatedAt: new Date().toISOString(),
    status: 'safe_roster_review_complete',
    counts: {
      people: data.people?.length ?? null,
      roster: data.roster?.length ?? null,
      topRoster: data.topRoster?.length ?? null,
      expansionRoster: data.expansionRoster?.length ?? null
    },
    checkedCountries: [],
    addOrPromoteCandidates: [],
    staleRoleCandidates: [],
    warnings: []
  };

  if (review.counts.people > 115) {
    review.status = 'unsafe_people_count_review_only';
    review.warnings.push('people count above 115, roster changes must not be auto-applied');
  }

  const labelCache = new Map();
  async function labelFor(qid) {
    if (labelCache.has(qid)) return labelCache.get(qid);
    try { const e = await fetchEntity(qid); const l = label(e) || qid; labelCache.set(qid, l); return l; } catch { labelCache.set(qid, qid); return qid; }
  }

  for (const target of TARGETS) {
    let entity;
    try { entity = await fetchEntity(target.qid); } catch (error) {
      review.checkedCountries.push({ ...target, status: 'fetch_failed', error: String(error.message || error) });
      continue;
    }
    const currentHolderQids = [...new Set([...activeClaimTargets(entity, 'P35'), ...activeClaimTargets(entity, 'P6')])];
    const currentNames = [];
    for (const qid of currentHolderQids) currentNames.push(await labelFor(qid));

    review.checkedCountries.push({ ...target, status: 'checked', currentHolderQids, currentHolderNames: currentNames });

    for (const holderName of currentNames) {
      const holderNorm = norm(holderName);
      const present = rows.find(({ row }) => countryCode(row) === target.code && norm(rowName(row)).includes(holderNorm));
      if (!present) review.addOrPromoteCandidates.push({ countryCode: target.code, countryName: target.name, holderName, source: `${target.qid} active P35/P6 claim without end date`, action: 'review_add_or_promote' });
    }

    const localLeaders = rows.filter(({ row }) => countryCode(row) === target.code && leaderLike(row));
    for (const { collection, row } of localLeaders) {
      const name = norm(rowName(row));
      const currentHit = currentNames.some((current) => {
        const c = norm(current);
        return c && (name.includes(c) || c.includes(name));
      });
      if (!currentHit && currentNames.length) {
        review.staleRoleCandidates.push({ collection, id: row.id || null, name: rowName(row), roleTitle: row.roleTitle || null, countryCode: target.code, currentHolderNames: currentNames, action: 'review_mark_former_or_replace_slot' });
      }
    }
  }

  const patch = {
    generatedAt: review.generatedAt,
    status: 'manual_review_required',
    policy: 'This workflow does not mass-replace people. It proposes current-holder changes only from active Wikidata claims without end dates.',
    addOrPromoteCandidates: review.addOrPromoteCandidates,
    staleRoleCandidates: review.staleRoleCandidates,
    warnings: review.warnings
  };

  fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2) + '\n');
  fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + '\n');

  const summary = [
    '# ParleyMap safe roster review', '',
    `Generated: ${review.generatedAt}`,
    `Status: ${review.status}`, '',
    `Checked countries: ${review.checkedCountries.length}`,
    `Add/promote candidates: ${review.addOrPromoteCandidates.length}`,
    `Stale role candidates: ${review.staleRoleCandidates.length}`,
    `Warnings: ${review.warnings.length}`,
    ''
  ].join('\n');
  fs.writeFileSync(SUMMARY_PATH, summary);
  console.log(JSON.stringify({ status: review.status, addOrPromote: review.addOrPromoteCandidates.length, stale: review.staleRoleCandidates.length }, null, 2));
}

main().catch((error) => { console.error(error.stack || error.message || error); process.exit(1); });
