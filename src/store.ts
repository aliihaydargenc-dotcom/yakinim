import { create } from "zustand";
import type { CategoryId, Coordinates, Place, Section } from "./types";

const SAVED_KEY = "yakinim:v2:saved";
const LAST_LOCATION_KEY = "yakinim:v2:last-location";
const SAVED_PLACES_KEY = "yakinim:next:saved-places";
const LAST_LOCATION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readSavedPlaces(): Place[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_PLACES_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((place): place is Place => !!place && typeof place === 'object'
      && typeof place.id === 'string' && typeof place.name === 'string'
      && typeof place.category === 'string' && typeof place.address === 'string'
      && Number.isFinite(place.lat) && Number.isFinite(place.lng)
      && Math.abs(place.lat) <= 90 && Math.abs(place.lng) <= 180).slice(0, 150);
  } catch { return []; }
}
function writeSavedPlaces(places: Place[]) {
  try { localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places.slice(0,150))); } catch {}
}

function readLastLocation(): (Coordinates & { mode: "device" | "manual" }) | null {
  try {
    const raw = localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { lat?: unknown; lng?: unknown; savedAt?: unknown; mode?: unknown };
    if (typeof value.lat !== "number" || typeof value.lng !== "number" || typeof value.savedAt !== "number") return null;
    const {lat,lng,savedAt} = value as {lat:number;lng:number;savedAt:number};
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(savedAt)) return null;
    if (savedAt > Date.now() || Date.now() - savedAt > LAST_LOCATION_MAX_AGE_MS) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng, mode: value.mode === "manual" ? "manual" : "device" };
  } catch {
    return null;
  }
}

function persistLastLocation(location: Coordinates, mode: "device" | "manual") {
  try { localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ ...location, mode, savedAt: Date.now() })); } catch {}
}

const initialLocation = readLastLocation();

type AppState = {
  section: Section;
  category: CategoryId;
  search: string;
  location: Coordinates | null;
  locationMode: "device" | "manual";
  restoredLocation: boolean;
  locationLabel: string;
  locationError: string;
  pickingLocation: boolean;
  savedIds: string[];
  savedPlaces: Place[];
  setSection: (section: Section) => void;
  setCategory: (category: CategoryId) => void;
  setSearch: (search: string) => void;
  setLocation: (location: Coordinates, label?: string, mode?: "device" | "manual") => void;
  setLocationError: (message: string) => void;
  clearLocation: () => void;
  setPickingLocation: (value: boolean) => void;
  toggleSaved: (id: string, place?: Place, persist?: boolean) => void;
  rememberSavedPlaces: (places: Place[]) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  section: "nearby",
  category: "all",
  search: "",
  location: initialLocation,
  locationMode: initialLocation?.mode ?? "device",
  restoredLocation: !!initialLocation,
  locationLabel: initialLocation ? "Son konum hazırlanıyor" : "Konum seçilmedi",
  locationError: "",
  pickingLocation: false,
  savedIds: readSaved(),
  savedPlaces: readSavedPlaces(),
  setSection: (section) => set({ section }),
  setCategory: (category) => set({ category }),
  setSearch: (search) => set({ search }),
  setLocation: (location, label = "Konum hazır", mode: "device" | "manual" = "device") => {
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180) return;
    persistLastLocation(location, mode);
    set({ location, locationMode: mode, restoredLocation: false, locationLabel: label, locationError: "" });
  },
  setLocationError: (locationError) => set({ locationError }),
  clearLocation: () => {
    try { localStorage.removeItem(LAST_LOCATION_KEY); } catch {}
    set({ location: null, locationMode: "manual", restoredLocation: false, locationLabel: "Konum seçilmedi", locationError: "" });
  },
  setPickingLocation: (pickingLocation) => set({ pickingLocation }),
  toggleSaved: (id, place, persist = true) => {
    const current = get().savedIds;
    const savedPlaces = get().savedPlaces;
    const wasSaved = current.includes(id);
    const next = wasSaved ? current.filter(item => item !== id) : [...current, id];
    const nextPlaces = wasSaved ? savedPlaces.filter(item => item.id !== id)
      : place ? [place, ...savedPlaces.filter(item => item.id !== id)] : savedPlaces;
    if(persist){
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
      writeSavedPlaces(nextPlaces);
    }
    set({savedIds: next, savedPlaces: nextPlaces});
  },
  rememberSavedPlaces: (places) => {
    const {savedIds, savedPlaces} = get();
    const missing = places.filter(place=>savedIds.includes(place.id)&&!savedPlaces.some(item=>item.id===place.id));
    if (!missing.length) return;
    const next = [...savedPlaces,...missing].slice(0,150);
    writeSavedPlaces(next);
    set({savedPlaces:next});
  },
}));
