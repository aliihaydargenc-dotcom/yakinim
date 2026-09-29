import type { CategoryId } from "../types";

const CATEGORIES: Array<{ id: CategoryId; label: string; mark: string }> = [
  { id: "all", label: "Tümü", mark: "•" },
  { id: "duty", label: "Nöbetçi", mark: "+" },
  { id: "market", label: "Market", mark: "M" },
  { id: "food", label: "Yemek", mark: "Y" },
  { id: "cafe", label: "Kafe", mark: "K" },
  { id: "atm", label: "ATM", mark: "₺" },
  { id: "pharmacy", label: "Eczane", mark: "E" },
  { id: "hospital", label: "Sağlık", mark: "S" },
  { id: "fuel", label: "Akaryakıt", mark: "A" },
  { id: "park", label: "Park", mark: "P" },
  { id: "bakery", label: "Fırın", mark: "F" },
  { id: "greengrocer", label: "Manav", mark: "V" },
  { id: "shopping", label: "Alışveriş", mark: "AV" },
  { id: "parking", label: "Otopark", mark: "O" },
];

const MAP_CATEGORY_ORDER: CategoryId[] = [
  "all",
  "market",
  "food",
  "cafe",
  "park",
  "atm",
  "pharmacy",
  "parking",
  "duty",
  "hospital",
  "fuel",
  "bakery",
  "greengrocer",
  "shopping",
];

export function CategoryRail({ value, onChange, variant = "default" }: { value: CategoryId; onChange: (category: CategoryId) => void; variant?: "default" | "map" }) {
  const items = variant === "map"
    ? MAP_CATEGORY_ORDER.map((id) => CATEGORIES.find((item) => item.id === id)).filter((item): item is (typeof CATEGORIES)[number] => Boolean(item))
    : CATEGORIES;

  return (
    <div className={variant === "map" ? "category-rail is-map-rail" : "category-rail"} aria-label="Yakındaki yer kategorileri">
      {items.map((item) => (
        <button key={item.id} type="button" className={value === item.id ? "category-pill is-active" : "category-pill"} onClick={() => onChange(item.id)} aria-pressed={value === item.id}>
          <span className="category-mark" aria-hidden="true">{item.mark}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
