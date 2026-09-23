"use strict";

const RADIO_SERVERS = Object.freeze([
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
]);

const RADIO_SCOPES = Object.freeze({
  turkiye: { label: "Türkiye" },
});

// Latest public RİAK/URYAD individual audience report found at development time: May 2026.
// This list is used only as a deterministic discovery priority; stream availability is validated separately.
const RIAK_MAY_2026_RANKING = Object.freeze([
  ["Kral FM", ["kral fm"]],
  ["Kral Pop", ["kral pop", "kral pop radyo"]],
  ["TRT FM", ["trt fm"]],
  ["Radyo 7", ["radyo 7"]],
  ["Virgin Radio", ["virgin radio", "virgin radio turkiye", "virgin radio türkiye"]],
  ["Süper FM", ["super fm", "süper fm"]],
  ["SlowTürk", ["slowturk", "slow turk", "slow türk", "slowturk fm"]],
  ["Radyo Seymen", ["radyo seymen", "seymen fm"]],
  ["PowerTürk", ["power turk", "powerturk", "power türk", "powertürk"]],
  ["Radyo 45lik", ["radyo 45lik", "45lik"]],
  ["Kafa Radyo", ["kafa radyo"]],
  ["Kalp FM", ["kalp fm"]],
  ["Alem FM", ["alem fm"]],
  ["Power FM", ["power fm"]],
  ["Show Radyo", ["show radyo"]],
  ["Radyo Turkuvaz", ["radyo turkuvaz", "turkuvaz radyo"]],
  ["Best FM", ["best fm"]],
  ["JoyTürk", ["joy turk", "joyturk", "joy türk", "joytürk"]],
  ["Metro FM", ["metro fm"]],
  ["Radyo D", ["radyo d"]],
  ["Radyo Fenomen", ["radyo fenomen", "fenomen fm"]],
  ["TRT Radyo 1", ["trt radyo 1", "radyo 1"]],
  ["Pal Nostalji", ["pal nostalji"]],
  ["A Haber Radyo", ["a haber radyo"]],
  ["TRT Radyo Haber", ["trt radyo haber"]],
  ["Fenomen Türk", ["fenomen turk", "fenomen türk"]],
  ["Radyo Viva", ["radyo viva", "viva fm"]],
  ["NTV Radyo", ["ntv radyo"]],
  ["Radyo Vav", ["radyo vav"]],
  ["Habertürk Radyo", ["haberturk radyo", "habertürk radyo"]],
]);

function buildStationParams(scope = "turkiye", order = "votes") {
  if (!RADIO_SCOPES[scope]) throw new Error("unsupported_scope");
  return new URLSearchParams({
    countrycode: "TR",
    hidebroken: "true",
    order,
    reverse: "true",
    limit: "180",
  });
}

function cleanProviderText(value) {
  const text = String(value || "").trim();
  if (!text || /^(unknown|n\/a|null|undefined|-+)$/i.test(text)) return "";
  return text;
}

function normalizeArtworkUrl(value) {
  const raw = String(value || "").trim();
  if (!/^https:\/\//i.test(raw)) return "";
  try {
    const url = new URL(raw);
    if (url.pathname.includes("/_next/image")) return "";
    if (url.hostname === "assets.blupoint.io") return "";
    return url.href;
  } catch {
    return "";
  }
}

function normalizeStationNameKey(value) {
  return String(value || "")
    .toLocaleLowerCase("tr")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ıiİ]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/\b(radyo|radio)\s+yerel\b/g, "radyo")
    .replace(/\b(bolgesel|bölgesel|yerel|istanbul|turkiye|türkiye)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const RIAK_ALIAS_MAP = (() => {
  const map = new Map();
  RIAK_MAY_2026_RANKING.forEach(([name, aliases], index) => {
    const rank = index + 1;
    [name, ...aliases].forEach(alias => map.set(normalizeStationNameKey(alias), { rank, name }));
  });
  return map;
})();

function riakRankForName(name) {
  const key = normalizeStationNameKey(name);
  if (!key) return null;
  if (RIAK_ALIAS_MAP.has(key)) return RIAK_ALIAS_MAP.get(key);
  for (const [alias, value] of RIAK_ALIAS_MAP) {
    if (key === alias || key.startsWith(alias + " ") || alias.startsWith(key + " ")) return value;
  }
  return null;
}

function normalizeStation(row) {
  const streamUrl = String(row?.url_resolved || row?.url || "").trim();
  if (!row?.stationuuid || !row?.name || !/^https:\/\//i.test(streamUrl)) return null;
  const healthy = row.lastcheckok === true || row.lastcheckok === 1 || row.lastcheckok === "1";
  if (!healthy || Number(row.ssl_error) === 1) return null;
  const riak = riakRankForName(row.name);
  return {
    id: row.stationuuid,
    name: cleanProviderText(row.name),
    streamUrl,
    homepage: /^https:\/\//i.test(row.homepage || "") ? row.homepage : "",
    favicon: normalizeArtworkUrl(row.favicon),
    tags: String(row.tags || "").split(",").map(cleanProviderText).filter(Boolean).slice(0, 8),
    codec: cleanProviderText(row.codec).toUpperCase(),
    bitrate: Number(row.bitrate) || 0,
    state: cleanProviderText(row.state),
    countryCode: cleanProviderText(row.countrycode).toUpperCase() || "TR",
    language: cleanProviderText(row.language),
    hls: row.hls === true || row.hls === 1 || row.hls === "1",
    clickcount: Number(row.clickcount) || 0,
    clicktrend: Number(row.clicktrend) || 0,
    votes: Number(row.votes) || 0,
    hasExtendedInfo: row.has_extended_info === true || row.has_extended_info === 1 || row.has_extended_info === "1",
    lastCheckOkAt: cleanProviderText(row.lastcheckoktime_iso8601 || row.lastchecktime_iso8601),
    measuredRank: riak?.rank || null,
    measuredName: riak?.name || "",
  };
}

function candidateQualityScore(station) {
  const recentCheck = Date.parse(station.lastCheckOkAt || "");
  const recentBonus = Number.isFinite(recentCheck) && Date.now() - recentCheck < 36 * 60 * 60 * 1000 ? 12 : 0;
  return (station.hls ? 0 : 14)
    + Math.min(18, Math.max(0, station.bitrate) / 16)
    + (station.hasExtendedInfo ? 6 : 0)
    + recentBonus
    + Math.log1p(Math.max(0, station.votes)) * 1.5
    + Math.log1p(Math.max(0, station.clickcount));
}

function popularityScore(station) {
  return Math.log1p(Math.max(0, station.clickcount)) * 4
    + Math.log1p(Math.max(0, station.votes)) * 2.2
    + Math.max(-20, Math.min(20, station.clicktrend)) * .08
    + candidateQualityScore(station) * .15;
}

function groupStationRows(rows, limit = 70) {
  const groups = new Map();
  for (const row of rows || []) {
    const station = normalizeStation(row);
    if (!station) continue;
    const riak = station.measuredRank ? { rank: station.measuredRank, name: station.measuredName } : null;
    const key = riak ? "riak:" + riak.rank : "name:" + normalizeStationNameKey(station.name);
    if (!key || key === "name:") continue;
    if (!groups.has(key)) groups.set(key, []);
    const group = groups.get(key);
    if (!group.some(item => item.streamUrl === station.streamUrl)) group.push(station);
  }

  const merged = [...groups.values()].map(group => {
    const candidates = [...group].sort((a, b) => candidateQualityScore(b) - candidateQualityScore(a));
    const primary = candidates[0];
    const measuredRank = group.map(item => item.measuredRank).filter(Boolean).sort((a, b) => a - b)[0] || null;
    const measuredName = group.find(item => item.measuredName)?.measuredName || "";
    return {
      ...primary,
      name: measuredName || primary.name,
      measuredRank,
      measuredName,
      popularityScore: Math.max(...group.map(popularityScore)),
      streamCandidates: candidates.slice(0, 4).map(item => ({
        id: item.id,
        url: item.streamUrl,
        codec: item.codec,
        bitrate: item.bitrate,
        hls: item.hls,
        lastCheckOkAt: item.lastCheckOkAt,
      })),
    };
  });

  merged.sort((a, b) => {
    if (a.measuredRank && b.measuredRank) return a.measuredRank - b.measuredRank;
    if (a.measuredRank) return -1;
    if (b.measuredRank) return 1;
    return b.popularityScore - a.popularityScore;
  });
  return merged.slice(0, limit);
}

function uniqueStations(rows, limit = 50) {
  return groupStationRows(rows, limit);
}

async function fetchJson(url, fetchImpl = fetch, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Yakinim/3.3.0 (+https://yakinim.vercel.app)",
      },
    });
    if (!response?.ok) throw new Error("radio_provider_" + (response?.status || "error"));
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function queryServer(server, scope, fetchImpl = fetch) {
  const [votesRows, clickRows] = await Promise.all([
    fetchJson(server + "/json/stations/search?" + buildStationParams(scope, "votes").toString(), fetchImpl),
    fetchJson(server + "/json/stations/search?" + buildStationParams(scope, "clickcount").toString(), fetchImpl),
  ]);
  const seen = new Set();
  const rows = [];
  for (const row of [...(Array.isArray(votesRows) ? votesRows : []), ...(Array.isArray(clickRows) ? clickRows : [])]) {
    const key = String(row?.stationuuid || "") + "|" + String(row?.url_resolved || row?.url || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

async function probeStreamCandidate(candidate, fetchImpl = fetch, timeoutMs = 2600) {
  const url = String(candidate?.url || "").trim();
  if (!/^https:\/\//i.test(url)) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "audio/*, application/vnd.apple.mpegurl, application/x-mpegURL, */*;q=0.4",
        "Icy-MetaData": "1",
        "User-Agent": "Yakinim/3.3.0 (+https://yakinim.vercel.app)",
      },
    });
    if (!response?.ok) return false;
    if (response.url && !/^https:\/\//i.test(response.url)) return false;
    const type = String(response.headers?.get?.("content-type") || "").toLowerCase();
    const length = Number(response.headers?.get?.("content-length") || 0);
    const icy = response.headers?.get?.("icy-name") || response.headers?.get?.("icy-metaint") || response.headers?.get?.("ice-audio-info");
    const isHls = candidate.hls || /mpegurl/.test(type) || /\.m3u8(?:$|\?)/i.test(url);

    if (isHls) {
      const text = await response.text();
      return /#EXTM3U/i.test(text);
    }

    if (response.body?.cancel) {
      try { await response.body.cancel(); } catch {}
    }
    const audioLike = /^audio\//.test(type) || Boolean(icy);
    if (!audioLike) return false;
    // Live Icecast/Shoutcast streams are normally chunked/indefinite. A small finite file often
    // indicates a sample/loop rather than a true live stream.
    if (length > 0 && length < 32 * 1024 * 1024 && !icy) return false;
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function validateStationGroup(station, fetchImpl = fetch, blockedUrls = new Set()) {
  const candidates = Array.isArray(station.streamCandidates) ? station.streamCandidates : [];
  for (const candidate of candidates.slice(0, 3)) {
    if (blockedUrls.has(candidate.url)) continue;
    if (await probeStreamCandidate(candidate, fetchImpl)) {
      const rest = candidates.filter(item => item.url !== candidate.url && !blockedUrls.has(item.url));
      return {
        ...station,
        id: candidate.id || station.id,
        streamUrl: candidate.url,
        codec: candidate.codec || station.codec,
        bitrate: candidate.bitrate || station.bitrate,
        hls: Boolean(candidate.hls),
        streamCandidates: [candidate, ...rest],
        liveVerified: true,
      };
    }
  }

  const checked = Date.parse(station.lastCheckOkAt || "");
  const radioBrowserFresh = Number.isFinite(checked) && Date.now() - checked < 36 * 60 * 60 * 1000;
  if (station.measuredRank && station.measuredRank <= 20 && radioBrowserFresh) {
    const fallback = candidates.find(candidate => !blockedUrls.has(candidate.url));
    if (fallback) return { ...station, streamUrl: fallback.url, streamCandidates: [fallback, ...candidates.filter(item => item.url !== fallback.url)], liveVerified: false };
  }
  return null;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const result = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return result;
}

async function queryRadio(scope = "turkiye", fetchImpl = fetch, options = {}) {
  if (!RADIO_SCOPES[scope]) throw new Error("unsupported_scope");
  const blockedUrls = options.blockedUrls instanceof Set ? options.blockedUrls : new Set();
  const shouldProbe = options.probe !== false && fetchImpl === fetch;
  let lastError = null;

  for (const server of RADIO_SERVERS) {
    try {
      const rows = await queryServer(server, scope, fetchImpl);
      const ranked = groupStationRows(rows, 60).filter(station => !blockedUrls.has(station.streamUrl));
      if (!ranked.length) continue;

      let stations = ranked;
      if (shouldProbe) {
        const candidates = ranked.slice(0, 40);
        const checked = await mapWithConcurrency(candidates, 8, station => validateStationGroup(station, fetchImpl, blockedUrls));
        stations = checked.filter(Boolean);
      }

      stations = stations.slice(0, 36).map(station => ({
        ...station,
        rankingPeriod: station.measuredRank ? "Mayıs 2026" : "",
      }));
      if (stations.length) {
        return {
          stations,
          server,
          rankingSource: "RİAK",
          rankingPeriod: "Mayıs 2026",
          verifiedCount: stations.filter(station => station.liveVerified).length,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("radio_unavailable");
}

async function countStationClick(stationuuid, fetchImpl = fetch) {
  if (!/^[0-9a-f-]{16,}$/i.test(String(stationuuid || ""))) return false;
  for (const server of RADIO_SERVERS) {
    try {
      await fetchJson(server + "/json/url/" + encodeURIComponent(stationuuid), fetchImpl, 3500);
      return true;
    } catch {}
  }
  return false;
}

module.exports = {
  RADIO_SERVERS,
  RADIO_SCOPES,
  RIAK_MAY_2026_RANKING,
  buildStationParams,
  cleanProviderText,
  normalizeArtworkUrl,
  normalizeStationNameKey,
  riakRankForName,
  normalizeStation,
  uniqueStations,
  groupStationRows,
  probeStreamCandidate,
  queryRadio,
  countStationClick,
};
