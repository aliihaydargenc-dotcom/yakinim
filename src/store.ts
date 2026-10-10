import { create } from "zustand";
import type { CategoryId, Coordinates, Section } from "./types";

const SAVED_KEY = "yakinim:v2:saved";
const LAST_LOCATION_KEY = "yakinim:v2:last-location";
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
  setSection: (section: Section) => void;
  setCategory: (category: CategoryId) => void;
  setSearch: (search: string) => void;
  setLocation: (location: Coordinates, label?: string, mode?: "device" | "manual") => void;
  setLocationError: (message: string) => void;
  clearLocation: () => void;
  setPickingLocation: (value: boolean) => void;
  toggleSaved: (id: string) => void;
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
  setSection: (section) => set({ section }),
  setCategory: (category) => set({ category }),
  setSearch: (search) => set({ search }),
  setLocation: (location, label = "Konum hazır", mode = "device") => {
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
  toggleSaved: (id) => {
    const current = get().savedIds;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
    set({ savedIds: next });
  },
}));
