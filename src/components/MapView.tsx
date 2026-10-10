import { useEffect, useRef, useState } from "react";
import {PlaceFacts} from "./PlaceFacts";
import { Navigation, Phone, X } from "lucide-react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import type { ViewportBounds } from "../services/api";
import {useBackLayer} from "../hooks/useBackLayer";
import discoveryCategories from '../../lib/discovery-categories.json';
import type { Coordinates, Place } from "../types";

const cameras=new Map<string,{center:[number,number];zoom:number;selected?:Place|null}>();
const PLACES_SOURCE = "nearby-places";
const CLUSTER_LAYER = "nearby-place-clusters";
const CLUSTER_COUNT_LAYER = "nearby-place-cluster-count";
const OVERVIEW_POINT_LAYER = "nearby-place-overview-points";
type PlaceMarker = { marker: Marker; button: HTMLButtonElement; label: HTMLSpanElement };

export function MapView({ location, places, picking, onPick, onViewportChange, loading = false, loadingText = "Yükleniyor", onPlaceOpen, memoryKey }: { location: Coordinates | null; places: Place[]; picking: boolean; onPick: (coords: Coordinates) => void; onViewportChange: (coords: Coordinates, bounds: ViewportBounds) => void; loading?: boolean; loadingText?: string; onPlaceOpen?: (place: Place) => void; memoryKey?: string }) {
  const sheetRef=useRef<HTMLDivElement|null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const locationMarkerRef = useRef<Marker | null>(null);
  const previousLocation = useRef(location);
  const placesRef = useRef<Place[]>(places);
  const pickingRef = useRef(picking);
  const onPickRef = useRef(onPick);
  const onViewportChangeRef = useRef(onViewportChange);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(()=>memoryKey?cameras.get(memoryKey)?.selected??null:null);
  useBackLayer(!!selectedPlace,()=>setSelectedPlace(null));
  const selectedRef = useRef<Place | null>(null);
  const markersRef = useRef(new Map<string, PlaceMarker>());
  const syncMarkersRef = useRef<() => void>(() => {});
  const sourceSignatureRef = useRef("");
  selectedRef.current = selectedPlace;

  // Native markers retain their DOM identity through zooming and GeoJSON tile
  // rebuilds. Updating one place never removes the other clickable markers.
  syncMarkersRef.current = () => {
    const map = mapRef.current;
    if (!map) return;
    const { clientWidth: width, clientHeight: height } = map.getContainer();
    const candidates = placesRef.current.flatMap(place => {
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return [];
      const point = map.project([place.lng, place.lat]);
      if (place.id !== selectedRef.current?.id && (point.x < -160 || point.x > width + 160 || point.y < -160 || point.y > height + 160)) return [];
      return [{place, point}];
    }).sort((a,b) => Number(b.place.id === selectedRef.current?.id) - Number(a.place.id === selectedRef.current?.id)
      || Math.hypot(a.point.x-width/2,a.point.y-height/2)-Math.hypot(b.point.x-width/2,b.point.y-height/2)).slice(0,500);
    const ids = new Set(candidates.map(({place}) => place.id));
    for (const [id, entry] of markersRef.current) {
      if (!ids.has(id)) { entry.marker.remove(); markersRef.current.delete(id); }
    }
    const occupied: Array<{left:number;top:number;right:number;bottom:number}> = [];
    for (const {place,point} of candidates) {
      let entry = markersRef.current.get(place.id);
      if (!entry) {
        const element = document.createElement("div");
        element.className = "stable-place-marker";
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.placeId = place.id;
        const label = document.createElement("span");
        label.className = "stable-place-name";
        button.append(label); element.append(button);
        button.addEventListener("click", event => {
          event.stopPropagation();
          const current = placesRef.current.find(candidate => candidate.id === place.id);
          if (!current) return;
          if (pickingRef.current) { onPickRef.current(current); return; }
          setSelectedPlace(current);
          map.easeTo({center:[current.lng,current.lat],duration:180});
        });
        const marker = new maplibregl.Marker({element,anchor:"center"}).setLngLat([place.lng,place.lat]).addTo(map);
        entry = {marker,button,label};
        markersRef.current.set(place.id,entry);
      }
      entry.marker.setLngLat([place.lng,place.lat]);
      entry.button.setAttribute("aria-label",place.name);
      entry.button.setAttribute("aria-pressed",String(place.id === selectedRef.current?.id));
      if (entry.label.textContent !== place.name) entry.label.textContent = place.name;
      entry.marker.getElement().hidden = map.getZoom() < 13;
      // Reserve name space only after a gesture settles. Dots and their touch
      // targets remain available even when two names cannot fit side by side.
      const labelWidth = entry.label.offsetWidth || 100;
      const labelHeight = entry.label.offsetHeight || 32;
      const rect = {left:point.x-labelWidth/2-4,right:point.x+labelWidth/2+4,top:point.y+14,bottom:point.y+14+labelHeight+4};
      const overlap = occupied.some(other => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top);
      entry.label.style.visibility = (place.id !== selectedRef.current?.id && (overlap || place.category==='transit'&&map.getZoom()<15.8)) ? "hidden" : "visible";
      if (!overlap) occupied.push(rect);
    }
  };

  placesRef.current = places;
  pickingRef.current = picking;
  onPickRef.current = onPick;
  onViewportChangeRef.current = onViewportChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const saved=memoryKey?cameras.get(memoryKey):undefined;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: saved?.center ?? (location ? [location.lng, location.lat] : [35, 39]),
      zoom: saved?.zoom ?? (location ? 14.6 : 5.2),
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const syncSource = () => {
      const signature = JSON.stringify(placesRef.current.map(({id,lat,lng}) => [id,lat,lng]));
      if (signature !== sourceSignatureRef.current && map.getSource(PLACES_SOURCE)) {
        updatePlaceSource(map, placesRef.current);
        sourceSignatureRef.current = signature;
      }
    };
    const setup = () => {
      ensurePlaceLayers(map);
      syncSource();
      syncMarkersRef.current();
    };

    const handleClick = async (event: maplibregl.MapMouseEvent) => {
      if (pickingRef.current) {
        setSelectedPlace(null);
        onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        return;
      }

      const interactiveLayers = [CLUSTER_LAYER, OVERVIEW_POINT_LAYER]
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
      const place = placesRef.current.find(candidate => candidate.id === String(properties.id));
      if (place) {
        setSelectedPlace(place);
        map.easeTo({center:[place.lng,place.lat],zoom:Math.max(13,map.getZoom()),duration:180});
      }
    };

    const handlePointer = (event: maplibregl.MapMouseEvent) => {
      if (pickingRef.current) {
        map.getCanvas().style.cursor = "crosshair";
        return;
      }
      const interactiveLayers = [CLUSTER_LAYER, OVERVIEW_POINT_LAYER]
        .filter((layerId) => Boolean(map.getLayer(layerId)));
      const overFeature = interactiveLayers.length > 0 && map.queryRenderedFeatures(event.point, { layers: interactiveLayers }).length > 0;
      map.getCanvas().style.cursor = overFeature ? "pointer" : "grab";
    };

    const handleMoveEnd = () => {
      syncSource();
      syncMarkersRef.current();
      if (pickingRef.current) return;
      const center = map.getCenter();
      if(memoryKey)cameras.set(memoryKey,{center:[center.lng,center.lat],zoom:map.getZoom(),selected:selectedRef.current});
      const bounds = map.getBounds();
      onViewportChangeRef.current({ lat: center.lat, lng: center.lng }, { south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
    };

    map.on("load", setup);
    map.on("click", handleClick);
    map.on("mousemove", handlePointer);
    map.on("moveend", handleMoveEnd);
    const handleZoom = () => {
      for (const entry of markersRef.current.values()) entry.marker.getElement().hidden = map.getZoom() < 13;
    };
    map.on("zoom", handleZoom);
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      syncMarkersRef.current();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off("load", setup);
      map.off("click", handleClick);
      map.off("mousemove", handlePointer);
      map.off("moveend", handleMoveEnd);
      map.off("zoom", handleZoom);
      for (const entry of markersRef.current.values()) entry.marker.remove();
      markersRef.current.clear();
      sourceSignatureRef.current = "";
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
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", "Konumun");
      const logo = document.createElement("img");
      logo.src = "/icons/icon.svg";
      logo.alt = "";
      logo.width = 32;
      logo.height = 32;
      el.append(logo);
      locationMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([location.lng, location.lat]).addTo(map);
    } else {
      locationMarkerRef.current.setLngLat([location.lng, location.lat]);
    }

    const previous = previousLocation.current;
    const locationChanged = !!previous && (previous.lat !== location.lat || previous.lng !== location.lng);
    previousLocation.current = location;
    const center = map.getCenter();
    const alreadyCentered = Math.abs(center.lat - location.lat) < 0.0008 && Math.abs(center.lng - location.lng) < 0.0008;
    if ((locationChanged || !(memoryKey&&cameras.has(memoryKey))) && (!alreadyCentered || map.getZoom() < 13.8)) {
      map.easeTo({ center: [location.lng, location.lat], zoom: Math.max(map.getZoom(), 14.6), duration: 280 });
    }
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      ensurePlaceLayers(map);
      if (map.isMoving()) return;
      const signature = JSON.stringify(places.map(({id,lat,lng}) => [id,lat,lng]));
      if (signature !== sourceSignatureRef.current) {
        updatePlaceSource(map,places);
        sourceSignatureRef.current = signature;
      }
      syncMarkersRef.current();
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);

    setSelectedPlace(current => current ? places.find(place => place.id === current.id) ?? null : null);
    return () => { map.off("load", sync); };
  }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = picking ? "crosshair" : "grab";
  }, [picking]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncMarkersRef.current();
    if(!selectedPlace||!sheetRef.current)return;
    const focus=()=>{const height=sheetRef.current?.getBoundingClientRect().height||0;map.easeTo({center:[selectedPlace.lng,selectedPlace.lat],offset:[0,-height/2],duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:220});};
    const observer=new ResizeObserver(focus);observer.observe(sheetRef.current);focus();return ()=>observer.disconnect();
  }, [selectedPlace?.id]);

  return <div className="map-stage" data-map-renderer="maplibre-stable-markers" data-place-count={places.length}>
    <div ref={containerRef} className="map-canvas" />
    {loading && <div className="map-loading-indicator" role="status" aria-live="polite"><span className="map-loader-ring" aria-hidden="true" /><span>{loadingText}</span></div>}
    {picking && <div className="map-pick-banner">Haritada istediğin noktaya dokun</div>}
    {selectedPlace && <div ref={sheetRef} className="map-sheet-holder"><MapPlaceSheet place={selectedPlace} onOpen={onPlaceOpen ? () => onPlaceOpen(selectedPlace) : undefined} onClose={() => setSelectedPlace(null)} /></div>}
  </div>;
}

function ensurePlaceLayers(map: MapLibreMap) {
  if (map.getSource(PLACES_SOURCE)) return;

  map.addSource(PLACES_SOURCE, {
    type: "geojson",
    data: emptyFeatureCollection(),
    cluster: true,
    clusterRadius: 52,
    clusterMaxZoom: 12,
  });

  map.addLayer({
    id: CLUSTER_LAYER,
    maxzoom: 13,
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
    maxzoom: 13,
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
    id: OVERVIEW_POINT_LAYER,
    maxzoom: 13,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {"circle-radius":4,"circle-color":"#79576d","circle-stroke-color":"white","circle-stroke-width":1.5},
  } as any);

}

function updatePlaceSource(map: MapLibreMap, places: Place[]) {
  const source = map.getSource(PLACES_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData({
    type: "FeatureCollection",
    features: places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).map((place) => ({
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

function MapPlaceSheet({ place, onClose, onOpen }: { place: Place; onClose: () => void; onOpen?: () => void }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  return <aside className="map-place-sheet" aria-label={`${place.name} detayları`}>
    <div className="map-place-heading">
      <div><p>{categoryLabel(place.category)}{place.distanceM ? ` · ${distanceLabel(place.distanceM)}` : ""}</p><strong>{place.name}</strong></div>
      <button type="button" onClick={onClose} aria-label="Yer kartını kapat"><X size={18} /></button>
    </div>
    {place.category==='transit'?<details className="map-stop-details"><summary>Hatlar ve yol tarifi</summary><p className="map-place-address">{place.address}</p><a className="outline-button" href={mapsUrl} target="_blank" rel="noreferrer"><Navigation size={17}/>Yol tarifi</a></details>:<><p className="map-place-address">{place.address}</p><PlaceFacts place={place}/>{place.source&&<p className="map-place-address">{place.source==="legacy-fallback"?"Eczane Adresi · alternatif, resmî olmayan kaynak":place.source}{place.queryDate&&` · ${place.queryDate}`}</p>}</>}
    <div className="map-place-actions">
      {onOpen ? <button className="solid-button" onClick={onOpen}>Yaklaşan otobüsler</button> : place.phone ? <a href={`tel:${place.phone}`}><Phone size={17} /> Ara</a> : <span />}
      {place.category!=='transit'&&<a className="is-primary" href={mapsUrl} target="_blank" rel="noreferrer"><Navigation size={17} /> Yol tarifi</a>}
    </div>
  </aside>;
}

function categoryLabel(category: Place["category"]) {
  return ({ ...Object.fromEntries(discoveryCategories.map(c=>[c.id,c.label])),transit:"Durak", events:"Etkinlik", duty: "Nöbetçi Eczane", market: "Market", food: "Yemek", cafe: "Kafe", atm: "ATM", pharmacy: "Eczane", hospital: "Sağlık", fuel: "Akaryakıt", parking: "Otopark", park: "Park", bakery: "Fırın", greengrocer: "Manav", shopping: "Alışveriş" } as Record<Place["category"], string>)[category];
}

function distanceLabel(value: number) {
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1).replace(".", ",")} km`;
}
