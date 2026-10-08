const PMTILES_URL = "https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/2026-09-23.1/places.pmtiles";
const TILE_ZOOM = 14;
const DEFAULT_RADIUS_M = 4500;
const MAX_RADIUS_M = 5000;
const MAX_TILES = 36;
const TILE_CONCURRENCY = 6;
const MAX_RESULTS = 300;
const MIN_CONFIDENCE = 0.55;
const MARKET_NAME_EXCLUSIONS = require('../lib/market-name-exclusions.json').map(pattern => new RegExp(pattern, 'iu'));
const EXCLUDED_PLACE_IDS = new Set(require('../lib/place-exclusions.json').map(place => place.id));

let modulesPromise;
let archivePromise;

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseJson(value, fallback) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || !value.trim()) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function taxonomyText(properties = {}) {
  const taxonomy = parseJson(properties.taxonomy, null);
  if (taxonomy && typeof taxonomy === "object") {
    return [taxonomy.primary, ...(Array.isArray(taxonomy.hierarchy) ? taxonomy.hierarchy : [])]
      .filter(Boolean).join(" ");
  }
  return cleanText(properties.taxonomy);
}

function categoryText(properties = {}) {
  return [
    properties.basic_category,
    taxonomyText(properties),
    properties.category,
    properties.categories,
  ].filter(Boolean).join(" ").replaceAll('_', ' ').toLocaleLowerCase("en-US");
}

function categoryFromOvertureProperties(properties = {}) {
  const text = categoryText(properties);
  if (!text) return null;
  if (/\batm\b|cash machine/.test(text)) return "atm";
  if (/pharmacy|drugstore/.test(text)) return "pharmacy";
  if (/hospital|medical clinic|health clinic|urgent care|doctor|medical center/.test(text)) return "hospital";
  if (/gas station|petrol|fuel station/.test(text)) return "fuel";
  if (/parking/.test(text)) return "parking";
  if (/bakery|pastry/.test(text)) return "bakery";
  if (/fruit.*vegetable|vegetable.*fruit|greengrocer|produce market|farmers market/.test(text)) return "greengrocer";
  if (/supermarket|grocery|convenience store|food market/.test(text)) {
    // Contradictory grocery records are excluded without inventing a category.
    const name = primaryName(properties).toLocaleLowerCase('tr');
    return MARKET_NAME_EXCLUSIONS.some(pattern => pattern.test(name)) ? null : "market";
  }
  if (/\bcafe\b|coffee shop|tea room|coffeehouse/.test(text)) return "cafe";
  if (/restaurant|fast food|burger|pizza|kebab|steakhouse|seafood|sushi|diner|food court|eatery/.test(text)) return "food";
  if (/shopping mall|department store|clothing store|apparel|shoe store/.test(text)) return "shopping";
  if (/\bpark\b|public garden/.test(text)) return "park";
  return null;
}

function primaryName(properties = {}) {
  const direct = cleanText(properties["@name"] || properties.name);
  if (direct) return direct;
  const names = parseJson(properties.names, null);
  return cleanText(names && typeof names === "object" ? names.primary : "");
}

function addressFromProperties(properties = {}) {
  const addresses = parseJson(properties.addresses, []);
  const first = Array.isArray(addresses) ? addresses[0] : null;
  if (first && typeof first === "object") {
    const parts = [first.freeform, first.locality, first.region].map(cleanText).filter(Boolean);
    const unique = [];
    for (const part of parts) {
      const normalized = part.toLocaleLowerCase('tr');
      if (!unique.some(value => value.toLocaleLowerCase('tr').includes(normalized))) unique.push(part);
    }
    if (unique.length) return unique.join(", ");
  }
  return cleanText(properties.address) || "Adres bilgisi yok";
}

function phoneFromProperties(properties = {}) {
  const phones = parseJson(properties.phones, []);
  if (Array.isArray(phones) && phones.length) return cleanText(phones[0]);
  return cleanText(properties.phone || properties.tel) || undefined;
}

function isUsable(properties = {}) {
  const status = cleanText(properties.operating_status || properties.status).toLocaleLowerCase("en-US");
  if (/closed|inactive|defunct/.test(status)) return false;
  const confidence = Number(properties.confidence);
  return !Number.isFinite(confidence) || confidence >= MIN_CONFIDENCE;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const r = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lng2 - lng1) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function lonToTileX(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * (2 ** zoom));
}

function latToTileY(lat, zoom) {
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = safeLat * Math.PI / 180;
  const n = 2 ** zoom;
  return Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * n);
}

function buildTileList(lat, lng, radiusM = DEFAULT_RADIUS_M, zoom = TILE_ZOOM) {
  const radius = Math.max(500, Math.min(MAX_RADIUS_M, Number(radiusM) || DEFAULT_RADIUS_M));
  const latDelta = radius / 111320;
  const cosLat = Math.max(0.25, Math.cos(lat * Math.PI / 180));
  const lngDelta = radius / (111320 * cosLat);
  const minX = lonToTileX(lng - lngDelta, zoom);
  const maxX = lonToTileX(lng + lngDelta, zoom);
  const minY = latToTileY(lat + latDelta, zoom);
  const maxY = latToTileY(lat - latDelta, zoom);
  const tiles = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) tiles.push({ z: zoom, x, y });
  }
  const centerX = lonToTileX(lng, zoom);
  const centerY = latToTileY(lat, zoom);
  tiles.sort((a, b) => {
    const da = Math.abs(a.x - centerX) + Math.abs(a.y - centerY);
    const db = Math.abs(b.x - centerX) + Math.abs(b.y - centerY);
    return da - db;
  });
  return tiles.slice(0, MAX_TILES);
}

function loadModules() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([import("pmtiles"), import("@mapbox/vector-tile"), import("pbf")]);
  }
  return modulesPromise;
}

async function getArchive() {
  if (!archivePromise) archivePromise = loadModules().then(([pmtiles]) => new pmtiles.PMTiles(PMTILES_URL));
  return archivePromise;
}

async function decodeTile(tile) {
  const [[, vectorTileModule, pbfModule], archive] = await Promise.all([loadModules(), getArchive()]);
  const response = await archive.getZxy(tile.z, tile.x, tile.y);
  if (!response || !response.data) return null;
  const Reader = pbfModule.PbfReader || pbfModule.default;
  if (!Reader) throw new Error("pbf_reader_unavailable");
  return new vectorTileModule.VectorTile(new Reader(new Uint8Array(response.data)));
}

async function readTile(tile, origin, radiusM) {
  const parsed = await decodeTile(tile);
  if (!parsed) return [];
  const places = [];
  for (const layer of Object.values(parsed.layers || {})) {
    for (let index = 0; index < layer.length; index += 1) {
      const feature = layer.feature(index);
      const properties = feature.properties || {};
      if (!isUsable(properties)) continue;
      const category = categoryFromOvertureProperties(properties);
      const name = primaryName(properties);
      if (!category || !name) continue;
      const geojson = feature.toGeoJSON(tile.x, tile.y, tile.z);
      if (!geojson.geometry || geojson.geometry.type !== "Point") continue;
      const [lng, lat] = geojson.geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const distanceM = Math.round(distanceMeters(origin.lat, origin.lng, lat, lng));
      if (distanceM > radiusM * 1.12) continue;
      const placeId = cleanText(properties.id) || String(feature.id || `${tile.z}:${tile.x}:${tile.y}:${index}`);
      if (EXCLUDED_PLACE_IDS.has(`overture:${placeId}`)) continue;
      places.push({
        id: `overture:${placeId}`,
        name: category === "atm" && !/\batm\b|bankamatik/i.test(name) ? `${name} ATM` : name,
        source: "Overture Maps",
        category,
        lat,
        lng,
        address: addressFromProperties(properties),
        phone: phoneFromProperties(properties),
        distanceM,
      });
    }
  }
  return places;
}

function dedupePlaces(places) {
  const byId = new Map();
  for (const place of places) if (!byId.has(place.id)) byId.set(place.id, place);
  return [...byId.values()]
    .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))
    .slice(0, MAX_RESULTS);
}

async function queryOverturePlaces(lat, lng, radiusM = DEFAULT_RADIUS_M) {
  const radius = Math.max(500, Math.min(MAX_RADIUS_M, Number(radiusM) || DEFAULT_RADIUS_M));
  const tiles = buildTileList(lat, lng, radius, TILE_ZOOM);
  const places = [];
  let cursor = 0;
  let successfulTiles = 0;
  let lastError = null;

  async function worker() {
    while (cursor < tiles.length) {
      const tile = tiles[cursor++];
      try {
        const result = await readTile(tile, { lat, lng }, radius);
        successfulTiles += 1;
        places.push(...result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(TILE_CONCURRENCY, tiles.length) }, () => worker()));
  if (!successfulTiles) throw new Error(`overture_tiles_unavailable:${lastError || "unknown"}`);
  return { places: dedupePlaces(places), tileCount: tiles.length, successfulTiles };
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const requestUrl = new URL(req.url, "https://yakinim.local");
  const lat = Number(requestUrl.searchParams.get("lat"));
  const lng = Number(requestUrl.searchParams.get("lng"));
  const radius = Math.max(500, Math.min(MAX_RADIUS_M, Number(requestUrl.searchParams.get("radius")) || DEFAULT_RADIUS_M));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: "invalid_coordinates" });
  }

  try {
    const result = await queryOverturePlaces(lat, lng, radius);
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.setHeader("X-Yakinim-Places-Source", "overture-places");
    return res.status(200).json({
      places: result.places,
      source: "Overture Places",
      tileCount: result.tileCount,
      successfulTiles: result.successfulTiles,
    });
  } catch (error) {
    console.warn("Overture places unavailable:", error instanceof Error ? error.message : String(error));
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "overture_unavailable" });
  }
}

module.exports = handler;
module.exports.PMTILES_URL = PMTILES_URL;
module.exports.TILE_ZOOM = TILE_ZOOM;
module.exports.DEFAULT_RADIUS_M = DEFAULT_RADIUS_M;
module.exports.MAX_RADIUS_M = MAX_RADIUS_M;
module.exports.MIN_CONFIDENCE = MIN_CONFIDENCE;
module.exports.categoryFromOvertureProperties = categoryFromOvertureProperties;
module.exports.primaryName = primaryName;
module.exports.addressFromProperties = addressFromProperties;
module.exports.phoneFromProperties = phoneFromProperties;
module.exports.buildTileList = buildTileList;
module.exports.queryOverturePlaces = queryOverturePlaces;
