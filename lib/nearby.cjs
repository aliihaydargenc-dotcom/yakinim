const ENDPOINTS = ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter"];

function buildNearbyQuery(location, radius) {
  const area = `around:${radius},${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
  return `[out:json][timeout:12];(nwr(${area})[amenity~"^(cafe|restaurant|fast_food|pharmacy|atm|hospital|clinic|doctors|fuel|parking)$"];nwr(${area})[shop~"^(supermarket|convenience|greengrocer|bakery|mall|department_store|clothes)$"];nwr(${area})[leisure=park];);out center tags;`;
}

async function queryNearby(location, radius, fetcher = fetch) {
  const query = buildNearbyQuery(location, radius);
  const failures = [];
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "Yakinim/2.0.2 (+https://yakinim.vercel.app)" },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.elements) || payload.remark) throw new Error("Incomplete response");
      return { elements: payload.elements, source: "OpenStreetMap", provider: new URL(endpoint).hostname };
    } catch (error) {
      failures.push(`${new URL(endpoint).hostname}: ${error.name === "AbortError" ? "timeout" : error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(failures.join("; "));
}
module.exports = { buildNearbyQuery, queryNearby };
