/**
 * Derive one boarding pass per flight leg from the plan and the session ledger.
 * A leg's pass exists from its first contributing session; it is "arrived" once the leg is done.
 */
import { legDistanceKm } from "@/features/travel/graph";
import { sessionKm, type CompletedSession, type TravelPlan } from "@/features/travel/journey";
import type { BoardingPassInput } from "./boarding-pass";

export interface LegPass extends BoardingPassInput {
  legIndex: number;
}

export function legPasses(plan: TravelPlan, ledger: readonly CompletedSession[], timeZone: string): LegPass[] {
  const seen = new Set<string>();
  const sessions = [...ledger]
    .sort((a, b) => a.completedAt - b.completedAt || a.id.localeCompare(b.id))
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
  const cities = [plan.departureId, ...plan.stops];
  const legs = plan.stops.map((to, i) => ({ fromId: cities[i]!, toId: to, km: legDistanceKm(cities[i]!, to) }));
  const passes: LegPass[] = [];
  // same rule as the journey: a session only flies legs that existed when it finished, never past them
  const addedAt = plan.addedAt ?? [];
  const openLegs = (t: number) => { let n = 0; while (n < legs.length && (addedAt[n] ?? 0) <= t) n++; return n; };
  let leg = 0, legStartKm = 0, km = 0;
  for (const s of sessions) {
    let add = sessionKm(s);
    let sessionStart = s.startedAt ?? s.completedAt - s.focusedMs;
    const open = openLegs(s.completedAt);
    while (add > 1e-9 && leg < open) {
      const L = legs[leg]!;
      const room = legStartKm + L.km - km;
      const used = Math.min(add, room);
      let pass = passes[leg];
      if (!pass) {
        pass = { legIndex: leg, fromId: L.fromId, toId: L.toId, boardedAt: sessionStart, minutesFlown: 0, kmPerMinute: s.kmPerMinute, sessions: 0, timeZone };
        passes[leg] = pass;
      }
      pass.minutesFlown += used / s.kmPerMinute;
      pass.sessions += 1;
      km += used;
      add -= used;
      if (km >= legStartKm + L.km - 1e-9) {
        // count back from the session's end so earlier pauses don't make the arrival look early
        pass.arrivedAt = s.completedAt - (add / s.kmPerMinute) * 60_000;
        sessionStart = pass.arrivedAt;
        legStartKm += L.km;
        leg++;
      }
    }
  }
  return passes;
}

/** The pass to show while a session runs: the current leg's pass with the live minutes added. */
export function livePass(
  plan: TravelPlan, ledger: readonly CompletedSession[], timeZone: string,
  active: { startedAt: number; elapsedMinutes: number; kmPerMinute: number },
): LegPass | null {
  const passes = legPasses(plan, ledger, timeZone);
  const legIndex = passes.findIndex((p) => p.arrivedAt === undefined);
  const index = legIndex >= 0 ? legIndex : passes.length;
  if (index >= plan.stops.length) return null;
  const cities = [plan.departureId, ...plan.stops];
  const base: LegPass = passes[index] ?? {
    legIndex: index, fromId: cities[index]!, toId: plan.stops[index]!, boardedAt: active.startedAt,
    minutesFlown: 0, kmPerMinute: active.kmPerMinute, sessions: 0, timeZone,
  };
  return { ...base, minutesFlown: base.minutesFlown + active.elapsedMinutes };
}
