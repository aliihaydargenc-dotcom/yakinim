(() => {
  "use strict";

  const STYLE_ID = "yknSprint3Styles";
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let detailReturnFocus = null;
  let urlSyncTimer = 0;
  let restoringUrl = false;
  let radioFailureRefresh = null;
  let lastHandledRadioFailure = "";

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

    .radio-card.is-device-unplayable{border-color:#e9c8c3;background:#fffafa}
    .radio-card.is-device-unplayable .radio-live-tag{background:#fff0ee;color:#9a5148}

    @media(max-width:759px){
      .network-state-banner{top:max(8px,env(safe-area-inset-top,0px));font-size:11px}

      body[data-section="radio"] .radio-player{
        left:10px!important;
        right:10px!important;
        bottom:calc(var(--ykn-mobile-nav-h,68px) + var(--ykn-safe-bottom,env(safe-area-inset-bottom,0px)) + 10px)!important;
        width:auto!important;
        max-width:none!important;
        transform:none!important;
        margin:0!important;
        padding:10px!important;
        border-radius:18px!important;
        overflow:hidden!important;
      }
      body[data-section="radio"] .radio-player-main{
        display:grid!important;
        grid-template-columns:44px minmax(0,1fr) auto!important;
        gap:9px!important;
        align-items:center!important;
      }
      body[data-section="radio"] .radio-player-avatar,
      body[data-section="radio"] .radio-player-avatar-inner{
        width:44px!important;
        height:44px!important;
      }
      body[data-section="radio"] .radio-player-copy{min-width:0!important}
      body[data-section="radio"] .radio-player-copy strong,
      body[data-section="radio"] .radio-player-copy span{
        max-width:100%!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      body[data-section="radio"] .radio-player-actions{
        display:flex!important;
        align-items:center!important;
        gap:5px!important;
        flex:0 0 auto!important;
      }
      body[data-section="radio"] .radio-player-actions button{
        flex:0 0 auto!important;
      }
      body[data-section="radio"] .radio-player.is-expanded .radio-player-tools{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:6px!important;
        margin-top:8px!important;
        padding-top:8px!important;
        border-top:1px solid rgba(15,23,42,.08)!important;
      }
      body[data-section="radio"] .radio-player.is-expanded .radio-player-tools>button,
      body[data-section="radio"] .radio-player.is-expanded .radio-player-tools>a{
        min-width:0!important;
        min-height:44px!important;
        padding:0 5px!important;
        border-radius:11px!important;
        font-size:9px!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }
      body[data-section="radio"] .radio-player.is-expanded .radio-player-close{
        grid-column:1/-1!important;
        width:100%!important;
        min-height:44px!important;
      }
      body[data-section="radio"] .radio-player.is-expanded #radioPlayerHomepage[hidden]{display:none!important}
      body.radio-player-expanded[data-section="radio"] .radio-section{
        padding-bottom:calc(228px + var(--ykn-mobile-nav-h,68px) + env(safe-area-inset-bottom,0px))!important;
      }
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

  function normalizeRadioName(value = "") {
    return String(value)
      .toLocaleLowerCase("tr-TR")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9çğıöşü]+/gi, " ")
      .trim();
  }

  function rewriteRadioVerificationLabels() {
    const status = document.getElementById("radioStatus");
    if (status?.textContent) status.textContent = status.textContent.replace("canlı doğrulandı", "kaynak doğrulandı");
    document.querySelectorAll(".radio-live-tag").forEach(tag => {
      if (!tag.closest(".radio-card")?.classList.contains("is-device-unplayable")) tag.textContent = "Kaynak doğrulandı";
    });
  }

  function markCurrentRadioUnplayable(station) {
    if (!station?.id) return;
    const card = document.querySelector(`.radio-card[data-station-id="${CSS.escape(String(station.id))}"]`);
    if (!card) return;
    card.classList.add("is-device-unplayable");
    const tag = card.querySelector(".radio-live-tag");
    if (tag) tag.textContent = "Bu cihazda açılamadı";
  }

  async function refreshRadioAfterTerminalFailure() {
    if (radioFailureRefresh || typeof currentRadioStation === "undefined" || !currentRadioStation) return;
    if (typeof loadRadio !== "function") return;

    const failedStation = currentRadioStation;
    const failedId = String(failedStation.id || "");
    const failedUrl = String(failedStation.streamUrl || "");
    const failedName = normalizeRadioName(failedStation.name);
    markCurrentRadioUnplayable(failedStation);

    const meta = document.getElementById("radioPlayerMeta");
    if (meta) meta.textContent = "Yayın kaynağı yenileniyor…";

    radioFailureRefresh = (async () => {
      try {
        await loadRadio("turkiye", { force: true });
        rewriteRadioVerificationLabels();

        const stations = typeof lastRenderedRadioStations !== "undefined" && Array.isArray(lastRenderedRadioStations)
          ? lastRenderedRadioStations
          : [];
        const replacement = stations.find(station => {
          const sameIdentity = String(station?.id || "") === failedId || normalizeRadioName(station?.name) === failedName;
          return sameIdentity && station?.streamUrl && String(station.streamUrl) !== failedUrl;
        });

        if (replacement && typeof updateRadioPlayer === "function") {
          currentRadioStation = replacement;
          if (typeof currentRadioStreamIndex !== "undefined") currentRadioStreamIndex = 0;
          updateRadioPlayer(replacement);
          if (typeof updateRadioMediaSession === "function") updateRadioMediaSession(replacement);
          document.getElementById("radioPlayer")?.classList.remove("has-error");
          if (meta) meta.textContent = "Yedek yayın bulundu · ▶ ile tekrar dene";
        } else if (meta) {
          meta.textContent = "Bu yayın şu an bu cihazda açılamıyor";
        }
      } catch {
        if (meta) meta.textContent = "Yayın yenilenemedi · biraz sonra tekrar dene";
      } finally {
        radioFailureRefresh = null;
      }
    })();

    await radioFailureRefresh;
  }

  function inspectRadioFailureState() {
    const player = document.getElementById("radioPlayer");
    const meta = document.getElementById("radioPlayerMeta");
    if (!player || !meta || !player.classList.contains("has-error")) return;
    const text = String(meta.textContent || "");
    if (!/Çalışan yayın bulunamadı|yayın biçimi.*desteklenmiyor/i.test(text)) return;
    if (typeof currentRadioStation === "undefined" || !currentRadioStation) return;

    const key = `${currentRadioStation.id || currentRadioStation.name}|${currentRadioStation.streamUrl || ""}`;
    if (key === lastHandledRadioFailure) return;
    lastHandledRadioFailure = key;
    refreshRadioAfterTerminalFailure();
  }

  function bindRadioReliability() {
    const player = document.getElementById("radioPlayer");
    const list = document.getElementById("radioList");
    const audio = document.getElementById("radioAudio");

    rewriteRadioVerificationLabels();

    if (list) {
      new MutationObserver(rewriteRadioVerificationLabels).observe(list, { childList: true, subtree: true });
    }

    if (player) {
      new MutationObserver(() => {
        rewriteRadioVerificationLabels();
        inspectRadioFailureState();
      }).observe(player, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true, characterData: true });
    }

    audio?.addEventListener("playing", () => {
      lastHandledRadioFailure = "";
      if (typeof currentRadioStation !== "undefined" && currentRadioStation?.id) {
        document.querySelector(`.radio-card[data-station-id="${CSS.escape(String(currentRadioStation.id))}"]`)?.classList.remove("is-device-unplayable");
      }
      rewriteRadioVerificationLabels();
    });
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

    bindUrlState();
    restoreUrlState();
    bindRadioReliability();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
