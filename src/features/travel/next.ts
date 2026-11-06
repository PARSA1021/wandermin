import { CITIES, getCity } from "@/data";
import { legDistanceKm, shortestPath, suggestNext } from "./graph";

export interface NextOption { cityId: string; km: number; via: string[]; newCountry: boolean }

const route = (from: string, to: string): { km: number; via: string[] } | null => {
  const path = shortestPath(from, to);
  if (!path) return null;
  return { km: path.slice(1).reduce((sum, id, i) => sum + legDistanceKm(path[i]!, id), 0), via: path.slice(1, -1) };
};

/**
 * Where to fly after landing: the nearest unvisited neighbours, and — so a trip keeps crossing
 * borders — the closest city in each of the nearest countries not stamped yet.
 */
export function nextOptions(from: string, visitedCities: ReadonlySet<string>, stampedCountries: ReadonlySet<string>, nearbyCount = 3, countryCount = 2): { nearby: NextOption[]; countries: NextOption[] } {
  const nearby = suggestNext(from, visitedCities, nearbyCount).map((s) => ({
    cityId: s.cityId, km: s.km, via: [], newCountry: !stampedCountries.has(getCity(s.cityId).countryCode),
  }));
  const taken = new Set(nearby.map((n) => n.cityId));
  const best = new Map<string, NextOption>();
  for (const c of CITIES) {
    if (c.id === from || visitedCities.has(c.id) || taken.has(c.id) || stampedCountries.has(c.countryCode)) continue;
    const r = route(from, c.id);
    if (!r) continue;
    const prev = best.get(c.countryCode);
    if (!prev || r.km < prev.km) best.set(c.countryCode, { cityId: c.id, km: r.km, via: r.via, newCountry: true });
  }
  // a new country already among the neighbours doesn't need a second slot
  for (const n of nearby) if (n.newCountry) best.delete(getCity(n.cityId).countryCode);
  const countries = [...best.values()].sort((a, b) => a.km - b.km).slice(0, countryCount);
  return { nearby, countries };
}

/**
 * Session length that fits the flight: when the whole flight is only a little longer than the usual
 * session (up to 10 minutes more, within the 180-minute limit), take it in one go instead of leaving a
 * two-minute remainder; otherwise the usual length (the timer still lands with the plane).
 */
export function fitSessionMinutes(usualMinutes: number, flightMs: number | undefined): number {
  if (flightMs === undefined || !Number.isFinite(flightMs) || flightMs <= 0) return usualMinutes;
  const flight = Math.ceil(flightMs / 60000);
  return flight > usualMinutes && flight <= usualMinutes + 10 && flight <= 180 ? flight : usualMinutes;
}
