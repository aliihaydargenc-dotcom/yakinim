import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, LocateFixed, MapPin, Newspaper, Radio, Search, ChevronRight, Gamepad2, Cross, X, Navigation, Phone, Heart, List, Layers, ArrowLeft } from "lucide-react";
import discoveryCategories from '../lib/discovery-categories.json';
import { CategoryRail } from "./components/CategoryRail";
import {PlaceFacts} from "./components/PlaceFacts";
import { LocationStatus } from "./components/LocationStatus";
import { RadioPlayer } from "./components/RadioPlayer";
import { combinePlaceSources, fetchDiscoveryPlaces, fetchMunicipalPlaces, fetchArea, fetchDuty, fetchOvertureSupplement, fetchRadio, type ViewportBounds } from "./services/api";
import { useAppStore } from "./store";
import {useBackLayer} from "./hooks/useBackLayer";
import { useRetainedPlaces } from "./hooks/useRetainedPlaces";
import type { Coordinates, Place, RadioStation } from "./types";
const WeatherSummary = lazy(()=>import("./components/WeatherSummary"));
const PilotViews = lazy(()=>import("./components/PilotViews").then(m=>({default:m.PilotView})));
const MapView = lazy(() => import("./components/MapView").then(m => ({ default: m.MapView })));
const NewsView = lazy(() => import("./components/NewsView").then(m => ({ default: m.NewsView })));
const RadioView = lazy(() => import("./components/RadioView").then(m => ({ default: m.RadioView })));
const GamesView = lazy(() => import("./components/GamesView").then(m => ({ default: m.GamesView })));
const DEMO = new URLSearchParams(window.location.search).has("preview");
const DEMO_ORIGIN = { lat: 36.8615, lng: 30.6377 };
const DEMO_PLACES: Place[] = [
  { id: "demo1", name: "Örnek Mahalle Marketi", category: "market", lat: 36.8622, lng: 30.6370, address: "Örnek adres · Konyaaltı, Antalya" },
  { id: "demo2", name: "Örnek Sahil Kafesi", category: "cafe", lat: 36.8603, lng: 30.6364, address: "Örnek adres · Konyaaltı, Antalya" },
  { id: "demo3", name: "Örnek Eczane", category: "pharmacy", lat: 36.8633, lng: 30.6398, address: "Örnek adres · Konyaaltı, Antalya" },
  { id:"demo-duty",name:"Örnek Nöbetçi Eczane",category:"duty",lat:36.862,lng:30.638,address:"Temsili adres",source:"Örnek kaynak" },
  { id: "demo4", name: "Örnek Fırın", category: "bakery", lat: 36.8643, lng: 30.6352, address: "Örnek adres · Konyaaltı, Antalya" },
  { id: "demo5", name: "Örnek Yemek Yeri", category: "food", lat: 36.8587, lng: 30.6415, address: "Örnek adres · Konyaaltı, Antalya" },
  { id: "demo6", name: "Örnek ATM", category: "atm", lat: 36.8606, lng: 30.6347, address: "Örnek adres · Konyaaltı, Antalya" },
];
const LABELS: Record<string,string> = { ...Object.fromEntries(discoveryCategories.map(c=>[c.id,c.label])), fishing:"Balıkçılık",outages:"Kesintiler",transit:"Ulaşım",events:"Etkinlik",all:"Tüm yerler", market:"Marketler", food:"Yemek", cafe:"Kafeler", duty:"Nöbetçi eczaneler", pharmacy:"Eczaneler", bakery:"Fırınlar", atm:"ATM", park:"Parklar", hospital:"Sağlık", fuel:"Akaryakıt", parking:"Otopark", greengrocer:"Manavlar", shopping:"Alışveriş" };
function boundsAround(c: Coordinates): ViewportBounds { return { south:c.lat-.012, north:c.lat+.012, west:c.lng-.018, east:c.lng+.018 }; }
function distance(a: Coordinates,b: Coordinates) { const r=Math.PI/180; const h=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lng-a.lng)*r/2)**2; return Math.round(12742000*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))); }
function distanceLabel(m?: number) { return m === undefined || !Number.isFinite(m) ? "" : m<1000 ? `${m} m` : `${(m/1000).toFixed(1).replace('.',',')} km`; }

export default function App() {
  const {section,setSection,category,setCategory,search,setSearch,location:storedLocation,setLocation,clearLocation,restoredLocation,locationError,setLocationError,savedIds,toggleSaved} = useAppStore();
  const [previewState,setPreviewState] = useState("ready");
  const location = DEMO ? (previewState === "location" ? null : DEMO_ORIGIN) : storedLocation;
  const locationScope = location ? `${location.lat.toFixed(5)}:${location.lng.toFixed(5)}` : "none";
  const [area,setArea] = useState<{center:Coordinates;bounds:ViewportBounds;owner:string}|null>(()=>location ? {center:location,bounds:boundsAround(location),owner:locationScope} : null);
  const [sectionSearch,setSectionSearch]=useState<Record<string,string>>({});
  const [productMode,setProductMode] = useState(false);
  const [transitMode,setTransitMode]=useState<"stops"|"traffic">("stops");
  const searchMode=category==='transit'&&transitMode==='traffic'?'traffic':category==='market'&&productMode?'prices':category;
  const activeSearch=sectionSearch[searchMode]||'';
  const pilot = category === "fishing" || category === "transit" || category === "events" || category === "outages" || category === "market" && productMode;
  const [mapOpen,setMapOpen] = useState(false);
  const [selected,setSelected] = useState<Place|null>(null);
  const [picking,setPicking] = useState(false);
  useBackLayer(mapOpen,()=>{setMapOpen(false);setPicking(false);});
  useBackLayer(!!selected,()=>setSelected(null));
  const [locating,setLocating] = useState(false);
  const [currentRadio,setCurrentRadio] = useState<RadioStation|null>(null);
  const radioQuery = useQuery({queryKey:["radio"],queryFn:fetchRadio,enabled:section==="radio"||!!currentRadio,staleTime:300000});
  const [gameActive,setGameActive] = useState(false);
  const playingGame = section === "games" && gameActive;
  const moveTimer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(true);
  const locationRequest = useRef(0);
  const locationWatch = useRef<number|null>(null);
  const locationWatchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [pickedCoast,setPickedCoast]=useState<Coordinates|null>(null);
  const coastPick=useRef(false);
  const workspace=useRef<HTMLElement>(null);
  useEffect(()=>{
    const node=workspace.current;
    if(!node?.animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const animation=node.animate([{opacity:.55},{opacity:1}],{duration:160,easing:'ease-out'});
    return ()=>animation.cancel();
  },[section,category,productMode,mapOpen]);
  function stopLocationWatch() {
    if(locationWatch.current!==null) navigator.geolocation.clearWatch(locationWatch.current);
    locationWatch.current=null;clearTimeout(locationWatchTimer.current);
  }
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;clearTimeout(moveTimer.current);stopLocationWatch();};},[]);
  useEffect(()=>{
    if (DEMO || !navigator.geolocation || useAppStore.getState().locationMode==="manual") return;
    let cancelled=false;
    const refresh=()=>{
      if(cancelled || locationRequest.current || useAppStore.getState().locationMode==="manual") return;
      requestLocation();
    };
    // Safari can return "prompt" even for a previous grant. Never trigger
    // a fresh permission prompt outside the user's explicit tap.
    if(navigator.permissions) {
      void navigator.permissions.query({name:"geolocation"}).then(permission=>{
        if(permission.state==="granted") refresh();
      }).catch(()=>{});
    }
    return ()=>{cancelled=true;};
  },[setLocation]);
  useEffect(()=>{ setArea(location ? {center:location,bounds:boundsAround(location),owner:locationScope} : null); },[locationScope]);
  const areaReady = !!location && !!area && area.owner === locationScope;
  const active = section === "nearby" || section === "map";
  const key = area ? Object.values(area.bounds).map(v=>v.toFixed(3)) : [];
  const areaQuery = useQuery({queryKey:["area-v8",locationScope,...key],queryFn:({signal})=>fetchArea(area!.bounds,area!.center,signal),enabled:!DEMO && active && !pilot && areaReady && category!=="duty",staleTime:600000,retry:0});
  const supplementQuery = useQuery({queryKey:["supplement-v7",locationScope,area?.center.lat.toFixed(2),area?.center.lng.toFixed(2)],queryFn:({signal})=>fetchOvertureSupplement(area!.center,signal),enabled:!DEMO && active && !pilot && areaReady && category!=="duty",staleTime:1800000,retry:0});
  const fuelQuery=useQuery({queryKey:['fuel-area',locationScope],queryFn:({signal})=>fetchArea({south:location!.lat-.04,north:location!.lat+.04,west:location!.lng-.05,east:location!.lng+.05},location!,signal),enabled:!DEMO&&active&&category==='fuel'&&!mapOpen&&!!location,staleTime:600000,retry:1});
  const isDiscovery=discoveryCategories.some(c=>c.id===category);
  const discoveryQuery=useQuery({queryKey:['discovery',locationScope],queryFn:({signal})=>fetchDiscoveryPlaces(location!,signal),enabled:!DEMO&&active&&isDiscovery&&!mapOpen&&!!location,staleTime:600000,retry:0});
  const discoverySupplementQuery=useQuery({queryKey:['discovery-supplement',category,locationScope],queryFn:({signal})=>fetchOvertureSupplement(location!,signal,category),enabled:!DEMO&&active&&isDiscovery&&!mapOpen&&!!location,staleTime:21600000,retry:0});
  const municipalArea=!!area&&area.center.lat>=40.5&&area.center.lat<=41.8&&area.center.lng>=27.5&&area.center.lng<=30.5;
  const municipalKind=category==='parking'?'parking':category==='toilets'?'toilets':'all';
  const municipalEnabled=!DEMO&&active&&!pilot&&areaReady&&municipalArea&&['all','parking','toilets'].includes(category);
  const municipalQuery=useQuery({queryKey:['municipal',locationScope,municipalKind,area?.center.lat.toFixed(2),area?.center.lng.toFixed(2)],queryFn:({signal})=>fetchMunicipalPlaces(area!.center,municipalKind,signal),enabled:municipalEnabled,staleTime:120000,refetchInterval:120000,retry:0});
  const dutyDate=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Istanbul"}).format(new Date());
  const dutyQuery = useQuery({queryKey:["duty-v6",dutyDate,locationScope,area?.center.lat.toFixed(3),area?.center.lng.toFixed(3)],queryFn:()=>fetchDuty(area!.center),enabled:!DEMO && active && areaReady && category==="duty",staleTime:300000,refetchInterval:300000,retry:0});
  // Retain pan results within one selected origin, never across two locations.
  // A previous query key is not proof that its places belong to this origin.
  const areaData = useRetainedPlaces(areaReady ? areaQuery.data : undefined, `area:${locationScope}`);
  const supplementData = useRetainedPlaces(areaReady ? supplementQuery.data : undefined, `supplement:${locationScope}`);
  // Panning changes the request center, not the day's duty roster. Preserve
  // map markers during partial/empty viewport replies, but never across days
  // or a change of the user's actual location. Lists use the latest reply.
  const retainedDuty = useRetainedPlaces(areaReady ? dutyQuery.data : undefined, `duty:${dutyDate}:${locationScope}`);
  const dutyData = mapOpen ? retainedDuty : areaReady ? dutyQuery.data ?? [] : [];
  const matchingPlaces = useMemo(()=>{
    if (!areaReady) return [];
    const source = DEMO ? DEMO_PLACES : category==="duty" ? dutyData : combinePlaceSources([...areaData,...supplementData,...(isDiscovery?[...(discoveryQuery.data||[]),...(discoverySupplementQuery.data||[])]:[]),...(municipalArea&&['all','parking','toilets'].includes(category)?municipalQuery.data?.places||[]:[]),...(category==='fuel'?fuelQuery.data||[]:[])]);
    const term=search.trim().toLocaleLowerCase("tr");
    return source.filter(p=>(category==="all" || p.category===category) && (!term || `${p.name} ${p.address} ${LABELS[p.category]}`.toLocaleLowerCase("tr").includes(term))).map(p=>({...p,distanceM:location&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)?distance(location,p):p.distanceM})).sort((a,b)=>(a.distanceM??Infinity)-(b.distanceM??Infinity));
  },[category,search,areaData,supplementData,dutyData,fuelQuery.data,municipalQuery.data,municipalArea,discoveryQuery.data,discoverySupplementQuery.data,isDiscovery,mapOpen,areaReady,location?.lat,location?.lng]);
  const places = useMemo(()=>matchingPlaces.filter(p=>category==="duty" || ((category==="fuel"||isDiscovery||category==="parking"&&municipalArea)&&!mapOpen) || !area || (p.lat>=area.bounds.south && p.lat<=area.bounds.north && p.lng>=area.bounds.west && p.lng<=area.bounds.east)),[matchingPlaces,category,area,mapOpen,isDiscovery,municipalArea]);
  const loading = DEMO ? previewState==="loading" : category==="duty" ? dutyQuery.isFetching && !dutyData.length : isDiscovery||category==='parking'&&municipalArea ? !matchingPlaces.length&&(areaQuery.isFetching||supplementQuery.isFetching||discoveryQuery.isFetching||discoverySupplementQuery.isFetching||municipalQuery.isFetching) : category==='fuel'?!matchingPlaces.length&&(areaQuery.isFetching||supplementQuery.isFetching||fuelQuery.isFetching):!matchingPlaces.length && (areaQuery.isFetching||supplementQuery.isFetching||municipalEnabled&&municipalQuery.isFetching);
  const failed = DEMO ? previewState==="error" : category==="duty" ? dutyQuery.isError : areaQuery.isError && supplementQuery.isError && !matchingPlaces.length && (!isDiscovery||discoveryQuery.isError&&discoverySupplementQuery.isError) && (!municipalArea||!['all','parking','toilets'].includes(category)||municipalQuery.isError);
  const updating = !DEMO && (areaQuery.isFetching || supplementQuery.isFetching || municipalEnabled&&municipalQuery.isFetching || isDiscovery&&discoveryQuery.isFetching);
  const visible = DEMO && ["loading","error","empty"].includes(previewState) ? [] : places;
  function requestLocation() {
    if(DEMO) {setPreviewState("ready");setPicking(false);return;}
    if(!window.isSecureContext || !navigator.geolocation) {setLocationError("Konum için siteyi HTTPS bağlantısıyla Safari’de aç. Haritadan da seçebilirsin.");return;}
    stopLocationWatch();
    const request=++locationRequest.current;
    setLocating(true);setLocationError("");
    const current=()=>mounted.current && request===locationRequest.current;
    let bestAccuracy=Infinity;
    let refining=false;
    const accept=(p:GeolocationPosition)=>{
      if(!current())return;
      const {latitude,longitude,accuracy}=p.coords;
      if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return;
      const precision=Number.isFinite(accuracy)?accuracy:Infinity;
      if(precision>bestAccuracy)return;
      bestAccuracy=precision;
      clearTimeout(moveTimer.current);
      setLocation({lat:latitude,lng:longitude});setLocating(false);setPicking(false);
      if(precision<=30)stopLocationWatch();
    };
    const success=(p:GeolocationPosition)=>{
      accept(p);
      // The first device fix can be coarse. Keep receiving better fixes after one tap.
      if(!current()||bestAccuracy<=30||refining||!navigator.geolocation.watchPosition)return;
      refining=true;
      locationWatch.current=navigator.geolocation.watchPosition(accept,()=>{}, {enableHighAccuracy:true,timeout:15000,maximumAge:0});
      locationWatchTimer.current=setTimeout(stopLocationWatch,20000);
    };
    const failure=(e:GeolocationPositionError)=>{
      if(!current())return;
      setLocationError(e.code===1
        ? "Konum izni verilmedi. iPhone’da Ayarlar → Gizlilik ve Güvenlik → Konum Servisleri açık olmalı. Safari’nin konum iznini ve bu sitenin konum ayarını kontrol et; ardından tekrar dene. Uygulama içi tarayıcıdaysan siteyi Safari’de aç."
        : "Cihaz konumu alınamadı. Konum Servislerini ve bağlantını kontrol edip tekrar dene veya haritadan seç.");
      setLocating(false);
    };
    // Keep the native request inside the button gesture, without a Permissions API gate.
    navigator.geolocation.getCurrentPosition(success,e=>{
      if(!current())return;
      if(e.code===1){failure(e);return;}
      navigator.geolocation.getCurrentPosition(success,failure,{enableHighAccuracy:false,timeout:15000,maximumAge:0});
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  function chooseOnMap() {coastPick.current=false;stopLocationWatch();++locationRequest.current;setLocating(false);setLocationError("");setMapOpen(true);setPicking(true);}
  function chooseCoast(){chooseOnMap();coastPick.current=true;}
  function viewport(center:Coordinates,bounds:ViewportBounds) {
    clearTimeout(moveTimer.current);
    moveTimer.current=setTimeout(()=>setArea({center,bounds,owner:locationScope}),450);
  }
  function pick(c:Coordinates) {if(coastPick.current){setPickedCoast(c);coastPick.current=false;}stopLocationWatch();++locationRequest.current;setLocating(false);setLocation(c,"Haritadan seçilen konum","manual");setArea({center:c,bounds:boundsAround(c),owner:`${c.lat.toFixed(5)}:${c.lng.toFixed(5)}`});setPicking(false);setMapOpen(false);if(DEMO)setPreviewState("ready");}
  function retry() {if(DEMO){setPreviewState("ready");return;}if(category==="duty")void dutyQuery.refetch();else{void areaQuery.refetch();void supplementQuery.refetch();if(municipalArea)void municipalQuery.refetch();if(isDiscovery){void discoveryQuery.refetch();void discoverySupplementQuery.refetch();}}}
  return <div className={`model-app ${active&&mapOpen?'map-active':''} ${playingGame?'game-active':currentRadio?'with-player':''}`}>
    {DEMO && <div className="preview-strip">Tasarım önizlemesi · temsili yerler</div>}
    {active ? <>
      <header className="model-header">{mapOpen ? <button aria-label="Listeye dön" onClick={()=>{setMapOpen(false);setPicking(false);}}><ArrowLeft size={20}/>Keşfet</button> : <strong>Yakınım</strong>}{mapOpen && <strong>Harita</strong>}<button onClick={requestLocation} disabled={locating} aria-label="Konumumu bul"><LocateFixed size={19}/>{!mapOpen && <span>{locating?'Bulunuyor…':'Konum'}</span>}</button></header>
      {!mapOpen&&<LocationStatus location={location} manual={useAppStore.getState().locationMode==="manual"} restored={restoredLocation} demo={DEMO} onChooseMap={chooseOnMap} onClear={()=>{stopLocationWatch();++locationRequest.current;setLocating(false);clearLocation();}}/>}
      <main ref={workspace} className={mapOpen?'map-workspace':'list-workspace'}>
        {!mapOpen && category!=="fishing" && <label className="search-box section-search"><Search size={19}/><input aria-label={searchMode==='traffic'?'Trafikte yer ara':searchMode==='prices'?'Ürün ara':category==='transit'?'Durak veya hat ara':category==='events'?'Etkinlik ara':category==='outages'?'Kesinti ara':'Yer ara'} placeholder={searchMode==='traffic'?'Cadde veya yer ara':searchMode==='prices'?'Ürün veya marka ara':category==='transit'?'Durak veya hat ara':category==='events'?'Etkinlik veya mekan ara':category==='outages'?'İlçe veya mahalle ara':`${LABELS[category]} ara`} value={pilot?activeSearch:search} onChange={e=>{setSectionSearch(v=>({...v,[searchMode]:e.target.value}));setSearch(e.target.value);}}/>{(pilot?activeSearch:search) && <button onClick={()=>{setSearch('');setSectionSearch(v=>({...v,[searchMode]:''}));}} aria-label="Aramayı temizle"><X size={18}/></button>}</label>}
        <CategoryRail value={category} onChange={c=>{setCategory(c);setSearch(sectionSearch[c]||'');setSelected(null);if(c==="fishing"||c==="transit"||c==="events"||c==="outages")setMapOpen(false);setPicking(false);}}/>
        {category==='all'&&location&&!mapOpen&&!picking&&<Suspense fallback={null}><WeatherSummary location={location}/></Suspense>}
        {category==='market'&&<div className="pharmacy-filter"><button aria-pressed={!productMode} onClick={()=>{setProductMode(false);setSearch(sectionSearch.market||'');}}>Marketler</button><button aria-pressed={productMode} onClick={()=>{setProductMode(true);setMapOpen(false);}}>Ürün fiyatları</button></div>}
        {(category==='pharmacy'||category==='duty') && <div className="pharmacy-filter" aria-label="Eczane filtresi"><button aria-pressed={category==='pharmacy'} onClick={()=>setCategory('pharmacy')}>Tümü</button><button aria-pressed={category==='duty'} onClick={()=>setCategory('duty')}>Nöbetçi</button></div>}
        {((!location&&!pilot) || picking || locationError) && <section className="state-card"><strong>{locationError?(location?'Konum güncellenemedi':'Konum alınamadı'):picking?'Haritada bir nokta seç':'Konum seç'}</strong>{locationError && <p role="alert">{locationError}{location?" · Önceki konum kullanılmaya devam ediyor.":""}</p>}<button className="solid-button" onClick={requestLocation} disabled={locating}>Konumumu kullan</button><button className="plain-button" onClick={chooseOnMap}>Haritadan seç</button></section>}
        {pilot&&!picking?<Suspense fallback={<div className="state-card">Hazırlanıyor…</div>}><PilotViews mode={category==='fishing'?'fishing':category==='transit'?'transit':category==='events'?'events':category==='outages'?'outages':'prices'} location={location} search={activeSearch} transitMode={transitMode} onTransitModeChange={setTransitMode} onChooseCoast={chooseCoast} pickedCoast={pickedCoast}/></Suspense>:mapOpen ? <div className="model-map"><Suspense fallback={<div className="state-card">Harita hazırlanıyor…</div>}><MapView location={location} places={DEMO&&["loading","error","empty"].includes(previewState)?[]:matchingPlaces} picking={picking} onPick={pick} onViewportChange={viewport} loading={loading}/></Suspense>{!picking&&<button className="map-list-button" onClick={()=>setMapOpen(false)}><List size={18}/>Liste · {visible.length}</button>}</div> : location && !picking ? <>
          <div className="results-toolbar"><span>{category==='duty'?`${new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',timeZone:'Europe/Istanbul'}).format(new Date())} · Nöbetçi`:LABELS[category]}</span><button onClick={()=>setMapOpen(true)}><MapPin size={18}/>Harita</button></div>
          {category==="duty" && dutyData.some(p=>p.source==="legacy-fallback") && <small className="data-note" role="status">Resmî listeye erişilemedi; kayıtlar Eczane Adresi alternatif kaynağından. Gitmeden önce telefonla doğrulayın.</small>}
          {loading && <div className="skeleton-list" role="status" aria-label="Yerler yükleniyor">{[1,2,3].map(i=><div className="skeleton-card" key={i}/>)}</div>}
          {failed && <div className="state-card" role="alert"><strong>Yerler alınamadı</strong><button className="plain-button" onClick={retry}>Tekrar dene</button></div>}
          {!loading&&!failed&&!visible.length && <div className="state-card"><strong>{category==='duty'?'Bu çevre için nöbetçi kaydı alınamadı':'Eşleşme bulunamadı'}</strong><button className="plain-button" onClick={()=>setMapOpen(true)}>Haritada ara</button></div>}
          <div className="places-list">{visible.slice(0,100).map(p=><button className="place-row" key={p.id} onClick={()=>setSelected(p)}><span className="place-symbol">{p.category==='duty'||p.category==='pharmacy'?<Cross size={25}/>:<MapPin size={23}/>}</span><span><strong>{p.name}</strong><small>{LABELS[p.category]} · {distanceLabel(p.distanceM)}</small><small>{p.address==='Adres bilgisi yok'?'':p.address}</small><PlaceFacts place={p} compact/></span><ChevronRight size={19}/></button>)}</div>
          {updating && visible.length>0 && <small className="data-note" role="status">Güncelleniyor…</small>}
          {(areaQuery.isError||supplementQuery.isError||municipalEnabled&&(municipalQuery.isError||municipalQuery.data?.partial)||isDiscovery&&discoveryQuery.isError)&&!failed&&visible.length>0&&<small className="data-note">Bazı kaynaklar alınamadı.</small>}
        </> : null}
      </main>
      {selected && <div className="detail-backdrop" onClick={()=>setSelected(null)}><section className="place-detail" role="dialog" aria-modal="true" aria-label={selected.name} onKeyDown={e=>{if(e.key==="Escape")setSelected(null);if(e.key==="Tab"){const nodes=e.currentTarget.querySelectorAll<HTMLElement>('button,a[href]');const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}} onClick={e=>e.stopPropagation()}><div className="detail-top"><h2>{selected.name}</h2><button autoFocus onClick={()=>setSelected(null)} aria-label="Kapat"><X size={22}/></button></div><p>{selected.address}</p><PlaceFacts place={selected}/><small>{distanceLabel(selected.distanceM)}{selected.distanceM!==undefined?" · yaklaşık":""}</small>{selected.source&&<small className="data-note">{selected.source==="legacy-fallback"?"Eczane Adresi · alternatif, resmî olmayan kaynak":selected.source}{selected.queryDate&&` · ${selected.queryDate}`}</small>}<div className="detail-buttons">{selected.phone&&!DEMO&&<a className="outline-button" href={`tel:${selected.phone}`}><Phone size={18}/>Ara</a>}{!DEMO&&Number.isFinite(selected.lat)&&Number.isFinite(selected.lng)&&<a className="solid-button" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"><Navigation size={18}/>Yol tarifi</a>}<button aria-label="Yeri kaydet" aria-pressed={savedIds.includes(selected.id)} onClick={()=>toggleSaved(selected.id)}><Heart size={20} fill={savedIds.includes(selected.id)?'currentColor':'none'}/></button></div></section></div>}
    </> : <main ref={workspace} className="secondary-workspace"><Suspense fallback={<div className="state-card">Yükleniyor…</div>}>{section==='news'?<NewsView/>:section==='games'?<GamesView onActiveChange={setGameActive}/>:<RadioView current={currentRadio} onSelect={setCurrentRadio}/>}</Suspense></main>}
    <RadioPlayer station={currentRadio} stations={radioQuery.data||[]} onSelect={setCurrentRadio} onClose={()=>setCurrentRadio(null)}/>
    {!playingGame && <nav className="model-nav" aria-label="Ana menü">{[{id:'nearby' as const,label:'Keşfet',Icon:Compass},{id:'news' as const,label:'Haber',Icon:Newspaper},{id:'radio' as const,label:'Radyo',Icon:Radio},{id:'games' as const,label:'Oyun',Icon:Gamepad2}].map(({id,label,Icon})=><button key={id} onClick={()=>setSection(id)} aria-current={section===id?'page':undefined}><Icon size={22}/><span>{label}</span></button>)}</nav>}
  </div>;
}
