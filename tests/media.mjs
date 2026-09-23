import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const { NEWS_FEEDS, parseRss, mergeNewsItems, queryNews } = require("../lib/news.cjs");
const {
  RADIO_SCOPES,
  RIAK_MAY_2026_RANKING,
  buildStationParams,
  cleanProviderText,
  normalizeArtworkUrl,
  normalizeStation,
  riakRankForName,
  groupStationRows,
  probeStreamCandidate,
  queryRadio,
} = require("../lib/radio.cjs");

assert.ok(Array.isArray(NEWS_FEEDS.gundem));
assert.ok(NEWS_FEEDS.gundem.some(feed => feed.source === "TRT Haber"));
assert.ok(NEWS_FEEDS.gundem.some(feed => feed.source === "Habertürk"));
assert.ok(NEWS_FEEDS.gundem.some(feed => feed.source === "Anadolu Ajansı"));
assert.ok(NEWS_FEEDS.gundem.some(feed => feed.source === "BBC Türkçe"));
assert.ok(NEWS_FEEDS.gundem.some(feed => feed.source === "DW Türkçe"));

const sampleXml = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Örnek &amp; Haber]]></title><link>https://example.com/haber/ornek</link><pubDate>Mon, 21 Sep 2026 10:00:00 +0300</pubDate></item></channel></rss>`;
const parsed = parseRss(sampleXml, "gundem", { id: "test", source: "Test Kaynak", url: "https://example.com/rss" });
assert.equal(parsed.length, 1);
assert.equal(parsed[0].title, "Örnek & Haber");
assert.equal(parsed[0].source, "Test Kaynak");
assert.ok(parsed[0].publishedAt);

const mergedNews = mergeNewsItems([
  [{ ...parsed[0], source: "A", url: "https://a.example/1" }],
  [{ ...parsed[0], source: "B", url: "https://b.example/2", title: "Başka Haber" }],
]);
assert.equal(mergedNews.length, 2);

const fakeNewsFetch = async url => ({
  ok: true,
  text: async () => sampleXml.replace("Örnek &amp; Haber", "Örnek " + new URL(url).hostname),
});
const queriedNews = await queryNews("gundem", fakeNewsFetch);
assert.ok(queriedNews.sources.length >= 4);
assert.ok(queriedNews.items.length >= 1);
await assert.rejects(() => queryNews("nope", fakeNewsFetch), /unsupported_category/);

assert.deepEqual(Object.keys(RADIO_SCOPES), ["turkiye"]);
assert.ok(RIAK_MAY_2026_RANKING.length >= 20);
const params = buildStationParams("turkiye", "votes");
assert.equal(params.get("countrycode"), "TR");
assert.equal(params.get("order"), "votes");
assert.equal(params.get("hidebroken"), "true");

const goodStation = normalizeStation({
  stationuuid: "abc-def-123456789",
  name: "Test FM",
  url_resolved: "https://radio.example/live",
  lastcheckok: 1,
  tags: "pop,turkish",
  codec: "mp3",
  bitrate: 128,
  state: "UNKNOWN",
  countrycode: "TR",
  language: "turkish",
  hls: 0,
  ssl_error: 0,
  lastcheckoktime_iso8601: "2026-09-23T12:00:00Z",
});
assert.equal(goodStation.name, "Test FM");
assert.equal(goodStation.state, "");
assert.equal(goodStation.countryCode, "TR");
assert.equal(cleanProviderText("UNKNOWN"), "");
assert.equal(riakRankForName("KRAL FM").rank, 1);
assert.equal(riakRankForName("Damar Turk FM"), null);

const slowTurkProxy = "https://www.slowturk.com.tr/_next/image?url=https%3A%2F%2Fassets.blupoint.io%2Fimg%2F85%2F330x175%2F6410d8c4310c17000763c62b&w=256&q=75";
assert.equal(normalizeArtworkUrl(slowTurkProxy), "");
assert.equal(normalizeArtworkUrl("https://example.com/logo.png"), "https://example.com/logo.png");

const grouped = groupStationRows([
  { stationuuid: "damar-111111111111", name: "Damar Turk FM", url_resolved: "https://damar.example/live", lastcheckok: 1, ssl_error: 0, votes: 9999, clickcount: 9999 },
  { stationuuid: "kral-1111111111111", name: "Kral FM", url_resolved: "https://kral.example/live", lastcheckok: 1, ssl_error: 0, votes: 1, clickcount: 1 },
]);
assert.equal(grouped[0].name, "Kral FM");
assert.equal(grouped[0].measuredRank, 1);

const liveHeaders = new Map([["content-type", "audio/mpeg"], ["content-length", "0"], ["icy-name", "Test"]]);
const liveFetch = async () => ({ ok: true, headers: { get: key => liveHeaders.get(key.toLowerCase()) || null }, body: { cancel: async () => {} } });
assert.equal(await probeStreamCandidate({ url: "https://radio.example/live", hls: false }, liveFetch, 100), true);
const redirectedHttpFetch = async () => ({ ok: true, url: "http://radio.example/live", headers: { get: key => liveHeaders.get(key.toLowerCase()) || null }, body: { cancel: async () => {} } });
assert.equal(await probeStreamCandidate({ url: "https://radio.example/live", hls: false }, redirectedHttpFetch, 100), false);

const staticHeaders = new Map([["content-type", "audio/mpeg"], ["content-length", "5000000"]]);
const staticFetch = async () => ({ ok: true, headers: { get: key => staticHeaders.get(key.toLowerCase()) || null }, body: { cancel: async () => {} } });
assert.equal(await probeStreamCandidate({ url: "https://radio.example/sample.mp3", hls: false }, staticFetch, 100), false);

const nationalRows = [
  { stationuuid: "2-2222222222222222", name: "Kral FM", url_resolved: "https://stream.example/kral", lastcheckok: 1, ssl_error: 0, state: "İstanbul" },
  { stationuuid: "3-3333333333333333", name: "Damar Turk FM", url_resolved: "https://stream.example/damar", lastcheckok: 1, ssl_error: 0, state: "İstanbul", clickcount: 9000 },
];
const fakeRadioFetch = async url => {
  if (String(url).includes("/json/stations/search?")) return { ok: true, json: async () => nationalRows };
  throw new Error("unexpected fetch");
};
const radio = await queryRadio("turkiye", fakeRadioFetch, { probe: false });
assert.equal(radio.stations[0].name, "Kral FM");
assert.equal(radio.rankingSource, "RİAK");
assert.equal(radio.rankingPeriod, "Mayıs 2026");

console.log("Media tests PASS: multi-source news, RİAK-prioritized radio and live-stream validation.");
