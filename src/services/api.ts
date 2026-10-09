import type { CategoryId, Coordinates, NewsItem, Place, RadioStation } from "../types";
import marketExclusions from "../../lib/market-name-exclusions.json";
import placeExclusions from "../../lib/place-exclusions.json";
import discoveryCategories from '../../lib/discovery-categories.json';
const marketNameExclusions = marketExclusions.map(pattern=>new RegExp(pattern,'iu'));
const excludedPlaceIds = new Set(placeExclusions.map(place=>place.id));

function cleanAddress(value:string) {
  const parts=value.replace(/[“”"]/g,'').replace(/\s+/g,' ').trim().split(/\s*,\s*/).filter(Boolean);
  return [...new Map(parts.map(part=>[part.toLocaleLowerCase('tr'),part])).values()].join(', ');
}

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
type DutyResponse = { source?:string; queryDate?:string; pharmacies?: Array<Record<string, unknown>> };
type NewsResponse = { items?: NewsItem[] };
type RadioResponse = { stations?: RadioStation[] };
export type ViewportBounds = { south: number; west: number; north: number; east: number };

const NEARBY_LAT_SPAN = 0.045;
const NEARBY_LNG_SPAN = 0.055;
const VIEWPORT_GRID_SIZE = 3;
const VIEWPORT_CONCURRENCY = 3;
const OVERTURE_RADIUS_M = 4500;

function categoryFromTags(tags: Record<string, string> = {}): Exclude<CategoryId, "all" | "duty"> | null {
  const discovery=discoveryCategories.find(c=>tags[c.tag]===c.value);
  if(discovery)return discovery.id as Exclude<CategoryId,"all"|"duty">;
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
  const discovery=discoveryCategories.find(c=>c.id===category);if(discovery)return discovery.fallback;
  if (category === "fuel") return "Akaryakıt istasyonu";
  if (category === "atm") return "ATM";
  if (category === "parking") return "Otopark";
  if (category === "park") return "Park";
  return "";
}
function factsFromTags(tags:Record<string,string>){
 const facts:string[]=[];
 if(tags.fee==='yes')facts.push('Ücretli');else if(tags.fee==='no')facts.push('Ücretsiz');
 if(tags.wheelchair==='yes')facts.push('Tekerlekli sandalye erişimi');else if(tags.wheelchair==='limited')facts.push('Kısıtlı engelsiz erişim');else if(tags.wheelchair==='no')facts.push('Tekerlekli sandalye erişimi yok');
 if(tags.changing_table==='yes')facts.push('Bebek bakım alanı');
 if(tags.access==='customers')facts.push('Müşterilere özel');
 for(const [tag,label] of [['socket:type2','Type 2'],['socket:type2_combo','CCS'],['socket:chademo','CHAdeMO']]){
  const n=tags[tag];if(n==='yes'||n&&Number.isFinite(Number(n))&&Number(n)>0){facts.push(label);if(tags[tag+':output'])facts.push(tags[tag+':output'].slice(0,40));}
 }
 if(tags.opening_hours)facts.push(`Saatler: ${tags.opening_hours.slice(0,100)}`);
 return [...new Set(facts)];
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
  if (place.availability) score += 3;
  return score;
}
function dedupePlaces(places: Place[]) {
  const ordered = places.filter(p=>!excludedPlaceIds.has(p.id) && (p.category!=="market" || !marketNameExclusions.some(pattern=>pattern.test(p.name.toLocaleLowerCase('tr'))))).map(p=>({...p,address:cleanAddress(p.address)})).sort((a, b) => placeQuality(b) - placeQuality(a));
  const result: Place[] = [];
  for (const place of ordered) {
    const name = canonicalName(place.name);
    const duplicate = result.some((current) => current.category === place.category && canonicalName(current.name) === name && distanceMeters(current, place) <= 90);
    if (!duplicate) result.push(place);
  }
  return result;
}
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 10000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
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
async function fetchViewportCell(cell: ViewportBounds): Promise<OsmElement[]> {
  const params = new URLSearchParams({ south: String(cell.south), west: String(cell.west), north: String(cell.north), east: String(cell.east) });
  const payload = await getJson<ViewportResponse>(`/api/viewport?${params}`);
  return payload.elements || [];
}
async function fetchViewportCells(cells: ViewportBounds[]): Promise<{ elements: OsmElement[]; successCount: number }> {
  const elements: OsmElement[] = [];
  let successCount = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < cells.length) {
      const cell = cells[cursor++];
      try {
        elements.push(...await fetchViewportCell(cell));
        successCount += 1;
      } catch {}
    }
  }
  await Promise.all(Array.from({ length: Math.min(VIEWPORT_CONCURRENCY, Math.max(1, cells.length)) }, () => worker()));
  const unique = new Map<string, OsmElement>();
  for (const element of elements) unique.set(`${element.type}:${element.id}`, element);
  return { elements: [...unique.values()], successCount };
}
function osmPlacesFromElements(elements: OsmElement[], location: Coordinates): Place[] {
  return elements.flatMap((element) => {
    const lat = Number(element.lat ?? element.center?.lat), lng = Number(element.lon ?? element.center?.lon);
    const category = categoryFromTags(element.tags), tags = element.tags || {};
    if(discoveryCategories.some(c=>c.id===category)&&(['private','no'].includes(tags.access)||category==='water'&&tags.drinking_water==='no'))return [];
    const rawName = displayNameFromTags(tags) || fallbackInfrastructureName(category);
    const name = category === "atm" && !/\batm\b|bankamatik/i.test(rawName) ? `${rawName} ATM` : rawName;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !category || !name) return [];
    return [{ id: `osm:${element.type}:${element.id}`, name, category, lat, lng, address: addressFromTags(tags), phone: tags.phone || tags["contact:phone"] || undefined, source: "OpenStreetMap", facts:factsFromTags(tags),licenseUrl:'https://www.openstreetmap.org/copyright',distanceM: Math.round(distanceMeters(location, { lat, lng })) } satisfies Place];
  });
}
export async function fetchOvertureSupplement(location: Coordinates, signal?: AbortSignal, category?:string): Promise<Place[]> {
  const params = new URLSearchParams({ lat: String(location.lat), lng: String(location.lng), radius: String(OVERTURE_RADIUS_M), quality:"3" });
  if(category)params.set('category',category);
  const payload = await getJson<SupplementalResponse>(`/api/overture?${params}`, signal);
  return payload.places || [];
}
function mergePlaces(places: Place[]) {
  return dedupePlaces(places).sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
}

export async function fetchViewportQuick(location: Coordinates): Promise<Place[]> {
  const centerCell = buildViewportGrid(location)[0];
  const [centerResult, supplementResult] = await Promise.allSettled([
    fetchViewportCell(centerCell),
    fetchOvertureSupplement(location),
  ]);
  const centerPlaces = centerResult.status === "fulfilled" ? osmPlacesFromElements(centerResult.value, location) : [];
  const supplemental = supplementResult.status === "fulfilled" ? supplementResult.value : [];
  const merged = mergePlaces([...centerPlaces, ...supplemental]);
  if (!merged.length && centerResult.status === "rejected" && supplementResult.status === "rejected") throw new Error("nearby_quick_unavailable");
  return merged;
}

export async function fetchViewportExpanded(location: Coordinates, seed: Place[] = []): Promise<Place[]> {
  const outerCells = buildViewportGrid(location).slice(1);
  const { elements, successCount } = await fetchViewportCells(outerCells);
  const merged = mergePlaces([...seed, ...osmPlacesFromElements(elements, location)]);
  if (!merged.length && !successCount && !seed.length) throw new Error("nearby_unavailable");
  return merged;
}

export async function fetchViewport(location: Coordinates): Promise<Place[]> {
  let quick: Place[] = [];
  try { quick = await fetchViewportQuick(location); } catch {}
  return fetchViewportExpanded(location, quick);
}

export async function fetchDuty(location: Coordinates): Promise<Place[]> {
  const params = new URLSearchParams({ lat: String(location.lat), lng: String(location.lng), radius: "20000", limit: "24" });
  const payload = await getJson<DutyResponse>(`/api/duty?${params}`);
  return (payload.pharmacies || []).flatMap((row, index) => {
    const lat = row.latitude==null?NaN:Number(row.latitude), lng = row.longitude==null?NaN:Number(row.longitude);
    return [{ id: String(row.id || `duty:${index}`), name: String(row.name || "Nöbetçi Eczane"), category: "duty", lat, lng, address: String(row.address || "Adres bilgisi yok"), source: String(row.source||payload.source||""), queryDate:payload.queryDate, phone: row.phone ? String(row.phone) : undefined, distanceM: row.distance_m!=null && Number.isFinite(Number(row.distance_m)) ? Number(row.distance_m) : Number.isFinite(lat)&&Number.isFinite(lng)?Math.round(distanceMeters(location, { lat, lng })):undefined } satisfies Place];
  }).sort((a, b) => (a.distanceM || Infinity) - (b.distanceM || Infinity));
}
export async function fetchNews(category: string): Promise<NewsItem[]> { const payload = await getJson<NewsResponse>(`/api/news?category=${encodeURIComponent(category)}`); return payload.items || []; }
export async function fetchRadio(): Promise<RadioStation[]> { const payload = await getJson<RadioResponse>("/api/radio?scope=turkiye&quality=4"); return payload.stations || []; }

export async function fetchArea(bounds: ViewportBounds, origin: Coordinates, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams(Object.entries(bounds).map(([key,value])=>[key,String(value)]));
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 9000);
  try {
    const response = await fetch(`/api/viewport?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload: ViewportResponse = await response.json();
    return mergePlaces(osmPlacesFromElements(payload.elements || [], origin));
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
export function combinePlaceSources(places: Place[]) { return mergePlaces(places); }

export async function fetchMunicipalPlaces(location:Coordinates,kind:string,signal?:AbortSignal):Promise<{places:Place[];partial?:boolean}>{return getJson(`/api/nearby?layer=municipal&lat=${location.lat}&lng=${location.lng}&kind=${kind}`,signal);}

export async function fetchDiscoveryPlaces(location:Coordinates,signal?:AbortSignal):Promise<Place[]>{const data=await getJson<ViewportResponse>(`/api/nearby?lat=${location.lat}&lng=${location.lng}&radius=5000&kind=discovery`,signal);return osmPlacesFromElements(data.elements||[],location);}
