import { useEffect, useState } from 'react';
import { ArrowLeft, Blocks, Grid2X2, Brain, ChevronRight } from 'lucide-react';
const games=[{id:'blocks',title:'Düşen Bloklar',subtitle:'Bulmaca',Icon:Blocks},{id:'2048',title:'2048',subtitle:'Sayı oyunu',Icon:Grid2X2},{id:'memory',title:'Hafıza',subtitle:'Desen eşleştirme',Icon:Brain}];
export function GamesView({onActiveChange}:{onActiveChange:(active:boolean)=>void}){
 const [selected,setSelected]=useState<string|null>(null);
 const game=games.find(g=>g.id===selected);
 useEffect(()=>{
  const close=()=>{setSelected(null);onActiveChange(false);};
  window.addEventListener('popstate',close);
  return ()=>{window.removeEventListener('popstate',close);onActiveChange(false);};
 },[onActiveChange]);
 function open(id:string){
  window.history.pushState({...window.history.state,yakinimGame:id},'',window.location.href);
  setSelected(id);onActiveChange(true);
 }
 function back(){
  if(window.history.state?.yakinimGame)window.history.back();
  else{setSelected(null);onActiveChange(false);}
 }
 return <section className={`content-screen ${game?'game-screen':''}`}>{game?<><div className="game-heading"><button aria-label="Oyunlara dön" onClick={back}><ArrowLeft size={20}/></button><h2>{game.title}</h2><a className="game-license" href={`/games/${game.id}/LICENSE`} target="_blank" rel="noreferrer" aria-label="Kaynak ve lisans">Lisans</a></div><iframe className="game-frame" title={game.title} src={`/games/${game.id}/index.html`} sandbox="allow-scripts allow-same-origin"/></>:<><div className="screen-heading"><h2>Oyun</h2></div>{games.map(({id,title,subtitle,Icon})=><button key={id} className="game-tile" onClick={()=>open(id)}><span><Icon size={27}/></span><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronRight size={19}/></button>)}</>}</section>;
}
