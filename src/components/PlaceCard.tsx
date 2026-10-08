import { Heart, Navigation } from "lucide-react";
import type { Place } from "../types";

const LABELS: Record<Place["category"], string> = { outages:"Kesinti",transit:"Durak", events:"Etkinlik",
  duty: "Nöbetçi Eczane", market: "Market", food: "Yemek", cafe: "Kafe", atm: "ATM", pharmacy: "Eczane",
  hospital: "Sağlık", fuel: "Akaryakıt", parking: "Otopark", park: "Park", bakery: "Fırın", greengrocer: "Manav", shopping: "Alışveriş",
};

function distanceLabel(value?: number) {
  if (!Number.isFinite(value)) return "";
  return (value as number) < 1000 ? `${Math.round(value as number)} m` : `${((value as number) / 1000).toFixed(1).replace(".", ",")} km`;
}

export function PlaceCard({ place, saved, onToggleSaved }: { place: Place; saved: boolean; onToggleSaved: () => void }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  return (
    <article className="place-card">
      <div className={`place-badge badge-${place.category}`} aria-hidden="true">{LABELS[place.category].slice(0, 1)}</div>
      <div className="place-content">
        <div className="place-heading">
          <div>
            <p className="place-kind">{LABELS[place.category]}{place.distanceM ? ` · ${distanceLabel(place.distanceM)}` : ""}</p>
            <h3>{place.name}</h3>
          </div>
          <button type="button" className={saved ? "icon-button is-saved" : "icon-button"} onClick={onToggleSaved} aria-label={saved ? "Favorilerden çıkar" : "Favorilere ekle"} aria-pressed={saved}>
            <Heart size={20} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="place-address">{place.address}</p>
        <div className="place-actions">
          {place.phone ? <a className="secondary-action" href={`tel:${place.phone}`}>Ara</a> : <span />}
          <a className="primary-action" href={mapsUrl} target="_blank" rel="noreferrer"><Navigation size={17} /> Yol tarifi</a>
        </div>
      </div>
    </article>
  );
}
