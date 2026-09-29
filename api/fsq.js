const PMTILES_URL = "https://fsq-os-places-us-east-1.s3.us-east-1.amazonaws.com/release/vector-tiles/latest/fsq-os-places.pmtiles";
const TILE_ZOOM = 14;
const DEFAULT_RADIUS_M = 4500;
const MAX_RADIUS_M = 5000;
const MAX_TILES = 36;
const TILE_CONCURRENCY = 6;
const MAX_RESULTS = 300;

let modulesPromise;
let archivePromise;

function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function normalizeCategoryText(properties = {}) {
  return [properties.fsq_category_labels, properties.category_labels, properties.categories, properties.category]
    .filter(Boolean).map(String).join(" ").toLocaleLowerCase("en-US");
}
function categoryFromFsqProperties(properties = {}) {
  const text = normalizeCategoryText(properties);
  if (!text) return null;
  if (/\batm\b|cash machine/.test(text)) return "atm";
  if (/pharmacy|drugstore/.test(text)) return "pharmacy";
  if (/hospital|medical clinic|health clinic|urgent care|doctor/.test(text)) return "hospital";
  if (/gas station|petrol|fuel station/.test(text)) return "fuel";
  if (/parking/.test(text)) return "parking";
  if (/bakery|pastry/.test(text)) return "bakery";
  if (/fruit.*vegetable|vegetable.*fruit|greengrocer|produce market|farmers market/.test(text)) return "greengrocer";
  if (/supermarket|grocery|convenience store|food market/.test(text)) return "market";
  if (/\bcafe\b|coffee shop|tea room/.test(text)) return "cafe";
  if (/restaurant|fast food|burger|pizza|kebab|steakhouse|seafood|sushi|diner|food court/.test(text)) return "food";
  if (/shopping mall|department store|clothing store|apparel|shoe store/.test(text)) return "shopping";
  if (/\bpark\b|public garden/.test(text)) return "park";
  return null;
}
function distanceMeters(lat1, lng1, lat2, lng2) {
  const r = 6371000; const p1 = lat1 * Math.PI / 180; const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180; const dl = (lng2 - lng1) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function lonToTileX(lon, zoom) { return Math.floor(((lon + 180) / 360) * (2 ** zoom)); }
function latToTileY(lat, zoom) {
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = safeLat * Math.PI / 180; const n = 2 ** zoom;
  return Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * n);
}
function buildTileList(lat, lng, radiusM = DEFAULT_RADIUS_M, zoom = TILE_ZOOM) {
  const radius = Math.max(500, Math.min(MAX_RADIUS_M, Number(radiusM) || DEFAULT_RADIUS_M));
  const latDelta = radius / 111320; const cosLat = Math.max(0.25, Math.cos(lat * Math.PI / 180));
  const lngDelta = radius / (111320 * cosLat);
  const minX = lonToTileX(lng - lngDelta, zoom), maxX = lonToTileX(lng + lngDelta, zoom);
  const minY = latToTileY(lat + latDelta, zoom), maxY = latToTileY(lat - latDelta, zoom);
  const tiles = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) tiles.push({ z: zoom, x, y });
  const centerX = lonToTileX(lng, zoom), centerY = latToTileY(lat, zoom);
  tiles.sort((a, b) => (Math.abs(a.x - centerX) + Math.abs(a.y - centerY)) - (Math.abs(b.x - centerX) + Math.abs(b.y - centerY)));
  return tiles.slice(0, MAX_TILES);
}
function addressFromProperties(properties = {}) {
  const parts = [properties.address, properties.locality, properties.region].map(cleanText).filter(Boolean);
  return [...new Set(parts)].join(", ") || "Adres bilgisi yok";
}
function loadModules() {
  if (!modulesPromise) modulesPromise = Promise.all([import("pmtiles"), import("@mapbox/vector-tile"), import("pbf")]);
  return modulesPromise;
}
async function getArchive() {
  if (!archivePromise) archivePromise = loadModules().then(([pmtiles]) => new pmtiles.PMTiles(PMTILES_URL));
  return archivePromise;
}
async function readTile(tile, origin, radiusM) {
  const [[, vectorTileModule, pbfModule], archive] = await Promise.all([loadModules(), getArchive()]);
  const response = await archive.getZxy(tile.z, tile.x, tile.y);
  if (!response || !response.data) return { ok: true, places: [] };
  const Reader = pbfModule.PbfReader || pbfModule.default;
  if (!Reader) throw new Error("pbf_reader_unavailable");
  const parsed = new vectorTileModule.VectorTile(new Reader(new Uint8Array(response.data)));
  const places = [];
  for (const layer of Object.values(parsed.layers || {})) {
    for (let index = 0; index < layer.length; index += 1) {
      const feature = layer.feature(index); const properties = feature.properties || {};
      if (cleanText(properties.date_closed)) continue;
      const category = categoryFromFsqProperties(properties); const name = cleanText(properties.name);
      if (!category || !name) continue;
      const geojson = feature.toGeoJSON(tile.x, tile.y, tile.z);
      if (!geojson.geometry || geojson.geometry.type !== "Point") continue;
      const [lng, lat] = geojson.geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const distanceM = Math.round(distanceMeters(origin.lat, origin.lng, lat, lng));
      if (distanceM > radiusM * 1.12) continue;
      const placeId = cleanText(properties.fsq_place_id) || String(feature.id || `${tile.z}:${tile.x}:${tile.y}:${index}`);
      places.push({ id: `fsq:${placeId}`, name, category, lat, lng, address: addressFromProperties(properties), phone: cleanText(properties.tel || properties.phone) || undefined, distanceM, source: "fsq" });
    }
  }
  return { ok: true, places };
}
function dedupeFsqPlaces(places) {
  const byId = new Map(); for (const place of places) if (!byId.has(place.id)) byId.set(place.id, place);
  return [...byId.values()].sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity)).slice(0, MAX_RESULTS);
}
async function queryFsqPlaces(lat, lng, radiusM = DEFAULT_RADIUS_M) {
  const radius = Math.max(500, Math.min(MAX_RADIUS_M, Number(radiusM) || DEFAULT_RADIUS_M));
  const tiles = buildTileList(lat, lng, radius, TILE_ZOOM); const places = []; let cursor = 0; let successfulTiles = 0; let lastError = null;
  async function worker() {
    while (cursor < tiles.length) {
      const tile = tiles[cursor++];
      try { const result = await readTile(tile, { lat, lng }, radius); successfulTiles += 1; places.push(...result.places); }
      catch (error) { lastError = error instanceof Error ? error.message : String(error); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(TILE_CONCURRENCY, tiles.length) }, () => worker()));
  if (!successfulTiles) throw new Error(`fsq_tiles_unavailable:${lastError || "unknown"}`);
  return { places: dedupeFsqPlaces(places), tileCount: tiles.length, successfulTiles };
}
async function probeSource() {
  const response = await fetch(PMTILES_URL, { headers: { Range: "bytes=0-255" } });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    contentRange: response.headers.get("content-range"),
    acceptRanges: response.headers.get("accept-ranges"),
    contentLength: response.headers.get("content-length"),
    firstBytes: [...bytes.slice(0, 8)],
  };
}
async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const requestUrl = new URL(req.url, "https://yakinim.local");
  if (requestUrl.searchParams.get("probe") === "1") {
    try { return res.status(200).json(await probeSource()); }
    catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : String(error) }); }
  }
  const lat = Number(requestUrl.searchParams.get("lat")); const lng = Number(requestUrl.searchParams.get("lng"));
  const radius = Math.max(500, Math.min(MAX_RADIUS_M, Number(requestUrl.searchParams.get("radius")) || DEFAULT_RADIUS_M));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ error: "invalid_coordinates" });
  try {
    const result = await queryFsqPlaces(lat, lng, radius);
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.setHeader("X-Yakinim-Places-Source", "foursquare-os-places");
    return res.status(200).json({ places: result.places, source: "Foursquare OS Places", tileCount: result.tileCount, successfulTiles: result.successfulTiles });
  } catch (error) {
    console.warn("FSQ places unavailable:", error instanceof Error ? error.message : String(error));
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "fsq_unavailable" });
  }
}

module.exports = handler;
module.exports.PMTILES_URL = PMTILES_URL;
module.exports.TILE_ZOOM = TILE_ZOOM;
module.exports.DEFAULT_RADIUS_M = DEFAULT_RADIUS_M;
module.exports.MAX_RADIUS_M = MAX_RADIUS_M;
module.exports.categoryFromFsqProperties = categoryFromFsqProperties;
module.exports.buildTileList = buildTileList;
module.exports.queryFsqPlaces = queryFsqPlaces;
