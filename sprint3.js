(() => {
  "use strict";

  const STYLE_ID = "yknSprint3Styles";
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let detailReturnFocus = null;
  let urlSyncTimer = 0;
  let restoringUrl = false;

  const css = `
    .network-state-banner{
      position:fixed;
      z-index:1400;
      left:50%;
      top:max(10px,env(safe-area-inset-top,0px));
      transform:translateX(-50%);
      display:flex;
      align-items:center;
      gap:8px;
      width:min(560px,calc(100vw - 24px));
      min-height:44px;
      padding:10px 14px;
      border:1px solid rgba(146,64,14,.18);
      border-radius:14px;
      background:rgba(255,251,235,.96);
      color:#78350f;
      box-shadow:0 12px 34px rgba(15,23,42,.12);
      backdrop-filter:blur(14px);
      -webkit-backdrop-filter:blur(14px);
      font-size:12px;
      line-height:1.35;
    }
    .network-state-banner[hidden]{display:none!important}
    .network-state-banner strong{font-size:12px}
    .network-state-banner span[aria-hidden="true"]{width:9px;height:9px;border-radius:999px;background:#d97706;flex:0 0 auto}
    body.is-offline .status-text::before{content:"Çevrimdışı · ";font-weight:800;color:#92400e}
    .place-detail[role="dialog"]{outline:none}
    @media(max-width:759px){
      .network-state-banner{top:max(8px,env(safe-area-inset-top,0px));font-size:11px}
      body[data-section="radio"] .radio-player-expand{display:none!important}
      body[data-section="radio"] .radio-player-tools,
      body[data-section="radio"] .radio-player.is-expanded .radio-player-tools{display:none!important}
      body[data-section="radio"] .radio-player-actions{gap:8px!important}
      body.radio-player-expanded[data-section="radio"] .radio-section{padding-bottom:calc(190px + var(--mobile-nav-h,68px) + env(safe-area-inset-bottom,0px))!important}
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureNetworkBanner() {
    let banner = document.getElementById("networkStateBanner");
    if (banner) return banner;
    banner = document.createElement("div");
    banner.id = "networkStateBanner";
    banner.className = "network-state-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.hidden = true;
    banner.innerHTML = '<span aria-hidden="true"></span><div><strong>Çevrimdışısın.</strong> Son kaydettiğin yerleri ve rotanı kullanmaya devam edebilirsin.</div>';
    document.body.appendChild(banner);
    return banner;
  }

  function syncNetworkState() {
    const offline = navigator.onLine === false;
    document.body.classList.toggle("is-offline", offline);
    const banner = ensureNetworkBanner();
    banner.hidden = !offline;
  }

  function detailIsOpen() {
    const detail = document.getElementById("placeDetail");
    return Boolean(detail && !detail.hidden);
  }

  function configureDetailSemantics() {
    const detail = document.getElementById("placeDetail");
    if (!detail) return;

    if (detail.hidden) {
      detail.removeAttribute("aria-modal");
      detail.removeAttribute("tabindex");
      if (detailReturnFocus && document.contains(detailReturnFocus)) {
        try { detailReturnFocus.focus({ preventScroll: true }); } catch {}
      }
      detailReturnFocus = null;
      return;
    }

    const listMode = document.body.dataset.view !== "map";
    if (listMode) {
      if (!detailReturnFocus || detail.contains(document.activeElement)) detailReturnFocus = document.activeElement;
      detail.setAttribute("role", "dialog");
      detail.setAttribute("aria-modal", "true");
      detail.setAttribute("tabindex", "-1");
      requestAnimationFrame(() => {
        const target = detail.querySelector("#closeDetail") || detail;
        try { target.focus({ preventScroll: true }); } catch {}
      });
    } else {
      detail.setAttribute("role", "region");
      detail.removeAttribute("aria-modal");
      detail.removeAttribute("tabindex");
    }
  }

  function trapDetailFocus(event) {
    if (!detailIsOpen() || document.body.dataset.view === "map") return;
    const detail = document.getElementById("placeDetail");
    if (!detail) return;

    if (event.key === "Escape") {
      event.preventDefault();
      document.getElementById("closeDetail")?.click();
      return;
    }
    if (event.key !== "Tab") return;

    const focusables = Array.from(detail.querySelectorAll(FOCUSABLE)).filter(node => node.getClientRects().length > 0);
    if (!focusables.length) {
      event.preventDefault();
      detail.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function syncBusyState() {
    const sheet = document.querySelector(".sheet");
    const loading = document.getElementById("nearbyLoading");
    if (!sheet || !loading) return;
    sheet.setAttribute("aria-busy", String(!loading.hidden));
  }

  function currentUrlState() {
    const section = document.body.dataset.section || "nearby";
    const view = document.body.dataset.view || "list";
    const q = String(document.getElementById("placeSearch")?.value || "").trim();
    return { section, view, q };
  }

  function writeUrlState() {
    if (restoringUrl) return;
    const { section, view, q } = currentUrlState();
    const url = new URL(location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    if (section && section !== "nearby") url.searchParams.set("section", section);
    else url.searchParams.delete("section");
    if (section === "nearby" && view === "map") url.searchParams.set("view", "map");
    else url.searchParams.delete("view");
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function scheduleUrlSync(delay = 180) {
    clearTimeout(urlSyncTimer);
    urlSyncTimer = window.setTimeout(writeUrlState, delay);
  }

  function restoreUrlState() {
    const params = new URLSearchParams(location.search);
    const requestedSection = params.get("section");
    const requestedView = params.get("view");
    const query = params.get("q");
    if (!requestedSection && !requestedView && !query) return;

    restoringUrl = true;
    try {
      const section = ["nearby", "news", "radio"].includes(requestedSection) ? requestedSection : "nearby";
      document.querySelector(`#sectionNav [data-section="${section}"]`)?.click();
      if (section === "nearby" && requestedView === "map") {
        document.querySelector('.view-switch [data-view="map"]')?.click();
      }
      if (query) {
        const input = document.getElementById("placeSearch");
        if (input) {
          input.value = query;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } finally {
      restoringUrl = false;
      scheduleUrlSync(0);
    }
  }

  function bindUrlState() {
    document.getElementById("placeSearch")?.addEventListener("input", () => scheduleUrlSync(280));
    document.getElementById("mapSearch")?.addEventListener("input", () => scheduleUrlSync(280));
    document.getElementById("sectionNav")?.addEventListener("click", () => scheduleUrlSync(0));
    document.querySelector(".view-switch")?.addEventListener("click", () => scheduleUrlSync(0));
    document.getElementById("mobilePrimaryNav")?.addEventListener("click", () => scheduleUrlSync(0));

    const bodyObserver = new MutationObserver(() => {
      configureDetailSemantics();
      scheduleUrlSync(0);
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["data-section", "data-view"] });
  }

  function collapseMobileRadioPlayer() {
    if (!window.matchMedia("(max-width: 759px)").matches) return;
    document.getElementById("radioPlayer")?.classList.remove("is-expanded");
    document.body.classList.remove("radio-player-expanded");
    const expand = document.getElementById("radioPlayerExpand");
    if (expand) {
      expand.setAttribute("aria-hidden", "true");
      expand.tabIndex = -1;
    }
  }

  function boot() {
    injectStyles();
    ensureNetworkBanner();
    syncNetworkState();
    window.addEventListener("online", syncNetworkState);
    window.addEventListener("offline", syncNetworkState);

    const detail = document.getElementById("placeDetail");
    if (detail) {
      const observer = new MutationObserver(configureDetailSemantics);
      observer.observe(detail, { attributes: true, attributeFilter: ["hidden"] });
      configureDetailSemantics();
    }
    document.addEventListener("keydown", trapDetailFocus, true);

    const loading = document.getElementById("nearbyLoading");
    if (loading) {
      new MutationObserver(syncBusyState).observe(loading, { attributes: true, attributeFilter: ["hidden"] });
      syncBusyState();
    }

    collapseMobileRadioPlayer();
    bindUrlState();
    restoreUrlState();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
