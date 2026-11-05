import { describe, expect, it } from "vitest";
import { addSession, computeJourney, rerouteTo, validatePlan, type CompletedSession, type TravelPlan } from "@/features/travel/journey";
import { suggestNext, legDistanceKm } from "@/features/travel/graph";

const t0 = Date.UTC(2026, 10, 4, 12);
const s = (id: string, min: number, i: number, rate = 50): CompletedSession =>
  ({ id, focusedMs: min * 60000, completedAt: t0 + i * 3600_000, kmPerMinute: rate });

describe("journey", () => {
  const plan: TravelPlan = { departureId: "seoul", stops: ["tokyo", "osaka"] };

  it("starts at the departure city", () => {
    const j = computeJourney(plan, []);
    expect(j.totalKm).toBe(0);
    expect(j.currentLeg?.toId).toBe("tokyo");
    expect(j.position.lat).toBeCloseTo(37.5665, 3);
  });

  it("converts minutes to km at 50 km/min and arrives in Tokyo during the first 25-min session", () => {
    const j = computeJourney(plan, [s("a", 25, 0)]);
    expect(j.totalKm).toBe(1250);
    expect(j.arrivals).toHaveLength(1);
    const arr = j.arrivals[0]!;
    expect(arr.cityId).toBe("tokyo");
    expect(arr.sessionId).toBe("a");
    expect(arr.focusMinutesAtArrival).toBeCloseTo(legDistanceKm("seoul", "tokyo") / 50, 6);
    // leftover km carries into the next leg
    expect(j.currentLeg?.fromId).toBe("tokyo");
    expect(j.currentLeg?.travelledKm).toBeCloseTo(1250 - legDistanceKm("seoul", "tokyo"), 6);
  });

  it("can pass several cities in one long session and banks km past the last stop", () => {
    const j = computeJourney(plan, [s("long", 180, 0)]);
    expect(j.arrivals.map((a) => a.cityId)).toEqual(["tokyo", "osaka"]);
    expect(j.currentLeg).toBeNull();
    expect(j.bankedKm).toBeCloseTo(9000 - legDistanceKm("seoul", "tokyo") - legDistanceKm("tokyo", "osaka"), 6);
  });

  it("never double-counts a session id (ledger and compute both dedupe)", () => {
    let ledger = addSession([], s("a", 10, 0));
    ledger = addSession(ledger, s("a", 10, 0));
    expect(ledger).toHaveLength(1);
    const j = computeJourney(plan, [s("a", 10, 0), s("a", 10, 0)]);
    expect(j.totalKm).toBe(500);
  });

  it("keeps the rate each session was recorded with", () => {
    const j = computeJourney(plan, [s("a", 10, 0, 50), s("b", 10, 1, 100)]);
    expect(j.totalKm).toBe(1500);
  });

  it("is independent of ledger order", () => {
    const a = computeJourney(plan, [s("x", 20, 0), s("y", 20, 1)]);
    const b = computeJourney(plan, [s("y", 20, 1), s("x", 20, 0)]);
    expect(a).toEqual(b);
  });

  it("rejects plans that teleport between unconnected cities", () => {
    expect(validatePlan({ departureId: "seoul", stops: ["cape-town"] })).toMatch(/No flight leg/);
    expect(() => computeJourney({ departureId: "seoul", stops: ["cape-town"] }, [])).toThrow();
  });

  it("rerouting keeps visited cities and the leg in progress", () => {
    const ledger = [s("a", 25, 0)]; // in Tokyo, a little way towards Osaka
    const j = computeJourney(plan, ledger);
    const next = rerouteTo(plan, j, "taipei");
    expect(next.stops.slice(0, 2)).toEqual(["tokyo", "osaka"]);
    expect(next.stops.at(-1)).toBe("taipei");
    expect(validatePlan(next)).toBeNull();
    expect(computeJourney(next, ledger).arrivals).toEqual(j.arrivals);
  });

  it("suggests nearest unvisited neighbours in guided mode", () => {
    const sug = suggestNext("seoul", new Set(["seoul"]), 3);
    expect(sug.map((x) => x.cityId)).toEqual(["busan", "jeju", "osaka"]);
    expect(sug[0]!.km).toBeLessThan(sug[1]!.km);
  });
});
