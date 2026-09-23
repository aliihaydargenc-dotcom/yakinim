const ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.maprva.org/api/interpreter",
];
const PROVIDER_TIMEOUT_MS = 2600;
const GRID_DEGREES = 0.01;
const MAX_SPAN_DEGREES = 0.12;

function canonicalizeViewport(input) {
  const south = Number(input.south);
  const west = Number(input.west);
  const north = Number(input.north);
  const east = Number(input.east);
  if (![south, west, north, east].every(Number.isFinite)) throw new Error("invalid_bbox");
  if (south < -90 || north > 90 || west < -180 || east > 180 || north <= south || east <= west) throw new Error("invalid_bbox");

  const snapDown = value => Math.floor(value / GRID_DEGREES) * GRID_DEGREES;
  const snapUp = value => Math.ceil(value / GRID_DEGREES) * GRID_DEGREES;
  const viewport = {
    south: Number(snapDown(south).toFixed(3)),
    west: Number(snapDown(west).toFixed(3)),
    north: Number(snapUp(north).toFixed(3)),
    east: Number(snapUp(east).toFixed(3)),
  };
  if (viewport.north - viewport.south > MAX_SPAN_DEGREES || viewport.east - viewport.west > MAX_SPAN_DEGREES) throw new Error("bbox_too_large");
  return viewport;
}

function viewportKey(viewport) {
  return [viewport.south, viewport.west, viewport.north, viewport.east].join(":");
}

function buildViewportQuery(viewport) {
  const bbox = [viewport.south, viewport.west, viewport.north, viewport.east].join(",");
  return `[out:json][timeout:5];(nwr["amenity"~"^(cafe|restaurant|fast_food|pharmacy|atm|hospital|clinic|doctors|fuel|parking)$"](${bbox});nwr["shop"~"^(supermarket|convenience|greengrocer|bakery|mall|department_store|clothes)$"](${bbox});nwr["leisure"="park"](${bbox}););out center tags qt;`;
}

async function queryViewport(viewport, fetcher = fetch) {
  const query = buildViewportQuery(viewport);
  const failures = [];
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "Yakinim/2.11.1 (+https://yakinim.vercel.app)",
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.elements) || payload.remark) throw new Error("Incomplete response");
      return {
        elements: payload.elements,
        source: "OpenStreetMap",
        provider: new URL(endpoint).hostname,
        viewport,
      };
    } catch (error) {
      failures.push(`${new URL(endpoint).hostname}: ${error.name === "AbortError" ? "timeout" : error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(failures.join("; ") || "viewport_unavailable");
}

module.exports = {
  ENDPOINTS,
  PROVIDER_TIMEOUT_MS,
  GRID_DEGREES,
  MAX_SPAN_DEGREES,
  canonicalizeViewport,
  viewportKey,
  buildViewportQuery,
  queryViewport,
};
