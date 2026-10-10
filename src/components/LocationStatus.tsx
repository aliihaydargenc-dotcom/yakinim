import {useQuery} from '@tanstack/react-query';
import type {Coordinates} from '../types';
export function LocationStatus({location,manual,restored,demo,onChooseMap,onClear}:{location:Coordinates|null;manual:boolean;restored:boolean;demo:boolean;onChooseMap:()=>void;onClear:()=>void}){
 const lat=location?.lat.toFixed(4),lng=location?.lng.toFixed(4);
 const label=useQuery({queryKey:['location-label-v2',lat,lng],queryFn:async({signal})=>{const r=await fetch(`/api/location?v=2&lat=${lat}&lng=${lng}`,{signal});if(!r.ok)throw Error('location');return r.json() as Promise<{label:string}>;},enabled:!!location&&!demo,staleTime:86400000,retry:0});
 return <div className="location-status"><span>{!location?'Konum seçilmedi':demo?'Konyaaltı, Antalya · örnek konum':<>{label.data?.label||`${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}<small>{restored?'Son kullanılan konum (6 saat içinde)':manual?'Haritadan seçilen konum':'Cihaz konumu'}</small></>}</span><div className="location-actions"><button aria-label="Konumu haritadan seç" onClick={onChooseMap}>Haritadan seç</button>{location&&!demo&&<button aria-label="Kaydedilmiş konumu sil" onClick={onClear}>Sil</button>}</div></div>;
}
