"use strict";

const NEWS_FEEDS = Object.freeze({
  gundem: { label: "Gündem", source: "TRT Haber", url: "https://www.trthaber.com/gundem_articles.rss" },
  turkiye: { label: "Türkiye", source: "TRT Haber", url: "https://www.trthaber.com/turkiye_articles.rss" },
  dunya: { label: "Dünya", source: "TRT Haber", url: "https://www.trthaber.com/dunya_articles.rss" },
  ekonomi: { label: "Ekonomi", source: "TRT Haber", url: "https://www.trthaber.com/ekonomi_articles.rss" },
  teknoloji: { label: "Teknoloji", source: "TRT Haber", url: "https://www.trthaber.com/bilim_teknoloji_articles.rss" },
  yasam: { label: "Yaşam", source: "TRT Haber", url: "https://www.trthaber.com/yasam_articles.rss" },
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

function parseRss(xml, feedKey = "gundem") {
  const feed = NEWS_FEEDS[feedKey] || NEWS_FEEDS.gundem;
  const items = String(xml || "").match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.map((block, index) => {
    const title = tagValue(block, "title");
    const link = tagValue(block, "link") || tagValue(block, "guid");
    const pubDate = tagValue(block, "pubDate");
    const date = Number.isFinite(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null;
    return {
      id: link || feedKey + ":" + index + ":" + title,
      title,
      url: /^https:\/\//i.test(link) ? link : "",
      publishedAt: date,
      source: feed.source,
      category: feedKey,
      categoryLabel: feed.label,
    };
  }).filter(item => item.title && item.url);
}

async function fetchWithTimeout(url, fetchImpl = fetch, timeoutMs = 5500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
        "User-Agent": "Yakinim/3.0.0 (+https://yakinim.vercel.app)",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function queryNews(category = "gundem", fetchImpl = fetch) {
  const feed = NEWS_FEEDS[category];
  if (!feed) throw new Error("unsupported_category");
  const response = await fetchWithTimeout(feed.url, fetchImpl);
  if (!response?.ok) throw new Error("news_provider_" + (response?.status || "error"));
  const xml = await response.text();
  return parseRss(xml, category).slice(0, 24);
}

module.exports = { NEWS_FEEDS, decodeXml, stripMarkup, parseRss, queryNews };
