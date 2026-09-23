import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const { NEWS_FEEDS, parseRss, queryNews } = require("../lib/news.cjs");
const { RADIO_SCOPES, buildStationParams, cleanProviderText, normalizeArtworkUrl, normalizeStation, uniqueStations, queryRadio } = require("../lib/radio.cjs");

assert.ok(NEWS_FEEDS.gundem.url.includes("trthaber.com"));
assert.ok(NEWS_FEEDS.teknoloji.url.includes("bilim_teknoloji"));
const sampleXml = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Örnek &amp; Haber]]></title><link>https://www.trthaber.com/haber/ornek</link><pubDate>Mon, 21 Sep 2026 10:00:00 +0300</pubDate></item></channel></rss>`;
const parsed = parseRss(sampleXml, "gundem");
assert.equal(parsed.length, 1);
assert.equal(parsed[0].title, "Örnek & Haber");
assert.equal(parsed[0].source, "TRT Haber");
assert.ok(parsed[0].publishedAt);

const fakeNewsFetch = async () => ({ ok: true, text: async () => sampleXml });
assert.equal((await queryNews("gundem", fakeNewsFetch)).length, 1);
await assert.rejects(() => queryNews("nope", fakeNewsFetch), /unsupported_category/);

assert.deepEqual(Object.keys(RADIO_SCOPES), ["turkiye"]);
const params = buildStationParams("turkiye");
assert.equal(params.get("countrycode"), "TR");
assert.equal(params.has("state"), false);
assert.equal(params.has("tag"), false);
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
  hls: 1,
});
assert.equal(goodStation.name, "Test FM");
assert.equal(goodStation.state, "");
assert.equal(goodStation.countryCode, "TR");
assert.equal(goodStation.language, "turkish");
assert.equal(goodStation.hls, true);
assert.equal(cleanProviderText("UNKNOWN"), "");
const slowTurkProxy = "https://www.slowturk.com.tr/_next/image?url=https%3A%2F%2Fassets.blupoint.io%2Fimg%2F85%2F330x175%2F6410d8c4310c17000763c62b&w=256&q=75";
assert.equal(normalizeArtworkUrl(slowTurkProxy), "");
assert.equal(normalizeArtworkUrl("https://assets.blupoint.io/img/85/330x175/6410d8c4310c17000763c62b"), "");
assert.equal(normalizeArtworkUrl("https://example.com/logo.png"), "https://example.com/logo.png");
assert.equal(normalizeArtworkUrl("javascript:alert(1)"), "");
assert.equal(normalizeStation({ ...goodStation, stationuuid: "x", url_resolved: "http://insecure", lastcheckok: 1 }), null);
assert.equal(uniqueStations([
  { stationuuid: "1-1111111111111111", name: "A", url_resolved: "https://a.example/live", lastcheckok: 1 },
  { stationuuid: "1-1111111111111111", name: "A", url_resolved: "https://a.example/live", lastcheckok: 1 },
]).length, 1);

const nationalRows = [
  { stationuuid: "2-2222222222222222", name: "Türkiye FM", url_resolved: "https://stream.example/turkiye", lastcheckok: 1, state: "Ankara" },
];
const fakeRadioFetch = async () => ({ ok: true, json: async () => nationalRows });
const radio = await queryRadio("turkiye", fakeRadioFetch);
assert.equal(radio.stations.length, 1);
assert.equal(radio.stations[0].name, "Türkiye FM");

console.log("Media tests PASS: official RSS parsing and safe Radio Browser station normalization.");
