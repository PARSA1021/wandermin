import { describe, expect, it } from "vitest";
import { searchCities } from "@/features/travel/search";

const ids = (q: string, exclude?: string) => searchCities(q, { exclude }).map((c) => c.id);

describe("city search", () => {
  it("finds a city by its name in any language", () => {
    expect(ids("파리")[0]).toBe("paris");
    expect(ids("Paris")[0]).toBe("paris");
    expect(ids("パリ")[0]).toBe("paris");
  });
  it("matches the start of a name before matches inside it", () => {
    expect(ids("to")[0]).toBe("tokyo");
  });
  it("ignores case, spaces and accents", () => {
    expect(ids("reykjavik")).toContain("reykjavik");
    expect(ids("  NEW york ")).toContain("new-york");
  });
  it("finds cities by country, airport code and landmark", () => {
    expect(ids("일본")).toEqual(expect.arrayContaining(["tokyo", "osaka"]));
    expect(ids("PUS")).toContain("busan");
    expect(ids("에펠")).toContain("paris");
  });
  it("understands Korean initial consonants", () => {
    expect(ids("ㅍㄹ")).toContain("paris");
    expect(ids("ㄷㅋ")[0]).toBe("tokyo");
  });
  it("leaves out the current city and returns nothing for an empty query", () => {
    expect(ids("서울", "seoul")).not.toContain("seoul");
    expect(ids("   ")).toEqual([]);
    expect(ids("zzzz")).toEqual([]);
  });
});
