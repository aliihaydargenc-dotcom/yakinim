"use strict";

const NEWS_FEEDS = Object.freeze({
  gundem: [
    { id: "trt-gundem", source: "TRT Haber", url: "https://www.trthaber.com/gundem_articles.rss" },
    { id: "ht-gundem", source: "Habertürk", url: "https://www.haberturk.com/rss/kategori/gundem.xml" },
    { id: "aa-guncel", source: "Anadolu Ajansı", url: "https://www.aa.com.tr/tr/rss/default?cat=guncel" },
    { id: "bbc-tr", source: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml" },
    { id: "dw-tr", source: "DW Türkçe", url: "https://rss.dw.com/xml/rss-tur-all" },
  ],
  turkiye: [
    { id: "trt-turkiye", source: "TRT Haber", url: "https://www.trthaber.com/turkiye_articles.rss" },
    { id: "ht-gundem", source: "Habertürk", url: "https://www.haberturk.com/rss/kategori/gundem.xml" },
    { id: "aa-guncel", source: "Anadolu Ajansı", url: "https://www.aa.com.tr/tr/rss/default?cat=guncel" },
  ],
  dunya: [
    { id: "trt-dunya", source: "TRT Haber", url: "https://www.trthaber.com/dunya_articles.rss" },
    { id: "ht-dunya", source: "Habertürk", url: "https://www.haberturk.com/rss/kategori/dunya.xml" },
    { id: "bbc-tr", source: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml" },
    { id: "dw-tr", source: "DW Türkçe", url: "https://rss.dw.com/xml/rss-tur-all" },
  ],
  ekonomi: [
    { id: "trt-ekonomi", source: "TRT Haber", url: "https://www.trthaber.com/ekonomi_articles.rss" },
    { id: "ht-ekonomi", source: "Habertürk", url: "https://www.haberturk.com/rss/ekonomi.xml" },
  ],
  teknoloji: [
    { id: "trt-teknoloji", source: "TRT Haber", url: "https://www.trthaber.com/bilim_teknoloji_articles.rss" },
    { id: "ht-teknoloji", source: "Habertürk", url: "https://www.haberturk.com/rss/kategori/teknoloji.xml" },
  ],
  yasam: [
    { id: "trt-yasam", source: "TRT Haber", url: "https://www.trthaber.com/yasam_articles.rss" },
    { id: "ht-yasam", source: "Habertürk", url: "https://www.haberturk.com/rss/kategori/yasam.xml" },
  ],
});

const CATEGORY_LABELS = Object.freeze({
  gundem: "Gündem",
  turkiye: "Türkiye",
  dunya: "Dünya",
  ekonomi: "Ekonomi",
  teknoloji: "Teknoloji",
  yasam: "Yaşam",
});

function decodeXml(value = "") {
  return String(value)
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripMarkup(value = "") {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tagValue(block, tag) {
  const escaped = tag.replace(":", "\\:");
  const match = block.match(new RegExp("<" + escaped + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + escaped + ">", "i"));
  return match ? stripMarkup(match[1]) : "";
}

function normalizeNewsTitle(value) {
  return stripMarkup(value)
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9çğıöşü]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function feedFor(category, feedId) {
  const feeds = NEWS_FEEDS[category] || [];
  return feeds.find(feed => feed.id === feedId) || feeds[0] || null;
}

function parseRss(xml, category = "gundem", feedOrId = null) {
  const feed = typeof feedOrId === "object" && feedOrId
    ? feedOrId
    : feedFor(category, feedOrId) || { id: "unknown", source: "Haber", url: "" };
  const categoryLabel = CATEGORY_LABELS[category] || category;
  const items = String(xml || "").match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.map((block, index) => {
    const title = tagValue(block, "title");
    const link = tagValue(block, "link") || tagValue(block, "guid");
    const pubDate = tagValue(block, "pubDate") || tagValue(block, "dc:date");
    const date = Number.isFinite(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null;
    return {
      id: link || feed.id + ":" + index + ":" + title,
      title,
      url: /^https:\/\//i.test(link) ? link : "",
      publishedAt: date,
      source: feed.source,
      sourceId: feed.id,
      category,
      categoryLabel,
    };
  }).filter(item => item.title && item.url);
}

async function fetchWithTimeout(url, fetchImpl = fetch, timeoutMs = 4800) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
        "User-Agent": "Yakinim/3.2.0 (+https://yakinim.vercel.app)",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function mergeNewsItems(groups, limit = 36) {
  const flattened = groups.flatMap(group => Array.isArray(group) ? group : []);
  const seenUrl = new Set();
  const seenTitle = new Set();
  const sourceCounts = new Map();

  const sorted = flattened.sort((a, b) => {
    const aTime = Date.parse(a.publishedAt || "") || 0;
    const bTime = Date.parse(b.publishedAt || "") || 0;
    return bTime - aTime;
  });

  const result = [];
  for (const item of sorted) {
    const titleKey = normalizeNewsTitle(item.title);
    if (!titleKey || seenUrl.has(item.url) || seenTitle.has(titleKey)) continue;
    const sourceCount = sourceCounts.get(item.source) || 0;
    if (sourceCount >= 10) continue;
    seenUrl.add(item.url);
    seenTitle.add(titleKey);
    sourceCounts.set(item.source, sourceCount + 1);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

async function queryNews(category = "gundem", fetchImpl = fetch) {
  const feeds = NEWS_FEEDS[category];
  if (!feeds) throw new Error("unsupported_category");

  const settled = await Promise.allSettled(feeds.map(async feed => {
    const response = await fetchWithTimeout(feed.url, fetchImpl);
    if (!response?.ok) throw new Error("news_provider_" + feed.id + "_" + (response?.status || "error"));
    const xml = await response.text();
    return parseRss(xml, category, feed).slice(0, 18);
  }));

  const groups = [];
  const sources = [];
  settled.forEach((result, index) => {
    if (result.status !== "fulfilled" || !result.value.length) return;
    groups.push(result.value);
    sources.push(feeds[index].source);
  });

  if (!groups.length) throw new Error("news_unavailable");
  return {
    items: mergeNewsItems(groups, 36),
    sources: [...new Set(sources)],
  };
}

module.exports = {
  NEWS_FEEDS,
  CATEGORY_LABELS,
  decodeXml,
  stripMarkup,
  normalizeNewsTitle,
  parseRss,
  mergeNewsItems,
  queryNews,
};
