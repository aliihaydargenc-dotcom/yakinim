"use strict";

const RADIO_SERVERS = Object.freeze([
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
]);

const RADIO_SCOPES = Object.freeze({
  antalya: { label: "Antalya", state: "Antalya" },
  turkiye: { label: "Türkiye" },
  pop: { label: "Pop", tag: "pop" },
  rock: { label: "Rock", tag: "rock" },
});

function buildStationParams(scope = "antalya") {
  const config = RADIO_SCOPES[scope];
  if (!config) throw new Error("unsupported_scope");
  const params = new URLSearchParams({
    countrycode: "TR",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: "80",
  });
  if (config.state) params.set("state", config.state);
  if (config.tag) params.set("tag", config.tag);
  return params;
}

function cleanProviderText(value) {
  const text = String(value || "").trim();
  if (!text || /^(unknown|n\/a|null|undefined|-+)$/i.test(text)) return "";
  return text;
}

function normalizeStation(row) {
  const streamUrl = String(row?.url_resolved || row?.url || "").trim();
  if (!row?.stationuuid || !row?.name || !/^https:\/\//i.test(streamUrl)) return null;
  const healthy = row.lastcheckok === true || row.lastcheckok === 1 || row.lastcheckok === "1";
  if (!healthy) return null;
  return {
    id: row.stationuuid,
    name: cleanProviderText(row.name),
    streamUrl,
    homepage: /^https:\/\//i.test(row.homepage || "") ? row.homepage : "",
    favicon: /^https:\/\//i.test(row.favicon || "") ? row.favicon : "",
    tags: String(row.tags || "").split(",").map(cleanProviderText).filter(Boolean).slice(0, 6),
    codec: cleanProviderText(row.codec).toUpperCase(),
    bitrate: Number(row.bitrate) || 0,
    state: cleanProviderText(row.state),
    countryCode: cleanProviderText(row.countrycode).toUpperCase() || "TR",
    language: cleanProviderText(row.language),
    hls: row.hls === true || row.hls === 1 || row.hls === "1",
    clickcount: Number(row.clickcount) || 0,
    votes: Number(row.votes) || 0,
  };
}

function uniqueStations(rows, limit = 50) {
  const seen = new Set();
  const result = [];
  for (const row of rows || []) {
    const station = normalizeStation(row);
    if (!station || seen.has(station.id) || seen.has(station.streamUrl)) continue;
    seen.add(station.id);
    seen.add(station.streamUrl);
    result.push(station);
    if (result.length >= limit) break;
  }
  return result;
}

async function fetchJson(url, fetchImpl = fetch, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Yakinim/3.1.1 (+https://yakinim.vercel.app)",
      },
    });
    if (!response?.ok) throw new Error("radio_provider_" + (response?.status || "error"));
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function queryServer(server, scope, fetchImpl = fetch) {
  const params = buildStationParams(scope);
  const rows = await fetchJson(server + "/json/stations/search?" + params.toString(), fetchImpl);
  return Array.isArray(rows) ? rows : [];
}

function stationMatchesScope(station, scope = "antalya") {
  const expected = cleanProviderText(RADIO_SCOPES[scope]?.state).toLocaleLowerCase("tr");
  if (!expected) return true;
  const actual = cleanProviderText(station?.state).toLocaleLowerCase("tr");
  return Boolean(actual && actual.includes(expected));
}

async function queryRadio(scope = "antalya", fetchImpl = fetch) {
  if (!RADIO_SCOPES[scope]) throw new Error("unsupported_scope");
  let lastError = null;
  for (const server of RADIO_SERVERS) {
    try {
      const rows = await queryServer(server, scope, fetchImpl);
      if (scope !== "antalya") {
        const stations = uniqueStations(rows).map(station => ({ ...station, scopeSource: "scope" }));
        if (stations.length) return { stations, server, localCount: stations.length, fallbackCount: 0, fallbackApplied: false };
        continue;
      }

      const queried = uniqueStations(rows);
      const locals = queried
        .filter(station => stationMatchesScope(station, "antalya"))
        .map(station => ({ ...station, scopeSource: "local" }));

      if (locals.length >= 6) {
        return { stations: locals, server, localCount: locals.length, fallbackCount: 0, fallbackApplied: false };
      }

      const fallbackRows = await queryServer(server, "turkiye", fetchImpl);
      const localIds = new Set(locals.map(station => station.id));
      const localStreams = new Set(locals.map(station => station.streamUrl));
      const fallback = uniqueStations(fallbackRows)
        .filter(station => !localIds.has(station.id) && !localStreams.has(station.streamUrl))
        .filter(station => !stationMatchesScope(station, "antalya"))
        .map(station => ({ ...station, scopeSource: "fallback" }));

      const stations = [...locals, ...fallback].slice(0, 50);
      if (stations.length) {
        const fallbackCount = Math.max(0, stations.length - locals.length);
        return {
          stations,
          server,
          localCount: Math.min(locals.length, stations.length),
          fallbackCount,
          fallbackApplied: fallbackCount > 0,
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

module.exports = { RADIO_SERVERS, RADIO_SCOPES, buildStationParams, cleanProviderText, normalizeStation, uniqueStations, stationMatchesScope, queryRadio, countStationClick };
