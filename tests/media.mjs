import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const { NEWS_FEEDS, parseRss, queryNews } = require("../lib/news.cjs");
const { RADIO_SCOPES, buildStationParams, normalizeStation, uniqueStations, queryRadio } = require("../lib/radio.cjs");

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

assert.ok(RADIO_SCOPES.antalya.state === "Antalya");
const params = buildStationParams("antalya");
assert.equal(params.get("countrycode"), "TR");
assert.equal(params.get("state"), "Antalya");
assert.equal(params.get("hidebroken"), "true");

const goodStation = normalizeStation({
  stationuuid: "abc-def-123456789",
  name: "Test FM",
  url_resolved: "https://radio.example/live",
  lastcheckok: 1,
  tags: "pop,turkish",
  codec: "mp3",
  bitrate: 128,
});
assert.equal(goodStation.name, "Test FM");
assert.equal(normalizeStation({ ...goodStation, stationuuid: "x", url_resolved: "http://insecure", lastcheckok: 1 }), null);
assert.equal(uniqueStations([
  { stationuuid: "1-1111111111111111", name: "A", url_resolved: "https://a.example/live", lastcheckok: 1 },
  { stationuuid: "1-1111111111111111", name: "A", url_resolved: "https://a.example/live", lastcheckok: 1 },
]).length, 1);

const fakeRadioFetch = async url => ({
  ok: true,
  json: async () => [{ stationuuid: "2-2222222222222222", name: "Antalya FM", url_resolved: "https://stream.example/live", lastcheckok: 1, state: "Antalya" }],
});
const radio = await queryRadio("antalya", fakeRadioFetch);
assert.equal(radio.stations[0].name, "Antalya FM");

console.log("Media tests PASS: official RSS parsing and safe Radio Browser station normalization.");
