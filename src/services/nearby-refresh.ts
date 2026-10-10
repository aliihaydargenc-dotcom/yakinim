import type {Coordinates} from "../types";

// Keep the live marker independent of place searches, reverse geocoding and network refreshes.
export const NEARBY_REFRESH_DISTANCE_M=500;
export const NEARBY_REFRESH_MIN_INTERVAL_MS=20_000;

export function distanceMeters(a:Coordinates,b:Coordinates):number {
  const rad=Math.PI/180;
  const dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
  return 12742000*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

export function shouldRefreshNearby(previous:Coordinates|null,next:Coordinates,mode:"manual"|"device",lastRefreshAt:number,now:number):boolean {
  if(!previous)return true;
  const meters=distanceMeters(previous,next);
  if(mode==="manual")return meters>1;
  return meters>=NEARBY_REFRESH_DISTANCE_M &&
    (lastRefreshAt===0 || now-lastRefreshAt>=NEARBY_REFRESH_MIN_INTERVAL_MS);
}
