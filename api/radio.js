"use strict";
const { RADIO_SCOPES, queryRadio, countStationClick } = require("../lib/radio.cjs");

const CACHE_TTL_MS = 10 * 60 * 1000;
const memoryCache = new Map();

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const stationuuid = String(body.stationuuid || "");
    if (!stationuuid) return res.status(400).json({ error: "stationuuid_required" });
    await countStationClick(stationuuid);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const url = new URL(req.url, "https://yakinim.local");
  const scope = url.searchParams.get("scope") || "antalya";
  if (!RADIO_SCOPES[scope]) return res.status(400).json({ error: "unsupported_scope" });

  const cached = memoryCache.get(scope);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    res.setHeader("X-Yakinim-Radio-Cache", "HIT");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=1800");
    return res.status(200).json(cached.payload);
  }

  try {
    const { stations, localCount = stations.length, fallbackCount = 0, fallbackApplied = false } = await queryRadio(scope);
    const payload = { scope, stations, localCount, fallbackCount, fallbackApplied, fetchedAt: new Date().toISOString() };
    memoryCache.set(scope, { savedAt: Date.now(), payload });
    res.setHeader("X-Yakinim-Radio-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=1800");
    return res.status(200).json(payload);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "radio_unavailable" });
  }
};
