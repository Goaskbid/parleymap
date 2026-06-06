#!/usr/bin/env node
import fs from 'node:fs';
import './parleymap-final-stabilize.mjs';

fs.mkdirSync('data/diagnostics', { recursive: true });
const review = {
  generatedAt: new Date().toISOString(),
  status: 'safe_review_only',
  note: 'Roster auto-replacement is disabled from direct mass mutation. Current-holder changes are reviewed and capped before any future apply step.',
  safetyRules: [
    'No historical office-holder chains.',
    'No more than 3 roster replacements in one run.',
    'No more than 3 people additions in one run.',
    'No people count above 115.',
    'No appearance, roster, expansionRoster, or category count changes without explicit approval.'
  ],
  candidates: []
};
const patch = {
  generatedAt: review.generatedAt,
  status: 'manual_review_required',
  replacements: [],
  additions: [],
  note: 'This run intentionally does not auto-replace people. It prevents another Vincent Auriol / historical-chain incident.'
};
fs.writeFileSync('data/diagnostics/roster-current-holder-review.json', JSON.stringify(review, null, 2) + '\n');
fs.writeFileSync('data/diagnostics/roster-patch-candidates.json', JSON.stringify(patch, null, 2) + '\n');
console.log(JSON.stringify(review, null, 2));
