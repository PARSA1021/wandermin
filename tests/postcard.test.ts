import { describe, expect, it } from "vitest";
import { buildPostcardContent, composePostcard, renderPostcardSvg, CARD_W, CARD_H } from "@/features/postcards/template";
import { getScene, illustratedCityIds } from "@/features/postcards/scenes";
import { FONT_5x7, FONT_3x5, canPrint, measureText } from "@/features/postcards/pixel/font";
import { CITIES, COUNTRIES } from "@/data";

const input = {
  cityId: "tokyo", fromId: "seoul", arrivedAt: Date.parse("2026-11-04T13:30:00Z"),
  focusMinutesAtArrival: 22.99, timeZone: "Asia/Seoul",
};

describe("postcard content", () => {
  it("is built from data, including the user's local date", () => {
    const c = buildPostcardContent(input);
    expect(c).toMatchObject({ title: "Tokyo", countryLabel: "JAPAN", cityCode: "TYO", focusMinutes: 23 });
    expect(c.date).toEqual({ year: "2026", month: "11", day: "04" });
    expect(c.route).toMatchObject({ fromName: "Seoul", toName: "Tokyo" });
    expect(c.route.km).toBeGreaterThan(1140);
    // 23:30 in Seoul vs. a time zone already on the next day
    const lateInput = { ...input, arrivedAt: Date.parse("2026-11-04T15:30:00Z") };
    expect(buildPostcardContent(lateInput).date.day).toBe("05");
    expect(buildPostcardContent({ ...lateInput, timeZone: "America/New_York" }).date.day).toBe("04");
  });

  it("every city and country name prints in the pixel fonts", () => {
    for (const c of CITIES) expect(canPrint(c.name.en, FONT_5x7), c.id).toBe(true);
    for (const k of COUNTRIES) expect(canPrint(k.postcardLabel, FONT_5x7), k.code).toBe(true);
  });

  it("every city's caption fits the card without overflow", () => {
    const scene = getScene("tokyo")!;
    for (const city of CITIES) {
      const from = city.id === "tokyo" ? "seoul" : "tokyo";
      const content = { ...buildPostcardContent({ ...input, cityId: city.id, fromId: from }), focusMinutes: 123456 };
      expect(() => composePostcard(content, scene), city.id).not.toThrow();
      expect(measureText(content.title, FONT_5x7, 1)).toBeLessThan(220);
    }
    expect(measureText("SAN FRANCISCO → LOS ANGELES · 559 KM", FONT_3x5)).toBeLessThan(220);
  });
});

describe("postcard render", () => {
  const scene = getScene("tokyo")!;
  const svg = renderPostcardSvg(buildPostcardContent(input), scene);

  it("every city in the data has an illustrated scene, and no scene exists without a city", () => {
    expect(illustratedCityIds().sort()).toEqual(CITIES.map((c) => c.id).sort());
    expect(getScene("atlantis")).toBeUndefined();
  });

  it("produces a well-formed, accessible, crisp SVG", () => {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${CARD_W} ${CARD_H}"`);
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain("<title id=\"pc-title\">Tokyo, JAPAN</title>");
    expect(svg).toMatch(/Total focus 23 minutes/);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    expect((svg.match(/<path /g) ?? []).length).toBeLessThan(64); // palette stays small
    expect(svg.length).toBeLessThan(250_000);
  });

  it.each(illustratedCityIds())("%s renders cleanly and deterministically", (id) => {
    const sc = getScene(id)!;
    const content = buildPostcardContent({ ...input, cityId: id, fromId: id === "tokyo" ? "seoul" : "tokyo" });
    const out = renderPostcardSvg(content, sc);
    expect(out).not.toMatch(/NaN|undefined|Infinity/);
    expect((out.match(/<path /g) ?? []).length).toBeLessThan(96); // palette budget per card
    expect(out.length).toBeLessThan(250_000);
    expect(renderPostcardSvg(content, sc)).toBe(out);
  });

  it("is deterministic", () => {
    expect(renderPostcardSvg(buildPostcardContent(input), scene)).toBe(svg);
  });

  it("changes when the data changes (template, not a baked image)", () => {
    const other = renderPostcardSvg({ ...buildPostcardContent(input), focusMinutes: 999 }, scene);
    expect(other).not.toBe(svg);
  });
});
