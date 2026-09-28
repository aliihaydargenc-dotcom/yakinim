(() => {
  "use strict";

  const MOBILE_QUERY = "(max-width: 759px)";
  const ROUTE_STORAGE_KEY = "yakinimda:route:v1";
  const ROUTE_PICK_KEY = "yakinimda:route-pick-mode:v1";
  const SURFACE_CLASS = "ykn-mobile-surface-in";
  const MAP_CLASS = "ykn-mobile-map-in";
  let previousSurface = "";
  let transitionTimer = 0;

  const $ = (selector, root = document) => root.querySelector(selector);

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function routeCount() {
    try {
      const route = JSON.parse(localStorage.getItem(ROUTE_STORAGE_KEY) || "[]");
      return Array.isArray(route) ? route.length : 0;
    } catch {
      return 0;
    }
  }

  function currentSurfaceKey() {
    const section = document.body.dataset.section || "nearby";
    const view = document.body.dataset.view || "list";
    const routeOpen = $("#routeTray")?.dataset.mobileOpen === "true";
    if (routeOpen) return "route";
    if (section === "nearby") return view === "map" ? "map" : "nearby";
    return section;
  }

  function visibleSurface() {
    const key = currentSurfaceKey();
    if (key === "map") return $(".sheet");
    if (key === "nearby") return $(".sheet");
    if (key === "news") return $("#newsSection");
    if (key === "radio") return $("#radioSection");
    if (key === "route") return $("#routeTray");
    return null;
  }

  function animateMobileSurface(force = false) {
    if (!isMobile()) return;
    const key = currentSurfaceKey();
    if (!force && key === previousSurface) return;
    const oldKey = previousSurface;
    previousSurface = key;

    const surface = visibleSurface();
    if (!surface || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    surface.classList.remove(SURFACE_CLASS);
    void surface.offsetWidth;
    surface.classList.add(SURFACE_CLASS);

    const map = $("#map");
    if (key === "map" && oldKey !== "map" && map) {
      map.classList.remove(MAP_CLASS);
      void map.offsetWidth;
      map.classList.add(MAP_CLASS);
    }

    clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      surface.classList.remove(SURFACE_CLASS);
      map?.classList.remove(MAP_CLASS);
    }, 260);
  }

  function normalizeMapEntry(previousView) {
    if (!isMobile()) return;
    if (document.body.dataset.section !== "nearby" || document.body.dataset.view !== "map") return;
    if (previousView === "map") return;

    window.requestAnimationFrame(() => {
      const sheet = $(".sheet");
      if (!sheet) return;
      try {
        if (typeof applySheetState === "function") applySheetState("half");
        else {
          sheet.dataset.state = "half";
          document.body.dataset.sheetState = "half";
        }
      } catch {
        sheet.dataset.state = "half";
        document.body.dataset.sheetState = "half";
      }
    });
  }

  function ensureRoutePickBanner() {
    const sheet = $(".sheet");
    const categoryStrip = $("#categoryStrip");
    if (!sheet || !categoryStrip) return null;
    let banner = $("#routePickBanner");
    if (banner) return banner;

    banner = document.createElement("section");
    banner.id = "routePickBanner";
    banner.className = "ykn-route-pick-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.hidden = true;
    banner.innerHTML = `
      <span>
        <strong>Rotanı oluşturuyorsun</strong>
        <small id="routePickMeta">Kartlardan durak ekleyebilirsin.</small>
      </span>
      <button id="routePickDone" type="button">Rotaya dön</button>`;
    sheet.insertBefore(banner, categoryStrip);
    $("#routePickDone", banner)?.addEventListener("click", () => exitRoutePickMode({ openRoute: true }));
    return banner;
  }

  function syncRoutePickBanner() {
    const banner = ensureRoutePickBanner();
    if (!banner) return;
    const active = document.body.classList.contains("route-pick-mode");
    if (banner.hidden === active) banner.hidden = !active;
    const meta = $("#routePickMeta", banner);
    if (!meta) return;
    const count = routeCount();
    const nextCopy = count
      ? `${count} durak eklendi · başka bir yer daha seçebilir veya rotaya dönebilirsin.`
      : "Bir yer kartındaki + Rotaya ekle düğmesini kullan.";
    if (meta.textContent !== nextCopy) meta.textContent = nextCopy;
  }

  function enterRoutePickMode() {
    if (!isMobile()) return;
    document.body.classList.add("route-pick-mode");
    try { sessionStorage.setItem(ROUTE_PICK_KEY, "1"); } catch {}
    syncRoutePickBanner();
    $("[data-mobile-destination='nearby']")?.click();
    window.setTimeout(() => {
      $("#placeSearch")?.focus({ preventScroll: true });
      animateMobileSurface(true);
    }, 80);
  }

  function exitRoutePickMode({ openRoute = false } = {}) {
    document.body.classList.remove("route-pick-mode");
    try { sessionStorage.removeItem(ROUTE_PICK_KEY); } catch {}
    syncRoutePickBanner();
    if (openRoute) $("[data-mobile-destination='route']")?.click();
  }

  function syncRouteExperience() {
    const tray = $("#routeTray");
    if (!tray) return;
    const count = routeCount();
    const empty = $(".ykn-route-empty", tray);
    if (empty) {
      const shouldHide = count > 0;
      if (empty.hidden !== shouldHide) empty.hidden = shouldHide;
      const emptyCopy = "Henüz durağın yok. Yakındaki yerlerden birini seçerek rotanı oluşturmaya başla.";
      if (empty.textContent !== emptyCopy) empty.textContent = emptyCopy;
    }

    let discover = $(".ykn-route-discover", tray);
    if (!discover) {
      discover = document.createElement("button");
      discover.type = "button";
      discover.className = "ykn-route-discover";
      discover.textContent = "+ Yakındaki yerlerden ekle";
      discover.addEventListener("click", enterRoutePickMode);
      const emptyTarget = empty || $("#routeStops", tray);
      emptyTarget?.insertAdjacentElement("afterend", discover);
    }
    const shouldHideDiscover = count > 0;
    if (discover.hidden !== shouldHideDiscover) discover.hidden = shouldHideDiscover;

    const openRoute = $("#openRoute", tray);
    if (openRoute) openRoute.toggleAttribute("aria-disabled", count < 1);
    syncRoutePickBanner();
  }

  function restoreRoutePickMode() {
    if (!isMobile()) return;
    let shouldRestore = false;
    try { shouldRestore = sessionStorage.getItem(ROUTE_PICK_KEY) === "1"; } catch {}
    if (shouldRestore) {
      document.body.classList.add("route-pick-mode");
      syncRoutePickBanner();
    }
  }

  function bindRouteFlow() {
    ensureRoutePickBanner();
    syncRouteExperience();
    restoreRoutePickMode();

    document.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const routeNav = target.closest("[data-mobile-destination='route']");
      if (routeNav) {
        exitRoutePickMode();
        window.setTimeout(syncRouteExperience, 0);
        return;
      }

      const routeAction = target.closest(".route-button,#detailRoute");
      if (routeAction) {
        window.setTimeout(() => {
          syncRouteExperience();
          syncRoutePickBanner();
        }, 50);
      }
    });

    const tray = $("#routeTray");
    if (tray) {
      const stops = $("#routeStops", tray);
      if (stops) {
        new MutationObserver(syncRouteExperience).observe(stops, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
      new MutationObserver(syncRouteExperience).observe(tray, {
        attributes: true,
        attributeFilter: ["hidden", "data-mobile-open"],
      });
    }

    window.addEventListener("storage", event => {
      if (event.key === ROUTE_STORAGE_KEY) syncRouteExperience();
    });
  }

  function bindUnifiedMobileNavigation() {
    let previousView = document.body.dataset.view || "list";
    previousSurface = currentSurfaceKey();

    const bodyObserver = new MutationObserver(mutations => {
      let stateChanged = false;
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && ["data-section", "data-view"].includes(mutation.attributeName)) {
          stateChanged = true;
          break;
        }
      }
      if (!stateChanged) return;

      const nextView = document.body.dataset.view || "list";
      normalizeMapEntry(previousView);
      previousView = nextView;
      animateMobileSurface();
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["data-section", "data-view"] });

    const tray = $("#routeTray");
    if (tray) {
      new MutationObserver(() => animateMobileSurface()).observe(tray, {
        attributes: true,
        attributeFilter: ["data-mobile-open", "hidden"],
      });
    }

    window.addEventListener("resize", () => {
      if (!isMobile()) exitRoutePickMode();
    }, { passive: true });
  }

  function applyMediterraneanBrowserChrome() {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f7fbfa");
  }

  function boot() {
    if (!isMobile()) return;
    document.documentElement.classList.add("ykn-mobile-flow");
    applyMediterraneanBrowserChrome();
    bindUnifiedMobileNavigation();
    bindRouteFlow();
    animateMobileSurface(true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
