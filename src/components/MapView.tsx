import { useEffect, useRef, useState } from "react";
import { Navigation, Phone, X } from "lucide-react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import type { Coordinates, Place } from "../types";

export function MapView({ location, places, picking, onPick }: { location: Coordinates | null; places: Place[]; picking: boolean; onPick: (coords: Coordinates) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
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
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = places.slice(0, 120).map((place) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `place-marker marker-${place.category}`;
      el.textContent = place.name.slice(0, 1).toLocaleUpperCase("tr");
      el.setAttribute("aria-label", `${place.name} harita işareti`);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        if (picking) return;
        setSelectedPlace(place);
        map.easeTo({ center: [place.lng, place.lat], duration: 300 });
      });
      return new maplibregl.Marker({ element: el }).setLngLat([place.lng, place.lat]).addTo(map);
    });
    if (selectedPlace && !places.some((place) => place.id === selectedPlace.id)) setSelectedPlace(null);
  }, [places, picking, selectedPlace?.id]);

  return <div className="map-stage">
    <div ref={containerRef} className="map-canvas" />
    {picking && <div className="map-pick-banner">Haritada istediğin noktaya dokun</div>}
    {selectedPlace && <MapPlaceSheet place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
  </div>;
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
