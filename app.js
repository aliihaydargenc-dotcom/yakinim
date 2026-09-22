const APP_VERSION = "2.0.0";
const DEFAULT_CENTER = [39.0, 35.0];
const DEFAULT_ZOOM = 6;
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const DUTY_ENDPOINT = "https://eczaneadresi.com/api/public/v1/nearest-pharmacies";
const PREFS_KEY = "yakinimda:prefs:v1";
const FAVORITES_KEY = "yakinimda:favorites:v1";
const CACHE_PREFIX = "yakinimda:cache:v3:";
const PREFETCH_RADIUS = 5000;
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const SHEET_STATES = ["peek", "half", "expanded"];

const categories = [
  { id: "cafe", label: "Kafe", icon: "☕", type: "osm", filter: '[amenity=cafe]', ttl: 6 * 60 * 60 * 1000 },
  { id: "park", label: "Park", icon: "♧", type: "osm", filter: '[leisure=park]', ttl: 6 * 60 * 60 * 1000 },
  { id: "shopping", label: "Alışveriş", icon: "▱", type: "osm", filter: '[shop~"^(mall|department_store|clothes)$"]', ttl: 6 * 60 * 60 * 1000 },

  { id: "all", label: "Tümü", icon: "◈", type: "all", ttl: 6 * 60 * 60 * 1000 },
  { id: "duty", label: "Nöbetçi Eczane", icon: "+", type: "duty", ttl: 15 * 60 * 1000 },
  { id: "market", label: "Market", icon: "🛒", type: "osm", filter: '[shop~"^(supermarket|convenience)$"]', ttl: 6 * 60 * 60 * 1000 },
  { id: "greengrocer", label: "Manav", icon: "●", type: "osm", filter: "[shop=greengrocer]", ttl: 6 * 60 * 60 * 1000 },
  { id: "bakery", label: "Fırın", icon: "◇", type: "osm", filter: "[shop=bakery]", ttl: 6 * 60 * 60 * 1000 },
  { id: "pharmacy", label: "Eczane", icon: "+", type: "osm", filter: "[amenity=pharmacy]", ttl: 6 * 60 * 60 * 1000 },
  { id: "atm", label: "ATM", icon: "₺", type: "osm", filter: "[amenity=atm]", ttl: 6 * 60 * 60 * 1000 },
  { id: "hospital", label: "Sağlık", icon: "✚", type: "osm", filter: '[amenity~"^(hospital|clinic|doctors)$"]', ttl: 6 * 60 * 60 * 1000 },
  { id: "fuel", label: "Akaryakıt", icon: "⛽", type: "osm", filter: "[amenity=fuel]", ttl: 6 * 60 * 60 * 1000 },
  { id: "parking", label: "Otopark", icon: "P", type: "osm", filter: "[amenity=parking]", ttl: 6 * 60 * 60 * 1000 },
  { id: "food", label: "Yemek", icon: "☕", type: "osm", filter: '[amenity~"^(restaurant|fast_food)$"]', ttl: 6 * 60 * 60 * 1000 },
  { id: "favorites", label: "Favoriler", icon: "★", type: "favorites", ttl: 0 },
];
const categoryOrder = ["all", "cafe", "food", "market", "shopping", "park", "duty", "bakery", "greengrocer", "pharmacy", "atm", "hospital", "fuel", "parking", "favorites"];
categories.sort((a,b) => categoryOrder.indexOf(a.id) - categoryOrder.indexOf(b.id));
const osmCategories = categories.filter((category) => category.type === "osm");
const mapShouldAnimate = !window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches;

const prefs = readJson(PREFS_KEY, { radius: 3000, category: "all" });
let favorites = readJson(FAVORITES_KEY, []);
let userLocation = null;
let activeCategory = categories[0];
let searchTerm = "";
let activePlaces = [];
let markers = [];
let userMarker = null;
let userAccuracyCircle = null;
let requestSerial = 0;
let locationAttemptSerial = 0;
let manualLocationMode = false;
let osmBundleRequest = null;

const map = L.map("map", {
  zoomControl: false,
  attributionControl: false,
  preferCanvas: true,
  zoomSnap: 0.5,
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.maplibreGL({
  style: MAP_STYLE_URL,
}).addTo(map);

L.control.zoom({ position: "topright" }).addTo(map);

const categoryStrip = document.querySelector("#categoryStrip");
const results = document.querySelector("#results");
const resultTitle = document.querySelector("#resultTitle");
const statusText = document.querySelector("#statusText");
const radiusSelect = document.querySelector("#radiusSelect");
const locateButton = document.querySelector("#locateButton");
const manualLocationButton = document.querySelector("#manualLocationButton");
const sourceText = document.querySelector("#sourceText");
const resultSummary = document.querySelector("#resultSummary");
const sheet = document.querySelector(".sheet");
const sheetToggle = document.querySelector("#sheetToggle");
const nearestAction = document.querySelector("#nearestAction");
const nearestActionMeta = document.querySelector("#nearestActionMeta");
const resultTemplate = document.querySelector("#resultTemplate");

radiusSelect.value = String(prefs.radius);
applySheetState("expanded");
renderCategoryButtons();
showState("empty", "Çevrendeki yerleri görmek için konumunu kullan veya haritadan bir nokta seç.");

locateButton.addEventListener("click", () => locateUser({ forceFresh: true }));
manualLocationButton.addEventListener("click", enableManualLocationMode);
map.on("click", handleManualMapClick);
let sheetGestureStartY = null;
let sheetGestureConsumed = false;

sheetToggle.addEventListener("pointerdown", startSheetGesture);
sheetToggle.addEventListener("pointerup", endSheetGesture);
sheetToggle.addEventListener("pointercancel", cancelSheetGesture);
sheetToggle.addEventListener("click", () => {
  if (sheetGestureConsumed) {
    sheetGestureConsumed = false;
    return;
  }
  cycleSheetState();
});
radiusSelect.addEventListener("change", () => {
  prefs.radius = Number(radiusSelect.value);
  persistPrefs();
  if (userLocation && activeCategory.type !== "favorites") loadCategory(activeCategory);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
      await registration.update();
    } catch {
      // PWA update failures must never block the map.
    }
  });
}

document.querySelector("#startLocation").addEventListener("click", () => locateUser({ forceFresh: false }));
document.querySelector("#pickLocation").addEventListener("click", enableManualLocationMode);
document.querySelector("#placeSearch").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLocaleLowerCase("tr");
  renderPlaces(activePlaces, activeCategory);
});
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
setView("list");
function setView(view) {
  document.body.dataset.view = view;
  if (view === "map") window.scrollTo(0, 0);
  document.querySelectorAll("[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
  requestAnimationFrame(() => { map.invalidateSize(); if (view === "map") fitResultsOnMap(activePlaces); });
}

function renderCategoryButtons() {
  categoryStrip.replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-button";
    button.dataset.category = category.id;
    
    button.setAttribute("aria-pressed", String(category.id === activeCategory.id));
    button.innerHTML = `<span aria-hidden="true">${categorySvg(category.id)}</span><span>${escapeHtml(category.label)}</span>`;
    button.addEventListener("click", () => selectCategory(category));
    categoryStrip.append(button);
  });
}

function selectCategory(category) {
  requestSerial += 1;
  activeCategory = category;
  searchTerm = "";
  document.querySelector("#placeSearch").value = "";
  resultTitle.textContent = category.type === "all" ? "Yakınındaki yerler" : category.label;
  activePlaces = [];
  clearPlaceMarkers();
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

async function locateUser({ forceFresh = false } = {}) {
  if (!navigator.geolocation) {
    showLocationFailure("Bu tarayıcı konum özelliğini desteklemiyor.");
    return;
  }

  const serial = ++locationAttemptSerial;
  manualLocationMode = false;
  document.body.classList.remove("is-selecting-location");
  locateButton.disabled = true;
  locateButton.classList.add("is-loading");
  manualLocationButton.hidden = true;
  statusText.textContent = "Konum aranıyor…";
  showState("loading", "GPS konumu alınıyor…");

  const permissionState = await getGeolocationPermissionState();
  if (serial !== locationAttemptSerial) return;

  if (permissionState === "denied") {
    locateButton.disabled = false;
    locateButton.classList.remove("is-loading");
    showLocationFailure("Konum izni kapalı. Tarayıcı iznini açabilir veya haritadan konum seçebilirsin.");
    return;
  }

  const attempts = [
    { enableHighAccuracy: true, timeout: 15000, maximumAge: forceFresh ? 0 : 60 * 1000 },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
  ];

  let lastError = null;
  for (const options of attempts) {
    try {
      const position = await getCurrentPosition(options);
      if (serial !== locationAttemptSerial) return;
      applyUserPosition(position);
      return;
    } catch (error) {
      lastError = error;
      if (error?.code === 1) break;
    }
  }

  if (serial !== locationAttemptSerial) return;
  locateButton.disabled = false;
  locateButton.classList.remove("is-loading");
  showLocationFailure(locationErrorMessage(lastError));
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) return "prompt";

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state;
  } catch {
    return "prompt";
  }
}

function applyUserPosition(position) {
  locateButton.disabled = false;
  locateButton.classList.remove("is-loading");
  manualLocationButton.hidden = true;

  userLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    source: "gps",
  };

  document.querySelector("#welcome").hidden = true;
  drawUserLocation();
  map.flyTo([userLocation.lat, userLocation.lng], 15, {
    animate: mapShouldAnimate,
    duration: 0.7,
  });

  statusText.textContent = Number.isFinite(userLocation.accuracy)
    ? `Konum bulundu · yaklaşık ${Math.round(userLocation.accuracy)} m doğruluk`
    : "Konum bulundu.";

  if (activeCategory.type === "favorites") loadFavorites();
  else {
    loadCategory(activeCategory);
    warmNearbyData(activeCategory.id);
  }
}

function showLocationFailure(message) {
  statusText.textContent = message;
  manualLocationButton.hidden = false;
  showState("empty", "Konum bulunamadı. Yeniden deneyebilir veya haritada bulunduğun noktayı seçebilirsin.");
}

function locationErrorMessage(error) {
  if (error?.code === 1) return "Konum izni verilmedi.";
  if (error?.code === 2) return "Telefon şu an GPS konumu üretemedi.";
  if (error?.code === 3) return "GPS yanıtı zaman aşımına uğradı.";
  return "Konum alınamadı.";
}

function enableManualLocationMode() {
  locationAttemptSerial += 1;
  manualLocationMode = true;
  setView("map");
  locateButton.disabled = false;
  locateButton.classList.remove("is-loading");
  manualLocationButton.hidden = false;
  manualLocationButton.querySelector("span:last-child").textContent = "Haritaya dokun";
  document.body.classList.add("is-selecting-location");
  statusText.textContent = "Haritada bulunduğun noktaya dokun.";
  applySheetState("peek");
}

function handleManualMapClick(event) {
  if (!manualLocationMode) return;

  manualLocationMode = false;
  document.body.classList.remove("is-selecting-location");
  manualLocationButton.hidden = true;
  manualLocationButton.querySelector("span:last-child").textContent = "Haritadan seç";

  userLocation = {
    lat: event.latlng.lat,
    lng: event.latlng.lng,
    accuracy: null,
    source: "manual",
  };

  document.querySelector("#welcome").hidden = true;
  drawUserLocation();
  map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 15), {
    animate: mapShouldAnimate,
    duration: 0.6,
  });
  statusText.textContent = "Konum haritadan seçildi.";

  if (activeCategory.type === "favorites") loadFavorites();
  else {
    loadCategory(activeCategory);
    warmNearbyData(activeCategory.id);
  }
}

function drawUserLocation() {
  if (!userLocation) return;

  userMarker?.remove();
  userAccuracyCircle?.remove();

  if (Number.isFinite(userLocation.accuracy) && userLocation.accuracy > 0) {
    userAccuracyCircle = L.circle([userLocation.lat, userLocation.lng], {
      radius: Math.min(userLocation.accuracy, 500),
      color: "#176b52",
      weight: 1,
      fillColor: "#58b99a",
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(map);
  } else {
    userAccuracyCircle = null;
  }

  userMarker = L.marker([userLocation.lat, userLocation.lng], {
    interactive: false,
    zIndexOffset: 1000,
    icon: L.divIcon({
      className: "",
      html: '<div class="user-location-dot"><span></span></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  }).addTo(map);
}

async function loadCategory(category) {
  const serial = ++requestSerial;
  const location = { lat: userLocation.lat, lng: userLocation.lng };
  resultTitle.textContent = category.type === "all" ? "Yakınındaki yerler" : category.label;
  sourceText.textContent = category.type === "duty" ? "Veri: Eczane Adresi" : "Veri: OpenStreetMap";
  activePlaces = [];
  clearPlaceMarkers();
  showState("loading", `${category.label === "Tümü" ? "Yakınındaki yerler" : category.label} aranıyor…`);

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
      places = filterPlacesForRadius(category.type === "all" ? Object.values(bundle).flat().sort((a, b) => a.distanceKm - b.distanceKm) : (bundle[category.id] || []));
      if (category.type === "all") writeCache(cacheKey, Object.values(bundle).flat());
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
  if (["hospital", "clinic", "doctors"].includes(tags.amenity)) return categories.find((category) => category.id === "hospital");
  if (tags.amenity === "fuel") return categories.find((category) => category.id === "fuel");
  if (tags.amenity === "parking") return categories.find((category) => category.id === "parking");
  if (tags.amenity === "cafe") return categories.find(c => c.id === "cafe");
  if (tags.leisure === "park") return categories.find(c => c.id === "park");
  if (["mall", "department_store", "clothes"].includes(tags.shop)) return categories.find(c => c.id === "shopping");
  if (["restaurant", "fast_food"].includes(tags.amenity)) return categories.find((category) => category.id === "food");
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

  const needsOsmPrefetch = osmCategories.some(
    (category) => !readCache(buildCacheKey(category.id, location), category.ttl),
  );
  if (needsOsmPrefetch) jobs.push(fetchOsmBundle(location));

  await Promise.allSettled(jobs);
}

function filterPlacesForRadius(places) {
  const radiusKm = Number(prefs.radius) / 1000;
  return places.map(place => ({ ...place, distanceKm: userLocation ? distanceBetween(userLocation.lat, userLocation.lng, place.lat, place.lng) : place.distanceKm })).filter((place) => place.distanceKm <= radiusKm).sort((a,b) => a.distanceKm - b.distanceKm).slice(0, 60);
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
  if (searchTerm) places = places.filter(place => [place.name, place.address, categories.find(c => c.id === place.category)?.label].join(" ").toLocaleLowerCase("tr").includes(searchTerm));
  clearPlaceMarkers();
  results.replaceChildren();
  updateNearestAction(places);

  if (!places.length) {
    showState("empty", category.type === "favorites" ? "Bir yeri yıldızlayınca burada görünecek." : searchTerm ? "Aramana uyan yer bulunamadı. Farklı bir isim dene." : "Bu yarıçapta sonuç bulunamadı. 5 km seçip tekrar deneyebilirsin.");
    return;
  }

  updateResultSummary(places);

  const resultFragment = document.createDocumentFragment();

  places.forEach((place, index) => {
    const icon = ["favorites", "all"].includes(category.type) ? iconForCategory(place.category) : category.icon;
    addPlaceMarker(place, icon, index === 0);
    resultFragment.append(createResultCard(place, icon, index === 0));
  });

  results.append(resultFragment);
  fitResultsOnMap(places);
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
  iconEl.innerHTML = categorySvg(place.category);
  nameEl.textContent = place.name;
  metaEl.textContent = buildMeta(place);
  addressEl.textContent = place.address || "Adres bilgisi yok";
  favoriteButton.textContent = isFavorite(place.id) ? "★" : "☆";
  favoriteButton.classList.toggle("is-favorite", isFavorite(place.id));
  favoriteButton.setAttribute("aria-label", isFavorite(place.id) ? "Favoriden çıkar" : "Favoriye ekle");

  main.addEventListener("click", () => focusPlace(place));
  favoriteButton.addEventListener("click", () => toggleFavorite(place));

  directionsLink.href = buildDirectionsUrl(place);

  if (place.phone) {
    phoneLink.hidden = false;
    phoneLink.href = `tel:${place.phone.replace(/[^+\d]/g, "")}`;
  }

  return fragment;
}

function buildMeta(place) {
  const parts = [categories.find(c => c.id === place.category)?.label].filter(Boolean);
  if (Number.isFinite(place.distanceKm)) parts.push(formatDistance(place.distanceKm));
  if (place.openingHours) parts.push(place.openingHours);
  if (place.category === "duty") parts.push("Nöbetçi");
  return parts.join(" · ");
}

function addPlaceMarker(place, icon, isNearest = false) {
  const markerSize = isNearest ? 42 : 34;
  const marker = L.marker([place.lat, place.lng], {
    icon: L.divIcon({
      className: "",
      html: `<div class="place-marker${isNearest ? " is-nearest" : ""}"><span>${categorySvg(place.category)}</span></div>`,
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize / 2, markerSize / 2],
    }),
  })
    .bindTooltip(escapeHtml(place.name), { direction: "top", offset: [0, -14] })
    .addTo(map);

  marker.on("click", () => scrollToResult(place.id));
  markers.push(marker);
}

function fitResultsOnMap(places) {
  if (!userLocation || !places.length || manualLocationMode) return;

  const points = [
    [userLocation.lat, userLocation.lng],
    ...places.slice(0, 8).map((place) => [place.lat, place.lng]),
  ];
  const bounds = L.latLngBounds(points);
  const mobileBottomPadding = window.matchMedia("(max-width: 759px)").matches
    ? Math.min(270, Math.round(window.innerHeight * 0.32))
    : 40;

  map.fitBounds(bounds, {
    paddingTopLeft: [window.matchMedia("(min-width: 760px)").matches && document.body.dataset.view === "map" ? 450 : 24, 100],
    paddingBottomRight: [24, mobileBottomPadding],
    maxZoom: 15.5,
    animate: mapShouldAnimate,
  });
}

function focusPlace(place) {
  setView("map");
  applySheetState("peek");
  map.setView([place.lat, place.lng], Math.max(map.getZoom(), 16), { animate: mapShouldAnimate });
  const marker = markers.find((item) => {
    const point = item.getLatLng();
    return Math.abs(point.lat - place.lat) < 0.000001 && Math.abs(point.lng - place.lng) < 0.000001;
  });
  marker?.openTooltip();
}

function scrollToResult(placeId) {
  setView("list");
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
  nearestAction.hidden = true;
  nearestAction.removeAttribute("href");
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
  sheetToggle.setAttribute("aria-expanded", String(nextState !== "peek"));
}

function cycleSheetState() {
  const currentIndex = SHEET_STATES.indexOf(sheet.dataset.state || "half");
  const nextState = SHEET_STATES[(currentIndex + 1) % SHEET_STATES.length];
  applySheetState(nextState);
}

function startSheetGesture(event) {
  sheetGestureStartY = event.clientY;
  sheetGestureConsumed = false;
  sheetToggle.setPointerCapture?.(event.pointerId);
}

function endSheetGesture(event) {
  if (sheetGestureStartY === null) return;

  const deltaY = event.clientY - sheetGestureStartY;
  sheetGestureStartY = null;

  if (Math.abs(deltaY) < 36) return;

  const currentIndex = SHEET_STATES.indexOf(sheet.dataset.state || "half");
  const direction = deltaY < 0 ? 1 : -1;
  const nextIndex = Math.min(SHEET_STATES.length - 1, Math.max(0, currentIndex + direction));

  sheetGestureConsumed = true;
  applySheetState(SHEET_STATES[nextIndex]);
}

function cancelSheetGesture() {
  sheetGestureStartY = null;
  sheetGestureConsumed = false;
}

function updateNearestAction(places) {
  const nearest = places.find((place) => Number.isFinite(place.distanceKm));
  if (!nearest) {
    nearestAction.hidden = true;
    nearestAction.removeAttribute("href");
    nearestActionMeta.textContent = "";
    return;
  }

  nearestAction.href = buildDirectionsUrl(nearest);
  nearestActionMeta.textContent = `${nearest.name} · ${formatDistance(nearest.distanceKm)}`;
  nearestAction.hidden = false;
}

function buildDirectionsUrl(place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
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


function categorySvg(id) {
  const paths = {
    all: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    cafe: '<path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM16 8h2a3 3 0 1 1 0 6h-2M3 22h16M7 2v3M12 2v3"/>',
    food: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v19M19 3c-4 4-4 9 0 9v10M19 3v9"/>',
    market: '<path d="M3 3h2l3 12h11l2-9H6M9 20h.01M18 20h.01"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    shopping: '<path d="M5 7h14l2 14H3zM9 7V5a3 3 0 0 1 6 0v2"/>',
    park: '<path d="M12 3 6 10h3l-5 7h16l-5-7h3zM12 17v5"/>',
    duty: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    pharmacy: '<path d="m8 16 8-8M5 19a5 5 0 0 1 0-7l7-7a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7 0z"/>',
    bakery: '<path d="M5 11a4 4 0 0 1 0-8h14a4 4 0 0 1 0 8v9H5zM9 8v5M15 8v5"/>',
    greengrocer: '<path d="M12 7c-9-5-12 8-5 13 2 2 3 0 5 0s3 2 5 0c7-5 4-18-5-13M12 7c0-4 2-5 5-5"/>',
    atm: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 15h3M15 14h2v3h-2z"/>',
    hospital: '<path d="M5 22V4h14v18M2 22h20M9 22v-6h6v6M12 7v6M9 10h6"/>',
    fuel: '<path d="M4 21V3h10v18M2 21h14M7 6h4v5H7zM14 12h2v5a2 2 0 0 0 4 0V8l-3-3"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    favorites: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>'
  };
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id] || paths.all}</svg>`;
}
