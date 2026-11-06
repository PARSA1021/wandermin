import { describe, expect, it } from "vitest";
import { CITIES, getCity } from "@/data";
import { fitSessionMinutes, nextOptions } from "@/features/travel/next";
import { hoursAhead, localClock, localDate } from "@/features/travel/localTime";

describe("next flights", () => {
  it("offers nearby cities and the nearest new countries", () => {
    const { nearby, countries } = nextOptions("busan", new Set(["seoul", "busan"]), new Set(["KR"]));
    expect(nearby.length).toBeGreaterThan(0);
    expect(countries.length).toBe(2);
    for (const c of countries) {
      expect(c.newCountry).toBe(true);
      expect(getCity(c.cityId).countryCode).not.toBe("KR");
    }
    // one slot per country, nearest first
    expect(new Set(countries.map((c) => getCity(c.cityId).countryCode)).size).toBe(countries.length);
    expect(countries[0]!.km).toBeLessThanOrEqual(countries[1]!.km);
  });
  it("marks neighbours in an unstamped country as a new stamp", () => {
    const { nearby } = nextOptions("busan", new Set(["seoul", "busan"]), new Set(["KR"]));
    for (const n of nearby) expect(n.newCountry).toBe(getCity(n.cityId).countryCode !== "KR");
  });
  it("never suggests a visited city or a stamped country under new countries", () => {
    const { countries } = nextOptions("tokyo", new Set(["seoul", "tokyo", "osaka"]), new Set(["KR", "JP"]));
    for (const c of countries) expect(["KR", "JP"]).not.toContain(getCity(c.cityId).countryCode);
  });
});

describe("session fitted to the flight", () => {
  const min = 60_000;
  it("flies a slightly longer flight in one go", () => {
    expect(fitSessionMinutes(25, 27 * min)).toBe(27);
    expect(fitSessionMinutes(25, 35 * min)).toBe(35);
  });
  it("keeps the usual length for short and long flights", () => {
    expect(fitSessionMinutes(25, 7 * min)).toBe(25); // the timer still lands at 7 minutes
    expect(fitSessionMinutes(25, 36 * min)).toBe(25);
    expect(fitSessionMinutes(25, undefined)).toBe(25);
    expect(fitSessionMinutes(175, 185 * min)).toBe(175); // never past the 180-minute limit
  });
});

describe("local time", () => {
  it("every city has a valid time zone", () => {
    for (const c of CITIES) expect(() => localClock(0, c.tz), c.id).not.toThrow();
  });
  it("tells the local time and the difference from home", () => {
    const at = Date.UTC(2026, 10, 6, 12, 0); // 21:00 in Seoul
    expect(localClock(at, getCity("london").tz)).toBe("12:00");
    expect(localDate(Date.UTC(2026, 10, 6, 16, 0), getCity("seoul").tz)).toBe("2026.11.07");
    expect(hoursAhead(getCity("tokyo").tz, "Asia/Seoul", at)).toBe(0);
    expect(hoursAhead(getCity("london").tz, "Asia/Seoul", at)).toBe(-9);
    expect(hoursAhead(getCity("agra").tz, "Asia/Seoul", at)).toBe(-3.5);
  });
});
