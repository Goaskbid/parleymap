export function buildGdeltDocUrl({ query, timespan = "72h", maxrecords = 50, sort = "datedesc" } = {}) {
  if (!query) throw new Error("GDELT query is required");
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: String(Math.max(1, Math.min(250, Number(maxrecords) || 50))),
    sort
  });
  if (timespan) params.set("timespan", timespan);
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
}

export function personDiscoveryQuery(person) {
  const name = person?.canonicalName || person?.name;
  if (!name) throw new Error("Person name is required");
  const topicTerms = [
    "meeting", "met", "visit", "summit", "conference", "address", "remarks", "delegation", "bilateral", "official"
  ];
  return `"${name}" (${topicTerms.join(" OR ")})`;
}

export async function fetchGdeltDoc(fetchImpl, options) {
  const fn = fetchImpl || globalThis.fetch;
  if (!fn) throw new Error("fetch is not available");
  const url = buildGdeltDocUrl(options);
  const response = await fn(url, { headers: { "User-Agent": "ParleyMapCrawler/2.4 (+public-source OSINT)" } });
  if (!response.ok) throw new Error(`GDELT request failed ${response.status}`);
  const json = await response.json();
  return normalizeGdeltItems(json, url);
}

export function normalizeGdeltItems(json, requestUrl = "") {
  const items = Array.isArray(json?.items) ? json.items : Array.isArray(json?.articles) ? json.articles : [];
  return items.map((item, index) => ({
    id: `gdelt-${hash(`${item.url || item.link || ""}-${item.title || ""}-${index}`)}`,
    title: item.title || item.name || "Untitled public lead",
    url: item.url || item.link || "",
    sourceCountry: item.sourceCountry || item.domain || "",
    publishedAt: item.seendate || item.date || item.published || null,
    requestUrl,
    verificationLevel: "Reported",
    sourceType: "discovery"
  })).filter((item) => item.url);
}

function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
