(() => {
  "use strict";

  const MOBILE_BREAKPOINT = 767;
  const LOCATION_TIMEOUT_MS = 10000;
  const ROUTE_STORAGE_KEY = "yakinimda:route:v1";
  const LAST_LOCATION_KEY = "yakinimda:last-location:v1";
  const VALID_LOCATION_STATES = new Set(["idle", "requesting", "granted", "denied", "unavailable", "timeout", "manual"]);

  const styles = `
    :root {
      --ykn-mobile-nav-h: 68px;
      --ykn-safe-bottom: env(safe-area-inset-bottom, 0px);
    }

    .ykn-location-state {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 10px;
      margin: 10px 0 12px;
      padding: 10px 12px;
      border: 1px solid rgba(15, 23, 42, .1);
      border-radius: 14px;
      background: rgba(255, 255, 255, .88);
      box-shadow: 0 8px 24px rgba(15, 23, 42, .06);
    }

    .ykn-location-state[hidden] { display: none !important; }
    .ykn-location-state-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: currentColor;
      opacity: .85;
    }
    .ykn-location-state-copy { min-width: 0; }
    .ykn-location-state-copy strong,
    .ykn-location-state-copy small { display: block; }
    .ykn-location-state-copy strong { font-size: .9rem; line-height: 1.2; }
    .ykn-location-state-copy small { margin-top: 2px; font-size: .78rem; line-height: 1.35; color: #64748b; }
    .ykn-location-state-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .ykn-location-state-actions button {
      min-height: 40px;
      border-radius: 10px;
      border: 1px solid rgba(15, 23, 42, .12);
      background: #fff;
      color: #0f172a;
      padding: 0 11px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .ykn-location-state[data-state="requesting"] { color: #2563eb; }
    .ykn-location-state[data-state="granted"] { color: #15803d; }
    .ykn-location-state[data-state="denied"],
    .ykn-location-state[data-state="unavailable"],
    .ykn-location-state[data-state="timeout"] { color: #b45309; }
    .ykn-location-state[data-state="manual"] { color: #7c3aed; }

    .result-card.is-active {
      outline: 2px solid rgba(37, 99, 235, .34);
      outline-offset: -2px;
      box-shadow: 0 12px 28px rgba(37, 99, 235, .12);
    }

    .ykn-standard-state {
      display: none;
      margin: 12px 0;
      padding: 14px;
      border: 1px dashed rgba(15, 23, 42, .16);
      border-radius: 14px;
      background: rgba(248, 250, 252, .92);
      color: #475569;
      font-size: .88rem;
      line-height: 1.45;
    }
    .sheet[data-nearby-state="empty"] .ykn-standard-state,
    .sheet[data-nearby-state="error"] .ykn-standard-state,
    .sheet[data-nearby-state="stale"] .ykn-standard-state { display: block; }
    .ykn-standard-state strong { display: block; color: #0f172a; margin-bottom: 3px; }

    .mobile-primary-nav,
    .mobile-nav-backdrop { display: none; }

    @media (max-width: ${MOBILE_BREAKPOINT}px) {
      html, body, .app-shell { min-height: 100dvh; }
      body { padding-bottom: calc(var(--ykn-mobile-nav-h) + var(--ykn-safe-bottom)); }

      #sectionNav { display: none !important; }

      .mobile-primary-nav {
        position: fixed;
        z-index: 1200;
        left: 0;
        right: 0;
        bottom: 0;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        min-height: calc(var(--ykn-mobile-nav-h) + var(--ykn-safe-bottom));
        padding: 6px 6px calc(6px + var(--ykn-safe-bottom));
        border-top: 1px solid rgba(15, 23, 42, .08);
        background: rgba(255, 255, 255, .94);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        box-shadow: 0 -12px 34px rgba(15, 23, 42, .1);
      }

      .mobile-primary-nav button {
        position: relative;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 3px;
        min-width: 0;
        min-height: 52px;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: #64748b;
        font: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .mobile-primary-nav button[aria-current="page"] {
        background: rgba(37, 99, 235, .09);
        color: #0f172a;
        font-weight: 800;
      }

      .mobile-primary-nav button[aria-current="page"]::before {
        content: "";
        position: absolute;
        top: 4px;
        width: 22px;
        height: 3px;
        border-radius: 999px;
        background: #2563eb;
      }

      .mobile-primary-nav svg {
        width: 21px;
        height: 21px;
        stroke-width: 1.9;
      }

      .mobile-primary-nav .mobile-nav-label {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        line-height: 1.1;
      }

      .mobile-route-badge {
        position: absolute;
        top: 3px;
        left: calc(50% + 8px);
        display: grid;
        place-items: center;
        min-width: 17px;
        height: 17px;
        padding: 0 4px;
        border: 2px solid #fff;
        border-radius: 999px;
        background: #0f172a;
        color: #fff;
        font-size: 10px;
        line-height: 1;
        font-weight: 800;
      }
      .mobile-route-badge[hidden] { display: none !important; }

      .mobile-nav-backdrop {
        position: fixed;
        z-index: 1140;
        inset: 0 0 calc(var(--ykn-mobile-nav-h) + var(--ykn-safe-bottom)) 0;
        display: block;
        background: rgba(15, 23, 42, .26);
        opacity: 0;
        pointer-events: none;
        transition: opacity 180ms ease;
      }
      .mobile-nav-backdrop[data-open="true"] { opacity: 1; pointer-events: auto; }

      #routeTray[data-mobile-open="true"] {
        position: fixed;
        z-index: 1180;
        left: 10px;
        right: 10px;
        bottom: calc(var(--ykn-mobile-nav-h) + var(--ykn-safe-bottom) + 10px);
        display: block !important;
        max-height: min(58dvh, 520px);
        overflow: auto;
        border-radius: 20px;
        box-shadow: 0 22px 60px rgba(15, 23, 42, .24);
      }

      .ykn-route-close {
        display: inline-grid;
        place-items: center;
        min-width: 44px;
        min-height: 44px;
        margin-left: auto;
        border: 0;
        border-radius: 12px;
        background: rgba(15, 23, 42, .06);
        color: #0f172a;
        font: inherit;
        cursor: pointer;
      }
      .ykn-route-empty { margin: 10px 0 0; color: #64748b; font-size: .86rem; }

      .radio-player {
        bottom: calc(var(--ykn-mobile-nav-h) + var(--ykn-safe-bottom) + 8px) !important;
      }

      .sheet,
      .module-panel { padding-bottom: calc(22px + var(--ykn-mobile-nav-h) + var(--ykn-safe-bottom)); }

      .map-search-bar { top: max(8px, env(safe-area-inset-top, 0px)) !important; }

      #locateButton,
      #manualLocationButton,
      #startLocation,
      #pickLocation,
      #sheetToggle,
      .view-switch button,
      .favorite-button,
      .route-button,
      .directions-link,
      .phone-link,
      .detail-actions > *,
      #detailMap,
      .map-quick-tools button,
      .map-quick-actions > *,
      .radio-player button,
      .radio-player a,
      .now-block-head button,
      .now-pulse-head button {
        min-height: 44px;
      }

      #quickClose,
      #quickShare,
      #closeDetail,
      .radio-player-favorite,
      .radio-player-toggle,
      .radio-player-expand,
      #radioPrev,
      #radioNext {
        min-width: 44px;
        min-height: 44px;
      }

      .ykn-location-state {
        grid-template-columns: auto 1fr;
        align-items: start;
      }
      .ykn-location-state-actions {
        grid-column: 1 / -1;
        justify-content: stretch;
      }
      .ykn-location-state-actions button {
        flex: 1 1 120px;
        min-height: 44px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .mobile-nav-backdrop { transition: none; }
      .mobile-primary-nav *, .result-card { scroll-behavior: auto !important; transition: none !important; }
    }
  `;

  function injectStyles() {
    if (document.querySelector("#yknSprint1Styles")) return;
    const style = document.createElement("style");
    style.id = "yknSprint1Styles";
    style.textContent = styles;
    document.head.appendChild(style);
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function normalizeText(value = "") {
    return value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
  }

  function readRouteCount() {
    try {
      const route = JSON.parse(localStorage.getItem(ROUTE_STORAGE_KEY) || "[]");
      return Array.isArray(route) ? route.length : 0;
    } catch {
      return 0;
    }
  }

  function hasCachedLocation() {
    try {
      const value = JSON.parse(localStorage.getItem(LAST_LOCATION_KEY) || "null");
      return Boolean(value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng)));
    } catch {
      return false;
    }
  }

  function createMobileNav() {
    if ($("#mobilePrimaryNav")) return $("#mobilePrimaryNav");
    const nav = document.createElement("nav");
    nav.id = "mobilePrimaryNav";
    nav.className = "mobile-primary-nav";
    nav.setAttribute("aria-label", "Ana navigasyon");
    nav.innerHTML = `
      <button type="button" data-mobile-destination="nearby" aria-label="Yakınım" aria-current="page">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
        <span class="mobile-nav-label">Yakınım</span>
      </button>
      <button type="button" data-mobile-destination="map" aria-label="Harita">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>
        <span class="mobile-nav-label">Harita</span>
      </button>
      <button type="button" data-mobile-destination="route" aria-label="Rota">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4"/></svg>
        <span class="mobile-route-badge" hidden>0</span>
        <span class="mobile-nav-label">Rota</span>
      </button>
      <button type="button" data-mobile-destination="news" aria-label="Haber">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        <span class="mobile-nav-label">Haber</span>
      </button>
      <button type="button" data-mobile-destination="radio" aria-label="Radyo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7" width="17" height="13" rx="4"/><path d="m8 7 8-4M7.5 12h5"/><circle cx="16.5" cy="14.5" r="2.5"/></svg>
        <span class="mobile-nav-label">Radyo</span>
      </button>`;

    const backdrop = document.createElement("button");
    backdrop.id = "mobileNavBackdrop";
    backdrop.className = "mobile-nav-backdrop";
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Açık paneli kapat");
    backdrop.dataset.open = "false";

    document.body.append(backdrop, nav);
    return nav;
  }

  function createLocationStatePanel() {
    const sheet = $(".sheet");
    if (!sheet) return null;
    if ($("#locationStatePanel")) return $("#locationStatePanel");

    const panel = document.createElement("section");
    panel.id = "locationStatePanel";
    panel.className = "ykn-location-state";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    panel.hidden = true;
    panel.innerHTML = `
      <span class="ykn-location-state-dot" aria-hidden="true"></span>
      <span class="ykn-location-state-copy"><strong></strong><small></small></span>
      <span class="ykn-location-state-actions"></span>`;

    const welcome = $("#welcome");
    if (welcome) welcome.insertAdjacentElement("afterend", panel);
    else sheet.prepend(panel);
    return panel;
  }

  function createStandardState() {
    const results = $("#results");
    if (!results || $("#nearbyStandardState")) return $("#nearbyStandardState");
    const state = document.createElement("div");
    state.id = "nearbyStandardState";
    state.className = "ykn-standard-state";
    state.setAttribute("role", "status");
    results.insertAdjacentElement("beforebegin", state);
    return state;
  }

  function updateWelcomeCopy() {
    const welcome = $("#welcome");
    if (!welcome) return;
    const heading = $("h3", welcome);
    const copy = $("p", welcome);
    if (heading) heading.textContent = "Önce çevreni aç";
    if (copy) copy.textContent = "Yakındaki yerleri göstermek için konumunu kullanabiliriz. Konum paylaşmak istemezsen haritadan bölge seçebilirsin.";
  }

  let locationState = "idle";
  let locationTimeout = 0;
  let grantedHideTimer = 0;

  function setLocationState(nextState, detail = "") {
    if (!VALID_LOCATION_STATES.has(nextState)) return;
    locationState = nextState;
    document.body.dataset.locationState = nextState;

    clearTimeout(locationTimeout);
    clearTimeout(grantedHideTimer);

    const panel = createLocationStatePanel();
    if (!panel) return;
    const title = $("strong", panel);
    const message = $("small", panel);
    const actions = $(".ykn-location-state-actions", panel);
    panel.dataset.state = nextState;
    actions.innerHTML = "";

    const content = {
      idle: ["Konum seç", "Konumunu kullanabilir veya haritadan bir bölge seçebilirsin."],
      requesting: ["Konum belirleniyor…", "Yakındaki yerleri hazırlıyoruz. Bu işlem uzarsa haritadan seçim yapabilirsin."],
      granted: ["Konum hazır", "Yakındaki sonuçlar bulunduğun bölgeye göre güncellendi."],
      denied: ["Konum izni kapalı", "Tarayıcı site izinlerinden Konum'u açabilir veya haritadan bölge seçebilirsin."],
      unavailable: ["Konum alınamadı", "Cihaz konumu şu anda kullanılamıyor. Haritadan bölge seçerek devam edebilirsin."],
      timeout: ["Konum uzun sürdü", "Konum isteği tamamlanmadı. Yeniden deneyebilir veya haritadan seçebilirsin."],
      manual: ["Haritadan konum seç", "Haritayı taşı ve kullanmak istediğin bölgeyi seçerek keşfe devam et."],
    }[nextState];

    title.textContent = content[0];
    message.textContent = detail || content[1];
    panel.hidden = false;

    const addAction = (label, handler) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", handler);
      actions.appendChild(button);
    };

    if (["denied", "unavailable", "timeout"].includes(nextState)) {
      addAction("Haritadan seç", () => $("#pickLocation")?.click() || $("#manualLocationButton")?.click());
      addAction("Tekrar dene", () => $("#startLocation")?.click() || $("#locateButton")?.click());
    } else if (nextState === "requesting") {
      addAction("Haritadan seç", () => $("#pickLocation")?.click() || $("#manualLocationButton")?.click());
      locationTimeout = window.setTimeout(() => {
        if (locationState === "requesting") setLocationState("timeout");
      }, LOCATION_TIMEOUT_MS);
    } else if (nextState === "manual") {
      addAction("Konumumu kullan", () => $("#startLocation")?.click() || $("#locateButton")?.click());
    } else if (nextState === "granted") {
      grantedHideTimer = window.setTimeout(() => {
        if (locationState === "granted") panel.hidden = true;
      }, 2200);
    }
  }

  async function syncPermissionState() {
    if (!navigator.permissions?.query) {
      if (hasCachedLocation()) setLocationState("granted");
      else setLocationState("idle");
      return;
    }
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") setLocationState("denied");
      else if (permission.state === "granted" && hasCachedLocation()) setLocationState("granted");
      else setLocationState("idle");
      permission.addEventListener?.("change", () => {
        if (permission.state === "denied") setLocationState("denied");
        else if (permission.state === "granted" && locationState !== "requesting") setLocationState("granted");
        else if (permission.state === "prompt") setLocationState("idle");
      });
    } catch {
      setLocationState(hasCachedLocation() ? "granted" : "idle");
    }
  }

  function inferLocationStateFromUi() {
    const loading = $("#nearbyLoading");
    const results = $("#results");
    const status = normalizeText($("#statusText")?.textContent || "");
    const welcome = $("#welcome");

    if (loading && !loading.hidden) {
      if (locationState !== "manual") setLocationState("requesting");
      return;
    }

    if (/izin.*(redd|kapalı|verilmedi)|permission.*denied/.test(status)) {
      setLocationState("denied");
      return;
    }
    if (/zaman|timeout/.test(status) && /konum|location/.test(status)) {
      setLocationState("timeout");
      return;
    }
    if (/konum.*(alınamad|bulunamad|kullanılam)|location.*unavailable/.test(status)) {
      setLocationState("unavailable");
      return;
    }
    if ((results?.children.length || 0) > 0 && welcome?.hidden) {
      setLocationState("granted");
    }
  }

  function updateNearbyState() {
    const sheet = $(".sheet");
    const loading = $("#nearbyLoading");
    const results = $("#results");
    const welcome = $("#welcome");
    const summary = normalizeText($("#resultSummary")?.textContent || "");
    const status = normalizeText($("#statusText")?.textContent || "");
    const standard = createStandardState();
    if (!sheet || !standard) return;

    let state = "idle";
    if (loading && !loading.hidden) state = "loading";
    else if ((results?.children.length || 0) > 0) state = "success";
    else if (/hata|alınamad|başarısız|ulaşılam/.test(status)) state = "error";
    else if (!welcome || welcome.hidden) state = "empty";

    sheet.dataset.nearbyState = state;
    if (state === "empty") {
      standard.innerHTML = "<strong>Bu bölgede sonuç bulamadık.</strong>Haritayı biraz uzaklaştırabilir veya farklı bir kategori deneyebilirsin.";
    } else if (state === "error") {
      standard.innerHTML = "<strong>Yakındaki yerler alınamadı.</strong>Bağlantını kontrol edip tekrar deneyebilir veya haritadan farklı bir bölge seçebilirsin.";
    } else {
      standard.textContent = "";
    }

    if (summary.includes("henüz sonuç yok") && state === "idle") sheet.dataset.nearbyState = "idle";
  }

  function setActiveCardByName(name, shouldScroll = false) {
    const normalized = normalizeText(name);
    let active = null;
    $$("#results .result-card").forEach(card => {
      const cardName = normalizeText($(".result-name", card)?.textContent || "");
      const selected = Boolean(normalized && cardName === normalized);
      card.classList.toggle("is-active", selected);
      const main = $(".result-main", card);
      if (selected) {
        active = card;
        main?.setAttribute("aria-current", "true");
      } else {
        main?.removeAttribute("aria-current");
      }
    });
    if (active && shouldScroll && window.innerWidth > MOBILE_BREAKPOINT) {
      active.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  function syncSelectionFromUi() {
    const quickCard = $("#mapQuickCard");
    const detail = $("#placeDetail");
    const name = (!quickCard?.hidden && $("#quickName")?.textContent)
      || (!detail?.hidden && $("#detailName")?.textContent)
      || "";
    setActiveCardByName(name, Boolean(name));
  }

  function updateRouteBadge() {
    const badge = $(".mobile-route-badge");
    if (!badge) return;
    const count = readRouteCount();
    badge.textContent = String(count);
    badge.hidden = count < 1;
    const button = $("[data-mobile-destination='route']");
    if (button) button.setAttribute("aria-label", count ? `Rota, ${count} durak` : "Rota");

    const tray = $("#routeTray");
    const empty = $(".ykn-route-empty", tray || document);
    if (empty) empty.hidden = count > 0;
  }

  function prepareRouteTray() {
    const tray = $("#routeTray");
    if (!tray) return;
    if (!$(".ykn-route-close", tray)) {
      const head = $(".route-tray-head", tray);
      const close = document.createElement("button");
      close.type = "button";
      close.className = "ykn-route-close";
      close.setAttribute("aria-label", "Rota panelini kapat");
      close.textContent = "×";
      close.addEventListener("click", closeRouteTray);
      head?.appendChild(close);
    }
    if (!$(".ykn-route-empty", tray)) {
      const empty = document.createElement("p");
      empty.className = "ykn-route-empty";
      empty.textContent = "Henüz rotaya yer eklemedin. Bir yer kartındaki ‘Rotaya ekle’ düğmesini kullanabilirsin.";
      $("#routeStops", tray)?.insertAdjacentElement("afterend", empty);
    }
    updateRouteBadge();
  }

  function openRouteTray() {
    const tray = $("#routeTray");
    const backdrop = $("#mobileNavBackdrop");
    if (!tray) return;
    prepareRouteTray();
    tray.hidden = false;
    tray.dataset.mobileOpen = "true";
    document.body.classList.add("route-tray-open");
    if (backdrop) backdrop.dataset.open = "true";
    syncMobileNav();
    $(".ykn-route-close", tray)?.focus({ preventScroll: true });
  }

  function closeRouteTray() {
    const tray = $("#routeTray");
    const backdrop = $("#mobileNavBackdrop");
    if (tray) {
      tray.dataset.mobileOpen = "false";
      if (!readRouteCount()) tray.hidden = true;
    }
    document.body.classList.remove("route-tray-open");
    if (backdrop) backdrop.dataset.open = "false";
    syncMobileNav();
  }

  function clickSection(section) {
    const button = $(`#sectionNav [data-section="${section}"]`);
    if (button) button.click();
  }

  function setNearbyView(view) {
    closeRouteTray();
    clickSection("nearby");
    window.setTimeout(() => {
      const viewButton = $(`.view-switch [data-view="${view}"]`);
      viewButton?.click();
      syncMobileNav();
    }, 0);
  }

  function syncMobileNav() {
    const nav = $("#mobilePrimaryNav");
    if (!nav) return;
    const section = document.body.dataset.section || "nearby";
    const view = document.body.dataset.view || "list";
    const routeOpen = $("#routeTray")?.dataset.mobileOpen === "true";

    let active = "nearby";
    if (routeOpen) active = "route";
    else if (section === "news") active = "news";
    else if (section === "radio") active = "radio";
    else if (section === "nearby" && view === "map") active = "map";

    $$('[data-mobile-destination]', nav).forEach(button => {
      const isActive = button.dataset.mobileDestination === active;
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function bindMobileNav() {
    const nav = createMobileNav();
    nav.addEventListener("click", event => {
      const button = event.target.closest("[data-mobile-destination]");
      if (!button) return;
      const destination = button.dataset.mobileDestination;
      if (destination === "nearby") setNearbyView("list");
      else if (destination === "map") setNearbyView("map");
      else if (destination === "route") openRouteTray();
      else if (destination === "news") { closeRouteTray(); clickSection("news"); }
      else if (destination === "radio") { closeRouteTray(); clickSection("radio"); }
      syncMobileNav();
    });
    $("#mobileNavBackdrop")?.addEventListener("click", closeRouteTray);
  }

  function bindLocationControls() {
    ["#locateButton", "#startLocation"].forEach(selector => {
      $(selector)?.addEventListener("click", () => setLocationState("requesting"), true);
    });
    ["#manualLocationButton", "#pickLocation"].forEach(selector => {
      $(selector)?.addEventListener("click", () => setLocationState("manual"), true);
    });
  }

  function bindResultSelection() {
    $("#results")?.addEventListener("click", event => {
      const card = event.target.closest(".result-card");
      if (!card) return;
      const name = $(".result-name", card)?.textContent || "";
      setActiveCardByName(name, false);
    });
  }

  function observeUi() {
    const bodyObserver = new MutationObserver(() => syncMobileNav());
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["data-section", "data-view"] });

    const statusTargets = [$("#statusText"), $("#nearbyLoading"), $("#resultSummary"), $("#results"), $("#welcome")].filter(Boolean);
    const stateObserver = new MutationObserver(() => {
      inferLocationStateFromUi();
      updateNearbyState();
      updateRouteBadge();
    });
    statusTargets.forEach(target => stateObserver.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] }));

    const selectionTargets = [$("#quickName"), $("#detailName"), $("#mapQuickCard"), $("#placeDetail"), $("#results")].filter(Boolean);
    const selectionObserver = new MutationObserver(syncSelectionFromUi);
    selectionTargets.forEach(target => selectionObserver.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] }));

    const route = $("#routeStops");
    if (route) new MutationObserver(updateRouteBadge).observe(route, { childList: true, subtree: true, characterData: true });
  }

  function setUtilityFirstDefault() {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      setNearbyView("list");
      return;
    }
    if ((document.body.dataset.section || "now") === "now") clickSection("nearby");
  }

  function boot() {
    injectStyles();
    updateWelcomeCopy();
    createLocationStatePanel();
    createStandardState();
    bindMobileNav();
    prepareRouteTray();
    bindLocationControls();
    bindResultSelection();
    observeUi();
    syncPermissionState();
    updateNearbyState();
    updateRouteBadge();
    syncSelectionFromUi();
    syncMobileNav();
    window.setTimeout(setUtilityFirstDefault, 0);

    window.addEventListener("storage", event => {
      if (event.key === ROUTE_STORAGE_KEY) updateRouteBadge();
      if (event.key === LAST_LOCATION_KEY && event.newValue) setLocationState("granted");
    });
    window.addEventListener("resize", syncMobileNav, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
