import { useEffect, useRef, useState } from "react";
import { Navigation, Phone, X } from "lucide-react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import type { ViewportBounds } from "../services/api";
import type { Coordinates, Place } from "../types";

const PLACES_SOURCE = "nearby-places";
const CLUSTER_LAYER = "nearby-place-clusters";
const CLUSTER_COUNT_LAYER = "nearby-place-cluster-count";
const SELECTED_HALO_LAYER = "nearby-place-selected-halo";
const POINT_LAYER = "nearby-place-points";
const LABEL_LAYER = "nearby-place-labels";
const SELECTED_LABEL_LAYER = "nearby-place-selected-label";

export function MapView({ location, places, picking, onPick, onViewportChange, loading = false, loadingText = "Yükleniyor" }: { location: Coordinates | null; places: Place[]; picking: boolean; onPick: (coords: Coordinates) => void; onViewportChange: (coords: Coordinates, bounds: ViewportBounds) => void; loading?: boolean; loadingText?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const locationMarkerRef = useRef<Marker | null>(null);
  const placesRef = useRef<Place[]>(places);
  const pickingRef = useRef(picking);
  const onPickRef = useRef(onPick);
  const onViewportChangeRef = useRef(onViewportChange);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  placesRef.current = places;
  pickingRef.current = picking;
  onPickRef.current = onPick;
  onViewportChangeRef.current = onViewportChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: location ? [location.lng, location.lat] : [35, 39],
      zoom: location ? 14.6 : 5.2,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const setup = () => {
      ensurePlaceLayers(map);
      updatePlaceSource(map, placesRef.current);
    };

    const handleClick = async (event: maplibregl.MapMouseEvent) => {
      if (pickingRef.current) {
        setSelectedPlace(null);
        onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        return;
      }

      const interactiveLayers = [CLUSTER_LAYER, SELECTED_LABEL_LAYER, LABEL_LAYER, POINT_LAYER]
        .filter((layerId) => Boolean(map.getLayer(layerId)));
      if (interactiveLayers.length === 0) return;

      const feature = map.queryRenderedFeatures(event.point, { layers: interactiveLayers })[0];
      if (!feature) return;

      const properties = feature.properties || {};
      if (properties.cluster) {
        const clusterId = Number(properties.cluster_id);
        const source = map.getSource(PLACES_SOURCE) as maplibregl.GeoJSONSource | undefined;
        if (!source || !Number.isFinite(clusterId) || feature.geometry.type !== "Point") return;
        const coordinates = feature.geometry.coordinates as [number, number];
        const zoom = await source.getClusterExpansionZoom(clusterId);
        setSelectedPlace(null);
        map.easeTo({ center: coordinates, zoom: Math.min(18, zoom), duration: 280 });
        return;
      }

      const placeId = String(properties.id || "");
      const place = placesRef.current.find((candidate) => candidate.id === placeId);
      if (!place) return;
      setSelectedPlace(place);
      map.easeTo({ center: [place.lng, place.lat], duration: 180 });
    };

    const handlePointer = (event: maplibregl.MapMouseEvent) => {
      if (pickingRef.current) {
        map.getCanvas().style.cursor = "crosshair";
        return;
      }
      const interactiveLayers = [CLUSTER_LAYER, SELECTED_LABEL_LAYER, LABEL_LAYER, POINT_LAYER]
        .filter((layerId) => Boolean(map.getLayer(layerId)));
      const overFeature = interactiveLayers.length > 0 && map.queryRenderedFeatures(event.point, { layers: interactiveLayers }).length > 0;
      map.getCanvas().style.cursor = overFeature ? "pointer" : "grab";
    };

    const handleMoveEnd = () => {
      if (pickingRef.current) return;
      const center = map.getCenter();
      const bounds = map.getBounds();
      onViewportChangeRef.current({ lat: center.lat, lng: center.lng }, { south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
    };

    map.on("load", setup);
    map.on("click", handleClick);
    map.on("mousemove", handlePointer);
    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("load", setup);
      map.off("click", handleClick);
      map.off("mousemove", handlePointer);
      map.off("moveend", handleMoveEnd);
      map.remove();
      mapRef.current = null;
      locationMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    if (!locationMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "user-marker";
      el.setAttribute("aria-label", "Konumun");
      locationMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([location.lng, location.lat]).addTo(map);
    } else {
      locationMarkerRef.current.setLngLat([location.lng, location.lat]);
    }

    const center = map.getCenter();
    const alreadyCentered = Math.abs(center.lat - location.lat) < 0.0008 && Math.abs(center.lng - location.lng) < 0.0008;
    if (!alreadyCentered || map.getZoom() < 13.8) {
      map.easeTo({ center: [location.lng, location.lat], zoom: Math.max(map.getZoom(), 14.6), duration: 280 });
    }
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      ensurePlaceLayers(map);
      updatePlaceSource(map, places);
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);

    setSelectedPlace((current) => current && !places.some((place) => place.id === current.id) ? null : current);
    return () => { map.off("load", sync); };
  }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = picking ? "crosshair" : "grab";
  }, [picking]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SELECTED_HALO_LAYER) || !map.getLayer(SELECTED_LABEL_LAYER)) return;
    const selectedId = selectedPlace?.id || "__none__";
    const filter = ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], selectedId]] as any;
    map.setFilter(SELECTED_HALO_LAYER, filter);
    map.setFilter(SELECTED_LABEL_LAYER, filter);
  }, [selectedPlace?.id]);

  return <div className="map-stage" data-map-renderer="maplibre-layers" data-place-count={places.length}>
    <div ref={containerRef} className="map-canvas" />
    {loading && <div className="map-loading-indicator" role="status" aria-live="polite"><span className="map-loader-ring" aria-hidden="true" /><span>{loadingText}</span></div>}
    {picking && <div className="map-pick-banner">Haritada istediğin noktaya dokun</div>}
    {selectedPlace && <MapPlaceSheet place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
  </div>;
}

function ensurePlaceLayers(map: MapLibreMap) {
  if (map.getSource(PLACES_SOURCE)) return;

  map.addSource(PLACES_SOURCE, {
    type: "geojson",
    data: emptyFeatureCollection(),
    cluster: true,
    clusterRadius: 52,
    clusterMaxZoom: 13,
  });

  map.addLayer({
    id: CLUSTER_LAYER,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#79576d",
      "circle-radius": ["step", ["get", "point_count"], 14, 10, 16, 30, 19],
      "circle-stroke-color": "rgba(255,255,255,.95)",
      "circle-stroke-width": 2,
      "circle-opacity": 0.96,
    },
  } as any);

  map.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: "symbol",
    source: PLACES_SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": "#ffffff" },
  } as any);

  map.addLayer({
    id: SELECTED_HALO_LAYER,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], "__none__"]],
    paint: {
      "circle-radius": 11,
      "circle-color": "rgba(121,87,109,.14)",
      "circle-stroke-color": "rgba(121,87,109,.34)",
      "circle-stroke-width": 2,
    },
  } as any);

  map.addLayer({
    id: POINT_LAYER,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 4, 16, 5, 18, 6],
      "circle-color": ["match", ["get", "category"], "duty", "#79576d", "pharmacy", "#79576d", "#79576d"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.97,
    },
  } as any);

  map.addLayer({
    id: LABEL_LAYER,
    type: "symbol",
    source: PLACES_SOURCE,
    minzoom: 0,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "name"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 14, 11, 16, 12, 18, 13],
      "text-variable-anchor": ["top", "bottom", "left", "right"],
      "text-radial-offset": 0.85,
      "text-justify": "auto",
      "text-max-width": 11,
      "text-padding": 5,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "text-optional": true,
      "symbol-sort-key": ["get", "distanceM"],
    },
    paint: {
      "text-color": "#51404d",
      "text-halo-color": "rgba(255,255,255,.98)",
      "text-halo-width": 2.2,
      "text-halo-blur": 0.4,
    },
  } as any);

  map.addLayer({
    id: SELECTED_LABEL_LAYER,
    type: "symbol",
    source: PLACES_SOURCE,
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], "__none__"]],
    layout: {
      "text-field": ["get", "name"],
      "text-size": 13,
      "text-variable-anchor": ["top", "bottom", "left", "right"],
      "text-radial-offset": 1.1,
      "text-justify": "auto",
      "text-max-width": 15,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#0f172a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 3,
      "text-halo-blur": 0.5,
    },
  } as any);
}

function updatePlaceSource(map: MapLibreMap, places: Place[]) {
  const source = map.getSource(PLACES_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData({
    type: "FeatureCollection",
    features: places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).slice(0, 500).map((place) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
      properties: {
        id: place.id,
        name: place.name,
        category: place.category,
        distanceM: place.distanceM ?? 999999,
      },
    })),
  } as any);
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] } as any;
}

function MapPlaceSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  return <aside className="map-place-sheet" aria-label={`${place.name} detayları`}>
    <div className="map-place-heading">
      <div><p>{categoryLabel(place.category)}{place.distanceM ? ` · ${distanceLabel(place.distanceM)}` : ""}</p><strong>{place.name}</strong></div>
      <button type="button" onClick={onClose} aria-label="Yer kartını kapat"><X size={18} /></button>
    </div>
    <p className="map-place-address">{place.address}</p>{place.source&&<p className="map-place-address">{place.source==="legacy-fallback"?"Alternatif kaynak":place.source} · {place.queryDate}</p>}
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
