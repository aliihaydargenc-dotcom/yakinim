import { useState } from 'react';
import { ArrowLeft, Blocks, Grid2X2, Brain, ChevronRight } from 'lucide-react';
const games=[{id:'blocks',title:'Düşen Bloklar',subtitle:'Bulmaca',Icon:Blocks},{id:'2048',title:'2048',subtitle:'Sayı oyunu',Icon:Grid2X2},{id:'memory',title:'Hafıza',subtitle:'Desen eşleştirme',Icon:Brain}];
export function GamesView(){
 const [selected,setSelected]=useState<string|null>(null);
 const game=games.find(g=>g.id===selected);
 return <section className="content-screen">{game?<><div className="game-heading"><button aria-label="Oyunlara dön" onClick={()=>setSelected(null)}><ArrowLeft size={20}/></button><h2>{game.title}</h2></div><iframe className="game-frame" title={game.title} src={`/games/${game.id}/index.html`} sandbox="allow-scripts allow-same-origin"/><a className="game-license" href={`/games/${game.id}/LICENSE`} target="_blank" rel="noreferrer">Kaynak ve lisans</a></>:<><div className="screen-heading"><h2>Oyun</h2></div>{games.map(({id,title,subtitle,Icon})=><button key={id} className="game-tile" onClick={()=>setSelected(id)}><span><Icon size={27}/></span><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronRight size={19}/></button>)}</>}</section>;
}
