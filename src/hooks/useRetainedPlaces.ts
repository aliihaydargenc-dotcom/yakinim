import { useEffect, useMemo, useState } from "react";
import type { Place } from "../types";

const EMPTY: Place[] = [];

// A viewport response is an addition to the places we have seen, not a deletion
// notice. Keep a bounded session cache; reset date-sensitive duty records daily.
function merge(previous: Place[], incoming: Place[]) {
  const byId = new Map(previous.map(place => [place.id, place]));
  for (const place of incoming) {
    byId.delete(place.id);
    byId.set(place.id, place);
  }
  return [...byId.values()].slice(-2000);
}

export function useRetainedPlaces(data: Place[] | undefined, scope: string) {
  const [cache, setCache] = useState({ scope, places: EMPTY });
  useEffect(() => {
    setCache(previous => {
      if (!data && previous.scope === scope) return previous;
      return { scope, places: merge(previous.scope === scope ? previous.places : EMPTY, data ?? EMPTY) };
    });
  }, [data, scope]);
  return useMemo(() => {
    const previous = cache.scope === scope ? cache.places : EMPTY;
    return data ? merge(previous, data) : previous;
  }, [cache, data, scope]);
}
