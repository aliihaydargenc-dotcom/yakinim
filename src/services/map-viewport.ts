import type {ViewportBounds} from './api';

// Reuse a fetched area until a gesture leaves it. Padding avoids edge jitter.
export function coveredBy(view:ViewportBounds,coverage:ViewportBounds):boolean {
 return view.south>=coverage.south&&view.west>=coverage.west&&view.north<=coverage.north&&view.east<=coverage.east;
}
export function requestBounds(view:ViewportBounds):ViewportBounds {
 const lat=Math.max(.002,(view.north-view.south)*.25),lng=Math.max(.002,(view.east-view.west)*.25);
 return {south:Math.floor((view.south-lat)*1000)/1000,west:Math.floor((view.west-lng)*1000)/1000,north:Math.ceil((view.north+lat)*1000)/1000,east:Math.ceil((view.east+lng)*1000)/1000};
}

import type {Coordinates,Place} from '../types';
export function sparsePlaces(places:Place[],center:Coordinates):Place[] {
 const counts=new Map<string,number>(),result:Place[]=[];
 const near=(p:Place)=>Math.hypot(p.lat-center.lat,(p.lng-center.lng)*Math.cos(center.lat*Math.PI/180));
 for(const place of places.filter(p=>p.category!=='transit'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)).sort((a,b)=>near(a)-near(b))){
  const count=counts.get(place.category)||0;
  if(count>=2)continue;
  result.push(place);counts.set(place.category,count+1);
  if(result.length===12)break;
 }
 return result;
}
