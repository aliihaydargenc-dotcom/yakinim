import {useEffect,useState} from 'react';
import {useBackLayer} from './hooks/useBackLayer';
import {ArrowLeft,ChevronRight,MapPin,Bookmark,Navigation,Trash2} from 'lucide-react';
import App from './App';
import {useAppStore} from './store';
import {tabs,services,categories,mediaLinks,type Tab,type Service,type Media} from './components/shell/catalog';
import type {CategoryId,Place} from './types';
import './shell.css';

export default function AppShell(){
 const [tab,setTab]=useState<Tab>('explore');
 const [service,setService]=useState<Service|null>(null);
 const [media,setMedia]=useState<Media|null>(null);
 const [playing,setPlaying]=useState(false);
 const {setSection,setCategory,search,setSearch,savedIds,savedPlaces,toggleSaved}=useAppStore();
 function closeSubpage(){setService(null);setMedia(null);setSection('nearby');setCategory('all');setSearch('');}
 useBackLayer(!!service||!!media,closeSubpage);
 useEffect(()=>{window.scrollTo(0,0);},[tab,service,media]);
 function navigate(next:Tab){setTab(next);setService(null);setMedia(null);setPlaying(false);setSection('nearby');setCategory('all');setSearch('');}
 function openService(next:Service,category:CategoryId='all',term=''){setService(next);setSection('nearby');setSearch(term);setCategory(next==='prices'?'market':next==='places'?category:next);}
 function openMedia(next:Media){setMedia(next);setSection(next);}
 const appVisible=tab==='explore'||tab==='services'&&!!service||tab==='more'&&!!media;
 const unresolved=savedIds.filter(id=>!savedPlaces.some(p=>p.id===id));
 const navigation=(variant:string)=><nav className={`shell-nav shell-nav--${variant}`} aria-label="Ana menü">{tabs.map(({id,label,Icon})=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={22}/><span>{label}</span></button>)}</nav>;
 return <div data-tab={tab} className={`shell-app ${playing?'shell-playing':''}`}>
  <aside className="shell-sidebar"><div className="shell-brand"><span><MapPin size={23}/></span>yakınım<span className="shell-period">.</span></div>{navigation('desktop')}</aside>
  <div className="shell-body">
   {(!appVisible||tab==='more')&&<header className="shell-header"><strong className="brand-lockup"><span className="brand-mark"><MapPin size={22}/></span>yakınım<span className="brand-period">.</span></strong></header>}
   {media&&<div className="shell-backbar"><button onClick={closeSubpage}><ArrowLeft size={18}/>{tab==='services'?'Hizmetler':'Diğer'}</button></div>}
   <div className={`shell-app-host ${!appVisible?'shell-hidden':''}`}><App embedded homeMap={tab==='explore'} onBack={service?closeSubpage:undefined} service={service} isVisible={appVisible} onGameActivity={setPlaying} onMapChange={map=>setSection(map?'map':'nearby')}/></div>
   {tab==='services'&&!service&&<main className="shell-content"><h1>Hizmetler</h1><form className="service-search search-box" onSubmit={e=>{e.preventDefault();openService('places','all',search);}}><MapPin size={19}/><input aria-label="Yer ara" placeholder="Yer ara" value={search} onChange={e=>setSearch(e.target.value)}/><button aria-label="Ara" type="submit"><ChevronRight size={20}/></button></form><div className="shell-service-grid">{services.map(({id,label,Icon})=><button key={id} onClick={()=>openService(id)}><span className="shell-card-icon"><Icon size={22}/></span><strong>{label}</strong><ChevronRight size={18}/></button>)}</div><div className="service-category-grid">{categories.filter(c=>c.id!=='all').map(({id,label,Icon})=><button key={id} onClick={()=>openService('places',id)}><Icon size={21}/><span>{label}</span></button>)}</div></main>}
   {tab==='more'&&!media&&<main className="shell-content"><h1>Diğer</h1><div className="shell-service-grid">{mediaLinks.map(({id,label,Icon})=><button key={id} onClick={()=>openMedia(id)}><span className="shell-card-icon"><Icon size={26}/></span><span><strong>{label}</strong></span><ChevronRight size={20}/></button>)}</div></main>}
   {tab==='saved'&&<main className="shell-content"><h1>Kaydedilen yerler</h1>{!savedPlaces.length&&!savedIds.length&&<div className="state-card"><Bookmark size={28}/><strong>Henüz kaydedilen yer yok</strong><button className="solid-button" onClick={()=>navigate('explore')}>Yerleri keşfet</button></div>}<div className="shell-saved-list">{savedPlaces.filter(p=>savedIds.includes(p.id)).map(place=><SavedPlace key={place.id} place={place} onRemove={()=>toggleSaved(place.id,undefined,!new URLSearchParams(window.location.search).has('preview'))}/> )}</div>{unresolved.length>0&&<div className="state-card"><strong>{unresolved.length} eski kaydın ayrıntıları henüz alınmadı</strong><button className="outline-button" onClick={()=>navigate('explore')}>Keşfe dön</button></div>}</main>}
  </div>
  {!playing&&navigation('mobile')}
 </div>;
}
function SavedPlace({place,onRemove}:{place:Place;onRemove:()=>void}){return <article className="shell-saved-place"><span className="shell-card-icon"><MapPin size={24}/></span><div><h2>{place.name}</h2><p>{place.address}</p><div className="shell-saved-actions"><a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noreferrer"><Navigation size={16}/>Yol tarifi</a><button aria-label={`${place.name} kaydını kaldır`} onClick={onRemove}><Trash2 size={16}/>Kaldır</button></div></div></article>}
