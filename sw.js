const CACHE_NAME = "yakinimda-shell-v13";
const RUNTIME_CACHE = "yakinimda-runtime-v1";
const APP_SHELL = ["./", "./index.html", "./styles.css?v=2.1.1", "./app.js?v=2.1.1", "./manifest.webmanifest", "./icon.svg"];
const LEAFLET_ORIGIN = "https://unpkg.com";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  if (url.origin === self.location.origin) {
    const fallback = event.request.mode === "navigate" ? "./index.html" : null;
    event.respondWith(networkFirst(event.request, fallback));
    return;
  }

  if (url.origin === LEAFLET_ORIGIN && (
    url.pathname.includes("/leaflet@1.9.4/") ||
    url.pathname.includes("/maplibre-gl@5/") ||
    url.pathname.includes("/@maplibre/maplibre-gl-leaflet/")
  )) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
  }
});

async function networkFirst(request, fallbackPath = null) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackPath) return caches.match(fallbackPath);
    return Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    cache.put(request, response.clone());
  }
  return response;
}

