const ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.maprva.org/api/interpreter",
];
const PROVIDER_TIMEOUT_MS = 5000;
const PROVIDER_HEDGE_MS = 350;
const QUALITY_WAIT_MS = 3500;
const MIN_GOOD_ELEMENT_COUNT = 12;
const GRID_DEGREES = 0.01;
const MAX_SPAN_DEGREES = 0.12;
const SPAN_EPSILON = 1e-9;
const SNAP_EPSILON = 1e-9;

function canonicalizeViewport(input) {
  const south = Number(input.south);
  const west = Number(input.west);
  const north = Number(input.north);
  const east = Number(input.east);
  if (![south, west, north, east].every(Number.isFinite)) throw new Error("invalid_bbox");
  if (south < -90 || north > 90 || west < -180 || east > 180 || north <= south || east <= west) throw new Error("invalid_bbox");

  const snapDown = value => Math.floor((value + SNAP_EPSILON) / GRID_DEGREES) * GRID_DEGREES;
  const snapUp = value => Math.ceil((value - SNAP_EPSILON) / GRID_DEGREES) * GRID_DEGREES;
  const viewport = {
    south: Number(snapDown(south).toFixed(3)),
    west: Number(snapDown(west).toFixed(3)),
    north: Number(snapUp(north).toFixed(3)),
    east: Number(snapUp(east).toFixed(3)),
  };
  if (
    viewport.north - viewport.south > MAX_SPAN_DEGREES + SPAN_EPSILON ||
    viewport.east - viewport.west > MAX_SPAN_DEGREES + SPAN_EPSILON
  ) throw new Error("bbox_too_large");
  return viewport;
}

function viewportKey(viewport) {
  return [viewport.south, viewport.west, viewport.north, viewport.east].join(":");
}

function buildViewportQuery(viewport) {
  const bbox = [viewport.south, viewport.west, viewport.north, viewport.east].join(",");
  return `[out:json][timeout:5];(nwr["amenity"~"^(cafe|restaurant|fast_food|pharmacy|atm|hospital|clinic|doctors|fuel|parking)$"](${bbox});nwr["shop"~"^(supermarket|convenience|greengrocer|bakery|mall|department_store|clothes)$"](${bbox});nwr["leisure"="park"](${bbox}););out center tags qt;`;
}

function abortError() {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProvider(endpoint, query, fetcher, sharedSignal) {
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  if (sharedSignal?.aborted) throw abortError();
  sharedSignal?.addEventListener("abort", relayAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "Yakinim/3.14.0 (+https://yakinim.vercel.app)",
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.elements) || payload.remark) throw new Error("Incomplete response");
    return {
      elements: payload.elements,
      source: "OpenStreetMap",
      provider: new URL(endpoint).hostname,
    };
  } finally {
    clearTimeout(timer);
    sharedSignal?.removeEventListener("abort", relayAbort);
  }
}

function delayedProvider(endpoint, index, query, fetcher, sharedSignal) {
  return new Promise((resolve, reject) => {
    let started = false;
    let delayTimer = null;
    const onAbort = () => {
      if (!started) {
        clearTimeout(delayTimer);
        reject(abortError());
      }
    };
    sharedSignal?.addEventListener("abort", onAbort, { once: true });

    const start = () => {
      started = true;
      sharedSignal?.removeEventListener("abort", onAbort);
      fetchProvider(endpoint, query, fetcher, sharedSignal).then(resolve, reject);
    };

    if (index === 0) start();
    else delayTimer = setTimeout(start, index * PROVIDER_HEDGE_MS);
  });
}

async function queryViewport(viewport, fetcher = fetch) {
  const query = buildViewportQuery(viewport);
  const sharedController = new AbortController();
  const failures = [];
  const successes = [];
  const attempts = ENDPOINTS.map((endpoint, index) =>
    delayedProvider(endpoint, index, query, fetcher, sharedController.signal)
      .then(result => {
        successes.push(result);
        return result;
      })
      .catch(error => {
        if (error?.name !== "AbortError" || !sharedController.signal.aborted) {
          failures.push(`${new URL(endpoint).hostname}: ${error?.name === "AbortError" ? "timeout" : error?.message || "failed"}`);
        }
        throw error;
      })
  );
  const allSettled = Promise.allSettled(attempts);

  try {
    const first = await Promise.any(attempts);
    if (first.elements.length >= MIN_GOOD_ELEMENT_COUNT) {
      sharedController.abort();
      return { ...first, viewport };
    }

    await Promise.race([allSettled, delay(QUALITY_WAIT_MS)]);
    const best = successes.reduce((winner, candidate) =>
      candidate.elements.length > winner.elements.length ? candidate : winner,
    first);
    sharedController.abort();
    return { ...best, viewport };
  } catch {
    sharedController.abort();
    throw new Error(failures.join("; ") || "viewport_unavailable");
  }
}

module.exports = {
  ENDPOINTS,
  PROVIDER_TIMEOUT_MS,
  PROVIDER_HEDGE_MS,
  QUALITY_WAIT_MS,
  MIN_GOOD_ELEMENT_COUNT,
  GRID_DEGREES,
  MAX_SPAN_DEGREES,
  canonicalizeViewport,
  viewportKey,
  buildViewportQuery,
  queryViewport,
};
