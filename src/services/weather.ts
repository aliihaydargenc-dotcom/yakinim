import {useQuery} from '@tanstack/react-query';
import type {Coordinates} from '../types';

export type WeatherConditions={temperature:number;windSpeed:number;precipitation:number|null;condition:string;observedFor:string;fetchedAt:string;expiresAt:string};
export function useWeather(location:Coordinates){
  return useQuery<WeatherConditions>({
    queryKey:['weather-met-no',Math.round(location.lat*1000)/1000,Math.round(location.lng*1000)/1000],
    queryFn:async({signal})=>{
      const params=new URLSearchParams({lat:String(location.lat),lng:String(location.lng)});
      const response=await fetch(`/api/weather?${params}`,{signal});
      if(!response.ok)throw new Error('weather_unavailable');
      return response.json() as Promise<WeatherConditions>;
    },
    staleTime:900000,
    refetchOnWindowFocus:false,
    retry:1,
  });
}
