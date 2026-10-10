export type GeoPoint={lat:number;lng:number};
const METERS_PER_DEGREE=111195;
export function straightLineDistanceMeters(a:GeoPoint,b:GeoPoint):number{
 const rad=Math.PI/180,dy=(a.lat-b.lat)*METERS_PER_DEGREE;
 const dx=(a.lng-b.lng)*METERS_PER_DEGREE*Math.cos((a.lat+b.lat)*rad/2);
 return Math.hypot(dx,dy);
}
// Approximate road distance on the provider's ordered route shape.
// Reject off-route points and buses that have passed the selected stop.
export function distanceAlongRouteMeters(points:GeoPoint[],bus:GeoPoint,stop:GeoPoint):number|null{
 if(points.length<2||![bus.lat,bus.lng,stop.lat,stop.lng].every(Number.isFinite))return null;
 const cos=Math.cos(stop.lat*Math.PI/180),xy=(p:GeoPoint)=>({x:p.lng*METERS_PER_DEGREE*cos,y:p.lat*METERS_PER_DEGREE});
 const shape=points.map(xy),positions=[xy(bus),xy(stop)];
 const found=positions.map(pos=>{
  let traveled=0,closest={away:Infinity,along:0};
  for(let i=1;i<shape.length;i++){
   const a=shape[i-1],b=shape[i],dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy;
   const length=Math.sqrt(length2);
   if(length<0.001)continue;
   const t=Math.min(1,Math.max(0,((pos.x-a.x)*dx+(pos.y-a.y)*dy)/length2));
   const away=Math.hypot(pos.x-a.x-dx*t,pos.y-a.y-dy*t);
   if(away<closest.away)closest={away,along:traveled+t*length};
   traveled+=length;
  }
  return closest;
 });
 if(found.some(x=>x.away>250))return null;
 const meters=found[1].along-found[0].along;
 return meters>=-50?Math.max(0,Math.round(meters)):null;
}
export function formatTransitDistance(meters:number):string{
 return meters<1000?Math.round(meters/10)*10+' m':(meters/1000).toLocaleString('tr-TR',{maximumFractionDigits:1})+' km';
}
