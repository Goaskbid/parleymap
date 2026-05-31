export async function fetchPortraitBatch(fetchImpl, titles, thumbSize = 180) {
  const fn = fetchImpl || globalThis.fetch;
  if (!fn) throw new Error("fetch is not available");
  const clean = Array.from(new Set((titles || []).filter(Boolean))).slice(0, 50);
  if (!clean.length) return new Map();
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    redirects: "1",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: String(thumbSize),
    titles: clean.join("|")
  });
  const url = `https://en.wikipedia.org/w/api.php?${params.toString()}`;
  const response = await fn(url, { headers: { "User-Agent": "ParleyMapCrawler/2.4 (+public-source OSINT)" } });
  if (!response.ok) throw new Error(`Wikimedia portrait request failed ${response.status}`);
  const payload = await response.json();
  const result = new Map();
  const alias = new Map();
  (payload.query?.normalized || []).forEach((item) => alias.set(item.from, item.to));
  (payload.query?.redirects || []).forEach((item) => alias.set(item.from, item.to));
  Object.values(payload.query?.pages || {}).forEach((page) => {
    if (page?.title) result.set(page.title, page.thumbnail?.source || "");
  });
  clean.forEach((title) => {
    const resolved = alias.get(title) || title;
    if (!result.has(title)) result.set(title, result.get(resolved) || "");
  });
  return result;
}
