/** Render the Seoul → Tokyo boarding pass in its three states from real journey data. */
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { buildBoardingPass, renderBoardingPassSvg, type BoardingPassInput } from "@/features/tickets/boarding-pass";
import { getScene } from "@/features/postcards/scenes";
import { computeJourney } from "@/features/travel/journey";
import { TRAVEL_CONFIG } from "@/config/travel";

const start = Date.parse("2026-11-04T13:05:00Z"); // 22:05 in Seoul
const k = TRAVEL_CONFIG.kmPerMinute;
const base: BoardingPassInput = { fromId: "seoul", toId: "tokyo", boardedAt: start, minutesFlown: 0, kmPerMinute: k, sessions: 0, timeZone: "Asia/Seoul" };
const plan = { departureId: "seoul", stops: ["tokyo"] };
const done = computeJourney(plan, [{ id: "s1", completedAt: start + 25 * 60000, focusedMs: 25 * 60000, kmPerMinute: k }]);
const arrival = done.arrivals[0]!;
const states: Record<string, BoardingPassInput> = {
  boarding: base,
  "in-flight": { ...base, minutesFlown: 12, sessions: 1 },
  arrived: { ...base, minutesFlown: arrival.focusMinutesAtArrival, sessions: 1, arrivedAt: start + arrival.focusMinutesAtArrival * 60000 },
};
mkdirSync("out", { recursive: true });
const accent = getScene("tokyo")!.accent;
for (const [name, input] of Object.entries(states)) {
  const svg = renderBoardingPassSvg(buildBoardingPass(input), accent);
  writeFileSync(`out/boarding-pass-${name}.svg`, svg);
  execFileSync("rsvg-convert", ["-w", "1260", "-o", `out/boarding-pass-${name}.png`, `out/boarding-pass-${name}.svg`]);
  console.log(name, Math.round(svg.length / 1024), "KB");
}
