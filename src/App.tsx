import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, LocateFixed, Map as MapIcon, MapPin, Newspaper, Radio, Search } from "lucide-react";
import { CategoryRail } from "./components/CategoryRail";
import { MapView } from "./components/MapView";
import { NewsView } from "./components/NewsView";
import { PlaceCard } from "./components/PlaceCard";
import { RadioPlayer } from "./components/RadioPlayer";
import { RadioView } from "./components/RadioView";
import { fetchDuty, fetchViewportExpanded, fetchViewportQuick } from "./services/api";
import { useAppStore } from "./store";
import type { Coordinates, Place, RadioStation, Section } from "./types";

type SortMode = "distance" | "name";
const MAX_LIST_RESULTS = 200;

export default function App() {
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const category = useAppStore((s) => s.category);
  const setCategory = useAppStore((s) => s.setCategory);
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const location = useAppStore((s) => s.location);
  const setLocation = useAppStore((s) => s.setLocation);
  const locationLabel = useAppStore((s) => s.locationLabel);
  const locationError = useAppStore((s) => s.locationError);
  const setLocationError = useAppStore((s) => s.setLocationError);
  const pickingLocation = useAppStore((s) => s.pickingLocation);
  const setPickingLocation = useAppStore((s) => s.setPickingLocation);
  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const [locating, setLocating] = useState(false);
  const [currentRadio, setCurrentRadio] = useState<RadioStation | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  const [mapCenter, setMapCenter] = useState<Coordinates | null>(location);
  const lastAppliedLocationRef = useRef<Coordinates | null>(location);
  const bestAccuracyRef = useRef(Number.POSITIVE_INFINITY);

  useEffect(() => {
    if (!location) {
      setMapCenter(null);
      lastAppliedLocationRef.current = null;
      return;
    }
    lastAppliedLocationRef.current = location;
    setMapCenter(location);
  }, [location?.lat, location?.lng]);

  const queryCenter = section === "map" ? (mapCenter || location) : location;
  const viewportQuickQuery = useQuery({
    queryKey: ["viewport-quick", queryCenter?.lat.toFixed(3), queryCenter?.lng.toFixed(3)],
    queryFn: () => fetchViewportQuick(queryCenter as Coordinates),
    enabled: Boolean(queryCenter),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const viewportExpandedQuery = useQuery({
    queryKey: ["viewport-expanded", queryCenter?.lat.toFixed(3), queryCenter?.lng.toFixed(3)],
    queryFn: () => fetchViewportExpanded(queryCenter as Coordinates, viewportQuickQuery.data || []),
    enabled: Boolean(queryCenter && viewportQuickQuery.isFetched),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const dutyQuery = useQuery({
    queryKey: ["duty", queryCenter?.lat.toFixed(3), queryCenter?.lng.toFixed(3)],
    queryFn: () => fetchDuty(queryCenter as Coordinates),
    enabled: Boolean(queryCenter && category === "duty"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const viewportData = (viewportExpandedQuery.data?.length ? viewportExpandedQuery.data : viewportQuickQuery.data) || [];
  const places = useMemo(() => {
    const source = category === "duty" ? (dutyQuery.data || []) : viewportData;
    const withUserDistance = location
      ? source.map((place) => ({ ...place, distanceM: Math.round(distanceMeters(location, place)) }))
      : source;
    const term = search.trim().toLocaleLowerCase("tr");
    const filtered = withUserDistance.filter((place) => (category === "all" || place.category === category) && (!term || `${place.name} ${place.address}`.toLocaleLowerCase("tr").includes(term)));
    return [...filtered].sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
      return (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
    });
  }, [category, search, sortMode, viewportData, dutyQuery.data, location?.lat, location?.lng]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("Bu tarayıcı konum özelliğini desteklemiyor.");
      return;
    }
    setLocating(true);
    setLocationError("");
    let settled = false;
    let failures = 0;

    const applyPosition = (position: GeolocationPosition, precise: boolean) => {
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      const accuracy = Number(position.coords.accuracy) || Number.POSITIVE_INFINITY;
      const previous = lastAppliedLocationRef.current;
      const movedM = previous ? distanceMeters(previous, coords) : Number.POSITIVE_INFINITY;
      const meaningfullyBetter = accuracy + 5 < bestAccuracyRef.current;
      if (!previous || meaningfullyBetter || movedM > 60) {
        bestAccuracyRef.current = Math.min(bestAccuracyRef.current, accuracy);
        lastAppliedLocationRef.current = coords;
        setLocation(coords, precise ? "Konum hazır" : "Konum bulundu");
        setMapCenter(coords);
      }
      if (!settled) {
        settled = true;
        setLocating(false);
      }
    };

    const handleFailure = () => {
      failures += 1;
      if (failures < 2 || settled) return;
      setLocationError("Konum alınamadı. Haritadan bir nokta seçebilirsin.");
      setLocating(false);
    };

    navigator.geolocation.getCurrentPosition(
      (position) => applyPosition(position, false),
      handleFailure,
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 5 * 60 * 1000 },
    );
    navigator.geolocation.getCurrentPosition(
      (position) => applyPosition(position, true),
      handleFailure,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }

  function startManualPick() {
    setPickingLocation(true);
    setSection("map");
  }

  function pickLocation(coords: Coordinates) {
    lastAppliedLocationRef.current = coords;
    bestAccuracyRef.current = Number.POSITIVE_INFINITY;
    setLocation(coords, "Haritadan seçilen konum");
    setMapCenter(coords);
    setPickingLocation(false);
  }

  function handleMapViewportChange(coords: Coordinates) {
    if (!location || pickingLocation) return;
    setMapCenter((current) => {
      if (current && current.lat.toFixed(3) === coords.lat.toFixed(3) && current.lng.toFixed(3) === coords.lng.toFixed(3)) return current;
      return coords;
    });
  }

  const viewportLoading = viewportQuickQuery.isPending && !viewportQuickQuery.data;
  const viewportError = viewportQuickQuery.isError && viewportExpandedQuery.isError;
  const viewportRefreshing = (viewportQuickQuery.isFetching || viewportExpandedQuery.isFetching) && !viewportLoading;
  const loadingPlaces = category === "duty" ? dutyQuery.isPending : viewportLoading;
  const errorPlaces = category === "duty" ? dutyQuery.isError : viewportError;
  const refreshingMap = section === "map" && (category === "duty" ? dutyQuery.isFetching && !dutyQuery.isPending : viewportRefreshing);

  return (
    <div className={currentRadio ? "app-frame has-radio-player" : "app-frame"}>
      <header className="app-header">
        <button type="button" className="brand" onClick={() => setSection("nearby")} aria-label="Yakınım ana ekran">
          <span className="brand-mark">y.</span><span><strong>Yakınım</strong><small>{locationLabel}</small></span>
        </button>
        <button type="button" className={locating ? "location-control is-locating" : "location-control"} onClick={requestLocation} disabled={locating}><LocateFixed size={19} /><span>{locating ? "Bulunuyor" : "Konumum"}</span></button>
      </header>

      {section === "nearby" && <main className="nearby-screen">
        <section className="hero-copy"><p>YAKIN ÇEVRE</p><h1>Şu anda sana ne lazım?</h1><span>Yakındaki doğru yeri mümkün olan en hızlı şekilde bul.</span></section>
        <label className="search-box"><Search size={20} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Yer veya kategori ara" aria-label="Yakındaki yerlerde ara" /></label>
        <CategoryRail value={category} onChange={setCategory} />

        {!location && <section className="location-gate"><div className="gate-icon"><MapPin size={24} /></div><div><strong>Çevreni aç</strong><p>Yakındaki yerleri görmek için konumunu kullan veya haritadan bir nokta seç.</p></div><div className="gate-actions"><button type="button" className="primary-button" onClick={requestLocation} disabled={locating}>{locating ? "Konum bulunuyor…" : "Konumumu kullan"}</button><button type="button" className="secondary-button" onClick={startManualPick}>Haritadan seç</button></div>{locationError && <p className="inline-error">{locationError}</p>}</section>}

        {location && <section className="results-section"><div className="results-heading"><div><p>YAKININDA</p><h2>{resultTitle(category)}</h2></div><button type="button" className="map-shortcut" onClick={() => setSection("map")}><MapIcon size={17} /> Harita</button></div>
          {!loadingPlaces && !errorPlaces && <div className="results-meta"><span>{places.length} sonuç{viewportRefreshing && category !== "duty" ? " · çevre genişletiliyor" : ""}</span><div className="sort-toggle" role="group" aria-label="Sonuç sıralaması"><button type="button" aria-pressed={sortMode === "distance"} onClick={() => setSortMode("distance")}>Yakın</button><button type="button" aria-pressed={sortMode === "name"} onClick={() => setSortMode("name")}>A-Z</button></div></div>}
          {loadingPlaces && <SkeletonResults />}
          {errorPlaces && <div className="state-card"><strong>Yakındaki yerler alınamadı</strong><p>Bağlantıyı kontrol edip tekrar dene veya haritada başka bir alan seç.</p></div>}
          {!loadingPlaces && !errorPlaces && places.length === 0 && <div className="state-card"><strong>Bu alanda sonuç yok</strong><p>Başka bir kategori seç veya haritada biraz uzaklaş.</p></div>}
          <div className="places-list">{places.slice(0, MAX_LIST_RESULTS).map((place) => <PlaceCard key={place.id} place={place} saved={savedIds.includes(place.id)} onToggleSaved={() => toggleSaved(place.id)} />)}</div>
        </section>}
      </main>}

      {section === "map" && <main className="map-screen">
        <div className="map-category-dock"><CategoryRail value={category} onChange={setCategory} variant="map" /></div>
        <div className="map-toolbar"><button type="button" onClick={() => setSection("nearby")}>Liste</button><div className="map-toolbar-actions">{location && <span className={refreshingMap ? "map-result-count is-loading" : "map-result-count"}>{refreshingMap ? <><span className="mini-spinner" /> Yenileniyor</> : `${places.length} yer`}</span>}<button type="button" className={pickingLocation ? "is-active" : ""} onClick={() => setPickingLocation(!pickingLocation)}>{pickingLocation ? "Seçimi kapat" : "Nokta seç"}</button></div></div>
        <div className="map-surface"><MapView location={location} places={places} picking={pickingLocation} onPick={pickLocation} onViewportChange={handleMapViewportChange} loading={loadingPlaces || refreshingMap} loadingText={loadingPlaces ? "Çevre taranıyor" : "Yeni alan yükleniyor"} /></div>
      </main>}
      {section === "news" && <NewsView />}
      {section === "radio" && <RadioView current={currentRadio} onSelect={setCurrentRadio} />}

      <RadioPlayer station={currentRadio} onClose={() => setCurrentRadio(null)} />
      <BottomNav section={section} onChange={setSection} />
    </div>
  );
}

function resultTitle(category: string) {
  return ({ all: "Tüm yerler", duty: "Nöbetçi eczaneler", market: "Marketler", food: "Yemek", cafe: "Kafeler", atm: "ATM'ler", pharmacy: "Eczaneler", hospital: "Sağlık", fuel: "Akaryakıt", parking: "Otopark", park: "Parklar", bakery: "Fırınlar", greengrocer: "Manavlar", shopping: "Alışveriş" } as Record<string, string>)[category] || "Yakındaki yerler";
}

function distanceMeters(a: Coordinates, b: Coordinates) {
  const r = 6371000;
  const p1 = a.lat * Math.PI / 180;
  const p2 = b.lat * Math.PI / 180;
  const dp = (b.lat - a.lat) * Math.PI / 180;
  const dl = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function BottomNav({ section, onChange }: { section: Section; onChange: (section: Section) => void }) {
  const items = [
    { id: "nearby" as const, label: "Yakınım", Icon: Compass },
    { id: "map" as const, label: "Harita", Icon: MapIcon },
    { id: "news" as const, label: "Haber", Icon: Newspaper },
    { id: "radio" as const, label: "Radyo", Icon: Radio },
  ];
  return <nav className="bottom-nav" aria-label="Ana navigasyon">{items.map(({ id, label, Icon }) => <button key={id} type="button" className={section === id ? "is-active" : ""} onClick={() => onChange(id)} aria-current={section === id ? "page" : undefined}><Icon size={21} /><span>{label}</span></button>)}</nav>;
}

function SkeletonResults() { return <div className="skeleton-list">{[0,1,2].map((item) => <div key={item} className="skeleton-card" />)}</div>; }
