import type {Map as MapLibreMap} from 'maplibre-gl';

const styles:Record<string,{color:string;letter:string}>={
  transit:{color:'#3566a0',letter:'D'},market:{color:'#426c8d',letter:'M'},food:{color:'#b16b43',letter:'Y'},
  cafe:{color:'#906b53',letter:'K'},pharmacy:{color:'#c45161',letter:'+'},duty:{color:'#c45161',letter:'+'},
  atm:{color:'#525ba6',letter:'₺'},parking:{color:'#587581',letter:'P'},park:{color:'#47856e',letter:'A'},
  fuel:{color:'#776392',letter:'A'},hospital:{color:'#c45161',letter:'+'},bakery:{color:'#a47a47',letter:'F'},
  beach:{color:'#3b91a6',letter:'S'},shopping:{color:'#57728a',letter:'A'},greengrocer:{color:'#53856a',letter:'M'},
  other:{color:'#607b7c',letter:'•'}
};
export function iconForCategory(category:string){return 'poi-'+(Object.hasOwn(styles,category)?category:'other');}
export function registerMapIcons(map:MapLibreMap){
  for(const [key,style] of Object.entries(styles)){
    const name='poi-'+key;
    if(map.hasImage(name))continue;
    const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
    const ctx=canvas.getContext('2d');
    if(!ctx)continue;
    ctx.clearRect(0,0,48,48);
    ctx.beginPath();ctx.arc(24,24,20,0,Math.PI*2);ctx.fillStyle=style.color;ctx.fill();
    ctx.strokeStyle='white';ctx.lineWidth=2.3;ctx.lineCap='round';ctx.lineJoin='round';
    const line=(...coords:number[])=>{ctx.beginPath();ctx.moveTo(coords[0],coords[1]);for(let i=2;i<coords.length;i+=2)ctx.lineTo(coords[i],coords[i+1]);ctx.stroke();};
    switch(key){
      case 'transit':
        ctx.strokeRect(14,16,20,15);line(14,21,34,21);line(18,32,18,34);line(30,32,30,34);break;
      case 'market':
        ctx.strokeRect(16,21,16,12);line(14,21,17,16,31,16,34,21);line(20,21,20,33);line(26,21,26,33);break;
      case 'food':
        line(17,15,17,34);line(14,15,14,23,20,23,20,15);line(30,15,30,34);ctx.beginPath();ctx.ellipse(30,19,3.5,5,0,0,Math.PI*2);ctx.stroke();break;
      case 'cafe':
        line(16,18,16,28,29,28,29,18,16,18);ctx.beginPath();ctx.arc(30,22,4,Math.PI*1.5,Math.PI/2);ctx.stroke();line(15,32,33,32);break;
      case 'pharmacy':case 'duty':case 'hospital':
        ctx.fillStyle='white';ctx.fillRect(21,14,6,20);ctx.fillRect(14,21,20,6);break;
      case 'park':
        line(24,20,24,34);ctx.beginPath();ctx.moveTo(24,13);ctx.lineTo(14,28);ctx.lineTo(34,28);ctx.closePath();ctx.stroke();break;
      case 'fuel':
        ctx.strokeRect(15,16,12,18);line(18,20,24,20);line(27,23,32,23,33,30,30,32);break;
      case 'parking':case 'atm':case 'other':case 'greengrocer':case 'shopping':case 'beach':case 'bakery':
      default:ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 21px sans-serif';ctx.fillText(style.letter,24,25);break;
    }
    map.addImage(name,ctx.getImageData(0,0,48,48),{pixelRatio:2});
  }
}
