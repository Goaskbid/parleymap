import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("data/demo.json", "utf8"));
const errors = [];
const warnings = [];
const people = new Map((data.people || []).map((person) => [person.id, person]));
const appearances = new Map((data.appearances || []).map((appearance) => [appearance.id, appearance]));
const categories = new Set((data.categories || []).map((category) => category.id));

for (const person of data.people || []) {
  for (const field of ["id", "slug", "canonicalName", "category", "roleTitle", "organization", "orgType", "sector", "industry", "shortBio", "orgIcon"]) {
    if (!person[field]) errors.push(`Person ${person.id || "unknown"} missing ${field}`);
  }
  if (!categories.has(person.category)) errors.push(`Person ${person.id} uses unknown category ${person.category}`);
  if (!Number.isFinite(person.prominenceScore)) errors.push(`Person ${person.id} missing numeric prominenceScore`);
}

for (const appearance of data.appearances || []) {
  if (!people.has(appearance.personId)) errors.push(`Appearance ${appearance.id} has unknown personId ${appearance.personId}`);
  if (!Number.isFinite(appearance.location?.lat) || !Number.isFinite(appearance.location?.lng)) errors.push(`Appearance ${appearance.id} missing coordinates`);
  if (!appearance.location?.city || !appearance.location?.countryCode) errors.push(`Appearance ${appearance.id} missing city/country`);
  if (!Array.isArray(appearance.sourcePack) || appearance.sourcePack.length === 0) errors.push(`Appearance ${appearance.id} has no sourcePack records`);
  if (!Date.parse(appearance.startsAt)) errors.push(`Appearance ${appearance.id} has invalid startsAt`);
  if (!appearance.eventGroupId) errors.push(`Appearance ${appearance.id} missing eventGroupId`);
  if (!Array.isArray(appearance.topics)) errors.push(`Appearance ${appearance.id} missing topics array`);
  if (appearance.status === "ANNOUNCED_FUTURE" && appearance.location?.precision !== "city") {
    errors.push(`Future appearance ${appearance.id} must default to city precision in this prototype`);
  }
  if (appearance.location?.label && /hotel|hospital|residence|private|home/i.test(appearance.location.label)) {
    errors.push(`Appearance ${appearance.id} appears to use a sensitive/private location label`);
  }
  if (appearance.sourcePack?.some((source) => !source.url || !source.label || !source.type)) {
    errors.push(`Appearance ${appearance.id} has incomplete sourcePack entry`);
  }
  if (appearance.visual && !appearance.visual.license) warnings.push(`Appearance ${appearance.id} visual metadata lacks license`);
}

for (const item of data.roster || []) {
  for (const field of ["rank", "id", "name", "wikiTitle", "wikidataId", "profileUrl", "region", "country", "bucket", "sector", "organization", "trackingStatus"]) {
    if (!item[field]) errors.push(`Roster item ${item.id || item.name || "unknown"} missing ${field}`);
  }
  if (item.rank <= 4 && !item.imageUrl) errors.push(`Top-four roster item ${item.name} missing direct imageUrl`);
}
if ((data.roster || []).length !== 200) errors.push(`Expected exactly 200 roster items, got ${(data.roster || []).length}`);

for (const encounter of data.encounters || []) {
  for (const id of encounter.participantIds || []) {
    if (!people.has(id)) errors.push(`Encounter ${encounter.id} has unknown participant ${id}`);
  }
  for (const id of encounter.appearanceIds || []) {
    if (!appearances.has(id)) errors.push(`Encounter ${encounter.id} has unknown appearance ${id}`);
  }
  if (!encounter.location?.city) errors.push(`Encounter ${encounter.id} missing location`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (warnings.length) {
  console.warn(warnings.join("\n"));
}
console.log(`Valid demo data: ${data.people.length} people, ${data.appearances.length} appearances, ${data.encounters.length} encounters, ${(data.roster || []).length} roster seeds.`);
