import { useEffect, useRef, useState } from "react";
import { Navigation, Phone, X } from "lucide-react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import type { Coordinates, Place } from "../types";

type MarkerEntry = {
  marker: Marker;
  element: HTMLButtonElement;
  place: Place;
};

export function MapView({ location, places, picking, onPick }: { location: Coordinates | null; places: Place[]; picking: boolean; onPick: (coords: Coordinates) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const locationMarkerRef = useRef<Marker | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [35, 39],
      zoom: 5.2,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (event: maplibregl.MapMouseEvent) => {
      if (picking) {
        setSelectedPlace(null);
        onPick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      }
    };
    map.on("click", handler);
    map.getCanvas().style.cursor = picking ? "crosshair" : "grab";
    return () => { map.off("click", handler); };
  }, [picking, onPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    if (!locationMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "user-marker";
      locationMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([location.lng, location.lat]).addTo(map);
    } else {
      locationMarkerRef.current.setLngLat([location.lng, location.lat]);
    }
    map.easeTo({ center: [location.lng, location.lat], zoom: Math.max(map.getZoom(), 14), duration: 550 });
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = places.slice(0, 160).map((place) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `place-marker marker-${place.category}`;
      renderPlaceMarker(el, place);
      el.setAttribute("aria-label", `${place.name} harita işareti`);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        if (picking) return;

        const clusterCount = Number(el.dataset.clusterCount || "1");
        const clusterLat = Number(el.dataset.clusterLat);
        const clusterLng = Number(el.dataset.clusterLng);
        if (clusterCount > 1 && Number.isFinite(clusterLat) && Number.isFinite(clusterLng)) {
          setSelectedPlace(null);
          map.easeTo({
            center: [clusterLng, clusterLat],
            zoom: Math.min(18, map.getZoom() + 2),
            duration: 380,
          });
          return;
        }

        setSelectedPlace(place);
        map.easeTo({ center: [place.lng, place.lat], duration: 300 });
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([place.lng, place.lat]).addTo(map);
      return { marker, element: el, place };
    });
    setSelectedPlace((current) => current && !places.some((place) => place.id === current.id) ? null : current);
  }, [places, picking]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showNormalMarker = (entry: MarkerEntry) => {
      entry.element.style.display = "";
      entry.element.setAttribute("aria-hidden", "false");
      entry.element.classList.remove("is-cluster");
      renderPlaceMarker(entry.element, entry.place, entry.place.id === selectedPlace?.id);
      entry.element.setAttribute("aria-label", `${entry.place.name} harita işareti`);
      delete entry.element.dataset.clusterCount;
      delete entry.element.dataset.clusterLat;
      delete entry.element.dataset.clusterLng;
    };

    const updateVisibility = () => {
      const zoom = map.getZoom();
      const cellSize = zoom >= 17 ? 28 : zoom >= 15 ? 38 : zoom >= 13 ? 48 : 58;
      const groups = new Map<string, MarkerEntry[]>();
      const ordered = [...markersRef.current].sort((a, b) => {
        if (a.place.id === selectedPlace?.id) return -1;
        if (b.place.id === selectedPlace?.id) return 1;
        return (a.place.distanceM ?? Infinity) - (b.place.distanceM ?? Infinity);
      });

      for (const entry of ordered) {
        entry.element.style.display = "none";
        entry.element.setAttribute("aria-hidden", "true");
        entry.element.classList.remove("is-cluster");
        delete entry.element.dataset.clusterCount;
        delete entry.element.dataset.clusterLat;
        delete entry.element.dataset.clusterLng;

        const point = map.project([entry.place.lng, entry.place.lat]);
        const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
        const group = groups.get(key) || [];
        group.push(entry);
        groups.set(key, group);
      }

      for (const group of groups.values()) {
        const selected = group.find((entry) => entry.place.id === selectedPlace?.id);
        if (selected) {
          showNormalMarker(selected);
          continue;
        }

        if (group.length === 1) {
          showNormalMarker(group[0]);
          continue;
        }

        const representative = group[0];
        const clusterLat = group.reduce((sum, entry) => sum + entry.place.lat, 0) / group.length;
        const clusterLng = group.reduce((sum, entry) => sum + entry.place.lng, 0) / group.length;
        representative.element.style.display = "";
        representative.element.setAttribute("aria-hidden", "false");
        representative.element.classList.add("is-cluster");
        representative.element.textContent = group.length > 99 ? "99+" : String(group.length);
        representative.element.dataset.clusterCount = String(group.length);
        representative.element.dataset.clusterLat = String(clusterLat);
        representative.element.dataset.clusterLng = String(clusterLng);
        representative.element.setAttribute("aria-label", `${group.length} yakın yer. Yakınlaştırmak için dokun.`);
      }
    };

    updateVisibility();
    map.on("moveend", updateVisibility);
    map.on("zoomend", updateVisibility);
    map.on("resize", updateVisibility);
    return () => {
      map.off("moveend", updateVisibility);
      map.off("zoomend", updateVisibility);
      map.off("resize", updateVisibility);
    };
  }, [places, selectedPlace?.id]);

  return <div className="map-stage">
    <div ref={containerRef} className="map-canvas" />
    {picking && <div className="map-pick-banner">Haritada istediğin noktaya dokun</div>}
    {selectedPlace && <MapPlaceSheet place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
  </div>;
}

function renderPlaceMarker(element: HTMLButtonElement, place: Place, selected = false) {
  element.replaceChildren(document.createTextNode(place.name.slice(0, 1).toLocaleUpperCase("tr")));

  const label = document.createElement("span");
  label.className = "place-marker-label";
  label.textContent = place.name;
  label.setAttribute("aria-hidden", "true");
  label.style.position = "absolute";
  label.style.left = "50%";
  label.style.bottom = "40px";
  label.style.transform = "translateX(-50%)";
  label.style.maxWidth = "156px";
  label.style.padding = selected ? "6px 9px" : "5px 8px";
  label.style.border = selected ? "1px solid rgba(29,78,216,.35)" : "1px solid rgba(226,232,240,.96)";
  label.style.borderRadius = "9px";
  label.style.background = selected ? "rgba(238,244,255,.98)" : "rgba(255,255,255,.94)";
  label.style.color = "#0f172a";
  label.style.boxShadow = "0 4px 12px rgba(15,23,42,.14)";
  label.style.fontSize = "11px";
  label.style.fontWeight = selected ? "900" : "800";
  label.style.lineHeight = "1.15";
  label.style.whiteSpace = "nowrap";
  label.style.overflow = "hidden";
  label.style.textOverflow = "ellipsis";
  label.style.pointerEvents = "none";
  label.style.zIndex = selected ? "2" : "1";
  element.appendChild(label);
}

function MapPlaceSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  return <aside className="map-place-sheet" aria-label={`${place.name} detayları`}>
    <div className="map-place-heading">
      <div><p>{categoryLabel(place.category)}{place.distanceM ? ` · ${distanceLabel(place.distanceM)}` : ""}</p><strong>{place.name}</strong></div>
      <button type="button" onClick={onClose} aria-label="Yer kartını kapat"><X size={18} /></button>
    </div>
    <p className="map-place-address">{place.address}</p>
    <div className="map-place-actions">
      {place.phone ? <a href={`tel:${place.phone}`}><Phone size={17} /> Ara</a> : <span />}
      <a className="is-primary" href={mapsUrl} target="_blank" rel="noreferrer"><Navigation size={17} /> Yol tarifi</a>
    </div>
  </aside>;
}

function categoryLabel(category: Place["category"]) {
  return ({ duty: "Nöbetçi Eczane", market: "Market", food: "Yemek", cafe: "Kafe", atm: "ATM", pharmacy: "Eczane", hospital: "Sağlık", fuel: "Akaryakıt", parking: "Otopark", park: "Park", bakery: "Fırın", greengrocer: "Manav", shopping: "Alışveriş" } as Record<Place["category"], string>)[category];
}

function distanceLabel(value: number) {
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1).replace(".", ",")} km`;
}
