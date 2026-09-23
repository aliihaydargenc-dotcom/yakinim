const {
  canonicalizeViewport,
  viewportKey,
  queryViewport,
} = require("../lib/viewport.cjs");

const RESPONSE_CACHE_TTL_MS = 3 * 60 * 1000;
const RESPONSE_CACHE_LIMIT = 160;
const responseCache = new Map();

function getCached(key) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.savedAt > RESPONSE_CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCached(key, data) {
  if (responseCache.size >= RESPONSE_CACHE_LIMIT) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { savedAt: Date.now(), data });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const params = new URL(req.url, "https://yakinim.vercel.app").searchParams;
  let viewport;
  try {
    viewport = canonicalizeViewport({
      south: params.get("south"),
      west: params.get("west"),
      north: params.get("north"),
      east: params.get("east"),
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(400).json({ error: error.message === "bbox_too_large" ? "viewport_too_large" : "invalid_viewport" });
  }

  const key = viewportKey(viewport);
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=180, stale-while-revalidate=900");
  const cached = getCached(key);
  if (cached) {
    res.setHeader("X-Yakinim-Viewport-Cache", "HIT");
    return res.status(200).json(cached);
  }

  try {
    const payload = await queryViewport(viewport);
    setCached(key, payload);
    res.setHeader("X-Yakinim-Viewport-Cache", "MISS");
    return res.status(200).json(payload);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    console.error("Viewport providers unavailable:", error.message);
    return res.status(503).json({ error: "viewport_unavailable" });
  }
};

module.exports._cache = responseCache;
