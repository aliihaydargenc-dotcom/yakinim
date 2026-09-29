import type { CategoryId, Coordinates, NewsItem, Place, RadioStation } from "../types";

type OsmElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type ViewportResponse = { elements?: OsmElement[] };
type SupplementalResponse = { places?: Place[] };
type DutyResponse = { pharmacies?: Array<Record<string, unknown>> };
type NewsResponse = { items?: NewsItem[] };
type RadioResponse = { stations?: RadioStation[] };
type ViewportBounds = { south: number; west: number; north: number; east: number };

const NEARBY_LAT_SPAN = 0.045;
const NEARBY_LNG_SPAN = 0.055;
const VIEWPORT_GRID_SIZE = 3;
const VIEWPORT_CONCURRENCY = 3;
const FSQ_ENRICHMENT_THRESHOLD = 80;
const FSQ_RADIUS_M = 4500;

function categoryFromTags(tags: Record<string, string> = {}): Exclude<CategoryId, "all" | "duty"> | null {
  const amenity = tags.amenity || "";
  const shop = tags.shop || "";
  if (amenity === "cafe") return "cafe";
  if (["restaurant", "fast_food"].includes(amenity)) return "food";
  if (amenity === "pharmacy") return "pharmacy";
  if (amenity === "atm") return "atm";
  if (["hospital", "clinic", "doctors"].includes(amenity)) return "hospital";
  if (amenity === "fuel") return "fuel";
  if (amenity === "parking") return "parking";
  if (["supermarket", "convenience"].includes(shop)) return "market";
  if (shop === "greengrocer") return "greengrocer";
  if (shop === "bakery") return "bakery";
  if (["mall", "department_store", "clothes"].includes(shop)) return "shopping";
  if (tags.leisure === "park") return "park";
  return null;
}

function cleanText(value?: string) { return String(value || "").replace(/\s+/g, " ").trim(); }
function displayNameFromTags(tags: Record<string, string> = {}) {
  return cleanText(tags["name:tr"] || tags.name || tags.brand || tags.operator || tags.network);
}
function fallbackInfrastructureName(category: Exclude<CategoryId, "all" | "duty"> | null) {
  if (category === "atm") return "ATM";
  if (category === "parking") return "Otopark";
  if (category === "park") return "Park";
  return "";
}
function addressFromTags(tags: Record<string, string> = {}) {
  return [[tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "), tags["addr:suburb"] || tags["addr:district"] || tags["addr:neighbourhood"]]
    .filter(Boolean).join(", ") || tags["addr:full"] || tags.address || "Adres bilgisi yok";
}
function distanceMeters(a: Coordinates, b: Coordinates) {
  const r = 6371000; const p1 = a.lat * Math.PI / 180; const p2 = b.lat * Math.PI / 180;
  const dp = (b.lat - a.lat) * Math.PI / 180; const dl = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function canonicalName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr").replace(/[^a-z0-9çğıöşü]+/gi, "");
}
function placeQuality(place: Place) {
  let score = 0;
  if (place.address && place.address !== "Adres bilgisi yok") score += 2;
  if (place.phone) score += 1;
  return score;
}
function dedupePlaces(places: Place[]) {
  const ordered = [...places].sort((a, b) => placeQuality(b) - placeQuality(a));
  const result: Place[] = [];
  for (const place of ordered) {
    const name = canonicalName(place.name);
    const duplicate = result.some((current) => current.category === place.category && canonicalName(current.name) === name && distanceMeters(current, place) <= 90);
    if (!duplicate) result.push(place);
  }
  return result;
}
async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
function buildViewportGrid(location: Coordinates): ViewportBounds[] {
  const south = location.lat - NEARBY_LAT_SPAN, north = location.lat + NEARBY_LAT_SPAN;
  const west = location.lng - NEARBY_LNG_SPAN, east = location.lng + NEARBY_LNG_SPAN;
  const latStep = (north - south) / VIEWPORT_GRID_SIZE, lngStep = (east - west) / VIEWPORT_GRID_SIZE;
  const cells: ViewportBounds[] = [];
  for (let row = 0; row < VIEWPORT_GRID_SIZE; row += 1) for (let column = 0; column < VIEWPORT_GRID_SIZE; column += 1) cells.push({
    south: south + row * latStep,
    north: row === VIEWPORT_GRID_SIZE - 1 ? north : south + (row + 1) * latStep,
    west: west + column * lngStep,
    east: column === VIEWPORT_GRID_SIZE - 1 ? east : west + (column + 1) * lngStep,
  });
  const centerIndex = Math.floor(cells.length / 2);
  return [cells[centerIndex], ...cells.slice(0, centerIndex), ...cells.slice(centerIndex + 1)];
}
async function fetchViewportElements(location: Coordinates): Promise<OsmElement[]> {
  const cells = buildViewportGrid(location); const elements: OsmElement[] = []; let successCount = 0; let cursor = 0;
  async function worker() {
    while (cursor < cells.length) {
      const cell = cells[cursor++];
      const params = new URLSearchParams({ south: String(cell.south), west: String(cell.west), north: String(cell.north), east: String(cell.east) });
      try { const payload = await getJson<ViewportResponse>(`/api/viewport?${params}`); successCount += 1; elements.push(...(payload.elements || [])); } catch {}
    }
  }
  await Promise.all(Array.from({ length: VIEWPORT_CONCURRENCY }, () => worker()));
  if (!successCount) throw new Error("viewport_unavailable");
  const unique = new Map<string, OsmElement>(); for (const element of elements) unique.set(`${element.type}:${element.id}`, element);
  return [...unique.values()];
}
function osmPlacesFromElements(elements: OsmElement[], location: Coordinates): Place[] {
  return elements.flatMap((element) => {
    const lat = Number(element.lat ?? element.center?.lat), lng = Number(element.lon ?? element.center?.lon);
    const category = categoryFromTags(element.tags), tags = element.tags || {};
    const name = displayNameFromTags(tags) || fallbackInfrastructureName(category);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !category || !name) return [];
    return [{ id: `osm:${element.type}:${element.id}`, name, category, lat, lng, address: addressFromTags(tags), phone: tags.phone || tags["contact:phone"] || undefined, distanceM: Math.round(distanceMeters(location, { lat, lng })) } satisfies Place];
  });
}
async function fetchFsqSupplement(location: Coordinates): Promise<Place[]> {
  const params = new URLSearchParams({ lat: String(location.lat), lng: String(location.lng), radius: String(FSQ_RADIUS_M) });
  const payload = await getJson<SupplementalResponse>(`/api/fsq?${params}`);
  return payload.places || [];
}

export async function fetchViewport(location: Coordinates): Promise<Place[]> {
  let osmPlaces: Place[] = []; let osmFailed = false;
  try { osmPlaces = osmPlacesFromElements(await fetchViewportElements(location), location); } catch { osmFailed = true; }
  let supplemental: Place[] = [];
  if (osmPlaces.length < FSQ_ENRICHMENT_THRESHOLD) {
    try { supplemental = await fetchFsqSupplement(location); } catch {}
  }
  const merged = dedupePlaces([...osmPlaces, ...supplemental]).sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  if (!merged.length && osmFailed) throw new Error("nearby_unavailable");
  return merged;
}

export async function fetchDuty(location: Coordinates): Promise<Place[]> {
  const params = new URLSearchParams({ lat: String(location.lat), lng: String(location.lng), radius: "20000", limit: "24" });
  const payload = await getJson<DutyResponse>(`/api/duty?${params}`);
  return (payload.pharmacies || []).flatMap((row, index) => {
    const lat = Number(row.latitude), lng = Number(row.longitude); if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{ id: String(row.id || `duty:${index}`), name: String(row.name || "Nöbetçi Eczane"), category: "duty", lat, lng, address: String(row.address || "Adres bilgisi yok"), phone: row.phone ? String(row.phone) : undefined, distanceM: Number.isFinite(Number(row.distance_m)) ? Number(row.distance_m) : Math.round(distanceMeters(location, { lat, lng })) } satisfies Place];
  }).sort((a, b) => (a.distanceM || Infinity) - (b.distanceM || Infinity));
}
export async function fetchNews(category: string): Promise<NewsItem[]> { const payload = await getJson<NewsResponse>(`/api/news?category=${encodeURIComponent(category)}`); return payload.items || []; }
export async function fetchRadio(): Promise<RadioStation[]> { const payload = await getJson<RadioResponse>("/api/radio?scope=turkiye"); return payload.stations || []; }
