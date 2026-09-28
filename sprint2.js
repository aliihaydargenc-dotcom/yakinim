(() => {
  "use strict";

  const STYLE_ID = "yknSprint2Styles";
  const ROUTE_LIST_CLASS = "route-stop-list";
  const MOVE_REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const css = `
    .route-tray-head{gap:8px;align-items:center;flex-wrap:wrap}
    .route-tray-head strong{margin-right:auto}
    .route-optimize{min-height:36px!important;padding:0 10px!important;border:1px solid rgba(15,23,42,.1)!important;border-radius:10px!important;background:#fff!important;color:#0f172a!important;font-weight:700!important}
    .route-stops.${ROUTE_LIST_CLASS}{display:grid;gap:7px;white-space:normal;overflow:visible;text-overflow:clip;margin:8px 0 12px}
    .route-stop-item{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:48px;padding:7px 8px;border:1px solid rgba(15,23,42,.09);border-radius:12px;background:#fff;color:#0f172a}
    .route-stop-item[draggable="true"]{cursor:grab}
    .route-stop-item.is-dragging{opacity:.52}
    .route-stop-item.is-drop-target{outline:2px solid rgba(37,99,235,.32);outline-offset:1px}
    .route-stop-index{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:#eef4f2;color:#176b52;font-size:12px;font-weight:800}
    .route-stop-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:700}
    .route-stop-tools{display:flex;gap:4px}
    .route-stop-tools button{display:grid;place-items:center;min-width:36px;min-height:36px!important;padding:0!important;border:1px solid rgba(15,23,42,.09)!important;border-radius:9px!important;background:#f8fafc!important;color:#334155!important;font-size:15px!important}
    .route-stop-tools button:disabled{opacity:.3;cursor:not-allowed}
    @media(max-width:759px){
      .route-optimize{min-height:44px!important}
      .route-stop-item{grid-template-columns:32px minmax(0,1fr);padding:9px}
      .route-stop-tools{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr)}
      .route-stop-tools button{min-height:42px!important}
      .route-stop-item[draggable="true"]{cursor:default}
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function routeAvailable() {
    try {
      return Array.isArray(routeStops) && typeof persistRoute === "function" && typeof renderRoute === "function";
    } catch {
      return false;
    }
  }

  function distanceKm(a, b) {
    const lat1 = Number(a?.lat);
    const lng1 = Number(a?.lng);
    const lat2 = Number(b?.lat);
    const lng2 = Number(b?.lng);
    if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
    const toRad = value => value * Math.PI / 180;
    const earth = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const p1 = toRad(lat1);
    const p2 = toRad(lat2);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function commitOrder(nextStops, message = "Rota sırası güncellendi") {
    if (!routeAvailable() || !Array.isArray(nextStops) || nextStops.length !== routeStops.length) return;
    routeStops.splice(0, routeStops.length, ...nextStops);
    persistRoute();
    baseRenderRoute?.();
    enhanceRouteUi();
    if (typeof showToast === "function") showToast(message);
  }

  function moveStop(index, delta) {
    if (!routeAvailable()) return;
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= routeStops.length) return;
    const next = routeStops.slice();
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    commitOrder(next);
  }

  function removeStop(index) {
    if (!routeAvailable() || index < 0 || index >= routeStops.length) return;
    routeStops.splice(index, 1);
    persistRoute();
    baseRenderRoute?.();
    enhanceRouteUi();
    if (typeof showToast === "function") showToast("Durak rotadan çıkarıldı");
  }

  function optimizeRoute() {
    if (!routeAvailable() || routeStops.length < 3) return;
    const remaining = routeStops.slice();
    let current = null;
    try {
      if (userLocation && Number.isFinite(Number(userLocation.lat)) && Number.isFinite(Number(userLocation.lng))) current = userLocation;
    } catch {}
    if (!current) current = remaining[0];

    const ordered = [];
    while (remaining.length) {
      let bestIndex = 0;
      let bestDistance = Infinity;
      remaining.forEach((stop, index) => {
        const candidate = distanceKm(current, stop);
        if (candidate < bestDistance) {
          bestDistance = candidate;
          bestIndex = index;
        }
      });
      const [next] = remaining.splice(bestIndex, 1);
      ordered.push(next);
      current = next;
    }
    commitOrder(ordered, "Rota en kısa sıraya göre düzenlendi");
  }

  let dragIndex = null;

  function stopRow(stop, index) {
    const row = document.createElement("span");
    row.className = "route-stop-item";
    row.dataset.routeIndex = String(index);
    row.draggable = window.innerWidth >= 760;
    row.setAttribute("aria-label", `${index + 1}. durak: ${stop.name}`);

    const order = document.createElement("span");
    order.className = "route-stop-index";
    order.textContent = String(index + 1);
    order.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "route-stop-name";
    name.textContent = stop.name;
    name.title = stop.name;

    const tools = document.createElement("span");
    tools.className = "route-stop-tools";

    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "↑";
    up.disabled = index === 0;
    up.setAttribute("aria-label", `${stop.name} durağını yukarı taşı`);
    up.addEventListener("click", () => moveStop(index, -1));

    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "↓";
    down.disabled = index === routeStops.length - 1;
    down.setAttribute("aria-label", `${stop.name} durağını aşağı taşı`);
    down.addEventListener("click", () => moveStop(index, 1));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `${stop.name} durağını rotadan çıkar`);
    remove.addEventListener("click", () => removeStop(index));

    tools.append(up, down, remove);
    row.append(order, name, tools);

    row.addEventListener("dragstart", event => {
      dragIndex = index;
      row.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      }
    });
    row.addEventListener("dragend", () => {
      dragIndex = null;
      document.querySelectorAll(".route-stop-item").forEach(item => item.classList.remove("is-dragging", "is-drop-target"));
    });
    row.addEventListener("dragover", event => {
      if (dragIndex === null || dragIndex === index) return;
      event.preventDefault();
      row.classList.add("is-drop-target");
    });
    row.addEventListener("dragleave", () => row.classList.remove("is-drop-target"));
    row.addEventListener("drop", event => {
      event.preventDefault();
      row.classList.remove("is-drop-target");
      if (dragIndex === null || dragIndex === index) return;
      const next = routeStops.slice();
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      dragIndex = null;
      commitOrder(next);
    });

    return row;
  }

  function ensureOptimizeButton(tray) {
    const head = tray.querySelector(".route-tray-head");
    if (!head || head.querySelector(".route-optimize")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "route-optimize";
    button.textContent = "En kısa sıraya diz";
    button.setAttribute("aria-label", "Rota duraklarını en kısa sıraya göre düzenle");
    button.addEventListener("click", optimizeRoute);
    const clear = head.querySelector("#clearRoute");
    head.insertBefore(button, clear || null);
  }

  function enhanceRouteUi() {
    if (!routeAvailable()) return;
    const tray = document.querySelector("#routeTray");
    const host = document.querySelector("#routeStops");
    if (!tray || !host) return;
    ensureOptimizeButton(tray);

    if (!routeStops.length) {
      host.classList.remove(ROUTE_LIST_CLASS);
      return;
    }

    host.classList.add(ROUTE_LIST_CLASS);
    host.replaceChildren(...routeStops.map(stopRow));
    const optimize = tray.querySelector(".route-optimize");
    if (optimize) optimize.hidden = routeStops.length < 3;
  }

  let baseRenderRoute = null;

  function wrapRouteRenderer() {
    if (!routeAvailable()) return false;
    baseRenderRoute = window.renderRoute;
    if (typeof baseRenderRoute !== "function") return false;
    window.renderRoute = function wrappedRenderRoute(...args) {
      const output = baseRenderRoute.apply(this, args);
      queueMicrotask(enhanceRouteUi);
      return output;
    };
    return true;
  }

  function boot() {
    injectStyles();
    if (!wrapRouteRenderer()) return;
    enhanceRouteUi();

    const host = document.querySelector("#routeStops");
    if (host) {
      const observer = new MutationObserver(() => {
        if (!host.classList.contains(ROUTE_LIST_CLASS) || (routeStops.length && host.children.length !== routeStops.length)) {
          queueMicrotask(enhanceRouteUi);
        }
      });
      observer.observe(host, { childList: true, subtree: false, characterData: true });
    }

    window.addEventListener("resize", () => {
      document.querySelectorAll(".route-stop-item").forEach(row => { row.draggable = window.innerWidth >= 760; });
    }, { passive: true });

    if (MOVE_REDUCED) document.documentElement.dataset.reducedMotion = "true";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
