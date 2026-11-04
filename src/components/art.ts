/** Cached rendering of postcards and boarding passes for the UI. */
import { buildPostcardContent, renderPostcardSvg } from "@/features/postcards/template";
import { getScene } from "@/features/postcards/scenes";
import { buildBoardingPass, renderBoardingPassSvg, type BoardingPassInput } from "@/features/tickets/boarding-pass";
import type { Arrival } from "@/features/travel/journey";

const cache = new Map<string, string>();
const memo = (key: string, make: () => string) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const v = make();
  if (cache.size > 80) cache.clear();
  cache.set(key, v);
  return v;
};

export function postcardSvg(a: Arrival, timeZone: string): string | null {
  const scene = getScene(a.cityId);
  if (!scene) return null;
  return memo(`pc|${a.cityId}|${a.fromId}|${a.arrivedAt}|${Math.round(a.focusMinutesAtArrival)}|${timeZone}`, () =>
    renderPostcardSvg(buildPostcardContent({ cityId: a.cityId, fromId: a.fromId, arrivedAt: a.arrivedAt, focusMinutesAtArrival: a.focusMinutesAtArrival, timeZone }), scene));
}

export function passSvg(input: BoardingPassInput): string {
  const accent = getScene(input.toId)?.accent ?? "#283152";
  const minutesKey = Math.floor(input.minutesFlown * 4); // ~15 s granularity keeps live updates cheap
  return memo(`bp|${input.fromId}|${input.toId}|${input.boardedAt}|${minutesKey}|${input.sessions}|${input.arrivedAt ?? ""}|${input.timeZone}`, () =>
    renderBoardingPassSvg(buildBoardingPass(input), accent));
}
