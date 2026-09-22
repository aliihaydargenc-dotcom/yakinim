const APP_VERSION = "1.1.0";
const DEFAULT_CENTER = [39.0, 35.0];
const DEFAULT_ZOOM = 6;
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const DUTY_ENDPOINT = "https://eczaneadresi.com/api/public/v1/nearest-pharmacies";
const PREFS_KEY = "yakinimda:prefs:v1";
const FAVORITES_KEY = "yakinimda:favorites:v1";
const CACHE_PREFIX = "yakinimda:cache:v2:";
const PREFETCH_RADIUS = 5000;
const SHEET_STATES = ["peek", "half", "expanded"];

const categories = [
  { id: "duty", label: "Nöbetçi Eczane", icon: "+", type: "duty", ttl: 15 * 60 * 1000 },
  { id: "market", label: "Market", icon: "🛒", type: "osm", filter: '[shop~"^(supermarket|convenience)$"]', ttl: 6 * 60 * 60 * 1000 },
  { id: "greengrocer", label: "Manav", icon: "●", type: "osm", filter: "[shop=greengrocer]", ttl: 6 * 60 * 60 * 1000 },
  { id: "bakery", label: "Fırın", icon: "◇", type: "osm", filter: "[shop=bakery]", ttl: 6 * 60 * 60 * 1000 },
  { id: "pharmacy", label: "Eczane", icon: "+", type: "osm", filter: "[amenity=pharmacy]", ttl: 6 * 60 * 60 * 1000 },
  { id: "atm", label: "ATM", icon: "₺", type: "osm", filter: "[amenity=atm]", ttl: 6 * 60 * 60 * 1000 },
  { id: "favorites", label: "Favoriler", icon: "★", type: "favorites", ttl: 0 },
];
const osmCategories = categories.filter((category) => category.type === "osm");
const mapShouldAnimate = !window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches;

const prefs = readJson(PREFS_KEY, { radius: 3000, category: "duty" });
let favorites = readJson(FAVORITES_KEY, []);
let userLocation = null;
let activeCategory = categories.find((item) => item.id === prefs.category) || categories[0];
let activePlaces = [];
let markers = [];
let userMarker = null;
let requestSerial = 0;
let osmBundleRequest = null;

const map = L.map("map", {
  zoomControl: false,
  attributionControl: false,
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

L.control.zoom({ position: "topright" }).addTo(map);

const categoryStrip = document.querySelector("#categoryStrip");
const results = document.querySelector("#results");
const resultTitle = document.querySelector("#resultTitle");
const statusText = document.querySelector("#statusText");
const radiusSelect = document.querySelector("#radiusSelect");
const locateButton = document.querySelector("#locateButton");
const sourceText = document.querySelector("#sourceText");
const resultSummary = document.querySelector("#resultSummary");
const sheet = document.querySelector(".sheet");
const sheetToggle = document.querySelector("#sheetToggle");
const resultTemplate = document.querySelector("#resultTemplate");

radiusSelect.value = String(prefs.radius);
applySheetState(prefs.sheetState || "half");
renderCategoryButtons();
showState("loading", "Konum izni bekleniyor…");

locateButton.addEventListener("click", locateUser);
sheetToggle.addEventListener("click", cycleSheetState);
radiusSelect.addEventListener("change", () => {
  prefs.radius = Number(radiusSelect.value);
  persistPrefs();
  if (userLocation && activeCategory.type !== "favorites") loadCategory(activeCategory);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

locateUser();

function renderCategoryButtons() {
  categoryStrip.replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-button";
    button.dataset.category = category.id;
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-pressed", String(category.id === activeCategory.id));
    button.innerHTML = `<span aria-hidden="true">${escapeHtml(category.icon)}</span><span>${escapeHtml(category.label)}</span>`;
    button.addEventListener("click", () => selectCategory(category));
    categoryStrip.append(button);
  });
}

function selectCategory(category) {
  activeCategory = category;
  if (sheet.dataset.state === "peek") applySheetState("half");
  prefs.category = category.id;
  persistPrefs();
  renderCategoryButtons();

  if (category.type === "favorites") {
    loadFavorites();
    return;
  }

  if (!userLocation) {
    showState("empty", "Yakındaki yerleri görmek için konumunu aç.");
    return;
  }

  loadCategory(category);
}

function locateUser() {
  if (!navigator.geolocation) {
    statusText.textContent = "Bu tarayıcı konum özelliğini desteklemiyor.";
    showState("error", "Konum alınamadı. Mobil tarayıcıda konum iznini kontrol et.");
    return;
  }

  locateButton.disabled = true;
  statusText.textContent = "Konum alınıyor…";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      locateButton.disabled = false;
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      drawUserLocation();
      map.setView([userLocation.lat, userLocation.lng], 14, { animate: mapShouldAnimate });
      statusText.textContent = position.coords.accuracy
        ? `Konum doğruluğu yaklaşık ${Math.round(position.coords.accuracy)} m.`
        : "Konum bulundu.";
      if (activeCategory.type === "favorites") loadFavorites();
      else {
        loadCategory(activeCategory);
        warmNearbyData(activeCategory.id);
      }
    },
    (error) => {
      locateButton.disabled = false;
      statusText.textContent = "Konum izni verilmedi veya konum alınamadı.";
      showState("empty", error.code === 1 ? "Konum iznini açıp ‘Konumum’ düğmesine dokun." : "Konum alınamadı. Biraz sonra yeniden dene.");
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
  );
}

function drawUserLocation() {
  if (!userLocation) return;

  if (userMarker) userMarker.remove();
  userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
    radius: 8,
    color: "#ffffff",
    weight: 3,
    fillColor: "#176b52",
    fillOpacity: 1,
  })
    .bindTooltip("Buradasın", { direction: "top" })
    .addTo(map);
}

async function loadCategory(category) {
  const serial = ++requestSerial;
  const location = { lat: userLocation.lat, lng: userLocation.lng };
  resultTitle.textContent = category.label;
  sourceText.textContent = category.type === "duty" ? "Veri: Eczane Adresi" : "Veri: OpenStreetMap";
  showState("loading", `${category.label} aranıyor…`);

  try {
    const cacheKey = buildCacheKey(category.id, location);
    const cached = readCache(cacheKey, category.ttl);
    let places;

    if (cached) {
      places = filterPlacesForRadius(cached);
      statusText.textContent = "Yerel önbellekten gösteriliyor.";
    } else if (category.type === "duty") {
      const allPlaces = await fetchDutyPharmacies(location, PREFETCH_RADIUS);
      writeCache(cacheKey, allPlaces);
      places = filterPlacesForRadius(allPlaces);
      statusText.textContent = "Güncel nöbetçi eczane verisi alındı.";
    } else {
      const bundle = await fetchOsmBundle(location);
      places = filterPlacesForRadius(bundle[category.id] || []);
      statusText.textContent = "OpenStreetMap verisi alındı.";
    }

    if (serial !== requestSerial) return;
    activePlaces = places;
    renderPlaces(places, category);
  } catch (error) {
    if (serial !== requestSerial) return;
    console.error(error);
    const stalePlaces = readCache(buildCacheKey(category.id, location), Number.POSITIVE_INFINITY);
    if (stalePlaces) {
      activePlaces = filterPlacesForRadius(stalePlaces);
      statusText.textContent = "Bağlantı kurulamadı; son kaydedilen veri gösteriliyor.";
      renderPlaces(activePlaces, category);
      return;
    }

    clearPlaceMarkers();
    showState("error", "Veri kaynağına şu an ulaşılamadı. Biraz sonra tekrar dene; kayıtlı favorilerin etkilenmez.");
    statusText.textContent = "Geçici bağlantı sorunu.";
  }
}

async function fetchDutyPharmacies(location, radius) {
  const url = new URL(DUTY_ENDPOINT);
  url.searchParams.set("lat", location.lat.toFixed(6));
  url.searchParams.set("lng", location.lng.toFixed(6));
  url.searchParams.set("radius", String(Math.min(25000, Math.max(500, Number(radius)))));
  url.searchParams.set("limit", "25");

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Duty API ${response.status}`);

  const payload = await response.json();
  const rows = payload.pharmacies || payload.data || [];

  return rows
    .map((row) => normalizeDutyPharmacy(row, location))
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function normalizeDutyPharmacy(row, location) {
  const lat = Number(row.latitude ?? row.lat ?? row.location?.lat);
  const lng = Number(row.longitude ?? row.lng ?? row.lon ?? row.location?.lng ?? row.location?.lon);
  const apiDistanceKm = Number(row.distance_m) / 1000;
  const distanceKm = Number.isFinite(apiDistanceKm) && apiDistanceKm >= 0
    ? apiDistanceKm
    : Number(row.distance_km ?? row.distanceKm ?? row.distance) || distanceBetween(location.lat, location.lng, lat, lng);

  return {
    id: `duty:${row.id ?? row.slug ?? `${lat}:${lng}`}`,
    category: "duty",
    name: row.name || row.pharmacy_name || "Nöbetçi Eczane",
    address: row.address || row.address_text || "Adres bilgisi yok",
    phone: row.phone || row.phone_number || "",
    lat,
    lng,
    distanceKm,
  };
}

async function fetchOsmBundle(location) {
  const requestKey = `${location.lat.toFixed(3)}:${location.lng.toFixed(3)}`;
  if (osmBundleRequest?.key === requestKey) return osmBundleRequest.promise;

  const promise = (async () => {
    const clauses = osmCategories
      .map((category) => `nwr(around:${PREFETCH_RADIUS},${location.lat.toFixed(6)},${location.lng.toFixed(6)})${category.filter};`)
      .join("");
    const query = `[out:json][timeout:18];(${clauses});out center tags;`;
    const body = new URLSearchParams({ data: query });
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    });

    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    const payload = await response.json();
    const bundle = Object.fromEntries(osmCategories.map((category) => [category.id, []]));

    for (const element of payload.elements || []) {
      const category = categoryForOsmElement(element);
      if (!category) continue;
      const place = normalizeOsmElement(element, category, location);
      if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) bundle[category.id].push(place);
    }

    for (const category of osmCategories) {
      bundle[category.id].sort((a, b) => a.distanceKm - b.distanceKm);
      writeCache(buildCacheKey(category.id, location), bundle[category.id]);
    }

    return bundle;
  })();

  osmBundleRequest = { key: requestKey, promise };

  try {
    return await promise;
  } finally {
    if (osmBundleRequest?.promise === promise) osmBundleRequest = null;
  }
}

function categoryForOsmElement(element) {
  const tags = element.tags || {};
  if (tags.amenity === "pharmacy") return categories.find((category) => category.id === "pharmacy");
  if (tags.amenity === "atm") return categories.find((category) => category.id === "atm");
  if (tags.shop === "greengrocer") return categories.find((category) => category.id === "greengrocer");
  if (tags.shop === "bakery") return categories.find((category) => category.id === "bakery");
  if (tags.shop === "supermarket" || tags.shop === "convenience") return categories.find((category) => category.id === "market");
  return null;
}

function normalizeOsmElement(element, category, location) {
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  const tags = element.tags || {};
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const address = street || tags["addr:full"] || tags.description || "Adres OpenStreetMap’te belirtilmemiş";

  return {
    id: `osm:${element.type}:${element.id}`,
    category: category.id,
    name: tags.name || category.label,
    address,
    phone: tags.phone || tags["contact:phone"] || "",
    openingHours: tags.opening_hours || "",
    lat,
    lng,
    distanceKm: distanceBetween(location.lat, location.lng, lat, lng),
  };
}

async function warmNearbyData(activeCategoryId) {
  if (!userLocation) return;
  const location = { lat: userLocation.lat, lng: userLocation.lng };
  const jobs = [];

  const dutyCategory = categories.find((category) => category.id === "duty");
  const dutyCacheKey = buildCacheKey("duty", location);
  if (activeCategoryId !== "duty" && !readCache(dutyCacheKey, dutyCategory.ttl)) {
    jobs.push(
      fetchDutyPharmacies(location, PREFETCH_RADIUS).then((places) => writeCache(dutyCacheKey, places)),
    );
  }

  const needsOsmPrefetch = osmCategories.some(
    (category) => !readCache(buildCacheKey(category.id, location), category.ttl),
  );
  if (needsOsmPrefetch) jobs.push(fetchOsmBundle(location));

  await Promise.allSettled(jobs);
}

function filterPlacesForRadius(places) {
  const radiusKm = Number(prefs.radius) / 1000;
  return places.filter((place) => place.distanceKm <= radiusKm).slice(0, 60);
}

function loadFavorites() {
  requestSerial += 1;
  activePlaces = [...favorites].sort((a, b) => {
    if (!userLocation) return a.name.localeCompare(b.name, "tr");
    const aDistance = distanceBetween(userLocation.lat, userLocation.lng, a.lat, a.lng);
    const bDistance = distanceBetween(userLocation.lat, userLocation.lng, b.lat, b.lng);
    return aDistance - bDistance;
  });

  if (userLocation) {
    activePlaces = activePlaces.map((place) => ({
      ...place,
      distanceKm: distanceBetween(userLocation.lat, userLocation.lng, place.lat, place.lng),
    }));
  }

  resultTitle.textContent = "Favoriler";
  statusText.textContent = favorites.length ? "Bu liste yalnız cihazında saklanıyor." : "Henüz favori eklemedin.";
  sourceText.textContent = "Favoriler: cihaz içi kayıt";
  renderPlaces(activePlaces, activeCategory);
}

function renderPlaces(places, category) {
  clearPlaceMarkers();
  results.replaceChildren();

  if (!places.length) {
    showState("empty", category.type === "favorites" ? "Bir yeri yıldızlayınca burada görünecek." : "Bu yarıçapta sonuç bulunamadı. 5 km seçip tekrar deneyebilirsin.");
    return;
  }

  updateResultSummary(places);

  const resultFragment = document.createDocumentFragment();

  places.forEach((place, index) => {
    const icon = category.type === "favorites" ? iconForCategory(place.category) : category.icon;
    addPlaceMarker(place, icon);
    resultFragment.append(createResultCard(place, icon, index === 0));
  });

  results.append(resultFragment);
}

function createResultCard(place, icon, isNearest = false) {
  const fragment = resultTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".result-card");
  const main = fragment.querySelector(".result-main");
  const iconEl = fragment.querySelector(".result-icon");
  const nameEl = fragment.querySelector(".result-name");
  const nearestBadge = fragment.querySelector(".nearest-badge");
  const metaEl = fragment.querySelector(".result-meta");
  const addressEl = fragment.querySelector(".result-address");
  const favoriteButton = fragment.querySelector(".favorite-button");
  const directionsLink = fragment.querySelector(".directions-link");
  const phoneLink = fragment.querySelector(".phone-link");

  card.dataset.placeId = place.id;
  card.classList.toggle("is-nearest", isNearest);
  nearestBadge.hidden = !isNearest;
  iconEl.textContent = icon;
  nameEl.textContent = place.name;
  metaEl.textContent = buildMeta(place);
  addressEl.textContent = place.address || "Adres bilgisi yok";
  favoriteButton.textContent = isFavorite(place.id) ? "★" : "☆";
  favoriteButton.classList.toggle("is-favorite", isFavorite(place.id));
  favoriteButton.setAttribute("aria-label", isFavorite(place.id) ? "Favoriden çıkar" : "Favoriye ekle");

  main.addEventListener("click", () => focusPlace(place));
  favoriteButton.addEventListener("click", () => toggleFavorite(place));

  directionsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.lat},${place.lng}`)}`;

  if (place.phone) {
    phoneLink.hidden = false;
    phoneLink.href = `tel:${place.phone.replace(/[^+\d]/g, "")}`;
  }

  return fragment;
}

function buildMeta(place) {
  const parts = [];
  if (Number.isFinite(place.distanceKm)) parts.push(formatDistance(place.distanceKm));
  if (place.openingHours) parts.push(place.openingHours);
  if (place.category === "duty") parts.push("Nöbetçi");
  return parts.join(" · ");
}

function addPlaceMarker(place, icon) {
  const marker = L.marker([place.lat, place.lng], {
    icon: L.divIcon({
      className: "",
      html: `<div class="place-marker">${escapeHtml(icon)}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    }),
  })
    .bindTooltip(escapeHtml(place.name), { direction: "top", offset: [0, -14] })
    .addTo(map);

  marker.on("click", () => scrollToResult(place.id));
  markers.push(marker);
}

function focusPlace(place) {
  applySheetState("peek");
  map.setView([place.lat, place.lng], Math.max(map.getZoom(), 16), { animate: mapShouldAnimate });
  const marker = markers.find((item) => {
    const point = item.getLatLng();
    return Math.abs(point.lat - place.lat) < 0.000001 && Math.abs(point.lng - place.lng) < 0.000001;
  });
  marker?.openTooltip();
}

function scrollToResult(placeId) {
  if (sheet.dataset.state === "peek") applySheetState("half");
  const target = [...results.querySelectorAll(".result-card")].find((card) => card.dataset.placeId === placeId);
  target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearPlaceMarkers() {
  markers.forEach((marker) => marker.remove());
  markers = [];
}

function toggleFavorite(place) {
  if (isFavorite(place.id)) favorites = favorites.filter((item) => item.id !== place.id);
  else favorites = [...favorites, { ...place }];

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

  if (activeCategory.type === "favorites") loadFavorites();
  else renderPlaces(activePlaces, activeCategory);
}

function isFavorite(id) {
  return favorites.some((item) => item.id === id);
}

function iconForCategory(categoryId) {
  return categories.find((item) => item.id === categoryId)?.icon || "•";
}

function buildCacheKey(categoryId, location = userLocation) {
  const roundedLat = location.lat.toFixed(3);
  const roundedLng = location.lng.toFixed(3);
  return `${CACHE_PREFIX}${categoryId}:${roundedLat}:${roundedLng}:${PREFETCH_RADIUS}`;
}

function readCache(key, ttl) {
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (!cached || Date.now() - cached.savedAt > ttl) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Cache failure must never block the map.
  }
}

function persistPrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function showState(kind, message) {
  resultSummary.textContent = kind === "loading" ? "Aranıyor…" : "Henüz sonuç yok";
  results.innerHTML = `<div class="${kind}-state">${escapeHtml(message)}</div>`;
}

function updateResultSummary(places) {
  if (!places.length) {
    resultSummary.textContent = "Bu yarıçapta sonuç yok";
    return;
  }

  const nearest = places.find((place) => Number.isFinite(place.distanceKm));
  const nearestText = nearest ? ` · en yakın ${formatDistance(nearest.distanceKm)}` : "";
  resultSummary.textContent = `${places.length} sonuç${nearestText}`;
}

function applySheetState(state) {
  const nextState = SHEET_STATES.includes(state) ? state : "half";
  sheet.dataset.state = nextState;
  prefs.sheetState = nextState;
  persistPrefs();

  const labels = {
    peek: "Paneli aç",
    half: "Paneli genişlet",
    expanded: "Paneli küçült",
  };
  sheetToggle.setAttribute("aria-label", labels[nextState]);
}

function cycleSheetState() {
  const currentIndex = SHEET_STATES.indexOf(sheet.dataset.state || "half");
  const nextState = SHEET_STATES[(currentIndex + 1) % SHEET_STATES.length];
  applySheetState(nextState);
}

function distanceBetween(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm) {
  return distanceKm < 1 ? `${Math.max(1, Math.round(distanceKm * 1000))} m` : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

console.info(`Yakınımda v${APP_VERSION}`);
