export type Section = "nearby" | "map" | "news" | "radio" | "games";

export type CategoryId =
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
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  category: string;
  categoryLabel: string;
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
};
