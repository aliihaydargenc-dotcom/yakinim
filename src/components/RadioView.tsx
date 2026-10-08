import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Search, Volume2, Radio } from "lucide-react";
import { fetchRadio } from "../services/api";
import type { RadioStation } from "../types";

export function RadioView({ current, onSelect }: { current: RadioStation | null; onSelect: (station: RadioStation) => void }) {
  const [search, setSearch] = useState("");
  const [filter,setFilter]=useState("all");
  const query = useQuery({ queryKey: ["radio"], queryFn: fetchRadio, staleTime: 5 * 60 * 1000 });
  const stations = useMemo(() => (query.data || []).filter((station) => station.name.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")) && (filter==="all" || (filter==="news" ? /haber|news|talk/i.test([station.name,...(station.tags||[])].join(" ")) : /music|müzik|pop|rock|jazz|turk|türk|classic/i.test((station.tags||[]).join(" "))))).slice(0, 50), [query.data, search,filter]);
  return (
    <section className="content-screen radio-screen">
      <div className="screen-heading"><h2>Radyo</h2></div>
      <label className="search-box"><Search size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İstasyon ara" aria-label="Radyo istasyonu ara" /></label>
      <div className="news-tabs">{[["all","Tümü"],["music","Müzik"],["news","Haber"]].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
      {query.isPending && <div className="skeleton-list">{[0,1,2,3].map((i) => <div key={i} className="skeleton-card compact" />)}</div>}
      {query.isError && <div className="state-card"><strong>Radyolar alınamadı</strong><p>Biraz sonra yeniden dene.</p></div>}
      {!query.isPending && !query.isError && stations.length === 0 && <div className="state-card"><strong>İstasyon bulunamadı</strong><p>Arama ifadesini değiştirip yeniden dene.</p></div>}
      <div className="station-list">{stations.map((station, index) => {
        const active = current?.id === station.id;
        return <button key={station.id} type="button" className={active ? "station-card is-playing" : "station-card"} onClick={() => onSelect(station)} aria-pressed={active}>
          <span className="station-rank"><Radio size={24}/></span>
          <span className="station-copy"><strong>{station.name}</strong><small>{[station.codec, station.bitrate ? `${station.bitrate} kbps` : "", ""].filter(Boolean).join(" · ")}</small></span>
          <span className="station-play" aria-hidden="true">{active ? <Volume2 size={19} /> : <Play size={18} fill="currentColor" />}</span>
        </button>;
      })}</div>
    </section>
  );
}
