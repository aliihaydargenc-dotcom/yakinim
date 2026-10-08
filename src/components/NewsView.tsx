import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Newspaper } from "lucide-react";
import { fetchNews } from "../services/api";

const CATEGORIES = [["gundem", "Gündem"], ["turkiye", "Türkiye"], ["dunya", "Dünya"], ["ekonomi", "Ekonomi"], ["teknoloji", "Teknoloji"], ["yasam", "Yaşam"]] as const;

export function NewsView() {
  const [category, setCategory] = useState("gundem");
  const query = useQuery({ queryKey: ["news", category], queryFn: () => fetchNews(category), staleTime: 4 * 60 * 1000, refetchInterval: 5 * 60 * 1000 });
  return (
    <section className="content-screen">
      <div className="screen-heading"><h2>Haber</h2></div>
      <div className="news-tabs">{CATEGORIES.map(([id, label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}</div>
      {query.isPending && <SkeletonList />}
      {query.isError && <div className="state-card"><strong>Haberler alınamadı</strong><button className="plain-button" onClick={()=>void query.refetch()}>Tekrar dene</button></div>}
      <div className="news-list">{query.data?.map((item) => <a key={item.id} className="news-card" href={item.url} target="_blank" rel="noreferrer" title={item.title}><NewsThumbnail key={item.imageUrl} src={item.imageUrl}/><div className="news-copy"><span>{item.source}</span><h3>{item.title}</h3><small>{formatDate(item.publishedAt)}</small></div><ExternalLink className="news-link-icon" size={18} aria-hidden="true" /></a>)}</div>
    </section>
  );
}

function NewsThumbnail({src}:{src?:string}) {
  const [failed,setFailed]=useState(false);
  return <div className="news-thumbnail" aria-hidden="true">{src&&!failed?<img src={src} alt="" width={80} height={80} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<Newspaper size={25}/>}</div>;
}

function formatDate(value: string | null) { if (!value) return "Tarih yok"; if(!Number.isFinite(Date.parse(value))) return "Tarih yok"; return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }).format(new Date(value)); }
function SkeletonList() { return <div className="skeleton-list">{[0,1,2,3].map((i) => <div key={i} className="skeleton-card" />)}</div>; }
function StateCard({ title, body }: { title: string; body: string }) { return <div className="state-card"><strong>{title}</strong><p>{body}</p></div>; }
