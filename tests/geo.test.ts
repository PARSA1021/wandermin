import { describe, expect, it } from "vitest";
import { greatCircleLine, haversineKm, interpolateGreatCircle } from "@/lib/geo";
import { getCity } from "@/data";

describe("geo", () => {
  it("matches known great-circle distances (±1%)", () => {
    const cases: [string, string, number][] = [
      ["seoul", "tokyo", 1152], ["london", "paris", 344], ["london", "new-york", 5570], ["sydney", "melbourne", 714],
    ];
    for (const [a, b, km] of cases) expect(Math.abs(haversineKm(getCity(a), getCity(b)) - km) / km).toBeLessThan(0.01);
  });
  it("interpolates endpoints exactly and the midpoint is equidistant", () => {
    const a = getCity("seoul"), b = getCity("los-angeles");
    const start = interpolateGreatCircle(a, b, 0), end = interpolateGreatCircle(a, b, 1);
    expect(haversineKm(start, a)).toBeLessThan(0.001);
    expect(haversineKm(end, b)).toBeLessThan(0.001);
    const mid = interpolateGreatCircle(a, b, 0.5);
    expect(Math.abs(haversineKm(a, mid) - haversineKm(mid, b))).toBeLessThan(0.01);
  });
  it("unwraps longitudes across the antimeridian", () => {
    const line = greatCircleLine(getCity("tokyo"), getCity("vancouver"));
    for (let i = 1; i < line.length; i++) expect(Math.abs(line[i]![0] - line[i - 1]![0])).toBeLessThan(10);
  });
});
