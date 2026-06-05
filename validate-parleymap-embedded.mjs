import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script\b[^>]*id=["']demo-data["'][^>]*>([\s\S]*?)<\/script>/i);
if (!match) throw new Error("demo-data script block not found");
const data = JSON.parse(match[1].trim());

const minimums = { people: 90, roster: 190, expansionRoster: 100, appearances: 500, categories: 10 };
for (const [key, min] of Object.entries(minimums)) {
  if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  if (data[key].length < min) throw new Error(`${key} count too low: ${data[key].length}`);
}
if (!data.meta || typeof data.meta !== "object" || Array.isArray(data.meta)) throw new Error("meta must be an object");
if (!data.appearances[0]?.id || !data.appearances[0]?.personId || !data.appearances[0]?.location) throw new Error("appearance schema failed basic validation");
console.log(JSON.stringify({ status: "embedded_dataset_valid", counts: Object.fromEntries(Object.keys(minimums).map((key) => [key, data[key].length])), anchorOverrides: Object.keys(data.anchorOverrides || {}) }, null, 2));
