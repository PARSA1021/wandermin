import { getCity } from "@/data";
import { interpolateGreatCircle, type LatLng } from "@/lib/geo";
import { GRAPH, hasLeg, legDistanceKm, shortestPath, type Graph } from "./graph";

/** A finished focus session as stored in the ledger (append-only, unique by id). */
export interface CompletedSession {
  id: string;
  completedAt: number; // epoch ms, UTC
  focusedMs: number;
  /** Conversion rate in force when the session completed. */
  kmPerMinute: number;
  /** What the user focused on (display only). */
  activity?: string;
  /** When the session started (pauses included); used for boarding times. */
  startedAt?: number;
  /** The flight's to-do, and whether the user said they got it done. */
  note?: string;
  noteDone?: boolean;
}

/** Where the traveller started and the ordered cities they intend to fly to. */
export interface TravelPlan {
  departureId: string;
  stops: string[];
  /**
   * When each stop was added (epoch ms), parallel to `stops`. A session can only fly legs that
   * existed when it finished, so choosing a new city later never "spends" old focus time on it.
   * Missing (older saves) means "always existed".
   */
  addedAt?: number[];
}

export interface Arrival {
  cityId: string;
  legIndex: number;
  fromId: string;
  legKm: number;
  sessionId: string;
  arrivedAt: number;
  /** Total focused minutes accumulated at the exact moment of arrival. */
  focusMinutesAtArrival: number;
}

export interface Journey {
  totalKm: number;
  totalFocusMinutes: number;
  arrivals: Arrival[];
  /** City the traveller last arrived at (or departed from). */
  lastCityId: string;
  currentLeg: null | {
    index: number;
    fromId: string;
    toId: string;
    legKm: number;
    travelledKm: number;
    remainingKm: number;
    progress: number; // 0..1
  };
  position: LatLng;
}

export const sessionKm = (s: CompletedSession) => (s.focusedMs / 60000) * s.kmPerMinute;

/** Idempotent insert: a session id is recorded at most once. */
export function addSession(ledger: readonly CompletedSession[], s: CompletedSession): CompletedSession[] {
  if (s.focusedMs < 0 || !Number.isFinite(s.focusedMs)) throw new Error("Invalid focusedMs");
  return ledger.some((x) => x.id === s.id) ? [...ledger] : [...ledger, s];
}

/** Every consecutive pair in the plan must be a curated leg — no teleporting. */
export function validatePlan(plan: TravelPlan, graph: Graph = GRAPH): string | null {
  let prev = plan.departureId;
  getCity(prev);
  for (const stop of plan.stops) {
    getCity(stop);
    if (!hasLeg(prev, stop, graph)) return `No flight leg ${prev} → ${stop}`;
    prev = stop;
  }
  return null;
}

/** Derive the whole journey from the plan and the session ledger. Pure and deterministic. */
export function computeJourney(plan: TravelPlan, ledger: readonly CompletedSession[]): Journey {
  const error = validatePlan(plan);
  if (error) throw new Error(error);

  const seen = new Set<string>();
  const sessions = [...ledger]
    .sort((a, b) => a.completedAt - b.completedAt || a.id.localeCompare(b.id))
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

  const cities = [plan.departureId, ...plan.stops];
  const legs = plan.stops.map((to, i) => {
    const fromId = cities[i]!;
    return { fromId, toId: to, km: legDistanceKm(fromId, to) };
  });
  const legEnds: number[] = [];
  legs.reduce((acc, l) => (legEnds.push(acc + l.km), acc + l.km), 0);

  // legs available to a session = the leading stops that had been added by the time it finished
  const addedAt = plan.addedAt ?? [];
  const availableLegs = (t: number) => {
    let n = 0;
    while (n < legs.length && (addedAt[n] ?? 0) <= t) n++;
    return n;
  };

  const arrivals: Arrival[] = [];
  let km = 0;
  let minutes = 0;
  let next = 0;
  for (const s of sessions) {
    const open = availableLegs(s.completedAt);
    const routeEnd = open > 0 ? legEnds[open - 1]! : 0;
    // distance beyond the end of the route as it was is not flown anywhere (no banking)
    const add = Math.max(0, Math.min(sessionKm(s), routeEnd - km));
    const addMin = s.focusedMs / 60000;
    while (next < open && km + add >= legEnds[next]! - 1e-9) {
      const leg = legs[next]!;
      const neededKm = legEnds[next]! - km;
      arrivals.push({
        cityId: leg.toId,
        legIndex: next,
        fromId: leg.fromId,
        legKm: leg.km,
        sessionId: s.id,
        arrivedAt: s.completedAt,
        focusMinutesAtArrival: minutes + (s.kmPerMinute > 0 ? neededKm / s.kmPerMinute : 0),
      });
      next++;
    }
    km += add;
    minutes += addMin;
  }

  const done = next >= legs.length;
  const lastCityId = next === 0 ? plan.departureId : legs[next - 1]!.toId;
  if (done) {
    const city = getCity(lastCityId);
    return {
      totalKm: km, totalFocusMinutes: minutes, arrivals, lastCityId, currentLeg: null,
      position: { lat: city.lat, lng: city.lng },
    };
  }
  const leg = legs[next]!;
  const start = next === 0 ? 0 : legEnds[next - 1]!;
  const travelledKm = km - start;
  const progress = travelledKm / leg.km;
  return {
    totalKm: km, totalFocusMinutes: minutes, arrivals, lastCityId,
    currentLeg: {
      index: next, fromId: leg.fromId, toId: leg.toId, legKm: leg.km,
      travelledKm, remainingKm: leg.km - travelledKm, progress,
    },
    position: interpolateGreatCircle(getCity(leg.fromId), getCity(leg.toId), progress),
  };
}

/**
 * Change the route without touching history. Visited stops stay; a leg already in progress
 * is kept (no mid-air teleport); the new path is appended from the city that leg ends at.
 */
export function rerouteTo(plan: TravelPlan, journey: Journey, targetId: string, now = Date.now()): TravelPlan {
  const lockedCount = journey.arrivals.length + (journey.currentLeg && journey.currentLeg.travelledKm > 0 ? 1 : 0);
  const kept = plan.stops.slice(0, lockedCount);
  const keptAt = kept.map((_, i) => plan.addedAt?.[i] ?? 0);
  const from = kept.at(-1) ?? plan.departureId;
  const path = shortestPath(from, targetId);
  if (!path) throw new Error(`No route from ${from} to ${targetId}`);
  const added = path.slice(1);
  return { departureId: plan.departureId, stops: [...kept, ...added], addedAt: [...keptAt, ...added.map(() => now)] };
}

/** Distance left to the final planned stop — the most a new focus session can fly. */
export function routeRemainingKm(plan: TravelPlan, journey: Journey): number {
  if (!journey.currentLeg) return 0;
  const cities = [plan.departureId, ...plan.stops];
  let rest = journey.currentLeg.remainingKm;
  for (let i = journey.currentLeg.index + 1; i < plan.stops.length; i++) rest += legDistanceKm(cities[i]!, cities[i + 1]!);
  return rest;
}
