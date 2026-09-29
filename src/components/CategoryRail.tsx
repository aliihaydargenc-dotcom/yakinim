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

export function CategoryRail({ value, onChange }: { value: CategoryId; onChange: (category: CategoryId) => void }) {
  return (
    <div className="category-rail" aria-label="Yakındaki yer kategorileri">
      {CATEGORIES.map((item) => (
        <button key={item.id} type="button" className={value === item.id ? "category-pill is-active" : "category-pill"} onClick={() => onChange(item.id)} aria-pressed={value === item.id}>
          <span className="category-mark" aria-hidden="true">{item.mark}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
