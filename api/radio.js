"use strict";
const { RADIO_SCOPES, queryRadio, countStationClick } = require("../lib/radio.cjs");

const CACHE_TTL_MS = 5 * 60 * 1000;
const FAILED_STREAM_TTL_MS = 30 * 60 * 1000;
const memoryCache = new Map();
const failedStreams = new Map();

function activeFailedStreams() {
  const now = Date.now();
  for (const [url, expiresAt] of failedStreams) {
    if (expiresAt <= now) failedStreams.delete(url);
  }
  return new Set(failedStreams.keys());
}

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    if (body.action === "failure") {
      const streamUrl = String(body.streamUrl || "");
      if (!/^https:\/\//i.test(streamUrl)) return res.status(400).json({ error: "stream_url_required" });
      failedStreams.set(streamUrl, Date.now() + FAILED_STREAM_TTL_MS);
      memoryCache.clear();
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true });
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
  const scope = url.searchParams.get("scope") || "turkiye";
  if (!RADIO_SCOPES[scope]) return res.status(400).json({ error: "unsupported_scope" });

  const cacheKey = scope + ":" + [...activeFailedStreams()].sort().join("|");
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    res.setHeader("X-Yakinim-Radio-Cache", "HIT");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(cached.payload);
  }

  try {
    const blockedUrls = activeFailedStreams();
    const { stations, rankingSource, rankingPeriod, verifiedCount } = await queryRadio(scope, undefined, { blockedUrls, probe: true });
    const payload = {
      scope,
      stations,
      rankingSource,
      rankingPeriod,
      verifiedCount,
      fetchedAt: new Date().toISOString(),
    };
    memoryCache.set(cacheKey, { savedAt: Date.now(), payload });
    res.setHeader("X-Yakinim-Radio-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(payload);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "radio_unavailable" });
  }
};
