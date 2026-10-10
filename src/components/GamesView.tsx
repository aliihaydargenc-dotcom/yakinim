import {useEffect,useState} from 'react';
import {ArrowLeft,Blocks,Grid2X2,Brain,Worm,Bomb,BookOpen} from 'lucide-react';

const games=[
 {id:'2048',title:'2048',kind:'Zekâ',Icon:Grid2X2,legacy:true},
 {id:'blocks',title:'Düşen Bloklar',kind:'Arcade',Icon:Blocks,legacy:true},
 {id:'memory',title:'Hafıza',kind:'Zekâ',Icon:Brain,legacy:true},
 {id:'snake',title:'Yılan',kind:'Arcade',Icon:Worm,legacy:true},
 {id:'mines',title:'Mayın Tarlası',kind:'Zekâ',Icon:Bomb,legacy:true},
 {id:'words',title:'Kelime Tahmini',kind:'Zekâ',Icon:BookOpen,legacy:false},
];
export function GamesView({onActiveChange}:{onActiveChange:(active:boolean)=>void}){
 const [selected,setSelected]=useState<string|null>(null);
 const game=games.find(g=>g.id===selected);
 useEffect(()=>{
  const close=()=>{setSelected(null);onActiveChange(false);};
  window.addEventListener('popstate',close);
  return ()=>{window.removeEventListener('popstate',close);onActiveChange(false);};
 },[onActiveChange]);
 function open(id:string){
  if(selected)return;
  window.history.pushState({...window.history.state,yakinimGame:id},'',window.location.href);
  setSelected(id);onActiveChange(true);
 }
 function back(){
  if(window.history.state?.yakinimGame)window.history.back();
  else{setSelected(null);onActiveChange(false);}
 }
 return <section className={`content-screen ${game?'game-screen':''}`}>
  {game?<div className="game-play-layout">
    <div className="game-heading"><button aria-label="Oyunlara dön" onClick={back}><ArrowLeft size={20}/></button><h2>{game.title}</h2>
    {game.legacy&&<a className="game-license" href={`/games/${game.id}/LICENSE`} target="_blank" rel="noreferrer" aria-label="Kaynak ve lisans">Lisans</a>}</div>
    <iframe key={game.id} className="game-frame" title={game.title} src={`/games/${game.id}/index.html`} sandbox="allow-scripts allow-same-origin" loading="eager"/>
   </div>:
   <><div className="screen-heading game-library-heading"><h2>Oyunlar</h2></div>
    <div className="game-library-grid" aria-label="Oyun kütüphanesi">
      {games.map(({id,title,kind,Icon})=><button key={id} className="game-library-card" onClick={()=>open(id)} aria-label={`${title} oyununu aç`}>
        <span className="game-library-icon"><Icon size={29} strokeWidth={1.8}/></span>
        <strong>{title}</strong><small>{kind}</small>
      </button>)}
    </div>
   </>}
 </section>;
}
