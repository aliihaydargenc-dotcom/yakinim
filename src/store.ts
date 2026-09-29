import { create } from "zustand";
import type { CategoryId, Coordinates, Section } from "./types";

const SAVED_KEY = "yakinim:v2:saved";

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

type AppState = {
  section: Section;
  category: CategoryId;
  search: string;
  location: Coordinates | null;
  locationLabel: string;
  locationError: string;
  pickingLocation: boolean;
  savedIds: string[];
  setSection: (section: Section) => void;
  setCategory: (category: CategoryId) => void;
  setSearch: (search: string) => void;
  setLocation: (location: Coordinates, label?: string) => void;
  setLocationError: (message: string) => void;
  setPickingLocation: (value: boolean) => void;
  toggleSaved: (id: string) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  section: "nearby",
  category: "all",
  search: "",
  location: null,
  locationLabel: "Konum seçilmedi",
  locationError: "",
  pickingLocation: false,
  savedIds: readSaved(),
  setSection: (section) => set({ section }),
  setCategory: (category) => set({ category }),
  setSearch: (search) => set({ search }),
  setLocation: (location, label = "Konum hazır") => set({ location, locationLabel: label, locationError: "" }),
  setLocationError: (locationError) => set({ locationError }),
  setPickingLocation: (pickingLocation) => set({ pickingLocation }),
  toggleSaved: (id) => {
    const current = get().savedIds;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
    set({ savedIds: next });
  },
}));
