import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import type { Coordinates, Place } from "../types";

export function MapView({ location, places, picking, onPick }: { location: Coordinates | null; places: Place[]; picking: boolean; onPick: (coords: Coordinates) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const locationMarkerRef = useRef<Marker | null>(null);

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
    map.on("click", (event) => {
      if (picking) onPick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (event: maplibregl.MapMouseEvent) => {
      if (picking) onPick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    };
    map.off("click");
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
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = places.slice(0, 120).map((place) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `place-marker marker-${place.category}`;
      el.textContent = place.name.slice(0, 1).toLocaleUpperCase("tr");
      el.setAttribute("aria-label", place.name);
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`<strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.address)}</span>`);
      return new maplibregl.Marker({ element: el }).setLngLat([place.lng, place.lat]).setPopup(popup).addTo(map);
    });
  }, [places]);

  return <div className="map-stage"><div ref={containerRef} className="map-canvas" />{picking && <div className="map-pick-banner">Haritada istediğin noktaya dokun</div>}</div>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}
