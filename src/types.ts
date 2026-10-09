export type Section = "nearby" | "map" | "news" | "radio" | "games";

export type CategoryId =
  | "toilets" | "water" | "charging" | "playground" | "sports" | "veterinary"
  | "recycling" | "camping" | "picnic" | "viewpoint" | "museum" | "beach"
  | "fishing"
  | "transit"
  | "events"
  | "outages"
  | "all"
  | "duty"
  | "market"
  | "food"
  | "cafe"
  | "atm"
  | "pharmacy"
  | "hospital"
  | "fuel"
  | "parking"
  | "park"
  | "bakery"
  | "greengrocer"
  | "shopping";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type Place = {
  id: string;
  name: string;
  category: Exclude<CategoryId, "all">;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  source?: string;
  queryDate?: string;
  distanceM?: number;
  facts?: string[];
  availability?: {free:number|null;total:number|null;open:boolean|null;fetchedAt:string};
  licenseUrl?:string;
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  category: string;
  categoryLabel: string;
  imageUrl?: string;
};

export type RadioStation = {
  id: string;
  name: string;
  streamUrl: string;
  homepage?: string;
  codec?: string;
  bitrate?: number;
  tags?: string[];
  liveVerified?: boolean;
  measuredRank?: number | null;
  hls?: boolean;
};
