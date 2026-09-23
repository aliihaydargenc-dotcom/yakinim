const APP_VERSION = "3.2.2";
const DEFAULT_CENTER = [39.0, 35.0];
const DEFAULT_ZOOM = 6;
const DUTY_ENDPOINT = "https://eczaneadresi.com/api/public/v1/nearest-pharmacies";
const PREFS_KEY = "yakinimda:prefs:v1";
const FAVORITES_KEY = "yakinimda:favorites:v1";
const ROUTE_KEY = "yakinimda:route:v1";
const DISCOVERY_SIGNALS_KEY = "yakinimda:discovery-signals:v1";
const DISCOVERY_CARD_LIMIT = 4;
const DISCOVERY_PERSONALIZATION_THRESHOLD = 5;
const NEWS_CATEGORIES = ["gundem", "turkiye", "dunya", "ekonomi", "teknoloji", "yasam"];
const RADIO_SCOPES = ["turkiye"];
const RADIO_FAVORITES_KEY = "yakinimda:radio-favorites:v1";
const RADIO_RECENTS_KEY = "yakinimda:radio-recents:v1";
const RADIO_VOLUME_KEY = "yakinimda:radio-volume:v1";
const CATEGORY_QUERY_ALIASES = Object.freeze({
  cafe: ["kafe", "kahve", "coffee"],
  food: ["yemek", "restoran", "lokanta", "fast food"],
  market: ["market", "süpermarket", "supermarket"],
  shopping: ["alışveriş", "magaza", "mağaza", "avm"],
  park: ["park"],
  pharmacy: ["eczane"],
  atm: ["atm", "bankamatik"],
  hospital: ["hastane", "klinik", "doktor", "sağlık"],
  fuel: ["akaryakıt", "benzin", "petrol"],
  parking: ["otopark", "park yeri"],
  bakery: ["fırın", "firin"],
  greengrocer: ["manav"],
});
const CACHE_PREFIX = "yakinimda:cache:v4:";
const LAST_LOCATION_KEY = "yakinimda:last-location:v1";
const VIEWPORT_CACHE_PREFIX = "yakinimda:viewport:v1:";
const SPATIAL_CELL_CACHE_PREFIX = "yakinimda:spatial-cell:v1:";
const PREFETCH_RADIUS = 5000;
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const SHEET_STATES = ["peek", "half", "expanded"];
const MOTION = Object.freeze({
  fast: 160,
  standard: 260,
  slow: 420,
  spring: "cubic-bezier(.16, 1, .3, 1)",
});
const MAP_CLUSTER_MIN_COUNT = 8;
const MAP_CLUSTER_MAX_ZOOM = 14;
const STALE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
const FAST_LOCATION_TIMEOUT = 5000;
const ACCURATE_LOCATION_TIMEOUT = 12000;
const LOCATION_REFRESH_DISTANCE_M = 120;
const LAST_LOCATION_MAX_AGE = 3 * 24 * 60 * 60 * 1000;
const VIEWPORT_GRID_DEGREES = 0.01;
const VIEWPORT_CACHE_TTL = 4 * 60 * 60 * 1000;
const VIEWPORT_STALE_TTL = 24 * 60 * 60 * 1000;
const VIEWPORT_REQUEST_TIMEOUT = 8000;
const VIEWPORT_FALLBACK_TIMEOUT = 5500;
const VIEWPORT_DEBOUNCE_MS = 280;
const VIEWPORT_MIN_ZOOM = 13;
const VIEWPORT_MAX_SPAN_DEGREES = 0.12;
const MAX_VISIBLE_PLACES = 120;
const SPATIAL_CELL_DEGREES = 0.01;
const SPATIAL_PREFETCH_PAD = 0.62;
const SPATIAL_POOL_LIMIT = 1800;
const SPATIAL_CELL_FRESH_MS = 4 * 60 * 60 * 1000;
const SPATIAL_CELL_STALE_MS = 24 * 60 * 60 * 1000;
const LABEL_MARKER_GAP_PX = 7;

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
const mapShouldAnimate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobileLayout = window.matchMedia("(max-width: 759px)").matches;

const prefs = readJson(PREFS_KEY, { category: "all" });
let favorites = readJson(FAVORITES_KEY, []);
let routeStops = readJson(ROUTE_KEY, []).filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng)).slice(0, 4);
let discoverySignals = readJson(DISCOVERY_SIGNALS_KEY, { categoryViews: {}, placeViews: {}, lastCategory: null, interactions: 0 });
let userLocation = null;
let activeCategory = categories.find((category) => category.id === prefs.category) || categories[0];
let searchTerm = "";
let activePlaces = [];
let markers = [];
let placeMarkerById = new Map();
let clusterMarkers = [];
let selectedPlace = null;
let detailTrigger = null;
let quickCardReturnSheetState = "peek";
let quickCardReturnHistoryState = "map-peek";
let lastDiscoveryInteraction = { placeId: null, at: 0 };
let appSection = "nearby";
let activeNewsCategory = "gundem";
let activeRadioScope = "turkiye";
let activeRadioLibrary = "discover";
let radioSearchTerm = "";
let currentRadioStation = null;
let currentRadioStreamIndex = 0;
let radioRecoveryInProgress = false;
let radioPlaybackSerial = 0;
let radioStallTimer = 0;
let lastRenderedRadioStations = [];
let radioFavoriteStations = readJson(RADIO_FAVORITES_KEY, []).filter(station => station?.id && station?.streamUrl).slice(0, 60);
let radioRecentStations = readJson(RADIO_RECENTS_KEY, []).filter(station => station?.id && station?.streamUrl).slice(0, 20);
const savedRadioVolume = Number(localStorage.getItem(RADIO_VOLUME_KEY));
let radioVolumeLevel = Number.isFinite(savedRadioVolume) ? Math.min(1, Math.max(0, savedRadioVolume)) : .8;
const newsClientCache = new Map();
const radioClientCache = new Map();
const failedRadioArtwork = new Set();
let listScrollY = 0;
let mapHasFramedResults = false;
let toastTimer;
let sectionTransitionTimer = 0;
let sectionTransitionStartedAt = 0;
let userMarker = null;
let userAccuracyCircle = null;
let requestSerial = 0;
let locationAttemptSerial = 0;
let manualLocationMode = false;
let lastDiscoveryBundle = null;
let renderedMapPlaces = [];
let mapLabelFrame = 0;
let viewportRefreshTimer = 0;
let viewportRequestSerial = 0;
let activeViewportRequest = null;
let spatialPoiPool = new Map();
let spatialCellState = new Map();

const map = L.map("map", {
  zoomControl: false,
  attributionControl: false,
  preferCanvas: true,
  zoomSnap: 0.5,
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

map.createPane("placeLabels");
const placeLabelPane = map.getPane("placeLabels");
placeLabelPane.style.zIndex = "690";
placeLabelPane.style.pointerEvents = "none";

let baseMapLayer = null;
let baseMapMode = "loading";
let vectorLoadTimer = 0;
let rasterTileErrorCount = 0;

initializeBaseMap();

function supportsVectorBaseMap() {
  try {
    if (!window.maplibregl || typeof L.maplibreGL !== "function") return false;
    if (typeof window.maplibregl.supported === "function") return window.maplibregl.supported();
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

function initializeBaseMap() {
  if (supportsVectorBaseMap()) {
    try {
      const vectorLayer = L.maplibreGL({ style: MAP_STYLE_URL });
      vectorLayer.addTo(map);
      baseMapLayer = vectorLayer;
      baseMapMode = "vector";
      document.body.classList.add("map-vector");
      document.body.classList.remove("map-raster", "map-tile-degraded");

      const glMap = vectorLayer.getMaplibreMap?.();
      if (glMap) {
        let loaded = Boolean(glMap.loaded?.());
        const confirmLoaded = () => {
          loaded = true;
          clearTimeout(vectorLoadTimer);
          document.body.classList.remove("map-base-loading");
          map.invalidateSize({ pan: false });
        };
        glMap.on?.("load", confirmLoaded);
        glMap.on?.("error", event => console.warn("Vector map resource error", event?.error || event));
        if (!loaded) {
          document.body.classList.add("map-base-loading");
          vectorLoadTimer = setTimeout(() => {
            if (loaded || glMap.loaded?.()) return confirmLoaded();
            switchToRasterBaseMap("Vector map load timeout");
          }, 12000);
        } else {
          confirmLoaded();
        }
      }
      return;
    } catch (error) {
      console.warn("Vector map unavailable; loading raster fallback.", error);
    }
  }
  switchToRasterBaseMap("WebGL/MapLibre unavailable");
}

function switchToRasterBaseMap(reason = "") {
  clearTimeout(vectorLoadTimer);
  if (baseMapLayer && map.hasLayer(baseMapLayer)) {
    try { map.removeLayer(baseMapLayer); } catch {}
  }

  baseMapMode = "raster";
  document.body.classList.remove("map-vector", "map-base-loading");
  document.body.classList.add("map-raster");
  console.warn("Raster map fallback active.", reason);

  const rasterLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
    crossOrigin: true,
    updateWhenZooming: false,
    updateWhenIdle: true,
    keepBuffer: 4,
    detectRetina: false,
    className: "base-map-tile",
  });

  rasterLayer.on("tileerror", () => {
    rasterTileErrorCount += 1;
    if (rasterTileErrorCount >= 4) document.body.classList.add("map-tile-degraded");
  });
  rasterLayer.on("load", () => {
    rasterTileErrorCount = 0;
    document.body.classList.remove("map-tile-degraded");
    map.invalidateSize({ pan: false });
  });

  rasterLayer.addTo(map);
  baseMapLayer = rasterLayer;
  L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);
  setMapAttributionForMode("raster");
}

function setMapAttributionForMode(mode) {
  const apply = () => {
    const attribution = document.querySelector(".osm-attribution");
    if (!attribution) return;
    if (mode === "raster") {
      attribution.href = "https://www.openstreetmap.org/copyright";
      attribution.textContent = "Harita: © OpenStreetMap contributors";
      return;
    }
    attribution.href = "https://openfreemap.org/";
    attribution.textContent = "Harita: OpenFreeMap · OpenMapTiles · © OpenStreetMap";
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();
}

L.control.zoom({ position: "topright" }).addTo(map);
map.on("moveend", handleMapMoveEnd);
map.on("zoomend", handleMapZoomEnd);
map.on("dragstart", handleMapDragStart);

const categoryStrip = document.querySelector("#categoryStrip");
const results = document.querySelector("#results");
const resultTitle = document.querySelector("#resultTitle");
const statusText = document.querySelector("#statusText");

const locateButton = document.querySelector("#locateButton");
const manualLocationButton = document.querySelector("#manualLocationButton");
const sourceText = document.querySelector("#sourceText");
const resultSummary = document.querySelector("#resultSummary");
const sheet = document.querySelector(".sheet");
const sheetToggle = document.querySelector("#sheetToggle");
const nearestAction = document.querySelector("#nearestAction");
const nearestActionMeta = document.querySelector("#nearestActionMeta");
const resultTemplate = document.querySelector("#resultTemplate");
const discoveryHub = document.querySelector("#discoveryHub");
const discoveryCards = document.querySelector("#discoveryCards");
const discoverySummary = document.querySelector("#discoverySummary");
const mapContext = document.querySelector("#mapContext");
const mapContextIcon = document.querySelector("#mapContextIcon");
const mapContextLabel = document.querySelector("#mapContextLabel");
const mapContextMeta = document.querySelector("#mapContextMeta");
const placeSearchInput = document.querySelector("#placeSearch");
const mapSearchInput = document.querySelector("#mapSearch");
const mapSearchClear = document.querySelector("#mapSearchClear");
const recenterButton = document.querySelector("#recenterButton");
const mapQuickCard = document.querySelector("#mapQuickCard");
const quickIcon = document.querySelector("#quickIcon");
const quickName = document.querySelector("#quickName");
const quickMeta = document.querySelector("#quickMeta");
const quickAddress = document.querySelector("#quickAddress");
const quickStatus = document.querySelector("#quickStatus");
const quickDirections = document.querySelector("#quickDirections");
const quickFavorite = document.querySelector("#quickFavorite");
const quickDetails = document.querySelector("#quickDetails");
const quickShare = document.querySelector("#quickShare");
const quickClose = document.querySelector("#quickClose");
const sectionNav = document.querySelector("#sectionNav");
const sectionTransition = document.querySelector("#sectionTransition");
const sectionTransitionLabel = document.querySelector("#sectionTransitionLabel");
const newsSection = document.querySelector("#newsSection");
const newsList = document.querySelector("#newsList");
const newsStatus = document.querySelector("#newsStatus");
const radioSection = document.querySelector("#radioSection");
const radioList = document.querySelector("#radioList");
const radioStatus = document.querySelector("#radioStatus");
const radioSearch = document.querySelector("#radioSearch");
const radioSearchClear = document.querySelector("#radioSearchClear");
const radioLibraryTabs = document.querySelector("#radioLibraryTabs");
const radioPlayer = document.querySelector("#radioPlayer");
const radioPlayerAvatar = document.querySelector("#radioPlayerAvatar");
const radioPlayerName = document.querySelector("#radioPlayerName");
const radioPlayerMeta = document.querySelector("#radioPlayerMeta");
const radioPlayToggle = document.querySelector("#radioPlayToggle");
const radioPlayerExpand = document.querySelector("#radioPlayerExpand");
const radioPlayerFavorite = document.querySelector("#radioPlayerFavorite");
const radioPlayerShare = document.querySelector("#radioPlayerShare");
const radioPlayerHomepage = document.querySelector("#radioPlayerHomepage");
const radioPrev = document.querySelector("#radioPrev");
const radioNext = document.querySelector("#radioNext");
const radioVolume = document.querySelector("#radioVolume");
const radioPlayerClose = document.querySelector("#radioPlayerClose");
const radioAudio = document.querySelector("#radioAudio");

applySheetState("expanded");
renderCategoryButtons();
showState("empty", "Çevrendeki yerleri görmek için konumunu kullan veya haritadan bir nokta seç.");

locateButton.addEventListener("click", () => locateUser({ forceFresh: true }));
manualLocationButton.addEventListener("click", enableManualLocationMode);
mapContext?.addEventListener("click", () => {
  if (document.body.dataset.view !== "map") return;
  if (sheet.dataset.state === "peek") expandMapPanel();
  else if (sheet.dataset.state === "half") applySheetState("expanded");
});
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
  if (document.body.dataset.view === "map" && sheet.dataset.state === "peek") expandMapPanel();
  else if (document.body.dataset.view === "map" && sheet.dataset.state === "expanded") collapseMapPanel();
  else cycleSheetState();
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
placeSearchInput.addEventListener("input", event => handleSearchInput(event.target.value));
mapSearchInput?.addEventListener("input", event => handleSearchInput(event.target.value));
mapSearchClear?.addEventListener("click", () => {
  handleSearchInput("");
  mapSearchInput?.focus();
});
recenterButton?.addEventListener("click", recenterOnUser);
quickClose?.addEventListener("click", () => dismissMapQuickCard());
quickShare?.addEventListener("click", () => { if (selectedPlace) sharePlace(selectedPlace); });
quickFavorite?.addEventListener("click", () => { if (selectedPlace) toggleFavorite(selectedPlace); });
quickDetails?.addEventListener("click", () => {
  if (!selectedPlace) return;
  const place = selectedPlace;
  const trigger = detailTrigger;
  closeMapQuickCard({ clearSelection: false });
  openPlaceDetails(place, trigger);
});
sectionNav?.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => setSection(button.dataset.section)));
newsSection?.querySelectorAll("[data-news-category]").forEach(button => button.addEventListener("click", () => loadNews(button.dataset.newsCategory)));
radioLibraryTabs?.querySelectorAll("[data-radio-library]").forEach(button => button.addEventListener("click", () => selectRadioLibrary(button.dataset.radioLibrary)));
radioSearch?.addEventListener("input", event => {
  radioSearchTerm = normalizeSearchValue(event.target.value);
  if (radioSearchClear) radioSearchClear.hidden = !radioSearchTerm;
  renderRadioStations(currentRadioPayload());
});
radioSearchClear?.addEventListener("click", () => {
  radioSearchTerm = "";
  if (radioSearch) {
    radioSearch.value = "";
    radioSearch.focus();
  }
  radioSearchClear.hidden = true;
  renderRadioStations(currentRadioPayload());
});
radioPlayToggle?.addEventListener("click", toggleRadioPlayback);
radioPlayerExpand?.addEventListener("click", toggleRadioPlayerExpanded);
radioPlayerFavorite?.addEventListener("click", () => { if (currentRadioStation) toggleRadioFavorite(currentRadioStation); });
radioPlayerShare?.addEventListener("click", () => { if (currentRadioStation) shareRadioStation(currentRadioStation); });
radioPrev?.addEventListener("click", () => stepRadioStation(-1));
radioNext?.addEventListener("click", () => stepRadioStation(1));
radioVolume?.addEventListener("input", event => setRadioVolume(Number(event.target.value) / 100));
radioPlayerClose?.addEventListener("click", closeRadioPlayer);
radioAudio?.addEventListener("play", syncRadioPlayerState);
radioAudio?.addEventListener("playing", () => {
  clearRadioStallTimer();
  syncRadioPlayerState();
});
radioAudio?.addEventListener("pause", () => {
  clearRadioStallTimer();
  syncRadioPlayerState();
});
radioAudio?.addEventListener("waiting", () => scheduleRadioRecovery("waiting"));
radioAudio?.addEventListener("stalled", () => scheduleRadioRecovery("stalled"));
radioAudio?.addEventListener("ended", () => {
  clearRadioStallTimer();
  syncRadioPlayerState();
  if (currentRadioStation) recoverRadioStream("ended");
});
radioAudio?.addEventListener("error", () => {
  clearRadioStallTimer();
  syncRadioPlayerState();
  if (currentRadioStation) recoverRadioStream("error");
});
setRadioVolume(radioVolumeLevel);
syncRadioLibraryTabs();
configureRadioMediaSession();
document.querySelectorAll(".view-switch button[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelector("#closeDetail").addEventListener("click", () => {
  if (document.body.dataset.view === "map" && history.state?.yakinimView === "map-detail") history.back();
  else closePlaceDetails();
});
document.querySelector("#detailFavorite").addEventListener("click", () => { if (selectedPlace) toggleFavorite(selectedPlace); });
document.querySelector("#detailRoute").addEventListener("click", () => { if (selectedPlace) toggleRouteStop(selectedPlace); });
document.querySelector("#detailMap").addEventListener("click", () => { if (selectedPlace) focusPlace(selectedPlace); });
document.querySelector("#clearRoute").addEventListener("click", () => { routeStops = []; persistRoute(); renderRoute(); showToast("Rota temizlendi"); });
document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || !selectedPlace) return;
  if (!mapQuickCard?.hidden) dismissMapQuickCard();
  else closePlaceDetails();
});
history.replaceState({ ...history.state, yakinimView: "list", yakinimSection: "nearby" }, "", location.href);
window.addEventListener("popstate", event => {
  const stateSection = event.state?.yakinimSection || "nearby";
  if (stateSection !== appSection) setSection(stateSection, { pushHistory: false });
  if (stateSection !== "nearby") return;

  const state = event.state?.yakinimView;

  if (state === "map-place") {
    closePlaceDetails(false);
    document.body.dataset.view = "map";
    const returnSheetState = event.state?.returnSheetState || "peek";
    applySheetState(returnSheetState);
    const place = findKnownPlace(event.state?.placeId);
    if (place) openMapQuickCard(place, null, { pushHistory: false, returnSheetState });
    requestAnimationFrame(() => map.invalidateSize());
    return;
  }

  closeMapQuickCard({ clearSelection: false, restoreSheet: false });
  closePlaceDetails(false);
  const isMapState = state === "map-peek" || state === "map-open" || state === "map-detail";
  document.body.dataset.view = isMapState ? "map" : "list";
  applySheetState(state === "map-peek" ? "peek" : isMapState ? "half" : "expanded");
  document.querySelectorAll(".view-switch button[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === document.body.dataset.view)));
  updateMapContext(renderedMapPlaces, activeCategory);
  requestAnimationFrame(() => map.invalidateSize());
});
renderRoute();
setView(isMobileLayout ? "map" : "list", isMobileLayout ? "peek" : "expanded");
bootstrapLocationDiscovery();
window.addEventListener("resize", syncMapControlOffset);
syncMapControlOffset();
function showSectionTransition(section) {
  if (!sectionTransition) return;
  clearTimeout(sectionTransitionTimer);
  sectionTransitionStartedAt = Date.now();
  const labels = { nearby: "Yakınım açılıyor…", news: "Haberler yükleniyor…", radio: "Radyo hazırlanıyor…" };
  if (sectionTransitionLabel) sectionTransitionLabel.textContent = labels[section] || "Yükleniyor…";
  sectionTransition.hidden = false;
  document.body.classList.add("section-transitioning");
  sectionTransitionTimer = setTimeout(() => hideSectionTransition(0), 900);
}

function hideSectionTransition(minVisible = 220) {
  if (!sectionTransition || sectionTransition.hidden) return;
  clearTimeout(sectionTransitionTimer);
  const remaining = Math.max(0, minVisible - (Date.now() - sectionTransitionStartedAt));
  sectionTransitionTimer = setTimeout(() => {
    sectionTransition.hidden = true;
    document.body.classList.remove("section-transitioning");
  }, remaining);
}

function setSection(section, { pushHistory = true } = {}) {
  const next = ["nearby", "news", "radio"].includes(section) ? section : "nearby";
  if (next === appSection) {
    if (next === "nearby") animateIn(sheet);
    else animateIn(next === "news" ? newsSection : radioSection);
    return;
  }

  showSectionTransition(next);
  appSection = next;
  document.body.dataset.section = next;
  sectionNav?.querySelectorAll("[data-section]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.section === next));
  });

  if (next !== "nearby") {
    closeMapQuickCard({ clearSelection: true, restoreSheet: false });
    closePlaceDetails(false);
    document.body.dataset.view = "list";
    document.querySelectorAll(".view-switch button[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === "list")));
  }

  if (next !== "radio") {
    radioPlayer?.classList.remove("is-expanded");
    document.body.classList.remove("radio-player-expanded");
  }

  newsSection.hidden = next !== "news";
  radioSection.hidden = next !== "radio";

  if (pushHistory) {
    history.pushState({
      yakinimView: next === "nearby" ? "list" : `section-${next}`,
      yakinimSection: next,
    }, "", location.href);
  }

  window.scrollTo(0, 0);
  if (next === "news") {
    animateIn(newsSection);
    loadNews(activeNewsCategory);
  } else if (next === "radio") {
    animateIn(radioSection);
    loadRadio(activeRadioScope);
  } else {
    animateIn(sheet);
    requestAnimationFrame(() => map.invalidateSize());
    hideSectionTransition(240);
  }
}

async function loadNews(category = activeNewsCategory, { force = false } = {}) {
  if (!NEWS_CATEGORIES.includes(category)) category = "gundem";
  activeNewsCategory = category;
  newsSection?.querySelectorAll("[data-news-category]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.newsCategory === category)));

  const cached = newsClientCache.get(category);
  if (cached && !force) {
    renderNews(cached);
    hideSectionTransition(220);
    return;
  }

  newsStatus.textContent = "Haberler yükleniyor…";
  newsList.innerHTML = '<div class="module-loading"><span class="module-spinner" aria-hidden="true"></span><span>Güncel başlıklar alınıyor…</span></div>';
  try {
    const response = await fetch(`/api/news?category=${encodeURIComponent(category)}&v=${encodeURIComponent(APP_VERSION)}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("news_" + response.status);
    const payload = await response.json();
    newsClientCache.set(category, payload);
    renderNews(payload);
  } catch {
    newsStatus.textContent = "Haber akışı şu an alınamıyor.";
    newsList.innerHTML = '<button class="module-retry" type="button">Yeniden dene</button>';
    newsList.querySelector("button")?.addEventListener("click", () => loadNews(category, { force: true }));
  } finally {
    hideSectionTransition(220);
  }
}

function renderNews(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const sources = Array.isArray(payload?.sources) ? payload.sources : [];
  newsStatus.textContent = items.length
    ? `${items.length} başlık · ${sources.length || 1} kaynak · en yeniye göre`
    : "Başlık bulunamadı.";
  newsList.replaceChildren();
  items.forEach(item => {
    const article = document.createElement("article");
    article.className = "news-card";
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const source = document.createElement("span");
    source.className = "news-source";
    source.textContent = item.source || "Haber";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const meta = document.createElement("span");
    meta.className = "news-time";
    meta.textContent = formatRelativeTime(item.publishedAt);
    link.append(source, title, meta);
    article.append(link);
    newsList.append(article);
  });
}

function formatRelativeTime(value, now = Date.now()) {
  const stamp = Date.parse(value || "");
  if (!Number.isFinite(stamp)) return "";
  const minutes = Math.max(0, Math.round((now - stamp) / 60000));
  if (minutes < 1) return "Şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function cleanRadioText(value) {
  const text = String(value || "").trim();
  if (!text || /^(unknown|n\/a|null|undefined|-+)$/i.test(text)) return "";
  return text;
}

function titleCaseRadioText(value) {
  const text = cleanRadioText(value);
  if (!text) return "";
  return text.toLocaleLowerCase("tr").replace(/(^|[\s-])([a-zçğıöşü])/g, (match, prefix, letter) => prefix + letter.toLocaleUpperCase("tr"));
}

function radioInitials(name) {
  const words = String(name || "Radyo").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "R";
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase("tr");
  return (words[0][0] + words[1][0]).toLocaleUpperCase("tr");
}

function normalizeRadioArtworkUrl(value) {
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

function radioArtworkUrl(station) {
  const normalized = normalizeRadioArtworkUrl(station?.favicon);
  if (!normalized || failedRadioArtwork.has(normalized)) return "";
  return normalized;
}

function createRadioAvatar(station, className = "radio-avatar") {
  const avatar = document.createElement("span");
  avatar.className = className;
  const fallback = document.createElement("span");
  fallback.className = "radio-avatar-fallback";
  fallback.textContent = radioInitials(station?.name);
  avatar.append(fallback);

  const artwork = radioArtworkUrl(station);
  if (artwork) {
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.decoding = "async";
    image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
    image.addEventListener("error", () => {
      failedRadioArtwork.add(artwork);
      image.remove();
    }, { once: true });
    image.src = artwork;
    avatar.append(image);
  }
  return avatar;
}

function radioStationTags(station) {
  return (station?.tags || [])
    .map(tag => cleanRadioText(tag))
    .filter(Boolean)
    .filter((tag, index, rows) => rows.findIndex(item => item.toLocaleLowerCase("tr") === tag.toLocaleLowerCase("tr")) === index)
    .slice(0, 3);
}

function radioStationMeta(station) {
  const location = titleCaseRadioText(station?.state);
  const codec = cleanRadioText(station?.codec);
  const bitrate = Number(station?.bitrate) > 0 ? `${Number(station.bitrate)} kbps` : "";
  return [location, codec, bitrate].filter(Boolean);
}

function radioStationForStorage(station) {
  return {
    id: station.id,
    name: station.name,
    streamUrl: station.streamUrl,
    streamCandidates: Array.isArray(station.streamCandidates) ? station.streamCandidates.slice(0, 4) : [],
    homepage: station.homepage || "",
    favicon: normalizeRadioArtworkUrl(station.favicon),
    tags: Array.isArray(station.tags) ? station.tags.slice(0, 6) : [],
    codec: station.codec || "",
    bitrate: Number(station.bitrate) || 0,
    state: station.state || "",
    countryCode: station.countryCode || "TR",
    language: station.language || "",
    clickcount: Number(station.clickcount) || 0,
    votes: Number(station.votes) || 0,
    measuredRank: Number(station.measuredRank) || null,
    rankingPeriod: station.rankingPeriod || "",
    liveVerified: Boolean(station.liveVerified),
  };
}

function currentRadioPayload() {
  return radioClientCache.get(activeRadioScope) || { scope: activeRadioScope, stations: [] };
}

function isRadioFavorite(stationId) {
  return radioFavoriteStations.some(station => station.id === stationId);
}

function persistRadioFavorites() {
  try { localStorage.setItem(RADIO_FAVORITES_KEY, JSON.stringify(radioFavoriteStations.slice(0, 60))); } catch {}
}

function persistRadioRecents() {
  try { localStorage.setItem(RADIO_RECENTS_KEY, JSON.stringify(radioRecentStations.slice(0, 20))); } catch {}
}

function toggleRadioFavorite(station) {
  if (!station?.id) return;
  if (isRadioFavorite(station.id)) {
    radioFavoriteStations = radioFavoriteStations.filter(item => item.id !== station.id);
    showToast("Radyo favorilerden çıkarıldı");
  } else {
    radioFavoriteStations = [radioStationForStorage(station), ...radioFavoriteStations.filter(item => item.id !== station.id)].slice(0, 60);
    showToast("Radyo favorilere eklendi");
  }
  persistRadioFavorites();
  syncRadioPlayerFavorite();
  renderRadioStations(currentRadioPayload());
}

function rememberRadioRecent(station) {
  if (!station?.id) return;
  radioRecentStations = [radioStationForStorage(station), ...radioRecentStations.filter(item => item.id !== station.id)].slice(0, 20);
  persistRadioRecents();
}

function selectRadioLibrary(mode) {
  activeRadioLibrary = ["discover", "favorites", "recent"].includes(mode) ? mode : "discover";
  syncRadioLibraryTabs();
  renderRadioStations(currentRadioPayload());
}

function syncRadioLibraryTabs() {
  radioLibraryTabs?.querySelectorAll("[data-radio-library]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.radioLibrary === activeRadioLibrary));
  });
}

function radioStationsForView(payload) {
  const source = activeRadioLibrary === "favorites"
    ? radioFavoriteStations
    : activeRadioLibrary === "recent"
      ? radioRecentStations
      : (Array.isArray(payload?.stations) ? payload.stations : []);

  const query = radioSearchTerm;
  const filtered = !query ? source : source.filter(station => {
    const haystack = normalizeSearchValue([
      station.name,
      station.state,
      station.codec,
      station.language,
      ...(station.tags || []),
    ].join(" "));
    return haystack.includes(query);
  });

  const unique = new Map();
  filtered.forEach(station => { if (station?.id && !unique.has(station.id)) unique.set(station.id, station); });
  return [...unique.values()];
}

function updateRadioStatus(stations, payload = currentRadioPayload()) {
  const count = stations.length;
  if (radioSearchTerm) {
    radioStatus.textContent = count ? `${count} eşleşme` : "Aramana uyan istasyon bulunamadı.";
    return;
  }
  if (activeRadioLibrary === "favorites") {
    radioStatus.textContent = count ? `${count} favori istasyon` : "Henüz favori istasyonun yok.";
    return;
  }
  if (activeRadioLibrary === "recent") {
    radioStatus.textContent = count ? `${count} son dinlenen istasyon` : "Henüz bir istasyon dinlemedin.";
    return;
  }
  if (!count) {
    radioStatus.textContent = "Uygun yayın bulunamadı.";
    return;
  }
  const verified = Number(payload?.verifiedCount) || stations.filter(station => station.liveVerified).length;
  radioStatus.textContent = `${count} istasyon · ${verified} canlı doğrulandı · RİAK Mayıs 2026 önceliği`;
}

function syncRadioPlayerExpanded() {
  if (!radioPlayerExpand || !radioPlayer) return;
  const expanded = radioPlayer.classList.contains("is-expanded");
  document.body.classList.toggle("radio-player-expanded", expanded);
  radioPlayerExpand.textContent = expanded ? "⌄" : "•••";
  radioPlayerExpand.setAttribute("aria-expanded", String(expanded));
  radioPlayerExpand.setAttribute("aria-label", expanded ? "Radyo kontrollerini daralt" : "Radyo kontrollerini genişlet");
}

function toggleRadioPlayerExpanded() {
  if (!radioPlayer || radioPlayer.hidden) return;
  radioPlayer.classList.toggle("is-expanded");
  syncRadioPlayerExpanded();
}

function syncRadioPlayerFavorite() {
  if (!radioPlayerFavorite) return;
  const favorite = currentRadioStation && isRadioFavorite(currentRadioStation.id);
  radioPlayerFavorite.textContent = favorite ? "★" : "☆";
  radioPlayerFavorite.setAttribute("aria-pressed", String(Boolean(favorite)));
  radioPlayerFavorite.setAttribute("aria-label", favorite ? "Radyoyu favorilerden çıkar" : "Radyoyu favorilere ekle");
}

function setRadioVolume(level) {
  radioVolumeLevel = Math.min(1, Math.max(0, Number(level) || 0));
  if (radioAudio) radioAudio.volume = radioVolumeLevel;
  if (radioVolume) radioVolume.value = String(Math.round(radioVolumeLevel * 100));
  try { localStorage.setItem(RADIO_VOLUME_KEY, String(radioVolumeLevel)); } catch {}
}

function updateRadioPlayer(station) {
  if (!station) return;
  const wasHidden = radioPlayer.hidden;
  radioPlayer.classList.remove("has-error");
  if (wasHidden) radioPlayer.classList.remove("is-expanded");
  radioPlayer.hidden = false;
  radioPlayerName.textContent = station.name;
  const rank = station.measuredRank ? `#${station.measuredRank} RİAK` : "";
  radioPlayerMeta.textContent = [rank, ...radioStationMeta(station)].filter(Boolean).join(" · ") || "Canlı yayın";
  radioPlayerAvatar?.replaceChildren(createRadioAvatar(station, "radio-player-avatar-inner"));
  syncRadioPlayerFavorite();
  syncRadioPlayerExpanded();

  if (radioPlayerHomepage) {
    radioPlayerHomepage.hidden = !station.homepage;
    if (station.homepage) radioPlayerHomepage.href = station.homepage;
  }
  setRadioVolume(radioVolumeLevel);
}

async function shareRadioStation(station) {
  if (!station) return;
  const target = station.homepage || location.href;
  const text = `${station.name} · Yakınım Radyo`;
  if (navigator.share) {
    try {
      await navigator.share({ title: station.name, text, url: target });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  const copied = await copyTextToClipboard(`${text}\n${target}`);
  showToast(copied ? "Radyo bağlantısı kopyalandı" : "Paylaşım kullanılamıyor");
}

function stepRadioStation(direction) {
  if (!lastRenderedRadioStations.length) return;
  const currentIndex = currentRadioStation
    ? lastRenderedRadioStations.findIndex(station => station.id === currentRadioStation.id)
    : -1;
  const start = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (start + direction + lastRenderedRadioStations.length) % lastRenderedRadioStations.length;
  playRadioStation(lastRenderedRadioStations[nextIndex]);
}

function configureRadioMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const safeHandler = (action, handler) => {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
  };
  safeHandler("play", () => {
    if (!currentRadioStation) return;
    startRadioCandidate(currentRadioStreamIndex).catch(() => {});
  });
  safeHandler("pause", () => radioAudio?.pause());
  safeHandler("stop", closeRadioPlayer);
  safeHandler("previoustrack", () => stepRadioStation(-1));
  safeHandler("nexttrack", () => stepRadioStation(1));
}

function updateRadioMediaSession(station) {
  if (!("mediaSession" in navigator) || typeof MediaMetadata !== "function" || !station) return;
  const artworkUrl = radioArtworkUrl(station);
  const artwork = artworkUrl ? [{ src: artworkUrl }] : [];
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: radioStationTags(station).join(" · ") || "Canlı radyo",
      album: "Yakınım Radyo",
      artwork,
    });
  } catch {}
}

function clearRadioStallTimer() {
  if (!radioStallTimer) return;
  clearTimeout(radioStallTimer);
  radioStallTimer = 0;
}

function scheduleRadioRecovery(reason = "waiting") {
  if (!currentRadioStation || !radioAudio || radioRecoveryInProgress || radioAudio.paused) return;
  clearRadioStallTimer();
  radioStallTimer = setTimeout(() => {
    radioStallTimer = 0;
    if (!currentRadioStation || !radioAudio || radioRecoveryInProgress || radioAudio.paused) return;
    recoverRadioStream(reason);
  }, 9000);
}

function radioCandidateNativePlayable(candidate) {
  if (!candidate || !radioAudio) return false;
  const url = String(candidate.url || "").trim();
  if (!/^https:\/\//i.test(url)) return false;
  const isHls = Boolean(candidate.hls) || /\.m3u8(?:$|\?)/i.test(url);
  if (!isHls) return true;
  const hlsSupport = radioAudio.canPlayType?.("application/vnd.apple.mpegurl")
    || radioAudio.canPlayType?.("application/x-mpegURL")
    || "";
  return Boolean(hlsSupport);
}

function attemptRadioCandidate(candidate, serial, timeoutMs = 8000) {
  return new Promise(resolve => {
    if (!radioAudio || !candidate?.url || serial !== radioPlaybackSerial) return resolve({ ok: false, reason: "stale" });
    let settled = false;
    let timer = 0;
    const finish = (ok, reason = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      radioAudio.removeEventListener("playing", onPlaying);
      radioAudio.removeEventListener("error", onError);
      radioAudio.removeEventListener("abort", onAbort);
      resolve({ ok, reason });
    };
    const onPlaying = () => finish(true, "playing");
    const onError = () => finish(false, "media_error");
    const onAbort = () => finish(false, "aborted");

    radioAudio.addEventListener("playing", onPlaying);
    radioAudio.addEventListener("error", onError);
    radioAudio.addEventListener("abort", onAbort);
    timer = setTimeout(() => finish(false, "timeout"), timeoutMs);

    radioAudio.muted = false;
    radioAudio.src = candidate.url;
    radioAudio.load();
    try {
      const playPromise = radioAudio.play();
      if (playPromise?.catch) playPromise.catch(error => finish(false, error?.name || "play_rejected"));
    } catch (error) {
      finish(false, error?.name || "play_rejected");
    }
  });
}

function stationStreamCandidates(station) {
  const candidates = Array.isArray(station?.streamCandidates) ? station.streamCandidates : [];
  const rows = candidates.length ? candidates : [{ id: station?.id, url: station?.streamUrl, codec: station?.codec, bitrate: station?.bitrate, hls: station?.hls }];
  const seen = new Set();
  return rows.filter(candidate => {
    const url = String(candidate?.url || "").trim();
    if (!/^https:\/\//i.test(url) || seen.has(url)) return false;
    seen.add(url);
    return radioCandidateNativePlayable({ ...candidate, url });
  });
}

function reportRadioFailure(streamUrl) {
  if (!/^https:\/\//i.test(String(streamUrl || ""))) return;
  fetch("/api/radio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "failure", streamUrl }),
  }).catch(() => {});
}

async function startRadioCandidate(startIndex = 0, { countClick = false } = {}) {
  if (!currentRadioStation || !radioAudio) return false;
  clearRadioStallTimer();
  const serial = ++radioPlaybackSerial;
  const candidates = stationStreamCandidates(currentRadioStation);
  radioRecoveryInProgress = true;

  for (let index = Math.max(0, startIndex); index < candidates.length; index += 1) {
    if (serial !== radioPlaybackSerial) {
      radioRecoveryInProgress = false;
      return false;
    }

    const candidate = candidates[index];
    currentRadioStreamIndex = index;
    radioPlayer.classList.remove("has-error");
    radioPlayerMeta.textContent = index > 0 ? "Yedek canlı yayın deneniyor…" : "Canlı yayına bağlanıyor…";

    const result = await attemptRadioCandidate(candidate, serial, 8000);
    if (serial !== radioPlaybackSerial) {
      radioRecoveryInProgress = false;
      return false;
    }

    if (result.ok) {
      const rank = currentRadioStation.measuredRank ? `#${currentRadioStation.measuredRank} RİAK` : "";
      radioPlayerMeta.textContent = [rank, ...radioStationMeta({ ...currentRadioStation, codec: candidate.codec || currentRadioStation.codec, bitrate: candidate.bitrate || currentRadioStation.bitrate })].filter(Boolean).join(" · ") || "Canlı yayın";
      if (countClick) {
        fetch("/api/radio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationuuid: candidate.id || currentRadioStation.id }),
        }).catch(() => {});
      }
      radioRecoveryInProgress = false;
      return true;
    }

    const browserBlocked = result.reason === "NotAllowedError";
    if (!browserBlocked) reportRadioFailure(candidate.url);
    try {
      radioAudio.pause();
      radioAudio.removeAttribute("src");
      radioAudio.load();
    } catch {}

    if (browserBlocked) {
      radioRecoveryInProgress = false;
      radioPlayerMeta.textContent = "Oynatmak için ▶ düğmesine tekrar dokun";
      radioPlayer.classList.add("has-error");
      return false;
    }
  }

  radioRecoveryInProgress = false;
  radioPlayerMeta.textContent = candidates.length
    ? "Çalışan yayın bulunamadı · başka istasyon deneyebilirsin"
    : "Bu yayın biçimi tarayıcında desteklenmiyor";
  radioPlayer.classList.add("has-error");
  syncRadioPlayerState();
  return false;
}

async function recoverRadioStream(reason = "error") {
  if (!currentRadioStation || radioRecoveryInProgress) return;
  clearRadioStallTimer();
  const candidates = stationStreamCandidates(currentRadioStation);
  const failed = candidates[currentRadioStreamIndex];
  if (failed?.url && reason !== "resume") reportRadioFailure(failed.url);
  const nextIndex = reason === "resume" ? currentRadioStreamIndex : currentRadioStreamIndex + 1;
  if (nextIndex >= candidates.length) {
    radioPlayerMeta.textContent = reason === "ended"
      ? "Yayın sona erdi; çalışan yedek bulunamadı"
      : "Yayın kesildi; çalışan yedek bulunamadı";
    radioPlayer.classList.add("has-error");
    return;
  }
  await startRadioCandidate(nextIndex);
}

async function loadRadio(scope = "turkiye", { force = false } = {}) {
  activeRadioScope = "turkiye";
  const cached = radioClientCache.get("turkiye");
  if (cached && !force) {
    renderRadioStations(cached);
    hideSectionTransition(220);
    return;
  }
  if (activeRadioLibrary !== "discover") {
    renderRadioStations(currentRadioPayload());
    hideSectionTransition(220);
    return;
  }

  radioStatus.textContent = "İstasyonlar doğrulanıyor…";
  radioList.innerHTML = '<div class="module-loading"><span class="module-spinner" aria-hidden="true"></span><span>Popüler ve çalışan yayınlar kontrol ediliyor…</span></div>';
  try {
    const response = await fetch(`/api/radio?scope=turkiye&v=${encodeURIComponent(APP_VERSION)}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("radio_" + response.status);
    const payload = await response.json();
    radioClientCache.set("turkiye", payload);
    renderRadioStations(payload);
  } catch {
    radioStatus.textContent = "Radyo listesi şu an alınamıyor.";
    radioList.innerHTML = '<button class="module-retry" type="button">Yeniden dene</button>';
    radioList.querySelector("button")?.addEventListener("click", () => loadRadio("turkiye", { force: true }));
  } finally {
    hideSectionTransition(220);
  }
}

function renderRadioStations(payload) {
  const stations = radioStationsForView(payload);
  lastRenderedRadioStations = stations;
  updateRadioStatus(stations, payload);
  radioList.replaceChildren();

  if (!stations.length) {
    const empty = document.createElement("div");
    empty.className = "radio-empty";
    empty.textContent = activeRadioLibrary === "favorites"
      ? "Beğendiğin radyolarda ★ simgesine dokun; burada toplansın."
      : activeRadioLibrary === "recent"
        ? "Bir radyo dinlediğinde son dinlenenler burada görünür."
        : "Bu aramada çalışan istasyon bulunamadı.";
    radioList.append(empty);
    return;
  }

  stations.forEach(station => {
    const card = document.createElement("article");
    card.className = "radio-card";
    card.dataset.stationId = station.id;
    card.classList.toggle("is-playing", currentRadioStation?.id === station.id && !radioAudio.paused);

    const avatar = createRadioAvatar(station);
    const copy = document.createElement("div");
    copy.className = "radio-copy";
    const nameRow = document.createElement("div");
    nameRow.className = "radio-name-row";
    const name = document.createElement("strong");
    name.textContent = station.name;
    nameRow.append(name);
    if (station.measuredRank) {
      const rank = document.createElement("span");
      rank.className = "radio-rank";
      rank.textContent = `#${station.measuredRank}`;
      rank.title = "RİAK Mayıs 2026";
      nameRow.append(rank);
    }
    const meta = document.createElement("span");
    meta.className = "radio-meta";
    meta.textContent = radioStationMeta(station).join(" · ") || "Canlı yayın";
    copy.append(nameRow, meta);

    const tags = radioStationTags(station);
    if (tags.length || station.liveVerified) {
      const tagRow = document.createElement("span");
      tagRow.className = "radio-tags";
      if (station.liveVerified) {
        const live = document.createElement("small");
        live.className = "radio-live-tag";
        live.textContent = "Canlı doğrulandı";
        tagRow.append(live);
      }
      tags.slice(0, station.liveVerified ? 1 : 2).forEach(tag => {
        const chip = document.createElement("small");
        chip.textContent = titleCaseRadioText(tag);
        tagRow.append(chip);
      });
      copy.append(tagRow);
    }

    const actions = document.createElement("div");
    actions.className = "radio-card-actions";
    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "radio-favorite";
    favorite.textContent = isRadioFavorite(station.id) ? "★" : "☆";
    favorite.setAttribute("aria-pressed", String(isRadioFavorite(station.id)));
    favorite.setAttribute("aria-label", isRadioFavorite(station.id) ? "Favoriden çıkar" : "Favoriye ekle");
    favorite.addEventListener("click", () => toggleRadioFavorite(station));

    const play = document.createElement("button");
    play.type = "button";
    play.className = "radio-play";
    const playing = currentRadioStation?.id === station.id && !radioAudio.paused;
    play.textContent = playing ? "Ⅱ" : "▶";
    play.setAttribute("aria-label", playing ? `${station.name} yayınını duraklat` : `${station.name} yayınını dinle`);
    play.addEventListener("click", () => playRadioStation(station));

    actions.append(favorite, play);
    card.append(avatar, copy, actions);
    radioList.append(card);
  });
}

async function playRadioStation(station) {
  if (!station?.streamUrl || !radioAudio) return;

  if (currentRadioStation?.id === station.id) {
    if (!radioAudio.paused) {
      radioAudio.pause();
      return;
    }
    await startRadioCandidate(currentRadioStreamIndex);
    return;
  }

  ++radioPlaybackSerial;
  clearRadioStallTimer();
  radioRecoveryInProgress = false;
  currentRadioStation = station;
  currentRadioStreamIndex = 0;
  rememberRadioRecent(station);
  updateRadioPlayer(station);
  updateRadioMediaSession(station);
  await startRadioCandidate(0, { countClick: true });
  syncRadioPlayerState();
  renderRadioStations(currentRadioPayload());
}

function toggleRadioPlayback() {
  if (!radioAudio || !currentRadioStation) return;
  if (radioAudio.paused) {
    startRadioCandidate(currentRadioStreamIndex).catch(() => {});
  } else {
    radioAudio.pause();
  }
}

function syncRadioPlayerState() {
  if (!radioPlayToggle || !radioAudio) return;
  const paused = radioAudio.paused;
  radioPlayToggle.textContent = paused ? "▶" : "Ⅱ";
  radioPlayToggle.setAttribute("aria-label", paused ? "Radyoyu oynat" : "Radyoyu duraklat");
  radioPlayer?.classList.toggle("is-playing", !paused);
  if ("mediaSession" in navigator) {
    try { navigator.mediaSession.playbackState = paused ? "paused" : "playing"; } catch {}
  }
  if (appSection === "radio") renderRadioStations(currentRadioPayload());
}

function closeRadioPlayer() {
  ++radioPlaybackSerial;
  clearRadioStallTimer();
  radioRecoveryInProgress = false;
  currentRadioStation = null;
  currentRadioStreamIndex = 0;
  document.body.classList.remove("radio-player-expanded");
  if (radioAudio) {
    radioAudio.pause();
    radioAudio.removeAttribute("src");
    radioAudio.load();
  }
  radioPlayer.hidden = true;
  radioPlayer.classList.remove("is-playing", "is-expanded", "has-error");
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch {}
  }
  if (appSection === "radio") renderRadioStations(currentRadioPayload());
}

function setView(view, panelState = "half") {
  if (appSection !== "nearby") setSection("nearby");
  const previousView = document.body.dataset.view;
  const historyView = history.state?.yakinimView;
  if (view === "list" && previousView === "map" && historyView?.startsWith("map-")) {
    const steps = historyView === "map-detail" ? -3 : historyView === "map-open" ? -2 : -1;
    history.go(steps);
    return;
  }
  if (document.body.dataset.view === "list") listScrollY = window.scrollY;
  closeMapQuickCard({ clearSelection: false });
  closePlaceDetails(false);
  document.body.dataset.view = view;
  if (view === "map" && previousView !== "map") {
    history.pushState({ yakinimView: "map-peek", yakinimSection: "nearby" }, "", location.href);
    if (panelState !== "peek") history.pushState({ yakinimView: "map-open", yakinimSection: "nearby" }, "", location.href);
  }
  applySheetState(view === "map" ? (previousView === "map" ? sheet.dataset.state : panelState) : "expanded");
  window.scrollTo(0, view === "list" ? listScrollY : 0);
  document.querySelectorAll(".view-switch button[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
  animateIn(sheet);
  if (view === "map") updateMapContext(renderedMapPlaces, activeCategory);
  requestAnimationFrame(() => {
    map.invalidateSize();
    if (view === "map") scheduleViewportRefresh();
  });
}

function animateIn(element) {
  if (!mapShouldAnimate || !element?.animate) return;
  element.getAnimations().forEach(animation => animation.cancel());
  element.animate(
    [{ opacity: .45, transform: "translateY(10px) scale(.99)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
    { duration: MOTION.standard, easing: MOTION.spring }
  );
}

function renderCategoryButtons() {
  if (!categoryStrip.children.length) categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-button";
    button.dataset.category = category.id;
    button.innerHTML = `<span aria-hidden="true">${categorySvg(category.id)}</span><span class="category-button-copy"><span>${escapeHtml(category.label)}</span><small class="category-count" hidden></small></span>`;
    button.addEventListener("click", () => selectCategory(category));
    categoryStrip.append(button);
  });
  categoryStrip.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.category === activeCategory.id)));
}

function selectCategory(category) {
  if (category.id === activeCategory.id && activePlaces.length) {
    pulseCategoryButton(category.id);
    return;
  }
  if (document.body.dataset.view === "map" && history.state?.yakinimView === "map-detail") history.back();
  else closePlaceDetails(false);

  activeCategory = category;
  recordCategorySignal(category);
  searchTerm = "";
  placeSearchInput.value = "";
  if (mapSearchInput) mapSearchInput.value = "";
  if (mapSearchClear) mapSearchClear.hidden = true;
  closeMapQuickCard();
  resultTitle.textContent = category.type === "all" ? "Yakındaki yerler" : category.label;
  prefs.category = category.id;
  persistPrefs();
  renderCategoryButtons();
  pulseCategoryButton(category.id);

  if (category.type === "favorites") {
    loadFavorites();
    return;
  }
  if (!userLocation) {
    activePlaces = [];
    document.body.classList.remove("map-results-updating");
    updateMapContext([], category, "empty");
    showState("empty", "Yakındaki yerleri görmek için konumunu bir kez aç.");
    return;
  }
  if (category.type === "duty") {
    refreshDutyViewport({ force: true });
    return;
  }
  if (lastDiscoveryBundle) renderActiveCategoryFromBundle();
  else showState("loading", "Görünen alan hazırlanıyor…");
  scheduleViewportRefresh();
}

async function locateUser({ forceFresh = false, background = false } = {}) {
  if (!navigator.geolocation) {
    if (!background) showLocationFailure("Bu tarayıcı konum özelliğini desteklemiyor.");
    return;
  }

  const serial = ++locationAttemptSerial;
  manualLocationMode = false;
  document.body.classList.remove("is-selecting-location");

  if (!background) {
    locateButton.disabled = true;
    locateButton.classList.add("is-loading");
    manualLocationButton.hidden = true;
    statusText.textContent = "Hassas konum aranıyor…";
    if (!activePlaces.length) showState("loading", "Telefonun gerçek konumu bekleniyor…");
  }

  // iOS/Safari is more reliable with one authoritative geolocation request
  // at a time. Ask for a fresh high-accuracy fix first; only fall back to a
  // coarse position after that request actually fails.
  const accurate = await settlePosition("accurate", {
    enableHighAccuracy: true,
    timeout: ACCURATE_LOCATION_TIMEOUT,
    maximumAge: forceFresh ? 0 : 30 * 1000,
  });

  if (serial !== locationAttemptSerial) return;
  if (accurate.position) {
    applyUserPosition(accurate.position, { provisional: false, background });
    return;
  }

  if (accurate.error?.code === 1) {
    locateButton.disabled = false;
    locateButton.classList.remove("is-loading");
    if (!background && !userLocation) showLocationFailure(locationErrorMessage(accurate.error));
    else if (userLocation) statusText.textContent = "Son bilinen konum kullanılıyor · tarayıcı konum izni kapalı.";
    return;
  }

  if (!background) statusText.textContent = "Hassas konum alınamadı · yaklaşık konum deneniyor…";

  const fallback = await settlePosition("fallback", {
    enableHighAccuracy: false,
    timeout: FAST_LOCATION_TIMEOUT,
    maximumAge: forceFresh ? 60 * 1000 : 5 * 60 * 1000,
  });

  if (serial !== locationAttemptSerial) return;
  if (fallback.position) {
    applyUserPosition(fallback.position, { provisional: true, background });
    return;
  }

  locateButton.disabled = false;
  locateButton.classList.remove("is-loading");
  const error = chooseLocationError(accurate.error, fallback.error);
  if (!background && !userLocation) showLocationFailure(locationErrorMessage(error));
  else if (userLocation) statusText.textContent = error?.code === 1
    ? "Son bilinen konum kullanılıyor · tarayıcı konum izni kapalı."
    : "Canlı konum alınamadı · son bilinen konum korunuyor.";
}

function chooseLocationError(firstError, secondError) {
  // Permission denial is the most actionable result. Otherwise prefer the
  // latest concrete browser error over a generic timeout.
  if (firstError?.code === 1) return firstError;
  if (secondError?.code === 1) return secondError;
  if (secondError) return secondError;
  return firstError;
}


function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}
async function settlePosition(kind, options) {
  try {
    const position = await getCurrentPosition(options);
    if (!positionIsUsable(position)) return { kind, position: null, error: { code: 2, message: "invalid_position" } };
    return { kind, position, error: null };
  } catch (error) {
    return { kind, position: null, error };
  }
}

async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state || "unknown";
  } catch {
    return "unknown";
  }
}

function locationZoomForAccuracy(accuracy, currentZoom = map.getZoom()) {
  if (!Number.isFinite(accuracy) || accuracy <= 0) return Math.max(currentZoom, 14);
  if (accuracy <= 80) return Math.max(currentZoom, 16);
  if (accuracy <= 200) return Math.max(currentZoom, 15);
  if (accuracy <= 600) return Math.max(Math.min(currentZoom, 15), 14);
  if (accuracy <= 1500) return Math.max(Math.min(currentZoom, 14), 13);
  if (accuracy <= 5000) return Math.max(Math.min(currentZoom, 13), 12);
  return Math.max(Math.min(currentZoom, 12), 11);
}

function positionIsUsable(position) {
  const lat = Number(position?.coords?.latitude);
  const lng = Number(position?.coords?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}


function applyUserPosition(position, { provisional = false, background = false } = {}) {
  if (!positionIsUsable(position)) {
    if (!background) showLocationFailure("Tarayıcı geçerli bir konum döndürmedi.");
    return;
  }

  locateButton.disabled = false;
  locateButton.classList.remove("is-loading");
  manualLocationButton.hidden = true;

  const accuracy = Number(position.coords.accuracy);
  userLocation = {
    lat: Number(position.coords.latitude),
    lng: Number(position.coords.longitude),
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    source: provisional ? "gps-fallback" : "gps",
  };

  persistLastLocation();
  document.querySelector("#welcome").hidden = true;
  document.body.classList.add("has-location");
  drawUserLocation();

  const accuracyText = Number.isFinite(userLocation.accuracy)
    ? ` · yaklaşık ${Math.round(userLocation.accuracy)} m doğruluk`
    : "";
  statusText.textContent = provisional
    ? `Yaklaşık konum bulundu${accuracyText}`
    : `Konum bulundu${accuracyText}`;

  const targetZoom = locationZoomForAccuracy(userLocation.accuracy);
  map.flyTo([userLocation.lat, userLocation.lng], targetZoom, {
    animate: mapShouldAnimate && !background,
    duration: background ? 0.35 : 0.55,
  });
  scheduleViewportRefresh({ force: true });
}

function refineUserPosition(position) {
  if (!userLocation) {
    applyUserPosition(position);
    return;
  }
  const nextLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    source: "gps",
  };
  const movedMeters = distanceBetween(userLocation.lat, userLocation.lng, nextLocation.lat, nextLocation.lng) * 1000;
  const previousAccuracy = Number(userLocation.accuracy);
  const nextAccuracy = Number(nextLocation.accuracy);
  const accuracyImproved = Number.isFinite(nextAccuracy) && (!Number.isFinite(previousAccuracy) || nextAccuracy < previousAccuracy * 0.75);
  userLocation = nextLocation;
  persistLastLocation();
  drawUserLocation();
  statusText.textContent = Number.isFinite(nextAccuracy)
    ? `Konum netleştirildi · yaklaşık ${Math.round(nextAccuracy)} m doğruluk`
    : "Konum netleştirildi.";

  if (movedMeters >= LOCATION_REFRESH_DISTANCE_M) {
    map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 15), {
      animate: mapShouldAnimate,
      duration: 0.45,
    });
    scheduleViewportRefresh({ force: true });
    return;
  }
  if (accuracyImproved && lastDiscoveryBundle) renderActiveCategoryFromBundle("Konum doğruluğu güncellendi.");
}
function showLocationFailure(message) {
  statusText.textContent = message;
  manualLocationButton.hidden = false;
  showState("empty", "Konum bulunamadı. Yeniden deneyebilir veya haritada bulunduğun noktayı seçebilirsin.");
}

function locationErrorMessage(error) {
  if (error?.code === 1) return "Konum izni verilmedi. iPhone ayarlarında bu tarayıcı için Konum erişimini açıp tekrar deneyebilirsin.";
  if (error?.code === 2) return "Telefon şu an konum üretemedi. Konum Servisleri açıkken yeniden dene.";
  if (error?.code === 3) return "Konum yanıtı zaman aşımına uğradı. Yeniden deneyebilir veya haritadan konum seçebilirsin.";
  return "Konum alınamadı. Yeniden deneyebilir veya haritadan konum seçebilirsin.";
}

function enableManualLocationMode() {
  locationAttemptSerial += 1;
  manualLocationMode = true;
  setView("map", "peek");
  locateButton.disabled = false;
  locateButton.classList.remove("is-loading");
  manualLocationButton.hidden = false;
  manualLocationButton.querySelector("span:last-child").textContent = "Haritaya dokun";
  document.body.classList.add("is-selecting-location");
  statusText.textContent = "Haritada bulunduğun noktaya dokun.";
  applySheetState("peek");
}

function handleManualMapClick(event) {
  if (!manualLocationMode) {
    if (document.body.dataset.view === "map" && !mapQuickCard?.hidden) {
      dismissMapQuickCard();
      return;
    }
    if (document.body.dataset.view === "map") collapseMapPanel();
    return;
  }
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
  persistLastLocation();
  document.querySelector("#welcome").hidden = true;
  document.body.classList.add("has-location");
  drawUserLocation();
  map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 15), {
    animate: mapShouldAnimate,
    duration: 0.5,
  });
  statusText.textContent = "Konum haritadan seçildi.";
  scheduleViewportRefresh({ force: true });
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


function persistLastLocation() {
  if (!userLocation || !Number.isFinite(userLocation.lat) || !Number.isFinite(userLocation.lng)) return;
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
      lat: userLocation.lat,
      lng: userLocation.lng,
      accuracy: userLocation.accuracy,
      source: userLocation.source,
      savedAt: Date.now(),
    }));
  } catch {
    // Location persistence is an optimization, not a requirement.
  }
}

function restoreLastLocation() {
  const saved = readJson(LAST_LOCATION_KEY, null);
  if (!saved || !Number.isFinite(saved.lat) || !Number.isFinite(saved.lng)) return false;
  if (!Number.isFinite(saved.savedAt) || Date.now() - saved.savedAt > LAST_LOCATION_MAX_AGE) return false;
  userLocation = {
    lat: saved.lat,
    lng: saved.lng,
    accuracy: Number.isFinite(saved.accuracy) ? saved.accuracy : null,
    source: "stored",
  };
  document.querySelector("#welcome").hidden = true;
  document.body.classList.add("has-location");
  drawUserLocation();
  map.setView([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 15), { animate: false });
  statusText.textContent = "Son konum açıldı · çevre otomatik yenileniyor.";
  scheduleViewportRefresh({ force: true });
  return true;
}

async function bootstrapLocationDiscovery() {
  const restored = restoreLastLocation();
  if (!navigator.geolocation) return;

  const permissionState = await getGeolocationPermissionState();

  // Permissions API is advisory only. If this device already has a recent
  // saved location, refresh it in the background even when Safari reports
  // "prompt". On first visit, avoid forcing a permission prompt until the
  // user taps the location action unless the browser explicitly says granted.
  if (restored || permissionState === "granted") {
    locateUser({ forceFresh: false, background: restored });
  }
}

function handleMapDragStart() {
  if (manualLocationMode) return;
  if (!mapQuickCard?.hidden) dismissMapQuickCard();
}

function handleMapMoveEnd() {
  scheduleMapLabelUpdate();
  if (!manualLocationMode) scheduleViewportRefresh();
}

function buildViewportEnvelope(bounds = map.getBounds(), pad = 0.08) {
  if (!bounds || map.getZoom() < VIEWPORT_MIN_ZOOM) return null;
  const padded = bounds.pad(pad);
  return snapSpatialEnvelope({
    south: padded.getSouth(),
    west: padded.getWest(),
    north: padded.getNorth(),
    east: padded.getEast(),
  });
}

function viewportCacheKey(envelope) {
  return VIEWPORT_CACHE_PREFIX + [envelope.south, envelope.west, envelope.north, envelope.east].join(":");
}

function snapSpatialEnvelope(input) {
  const snapDown = value => Math.floor(value / SPATIAL_CELL_DEGREES) * SPATIAL_CELL_DEGREES;
  const snapUp = value => Math.ceil(value / SPATIAL_CELL_DEGREES) * SPATIAL_CELL_DEGREES;
  const envelope = {
    south: Number(snapDown(input.south).toFixed(3)),
    west: Number(snapDown(input.west).toFixed(3)),
    north: Number(snapUp(input.north).toFixed(3)),
    east: Number(snapUp(input.east).toFixed(3)),
  };
  if (envelope.north <= envelope.south || envelope.east <= envelope.west) return null;
  if (envelope.north - envelope.south > VIEWPORT_MAX_SPAN_DEGREES || envelope.east - envelope.west > VIEWPORT_MAX_SPAN_DEGREES) return null;
  return envelope;
}

function buildSpatialPrefetchEnvelope(bounds = map.getBounds()) {
  if (!bounds || map.getZoom() < VIEWPORT_MIN_ZOOM) return null;
  const wide = bounds.pad(SPATIAL_PREFETCH_PAD);
  const wideEnvelope = snapSpatialEnvelope({
    south: wide.getSouth(),
    west: wide.getWest(),
    north: wide.getNorth(),
    east: wide.getEast(),
  });
  if (wideEnvelope) return wideEnvelope;
  return buildViewportEnvelope(bounds, 0.18);
}

function spatialCellKey(row, column) {
  return `${row}:${column}`;
}

function spatialCellsForEnvelope(envelope) {
  if (!envelope) return [];
  const firstRow = Math.floor(envelope.south / SPATIAL_CELL_DEGREES);
  const lastRow = Math.ceil(envelope.north / SPATIAL_CELL_DEGREES) - 1;
  const firstColumn = Math.floor(envelope.west / SPATIAL_CELL_DEGREES);
  const lastColumn = Math.ceil(envelope.east / SPATIAL_CELL_DEGREES) - 1;
  const cells = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      cells.push({
        row,
        column,
        key: spatialCellKey(row, column),
        south: Number((row * SPATIAL_CELL_DEGREES).toFixed(3)),
        west: Number((column * SPATIAL_CELL_DEGREES).toFixed(3)),
        north: Number(((row + 1) * SPATIAL_CELL_DEGREES).toFixed(3)),
        east: Number(((column + 1) * SPATIAL_CELL_DEGREES).toFixed(3)),
      });
    }
  }
  return cells;
}

function pointInSpatialCell(place, cell) {
  return place.lat >= cell.south && place.lat < cell.north && place.lng >= cell.west && place.lng < cell.east;
}

function mergePlacesIntoSpatialPool(places) {
  for (const place of places || []) {
    if (!place?.id || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue;
    const previous = spatialPoiPool.get(place.id);
    if (previous) spatialPoiPool.delete(place.id);
    spatialPoiPool.set(place.id, { ...previous, ...place });
  }
  while (spatialPoiPool.size > SPATIAL_POOL_LIMIT) {
    const oldestKey = spatialPoiPool.keys().next().value;
    if (!oldestKey) break;
    spatialPoiPool.delete(oldestKey);
  }
}

function mergeBundleIntoSpatialPool(bundle) {
  if (!bundle) return;
  for (const places of Object.values(bundle)) mergePlacesIntoSpatialPool(places);
}

function bundleFromSpatialPool() {
  const bundle = Object.fromEntries(osmCategories.map(category => [category.id, []]));
  for (const place of spatialPoiPool.values()) {
    if (bundle[place.category]) bundle[place.category].push(place);
  }
  return bundle;
}

function readSpatialCell(cell) {
  try {
    const cached = JSON.parse(localStorage.getItem(SPATIAL_CELL_CACHE_PREFIX + cell.key));
    if (!cached || !Array.isArray(cached.places) || !Number.isFinite(cached.savedAt)) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeSpatialCell(cell, places, savedAt = Date.now()) {
  spatialCellState.set(cell.key, { savedAt });
  try {
    localStorage.setItem(SPATIAL_CELL_CACHE_PREFIX + cell.key, JSON.stringify({ savedAt, places }));
  } catch {
    // Spatial cache is optional; the in-memory pool remains usable.
  }
}

function hydrateSpatialCells(cells) {
  let hydrated = false;
  const now = Date.now();
  for (const cell of cells) {
    const known = spatialCellState.get(cell.key);
    if (known && now - known.savedAt <= SPATIAL_CELL_STALE_MS) continue;
    const cached = readSpatialCell(cell);
    if (!cached || now - cached.savedAt > SPATIAL_CELL_STALE_MS) continue;
    spatialCellState.set(cell.key, { savedAt: cached.savedAt });
    mergePlacesIntoSpatialPool(cached.places);
    hydrated = true;
  }
  return hydrated;
}

function spatialCellsAreFresh(cells) {
  const now = Date.now();
  return cells.length > 0 && cells.every(cell => {
    const state = spatialCellState.get(cell.key);
    return state && now - state.savedAt <= SPATIAL_CELL_FRESH_MS;
  });
}

function spatialCellsHaveCoverage(cells) {
  const now = Date.now();
  return cells.length > 0 && cells.every(cell => {
    const state = spatialCellState.get(cell.key);
    return state && now - state.savedAt <= SPATIAL_CELL_STALE_MS;
  });
}

function persistSpatialCells(cells, bundle) {
  const savedAt = Date.now();
  const allPlaces = Object.values(bundle || {}).flat();
  for (const cell of cells) {
    const cellPlaces = allPlaces.filter(place => pointInSpatialCell(place, cell));
    writeSpatialCell(cell, cellPlaces, savedAt);
  }
}

function refreshBundleFromSpatialPool() {
  lastDiscoveryBundle = bundleFromSpatialPool();
  return lastDiscoveryBundle;
}


function isPlaceInVisibleMap(place) {
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return false;
  return map.getBounds().pad(0.06).contains([place.lat, place.lng]);
}

function decorateViewportPlaces(places) {
  return (places || [])
    .filter(isPlaceInVisibleMap)
    .map(place => ({
      ...place,
      distanceKm: userLocation
        ? distanceBetween(userLocation.lat, userLocation.lng, place.lat, place.lng)
        : place.distanceKm,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_VISIBLE_PLACES);
}

function bundleFromOsmPayload(payload) {
  const origin = userLocation || map.getCenter();
  const bundle = Object.fromEntries(osmCategories.map(category => [category.id, []]));
  for (const element of payload.elements || []) {
    const category = categoryForOsmElement(element);
    if (!category) continue;
    const place = normalizeOsmElement(element, category, origin);
    if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) bundle[category.id].push(place);
  }
  for (const category of osmCategories) bundle[category.id].sort((a, b) => a.distanceKm - b.distanceKm);
  return bundle;
}

function visibleBundle(bundle = lastDiscoveryBundle) {
  if (!bundle) return null;
  return Object.fromEntries(osmCategories.map(category => [category.id, decorateViewportPlaces(bundle[category.id] || [])]));
}

function renderActiveCategoryFromBundle(statusMessage = "") {
  if (activeCategory.type === "favorites" || activeCategory.type === "duty") return;
  if (!lastDiscoveryBundle) refreshBundleFromSpatialPool();
  const bundle = visibleBundle(lastDiscoveryBundle);
  if (!bundle) return;
  const places = activeCategory.type === "all"
    ? Object.values(bundle).flat().sort((a, b) => a.distanceKm - b.distanceKm).slice(0, MAX_VISIBLE_PLACES)
    : (bundle[activeCategory.id] || []);
  activePlaces = places;
  renderDiscoveryHub(lastDiscoveryBundle);
  renderPlaces(places, activeCategory);
  sourceText.textContent = "Veri: OpenStreetMap · canlı harita havuzu";
  statusText.textContent = statusMessage;
}

function scheduleViewportRefresh({ force = false } = {}) {
  if (!userLocation || activeCategory.type === "favorites") return;
  clearTimeout(viewportRefreshTimer);
  viewportRefreshTimer = setTimeout(() => {
    if (activeCategory.type === "duty") refreshDutyViewport({ force });
    else refreshViewportPlaces({ force });
  }, force ? 40 : VIEWPORT_DEBOUNCE_MS);
}

async function refreshViewportPlaces({ force = false } = {}) {
  if (!userLocation) return;

  const visibleEnvelope = buildViewportEnvelope();
  const prefetchEnvelope = buildSpatialPrefetchEnvelope();
  if (!visibleEnvelope || !prefetchEnvelope) {
    document.body.classList.remove("map-results-updating");
    statusText.textContent = map.getZoom() < VIEWPORT_MIN_ZOOM
      ? "Yakındaki yerleri görmek için haritada biraz yakınlaş."
      : "Bu görünüm çok geniş; yakınlaştığında yerler otomatik akacak.";
    return;
  }

  const visibleCells = spatialCellsForEnvelope(visibleEnvelope);
  const prefetchCells = spatialCellsForEnvelope(prefetchEnvelope);
  const hydrated = hydrateSpatialCells(prefetchCells);
  const hasVisibleCoverage = spatialCellsHaveCoverage(visibleCells);

  if (hydrated || hasVisibleCoverage || spatialPoiPool.size) {
    refreshBundleFromSpatialPool();
    if (hasVisibleCoverage) renderActiveCategoryFromBundle(
      hydrated ? "Yakındaki yerler cihazdan gösteriliyor · güncelleniyor…" : ""
    );
  }

  if (!force && spatialCellsAreFresh(prefetchCells)) {
    document.body.classList.remove("map-results-updating");
    if (hasVisibleCoverage) statusText.textContent = "";
    return;
  }

  const requestKey = viewportCacheKey(prefetchEnvelope);
  if (activeViewportRequest?.key === requestKey) return;

  activeViewportRequest?.controller.abort();
  const controller = new AbortController();
  const serial = ++viewportRequestSerial;
  activeViewportRequest = { key: requestKey, controller, serial };

  document.body.classList.add("map-results-updating");
  updateMapContext(activePlaces, activeCategory, "loading");
  if (!hasVisibleCoverage && !activePlaces.length) {
    statusText.textContent = "Görünen alan yükleniyor · çevresi de hazırlanıyor…";
  }

  try {
    const bundle = await fetchViewportBundle(prefetchEnvelope, { signal: controller.signal });
    if (controller.signal.aborted || serial !== viewportRequestSerial) return;

    mergeBundleIntoSpatialPool(bundle);
    persistSpatialCells(prefetchCells, bundle);
    refreshBundleFromSpatialPool();
    renderActiveCategoryFromBundle();
  } catch (error) {
    if (error?.name === "AbortError") return;
    if (serial !== viewportRequestSerial) return;
    console.warn("Spatial discovery unavailable", error);
    document.body.classList.remove("map-results-updating");
    if (hasVisibleCoverage || activePlaces.length) {
      statusText.textContent = "Mevcut harita verisi korunuyor; yeni hücreler şu an yenilenemedi.";
      updateMapContext(activePlaces, activeCategory);
      return;
    }
    updateMapContext([], activeCategory, "error");
    showState("error", "Bu alanın yer verisi şu an alınamadı. Haritayı hareket ettirince otomatik yeniden denenecek.");
  } finally {
    if (activeViewportRequest?.serial === serial) activeViewportRequest = null;
  }
}

async function fetchViewportBundle(envelope, { signal } = {}) {
  const payload = await fetchViewportPayload(envelope, { signal });
  return bundleFromOsmPayload(payload);
}

async function fetchViewportPayload(envelope, { signal } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, VIEWPORT_REQUEST_TIMEOUT);

  const params = new URLSearchParams({
    south: String(envelope.south),
    west: String(envelope.west),
    north: String(envelope.north),
    east: String(envelope.east),
  });

  try {
    const response = await fetch(`/api/viewport?${params}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Viewport API ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.elements)) throw new Error("Invalid viewport response");
    return payload;
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Viewport request cancelled", "AbortError");
    if (error?.name === "AbortError" && !timedOut) throw error;

    console.warn("Viewport proxy unavailable; trying browser source.", error);
    const bbox = [envelope.south, envelope.west, envelope.north, envelope.east].join(",");
    const query = `[out:json][timeout:5];(nwr[\"amenity\"~\"^(cafe|restaurant|fast_food|pharmacy|atm|hospital|clinic|doctors|fuel|parking)$\"](${bbox});nwr[\"shop\"~\"^(supermarket|convenience|greengrocer|bakery|mall|department_store|clothes)$\"](${bbox});nwr[\"leisure\"=\"park\"](${bbox}););out center tags qt;`;
    const fallbackController = new AbortController();
    let fallbackTimedOut = false;
    const forwardFallbackAbort = () => fallbackController.abort();
    signal?.addEventListener("abort", forwardFallbackAbort, { once: true });
    const fallbackTimer = setTimeout(() => {
      fallbackTimedOut = true;
      fallbackController.abort();
    }, VIEWPORT_FALLBACK_TIMEOUT);
    try {
      const url = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;
      const fallback = await fetch(url, { signal: fallbackController.signal });
      if (!fallback.ok) throw new Error(`Viewport fallback ${fallback.status}`);
      const payload = await fallback.json();
      if (!Array.isArray(payload.elements) || payload.remark) throw new Error("Invalid viewport fallback");
      return payload;
    } catch (fallbackError) {
      if (signal?.aborted) throw new DOMException("Viewport request cancelled", "AbortError");
      if (fallbackError?.name === "AbortError" && !fallbackTimedOut) throw fallbackError;
      throw fallbackError;
    } finally {
      clearTimeout(fallbackTimer);
      signal?.removeEventListener("abort", forwardFallbackAbort);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

function viewportDutyRadius() {
  const center = map.getCenter();
  const bounds = map.getBounds();
  const cornerDistance = distanceBetween(center.lat, center.lng, bounds.getNorth(), bounds.getEast()) * 1000;
  return Math.min(7000, Math.max(1200, Math.ceil(cornerDistance * 1.35)));
}

async function refreshDutyViewport({ force = false } = {}) {
  if (!userLocation) return;
  sourceText.textContent = "Veri: Eczane Adresi · görünen alan";
  const center = map.getCenter();
  const radius = viewportDutyRadius();
  const key = `${CACHE_PREFIX}duty-view:${center.lat.toFixed(2)}:${center.lng.toFixed(2)}:${Math.round(radius / 500) * 500}`;
  const cached = !force ? readCache(key, 15 * 60 * 1000) : null;
  if (cached) {
    activePlaces = decorateViewportPlaces(cached);
    renderPlaces(activePlaces, activeCategory);
    statusText.textContent = "";
    return;
  }
  document.body.classList.add("map-results-updating");
  if (!activePlaces.length) showState("loading", "Görünen alandaki nöbetçi eczaneler aranıyor…");
  try {
    const rows = await fetchDutyPharmacies({ lat: center.lat, lng: center.lng }, radius);
    writeCache(key, rows);
    if (activeCategory.type !== "duty") return;
    activePlaces = decorateViewportPlaces(rows);
    renderPlaces(activePlaces, activeCategory);
    statusText.textContent = "";
  } catch (error) {
    document.body.classList.remove("map-results-updating");
    console.warn("Duty viewport unavailable", error);
    if (!activePlaces.length) showState("error", "Nöbetçi eczane verisi şu an alınamadı.");
  }
}


async function refreshDiscoveryHub() {
  if (!lastDiscoveryBundle) {
    discoveryHub.hidden = true;
    return;
  }
  renderDiscoveryHub(lastDiscoveryBundle);
}

function personalizationSignalStrength(signals = discoverySignals, favoriteRows = favorites) {
  const categoryViews = Object.values(signals?.categoryViews || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const placeViews = Object.values(signals?.placeViews || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const interactions = Number(signals?.interactions) || 0;
  return Math.max(interactions, categoryViews + placeViews) + favoriteRows.length * 2;
}

function hasMeaningfulPersonalization(signals = discoverySignals, favoriteRows = favorites) {
  return personalizationSignalStrength(signals, favoriteRows) >= DISCOVERY_PERSONALIZATION_THRESHOLD;
}

function hasUsefulAddress(place) {
  const address = String(place?.address || "").trim();
  if (!address) return false;
  return !/OpenStreetMap.*belirtilmemiş|Adres bilgisi yok/i.test(address);
}

function placeDataQualityScore(place) {
  let score = 0;
  if (placeHasSpecificName(place)) score += 10;
  if (hasUsefulAddress(place)) score += 6;
  if (place?.openingHours) score += 5;
  if (place?.phone) score += 3;
  if (place?.website) score += 2;
  return score;
}

function discoveryBrandKey(place) {
  const categoryLabel = categories.find(category => category.id === place.category)?.label || "";
  const name = normalizeSearchValue(place?.name);
  if (!name || name === normalizeSearchValue(categoryLabel)) return `category:${place?.category || "other"}`;
  return name.replace(/\b(şubesi|subesi|branch|market|mağazası|magazasi)\b/g, "").replace(/\s+/g, " ").trim();
}

function discoveryScore(place, signals = discoverySignals, favoriteRows = favorites, now = new Date()) {
  const distanceKm = Number.isFinite(place?.distanceKm) ? Math.max(0, place.distanceKm) : 5;
  const distanceScore = Math.max(0, 72 - Math.min(distanceKm, 4) * 22);
  const hours = openingStatus(place?.openingHours, now);
  const availabilityScore = hours?.state === "open" ? 26 : hours?.state === "closed" ? -38 : 0;
  const qualityScore = placeDataQualityScore(place);
  const contextScore = discoveryContextBoost(place, now);

  const favoriteIds = new Set(favoriteRows.map(item => item.id));
  const favoriteCategoryCount = favoriteRows.filter(item => item.category === place.category).length;
  const explicitFavoriteScore = favoriteIds.has(place.id) ? 24 : Math.min(12, favoriteCategoryCount * 4);

  const meaningful = hasMeaningfulPersonalization(signals, favoriteRows);
  const categoryViews = Number(signals?.categoryViews?.[place.category]) || 0;
  const placeViews = Number(signals?.placeViews?.[place.id]) || 0;
  const personalScore = meaningful
    ? Math.min(20, categoryViews * 3) + Math.min(24, placeViews * 6) + (signals?.lastCategory === place.category ? 7 : 0)
    : 0;

  return {
    score: distanceScore + availabilityScore + qualityScore + contextScore + explicitFavoriteScore + personalScore,
    personalScore,
    qualityScore,
    contextScore,
    hours,
    meaningful,
  };
}

function discoveryReason(place, scored, favoriteRows = favorites) {
  if (favoriteRows.some(item => item.id === place.id)) return "Kaydettiğin yer";
  if (scored.hours?.state === "open") return "Şu an açık";
  if (scored.personalScore >= 9) return "İlgilendiğin kategoriden";
  if (Number.isFinite(place.distanceKm) && place.distanceKm <= .8) return "Yakınında";
  return categories.find(category => category.id === place.category)?.label || "Yakınında";
}

function rankDiscoveryPlaces(bundle, signals = discoverySignals, favoriteRows = favorites, now = new Date(), limit = DISCOVERY_CARD_LIMIT) {
  const candidates = Object.values(bundle || {})
    .flat()
    .filter(place => place?.id && Number.isFinite(place.lat) && Number.isFinite(place.lng))
    .map(place => {
      const scored = discoveryScore(place, signals, favoriteRows, now);
      return {
        place,
        ...scored,
        personalized: scored.meaningful && scored.personalScore >= 9,
        reason: discoveryReason(place, scored, favoriteRows),
      };
    });

  const remaining = [...candidates];
  const selected = [];
  const categoryCounts = new Map();
  const brandCounts = new Map();

  while (remaining.length && selected.length < limit) {
    let bestIndex = 0;
    let bestAdjusted = Number.NEGATIVE_INFINITY;
    remaining.forEach((candidate, index) => {
      const categoryCount = categoryCounts.get(candidate.place.category) || 0;
      const brandKey = discoveryBrandKey(candidate.place);
      const brandCount = brandCounts.get(brandKey) || 0;
      const adjusted = candidate.score - categoryCount * 13 - brandCount * 22;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    });

    const [best] = remaining.splice(bestIndex, 1);
    selected.push(best);
    categoryCounts.set(best.place.category, (categoryCounts.get(best.place.category) || 0) + 1);
    const brandKey = discoveryBrandKey(best.place);
    brandCounts.set(brandKey, (brandCounts.get(brandKey) || 0) + 1);
  }

  return selected;
}

function renderDiscoveryHub(bundle) {
  if (!userLocation || !bundle) {
    discoveryHub.hidden = true;
    return;
  }

  const shown = visibleBundle(bundle);
  updateCategoryCounts(shown);
  const recommendations = rankDiscoveryPlaces(shown, discoverySignals, favorites);
  if (!recommendations.length) {
    discoveryHub.hidden = true;
    return;
  }

  const heading = discoveryHub.querySelector(".discovery-head h3");
  if (heading) heading.textContent = "Öne çıkanlar";

  discoveryHub.hidden = false;
  discoveryCards.replaceChildren();
  const personalized = recommendations.some(item => item.personalized);
  discoverySummary.textContent = personalized
    ? "Yakınlık, açıklık ve tercihlerine göre"
    : "Yakınlık, açıklık ve bilgi kalitesine göre";

  recommendations.forEach((recommendation, index) => {
    const place = recommendation.place;
    const category = categories.find(item => item.id === place.category);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "discovery-card";
    card.dataset.category = place.category;
    card.dataset.placeId = place.id;
    card.style.setProperty("--card-delay", (index * 45) + "ms");
    card.setAttribute("aria-label", place.name + " ayrıntısını aç");

    const personalizedBadge = recommendation.personalized
      ? '<span class="personalized-badge">Sana göre</span>'
      : "";
    const travel = Number.isFinite(place.distanceKm)
      ? formatDistance(place.distanceKm) + " · " + formatWalkingTime(place.distanceKm)
      : (category?.label || "Yakınındaki yer");

    card.innerHTML =
      '<span class="discovery-icon" aria-hidden="true">' + categorySvg(place.category) + '</span>' +
      '<span class="discovery-copy"><span class="discovery-card-head"><strong>' + escapeHtml(place.name) + '</strong>' + personalizedBadge + '</span>' +
      '<span class="discovery-count">' + escapeHtml(category?.label || "Yer") + ' · ' + escapeHtml(recommendation.reason) + '</span>' +
      '<span class="discovery-nearest">' + escapeHtml(travel) + '</span></span>' +
      '<span class="discovery-arrow" aria-hidden="true">›</span>';

    card.addEventListener("click", () => {
      if (document.body.dataset.view === "map") openMapQuickCard(place, card);
      else openPlaceDetails(place, card);
    });
    discoveryCards.append(card);
  });
}

function recordCategorySignal(category) {
  if (!category || ["all", "favorites"].includes(category.id)) return;
  const views = { ...(discoverySignals?.categoryViews || {}) };
  views[category.id] = (Number(views[category.id]) || 0) + 1;
  discoverySignals = {
    ...discoverySignals,
    categoryViews: views,
    placeViews: { ...(discoverySignals?.placeViews || {}) },
    lastCategory: category.id,
    interactions: (Number(discoverySignals?.interactions) || 0) + 1,
  };
  persistDiscoverySignals();
}

function recordPlaceSignal(place) {
  if (!place?.id) return;
  const now = Date.now();
  if (lastDiscoveryInteraction.placeId === place.id && now - lastDiscoveryInteraction.at < 15000) return;
  lastDiscoveryInteraction = { placeId: place.id, at: now };

  const placeViews = { ...(discoverySignals?.placeViews || {}) };
  placeViews[place.id] = (Number(placeViews[place.id]) || 0) + 1;
  discoverySignals = {
    ...discoverySignals,
    categoryViews: { ...(discoverySignals?.categoryViews || {}) },
    placeViews,
    lastCategory: place.category || discoverySignals?.lastCategory || null,
    interactions: (Number(discoverySignals?.interactions) || 0) + 1,
  };
  persistDiscoverySignals();
}

function persistDiscoverySignals() {
  try {
    localStorage.setItem(DISCOVERY_SIGNALS_KEY, JSON.stringify(discoverySignals));
  } catch {
    // Discovery learning is optional and must never block core map behavior.
  }
}


function placesFromBundle(bundle, category) {
  const shown = visibleBundle(bundle);
  if (!shown) return [];
  return category.type === "all"
    ? Object.values(shown).flat().sort((a, b) => a.distanceKm - b.distanceKm).slice(0, MAX_VISIBLE_PLACES)
    : (shown[category.id] || []);
}
function loadCategory(category = activeCategory) {
  if (category.type === "favorites") {
    loadFavorites();
    return;
  }
  if (category.type === "duty") {
    refreshDutyViewport({ force: true });
    return;
  }
  if (lastDiscoveryBundle) renderActiveCategoryFromBundle();
  scheduleViewportRefresh();
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

async function fetchOsmBundle() {
  if (!lastDiscoveryBundle) refreshBundleFromSpatialPool();
  return lastDiscoveryBundle || Object.fromEntries(osmCategories.map(category => [category.id, []]));
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
  const address = street || tags["addr:full"] || tags.description || "";

  return {
    id: `osm:${element.type}:${element.id}`,
    category: category.id,
    name: tags.name || category.label,
    address,
    phone: tags.phone || tags["contact:phone"] || "",
    openingHours: tags.opening_hours || "",
    website: tags.website || tags["contact:website"] || "",
    lat,
    lng,
    distanceKm: distanceBetween(location.lat, location.lng, lat, lng),
  };
}

function filterPlacesForRadius(places) {
  return decorateViewportPlaces(places);
}

function loadFavorites() {
  requestSerial += 1;
  activePlaces = [...favorites].sort((a, b) => {
    if (!userLocation) return a.name.localeCompare(b.name, "tr");
    return distanceBetween(userLocation.lat, userLocation.lng, a.lat, a.lng) - distanceBetween(userLocation.lat, userLocation.lng, b.lat, b.lng);
  });
  if (userLocation) {
    activePlaces = activePlaces.map(place => ({
      ...place,
      distanceKm: distanceBetween(userLocation.lat, userLocation.lng, place.lat, place.lng),
    }));
  }
  resultTitle.textContent = "Favoriler";
  updateCategoryCounts(lastDiscoveryBundle ? visibleBundle(lastDiscoveryBundle) : null);
  statusText.textContent = favorites.length ? "Bu liste yalnız cihazında saklanıyor." : "Henüz favori eklemedin.";
  sourceText.textContent = "Favoriler: cihaz içi kayıt";
  renderPlaces(activePlaces, activeCategory);
}


function pulseCategoryButton(categoryId) {
  const button = categoryStrip.querySelector(`button[data-category="${categoryId}"]`);
  if (!button || !mapShouldAnimate || !button.animate) return;
  button.animate(
    [{ transform: "scale(.98)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }],
    { duration: MOTION.standard, easing: MOTION.spring }
  );
}

function updateCategoryCounts(bundle = null) {
  const counts = {};
  if (bundle) {
    for (const [id, places] of Object.entries(bundle)) counts[id] = Array.isArray(places) ? places.length : 0;
    counts.all = Object.values(bundle).reduce((total, places) => total + (Array.isArray(places) ? places.length : 0), 0);
  }
  counts.favorites = favorites.length;
  categoryStrip.querySelectorAll(".category-button").forEach(button => {
    const badge = button.querySelector(".category-count");
    if (!badge) return;
    const count = counts[button.dataset.category];
    badge.hidden = !Number.isFinite(count) || count <= 0;
    if (!badge.hidden) badge.textContent = String(count > 99 ? "99+" : count);
  });
}

function updateMapContext(places = renderedMapPlaces, category = activeCategory, state = "ready", selected = null) {
  if (!mapContext || !mapContextIcon || !mapContextLabel || !mapContextMeta) return;
  const contextCategory = selected ? categories.find(item => item.id === selected.category) || category : category;
  mapContext.dataset.state = state;
  mapContext.dataset.category = contextCategory?.id || "all";
  mapContextIcon.innerHTML = categorySvg(contextCategory?.id || "all");
  mapContextLabel.textContent = selected?.name || (contextCategory?.type === "all" ? "Çevrende ne var?" : contextCategory?.label || "Çevreni keşfet");
  if (selected) {
    mapContextMeta.textContent = Number.isFinite(selected.distanceKm) ? `${formatDistance(selected.distanceKm)} · ${formatWalkingTime(selected.distanceKm)} · seçili` : "Seçili yer";
    return;
  }
  if (!userLocation) { mapContextMeta.textContent = "Konumunu bir kez aç · sonra haritayı gez"; return; }
  if (state === "loading") { mapContextMeta.textContent = "Yeni alan yükleniyor…"; return; }
  if (state === "error") { mapContextMeta.textContent = "Yeni alan geçici olarak alınamadı"; return; }
  if (!places.length) { mapContextMeta.textContent = "Görünen alanda sonuç yok · haritayı hareket ettir"; return; }
  const nearest = places.find(place => Number.isFinite(place.distanceKm));
  mapContextMeta.textContent = nearest ? `${places.length} yer · en yakın ${formatDistance(nearest.distanceKm)}` : `${places.length} yer · canlı alan`;
}

function scheduleMapLabelUpdate() {
  if (mapLabelFrame) cancelAnimationFrame(mapLabelFrame);
  mapLabelFrame = requestAnimationFrame(() => { mapLabelFrame = 0; updateMapLabels(); });
}

function handleMapZoomEnd() {
  if (renderedMapPlaces.length) renderMapPlaces(renderedMapPlaces);
  else scheduleMapLabelUpdate();
  if (!manualLocationMode) scheduleViewportRefresh();
}

function shouldClusterPlaces(places) {
  return places.length > 1;
}

function placeHasSpecificName(place) {
  const categoryLabel = categories.find(category => category.id === place.category)?.label || "";
  return Boolean(place?.name && place.name !== categoryLabel);
}

function placeDisplayPriority(place, index = 0) {
  let score = 1000 - Math.min(index, 500);
  if (place.id === selectedPlace?.id) score += 10000;
  if (isFavorite(place.id)) score += 1200;
  if (routeStops.some(stop => stop.id === place.id)) score += 700;
  if (placeHasSpecificName(place)) score += 650;
  if (activeCategory.type !== "all" && place.category === activeCategory.id) score += 300;
  score += placeDataQualityScore(place) * 8;

  const hours = openingStatus(place.openingHours);
  if (hours?.state === "open") score += 150;
  else if (hours?.state === "closed") score -= 100;

  if (hasMeaningfulPersonalization(discoverySignals, favorites)) {
    score += Math.min(120, (Number(discoverySignals?.categoryViews?.[place.category]) || 0) * 18);
  }
  if (Number.isFinite(place.distanceKm)) score += Math.max(0, 220 - Math.round(place.distanceKm * 35));
  return score;
}

function markerCollisionDistancePx() {
  const zoom = map.getZoom();
  if (zoom >= 17) return 22;
  if (zoom >= 16) return 27;
  if (zoom >= 15) return 34;
  if (zoom >= 14) return 42;
  return 52;
}


function buildMapClusters(places) {
  if (!shouldClusterPlaces(places)) return places.map(place => ({ places: [place] }));
  const zoom = map.getZoom();
  const radius = markerCollisionDistancePx();
  const radiusSquared = radius * radius;
  const namedCollisionRadius = zoom >= 17 ? 12 : zoom >= 16 ? 16 : radius;
  const namedCollisionSquared = namedCollisionRadius * namedCollisionRadius;
  const maxClusterSize = zoom >= 16 ? 6 : zoom >= 15 ? 9 : 18;
  const ordered = [...places]
    .map((place, index) => ({ place, index, priority: placeDisplayPriority(place, index) }))
    .sort((a, b) => b.priority - a.priority);
  const groups = [];

  for (const item of ordered) {
    const point = map.latLngToLayerPoint([item.place.lat, item.place.lng]);
    let target = null;
    for (const group of groups) {
      if (group.places.length >= maxClusterSize) continue;
      const dx = point.x - group.x;
      const dy = point.y - group.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > radiusSquared) continue;

      const bothNamed = zoom >= 16 &&
        placeHasSpecificName(item.place) &&
        group.places.some(place => placeHasSpecificName(place));
      if (bothNamed && distanceSquared > namedCollisionSquared) continue;

      target = group;
      break;
    }
    if (!target) {
      groups.push({ x: point.x, y: point.y, places: [item.place] });
      continue;
    }
    target.places.push(item.place);
    const count = target.places.length;
    target.x += (point.x - target.x) / count;
    target.y += (point.y - target.y) / count;
  }

  return groups.map(group => ({ places: group.places }));
}

function renderMapPlaces(places) {
  renderedMapPlaces = [...places];
  if (!places.length) {
    clearPlaceMarkers();
    updateMapContext([], activeCategory, "empty");
    document.body.classList.remove("map-results-updating");
    return;
  }

  const groups = buildMapClusters(places);
  const standaloneIds = new Set(groups.filter(group => group.places.length === 1).map(group => group.places[0].id));

  for (const [id, marker] of placeMarkerById) {
    if (standaloneIds.has(id)) continue;
    marker.remove();
    placeMarkerById.delete(id);
  }

  clusterMarkers.forEach(marker => marker.remove());
  clusterMarkers = [];

  groups.forEach((group, index) => {
    if (group.places.length > 1) {
      clusterMarkers.push(addPlaceCluster(group.places, index));
      return;
    }
    const place = group.places[0];
    const placeIndex = places.indexOf(place);
    let marker = placeMarkerById.get(place.id);
    if (!marker) {
      marker = addPlaceMarker(place, iconForCategory(place.category), places[0]?.id === place.id, placeIndex);
      placeMarkerById.set(place.id, marker);
    } else {
      marker.place = place;
      marker.labelPriority = placeDisplayPriority(place, placeIndex);
      marker.setLatLng?.([place.lat, place.lng]);
      marker.setTooltipContent?.(escapeHtml(place.name));
      applyNearestMarkerState(marker, places[0]?.id === place.id);
    }
  });

  markers = [...placeMarkerById.values(), ...clusterMarkers];
  markSelectedPlace();
  scheduleMapLabelUpdate();
  updateMapContext(places, activeCategory);
  document.body.classList.remove("map-results-updating");
}

function addPlaceCluster(places, index = 0) {
  const lat = places.reduce((total, place) => total + place.lat, 0) / places.length;
  const lng = places.reduce((total, place) => total + place.lng, 0) / places.length;
  const firstCategory = places[0]?.category;
  const sameCategory = places.every(place => place.category === firstCategory);
  const categoryId = sameCategory ? firstCategory : "all";
  const label = sameCategory ? (categories.find(category => category.id === categoryId)?.label || "yer") : "yakındaki yer";
  const marker = L.marker([lat, lng], {
    title: `${places.length} ${label}`,
    bubblingMouseEvents: false,
    icon: L.divIcon({
      className: "",
      html: `<div data-category="${escapeHtml(categoryId)}" class="place-cluster" style="--marker-delay:${Math.min(index, 8) * 18}ms"><strong>${places.length}</strong></div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    }),
  }).addTo(map);
  marker.isCluster = true;
  marker.on("click", () => {
    const bounds = L.latLngBounds(places.map(place => [place.lat, place.lng]));
    map.fitBounds(bounds, {
      paddingTopLeft: [24, 110],
      paddingBottomRight: [24, mapBottomPadding()],
      maxZoom: 18,
      animate: mapShouldAnimate,
    });
  });
  return marker;
}

function mapBottomPadding() {
  if (!isMobileLayout || document.body.dataset.view !== "map") return 40;
  if (!mapQuickCard?.hidden) {
    const quickHeight = mapQuickCard.getBoundingClientRect?.().height || 188;
    return Math.min(Math.round(window.innerHeight * .56), Math.round(quickHeight + 28));
  }
  if (sheet.dataset.state === "peek") return 130;
  const height = sheet.getBoundingClientRect?.().height || Math.round(window.innerHeight * .42);
  return Math.min(Math.round(window.innerHeight * .74), Math.round(height + 38));
}

function renderPlaces(places, category) {
  if (searchTerm) places = places.filter(place => [place.name, place.address, categories.find(c => c.id === place.category)?.label].join(" ").toLocaleLowerCase("tr").includes(searchTerm));
  results.replaceChildren();
  updateNearestAction(places);
  if (!places.length) {
    clearPlaceMarkers();
    renderedMapPlaces = [];
    document.body.classList.remove("map-results-updating");
    updateMapContext([], category, "empty");
    showState("empty", category.type === "favorites"
      ? "Bir yeri kaydettiğinde burada görünecek."
      : searchTerm
        ? "Aramana uyan yer bulunamadı. Farklı bir isim dene."
        : "Görünen alanda bu kategoriye ait sonuç yok. Haritayı hareket ettir; çevre otomatik yenilenir.");
    return;
  }
  updateResultSummary(places);
  const resultFragment = document.createDocumentFragment();
  places.forEach((place, index) => {
    const icon = ["favorites", "all"].includes(category.type) ? iconForCategory(place.category) : category.icon;
    resultFragment.append(createResultCard(place, icon, index === 0, index));
  });
  results.append(resultFragment);
  renderMapPlaces(places);
  animateIn(results);
  if (selectedPlace) {
    if (places.some(place => place.id === selectedPlace.id)) markSelectedPlace();
    else if (!mapQuickCard?.hidden) dismissMapQuickCard();
    else closePlaceDetails(false);
  }
}

function createResultCard(place, icon, isNearest = false, index = 0) {
  const fragment = resultTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".result-card");
  const main = fragment.querySelector(".result-main");
  const iconEl = fragment.querySelector(".result-icon");
  const nameEl = fragment.querySelector(".result-name");
  const nearestBadge = fragment.querySelector(".nearest-badge");
  const metaEl = fragment.querySelector(".result-meta");
  const addressEl = fragment.querySelector(".result-address");
  const favoriteButton = fragment.querySelector(".favorite-button");
  const routeButton = fragment.querySelector(".route-button");
  const directionsLink = fragment.querySelector(".directions-link");
  const phoneLink = fragment.querySelector(".phone-link");

  card.dataset.placeId = place.id;
  card.dataset.category = place.category;
  card.style.setProperty("--card-delay", (Math.min(index, 7) * 35) + "ms");
  card.classList.toggle("is-nearest", isNearest);
  nearestBadge.hidden = !isNearest;
  iconEl.innerHTML = categorySvg(place.category);
  nameEl.textContent = place.name;
  metaEl.textContent = buildMeta(place);
  const usefulAddress = hasUsefulAddress(place);
  addressEl.hidden = !usefulAddress;
  addressEl.textContent = usefulAddress ? place.address : "";
  favoriteButton.textContent = isFavorite(place.id) ? "★" : "☆";
  favoriteButton.classList.toggle("is-favorite", isFavorite(place.id));
  favoriteButton.setAttribute("aria-label", isFavorite(place.id) ? "Favoriden çıkar" : "Favoriye ekle");

  main.addEventListener("click", () => {
    if (document.body.dataset.view === "map") openMapQuickCard(place, main);
    else openPlaceDetails(place, main);
  });
  favoriteButton.addEventListener("click", () => toggleFavorite(place));
  routeButton.textContent = routeStops.some(stop => stop.id === place.id) ? "Rotadan çıkar" : "Rotaya ekle";
  routeButton.addEventListener("click", () => toggleRouteStop(place));

  directionsLink.href = buildDirectionsUrl(place);

  if (place.phone) {
    phoneLink.hidden = false;
    phoneLink.href = `tel:${place.phone.replace(/[^+\d]/g, "")}`;
  }

  return fragment;
}

function buildMeta(place) {
  const parts = [categories.find(c => c.id === place.category)?.label].filter(Boolean);
  if (Number.isFinite(place.distanceKm)) {
    parts.push(formatDistance(place.distanceKm));
    parts.push(formatWalkingTime(place.distanceKm));
  }
  const hours = openingStatus(place.openingHours);
  if (hours) parts.push(hours.label);
  if (place.category === "duty") parts.push("Nöbetçi");
  return parts.join(" · ");
}

function addPlaceMarker(place, icon, isNearest = false, index = 0) {
  const markerSize = 36;
  const marker = L.marker([place.lat, place.lng], {
    title: place.name,
    alt: place.name,
    bubblingMouseEvents: false,
    icon: L.divIcon({
      className: "",
      html: `<div data-category="${escapeHtml(place.category)}" class="place-marker" style="--marker-delay:${Math.min(index, 10) * 18}ms"><span>${categorySvg(place.category)}</span></div>`,
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize / 2, markerSize / 2],
    }),
  }).bindTooltip(escapeHtml(place.name), {
    direction: "top",
    offset: [0, -22],
    permanent: true,
    opacity: 1,
    className: "place-label",
    pane: "placeLabels",
  }).addTo(map);
  marker.isCluster = false;
  marker.placeId = place.id;
  marker.placeName = place.name;
  marker.place = place;
  marker.labelPriority = placeDisplayPriority(place, index);
  marker.hasSpecificName = placeHasSpecificName(place);
  marker.on("click", () => {
    if (document.body.dataset.view === "map") openMapQuickCard(marker.place, marker.getElement());
    else openPlaceDetails(marker.place, marker.getElement());
  });
  applyNearestMarkerState(marker, isNearest);
  return marker;
}

function applyNearestMarkerState(marker, isNearest) {
  marker.isNearest = Boolean(isNearest);
  const element = marker.getElement?.();
  const markerEl = element?.querySelector?.(".place-marker");
  markerEl?.classList.toggle("is-nearest", marker.isNearest);

  const label = marker.isNearest ? `${marker.placeName} · en yakın` : marker.placeName;
  element?.setAttribute?.("aria-label", label);
  element?.setAttribute?.("title", label);
}


function updateMapLabels() {
  const viewport = map.getSize();
  const mobileViewport = viewport.x < 760;
  const zoom = map.getZoom();
  const labelLimit = zoom >= 17
    ? (mobileViewport ? 10 : 22)
    : zoom >= 16
      ? (mobileViewport ? 8 : 16)
      : zoom >= 15
        ? (mobileViewport ? 6 : 12)
        : (mobileViewport ? 4 : 8);

  const placeMarkers = [...placeMarkerById.values()];
  const markerRects = placeMarkers.map(marker => {
    const point = map.latLngToContainerPoint(marker.getLatLng());
    return {
      placeId: marker.placeId,
      left: point.x - 22,
      right: point.x + 22,
      top: point.y - 22,
      bottom: point.y + 22,
    };
  });

  const occupiedLabels = [];
  let visible = 0;
  const ordered = placeMarkers.sort((a, b) => {
    const aSelected = a.placeId === selectedPlace?.id ? 1 : 0;
    const bSelected = b.placeId === selectedPlace?.id ? 1 : 0;
    return bSelected - aSelected || (b.labelPriority || 0) - (a.labelPriority || 0);
  });

  ordered.forEach(marker => {
    const selected = marker.placeId === selectedPlace?.id;
    const point = map.latLngToContainerPoint(marker.getLatLng());
    const width = Math.min(mobileViewport ? 154 : 188, 30 + marker.placeName.length * 6.35);
    const height = selected ? 34 : 29;
    const bottom = point.y - 30;
    const rect = {
      left: point.x - width / 2,
      right: point.x + width / 2,
      top: bottom - height,
      bottom,
    };

    const onScreen = rect.left < viewport.x - 4 && rect.right > 4 && rect.bottom > 4 && rect.top < viewport.y - 4;
    const overlapsLabel = occupiedLabels.some(other =>
      rect.left < other.right + 8 &&
      rect.right + 8 > other.left &&
      rect.top < other.bottom + 6 &&
      rect.bottom + 6 > other.top
    );
    const hitsOtherPin = markerRects.some(other =>
      other.placeId !== marker.placeId &&
      rect.left < other.right + LABEL_MARKER_GAP_PX &&
      rect.right + LABEL_MARKER_GAP_PX > other.left &&
      rect.top < other.bottom + LABEL_MARKER_GAP_PX &&
      rect.bottom + LABEL_MARKER_GAP_PX > other.top
    );

    const show = selected || (
      marker.hasSpecificName &&
      visible < labelLimit &&
      onScreen &&
      !overlapsLabel &&
      !hitsOtherPin
    );

    if (show && !selected) visible += 1;
    if (show) occupiedLabels.push(rect);
    if (show) marker.openTooltip();
    else marker.closeTooltip();
  });
}

function fitResultsOnMap(places) {
  if (!userLocation || !places.length || manualLocationMode) return;
  const points = [[userLocation.lat, userLocation.lng], ...places.slice(0, 10).map((place) => [place.lat, place.lng])];
  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds, {
    paddingTopLeft: [window.matchMedia("(min-width: 760px)").matches && document.body.dataset.view === "map" ? 450 : 24, 104],
    paddingBottomRight: [24, mapBottomPadding()],
    maxZoom: 15.5,
    animate: mapShouldAnimate,
  });
}

function focusPlace(place) {
  setView("map");
  mapHasFramedResults = true;
  requestAnimationFrame(() => {
    map.invalidateSize();
    map.setView([place.lat, place.lng], Math.max(map.getZoom(), 16), { animate: mapShouldAnimate });
    openPlaceDetails(place);
  });
}

function scrollToResult(placeId) {
  setView("list");
  const target = [...results.querySelectorAll(".result-card")].find((card) => card.dataset.placeId === placeId);
  target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function openPlaceDetails(place, trigger = null) {
  recordPlaceSignal(place);
  closeMapQuickCard({ clearSelection: false, restoreSheet: true });
  if (document.body.dataset.view === "map" && sheet.dataset.state === "peek") expandMapPanel();
  if (document.body.dataset.view === "map" && history.state?.yakinimView !== "map-detail") {
    history.pushState({ yakinimView: "map-detail", yakinimSection: "nearby" }, "", location.href);
  }
  selectedPlace = place;
  detailTrigger = trigger || detailTrigger;
  const detail = document.querySelector("#placeDetail");
  detail.dataset.category = place.category;
  detail.querySelector(".detail-icon").innerHTML = categorySvg(place.category);
  detail.querySelector("#detailName").textContent = place.name;
  detail.querySelector("#detailMeta").textContent = buildMeta(place);
  const detailAddress = detail.querySelector("#detailAddress");
  detailAddress.hidden = !hasUsefulAddress(place);
  detailAddress.textContent = hasUsefulAddress(place) ? place.address : "";
  detail.querySelector("#detailDirections").href = buildDirectionsUrl(place);
  const phone = detail.querySelector("#detailPhone");
  phone.hidden = !place.phone;
  if (place.phone) phone.href = `tel:${place.phone.replace(/[^+\d]/g, "")}`;
  const favorite = detail.querySelector("#detailFavorite");
  favorite.textContent = isFavorite(place.id) ? "Kaydedildi" : "Kaydet";
  favorite.setAttribute("aria-pressed", String(isFavorite(place.id)));
  detail.querySelector("#detailRoute").textContent = routeStops.some(stop => stop.id === place.id) ? "Rotadan çıkar" : "Rotaya ekle";
  detail.querySelector("#detailMap").hidden = document.body.dataset.view === "map";
  detail.hidden = false;
  document.body.classList.add("has-place-detail");
  markSelectedPlace();
  updateMapContext(renderedMapPlaces, activeCategory, "selected", place);
  animateIn(detail);
  detail.querySelector("#closeDetail").focus({ preventScroll: true });
}

function closePlaceDetails(restoreFocus = true) {
  closeMapQuickCard({ clearSelection: false });
  const detail = document.querySelector("#placeDetail");
  if (!detail) return;
  detail.hidden = true;
  selectedPlace = null;
  document.body.classList.remove("has-place-detail");
  markSelectedPlace();
  updateMapContext(renderedMapPlaces, activeCategory);
  if (restoreFocus && detailTrigger?.isConnected) detailTrigger.focus({ preventScroll: true });
  detailTrigger = null;
}

function markSelectedPlace() {
  markers.forEach(marker => {
    if (marker.isCluster) return;
    const selected = marker.placeId === selectedPlace?.id;
    marker.getElement()?.classList.toggle("is-selected", selected);
    marker.getTooltip?.()?.getElement?.()?.classList.toggle("is-selected-place-label", selected);
    marker.setZIndexOffset(selected ? 1200 : 0);
  });
  scheduleMapLabelUpdate();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
}

function toggleRouteStop(place) {
  if (routeStops.some(stop => stop.id === place.id)) {
    routeStops = routeStops.filter(stop => stop.id !== place.id);
    showToast("Rotadan çıkarıldı");
  } else {
    if (routeStops.length >= 4) { showToast("Bir rotaya en fazla 4 yer eklenebilir"); return; }
    routeStops.push({ id: place.id, name: place.name, lat: place.lat, lng: place.lng });
    showToast("Rotaya eklendi");
  }
  persistRoute();
  renderRoute();
  if (selectedPlace?.id === place.id) document.querySelector("#detailRoute").textContent = routeStops.some(stop => stop.id === place.id) ? "Rotadan çıkar" : "Rotaya ekle";
  results.querySelectorAll(".result-card").forEach(card => {
    const button = card.querySelector(".route-button");
    button.textContent = routeStops.some(stop => stop.id === card.dataset.placeId) ? "Rotadan çıkar" : "Rotaya ekle";
  });
}

function persistRoute() {
  try { localStorage.setItem(ROUTE_KEY, JSON.stringify(routeStops)); } catch { /* Route remains usable this session. */ }
}

function buildRouteUrl(stops) {
  if (!stops.length) return "";
  const coordinates = place => `${place.lat},${place.lng}`;
  const params = new URLSearchParams({ api: "1", destination: coordinates(stops.at(-1)) });
  if (stops.length > 1) params.set("waypoints", stops.slice(0, -1).map(coordinates).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

function renderRoute() {
  const tray = document.querySelector("#routeTray");
  tray.hidden = !routeStops.length;
  document.body.classList.toggle("has-route", !!routeStops.length);
  results.querySelectorAll(".result-card").forEach(card => {
    card.querySelector(".route-button").textContent = routeStops.some(stop => stop.id === card.dataset.placeId) ? "Rotadan çıkar" : "Rotaya ekle";
  });
  if (selectedPlace) document.querySelector("#detailRoute").textContent = routeStops.some(stop => stop.id === selectedPlace.id) ? "Rotadan çıkar" : "Rotaya ekle";
  if (!routeStops.length) return;
  document.querySelector("#routeStops").textContent = routeStops.map((stop, index) => `${index + 1}. ${stop.name}`).join("  →  ");
  document.querySelector("#openRoute").href = buildRouteUrl(routeStops);
}

function clearPlaceMarkers() {
  for (const marker of placeMarkerById.values()) marker.remove();
  clusterMarkers.forEach(marker => marker.remove());
  placeMarkerById.clear();
  clusterMarkers = [];
  markers = [];
}

function toggleFavorite(place) {
  if (isFavorite(place.id)) favorites = favorites.filter((item) => item.id !== place.id);
  else favorites = [...favorites, { ...place }];

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  if (lastDiscoveryBundle) renderDiscoveryHub(lastDiscoveryBundle);
  showToast(isFavorite(place.id) ? "Yer kaydedildi" : "Kayıt kaldırıldı");

  if (activeCategory.type === "favorites") loadFavorites();
  else if (searchTerm) renderSearchResults(searchTerm);
  else renderPlaces(activePlaces, activeCategory);

  if (selectedPlace?.id === place.id) {
    const favorite = document.querySelector("#detailFavorite");
    favorite.textContent = isFavorite(place.id) ? "Kaydedildi" : "Kaydet";
    favorite.setAttribute("aria-pressed", String(isFavorite(place.id)));
    if (quickFavorite) {
      quickFavorite.textContent = isFavorite(place.id) ? "Kaydedildi" : "Kaydet";
      quickFavorite.setAttribute("aria-pressed", String(isFavorite(place.id)));
    }
  }
}

function isFavorite(id) {
  return favorites.some((item) => item.id === id);
}

function iconForCategory(categoryId) {
  return categories.find((item) => item.id === categoryId)?.icon || "•";
}

function buildCacheKey(categoryId, location = userLocation, scope = "legacy") {
  const roundedLat = Number(location?.lat || 0).toFixed(3);
  const roundedLng = Number(location?.lng || 0).toFixed(3);
  return `${CACHE_PREFIX}${categoryId}:${roundedLat}:${roundedLng}:${scope}`;
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
  const titles = { loading: "Çevren taranıyor", empty: "Burada henüz bir şey görünmüyor", error: "Veri şu an kullanılamıyor" };
  const symbols = { loading: "⌁", empty: "⌖", error: "!" };
  resultSummary.textContent = kind === "loading" ? "Aranıyor…" : "Henüz sonuç yok";
  nearestAction.hidden = true;
  nearestAction.removeAttribute("href");
  results.innerHTML = `<div class="state-card ${kind}-state" role="${kind === "error" ? "alert" : "status"}"><span class="state-visual" aria-hidden="true">${symbols[kind] || "·"}</span><div><strong>${escapeHtml(titles[kind] || "Bilgi")}</strong><p>${escapeHtml(message)}</p></div></div>`;
}

function resultCountLabel(count) {
  const safeCount = Math.max(0, Number(count) || 0);
  return safeCount >= MAX_VISIBLE_PLACES ? `${MAX_VISIBLE_PLACES}+ sonuç` : `${safeCount} sonuç`;
}

function updateResultSummary(places) {
  if (!places.length) {
    resultSummary.textContent = "Görünen alanda sonuç yok";
    return;
  }
  const nearest = places.find(place => Number.isFinite(place.distanceKm));
  const nearestText = nearest
    ? ` · en yakın ${formatDistance(nearest.distanceKm)} · ${formatWalkingTime(nearest.distanceKm)}`
    : "";
  resultSummary.textContent = `${resultCountLabel(places.length)} · görünen alan${nearestText}`;
}

function applySheetState(state) {
  const nextState = SHEET_STATES.includes(state) ? state : "half";
  sheet.dataset.state = nextState;
  document.body.dataset.sheetState = nextState;
  prefs.sheetState = nextState;
  persistPrefs();
  const labels = { peek: "Paneli aç", half: "Paneli genişlet", expanded: "Paneli küçült" };
  sheetToggle.setAttribute("aria-label", labels[nextState]);
  sheetToggle.setAttribute("aria-expanded", String(nextState !== "peek"));
  if (document.body.dataset.view === "map") {
    scheduleMapLabelUpdate();
    syncMapControlOffset();
  }
}

function cycleSheetState() {
  const currentIndex = SHEET_STATES.indexOf(sheet.dataset.state || "half");
  const nextState = SHEET_STATES[(currentIndex + 1) % SHEET_STATES.length];
  applySheetState(nextState);
}

function collapseMapPanel() {
  if (document.body.dataset.view !== "map") return;
  if (history.state?.yakinimView === "map-place") {
    dismissMapQuickCard();
    return;
  }
  if (history.state?.yakinimView === "map-detail") {
    history.go(-2);
    return;
  }
  closePlaceDetails(false);
  if (sheet.dataset.state === "peek") return;
  if (history.state?.yakinimView === "map-open") history.back();
  else applySheetState("peek");
}

function expandMapPanel() {
  if (document.body.dataset.view !== "map" || sheet.dataset.state !== "peek") return;
  if (history.state?.yakinimView === "map-peek") history.pushState({ yakinimView: "map-open", yakinimSection: "nearby" }, "", location.href);
  applySheetState("half");
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
  if (document.body.dataset.view === "map" && SHEET_STATES[nextIndex] === "peek") collapseMapPanel();
  else if (document.body.dataset.view === "map" && sheet.dataset.state === "peek") expandMapPanel();
  else applySheetState(SHEET_STATES[nextIndex]);
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
  nearestActionMeta.textContent = `${nearest.name} · ${formatDistance(nearest.distanceKm)} · ${formatWalkingTime(nearest.distanceKm)}`;
  nearestAction.hidden = false;
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLocaleLowerCase("tr");
}

function parseDiscoveryQuery(value) {
  const normalized = normalizeSearchValue(value)
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

  let working = normalized;
  const openOnly = /\b(acik|open)\b/.test(working);
  const nearestFirst = /\ben yakin\b/.test(working);
  const minuteMatch = working.match(/\b(\d{1,3})\s*(?:dk|dakika)(?:\s+icinde)?\b/);
  const maxWalkMinutes = minuteMatch ? Math.min(180, Number(minuteMatch[1])) : null;

  working = working
    .replace(/\b(acik|open)\b/g, " ")
    .replace(/\ben yakin\b/g, " ")
    .replace(/\b\d{1,3}\s*(?:dk|dakika)(?:\s+icinde)?\b/g, " ")
    .replace(/\bicinde\b/g, " ");

  let categoryId = null;
  for (const [id, aliases] of Object.entries(CATEGORY_QUERY_ALIASES)) {
    const asciiAliases = aliases.map(alias => normalizeSearchValue(alias)
      .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c"));
    const alias = asciiAliases.find(item => working.includes(item));
    if (!alias) continue;
    categoryId = id;
    working = working.replace(alias, " ");
    break;
  }

  return {
    categoryId,
    openOnly,
    nearestFirst,
    maxWalkMinutes,
    residualText: working.replace(/\s+/g, " ").trim(),
  };
}

function discoveryContextBoost(place, now = new Date()) {
  const hour = now.getHours();
  if (hour >= 6 && hour < 11) {
    if (place.category === "bakery") return 14;
    if (place.category === "cafe") return 12;
    if (place.category === "market") return 4;
  }
  if (hour >= 11 && hour < 15) {
    if (place.category === "food") return 14;
    if (place.category === "cafe") return 5;
  }
  if (hour >= 17 && hour < 22) {
    if (place.category === "food") return 14;
    if (place.category === "market") return 6;
  }
  if (hour >= 22 || hour < 6) {
    if (place.category === "fuel") return 9;
    if (place.category === "pharmacy") return 7;
  }
  return 0;
}

function handleSearchInput(value) {
  const raw = String(value || "");
  searchTerm = normalizeSearchValue(raw);
  if (placeSearchInput && placeSearchInput.value !== raw) placeSearchInput.value = raw;
  if (mapSearchInput && mapSearchInput.value !== raw) mapSearchInput.value = raw;
  if (mapSearchClear) mapSearchClear.hidden = !searchTerm;
  if (!mapQuickCard?.hidden) dismissMapQuickCard();

  if (!searchTerm) {
    resultTitle.textContent = activeCategory.type === "all" ? "Yakındaki yerler" : activeCategory.label;
    if (activeCategory.type === "favorites") loadFavorites();
    else if (activeCategory.type === "duty") renderPlaces(activePlaces, activeCategory);
    else if (lastDiscoveryBundle) renderActiveCategoryFromBundle();
    else renderPlaces(activePlaces, activeCategory);
    return;
  }

  renderSearchResults(searchTerm, raw.trim());
}

function searchableVisiblePlaces() {
  const candidates = [];
  if (lastDiscoveryBundle) {
    const shown = visibleBundle(lastDiscoveryBundle);
    if (shown) candidates.push(...Object.values(shown).flat());
  }
  candidates.push(...activePlaces, ...favorites);

  const unique = new Map();
  for (const place of candidates) {
    if (!place?.id || !isPlaceInVisibleMap(place)) continue;
    const distanceKm = userLocation && Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? distanceBetween(userLocation.lat, userLocation.lng, place.lat, place.lng)
      : place.distanceKm;
    unique.set(place.id, { ...place, distanceKm });
  }
  return [...unique.values()].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

function renderSearchResults(query = searchTerm, displayQuery = "") {
  const normalized = normalizeSearchValue(query);
  const intent = parseDiscoveryQuery(normalized);
  let places = searchableVisiblePlaces().filter(place => {
    if (intent.categoryId && place.category !== intent.categoryId) return false;
    if (intent.openOnly && openingStatus(place.openingHours)?.state !== "open") return false;
    if (Number.isFinite(intent.maxWalkMinutes) && estimateWalkingMinutes(place.distanceKm) > intent.maxWalkMinutes) return false;

    if (!intent.residualText) return true;
    const category = categories.find(item => item.id === place.category)?.label || "";
    const haystack = normalizeSearchValue([place.name, place.address, category].join(" "));
    return haystack.includes(intent.residualText);
  });

  places.sort((a, b) => {
    if (intent.nearestFirst) return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    return discoveryScore(b).score - discoveryScore(a).score || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });
  places = places.slice(0, MAX_VISIBLE_PLACES);

  const allCategory = categories.find(category => category.id === "all") || activeCategory;
  resultTitle.textContent = displayQuery ? `“${displayQuery}” için` : "Arama sonuçları";
  const intentBits = [
    intent.openOnly ? "açık" : "",
    intent.categoryId ? categories.find(category => category.id === intent.categoryId)?.label : "",
    Number.isFinite(intent.maxWalkMinutes) ? `${intent.maxWalkMinutes} dk içinde` : "",
  ].filter(Boolean);
  statusText.textContent = places.length
    ? `${resultCountLabel(places.length)} · ${intentBits.length ? intentBits.join(" · ") : "görünen harita alanı"}`
    : "Bu ölçütlere uyan yakın bir yer bulunamadı.";
  renderPlaces(places, allCategory);
}

function recenterOnUser() {
  if (!userLocation) {
    locateUser({ forceFresh: false });
    return;
  }
  if (!mapQuickCard?.hidden) dismissMapQuickCard();
  const targetZoom = Math.max(map.getZoom(), Math.min(16, locationZoomForAccuracy(userLocation.accuracy, 15)));
  map.flyTo([userLocation.lat, userLocation.lng], targetZoom, {
    animate: mapShouldAnimate,
    duration: 0.45,
  });
  statusText.textContent = "Konumuna dönüldü.";
  scheduleViewportRefresh();
}

function syncMapControlOffset() {
  requestAnimationFrame(() => {
    if (document.body.dataset.view !== "map") return;
    const surface = !mapQuickCard?.hidden ? mapQuickCard : sheet;
    const fallbackHeight = !mapQuickCard?.hidden ? 188 : 82;
    const height = surface?.getBoundingClientRect?.().height || fallbackHeight;
    const safeHeight = Math.min(Math.round(window.innerHeight * 0.74), Math.max(fallbackHeight, Math.round(height)));
    document.body.style.setProperty("--map-sheet-offset", `${safeHeight}px`);
  });
}

function openMapQuickCard(place, trigger = null, { pushHistory = true, returnSheetState = null } = {}) {
  recordPlaceSignal(place);
  if (!mapQuickCard || document.body.dataset.view !== "map") {
    openPlaceDetails(place, trigger);
    return;
  }

  const wasHidden = mapQuickCard.hidden;
  if (wasHidden) {
    quickCardReturnSheetState = returnSheetState || sheet.dataset.state || "peek";
    quickCardReturnHistoryState = history.state?.yakinimView === "map-open" ? "map-open" : "map-peek";
  }

  selectedPlace = place;
  detailTrigger = trigger || detailTrigger;
  quickIcon.innerHTML = categorySvg(place.category);
  quickName.textContent = place.name;
  const category = categories.find(item => item.id === place.category)?.label || "Yer";
  const travel = Number.isFinite(place.distanceKm)
    ? `${formatDistance(place.distanceKm)} · ${formatWalkingTime(place.distanceKm)}`
    : "";
  quickMeta.textContent = [category, travel].filter(Boolean).join(" · ");
  quickAddress.hidden = !hasUsefulAddress(place);
  quickAddress.textContent = hasUsefulAddress(place) ? place.address : "";
  quickDirections.href = buildDirectionsUrl(place);
  quickFavorite.textContent = isFavorite(place.id) ? "Kaydedildi" : "Kaydet";
  quickFavorite.setAttribute("aria-pressed", String(isFavorite(place.id)));

  const hours = openingStatus(place.openingHours);
  quickStatus.hidden = !hours;
  quickStatus.className = "quick-status";
  if (hours) {
    quickStatus.textContent = hours.label;
    quickStatus.classList.add(`is-${hours.state}`);
  }

  mapQuickCard.hidden = false;
  sheet.inert = true;
  sheet.setAttribute("aria-hidden", "true");
  document.body.classList.add("has-map-quick-card");

  if (pushHistory && history.state?.yakinimView !== "map-place") {
    history.pushState({
      yakinimView: "map-place",
      placeId: place.id,
      returnSheetState: quickCardReturnSheetState,
      returnHistoryState: quickCardReturnHistoryState,
    }, "", location.href);
  } else if (history.state?.yakinimView === "map-place") {
    history.replaceState({ ...history.state, placeId: place.id, returnSheetState: quickCardReturnSheetState }, "", location.href);
  }

  markSelectedPlace();
  updateMapContext(renderedMapPlaces, activeCategory, "selected", place);
  syncMapControlOffset();
  requestAnimationFrame(() => keepSelectedPlaceVisible(place));
}

function closeMapQuickCard({ clearSelection = true, restoreSheet = true } = {}) {
  if (!mapQuickCard) return;
  mapQuickCard.hidden = true;
  sheet.inert = false;
  sheet.removeAttribute("aria-hidden");
  document.body.classList.remove("has-map-quick-card");
  if (restoreSheet && document.body.dataset.view === "map") applySheetState(quickCardReturnSheetState || "peek");
  if (clearSelection && selectedPlace) {
    selectedPlace = null;
    markSelectedPlace();
    updateMapContext(renderedMapPlaces, activeCategory);
  }
  syncMapControlOffset();
}

function dismissMapQuickCard({ clearSelection = true } = {}) {
  const hasHistoryState = history.state?.yakinimView === "map-place";
  closeMapQuickCard({ clearSelection, restoreSheet: true });
  if (hasHistoryState) history.back();
}

function findKnownPlace(placeId) {
  if (!placeId) return null;
  return activePlaces.find(place => place.id === placeId)
    || renderedMapPlaces.find(place => place.id === placeId)
    || spatialPoiPool.get(placeId)
    || favorites.find(place => place.id === placeId)
    || null;
}

function keepSelectedPlaceVisible(place) {
  if (!place || mapQuickCard?.hidden || typeof map.panInside !== "function") return;
  const cardHeight = mapQuickCard.getBoundingClientRect?.().height || 188;
  map.panInside([place.lat, place.lng], {
    paddingTopLeft: [24, 86],
    paddingBottomRight: [24, cardHeight + 28],
    animate: mapShouldAnimate,
  });
}

async function sharePlace(place) {
  if (!place) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
  const text = Number.isFinite(place.distanceKm)
    ? `${place.name} · ${formatDistance(place.distanceKm)} · ${formatWalkingTime(place.distanceKm)}`
    : place.name;

  if (navigator.share) {
    try {
      await navigator.share({ title: place.name, text, url });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  const copied = await copyTextToClipboard(`${text}\n${url}`);
  showToast(copied ? "Konum bağlantısı kopyalandı" : "Paylaşım bu tarayıcıda kullanılamıyor");
}

async function copyTextToClipboard(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand?.("copy") === true;
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}


function estimateWalkingMinutes(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;
  const metersPerMinute = 80;
  return Math.max(1, Math.ceil((distanceKm * 1000) / metersPerMinute));
}

function formatWalkingTime(distanceKm) {
  const minutes = estimateWalkingMinutes(distanceKm);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 60) return `~${minutes} dk yürüme`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `~${hours} sa ${remainder} dk yürüme` : `~${hours} sa yürüme`;
}

function openingStatus(openingHours, now = new Date()) {
  const raw = String(openingHours || "").trim();
  if (!raw) return null;
  if (raw === "24/7") return { state: "open", label: "Açık 24 saat" };

  const dayCodes = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = dayCodes[now.getDay()];
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const clauses = raw.split(";").map(value => value.trim()).filter(Boolean);
  let parsedAny = false;

  const dayMatches = (spec) => {
    const tokens = spec.split(",").map(value => value.trim());
    return tokens.some(token => {
      if (token === today) return true;
      const range = token.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/);
      if (!range) return false;
      const start = dayCodes.indexOf(range[1]);
      const end = dayCodes.indexOf(range[2]);
      const current = dayCodes.indexOf(today);
      return start <= end ? current >= start && current <= end : current >= start || current <= end;
    });
  };

  for (const clause of clauses) {
    const off = clause.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+off$/);
    if (off) {
      parsedAny = true;
      if (dayMatches(off[1])) return { state: "closed", label: "Kapalı" };
      continue;
    }

    const match = clause.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
    if (!match) continue;
    parsedAny = true;
    if (!dayMatches(match[1])) continue;

    const start = Number(match[2]) * 60 + Number(match[3]);
    const end = Number(match[4]) * 60 + Number(match[5]);
    if (end < start) return null;
    if (minutesNow >= start && minutesNow < end) {
      const closeLabel = `${match[4]}:${match[5]}`;
      return { state: "open", label: `Açık · ${closeLabel}'de kapanıyor` };
    }
    return { state: "closed", label: "Kapalı" };
  }

  return parsedAny ? { state: "closed", label: "Kapalı" } : null;
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

console.info(`Yakınımda v${APP_VERSION} · viewport discovery`);


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

async function fetchNearbyPayload() {
  const envelope = buildViewportEnvelope();
  if (!envelope) return { elements: [] };
  return fetchViewportPayload(envelope);
}
