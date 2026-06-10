import fs from 'node:fs';

const INDEX_PATH = 'index.html';
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = '</' + 'script>';

function extract() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const start = html.indexOf(OPEN);
  if (start === -1) throw new Error('demo-data opening tag not found in index.html');
  const jsonStart = start + OPEN.length;
  const end = html.indexOf(CLOSE, jsonStart);
  if (end === -1) throw new Error('demo-data closing tag not found in index.html');
  return JSON.parse(html.slice(jsonStart, end).trim());
}

const data = extract();
const requiredTopLevel = [
  'meta','categories','people','appearances','roster','topRoster','expansionRoster'
];
for (const key of requiredTopLevel) {
  if (!(key in data)) throw new Error(`missing top-level key ${key}`);
}
for (const key of ['categories','people','appearances','roster','expansionRoster']) {
  if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
}
const minimums = { people: 90, roster: 190, expansionRoster: 100, appearances: 500, categories: 10 };
for (const [key, min] of Object.entries(minimums)) {
  if (data[key].length < min) throw new Error(`${key} count too low: ${data[key].length} < ${min}`);
}
const firstAppearance = data.appearances[0] || {};
for (const key of ['id','personId','startsAt','title','location','sourcePack']) {
  if (!(key in firstAppearance)) throw new Error(`appearance schema missing ${key}`);
}
console.log(JSON.stringify({
  status: 'validation_passed',
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length,
  version: data.meta?.version || null,
  lastDataUpdate: data.meta?.lastDataUpdate || null
}, null, 2));
