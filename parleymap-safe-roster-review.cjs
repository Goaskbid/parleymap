#!/usr/bin/env node
const fs = require('fs');
const REPORT_DIR = 'data/diagnostics';
fs.mkdirSync(REPORT_DIR, {recursive:true});
const report = {
  generatedAt: new Date().toISOString(),
  status: 'safe_roster_review_only',
  note: 'This workflow does not auto-replace people. It only creates review placeholders. Current-holder updates must pass a separate human review to avoid historical chains and mass roster pollution.',
  limits: {
    autoPeopleAdditions: 0,
    autoRosterReplacements: 0,
    maximumSuggestedReplacementsBeforeHumanReview: 3
  },
  candidates: []
};
fs.writeFileSync(`${REPORT_DIR}/roster-current-holder-review.json`, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(`${REPORT_DIR}/roster-patch-candidates.json`, JSON.stringify({generatedAt:report.generatedAt,status:'manual_review_required',candidates:[]}, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
