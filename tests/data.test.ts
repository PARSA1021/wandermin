import { describe, expect, it } from "vitest";
import { CITIES, COUNTRIES, DEPARTURE_CITIES, LEGS, getCountry } from "@/data";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { GRAPH, shortestPath } from "@/features/travel/graph";

describe("city data", () => {
  it("has the 30 agreed cities", () => {
    const expected = ["seoul","tokyo","osaka","kyoto","taipei","hong-kong","singapore","bangkok","hanoi","bali",
      "london","paris","rome","venice","barcelona","amsterdam","prague","zurich","vienna","istanbul",
      "new-york","los-angeles","san-francisco","vancouver","toronto","mexico-city",
      "sydney","melbourne","cairo","cape-town"];
    expect(CITIES.map((c) => c.id).sort()).toEqual([...expected].sort());
  });
  it("has the 5 agreed departures", () => {
    expect(DEPARTURE_CITIES.map((c) => c.id).sort()).toEqual(["london","new-york","paris","seoul","tokyo"]);
  });
  it("has unique ids and postmark codes", () => {
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(30);
    expect(new Set(CITIES.map((c) => c.code)).size).toBe(30);
    for (const c of CITIES) expect(c.code).toMatch(/^[A-Z]{3}$/);
  });
  it.each(CITIES.map((c) => [c.id, c] as const))("%s has valid coordinates, country and names", (_, c) => {
    expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
    expect(Math.abs(c.lng)).toBeLessThanOrEqual(180);
    expect(() => getCountry(c.countryCode)).not.toThrow();
    for (const l of SUPPORTED_LOCALES) {
      expect(c.name[l], `${c.id} name.${l}`).toBeTruthy();
      expect(c.landmark.name[l], `${c.id} landmark.${l}`).toBeTruthy();
    }
    // landmark sits within ~60 km of its city
    const dLat = Math.abs(c.lat - c.landmark.lat), dLng = Math.abs(c.lng - c.landmark.lng);
    expect(dLat + dLng).toBeLessThan(0.6);
  });
  it("countries have postcard labels the pixel font can print", () => {
    for (const k of COUNTRIES) expect(k.postcardLabel).toMatch(/^[A-Z0-9 ,.&'-]+$/);
  });
});

describe("route graph", () => {
  it("legs reference known cities and have no duplicates", () => {
    const ids = new Set(CITIES.map((c) => c.id));
    const keys = new Set<string>();
    for (const { from, to } of LEGS) {
      expect(ids.has(from) && ids.has(to)).toBe(true);
      const k = [from, to].sort().join("|");
      expect(keys.has(k), k).toBe(false);
      keys.add(k);
    }
  });
  it("every city is reachable from every departure", () => {
    for (const d of DEPARTURE_CITIES)
      for (const c of CITIES) expect(shortestPath(d.id, c.id), `${d.id}→${c.id}`).not.toBeNull();
  });
  it("every city has at least one leg", () => {
    for (const c of CITIES) expect(GRAPH.get(c.id)?.size ?? 0).toBeGreaterThan(0);
  });
});
