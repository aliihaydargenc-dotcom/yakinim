import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {ArrowLeft,ArrowUpRight,MapPin,Navigation,RefreshCw} from 'lucide-react';
import type {Coordinates,Place} from '../types';
import eventCities from '../../lib/event-cities.json';
import {useBackLayer} from '../hooks/useBackLayer';
const ProductPrices=lazy(()=>import('./ProductPrices').then(m=>({default:m.ProductPrices})));
import {FeatureSheet} from './FeatureSheet';
import {TransitArrivals} from './TransitArrivals';
import {TransitRouteView} from './TransitRouteView';
import {coveredBy,requestBounds} from '../services/map-viewport';
const MapView=lazy(()=>import('./MapView').then(m=>({default:m.MapView})));

type Stop={id:string;name:string;lat:number;lng:number;routes:string[];distanceM:number};
type Bus={id:string;code:string;name:string;direction:number;minutes:number;stops:number|null};
type Event={id:string;title:string;startsAt:string|null;endsAt:string|null;hours:string|null;venue:string|null;imageUrl?:string;directionsUrl?:string;url:string;source:string;price:null;kind?:string;description?:string;priceLabel?:string|null};
async function get<T>(url:string,signal?:AbortSignal):Promise<T>{const r=await fetch(url,{signal});if(!r.ok)throw new Error('Kaynak alınamadı');return r.json();}
const routeLink=(p:Coordinates)=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
const ANTALYA_CENTER:Coordinates={lat:36.8948,lng:30.7056};
type StopResponse={stops:Stop[];coverage:string[];partial:boolean;catalogAt:string;catalogSize:number;stale:boolean;truncated?:boolean;scope?:string};
type Bounds={south:number;west:number;north:number;east:number};
const around=(c:Coordinates):Bounds=>({south:c.lat-.014,west:c.lng-.021,north:c.lat+.014,east:c.lng+.021});
function TransitStopsView({location,search}:{location:Coordinates|null;search:string}){
 const inCoverage=!!location&&location.lat>=35.5&&location.lat<=38&&location.lng>=29&&location.lng<=33;
 const origin=inCoverage?location!:ANTALYA_CENTER;
 const scope=`${origin.lat.toFixed(3)}:${origin.lng.toFixed(3)}`;
 const [selected,setSelected]=useState<Stop|null>(null),[map,setMap]=useState(false),[route,setRoute]=useState<{code:string;direction:number;vehicleId?:string}|null>(null);
 const [bounds,setBounds]=useState<Bounds|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>>();
 const term=search.trim();
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{document.documentElement.classList.toggle('transit-map-open',map);return ()=>document.documentElement.classList.remove('transit-map-open');},[map]);
 useEffect(()=>{clearTimeout(timer.current);setSelected(null);setRoute(null);setBounds(null);},[scope]);
 const view=bounds||requestBounds(around(origin));
 const bbox=[view.south,view.west,view.north,view.east].map(v=>v.toFixed(3)).join(',');
 const params=new URLSearchParams({lat:String(origin.lat),lng:String(origin.lng)});
 if(term)params.set('q',term);else if(map)params.set('bounds',bbox);
 const stops=useQuery({queryKey:['transit-stops-compact',scope,term,term?'search':map?bbox:'nearby'],queryFn:({signal})=>get<StopResponse>(`/api/transit?${params}`,signal),staleTime:300000,retry:0});
 const filtered=stops.data?.stops||[];
 const toPlace=(s:Stop):Place=>({id:`transit:${s.id}`,name:s.name,category:'transit',lat:s.lat,lng:s.lng,address:`Durak ${s.id} · ${s.routes.join(', ')}`,distanceM:inCoverage?s.distanceM:undefined,source:'Antalyakart / Kentkart'});
 const places=useMemo(()=>filtered.map(toPlace),[stops.data,inCoverage]);
 const moved=(_center:Coordinates,next:Bounds)=>{clearTimeout(timer.current);timer.current=setTimeout(()=>setBounds(previous=>coveredBy(next,previous||requestBounds(around(origin)))?previous:requestBounds(next)),500);};
 return <section className={`pilot-panel ${map?'transit-map-panel':''}`}>
  <div className="pilot-title"><span className="service-region">Antalya</span><button onClick={()=>setMap(!map)}><MapPin size={17}/>{map?'Liste':'Harita'}</button></div>
  {stops.isError&&<Retry onClick={()=>void stops.refetch()}/>} {stops.isPending&&<small role="status">Duraklar yükleniyor…</small>}
  {map?<div className="pilot-map"><Suspense fallback={<p>Yükleniyor…</p>}><MapView memoryKey={`transit:${scope}`} selectionScope={`transit:${scope}`} location={inCoverage?location:null} initialCenter={origin} places={places} picking={false} onPick={()=>{}} onPlaceOpen={p=>{const stop=filtered.find(s=>p.id===`transit:${s.id}`);if(stop)setSelected(stop);}} onViewportChange={moved} loading={stops.isFetching} autoFitKey={term||undefined}/></Suspense></div>:<div className="stop-list">{!stops.isPending&&!stops.isError&&!filtered.length&&<p role={stops.data?.partial?'status':undefined}>{stops.data?.partial?'Veri eksik':'Eşleşme yok'}</p>}{filtered.map(s=><button className="stop-row" key={s.id} onClick={()=>setSelected(s)}><MapPin size={18}/><span><strong>{s.name}</strong><small>{s.id}{!term&&inCoverage?` · ${s.distanceM} m`:''}{s.routes.length>0?` · ${s.routes.join(' · ')}`:''}</small></span></button>)}</div>}
  <FeatureSheet open={!!selected} title={route?.code||selected?.name||'Durak'} onClose={()=>{if(route)setRoute(null);else setSelected(null);}} closeLabel={route?'Otobüs listesine dön':undefined} back={!!route}>
   {selected&&(route?<TransitRouteView key={route.code+':'+route.direction+':'+(route.vehicleId||'')} stop={selected} code={route.code} direction={route.direction} vehicleId={route.vehicleId} onBack={()=>setRoute(null)} onDirectionChange={direction=>setRoute({code:route.code,direction})}/>:<div className="compact-stop-detail"><small>{selected.id}</small><TransitArrivals stop={toPlace(selected)} onRoute={(code,direction,vehicleId)=>setRoute({code,direction,vehicleId})}/></div>)}
  </FeatureSheet>
 </section>;
}
export function TransitView({location,search}:{location:Coordinates|null;search:string}){return <TransitStopsView location={location} search={search}/>;}
function Retry({onClick}:{onClick:()=>void}){return <div className="pilot-error" role="alert"><p>Veri alınamadı</p><button className="plain-button" onClick={onClick}>Tekrar dene</button></div>;}
export function EventsView({search,location}:{search:string;location:Coordinates|null}){
 const [chosenCity,setChosenCity]=useState<string|null>(null);
 useEffect(()=>setChosenCity(null),[location?.lat,location?.lng]);
 const region=useQuery({queryKey:['event-region-v2',location?.lat.toFixed(4),location?.lng.toFixed(4)],queryFn:({signal})=>get<{province:string}>(`/api/location?v=2&lat=${location!.lat.toFixed(4)}&lng=${location!.lng.toFixed(4)}`,signal),enabled:!!location&&chosenCity===null,staleTime:86400000,retry:0});
 const normalize=(v:string)=>v.toLocaleLowerCase('tr').replace(/\s+ili$/,'').trim();
 const city=chosenCity??eventCities.find(c=>normalize(c.name)===normalize(region.data?.province||''))?.id??'all';
 const events=useQuery({queryKey:['events',city],queryFn:({signal})=>get<{items:Event[];coverage:string;fetchedAt:string;partial:boolean}>(`/api/events?city=${city}`,signal),enabled:chosenCity!==null||!location||region.isFetched,staleTime:300000,refetchInterval:300000,retry:1});
 const now=Date.now();
 const items=(events.data?.items||[]).filter(e=>`${e.title} ${e.venue||''} ${({concert:'Konser',theatre:'Tiyatro',exhibition:'Sergi',children:'Çocuk',festival:'Festival',fair:'Fuar',standup:'Stand-up',other:'Diğer'} as Record<string,string>)[e.kind||'']||''}`.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))&&(!e.endsAt||Date.parse(e.endsAt)>=now));
 return <section className="pilot-panel"><div className="pilot-title event-controls"><label className="event-city-filter"><select aria-label="Etkinlik şehri" value={city} onChange={e=>setChosenCity(e.target.value)}><option value="all">Türkiye</option>{eventCities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button aria-label="Etkinlikleri yenile" onClick={()=>void events.refetch()} disabled={events.isFetching}><RefreshCw size={18}/></button></div>{events.isPending&&<p role="status">Etkinlikler yükleniyor…</p>}{events.isError&&<Retry onClick={()=>void events.refetch()}/>} {!events.isPending&&!events.isError&&!items.length&&<p role={events.data?.partial?'status':undefined}>{events.data?.partial?'Veri eksik':'Etkinlik bulunamadı'}</p>}{items.map(e=><article className="event-card" key={e.id}>{e.imageUrl&&<img src={e.imageUrl} alt={e.title} loading="lazy" onError={ev=>{ev.currentTarget.hidden=true;}}/>}<h3>{e.title}</h3><p>{e.startsAt?new Date(e.startsAt).toLocaleDateString('tr-TR',{day:'numeric',month:'long',timeZone:'Europe/Istanbul'}):'Tarih yok'}{e.startsAt&&e.endsAt&&e.startsAt.slice(0,10)!==e.endsAt.slice(0,10)&&` – ${new Date(e.endsAt).toLocaleDateString('tr-TR',{day:'numeric',month:'long',timeZone:'Europe/Istanbul'})}`}{e.hours&&` · ${e.hours}`}</p>{e.venue&&<p>{e.venue}</p>}<small>{e.source}{e.priceLabel&&` · ${e.priceLabel}`}</small><div className="event-links"><a className="solid-button" href={e.url} target="_blank" rel="noreferrer">Detay <ArrowUpRight size={16}/></a>{e.directionsUrl&&<a className="outline-button" href={e.directionsUrl} target="_blank" rel="noreferrer">Yol tarifi</a>}</div></article>)}</section>;
}

export function PilotView({mode,location,search}:{mode:'transit'|'events'|'prices';location:Coordinates|null;search:string}) {return mode==='transit'?<TransitView location={location} search={search}/>:mode==='events'?<EventsView search={search} location={location}/>:<ProductPrices location={location} input={search}/>;}
