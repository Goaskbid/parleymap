import fs from 'node:fs';

const INDEX_PATH = 'index.html';
const DIAG_DIR = 'data/diagnostics';
const REPORT_PATH = `${DIAG_DIR}/repair-report.json`;
const SUMMARY_PATH = `${DIAG_DIR}/LATEST_RUN_SUMMARY.md`;
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';

function readEmbeddedDataset() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const openIndex = html.indexOf(OPEN_TAG);
  if (openIndex === -1) throw new Error('demo-data opening tag not found in index.html');

  const jsonStart = openIndex + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error('demo-data closing tag not found in index.html');

  const jsonText = html.slice(jsonStart, jsonEnd).trim();
  const data = JSON.parse(jsonText);
  return { data, jsonLength: jsonText.length, htmlLength: html.length };
}

function count(value) {
  return Array.isArray(value) ? value.length : null;
}

function sampleKeys(value) {
  return Array.isArray(value) && value[0] && typeof value[0] === 'object'
    ? Object.keys(value[0])
    : null;
}

function assertSafeShape(data) {
  const requiredArrays = ['people', 'roster', 'expansionRoster', 'appearances', 'categories'];
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }

  const minimumCounts = {
    people: 90,
    roster: 190,
    expansionRoster: 100,
    appearances: 500,
    categories: 10
  };

  for (const [key, min] of Object.entries(minimumCounts)) {
    if (data[key].length < min) {
      throw new Error(`${key} count too low. Expected at least ${min}, got ${data[key].length}`);
    }
  }

  if (!data.meta || typeof data.meta !== 'object' || Array.isArray(data.meta)) {
    throw new Error('meta must be an object');
  }
}

function findProblemSignals(data) {
  const signals = {
    grossiLikeRows: [],
    popeLikeRows: [],
    fakeWatchRows: []
  };

  const fakeTitleRe = /(?:iaea nuclear diplomacy watch|city of london finance diplomacy watch|think-tank leadership events watch|royal diaries and state-visit watch)/i;

  function textFor(value) {
    if (!value || typeof value !== 'object') return '';
    return [
      value.id,
      value.slug,
      value.name,
      value.canonicalName,
      value.title,
      value.summary,
      value.roleTitle,
      value.organization,
      value.countryFocus,
      value.countryFocusCode,
      value.countryName,
      value.flagAudit?.code,
      value.flagAudit?.label
    ].filter(Boolean).join(' ');
  }

  function walk(value, path) {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      value.forEach((child, index) => walk(child, `${path}[${index}]`));
      return;
    }

    const text = textFor(value);
    const lower = text.toLowerCase();

    if (lower.includes('rafael grossi') || lower.includes('rafael-grossi')) {
      signals.grossiLikeRows.push({
        path,
        id: value.id || null,
        title: value.title || null,
        name: value.canonicalName || value.name || null,
        countryFocusCode: value.countryFocusCode || null,
        flagAuditCode: value.flagAudit?.code || null,
        city: value.homeBases?.[0]?.city || value.location?.city || null
      });
    }

    if (lower.includes('pope leo xiv') || lower.includes('pope-leo-xiv')) {
      signals.popeLikeRows.push({
        path,
        id: value.id || null,
        title: value.title || null,
        name: value.canonicalName || value.name || null,
        countryFocusCode: value.countryFocusCode || null,
        flagAuditCode: value.flagAudit?.code || null,
        city: value.homeBases?.[0]?.city || value.location?.city || null
      });
    }

    if (fakeTitleRe.test(text)) {
      signals.fakeWatchRows.push({
        path,
        id: value.id || null,
        title: value.title || null,
        status: value.status || null,
        startsAt: value.startsAt || null,
        city: value.location?.city || null
      });
    }

    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object') walk(child, `${path}.${key}`);
    }
  }

  walk(data, 'data');
  return signals;
}

fs.mkdirSync(DIAG_DIR, { recursive: true });

const { data, jsonLength, htmlLength } = readEmbeddedDataset();
assertSafeShape(data);
const signals = findProblemSignals(data);

const report = {
  generatedAt: new Date().toISOString(),
  status: 'diagnostics_only_no_live_data_written',
  note: 'This stable repair script intentionally does not modify index.html. It restores nightly reliability and records exact remaining problem signals.',
  htmlLength,
  embeddedJsonLength: jsonLength,
  topLevelKeys: Object.keys(data),
  counts: {
    people: count(data.people),
    roster: count(data.roster),
    topRoster: count(data.topRoster),
    expansionRoster: count(data.expansionRoster),
    appearances: count(data.appearances),
    categories: count(data.categories)
  },
  sampleKeys: {
    people: sampleKeys(data.people),
    roster: sampleKeys(data.roster),
    topRoster: sampleKeys(data.topRoster),
    expansionRoster: sampleKeys(data.expansionRoster),
    appearances: sampleKeys(data.appearances)
  },
  problemSignals: signals
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(SUMMARY_PATH, `# ParleyMap stable nightly diagnostics\n\nStatus: ${report.status}\n\n## Counts\n\n- people: ${report.counts.people}\n- roster: ${report.counts.roster}\n- topRoster: ${report.counts.topRoster}\n- expansionRoster: ${report.counts.expansionRoster}\n- appearances: ${report.counts.appearances}\n- categories: ${report.counts.categories}\n\n## Remaining problem signals\n\n- Grossi-like rows: ${signals.grossiLikeRows.length}\n- Pope-like rows: ${signals.popeLikeRows.length}\n- fake watch rows: ${signals.fakeWatchRows.length}\n\nThis run did not change index.html.\n`);

console.log(JSON.stringify(report, null, 2));
