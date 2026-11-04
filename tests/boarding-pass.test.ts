import { describe, expect, it } from "vitest";
import { buildBoardingPass, renderBoardingPassSvg, PASS_W, PASS_H, type BoardingPassInput } from "@/features/tickets/boarding-pass";
import { LEGS } from "@/data";

const base: BoardingPassInput = {
  fromId: "seoul", toId: "tokyo", boardedAt: Date.parse("2026-11-04T13:05:00Z"),
  minutesFlown: 0, kmPerMinute: 50, sessions: 0, timeZone: "Asia/Seoul",
};

describe("boarding pass content", () => {
  it("is built from the leg and the user's local time", () => {
    const p = buildBoardingPass(base);
    expect(p).toMatchObject({ state: "boarding", from: { code: "SEL" }, to: { code: "TYO" }, date: "11.04", boarding: "22:05", km: 1149, focusMinutes: 23, progress: 0 });
    expect(p.flight).toMatch(/^WM \d{3}$/);
    expect(p.seat).toMatch(/^\d{1,2}[A-F]$/);
  });

  it("keeps the same flight number and seat for the same route, whenever it is shown", () => {
    const a = buildBoardingPass(base), b = buildBoardingPass({ ...base, boardedAt: base.boardedAt + 86400000, minutesFlown: 10 });
    expect([b.flight, b.seat]).toEqual([a.flight, a.seat]);
  });

  it("says LANDING when the leg is fully flown but the session hasn't ended", () => {
    const svg = renderBoardingPassSvg(buildBoardingPass({ ...base, minutesFlown: 40, sessions: 0 }), "#b83a2b");
    expect(buildBoardingPass({ ...base, minutesFlown: 40, sessions: 0 })).toMatchObject({ state: "in-flight", progress: 1 });
    expect(svg).toMatch(/100% flown/);
  });

  it("reads 'in flight' as soon as minutes are flown, even inside the first session", () => {
    expect(buildBoardingPass({ ...base, minutesFlown: 5, sessions: 0 }).state).toBe("in-flight");
  });

  it("moves through boarding → in-flight → arrived", () => {
    const mid = buildBoardingPass({ ...base, minutesFlown: 12, sessions: 1 });
    expect(mid.state).toBe("in-flight");
    expect(mid.progress).toBeCloseTo((12 * 50) / 1149.36, 2);
    const done = buildBoardingPass({ ...base, minutesFlown: 23, sessions: 1, arrivedAt: base.boardedAt + 23 * 60000 });
    expect(done).toMatchObject({ state: "arrived", progress: 1, arrived: "22:28" });
  });

  it("never shows more than 100% even if extra minutes are passed", () => {
    expect(buildBoardingPass({ ...base, minutesFlown: 999, sessions: 3 }).progress).toBe(1);
  });
});

describe("boarding pass render", () => {
  const states: BoardingPassInput[] = [base, { ...base, minutesFlown: 12, sessions: 1 }, { ...base, minutesFlown: 23, sessions: 1, arrivedAt: base.boardedAt + 23 * 60000 }];
  const svgs = states.map((s) => renderBoardingPassSvg(buildBoardingPass(s), "#b83a2b"));

  it("produces well-formed, accessible, deterministic SVG for each state", () => {
    svgs.forEach((svg, i) => {
      expect(svg).toContain(`viewBox="0 0 ${PASS_W} ${PASS_H}"`);
      expect(svg).toMatch(/<title id="bp-title">Boarding pass WM \d{3}, Seoul to Tokyo<\/title>/);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      expect(renderBoardingPassSvg(buildBoardingPass(states[i]!), "#b83a2b")).toBe(svg);
    });
    expect(new Set(svgs).size).toBe(3);
    expect(svgs[2]).toMatch(/Arrived 2026\.11\.04 at 22:28/);
  });

  it("renders for every curated flight leg in both directions", () => {
    for (const { from, to } of LEGS) for (const [a, b] of [[from, to], [to, from]] as const) {
      const svg = renderBoardingPassSvg(buildBoardingPass({ ...base, fromId: a, toId: b, arrivedAt: base.boardedAt + 3600000, minutesFlown: 60, sessions: 2 }), "#283152");
      expect(svg, `${a}→${b}`).not.toMatch(/NaN|undefined/);
    }
  });
});
