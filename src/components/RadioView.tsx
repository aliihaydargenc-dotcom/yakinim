import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchRadio } from "../services/api";
import type { RadioStation } from "../types";

export function RadioView() {
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState<RadioStation | null>(null);
  const query = useQuery({ queryKey: ["radio"], queryFn: fetchRadio, staleTime: 5 * 60 * 1000 });
  const stations = useMemo(() => (query.data || []).filter((station) => station.name.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"))).slice(0, 50), [query.data, search]);
  return (
    <section className="content-screen radio-screen">
      <div className="screen-heading"><p>CANLI</p><h2>Radyo</h2><span>Doğrulanmış Türkiye istasyonları.</span></div>
      <label className="search-box"><Search size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İstasyon ara" aria-label="Radyo istasyonu ara" /></label>
      {query.isPending && <div className="skeleton-list">{[0,1,2,3].map((i) => <div key={i} className="skeleton-card compact" />)}</div>}
      {query.isError && <div className="state-card"><strong>Radyolar alınamadı</strong><p>Biraz sonra yeniden dene.</p></div>}
      <div className="station-list">{stations.map((station, index) => <button key={station.id} type="button" className={current?.id === station.id ? "station-card is-playing" : "station-card"} onClick={() => setCurrent(station)}><span className="station-rank">{station.measuredRank || index + 1}</span><span className="station-copy"><strong>{station.name}</strong><small>{[station.codec, station.bitrate ? `${station.bitrate} kbps` : "", station.liveVerified ? "Canlı doğrulandı" : ""].filter(Boolean).join(" · ")}</small></span><span className="station-play">▶</span></button>)}</div>
      {current && <div className="radio-dock"><div><small>Şimdi çalıyor</small><strong>{current.name}</strong></div><audio src={current.streamUrl} controls autoPlay /></div>}
    </section>
  );
}
