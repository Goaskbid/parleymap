import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/strict-crawler-audit-report.json";

const CANDIDATE_PATHS = [
  "data/crawler/publishable-appearances.json",
  "data/crawler/quality-approved-appearances.json"
];

const REJECTED_PATH = "data/crawler/rejected-appearances.json";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const GENERIC_PAGE_RE = /\b(faq|foire aux questions|frequently asked|programme|program|programmation|cultural|culturel|organiser|organizer|fact sheet|privacy|terms|search|sitemap|cookie|home page|message de m\.|allocution de m\.|intervention de m\.)\b/i;

const HISTORICAL_SOURCE_PERSON_SLUGS = new Set([
  "jacques-chirac",
  "francois-hollande",
  "nicolas-sarkozy"
]);

function readEmbeddedData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);

  if (start === -1) throw new Error("demo-data opening tag not found");

  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);

  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");

  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());

  return { html, jsonStart, jsonEnd, data };
}

function writeEmbeddedData(payload, data) {
  const nextHtml =
    payload.html.slice(0, payload.jsonStart) +
    "\n" +
    JSON.stringify(data, null, 2) +
    "\n" +
    payload.html.slice(payload.jsonEnd);

  fs.writeFileSync(INDEX_PATH, nextHtml);
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return norm(value).replace(/ /g, "-");
}

function sourceUrls(item) {
  return Array.isArray(item.sourcePack)
    ? item.sourcePack.map((source) => source.url || "").filter(Boolean)
    : [];
}

function titleSummaryText(item) {
  return [item.title, item.summary].join(" ");
}

function sourceText(item) {
  return [item.title, item.summary, ...sourceUrls(item)].join(" ");
}

function extractYears(text) {
  const matches = String(text).match(/\b(19[0-9]{2}|20[0-9]{2})\b/g) || [];
  return [...new Set(matches.map(Number))];
}

function personNameFromData(data, item) {
  if (item.personName) return item.personName;

  const id = item.personId;
  const person = Array.isArray(data.people)
    ? data.people.find((p) => p.id === id)
    : null;

  return person?.canonicalName || person?.name || "";
}

function personEvidenceOk(data, item) {
  const name = personNameFromData(data, item);
  const text = norm(titleSummaryText(item));

  if (!name || !text) return false;

  const nameNorm = norm(name);

  if (text.includes(nameNorm)) return true;

  const tokens = nameNorm
    .split(" ")
    .filter((token) => token.length >= 4)
    .filter((token) => !["president", "prime", "minister", "secretary", "general"].includes(token));

  return tokens.some((token) => text.includes(token));
}

function sourcePersonConflict(data, item) {
  const personSlug = slug(personNameFromData(data, item));

  for (const url of sourceUrls(item)) {
    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      continue;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    const sourcePersonSlug = parts[0];

    if (!sourcePersonSlug) continue;

    if (
      HISTORICAL_SOURCE_PERSON_SLUGS.has(sourcePersonSlug) &&
      !personSlug.includes(sourcePersonSlug)
    ) {
      return true;
    }
  }

  return false;
}

function dateConflict(item) {
  const startsYear = new Date(item.startsAt).getUTCFullYear();

  if (!Number.isFinite(startsYear)) return true;

  const years = extractYears(sourceText(item));

  if (years.length === 0) return false;

  const latestSourceYear = Math.max(...years);

  return latestSourceYear < startsYear - 1;
}

function locationEvidenceOk(item) {
  const text = norm(sourceText(item));
  const city = norm(item.location?.city || "");
  const country = norm(item.location?.countryName || "");

  if (city && text.includes(city)) return true;
  if (country && text.includes(country)) return true;

  return false;
}

function qualityReasons(data, item) {
  const reasons = [];

  if (!item || typeof item !== "object") return ["not_an_object"];

  if (!item.id) reasons.push("missing_id");
  if (!item.personId) reasons.push("missing_personId");
  if (!item.startsAt || Number.isNaN(Date.parse(item.startsAt))) reasons.push("bad_or_missing_date");
  if (!item.title) reasons.push("missing_title");
  if (!item.location || typeof item.location !== "object") reasons.push("missing_location");
  if (!Array.isArray(item.sourcePack) || item.sourcePack.length === 0) reasons.push("missing_sourcePack");

  if (GENERIC_PAGE_RE.test(sourceText(item))) reasons.push("generic_or_archive_page");
  if (!personEvidenceOk(data, item)) reasons.push("person_not_in_title_or_summary");
  if (sourcePersonConflict(data, item)) reasons.push("source_person_conflicts_with_candidate_person");
  if (dateConflict(item)) reasons.push("source_date_conflicts_with_candidate_date");
  if (!locationEvidenceOk(item)) reasons.push("location_not_clearly_evidenced");

  return reasons;
}

function readJsonArray(path) {
  if (!fs.existsSync(path)) return [];

  const raw = JSON.parse(fs.readFileSync(path, "utf8"));

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.appearances)) return raw.appearances;
  if (Array.isArray(raw.publishableAppearances)) return raw.publishableAppearances;
  if (Array.isArray(raw.records)) return raw.records;

  return [];
}

function writeJsonArray(path, rows) {
  fs.mkdirSync(path.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.writeFileSync(path, JSON.stringify(rows, null, 2) + "\n");
}

function rejectShape(data, item, reasons) {
  return {
    id: item?.id || null,
    personId: item?.personId || null,
    personName: personNameFromData(data, item),
    title: item?.title || null,
    city: item?.location?.city || null,
    sourceUrl: sourceUrls(item)[0] || null,
    reasons
  };
}

function isCrawlerRecord(item) {
  return Boolean(
    item &&
    typeof item === "object" &&
    (
      String(item.id || "").startsWith("crawl-") ||
      item.crawler
    )
  );
}

function validateCounts(data) {
  if (!Array.isArray(data.people) || data.people.length < 90) throw new Error("people count too low");
  if (!Array.isArray(data.roster) || data.roster.length < 190) throw new Error("roster count too low");
  if (!Array.isArray(data.expansionRoster) || data.expansionRoster.length < 100) throw new Error("expansionRoster count too low");
  if (!Array.isArray(data.appearances) || data.appearances.length < 500) throw new Error("appearances count too low");
  if (!Array.isArray(data.categories) || data.categories.length < 10) throw new Error("categories count too low");
}

fs.mkdirSync("data/crawler", { recursive: true });
fs.mkdirSync("data/diagnostics", { recursive: true });

const payload = readEmbeddedData();
const data = payload.data;

validateCounts(data);

const before = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

const removedFromIndex = [];
const rejected = readJsonArray(REJECTED_PATH);

data.appearances = data.appearances.filter((item) => {
  if (!isCrawlerRecord(item)) return true;

  const reasons = qualityReasons(data, item);

  if (reasons.length === 0) return true;

  const rejectedItem = rejectShape(data, item, reasons);
  removedFromIndex.push(rejectedItem);
  rejected.push(rejectedItem);

  return false;
});

for (const path of CANDIDATE_PATHS) {
  const rows = readJsonArray(path);
  const approvedRows = [];

  for (const row of rows) {
    const reasons = qualityReasons(data, row);

    if (reasons.length === 0) {
      approvedRows.push(row);
    } else {
      rejected.push(rejectShape(data, row, reasons));
    }
  }

  writeJsonArray(path, approvedRows);
}

const uniqueRejected = [];
const seenRejected = new Set();

for (const item of rejected) {
  const key = item.id || JSON.stringify(item);

  if (seenRejected.has(key)) continue;

  seenRejected.add(key);
  uniqueRejected.push(item);
}

writeJsonArray(REJECTED_PATH, uniqueRejected);

data.meta = {
  ...data.meta,
  lastStrictCrawlerAudit: new Date().toISOString()
};

validateCounts(data);
writeEmbeddedData(payload, data);

const after = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

const report = {
  generatedAt: new Date().toISOString(),
  before,
  after,
  removedFromIndex,
  rejectedCrawlerRowsTotal: uniqueRejected.length,
  status: "strict_crawler_audit_complete"
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
