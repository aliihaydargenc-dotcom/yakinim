import {useQuery} from '@tanstack/react-query';
import type {Coordinates} from '../types';
export function LocationStatus({location,demo}:{location:Coordinates|null;demo:boolean}){
 const lat=location?.lat.toFixed(4),lng=location?.lng.toFixed(4);
 const label=useQuery({queryKey:['location-label-v2',lat,lng],queryFn:async({signal})=>{const r=await fetch(`/api/location?v=2&lat=${lat}&lng=${lng}`,{signal});if(!r.ok)throw Error('location');return r.json() as Promise<{label:string}>;},enabled:!!location&&!demo,staleTime:86400000,retry:0});
 return <span className="location-label">{!location?'Konum seç':demo?'Konyaaltı, Antalya':label.data?.label||`${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}</span>;
}
