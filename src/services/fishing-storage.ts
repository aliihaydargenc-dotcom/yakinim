import type {Coordinates} from '../types';
export type Shore=Coordinates&{name:string;region:string};
export type CatchEntry={id:string;date:string;shore:Shore;method:'yemli'|'spin';species:string;count:number;minutes:number;note:string;forecast:{time:number;wave:number|null;wind:number|null;fetchedAt:string}|null};
const FAVORITES='yakinim:fishing:favorites',JOURNAL='yakinim:fishing:journal';
const shore=(v:unknown):v is Shore=>!!v&&typeof v==='object'&&typeof (v as Shore).name==='string'&&(v as Shore).name.length<=100&&typeof (v as Shore).region==='string'&&(v as Shore).region.length<=100&&Number.isFinite((v as Shore).lat)&&Math.abs((v as Shore).lat)<=90&&Number.isFinite((v as Shore).lng)&&Math.abs((v as Shore).lng)<=180;
export const shoreKey=(s:Shore)=>`${s.lat.toFixed(4)},${s.lng.toFixed(4)}`;
function read(key:string):unknown[]{try{const v:unknown=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
function write(key:string,data:unknown):boolean{try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}}
export const readFavorites=()=>read(FAVORITES).filter(shore).slice(0,32);
export const saveFavorites=(v:Shore[])=>write(FAVORITES,v.slice(0,32));
export function readJournal():CatchEntry[]{return read(JOURNAL).filter((v):v is CatchEntry=>{if(!v||typeof v!=='object')return false;const e=v as CatchEntry;return typeof e.id==='string'&&typeof e.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&shore(e.shore)&&['yemli','spin'].includes(e.method)&&typeof e.species==='string'&&e.species.length<=80&&Number.isInteger(e.count)&&e.count>=0&&e.count<=999&&Number.isInteger(e.minutes)&&e.minutes>=0&&e.minutes<=1440&&typeof e.note==='string'&&e.note.length<=500&&(e.forecast===null||typeof e.forecast==='object'&&Number.isFinite(e.forecast?.time)&&typeof e.forecast.fetchedAt==='string'&&(e.forecast.wave===null||Number.isFinite(e.forecast.wave))&&(e.forecast.wind===null||Number.isFinite(e.forecast.wind)));}).slice(0,200);}
export const saveJournal=(v:CatchEntry[])=>write(JOURNAL,v.slice(0,200));
export const shores:Shore[]=[
 {name:'Konyaaltı',lat:36.86,lng:30.64,region:'Akdeniz'},{name:'Lara',lat:36.84,lng:30.80,region:'Akdeniz'},{name:'Kemer',lat:36.60,lng:30.57,region:'Akdeniz'},{name:'Kaş',lat:36.20,lng:29.64,region:'Akdeniz'},{name:'Side',lat:36.76,lng:31.39,region:'Akdeniz'},{name:'Alanya',lat:36.54,lng:32.00,region:'Akdeniz'},{name:'Mersin',lat:36.77,lng:34.60,region:'Akdeniz'},{name:'İskenderun',lat:36.58,lng:36.17,region:'Akdeniz'},
 {name:'Bodrum',lat:37.03,lng:27.42,region:'Ege'},{name:'Çeşme',lat:38.30,lng:26.28,region:'Ege'},{name:'İzmir',lat:38.43,lng:27.10,region:'Ege'},{name:'Ayvalık',lat:39.32,lng:26.69,region:'Ege'},
 {name:'Çanakkale',lat:40.15,lng:26.40,region:'Marmara'},{name:'İstanbul',lat:41.04,lng:29.00,region:'Marmara'},
 {name:'Şile',lat:41.18,lng:29.62,region:'Karadeniz'},{name:'Sinop',lat:42.03,lng:35.15,region:'Karadeniz'},{name:'Samsun',lat:41.31,lng:36.35,region:'Karadeniz'},{name:'Trabzon',lat:41.02,lng:39.72,region:'Karadeniz'}
];
