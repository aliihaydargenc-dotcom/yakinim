import {useEffect,useState} from 'react';
import {ArrowLeft,ChevronRight,MapPin,Bookmark,Navigation,Trash2} from 'lucide-react';
import App from './App';
import {useAppStore} from './store';
import {tabs,services,mediaLinks,type Tab,type Service,type Media} from './components/shell/catalog';
import type {Place} from './types';
import './shell.css';

export default function AppShell(){
 const [tab,setTab]=useState<Tab>('explore');
 const [service,setService]=useState<Service|null>(null);
 const [media,setMedia]=useState<Media|null>(null);
 const [playing,setPlaying]=useState(false);
 const [desktop,setDesktop]=useState(()=>window.matchMedia('(min-width:1100px)').matches);
 const {setSection,setCategory,setSearch,savedIds,savedPlaces,toggleSaved}=useAppStore();
 useEffect(()=>{const q=window.matchMedia('(min-width:1100px)');const change=()=>setDesktop(q.matches);q.addEventListener('change',change);return()=>q.removeEventListener('change',change);},[]);
 function navigate(next:Tab){setTab(next);setService(null);setMedia(null);setPlaying(false);setSection(next==='map'?'map':'nearby');if(next==='services'||next==='map'||next==='explore'&&service){setCategory('all');setSearch('');}}
 function openService(next:Service){setSearch('');if(next==='transit'){setTab('map');setService(null);setSection('map');setCategory('transit');return;}setService(next);setSection('nearby');setCategory(next==='prices'?'market':next==='traffic'?'transit':next);}
 function openMedia(next:Media){setMedia(next);setSection(next);}
 const appVisible=tab==='explore'||tab==='map'||tab==='services'&&!!service||tab==='more'&&!!media;
 const unresolved=savedIds.filter(id=>!savedPlaces.some(p=>p.id===id));
 const navigation=(variant:string)=><nav className={`shell-nav shell-nav--${variant}`} aria-label="Ana menü">{tabs.map(({id,label,Icon})=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={22}/><span>{label}</span></button>)}</nav>;
 return <div data-tab={tab} className={`shell-app ${playing?'shell-playing':''}`}>
  <aside className="shell-sidebar"><div className="shell-brand"><span><MapPin size={23}/></span>yakınım<span className="shell-period">.</span></div>{navigation('desktop')}<div className="shell-sidebar-note">Yakındaki yerler ve şehir hizmetleri.<br/>Konumunu sen seç.</div></aside>
  <div className="shell-body">
   {(!appVisible||tab==='more')&&<header className="shell-header"><strong className="brand-lockup"><span className="brand-mark"><MapPin size={22}/></span>yakınım<span className="brand-period">.</span></strong></header>}
   {(service||media)&&<div className="shell-backbar"><button onClick={()=>{setService(null);setMedia(null);setSection('nearby');}}><ArrowLeft size={18}/>{tab==='services'?'Hizmetler':'Diğer'}</button></div>}
   <div className={!appVisible?'shell-hidden':undefined}><App embedded splitMap={desktop&&tab==='explore'} service={service} isVisible={appVisible} onGameActivity={setPlaying} onMapChange={map=>{if(tab==='explore'||tab==='map'){setTab(map?'map':'explore');setSection(map?'map':'nearby');}}}/></div>
   {tab==='services'&&!service&&<main className="shell-content"><small className="shell-eyebrow">GÜNLÜK HAYATI KOLAYLAŞTIR</small><h1>Şehir hizmetleri</h1><p>Fiyatlardan ulaşıma, ihtiyacın olan bilgiler bir arada.</p><div className="shell-service-grid">{services.map(({id,label,description,Icon})=><button key={id} onClick={()=>openService(id)}><span className="shell-card-icon"><Icon size={26}/></span><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={20}/></button>)}</div></main>}
   {tab==='more'&&!media&&<main className="shell-content"><small className="shell-eyebrow">BİR MOLA VER</small><h1>Diğer</h1><p>Gündemi takip et, radyonu aç veya kısa bir mola ver.</p><div className="shell-service-grid">{mediaLinks.map(({id,label,description,Icon})=><button key={id} onClick={()=>openMedia(id)}><span className="shell-card-icon"><Icon size={26}/></span><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={20}/></button>)}</div></main>}
   {tab==='saved'&&<main className="shell-content"><small className="shell-eyebrow">SANA ÖZEL</small><h1>Kaydedilen yerler</h1><p>Kaydettiğin yerler bu cihazda tutulur. Bilgiler kaydettiğin zamana aittir; nöbet ve uygunluk durumunu yeniden doğrula.</p>{!savedPlaces.length&&!savedIds.length&&<div className="state-card"><Bookmark size={28}/><strong>Henüz kaydedilen yer yok</strong><p>Yer detayındaki kalp düğmesiyle bir yeri kaydedebilirsin.</p><button className="solid-button" onClick={()=>navigate('explore')}>Yerleri keşfet</button></div>}<div className="shell-saved-list">{savedPlaces.filter(p=>savedIds.includes(p.id)).map(place=><SavedPlace key={place.id} place={place} onRemove={()=>toggleSaved(place.id,undefined,!new URLSearchParams(window.location.search).has('preview'))}/> )}</div>{unresolved.length>0&&<div className="state-card"><strong>{unresolved.length} eski kaydın ayrıntıları henüz alınmadı</strong><p>Yer keşfinde tekrar bulunduğunda ayrıntıları burada görünecek.</p><button className="outline-button" onClick={()=>navigate('explore')}>Keşfe dön</button></div>}</main>}
  </div>
  {!playing&&navigation('mobile')}
 </div>;
}
function SavedPlace({place,onRemove}:{place:Place;onRemove:()=>void}){return <article className="shell-saved-place"><span className="shell-card-icon"><MapPin size={24}/></span><div><h2>{place.name}</h2><p>{place.address}</p><div className="shell-saved-actions"><a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noreferrer"><Navigation size={16}/>Yol tarifi</a><button aria-label={`${place.name} kaydını kaldır`} onClick={onRemove}><Trash2 size={16}/>Kaldır</button></div></div></article>}
