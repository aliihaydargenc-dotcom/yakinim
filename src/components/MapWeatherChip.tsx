import {useState} from 'react';
import {CloudSun,X} from 'lucide-react';
import type {Coordinates} from '../types';
import {useWeather} from '../services/weather';
import WeatherSummary from './WeatherSummary';

export function MapWeatherChip({location}:{location:Coordinates}){
 const [open,setOpen]=useState(false);
 const {data}=useWeather(location);
 return <div className="map-weather-anchor">
   <button type="button" className="map-weather-chip" aria-expanded={open} aria-label="Hava durumu" onClick={()=>setOpen(v=>!v)}><CloudSun size={18}/>{data?<span>{Math.round(data.temperature)}°</span>:<span>Hava</span>}</button>
   {open&&<div className="map-weather-expanded"><button className="map-weather-close" type="button" aria-label="Hava durumunu kapat" onClick={()=>setOpen(false)}><X size={18}/></button><WeatherSummary location={location}/></div>}
 </div>;
}
