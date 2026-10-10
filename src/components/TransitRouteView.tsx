import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {BusFront,RefreshCw} from 'lucide-react';
import maplibregl,{type Map as MapLibreMap,type Marker,type Popup} from 'maplibre-gl';
import {useBackLayer} from '../hooks/useBackLayer';

type Point={lat:number;lng:number};
type Stop=Point&{id:string;name:string};
type Route= {code:string;direction:number;name:string;stops:Stop[];points:Point[]};
type Bus=Point&{id:string;code:string;name:string;direction:number;minutes:number;stops:number|null};
type Arrivals={fresh:boolean;sourceAt:string|null;buses:Bus[]};
type LastSeen=Point&{sourceAt:string|null};

async function request<T>(url:string,signal?:AbortSignal):Promise<T>{
 const response=await fetch(url,{signal,cache:'no-store'});
 if(!response.ok)throw new Error('transit_unavailable');
 return response.json() as Promise<T>;
}
function valid(p:Point){return Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.lat>35.5&&p.lat<38&&p.lng>29&&p.lng<33;}
function clock(value:string|null){return value?new Date(value).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'}):'';}

export function TransitRouteView({stop,code,direction,vehicleId,onBack,onDirectionChange}:{
 stop:Stop;code:string;direction:number;vehicleId?:string;onBack:()=>void;onDirectionChange:(direction:number)=>void;
}){
 useBackLayer(true,onBack);
 const containerRef=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<MapLibreMap|null>(null);
 const markerRef=useRef<Marker|null>(null);
 const animationRef=useRef<number|null>(null);
 const popupRef=useRef<Popup|null>(null);
 const [lastSeen,setLastSeen]=useState<LastSeen|null>(null);
 const query=new URLSearchParams({action:'route',code,direction:String(direction),lat:String(stop.lat),lng:String(stop.lng)});
 const path=useQuery({queryKey:['transit-route',code,direction],queryFn:({signal})=>request<Route>('/api/transit?'+query.toString(),signal),staleTime:3600000,retry:0});
 const arrivalsUrl=new URLSearchParams({action:'arrivals',stop:stop.id,lat:String(stop.lat),lng:String(stop.lng)});
 const arrivals=useQuery({queryKey:['transit-route-vehicle',stop.id,vehicleId],queryFn:({signal})=>request<Arrivals>('/api/transit?'+arrivalsUrl.toString(),signal),enabled:!!vehicleId,staleTime:15000,refetchInterval:vehicleId?20000:false,retry:1});
 const vehicle=vehicleId&&arrivals.data?.fresh?arrivals.data.buses.find(b=>b.id===vehicleId&&b.code===code&&b.direction===direction&&valid(b)):undefined;
 const active=!!vehicle;
 useEffect(()=>{if(vehicle&&arrivals.data)setLastSeen({lat:vehicle.lat,lng:vehicle.lng,sourceAt:arrivals.data.sourceAt});},[vehicle?.lat,vehicle?.lng,arrivals.data?.sourceAt]);
 const shown:Point|null=vehicle||lastSeen;
 
 useEffect(()=>{
  if(!containerRef.current)return;
  const map=new maplibregl.Map({container:containerRef.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[stop.lng,stop.lat],zoom:12.6,attributionControl:{compact:true}});
  mapRef.current=map;
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
  const observer=new ResizeObserver(()=>map.resize());
  observer.observe(containerRef.current);
  return()=>{
   observer.disconnect();
   if(animationRef.current!==null)cancelAnimationFrame(animationRef.current);
   popupRef.current?.remove();
   markerRef.current?.remove();
   map.remove();
   mapRef.current=null;markerRef.current=null;animationRef.current=null;
  };
 },[]);

 useEffect(()=>{
  const map=mapRef.current;
  if(!map||!path.data)return;
  let attached=false;
  const draw=()=>{
   if(attached||!map.isStyleLoaded())return;
   attached=true;
   const points=(path.data?.points||[]).filter(valid);
   const stops=(path.data?.stops||[]).filter(valid);
   if(map.getLayer('transit-route-stops'))map.removeLayer('transit-route-stops');
   if(map.getLayer('transit-route-line'))map.removeLayer('transit-route-line');
   if(map.getSource('transit-route-stops'))map.removeSource('transit-route-stops');
   if(map.getSource('transit-route-line'))map.removeSource('transit-route-line');
   if(points.length>=2){
    map.addSource('transit-route-line',{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:points.map(p=>[p.lng,p.lat])}}});
    map.addLayer({id:'transit-route-line',type:'line',source:'transit-route-line',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#2569ac','line-width':5,'line-opacity':0.88}});
   }
   if(stops.length){
    map.addSource('transit-route-stops',{type:'geojson',data:{type:'FeatureCollection',features:stops.map(s=>({type:'Feature',properties:{id:s.id,name:s.name},geometry:{type:'Point',coordinates:[s.lng,s.lat]}}))}});
    map.addLayer({id:'transit-route-stops',type:'circle',source:'transit-route-stops',paint:{'circle-radius':5,'circle-color':'#ffffff','circle-stroke-color':'#2569ac','circle-stroke-width':2}});
   }
   const boundsPoints=points.length?points:stops;
   if(boundsPoints.length){
    const bounds=new maplibregl.LngLatBounds();
    boundsPoints.forEach(p=>bounds.extend([p.lng,p.lat]));
    map.fitBounds(bounds,{padding:36,maxZoom:15.5,duration:0});
   }
  };
  map.on('load',draw);
  draw();
  return()=>{map.off('load',draw);};
 },[path.data]);

 useEffect(()=>{
  const map=mapRef.current;if(!map||!path.data?.stops?.length)return;
  const click=(e:maplibregl.MapLayerMouseEvent)=>{
   const f=e.features?.[0];if(!f||f.geometry.type!=='Point')return;
   popupRef.current?.remove();
   const coordinates=f.geometry.coordinates as [number,number];
   const name=String(f.properties?.name||'Durak'),id=String(f.properties?.id||'');
   popupRef.current=new maplibregl.Popup({offset:12,closeButton:true}).setLngLat(coordinates).setText(name+' · '+id).addTo(map);
  };
  const enter=()=>{map.getCanvas().style.cursor='pointer';};
  const leave=()=>{map.getCanvas().style.cursor='';};
  map.on('click','transit-route-stops',click);
  map.on('mouseenter','transit-route-stops',enter);
  map.on('mouseleave','transit-route-stops',leave);
  return()=>{
   map.off('click','transit-route-stops',click);
   map.off('mouseenter','transit-route-stops',enter);
   map.off('mouseleave','transit-route-stops',leave);
  };
 },[path.data]);

 useEffect(()=>{
  const map=mapRef.current;
  if(!map)return;
  if(animationRef.current!==null){cancelAnimationFrame(animationRef.current);animationRef.current=null;}
  if(!shown||!valid(shown)){markerRef.current?.remove();markerRef.current=null;return;}
  const target:[number,number]=[shown.lng,shown.lat];
  if(!markerRef.current){
   const el=document.createElement('div');
   el.className='transit-vehicle-marker';
   el.textContent='🚌';
   el.setAttribute('role','img');
   el.setAttribute('aria-label','Otobüsün bildirilen konumu');
   markerRef.current=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(target).addTo(map);
  }
  const marker=markerRef.current;
  marker.getElement().classList.toggle('is-last-seen',!active);
  const previous=marker.getLngLat();
  const dist=Math.hypot(target[0]-previous.lng,target[1]-previous.lat);
  if(dist===0)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced||dist>0.015){marker.setLngLat(target);return;}
  const start=performance.now(),duration=950;
  const animate=(now:number)=>{
   const t=Math.min(1,(now-start)/duration),ease=t*t*(3-2*t);
   marker.setLngLat([previous.lng+(target[0]-previous.lng)*ease,previous.lat+(target[1]-previous.lat)*ease]);
   animationRef.current=t<1?requestAnimationFrame(animate):null;
  };
  animationRef.current=requestAnimationFrame(animate);
 },[shown?.lat,shown?.lng,active]);

 const status=!vehicleId?'Hat güzergâhı':arrivals.isPending?'Araç konumu alınıyor…':arrivals.isError?'Konum güncellenemedi':!arrivals.data?.fresh?'Kaynak verisi güncel değil':active?'Araç konumu bildirildi':lastSeen?'Araç artık bu durakta görünmüyor':'Araç konumu bulunamadı';
 const sourceAt=active?arrivals.data?.sourceAt||null:lastSeen?.sourceAt||null;
 return <div className="transit-route-view">
  <div className="transit-route-top">
   <div className="transit-route-label"><strong>{path.data?.name||code}</strong><small>{stop.name} · {stop.id}</small></div>
   <div className="transit-route-directions" aria-label="Hat yönü">
    <button type="button" aria-pressed={direction===0} onClick={()=>onDirectionChange(0)}>Gidiş</button>
    <button type="button" aria-pressed={direction===1} onClick={()=>onDirectionChange(1)}>Dönüş</button>
   </div>
  </div>
  <div className="transit-route-map-frame">
   <div ref={containerRef} className="transit-route-map" role="region" aria-label={code+' güzergâh haritası'}/>
   {path.isPending&&<p className="transit-route-map-note" role="status">Güzergâh yükleniyor…</p>}
   {path.isError&&<div className="transit-route-map-note" role="alert">Güzergâh alınamadı. <button type="button" onClick={()=>void path.refetch()}>Tekrar dene</button></div>}
   {!path.isPending&&!path.isError&&(!path.data?.points||path.data.points.length<2)&&<p className="transit-route-map-note">Bu hat için çizim koordinatları bulunamadı.</p>}
  </div>
  <div className="transit-route-footer">
   <div className="transit-route-status" role="status" aria-live="polite">
    <span className={active?'transit-route-live':'transit-route-offline'}><BusFront size={18}/>{status}</span>
    <small>{sourceAt?'Son konum: '+clock(sourceAt)+' · ':''}Otomatik yenileme: 20 sn</small>
   </div>
   <button type="button" className="transit-route-refresh" onClick={()=>{void path.refetch();if(vehicleId)void arrivals.refetch();}} disabled={path.isFetching||arrivals.isFetching} aria-label="Güzergâhı ve otobüs konumunu yenile"><RefreshCw size={19}/><span>Yenile</span></button>
  </div>
 </div>;
}
