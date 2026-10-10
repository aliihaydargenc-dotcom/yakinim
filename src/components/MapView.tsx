import { useEffect, useRef, useState } from "react";
import {PlaceFacts} from "./PlaceFacts";
import { Navigation, Phone, X, List, ChevronDown } from "lucide-react";
import {iconForCategory,registerMapIcons} from "./mapIcons";
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
const ICON_LAYER = "nearby-place-category-icons";
const LABEL_LAYER = "nearby-place-short-labels";
const SELECTED_LAYER = "nearby-place-selected-halo";

export function MapView({ location, places, picking, onPick, onViewportChange, loading = false, loadingText = "Yükleniyor", onPlaceOpen, memoryKey,trafficTiles,onTrafficState,autoFitKey,enableList=false }: { location: Coordinates | null; places: Place[]; picking: boolean; onPick: (coords: Coordinates) => void; onViewportChange: (coords: Coordinates, bounds: ViewportBounds) => void; loading?: boolean; loadingText?: string; onPlaceOpen?: (place: Place) => void; memoryKey?: string;trafficTiles?:string;onTrafficState?:(state:'loading'|'ready'|'error')=>void;autoFitKey?:string;enableList?:boolean }) {
  const sheetRef=useRef<HTMLDivElement|null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const locationMarkerRef = useRef<Marker | null>(null);
  const previousLocation = useRef(location);
  const lastAutoFit=useRef('');
  const placesRef = useRef<Place[]>(places);
  const pickingRef = useRef(picking);
  const onPickRef = useRef(onPick);
  const onViewportChangeRef = useRef(onViewportChange);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(()=>memoryKey?cameras.get(memoryKey)?.selected??null:null);
  useBackLayer(!!selectedPlace,()=>setSelectedPlace(null));
  const selectedRef = useRef<Place | null>(null);
  const [listOpen,setListOpen]=useState(false);
  const [visiblePlaces,setVisiblePlaces]=useState<Place[]>([]);
  const visibleRef=useRef<() => void>(()=>{});
  const sourceSignatureRef = useRef("");
  const trafficStateRef=useRef(onTrafficState);trafficStateRef.current=onTrafficState;
  selectedRef.current=selectedPlace;
  visibleRef.current=()=>{
    const map=mapRef.current;
    if(!map)return;
    const bounds=map.getBounds(),center=map.getCenter();
    const results=placesRef.current.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&bounds.contains([p.lng,p.lat]))
      .sort((a,b)=>Math.hypot(a.lat-center.lat,a.lng-center.lng)-Math.hypot(b.lat-center.lat,b.lng-center.lng));
    setVisiblePlaces(previous=>previous.length===results.length&&previous.every((p,i)=>p.id===results[i].id&&p.name===results[i].name)?previous:results);
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
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: saved?.center ?? (location ? [location.lng, location.lat] : [35, 39]),
      zoom: saved?.zoom ?? (location ? 14.6 : 5.2),
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const syncSource = () => {
      const signature = JSON.stringify(placesRef.current.map(({id,lat,lng,category,name}) => [id,lat,lng,category,name]));
      if (signature !== sourceSignatureRef.current && map.getSource(PLACES_SOURCE)) {
        updatePlaceSource(map, placesRef.current);
        sourceSignatureRef.current = signature;
      }
    };
    const setup = () => {
      registerMapIcons(map);
      ensurePlaceLayers(map);
      syncSource();
      visibleRef.current();
      handleMoveEnd();
    };

    const handleClick = async (event: maplibregl.MapMouseEvent) => {
      if (pickingRef.current) {
        setSelectedPlace(null);
        onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        return;
      }

      const interactiveLayers = [CLUSTER_LAYER, ICON_LAYER, LABEL_LAYER, OVERVIEW_POINT_LAYER]
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
        setListOpen(false);
        setSelectedPlace(place);
        map.easeTo({center:[place.lng,place.lat],zoom:Math.max(14,map.getZoom()),duration:180});
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
      visibleRef.current();
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
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      visibleRef.current();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off("load", setup);
      map.off("click", handleClick);
      map.off("mousemove", handlePointer);
      map.off("moveend", handleMoveEnd);
      sourceSignatureRef.current = "";
      map.remove();
      mapRef.current = null;
      locationMarkerRef.current = null;
    };
  }, []);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!trafficTiles)return;
    let disposed=false,failed=false;
    const sourceId='traffic-flow',layerId='traffic-flow-layer';
    const url=()=>trafficTiles+'&_v='+Math.floor(Date.now()/120000);
    const setup=()=>{
      if(disposed||map.getSource(sourceId))return;
      trafficStateRef.current?.('loading');
      map.addSource(sourceId,{type:'raster',tiles:[url()],tileSize:256,minzoom:0,maxzoom:18,attribution:'© TomTom'});
      const before=map.getStyle().layers?.find(l=>l.type==='symbol')?.id;
      map.addLayer({id:layerId,type:'raster',source:sourceId,paint:{'raster-opacity':0.85,'raster-fade-duration':0}},before);
    };
    const data=(e:maplibregl.MapSourceDataEvent)=>{if(!failed&&e.sourceId===sourceId&&e.isSourceLoaded){if(map.getLayer(layerId)&&map.getLayoutProperty(layerId,'visibility')!=='visible')map.setLayoutProperty(layerId,'visibility','visible');trafficStateRef.current?.('ready');}};
    const error=(e:maplibregl.ErrorEvent)=>{const source=(e as unknown as {sourceId?:string}).sourceId;if(source===sourceId||e.error?.message?.includes('/api/traffic')){failed=true;if(map.getLayer(layerId))map.setLayoutProperty(layerId,'visibility','none');trafficStateRef.current?.('error');}};
    map.on('style.load',setup);map.on('sourcedata',data);map.on('error',error);
    if(map.isStyleLoaded())setup();
    const timer=setInterval(()=>{const source=map.getSource(sourceId) as maplibregl.RasterTileSource|undefined;if(source){failed=false;trafficStateRef.current?.('loading');source.setTiles([url()]);}},120000);
    return ()=>{disposed=true;clearInterval(timer);map.off('style.load',setup);map.off('sourcedata',data);map.off('error',error);if(mapRef.current===map&&map.getStyle()){if(map.getLayer(layerId))map.removeLayer(layerId);if(map.getSource(sourceId))map.removeSource(sourceId);}};
  },[trafficTiles]);

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
      const signature = JSON.stringify(places.map(({id,lat,lng,category,name}) => [id,lat,lng,category,name]));
      if (signature !== sourceSignatureRef.current) {
        updatePlaceSource(map,places);
        sourceSignatureRef.current = signature;
      }
      visibleRef.current();
    };

    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);

    setSelectedPlace(current => current ? places.find(place => place.id === current.id) ?? null : null);
    return () => { map.off("load", sync); };
  }, [places]);

  useEffect(() => {
    if(!autoFitKey || !places.length || lastAutoFit.current===autoFitKey)return;
    const map=mapRef.current;
    if(!map)return;
    const extent=new maplibregl.LngLatBounds();
    places.forEach(p=>extent.extend([p.lng,p.lat]));
    lastAutoFit.current=autoFitKey;
    if(places.length===1)map.easeTo({center:[places[0].lng,places[0].lat],zoom:14,duration:250});
    else map.fitBounds(extent,{padding:52,maxZoom:14,duration:250});
  },[autoFitKey,places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = picking ? "crosshair" : "grab";
  }, [picking]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if(map.getLayer(SELECTED_LAYER))map.setFilter(SELECTED_LAYER,["==",["get","id"],selectedPlace?.id||""]);
    if(!selectedPlace||!sheetRef.current)return;
    const focus=()=>{const height=sheetRef.current?.getBoundingClientRect().height||0;map.easeTo({center:[selectedPlace.lng,selectedPlace.lat],offset:[0,-height/2],duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:220});};
    const observer=new ResizeObserver(focus);observer.observe(sheetRef.current);focus();return ()=>observer.disconnect();
  }, [selectedPlace?.id]);

  return <div className="map-stage" data-map-renderer="maplibre-layered-discovery" data-place-count={places.length} aria-busy={loading}>
    <div ref={containerRef} className="map-canvas" />
    {loading && <div className="map-loading-indicator" role="status" aria-live="polite"><span className="map-loader-ring" aria-hidden="true" /><span>{loadingText}</span></div>}
    {picking && <div className="map-pick-banner">Haritada istediğin noktaya dokun</div>}
    {enableList&&!picking&&!selectedPlace&&<div className="map-results-dock">
      <button type="button" className="map-results-toggle" aria-expanded={listOpen} aria-controls="map-visible-places" onClick={()=>setListOpen(open=>!open)}><List size={18}/><span>Haritadaki yerler · {visiblePlaces.length}</span><ChevronDown size={18} className={listOpen?'map-chevron-open':''}/></button>
      {listOpen&&<section id="map-visible-places" className="map-visible-list" aria-label="Haritada görünen yerlerin listesi">
        {!visiblePlaces.length?<p>{loading?'Yerler yükleniyor…':'Bu alanda yer bulunamadı.'}</p>:visiblePlaces.slice(0,80).map(place=><button type="button" className="map-visible-row" key={place.id} onClick={()=>{
          setListOpen(false);setSelectedPlace(place);mapRef.current?.easeTo({center:[place.lng,place.lat],zoom:Math.max(15,mapRef.current.getZoom()),duration:280});
        }}><span className="map-visible-symbol">{categoryLabel(place.category).slice(0,1)}</span><span><strong>{place.name}</strong><small>{categoryLabel(place.category)}{place.distanceM!==undefined?' · '+distanceLabel(place.distanceM):''}</small></span></button>)}
        {visiblePlaces.length>80&&<small className="map-visible-more">İlk 80 yer gösteriliyor. Haritayı yakınlaştırarak listeyi daralt.</small>}
      </section>}
    </div>}
    {selectedPlace && <div ref={sheetRef} className="map-sheet-holder"><MapPlaceSheet place={selectedPlace} onOpen={onPlaceOpen ? () => onPlaceOpen(selectedPlace) : undefined} onClose={() => setSelectedPlace(null)} /></div>}
  </div>;
}

function ensurePlaceLayers(map: MapLibreMap) {
  if(map.getSource(PLACES_SOURCE))return;
  map.addSource(PLACES_SOURCE,{type:'geojson',data:emptyFeatureCollection(),cluster:true,clusterRadius:56,clusterMaxZoom:15});
  map.addLayer({id:CLUSTER_LAYER,type:'circle',source:PLACES_SOURCE,filter:['has','point_count'],paint:{
    'circle-color':['step',['get','point_count'],'#42687c',12,'#355f78',50,'#2d526d'],
    'circle-radius':['step',['get','point_count'],16,12,20,50,25],
    'circle-stroke-color':'white','circle-stroke-width':2.5,'circle-opacity':0.97
  }} as any);
  map.addLayer({id:CLUSTER_COUNT_LAYER,type:'symbol',source:PLACES_SOURCE,filter:['has','point_count'],layout:{
    'text-field':['get','point_count_abbreviated'],'text-size':12,'text-allow-overlap':true,'text-ignore-placement':true
  },paint:{'text-color':'#ffffff'}} as any);
  map.addLayer({id:OVERVIEW_POINT_LAYER,type:'circle',source:PLACES_SOURCE,maxzoom:11.6,filter:['!',['has','point_count']],
    paint:{'circle-radius':4,'circle-color':'#42687c','circle-stroke-width':1.5,'circle-stroke-color':'#ffffff'}} as any);
  map.addLayer({id:SELECTED_LAYER,type:'circle',source:PLACES_SOURCE,minzoom:11.5,
    filter:['==',['get','id'],''],paint:{'circle-radius':18,'circle-color':'#ffffff','circle-opacity':0.9,'circle-stroke-width':3,'circle-stroke-color':'#42687c'}} as any);
  map.addLayer({id:ICON_LAYER,type:'symbol',source:PLACES_SOURCE,minzoom:11.5,filter:['!',['has','point_count']],
    layout:{'icon-image':['get','icon'],'icon-size':['interpolate',['linear'],['zoom'],11.5,0.8,15.5,1.1],
      'icon-allow-overlap':false,'icon-ignore-placement':false,'icon-padding':2}} as any);
  map.addLayer({id:LABEL_LAYER,type:'symbol',source:PLACES_SOURCE,minzoom:15.5,filter:['!',['has','point_count']],
    layout:{'text-field':['get','name'],'text-size':11.5,'text-anchor':'top','text-offset':[0,1.2],
      'text-max-width':11,'text-allow-overlap':false,'text-optional':true},
    paint:{'text-color':'#243c44','text-halo-color':'#ffffff','text-halo-width':1.8}} as any);
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
        icon: iconForCategory(place.category),
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
