import type {LucideIcon} from 'lucide-react';
import {
  Compass, Map as MapIcon, Grid2X2, Bookmark, Ellipsis, ShoppingBasket, UtensilsCrossed, Coffee,
  Cross, Fuel, CarFront, BusFront, CalendarDays, Waves, ShoppingCart, MapPin,
  Trees, Landmark, Dumbbell, ParkingCircle, Hospital, Banknote, Store, Pill, Accessibility,
  Droplets, Dog, PlugZap, Baby, Recycle, Tent, Binoculars, Footprints, Newspaper, Radio, Gamepad2,
  MapPinned, Heart, TrendingDown, Navigation, type LucideProps
} from 'lucide-react';
import discoveryCategories from '../../../lib/discovery-categories.json';
import type {CategoryId} from '../../types';

export type Tab = 'explore'|'services'|'saved'|'more';
export type Service = 'prices'|'transit'|'traffic'|'events';
export type Media = 'news'|'radio'|'games';
export type NavOption = {id:Tab;label:string;Icon:LucideIcon};
export const tabs:NavOption[] = [
  {id:'explore',label:'Keşfet',Icon:Compass},
  {id:'services',label:'Hizmetler',Icon:Grid2X2},
  {id:'saved',label:'Kaydedilen',Icon:Bookmark},
  {id:'more',label:'Diğer',Icon:Ellipsis},
];
export const services:{id:Service;label:string;description:string;Icon:LucideIcon}[] = [
  {id:'prices',label:'Market fiyatları',description:'Kaynakta bildirilen ürün fiyatları',Icon:TrendingDown},
  {id:'transit',label:'Toplu ulaşım',description:'Antalya durakları ve geliş tahminleri',Icon:BusFront},
  {id:'traffic',label:'Trafik',description:'Kaynak kapsamı ve yol haritası',Icon:Navigation},
  {id:'events',label:'Etkinlikler',description:'Duyurular ve program',Icon:CalendarDays},
];
export const categories:{id:CategoryId;label:string;Icon:LucideIcon}[] = [
  {id:'all',label:'Tümü',Icon:Compass},
  {id:'market',label:'Market',Icon:ShoppingBasket},
  {id:'food',label:'Yemek',Icon:UtensilsCrossed},
  {id:'cafe',label:'Kafe',Icon:Coffee},
  {id:'duty',label:'Nöbetçi eczane',Icon:Cross},
  {id:'pharmacy',label:'Eczane',Icon:Pill},
  {id:'fuel',label:'Akaryakıt',Icon:Fuel},
  {id:'parking',label:'Otopark',Icon:ParkingCircle},
  {id:'atm',label:'ATM',Icon:Banknote},
  {id:'bakery',label:'Fırın',Icon:ShoppingCart},
  {id:'park',label:'Park',Icon:Trees},
  {id:'hospital',label:'Sağlık',Icon:Hospital},
  {id:'greengrocer',label:'Manav',Icon:Store},
  {id:'shopping',label:'Alışveriş',Icon:ShoppingBasket},
  ...discoveryCategories.filter(row=>!['all','market','food','cafe','duty','pharmacy','fuel','parking','atm','bakery','park','hospital','greengrocer','shopping'].includes(row.id)).map(row=>({
    id:row.id as CategoryId,label:row.label, Icon: ({toilets:Accessibility,water:Droplets,charging:PlugZap,playground:Baby,sports:Dumbbell,veterinary:Dog,recycling:Recycle,camping:Tent,picnic:Trees,viewpoint:Binoculars,museum:Landmark,beach:Waves} as Record<string,LucideIcon>)[row.id]??MapPin,
  })),
];
export const quickCategories:CategoryId[] = ['market','food','cafe','duty','fuel','parking','park','atm'];
export const mediaLinks:{id:Media;label:string;description:string;Icon:LucideIcon}[] = [
  {id:'news',label:'Haberler',description:'Kaynağı belirtilen haberler',Icon:Newspaper},
  {id:'radio',label:'Radyo',description:'Canlı istasyonlar',Icon:Radio},
  {id:'games',label:'Oyunlar',description:'Kısa bir mola',Icon:Gamepad2},
];
export function labelForCategory(category:string):string {return categories.find(c=>c.id===category)?.label || category;}
export function categoryIcon(category:string):LucideIcon {return categories.find(c=>c.id===category)?.Icon||MapPinned;}
export type {LucideProps};
