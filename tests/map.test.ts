import { describe, expect, it } from "vitest";
import { CITIES } from "@/data";
import { LAND_PATH } from "@/features/map/land";
import { MAP_H, MAP_W, fitBox, projX, projY } from "@/features/map/projection";

describe("world map", () => {
  it("places every city inside the map frame", () => {
    for (const c of CITIES) {
      expect(projX(c.lng), c.id).toBeGreaterThanOrEqual(0);
      expect(projX(c.lng), c.id).toBeLessThanOrEqual(MAP_W);
      expect(projY(c.lat), c.id).toBeGreaterThan(0);
      expect(projY(c.lat), c.id).toBeLessThan(MAP_H);
    }
  });

  it("ships a compact baked coastline with only path commands and numbers", () => {
    expect(LAND_PATH.length).toBeGreaterThan(10_000);
    expect(LAND_PATH.length).toBeLessThan(80_000);
    expect(LAND_PATH).toMatch(/^[MLZ0-9. -]+$/);
    const xs = [...LAND_PATH.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
    // rings crossing the antimeridian are drawn twice, so some points lie beyond the frame (clipped by the SVG)
    expect(Math.min(...xs)).toBeGreaterThan(-MAP_W);
    expect(Math.max(...xs)).toBeLessThan(2 * MAP_W);
  });

  it("never draws a coastline edge across the whole map (antimeridian wrap)", () => {
    for (const sub of LAND_PATH.split("M").slice(1)) {
      const xs = [...("M" + sub).matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
      for (let i = 1; i < xs.length; i++) expect(Math.abs(xs[i]! - xs[i - 1]!)).toBeLessThan(MAP_W / 2);
    }
  });

  it("fits a route box at the map's aspect ratio, inside the map", () => {
    const seoul = CITIES.find((c) => c.id === "seoul")!, tokyo = CITIES.find((c) => c.id === "tokyo")!;
    const b = fitBox([[projX(seoul.lng), projY(seoul.lat)], [projX(tokyo.lng), projY(tokyo.lat)]], 36, 140);
    expect(b.w / b.h).toBeCloseTo(MAP_W / MAP_H, 5);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(MAP_W + 1e-9);
    expect(b.y + b.h).toBeLessThanOrEqual(MAP_H + 1e-9);
    expect(b.w).toBeLessThan(MAP_W / 2); // actually zoomed in
    expect(fitBox([])).toEqual({ x: 0, y: 0, w: MAP_W, h: MAP_H });
  });
});
