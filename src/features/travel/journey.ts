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
}

/** Where the traveller started and the ordered cities they intend to fly to. */
export interface TravelPlan {
  departureId: string;
  stops: string[];
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
  /** Distance flown beyond the final planned stop, held until a new stop is chosen. */
  bankedKm: number;
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

  const arrivals: Arrival[] = [];
  let km = 0;
  let minutes = 0;
  let next = 0;
  for (const s of sessions) {
    const add = sessionKm(s);
    const addMin = s.focusedMs / 60000;
    while (next < legs.length && km + add >= legEnds[next]! - 1e-9) {
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
    const end = legEnds.at(-1) ?? 0;
    return {
      totalKm: km, totalFocusMinutes: minutes, arrivals, lastCityId, currentLeg: null,
      position: { lat: city.lat, lng: city.lng }, bankedKm: Math.max(0, km - end),
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
    bankedKm: 0,
  };
}

/**
 * Change the route without touching history. Visited stops stay; a leg already in progress
 * is kept (no mid-air teleport); the new path is appended from the city that leg ends at.
 */
export function rerouteTo(plan: TravelPlan, journey: Journey, targetId: string): TravelPlan {
  const lockedCount = journey.arrivals.length + (journey.currentLeg && journey.currentLeg.travelledKm > 0 ? 1 : 0);
  const kept = plan.stops.slice(0, lockedCount);
  const from = kept.at(-1) ?? plan.departureId;
  const path = shortestPath(from, targetId);
  if (!path) throw new Error(`No route from ${from} to ${targetId}`);
  return { departureId: plan.departureId, stops: [...kept, ...path.slice(1)] };
}
