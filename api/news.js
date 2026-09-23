"use strict";
const { NEWS_FEEDS, queryNews } = require("../lib/news.cjs");

const CACHE_TTL_MS = 4 * 60 * 1000;
const memoryCache = new Map();

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const url = new URL(req.url, "https://yakinim.local");
  const category = url.searchParams.get("category") || "gundem";
  if (!NEWS_FEEDS[category]) return res.status(400).json({ error: "unsupported_category" });

  const cached = memoryCache.get(category);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    res.setHeader("X-Yakinim-News-Cache", "HIT");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=240, stale-while-revalidate=600");
    return res.status(200).json(cached.payload);
  }

  try {
    const { items, sources } = await queryNews(category);
    const payload = { category, sources, items, fetchedAt: new Date().toISOString() };
    memoryCache.set(category, { savedAt: Date.now(), payload });
    res.setHeader("X-Yakinim-News-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=240, stale-while-revalidate=600");
    return res.status(200).json(payload);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "news_unavailable" });
  }
};
